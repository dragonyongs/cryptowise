// src/stores/coinStore.js

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

// API 호출 제한 및 캐싱 설정
const API_CONFIG = {
  UPBIT_RATE_LIMIT: 600, // 10분당 600회
  COINGECKO_RATE_LIMIT: 50, // 1분당 50회 (무료 플랜)
  CACHE_DURATION: 30000, // 30초 캐시
  BATCH_SIZE: 20, // 배치 처리 크기
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1초
};

// 사용자 플랜별 제한
const PLAN_LIMITS = {
  free: 5,
  premium: 50,
  enterprise: 200,
};

// API 호출 레이트 리미터 클래스
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const waitTime = this.windowMs - (now - this.requests[0]);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.canMakeRequest();
    }

    this.requests.push(now);
    return true;
  }
}

// 캐시 관리자
class DataCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  set(key, value, duration = API_CONFIG.CACHE_DURATION) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + duration);
  }

  get(key) {
    if (this.isExpired(key)) {
      this.cache.delete(key);
      this.timestamps.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  isExpired(key) {
    const expiry = this.timestamps.get(key);
    return !expiry || Date.now() > expiry;
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }
}

// 전역 인스턴스
const upbitLimiter = new RateLimiter(API_CONFIG.UPBIT_RATE_LIMIT, 600000); // 10분
const geckoLimiter = new RateLimiter(API_CONFIG.COINGECKO_RATE_LIMIT, 60000); // 1분
const dataCache = new DataCache();

// API 서비스 클래스
class CoinDataService {
  static async fetchUpbitMarkets() {
    try {
      await upbitLimiter.canMakeRequest();

      const cached = dataCache.get("upbit_markets");
      if (cached) return cached;

      const response = await fetch("https://api.upbit.com/v1/market/all");
      if (!response.ok) throw new Error(`Upbit API Error: ${response.status}`);

      const markets = await response.json();
      const krwMarkets = markets.filter((market) =>
        market.market.startsWith("KRW-")
      );

      dataCache.set("upbit_markets", krwMarkets);
      return krwMarkets;
    } catch (error) {
      console.error("Failed to fetch Upbit markets:", error);
      return [];
    }
  }

  static async fetchPriceData(markets) {
    try {
      await upbitLimiter.canMakeRequest();

      const marketString = markets.join(",");
      const cacheKey = `prices_${marketString}`;
      const cached = dataCache.get(cacheKey);
      if (cached) return cached;

      const response = await fetch(
        `https://api.upbit.com/v1/ticker?markets=${marketString}`
      );
      if (!response.ok)
        throw new Error(`Upbit Price API Error: ${response.status}`);

      const priceData = await response.json();
      dataCache.set(cacheKey, priceData);
      return priceData;
    } catch (error) {
      console.error("Failed to fetch price data:", error);
      return [];
    }
  }

  static async enrichWithAnalysis(coinData) {
    return coinData.map((coin) => {
      // ✅ 거래량 기반 우선순위 점수 사전 계산
      const volumeScore =
        coin.volume_24h > 1000000000
          ? 3 // 10억 이상: 높은 우선순위
          : coin.volume_24h > 100000000
            ? 2 // 1억 이상: 중간 우선순위
            : coin.volume_24h > 10000000
              ? 1
              : 0; // 천만 이상: 낮은 우선순위

      const changeScore =
        Math.abs(coin.change_rate) > 5
          ? 2 // 5% 이상 변동: 높은 관심
          : Math.abs(coin.change_rate) > 2
            ? 1
            : 0; // 2% 이상 변동: 중간 관심

      return {
        ...coin,
        analysis: {
          score: 0,
          recommendation: "ANALYZING",
          technical_score: 0,
          fundamental_score: 0,
          sentiment_score: 0,
          priority: volumeScore + changeScore, // ✅ 분석 우선순위 점수
        },
      };
    });
  }
}

export const useCoinStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // === 상태 ===
        selectedCoins: [],
        availableCoins: [],
        userPlan: "free",
        maxCoins: PLAN_LIMITS.free,
        lastUpdated: null,
        isLoading: false,
        isInitialized: false,
        error: null,
        loadingProgress: 0,

        // === Getters ===
        getSelectedCoin: (market) => {
          return get().selectedCoins.find((coin) => coin.market === market);
        },

        getAvailableCoin: (market) => {
          return get().availableCoins.find((coin) => coin.market === market);
        },

        isSelected: (market) => {
          return get().selectedCoins.some((coin) => coin.market === market);
        },

        getRemainingSlots: () => {
          return get().maxCoins - get().selectedCoins.length;
        },

        getLoadingState: () => {
          const state = get();
          return {
            isLoading: state.isLoading,
            isInitialized: state.isInitialized,
            hasData: state.availableCoins.length > 0,
            isEmpty: state.isInitialized && state.availableCoins.length === 0,
            progress: state.loadingProgress,
          };
        },

        // 분석결과를 포함하여 관심코인/전체코인 최신화
        updateCoinPrices: async (priceDataArr) => {
          set((state) => ({
            availableCoins: state.availableCoins.map((coin) => {
              const price = priceDataArr.find((p) => p.market === coin.market);
              return price
                ? {
                    ...coin,
                    current_price: price.trade_price,
                    change_rate: price.signed_change_rate * 100,
                    change_price: price.signed_change_price,
                    volume_24h: price.acc_trade_price_24h,
                    last_updated: new Date().toISOString(),
                  }
                : coin;
            }),
            selectedCoins: state.selectedCoins.map((coin) => {
              const price = priceDataArr.find((p) => p.market === coin.market);
              return price
                ? {
                    ...coin,
                    current_price: price.trade_price,
                    change_rate: price.signed_change_rate * 100,
                    change_price: price.signed_change_price,
                    volume_24h: price.acc_trade_price_24h,
                    last_updated: new Date().toISOString(),
                  }
                : coin;
            }),
            lastUpdated: new Date().toISOString(),
          }));
        },

        // === Actions ===
        addCoin: async (market) => {
          const state = get();

          if (state.isSelected(market))
            return { success: false, message: "이미 추가됨" };
          if (state.selectedCoins.length >= state.maxCoins)
            return {
              success: false,
              message: `플랜 한도 초과 (${state.maxCoins})`,
            };

          const coinData = state.availableCoins.find(
            (coin) => coin.market === market
          );
          if (!coinData) return { success: false, message: "코인 데이터 없음" };

          // 코인 추가
          set((state) => ({
            selectedCoins: [...state.selectedCoins, coinData],
            lastUpdated: new Date().toISOString(),
          }));

          // ✅ 코인 추가 후 즉시 해당 코인 분석 실행
          setTimeout(async () => {
            try {
              console.log(`🔍 ${market} 코인 추가 후 즉시 분석 시작`);

              // 최신 가격 데이터 반영
              const priceData = await CoinDataService.fetchPriceData([market]);
              if (priceData.length > 0) {
                get().updateCoinPrices(priceData);
              }

              // 분석 실행
              const { useAnalysisStore } = await import(
                "../components/features/analysis/state/analysisStore.js"
              );
              const { fetchIndicators } = useAnalysisStore.getState();

              const chartResponse = await fetch(
                `https://api.upbit.com/v1/candles/days?market=${market}&count=100`
              );
              if (chartResponse.ok) {
                const chartData = await chartResponse.json();
                const closes = chartData.reverse().map((c) => c.trade_price);
                const volumes = chartData.map((c) => c.candle_acc_trade_volume);

                if (closes.length > 14) {
                  await fetchIndicators(market, closes, volumes);
                  console.log(`✅ ${market} 추가 후 분석 완료`);
                }
              }
            } catch (error) {
              console.error(`❌ ${market} 추가 후 분석 실패:`, error);
            }
          }, 500); // 500ms 후 실행

          return { success: true, message: `${coinData.korean_name} 추가됨` };
        },

        removeCoin: (market) => {
          const state = get();
          const coin = state.getSelectedCoin(market);

          if (!coin) {
            return { success: false, message: "선택되지 않은 코인입니다." };
          }

          set((state) => ({
            selectedCoins: state.selectedCoins.filter(
              (c) => c.market !== market
            ),
            lastUpdated: new Date().toISOString(),
          }));

          return {
            success: true,
            message: `${coin.korean_name || coin.market}이(가) 관심목록에서 제거되었습니다.`,
          };
        },

        setUserPlan: (plan) => {
          const maxCoins = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

          set((state) => {
            let selectedCoins = state.selectedCoins;

            if (selectedCoins.length > maxCoins) {
              selectedCoins = selectedCoins.slice(0, maxCoins);
            }

            return {
              userPlan: plan,
              maxCoins,
              selectedCoins,
              lastUpdated: new Date().toISOString(),
            };
          });
        },

        clearSelectedCoins: () => {
          set({
            selectedCoins: [],
            lastUpdated: new Date().toISOString(),
          });
        },

        // === 에러 상태 관리 ===
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
        setLoading: (loading) => set({ isLoading: loading }),
        setProgress: (progress) => set({ loadingProgress: progress }),

        // === 데이터 초기화 ===
        initializeData: async () => {
          const state = get();

          // 이미 초기화되었고 데이터가 있으면 스킵
          if (state.isInitialized && state.availableCoins.length > 0) {
            return;
          }

          set({
            isLoading: true,
            error: null,
            loadingProgress: 0,
          });

          try {
            // 1단계: 업비트 마켓 전체 목록 조회
            set({ loadingProgress: 25 });
            const markets = await CoinDataService.fetchUpbitMarkets();
            if (markets.length === 0) {
              throw new Error("업비트 마켓 데이터를 불러올 수 없습니다.");
            }

            // 2단계: 가격 데이터 배치 조회 (100개씩)
            set({ loadingProgress: 50 });
            const allMarkets = markets.map((m) => m.market);
            let allPrices = [];
            for (let i = 0; i < allMarkets.length; i += 100) {
              const batch = allMarkets.slice(i, i + 100);
              const batchPrices = await CoinDataService.fetchPriceData(batch);
              allPrices = allPrices.concat(batchPrices);
            }

            // 3단계: 데이터 통합 (모든 마켓에 가격 반영)
            set({ loadingProgress: 75 });
            const combinedData = markets.map((market) => {
              const price = allPrices.find((p) => p.market === market.market);
              return {
                market: market.market,
                korean_name: market.korean_name,
                english_name: market.english_name,
                symbol: market.market.replace("KRW-", ""),
                current_price: price?.trade_price || 0,
                change_rate: price?.signed_change_rate
                  ? price.signed_change_rate * 100
                  : 0,
                change_price: price?.signed_change_price || 0,
                volume_24h: price?.acc_trade_price_24h || 0,
                last_updated: new Date().toISOString(),
                analysis: {
                  score: 0,
                  recommendation: "ANALYZING",
                  technical_score: 0,
                  fundamental_score: 0,
                  sentiment_score: 0,
                },
              };
            });

            // 4단계: 분석 데이터 추가 (이전과 동일)
            set({ loadingProgress: 90 });
            const enrichedData =
              await CoinDataService.enrichWithAnalysis(combinedData);

            set({
              availableCoins: enrichedData,
              isLoading: false,
              isInitialized: true,
              lastUpdated: new Date().toISOString(),
              loadingProgress: 100,
              error: null,
            });

            // ✅ 5단계: 초기화 완료 후 기존 관심 코인들 자동 분석 실행
            const currentState = get();
            if (currentState.selectedCoins.length > 0) {
              console.log(
                "🚀 초기 로드 완료, 기존 관심 코인 자동 분석 시작:",
                currentState.selectedCoins.map((c) => c.market)
              );

              // 분석 실행을 위해 외부 함수 호출 (비동기, 백그라운드)
              setTimeout(async () => {
                try {
                  // useRefreshPriceAndAnalysis 훅 로직을 직접 구현
                  const { useAnalysisStore } = await import(
                    "../components/features/analysis/state/analysisStore.js"
                  );
                  const { fetchIndicators } = useAnalysisStore.getState();

                  for (const coin of currentState.selectedCoins) {
                    try {
                      // 차트 데이터 가져오기
                      const response = await fetch(
                        `https://api.upbit.com/v1/candles/days?market=${coin.market}&count=100`
                      );
                      if (response.ok) {
                        const data = await response.json();
                        const closes = data.reverse().map((c) => c.trade_price);
                        const volumes = data.map(
                          (c) => c.candle_acc_trade_volume
                        );

                        if (closes.length > 14) {
                          await fetchIndicators(coin.market, closes, volumes);
                          console.log(`✅ ${coin.market} 초기 분석 완료`);
                        }
                      }
                    } catch (coinError) {
                      console.warn(`${coin.market} 초기 분석 실패:`, coinError);
                    }
                  }
                } catch (error) {
                  console.error("초기 관심 코인 분석 실패:", error);
                }
              }, 1000); // 1초 후 실행하여 UI 블로킹 방지
            }
          } catch (error) {
            console.error("Data initialization failed:", error);
            set({
              error: error.message,
              isLoading: false,
              isInitialized: true, // 실패해도 초기화 완료로 표시
              loadingProgress: 0,
            });
          }
        },

        // === 데이터 업데이트 ===
        refreshData: async () => {
          const state = get();

          if (!state.isInitialized) {
            return get().initializeData();
          }

          set({ isLoading: true, error: null });

          try {
            // 전체 코인과 관심 코인 모두 배치 처리로 업데이트
            const allMarkets = state.availableCoins.map((coin) => coin.market);
            let allPrices = [];

            // 100개씩 배치로 가격 데이터 가져오기
            for (let i = 0; i < allMarkets.length; i += 100) {
              const batch = allMarkets.slice(i, i + 100);
              const batchPrices = await CoinDataService.fetchPriceData(batch);
              allPrices = allPrices.concat(batchPrices);
            }

            set((state) => ({
              availableCoins: state.availableCoins.map((coin) => {
                const updatedPrice = allPrices.find(
                  (p) => p.market === coin.market
                );
                return updatedPrice
                  ? {
                      ...coin,
                      current_price: updatedPrice.trade_price,
                      change_rate: updatedPrice.signed_change_rate * 100,
                      change_price: updatedPrice.signed_change_price,
                      volume_24h: updatedPrice.acc_trade_price_24h,
                      last_updated: new Date().toISOString(),
                    }
                  : coin;
              }),
              selectedCoins: state.selectedCoins.map((coin) => {
                const updatedPrice = allPrices.find(
                  (p) => p.market === coin.market
                );
                return updatedPrice
                  ? {
                      ...coin,
                      current_price: updatedPrice.trade_price,
                      change_rate: updatedPrice.signed_change_rate * 100,
                      change_price: updatedPrice.signed_change_price,
                      volume_24h: updatedPrice.acc_trade_price_24h,
                      last_updated: new Date().toISOString(),
                    }
                  : coin;
              }),
              lastUpdated: new Date().toISOString(),
              isLoading: false,
            }));
          } catch (error) {
            console.error("Data refresh failed:", error);
            set({
              error: "데이터 업데이트에 실패했습니다.",
              isLoading: false,
            });
          }
        },

        // === 분석 결과 ===
        updateAnalysisResult: (market, analysisData) => {
          set((state) => ({
            selectedCoins: state.selectedCoins.map((coin) =>
              coin.market === market
                ? {
                    ...coin,
                    analysis: {
                      ...coin.analysis,
                      ...analysisData,
                      last_updated: new Date().toISOString(),
                    },
                  }
                : coin
            ),
            availableCoins: state.availableCoins.map((coin) =>
              coin.market === market
                ? {
                    ...coin,
                    analysis: {
                      ...coin.analysis,
                      ...analysisData,
                      last_updated: new Date().toISOString(),
                    },
                  }
                : coin
            ),
            lastUpdated: new Date().toISOString(),
          }));

          console.log(`📊 ${market} 분석 결과 업데이트:`, analysisData);
        },

        // ✅ 전체 코인 배치 분석 함수 추가
        batchAnalyzeCoins: async (limit = 10) => {
          const state = get();

          // ✅ 초기화 완료 여부 체크
          if (!state.isInitialized) {
            console.log("⚠️ 초기화가 완료되지 않음, 초기화 실행 후 분석 시작");

            // 초기화 먼저 실행
            await get().initializeData();

            // 초기화 후 최신 상태 다시 가져오기
            const updatedState = get();
            if (
              !updatedState.isInitialized ||
              updatedState.availableCoins.length === 0
            ) {
              console.error("❌ 초기화 실패 또는 데이터 없음");
              return;
            }
          }

          // ✅ availableCoins 빈 배열 체크
          const currentState = get();
          if (currentState.isLoading) {
            console.log("⚠️ 이미 로딩 중, 배치 분석 스킵");
            return;
          }

          if (currentState.availableCoins.length === 0) {
            console.error("❌ availableCoins가 비어있음, 초기화 문제");
            return;
          }

          set({ isLoading: true });

          try {
            // 분석되지 않은 코인들 우선 선택
            const coinsToAnalyze = currentState.availableCoins
              .filter(
                (coin) => !coin.analysis?.score || coin.analysis.score === 0
              )
              .slice(0, limit);

            console.log(
              `🔄 배치 분석 시작: ${coinsToAnalyze.length}개 코인 (전체 ${currentState.availableCoins.length}개 중)`
            );

            if (coinsToAnalyze.length === 0) {
              console.log("✅ 모든 코인이 이미 분석됨");
              return;
            }

            // ✅ 업비트 API 제한 준수 (분당 600회, 초당 10회)
            const BATCH_DELAY = 1000; // 1초 간격
            const API_DELAY = 100; // API 호출 간 0.1초 대기

            for (const coin of coinsToAnalyze) {
              try {
                await new Promise((resolve) => setTimeout(resolve, API_DELAY));

                // 차트 데이터 가져오기
                const response = await fetch(
                  `https://api.upbit.com/v1/candles/days?market=${coin.market}&count=50`
                );

                if (response.ok) {
                  const data = await response.json();
                  const closes = data.reverse().map((c) => c.trade_price);
                  const volumes = data.map((c) => c.candle_acc_trade_volume);

                  if (closes.length > 14) {
                    // 분석 실행
                    const { useAnalysisStore } = await import(
                      "../components/features/analysis/state/analysisStore.js"
                    );
                    await useAnalysisStore
                      .getState()
                      .fetchIndicators(coin.market, closes, volumes);

                    console.log(`✅ ${coin.market} 배치 분석 완료`);

                    // API 부하 방지 딜레이
                    await new Promise((resolve) =>
                      setTimeout(resolve, BATCH_DELAY)
                    );
                  }
                } else {
                  console.warn(
                    `⚠️ ${coin.market} 차트 데이터 조회 실패: ${response.status}`
                  );
                }
              } catch (error) {
                console.error(`❌ ${coin.market} 배치 분석 실패:`, error);
              }
            }

            console.log("✅ 배치 분석 완료");
          } catch (error) {
            console.error("❌ 배치 분석 실패:", error);
          } finally {
            set({ isLoading: false });
          }
        },

        // === 캐시 관리 ===
        clearCache: () => {
          dataCache.clear();
        },

        // === 초기화 리셋 ===
        resetStore: () => {
          set({
            selectedCoins: [],
            availableCoins: [],
            isLoading: false,
            isInitialized: false,
            error: null,
            loadingProgress: 0,
            lastUpdated: null,
          });
          dataCache.clear();
        },
      }),
      {
        name: "cryptowise-coin-store",
        partialize: (state) => ({
          selectedCoins: state.selectedCoins,
          userPlan: state.userPlan,
          maxCoins: state.maxCoins,
          lastUpdated: state.lastUpdated,
        }),
        version: 2, // 버전 업데이트로 기존 캐시 무효화
      }
    )
  )
);

