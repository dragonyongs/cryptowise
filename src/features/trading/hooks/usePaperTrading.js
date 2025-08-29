// src/features/trading/hooks/usePaperTrading.js - 함수 순서 수정 버전

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useCapital, useCapitalSubscription } from "../../../hooks/useCapital";

// ✅ Store 연결
import { usePortfolioStore } from "../../../stores/portfolioStore.js";
import { useCoinStore } from "../../../stores/coinStore.js";
import { useTradingStore } from "../../../stores/tradingStore.js";

// ✅ 분리된 훅들
import { useSignalManagement } from "./useSignalManagement.js";
import { useConnectionManager } from "./useConnectionManager.js";
import { usePortfolioSync } from "./usePortfolioSync.js";

// 기존 서비스들
import { paperTradingEngine } from "../../../services/testing/paperTradingEngine.js";
import { upbitMarketService } from "../../../services/upbit/upbitMarketService.js";
import { upbitWebSocketService } from "../../../services/upbit/upbitWebSocket.js";
import { marketAnalysisService } from "../../../services/analysis/marketAnalysis.js";
import { centralDataManager } from "../../../services/data/centralDataManager.js";
import { signalGenerator } from "../../../services/analysis/signalGenerator.js";

// 동적 포지션 관리 서비스들
import { dynamicPositionManager } from "../../../services/portfolio/dynamicPositionManager.js";
import { positionSizing } from "../../../services/portfolio/positionSizing.js";
import { cashManagement } from "../../../services/portfolio/cashManagement.js";

// 기존 훅들
import { useTradingLogger } from "./useTradingLogger.js";
import { usePortfolioManager } from "../../portfoilo/hooks/usePortfolioManager.js";
import { useMarketSentiment } from "../../market/hooks/useMarketSentiment.js";
import { usePortfolioConfig } from "../../../config/portfolioConfig.js";
import hybridSignalGenerator from "../../../services/analysis/hybridSignalGenerator.js";

