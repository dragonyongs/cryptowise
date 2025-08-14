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
  free: 10,
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
    // 여기서 AI 분석 로직 연동 (추후 구현)
    return coinData.map((coin) => ({
      ...coin,
      analysis: {
        score: 0,
        recommendation: "ANALYZING",
        technical_score: 0,
        fundamental_score: 0,
        sentiment_score: 0,
      },
    }));
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

        // === Actions ===
        addCoin: (market) => {
          const state = get();

          if (state.isSelected(market)) {
            return { success: false, message: "이미 추가된 코인입니다." };
          }

          if (state.selectedCoins.length >= state.maxCoins) {
            const planName =
              state.userPlan === "free"
                ? "무료"
                : state.userPlan === "premium"
                  ? "프리미엄"
                  : "엔터프라이즈";
            return {
              success: false,
              message: `${planName} 플랜에서는 최대 ${state.maxCoins}개 코인만 추가할 수 있습니다.`,
            };
          }

          const coinData = state.availableCoins.find(
            (coin) => coin.market === market
          );
          if (!coinData) {
            return {
              success: false,
              message: "코인 데이터를 찾을 수 없습니다.",
            };
          }

          set((state) => ({
            selectedCoins: [...state.selectedCoins, coinData],
            lastUpdated: new Date().toISOString(),
          }));

          return {
            success: true,
            message: `${coinData.korean_name || coinData.market}이(가) 관심목록에 추가되었습니다.`,
          };
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
            // 1단계: 업비트 마켓 목록 조회
            set({ loadingProgress: 25 });
            const markets = await CoinDataService.fetchUpbitMarkets();

            if (markets.length === 0) {
              throw new Error("업비트 마켓 데이터를 불러올 수 없습니다.");
            }

            // 2단계: 가격 데이터 조회 (배치 처리)
            set({ loadingProgress: 50 });
            const marketCodes = markets.map((m) => m.market).slice(0, 50); // 상위 50개만
            const priceData = await CoinDataService.fetchPriceData(marketCodes);

            // 3단계: 데이터 통합
            set({ loadingProgress: 75 });
            const combinedData = markets.map((market) => {
              const price = priceData.find((p) => p.market === market.market);
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

            // 4단계: 분석 데이터 추가 (추후 구현)
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
            return state.initializeData();
          }

          set({ isLoading: true, error: null });

          try {
            const marketCodes = state.availableCoins.map((coin) => coin.market);
            const priceData = await CoinDataService.fetchPriceData(marketCodes);

            set((state) => ({
              availableCoins: state.availableCoins.map((coin) => {
                const updatedPrice = priceData.find(
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
                const updatedPrice = priceData.find(
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
  useCoinStore.subscribe(
    (state) => state.selectedCoins,
    (selectedCoins, previousSelectedCoins) => {
      console.log("🪙 Selected coins changed:", {
        previous: previousSelectedCoins?.length || 0,
        current: selectedCoins.length,
        coins: selectedCoins.map((c) => c.symbol),
      });
    }
  );

  useCoinStore.subscribe(
    (state) => state.isLoading,
    (isLoading) => {
      console.log("⏳ Loading state changed:", isLoading);
    }
  );
}
