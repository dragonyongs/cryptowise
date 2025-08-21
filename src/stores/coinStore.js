// src/stores/coinStore.js

/* -------------------------------------------------------------
 * CryptoWise - 완전한 Coin Store
 * 페이퍼트레이딩 & 실전매매 지원
 * 2025-08-21 완전 개선: KRW 필터링 + 중복 호출 방지 + API 최적화
 * ----------------------------------------------------------- */

import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import { shallow } from "zustand/shallow";

/* ---------- 상수 및 설정 ---------- */
const API_CONFIG = {
  UPBIT_RATE_LIMIT: 50, // 분당 50회
  COINGECKO_RATE_LIMIT: 30, // 분당 30회
  CACHE_DURATION: 60_000, // 60초
  BATCH_SIZE: 50, // 배치 크기
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2_000, // 2초
};

const PLAN_LIMITS = {
  free: 10, // 무료: 10개
  premium: 50, // 프리미엄: 50개
  enterprise: 200, // 엔터프라이즈: 200개
};

export const SORT_OPTIONS = {
  VOLUME: "volume_24h",
  MARKET_CAP: "estimated_market_cap",
  PRICE_CHANGE: "change_rate",
  ALPHABETICAL: "korean_name",
  ANALYSIS_SCORE: "analysis.score",
  INVESTMENT_PRIORITY: "investment_priority",
};

/* ---------- 투자 우선순위 계산 ---------- */
const calculateInvestmentPriority = (coin) => {
  const volumeScore =
    coin.volume_24h > 1_000_000_000
      ? 40
      : coin.volume_24h > 100_000_000
        ? 30
        : coin.volume_24h > 10_000_000
          ? 20
          : coin.volume_24h > 1_000_000
            ? 10
            : 0;

  const estCap = (coin.current_price || 0) * 1_000_000;
  const marketCapScore =
    estCap > 1_000_000_000_000
      ? 30
      : estCap > 100_000_000_000
        ? 25
        : estCap > 10_000_000_000
          ? 20
          : estCap > 1_000_000_000
            ? 15
            : 10;

  const changeRate = Math.abs(coin.change_rate || 0);
  const volatilityScore =
    changeRate > 10
      ? 5
      : changeRate > 5
        ? 20
        : changeRate > 2
          ? 15
          : changeRate > 1
            ? 10
            : 5;

  const analysisScore = (coin.analysis?.score || 0) * 1;
  return volumeScore + marketCapScore + volatilityScore + analysisScore;
};

/* ---------- 정렬 함수 ---------- */
const sortCoinsByPriority = (
  coins,
  sortBy = SORT_OPTIONS.INVESTMENT_PRIORITY,
  direction = "desc"
) => {
  return [...coins].sort((a, b) => {
    let aVal, bVal;

    switch (sortBy) {
      case SORT_OPTIONS.INVESTMENT_PRIORITY:
        aVal = calculateInvestmentPriority(a);
        bVal = calculateInvestmentPriority(b);
        break;
      case SORT_OPTIONS.VOLUME:
        aVal = a.volume_24h || 0;
        bVal = b.volume_24h || 0;
        break;
      case SORT_OPTIONS.MARKET_CAP:
        aVal = (a.current_price || 0) * 1_000_000;
        bVal = (b.current_price || 0) * 1_000_000;
        break;
      case SORT_OPTIONS.PRICE_CHANGE:
        aVal = Math.abs(a.change_rate || 0);
        bVal = Math.abs(b.change_rate || 0);
        break;
      case SORT_OPTIONS.ANALYSIS_SCORE:
        aVal = a.analysis?.score || 0;
        bVal = b.analysis?.score || 0;
        break;
      case SORT_OPTIONS.ALPHABETICAL:
        return direction === "asc"
          ? (a.korean_name || "").localeCompare(b.korean_name || "")
          : (b.korean_name || "").localeCompare(a.korean_name || "");
      default:
        aVal = a[sortBy] || 0;
        bVal = b[sortBy] || 0;
    }

    return direction === "asc" ? aVal - bVal : bVal - aVal;
  });
};

/* ---------- API 레이트 리미터 ---------- */
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

/* ---------- 스마트 캐시 관리자 ---------- */
class SmartDataCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  set(key, value, ttl = API_CONFIG.CACHE_DURATION) {
    this.cache.set(key, value);
    this.timestamps.set(key, Date.now() + ttl);
  }

  get(key) {
    if (this.isExpired(key)) {
      this.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  isExpired(key) {
    const expiry = this.timestamps.get(key);
    return !expiry || Date.now() > expiry;
  }

  delete(key) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }
}

