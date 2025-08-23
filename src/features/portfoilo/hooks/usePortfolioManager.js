// src/hooks/usePortfolioManager.js - 중앙화된 설정 사용

import { useState, useCallback, useRef, useEffect } from "react";
import { paperTradingEngine } from "../../../services/testing/paperTradingEngine.js";
import { usePortfolioConfig } from "../../../config/portfolioConfig.js";

export const usePortfolioManager = (marketData, addLog, userId = null) => {
  // 🎯 중앙화된 설정 사용
  const { config, constants } = usePortfolioConfig(null, userId);

  // ✅ Store와의 동기화만 담당하도록 역할 변경
  const [isLoading, setIsLoading] = useState(false);
  const updateInProgress = useRef(false);

  // 초기 자본을 중앙화된 설정에서 가져오기
  const getInitialBalance = useCallback(() => {
    return config?.initialCapital || constants.DEFAULT_INITIAL_BALANCE;
  }, [config, constants]);

  const [portfolio, setPortfolio] = useState({
    totalValue: getInitialBalance(),
    investedValue: 0,
    cashValue: getInitialBalance(),
    totalProfitRate: 0,
    totalProfit: 0,
    cashRatio: 100,
    investedRatio: 0,
    positions: [],
    coins: {}, // ✅ UI에서 기대하는 coins Object 추가
    trades: [], // ✅ TradesTab에서 기대하는 trades 배열 추가
    tradeHistory: [],
    performance: { totalReturn: 0, winRate: 0, maxDrawdown: 0 },
    tradingStats: {
      totalTrades: 0,
      buyTrades: 0,
      sellTrades: 0,
      todayTrades: 0,
    },
    activePositions: 0,
    maxPositions: constants.DEFAULT_STRATEGY.maxPositions,
    lastUpdated: new Date(),
    mode: { isTestMode: false },
    initialBalance: getInitialBalance(), // ✅ 중앙화된 초기 자본
  });

  const portfolioCache = useRef(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const addLogRef = useRef(addLog);

  // ✅ addLog 참조 업데이트
  useEffect(() => {
    addLogRef.current = addLog;
  }, [addLog]);

  // ✅ 설정 변경 시 포트폴리오 초기값 업데이트
  useEffect(() => {
    if (config?.initialCapital) {
      const newInitialBalance = config.initialCapital;
      setPortfolio((prev) => ({
        ...prev,
        totalValue:
          prev.totalValue === prev.initialBalance
            ? newInitialBalance
            : prev.totalValue,
        cashValue:
          prev.cashValue === prev.initialBalance
            ? newInitialBalance
            : prev.cashValue,
        initialBalance: newInitialBalance,
      }));

      // paperTradingEngine의 초기 자본도 업데이트 (엔진이 있다면)
      if (
        paperTradingEngine &&
        typeof paperTradingEngine.updateInitialBalance === "function"
      ) {
        paperTradingEngine.updateInitialBalance(newInitialBalance);
      }
    }
  }, [config]);

  // ✅ positions 배열을 coins Object로 변환하는 함수
  const convertPositionsToCoins = useCallback((positions) => {
    if (!Array.isArray(positions)) return {};
    return positions.reduce((acc, position) => {
      acc[position.symbol] = {
        symbol: position.symbol,
        quantity: position.quantity,
        avgPrice: position.avgPrice,
        currentPrice: position.currentPrice,
        price: position.currentPrice, // PortfolioTab에서 fallback으로 사용
        value:
          position.currentValue || position.quantity * position.currentPrice,
        profitRate: position.profitRate,
        totalProfit: position.totalProfit,
        tier: position.tier,
        firstBought: position.firstBought,
        profitTargets: position.profitTargets,
        stopLoss: position.stopLoss,
        lastUpdated: position.lastUpdated,
        isUpdated: position.isUpdated,
      };
      return acc;
    }, {});
  }, []);

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
            isUpdated: currentMarketData ? true : false,
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

    const valueThreshold = 1000;
    if (
      Math.abs((oldData.totalValue || 0) - (newData.totalValue || 0)) >
      valueThreshold
    ) {
      return true;
    }

    if ((oldData.positions?.length || 0) !== (newData.positions?.length || 0)) {
      return true;
    }

    if (
      (oldData.tradeHistory?.length || 0) !==
      (newData.tradeHistory?.length || 0)
    ) {
      return true;
    }

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

  // ✅ 성과 지표 계산 (중앙화된 초기 자본 사용)
  const calculatePerformanceMetrics = useCallback(
    (tradeHistory, totalValue) => {
      const initialBalance = getInitialBalance();

      if (!Array.isArray(tradeHistory)) {
        return { totalReturn: 0, winRate: 0, maxDrawdown: 0, profitFactor: 0 };
      }

      const executedTrades = tradeHistory.filter(
        (trade) => trade.executed !== false
      );

      const sellTrades = executedTrades.filter(
        (trade) => trade.action === "SELL"
      );

      const profitableTrades = sellTrades.filter(
        (trade) => (trade.profitRate || 0) > 0
      );

      const winRate =
        sellTrades.length > 0
          ? (profitableTrades.length / sellTrades.length) * 100
          : 0;

      const totalReturn =
        initialBalance > 0
          ? ((totalValue - initialBalance) / initialBalance) * 100
          : 0;

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
        initialBalance,
      };
    },
    [getInitialBalance]
  );

  // ✅ 메인 포트폴리오 업데이트 함수 - 중앙화된 설정 사용
  const updatePortfolio = useCallback(
    async (forceUpdate = false) => {
      if (updateInProgress.current) return null;

      if (updateInProgress.current) {
        return portfolioCache.current;
      }

      const now = Date.now();
      if (!forceUpdate && lastUpdateTime && now - lastUpdateTime < 2000) {
        return portfolioCache.current;
      }

      try {
        updateInProgress.current = true;
        setIsLoading(true);

        // ✅ paperTradingEngine에서 데이터 가져오기
        const rawPortfolioData = paperTradingEngine.getPortfolioSummary();

        if (!rawPortfolioData) {
          addLogRef.current?.(
            "⚠️ 페이퍼 트레이딩 엔진이 비활성화되어 포트폴리오 데이터를 가져올 수 없습니다",
            "warning"
          );
          return portfolioCache.current;
        }

        // ✅ 중앙화된 초기 자본 사용
        const initialBalance = getInitialBalance();

        // ✅ 안전한 데이터 구조 보장
        const safePortfolioData = {
          totalValue: rawPortfolioData.totalValue || initialBalance,
          investedValue: rawPortfolioData.investedValue || 0,
          cashValue: rawPortfolioData.cashValue || initialBalance,
          totalProfitRate: rawPortfolioData.totalProfitRate || 0,
          totalProfit: rawPortfolioData.totalProfit || 0,
          cashRatio: rawPortfolioData.cashRatio || 100,
          investedRatio: rawPortfolioData.investedRatio || 0,
          positions: Array.isArray(rawPortfolioData.positions)
            ? rawPortfolioData.positions
            : [],
          tradeHistory: Array.isArray(rawPortfolioData.tradeHistory)
            ? rawPortfolioData.tradeHistory
            : [],
          activePositions: rawPortfolioData.activePositions || 0,
          maxPositions:
            rawPortfolioData.maxPositions ||
            constants.DEFAULT_STRATEGY.maxPositions,
          lastUpdated: new Date(),
          mode: rawPortfolioData.mode || { isTestMode: false },
          initialBalance, // ✅ 중앙화된 초기 자본
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

        // ✅ 성과 지표 정확히 계산 (중앙화된 초기 자본 사용)
        const performanceMetrics = calculatePerformanceMetrics(
          safePortfolioData.tradeHistory,
          safePortfolioData.cashValue + totalCurrent
        );

        // ✅ UI에서 기대하는 형태로 coins Object 생성
        const coinsObject = convertPositionsToCoins(updatedPositions);

        // ✅ 최종 포트폴리오 데이터 구성 - 모든 형태 지원
        const finalPortfolioData = {
          ...safePortfolioData,
          positions: updatedPositions, // 배열 형태 (원본)
          coins: coinsObject, // ✅ PortfolioTab에서 기대하는 Object 형태
          trades: safePortfolioData.tradeHistory, // ✅ TradesTab에서 기대하는 trades 배열
          tradeHistory: safePortfolioData.tradeHistory, // 호환성 유지
          investedValue: totalInvested,
          currentCryptoValue: totalCurrent,
          totalValue: safePortfolioData.cashValue + totalCurrent,
          totalProfitRate: performanceMetrics.totalReturn / 100,
          totalProfit:
            safePortfolioData.cashValue + totalCurrent - initialBalance,
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
          tradingStats: accurateTradingStats,
          performance: performanceMetrics,
          updateInfo: {
            lastUpdateTime: now,
            forceUpdate,
            marketDataAvailable: marketData?.size || 0,
            realTimePositions: updatedPositions.filter((p) => p.isUpdated)
              .length,
          },
          initialBalance, // ✅ 중앙화된 초기 자본 유지
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
              `코인오브젝트 ${Object.keys(finalPortfolioData.coins).length}개, ` +
              `거래내역 ${finalPortfolioData.trades.length}개, ` +
              `수익률 ${performanceMetrics.totalReturn}%, ` +
              `거래 ${accurateTradingStats.executedTrades}/${accurateTradingStats.totalTrades}개, ` +
              `초기자본 ₩${initialBalance.toLocaleString()}`,
            forceUpdate ? "success" : "info"
          );

          // ✅ 디버그 정보 (개발 모드에서만)
          if (process.env.NODE_ENV === "development") {
            console.log("📊 포트폴리오 업데이트 상세:", {
              totalValue: finalPortfolioData.totalValue,
              positions: finalPortfolioData.positions.length,
              coinsObject: Object.keys(finalPortfolioData.coins).length,
              trades: finalPortfolioData.trades.length,
              tradeHistory: finalPortfolioData.tradeHistory.length,
              performance: performanceMetrics,
              realTimeData: finalPortfolioData.updateInfo.realTimePositions,
              initialBalance,
            });
          }
        } else if (forceUpdate) {
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
      convertPositionsToCoins,
      marketData,
      portfolio,
      getInitialBalance,
      constants,
    ]
  );

  // ✅ 자동 업데이트 (30초마다)
  useEffect(() => {
    const autoUpdateInterval = setInterval(() => {
      if (!updateInProgress.current) {
        updatePortfolio(false);
      }
    }, 30000);

    return () => clearInterval(autoUpdateInterval);
  }, [updatePortfolio]);

  // ✅ 포트폴리오 리셋 (중앙화된 초기 자본 사용)
  const resetPortfolio = useCallback(() => {
    const initialBalance = getInitialBalance();

    const initialPortfolio = {
      totalValue: initialBalance,
      investedValue: 0,
      cashValue: initialBalance,
      totalProfitRate: 0,
      totalProfit: 0,
      cashRatio: 100,
      investedRatio: 0,
      positions: [],
      coins: {}, // ✅ 빈 coins Object
      trades: [], // ✅ 빈 trades 배열
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
      maxPositions: constants.DEFAULT_STRATEGY.maxPositions,
      lastUpdated: new Date(),
      mode: { isTestMode: false },
      initialBalance, // ✅ 중앙화된 초기 자본
    };

    setPortfolio(initialPortfolio);
    portfolioCache.current = initialPortfolio;
    setLastUpdateTime(null);
    addLogRef.current?.(
      `🔄 포트폴리오 초기화 완료 (초기자본: ₩${initialBalance.toLocaleString()})`,
      "info"
    );
  }, [getInitialBalance, constants]);

  return {
    portfolio,
    isLoading,
    updatePortfolio,
    resetPortfolio,
    refreshPortfolio: () => updatePortfolio(true),
    getPortfolioSummary: () => portfolioCache.current || portfolio,
    isUpToDate: () => lastUpdateTime && Date.now() - lastUpdateTime < 10000,
    config, // ✅ 중앙화된 설정 노출
    constants, // ✅ 상수 노출
    getInitialBalance, // ✅ 초기 자본 조회 함수 노출
  };
};

export default usePortfolioManager;
