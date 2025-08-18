// src/hooks/usePaperTrading.js - 완전 수정 버전

import { useState, useEffect, useCallback, useRef } from "react";
import { useCoinStore } from "../stores/coinStore";
import { paperTradingEngine } from "../services/testing/paperTradingEngine";
import { newsService } from "../services/news/newsService";
import { useResilientWebSocket } from "./useResilientWebSocket";
import { batchTradingService } from "../services/batch/batchTradingService";

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

  const getInitialSettings = () => {
    if (externalSettings) {
      return {
        ...externalSettings,
        aggressiveMode: true,
        signalSensitivity: 0.3,
      };
    }

    return {
      buyThreshold: -0.5,
      sellThreshold: 1.0,
      rsiOversold: 45,
      rsiOverbought: 60,
      minScore: 4.5,
      maxCoinsToTrade: 10,
      reserveCashRatio: 0.1,
      aggressiveMode: true,
      signalSensitivity: 0.3,
    };
  };

  const [tradingSettings, setTradingSettings] = useState(getInitialSettings());
  const [monitoringStats, setMonitoringStats] = useState({
    dataReceived: 0,
    signalsGenerated: 0,
    tradesExecuted: 0,
    lastActivity: null,
    signalsEvaluated: 0,
    conditionsMet: 0,
  });

  // ✅ 환경에 따른 모드 설정
  const isDevelopment = process.env.NODE_ENV === "development";
  const defaultMode = isDevelopment ? "websocket" : "scheduled";
  const [operationMode, setOperationMode] = useState(defaultMode);
  const [tradingMode, setTradingMode] = useState("favorites");
  const [topCoinsLimit, setTopCoinsLimit] = useState(10);
  const [testMode, setTestMode] = useState(true);

  // Refs
  const isActiveRef = useRef(isActive);
  const selectedCoinsRef = useRef(selectedCoins);
  const tradingSettingsRef = useRef(tradingSettings);
  const pollingIntervalRef = useRef(null);
  const logIdCounter = useRef(0);
  const priceHistory = useRef(new Map());
  const volumeHistory = useRef(new Map());
  const lastSignalTime = useRef(new Map());
  const operationModeRef = useRef(operationMode);

  const LOG_LEVELS = {
    ERROR: 0,
    WARNING: 1,
    SUCCESS: 2,
    INFO: 3,
    DEBUG: 4,
  };

  const CURRENT_LOG_LEVEL = LOG_LEVELS.DEBUG; // ✅ DEBUG로 변경하여 모든 로그 표시

  // ✅ 키 중복 오류 해결: 더 강력한 유니크 ID 생성
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

  // ✅ 배치 서비스 초기화
  useEffect(() => {
    batchTradingService.setSignalCallback(async (signals) => {
      addLog(`🎯 배치 분석: ${signals.length}개 신호 발견`, "success");

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
              `✅ ${signal.symbol} ${signal.type} 배치 거래 완료! 가격: ${signal.price.toLocaleString()}원`,
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
              `⚠️ ${signal.symbol} ${signal.type} 배치 거래 실패: ${result?.reason}`,
              "warning"
            );
          }
        } catch (error) {
          addLog(
            `❌ ${signal.symbol} 배치 거래 실패: ${error.message}`,
            "error"
          );
        }
      }

      updatePortfolio();
    });

    return () => {
      batchTradingService.setSignalCallback(null);
    };
  }, [addLog]);

  // 외부 설정 적용
  useEffect(() => {
    if (externalSettings) {
      setTradingSettings((prev) => ({
        ...prev,
        ...externalSettings,
        buyThreshold: testMode
          ? externalSettings.buyThreshold * 0.6
          : externalSettings.buyThreshold,
        minScore: testMode
          ? Math.max(externalSettings.minScore - 2, 3.0)
          : externalSettings.minScore,
      }));

      addLog(
        `🔧 설정 업데이트: ${externalSettings.strategy || "사용자 설정"}`,
        "info"
      );
    }
  }, [externalSettings, testMode, addLog]);

  // 설정 변경 로그
  useEffect(() => {
    if (isActive) {
      addLog(
        `📊 현재 거래 설정: 매수 ${tradingSettings.buyThreshold}%, 매도 ${tradingSettings.sellThreshold}%, 최소점수 ${tradingSettings.minScore}`,
        "info"
      );
    }
  }, [tradingSettings, isActive, addLog]);

  // RSI 계산
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

  // 모멘텀 계산
  const calculateMarketMomentum = useCallback((changePercent, volume) => {
    let momentumScore = 5.0;
    const absChange = Math.abs(changePercent);

    if (absChange >= 3.0) momentumScore = 8.5;
    else if (absChange >= 2.0) momentumScore = 7.5;
    else if (absChange >= 1.0) momentumScore = 6.5;
    else if (absChange >= 0.5) momentumScore = 5.5;
    else if (absChange <= 0.2) momentumScore = 4.0;

    if (volume) {
      if (volume > 2000000000) momentumScore += 1.0;
      else if (volume > 1000000000) momentumScore += 0.5;
    }

    return Math.min(momentumScore, 10.0);
  }, []);

  // 뉴스 캐시
  const newsCache = useRef(new Map());
  const NEWS_CACHE_DURATION = 300000;

  const fetchNewsForSymbol = useCallback(async (symbol) => {
    try {
      const coinSymbol = symbol.replace("KRW-", "").toUpperCase();
      const cacheKey = coinSymbol;
      const now = Date.now();
      const cached = newsCache.current.get(cacheKey);

      if (cached && now - cached.timestamp < NEWS_CACHE_DURATION) {
        return cached.data;
      }

      // ✅ 목 뉴스 점수 - 실제 프로덕션에서는 실제 뉴스 서비스 사용
      const mockNewsScore = Math.random() * 4 + 3;
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

  // 신호 생성
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

        const lastSignal = lastSignalTime.current.get(symbol) || 0;
        const now = Date.now();
        if (now - lastSignal < 60000) return null;

        const rsi = calculateRealTimeRSI(symbol, price);
        let techScore = 5.0;

        if (changePercent <= -2.0 && rsi <= 45) {
          techScore = 9.0;
        } else if (changePercent <= -1.5) {
          techScore = 8.0;
        } else if (changePercent <= -1.0 && rsi <= 50) {
          techScore = 7.5;
        } else if (changePercent <= -0.5) {
          techScore = 6.5;
        } else if (rsi <= 35) {
          techScore = 7.5;
        } else if (rsi <= 40) {
          techScore = 6.8;
        } else if (changePercent >= 2.0 && rsi >= 65) {
          techScore = 2.0;
        } else if (changePercent >= 1.5) {
          techScore = 3.5;
        } else if (rsi >= 70) {
          techScore = 2.5;
        } else if (Math.abs(changePercent) >= 1.0) {
          techScore = 6.0;
        }

        const newsData = await fetchNewsForSymbol(symbol);
        const marketMomentumScore = calculateMarketMomentum(
          changePercent,
          md.trade_volume
        );

        const compositeScore =
          techScore * 0.6 + marketMomentumScore * 0.3 + newsData.score * 0.1;

        const settings = tradingSettingsRef.current;
        let signalType = null;
        let confidence = "medium";

        if (
          compositeScore >= settings.minScore &&
          changePercent <= settings.buyThreshold
        ) {
          signalType = "BUY";
          confidence = compositeScore >= 7.0 ? "high" : "medium";
        } else if (
          compositeScore <= 4.0 ||
          (changePercent >= settings.sellThreshold &&
            rsi >= settings.rsiOverbought)
        ) {
          signalType = "SELL";
          confidence = "medium";
        } else if (
          settings.aggressiveMode &&
          Math.random() > 1 - settings.signalSensitivity
        ) {
          if (Math.abs(changePercent) >= 0.8) {
            signalType = changePercent < 0 ? "BUY" : "SELL";
            confidence = "low";
          }
        }

        setMonitoringStats((prev) => ({
          ...prev,
          conditionsMet: signalType
            ? prev.conditionsMet + 1
            : prev.conditionsMet,
        }));

        if (!signalType) return null;

        lastSignalTime.current.set(symbol, now);

        const signal = {
          symbol,
          type: signalType,
          price,
          totalScore: Number(compositeScore.toFixed(2)),
          confidence,
          reason: `${symbol} ${signalType} - 기술:${techScore.toFixed(1)}, 모멘텀:${marketMomentumScore.toFixed(1)}, 뉴스:${newsData.score.toFixed(1)}`,
          timestamp: new Date(),
          changePercent: Number(changePercent.toFixed(2)),
          technicalAnalysis: { rsi, techScore },
          newsAnalysis: newsData,
          marketMomentum: marketMomentumScore,
          testMode: testMode,
        };

        addLog(
          `🎯 ${symbol} ${signalType} 신호! 점수=${compositeScore.toFixed(1)} (기술:${techScore.toFixed(1)}, 변동:${changePercent.toFixed(2)}%, RSI:${rsi.toFixed(1)})`,
          signalType === "BUY" ? "success" : "warning"
        );

        addLog(`📋 신호 상세: ${signal.reason}`, "debug");

        setMonitoringStats((prev) => ({
          ...prev,
          signalsGenerated: prev.signalsGenerated + 1,
        }));

        return signal;
      } catch (error) {
        addLog(`❌ ${md.code} 신호 생성 실패: ${error.message}`, "error");
        return null;
      }
    },
    [
      calculateRealTimeRSI,
      fetchNewsForSymbol,
      calculateMarketMomentum,
      addLog,
      testMode,
    ]
  );

  // 타겟 마켓 확인
  const getTargetMarkets = useCallback(() => {
    const MAX_MARKETS = 10;

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
      "KRW-DOT",
      "KRW-MATIC",
      "KRW-AVAX",
      "KRW-LINK",
      "KRW-ATOM",
      "KRW-NEAR",
      "KRW-ALGO",
      "KRW-AXS",
      "KRW-SAND",
    ];

    let topMarkets = [];

    try {
      const coinStoreState = useCoinStore.getState();
      const availableCoins = coinStoreState.getFilteredCoins();

      if (availableCoins && availableCoins.length > 0) {
        topMarkets = availableCoins
          .slice(0, topCoinsLimit)
          .map((coin) => coin.market);
      }
    } catch (error) {
      console.warn("coinStore 접근 실패, fallback 사용:", error);
    }

    const finalPool =
      topMarkets.length >= topCoinsLimit
        ? topMarkets
        : extendedFallback.slice(0, topCoinsLimit);

    return finalPool.slice(0, MAX_MARKETS);
  }, [tradingMode, topCoinsLimit]);

  // ✅ 마켓 데이터 처리 - 스케줄 모드 시 무시
  const handleMarketData = useCallback(
    async (data) => {
      // ✅ 스케줄 모드일 때는 WebSocket 데이터 완전 무시
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

      // 가격 로그 (30초마다)
      const now = Date.now();
      const key = "__lastDataLog";
      const last = window[key]?.get?.(symbol) || 0;

      if (now - last > 30000) {
        const cp = (data.signed_change_rate || 0) * 100;
        const icon = cp >= 0 ? "📈" : "📉";

        addLog(
          `${icon} ${symbol}: ${data.trade_price.toLocaleString()}원 (${cp >= 0 ? "+" : ""}${cp.toFixed(2)}%)`,
          "info"
        );

        if (!window[key]) window[key] = new Map();
        window[key].set(symbol, now);
      }

      // ✅ 실시간 가격 업데이트 추가
      paperTradingEngine.updatePrices({
        [data.code]: data.trade_price,
      });

      const signal = await generateTradingSignal(data);

      if (signal) {
        setLastSignal(signal);

        try {
          const result = await paperTradingEngine.executeSignal(signal);

          if (result?.executed) {
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

  // WebSocket 구독
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

  // ✅ WebSocket 연결
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

  // ✅ 폴링 모드 - API URL 수정
  const startPollingMode = useCallback(() => {
    if (pollingIntervalRef.current) return;

    pollingIntervalRef.current = setInterval(async () => {
      if (!isActiveRef.current) return;

      try {
        const markets = getTargetMarkets().slice(0, 3);

        for (const market of markets) {
          // ✅ API URL 수정 - 각 마켓별로 개별 호출
          const response = await fetch(
            `https://api.upbit.com/v1/ticker?markets=${market}`
          );

          if (!response.ok) {
            throw new Error(`API 호출 실패: ${response.status}`);
          }

          const [data] = await response.json();

          if (data) {
            await handleMarketData({
              code: data.market,
              trade_price: data.trade_price,
              signed_change_rate: data.signed_change_rate,
              trade_volume: data.trade_volume,
            });
          }

          // API 레이트 리밋 방지
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (error) {
        addLog(`폴링 오류: ${error.message}`, "error");
      }
    }, 10000);

    addLog("📊 폴링 모드 시작", "info");
  }, [handleMarketData, addLog, getTargetMarkets]);

  // 모드 변경 시 구독 갱신
  useEffect(() => {
    if (!isActiveRef.current) return;

    const subscriptionTimeout = setTimeout(() => {
      if (operationMode === "websocket" && isConnected) {
        addLog(`🔄 모드 변경: ${tradingMode} → 구독 갱신`, "info");
        sendSubscription();
      } else if (operationMode === "polling") {
        addLog(`🔄 모드 변경: ${tradingMode} (폴링 반영)`, "info");
      }
    }, 100);

    return () => clearTimeout(subscriptionTimeout);
  }, [
    tradingMode,
    topCoinsLimit,
    operationMode,
    isConnected,
    sendSubscription,
    addLog,
  ]);

  // ✅ 개발자 테스트용 즉시 배치 실행 함수 - API URL 수정
  const executeImmediateBatch = useCallback(async () => {
    addLog("🧪 개발자 테스트: 즉시 배치 실행", "info");

    try {
      // ✅ 목 배치 서비스 실행 (실제 API 대신)
      const markets = getTargetMarkets().slice(0, 3);
      const signals = [];

      for (const market of markets) {
        try {
          // ✅ 개별 API 호출로 수정
          const response = await fetch(
            `https://api.upbit.com/v1/ticker?markets=${market}`
          );

          if (response.ok) {
            const [data] = await response.json();

            if (data) {
              const symbol = data.market.replace("KRW-", "");
              const changePercent = (data.signed_change_rate || 0) * 100;

              // 목 신호 생성
              if (Math.abs(changePercent) > 0.5) {
                signals.push({
                  symbol,
                  type: changePercent < 0 ? "BUY" : "SELL",
                  price: data.trade_price,
                  totalScore: 6.5,
                  confidence: "medium",
                  reason: `배치 테스트 신호 - 변동률: ${changePercent.toFixed(2)}%`,
                  timestamp: new Date(),
                  changePercent,
                });
              }
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`${market} 데이터 가져오기 실패:`, error);
        }
      }

      addLog(`✅ 즉시 배치 완료: ${signals.length}개 신호 생성`, "success");

      // 신호 처리
      for (const signal of signals) {
        try {
          const result = await paperTradingEngine.executeSignal(signal);

          if (result?.executed) {
            addLog(
              `✅ ${signal.symbol} ${signal.type} 배치 거래 완료!`,
              "success"
            );
          }
        } catch (error) {
          addLog(
            `❌ ${signal.symbol} 배치 거래 실패: ${error.message}`,
            "error"
          );
        }
      }

      updatePortfolio();
    } catch (error) {
      addLog(`❌ 즉시 배치 실패: ${error.message}`, "error");
    }
  }, [addLog, getTargetMarkets]);

  // 통합 시작 함수
  const startPaperTrading = useCallback(async () => {
    if (isActiveRef.current) return;

    if (tradingMode === "favorites" && selectedCoinsRef.current.length === 0) {
      addLog("❌ 관심 코인을 먼저 추가해주세요", "error");
      return;
    }

    try {
      setIsActive(true);
      isActiveRef.current = true;

      setMonitoringStats({
        dataReceived: 0,
        signalsGenerated: 0,
        tradesExecuted: 0,
        signalsEvaluated: 0,
        conditionsMet: 0,
        lastActivity: new Date().toLocaleTimeString(),
      });

      updatePortfolio();

      if (operationMode === "scheduled") {
        // ✅ 스케줄 모드: 모든 실시간 연결 차단
        addLog("📅 스케줄 모드 시작 - 실시간 연결 완전 차단", "success");
        addLog("⏰ 실행: 09:00, 13:00, 16:00, 20:00, 23:00 (하루 5회)", "info");
        addLog("🚫 WebSocket/폴링 완전 비활성화", "info");

        // 기존 연결 정리
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        if (isConnected) {
          disconnect();
          addLog("🔌 WebSocket 강제 연결 해제", "info");
        }

        await batchTradingService.startScheduledTrading();
        const status = batchTradingService.getStatus();

        if (status.nextExecution) {
          const nextTime = status.nextExecution.toLocaleTimeString();
          const hoursUntil =
            Math.round(
              ((status.nextExecution - Date.now()) / 1000 / 60 / 60) * 10
            ) / 10;

          addLog(`📍 다음 실행: ${nextTime} (${hoursUntil}시간 후)`, "info");
          addLog("😴 그때까지 시스템 완전 대기 상태", "info");
        }
      } else if (operationMode === "polling") {
        addLog("🔄 폴링 모드 시작", "success");
        addLog("⚠️ 개발/테스트 전용 - 프로덕션 비추천", "warning");
        startPollingMode();
      } else if (operationMode === "websocket") {
        addLog("📡 WebSocket 모드 시작", "success");
        addLog("⚠️ 개발/테스트 전용 - 리소스 많이 사용", "warning");

        if (!isConnected) {
          addLog("⚠️ WebSocket 연결 중... 폴링으로 전환", "warning");
          startPollingMode();
        } else {
          setTimeout(() => {
            sendSubscription();
          }, 200);
        }
      }

      if (testMode) {
        addLog("🧪 테스트 모드: 더 관대한 매수 조건", "info");
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
    startPollingMode,
    isConnected,
    sendSubscription,
    disconnect,
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

    addLog(`⏹️ ${operationMode} 모드 페이퍼 트레이딩 중지`, "warning");
  }, [operationMode, addLog]);

  // 테스트 모드 토글
  const toggleTestMode = useCallback(() => {
    setTestMode((prev) => {
      const newTestMode = !prev;

      if (newTestMode) {
        setTradingSettings((prevSettings) => ({
          ...prevSettings,
          buyThreshold: -0.3,
          sellThreshold: 0.8,
          minScore: 4.0,
          rsiOversold: 50,
          rsiOverbought: 55,
          aggressiveMode: true,
          signalSensitivity: 0.4,
        }));

        addLog("🧪 테스트 모드 활성화 - 신호 생성 대폭 증가", "info");
      } else {
        setTradingSettings((prevSettings) => ({
          ...prevSettings,
          buyThreshold: -0.8,
          sellThreshold: 1.2,
          minScore: 5.5,
          rsiOversold: 40,
          rsiOverbought: 65,
          aggressiveMode: false,
          signalSensitivity: 0.3,
        }));

        addLog("📊 정상 모드 복구", "info");
      }

      return newTestMode;
    });
  }, [addLog]);

  // 상태 확인
  const getOperationStatus = useCallback(() => {
    if (operationMode === "scheduled") {
      return batchTradingService.getStatus();
    } else if (operationMode === "polling") {
      return {
        isRunning: !!pollingIntervalRef.current,
        mode: "polling",
        interval: "10초",
      };
    } else {
      return {
        isRunning: isConnected,
        mode: "websocket",
        status: connectionStatus,
      };
    }
  }, [operationMode, isConnected, connectionStatus]);

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

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  return {
    portfolio,
    isActive,
    isConnected,
    connectionStatus,
    lastSignal,
    logs,
    marketData,
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
    getOperationStatus,
    startPaperTrading,
    stopPaperTrading,
    updatePortfolio,
    reconnect,
    addLog,
    selectedCoinsCount: selectedCoins.length,
    hasSelectedCoins: selectedCoins.length > 0,
    // 개발자 전용 함수들
    isDevelopment,
    executeImmediateBatch,
  };
};

export default usePaperTrading;
