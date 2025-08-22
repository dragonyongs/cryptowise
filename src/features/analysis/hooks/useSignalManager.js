// src/features/analysis/hooks/useSignalManager.js - 전체 시스템 관리 (NEW)
import { useState, useEffect, useCallback, useRef } from "react";
import { useSignalGenerator } from "../../../features/trading/hooks/useSignalGenerator";
import { useTradingLogger } from "../../../features/trading/hooks/useTradingLogger";
import { signalGenerator } from "../../../services/analysis/signalGenerator";

/**
 * 🎯 신호 시스템 전체 관리 훅
 * - useSignalGenerator를 활용한 하이레벨 관리
 * - 다중 코인 처리
 * - UI 상태 관리
 * - 자동화 로직
 */
export const useSignalManager = (isActive = false, tradingMode = "paper") => {
  // 상태 관리
  const [signals, setSignals] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const intervalRef = useRef(null);
  const testMode = tradingMode === "paper";

  // 로깅 시스템
  const { addLog, updateStats } = useTradingLogger();

  // 기본 거래 설정
  const tradingSettings = {
    tradingConditions: {
      buyConditions: {
        minBuyScore: testMode ? 6.0 : 7.5,
        strongBuyScore: testMode ? 8.0 : 9.0,
        rsiOversold: testMode ? 35 : 30,
      },
      sellConditions: {
        rsiOverbought: testMode ? 65 : 70,
      },
      riskManagement: {
        maxPositionSize: 0.15,
      },
    },
  };

  // 🎯 기존 useSignalGenerator 활용
  const { generateTradingSignal, getSignalStats, clearCache } =
    useSignalGenerator(
      tradingSettings,
      null, // marketCondition
      null, // marketSentiment
      addLog,
      updateStats,
      testMode
    );

  // 🎯 시스템 초기화
  const initializeManager = useCallback(
    async (centralDataManager) => {
      try {
        addLog("🚀 신호 매니저 초기화 시작", "info");

        if (centralDataManager) {
          await signalGenerator.initialize(centralDataManager);
          setIsInitialized(true);
          addLog("✅ 신호 매니저 초기화 완료", "success");
        }

        setError(null);
      } catch (err) {
        const errorMsg = `초기화 실패: ${err.message}`;
        addLog(`❌ ${errorMsg}`, "error");
        setError(errorMsg);
      }
    },
    [addLog]
  );

  // 🎯 실제 마켓 데이터 기반 신호 생성
  const generateSignalsForCoins = useCallback(
    async (coinList = []) => {
      if (!isInitialized || !coinList.length) {
        addLog("⚠️ 신호 생성 조건 미충족", "warning");
        return [];
      }

      setIsProcessing(true);
      try {
        addLog(`🎯 ${coinList.length}개 코인 신호 생성 시작`, "info");

        const newSignals = [];

        // 🔥 실제 중앙 데이터에서 마켓 데이터 가져오기
        for (const coin of coinList) {
          try {
            // 실제 마켓 데이터 구성 (centralDataManager에서 가져온다고 가정)
            const marketData = await getMarketDataFromCache(coin);

            if (marketData) {
              const signal = await generateTradingSignal(marketData);
              if (signal) {
                // 추가 메타데이터 포함
                const enrichedSignal = {
                  ...signal,
                  id: `${coin}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  generatedAt: new Date().toISOString(),
                  tradingMode,
                  source: "useSignalManager",
                };
                newSignals.push(enrichedSignal);
                addLog(
                  `✅ ${coin} 신호 생성: ${signal.type} (${signal.totalScore.toFixed(1)}점)`,
                  "success"
                );
              }
            }
          } catch (error) {
            addLog(`❌ ${coin} 신호 생성 실패: ${error.message}`, "error");
          }
        }

        setSignals(newSignals);
        setLastUpdateTime(new Date());
        setError(null);

        addLog(`📊 총 ${newSignals.length}개 신호 생성 완료`, "info");
        updateStats((prev) => ({
          ...prev,
          signalsGenerated: (prev.signalsGenerated || 0) + newSignals.length,
        }));

        return newSignals;
      } catch (err) {
        const errorMsg = `신호 생성 실패: ${err.message}`;
        addLog(`❌ ${errorMsg}`, "error");
        setError(errorMsg);
        return [];
      } finally {
        setIsProcessing(false);
      }
    },
    [isInitialized, generateTradingSignal, addLog, updateStats, tradingMode]
  );

  // 🎯 마켓 데이터 가져오기 (실제 구현 필요)
  const getMarketDataFromCache = useCallback(async (symbol) => {
    // 실제로는 centralDataManager에서 캐시된 데이터를 가져와야 함
    // 지금은 시뮬레이션 데이터
    return {
      symbol,
      trade_price: Math.random() * 100000 + 10000,
      signed_change_rate: (Math.random() - 0.5) * 0.1,
      acc_trade_price_24h: Math.random() * 1000000000 + 100000000,
      rsi: Math.random() * 100,
      macd: {
        line: Math.random() * 0.01 - 0.005,
        signal: Math.random() * 0.01 - 0.005,
        histogram: Math.random() * 0.01 - 0.005,
      },
      volume24h: Math.random() * 1000000000,
      timestamp: new Date().toISOString(),
    };
  }, []);

  // 🎯 자동 신호 생성 (활성화 시)
  useEffect(() => {
    if (isActive && isInitialized) {
      const defaultCoins = [
        "BTC",
        "ETH",
        "XRP",
        "ADA",
        "SOL",
        "AVAX",
        "DOT",
        "MATIC",
      ];

      // 즉시 첫 신호 생성
      generateSignalsForCoins(defaultCoins);

      // 주기적 업데이트 (5분마다)
      intervalRef.current = setInterval(() => {
        if (!isProcessing) {
          // 처리 중이 아닐 때만
          generateSignalsForCoins(defaultCoins);
        }
      }, 300000);

      addLog("📡 자동 신호 생성 시작 (5분 주기)", "info");
    } else if (!isActive && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      addLog("🛑 자동 신호 생성 중지", "info");
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, isInitialized, generateSignalsForCoins, isProcessing, addLog]);

  // 🎯 신호 실행
  const executeSignal = useCallback(
    (signal) => {
      addLog(`🎯 신호 실행 요청: ${signal.symbol} ${signal.type}`, "info");

      setSignals((prev) =>
        prev.map((s) =>
          s.id === signal.id
            ? {
                ...s,
                executed: true,
                status: "executed",
                executedAt: new Date().toISOString(),
              }
            : s
        )
      );

      updateStats((prev) => ({
        ...prev,
        tradesExecuted: (prev.tradesExecuted || 0) + 1,
      }));

      return { ...signal, executed: true };
    },
    [addLog, updateStats]
  );

  // 🎯 수동 새로고침
  const refreshSignals = useCallback(
    async (customCoins = null) => {
      const coinList = customCoins || [
        "BTC",
        "ETH",
        "XRP",
        "ADA",
        "SOL",
        "AVAX",
        "DOT",
        "MATIC",
      ];
      addLog(`🔄 수동 신호 새로고침: ${coinList.length}개 코인`, "info");
      return await generateSignalsForCoins(coinList);
    },
    [generateSignalsForCoins, addLog]
  );

  // 🎯 통계 조회
  const getManagerStats = useCallback(() => {
    const generatorStats = getSignalStats();
    return {
      ...generatorStats,
      signalCount: signals.length,
      lastUpdate: lastUpdateTime,
      isActive,
      isInitialized,
      isProcessing,
      error,
      tradingMode,
      executedCount: signals.filter((s) => s.executed).length,
    };
  }, [
    getSignalStats,
    signals,
    lastUpdateTime,
    isActive,
    isInitialized,
    isProcessing,
    error,
    tradingMode,
  ]);

  // 🎯 캐시 초기화
  const resetManager = useCallback(() => {
    clearCache();
    setSignals([]);
    setError(null);
    setLastUpdateTime(null);
    addLog("🧹 신호 매니저 캐시 초기화", "info");
  }, [clearCache, addLog]);

  return {
    // 상태
    signals,
    isInitialized,
    isProcessing,
    error,
    lastUpdateTime,

    // 함수
    initializeManager,
    refreshSignals,
    executeSignal,
    getManagerStats,
    resetManager,

    // 통계
    signalCount: signals.length,
    executedCount: signals.filter((s) => s.executed).length,
    hasHighConfidenceSignals: signals.some((s) => s.confidence === "HIGH"),
  };
};

export default useSignalManager;
