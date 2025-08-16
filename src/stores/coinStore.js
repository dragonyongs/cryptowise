// src/stores/coinStore.js

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

// === API 설정 및 캐싱 ===
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

// ✅ 정렬 옵션 상수
const SORT_OPTIONS = {
  VOLUME: "volume_24h",
  MARKET_CAP: "estimated_market_cap",
  PRICE_CHANGE: "change_rate",
  ALPHABETICAL: "korean_name",
  ANALYSIS_SCORE: "analysis.score",
  INVESTMENT_PRIORITY: "investment_priority",
};

// ✅ 스마트 정렬 함수들
const calculateInvestmentPriority = (coin) => {
  // 거래량 점수 (40% 가중치)
  const volumeScore =
    coin.volume_24h > 1000000000
      ? 40 // 10억 이상: 최고 우선순위
      : coin.volume_24h > 100000000
        ? 30 // 1억 이상: 높은 우선순위
        : coin.volume_24h > 10000000
          ? 20 // 천만 이상: 중간 우선순위
          : coin.volume_24h > 1000000
            ? 10
            : 0; // 백만 이상: 낮은 우선순위

  // 시가총액 추정 점수 (30% 가중치)
  const estimatedMarketCap = coin.current_price * 1000000; // 대략적 계산
  const marketCapScore =
    estimatedMarketCap > 1000000000000
      ? 30 // 1조 이상
      : estimatedMarketCap > 100000000000
        ? 25 // 1000억 이상
        : estimatedMarketCap > 10000000000
          ? 20 // 100억 이상
          : estimatedMarketCap > 1000000000
            ? 15
            : 10; // 10억 이상

  // 변동성 점수 (20% 가중치) - 적정 변동성 선호
  const changeRate = Math.abs(coin.change_rate);
  const volatilityScore =
    changeRate > 10
      ? 5 // 너무 높은 변동성은 위험
      : changeRate > 5
        ? 20 // 적정 변동성: 최고 점수
        : changeRate > 2
          ? 15 // 중간 변동성
          : changeRate > 1
            ? 10
            : 5; // 낮은 변동성

  // AI 분석 점수 (10% 가중치)
  const analysisScore = (coin.analysis?.score || 0) * 1;

  return volumeScore + marketCapScore + volatilityScore + analysisScore;
};

const sortCoinsByPriority = (
  coins,
  sortBy = SORT_OPTIONS.INVESTMENT_PRIORITY,
  direction = "desc"
) => {
  return [...coins].sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case SORT_OPTIONS.INVESTMENT_PRIORITY:
        aValue = calculateInvestmentPriority(a);
        bValue = calculateInvestmentPriority(b);
        break;
      case SORT_OPTIONS.VOLUME:
        aValue = a.volume_24h || 0;
        bValue = b.volume_24h || 0;
        break;
      case SORT_OPTIONS.MARKET_CAP:
        aValue = (a.current_price || 0) * 1000000; // 추정 시가총액
        bValue = (b.current_price || 0) * 1000000;
        break;
      case SORT_OPTIONS.PRICE_CHANGE:
        aValue = Math.abs(a.change_rate || 0);
        bValue = Math.abs(b.change_rate || 0);
        break;
      case SORT_OPTIONS.ANALYSIS_SCORE:
        aValue = a.analysis?.score || 0;
        bValue = b.analysis?.score || 0;
        break;
      case SORT_OPTIONS.ALPHABETICAL:
        return direction === "asc"
          ? (a.korean_name || "").localeCompare(b.korean_name || "")
          : (b.korean_name || "").localeCompare(a.korean_name || "");
      default:
        aValue = a[sortBy] || 0;
        bValue = b[sortBy] || 0;
    }

    return direction === "asc" ? aValue - bValue : bValue - aValue;
  });
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

