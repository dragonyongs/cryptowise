import { create } from "zustand";
import { persist } from "zustand/middleware";

export const usePortfolioStore = create(
  persist(
    (set, get) => ({
      // 상태
      portfolio: null,
      performance: {},
      transactions: [],
      isLoading: false,
      error: null,
      lastUpdated: null,

      // 포트폴리오 조회
      fetchPortfolio: async () => {
        set({ isLoading: true, error: null });

        try {
          // 실제로는 백엔드 API 호출 (업비트 계정 정보 조회)
          const portfolioData = await fetchUpbitPortfolio();

          set({
            portfolio: portfolioData,
            isLoading: false,
            lastUpdated: new Date().toISOString(),
          });

          return portfolioData;
        } catch (error) {
          set({
            error: error.message || "포트폴리오 조회에 실패했습니다",
            isLoading: false,
          });
          throw error;
        }
      },

      // 포트폴리오 새로고침
      refreshPortfolio: async () => {
        const { fetchPortfolio } = get();
        return await fetchPortfolio();
      },

      // 성과 데이터 업데이트
      updatePerformance: (period, data) => {
        set((state) => ({
          performance: {
            ...state.performance,
            [period]: data,
          },
        }));
      },

      // 거래 내역 추가
      addTransaction: (transaction) => {
        set((state) => ({
          transactions: [
            {
              id: Date.now(),
              date: new Date().toISOString(),
              ...transaction,
            },
            ...state.transactions,
          ].slice(0, 100), // 최대 100개 거래 보관
        }));
      },

      // 에러 초기화
      clearError: () => set({ error: null }),

      // 포트폴리오 초기화
      clearPortfolio: () => {
        set({
          portfolio: null,
          performance: {},
          transactions: [],
          error: null,
          lastUpdated: null,
        });
      },
    }),
    {
      name: "cryptowise-portfolio-store",
      partialize: (state) => ({
        portfolio: state.portfolio,
        performance: state.performance,
        transactions: state.transactions,
        lastUpdated: state.lastUpdated,
      }),
      version: 1,
    }
  )
);

// ✅ 업비트 포트폴리오 조회 함수
async function fetchUpbitPortfolio() {
  // 실제로는 백엔드 API를 통해 업비트 계정 정보 조회
  // 현재는 시뮬레이션
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 업비트 API에서 받은 계정 정보를 CryptoWise 형태로 변환
  const mockAccounts = [
    { currency: "KRW", balance: "1250000", locked: "0", avg_buy_price: "0" },
    {
      currency: "BTC",
      balance: "0.12000000",
      locked: "0",
      avg_buy_price: "58500000",
    },
    {
      currency: "ETH",
      balance: "2.10000000",
      locked: "0",
      avg_buy_price: "2950000",
    },
    {
      currency: "ADA",
      balance: "15000.00000000",
      locked: "0",
      avg_buy_price: "480",
    },
  ];

  // 현재 시세 조회 (실제로는 업비트 ticker API 호출)
  const mockPrices = {
    "KRW-BTC": 65420000,
    "KRW-ETH": 3250000,
    "KRW-ADA": 520,
  };

  const holdings = mockAccounts.map((account) => {
    const balance = parseFloat(account.balance);
    const avgPrice = parseFloat(account.avg_buy_price);

    if (account.currency === "KRW") {
      return {
        symbol: "KRW",
        name: "원화",
        quantity: balance,
        avgPrice: 1,
        currentPrice: 1,
        invested: balance,
        currentValue: balance,
        unrealizedPnL: 0,
        pnlPercent: 0,
        color: "#6B7280",
        change24h: 0,
      };
    }

    const market = `KRW-${account.currency}`;
    const currentPrice = mockPrices[market] || avgPrice;
    const currentValue = balance * currentPrice;
    const invested = balance * avgPrice;
    const unrealizedPnL = currentValue - invested;
    const pnlPercent = invested > 0 ? (unrealizedPnL / invested) * 100 : 0;

    // 24시간 변화율 시뮬레이션
    const change24h = (Math.random() - 0.5) * 10;

    return {
      symbol: account.currency,
      name: getCoinName(account.currency),
      quantity: balance,
      avgPrice,
      currentPrice,
      invested,
      currentValue,
      unrealizedPnL,
      pnlPercent,
      color: getCoinColor(account.currency),
      change24h,
    };
  });

  // 총 가치 계산
  const totalValue = holdings.reduce(
    (sum, holding) => sum + holding.currentValue,
    0
  );

  // 배분 비율 계산
  holdings.forEach((holding) => {
    holding.allocation = (holding.currentValue / totalValue) * 100;
  });

  // 일일 변화율 계산 (가중 평균)
  const dailyChange = holdings.reduce((sum, holding) => {
    return sum + holding.change24h * (holding.allocation / 100);
  }, 0);

  return {
    holdings,
    summary: {
      totalValue,
      dailyChange,
      lastUpdated: new Date().toISOString(),
    },
  };
}

// 코인 이름 매핑
function getCoinName(symbol) {
  const names = {
    BTC: "비트코인",
    ETH: "이더리움",
    ADA: "에이다",
    SOL: "솔라나",
    DOT: "폴카닷",
    LINK: "체인링크",
    MATIC: "폴리곤",
  };
  return names[symbol] || symbol;
}

// 코인 색상 매핑
function getCoinColor(symbol) {
  const colors = {
    BTC: "#F7931A",
    ETH: "#627EEA",
    ADA: "#0033AD",
    SOL: "#9945FF",
    DOT: "#E6007A",
    LINK: "#375BD2",
    MATIC: "#8247E5",
  };
  return colors[symbol] || "#6B7280";
}
