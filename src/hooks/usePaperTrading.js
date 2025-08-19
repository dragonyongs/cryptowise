// src/hooks/usePaperTrading.js - 웹소켓 단일 서비스 사용 버전

import { useState, useEffect, useCallback, useRef } from "react";
import { useCoinStore } from "../stores/coinStore.js";

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
  const selectedCoins = useCoinStore((s) => s.selectedCoins || []);
  const { setSelectedCoins } = useCoinStore();

  // ✅ 메인 상태들
  const [isActive, setIsActive] = useState(false);
  const [lastSignal, setLastSignal] = useState(null);
  const [marketData, setMarketData] = useState(new Map());
  const [marketCondition, setMarketCondition] = useState(null);
  const [tradingMode, setTradingMode] = useState("top"); // favorites | top
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
          // 테스트 모드 설정 (완화됨)
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
          // 실전 모드 설정 (엄격함)
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
  const selectedCoinsRef = useRef(selectedCoins);
  const tradingSettingsRef = useRef(tradingSettings);
  const testModeRef = useRef(testMode);

  // ✅ 리소스 관리를 위한 refs
  const portfolioIntervalRef = useRef(null);
  const marketAnalysisIntervalRef = useRef(null);
  const subscriptionIdRef = useRef(null);
  const topCoinsUpdateIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // ✅ 분리된 훅들 사용
  const { logs, monitoringStats, addLog, updateStats, resetStats } =
    useTradingLogger();
  const { portfolio, updatePortfolio, isLoading } = usePortfolioManager(
    marketData,
    addLog
  );
  const { marketSentiment, sentimentLoading, fetchMarketSentiment } =
    useMarketSentiment(addLog, isActive);

  // ✅ 투자 가능 코인 확인
  const isInvestableSymbol = useCallback((symbol) => {
    const stableCoins = ["USDT", "USDC", "BUSD", "DAI", "TUSD", "USDD"];
    const riskyCoins = ["LUNA", "UST", "LUNC", "USTC"];
    return (
      !stableCoins.some((stable) => symbol.toUpperCase().includes(stable)) &&
      !riskyCoins.some((risky) => symbol.toUpperCase().includes(risky))
    );
  }, []);

  // ✅ 상위 코인 UI 업데이트 함수 (안정화)
  const updateTopCoinsUI = useCallback(async () => {
    if (!isActiveRef.current || tradingMode !== "top") return;

    try {
      addLog("🔄 상위 코인 업데이트 시작...", "info");
      const maxCoins = testModeRef.current ? 15 : topCoinsLimit;
      const topCoins = await upbitMarketService.getTopCoins(
        maxCoins,
        testModeRef.current
      );

      if (!topCoins || topCoins.length === 0) {
        addLog("⚠️ 상위 코인 데이터를 가져올 수 없음", "warning");
        return [];
      }

      // ✅ 안전한 데이터 변환
      const formattedCoins = topCoins
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

      if (formattedCoins.length > 0) {
        setSelectedCoins(formattedCoins);
        addLog(
          `✅ 상위 코인 UI 업데이트 완료: ${formattedCoins.length}개 (${formattedCoins.map((c) => c.symbol).join(", ")})`,
          "success"
        );
      } else {
        addLog("⚠️ 유효한 상위 코인 데이터가 없음", "warning");
      }

      return formattedCoins;
    } catch (error) {
      addLog(`❌ 상위 코인 UI 업데이트 실패: ${error.message}`, "error");
      return [];
    }
  }, [
    isActive,
    tradingMode,
    testModeRef,
    topCoinsLimit,
    setSelectedCoins,
    addLog,
  ]);

  // ✅ 타겟 마켓 가져오기 (안정화)
  const getTargetMarkets = useCallback(async () => {
    try {
      const maxMarkets = testModeRef.current
        ? Math.min(topCoinsLimit * 1.5, 20)
        : Math.min(topCoinsLimit, 12);

      if (tradingMode === "favorites" && selectedCoinsRef.current.length > 0) {
        const favoriteMarkets = selectedCoinsRef.current
          .map((coin) => coin.market || `KRW-${coin.symbol}`)
          .filter((market) => isInvestableSymbol(market.replace("KRW-", "")))
          .slice(0, maxMarkets);

        addLog(`📌 관심 코인 모드: ${favoriteMarkets.length}개 선택`, "debug");
        return favoriteMarkets;
      }

      if (tradingMode === "top") {
        // ✅ 상위 코인 업데이트와 함께 마켓 반환
        const formattedCoins = await updateTopCoinsUI();
        const topMarkets = formattedCoins
          .map((coin) => coin.market)
          .filter(Boolean)
          .slice(0, maxMarkets);

        addLog(
          `🏆 상위 코인 모드: ${topMarkets.length}개 자동 선별 ${testModeRef.current ? "(테스트)" : "(실전)"}`,
          "info"
        );
        return topMarkets;
      }

      // 기본 fallback
      const fallbackMarkets = [
        "KRW-BTC",
        "KRW-ETH",
        "KRW-XRP",
        "KRW-ADA",
        "KRW-SOL",
      ].slice(0, Math.min(5, maxMarkets));

      addLog(
        `⚠️ 기본 모드: ${fallbackMarkets.length}개 기본 코인 사용`,
        "warning"
      );
      return fallbackMarkets;
    } catch (error) {
      addLog(`❌ 타겟 마켓 가져오기 실패: ${error.message}`, "error");
      return ["KRW-BTC", "KRW-ETH"]; // 최소 기본값
    }
  }, [
    tradingMode,
    topCoinsLimit,
    isInvestableSymbol,
    addLog,
    updateTopCoinsUI,
  ]);

  // ✅ 신호 생성 및 거래 실행 (상태 체크 문제 해결)
  const processMarketData = useCallback(
    async (data) => {
      // 🚫 운영환경에서는 디버그 로그 제거
      if (process.env.NODE_ENV === "development") {
        console.log(
          `🔥 [PROCESS-DEBUG] processMarketData 호출됨!`,
          data.symbol
        );
      }

      // ✅ isActiveRef만 체크 (React 상태 업데이트 타이밍 문제 해결)
      if (!isActiveRef.current) {
        if (process.env.NODE_ENV === "development") {
          console.log(
            `❌ [PROCESS-DEBUG] 활성 상태 체크 실패: isActiveRef=${isActiveRef.current}`
          );
        }
        return;
      }

      const symbol = data.symbol || data.code?.replace("KRW-", "");
      if (!symbol) {
        if (process.env.NODE_ENV === "development") {
          console.log(`❌ [PROCESS-DEBUG] 심볼 없음:`, data);
        }
        return;
      }

      try {
        if (process.env.NODE_ENV === "development") {
          console.log(`🎯 [PROCESS-DEBUG] ${symbol} 데이터 처리 시작`);
        }

        // ✅ 즉시 통계 업데이트 (로그 없이)
        updateStats((prev) => {
          const newStats = {
            ...prev,
            dataReceived: prev.dataReceived + 1,
            lastActivity: new Date().toLocaleTimeString(),
          };
          // 🚫 통계 업데이트 로그 제거 (너무 빈번)
          return newStats;
        });

        // 마켓 데이터 업데이트 (로그 없이)
        setMarketData((prev) => {
          const newMap = new Map(prev);
          newMap.set(symbol, data);
          // 🚫 마켓 데이터 저장 로그 제거 (너무 빈번)
          return newMap;
        });

        // 페이퍼 트레이딩 엔진에 가격 업데이트
        const price = data.trade_price || data.price;
        if (price) {
          paperTradingEngine.updateCoinPrice(symbol, price);
          // 🚫 가격 업데이트 로그 제거 (너무 빈번)
        }

        // ✅ 신호 생성 (로그 최소화)
        if (process.env.NODE_ENV === "development") {
          console.log(`🎯 [PROCESS-DEBUG] ${symbol} 신호 생성 시작...`);
          console.log(
            `📋 [PROCESS-DEBUG] 거래 설정:`,
            tradingSettingsRef.current
          );
        }

        const signals = await signalGenerator.generateSignalsWithSettings(
          [data],
          tradingSettingsRef.current
        );

        if (process.env.NODE_ENV === "development") {
          console.log(`📈 [PROCESS-DEBUG] ${symbol} 신호 생성 결과:`, {
            signalCount: signals?.length || 0,
            signals: signals?.map((s) => ({
              symbol: s.symbol,
              type: s.type,
              totalScore: s.totalScore,
              confidence: s.confidence,
            })),
          });
        }

        // ✅ 신호 평가 통계 업데이트
        updateStats((prev) => ({
          ...prev,
          signalsEvaluated: (prev.signalsEvaluated || 0) + 1,
        }));

        if (signals.length === 0) {
          if (process.env.NODE_ENV === "development") {
            console.log(`❌ [PROCESS-DEBUG] ${symbol} 신호 없음 - 조건 미달`);
          }

          updateStats((prev) => ({
            ...prev,
            signalsRejected: prev.signalsRejected + 1,
          }));

          return;
        }

        const signal = signals[0];
        setLastSignal(signal);

        if (process.env.NODE_ENV === "development") {
          console.log(`✅ [PROCESS-DEBUG] ${symbol} 최적 신호 선택:`, {
            type: signal.type,
            totalScore: signal.totalScore,
            price: signal.price,
            confidence: signal.confidence,
          });
        }

        // ✅ 신호 생성 통계 업데이트
        updateStats((prev) => ({
          ...prev,
          signalsGenerated: prev.signalsGenerated + 1,
        }));

        // ✅ 중요한 신호만 로그 (스로틀링 적용)
        addLog(
          `🎯 ${symbol} ${signal.type} 신호 생성! 점수: ${signal.totalScore?.toFixed(1)}`,
          "success",
          `signal_${symbol}_${signal.type}`, // 스로틀링 키 추가
          { symbol, type: signal.type, score: signal.totalScore }
        );

        // ✅ 거래 실행
        if (process.env.NODE_ENV === "development") {
          console.log(`💰 [PROCESS-DEBUG] ${symbol} 거래 실행 시도...`);
        }

        const result = await paperTradingEngine.executeSignal(signal);

        if (process.env.NODE_ENV === "development") {
          console.log(`📊 [PROCESS-DEBUG] ${symbol} 거래 실행 결과:`, result);
        }

        if (result?.executed) {
          // ✅ 성공한 거래만 로그 (중요!)
          addLog(
            `🎉 ${signal.symbol} ${signal.type} 거래 성공! ₩${signal.price.toLocaleString()}`,
            "success",
            null, // 거래 성공은 스로틀링 없이
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

          if (process.env.NODE_ENV === "development") {
            console.log(`❌ [PROCESS-DEBUG] ${symbol} 거래 거부:`, {
              reason: rejectionReason,
              signal: {
                type: signal.type,
                totalScore: signal.totalScore,
                price: signal.price,
              },
              result: result,
            });
          }

          // ✅ 거래 거부는 스로틀링으로 줄이기
          addLog(
            `❌ ${signal.symbol} ${signal.type} 거래 거부: ${rejectionReason}`,
            "warning",
            `rejection_${symbol}_${rejectionReason}`, // 스로틀링 키 추가
            { symbol: signal.symbol, reason: rejectionReason }
          );

          updateStats((prev) => ({
            ...prev,
            signalsRejected: prev.signalsRejected + 1,
          }));
        }
      } catch (error) {
        console.error(`💥 [PROCESS-DEBUG] ${symbol} 처리 중 오류:`, error);

        if (isActiveRef.current) {
          // ✅ 에러는 항상 로그 (중요!)
          addLog(
            `❌ ${symbol} 처리 중 오류: ${error.message}`,
            "error",
            null, // 에러는 스로틀링 없이
            { symbol, error: error.message }
          );

          updateStats((prev) => ({
            ...prev,
            processingErrors: (prev.processingErrors || 0) + 1,
          }));
        }
      }
    },
    [addLog, updateStats, updatePortfolio, testModeRef]
  );

  // ✅ 시장 조건 분석
  const updateMarketCondition = useCallback(async () => {
    if (!isActiveRef.current) return null;

    try {
      addLog("📊 시장 조건 분석 중...", "info");
      const condition = await marketAnalysisService.analyzeMarketCondition();

      if (isActiveRef.current) {
        setMarketCondition(condition);
        updateStats((prev) => ({
          ...prev,
          marketConditionsChecked: prev.marketConditionsChecked + 1,
        }));

        const message = condition.isBuyableMarket
          ? `✅ 시장 분석 완료: ${condition.buyability?.level} (점수: ${condition.overallBuyScore?.toFixed(1)})`
          : `🚫 시장 조건 부적절: ${condition.buyability?.level} (점수: ${condition.overallBuyScore?.toFixed(1)})`;

        addLog(message, condition.isBuyableMarket ? "info" : "warning");
      }

      return condition;
    } catch (error) {
      if (isActiveRef.current) {
        addLog(`❌ 시장 분석 실패: ${error.message}`, "error");
      }
      return null;
    }
  }, [addLog, updateStats]);

  // ✅ 모든 리소스 정리 함수 (단순화)
  const cleanupAllResources = useCallback(() => {
    console.log("🧹 모든 리소스 정리 시작...");

    // 상태 먼저 비활성화
    isActiveRef.current = false;
    setIsActive(false);

    // 타이머 정리
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

    // ✅ 웹소켓 구독 해제 (단일 서비스)
    if (subscriptionIdRef.current) {
      upbitWebSocketService.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
    }

    // ✅ 웹소켓 연결 해제 (단일 서비스)
    try {
      upbitWebSocketService.disconnect();
    } catch (error) {
      console.warn("웹소켓 해제 중 오류:", error);
    }

    setConnectionStatus("disconnected");
    console.log("✅ 모든 리소스 정리 완료");
  }, []);

  // ✅ 웹소켓 재연결 함수 (단순화)
  const reconnectWebSocket = useCallback(async () => {
    if (reconnectTimeoutRef.current) return; // 이미 재연결 중

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        addLog("🔄 웹소켓 재연결 시도...", "info");

        // 기존 구독 해제
        if (subscriptionIdRef.current) {
          upbitWebSocketService.unsubscribe(subscriptionIdRef.current);
          subscriptionIdRef.current = null;
        }

        // 연결 해제 후 재연결
        upbitWebSocketService.disconnect();

        // 잠시 대기 후 재연결
        await new Promise((resolve) => setTimeout(resolve, 2000));

        if (isActiveRef.current) {
          const targetMarkets = await getTargetMarkets();

          // 새로운 구독 등록
          subscriptionIdRef.current = upbitWebSocketService.subscribe(
            `papertrading_${Date.now()}`,
            processMarketData
          );

          await upbitWebSocketService.connect(targetMarkets);

          if (upbitWebSocketService.isConnected()) {
            setConnectionStatus("connected");
            addLog("✅ 웹소켓 재연결 완료", "success");
          } else {
            throw new Error("재연결 실패");
          }
        }
      } catch (error) {
        addLog(`❌ 웹소켓 재연결 실패: ${error.message}`, "error");
        setConnectionStatus("error");
      } finally {
        reconnectTimeoutRef.current = null;
      }
    }, 3000);
  }, [getTargetMarkets, addLog, processMarketData]);

  // ✅ 페이퍼 트레이딩 시작 (단순화)
  const startPaperTrading = useCallback(async () => {
    if (isActiveRef.current) {
      addLog("⚠️ 이미 거래가 활성화되어 있습니다", "warning");
      return;
    }

    // 관심 코인 모드에서 코인 없으면 차단
    if (tradingMode === "favorites" && selectedCoinsRef.current.length === 0) {
      addLog("❌ 관심 코인을 먼저 추가해주세요", "error");
      return;
    }

    try {
      console.log("🚀 페이퍼 트레이딩 시작 중...");

      // 상태 활성화
      setIsActive(true);
      isActiveRef.current = true;
      resetStats();

      // ✅ 백엔드 서비스들 테스트 모드 설정
      paperTradingEngine.setTestMode(testModeRef.current);
      paperTradingEngine.setActive(true);
      signalGenerator.setTestMode?.(testModeRef.current);
      upbitWebSocketService.setTestMode(testModeRef.current);

      addLog(
        `🚀 ${testModeRef.current ? "테스트" : "실전"} 페이퍼 트레이딩 시작`,
        "success"
      );

      // ✅ 초기 분석
      addLog("📊 초기 시장 분석 중...", "info");
      await Promise.all([updateMarketCondition(), fetchMarketSentiment()]);

      // 포트폴리오 초기 상태 로드
      await updatePortfolio(true);

      // ✅ 웹소켓 연결 (단일 서비스 사용)
      if (operationMode === "websocket" && isActiveRef.current) {
        addLog("📡 실시간 연결 설정 중...", "info");

        try {
          const targetMarkets = await getTargetMarkets();

          if (targetMarkets.length > 0) {
            // ✅ 웹소켓 구독 등록 (단일 서비스)
            subscriptionIdRef.current = upbitWebSocketService.subscribe(
              `papertrading_${Date.now()}`,
              processMarketData
            );

            // ✅ 웹소켓 연결 (단일 서비스)
            await upbitWebSocketService.connect(targetMarkets);

            if (upbitWebSocketService.isConnected()) {
              setConnectionStatus("connected");
              addLog(
                `✅ 실시간 모니터링 시작: ${targetMarkets.length}개 코인`,
                "success"
              );
            } else {
              throw new Error("웹소켓 연결 실패");
            }
          } else {
            throw new Error("유효한 타겟 마켓이 없음");
          }
        } catch (wsError) {
          addLog(`❌ 웹소켓 연결 실패: ${wsError.message}`, "error");
          setConnectionStatus("error");
        }
      }

      // ✅ 정기 업데이트 인터벌 설정
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

        // ✅ 상위 코인 UI 업데이트 (5분마다)
        if (tradingMode === "top") {
          topCoinsUpdateIntervalRef.current = setInterval(async () => {
            if (isActiveRef.current && tradingMode === "top") {
              await updateTopCoinsUI();
            }
          }, 300000); // 5분마다
        }
      }

      const modeText = testModeRef.current
        ? "🧪 테스트 모드: 완화된 조건으로 더 많은 거래 기회"
        : "🎯 실전 모드: 엄격한 조건으로 신중한 거래";

      addLog(modeText, "info");
      addLog(
        `📊 거래 대상: ${tradingMode === "top" ? `상위 ${topCoinsLimit}개 코인` : `관심 코인 ${selectedCoinsRef.current.length}개`}`,
        "info"
      );
    } catch (error) {
      addLog(`❌ 시작 실패: ${error.message}`, "error");
      // 실패시 상태 정리
      setIsActive(false);
      isActiveRef.current = false;
      cleanupAllResources();
    }
  }, [
    tradingMode,
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
  ]);

  // ✅ 페이퍼 트레이딩 중지 (단순화)
  const stopPaperTrading = useCallback(() => {
    console.log("🛑 페이퍼 트레이딩 중지 시작...");

    // 상태 비활성화 (가장 먼저)
    setIsActive(false);
    isActiveRef.current = false;
    setConnectionStatus("disconnected");

    // 모든 리소스 정리
    cleanupAllResources();

    // 페이퍼 트레이딩 엔진 중지
    try {
      paperTradingEngine.setActive?.(false);
    } catch (error) {
      console.warn("페이퍼 트레이딩 엔진 중지 중 오류:", error);
    }

    addLog(
      `⏹️ ${testModeRef.current ? "테스트" : "실전"} 페이퍼 트레이딩 완전 중지`,
      "warning"
    );
    console.log("✅ 페이퍼 트레이딩 중지 완료");
  }, [addLog, cleanupAllResources]);

  // ✅ 테스트 모드 토글
  const toggleTestMode = useCallback(() => {
    if (isActiveRef.current) {
      addLog("⚠️ 거래 중에는 모드를 변경할 수 없습니다", "warning");
      return;
    }

    setTestMode((prev) => {
      const newTestMode = !prev;
      setTradingSettings(getInitialSettings());
      const modeText = newTestMode
        ? "🧪 테스트 모드 활성화: 완화된 조건, 더 많은 거래 기회"
        : "🎯 실전 모드 활성화: 엄격한 조건, 신중한 거래";
      addLog(modeText, "info");
      return newTestMode;
    });
  }, [addLog, getInitialSettings]);

  // ✅ Refs 동기화
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
    testModeRef.current = testMode;
  }, [testMode]);

  // ✅ 테스트 모드 변경시 설정 업데이트
  useEffect(() => {
    setTradingSettings(getInitialSettings());
  }, [testMode, getInitialSettings]);

  // ✅ 거래 모드 변경 시 상위 코인 UI 업데이트
  useEffect(() => {
    if (isActive && tradingMode === "top") {
      updateTopCoinsUI();
    }
  }, [tradingMode, isActive, updateTopCoinsUI]);

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
    // 상태
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
    addLog,
    toggleTestMode,
    refreshMarketCondition: updateMarketCondition,
    fetchMarketSentiment,
    updateTopCoinsUI,
    reconnectWebSocket,

    // 유틸리티
    selectedCoinsCount: selectedCoins.length,
    hasSelectedCoins: selectedCoins.length > 0,
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