// ✅ 스마트 캐시 관리자 (TTL 기반)
class SmartDataCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
    this.hitCount = new Map();
    this.accessTime = new Map();
  }

  set(key, value, priority = "medium") {
    const ttl = this.calculateTTL(key, priority);
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
    this.hitCount.set(key, 0);
  }

  get(key) {
    if (this.isExpired(key)) {
      this.delete(key);
      return null;
    }

    // 히트 카운트 증가
    const hits = this.hitCount.get(key) || 0;
    this.hitCount.set(key, hits + 1);
    this.accessTime.set(key, Date.now());

    return this.cache.get(key);
  }

  calculateTTL(key, priority) {
    const baseTime = {
      high: 5000, // 5초 - 관심 코인
      medium: 30000, // 30초 - 일반 코인
      low: 60000, // 1분 - 백그라운드 데이터
    };

    // 히트율에 따라 TTL 조정
    const hitRate = this.getHitRate(key);
    const multiplier = hitRate > 0.8 ? 2 : 1; // 자주 액세스되는 데이터는 캐시 시간 연장

    return baseTime[priority] * multiplier;
  }

  getHitRate(key) {
    const hits = this.hitCount.get(key) || 0;
    const total = hits + 1;
    return hits / total;
  }

  isExpired(key) {
    const expiry = this.timestamps.get(key);
    return !expiry || Date.now() > expiry;
  }

  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
    this.hitCount.delete(key);
    this.accessTime.delete(key);
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
    this.hitCount.clear();
    this.accessTime.clear();
  }

  // 캐시 효율성 통계
  getStats() {
    const totalEntries = this.cache.size;
    const totalHits = Array.from(this.hitCount.values()).reduce(
      (sum, hits) => sum + hits,
      0
    );
    const avgHits = totalEntries > 0 ? totalHits / totalEntries : 0;

    return {
      totalEntries,
      totalHits,
      avgHits,
      cacheEfficiency:
        totalHits > 0 ? (totalHits / (totalHits + totalEntries)) * 100 : 0,
    };
  }
}

// 전역 인스턴스
const upbitLimiter = new RateLimiter(API_CONFIG.UPBIT_RATE_LIMIT, 600000); // 10분
const geckoLimiter = new RateLimiter(API_CONFIG.COINGECKO_RATE_LIMIT, 60000); // 1분
const smartCache = new SmartDataCache();

// ✅ 개선된 API 서비스 클래스
class CoinDataService {
  static async fetchUpbitMarkets() {
    try {
      await upbitLimiter.canMakeRequest();

      const cached = smartCache.get("upbit_markets");
      if (cached) return cached;

      const response = await fetch("https://api.upbit.com/v1/market/all");
      if (!response.ok) throw new Error(`Upbit API Error: ${response.status}`);

      const markets = await response.json();
      const krwMarkets = markets.filter((market) =>
        market.market.startsWith("KRW-")
      );

      smartCache.set("upbit_markets", krwMarkets, "low");
      return krwMarkets;
    } catch (error) {
      console.error("Failed to fetch Upbit markets:", error);
      return [];
    }
  }

  static async fetchPriceData(markets, priority = "medium") {
    try {
      await upbitLimiter.canMakeRequest();

      const marketString = markets.join(",");
      const cacheKey = `prices_${marketString}`;

      const cached = smartCache.get(cacheKey);
      if (cached) return cached;

      const response = await fetch(
        `https://api.upbit.com/v1/ticker?markets=${marketString}`
      );

      if (!response.ok)
        throw new Error(`Upbit Price API Error: ${response.status}`);

      const priceData = await response.json();
      smartCache.set(cacheKey, priceData, priority);
      return priceData;
    } catch (error) {
      console.error("Failed to fetch price data:", error);
      return [];
    }
  }

  static async enrichWithAnalysis(coinData) {
    return coinData.map((coin) => {
      // ✅ 투자 우선순위 점수 사전 계산
      const priority = calculateInvestmentPriority(coin);

      return {
        ...coin,
        investment_priority: priority, // 정렬용 우선순위 점수
        analysis: {
          score: 0,
          recommendation: "ANALYZING",
          technical_score: 0,
          fundamental_score: 0,
          sentiment_score: 0,
          priority: Math.floor(priority / 10), // 분석 우선순위 (0-10)
        },
      };
    });
  }
}

