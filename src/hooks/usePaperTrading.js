// src/hooks/usePaperTrading.js - 신호/로그 분리 + 실제 신호 생성 개선

import { useState, useEffect, useCallback, useRef } from "react";
import { useCoinStore } from "../stores/coinStore.js";
import hybridSignalGenerator from "../services/analysis/hybridSignalGenerator.js";

// ✅ 기존 백엔드 서비스들 모두 유지
import { paperTradingEngine } from "../services/testing/paperTradingEngine.js";
import { signalGenerator } from "../services/analysis/signalGenerator.js";
import { upbitMarketService } from "../services/upbit/upbitMarketService.js";
import { upbitWebSocketService } from "../services/upbit/upbitWebSocket.js";
import { marketAnalysisService } from "../services/analysis/marketAnalysis.js";

// ✅ 기존 분리된 훅들 모두 유지
import { useTradingLogger } from "./useTradingLogger.js";
import { usePortfolioManager } from "./usePortfolioManager.js";
import { useMarketSentiment } from "./useMarketSentiment.js";

export const usePaperTrading = (
  userId = "demo-user",
  externalSettings = null
) => {
  // ✅ 기존 Store 관리 상태 모두 유지
  const [isStoreInitialized, setIsStoreInitialized] = useState(false);
  const {
    selectedCoins: storeSelectedCoins,
    isInitialized,
    initializeData,
    refreshData,
    addCoin: addCoinToStore,
    removeCoin: removeCoinFromStore,
  } = useCoinStore();

  // ✅ 기존 모드별 상태 모두 유지
  const [favoriteCoins, setFavoriteCoins] = useState([]);
  const [topCoins, setTopCoins] = useState([]);
  const [currentSelectedCoins, setCurrentSelectedCoins] = useState([]);

  // ✅ 기존 상태들 모두 유지
  const [isActive, setIsActive] = useState(false);
  const [lastSignal, setLastSignal] = useState(null);
  const [marketData, setMarketData] = useState(new Map());
  const [marketCondition, setMarketCondition] = useState(null);
  const [tradingMode, setTradingMode] = useState("favorites");
  const [topCoinsLimit, setTopCoinsLimit] = useState(10);
  const [testMode, setTestMode] = useState(true);
  const [operationMode, setOperationMode] = useState("websocket");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // 🎯 NEW: 실제 거래 신호만 관리하는 별도 상태
  const [signals, setSignals] = useState([]);

  // 🎯 NEW: 마켓 관리 상태 추가 (기존 로직에 영향 없음)
  const [selectedMarket, setSelectedMarket] = useState("KRW");
  const [availableMarkets] = useState(["KRW", "BTC", "USDT"]);

  // ✅ 기존 설정 관리 완전 유지
  const getInitialSettings = useCallback(() => {
    if (externalSettings) {
      return { ...externalSettings, mode: testMode ? "TEST" : "LIVE" };
    }

    return testMode
      ? {
          minBuyScore: 6.0,
          minSellScore: 4.5,
          strongBuyScore: 8.0,
          rsiOversold: 35,
          rsiOverbought: 65,
          maxCoinsToTrade: 6,
          reserveCashRatio: 0.3,
          aggressiveMode: false,
          signalSensitivity: 0.2,
          requireMultipleSignals: true,
          dailyTradeLimit: 12,
          strategy: "test_mode",
        }
      : {
          minBuyScore: 7.5,
          minSellScore: 6.0,
          strongBuyScore: 9.0,
          rsiOversold: 30,
          rsiOverbought: 70,
          maxCoinsToTrade: 4,
          reserveCashRatio: 0.4,
          aggressiveMode: false,
          signalSensitivity: 0.1,
          requireMultipleSignals: true,
          dailyTradeLimit: 6,
          strategy: "live_mode",
        };
  }, [externalSettings, testMode]);

  const [tradingSettings, setTradingSettings] = useState(() =>
    getInitialSettings()
  );

  // ✅ 기존 Refs 모두 유지
  const isActiveRef = useRef(isActive);
  const currentSelectedCoinsRef = useRef(currentSelectedCoins);
  const tradingSettingsRef = useRef(tradingSettings);
  const testModeRef = useRef(testMode);
  const tradingModeRef = useRef(tradingMode);

  // 🎯 NEW: API 중복 요청 방지를 위한 refs 추가
  const isLoadingRef = useRef(false);
  const lastRequestTime = useRef(0);
  const REQUEST_THROTTLE = 2000; // 2초

  // ✅ 기존 리소스 관리 refs 모두 유지
  const portfolioIntervalRef = useRef(null);
  const marketAnalysisIntervalRef = useRef(null);
  const subscriptionIdRef = useRef(null);
  const topCoinsUpdateIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // ✅ 기존 Refs 동기화 로직 모두 유지
  useEffect(() => {
    tradingModeRef.current = tradingMode;
  }, [tradingMode]);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  useEffect(() => {
    currentSelectedCoinsRef.current = currentSelectedCoins;
  }, [currentSelectedCoins]);

  useEffect(() => {
    tradingSettingsRef.current = tradingSettings;
  }, [tradingSettings]);

  useEffect(() => {
    testModeRef.current = testMode;
  }, [testMode]);

  // ✅ 기존 로거 및 관련 훅들 모두 유지
  const {
    logs,
    monitoringStats,
    addLog,
    updateStats,
    resetStats,
    getLogSystemStatus,
    exportLogs,
    getFilteredLogs,
    performance,
  } = useTradingLogger();

  const { portfolio, updatePortfolio, isLoading } = usePortfolioManager(
    marketData,
    addLog
  );

  const { marketSentiment, sentimentLoading, fetchMarketSentiment } =
    useMarketSentiment(addLog, isActive);

  // 🎯 NEW: 실제 API 기반 신호 생성 함수
  const generateRealSignals = useCallback(async (marketDataArray) => {
    if (
      !isActiveRef.current ||
      !Array.isArray(marketDataArray) ||
      marketDataArray.length === 0
    ) {
      return [];
    }

    const realSignals = [];

    for (const coinData of marketDataArray) {
      try {
        // 🎯 실제 업비트 API 데이터 검증
        if (!coinData.market || !coinData.trade_price) {
          continue; // 유효하지 않은 데이터 건너뛰기
        }

        // 🎯 기존 signalGenerator 사용하여 실제 신호 생성
        const signalResults = await signalGenerator.generateSignalsWithSettings(
          [coinData],
          tradingSettingsRef.current
        );

        // 🎯 유효한 신호만 추가
        for (const signal of signalResults) {
          if (
            signal &&
            signal.symbol &&
            signal.type &&
            typeof signal.totalScore === "number"
          ) {
            realSignals.push({
              id: `signal-${signal.symbol}-${Date.now()}-${Math.random()}`,
              symbol: signal.symbol.replace("KRW-", ""),
              type: signal.type.toUpperCase(),
              confidence: Math.max(0, Math.min(1, signal.totalScore / 10)), // 0-1 범위로 정규화
              price: coinData.trade_price,
              volume: coinData.acc_trade_price_24h || 0,
              reason: signal.reason || `점수: ${signal.totalScore?.toFixed(1)}`,
              timestamp: new Date().toISOString(),
              executed: false,
              status: "pending",
            });
          }
        }
      } catch (error) {
        console.warn(`신호 생성 실패 (${coinData.market}):`, error);
      }
    }

    return realSignals;
  }, []);

  // 🎯 NEW: 마켓 변경 핸들러 추가 (기존 로직에 영향 없음)
  const changeMarket = useCallback(
    async (newMarket) => {
      if (isActive) {
        alert("거래 중에는 마켓을 변경할 수 없습니다.");
        return false;
      }

      if (newMarket === selectedMarket) return true;

      try {
        addLog(`🔄 마켓 변경: ${selectedMarket} → ${newMarket}`, "info");
        // 서비스 마켓 타입 변경
        upbitMarketService.setMarketType(newMarket);
        // 상태 업데이트
        setSelectedMarket(newMarket);
        setMarketData(new Map());
        // 기존 선택 초기화 (마켓이 다르므로)
        setCurrentSelectedCoins([]);
        setFavoriteCoins([]);
        setSignals([]); // 🎯 신호도 초기화
        addLog(`✅ ${newMarket} 마켓으로 변경 완료`, "success");
        return true;
      } catch (error) {
        addLog(`마켓 변경 실패: ${error.message}`, "error");
        return false;
      }
    },
    [selectedMarket, isActive, addLog]
  );

  // ✅ 기존 coinStore 동기화 로직 완전 유지
  useEffect(() => {
    if (!isStoreInitialized) return;

    console.log("🔍 storeSelectedCoins 상태 변화:", storeSelectedCoins);
    console.log("🔍 현재 favoriteCoins 상태:", favoriteCoins);

    const isSame =
      favoriteCoins.length === storeSelectedCoins.length &&
      favoriteCoins.every((fc) =>
        storeSelectedCoins.find((sc) => sc.market === fc.market)
      );

    if (storeSelectedCoins.length > 0 && !isSame) {
      console.log("🔄 coinStore → favoriteCoins 동기화 시작");
      setFavoriteCoins(
        storeSelectedCoins.map((coin) => ({
          ...coin,
          isTopCoin: false,
        }))
      );
      addLog(`관심코인 동기화됨: ${storeSelectedCoins.length}개`, "info");
    } else if (storeSelectedCoins.length === 0 && favoriteCoins.length > 0) {
      console.log("🔄 coinStore가 비어서 favoriteCoins도 초기화");
      setFavoriteCoins([]);
      addLog("관심코인 목록이 초기화됨", "info");
    }
  }, [storeSelectedCoins, favoriteCoins, isStoreInitialized, addLog]);

  // ✅ 기존 모드별 코인 동기화 로직 완전 유지
  useEffect(() => {
    if (!isStoreInitialized) return;

    if (tradingMode === "favorites") {
      setCurrentSelectedCoins(favoriteCoins);
      addLog(`🎯 관심코인 모드로 전환: ${favoriteCoins.length}개`, "info");
      return;
    }

    if (tradingMode === "top") {
      setCurrentSelectedCoins(topCoins);
      addLog(`🏆 상위코인 모드로 전환: ${topCoins.length}개`, "info");
    }
  }, [tradingMode, favoriteCoins, topCoins, addLog, isStoreInitialized]);

  // ✅ 기존 투자 가능 코인 확인 로직 유지
  const isInvestableSymbol = useCallback((symbol) => {
    const stableCoins = ["USDT", "USDC", "BUSD", "DAI", "TUSD", "USDD"];
    const riskyCoins = ["LUNA", "UST", "LUNC", "USTC"];

    return (
      !stableCoins.some((stable) => symbol.toUpperCase().includes(stable)) &&
      !riskyCoins.some((risky) => symbol.toUpperCase().includes(risky))
    );
  }, []);

  // ✅ 기존 상위 코인 업데이트 함수 완전 유지
  const updateTopCoinsUI = useCallback(async () => {
    if (tradingModeRef.current !== "top") {
      addLog("상위코인 모드가 아니므로 업데이트 건너뜀", "info");
      return [];
    }

    try {
      addLog("🔄 상위 코인 업데이트 시작", "info", "top_coins_update");
      const maxCoins = topCoinsLimit;
      const topCoinsData = await upbitMarketService.getTopCoins(
        maxCoins,
        testModeRef.current
      );

      if (!topCoinsData || topCoinsData.length === 0) {
        addLog("상위 코인 데이터 없음", "warning", "top_coins_empty");
        return [];
      }

      const formattedCoins = topCoinsData
        .map((coin, index) => ({
          symbol: coin.symbol || coin.code?.replace("KRW-", ""),
          market: coin.market || `${selectedMarket}-${coin.symbol}`, // 마켓 타입 반영
          name: coin.korean_name || coin.name || coin.symbol,
          score: coin.scores?.composite || coin.score || 0,
          tier: coin.tier || "TIER3",
          price: coin.tickerData?.trade_price || coin.price || 0,
          changePercent:
            coin.tickerData?.priceChangePercent || coin.change_percent || 0,
          rank: index + 1,
          isTopCoin: true,
          lastUpdated: new Date(),
        }))
        .filter((coin) => coin.symbol && coin.market);

      setTopCoins(formattedCoins);

      // ✅ 기존 하이브리드 뉴스 캐시 업데이트 유지
      try {
        await hybridSignalGenerator.updateWatchedCoins(
          favoriteCoins.map((c) => c.symbol),
          formattedCoins.map((c) => c.symbol)
        );
        addLog("상위 코인 뉴스 캐시 업데이트 완료", "info");
      } catch (newsError) {
        addLog(`뉴스 캐시 업데이트 실패: ${newsError.message}`, "warning");
      }

      addLog(
        `상위 코인 ${formattedCoins.length}개 업데이트 완료 (설정: ${maxCoins}개)`,
        "success",
        "top_coins_success"
      );
      return formattedCoins;
    } catch (error) {
      addLog(`상위 코인 업데이트 실패: ${error.message}`, "error");
      return [];
    }
  }, [topCoinsLimit, addLog, favoriteCoins, selectedMarket]);

  // ✅ 기존 관심코인 추가/제거 함수 완전 유지
  const addFavoriteCoin = useCallback(
    async (coin) => {
      try {
        const result = addCoinToStore(coin.market);
        if (result.success) {
          addLog(`${coin.symbol} 관심코인에 추가됨`, "success");

          try {
            const updatedFavorites = [
              ...favoriteCoins,
              { ...coin, isTopCoin: false },
            ];
            await hybridSignalGenerator.updateWatchedCoins(
              updatedFavorites.map((c) => c.symbol),
              topCoins.map((c) => c.symbol)
            );
            addLog(`${coin.symbol} 뉴스 분석 캐시 업데이트 시작`, "info");
          } catch (error) {
            addLog(`뉴스 캐시 업데이트 실패: ${error.message}`, "warning");
          }
        } else {
          addLog(result.message, "warning");
        }
      } catch (error) {
        addLog(`관심코인 추가 실패: ${error.message}`, "error");
      }
    },
    [addCoinToStore, addLog, favoriteCoins, topCoins]
  );

  const removeFavoriteCoin = useCallback(
    (market) => {
      try {
        const result = removeCoinFromStore(market);
        if (result.success) {
          addLog(result.message, "info");
        } else {
          addLog(result.message, "warning");
        }
      } catch (error) {
        addLog(`관심코인 제거 실패: ${error.message}`, "error");
      }
    },
    [removeCoinFromStore, addLog]
  );

  // 🎯 타겟 마켓 가져오기 함수 개선 (API 요청 최적화 + 기존 로직 유지)
  const getTargetMarkets = useCallback(async () => {
    try {
      const maxMarkets = testModeRef.current
        ? Math.min(topCoinsLimit * 1.5, 20)
        : Math.min(topCoinsLimit, 12);

      const markets = currentSelectedCoinsRef.current
        .map((coin) => coin.market || `${selectedMarket}-${coin.symbol}`) // 마켓 타입 반영
        .filter((market) =>
          isInvestableSymbol(market.replace(`${selectedMarket}-`, ""))
        )
        .slice(0, maxMarkets);

      addLog(
        `${tradingModeRef.current === "favorites" ? "관심코인" : "상위코인"} 모드: ${markets.length}개 타겟 (${selectedMarket} 마켓)`,
        "info"
      );
      return markets;
    } catch (error) {
      addLog(`❌ 타겟 마켓 가져오기 실패: ${error.message}`, "error");
      return [`${selectedMarket}-BTC`, `${selectedMarket}-ETH`];
    }
  }, [topCoinsLimit, isInvestableSymbol, addLog, selectedMarket]);

  // 🎯 최적화된 마켓 데이터 로드 함수 추가 (기존 processMarketData와 연동)
  const loadMarketData = useCallback(
    async (forceUpdate = false) => {
      const now = Date.now();
      // 스로틀링 체크
      if (!forceUpdate && now - lastRequestTime.current < REQUEST_THROTTLE) {
        console.log("🛑 API 요청 스로틀링 - 요청 무시");
        return;
      }

      // 중복 로딩 체크
      if (isLoadingRef.current) {
        console.log("🛑 이미 로딩 중 - 요청 무시");
        return;
      }

      isLoadingRef.current = true;
      lastRequestTime.current = now;

      try {
        console.log(`📊 ${selectedMarket} 마켓 데이터 로드 시작`);
        if (currentSelectedCoins.length === 0) {
          console.log("📊 선택된 코인이 없어 데이터 로드 생략");
          return;
        }

        // 선택된 코인들에 대해서만 티커 데이터 요청
        const symbols = currentSelectedCoins.map((coin) => coin.symbol);
        const tickerData = await upbitMarketService.getTickerData(symbols);

        // Map으로 변환
        const dataMap = new Map();
        Array.from(tickerData.values()).forEach((ticker) => {
          const symbol = ticker.market.replace(`${selectedMarket}-`, "");
          dataMap.set(symbol, ticker);
        });

        setMarketData(dataMap);

        // 🎯 마켓 데이터 로드 후 초기 신호 생성
        const initialSignals = await generateRealSignals(
          Array.from(tickerData.values())
        );
        if (initialSignals.length > 0) {
          setSignals((prev) => [...initialSignals, ...prev].slice(0, 50)); // 최대 50개 유지
          addLog(`초기 신호 ${initialSignals.length}개 생성 완료`, "info");
        }

        console.log(
          `✅ ${selectedMarket} 마켓 데이터 ${dataMap.size}개 로드 완료`
        );
      } catch (error) {
        console.error("마켓 데이터 로드 실패:", error);
        addLog(`마켓 데이터 로드 실패: ${error.message}`, "error");
      } finally {
        isLoadingRef.current = false;
      }
    },
    [selectedMarket, currentSelectedCoins, addLog, generateRealSignals]
  );

  // 🎯 개선된 신호 생성 및 거래 실행 로직 (기존 로직 + 신호 분리)
  const processMarketData = useCallback(
    async (data) => {
      if (!isActiveRef.current) return;

      const symbol =
        data.symbol || data.code?.replace(`${selectedMarket}-`, ""); // 마켓 타입 반영
      if (!symbol) return;

      try {
        updateStats((prev) => ({
          ...prev,
          dataReceived: prev.dataReceived + 1,
          lastActivity: new Date().toLocaleTimeString(),
        }));

        // 🎯 마켓 데이터 업데이트 (로그 시스템용)
        setMarketData((prev) => {
          const newMap = new Map(prev);
          newMap.set(symbol, data);
          return newMap;
        });

        const price = data.trade_price || data.price;
        if (price) {
          paperTradingEngine.updateCoinPrice(symbol, price);
        }

        // 🎯 실제 신호 생성 (신호 시스템용)
        const newSignals = await generateRealSignals([data]);

        updateStats((prev) => ({
          ...prev,
          signalsEvaluated: (prev.signalsEvaluated || 0) + 1,
        }));

        if (newSignals.length === 0) {
          updateStats((prev) => ({
            ...prev,
            signalsRejected: prev.signalsRejected + 1,
          }));
          return;
        }

        // 🎯 신호 상태 업데이트
        const signal = newSignals[0];
        setLastSignal(signal);
        setSignals((prev) => [...newSignals, ...prev].slice(0, 50)); // 최대 50개 유지

        updateStats((prev) => ({
          ...prev,
          signalsGenerated: prev.signalsGenerated + 1,
        }));

        // 🎯 신호 생성 로그 (로그 시스템)
        addLog(
          `${symbol} ${signal.type} 신호! 신뢰도: ${(signal.confidence * 100).toFixed(1)}%`,
          signal.confidence >= 0.8 ? "success" : "info",
          `signal_${symbol}_${signal.type}_${Math.floor(signal.confidence * 10)}`,
          { symbol, type: signal.type, confidence: signal.confidence }
        );

        // ✅ 기존 거래 실행 로직 유지
        const legacySignal = {
          ...signal,
          totalScore: signal.confidence * 10, // 기존 시스템과 호환성
          price: signal.price,
        };

        const result = await paperTradingEngine.executeSignal(legacySignal);

        if (result?.executed) {
          // 🎯 실행된 신호 상태 업데이트
          setSignals((prev) =>
            prev.map((s) =>
              s.id === signal.id
                ? { ...s, executed: true, status: "executed" }
                : s
            )
          );

          addLog(
            `🎉 ${signal.symbol} ${signal.type} 거래 성공! ₩${signal.price.toLocaleString()}`,
            "success",
            null,
            { symbol: signal.symbol, type: signal.type, price: signal.price }
          );

          updateStats((prev) => ({
            ...prev,
            tradesExecuted: prev.tradesExecuted + 1,
            lastTradeTime: new Date().toLocaleTimeString(),
          }));

          setTimeout(() => {
            if (isActiveRef.current) {
              updatePortfolio(true);
            }
          }, 1000);
        } else {
          const rejectionReason = result?.reason || "알 수 없는 사유";
          addLog(
            `${signal.symbol} ${signal.type} 거래 실패: ${rejectionReason}`,
            "warning",
            `rejection_${symbol}_${rejectionReason.substring(0, 20)}`,
            { symbol: signal.symbol, reason: rejectionReason }
          );

          updateStats((prev) => ({
            ...prev,
            signalsRejected: prev.signalsRejected + 1,
          }));
        }
      } catch (error) {
        addLog(`${symbol} 처리 중 오류: ${error.message}`, "error", null, {
          symbol,
          error: error.message,
        });

        updateStats((prev) => ({
          ...prev,
          processingErrors: (prev.processingErrors || 0) + 1,
        }));
      }
    },
    [addLog, updateStats, updatePortfolio, selectedMarket, generateRealSignals]
  );

  // ✅ 기존 시장 조건 분석 로직 완전 유지
  const updateMarketCondition = useCallback(async () => {
    if (!isActiveRef.current) return null;

    try {
      addLog("시장 조건 분석 중", "info", "market_analysis");
      const condition = await marketAnalysisService.analyzeMarketCondition();

      if (isActiveRef.current) {
        setMarketCondition(condition);
        updateStats((prev) => ({
          ...prev,
          marketConditionsChecked: prev.marketConditionsChecked + 1,
        }));

        const message = condition.isBuyableMarket
          ? `시장 분석 완료: ${condition.buyability?.level} (${condition.overallBuyScore?.toFixed(1)}점)`
          : `시장 조건 부적절: ${condition.buyability?.level} (${condition.overallBuyScore?.toFixed(1)}점)`;

        addLog(
          message,
          condition.isBuyableMarket ? "info" : "warning",
          "market_result"
        );
      }

      return condition;
    } catch (error) {
      if (isActiveRef.current) {
        addLog(`시장 분석 실패: ${error.message}`, "error");
      }
      return null;
    }
  }, [addLog, updateStats]);

  // ✅ 기존 리소스 정리 함수 완전 유지
  const cleanupAllResources = useCallback(() => {
    console.log("🧹 모든 리소스 정리 시작...");
    isActiveRef.current = false;
    setIsActive(false);

    [
      portfolioIntervalRef,
      marketAnalysisIntervalRef,
      topCoinsUpdateIntervalRef,
      reconnectTimeoutRef,
    ].forEach((ref) => {
      if (ref.current) {
        clearInterval(ref.current);
        clearTimeout(ref.current);
        ref.current = null;
      }
    });

    if (subscriptionIdRef.current) {
      upbitWebSocketService.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
    }

    try {
      upbitWebSocketService.disconnect();
    } catch (error) {
      console.warn("웹소켓 해제 중 오류:", error);
    }

    setConnectionStatus("disconnected");
    console.log("✅ 모든 리소스 정리 완료");
  }, []);

  // ✅ 기존 웹소켓 재연결 함수 완전 유지
  const reconnectWebSocket = useCallback(async () => {
    if (reconnectTimeoutRef.current) return;

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        addLog("웹소켓 재연결 시도", "info", "websocket_reconnect");

        if (subscriptionIdRef.current) {
          upbitWebSocketService.unsubscribe(subscriptionIdRef.current);
          subscriptionIdRef.current = null;
        }

        upbitWebSocketService.disconnect();
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (isActiveRef.current) {
          const targetMarkets = await getTargetMarkets();
          subscriptionIdRef.current = upbitWebSocketService.subscribe(
            `papertrading_${Date.now()}`,
            processMarketData
          );
          await upbitWebSocketService.connect(targetMarkets);

          if (upbitWebSocketService.isConnected()) {
            setConnectionStatus("connected");
            addLog("웹소켓 재연결 완료", "success");
          } else {
            throw new Error("재연결 실패");
          }
        }
      } catch (error) {
        addLog(`웹소켓 재연결 실패: ${error.message}`, "error");
        setConnectionStatus("error");
      } finally {
        reconnectTimeoutRef.current = null;
      }
    }, 3000);
  }, [getTargetMarkets, addLog, processMarketData]);

  // ✅ 기존 Store 초기화 함수 완전 유지
  const initializeStore = useCallback(async () => {
    if (isStoreInitialized) return;

    try {
      addLog("🚀 Store 초기화 시작 (명시적 호출)", "info");
      await initializeData(true);

      const currentSelectedCoins = useCoinStore.getState().selectedCoins;
      if (currentSelectedCoins.length > 0) {
        setFavoriteCoins(
          currentSelectedCoins.map((coin) => ({
            ...coin,
            isTopCoin: false,
          }))
        );
        addLog(
          `초기화 시 관심코인 ${currentSelectedCoins.length}개 동기화`,
          "success"
        );
      }

      setIsStoreInitialized(true);
      addLog("✅ Store 초기화 완료", "success");
    } catch (error) {
      addLog(`❌ Store 초기화 실패: ${error.message}`, "error");
      throw error;
    }
  }, [isStoreInitialized, initializeData, addLog]);

  // ✅ 기존 컴포넌트 마운트 시 초기화 로직 완전 유지
  useEffect(() => {
    const initializeOnMount = async () => {
      if (!isStoreInitialized) {
        await initializeStore();
      }

      const currentStoreCoins = useCoinStore.getState().selectedCoins;
      if (currentStoreCoins.length > 0) {
        setFavoriteCoins(
          currentStoreCoins.map((coin) => ({
            ...coin,
            isTopCoin: false,
          }))
        );
        addLog(
          `마운트 시 관심코인 ${currentStoreCoins.length}개 동기화`,
          "info"
        );
      }
    };

    initializeOnMount();
  }, []);

  // ✅ 기존 페이퍼 트레이딩 시작 로직 완전 유지 + 신호 초기화 추가
  const startPaperTrading = useCallback(async () => {
    if (isActiveRef.current) {
      addLog("이미 거래가 활성화되어 있습니다", "warning");
      return;
    }

    if (tradingMode === "favorites" && favoriteCoins.length === 0) {
      addLog("관심 코인을 먼저 추가해주세요", "error");
      return;
    }

    try {
      console.log("🚀 페이퍼 트레이딩 시작 중...");
      if (!isStoreInitialized) {
        await initializeStore();
      }

      setIsActive(true);
      isActiveRef.current = true;
      setSignals([]); // 🎯 신호 초기화
      resetStats();

      paperTradingEngine.setTestMode(testModeRef.current);
      paperTradingEngine.setActive(true);
      signalGenerator.setTestMode?.(testModeRef.current);
      upbitWebSocketService.setTestMode(testModeRef.current);

      // ✅ 기존 하이브리드 뉴스 캐시 초기화 유지
      try {
        const watchlistSymbols = favoriteCoins.map((c) => c.symbol);
        const topCoinsSymbols = topCoins.map((c) => c.symbol);
        await hybridSignalGenerator.updateWatchedCoins(
          watchlistSymbols,
          topCoinsSymbols
        );
        addLog("하이브리드 뉴스 분석 시스템 초기화 완료", "success");
      } catch (newsError) {
        addLog(`뉴스 시스템 초기화 실패: ${newsError.message}`, "warning");
      }

      addLog(
        `${testModeRef.current ? "테스트" : "실전"} ${selectedMarket} 페이퍼 트레이딩 시작 (하이브리드 뉴스 분석 포함)`,
        "success"
      );

      addLog("초기 시장 분석 중", "info", "initial_analysis");

      // 🎯 초기 마켓 데이터 로드 및 신호 생성
      await loadMarketData(true);
      await Promise.all([updateMarketCondition(), fetchMarketSentiment()]);
      await updatePortfolio(true);

      if (operationMode === "websocket" && isActiveRef.current) {
        addLog("실시간 연결 설정 중", "info", "websocket_setup");

        try {
          const targetMarkets = await getTargetMarkets();
          if (targetMarkets.length > 0) {
            subscriptionIdRef.current = upbitWebSocketService.subscribe(
              `papertrading_${Date.now()}`,
              processMarketData
            );
            await upbitWebSocketService.connect(targetMarkets);

            if (upbitWebSocketService.isConnected()) {
              setConnectionStatus("connected");
              addLog(
                `실시간 모니터링 시작: ${targetMarkets.length}개 코인 (${selectedMarket} 마켓)`,
                "success"
              );
            } else {
              throw new Error("웹소켓 연결 실패");
            }
          } else {
            throw new Error("유효한 타겟 마켓이 없음");
          }
        } catch (wsError) {
          addLog(`웹소켓 연결 실패: ${wsError.message}`, "error");
          setConnectionStatus("error");
        }
      }

      if (isActiveRef.current) {
        // ✅ 기존 주기적 업데이트 로직 모두 유지
        marketAnalysisIntervalRef.current = setInterval(async () => {
          if (isActiveRef.current) {
            await updateMarketCondition();
          }
        }, 600000);

        portfolioIntervalRef.current = setInterval(() => {
          if (isActiveRef.current && !isLoading) {
            updatePortfolio(false);
          }
        }, 30000);

        if (tradingMode === "top") {
          topCoinsUpdateIntervalRef.current = setInterval(async () => {
            if (
              isActiveRef.current &&
              tradingModeRef.current === "top" &&
              favoriteCoins.length === 0
            ) {
              await updateTopCoinsUI();
            }
          }, 300000);
        }

        // ✅ 기존 로그 메시지들 유지
        const modeText = testModeRef.current
          ? "테스트 모드: 완화된 조건으로 더 많은 거래 기회"
          : "실전 모드: 엄격한 조건으로 신중한 거래";

        addLog(modeText, "info", "trading_mode_info");

        addLog(
          `거래 대상: ${
            tradingMode === "top"
              ? `상위 ${topCoinsLimit}개 코인`
              : `관심 코인 ${favoriteCoins.length}개`
          } (${selectedMarket} 마켓)`,
          "info",
          "trading_targets"
        );

        const logStatus = getLogSystemStatus();
        if (!logStatus.isHealthy) {
          addLog(
            `로그 시스템 과부하: ${logStatus.logsPerSecond}/초`,
            "warning"
          );
        }
      }
    } catch (error) {
      addLog(`시작 실패: ${error.message}`, "error");
      setIsActive(false);
      isActiveRef.current = false;
      cleanupAllResources();
    }
  }, [
    tradingMode,
    favoriteCoins,
    operationMode,
    topCoinsLimit,
    selectedMarket,
    addLog,
    resetStats,
    updateMarketCondition,
    fetchMarketSentiment,
    updatePortfolio,
    getTargetMarkets,
    processMarketData,
    cleanupAllResources,
    updateTopCoinsUI,
    isLoading,
    getLogSystemStatus,
    isStoreInitialized,
    initializeStore,
    loadMarketData,
  ]);

  // ✅ 기존 페이퍼 트레이딩 중지 로직 완전 유지
  const stopPaperTrading = useCallback(() => {
    console.log(`🛑 ${selectedMarket} 페이퍼 트레이딩 중지 시작...`);
    setIsActive(false);
    isActiveRef.current = false;
    setConnectionStatus("disconnected");
    setSignals([]); // 🎯 신호 초기화

    cleanupAllResources();

    try {
      paperTradingEngine.setActive?.(false);
    } catch (error) {
      console.warn("페이퍼 트레이딩 엔진 중지 중 오류:", error);
    }

    addLog(
      `${testModeRef.current ? "테스트" : "실전"} ${selectedMarket} 페이퍼 트레이딩 완전 중지`,
      "warning"
    );

    console.log("✅ 페이퍼 트레이딩 중지 완료");
  }, [addLog, cleanupAllResources, selectedMarket]);

  // ✅ 기존 테스트 모드 토글 로직 완전 유지
  const toggleTestMode = useCallback(() => {
    if (isActiveRef.current) {
      addLog("거래 중에는 모드를 변경할 수 없습니다", "warning");
      return;
    }

    setTestMode((prev) => {
      const newTestMode = !prev;
      setTradingSettings(getInitialSettings());

      const modeText = newTestMode
        ? "테스트 모드 활성화: 완화된 조건, 더 많은 거래 기회"
        : "실전 모드 활성화: 엄격한 조건, 신중한 거래";

      addLog(modeText, "info");
      return newTestMode;
    });
  }, [addLog, getInitialSettings]);

  // ✅ 기존 테스트 모드 변경시 설정 업데이트 유지
  useEffect(() => {
    setTradingSettings(getInitialSettings());
  }, [testMode, getInitialSettings]);

  // ✅ 기존 상위코인 모드 전환시 초기 로딩 유지
  useEffect(() => {
    if (tradingMode === "top" && topCoins.length === 0 && isStoreInitialized) {
      updateTopCoinsUI();
    }
  }, [tradingMode, topCoins.length, updateTopCoinsUI, isStoreInitialized]);

  // ✅ 기존 개발 모드 상태 모니터링 완전 유지
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 usePaperTrading 상태 동기화:", {
        storeSelectedCoins: storeSelectedCoins.length,
        favoriteCoins: favoriteCoins.length,
        currentSelectedCoins: currentSelectedCoins.length,
        tradingMode,
        selectedMarket, // NEW
        signals: signals.length, // NEW
        isStoreInitialized,
      });
    }
  }, [
    storeSelectedCoins.length,
    favoriteCoins.length,
    currentSelectedCoins.length,
    tradingMode,
    selectedMarket,
    signals.length,
    isStoreInitialized,
  ]);

  // ✅ 기존 cleanup 로직 완전 유지
  useEffect(() => {
    return () => {
      console.log("🧹 컴포넌트 언마운트 - 리소스 정리");
      isActiveRef.current = false;
      cleanupAllResources();
    };
  }, [cleanupAllResources]);

  // ✅ 기존 반환 객체 완전 유지 + 분리된 신호 상태 추가
  return {
    // 기존 상태
    portfolio,
    isActive,
    isConnected: connectionStatus === "connected",
    connectionStatus,
    lastSignal,
    logs, // 🎯 시스템 로그만 포함
    signals, // 🎯 실제 거래 신호만 포함
    marketData,
    marketCondition,
    monitoringStats,
    marketSentiment,
    sentimentLoading,

    // 기존 모드별 상태
    favoriteCoins,
    topCoins,
    currentSelectedCoins,
    selectedCoins: currentSelectedCoins,

    // 🎯 NEW: 마켓 관련 상태
    selectedMarket,
    availableMarkets,

    // 기존 설정
    tradingMode,
    setTradingMode,
    topCoinsLimit,
    setTopCoinsLimit,
    tradingSettings,
    setTradingSettings,
    testMode,
    operationMode,
    setOperationMode,

    // 기존 액션
    startPaperTrading,
    stopPaperTrading,
    updatePortfolio,
    addLog,
    toggleTestMode,
    refreshMarketCondition: updateMarketCondition,
    fetchMarketSentiment,
    updateTopCoinsUI,
    reconnectWebSocket,

    // 🎯 NEW: 마켓 변경 액션
    changeMarket,
    loadMarketData,

    // 기존 관심코인 관리
    addFavoriteCoin,
    removeFavoriteCoin,
    setFavoriteCoins,

    // 기존 Store 관리
    isStoreInitialized,
    initializeStore,

    // 기존 로그 관련 기능들
    getLogSystemStatus,
    exportLogs,
    getFilteredLogs,
    logPerformance: performance,

    // 기존 유틸리티
    selectedCoinsCount: currentSelectedCoins.length,
    hasSelectedCoins: currentSelectedCoins.length > 0,
    isDevelopment: process.env.NODE_ENV === "development",

    // 기존 추가 상태 정보 + 마켓 정보 추가
    tradingStats: {
      mode: testMode ? "TEST" : "LIVE",
      market: selectedMarket, // NEW
      engine: paperTradingEngine.getCurrentSettings?.() || {},
      webSocket: upbitWebSocketService.getStats(),
      market: upbitMarketService.getServiceStats?.() || {},
    },
  };
};

export default usePaperTrading;
