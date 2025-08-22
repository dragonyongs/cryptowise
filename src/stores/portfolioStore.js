// src/stores/portfolioStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const usePortfolioStore = create(
  persist(
    (set, get) => ({
      // 🎯 원본 데이터
      rawPortfolio: null,
      totalValue: null,

      // 🎯 계산된 결과 (모든 컴포넌트가 공유)
      portfolioData: null,
      portfolioStats: null,

      // 🎯 통합 계산 함수 (단일 진실 공급원)
      calculateAndUpdatePortfolio: (rawPortfolio, totalValue) => {
        console.log("🔄 Store에서 통합 계산 시작");

        if (!rawPortfolio) {
          const defaultData = {
            coins: [],
            cash: { symbol: "KRW", value: 1840000, percentage: 100 },
            totalValue: 1840000,
            stats: {
              totalInvestment: 0,
              currentValue: 0,
              totalProfit: 0,
              profitPercent: 0,
              portfolioProfitPercent: 0,
            },
          };

          set({
            portfolioData: defaultData,
            portfolioStats: defaultData.stats,
            rawPortfolio,
            totalValue,
          });
          return defaultData;
        }

        // ✅ 통합된 계산 로직 (기존 중복 제거)
        const calculatedData = performUnifiedCalculation(
          rawPortfolio,
          totalValue
        );

        // ✅ 상태 업데이트 (모든 컴포넌트가 자동 리렌더링)
        set({
          rawPortfolio,
          totalValue,
          portfolioData: calculatedData,
          portfolioStats: calculatedData.stats,
          lastUpdated: new Date().toISOString(),
        });

        console.log("✅ Store 계산 완료 및 상태 업데이트");
        return calculatedData;
      },

      // 🎯 자동 업데이트 트리거
      updatePortfolio: (newPortfolio, newTotalValue) => {
        const { calculateAndUpdatePortfolio } = get();
        return calculateAndUpdatePortfolio(newPortfolio, newTotalValue);
      },

      // 🎯 계산된 데이터 조회 (컴포넌트용)
      getPortfolioData: () => get().portfolioData,
      getPortfolioStats: () => get().portfolioStats,
    }),
    {
      name: "portfolio-store",
      partialize: (state) => ({
        portfolioData: state.portfolioData,
        portfolioStats: state.portfolioStats,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);

// ✅ 통합된 계산 로직 (중복 제거)
function performUnifiedCalculation(portfolio, totalValue) {
  let coinsObj = {};

  // 데이터 소스 통합
  if (portfolio.coins && typeof portfolio.coins === "object") {
    coinsObj = portfolio.coins;
  } else if (portfolio.positions && Array.isArray(portfolio.positions)) {
    coinsObj = portfolio.positions.reduce((acc, pos) => {
      if (pos && pos.symbol) {
        acc[pos.symbol] = {
          symbol: pos.symbol,
          quantity: pos.quantity || 0,
          avgPrice: pos.avgPrice || 0,
          currentPrice: pos.currentPrice || pos.price || 0,
          // ... 나머지 로직
        };
      }
      return acc;
    }, {});
  }

  // 코인 계산 (통합된 로직)
  const coins = Object.entries(coinsObj).map(([symbol, coin]) => {
    // 기존 계산 로직 통합
    const quantity = Number(coin?.quantity) || 0;
    const avgPrice = Number(coin?.avgPrice) || 0;
    let currentPrice = Number(coin?.currentPrice || coin?.price) || 0;

    // 가격 업데이트 로직
    if (window.centralDataManager) {
      const realTimePrice = window.centralDataManager.getLatestPrice(
        `KRW-${symbol}`
      );
      if (realTimePrice && realTimePrice.trade_price) {
        currentPrice = realTimePrice.trade_price;
      }
    }

    // 수익 계산
    let profit = 0;
    let profitPercent = 0;
    if (quantity > 0 && avgPrice > 0 && currentPrice > 0) {
      if (coin?.totalProfit && Math.abs(coin.totalProfit) > 0.01) {
        profit = Number(coin.totalProfit);
      } else {
        profit = (currentPrice - avgPrice) * quantity;
      }
      profitPercent = ((currentPrice - avgPrice) / avgPrice) * 100;
    }

    const value = Math.round(quantity * currentPrice);

    return {
      symbol,
      quantity,
      avgPrice,
      currentPrice,
      value,
      profit: Math.round(profit),
      profitPercent: Number(profitPercent.toFixed(2)),
      tier: coin?.tier || "TIER3",
    };
  });

  // 통계 계산
  const cashValue = portfolio.cashValue || portfolio.krw || 0;
  const coinsValue = coins.reduce((sum, coin) => sum + coin.value, 0);
  const safeTotalValue =
    totalValue || portfolio.totalValue || cashValue + coinsValue;

  const totalInvestment = coins.reduce(
    (sum, coin) => sum + coin.quantity * coin.avgPrice,
    0
  );
  const currentValue = coins.reduce((sum, coin) => sum + coin.value, 0);
  const totalProfit = coins.reduce((sum, coin) => sum + coin.profit, 0);
  const profitPercent =
    totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
  const portfolioProfitPercent = ((safeTotalValue - 1840000) / 1840000) * 100;

  return {
    coins,
    cash: {
      symbol: "KRW",
      value: cashValue,
      percentage: safeTotalValue > 0 ? (cashValue / safeTotalValue) * 100 : 100,
    },
    totalValue: safeTotalValue,
    stats: {
      totalInvestment,
      currentValue,
      totalProfit,
      profitPercent,
      portfolioProfitPercent,
    },
  };
}