// 개발 환경 로깅
if (process.env.NODE_ENV === "development") {
  let lastSelectedCoinsLog = 0;
  let lastLoadingLog = 0;
  const LOG_THROTTLE_MS = 1000; // 1초마다 최대 1회 로그

  // ✅ selectedCoins 변경 감지 - 디바운스 적용
  useCoinStore.subscribe(
    (state) => state.selectedCoins,
    (selectedCoins, previousSelectedCoins) => {
      const now = Date.now();

      // 실제 의미있는 변경사항만 로깅
      const prevLength = previousSelectedCoins?.length || 0;
      const currLength = selectedCoins.length;

      // 길이 변경이 있거나 1초 이상 경과한 경우만 로그
      if (
        prevLength !== currLength &&
        now - lastSelectedCoinsLog > LOG_THROTTLE_MS
      ) {
        console.log("🪙 Selected coins changed:", {
          action: currLength > prevLength ? "ADDED" : "REMOVED",
          previous: prevLength,
          current: currLength,
          coins: selectedCoins.map((c) => c.symbol),
        });
        lastSelectedCoinsLog = now;
      }
    }
  );

  // ✅ isLoading 변경 감지 - 상태 전환만 로깅
  let lastLoadingState = null;
  useCoinStore.subscribe(
    (state) => state.isLoading,
    (isLoading) => {
      const now = Date.now();

      // 실제 상태가 변경된 경우만 로그 (같은 상태 반복 방지)
      if (lastLoadingState !== isLoading && now - lastLoadingLog > 200) {
        console.log(`⏳ Loading ${isLoading ? "STARTED" : "FINISHED"}`);
        lastLoadingState = isLoading;
        lastLoadingLog = now;
      }
    }
  );

  // ✅ 추가: 분석 상태 모니터링 (선택적)
  let analysisLogCount = 0;
  useCoinStore.subscribe(
    (state) =>
      state.selectedCoins.filter(
        (coin) => coin.analysis?.score && coin.analysis.score > 0
      ).length,
    (analyzedCount) => {
      if (analyzedCount > 0 && analysisLogCount < 5) {
        // 최대 5회만 로그
        console.log(`📊 Analysis completed: ${analyzedCount} coins analyzed`);
        analysisLogCount++;
      }
    }
  );
}
