import { useEffect, useCallback } from "react";
import { usePortfolioStore } from "../stores/portfolioStore";

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

    // 메타 정보
    lastUpdated,
    isLoading,
    error,
  };

  // 🎯 데이터 새로고침
  const refresh = useCallback(async () => {
    try {
      await refreshData();
    } catch (err) {
      console.error("포트폴리오 새로고침 실패:", err);
    }
  }, [refreshData]);

  // 🎯 포트폴리오 업데이트
  const updateData = useCallback(
    (newPortfolio, totalValue, performanceData) => {
      return updatePortfolioData(newPortfolio, totalValue, performanceData);
    },
    [updatePortfolioData]
  );

  // 🎯 성과 업데이트
  const updatePerf = useCallback(
    (perfData) => {
      return updatePerformance(perfData);
    },
    [updatePerformance]
  );

  // 🎯 자동 새로고침
  useEffect(() => {
    if (refreshTrigger) {
      refresh();
    }
  }, [refreshTrigger, refresh]);

  return {
    ...portfolioData,
    updateData,
    updatePerf,
    refresh,
    clearError,
  };
};