// ✅ 메인 스토어
export const useCoinStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // === 기본 상태 ===
        selectedCoins: [],
        availableCoins: [],
        userPlan: "free",
        maxCoins: PLAN_LIMITS.free,
        lastUpdated: null,
        isLoading: false,
        isInitialized: false,
        error: null,
        loadingProgress: 0,

        // ✅ 정렬 상태 추가
        sortBy: SORT_OPTIONS.INVESTMENT_PRIORITY,
        sortDirection: "desc",
        filterOptions: {
          minVolume: 0,
          maxVolume: null,
          minChange: null,
          maxChange: null,
          onlyAnalyzed: false,
        },

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

        // ✅ 필터링된 코인 목록 반환
        getFilteredCoins: () => {
          const state = get();
          let filtered = [...state.availableCoins];

          // 필터 적용
          const { minVolume, maxVolume, minChange, maxChange, onlyAnalyzed } =
            state.filterOptions;

          if (minVolume > 0) {
            filtered = filtered.filter((coin) => coin.volume_24h >= minVolume);
          }
          if (maxVolume) {
            filtered = filtered.filter((coin) => coin.volume_24h <= maxVolume);
          }
          if (minChange !== null) {
            filtered = filtered.filter((coin) => coin.change_rate >= minChange);
          }
          if (maxChange !== null) {
            filtered = filtered.filter((coin) => coin.change_rate <= maxChange);
          }
          if (onlyAnalyzed) {
            filtered = filtered.filter((coin) => coin.analysis?.score > 0);
          }

          // 정렬 적용
          return sortCoinsByPriority(
            filtered,
            state.sortBy,
            state.sortDirection
          );
        },

        // ✅ 정렬 옵션 설정
        setSortOption: (sortBy, direction = "desc") => {
          set((state) => {
            const sorted = sortCoinsByPriority(
              state.availableCoins,
              sortBy,
              direction
            );
            return {
              availableCoins: sorted,
              selectedCoins: sortCoinsByPriority(
                state.selectedCoins,
                sortBy,
                direction
              ),
              sortBy,
              sortDirection: direction,
              lastUpdated: new Date().toISOString(),
            };
          });
        },

        // ✅ 필터 옵션 설정
        setFilterOptions: (newFilters) => {
          set((state) => ({
            filterOptions: { ...state.filterOptions, ...newFilters },
          }));
        },

        // 가격 데이터 업데이트 (정렬 유지)
        updateCoinPrices: async (priceDataArr) => {
          set((state) => {
            const updatedAvailable = state.availableCoins.map((coin) => {
              const price = priceDataArr.find((p) => p.market === coin.market);
              if (price) {
                const updated = {
                  ...coin,
                  current_price: price.trade_price,
                  change_rate: price.signed_change_rate * 100,
                  change_price: price.signed_change_price,
                  volume_24h: price.acc_trade_price_24h,
                  last_updated: new Date().toISOString(),
                };
                // 투자 우선순위 재계산
                updated.investment_priority =
                  calculateInvestmentPriority(updated);
                return updated;
              }
              return coin;
            });

            const updatedSelected = state.selectedCoins.map((coin) => {
              const price = priceDataArr.find((p) => p.market === coin.market);
              if (price) {
                const updated = {
                  ...coin,
                  current_price: price.trade_price,
                  change_rate: price.signed_change_rate * 100,
                  change_price: price.signed_change_price,
                  volume_24h: price.acc_trade_price_24h,
                  last_updated: new Date().toISOString(),
                };
                updated.investment_priority =
                  calculateInvestmentPriority(updated);
                return updated;
              }
              return coin;
            });

            // ✅ 업데이트 후 정렬 유지
            return {
              availableCoins: sortCoinsByPriority(
                updatedAvailable,
                state.sortBy,
                state.sortDirection
              ),
              selectedCoins: sortCoinsByPriority(
                updatedSelected,
                state.sortBy,
                state.sortDirection
              ),
              lastUpdated: new Date().toISOString(),
            };
          });
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
            selectedCoins: sortCoinsByPriority(
              [...state.selectedCoins, coinData],
              state.sortBy,
              state.sortDirection
            ),
            lastUpdated: new Date().toISOString(),
          }));

          // ✅ 관심 코인 추가 후 즉시 분석 (고우선순위)
          setTimeout(async () => {
            try {
              console.log(`🔍 ${market} 관심 코인 추가 - 고우선순위 분석 시작`);

              // 최신 가격 데이터 반영 (고우선순위 캐싱)
              const priceData = await CoinDataService.fetchPriceData(
                [market],
                "high"
              );
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
                  console.log(`✅ ${market} 관심 코인 고우선순위 분석 완료`);
                }
              }
            } catch (error) {
              console.error(`❌ ${market} 관심 코인 분석 실패:`, error);
            }
          }, 300); // 빠른 응답을 위해 300ms로 단축

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

        // === 데이터 초기화 (정렬 적용) ===
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
              const batchPrices = await CoinDataService.fetchPriceData(
                batch,
                "medium"
              );
              allPrices = allPrices.concat(batchPrices);
            }

            // 3단계: 데이터 통합
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

            // 4단계: 분석 데이터 추가 및 정렬
            set({ loadingProgress: 90 });
            const enrichedData =
              await CoinDataService.enrichWithAnalysis(combinedData);

            // ✅ 초기 로드 시 투자 우선순위로 정렬
            const sortedData = sortCoinsByPriority(
              enrichedData,
              SORT_OPTIONS.INVESTMENT_PRIORITY,
              "desc"
            );

            set({
              availableCoins: sortedData,
              isLoading: false,
              isInitialized: true,
              lastUpdated: new Date().toISOString(),
              loadingProgress: 100,
              error: null,
            });

            // ✅ 5단계: 기존 관심 코인들 자동 분석 실행
            const currentState = get();
            if (currentState.selectedCoins.length > 0) {
              console.log(
                "🚀 초기화 완료 - 관심 코인 고우선순위 분석 시작:",
                currentState.selectedCoins.map((c) => c.market)
              );

              setTimeout(async () => {
                try {
                  const { useAnalysisStore } = await import(
                    "../components/features/analysis/state/analysisStore.js"
                  );
                  const { fetchIndicators } = useAnalysisStore.getState();

                  for (const coin of currentState.selectedCoins) {
                    try {
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
              }, 1000);
            }
          } catch (error) {
            console.error("Data initialization failed:", error);
            set({
              error: error.message,
              isLoading: false,
              isInitialized: true,
              loadingProgress: 0,
            });
          }
        },

        // === 데이터 업데이트 (정렬 유지) ===
        refreshData: async () => {
          const state = get();
          if (!state.isInitialized) {
            return get().initializeData();
          }

          set({ isLoading: true, error: null });

          try {
            // 관심 코인 우선 업데이트 (고우선순위 캐싱)
            if (state.selectedCoins.length > 0) {
              const selectedMarkets = state.selectedCoins.map(
                (coin) => coin.market
              );
              const selectedPrices = await CoinDataService.fetchPriceData(
                selectedMarkets,
                "high"
              );
              if (selectedPrices.length > 0) {
                get().updateCoinPrices(selectedPrices);
              }
            }

            // 전체 코인 배치 업데이트
            const allMarkets = state.availableCoins.map((coin) => coin.market);
            let allPrices = [];

            for (let i = 0; i < allMarkets.length; i += 100) {
              const batch = allMarkets.slice(i, i + 100);
              const batchPrices = await CoinDataService.fetchPriceData(
                batch,
                "medium"
              );
              allPrices = allPrices.concat(batchPrices);
            }

            // 가격 업데이트 및 정렬 유지
            get().updateCoinPrices(allPrices);

            set({ isLoading: false });
          } catch (error) {
            console.error("Data refresh failed:", error);
            set({
              error: "데이터 업데이트에 실패했습니다.",
              isLoading: false,
            });
          }
        },

        // === 분석 결과 업데이트 ===
        updateAnalysisResult: (market, analysisData) => {
          set((state) => {
            const updateCoin = (coin) => {
              if (coin.market === market) {
                const updated = {
                  ...coin,
                  analysis: {
                    ...coin.analysis,
                    ...analysisData,
                    last_updated: new Date().toISOString(),
                  },
                };
                // 분석 점수 변경 시 우선순위 재계산
                updated.investment_priority =
                  calculateInvestmentPriority(updated);
                return updated;
              }
              return coin;
            };

            const updatedSelected = state.selectedCoins.map(updateCoin);
            const updatedAvailable = state.availableCoins.map(updateCoin);

            return {
              selectedCoins: sortCoinsByPriority(
                updatedSelected,
                state.sortBy,
                state.sortDirection
              ),
              availableCoins: sortCoinsByPriority(
                updatedAvailable,
                state.sortBy,
                state.sortDirection
              ),
              lastUpdated: new Date().toISOString(),
            };
          });

          console.log(
            `📊 ${market} 분석 결과 업데이트 및 재정렬:`,
            analysisData
          );
        },

        // ✅ 지능형 배치 분석 함수
        batchAnalyzeCoins: async (limit = 15) => {
          const state = get();

          if (!state.isInitialized) {
            console.log("⚠️ 초기화 중... 잠시 후 분석 시작");
            await get().initializeData();
          }

          const currentState = get();
          if (currentState.isLoading) {
            console.log("⚠️ 이미 로딩 중, 배치 분석 스킵");
            return;
          }

          if (currentState.availableCoins.length === 0) {
            console.error("❌ 코인 데이터 없음");
            return;
          }

          set({ isLoading: true });

          try {
            // ✅ 우선순위 기반 분석 대상 선택
            const priorityCoins = currentState.availableCoins
              .filter(
                (coin) =>
                  // 아직 분석되지 않았거나 오래된 분석
                  !coin.analysis?.score ||
                  coin.analysis.score === 0 ||
                  (coin.analysis.last_updated &&
                    Date.now() -
                      new Date(coin.analysis.last_updated).getTime() >
                      3600000) // 1시간 이상 경과
              )
              .sort((a, b) => b.investment_priority - a.investment_priority) // 투자 우선순위 높은 순
              .slice(0, limit);

            console.log(
              `🎯 지능형 배치 분석 시작: ${priorityCoins.length}개 우선순위 코인 선택`
            );

            if (priorityCoins.length === 0) {
              console.log("✅ 모든 우선순위 코인 분석 완료");
              return;
            }

            // ✅ 업비트 API 제한 준수하며 병렬 처리 최적화
            const CONCURRENT_LIMIT = 3; // 동시 처리 제한
            const BATCH_DELAY = 800; // 배치 간 딜레이 단축

            for (let i = 0; i < priorityCoins.length; i += CONCURRENT_LIMIT) {
              const batch = priorityCoins.slice(i, i + CONCURRENT_LIMIT);

              // 병렬 처리
              await Promise.all(
                batch.map(async (coin) => {
                  try {
                    const response = await fetch(
                      `https://api.upbit.com/v1/candles/days?market=${coin.market}&count=50`
                    );

                    if (response.ok) {
                      const data = await response.json();
                      const closes = data.reverse().map((c) => c.trade_price);
                      const volumes = data.map(
                        (c) => c.candle_acc_trade_volume
                      );

                      if (closes.length > 14) {
                        const { useAnalysisStore } = await import(
                          "../components/features/analysis/state/analysisStore.js"
                        );
                        await useAnalysisStore
                          .getState()
                          .fetchIndicators(coin.market, closes, volumes);

                        console.log(
                          `✅ ${coin.market} 우선순위 분석 완료 (우선순위: ${coin.investment_priority})`
                        );
                      }
                    } else {
                      console.warn(
                        `⚠️ ${coin.market} 차트 데이터 조회 실패: ${response.status}`
                      );
                    }
                  } catch (error) {
                    console.error(`❌ ${coin.market} 분석 실패:`, error);
                  }
                })
              );

              // 배치 간 딜레이
              if (i + CONCURRENT_LIMIT < priorityCoins.length) {
                await new Promise((resolve) =>
                  setTimeout(resolve, BATCH_DELAY)
                );
              }
            }

            console.log("✅ 지능형 배치 분석 완료");
          } catch (error) {
            console.error("❌ 배치 분석 실패:", error);
          } finally {
            set({ isLoading: false });
          }
        },

        // === 캐시 관리 ===
        clearCache: () => {
          smartCache.clear();
        },

        getCacheStats: () => {
          return smartCache.getStats();
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
            sortBy: SORT_OPTIONS.INVESTMENT_PRIORITY,
            sortDirection: "desc",
            filterOptions: {
              minVolume: 0,
              maxVolume: null,
              minChange: null,
              maxChange: null,
              onlyAnalyzed: false,
            },
          });
          smartCache.clear();
        },
      }),

      {
        name: "cryptowise-coin-store",
        partialize: (state) => ({
          selectedCoins: state.selectedCoins,
          userPlan: state.userPlan,
          maxCoins: state.maxCoins,
          lastUpdated: state.lastUpdated,
          sortBy: state.sortBy,
          sortDirection: state.sortDirection,
          filterOptions: state.filterOptions,
        }),
        version: 3, // 버전 업데이트로 기존 캐시 무효화
      }
    )
  )
);

