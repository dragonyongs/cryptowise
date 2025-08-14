import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

// 업비트 원화 상장 코인 전체 목록 (실제 API 형태와 동일)
const UPBIT_KRW_COINS = [
  {
    market: "KRW-BTC",
    korean_name: "비트코인",
    english_name: "Bitcoin",
    symbol: "BTC",
    current_price: 65420000,
    change_rate: 2.34,
    change_price: 1500000,
    volume_24h: 2340000000000,
    market_cap: 1250000000000000,
    rank: 1,
    last_updated: new Date().toISOString(),
    analysis: {
      score: 8.5,
      recommendation: "STRONG_BUY",
      technical_score: 8.2,
      fundamental_score: 9.0,
      sentiment_score: 7.8,
    },
  },
  {
    market: "KRW-ETH",
    korean_name: "이더리움",
    english_name: "Ethereum",
    symbol: "ETH",
    current_price: 3250000,
    change_rate: -1.23,
    change_price: -40000,
    volume_24h: 1890000000000,
    market_cap: 520000000000000,
    rank: 2,
    last_updated: new Date().toISOString(),
    analysis: {
      score: 8.1,
      recommendation: "BUY",
      technical_score: 7.8,
      fundamental_score: 8.5,
      sentiment_score: 7.9,
    },
  },
  {
    market: "KRW-XRP",
    korean_name: "리플",
    english_name: "Ripple",
    symbol: "XRP",
    current_price: 850,
    change_rate: 8.67,
    change_price: 68,
    volume_24h: 1200000000000,
    market_cap: 45000000000000,
    rank: 5,
    last_updated: new Date().toISOString(),
    analysis: {
      score: 7.2,
      recommendation: "BUY",
      technical_score: 7.0,
      fundamental_score: 7.5,
      sentiment_score: 7.1,
    },
  },
  {
    market: "KRW-ADA",
    korean_name: "에이다",
    english_name: "Cardano",
    symbol: "ADA",
    current_price: 520,
    change_rate: 4.21,
    change_price: 21,
    volume_24h: 890000000000,
    market_cap: 28000000000000,
    rank: 8,
    last_updated: new Date().toISOString(),
    analysis: {
      score: 7.2,
      recommendation: "BUY",
      technical_score: 6.8,
      fundamental_score: 7.4,
      sentiment_score: 7.4,
    },
  },
  {
    market: "KRW-SOL",
    korean_name: "솔라나",
    english_name: "Solana",
    symbol: "SOL",
    current_price: 185000,
    change_rate: -2.87,
    change_price: -5463,
    volume_24h: 756000000000,
    market_cap: 35000000000000,
    rank: 6,
    last_updated: new Date().toISOString(),
    analysis: {
      score: 7.8,
      recommendation: "HOLD",
      technical_score: 7.2,
      fundamental_score: 8.1,
      sentiment_score: 8.1,
    },
  },
  {
    market: "KRW-DOT",
    korean_name: "폴카닷",
    english_name: "Polkadot",
    symbol: "DOT",
    current_price: 8950,
    change_rate: -1.45,
    change_price: -131,
    volume_24h: 234000000000,
    market_cap: 12000000000000,
    rank: 12,
    last_updated: new Date().toISOString(),
    analysis: {
      score: 6.8,
      recommendation: "HOLD",
      technical_score: 6.5,
      fundamental_score: 7.2,
      sentiment_score: 6.7,
    },
  },
  {
    market: "KRW-LINK",
    korean_name: "체인링크",
    english_name: "Chainlink",
    symbol: "LINK",
    current_price: 15600,
    change_rate: 3.12,
    change_price: 472,
    volume_24h: 445000000000,
    market_cap: 18000000000000,
    rank: 15,
    last_updated: new Date().toISOString(),
    analysis: {
      score: 7.6,
      recommendation: "BUY",
      technical_score: 7.4,
      fundamental_score: 7.8,
      sentiment_score: 7.6,
    },
  },
  {
    market: "KRW-MATIC",
    korean_name: "폴리곤",
    english_name: "Polygon",
    symbol: "MATIC",
    current_price: 980,
    change_rate: 5.67,
    change_price: 53,
    volume_24h: 320000000000,
    market_cap: 8500000000000,
    rank: 18,
    last_updated: new Date().toISOString(),
    analysis: {
      score: 7.1,
      recommendation: "BUY",
      technical_score: 6.9,
      fundamental_score: 7.2,
      sentiment_score: 7.2,
    },
  },
];

