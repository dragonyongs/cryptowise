// src/stores/portfolioStore.js
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import {
  PORTFOLIO_CONSTANTS,
  PORTFOLIO_CONFIG,
} from "../config/portfolioConfig.js";
import { useCapitalStore } from "./capitalStore.js";

export const usePortfolioStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // 🎯 원본 데이터
        rawPortfolio: null,
        totalValue: null,

        // 🎯 계산된 결과 (모든 컴포넌트가 공유)
        portfolioData: null,
        portfolioStats: null,

        // 🔥 자본금 동기화 함수 추가
        syncWithCapitalStore: () => {
          const capitalStore = useCapitalStore.getState();
          const currentCapital = capitalStore.getCapital();

          if (currentCapital > 0) {
            console.log(
              `🔄 Portfolio Store 자본금 동기화: ${currentCapital.toLocaleString()}원`
            );

            // 현재 포트폴리오 데이터 업데이트
            get().calculateAndUpdatePortfolio(get().rawPortfolio, null);
          }
        },

        // 🎯 통합 계산 함수 (단일 진실 공급원)
        calculateAndUpdatePortfolio: (rawPortfolio, totalValue) => {
          console.log("🔄 Store에서 통합 계산 시작");

          // 🔥 항상 최신 capitalStore에서 값 가져오기
          const capitalStore = useCapitalStore.getState();
          const initialCapital = capitalStore.getCapital();

          if (!rawPortfolio) {
            const defaultData = {
              coins: [],
              cash: {
                symbol: "KRW",
                value: initialCapital,
                percentage: 100,
              },
              totalValue: initialCapital,
              stats: {
                totalInvestment: 0,
                currentValue: initialCapital,
                totalProfit: 0,
                profitPercent: 0,
                portfolioProfitPercent: 0,
                initialCapital,
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

          // ✅ 통합된 계산 로직 (항상 최신 자본금 사용)
          const calculatedData = performUnifiedCalculation(
            rawPortfolio,
            totalValue,
            initialCapital // 최신 값 전달
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

        // 🎯 수수료 계산 (중앙화된 함수 사용)
        calculateTradeFee: (tradeValueKRW, feeType = "paperTrading") => {
          if (PORTFOLIO_CONFIG.calculateTradeFee) {
            return PORTFOLIO_CONFIG.calculateTradeFee(tradeValueKRW, feeType);
          }
          // fallback
          return tradeValueKRW * 0.0005;
        },

        // 🎯 페이퍼 트레이딩 실행 (중앙화된 설정 사용)
        executePaperTrade: (trade) => {
          const state = get();
          const capitalStore = useCapitalStore.getState();
          const initialCapital = capitalStore.getCapital();

          if (!initialCapital || initialCapital <= 0) {
            console.error("❌ 자본금이 설정되지 않았습니다.");
            return { success: false, error: "자본금 설정 필요" };
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
          // 🔥 자본금 관련 데이터는 persist에서 제외 (capitalStore가 관리)
          portfolioData: state.portfolioData,
          portfolioStats: state.portfolioStats,
          lastUpdated: state.lastUpdated,
          // config 제거 - capitalStore에서 관리
        }),
      }
    )
  )
);

// 🔥 portfolioStore 초기화 시 capitalStore 구독 설정
let isSubscribed = false;

export const initializePortfolioStoreSync = () => {
  if (isSubscribed) return;

  try {
    // capitalStore 변경사항 구독
    useCapitalStore.subscribe(
      (state) => state.currentCapital,
      (currentCapital, previousCapital) => {
        if (currentCapital !== previousCapital && currentCapital > 0) {
          console.log(
            `📊 Portfolio Store 자본금 변경 감지: ${currentCapital.toLocaleString()}원`
          );

          // portfolioStore 동기화
          const portfolioStore = usePortfolioStore.getState();
          portfolioStore.syncWithCapitalStore();
        }
      }
    );

    isSubscribed = true;
    console.log("✅ Portfolio Store - Capital Store 구독 설정 완료");
  } catch (error) {
    console.error("❌ Portfolio Store 구독 설정 실패:", error);
  }
};

// ✅ 통합된 계산 로직 (중복 제거, 최신 자본금 사용)
function performUnifiedCalculation(portfolio, totalValue, initialCapital) {
  // 🔥 portfolio가 null이거나 데이터가 없을 때 처리
  if (!portfolio) {
    console.warn("⚠️ Portfolio가 null - 초기자본으로 초기화");
    const fallbackCash = initialCapital > 0 ? initialCapital : 3000000;

    return {
      coins: [],
      cash: {
        symbol: "KRW",
        value: fallbackCash,
        percentage: 100,
      },
      totalValue: fallbackCash,
      stats: {
        totalInvestment: 0,
        currentValue: fallbackCash,
        totalProfit: 0,
        profitPercent: 0,
        portfolioProfitPercent: 0,
        initialCapital,
      },
    };
  }

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
          totalProfit: pos.totalProfit || 0,
          tier: pos.tier || "TIER3",
        };
      }
      return acc;
    }, {});
  }

  // 코인 계산 (통합된 로직)
  const coins = Object.entries(coinsObj).map(([symbol, coin]) => {
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

  // ✅ 최신 자본금 사용
  const portfolioProfitPercent =
    initialCapital > 0
      ? ((safeTotalValue - initialCapital) / initialCapital) * 100
      : 0;

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
      initialCapital, // ✅ 최신 값 포함
    },
  };
}
