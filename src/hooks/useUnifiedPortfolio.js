// src/hooks/useUnifiedPortfolio.js

import { useEffect, useCallback } from "react";
import { usePortfolioStore } from "../stores/portfolioStore.js";

export const useUnifiedPortfolio = (refreshTrigger) => {
  const {
    calculatedPortfolio,
    performance,
    isLoading,
    error,
    lastUpdated,
    updatePortfolioData,
    updatePerformance,
    refreshData,
    clearError,
  } = usePortfolioStore();

  // 🎯 통합 데이터 반환 (모든 컴포넌트에서 동일한 형태로 사용)
  const portfolioData = {
    // 기본 포트폴리오 정보
    totalValue: calculatedPortfolio?.totalValue || 0,
    cashValue: calculatedPortfolio?.cash?.value || 0,
    coins: calculatedPortfolio?.coins || [],

    // 수익 정보
    totalProfit: calculatedPortfolio?.totalProfit || 0,
    profitPercent: calculatedPortfolio?.profitPercent || 0,
    portfolioProfitPercent: calculatedPortfolio?.portfolioProfitPercent || 0,

    // 성과 정보
    winRate: performance?.winRate || 0,
    totalTrades: performance?.totalTrades || 0,
    winningTrades: performance?.winningTrades || 0,
    totalReturn:
      performance?.totalReturn ||
      calculatedPortfolio?.portfolioProfitPercent ||
      0,

    // 일일 변화
    dailyChange: calculatedPortfolio?.dailyChange || 0,
    dailyChangePercent: calculatedPortfolio?.dailyChangePercent || 0,

    // 코인별 상세 정보
    topPerformer: calculatedPortfolio?.coins?.reduce(
      (best, coin) =>
        !best || coin.profitPercent > best.profitPercent ? coin : best,
      null
    ),
    worstPerformer: calculatedPortfolio?.coins?.reduce(
      (worst, coin) =>
        !worst || coin.profitPercent < worst.profitPercent ? coin : worst,
      null
    ),

    // 메타 정보
    lastUpdated,
    isLoading,
    error,
    isEmpty: !calculatedPortfolio?.coins?.length,
  };

  // 🎯 데이터 새로고침
  const refresh = useCallback(async () => {
    try {
      console.log("🔄 포트폴리오 새로고침 시작");
      await refreshData();
      console.log("✅ 포트폴리오 새로고침 완료");
    } catch (err) {
      console.error("❌ 포트폴리오 새로고침 실패:", err);
    }
  }, [refreshData]);

  // 🎯 포트폴리오 업데이트
  const updateData = useCallback(
    (newPortfolio, totalValue, performanceData) => {
      console.log("📊 포트폴리오 데이터 업데이트");
      return updatePortfolioData(newPortfolio, totalValue, performanceData);
    },
    [updatePortfolioData]
  );

  // 🎯 성과 업데이트
  const updatePerf = useCallback(
    (perfData) => {
      console.log("📈 성과 데이터 업데이트");
      return updatePerformance(perfData);
    },
    [updatePerformance]
  );

  // 🎯 코인 추가/제거
  const addCoin = useCallback(
    (coinData) => {
      const updatedCoins = [...(portfolioData.coins || []), coinData];
      const newTotalValue = updatedCoins.reduce(
        (sum, coin) => sum + coin.value,
        0
      );
      updateData({ coins: updatedCoins }, newTotalValue);
    },
    [portfolioData.coins, updateData]
  );

  const removeCoin = useCallback(
    (symbol) => {
      const updatedCoins =
        portfolioData.coins?.filter((coin) => coin.symbol !== symbol) || [];
      const newTotalValue = updatedCoins.reduce(
        (sum, coin) => sum + coin.value,
        0
      );
      updateData({ coins: updatedCoins }, newTotalValue);
    },
    [portfolioData.coins, updateData]
  );

  // 🎯 자동 새로고침
  useEffect(() => {
    if (refreshTrigger) {
      refresh();
    }
  }, [refreshTrigger, refresh]);

  // 🎯 포맷된 데이터 반환
  const getFormattedData = useCallback(() => {
    return {
      totalValueFormatted: new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
      }).format(portfolioData.totalValue),

      profitFormatted: new Intl.NumberFormat("ko-KR", {
        style: "currency",
        currency: "KRW",
      }).format(portfolioData.totalProfit),

      profitPercentFormatted: `${portfolioData.profitPercent.toFixed(2)}%`,
    };
  }, [
    portfolioData.totalValue,
    portfolioData.totalProfit,
    portfolioData.profitPercent,
  ]);

  return {
    // 기본 데이터
    ...portfolioData,

    // 액션 메서드들
    updateData,
    updatePerf,
    refresh,
    clearError,
    addCoin,
    removeCoin,

    // 편의 메서드들
    getFormattedData,

    // 상태 체크
    hasData: !portfolioData.isEmpty,
    isPositive: portfolioData.profitPercent > 0,
    isNegative: portfolioData.profitPercent < 0,
  };
};