// 개발 환경 로깅 및 모니터링
if (process.env.NODE_ENV === "development") {
  let lastSelectedCoinsLog = 0;
  let lastLoadingLog = 0;
  const LOG_THROTTLE_MS = 1000;

  // ✅ selectedCoins 변경 감지
  useCoinStore.subscribe(
    (state) => state.selectedCoins,
    (selectedCoins, previousSelectedCoins) => {
      const now = Date.now();
      const prevLength = previousSelectedCoins?.length || 0;
      const currLength = selectedCoins.length;

      if (
        prevLength !== currLength &&
        now - lastSelectedCoinsLog > LOG_THROTTLE_MS
      ) {
        console.log("🪙 관심 코인 변경:", {
          action: currLength > prevLength ? "ADDED" : "REMOVED",
          previous: prevLength,
          current: currLength,
          coins: selectedCoins.map(
            (c) => `${c.symbol}(${c.investment_priority})`
          ),
        });
        lastSelectedCoinsLog = now;
      }
    }
  );

  // ✅ isLoading 변경 감지
  let lastLoadingState = null;
  useCoinStore.subscribe(
    (state) => state.isLoading,
    (isLoading) => {
      const now = Date.now();
      if (lastLoadingState !== isLoading && now - lastLoadingLog > 200) {
        console.log(`⏳ 로딩 ${isLoading ? "시작" : "완료"}`);
        lastLoadingState = isLoading;
        lastLoadingLog = now;
      }
    }
  );

  // ✅ 정렬 상태 모니터링
  useCoinStore.subscribe(
    (state) => ({ sortBy: state.sortBy, sortDirection: state.sortDirection }),
    ({ sortBy, sortDirection }) => {
      console.log(`🔄 정렬 변경: ${sortBy} (${sortDirection})`);
    }
  );

  // ✅ 캐시 효율성 모니터링
  setInterval(() => {
    const stats = smartCache.getStats();
    if (stats.totalEntries > 0) {
      console.log(`📊 캐시 통계:`, {
        entries: stats.totalEntries,
        hits: stats.totalHits,
        efficiency: `${stats.cacheEfficiency.toFixed(1)}%`,
      });
    }
  }, 60000); // 1분마다

  // 글로벌 디버깅 함수
  window.cryptoStore = {
    getState: () => useCoinStore.getState(),
    getCacheStats: () => smartCache.getStats(),
    clearCache: () => smartCache.clear(),
    sortOptions: SORT_OPTIONS,
  };
}
