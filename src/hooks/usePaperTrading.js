// src/hooks/usePaperTrading.js - 관심사 분리된 메인 훅
import { useState, useEffect, useCallback, useRef } from "react";
import { useCoinStore } from "../stores/coinStore";
import { paperTradingEngine } from "../services/testing/paperTradingEngine";
import { batchTradingService } from "../services/batch/batchTradingService";
import { marketAnalysisService } from "../services/analysis/marketAnalysis";

// 분리된 훅들 import
import { useTradingLogger } from "./useTradingLogger";
import { usePortfolioManager } from "./usePortfolioManager";
import { useWebSocketConnection } from "./useWebSocketConnection";
import { useMarketSentiment } from "./useMarketSentiment";
import { useSignalGenerator } from "./useSignalGenerator";

export const usePaperTrading = (
  userId = "demo-user",
  externalSettings = null
) => {
  const selectedCoins = useCoinStore((s) => s.selectedCoins || []);

  // State
  const [isActive, setIsActive] = useState(false);
  const [lastSignal, setLastSignal] = useState(null);
  const [marketData, setMarketData] = useState(new Map());
  const [marketCondition, setMarketCondition] = useState(null);
  const [coinSettings, setCoinSettings] = useState(new Map());
  const [tradingMode, setTradingMode] = useState("favorites");
  const [topCoinsLimit, setTopCoinsLimit] = useState(6);
  const [testMode, setTestMode] = useState(false);
  const [operationMode, setOperationMode] = useState(
    process.env.NODE_ENV === "development" ? "websocket" : "scheduled"
  );

  // Settings
  const getInitialSettings = () => {
    if (externalSettings) {
      return {
        ...externalSettings,
        aggressiveMode: false,
        signalSensitivity: 0.2,
      };
    }
    return {
      buyThreshold: -1.5,
      sellThreshold: 2.0,
      rsiOversold: 35,
      rsiOverbought: 65,
      minScore: 6.5,
      maxCoinsToTrade: 6,
      reserveCashRatio: 0.2,
      aggressiveMode: false,
      signalSensitivity: 0.2,
      requireMultipleSignals: true,
      minConfidenceLevel: 0.7,
      marketAnalysisWeight: 0.3,
      waitBetweenTrades: 300000,
    };
  };

  const [tradingSettings, setTradingSettings] = useState(getInitialSettings());

  // Refs
  const isActiveRef = useRef(isActive);
  const selectedCoinsRef = useRef(selectedCoins);
  const tradingSettingsRef = useRef(tradingSettings);
  const marketConditionRef = useRef(null);
  const lastTradeTime = useRef(new Map());
  const pollingIntervalRef = useRef(null);

  // 분리된 훅들 사용
  const { logs, monitoringStats, addLog, updateStats, resetStats } =
    useTradingLogger();
  const { portfolio, updatePortfolio } = usePortfolioManager(
    marketData,
    addLog
  );
  const { marketSentiment, sentimentLoading, fetchMarketSentiment } =
    useMarketSentiment(addLog, isActive);

  // 타겟 마켓 가져오기
  const getTargetMarkets = useCallback(() => {
    const MAX_MARKETS = marketConditionRef.current?.maxPositions || 6;
    if (tradingMode === "favorites") {
      const favoriteMarkets = selectedCoinsRef.current.map(
        (coin) => coin.market || `KRW-${coin.symbol}`
      );
      return favoriteMarkets.slice(0, MAX_MARKETS);
    }
    const extendedFallback = [
      "KRW-BTC",
      "KRW-ETH",
      "KRW-XRP",
      "KRW-ADA",
      "KRW-SOL",
      "KRW-DOGE",
    ];
    return extendedFallback.slice(0, MAX_MARKETS);
  }, [tradingMode]);

  const { generateTradingSignal, volumeHistory } = useSignalGenerator(
    tradingSettings,
    marketCondition,
    marketSentiment,
    addLog,
    updateStats,
    testMode
  );

  // 마켓 데이터 처리 핸들러
  const handleMarketData = useCallback(
    async (data) => {
      if (!isActiveRef.current || operationMode === "scheduled") return;

      const symbol = data.code.replace("KRW-", "");
      updateStats((prev) => ({ ...prev, dataReceived: prev.dataReceived + 1 }));
      setMarketData((prev) => new Map(prev.set(symbol, data)));

      // 타겟 코인인지 확인
      let isTargetCoin = false;
      if (tradingMode === "favorites") {
        isTargetCoin = selectedCoinsRef.current.some(
          (coin) => coin.symbol === symbol || coin.market === data.code
        );
      } else if (tradingMode === "top") {
        const targetMarkets = getTargetMarkets();
        isTargetCoin = targetMarkets.includes(data.code);
      }

      if (!isTargetCoin) return;

      // 가격 업데이트
      paperTradingEngine.updateCoinPrice(symbol, data.trade_price);

      // 신호 생성 및 거래 실행
      const signal = await generateTradingSignal(data);
      if (signal) {
        setLastSignal(signal);
        try {
          const result = await paperTradingEngine.executeSignal(signal);
          if (result?.executed) {
            lastTradeTime.current.set(symbol, Date.now());
            addLog(
              `✅ ${signal.symbol} ${signal.type} 거래 완료! 가격: ${signal.price.toLocaleString()}원`,
              "success"
            );
            updateStats((prev) => ({
              ...prev,
              tradesExecuted: prev.tradesExecuted + 1,
            }));

            // 거래 완료 후 즉시 포트폴리오 업데이트
            setTimeout(() => updatePortfolio(true), 100);
          } else {
            addLog(
              `⚠️ ${signal.symbol} ${signal.type} 거래 실패: ${result?.reason}`,
              "warning"
            );
          }
        } catch (error) {
          addLog(`❌ 거래 실행 실패: ${error.message}`, "error");
        }
      }
    },
    [
      operationMode,
      tradingMode,
      getTargetMarkets,
      generateTradingSignal,
      updateStats,
      addLog,
      updatePortfolio,
    ]
  );

  const { isConnected, connectionStatus, sendSubscription, reconnect } =
    useWebSocketConnection(
      handleMarketData,
      addLog,
      tradingMode,
      getTargetMarkets
    );

  // 시장 조건 업데이트
  const updateMarketCondition = useCallback(async () => {
    try {
      const condition = await marketAnalysisService.analyzeMarketCondition();
      setMarketCondition(condition);
      marketConditionRef.current = condition;
      updateStats((prev) => ({
        ...prev,
        marketConditionsChecked: prev.marketConditionsChecked + 1,
      }));

      if (!condition.isBuyableMarket) {
        addLog(
          `🚫 시장 조건 부적절: ${condition.buyability.level} (점수: ${condition.overallBuyScore})`,
          "warning"
        );
      } else {
        addLog(
          `✅ 시장 분석 완료: ${condition.buyability.level} (점수: ${condition.overallBuyScore})`,
          "info"
        );
      }

      if (
        !marketSentiment ||
        Date.now() - new Date(marketSentiment.timestamp).getTime() >
          30 * 60 * 1000
      ) {
        await fetchMarketSentiment();
      }

      return condition;
    } catch (error) {
      addLog(`❌ 시장 분석 실패: ${error.message}`, "error");
      return null;
    }
  }, [addLog, fetchMarketSentiment, marketSentiment, updateStats]);

  // 트레이딩 시작
  const startPaperTrading = useCallback(async () => {
    if (isActiveRef.current) return;
    if (tradingMode === "favorites" && selectedCoinsRef.current.length === 0) {
      addLog("❌ 관심 코인을 먼저 추가해주세요", "error");
      return;
    }

    try {
      setIsActive(true);
      isActiveRef.current = true;
      resetStats();

      addLog("🚀 감정분석 통합 페이퍼 트레이딩 시작", "success");
      addLog("📊 시장 분석 중...", "info");

      const [marketCondition] = await Promise.all([
        updateMarketCondition(),
        fetchMarketSentiment(),
      ]);

      if (marketCondition) {
        if (!marketCondition.isBuyableMarket) {
          addLog("⚠️ 시장 조건이 좋지 않음 - 신중한 거래 모드", "warning");
        }
        addLog(
          `💰 권장 현금 비율: ${(marketCondition.recommendedCashRatio * 100).toFixed(1)}%`,
          "info"
        );
        addLog(`📈 최대 포지션 수: ${marketCondition.maxPositions}개`, "info");
      }

      await updatePortfolio(true);

      if (operationMode === "scheduled") {
        addLog("📅 스케줄 모드 시작 - 감정분석 통합", "success");
        await batchTradingService.startScheduledTrading();
      } else if (operationMode === "websocket") {
        addLog("📡 실시간 모니터링 시작 - 감정분석 통합", "success");
        if (isConnected) {
          setTimeout(() => sendSubscription(), 200);
        }
      }

      // 시장 조건 정기 업데이트 (10분마다)
      const marketUpdateInterval = setInterval(async () => {
        if (isActiveRef.current) {
          await updateMarketCondition();
        }
      }, 600000);
      pollingIntervalRef.current = marketUpdateInterval;

      addLog(
        testMode
          ? "🧪 테스트 모드: 감정분석 포함 관대한 테스트"
          : "🎯 실전 모드: 감정분석 기반 엄격한 거래",
        "info"
      );
    } catch (error) {
      addLog(`❌ 시작 실패: ${error.message}`, "error");
      setIsActive(false);
      isActiveRef.current = false;
    }
  }, [
    tradingMode,
    testMode,
    addLog,
    resetStats,
    updateMarketCondition,
    fetchMarketSentiment,
    updatePortfolio,
    operationMode,
    isConnected,
    sendSubscription,
  ]);

  // 트레이딩 중지
  const stopPaperTrading = useCallback(() => {
    setIsActive(false);
    isActiveRef.current = false;
    batchTradingService.stopScheduledTrading();

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    addLog(`⏹️ 감정분석 통합 페이퍼 트레이딩 중지`, "warning");
  }, [addLog]);

  // 테스트 모드 토글
  const toggleTestMode = useCallback(() => {
    setTestMode((prev) => {
      const newTestMode = !prev;
      if (newTestMode) {
        setTradingSettings((prevSettings) => ({
          ...prevSettings,
          buyThreshold: -0.8,
          minScore: 5.0,
          requireMultipleSignals: false,
          aggressiveMode: true,
          signalSensitivity: 0.4,
        }));
        addLog("🧪 테스트 모드 활성화 - 더 관대한 조건", "info");
      } else {
        setTradingSettings((prevSettings) => ({
          ...prevSettings,
          buyThreshold: -1.5,
          minScore: 6.5,
          requireMultipleSignals: true,
          aggressiveMode: false,
          signalSensitivity: 0.2,
        }));
        addLog("🎯 실전 모드 복구 - 엄격한 조건", "info");
      }
      return newTestMode;
    });
  }, [addLog]);

  // Refs 동기화
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
  useEffect(() => {
    selectedCoinsRef.current = selectedCoins;
  }, [selectedCoins]);
  useEffect(() => {
    tradingSettingsRef.current = tradingSettings;
  }, [tradingSettings]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  return {
    // 상태
    portfolio,
    isActive,
    isConnected,
    connectionStatus,
    lastSignal,
    logs,
    marketData,
    marketCondition,
    monitoringStats,
    marketSentiment,
    sentimentLoading,

    // 설정
    selectedCoins,
    tradingMode,
    setTradingMode,
    topCoinsLimit,
    setTopCoinsLimit,
    tradingSettings,
    setTradingSettings,
    testMode,
    operationMode,
    setOperationMode,

    // 액션
    startPaperTrading,
    stopPaperTrading,
    updatePortfolio,
    reconnect,
    addLog,
    toggleTestMode,
    refreshMarketCondition: updateMarketCondition,
    fetchMarketSentiment,

    // 유틸리티
    selectedCoinsCount: selectedCoins.length,
    hasSelectedCoins: selectedCoins.length > 0,
    coinSettings,
    isDevelopment: process.env.NODE_ENV === "development",
  };
};

export default usePaperTrading;
