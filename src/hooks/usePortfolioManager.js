// src/hooks/usePortfolioManager.js - 완전 개선된 포트폴리오 관리 훅

import { useState, useCallback, useRef, useEffect } from "react";
import { paperTradingEngine } from "../services/testing/paperTradingEngine.js";

export const usePortfolioManager = (marketData, addLog) => {
  const [portfolio, setPortfolio] = useState({
    totalValue: 1840000,
    investedValue: 0,
    cashValue: 1840000,
    totalProfitRate: 0,
    totalProfit: 0,
    cashRatio: 100,
    investedRatio: 0,
    positions: [],
    tradeHistory: [],
    performance: { totalReturn: 0, winRate: 0, maxDrawdown: 0 },
    tradingStats: {
      totalTrades: 0,
      buyTrades: 0,
      sellTrades: 0,
      todayTrades: 0,
    },
    activePositions: 0,
    maxPositions: 4,
    lastUpdated: new Date(),
    mode: { isTestMode: false },
  });

  const [isLoading, setIsLoading] = useState(false);
  const updateInProgress = useRef(false);
  const portfolioCache = useRef(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const addLogRef = useRef(addLog);

  // ✅ addLog 참조 업데이트
  useEffect(() => {
    addLogRef.current = addLog;
  }, [addLog]);

  // ✅ 현재 시장 가격으로 포지션 값 계산
  const calculateCurrentValues = useCallback(
    (positions) => {
      if (!positions || !Array.isArray(positions)) {
        return { positions: [], totalInvested: 0, totalCurrent: 0 };
      }

      let totalInvested = 0;
      let totalCurrent = 0;

      const updatedPositions = positions.map((position) => {
        try {
          const symbol = position.symbol;
          const currentMarketData = marketData?.get?.(symbol);
          const currentPrice =
            currentMarketData?.trade_price ||
            currentMarketData?.price ||
            position.currentPrice ||
            position.avgPrice;

          const quantity = Number(position.quantity) || 0;
          const avgPrice = Number(position.avgPrice) || 0;
          const currentValue = quantity * currentPrice;
          const investedAmount = quantity * avgPrice;
          const profitRate =
            avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
          const totalProfit = currentValue - investedAmount;

          totalInvested += investedAmount;
          totalCurrent += currentValue;

          return {
            ...position,
            currentPrice,
            currentValue: Math.round(currentValue),
            profitRate: Number(profitRate.toFixed(2)),
            totalProfit: Math.round(totalProfit),
            lastUpdated: new Date(),
            isUpdated: currentMarketData ? true : false, // 실시간 데이터 여부
          };
        } catch (error) {
          console.warn(`포지션 계산 오류 (${position.symbol}):`, error);
          return {
            ...position,
            currentValue: (position.quantity || 0) * (position.avgPrice || 0),
            profitRate: 0,
            totalProfit: 0,
            isUpdated: false,
          };
        }
      });

      return {
        positions: updatedPositions,
        totalInvested: Math.round(totalInvested),
        totalCurrent: Math.round(totalCurrent),
      };
    },
    [marketData]
  );

  // ✅ 중요한 변경사항 감지
  const hasSignificantChange = useCallback((oldData, newData) => {
    if (!oldData || !newData) return true;

    // 값 변경 감지 (1000원 이상 차이)
    const valueThreshold = 1000;
    if (
      Math.abs((oldData.totalValue || 0) - (newData.totalValue || 0)) >
      valueThreshold
    ) {
      return true;
    }

    // 포지션 수 변경 감지
    if ((oldData.positions?.length || 0) !== (newData.positions?.length || 0)) {
      return true;
    }

    // 거래 내역 변경 감지
    if (
      (oldData.tradeHistory?.length || 0) !==
      (newData.tradeHistory?.length || 0)
    ) {
      return true;
    }

    // 수익률 변경 감지 (0.01% 이상 차이)
    const profitThreshold = 0.01;
    if (
      Math.abs(
        (oldData.totalProfitRate || 0) - (newData.totalProfitRate || 0)
      ) > profitThreshold
    ) {
      return true;
    }

    return false;
  }, []);

  // ✅ 거래 통계 정확히 계산
  const calculateTradingStats = useCallback((tradeHistory) => {
    if (!Array.isArray(tradeHistory)) {
      return {
        totalTrades: 0,
        buyTrades: 0,
        sellTrades: 0,
        executedTrades: 0,
        todayTrades: 0,
      };
    }

    const today = new Date().toDateString();
    const executedTrades = tradeHistory.filter(
      (trade) => trade.executed !== false
    );
    const buyTrades = executedTrades.filter((trade) => trade.action === "BUY");
    const sellTrades = executedTrades.filter(
      (trade) => trade.action === "SELL"
    );
    const todayTrades = executedTrades.filter(
      (trade) => new Date(trade.timestamp).toDateString() === today
    );

    return {
      totalTrades: tradeHistory.length,
      executedTrades: executedTrades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      todayTrades: todayTrades.length,
      successRate:
        tradeHistory.length > 0
          ? ((executedTrades.length / tradeHistory.length) * 100).toFixed(1)
          : 0,
    };
  }, []);

  // ✅ 성과 지표 계산
  const calculatePerformanceMetrics = useCallback(
    (tradeHistory, totalValue, initialBalance) => {
      if (!Array.isArray(tradeHistory)) {
        return { totalReturn: 0, winRate: 0, maxDrawdown: 0, profitFactor: 0 };
      }

      const executedTrades = tradeHistory.filter(
        (trade) => trade.executed !== false
      );
      const sellTrades = executedTrades.filter(
        (trade) => trade.action === "SELL"
      );

      // 승률 계산
      const profitableTrades = sellTrades.filter(
        (trade) => (trade.profitRate || 0) > 0
      );
      const winRate =
        sellTrades.length > 0
          ? (profitableTrades.length / sellTrades.length) * 100
          : 0;

      // 총 수익률
      const totalReturn =
        initialBalance > 0
          ? ((totalValue - initialBalance) / initialBalance) * 100
          : 0;

      // 최대 낙폭 (간단 계산)
      let maxValue = initialBalance;
      let maxDrawdown = 0;
      let runningValue = initialBalance;

      executedTrades.forEach((trade) => {
        if (trade.action === "BUY") {
          runningValue -= (trade.amount || 0) + (trade.fee || 0);
        } else if (trade.action === "SELL") {
          runningValue += (trade.amount || 0) - (trade.fee || 0);
        }

        maxValue = Math.max(maxValue, runningValue);
        const currentDrawdown =
          maxValue > 0 ? ((maxValue - runningValue) / maxValue) * 100 : 0;
        maxDrawdown = Math.max(maxDrawdown, currentDrawdown);
      });

      // Profit Factor 계산
      const totalProfit = profitableTrades.reduce(
        (sum, trade) => sum + (trade.totalProfit || 0),
        0
      );
      const totalLoss = sellTrades
        .filter((trade) => (trade.profitRate || 0) < 0)
        .reduce((sum, trade) => sum + Math.abs(trade.totalProfit || 0), 0);
      const profitFactor =
        totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;

      return {
        totalReturn: Number(totalReturn.toFixed(2)),
        winRate: Number(winRate.toFixed(1)),
        maxDrawdown: Number(maxDrawdown.toFixed(2)),
        profitFactor: Number(profitFactor.toFixed(2)),
      };
    },
    []
  );

  // ✅ 메인 포트폴리오 업데이트 함수
  const updatePortfolio = useCallback(
    async (forceUpdate = false) => {
      // 중복 업데이트 방지
      if (updateInProgress.current) {
        return portfolioCache.current;
      }

      const now = Date.now();

      // 쿨다운 체크 (강제 업데이트가 아닌 경우)
      if (!forceUpdate && lastUpdateTime && now - lastUpdateTime < 2000) {
        // 3초 → 2초로 단축
        return portfolioCache.current;
      }

      updateInProgress.current = true;

      try {
        setIsLoading(true);

        // ✅ 최신 paperTradingEngine에서 데이터 가져오기
        const rawPortfolioData = paperTradingEngine.getPortfolioSummary();

        if (!rawPortfolioData) {
          addLogRef.current?.(
            "⚠️ 페이퍼 트레이딩 엔진이 비활성화되어 포트폴리오 데이터를 가져올 수 없습니다",
            "warning"
          );
          return portfolioCache.current;
        }

        // ✅ 안전한 데이터 구조 보장
        const safePortfolioData = {
          // 기본값 설정
          totalValue:
            rawPortfolioData.totalValue || paperTradingEngine.initialBalance,
          investedValue: rawPortfolioData.investedValue || 0,
          cashValue:
            rawPortfolioData.cashValue || paperTradingEngine.initialBalance,
          totalProfitRate: rawPortfolioData.totalProfitRate || 0,
          totalProfit: rawPortfolioData.totalProfit || 0,
          cashRatio: rawPortfolioData.cashRatio || 100,
          investedRatio: rawPortfolioData.investedRatio || 0,

          // 배열 데이터 안전성 보장
          positions: Array.isArray(rawPortfolioData.positions)
            ? rawPortfolioData.positions
            : [],
          tradeHistory: Array.isArray(rawPortfolioData.tradeHistory)
            ? rawPortfolioData.tradeHistory
            : [],

          // 메타 정보
          activePositions: rawPortfolioData.activePositions || 0,
          maxPositions: rawPortfolioData.maxPositions || 4,
          lastUpdated: new Date(),
          mode: rawPortfolioData.mode || { isTestMode: false },
        };

        // ✅ 실시간 가격으로 포지션 업데이트
        const {
          positions: updatedPositions,
          totalInvested,
          totalCurrent,
        } = calculateCurrentValues(safePortfolioData.positions);

        // ✅ 정확한 거래 통계 계산
        const accurateTradingStats = calculateTradingStats(
          safePortfolioData.tradeHistory
        );

        // ✅ 성과 지표 정확히 계산
        const performanceMetrics = calculatePerformanceMetrics(
          safePortfolioData.tradeHistory,
          safePortfolioData.cashValue + totalCurrent,
          paperTradingEngine.initialBalance
        );

        // ✅ 최종 포트폴리오 데이터 구성
        const finalPortfolioData = {
          ...safePortfolioData,
          positions: updatedPositions,
          investedValue: totalInvested,
          currentCryptoValue: totalCurrent,

          // 재계산된 총 가치 및 수익률
          totalValue: safePortfolioData.cashValue + totalCurrent,
          totalProfitRate: performanceMetrics.totalReturn / 100, // 퍼센트를 비율로 변환
          totalProfit:
            safePortfolioData.cashValue +
            totalCurrent -
            paperTradingEngine.initialBalance,

          // 비율 재계산
          cashRatio:
            safePortfolioData.cashValue + totalCurrent > 0
              ? (safePortfolioData.cashValue /
                  (safePortfolioData.cashValue + totalCurrent)) *
                100
              : 100,
          investedRatio:
            safePortfolioData.cashValue + totalCurrent > 0
              ? (totalCurrent / (safePortfolioData.cashValue + totalCurrent)) *
                100
              : 0,

          // ✅ 정확한 통계 데이터
          tradingStats: accurateTradingStats,
          performance: performanceMetrics,

          // ✅ 추가 메타 정보
          updateInfo: {
            lastUpdateTime: now,
            forceUpdate,
            marketDataAvailable: marketData?.size || 0,
            realTimePositions: updatedPositions.filter((p) => p.isUpdated)
              .length,
          },
        };

        // ✅ 변경사항이 있을 때만 상태 업데이트
        if (hasSignificantChange(portfolioCache.current, finalPortfolioData)) {
          portfolioCache.current = finalPortfolioData;
          setPortfolio(finalPortfolioData);
          setLastUpdateTime(now);

          // ✅ 상세 업데이트 로그
          addLogRef.current?.(
            `📊 포트폴리오 업데이트: 총자산 ₩${finalPortfolioData.totalValue.toLocaleString()} ` +
              `(현금: ₩${finalPortfolioData.cashValue.toLocaleString()}, ` +
              `투자: ₩${finalPortfolioData.currentCryptoValue.toLocaleString()}), ` +
              `포지션 ${finalPortfolioData.positions.length}개, ` +
              `수익률 ${performanceMetrics.totalReturn}%, ` +
              `거래 ${accurateTradingStats.executedTrades}/${accurateTradingStats.totalTrades}개 ` +
              `(성공률: ${accurateTradingStats.successRate}%)`,
            forceUpdate ? "success" : "info"
          );

          // ✅ 디버그 정보 (개발 모드에서만)
          if (process.env.NODE_ENV === "development") {
            console.log("📊 포트폴리오 업데이트 상세:", {
              totalValue: finalPortfolioData.totalValue,
              positions: finalPortfolioData.positions.length,
              trades: `${accurateTradingStats.executedTrades}/${accurateTradingStats.totalTrades}`,
              performance: performanceMetrics,
              realTimeData: finalPortfolioData.updateInfo.realTimePositions,
            });
          }
        } else if (forceUpdate) {
          // 강제 업데이트인데 변경사항이 없는 경우
          addLogRef.current?.(
            "📊 포트폴리오 상태 확인 완료 - 변경사항 없음",
            "debug"
          );
        }

        return finalPortfolioData;
      } catch (error) {
        const errorMessage = error.message || "알 수 없는 오류";

        addLogRef.current?.(
          `❌ 포트폴리오 업데이트 실패: ${errorMessage}`,
          "error"
        );

        console.error("Portfolio update error:", {
          error,
          stack: error.stack,
          marketDataSize: marketData?.size,
          engineActive: paperTradingEngine?.isActive,
        });

        // ✅ 에러 시에도 기본 상태 유지
        return portfolioCache.current || portfolio;
      } finally {
        setIsLoading(false);
        updateInProgress.current = false;
      }
    },
    [
      lastUpdateTime,
      hasSignificantChange,
      calculateCurrentValues,
      calculateTradingStats,
      calculatePerformanceMetrics,
      marketData,
      portfolio,
    ]
  );

  // ✅ 자동 업데이트 (30초마다)
  useEffect(() => {
    const autoUpdateInterval = setInterval(() => {
      if (!updateInProgress.current) {
        updatePortfolio(false); // 자동 업데이트는 강제 업데이트 아님
      }
    }, 30000); // 30초마다

    return () => clearInterval(autoUpdateInterval);
  }, [updatePortfolio]);

  // ✅ 포트폴리오 리셋
  const resetPortfolio = useCallback(() => {
    const initialPortfolio = {
      totalValue: paperTradingEngine.initialBalance,
      investedValue: 0,
      cashValue: paperTradingEngine.initialBalance,
      totalProfitRate: 0,
      totalProfit: 0,
      cashRatio: 100,
      investedRatio: 0,
      positions: [],
      tradeHistory: [],
      performance: {
        totalReturn: 0,
        winRate: 0,
        maxDrawdown: 0,
        profitFactor: 0,
      },
      tradingStats: {
        totalTrades: 0,
        buyTrades: 0,
        sellTrades: 0,
        executedTrades: 0,
        todayTrades: 0,
      },
      activePositions: 0,
      maxPositions: 4,
      lastUpdated: new Date(),
      mode: { isTestMode: false },
    };

    setPortfolio(initialPortfolio);
    portfolioCache.current = initialPortfolio;
    setLastUpdateTime(null);

    addLogRef.current?.("🔄 포트폴리오 초기화 완료", "info");
  }, []);

  return {
    portfolio,
    isLoading,
    updatePortfolio,
    resetPortfolio,

    // ✅ 추가 유틸리티
    refreshPortfolio: () => updatePortfolio(true),
    getPortfolioSummary: () => portfolioCache.current || portfolio,
    isUpToDate: () => lastUpdateTime && Date.now() - lastUpdateTime < 10000, // 10초 이내 업데이트
  };
};

export default usePortfolioManager;