/* ---------- 전역 초기화 상태 관리 ---------- */
let globalInitializationState = {
  isInitializing: false,
  isCompleted: false,
  promise: null,
};

/* ---------- API 서비스 클래스 (완전 개선) ---------- */
class CoinDataService {
  static upbitLimiter = new RateLimiter(API_CONFIG.UPBIT_RATE_LIMIT, 60_000);
  static cache = new SmartDataCache();

  // 🎯 NEW: 진행 중인 요청 추적 (중복 방지)
  static ongoingRequests = new Map();

  // 🎯 NEW: 중복 요청 방지 래퍼
  static async deduplicatedRequest(key, requestFn) {
    // 이미 진행 중인 요청이 있으면 기다림
    if (this.ongoingRequests.has(key)) {
      console.log(`🔄 중복 요청 대기 중: ${key}`);
      return await this.ongoingRequests.get(key);
    }

    // 새로운 요청 시작
    const requestPromise = requestFn();
    this.ongoingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      // 완료 후 제거
      this.ongoingRequests.delete(key);
    }
  }

  // ✅ 마켓 데이터 가져오기 (중복 방지 + 캐시)
  static async fetchUpbitMarkets() {
    return await this.deduplicatedRequest("upbit_markets_all", async () => {
      try {
        await this.upbitLimiter.canMakeRequest();

        const cacheKey = "upbit_markets_all";
        const cached = this.cache.get(cacheKey);
        if (cached) {
          console.log("📋 마켓 데이터 캐시 사용");
          return cached;
        }

        console.log("📡 마켓 데이터 API 호출 시작");
        const proxyUrl = "/api/upbit-proxy?endpoint=market/all";
        const res = await fetch(proxyUrl);

        if (!res.ok) throw new Error(`Proxy API Error: ${res.status}`);

        const data = await res.json();
        this.cache.set(cacheKey, data, 1_800_000); // 30분
        console.log("✅ 마켓 데이터 캐시 저장 완료");

        return data;
      } catch (err) {
        console.error("❌ 마켓 데이터 호출 실패:", err);
        throw new Error("업비트 마켓 데이터 없음");
      }
    });
  }

  // ✅ 가격 데이터 가져오기 (중복 방지 + 캐시)
  static async fetchPriceData(markets, priority = "medium") {
    const marketString = markets.join(",");
    const requestKey = `prices_${marketString}`;

    return await this.deduplicatedRequest(requestKey, async () => {
      try {
        await this.upbitLimiter.canMakeRequest();

        const cacheKey = `prices_${marketString}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
          console.log(`📋 가격 데이터 캐시 사용: ${markets.length}개`);
          return cached;
        }

        console.log(`📡 가격 데이터 API 호출: ${markets.length}개`);
        const proxyUrl = `/api/upbit-proxy?endpoint=ticker&markets=${encodeURIComponent(marketString)}`;
        const response = await fetch(proxyUrl);

        if (!response.ok) {
          throw new Error(`Proxy API Error: ${response.status}`);
        }

        const priceData = await response.json();
        const ttl = priority === "high" ? 10_000 : API_CONFIG.CACHE_DURATION;
        this.cache.set(cacheKey, priceData, ttl);
        console.log(`✅ 가격 데이터 캐시 저장: ${priceData.length}개`);

        return priceData;
      } catch (error) {
        console.error("❌ 가격 데이터 호출 실패:", error);
        return [];
      }
    });
  }

  // ✅ 분석 데이터 추가
  static enrichWithAnalysis(coinData) {
    return coinData.map((coin) => {
      const priority = calculateInvestmentPriority(coin);
      return {
        ...coin,
        investment_priority: priority,
        analysis: {
          score: 0,
          recommendation: "ANALYZING",
          technical_score: 0,
          fundamental_score: 0,
          sentiment_score: 0,
          priority: Math.floor(priority / 10),
        },
      };
    });
  }
}

/* ---------- 외부 액세스 헬퍼 ---------- */
export let setSelectedCoinsExternal = () => {
  throw new Error("⛔️ setSelectedCoinsExternal 초기화 전 호출됨");
};

/* ---------- 메인 ZUSTAND 스토어 ---------- */
export const useCoinStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        /* === 기본 상태 === */
        selectedCoins: [],
        availableCoins: [],
        userPlan: "free",
        maxCoins: PLAN_LIMITS.free,
        lastUpdated: null,
        isLoading: false,
        isInitialized: false,
        error: null,
        loadingProgress: 0,
        sortBy: SORT_OPTIONS.INVESTMENT_PRIORITY,
        sortDirection: "desc",
        filterOptions: {
          minVolume: 0,
          maxVolume: null,
          minChange: null,
          maxChange: null,
          onlyAnalyzed: false,
        },

        /* === Getters === */
        getSelectedCoin: (market) =>
          get().selectedCoins.find((c) => c.market === market),
        getAvailableCoin: (market) =>
          get().availableCoins.find((c) => c.market === market),
        isSelected: (market) =>
          get().selectedCoins.some((c) => c.market === market),
        getRemainingSlots: () => get().maxCoins - get().selectedCoins.length,

        /* === 필터링된 코인 목록 === */
        getFilteredCoins: () => {
          const state = get();
          let filtered = [...state.availableCoins];
          const { minVolume, maxVolume, minChange, maxChange, onlyAnalyzed } =
            state.filterOptions;

          if (minVolume > 0)
            filtered = filtered.filter((coin) => coin.volume_24h >= minVolume);
          if (maxVolume)
            filtered = filtered.filter((coin) => coin.volume_24h <= maxVolume);
          if (minChange !== null)
            filtered = filtered.filter((coin) => coin.change_rate >= minChange);
          if (maxChange !== null)
            filtered = filtered.filter((coin) => coin.change_rate <= maxChange);
          if (onlyAnalyzed)
            filtered = filtered.filter((coin) => coin.analysis?.score > 0);

          return sortCoinsByPriority(
            filtered,
            state.sortBy,
            state.sortDirection
          );
        },

        /* === 핵심: setSelectedCoins 액션 === */
        setSelectedCoins: (coinsOrMarkets, preserveMode = false) => {
          const { availableCoins, sortBy, sortDirection } = get();
          let newCoins;

          // 🔒 보호 모드: 기존 관심코인이 있고 preserveMode가 true면 병합
          if (preserveMode && get().selectedCoins.length > 0) {
            const existingFavorites = get().selectedCoins.filter(
              (coin) => !coin.isTopCoin
            );
            const newTopCoins = Array.isArray(coinsOrMarkets)
              ? coinsOrMarkets
              : [];
            newCoins = [...existingFavorites, ...newTopCoins];
          } else {
            // 기존 로직
            if (Array.isArray(coinsOrMarkets) && coinsOrMarkets.length > 0) {
              if (typeof coinsOrMarkets[0] === "string") {
                newCoins = availableCoins.filter((c) =>
                  coinsOrMarkets.includes(c.market)
                );
              } else {
                newCoins = coinsOrMarkets;
              }
            } else {
              newCoins = [];
            }
          }

          set({
            selectedCoins: sortCoinsByPriority(newCoins, sortBy, sortDirection),
            lastUpdated: new Date().toISOString(),
          });
        },

        /* === 개별 코인 추가/제거 === */
        addCoin: (market) => {
          const state = get();
          if (state.isSelected(market))
            return { success: false, message: "이미 추가됨" };
          if (state.selectedCoins.length >= state.maxCoins) {
            return {
              success: false,
              message: `플랜 한도 초과 (${state.maxCoins})`,
            };
          }

          const coinData = state.availableCoins.find(
            (coin) => coin.market === market
          );
          if (!coinData) return { success: false, message: "코인 데이터 없음" };

          set((state) => ({
            selectedCoins: sortCoinsByPriority(
              [...state.selectedCoins, coinData],
              state.sortBy,
              state.sortDirection
            ),
            lastUpdated: new Date().toISOString(),
          }));

          // 추가된 코인 우선 분석
          setTimeout(async () => {
            try {
              const priceData = await CoinDataService.fetchPriceData(
                [market],
                "high"
              );
              if (priceData.length > 0) {
                get().updateCoinPrices(priceData);
              }
            } catch (error) {
              console.error(`관심 코인 ${market} 분석 실패:`, error);
            }
          }, 300);

          return { success: true, message: `${coinData.korean_name} 추가됨` };
        },

        removeCoin: (market) => {
          const state = get();
          const coin = state.getSelectedCoin(market);
          if (!coin) return { success: false, message: "선택되지 않은 코인" };

          set((state) => ({
            selectedCoins: state.selectedCoins.filter(
              (c) => c.market !== market
            ),
            lastUpdated: new Date().toISOString(),
          }));

          return { success: true, message: `${coin.korean_name} 제거됨` };
        },

        /* === 가격 데이터 업데이트 === */
        updateCoinPrices: (priceDataArr) => {
          set((state) => {
            const updateCoin = (coin) => {
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
            };

            return {
              availableCoins: sortCoinsByPriority(
                state.availableCoins.map(updateCoin),
                state.sortBy,
                state.sortDirection
              ),
              selectedCoins: sortCoinsByPriority(
                state.selectedCoins.map(updateCoin),
                state.sortBy,
                state.sortDirection
              ),
              lastUpdated: new Date().toISOString(),
            };
          });
        },

        /* === 🎯 핵심 개선: 데이터 초기화 (전역 상태 + KRW 필터링) === */
        initializeData: async (forceInit = false) => {
          const state = get();

          // ✅ 자동 초기화 완전 차단 - 명시적 호출만 허용
          if (!forceInit) {
            console.log("🔒 자동 초기화 차단됨 - 명시적 forceInit=true 필요");
            return;
          }

          // 🎯 전역 초기화 상태 확인
          if (globalInitializationState.isInitializing) {
            console.log("⏳ 다른 컴포넌트에서 초기화 진행 중 - 대기");
            return await globalInitializationState.promise;
          }

          if (
            globalInitializationState.isCompleted &&
            state.isInitialized &&
            state.availableCoins.length > 0
          ) {
            console.log("✅ 이미 초기화 완료됨");
            return;
          }

          // 🎯 전역 초기화 시작
          globalInitializationState.isInitializing = true;
          globalInitializationState.promise = (async () => {
            set({ isLoading: true, error: null, loadingProgress: 0 });

            try {
              console.log("🚀 전역 데이터 초기화 시작 (KRW 전용 + 중복 방지)");

              // 1단계: 마켓 목록
              set({ loadingProgress: 25 });
              const allMarkets = await CoinDataService.fetchUpbitMarkets();

              if (allMarkets.length === 0) {
                throw new Error("업비트 마켓 데이터 없음");
              }

              // 🔥 KRW 마켓만 필터링
              const krwMarkets = allMarkets.filter((market) => {
                return (
                  market.market.startsWith("KRW-") &&
                  market.market_warning !== "CAUTION"
                );
              });

              if (krwMarkets.length === 0) {
                throw new Error("업비트 원화 마켓 데이터 없음");
              }

              console.log(
                `✅ KRW 마켓 ${krwMarkets.length}개 선별 완료 (전체 ${allMarkets.length}개 중)`
              );

              // 2단계: 가격 데이터 (배치 처리) - KRW만
              set({ loadingProgress: 50 });
              const krwMarketCodes = krwMarkets.map((m) => m.market);
              let allPrices = [];

              for (
                let i = 0;
                i < krwMarketCodes.length;
                i += API_CONFIG.BATCH_SIZE
              ) {
                const batch = krwMarketCodes.slice(
                  i,
                  i + API_CONFIG.BATCH_SIZE
                );
                const batchPrices = await CoinDataService.fetchPriceData(
                  batch,
                  "medium"
                );
                allPrices = allPrices.concat(batchPrices);
              }

              // 3단계: 데이터 통합
              set({ loadingProgress: 75 });
              const combinedData = krwMarkets.map((market) => {
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
                CoinDataService.enrichWithAnalysis(combinedData);
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

              // 🎯 전역 상태 업데이트
              globalInitializationState.isCompleted = true;

              console.log(
                `✅ 전역 KRW 코인 데이터 초기화 완료: ${sortedData.length}개 (원화 시장 전용)`
              );
            } catch (error) {
              console.error("❌ 전역 데이터 초기화 실패:", error);
              set({
                error: error.message,
                isLoading: false,
                isInitialized: false,
                loadingProgress: 0,
              });
              throw error;
            } finally {
              // 🎯 전역 초기화 상태 리셋
              globalInitializationState.isInitializing = false;
              globalInitializationState.promise = null;
            }
          })();

          return await globalInitializationState.promise;
        },

        /* === 데이터 새로고침 === */
        refreshData: async () => {
          const state = get();
          if (!state.isInitialized) return get().initializeData(true);

          set({ isLoading: true, error: null });

          try {
            // 관심 코인 우선 업데이트
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

            for (let i = 0; i < allMarkets.length; i += API_CONFIG.BATCH_SIZE) {
              const batch = allMarkets.slice(i, i + API_CONFIG.BATCH_SIZE);
              const batchPrices = await CoinDataService.fetchPriceData(
                batch,
                "medium"
              );
              allPrices = allPrices.concat(batchPrices);
            }

            get().updateCoinPrices(allPrices);
            set({ isLoading: false });
            console.log(`✅ 가격 데이터 새로고침 완료: ${allPrices.length}개`);
          } catch (error) {
            console.error("데이터 새로고침 실패:", error);
            set({ error: "데이터 업데이트 실패", isLoading: false });
          }
        },

        /* === 분석 결과 업데이트 === */
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
                updated.investment_priority =
                  calculateInvestmentPriority(updated);
                return updated;
              }
              return coin;
            };

            return {
              selectedCoins: sortCoinsByPriority(
                state.selectedCoins.map(updateCoin),
                state.sortBy,
                state.sortDirection
              ),
              availableCoins: sortCoinsByPriority(
                state.availableCoins.map(updateCoin),
                state.sortBy,
                state.sortDirection
              ),
              lastUpdated: new Date().toISOString(),
            };
          });
        },

        /* === 정렬 및 필터 설정 === */
        setSortOption: (sortBy, direction = "desc") => {
          set((state) => ({
            availableCoins: sortCoinsByPriority(
              state.availableCoins,
              sortBy,
              direction
            ),
            selectedCoins: sortCoinsByPriority(
              state.selectedCoins,
              sortBy,
              direction
            ),
            sortBy,
            sortDirection: direction,
            lastUpdated: new Date().toISOString(),
          }));
        },

        setFilterOptions: (newFilters) => {
          set((state) => ({
            filterOptions: { ...state.filterOptions, ...newFilters },
          }));
        },

        /* === 유틸리티 === */
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

        clearSelectedCoins: () =>
          set({ selectedCoins: [], lastUpdated: new Date().toISOString() }),

        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
        setLoading: (loading) => set({ isLoading: loading }),
        setProgress: (progress) => set({ loadingProgress: progress }),

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
          CoinDataService.cache.clear();
          // 전역 상태도 리셋
          globalInitializationState = {
            isInitializing: false,
            isCompleted: false,
            promise: null,
          };
        },
      }),
      {
        name: "cryptowise-coin-store",
        version: 6, // 🎯 버전 업데이트

        // 🎯 개선된 persist 설정 - 중요 데이터만 저장
        partialize: (state) => ({
          selectedCoins: state.selectedCoins,
          userPlan: state.userPlan,
          maxCoins: state.maxCoins,
          sortBy: state.sortBy,
          sortDirection: state.sortDirection,
          filterOptions: state.filterOptions,
        }),

        // 🎯 복원 시 로그
        onRehydrateStorage: () => (state) => {
          if (state) {
            console.log("📦 localStorage에서 복원:", {
              selectedCoins: state.selectedCoins?.length || 0,
              userPlan: state.userPlan,
              maxCoins: state.maxCoins,
            });
          }
        },
      }
    )
  )
);

/* ---------- 외부 헬퍼 바인딩 ---------- */
setSelectedCoinsExternal = (...args) =>
  useCoinStore.getState().setSelectedCoins(...args);

/* ---------- 개발 모드 모니터링 ---------- */
if (process.env.NODE_ENV === "development") {
  // 선택 코인 변경 감지
  useCoinStore.subscribe(
    (state) => state.selectedCoins,
    (selectedCoins, prev) => {
      const currLen = selectedCoins.length;
      const prevLen = prev?.length || 0;
      if (currLen !== prevLen) {
        console.log(
          `🪙 관심 코인 ${currLen > prevLen ? "추가" : "제거"}: ${currLen}개`,
          selectedCoins.map(
            (c) => `${c.symbol}(${Math.round(c.investment_priority)})`
          )
        );
      }
    }
  );

  // 글로벌 디버깅 도구
  window.cryptoStore = {
    getState: () => useCoinStore.getState(),
    setCoins: setSelectedCoinsExternal,
    cache: CoinDataService.cache,
    forceInit: () => useCoinStore.getState().initializeData(true),
    resetGlobal: () => {
      globalInitializationState = {
        isInitializing: false,
        isCompleted: false,
        promise: null,
      };
    },
    getGlobalState: () => globalInitializationState,
  };
}

/* ---------- 편의 exports ---------- */
export { shallow };
export default useCoinStore;
