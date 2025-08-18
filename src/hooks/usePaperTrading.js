// src/hooks/usePaperTrading.js - 완전 수정 버전 (신중한 매수 시스템)

import { useState, useEffect, useCallback, useRef } from "react";
import { useCoinStore } from "../stores/coinStore";
import { paperTradingEngine } from "../services/testing/paperTradingEngine";
import { newsService } from "../services/news/newsService";
import { useResilientWebSocket } from "./useResilientWebSocket";
import { batchTradingService } from "../services/batch/batchTradingService";
import { marketAnalysisService } from "../services/analysis/marketAnalysis";

export const usePaperTrading = (
  userId = "demo-user",
  externalSettings = null
) => {
  const selectedCoins = useCoinStore((s) => s.selectedCoins || []);
  const [portfolio, setPortfolio] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [lastSignal, setLastSignal] = useState(null);
  const [marketData, setMarketData] = useState(new Map());
  const [logs, setLogs] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [marketCondition, setMarketCondition] = useState(null);
  const [coinSettings, setCoinSettings] = useState(new Map());

  const getInitialSettings = () => {
    if (externalSettings) {
      return {
        ...externalSettings,
        aggressiveMode: false, // ✅ 기본적으로 신중한 모드
        signalSensitivity: 0.2, // ✅ 낮은 민감도
      };
    }

    return {
      // ✅ 더 엄격한 기본 설정
      buyThreshold: -1.5, // 1.5% 하락 시 매수 검토
      sellThreshold: 2.0, // 2% 상승 시 매도 검토
      rsiOversold: 35, // RSI 35 이하
      rsiOverbought: 65, // RSI 65 이상
      minScore: 6.5, // 최소 6.5점
      maxCoinsToTrade: 6, // 최대 6개 코인
      reserveCashRatio: 0.2, // 20% 현금 보유
      aggressiveMode: false,
      signalSensitivity: 0.2,

      // ✅ 신중한 매수를 위한 추가 설정
      requireMultipleSignals: true, // 복수 신호 요구
      minConfidenceLevel: 0.7, // 최소 신뢰도 70%
      marketAnalysisWeight: 0.3, // 시장 분석 비중 30%
      waitBetweenTrades: 300000, // 거래 간 5분 대기
    };
  };

  const [tradingSettings, setTradingSettings] = useState(getInitialSettings());
  const [monitoringStats, setMonitoringStats] = useState({
    dataReceived: 0,
    signalsGenerated: 0,
    tradesExecuted: 0,
    signalsRejected: 0,
    lastActivity: null,
    signalsEvaluated: 0,
    conditionsMet: 0,
    marketConditionsChecked: 0,
  });

  // ✅ 환경에 따른 모드 설정
  const isDevelopment = process.env.NODE_ENV === "development";
  const defaultMode = isDevelopment ? "websocket" : "scheduled";
  const [operationMode, setOperationMode] = useState(defaultMode);
  const [tradingMode, setTradingMode] = useState("favorites");
  const [topCoinsLimit, setTopCoinsLimit] = useState(6); // ✅ 더 적은 수로 시작
  const [testMode, setTestMode] = useState(false); // ✅ 기본적으로 실전 모드

  // Refs
  const isActiveRef = useRef(isActive);
  const selectedCoinsRef = useRef(selectedCoins);
  const tradingSettingsRef = useRef(tradingSettings);
  const pollingIntervalRef = useRef(null);
  const logIdCounter = useRef(0);
  const priceHistory = useRef(new Map());
  const volumeHistory = useRef(new Map());
  const lastSignalTime = useRef(new Map());
  const lastTradeTime = useRef(new Map()); // ✅ 마지막 거래 시간 추적
  const operationModeRef = useRef(operationMode);
  const marketConditionRef = useRef(null);
  const pendingSignals = useRef(new Map()); // ✅ 대기 중인 신호들

  const LOG_LEVELS = {
    ERROR: 0,
    WARNING: 1,
    SUCCESS: 2,
    INFO: 3,
    DEBUG: 4,
  };

  const CURRENT_LOG_LEVEL = LOG_LEVELS.INFO; // ✅ INFO 레벨로 조정

  // ✅ 로그 추가 함수
  const addLog = useCallback(
    (msg, type = "info") => {
      const typeLevel =
        {
          error: LOG_LEVELS.ERROR,
          warning: LOG_LEVELS.WARNING,
          success: LOG_LEVELS.SUCCESS,
          info: LOG_LEVELS.INFO,
          debug: LOG_LEVELS.DEBUG,
        }[type] || LOG_LEVELS.INFO;

      if (typeLevel > CURRENT_LOG_LEVEL) return;

      logIdCounter.current += 1;
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 100000);
      const counter = logIdCounter.current;
      const uniqueId = `${timestamp}_${counter}_${random}_${type}`;

      const newLog = {
        id: uniqueId,
        timestamp: new Date().toLocaleTimeString(),
        message: msg,
        type,
      };

      setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
      console.log(`[${type.toUpperCase()}] ${msg}`);

      setMonitoringStats((prev) => ({
        ...prev,
        lastActivity: new Date().toLocaleTimeString(),
      }));
    },
    [CURRENT_LOG_LEVEL]
  );

  // ✅ 시장 조건 분석 및 업데이트
  const updateMarketCondition = useCallback(async () => {
    try {
      const condition = await marketAnalysisService.analyzeMarketCondition();
      setMarketCondition(condition);
      marketConditionRef.current = condition;

      setMonitoringStats((prev) => ({
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

      return condition;
    } catch (error) {
      addLog(`❌ 시장 분석 실패: ${error.message}`, "error");
      return null;
    }
  }, [addLog]);

  // ✅ 동적 코인 설정 생성
  const updateCoinSettings = useCallback(
    async (marketCondition) => {
      if (!marketCondition) return;

      const newCoinSettings = new Map();
      const coins =
        tradingMode === "favorites"
          ? selectedCoinsRef.current
          : [{ symbol: "BTC" }, { symbol: "ETH" }, { symbol: "ADA" }]; // fallback

      for (const coin of coins) {
        const userPreferences = {
          // 사용자 설정이나 과거 성과 기반으로 조정 가능
          priority: coin.priority || "medium",
          maxPositionRatio: coin.maxPosition || 0.12,
          riskTolerance: coin.riskLevel || 3,
        };

        const coinSetting = await marketAnalysisService.analyzeCoinCondition(
          coin.symbol,
          marketCondition,
          userPreferences
        );

        newCoinSettings.set(coin.symbol, coinSetting);
      }

      setCoinSettings(newCoinSettings);
      addLog(`🔧 ${coins.length}개 코인 설정 업데이트`, "info");
    },
    [tradingMode, selectedCoinsRef]
  );

  // ✅ RSI 계산 (기존과 동일)
  const calculateRealTimeRSI = useCallback((symbol, currentPrice) => {
    if (!priceHistory.current.has(symbol)) {
      priceHistory.current.set(symbol, []);
    }

    const prices = priceHistory.current.get(symbol);
    prices.push(currentPrice);
    if (prices.length > 50) {
      prices.shift();
    }

    if (prices.length < 14) {
      const recentPrices = prices.slice(-5);
      if (recentPrices.length < 2) return 50;

      const avgChange =
        recentPrices.reduce((sum, price, idx) => {
          if (idx === 0) return sum;
          return sum + (price - recentPrices[idx - 1]) / recentPrices[idx - 1];
        }, 0) /
        (recentPrices.length - 1);

      return Math.max(20, Math.min(80, 50 + avgChange * 1000));
    }

    return calculateRSI(prices);
  }, []);

  const calculateRSI = useCallback((prices, period = 14) => {
    if (prices.length < period + 1) return 50;

    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain =
      gains.slice(-period).reduce((a, b) => a + b, 0) / period || 0;
    const avgLoss =
      losses.slice(-period).reduce((a, b) => a + b, 0) / period || 0;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }, []);

  // ✅ 뉴스 캐시 (기존과 동일하지만 timeout 조정)
  const newsCache = useRef(new Map());
  const NEWS_CACHE_DURATION = 600000; // 10분으로 연장

  const fetchNewsForSymbol = useCallback(async (symbol) => {
    try {
      const coinSymbol = symbol.replace("KRW-", "").toUpperCase();
      const cacheKey = coinSymbol;
      const now = Date.now();
      const cached = newsCache.current.get(cacheKey);

      if (cached && now - cached.timestamp < NEWS_CACHE_DURATION) {
        return cached.data;
      }

      const mockNewsScore = Math.random() * 4 + 3; // 3-7점
      const newsData = {
        score: mockNewsScore,
        sentiment:
          mockNewsScore > 6
            ? "positive"
            : mockNewsScore < 4
              ? "negative"
              : "neutral",
        strength: "moderate",
        cached: false,
        mock: true,
      };

      newsCache.current.set(cacheKey, {
        data: newsData,
        timestamp: now,
      });

      return newsData;
    } catch (error) {
      return {
        score: 5.0,
        sentiment: "neutral",
        strength: "neutral",
        cached: false,
        error: error.message,
      };
    }
  }, []);

  // ✅ 엄격한 신호 생성 시스템
  const generateTradingSignal = useCallback(
    async (md) => {
      try {
        const symbol = md.code.replace("KRW-", "");
        const price = md.trade_price;
        const changePercent = (md.signed_change_rate || 0) * 100;

        setMonitoringStats((prev) => ({
          ...prev,
          signalsEvaluated: prev.signalsEvaluated + 1,
        }));

        // ✅ 1단계: 시장 조건 확인
        const currentMarketCondition = marketConditionRef.current;
        if (
          !currentMarketCondition ||
          !currentMarketCondition.isBuyableMarket
        ) {
          addLog(
            `🚫 ${symbol}: 시장 조건 부적절 (점수: ${currentMarketCondition?.overallBuyScore || "N/A"})`,
            "debug"
          );
          return null;
        }

        // ✅ 2단계: 거래 간격 확인
        const lastTrade = lastTradeTime.current.get(symbol) || 0;
        const now = Date.now();
        const settings = tradingSettingsRef.current;

        if (now - lastTrade < settings.waitBetweenTrades) {
          return null; // 너무 빨른 거래 방지
        }

        // ✅ 3단계: 신호 간격 확인
        const lastSignal = lastSignalTime.current.get(symbol) || 0;
        if (now - lastSignal < 120000) {
          // 2분 간격
          return null;
        }

        // ✅ 4단계: 기술적 분석
        const rsi = calculateRealTimeRSI(symbol, price);
        const newsData = await fetchNewsForSymbol(symbol);

        // ✅ 5단계: 매수 조건 검사 (복수 조건 필요)
        const buyConditions = [
          changePercent <= settings.buyThreshold, // 충분한 하락
          rsi <= settings.rsiOversold, // RSI 과매도
          newsData.score >= 5.0, // 뉴스 중립 이상
          md.trade_volume > (volumeHistory.current.get(symbol) || 0) * 1.1, // 거래량 증가
        ];

        const satisfiedConditions = buyConditions.filter(Boolean).length;
        const requiredConditions = settings.requireMultipleSignals ? 3 : 2;

        if (satisfiedConditions < requiredConditions) {
          addLog(
            `📊 ${symbol}: 매수 조건 부족 (${satisfiedConditions}/${requiredConditions})`,
            "debug"
          );
          setMonitoringStats((prev) => ({
            ...prev,
            signalsRejected: prev.signalsRejected + 1,
          }));
          return null;
        }

        // ✅ 6단계: 점수 계산 (더 엄격)
        let techScore = 5.0;

        if (changePercent <= -3.0 && rsi <= 30) techScore = 9.0;
        else if (changePercent <= -2.0 && rsi <= 35) techScore = 8.0;
        else if (changePercent <= -1.5 && rsi <= 40) techScore = 7.0;
        else if (changePercent <= -1.0) techScore = 6.0;
        else if (rsi <= 35) techScore = 6.5;

        const marketScore = currentMarketCondition.overallBuyScore / 10; // 0-10점으로 정규화
        const compositeScore =
          techScore * 0.5 + newsData.score * 0.2 + marketScore * 0.3;

        // ✅ 7단계: 최종 점수 검증
        if (compositeScore < settings.minScore) {
          addLog(
            `📊 ${symbol}: 점수 부족 (${compositeScore.toFixed(2)} < ${settings.minScore})`,
            "debug"
          );
          setMonitoringStats((prev) => ({
            ...prev,
            signalsRejected: prev.signalsRejected + 1,
          }));
          return null;
        }

        // ✅ 8단계: 매도 조건 검사
        let signalType = "BUY";
        if (
          changePercent >= settings.sellThreshold ||
          rsi >= settings.rsiOverbought
        ) {
          signalType = "SELL";
        }

        // ✅ 9단계: 신호 생성
        lastSignalTime.current.set(symbol, now);

        const signal = {
          symbol,
          type: signalType,
          price,
          totalScore: Number(compositeScore.toFixed(2)),
          confidence:
            compositeScore >= 7.5
              ? "high"
              : compositeScore >= 6.5
                ? "medium"
                : "low",
          reason: `${symbol} ${signalType} - 기술:${techScore.toFixed(1)}, 시장:${marketScore.toFixed(1)}, 뉴스:${newsData.score.toFixed(1)}`,
          timestamp: new Date(),
          changePercent: Number(changePercent.toFixed(2)),
          technicalAnalysis: { rsi, techScore },
          newsAnalysis: newsData,
          marketAnalysis: currentMarketCondition.buyability,
          satisfiedConditions,
          testMode: testMode,
        };

        addLog(
          `🎯 ${symbol} ${signalType} 신호! 점수=${compositeScore.toFixed(1)} (조건:${satisfiedConditions}/${requiredConditions})`,
          signalType === "BUY" ? "success" : "warning"
        );

        setMonitoringStats((prev) => ({
          ...prev,
          signalsGenerated: prev.signalsGenerated + 1,
          conditionsMet: prev.conditionsMet + 1,
        }));

        return signal;
      } catch (error) {
        addLog(`❌ ${md.code} 신호 생성 실패: ${error.message}`, "error");
        return null;
      }
    },
    [calculateRealTimeRSI, fetchNewsForSymbol, addLog, testMode]
  );

  // ✅ 타겟 마켓 확인 (기존과 동일)
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

  // ✅ 마켓 데이터 처리 (수정된 버전)
  const handleMarketData = useCallback(
    async (data) => {
      if (!isActiveRef.current || operationModeRef.current === "scheduled") {
        return;
      }

      const symbol = data.code.replace("KRW-", "");

      setMonitoringStats((prev) => ({
        ...prev,
        dataReceived: prev.dataReceived + 1,
      }));

      setMarketData((prev) => new Map(prev.set(symbol, data)));

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

      // 거래량 히스토리 업데이트
      volumeHistory.current.set(symbol, data.trade_volume);

      // 가격 로그 (60초마다로 조정)
      const now = Date.now();
      const key = "__lastDataLog";
      const last = window[key]?.get?.(symbol) || 0;
      if (now - last > 60000) {
        const cp = (data.signed_change_rate || 0) * 100;
        const icon = cp >= 0 ? "📈" : "📉";
        addLog(
          `${icon} ${symbol}: ${data.trade_price.toLocaleString()}원 (${cp >= 0 ? "+" : ""}${cp.toFixed(2)}%)`,
          "debug"
        );
        if (!window[key]) window[key] = new Map();
        window[key].set(symbol, now);
      }

      // 실시간 가격 업데이트
      paperTradingEngine.updateCoinPrice(symbol, data.trade_price);

      // 신호 생성 및 거래 실행
      const signal = await generateTradingSignal(data);
      if (signal) {
        setLastSignal(signal);
        try {
          const result = await paperTradingEngine.executeSignal(signal);
          if (result?.executed) {
            lastTradeTime.current.set(symbol, now);
            addLog(
              `✅ ${signal.symbol} ${signal.type} 거래 완료! 가격: ${signal.price.toLocaleString()}원`,
              "success"
            );
            setMonitoringStats((prev) => ({
              ...prev,
              tradesExecuted: prev.tradesExecuted + 1,
            }));
            updatePortfolio();
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
    [generateTradingSignal, addLog, tradingMode, getTargetMarkets]
  );

  // ✅ WebSocket 구독 (기존과 동일)
  const sendSubscription = useCallback(() => {
    const markets = getTargetMarkets();
    if (markets.length === 0) return;

    const msg = JSON.stringify([
      { ticket: `cryptowise-${Date.now()}` },
      { type: "ticker", codes: markets },
    ]);

    const sent = sendMessage(msg);
    if (sent) {
      addLog(
        `📡 구독: ${markets.length}개 코인 (${tradingMode}) - ${markets.slice(0, 3).join(", ")}${markets.length > 3 ? "..." : ""}`,
        "info"
      );
    } else {
      addLog(`⚠️ WebSocket 연결 대기 중`, "warning");
    }
  }, [getTargetMarkets, addLog, tradingMode]);

  // WebSocket 연결
  const { isConnected, reconnect, disconnect, sendMessage } =
    useResilientWebSocket("wss://api.upbit.com/websocket/v1", {
      onMessage: handleMarketData,
      onConnect: () => {
        setConnectionStatus("connected");
        addLog("📡 WebSocket 연결됨", "success");
        setTimeout(() => {
          sendSubscription();
        }, 200);
      },
      onDisconnect: () => {
        setConnectionStatus("disconnected");
        addLog("🔌 연결 끊어짐", "warning");
      },
      autoReconnect: true,
      maxReconnectAttempts: 10,
      reconnectInterval: 3000,
      maxReconnectInterval: 30000,
    });

  const updatePortfolio = useCallback(async () => {
    try {
      const portfolioData = paperTradingEngine.getPortfolioSummary();
      setPortfolio(portfolioData);
    } catch (error) {
      addLog(`포트폴리오 업데이트 실패: ${error.message}`, "error");
    }
  }, [addLog]);

  // ✅ 통합 시작 함수 (수정된 버전)
  const startPaperTrading = useCallback(async () => {
    if (isActiveRef.current) return;

    if (tradingMode === "favorites" && selectedCoinsRef.current.length === 0) {
      addLog("❌ 관심 코인을 먼저 추가해주세요", "error");
      return;
    }

    try {
      setIsActive(true);
      isActiveRef.current = true;

      // 통계 초기화
      setMonitoringStats({
        dataReceived: 0,
        signalsGenerated: 0,
        tradesExecuted: 0,
        signalsRejected: 0,
        signalsEvaluated: 0,
        conditionsMet: 0,
        marketConditionsChecked: 0,
        lastActivity: new Date().toLocaleTimeString(),
      });

      addLog("🚀 신중한 페이퍼 트레이딩 시작", "success");
      addLog("📊 시장 분석 중...", "info");

      // ✅ 시장 조건 분석
      const marketCondition = await updateMarketCondition();
      if (marketCondition) {
        await updateCoinSettings(marketCondition);

        if (!marketCondition.isBuyableMarket) {
          addLog("⚠️ 시장 조건이 좋지 않음 - 신중한 거래 모드", "warning");
        }

        addLog(
          `💰 권장 현금 비율: ${(marketCondition.recommendedCashRatio * 100).toFixed(1)}%`,
          "info"
        );
        addLog(`📈 최대 포지션 수: ${marketCondition.maxPositions}개`, "info");
      }

      updatePortfolio();

      // 운영 모드별 시작
      if (operationMode === "scheduled") {
        addLog("📅 스케줄 모드 시작 - 신중한 분석 기반", "success");
        await batchTradingService.startScheduledTrading();
      } else if (operationMode === "websocket") {
        addLog("📡 실시간 모니터링 시작 - 신중한 신호 분석", "success");
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

      // cleanup을 위해 ref에 저장
      pollingIntervalRef.current = marketUpdateInterval;

      if (!testMode) {
        addLog("🎯 실전 모드: 엄격한 조건으로 신중한 거래", "info");
      } else {
        addLog("🧪 테스트 모드: 더 관대한 조건으로 테스트", "info");
      }
    } catch (error) {
      addLog(`❌ 시작 실패: ${error.message}`, "error");
      setIsActive(false);
      isActiveRef.current = false;
    }
  }, [
    operationMode,
    tradingMode,
    testMode,
    addLog,
    updatePortfolio,
    updateMarketCondition,
    updateCoinSettings,
    isConnected,
    sendSubscription,
  ]);

  // 중지 함수
  const stopPaperTrading = useCallback(() => {
    setIsActive(false);
    isActiveRef.current = false;

    batchTradingService.stopScheduledTrading();

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    addLog(`⏹️ 신중한 페이퍼 트레이딩 중지`, "warning");
  }, [addLog]);

  // 나머지 함수들 (기존과 동일)
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

  useEffect(() => {
    operationModeRef.current = operationMode;
  }, [operationMode]);

  // ✅ 시장 조건 변화 감지
  useEffect(() => {
    if (isActive && marketCondition) {
      updateCoinSettings(marketCondition);
    }
  }, [isActive, marketCondition, updateCoinSettings]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const executeImmediateBatch = useCallback(async () => {
    addLog("🧪 개발자 테스트: 즉시 배치 실행", "info");
    try {
      // 배치 서비스 콜백 설정
      batchTradingService.setSignalCallback(async (signals) => {
        addLog(`🎯 즉시 배치: ${signals.length}개 신호 발견`, "success");

        setMonitoringStats((prev) => ({
          ...prev,
          dataReceived: prev.dataReceived + 1,
          signalsEvaluated: prev.signalsEvaluated + signals.length,
        }));

        for (const signal of signals) {
          try {
            const result = await paperTradingEngine.executeSignal(signal);
            if (result?.executed) {
              addLog(
                `✅ ${signal.symbol} ${signal.type} 즉시배치 완료! 가격: ${signal.price.toLocaleString()}원`,
                "success"
              );
              setMonitoringStats((prev) => ({
                ...prev,
                tradesExecuted: prev.tradesExecuted + 1,
                signalsGenerated: prev.signalsGenerated + 1,
              }));
              setLastSignal(signal);
            } else {
              addLog(
                `⚠️ ${signal.symbol} ${signal.type} 즉시배치 실패: ${result?.reason}`,
                "warning"
              );
            }
          } catch (error) {
            addLog(
              `❌ ${signal.symbol} 즉시배치 실행 실패: ${error.message}`,
              "error"
            );
          }
        }
        updatePortfolio();
      });

      // 배치 분석 즉시 실행
      const result = await batchTradingService.executeBatchAnalysis();
      if (result.success) {
        addLog(
          `✅ 즉시 배치 완료: ${result.tradesExecuted}개 거래, ${result.totalAnalyzed}개 분석`,
          "success"
        );
      } else {
        addLog(`❌ 즉시 배치 실패: ${result.error}`, "error");
      }
    } catch (error) {
      addLog(`❌ 즉시 배치 실패: ${error.message}`, "error");
    }
  }, [addLog, updatePortfolio]);

  return {
    portfolio,
    isActive,
    isConnected,
    connectionStatus,
    lastSignal,
    logs,
    marketData,
    marketCondition, // ✅ 시장 조건 노출
    monitoringStats,
    selectedCoins,
    tradingMode,
    setTradingMode,
    topCoinsLimit,
    setTopCoinsLimit,
    tradingSettings,
    setTradingSettings,
    testMode,
    toggleTestMode,
    operationMode,
    setOperationMode,
    startPaperTrading,
    stopPaperTrading,
    updatePortfolio,
    reconnect,
    addLog,
    selectedCoinsCount: selectedCoins.length,
    hasSelectedCoins: selectedCoins.length > 0,

    // ✅ 새로운 기능들
    refreshMarketCondition: updateMarketCondition,
    coinSettings,
    executeImmediateBatch,

    // 개발자 전용
    isDevelopment,
  };
};

export default usePaperTrading;