// 사용자 플랜별 제한
const PLAN_LIMITS = {
  free: 5,
  premium: 20,
  enterprise: 100,
};

export const useCoinStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // 상태
        selectedCoins: [],
        availableCoins: UPBIT_KRW_COINS,
        userPlan: "free",
        maxCoins: PLAN_LIMITS.free,
        lastUpdated: null,
        isLoading: false,
        error: null,

        // Getters
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

        // Actions
        addCoin: (market) => {
          const state = get();

          // 이미 선택된 코인 체크
          if (state.isSelected(market)) {
            return { success: false, message: "이미 추가된 코인입니다." };
          }

          // 최대 개수 체크
          if (state.selectedCoins.length >= state.maxCoins) {
            return {
              success: false,
              message: `${state.userPlan === "free" ? "무료" : "프리미엄"} 플랜에서는 최대 ${state.maxCoins}개 코인만 추가할 수 있습니다.`,
            };
          }

          // 코인 데이터 찾기
          const coinData = state.availableCoins.find(
            (coin) => coin.market === market
          );
          if (!coinData) {
            return {
              success: false,
              message: "코인 데이터를 찾을 수 없습니다.",
            };
          }

          // 코인 추가
          set((state) => ({
            selectedCoins: [...state.selectedCoins, coinData],
            lastUpdated: new Date().toISOString(),
          }));

          return {
            success: true,
            message: `${coinData.korean_name}이(가) 관심목록에 추가되었습니다.`,
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
            message: `${coin.korean_name}이(가) 관심목록에서 제거되었습니다.`,
          };
        },

        setUserPlan: (plan) => {
          const maxCoins = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

          set((state) => {
            let selectedCoins = state.selectedCoins;

            // 플랜 다운그레이드 시 초과 코인 제거
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

        // 가격 업데이트 (실제 API 연동 시 사용)
        updateCoinPrices: async (priceData) => {
          set((state) => ({
            availableCoins: state.availableCoins.map((coin) => {
              const updatedPrice = priceData.find(
                (p) => p.market === coin.market
              );
              return updatedPrice ? { ...coin, ...updatedPrice } : coin;
            }),
            selectedCoins: state.selectedCoins.map((coin) => {
              const updatedPrice = priceData.find(
                (p) => p.market === coin.market
              );
              return updatedPrice ? { ...coin, ...updatedPrice } : coin;
            }),
            lastUpdated: new Date().toISOString(),
            error: null,
          }));
        },

        // 분석 데이터 업데이트
        updateAnalysisData: (market, analysisData) => {
          set((state) => ({
            availableCoins: state.availableCoins.map((coin) =>
              coin.market === market
                ? { ...coin, analysis: { ...coin.analysis, ...analysisData } }
                : coin
            ),
            selectedCoins: state.selectedCoins.map((coin) =>
              coin.market === market
                ? { ...coin, analysis: { ...coin.analysis, ...analysisData } }
                : coin
            ),
            lastUpdated: new Date().toISOString(),
          }));
        },

        // 에러 상태 관리
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),
        setLoading: (loading) => set({ isLoading: loading }),

        // 초기 데이터 로드 (실제 API 연동 대비)
        initializeData: async () => {
          set({ isLoading: true, error: null });

          try {
            // 여기서 실제 API 호출
            // const data = await fetchUpbitCoins();

            // 현재는 목업 데이터 사용
            await new Promise((resolve) => setTimeout(resolve, 1000)); // API 호출 시뮬레이션

            set((state) => ({
              availableCoins: UPBIT_KRW_COINS,
              isLoading: false,
              lastUpdated: new Date().toISOString(),
            }));
          } catch (error) {
            set({
              error: error.message,
              isLoading: false,
            });
          }
        },
      }),
      {
        name: "cryptowise-coin-store", // localStorage 키
        partialize: (state) => ({
          selectedCoins: state.selectedCoins,
          userPlan: state.userPlan,
          maxCoins: state.maxCoins,
          lastUpdated: state.lastUpdated,
        }),
        version: 1,
      }
    )
  )
);

// 스토어 변경 감지 및 로깅 (개발 환경에서만)
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
}