export const usePaperTrading = (
  userId = "demo-user",
  externalSettings = null
) => {
  // 🔥 중앙화된 자본금 사용
  const {
    capital,
    updateCapital,
    isInitialized: capitalInitialized,
  } = useCapital();

  // 로깅 시스템
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

  // 🔥 마운트 상태 추적
  const mountedRef = useRef(true);
  const initializationRef = useRef(false);
  const cleanupRef = useRef(false);
  const systemInitializedRef = useRef(false);

  // ✅ Store 연결
  const { updatePortfolio: updatePortfolioStore } = usePortfolioStore();
  const { updateTradingSettings: updateGlobalTradingSettings } =
    useTradingStore();

  // ✅ 초기 자본 관리
  const [customCapital, setCustomCapital] = useState(
    externalSettings?.initialCapital || null
  );
  const { initialCapital } = usePortfolioConfig(customCapital);

  // 🔥 페이퍼 트레이딩 엔진 초기 설정 (중앙화된 자본금 사용)
  useEffect(() => {
    if (mountedRef.current && capitalInitialized && capital > 0) {
      paperTradingEngine.resetPortfolio(capital);
      addLog(
        `🎯 페이퍼 트레이딩 엔진 자본금 설정: ${capital.toLocaleString()}원`,
        "info"
      );
    }
  }, [capital, capitalInitialized, addLog]);

  // 자본금 변경 이벤트 구독: 설정에서 자본금이 바뀌면 customCapital도 동기화
  useEffect(() => {
    const handler = (e) => {
      const newAmount = e?.detail?.amount;
      if (newAmount && newAmount > 0) {
        setCustomCapital(newAmount);
      }
    };
    window.addEventListener("portfolio-capital-updated", handler);
    return () =>
      window.removeEventListener("portfolio-capital-updated", handler);
  }, []);

  // ✅ 초기화 상태
  const [isStoreInitialized, setIsStoreInitialized] = useState(false);
  const [centralDataReady, setCentralDataReady] = useState(false);
  const [signalGeneratorReady, setSignalGeneratorReady] = useState(false);

  // ✅ coinStore 연결
  const {
    selectedCoins: storeSelectedCoins,
    isInitialized,
    initializeData,
    refreshData,
    addCoin: addCoinToStore,
    removeCoin: removeCoinFromStore,
  } = useCoinStore();

  // ✅ 핵심 상태들
  const [isActive, setIsActive] = useState(false);
  const [favoriteCoins, setFavoriteCoins] = useState([]);
  const [topCoins, setTopCoins] = useState([]);
  const [currentSelectedCoins, setCurrentSelectedCoins] = useState([]);
  const [marketData, setMarketData] = useState(new Map());
  const [marketCondition, setMarketCondition] = useState(null);

  // ✅ 트레이딩 설정
  const [tradingMode, setTradingMode] = useState("favorites");
  const [topCoinsLimit, setTopCoinsLimit] = useState(10);
  const [testMode, setTestMode] = useState(true);
  const [operationMode, setOperationMode] = useState("centralized");
  const [selectedMarket, setSelectedMarket] = useState("KRW");
  const [availableMarkets] = useState(["KRW", "BTC", "USDT"]);

  // ✅ 동적 포지션 관리 상태
  const [dynamicPositionEnabled, setDynamicPositionEnabled] = useState(true);
  const [optimizationPlan, setOptimizationPlan] = useState(null);
  const [positionAnalysis, setPositionAnalysis] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [cashOptimization, setCashOptimization] = useState(null);

  // 🔥 여기에 추가
  const [autoStopDisabled, setAutoStopDisabled] = useState(true); // 테스트 모드에서는 기본 true

  // ✅ Refs
  const isActiveRef = useRef(isActive);
  const currentSelectedCoinsRef = useRef(currentSelectedCoins);
  const tradingSettingsRef = useRef();
  const testModeRef = useRef(testMode);
  const tradingModeRef = useRef(tradingMode);

  // 인터벌 Refs
  const portfolioIntervalRef = useRef(null);
  const marketAnalysisIntervalRef = useRef(null);
  const topCoinsUpdateIntervalRef = useRef(null);
  const optimizationIntervalRef = useRef(null);

  const {
    portfolio,
    updatePortfolio: syncPortfolio,
    isLoading,
  } = usePortfolioManager(marketData, addLog);

  const { updatePortfolio } = usePortfolioSync(
    syncPortfolio,
    addLog,
    updatePortfolioStore
  );

  // 🔥 자본금 변경 감지 및 동기화 (usePortfolioSync 이후로 이동)
  useCapitalSubscription(
    useCallback(
      (newCapital, oldCapital) => {
        if (newCapital !== oldCapital && paperTradingEngine) {
          paperTradingEngine.resetPortfolio(newCapital);
          addLog(`💰 자본금 변경: ${newCapital.toLocaleString()}원`, "info");

          // 포트폴리오 업데이트
          setTimeout(() => {
            updatePortfolio(true);
          }, 1000);
        }
      },
      [addLog, updatePortfolio]
    )
  );

  // 🔥 시스템 준비 상태
  const systemReady = useMemo(() => {
    return (
      isStoreInitialized &&
      centralDataReady &&
      signalGeneratorReady &&
      favoriteCoins.length > 0 &&
      !cleanupRef.current
    );
  }, [
    isStoreInitialized,
    centralDataReady,
    signalGeneratorReady,
    favoriteCoins.length,
  ]);

  // ✅ Refs 동기화
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
  useEffect(() => {
    currentSelectedCoinsRef.current = currentSelectedCoins;
  }, [currentSelectedCoins]);
  useEffect(() => {
    testModeRef.current = testMode;
  }, [testMode]);
  useEffect(() => {
    tradingModeRef.current = tradingMode;
  }, [tradingMode]);

  // 🎯 페이퍼 트레이딩 엔진 초기 설정
  useEffect(() => {
    if (mountedRef.current && initialCapital) {
      paperTradingEngine.resetPortfolio(initialCapital);
    }
  }, [initialCapital]);

  const { marketSentiment, sentimentLoading, fetchMarketSentiment } =
    useMarketSentiment(addLog, isActive);

  // ✅ 설정 관리
  const getInitialSettings = useCallback(() => {
    console.log(
      "🔧 getInitialSettings 호출: testMode =",
      testMode,
      "dynamicPositionEnabled =",
      dynamicPositionEnabled
    );

    const settings = {
      portfolioAllocation: { cash: 0.4, t1: 0.42, t2: 0.15, t3: 0.03 },

      // 🔥 ENHANCED: 매매 조건 구조 (로그 추가)
      tradingConditions: {
        buyConditions: {
          priceDropThreshold: testMode ? -3 : -5, // 가격 하락률 매수
          rsiOversold: testMode ? 35 : 30, // RSI 과매도
          minBuyScore: testMode ? 5.5 : 7.0, // 최소 신호 점수
          volumeThreshold: 1.2, // 거래량 임계값
          requireMultipleSignals: !testMode,
        },
        sellConditions: {
          profitTarget1: 3, // 1차 수익실현
          profitTarget2: 5, // 2차 수익실현
          profitTarget3: 8, // 최종 수익목표
          stopLoss: -6, // 손절매
          rsiOverbought: testMode ? 65 : 70,
          timeBasedExit: 7,
        },
        riskManagement: {
          maxCoinsToTrade: testMode ? 8 : 4,
          reserveCashRatio: 0.25,
          maxSinglePosition: 15,
          dailyTradeLimit: testMode ? 15 : 6,
          volumeThreshold: 1.2,
        },
      },

      // 🔥 ENHANCED: 시장 적응형 거래 규칙 (로그 추가)
      marketAdaptiveRules: {
        enabled: true,
        // 시장 좋을 때 (50점 이상)
        bullMarket: {
          rsiOversoldBuy: testMode ? 35 : 30,
          rsiOverboughtSell: testMode ? 65 : 70,
          priceDropBuy: testMode ? -2 : -3,
          priceRiseSell: testMode ? 4 : 6,
          minBuyScore: testMode ? 4.5 : 6.0,
        },
        // 시장 보통일 때 (30-50점)
        neutralMarket: {
          rsiOversoldBuy: testMode ? 30 : 25,
          rsiOverboughtSell: testMode ? 70 : 75,
          priceDropBuy: testMode ? -3 : -5,
          priceRiseSell: testMode ? 5 : 8,
          minBuyScore: testMode ? 5.5 : 7.0,
        },
        // 시장 안좋을 때 (30점 미만)
        bearMarket: {
          rsiOversoldBuy: testMode ? 25 : 20,
          rsiOverboughtSell: testMode ? 75 : 80,
          priceDropBuy: testMode ? -5 : -8,
          priceRiseSell: testMode ? 6 : 10,
          minBuyScore: testMode ? 6.5 : 8.0,
          requireMultipleConfirmation: true, // 추가 확인 필요
        },
      },

      strategy: testMode ? "test_mode" : "live_mode",
      testMode: testMode,
      dynamicPosition: {
        enabled: dynamicPositionEnabled,
        adaptiveSizing: true,
        cashManagement: true,
      },
    };

    console.log("📋 생성된 거래 설정:", {
      buyConditions: settings.tradingConditions.buyConditions,
      sellConditions: settings.tradingConditions.sellConditions,
      testMode: settings.testMode,
      dynamicPosition: settings.dynamicPosition.enabled,
    });

    return settings;
  }, [testMode, dynamicPositionEnabled]);

  const [tradingSettings, setTradingSettings] = useState(() =>
    getInitialSettings()
  );

  useEffect(() => {
    tradingSettingsRef.current = tradingSettings;
  }, [tradingSettings]);

  // ✅ 분리된 훅들 사용
  const getTradingSettingsCallback = useCallback(
    () => tradingSettingsRef.current,
    []
  );

  const {
    signals,
    lastSignal,
    generateSignalsFromCachedData,
    clearSignals,
    updateSignalStatus,
  } = useSignalManagement(
    signalGeneratorReady,
    addLog,
    getTradingSettingsCallback
  );

  const {
    connectionStatus,
    handleCentralDataUpdate,
    cleanup: cleanupConnection,
    initializeConnection,
  } = useConnectionManager(addLog, updateStats);

  // 🔥 리소스 정리
  const cleanupAllResources = useCallback(() => {
    if (cleanupRef.current || !mountedRef.current) return;

    cleanupRef.current = true;
    console.log("🧹 리소스 정리 시작");

    setIsActive(false);
    isActiveRef.current = false;

    // 모든 인터벌 정리
    [
      portfolioIntervalRef,
      marketAnalysisIntervalRef,
      topCoinsUpdateIntervalRef,
      optimizationIntervalRef,
    ].forEach((ref) => {
      if (ref.current) {
        clearInterval(ref.current);
        clearTimeout(ref.current);
        ref.current = null;
      }
    });

    // 분리된 훅들의 cleanup 호출
    try {
      cleanupConnection();
      clearSignals();
    } catch (error) {
      console.warn("훅 정리 중 오류:", error);
    }

    // 웹소켓 해제
    try {
      upbitWebSocketService.disconnect();
    } catch (error) {
      console.warn("웹소켓 해제 중 오류:", error);
    }

    // 신호 생성기 정리
    if (signalGeneratorReady) {
      try {
        signalGenerator.cleanup?.();
        setSignalGeneratorReady(false);
      } catch (error) {
        console.warn("SignalGenerator 정리 중 오류:", error);
      }
    }

    // 상태 초기화
    systemInitializedRef.current = false;
    setCentralDataReady(false);
    setOptimizationPlan(null);
    setPositionAnalysis(null);
    setRiskAssessment(null);
    setCashOptimization(null);

    addLog("🔌 연결 매니저 정리 완료", "info");
    console.log("✅ 리소스 정리 완료");
  }, [cleanupConnection, clearSignals, signalGeneratorReady, addLog]);

  // 🔥 시장 조건 업데이트 (수정 버전)
  // 🔥 updateMarketCondition 수정 (완전 차단 → 조건 조절)
  const updateMarketCondition = useCallback(async () => {
    if (!isActiveRef.current || !mountedRef.current) return null;

    try {
      addLog("시장 조건 분석 중", "info");
      const condition = await marketAnalysisService.analyzeMarketCondition();

      if (isActiveRef.current && mountedRef.current) {
        setMarketCondition(condition);

        if (dynamicPositionEnabled) {
          paperTradingEngine.updateMarketCondition(condition);
        }

        updateStats((prev) => ({
          ...prev,
          marketConditionsChecked: (prev.marketConditionsChecked || 0) + 1,
        }));

        // 🔥 NEW: 시장 조건에 따른 거래 조건 조절 (차단 X)
        let marketAdjustment = "";
        if (condition.overallBuyScore < 30) {
          // 매우 안좋음: 조건 강화
          marketAdjustment = "🔴 매우 주의: 엄격한 조건으로 거래";
          // 신호 생성 시 더 높은 점수 요구하도록 설정
          paperTradingEngine.setMarketRiskLevel("HIGH");
        } else if (condition.overallBuyScore < 50) {
          // 안좋음: 조건 약간 강화
          marketAdjustment = "🟡 주의: 신중한 거래 조건 적용";
          paperTradingEngine.setMarketRiskLevel("MEDIUM");
        } else {
          // 보통 이상: 일반 조건
          marketAdjustment = "🟢 정상: 일반 거래 조건 적용";
          paperTradingEngine.setMarketRiskLevel("LOW");
        }

        const message = `시장 분석: ${condition.buyability?.level} (${condition.overallBuyScore?.toFixed(1)}점) - ${marketAdjustment}`;
        addLog(message, condition.overallBuyScore < 30 ? "warning" : "info");
      }

      return condition;
    } catch (error) {
      if (isActiveRef.current && mountedRef.current) {
        addLog(`시장 분석 실패: ${error.message}`, "error");
      }
      return null;
    }
  }, [addLog, updateStats, dynamicPositionEnabled]);

  // 🔥 포지션 분석 업데이트 (먼저 선언)
  const updatePositionAnalysis = useCallback(async () => {
    if (!dynamicPositionEnabled || !portfolio || !mountedRef.current) return;

    try {
      const currentPositions = portfolio.positions || [];
      const analysis = {
        totalPositions: currentPositions.length,
        profitablePositions: currentPositions.filter(
          (p) => (p.profitRate || 0) > 0
        ).length,
        lossPositions: currentPositions.filter((p) => (p.profitRate || 0) < 0)
          .length,
        averageProfit:
          currentPositions.length > 0
            ? currentPositions.reduce(
                (sum, p) => sum + (p.profitRate || 0),
                0
              ) / currentPositions.length
            : 0,
        recommendations: [],
      };

      try {
        const swapOpportunity = dynamicPositionManager.evaluatePositionSwap(
          currentPositions,
          signals
        );
        if (swapOpportunity) {
          analysis.recommendations.push({
            type: "SWAP",
            message: `${swapOpportunity.sellPosition.symbol} → ${swapOpportunity.buySignal.symbol} 교체 고려`,
            priority: "HIGH",
          });
        }
      } catch (error) {
        console.warn("포지션 교체 분석 실패:", error);
      }

      setPositionAnalysis(analysis);
      addLog(
        `📊 포지션 분석 업데이트: ${analysis.totalPositions}개 포지션`,
        "debug"
      );
    } catch (error) {
      addLog(`포지션 분석 실패: ${error.message}`, "warning");
    }
  }, [dynamicPositionEnabled, portfolio, addLog, signals]);

  // 🔥 리스크 평가 업데이트 (먼저 선언)
  const updateRiskAssessment = useCallback(async () => {
    if (!dynamicPositionEnabled || !portfolio || !mountedRef.current) return;

    try {
      const portfolioHealth = {
        unrealizedLoss: portfolio.totalProfitRate || 0,
        winRate: portfolio.performance?.winRate || 0,
        recentPerformance: portfolio.totalProfitRate || 0,
      };

      const marketMetrics = {
        fearGreedIndex: 50,
        bitcoinDominance: 50,
        volatility: 0.5,
      };

      const optimalCashRatio = cashManagement.calculateOptimalCashRatio(
        marketCondition || "NEUTRAL",
        portfolioHealth,
        marketMetrics
      );

      const cashBalance = cashManagement.handleCashImbalance(
        (portfolio.cashRatio || 0) / 100,
        optimalCashRatio,
        portfolio
      );

      const assessment = {
        riskLevel:
          portfolioHealth.unrealizedLoss < -15
            ? "HIGH"
            : portfolioHealth.unrealizedLoss < -5
              ? "MEDIUM"
              : "LOW",
        currentCashRatio: portfolio.cashRatio || 0,
        optimalCashRatio: optimalCashRatio * 100,
        needsRebalancing: !cashBalance.balanced,
        recommendations: cashBalance.actions || [],
      };

      setRiskAssessment(assessment);
      addLog(`⚠️ 리스크 평가: ${assessment.riskLevel} 수준`, "debug");
    } catch (error) {
      addLog(`리스크 평가 실패: ${error.message}`, "warning");
    }
  }, [dynamicPositionEnabled, portfolio, marketCondition, addLog]);

  // 🔥 현금 최적화 (먼저 선언)
  const updateCashOptimization = useCallback(async () => {
    if (!dynamicPositionEnabled || !portfolio || !mountedRef.current) return;

    try {
      const optimization = {
        currentRatio: portfolio.cashRatio || 0,
        optimalRatio: riskAssessment?.optimalCashRatio || 30,
        difference: Math.abs(
          (portfolio.cashRatio || 0) - (riskAssessment?.optimalCashRatio || 30)
        ),
        status: riskAssessment?.needsRebalancing
          ? "NEEDS_ADJUSTMENT"
          : "OPTIMAL",
      };

      setCashOptimization(optimization);
    } catch (error) {
      addLog(`현금 최적화 계산 실패: ${error.message}`, "warning");
    }
  }, [dynamicPositionEnabled, portfolio, riskAssessment, addLog]);

  // 🔥 상위 코인 업데이트 (먼저 선언)
  const updateTopCoinsUI = useCallback(async () => {
    if (!mountedRef.current || tradingModeRef.current !== "top") {
      addLog("상위코인 모드가 아니므로 업데이트 건너뜀", "info");
      return [];
    }

    try {
      addLog("🔄 상위 코인 업데이트 시작", "info");
      const topCoinsData = await upbitMarketService.getTopCoins(
        topCoinsLimit,
        testModeRef.current
      );

      if (!topCoinsData || topCoinsData.length === 0) {
        addLog("상위 코인 데이터 없음", "warning");
        return [];
      }

      const isInvestableSymbol = (symbol) => {
        const stableCoins = ["USDT", "USDC", "BUSD", "DAI", "TUSD", "USDD"];
        const riskyCoins = ["LUNA", "UST", "LUNC", "USTC"];
        return (
          !stableCoins.some((stable) =>
            symbol.toUpperCase().includes(stable)
          ) && !riskyCoins.some((risky) => symbol.toUpperCase().includes(risky))
        );
      };

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
        .filter(
          (coin) =>
            coin.symbol && coin.market && isInvestableSymbol(coin.symbol)
        );

      if (mountedRef.current) {
        setTopCoins(formattedCoins);

        try {
          await hybridSignalGenerator.updateWatchedCoins(
            favoriteCoins.map((c) => c.symbol),
            formattedCoins.map((c) => c.symbol)
          );
          addLog("상위 코인 뉴스 캐시 업데이트 완료", "info");
        } catch (newsError) {
          addLog(`뉴스 캐시 업데이트 실패: ${newsError.message}`, "warning");
        }

        addLog(`상위 코인 ${formattedCoins.length}개 업데이트 완료`, "success");
      }

      return formattedCoins;
    } catch (error) {
      addLog(`상위 코인 업데이트 실패: ${error.message}`, "error");
      return [];
    }
  }, [topCoinsLimit, addLog, favoriteCoins, selectedMarket]);

  // 🔥 동적 포지션 관리 초기화
  const initializeDynamicPositionManagement = useCallback(async () => {
    if (!mountedRef.current || !dynamicPositionEnabled) {
      addLog("동적 포지션 관리가 비활성화됨", "info");
      return true;
    }

    try {
      addLog("🎯 동적 포지션 관리 시스템 초기화", "info");
      paperTradingEngine.setDynamicPositionEnabled(true);

      if (marketCondition) {
        paperTradingEngine.updateMarketCondition(marketCondition);
      }

      addLog("✅ 동적 포지션 관리 시스템 초기화 완료", "success");
      return true;
    } catch (error) {
      addLog(`❌ 동적 포지션 관리 초기화 실패: ${error.message}`, "error");
      return false;
    }
  }, [dynamicPositionEnabled, marketCondition, addLog]);

  // 🔥 중앙 시스템 초기화
  const initializeCentralSystem = useCallback(async () => {
    if (!mountedRef.current || systemInitializedRef.current) {
      addLog("🔄 중앙 시스템 이미 초기화됨", "info");
      return true;
    }

    try {
      systemInitializedRef.current = true;
      addLog("🚀 중앙 데이터 매니저 초기화 시작", "info");

      const initialCoins =
        currentSelectedCoins.length > 0
          ? currentSelectedCoins.map((c) => c.symbol)
          : ["BTC", "ETH"];

      // 1단계: 중앙 데이터 매니저 초기화
      try {
        await centralDataManager.initialize(initialCoins);
        addLog("✅ 중앙 데이터 매니저 초기화 완료", "success");
      } catch (error) {
        addLog(
          `⚠️ 중앙 데이터 매니저 초기화 실패, 계속 진행: ${error.message}`,
          "warning"
        );
      }

      // 2단계: 신호 생성기 초기화
      try {
        await signalGenerator.initialize(centralDataManager);
        signalGenerator.setTestMode(testModeRef.current);
        setSignalGeneratorReady(true);
        addLog("✅ 신호 생성기 초기화 완료", "success");
      } catch (error) {
        addLog(
          `⚠️ 신호 생성기 초기화 실패, 기본 모드로 진행: ${error.message}`,
          "warning"
        );
        setSignalGeneratorReady(true);
      }

      // 3단계: 연결 매니저 초기화
      try {
        const connectionReady = await initializeConnection(initialCoins);
        if (connectionReady) {
          addLog("✅ 연결 매니저 초기화 완료", "success");
        }
      } catch (error) {
        addLog(
          `⚠️ 연결 매니저 초기화 실패, 계속 진행: ${error.message}`,
          "warning"
        );
      }

      setCentralDataReady(true);

      // 4단계: 동적 포지션 관리 초기화
      await initializeDynamicPositionManagement();

      if (mountedRef.current) {
        addLog("🎯 중앙 시스템 완전 초기화 완료", "success");
      }

      return true;
    } catch (error) {
      systemInitializedRef.current = false;
      addLog(`❌ 중앙 시스템 초기화 실패: ${error.message}`, "error");
      return false;
    }
  }, [
    currentSelectedCoins,
    addLog,
    initializeDynamicPositionManagement,
    initializeConnection,
  ]);

  // 🔥 Store 초기화
  const initializeStore = useCallback(async () => {
    if (!mountedRef.current || isStoreInitialized || initializationRef.current)
      return;

    try {
      initializationRef.current = true;
      addLog("🚀 Store 초기화 시작", "info");

      if (!isInitialized) {
        await initializeData(true);
      }

      const currentSelectedCoins = useCoinStore.getState().selectedCoins;

      if (mountedRef.current) {
        if (currentSelectedCoins.length > 0) {
          const formattedCoins = currentSelectedCoins.map((coin) => ({
            ...coin,
            isTopCoin: false,
          }));
          setFavoriteCoins(formattedCoins);
          setCurrentSelectedCoins(formattedCoins);
          addLog(
            `초기화 시 관심코인 ${currentSelectedCoins.length}개 동기화`,
            "success"
          );
        }

        setIsStoreInitialized(true);
        addLog("✅ Store 초기화 완료", "success");
      }
    } catch (error) {
      if (mountedRef.current) {
        addLog(`❌ Store 초기화 실패: ${error.message}`, "error");
      }
    } finally {
      initializationRef.current = false;
    }
  }, [isStoreInitialized, isInitialized, initializeData, addLog]);

  // 🔥 페이퍼 트레이딩 시작
  const startPaperTrading = useCallback(async () => {
    if (!mountedRef.current || isActiveRef.current) {
      addLog("이미 거래가 활성화되어 있습니다", "warning");
      return;
    }

    if (tradingMode === "favorites" && favoriteCoins.length === 0) {
      addLog("관심 코인을 먼저 추가해주세요", "error");
      return;
    }

    try {
      console.log("🚀 페이퍼 트레이딩 시작");

      if (!isStoreInitialized) {
        await initializeStore();
      }

      const systemReady = await initializeCentralSystem();
      if (!systemReady) {
        throw new Error("중앙 시스템 초기화 실패");
      }

      if (mountedRef.current) {
        setIsActive(true);
        isActiveRef.current = true;

        paperTradingEngine.setTestMode(testModeRef.current);
        paperTradingEngine.setActive(true);

        if (dynamicPositionEnabled) {
          paperTradingEngine.setDynamicPositionEnabled(true);
          addLog("🎯 동적 포지션 관리 활성화", "success");
        }

        clearSignals();
        resetStats();

        // 하이브리드 뉴스 시스템 초기화
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
          `${testModeRef.current ? "테스트" : "실전"} ${selectedMarket} ${
            dynamicPositionEnabled ? "동적" : "고정"
          } 포지션 관리 페이퍼 트레이딩 시작`,
          "success"
        );

        // 초기 분석 실행
        try {
          await Promise.all([updateMarketCondition(), fetchMarketSentiment()]);
          await updatePortfolio(true);
        } catch (analysisError) {
          addLog(`초기 분석 실행 실패: ${analysisError.message}`, "warning");
        }

        // 주기적 업데이트 설정
        if (isActiveRef.current) {
          marketAnalysisIntervalRef.current = setInterval(async () => {
            if (isActiveRef.current && mountedRef.current) {
              try {
                await updateMarketCondition();
              } catch (error) {
                console.warn("시장 분석 업데이트 실패:", error);
              }
            }
          }, 600000);

          portfolioIntervalRef.current = setInterval(() => {
            if (isActiveRef.current && mountedRef.current && !isLoading) {
              try {
                updatePortfolio(false);
              } catch (error) {
                console.warn("포트폴리오 업데이트 실패:", error);
              }
            }
          }, 30000);

          if (tradingMode === "top") {
            topCoinsUpdateIntervalRef.current = setInterval(async () => {
              if (
                isActiveRef.current &&
                mountedRef.current &&
                tradingModeRef.current === "top"
              ) {
                try {
                  await updateTopCoinsUI();
                } catch (error) {
                  console.warn("상위 코인 업데이트 실패:", error);
                }
              }
            }, 300000);
          }

          if (dynamicPositionEnabled) {
            optimizationIntervalRef.current = setInterval(() => {
              if (isActiveRef.current && mountedRef.current) {
                try {
                  updatePositionAnalysis();
                  updateRiskAssessment();
                  updateCashOptimization();
                } catch (error) {
                  console.warn("동적 포지션 관리 업데이트 실패:", error);
                }
              }
            }, 120000);
          }
        }

        const modeText = testModeRef.current
          ? "테스트 모드: 완화된 조건으로 더 많은 거래 기회"
          : "실전 모드: 엄격한 조건으로 신중한 거래";
        addLog(modeText, "info");

        addLog(
          `거래 대상: ${
            tradingMode === "top"
              ? `상위 ${topCoinsLimit}개 코인`
              : `관심 코인 ${favoriteCoins.length}개`
          } (${selectedMarket} 마켓)`,
          "info"
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
      if (mountedRef.current) {
        addLog(`시작 실패: ${error.message}`, "error");
        setIsActive(false);
        isActiveRef.current = false;
        cleanupAllResources();
      }
    }
  }, [
    tradingMode,
    favoriteCoins,
    topCoinsLimit,
    selectedMarket,
    dynamicPositionEnabled,
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
    topCoins,
    clearSignals,
    updatePositionAnalysis,
    updateRiskAssessment,
    updateCashOptimization,
  ]);

  // 🔥 페이퍼 트레이딩 중지
  const stopPaperTrading = useCallback(() => {
    if (!mountedRef.current) return;

    console.log(`🛑 ${selectedMarket} 페이퍼 트레이딩 중지 시작...`);
    setIsActive(false);
    isActiveRef.current = false;

    clearSignals();
    cleanupAllResources();

    try {
      paperTradingEngine.setActive?.(false);
      if (dynamicPositionEnabled) {
        paperTradingEngine.setDynamicPositionEnabled?.(false);
      }
    } catch (error) {
      console.warn("페이퍼 트레이딩 엔진 중지 중 오류:", error);
    }

    addLog(
      `${testModeRef.current ? "테스트" : "실전"} ${selectedMarket} ${
        dynamicPositionEnabled ? "동적" : "고정"
      } 포지션 관리 페이퍼 트레이딩 완전 중지`,
      "warning"
    );

    console.log("✅ 페이퍼 트레이딩 중지 완료");
  }, [
    addLog,
    cleanupAllResources,
    selectedMarket,
    dynamicPositionEnabled,
    clearSignals,
  ]);

  // ✅ 나머지 함수들 (신호 처리, 관심코인 관리 등)
  const processSignalForTrading = useCallback(
    async (signal) => {
      if (!mountedRef.current || !isActiveRef.current) return false;

      try {
        // 🔥 ENHANCED: 신호 처리 전 설정 디버깅
        console.log("🎯 신호 처리 시작:", {
          symbol: signal.symbol,
          type: signal.type,
          score: signal.totalScore,
          price: signal.price,
          currentSettings: tradingSettingsRef.current?.tradingConditions,
        });

        const currentMarketData = marketData.get(signal.symbol);
        if (!currentMarketData) {
          addLog(`❌ [${signal.symbol}] 시장 데이터 없음`, "warning");
          return false;
        }

        const enhancedSignal = {
          ...signal,
          totalScore: Math.max(signal.totalScore || 0, 6.0),
          confidence: signal.confidence || "medium",
          price: currentMarketData.trade_price || 0,
          volume24h: currentMarketData.acc_trade_price_24h || 0,
          // 🔥 ENHANCED: 추가 검증 데이터
          priceChangePercent:
            signal.priceChangePercent ||
            currentMarketData.signed_change_rate * 100,
          rsi: signal.rsi || signal.technicalData?.rsi,
          volumeRatio: signal.volumeRatio || signal.technicalData?.volumeRatio,
        };

        // ✅ 조건별 비교값/결과/최종 사유 요약 로그 (BUY/SELL 모두)
        const buyConditions =
          tradingSettingsRef.current?.tradingConditions?.buyConditions;
        const sellConditions =
          tradingSettingsRef.current?.tradingConditions?.sellConditions;
        if (signal.type === "BUY" && buyConditions) {
          const buyCheckResults = [];
          // minBuyScore
          if (enhancedSignal.totalScore < buyConditions.minBuyScore) {
            buyCheckResults.push(
              `minBuyScore(${enhancedSignal.totalScore} < ${buyConditions.minBuyScore}) → 실패`
            );
          } else {
            buyCheckResults.push(
              `minBuyScore(${enhancedSignal.totalScore} ≥ ${buyConditions.minBuyScore}) → 통과`
            );
          }
          // priceDropThreshold
          if (
            typeof buyConditions.priceDropThreshold === "number" &&
            typeof enhancedSignal.priceChangePercent === "number"
          ) {
            if (
              enhancedSignal.priceChangePercent <
              buyConditions.priceDropThreshold
            ) {
              buyCheckResults.push(
                `priceDrop(${enhancedSignal.priceChangePercent}% < ${buyConditions.priceDropThreshold}%) → 통과`
              );
            } else {
              buyCheckResults.push(
                `priceDrop(${enhancedSignal.priceChangePercent}% ≥ ${buyConditions.priceDropThreshold}%) → 실패`
              );
            }
          }
          // rsiOversold
          if (
            typeof buyConditions.rsiOversold === "number" &&
            typeof enhancedSignal.rsi === "number"
          ) {
            if (enhancedSignal.rsi < buyConditions.rsiOversold) {
              buyCheckResults.push(
                `RSI(${enhancedSignal.rsi} < ${buyConditions.rsiOversold}) → 통과`
              );
            } else {
              buyCheckResults.push(
                `RSI(${enhancedSignal.rsi} ≥ ${buyConditions.rsiOversold}) → 실패`
              );
            }
          }
          // 기타 조건 추가 가능
          let finalReason = "";
          if (buyCheckResults.some((r) => r.includes("실패"))) {
            finalReason = "최종: 조건 미충족으로 미진입";
          } else {
            finalReason = "최종: 모든 조건 통과";
          }
          // 무조건 로그 출력 (실패/통과 모두)
          addLog(
            `${buyCheckResults.some((r) => r.includes("실패")) ? "🟠" : "🟢"} [${signal.symbol}] ${buyCheckResults.join(", ")} | ${finalReason}`,
            "info"
          );
          if (buyCheckResults.some((r) => r.includes("실패"))) {
            return false;
          }
        }
        if (signal.type === "SELL" && sellConditions) {
          const sellCheckResults = [];
          // profitTarget1/2/3 (익절)
          if (
            typeof sellConditions.profitTarget1 === "number" &&
            typeof enhancedSignal.profitPercent === "number"
          ) {
            if (enhancedSignal.profitPercent >= sellConditions.profitTarget3) {
              sellCheckResults.push(
                `익절3(${enhancedSignal.profitPercent}% ≥ ${sellConditions.profitTarget3}%) → 통과`
              );
            } else if (
              enhancedSignal.profitPercent >= sellConditions.profitTarget2
            ) {
              sellCheckResults.push(
                `익절2(${enhancedSignal.profitPercent}% ≥ ${sellConditions.profitTarget2}%) → 통과`
              );
            } else if (
              enhancedSignal.profitPercent >= sellConditions.profitTarget1
            ) {
              sellCheckResults.push(
                `익절1(${enhancedSignal.profitPercent}% ≥ ${sellConditions.profitTarget1}%) → 통과`
              );
            } else {
              sellCheckResults.push(
                `익절(${enhancedSignal.profitPercent}% < ${sellConditions.profitTarget1}%) → 실패`
              );
            }
          }
          // stopLoss (손절)
          if (
            typeof sellConditions.stopLoss === "number" &&
            typeof enhancedSignal.profitPercent === "number"
          ) {
            if (enhancedSignal.profitPercent <= sellConditions.stopLoss) {
              sellCheckResults.push(
                `손절(${enhancedSignal.profitPercent}% ≤ ${sellConditions.stopLoss}%) → 통과`
              );
            } else {
              sellCheckResults.push(
                `손절(${enhancedSignal.profitPercent}% > ${sellConditions.stopLoss}%) → 실패`
              );
            }
          }
          // rsiOverbought
          if (
            typeof sellConditions.rsiOverbought === "number" &&
            typeof enhancedSignal.rsi === "number"
          ) {
            if (enhancedSignal.rsi > sellConditions.rsiOverbought) {
              sellCheckResults.push(
                `RSI(${enhancedSignal.rsi} > ${sellConditions.rsiOverbought}) → 통과`
              );
            } else {
              sellCheckResults.push(
                `RSI(${enhancedSignal.rsi} ≤ ${sellConditions.rsiOverbought}) → 실패`
              );
            }
          }
          // timeBasedExit (보유기간)
          if (
            typeof sellConditions.timeBasedExit === "number" &&
            typeof enhancedSignal.holdDays === "number"
          ) {
            if (enhancedSignal.holdDays >= sellConditions.timeBasedExit) {
              sellCheckResults.push(
                `보유기간(${enhancedSignal.holdDays}일 ≥ ${sellConditions.timeBasedExit}일) → 통과`
              );
            } else {
              sellCheckResults.push(
                `보유기간(${enhancedSignal.holdDays}일 < ${sellConditions.timeBasedExit}일) → 실패`
              );
            }
          }
          // 기타 조건 추가 가능
          let finalReason = "";
          if (sellCheckResults.some((r) => r.includes("통과"))) {
            finalReason = "최종: 매도 조건 충족, 매도 신호";
            addLog(
              `� [${signal.symbol}] ${sellCheckResults.join(", ")} | ${finalReason}`,
              "info"
            );
          } else {
            finalReason = "최종: 매도 조건 미충족, 미매도";
            addLog(
              `⚪ [${signal.symbol}] ${sellCheckResults.join(", ")} | ${finalReason}`,
              "info"
            );
            return false;
          }
        }

        addLog(
          `🔍 [${signal.symbol}] 신호 처리: ${enhancedSignal.totalScore.toFixed(1)}점, 가격변화: ${enhancedSignal.priceChangePercent?.toFixed(2)}%`,
          "info"
        );

        // 동적 포지션 관리 로직 (기존과 동일)
        if (dynamicPositionEnabled && signal.type === "BUY") {
          const portfolioState = {
            totalValue: portfolio?.totalValue || 0,
            totalCash: portfolio?.krw || 0,
            availableCash: portfolio?.krw || 0,
            positions: portfolio?.positions || [],
            cashRatio: (portfolio?.cashRatio || 100) / 100,
          };

          try {
            const optimalSize = positionSizing.calculateOptimalPosition(
              enhancedSignal,
              portfolioState,
              tradingSettingsRef.current
            );

            const entryCheck = dynamicPositionManager.shouldEnterPosition(
              enhancedSignal,
              portfolioState.positions,
              portfolioState
            );

            if (!entryCheck.enter) {
              addLog(
                `📊 [${signal.symbol}] 동적 진입 거부: ${entryCheck.reason}`,
                "info"
              );
              return false;
            }

            enhancedSignal.positionSize = optimalSize;
            addLog(
              `📊 [${signal.symbol}] 동적 진입 승인: ${entryCheck.reason}, 포지션 크기: ${optimalSize}`,
              "success"
            );
          } catch (error) {
            addLog(`동적 포지션 관리 오류: ${error.message}`, "warning");
          }
        }

        // 🔥 ENHANCED: 페이퍼 트레이딩 엔진에 설정 전달 확인
        console.log("🔧 엔진으로 전달할 신호:", {
          symbol: enhancedSignal.symbol,
          type: enhancedSignal.type,
          totalScore: enhancedSignal.totalScore,
          priceChangePercent: enhancedSignal.priceChangePercent,
          rsi: enhancedSignal.rsi,
          현재엔진설정: paperTradingEngine.getCurrentSettings?.(),
        });

        const result = await paperTradingEngine.executeSignal(enhancedSignal);

        if (result?.executed) {
          addLog(
            `✅ [${signal.symbol}] 거래 성공: ${signal.type} ₩${enhancedSignal.price.toLocaleString()}`,
            "success"
          );
          updateSignalStatus(signal.id, "executed", result);

          if (dynamicPositionEnabled) {
            setTimeout(() => {
              if (mountedRef.current) {
                updatePositionAnalysis();
                updateRiskAssessment();
              }
            }, 2000);
          }

          setTimeout(() => {
            if (isActiveRef.current && mountedRef.current) {
              updatePortfolio(true);
            }
          }, 1000);

          return true;
        } else {
          addLog(
            `❌ [${signal.symbol}] 거래 실패: ${result?.reason || "알 수 없는 원인"}`,
            "error"
          );
          updateSignalStatus(signal.id, "failed", result);
          return false;
        }
      } catch (error) {
        addLog(
          `💥 [${signal.symbol}] 거래 처리 오류: ${error.message}`,
          "error"
        );
        updateSignalStatus(signal.id, "error", { error: error.message });
        return false;
      }
    },
    [
      addLog,
      updatePortfolio,
      marketData,
      dynamicPositionEnabled,
      portfolio,
      updateSignalStatus,
      updatePositionAnalysis,
      updateRiskAssessment,
    ]
  );

  // 🔥 processMarketDataUpdate 개선 (시장 상황별 차등 조건)
  const processMarketDataUpdate = useCallback(
    async (dataMap) => {
      if (!dataMap || dataMap.size === 0 || !mountedRef.current) return;

      setMarketData(dataMap);

      if (isActiveRef.current && dataMap.size > 0) {
        try {
          console.log(
            "🎯 시장 상황별 개별 코인 신호 분석:",
            Array.from(dataMap.keys())
          );

          // 🔥 시장 상황에 따른 차등 조건 설정
          let signalOptions = {};
          const marketScore = marketCondition?.overallBuyScore || 50;

          if (marketScore < 30) {
            // 시장 매우 안좋음: 엄격한 조건
            signalOptions = {
              minBuyScore: testModeRef.current ? 6.5 : 8.0,
              rsiOversold: testModeRef.current ? 25 : 20, // 더 엄격
              priceDropThreshold: testModeRef.current ? -5 : -8, // 큰 하락만
              requireVolumeConfirmation: true,
              strategy: "market_cautious",
            };
            addLog("🔴 시장 매우 주의: 엄격한 개별 코인 조건 적용", "warning");
          } else if (marketScore < 50) {
            // 시장 안좋음: 보통 조건
            signalOptions = {
              minBuyScore: testModeRef.current ? 5.5 : 7.0,
              rsiOversold: testModeRef.current ? 30 : 25,
              priceDropThreshold: testModeRef.current ? -3 : -5,
              requireVolumeConfirmation: true,
              strategy: "market_normal",
            };
            addLog("🟡 시장 주의: 표준 개별 코인 조건 적용", "info");
          } else {
            // 시장 보통 이상: 완화된 조건
            signalOptions = {
              minBuyScore: testModeRef.current ? 4.5 : 6.0,
              rsiOversold: testModeRef.current ? 35 : 30,
              priceDropThreshold: testModeRef.current ? -2 : -3,
              requireVolumeConfirmation: false,
              strategy: "market_favorable",
            };
            addLog("🟢 시장 양호: 적극적 개별 코인 조건 적용", "info");
          }

          // 개별 코인 신호 생성 (시장 조건 무시하지 않고 조건만 조절)
          const newSignals = await generateSignalsFromCachedData(
            Array.from(dataMap.keys()),
            signalOptions
          );

          // 신호 개수와 심볼을 info 레벨로 무조건 로그
          addLog(
            `🧩 신호 생성 결과: ${newSignals.length}개 [${newSignals.map((s) => s.symbol).join(", ")}]`,
            "info"
          );

          if (newSignals.length === 0) {
            addLog("⚪ 신호 없음: 모든 조건 미충족 또는 데이터 부족", "info");
            // 🔥 RSI 기반 백업 신호 (시장 상황 관계없이)
            addLog("📊 기본 RSI 조건으로 재시도", "info");
            const rsiSignals = await generateSignalsFromCachedData(
              Array.from(dataMap.keys()),
              {
                useRSIOnly: true,
                rsiOversold: marketScore < 30 ? 20 : 30, // 시장에 따라 조절
                rsiOverbought: marketScore < 30 ? 75 : 70,
                minVolumeRatio: 1.5,
                strategy: "rsi_backup",
              }
            );

            addLog(
              `🧩 RSI 백업 신호 결과: ${rsiSignals.length}개 [${rsiSignals.map((s) => s.symbol).join(", ")}]`,
              "info"
            );

            if (rsiSignals.length > 0) {
              addLog(`🔥 RSI 백업 신호: ${rsiSignals.length}개`, "success");
              for (const signal of rsiSignals) {
                await processSignalForTrading(signal);
              }
            } else {
              addLog("⚪ RSI 백업 신호도 없음", "info");
            }
          } else {
            for (const signal of newSignals) {
              await processSignalForTrading(signal);
            }
          }
        } catch (error) {
          console.warn("시장 적응형 신호 처리 오류:", error);
          addLog(`❌ 신호 처리 오류: ${error.message}`, "error");
        }
      }
    },
    [
      generateSignalsFromCachedData,
      processSignalForTrading,
      addLog,
      marketCondition,
    ]
  );

  const addFavoriteCoin = useCallback(
    async (coin) => {
      if (!mountedRef.current) return;

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
      if (!mountedRef.current) return;

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

  // ✅ 나머지 함수들 (설정 변경, 토글 등)
  const handleSettingsChange = useCallback(
    (newSettings) => {
      if (!mountedRef.current) return;

      console.log("🔧 거래 설정 업데이트 시작:", newSettings);

      // 초기 자본 변경 처리
      if (
        newSettings.initialCapital &&
        newSettings.initialCapital !== customCapital
      ) {
        setCustomCapital(newSettings.initialCapital);
        if (!isActiveRef.current) {
          paperTradingEngine.resetPortfolio(newSettings.initialCapital);
        }
      }

      setTradingSettings((prev) => {
        const updated = { ...prev, ...newSettings };

        // 🔥 ENHANCED: 매매 조건 검증 및 정규화
        if (updated.tradingConditions?.buyConditions) {
          const buyConditions = updated.tradingConditions.buyConditions;
          // 최소 매수 점수 범위 검증
          if (buyConditions.minBuyScore !== undefined) {
            buyConditions.minBuyScore = Math.max(
              3.0,
              Math.min(10.0, buyConditions.minBuyScore)
            );
            console.log("📊 매수 점수 정규화:", buyConditions.minBuyScore);
          }

          // 가격 하락률 범위 검증
          if (buyConditions.priceDropThreshold !== undefined) {
            buyConditions.priceDropThreshold = Math.max(
              -20,
              Math.min(0, buyConditions.priceDropThreshold)
            );
            console.log(
              "📉 가격 하락률 정규화:",
              buyConditions.priceDropThreshold,
              "%"
            );
          }

          // RSI 과매도 범위 검증
          if (buyConditions.rsiOversold !== undefined) {
            buyConditions.rsiOversold = Math.max(
              10,
              Math.min(50, buyConditions.rsiOversold)
            );
            console.log("📈 RSI 과매도 정규화:", buyConditions.rsiOversold);
          }
        }

        // 🔥 ENHANCED: 매도 조건 검증 및 정규화
        if (updated.tradingConditions?.sellConditions) {
          const sellConditions = updated.tradingConditions.sellConditions;

          // 수익 목표 순서 검증
          if (
            sellConditions.profitTarget1 &&
            sellConditions.profitTarget2 &&
            sellConditions.profitTarget3
          ) {
            if (sellConditions.profitTarget1 >= sellConditions.profitTarget2) {
              sellConditions.profitTarget2 = sellConditions.profitTarget1 + 2;
            }
            if (sellConditions.profitTarget2 >= sellConditions.profitTarget3) {
              sellConditions.profitTarget3 = sellConditions.profitTarget2 + 3;
            }
            console.log(
              "🎯 수익 목표 순서 정규화:",
              sellConditions.profitTarget1,
              "%→",
              sellConditions.profitTarget2,
              "%→",
              sellConditions.profitTarget3,
              "%"
            );
          }

          // 손절매 범위 검증
          if (sellConditions.stopLoss !== undefined) {
            sellConditions.stopLoss = Math.max(
              -30,
              Math.min(0, sellConditions.stopLoss)
            );
            console.log("⛔ 손절매 정규화:", sellConditions.stopLoss, "%");
          }
        }

        // 🔥 ENHANCED: 신호 생성기 설정 업데이트
        try {
          if (signalGenerator && signalGenerator.updateSettings) {
            signalGenerator.updateSettings(updated);
            console.log("✅ 신호 생성기 설정 업데이트 완료");
          }
        } catch (error) {
          console.warn("⚠️ 신호 생성기 설정 업데이트 실패:", error);
        }

        // 🔥 ENHANCED: 페이퍼 트레이딩 엔진 설정 업데이트
        try {
          if (paperTradingEngine && paperTradingEngine.updateSettings) {
            paperTradingEngine.updateSettings(updated);
            console.log("✅ 페이퍼 트레이딩 엔진 설정 업데이트 완료");
          }
        } catch (error) {
          console.warn("⚠️ 페이퍼 트레이딩 엔진 설정 업데이트 실패:", error);
        }

        // 🔥 ENHANCED: 동적 포지션 관리 설정 업데이트
        if (updated.dynamicPosition) {
          setDynamicPositionEnabled(updated.dynamicPosition.enabled);
          try {
            paperTradingEngine.setDynamicPositionEnabled?.(
              updated.dynamicPosition.enabled
            );
            console.log(
              "🎯 동적 포지션 관리 설정:",
              updated.dynamicPosition.enabled ? "활성화" : "비활성화"
            );
          } catch (error) {
            console.warn("⚠️ 동적 포지션 관리 설정 업데이트 실패:", error);
          }
        }

        // 🔥 ENHANCED: 글로벌 스토어 업데이트
        try {
          updateGlobalTradingSettings(updated);
          console.log("🌐 글로벌 거래 설정 업데이트 완료");
        } catch (error) {
          console.warn("⚠️ 글로벌 설정 업데이트 실패:", error);
        }

        console.log("✅ 거래 설정 업데이트 완료:", {
          minBuyScore: updated.tradingConditions?.buyConditions?.minBuyScore,
          priceDropThreshold:
            updated.tradingConditions?.buyConditions?.priceDropThreshold,
          profitTargets: [
            updated.tradingConditions?.sellConditions?.profitTarget1,
            updated.tradingConditions?.sellConditions?.profitTarget2,
            updated.tradingConditions?.sellConditions?.profitTarget3,
          ],
          stopLoss: updated.tradingConditions?.sellConditions?.stopLoss,
          dynamicEnabled: updated.dynamicPosition?.enabled,
        });

        addLog(
          `✅ 거래 설정 업데이트 완료 - 매수점수: ${updated.tradingConditions?.buyConditions?.minBuyScore || "기본값"}, 동적관리: ${updated.dynamicPosition?.enabled ? "ON" : "OFF"}`,
          "success"
        );

        return updated;
      });
    },
    [
      customCapital,
      addLog,
      setDynamicPositionEnabled,
      updateGlobalTradingSettings,
    ]
  );

  // 🔥 NEW: 거래 설정 디버깅 함수
  const debugTradingSettings = useCallback(() => {
    console.log("🔍=== 거래 설정 디버깅 시작 ===");
    console.log("현재 tradingSettings:", tradingSettings);
    console.log("tradingSettingsRef.current:", tradingSettingsRef.current);

    const buyConditions = tradingSettings.tradingConditions?.buyConditions;
    const sellConditions = tradingSettings.tradingConditions?.sellConditions;

    console.log("📊 매수 조건:", {
      minBuyScore: buyConditions?.minBuyScore,
      priceDropThreshold: buyConditions?.priceDropThreshold,
      rsiOversold: buyConditions?.rsiOversold,
      volumeThreshold: buyConditions?.volumeThreshold,
    });

    console.log("🎯 매도 조건:", {
      profitTarget1: sellConditions?.profitTarget1,
      profitTarget2: sellConditions?.profitTarget2,
      profitTarget3: sellConditions?.profitTarget3,
      stopLoss: sellConditions?.stopLoss,
      rsiOverbought: sellConditions?.rsiOverbought,
    });

    console.log("🎛️ 시스템 상태:", {
      testMode: testMode,
      dynamicPositionEnabled: dynamicPositionEnabled,
      isActive: isActive,
      marketCondition: marketCondition?.overallBuyScore,
    });

    // 페이퍼 트레이딩 엔진 설정 확인
    const engineSettings = paperTradingEngine.getCurrentSettings?.();
    console.log("🔧 엔진 설정:", engineSettings);

    addLog(
      `🔍 설정 디버깅: 매수점수=${buyConditions?.minBuyScore}, 하락률=${buyConditions?.priceDropThreshold}%, RSI=${buyConditions?.rsiOversold}, 수익목표=[${sellConditions?.profitTarget1}%,${sellConditions?.profitTarget2}%,${sellConditions?.profitTarget3}%], 손절=${sellConditions?.stopLoss}%`,
      "debug"
    );

    console.log("🔍=== 거래 설정 디버깅 완료 ===");
  }, [
    tradingSettings,
    testMode,
    dynamicPositionEnabled,
    isActive,
    marketCondition,
    addLog,
  ]);

  // toggleTestMode 함수 수정
  const toggleTestMode = useCallback(() => {
    if (isActiveRef.current) {
      addLog("거래 중에는 모드를 변경할 수 없습니다", "warning");
      return;
    }

    setTestMode((prev) => {
      const newTestMode = !prev;

      // 🔥 테스트 모드일 때 자동 중지 비활성화
      setAutoStopDisabled(newTestMode);

      setTradingSettings(getInitialSettings());

      const modeText = newTestMode
        ? "테스트 모드 활성화: 완화된 조건, 더 많은 거래 기회, 자동 중지 비활성화"
        : "실전 모드 활성화: 엄격한 조건, 신중한 거래, 자동 중지 활성화";

      addLog(modeText, "info");
      return newTestMode;
    });
  }, [addLog, getInitialSettings]);

  const toggleDynamicPositionManagement = useCallback(() => {
    if (isActiveRef.current) {
      addLog(
        "거래 중에는 동적 포지션 관리 모드를 변경할 수 없습니다",
        "warning"
      );
      return;
    }

    setDynamicPositionEnabled((prev) => {
      const newEnabled = !prev;
      const modeText = newEnabled
        ? "동적 포지션 관리 활성화: 적응적 포지션 크기 및 리밸런싱"
        : "고정 포지션 관리 활성화: 전통적인 고정 크기 포지션";

      addLog(modeText, "info");
      return newEnabled;
    });
  }, [addLog]);

  const generateOptimizationPlan = useCallback(async () => {
    if (!dynamicPositionEnabled || !portfolio || !mountedRef.current)
      return null;

    try {
      addLog("📋 포지션 최적화 계획 생성 중...", "info");
      const plan = await paperTradingEngine.generateOptimizationPlan(signals);

      if (plan && mountedRef.current) {
        setOptimizationPlan(plan);
        addLog(
          `📋 최적화 계획 생성 완료: ${plan.actions?.length || 0}개 액션`,
          "success"
        );
      }

      return plan;
    } catch (error) {
      addLog(`최적화 계획 생성 실패: ${error.message}`, "error");
      return null;
    }
  }, [dynamicPositionEnabled, portfolio, signals, addLog]);

  const executeOptimizationPlan = useCallback(
    async (plan = null) => {
      const targetPlan = plan || optimizationPlan;
      if (!targetPlan || !mountedRef.current) {
        addLog("실행할 최적화 계획이 없습니다", "warning");
        return false;
      }

      try {
        addLog(
          `🚀 최적화 계획 실행: ${targetPlan.actions?.length || 0}개 액션`,
          "info"
        );

        const result =
          await paperTradingEngine.executeOptimizationPlan(targetPlan);

        if (result.executed && mountedRef.current) {
          addLog(
            `✅ 최적화 계획 실행 완료: ${result.results?.filter((r) => r.success).length || 0}개 성공`,
            "success"
          );

          setTimeout(() => {
            if (mountedRef.current) {
              updatePortfolio(true);
              updatePositionAnalysis();
              updateRiskAssessment();
            }
          }, 2000);

          return true;
        } else {
          addLog(`❌ 최적화 계획 실행 실패`, "error");
          return false;
        }
      } catch (error) {
        addLog(`💥 최적화 계획 실행 오류: ${error.message}`, "error");
        return false;
      }
    },
    [
      optimizationPlan,
      addLog,
      updatePortfolio,
      updatePositionAnalysis,
      updateRiskAssessment,
    ]
  );

  const changeMarket = useCallback(
    async (newMarket) => {
      if (isActive) {
        alert("거래 중에는 마켓을 변경할 수 없습니다.");
        return false;
      }

      if (newMarket === selectedMarket) return true;

      try {
        addLog(`🔄 마켓 변경: ${selectedMarket} → ${newMarket}`, "info");
        upbitMarketService.setMarketType(newMarket);
        setSelectedMarket(newMarket);
        setMarketData(new Map());
        setCurrentSelectedCoins([]);
        setFavoriteCoins([]);
        clearSignals();

        if (systemInitializedRef.current) {
          systemInitializedRef.current = false;
          await initializeCentralSystem();
        }

        addLog(`✅ ${newMarket} 마켓으로 변경 완료`, "success");
        return true;
      } catch (error) {
        addLog(`마켓 변경 실패: ${error.message}`, "error");
        return false;
      }
    },
    [selectedMarket, isActive, addLog, initializeCentralSystem, clearSignals]
  );

  // ✅ useEffect들 (중앙 데이터 업데이트 처리, Store 동기화 등)
  useEffect(() => {
    if (!handleCentralDataUpdate || !processMarketDataUpdate) return;

    const enhancedHandler = (data) => {
      if (!mountedRef.current) return null;

      try {
        const dataMap = handleCentralDataUpdate(data);
        if (dataMap) {
          processMarketDataUpdate(dataMap);
        }
        return dataMap;
      } catch (error) {
        console.warn("중앙 데이터 업데이트 처리 실패:", error);
        return null;
      }
    };
  }, [handleCentralDataUpdate, processMarketDataUpdate]);

  useEffect(() => {
    if (!isStoreInitialized || !mountedRef.current) return;

    const timeoutId = setTimeout(() => {
      if (!mountedRef.current) return;

      const isSame =
        favoriteCoins.length === storeSelectedCoins.length &&
        favoriteCoins.every((fc) =>
          storeSelectedCoins.find((sc) => sc.market === fc.market)
        );

      if (storeSelectedCoins.length > 0 && !isSame) {
        const newFavoriteCoins = storeSelectedCoins.map((coin) => ({
          ...coin,
          isTopCoin: false,
        }));
        setFavoriteCoins(newFavoriteCoins);
        addLog(`관심코인 동기화됨: ${storeSelectedCoins.length}개`, "info");
      } else if (storeSelectedCoins.length === 0 && favoriteCoins.length > 0) {
        setFavoriteCoins([]);
        addLog("관심코인 목록이 초기화됨", "info");
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [storeSelectedCoins, favoriteCoins.length, isStoreInitialized, addLog]);

  useEffect(() => {
    if (!isStoreInitialized || !mountedRef.current) return;

    const timeoutId = setTimeout(() => {
      if (!mountedRef.current) return;

      if (tradingMode === "favorites") {
        setCurrentSelectedCoins(favoriteCoins);
        if (favoriteCoins.length > 0) {
          addLog(`🎯 관심코인 모드로 전환: ${favoriteCoins.length}개`, "info");
        }
      } else if (tradingMode === "top") {
        setCurrentSelectedCoins(topCoins);
        if (topCoins.length > 0) {
          addLog(`🏆 상위코인 모드로 전환: ${topCoins.length}개`, "info");
        }
      }
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [tradingMode, favoriteCoins, topCoins, addLog, isStoreInitialized]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        setTradingSettings(getInitialSettings());
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [testMode, dynamicPositionEnabled, getInitialSettings]);

  useEffect(() => {
    if (
      tradingMode === "top" &&
      topCoins.length === 0 &&
      isStoreInitialized &&
      mountedRef.current
    ) {
      const timeoutId = setTimeout(() => {
        if (mountedRef.current) {
          updateTopCoinsUI();
        }
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [tradingMode, topCoins.length, updateTopCoinsUI, isStoreInitialized]);

  useEffect(() => {
    const initializeOnMount = async () => {
      if (!mountedRef.current) return;

      if (!isStoreInitialized) {
        await initializeStore();
      }

      const currentStoreCoins = useCoinStore.getState().selectedCoins;
      if (currentStoreCoins.length > 0 && mountedRef.current) {
        const formattedCoins = currentStoreCoins.map((coin) => ({
          ...coin,
          isTopCoin: false,
        }));
        setFavoriteCoins(formattedCoins);
        setCurrentSelectedCoins(formattedCoins);
        addLog(
          `마운트 시 관심코인 ${currentStoreCoins.length}개 동기화`,
          "info"
        );
      }

      addLog("🚀 CryptoWise 페이퍼 트레이딩 시스템 로드됨", "info");
    };

    initializeOnMount();
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    cleanupRef.current = false;

    return () => {
      console.log("🧹 컴포넌트 언마운트 - 리소스 정리");
      mountedRef.current = false;
      isActiveRef.current = false;
      cleanupAllResources();
    };
  }, [cleanupAllResources]);

  // ✅ 완전한 반환 객체
  return {
    // 핵심 상태
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

    // 코인 관련 상태
    favoriteCoins,
    topCoins,
    currentSelectedCoins,
    selectedCoins: currentSelectedCoins,

    // 마켓 관련 상태
    selectedMarket,
    availableMarkets,

    // 시스템 상태
    centralDataReady,
    signalGeneratorReady,
    systemReady,

    // 동적 포지션 관리 상태
    dynamicPositionEnabled,
    optimizationPlan,
    positionAnalysis,
    riskAssessment,
    cashOptimization,

    // 설정
    tradingMode,
    setTradingMode,
    topCoinsLimit,
    setTopCoinsLimit,
    tradingSettings,
    setTradingSettings: handleSettingsChange,
    testMode,
    operationMode,
    setOperationMode,

    autoStopDisabled,
    setAutoStopDisabled,

    // 핵심 액션 함수들
    updatePortfolio,
    startPaperTrading,
    stopPaperTrading,
    addLog,
    toggleTestMode,
    refreshMarketCondition: updateMarketCondition,
    fetchMarketSentiment,
    updateTopCoinsUI,

    // 동적 포지션 관리 액션
    toggleDynamicPositionManagement,
    generateOptimizationPlan,
    executeOptimizationPlan,
    updatePositionAnalysis,
    updateRiskAssessment,
    updateCashOptimization,

    // 마켓 변경 액션
    changeMarket,

    // 관심코인 관리
    addFavoriteCoin,
    removeFavoriteCoin,
    setFavoriteCoins,

    // Store 관리
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

    // 통계 정보
    tradingStats: {
      mode: testMode ? "TEST" : "LIVE",
      positionManagement: dynamicPositionEnabled ? "DYNAMIC" : "FIXED",
      selectedMarket: selectedMarket,
      marketService: upbitMarketService.getServiceStats?.() || {},
      webSocketService: upbitWebSocketService.getStats?.() || {},
      tradingEngine: paperTradingEngine.getCurrentSettings?.() || {},
      centralSystem: {
        dataReady: centralDataReady,
        signalGeneratorReady: signalGeneratorReady,
        performance: signalGenerator.getPerformanceStats?.() || {},
      },
      dynamicManagement: {
        enabled: dynamicPositionEnabled,
        hasOptimizationPlan: !!optimizationPlan,
        hasPositionAnalysis: !!positionAnalysis,
        hasRiskAssessment: !!riskAssessment,
        lastOptimization: optimizationPlan?.timestamp,
      },
    },
  };
};

export default usePaperTrading;
