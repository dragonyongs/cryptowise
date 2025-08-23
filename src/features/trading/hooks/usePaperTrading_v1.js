// src/features/trading/hooks/usePaperTrading.js - 동적 포지션 관리 통합 완전 버전

import { useState, useEffect, useCallback, useRef } from "react";
import { useCoinStore } from "../../../stores/coinStore.js";
import { usePortfolioStore } from "../../../stores/portfolioStore.js";
import hybridSignalGenerator from "../../../services/analysis/hybridSignalGenerator.js";

// 기존 서비스들 유지
import { paperTradingEngine } from "../../../services/testing/paperTradingEngine.js";
import { upbitMarketService } from "../../../services/upbit/upbitMarketService.js";
import { upbitWebSocketService } from "../../../services/upbit/upbitWebSocket.js";
import { marketAnalysisService } from "../../../services/analysis/marketAnalysis.js";

// 중앙 데이터 매니저
import { centralDataManager } from "../../../services/data/centralDataManager.js";
import {
  signalGenerator,
  initializeSignalGenerator,
} from "../../../services/analysis/signalGenerator.js";

// 🎯 NEW: 동적 포지션 관리 서비스들 추가
import { dynamicPositionManager } from "../../../services/portfolio/dynamicPositionManager.js";
import { positionSizing } from "../../../services/portfolio/positionSizing.js";
import { cashManagement } from "../../../services/portfolio/cashManagement.js";

// 기존 훅들 유지
import { useTradingLogger } from "./useTradingLogger.js";
import { usePortfolioManager } from "../../portfoilo/hooks/usePortfolioManager.js";
import { useMarketSentiment } from "../../market/hooks/useMarketSentiment.js";
import { useTradingStore } from "../../../stores/tradingStore.js";

import { usePortfolioConfig } from "../../../config/portfolioConfig.js";

