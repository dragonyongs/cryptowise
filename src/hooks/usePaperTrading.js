// src/hooks/usePaperTrading.js - coinStore 동기화 완전 해결 버전

import { useState, useEffect, useCallback, useRef } from "react";
import { useCoinStore } from "../stores/coinStore.js";
import hybridSignalGenerator from "../services/analysis/hybridSignalGenerator.js";

// ✅ 최신 백엔드 서비스들
import { paperTradingEngine } from "../services/testing/paperTradingEngine.js";
import { signalGenerator } from "../services/analysis/signalGenerator.js";
import { upbitMarketService } from "../services/upbit/upbitMarketService.js";
import { upbitWebSocketService } from "../services/upbit/upbitWebSocket.js";
import { marketAnalysisService } from "../services/analysis/marketAnalysis.js";

// ✅ 분리된 훅들
import { useTradingLogger } from "./useTradingLogger.js";
import { usePortfolioManager } from "./usePortfolioManager.js";
import { useMarketSentiment } from "./useMarketSentiment.js";

export const usePaperTrading = (
  userId = "demo-user",
  externalSettings = null
) => {
  // 🎯 핵심 개선: Store 지연 로딩으로 자동 초기화 방지
  const [isStoreInitialized, setIsStoreInitialized] = useState(false);

  // 🔍 coinStore에서 selectedCoins를 가져와서 동기화
  const {
    selectedCoins: storeSelectedCoins,
    isInitialized,
    initializeData,
    refreshData,
    addCoin: addCoinToStore,
    removeCoin: removeCoinFromStore,
  } = useCoinStore();

  // 🎯 핵심 개선: 모드별 상태 완전 분리
  const [favoriteCoins, setFavoriteCoins] = useState([]);
  const [topCoins, setTopCoins] = useState([]);
  const [currentSelectedCoins, setCurrentSelectedCoins] = useState([]);

  // ✅ 기존 상태들
  const [isActive, setIsActive] = useState(false);
  const [lastSignal, setLastSignal] = useState(null);
  const [marketData, setMarketData] = useState(new Map());
  const [marketCondition, setMarketCondition] = useState(null);
  const [tradingMode, setTradingMode] = useState("favorites"); // 기본값을 favorites로 변경
  const [topCoinsLimit, setTopCoinsLimit] = useState(10);
  const [testMode, setTestMode] = useState(true);
  const [operationMode, setOperationMode] = useState("websocket");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // ✅ 설정 관리
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

  // ✅ Refs for stable references
  const isActiveRef = useRef(isActive);
  const currentSelectedCoinsRef = useRef(currentSelectedCoins);
  const tradingSettingsRef = useRef(tradingSettings);
  const testModeRef = useRef(testMode);
  const tradingModeRef = useRef(tradingMode);

  // ✅ 리소스 관리를 위한 refs
  const portfolioIntervalRef = useRef(null);
  const marketAnalysisIntervalRef = useRef(null);
  const subscriptionIdRef = useRef(null);
  const topCoinsUpdateIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // ✅ Refs 동기화
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

  // ✅ 개선된 로거 사용
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

  // 🎯 핵심 추가: coinStore와 favoriteCoins 동기화
  useEffect(() => {
    if (!isStoreInitialized) return;

    console.log("🔍 storeSelectedCoins 상태 변화:", storeSelectedCoins);
    console.log("🔍 현재 favoriteCoins 상태:", favoriteCoins);

    // 배열 내용이 실제로 다른지 확인
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
      // Store가 비었지만 local에는 있는 경우 local도 비우기
      console.log("🔄 coinStore가 비어서 favoriteCoins도 초기화");
      setFavoriteCoins([]);
      addLog("관심코인 목록이 초기화됨", "info");
    }
  }, [storeSelectedCoins, favoriteCoins, isStoreInitialized, addLog]);

  // 🎯 핵심 수정: 모드별 코인 동기화 (덮어쓰기 방지)
  useEffect(() => {
    // 🔒 Store가 초기화되지 않았으면 동기화 안함
    if (!isStoreInitialized) return;

    // 🔒 관심코인 모드에서는 관심코인만 설정하고 조기 리턴
    if (tradingMode === "favorites") {
      setCurrentSelectedCoins(favoriteCoins);
      addLog(`🎯 관심코인 모드로 전환: ${favoriteCoins.length}개`, "info");
      return; // ✅ 조기 리턴으로 상위코인 처리 방지
    }

    // 🔒 상위코인 모드에서만 상위코인 설정
    if (tradingMode === "top") {
      setCurrentSelectedCoins(topCoins);
      addLog(`🏆 상위코인 모드로 전환: ${topCoins.length}개`, "info");
    }
  }, [tradingMode, favoriteCoins, topCoins, addLog, isStoreInitialized]);

  // ✅ 투자 가능 코인 확인
  const isInvestableSymbol = useCallback((symbol) => {
    const stableCoins = ["USDT", "USDC", "BUSD", "DAI", "TUSD", "USDD"];
    const riskyCoins = ["LUNA", "UST", "LUNC", "USTC"];
    return (
      !stableCoins.some((stable) => symbol.toUpperCase().includes(stable)) &&
      !riskyCoins.some((risky) => symbol.toUpperCase().includes(risky))
    );
  }, []);

  // ✅ 상위 코인 업데이트 함수 수정 (하이브리드 뉴스 캐시 연동)
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
          market: coin.market || `KRW-${coin.symbol}`,
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

      // ✅ 하이브리드 뉴스 캐시 업데이트
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
  }, [topCoinsLimit, addLog, favoriteCoins]);

  // 🎯 관심코인 추가/제거 함수 (coinStore와 양방향 동기화)
  const addFavoriteCoin = useCallback(
    async (coin) => {
      try {
        // 1️⃣ coinStore에 추가
        const result = addCoinToStore(coin.market);

        if (result.success) {
          addLog(`${coin.symbol} 관심코인에 추가됨`, "success");

          // 2️⃣ 뉴스 캐시 업데이트
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
        // 1️⃣ coinStore에서 제거
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

  // ✅ 타겟 마켓 가져오기 (현재 선택된 코인 기준)
  const getTargetMarkets = useCallback(async () => {
    try {
      const maxMarkets = testModeRef.current
        ? Math.min(topCoinsLimit * 1.5, 20)
        : Math.min(topCoinsLimit, 12);

      const markets = currentSelectedCoinsRef.current
        .map((coin) => coin.market || `KRW-${coin.symbol}`)
        .filter((market) => isInvestableSymbol(market.replace("KRW-", "")))
        .slice(0, maxMarkets);

      addLog(
        `${tradingModeRef.current === "favorites" ? "관심코인" : "상위코인"} 모드: ${markets.length}개 타겟`,
        "info"
      );
      return markets;
    } catch (error) {
      addLog(`❌ 타겟 마켓 가져오기 실패: ${error.message}`, "error");
      return ["KRW-BTC", "KRW-ETH"];
    }
  }, [topCoinsLimit, isInvestableSymbol, addLog]);

  // ✅ 신호 생성 및 거래 실행 (기존 로직 유지)
  const processMarketData = useCallback(
    async (data) => {
      if (!isActiveRef.current) return;

      const symbol = data.symbol || data.code?.replace("KRW-", "");
      if (!symbol) return;

      try {
        updateStats((prev) => ({
          ...prev,
          dataReceived: prev.dataReceived + 1,
          lastActivity: new Date().toLocaleTimeString(),
        }));

        setMarketData((prev) => {
          const newMap = new Map(prev);
          newMap.set(symbol, data);
          return newMap;
        });

        const price = data.trade_price || data.price;
        if (price) {
          paperTradingEngine.updateCoinPrice(symbol, price);
        }

        const signals = await signalGenerator.generateSignalsWithSettings(
          [data],
          tradingSettingsRef.current
        );

        updateStats((prev) => ({
          ...prev,
          signalsEvaluated: (prev.signalsEvaluated || 0) + 1,
        }));

        if (signals.length === 0) {
          updateStats((prev) => ({
            ...prev,
            signalsRejected: prev.signalsRejected + 1,
          }));
          return;
        }

        const signal = signals[0];
        setLastSignal(signal);

        updateStats((prev) => ({
          ...prev,
          signalsGenerated: prev.signalsGenerated + 1,
        }));

        addLog(
          `${symbol} ${signal.type} 신호! 점수: ${signal.totalScore?.toFixed(1)}`,
          signal.totalScore >= 8.0 ? "success" : "info",
          `signal_${symbol}_${signal.type}_${Math.floor(signal.totalScore / 2) * 2}`,
          { symbol, type: signal.type, score: signal.totalScore }
        );

        const result = await paperTradingEngine.executeSignal(signal);

        if (result?.executed) {
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
    [addLog, updateStats, updatePortfolio]
  );

  // ✅ 시장 조건 분석
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

  // ✅ 리소스 정리 함수
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

  // ✅ 웹소켓 재연결 함수
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

  // 🎯 핵심 개선: Store 초기화 함수
  const initializeStore = useCallback(async () => {
    if (isStoreInitialized) return;

    try {
      addLog("🚀 Store 초기화 시작 (명시적 호출)", "info");
      await initializeData(true); // ✅ 명시적으로 forceInit=true

      // 🎯 초기화 후 즉시 관심코인 동기화
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

  // ✅ 컴포넌트 마운트 시 즉시 동기화
  useEffect(() => {
    const initializeOnMount = async () => {
      // Store 초기화
      if (!isStoreInitialized) {
        await initializeStore();
      }

      // 기존 관심코인이 있다면 즉시 동기화
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
  }, []); // 빈 배열로 마운트 시에만 실행

  // ✅ 페이퍼 트레이딩 시작
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

      // 🎯 핵심: Store를 이때 초기화
      if (!isStoreInitialized) {
        await initializeStore();
      }

      setIsActive(true);
      isActiveRef.current = true;
      resetStats();

      paperTradingEngine.setTestMode(testModeRef.current);
      paperTradingEngine.setActive(true);
      signalGenerator.setTestMode?.(testModeRef.current);
      upbitWebSocketService.setTestMode(testModeRef.current);

      // ✅ 하이브리드 뉴스 캐시 초기화
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
        `${testModeRef.current ? "테스트" : "실전"} 페이퍼 트레이딩 시작 (하이브리드 뉴스 분석 포함)`,
        "success"
      );

      addLog("초기 시장 분석 중", "info", "initial_analysis");
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
                `실시간 모니터링 시작: ${targetMarkets.length}개 코인`,
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
        // 시장 분석 (10분마다)
        marketAnalysisIntervalRef.current = setInterval(async () => {
          if (isActiveRef.current) {
            await updateMarketCondition();
          }
        }, 600000);

        // 포트폴리오 업데이트 (30초마다)
        portfolioIntervalRef.current = setInterval(() => {
          if (isActiveRef.current && !isLoading) {
            updatePortfolio(false);
          }
        }, 30000);

        // 🎯 상위 코인 업데이트 (5분마다, 상위코인 모드이면서 관심코인이 없을 때만)
        if (tradingMode === "top") {
          topCoinsUpdateIntervalRef.current = setInterval(async () => {
            // ✅ 더 엄격한 조건 체크
            if (
              isActiveRef.current &&
              tradingModeRef.current === "top" &&
              favoriteCoins.length === 0
            ) {
              await updateTopCoinsUI();
            }
          }, 300000);
        }

        const modeText = testModeRef.current
          ? "테스트 모드: 완화된 조건으로 더 많은 거래 기회"
          : "실전 모드: 엄격한 조건으로 신중한 거래";

        addLog(modeText, "info", "trading_mode_info");
        addLog(
          `거래 대상: ${
            tradingMode === "top"
              ? `상위 ${topCoinsLimit}개 코인`
              : `관심 코인 ${favoriteCoins.length}개`
          }`,
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
  ]);

  // ✅ 페이퍼 트레이딩 중지
  const stopPaperTrading = useCallback(() => {
    console.log("🛑 페이퍼 트레이딩 중지 시작...");
    setIsActive(false);
    isActiveRef.current = false;
    setConnectionStatus("disconnected");
    cleanupAllResources();

    try {
      paperTradingEngine.setActive?.(false);
    } catch (error) {
      console.warn("페이퍼 트레이딩 엔진 중지 중 오류:", error);
    }

    addLog(
      `${testModeRef.current ? "테스트" : "실전"} 페이퍼 트레이딩 완전 중지`,
      "warning"
    );
    console.log("✅ 페이퍼 트레이딩 중지 완료");
  }, [addLog, cleanupAllResources]);

  // ✅ 테스트 모드 토글
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

  // ✅ 테스트 모드 변경시 설정 업데이트
  useEffect(() => {
    setTradingSettings(getInitialSettings());
  }, [testMode, getInitialSettings]);

  // 🎯 상위코인 모드로 전환시에만 초기 로딩
  useEffect(() => {
    if (tradingMode === "top" && topCoins.length === 0 && isStoreInitialized) {
      updateTopCoinsUI();
    }
  }, [tradingMode, topCoins.length, updateTopCoinsUI, isStoreInitialized]);

  // ✅ 개발 모드에서 상태 모니터링
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 usePaperTrading 상태 동기화:", {
        storeSelectedCoins: storeSelectedCoins.length,
        favoriteCoins: favoriteCoins.length,
        currentSelectedCoins: currentSelectedCoins.length,
        tradingMode,
        isStoreInitialized,
      });
    }
  }, [
    storeSelectedCoins.length,
    favoriteCoins.length,
    currentSelectedCoins.length,
    tradingMode,
    isStoreInitialized,
  ]);

  // ✅ Cleanup (컴포넌트 언마운트 시)
  useEffect(() => {
    return () => {
      console.log("🧹 컴포넌트 언마운트 - 리소스 정리");
      isActiveRef.current = false;
      cleanupAllResources();
    };
  }, [cleanupAllResources]);

  // ✅ 반환 객체
  return {
    // 기존 상태
    portfolio,
    isActive,
    isConnected: connectionStatus === "connected",
    connectionStatus,
    lastSignal,
    logs,
    marketData,
    marketCondition,
    monitoringStats,
    marketSentiment,
    sentimentLoading,

    // 🎯 새로운 모드별 상태
    favoriteCoins,
    topCoins,
    currentSelectedCoins,
    selectedCoins: currentSelectedCoins, // UI 호환성을 위한 별칭

    // 설정
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
    addLog,
    toggleTestMode,
    refreshMarketCondition: updateMarketCondition,
    fetchMarketSentiment,
    updateTopCoinsUI,
    reconnectWebSocket,

    // 🎯 새로운 관심코인 관리
    addFavoriteCoin,
    removeFavoriteCoin,
    setFavoriteCoins,

    // 🎯 Store 관리
    isStoreInitialized,
    initializeStore,

    // 로그 관련 기능들
    getLogSystemStatus,
    exportLogs,
    getFilteredLogs,
    logPerformance: performance,

    // 유틸리티
    selectedCoinsCount: currentSelectedCoins.length,
    hasSelectedCoins: currentSelectedCoins.length > 0,
    isDevelopment: process.env.NODE_ENV === "development",

    // 추가 상태 정보
    tradingStats: {
      mode: testMode ? "TEST" : "LIVE",
      engine: paperTradingEngine.getCurrentSettings?.() || {},
      webSocket: upbitWebSocketService.getStats(),
      market: upbitMarketService.getServiceStats?.() || {},
    },
  };
};

export default usePaperTrading;
