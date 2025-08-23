// src/stores/portfolioStore.js

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  PORTFOLIO_CONSTANTS,
  PORTFOLIO_CONFIG,
} from "../config/portfolioConfig.js";

export const usePortfolioStore = create(
  persist(
    (set, get) => ({
      // 🎯 원본 데이터
      rawPortfolio: null,
      totalValue: null,

      // 🎯 계산된 결과 (모든 컴포넌트가 공유)
      portfolioData: null,
      portfolioStats: null,

      // 🎯 중앙화된 설정 참조
      config: null,

      // 🎯 설정 초기화 함수
      initializeConfig: async (userId = null) => {
        try {
          const environment = process.env.NODE_ENV;
          const initialCapital = await PORTFOLIO_CONFIG.getInitialCapital(
            null,
            environment,
            userId
          );

          const config = {
            initialCapital,
            constants: PORTFOLIO_CONSTANTS,
            feeConfig: PORTFOLIO_CONSTANTS.FEE_CONFIG,
          };

          set({ config });
          return config;
        } catch (error) {
          console.error("포트폴리오 설정 초기화 실패:", error);
          // 기본값으로 fallback
          const fallbackConfig = {
            initialCapital: PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE,
            constants: PORTFOLIO_CONSTANTS,
            feeConfig: PORTFOLIO_CONSTANTS.FEE_CONFIG,
          };
          set({ config: fallbackConfig });
          return fallbackConfig;
        }
      },

      // 🎯 통합 계산 함수 (단일 진실 공급원)
      calculateAndUpdatePortfolio: (rawPortfolio, totalValue) => {
        console.log("🔄 Store에서 통합 계산 시작");

        const currentState = get();
        const config = currentState.config;

        if (!config) {
          console.warn("⚠️ 설정이 초기화되지 않았습니다. 기본값을 사용합니다.");
          // 기본값으로 임시 설정
          currentState.initializeConfig();
        }

        if (!rawPortfolio) {
          const defaultData = {
            coins: [],
            cash: {
              symbol: "KRW",
              value:
                config?.initialCapital ||
                PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE,
              percentage: 100,
            },
            totalValue:
              config?.initialCapital ||
              PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE,
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
            totalValue: defaultData.totalValue,
          });
          return defaultData;
        }

        // ✅ 통합된 계산 로직 (기존 중복 제거)
        const calculatedData = performUnifiedCalculation(
          rawPortfolio,
          totalValue,
          config
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
      getConfig: () => get().config,

      // 🎯 수수료 계산 (중앙화된 함수 사용)
      calculateTradeFee: (tradeValueKRW, feeType = "paperTrading") => {
        const config = get().config;
        if (config && PORTFOLIO_CONFIG.calculateTradeFee) {
          return PORTFOLIO_CONFIG.calculateTradeFee(tradeValueKRW, feeType);
        }
        // fallback
        return tradeValueKRW * 0.0005;
      },

      // 🎯 페이퍼 트레이딩 실행 (중앙화된 설정 사용)
      executePaperTrade: (trade) => {
        const state = get();
        const config = state.config;

        if (!config) {
          console.error("❌ 설정이 초기화되지 않았습니다.");
          return { success: false, error: "설정 초기화 필요" };
        }

        const { side, symbol, quantity, price } = trade;
        const tradeValueKRW = quantity * price;
        const tradeFee = state.calculateTradeFee(tradeValueKRW);

        if (side === "bid") {
          const totalCost = tradeValueKRW + tradeFee;
          // 매수 로직...
          console.log(
            `💰 매수 실행: ${symbol}, 비용: ${totalCost.toLocaleString()}원 (수수료: ${tradeFee.toLocaleString()}원)`
          );
        } else {
          const sellValueKRW = tradeValueKRW - tradeFee;
          // 매도 로직...
          console.log(
            `💸 매도 실행: ${symbol}, 수익: ${sellValueKRW.toLocaleString()}원 (수수료: ${tradeFee.toLocaleString()}원)`
          );
        }

        return { success: true, fee: tradeFee };
      },
    }),

    {
      name: "portfolio-store",
      partialize: (state) => ({
        portfolioData: state.portfolioData,
        portfolioStats: state.portfolioStats,
        config: state.config,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);

// ✅ 통합된 계산 로직 (중복 제거, 설정 사용)
function performUnifiedCalculation(portfolio, totalValue, config) {
  const initialCapital =
    config?.initialCapital || PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;

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

  // ✅ 중앙화된 초기 자본 사용
  const portfolioProfitPercent =
    ((safeTotalValue - initialCapital) / initialCapital) * 100;

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
      initialCapital, // ✅ 중앙화된 값 포함
    },
  };
}