export const usePaperTrading = (
  userId = "demo-user",
  externalSettings = null
) => {
  // ✅ Store 연결 (기존 코드 위에 추가)
  const { updatePortfolio: updatePortfolioStore } = usePortfolioStore();

  // 🎯 초기 자본 관리
  const [customCapital, setCustomCapital] = useState(
    externalSettings?.initialCapital || null
  );
  const { initialCapital } = usePortfolioConfig(customCapital);
  // ✅ 기존 상태들 모두 유지
  const [isStoreInitialized, setIsStoreInitialized] = useState(false);
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

  // 훅 내부에서
  const { updateTradingSettings: updateGlobalTradingSettings } =
    useTradingStore();

  const [favoriteCoins, setFavoriteCoins] = useState([]);
  const [topCoins, setTopCoins] = useState([]);
  const [currentSelectedCoins, setCurrentSelectedCoins] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [lastSignal, setLastSignal] = useState(null);
  const [marketData, setMarketData] = useState(new Map());
  const [marketCondition, setMarketCondition] = useState(null);
  const [tradingMode, setTradingMode] = useState("favorites");
  const [topCoinsLimit, setTopCoinsLimit] = useState(10);
  const [testMode, setTestMode] = useState(true);
  const [operationMode, setOperationMode] = useState("centralized");
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [signals, setSignals] = useState([]);
  const [selectedMarket, setSelectedMarket] = useState("KRW");
  const [availableMarkets] = useState(["KRW", "BTC", "USDT"]);

  // 🎯 NEW: 동적 포지션 관리 관련 상태
  const [dynamicPositionEnabled, setDynamicPositionEnabled] = useState(true);
  const [optimizationPlan, setOptimizationPlan] = useState(null);
  const [positionAnalysis, setPositionAnalysis] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [cashOptimization, setCashOptimization] = useState(null);

  // 🎯 페이퍼 트레이딩 엔진 초기화 시 사용
  useEffect(() => {
    paperTradingEngine.resetPortfolio(initialCapital);
  }, [initialCapital]);

  // 기존 설정 관리 (동적 포지션 관리 설정 추가)
  const getInitialSettings = useCallback(() => {
    const baseSettings = {
      portfolioAllocation: {
        cash: 0.4,
        t1: 0.42,
        t2: 0.15,
        t3: 0.03,
      },
      tradingConditions: {
        buyConditions: {
          // 🎯 더 관대한 기본값으로 설정
          minBuyScore: testMode ? 5.5 : 7.0, // ← 5.5로 변경
          rsiOversold: testMode ? 40 : 30,
          strongBuyScore: testMode ? 7.5 : 9.0,
          buyThreshold: testMode ? -1.0 : -2.0,
          requireMultipleSignals: !testMode, // 테스트모드에서는 단일신호도 허용
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
          maxCoinsToTrade: testMode ? 8 : 4, // 테스트모드에서 더 많은 코인 허용
          reserveCashRatio: 0.25,
          maxSinglePosition: 15,
          dailyTradeLimit: testMode ? 15 : 6,
          volumeThreshold: 1.2, // 볼륨 조건 완화
        },
      },
      strategy: testMode ? "test_mode" : "live_mode",
      testMode: testMode,
      dynamicPosition: {
        enabled: dynamicPositionEnabled,
        adaptiveSizing: true,
        cashManagement: true,
        positionOptimization: true,
        riskBasedAdjustment: true,
      },
    };

    // 🎯 externalSettings 우선 적용
    if (externalSettings) {
      const merged = {
        ...baseSettings,
        ...externalSettings,
        tradingConditions: {
          ...baseSettings.tradingConditions,
          buyConditions: {
            ...baseSettings.tradingConditions.buyConditions,
            ...(externalSettings.tradingConditions?.buyConditions || {}),
          },
          sellConditions: {
            ...baseSettings.tradingConditions.sellConditions,
            ...(externalSettings.tradingConditions?.sellConditions || {}),
          },
          riskManagement: {
            ...baseSettings.tradingConditions.riskManagement,
            ...(externalSettings.tradingConditions?.riskManagement || {}),
          },
        },
        dynamicPosition: {
          ...baseSettings.dynamicPosition,
          ...(externalSettings.dynamicPosition || {}),
        },
      };

      console.log("🔧 externalSettings 적용된 설정:", merged);
      return merged;
    }

    return baseSettings;
  }, [testMode, externalSettings, dynamicPositionEnabled]);

  const [tradingSettings, setTradingSettings] = useState(() =>
    getInitialSettings()
  );

  // 기존 Refs 모두 유지
  const isActiveRef = useRef(isActive);
  const currentSelectedCoinsRef = useRef(currentSelectedCoins);
  const tradingSettingsRef = useRef(tradingSettings);
  const testModeRef = useRef(testMode);
  const tradingModeRef = useRef(tradingMode);
  const centralDataSubscription = useRef(null);
  const isSystemInitialized = useRef(false);
  const portfolioIntervalRef = useRef(null);
  const marketAnalysisIntervalRef = useRef(null);
  const subscriptionIdRef = useRef(null);
  const topCoinsUpdateIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // 🎯 NEW: 동적 포지션 관리 관련 refs
  const optimizationIntervalRef = useRef(null);
  const riskCheckIntervalRef = useRef(null);

  // 기존 Refs 동기화 로직 모두 유지
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

  // 기존 로거 및 관련 훅들 모두 유지
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

  const {
    portfolio,
    updatePortfolio: syncPortfolio,
    isLoading,
  } = usePortfolioManager(marketData, addLog);

  // ✅ 포트폴리오 업데이트 함수만 수정 (기존 로직 + Store 동기화)
  const updatePortfolio = useCallback(
    async (forceUpdate = false) => {
      try {
        // 1. 기존 방식으로 Backend/Engine에서 데이터 가져오기
        const rawPortfolio = await syncPortfolio(forceUpdate);

        if (rawPortfolio) {
          // 2. Store에 데이터 업데이트 (모든 컴포넌트가 자동으로 리렌더링)
          updatePortfolioStore(rawPortfolio, rawPortfolio.totalValue);

          addLog("📊 포트폴리오 Store 동기화 완료", "success");
        }
      } catch (error) {
        addLog(`❌ 포트폴리오 업데이트 실패: ${error.message}`, "error");
      }
    },
    [syncPortfolio, updatePortfolioStore, addLog]
  );

  const { marketSentiment, sentimentLoading, fetchMarketSentiment } =
    useMarketSentiment(addLog, isActive);

  // 🎯 NEW: 동적 포지션 관리 초기화
  const initializeDynamicPositionManagement = useCallback(async () => {
    if (!dynamicPositionEnabled) {
      addLog("동적 포지션 관리가 비활성화됨", "info");
      return true;
    }

    try {
      addLog("🎯 동적 포지션 관리 시스템 초기화", "info");

      // 페이퍼 트레이딩 엔진에 동적 관리 활성화
      paperTradingEngine.setDynamicPositionEnabled(true);

      // 시장 상황 업데이트
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

  // 기존 중앙 시스템 초기화 (동적 관리 추가)
  const initializeCentralSystem = useCallback(async () => {
    if (isSystemInitialized.current) {
      addLog("🔄 중앙 시스템 이미 초기화됨", "info");
      return true;
    }

    try {
      addLog("🚀 중앙 데이터 매니저 초기화 시작", "info");

      const initialCoins =
        currentSelectedCoins.length > 0
          ? currentSelectedCoins.map((c) => c.symbol)
          : ["BTC", "ETH"];

      await centralDataManager.initialize(initialCoins);
      setCentralDataReady(true);

      await initializeSignalGenerator(centralDataManager);
      signalGenerator.setTestMode(testModeRef.current);
      setSignalGeneratorReady(true);

      centralDataSubscription.current = centralDataManager.subscribe(
        "paperTrading",
        (data) => {
          handleCentralDataUpdate(data);
        },
        ["prices", "markets"]
      );

      // 🎯 동적 포지션 관리 초기화 추가
      await initializeDynamicPositionManagement();

      isSystemInitialized.current = true;
      addLog("✅ 중앙 시스템 초기화 완료", "success");
      return true;
    } catch (error) {
      addLog(`❌ 중앙 시스템 초기화 실패: ${error.message}`, "error");
      return false;
    }
  }, [currentSelectedCoins, addLog, initializeDynamicPositionManagement]);

  // 🎯 중앙 데이터 업데이트 핸들러 (여기서 이어서)
  const handleCentralDataUpdate = useCallback(
    (data) => {
      try {
        if (data.prices) {
          const dataMap = new Map();
          Object.entries(data.prices).forEach(([symbol, priceEntry]) => {
            if (priceEntry && priceEntry.data) {
              dataMap.set(symbol, priceEntry.data);
            }
          });
          setMarketData(dataMap);

          updateStats((prev) => ({
            ...prev,
            dataReceived: prev.dataReceived + dataMap.size,
            lastActivity: new Date().toLocaleTimeString(),
          }));

          // 🎯 실시간 신호 생성 (활성 상태일 때만)
          if (isActiveRef.current && dataMap.size > 0) {
            generateSignalsFromCachedData(Array.from(dataMap.keys()));
          }

          setConnectionStatus("connected");
        }
      } catch (error) {
        addLog(`중앙 데이터 처리 실패: ${error.message}`, "error");
        setConnectionStatus("error");
      }
    },
    [addLog, updateStats]
  );

  // 🎯 캐시된 데이터 기반 신호 생성
  const generateSignalsFromCachedData = useCallback(
    async (symbolList) => {
      if (!signalGeneratorReady || !isActiveRef.current) return;

      try {
        addLog(`🎯 캐시 기반 신호 생성: ${symbolList.length}개 코인`, "debug");

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
            return [...processedSignals, ...prev].slice(0, 50);
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

  // 🎯 신호 기반 거래 처리 (동적 포지션 관리 포함)
  const processSignalForTrading = useCallback(
    async (signal) => {
      try {
        const currentMarketData = marketData.get(signal.symbol);
        if (!currentMarketData) {
          addLog(`❌ [${signal.symbol}] 시장 데이터 없음`, "warning");
          return false;
        }

        const adjustedScore = Math.max(signal.totalScore, 6.0);
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

        // 🎯 동적 포지션 관리가 활성화된 경우 추가 검증
        if (dynamicPositionEnabled) {
          const portfolioState = {
            totalValue: portfolio?.totalValue || 0,
            totalCash: portfolio?.krw || 0,
            availableCash: portfolio?.krw || 0,
            positions: portfolio?.positions || [],
            cashRatio: (portfolio?.cashRatio || 100) / 100,
          };

          // 진입 가능성 체크
          if (signal.type === "BUY") {
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
            } else {
              addLog(
                `📊 [${signal.symbol}] 동적 진입 승인: ${entryCheck.reason}`,
                "success"
              );
            }
          }
        }

        const result = await paperTradingEngine.executeSignal(enhancedSignal);

        if (result?.executed) {
          addLog(
            `✅ [${signal.symbol}] 거래 성공: ${signal.type} ₩${enhancedSignal.price.toLocaleString()}`,
            "success"
          );

          // 🎯 동적 포지션 관리 - 포트폴리오 분석 업데이트
          if (dynamicPositionEnabled) {
            setTimeout(() => {
              updatePositionAnalysis();
              updateRiskAssessment();
            }, 2000);
          }

          setTimeout(() => {
            if (isActiveRef.current) {
              updatePortfolio(true);
            }
          }, 1000);

          return true;
        } else {
          addLog(
            `❌ [${signal.symbol}] 거래 실패: ${result?.reason || "알 수 없는 원인"}`,
            "error"
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
    [addLog, updatePortfolio, marketData, dynamicPositionEnabled, portfolio]
  );

  // 🎯 NEW: 포지션 분석 업데이트
  const updatePositionAnalysis = useCallback(async () => {
    if (!dynamicPositionEnabled || !portfolio) return;

    try {
      const currentPositions = portfolio.positions || [];
      const signals = []; // 실제로는 최신 신호들을 가져와야 함

      const analysis = {
        totalPositions: currentPositions.length,
        profitablePositions: currentPositions.filter((p) => p.profitRate > 0)
          .length,
        lossPositions: currentPositions.filter((p) => p.profitRate < 0).length,
        averageProfit:
          currentPositions.length > 0
            ? currentPositions.reduce((sum, p) => sum + p.profitRate, 0) /
              currentPositions.length
            : 0,
        recommendations: [],
      };

      // 스왑 기회 확인
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

      setPositionAnalysis(analysis);
      addLog(
        `📊 포지션 분석 업데이트: ${analysis.totalPositions}개 포지션`,
        "debug"
      );
    } catch (error) {
      addLog(`포지션 분석 실패: ${error.message}`, "warning");
    }
  }, [dynamicPositionEnabled, portfolio, addLog]);

  // 🎯 NEW: 리스크 평가 업데이트
  const updateRiskAssessment = useCallback(async () => {
    if (!dynamicPositionEnabled || !portfolio) return;

    try {
      const portfolioHealth = {
        unrealizedLoss: portfolio.totalProfitRate || 0,
        winRate: portfolio.performance?.winRate || 0,
        recentPerformance: portfolio.totalProfitRate || 0,
      };

      const marketMetrics = {
        fearGreedIndex: 50, // 실제로는 API에서 가져와야 함
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

  // 🎯 NEW: 현금 최적화
  const updateCashOptimization = useCallback(async () => {
    if (!dynamicPositionEnabled || !portfolio) return;

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

  // 🎯 NEW: 최적화 계획 생성
  const generateOptimizationPlan = useCallback(async () => {
    if (!dynamicPositionEnabled || !portfolio) return null;

    try {
      addLog("📋 포지션 최적화 계획 생성 중...", "info");

      const plan = await paperTradingEngine.generateOptimizationPlan(signals);
      if (plan) {
        setOptimizationPlan(plan);
        addLog(
          `📋 최적화 계획 생성 완료: ${plan.actions.length}개 액션`,
          "success"
        );
      }

      return plan;
    } catch (error) {
      addLog(`최적화 계획 생성 실패: ${error.message}`, "error");
      return null;
    }
  }, [dynamicPositionEnabled, portfolio, signals, addLog]);

  // 🎯 NEW: 최적화 계획 실행
  const executeOptimizationPlan = useCallback(
    async (plan = null) => {
      const targetPlan = plan || optimizationPlan;
      if (!targetPlan) {
        addLog("실행할 최적화 계획이 없습니다", "warning");
        return false;
      }

      try {
        addLog(
          `🚀 최적화 계획 실행: ${targetPlan.actions.length}개 액션`,
          "info"
        );

        const result =
          await paperTradingEngine.executeOptimizationPlan(targetPlan);
        if (result.executed) {
          addLog(
            `✅ 최적화 계획 실행 완료: ${result.results.filter((r) => r.success).length}개 성공`,
            "success"
          );

          // 포트폴리오 업데이트
          setTimeout(() => {
            updatePortfolio(true);
            updatePositionAnalysis();
            updateRiskAssessment();
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
    [optimizationPlan, addLog, updatePortfolio]
  );

  // 기존 설정 업데이트 함수
  const handleSettingsChange = useCallback(
    (newSettings) => {
      console.log("🔧 거래 설정 업데이트 전:", tradingSettings);
      console.log("🔧 새로운 설정:", newSettings);

      // 초기 자본이 변경된 경우 처리
      if (
        newSettings.initialCapital &&
        newSettings.initialCapital !== customCapital
      ) {
        setCustomCapital(newSettings.initialCapital);

        // 페이퍼 트레이딩 엔진 리셋
        if (!isActiveRef.current) {
          paperTradingEngine.resetPortfolio(newSettings.initialCapital);
        }
      }

      setTradingSettings((prev) => {
        // 🎯 tradingStore 로직 통합
        const currentSettings = prev;
        const updated = { ...currentSettings, ...newSettings };

        // 🎯 설정 검증 (tradingStore.js에서 가져온 로직)
        if (updated.tradingConditions?.buyConditions) {
          // minBuyScore 범위 제한
          const minBuy = updated.tradingConditions.buyConditions.minBuyScore;
          if (minBuy !== undefined) {
            updated.tradingConditions.buyConditions.minBuyScore = Math.max(
              3.0,
              Math.min(10.0, minBuy)
            );
          }
        }

        // 🎯 신호 생성기에 설정 전달
        if (signalGenerator && signalGenerator.updateSettings) {
          signalGenerator.updateSettings(updated);
        }

        // 🎯 페이퍼 트레이딩 엔진에 설정 전달
        if (paperTradingEngine && paperTradingEngine.updateSettings) {
          paperTradingEngine.updateSettings(updated);
        }

        // 🎯 동적 포지션 관리 설정도 업데이트
        if (updated.dynamicPosition) {
          setDynamicPositionEnabled(updated.dynamicPosition.enabled);
          paperTradingEngine.setDynamicPositionEnabled?.(
            updated.dynamicPosition.enabled
          );
        }

        // 🎯 전역 설정 즉시 업데이트
        if (typeof window !== "undefined") {
          window.tradingStore = {
            getState: () => ({
              tradingSettings: updated,
            }),
          };
        }

        console.log("🔧 거래 설정 업데이트 후:", updated);

        // 🎯 설정 검증 로그
        addLog(
          `✅ 거래 설정 업데이트 완료 - minBuyScore: ${updated.tradingConditions?.buyConditions?.minBuyScore || updated.minBuyScore}`,
          "success"
        );

        return updated;
      });
    },
    [
      testMode,
      addLog,
      setDynamicPositionEnabled,
      signalGenerator,
      paperTradingEngine,
    ]
  );

  // 기존 마켓 변경 핸들러 유지
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
        setSignals([]);

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

  // ✅ 기존 모든 useEffect와 함수들 유지 (coinStore 동기화, 모드별 코인 동기화 등)
  useEffect(() => {
    if (!isStoreInitialized) return;

    const isSame =
      favoriteCoins.length === storeSelectedCoins.length &&
      favoriteCoins.every((fc) =>
        storeSelectedCoins.find((sc) => sc.market === fc.market)
      );

    if (storeSelectedCoins.length > 0 && !isSame) {
      setFavoriteCoins(
        storeSelectedCoins.map((coin) => ({ ...coin, isTopCoin: false }))
      );
      addLog(`관심코인 동기화됨: ${storeSelectedCoins.length}개`, "info");
    } else if (storeSelectedCoins.length === 0 && favoriteCoins.length > 0) {
      setFavoriteCoins([]);
      addLog("관심코인 목록이 초기화됨", "info");
    }
  }, [storeSelectedCoins, favoriteCoins, isStoreInitialized, addLog]);

  useEffect(() => {
    if (!isStoreInitialized) return;
    if (tradingMode === "favorites") {
      setCurrentSelectedCoins(favoriteCoins);
      addLog(`🎯 관심코인 모드로 전환: ${favoriteCoins.length}개`, "info");
    } else if (tradingMode === "top") {
      setCurrentSelectedCoins(topCoins);
      addLog(`🏆 상위코인 모드로 전환: ${topCoins.length}개`, "info");
    }
  }, [tradingMode, favoriteCoins, topCoins, addLog, isStoreInitialized]);

  // 기존 함수들 모두 유지 (isInvestableSymbol, updateTopCoinsUI, addFavoriteCoin, removeFavoriteCoin, updateMarketCondition 등)
  const isInvestableSymbol = useCallback((symbol) => {
    const stableCoins = ["USDT", "USDC", "BUSD", "DAI", "TUSD", "USDD"];
    const riskyCoins = ["LUNA", "UST", "LUNC", "USTC"];
    return (
      !stableCoins.some((stable) => symbol.toUpperCase().includes(stable)) &&
      !riskyCoins.some((risky) => symbol.toUpperCase().includes(risky))
    );
  }, []);

  const updateTopCoinsUI = useCallback(async () => {
    if (tradingModeRef.current !== "top") {
      addLog("상위코인 모드가 아니므로 업데이트 건너뜀", "info");
      return [];
    }

    try {
      addLog("🔄 상위 코인 업데이트 시작", "info", "top_coins_update");
      const topCoinsData = await upbitMarketService.getTopCoins(
        topCoinsLimit,
        testModeRef.current
      );

      if (!topCoinsData || topCoinsData.length === 0) {
        addLog("상위 코인 데이터 없음", "warning");
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
      return formattedCoins;
    } catch (error) {
      addLog(`상위 코인 업데이트 실패: ${error.message}`, "error");
      return [];
    }
  }, [topCoinsLimit, addLog, favoriteCoins, selectedMarket]);

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

  const updateMarketCondition = useCallback(async () => {
    if (!isActiveRef.current) return null;

    try {
      addLog("시장 조건 분석 중", "info", "market_analysis");
      const condition = await marketAnalysisService.analyzeMarketCondition();

      if (isActiveRef.current) {
        setMarketCondition(condition);

        // 🎯 동적 포지션 관리에 시장 조건 업데이트
        if (dynamicPositionEnabled) {
          paperTradingEngine.updateMarketCondition(condition);
        }

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
  }, [addLog, updateStats, dynamicPositionEnabled]);

  // 🎯 중앙화된 리소스 정리 함수 (동적 관리 인터벌 추가)
  const cleanupAllResources = useCallback(() => {
    console.log("🧹 모든 리소스 정리 시작...");
    isActiveRef.current = false;
    setIsActive(false);

    [
      portfolioIntervalRef,
      marketAnalysisIntervalRef,
      topCoinsUpdateIntervalRef,
      reconnectTimeoutRef,
      optimizationIntervalRef,
      riskCheckIntervalRef,
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

    if (centralDataSubscription.current) {
      centralDataSubscription.current();
      centralDataSubscription.current = null;
    }

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

    // 🎯 동적 관리 상태 초기화
    setOptimizationPlan(null);
    setPositionAnalysis(null);
    setRiskAssessment(null);
    setCashOptimization(null);

    console.log("✅ 모든 리소스 정리 완료");
  }, [signalGeneratorReady]);

  // 기존 Store 초기화 함수 유지
  const initializeStore = useCallback(async () => {
    if (isStoreInitialized) return;

    try {
      addLog("🚀 Store 초기화 시작 (명시적 호출)", "info");
      await initializeData(true);

      const currentSelectedCoins = useCoinStore.getState().selectedCoins;
      if (currentSelectedCoins.length > 0) {
        setFavoriteCoins(
          currentSelectedCoins.map((coin) => ({ ...coin, isTopCoin: false }))
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

  // 기존 컴포넌트 마운트 시 초기화 로직 유지
  useEffect(() => {
    const initializeOnMount = async () => {
      if (!isStoreInitialized) {
        await initializeStore();
      }
      const currentStoreCoins = useCoinStore.getState().selectedCoins;
      if (currentStoreCoins.length > 0) {
        setFavoriteCoins(
          currentStoreCoins.map((coin) => ({ ...coin, isTopCoin: false }))
        );
        addLog(
          `마운트 시 관심코인 ${currentStoreCoins.length}개 동기화`,
          "info"
        );
      }
    };
    initializeOnMount();
  }, [initializeStore, addLog]);

  // 🎯 중앙화된 페이퍼 트레이딩 시작 로직 (동적 관리 추가)
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

      const systemReady = await initializeCentralSystem();
      if (!systemReady) {
        throw new Error("중앙 시스템 초기화 실패");
      }

      setIsActive(true);
      isActiveRef.current = true;
      setSignals([]);
      resetStats();

      paperTradingEngine.setTestMode(testModeRef.current);
      paperTradingEngine.setActive(true);

      // 🎯 동적 포지션 관리 활성화
      if (dynamicPositionEnabled) {
        paperTradingEngine.setDynamicPositionEnabled(true);
        addLog("🎯 동적 포지션 관리 활성화", "success");
      }

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
        `${testModeRef.current ? "테스트" : "실전"} ${selectedMarket} ${dynamicPositionEnabled ? "동적" : "고정"} 포지션 관리 페이퍼 트레이딩 시작`,
        "success"
      );

      // 초기 분석 실행
      await Promise.all([updateMarketCondition(), fetchMarketSentiment()]);
      await updatePortfolio(true);

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

        // 🎯 동적 포지션 관리 주기적 업데이트
        if (dynamicPositionEnabled) {
          optimizationIntervalRef.current = setInterval(() => {
            if (isActiveRef.current) {
              updatePositionAnalysis();
              updateRiskAssessment();
              updateCashOptimization();
            }
          }, 120000); // 2분마다

          riskCheckIntervalRef.current = setInterval(() => {
            if (isActiveRef.current) {
              generateOptimizationPlan();
            }
          }, 300000); // 5분마다
        }
      }

      const modeText = testModeRef.current
        ? "테스트 모드: 완화된 조건으로 더 많은 거래 기회"
        : "실전 모드: 엄격한 조건으로 신중한 거래";
      addLog(modeText, "info");

      addLog(
        `거래 대상: ${tradingMode === "top" ? `상위 ${topCoinsLimit}개 코인` : `관심 코인 ${favoriteCoins.length}개`} (${selectedMarket} 마켓)`,
        "info"
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
  ]);

  // 기존 페이퍼 트레이딩 중지 로직 유지
  const stopPaperTrading = useCallback(() => {
    console.log(`🛑 ${selectedMarket} 페이퍼 트레이딩 중지 시작...`);
    setIsActive(false);
    isActiveRef.current = false;
    setConnectionStatus("disconnected");
    setSignals([]);
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
      `${testModeRef.current ? "테스트" : "실전"} ${selectedMarket} ${dynamicPositionEnabled ? "동적" : "고정"} 포지션 관리 페이퍼 트레이딩 완전 중지`,
      "warning"
    );
    console.log("✅ 페이퍼 트레이딩 중지 완료");
  }, [addLog, cleanupAllResources, selectedMarket, dynamicPositionEnabled]);

  // 기존 테스트 모드 토글 로직 유지
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

  // 🎯 NEW: 동적 포지션 관리 토글
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

  // 기존 설정 변경시 업데이트 로직 유지
  useEffect(() => {
    setTradingSettings(getInitialSettings());
  }, [testMode, getInitialSettings, dynamicPositionEnabled]);

  // 🎯 전역 설정 공유를 위한 useEffect 추가
  useEffect(() => {
    // 🎯 다음 틱에 실행하여 렌더링 충돌 방지
    const updateGlobalStore = () => {
      if (typeof window !== "undefined") {
        window.tradingStore = {
          getState: () => ({
            tradingSettings: tradingSettings,
          }),
        };
      }
    };

    // 즉시 실행하지 말고 다음 틱에 실행
    setTimeout(updateGlobalStore, 0);
  }, [tradingSettings]);

  useEffect(() => {
    if (tradingMode === "top" && topCoins.length === 0 && isStoreInitialized) {
      updateTopCoinsUI();
    }
  }, [tradingMode, topCoins.length, updateTopCoinsUI, isStoreInitialized]);

  // 기존 개발 모드 상태 모니터링 유지 (동적 관리 상태 추가)
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
        dynamicPositionEnabled,
        hasOptimizationPlan: !!optimizationPlan,
        hasPositionAnalysis: !!positionAnalysis,
        hasRiskAssessment: !!riskAssessment,
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
    dynamicPositionEnabled,
    optimizationPlan,
    positionAnalysis,
    riskAssessment,
  ]);

  // 기존 cleanup 로직 유지
  useEffect(() => {
    return () => {
      console.log("🧹 컴포넌트 언마운트 - 리소스 정리");
      isActiveRef.current = false;
      cleanupAllResources();
    };
  }, [cleanupAllResources]);

  // ✅ 완전한 반환 객체 (기존 + 동적 포지션 관리 기능 추가)
  return {
    // 기존 상태
    // portfolio,
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

    // 중앙 시스템 상태
    centralDataReady,
    signalGeneratorReady,
    systemReady: centralDataReady && signalGeneratorReady,

    // 🎯 NEW: 동적 포지션 관리 상태
    dynamicPositionEnabled,
    optimizationPlan,
    positionAnalysis,
    riskAssessment,
    cashOptimization,

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

    // 🎯 NEW: 동적 포지션 관리 액션
    toggleDynamicPositionManagement,
    generateOptimizationPlan,
    executeOptimizationPlan,
    updatePositionAnalysis,
    updateRiskAssessment,
    updateCashOptimization,

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

    // 기존 + 동적 관리 통계 정보
    tradingStats: {
      mode: testMode ? "TEST" : "LIVE",
      positionManagement: dynamicPositionEnabled ? "DYNAMIC" : "FIXED",
      selectedMarket: selectedMarket, // 선택된 마켓
      marketService: upbitMarketService.getServiceStats?.() || {}, // 마켓 서비스 통계
      webSocketService: upbitWebSocketService.getStats(),
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
