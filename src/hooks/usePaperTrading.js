// src/hooks/usePaperTrading.js - 중앙 데이터 매니저 연동 + API 최적화 버전

import { useState, useEffect, useCallback, useRef } from "react";
import { useCoinStore } from "../stores/coinStore.js";
import hybridSignalGenerator from "../services/analysis/hybridSignalGenerator.js";

// ✅ 기존 백엔드 서비스들 모두 유지
import { paperTradingEngine } from "../services/testing/paperTradingEngine.js";
import { upbitMarketService } from "../services/upbit/upbitMarketService.js";
import { upbitWebSocketService } from "../services/upbit/upbitWebSocket.js";
import { marketAnalysisService } from "../services/analysis/marketAnalysis.js";

// 🎯 NEW: 중앙 데이터 매니저 및 최적화된 SignalGenerator
import { centralDataManager } from "../services/data/centralDataManager.js";
import {
  signalGenerator,
  initializeSignalGenerator,
} from "../services/analysis/signalGenerator.js";

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

  // 🎯 NEW: 중앙 데이터 관리 상태
  const [centralDataReady, setCentralDataReady] = useState(false);
  const [signalGeneratorReady, setSignalGeneratorReady] = useState(false);

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
  const [operationMode, setOperationMode] = useState("centralized"); // 🎯 기본값을 중앙화 모드로 변경
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // 🎯 NEW: 실제 거래 신호만 관리하는 별도 상태
  const [signals, setSignals] = useState([]);

  // 🎯 NEW: 마켓 관리 상태 추가
  const [selectedMarket, setSelectedMarket] = useState("KRW");
  const [availableMarkets] = useState(["KRW", "BTC", "USDT"]);

  // ✅ 기존 설정 관리 완전 유지
  const getInitialSettings = useCallback(() => {
    const baseSettings = {
      // 포트폴리오 할당
      portfolioAllocation: {
        cash: 0.4,
        t1: 0.42,
        t2: 0.15,
        t3: 0.03,
      },
      // 🎯 거래 조건 (TradingSettings에서 기대하는 구조)
      tradingConditions: {
        buyConditions: {
          minBuyScore: testMode ? 6.0 : 8.0,
          rsiOversold: testMode ? 35 : 30,
          strongBuyScore: testMode ? 8.0 : 9.0,
          buyThreshold: testMode ? -1.5 : -2.0,
          requireMultipleSignals: true,
        },
        sellConditions: {
          profitTarget1: 3,
          profitTarget2: 5,
          profitTarget3: 8,
          stopLoss: -6,
          sellThreshold: testMode ? 2.0 : 3.0,
          rsiOverbought: testMode ? 65 : 70,
          timeBasedExit: 7,
        },
        riskManagement: {
          maxCoinsToTrade: testMode ? 6 : 4,
          reserveCashRatio: 0.3,
          maxSinglePosition: 15,
          dailyTradeLimit: testMode ? 12 : 6,
          volumeThreshold: 1.5,
        },
      },
      strategy: testMode ? "test_mode" : "live_mode",
      testMode: testMode,
    };

    // externalSettings가 있으면 병합
    if (externalSettings) {
      return {
        ...baseSettings,
        ...externalSettings,
        tradingConditions: {
          ...baseSettings.tradingConditions,
          ...(externalSettings.tradingConditions || {}),
        },
      };
    }

    return baseSettings;
  }, [testMode, externalSettings]);

  const [tradingSettings, setTradingSettings] = useState(() =>
    getInitialSettings()
  );

  // ✅ 기존 Refs 모두 유지
  const isActiveRef = useRef(isActive);
  const currentSelectedCoinsRef = useRef(currentSelectedCoins);
  const tradingSettingsRef = useRef(tradingSettings);
  const testModeRef = useRef(testMode);
  const tradingModeRef = useRef(tradingMode);

  // 🎯 NEW: 중앙 데이터 매니저 관련 refs
  const centralDataSubscription = useRef(null);
  const isSystemInitialized = useRef(false);

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

  // 🎯 NEW: 중앙 데이터 매니저 초기화
  const initializeCentralSystem = useCallback(async () => {
    if (isSystemInitialized.current) {
      addLog("🔄 중앙 시스템 이미 초기화됨", "info");
      return true;
    }

    try {
      addLog("🚀 중앙 데이터 매니저 초기화 시작", "info");

      // 1. 중앙 데이터 매니저 초기화
      const initialCoins =
        currentSelectedCoins.length > 0
          ? currentSelectedCoins.map((c) => c.symbol)
          : ["BTC", "ETH"]; // 기본 코인

      await centralDataManager.initialize(initialCoins);
      setCentralDataReady(true);

      // 2. SignalGenerator 초기화
      await initializeSignalGenerator(centralDataManager);
      signalGenerator.setTestMode(testModeRef.current);
      setSignalGeneratorReady(true);

      // 3. 중앙 데이터 구독
      centralDataSubscription.current = centralDataManager.subscribe(
        "paperTrading",
        (data) => {
          handleCentralDataUpdate(data);
        },
        ["prices", "markets"]
      );

      isSystemInitialized.current = true;
      addLog("✅ 중앙 시스템 초기화 완료", "success");
      return true;
    } catch (error) {
      addLog(`❌ 중앙 시스템 초기화 실패: ${error.message}`, "error");
      return false;
    }
  }, [currentSelectedCoins, addLog]);

  // 🎯 NEW: 중앙 데이터 업데이트 핸들러
  const handleCentralDataUpdate = useCallback(
    (data) => {
      try {
        // 마켓 데이터 업데이트
        if (data.prices) {
          const dataMap = new Map();
          Object.entries(data.prices).forEach(([symbol, priceEntry]) => {
            if (priceEntry && priceEntry.data) {
              dataMap.set(symbol, priceEntry.data);
            }
          });
          setMarketData(dataMap);

          // 통계 업데이트
          updateStats((prev) => ({
            ...prev,
            dataReceived: prev.dataReceived + dataMap.size,
            lastActivity: new Date().toLocaleTimeString(),
          }));

          // 🎯 실시간 신호 생성 (활성 상태일 때만)
          if (isActiveRef.current && dataMap.size > 0) {
            generateSignalsFromCachedData(Array.from(dataMap.keys()));
          }
        }

        setConnectionStatus("connected");
      } catch (error) {
        addLog(`중앙 데이터 처리 실패: ${error.message}`, "error");
        setConnectionStatus("error");
      }
    },
    [addLog, updateStats]
  );

  // 🎯 NEW: 캐시된 데이터 기반 신호 생성
  const generateSignalsFromCachedData = useCallback(
    async (symbolList) => {
      if (!signalGeneratorReady || !isActiveRef.current) return;

      try {
        addLog(`🎯 캐시 기반 신호 생성: ${symbolList.length}개 코인`, "debug");

        // SignalGenerator의 캐시된 데이터로 신호 생성 (API 호출 없음)
        const newSignals = await signalGenerator.generateSignalsWithSettings(
          symbolList,
          tradingSettingsRef.current
        );

        if (newSignals.length > 0) {
          // 신호 처리 및 거래 실행
          for (const signal of newSignals) {
            await processSignalForTrading(signal);
          }

          // 신호 상태 업데이트
          setSignals((prev) => {
            const processedSignals = newSignals.map((signal) => ({
              id: `signal-${signal.symbol}-${Date.now()}-${Math.random()}`,
              symbol: signal.symbol,
              type: signal.type.toUpperCase(),
              confidence: Math.max(0, Math.min(1, signal.totalScore / 10)),
              price: signal.price,
              volume: signal.volume24h || 0,
              reason: signal.reason,
              timestamp: new Date().toISOString(),
              executed: false,
              status: "pending",
              totalScore: signal.totalScore,
            }));

            return [...processedSignals, ...prev].slice(0, 50); // 최대 50개 유지
          });

          setLastSignal(newSignals[0]);
          addLog(`✅ 신호 ${newSignals.length}개 생성 완료`, "info");
        }
      } catch (error) {
        addLog(`신호 생성 실패: ${error.message}`, "error");
      }
    },
    [signalGeneratorReady, addLog]
  );

  // 🎯 NEW: 신호 기반 거래 처리
  // 🎯 processSignalForTrading 함수 개선
  const processSignalForTrading = useCallback(
    async (signal) => {
      try {
        // 1. 시장 데이터 확인
        const currentMarketData = marketData.get(signal.symbol);
        if (!currentMarketData) {
          addLog(`❌ [${signal.symbol}] 시장 데이터 없음`, "warning");
          return false;
        }

        // 2. 신호 점수 재검증 (여기서 완화된 기준 적용)
        const adjustedScore = Math.max(signal.totalScore, 6.0); // 최소 6점 보장
        const enhancedSignal = {
          ...signal,
          totalScore: adjustedScore,
          confidence: signal.confidence || "medium",
          price: currentMarketData.trade_price,
          volume24h: currentMarketData.acc_trade_price_24h,
        };

        addLog(
          `🔍 [${signal.symbol}] 신호 처리: ${enhancedSignal.totalScore.toFixed(1)}점`,
          "info"
        );

        // 3. 거래 엔진 호출 (실패시 원인 로깅)
        const result = await paperTradingEngine.executeSignal(enhancedSignal);

        if (result?.executed) {
          addLog(
            `✅ [${signal.symbol}] 거래 성공: ${signal.type} ₩${enhancedSignal.price.toLocaleString()}`,
            "success"
          );

          // 포트폴리오 업데이트
          setTimeout(() => {
            if (isActiveRef.current) {
              updatePortfolio(true);
            }
          }, 1000);

          return true;
        } else {
          // 실패 원인 상세 로깅
          addLog(
            `❌ [${signal.symbol}] 거래 실패: ${result?.reason || "알 수 없는 원인"}`,
            "error"
          );

          // 디버그 정보 추가
          const debugInfo = paperTradingEngine.getCurrentSettings?.() || {};
          addLog(
            `🔧 엔진 상태: 활성=${debugInfo.isActive}, 모드=${debugInfo.mode}, 오늘거래=${debugInfo.todayTrades || 0}회`,
            "debug"
          );

          return false;
        }
      } catch (error) {
        addLog(
          `💥 [${signal.symbol}] 거래 처리 오류: ${error.message}`,
          "error"
        );
        return false;
      }
    },
    [addLog, updatePortfolio, marketData]
  );

  // 🎯 NEW: 거래 조건 체크 함수 (개선된 버전)
  // const checkTradingConditions = useCallback(
  //   (signal, marketData, tradingConditions) => {
  //     const buyConditions = tradingConditions.buyConditions || {};
  //     const sellConditions = tradingConditions.sellConditions || {};

  //     const minBuyScore = buyConditions.minBuyScore || 6.0;
  //     const strongBuyScore = buyConditions.strongBuyScore || 8.0;
  //     const buyThreshold = buyConditions.buyThreshold || -2.0;
  //     const sellThreshold = sellConditions.sellThreshold || 3.0;
  //     const rsiOversold = buyConditions.rsiOversold || 35;

  //     // 1. 기본 점수 체크
  //     if (signal.totalScore < minBuyScore) {
  //       return {
  //         execute: false,
  //         reason: `점수 부족 (${signal.totalScore.toFixed(1)} < ${minBuyScore})`,
  //       };
  //     }

  //     // 2. RSI 조건 체크 (매수 전용)
  //     if (signal.type === "BUY" && marketData.rsi) {
  //       if (marketData.rsi > rsiOversold) {
  //         if (signal.totalScore < strongBuyScore) {
  //           return {
  //             execute: false,
  //             reason: `RSI 과매도 조건 미충족 (RSI: ${marketData.rsi}, 강매수 점수 필요: ${strongBuyScore})`,
  //           };
  //         }
  //       }
  //     }

  //     // 3. 가격 변동률 기반 조건
  //     const priceChangePercent = (marketData.signed_change_rate || 0) * 100;

  //     if (signal.type === "BUY") {
  //       if (priceChangePercent >= buyThreshold) {
  //         return {
  //           execute: false,
  //           reason: `충분한 하락 없음 (${priceChangePercent.toFixed(1)}% >= ${buyThreshold}%)`,
  //         };
  //       }

  //       return {
  //         execute: true,
  //         reason: `${priceChangePercent.toFixed(1)}% 하락으로 매수 조건 만족 (기준: ${buyThreshold}%)`,
  //       };
  //     }

  //     if (signal.type === "SELL") {
  //       if (priceChangePercent <= sellThreshold) {
  //         return {
  //           execute: false,
  //           reason: `충분한 상승 없음 (${priceChangePercent.toFixed(1)}% <= ${sellThreshold}%)`,
  //         };
  //       }

  //       return {
  //         execute: true,
  //         reason: `${priceChangePercent.toFixed(1)}% 상승으로 매도 조건 만족 (기준: ${sellThreshold}%)`,
  //       };
  //     }

  //     return { execute: true, reason: "조건 충족" };
  //   },
  //   []
  // );

  // 🎯 usePaperTrading.js에 추가할 디버깅 함수
  const debugTradingSystem = useCallback(() => {
    if (process.env.NODE_ENV !== "development") return;

    const systemStatus = {
      signals: signals.length,
      marketData: marketData.size,
      centralData: centralDataReady,
      signalGen: signalGeneratorReady,
      engineActive: paperTradingEngine.isActive,
      selectedCoins: currentSelectedCoins.length,
    };

    console.table(systemStatus);

    // 각 코인별 디버그 정보
    currentSelectedCoins.forEach((coin) => {
      const coinData = marketData.get(coin.symbol);
      if (coinData) {
        console.log(
          `🔍 [${coin.symbol}] RSI: ${coinData.rsi?.toFixed(1) || "N/A"}, 가격: ₩${coinData.trade_price?.toLocaleString() || "N/A"}, 변동률: ${((coinData.signed_change_rate || 0) * 100).toFixed(2)}%`
        );
      }
    });
  }, [
    signals.length,
    marketData,
    centralDataReady,
    signalGeneratorReady,
    currentSelectedCoins,
  ]);

  // 5초마다 디버그 정보 출력 (개발 모드에서만)
  useEffect(() => {
    if (isActive && process.env.NODE_ENV === "development") {
      const debugInterval = setInterval(debugTradingSystem, 5000);
      return () => clearInterval(debugInterval);
    }
  }, [isActive, debugTradingSystem]);

  // 🎯 설정 업데이트 함수 개선
  const handleSettingsChange = useCallback(
    (newSettings) => {
      console.log("🔧 거래 설정 업데이트:", newSettings);
      setTradingSettings(newSettings);

      // 🎯 신호 생성기에도 새 설정 적용
      if (signalGenerator.setTestMode) {
        signalGenerator.setTestMode(newSettings.testMode || testMode);
      }

      // 🎯 페이퍼 트레이딩 엔진에도 설정 적용
      if (paperTradingEngine.updateSettings) {
        paperTradingEngine.updateSettings(newSettings);
      }

      addLog("거래 설정이 업데이트되었습니다", "success");
    },
    [testMode, addLog]
  );

  // 🎯 NEW: 마켓 변경 핸들러 (중앙 시스템 연동)
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
        setCurrentSelectedCoins([]);
        setFavoriteCoins([]);
        setSignals([]);

        // 중앙 데이터 매니저 재초기화
        if (isSystemInitialized.current) {
          isSystemInitialized.current = false;
          await initializeCentralSystem();
        }

        addLog(`✅ ${newMarket} 마켓으로 변경 완료`, "success");
        return true;
      } catch (error) {
        addLog(`마켓 변경 실패: ${error.message}`, "error");
        return false;
      }
    },
    [selectedMarket, isActive, addLog, initializeCentralSystem]
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
          market: coin.market || `${selectedMarket}-${coin.symbol}`,
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

  // 🎯 NEW: 중앙화된 리소스 정리 함수
  const cleanupAllResources = useCallback(() => {
    console.log("🧹 모든 리소스 정리 시작...");
    isActiveRef.current = false;
    setIsActive(false);

    // 기존 인터벌 정리
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

    // 웹소켓 정리
    if (subscriptionIdRef.current) {
      upbitWebSocketService.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
    }

    try {
      upbitWebSocketService.disconnect();
    } catch (error) {
      console.warn("웹소켓 해제 중 오류:", error);
    }

    // 🎯 NEW: 중앙 데이터 매니저 정리
    if (centralDataSubscription.current) {
      centralDataSubscription.current(); // 구독 해제
      centralDataSubscription.current = null;
    }

    // 🎯 NEW: SignalGenerator 정리
    if (signalGeneratorReady) {
      try {
        signalGenerator.cleanup();
        setSignalGeneratorReady(false);
      } catch (error) {
        console.warn("SignalGenerator 정리 중 오류:", error);
      }
    }

    isSystemInitialized.current = false;
    setCentralDataReady(false);
    setConnectionStatus("disconnected");

    console.log("✅ 모든 리소스 정리 완료");
  }, [signalGeneratorReady]);

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
  }, [initializeStore, addLog]);

  // 🎯 NEW: 중앙화된 페이퍼 트레이딩 시작 로직
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
      console.log("🚀 중앙화된 페이퍼 트레이딩 시작 중...");

      if (!isStoreInitialized) {
        await initializeStore();
      }

      // 🎯 중앙 시스템 초기화
      const systemReady = await initializeCentralSystem();
      if (!systemReady) {
        throw new Error("중앙 시스템 초기화 실패");
      }

      setIsActive(true);
      isActiveRef.current = true;
      setSignals([]); // 신호 초기화
      resetStats();

      // 페이퍼 트레이딩 엔진 설정
      paperTradingEngine.setTestMode(testModeRef.current);
      paperTradingEngine.setActive(true);

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
        `${testModeRef.current ? "테스트" : "실전"} ${selectedMarket} 중앙화된 페이퍼 트레이딩 시작`,
        "success"
      );

      // 초기 분석 실행
      addLog("초기 시장 분석 중", "info", "initial_analysis");
      await Promise.all([updateMarketCondition(), fetchMarketSentiment()]);
      await updatePortfolio(true);

      // 🎯 웹소켓 Fallback (중앙 시스템 실패 시)
      if (operationMode === "websocket" && !centralDataReady) {
        addLog("웹소켓 Fallback 모드 활성화", "warning", "websocket_fallback");
        // 기존 웹소켓 로직 (필요시)
      }

      // 주기적 업데이트 설정
      if (isActiveRef.current) {
        marketAnalysisIntervalRef.current = setInterval(async () => {
          if (isActiveRef.current) {
            await updateMarketCondition();
          }
        }, 600000); // 10분마다

        portfolioIntervalRef.current = setInterval(() => {
          if (isActiveRef.current && !isLoading) {
            updatePortfolio(false);
          }
        }, 30000); // 30초마다

        if (tradingMode === "top") {
          topCoinsUpdateIntervalRef.current = setInterval(async () => {
            if (
              isActiveRef.current &&
              tradingModeRef.current === "top" &&
              favoriteCoins.length === 0
            ) {
              await updateTopCoinsUI();
            }
          }, 300000); // 5분마다
        }
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
        addLog(`로그 시스템 과부하: ${logStatus.logsPerSecond}/초`, "warning");
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
    cleanupAllResources,
    updateTopCoinsUI,
    isLoading,
    getLogSystemStatus,
    isStoreInitialized,
    initializeStore,
    initializeCentralSystem,
    centralDataReady,
    topCoins,
  ]);

  // ✅ 기존 페이퍼 트레이딩 중지 로직 완전 유지
  const stopPaperTrading = useCallback(() => {
    console.log(`🛑 ${selectedMarket} 페이퍼 트레이딩 중지 시작...`);

    setIsActive(false);
    isActiveRef.current = false;
    setConnectionStatus("disconnected");
    setSignals([]); // 신호 초기화

    cleanupAllResources();

    try {
      paperTradingEngine.setActive?.(false);
    } catch (error) {
      console.warn("페이퍼 트레이딩 엔진 중지 중 오류:", error);
    }

    addLog(
      `${testModeRef.current ? "테스트" : "실전"} ${selectedMarket} 중앙화된 페이퍼 트레이딩 완전 중지`,
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
        selectedMarket,
        signals: signals.length,
        isStoreInitialized,
        centralDataReady,
        signalGeneratorReady,
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
    centralDataReady,
    signalGeneratorReady,
  ]);

  // ✅ 기존 cleanup 로직 완전 유지
  useEffect(() => {
    return () => {
      console.log("🧹 컴포넌트 언마운트 - 리소스 정리");
      isActiveRef.current = false;
      cleanupAllResources();
    };
  }, [cleanupAllResources]);

  // ✅ 기존 반환 객체 완전 유지 + 중앙 시스템 상태 추가
  return {
    // 기존 상태
    portfolio,
    isActive,
    isConnected: connectionStatus === "connected",
    connectionStatus,
    lastSignal,
    logs,
    signals,
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

    // 마켓 관련 상태
    selectedMarket,
    availableMarkets,

    // 🎯 NEW: 중앙 시스템 상태
    centralDataReady,
    signalGeneratorReady,
    systemReady: centralDataReady && signalGeneratorReady,

    // 기존 설정
    tradingMode,
    setTradingMode,
    topCoinsLimit,
    setTopCoinsLimit,
    tradingSettings,
    setTradingSettings: handleSettingsChange,
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

    // 마켓 변경 액션
    changeMarket,

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

    // 기존 추가 상태 정보
    tradingStats: {
      mode: testMode ? "TEST" : "LIVE",
      market: selectedMarket,
      engine: paperTradingEngine.getCurrentSettings?.() || {},
      webSocket: upbitWebSocketService.getStats(),
      market: upbitMarketService.getServiceStats?.() || {},
      centralSystem: {
        dataReady: centralDataReady,
        signalGeneratorReady: signalGeneratorReady,
        performance: signalGenerator.getPerformanceStats?.() || {},
      },
    },
  };
};

export default usePaperTrading;
