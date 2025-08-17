import { useState, useEffect, useCallback, useRef } from "react";
import { useCoinStore } from "../stores/coinStore";
import { paperTradingEngine } from "../services/testing/paperTradingEngine";
import { upbitMarketService } from "../services/upbit/upbitMarketService";
import { hybridSignalGenerator } from "../services/analysis/hybridSignalGenerator";
import { useResilientWebSocket } from "./useResilientWebSocket";
import { newsService } from "../services/news/newsService";
import { newsScoreCache } from "../utils/newsCache";
import { clientNewsCache } from "../services/news/clientNewsCache";

export const usePaperTrading = (userId = "demo-user") => {
  // ===========================
  // 상태 관리 (Hooks - 항상 최상단)
  // ===========================

  // 코인 관련 상태
  const selectedCoins = useCoinStore((s) => s.selectedCoins || []);
  const [availableCoins, setAvailableCoins] = useState([]);
  const [interestCoins, setInterestCoins] = useState([]);
  const [topCoins, setTopCoins] = useState([]);
  const [coinConfigs, setCoinConfigs] = useState({});

  // 포트폴리오 및 거래 상태
  const [portfolio, setPortfolio] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [lastSignal, setLastSignal] = useState(null);
  const [marketData, setMarketData] = useState(new Map());

  // 연결 상태
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // 로깅 및 모니터링
  const [logs, setLogs] = useState([]);
  const [monitoringStats, setMonitoringStats] = useState({
    dataReceived: 0,
    signalsGenerated: 0,
    tradesExecuted: 0,
    lastActivity: null,
  });

  // 거래 모드 및 설정
  const [tradingMode, setTradingMode] = useState("selected"); // selected, all
  const [debugMode, setDebugMode] = useState(false);

  // 스마트 포트폴리오 설정
  const [tradingSettings, setTradingSettings] = useState({
    buyThreshold: -1.8, // 매수 임계값 (%)
    sellThreshold: 2.0, // 매도 임계값 (%)
    rsiOversold: 30, // RSI 과매도
    rsiOverbought: 70, // RSI 과매수
    volumeThreshold: 1.5, // 거래량 임계값
    minScore: 7.5, // 최소 신호 점수
    portfolioStrategy: "dynamic", // dynamic, fixed
    maxCoinsToTrade: 8, // 최대 거래 코인 수
    reserveCashRatio: 0.15, // 예비 현금 15%
    rebalanceThreshold: 0.3, // 리밸런싱 임계값
    strategy: "balanced", // conservative, balanced, aggressive
  });

  // ===========================
  // Refs (안정적인 참조)
  // ===========================
  const selectedCoinsRef = useRef(selectedCoins);
  const tradingModeRef = useRef(tradingMode);
  const monitoringStatsRef = useRef({ ...monitoringStats });
  const isActiveRef = useRef(isActive);
  const tradingSettingsRef = useRef(tradingSettings);

  // 로깅 중복 방지
  const lastLogTimeRef = useRef(new Map());
  const logIdRef = useRef(0);
  const recentMessagesRef = useRef(new Map());

  // 데이터 관리
  const priceDataRef = useRef(new Map()); // 코인별 가격 히스토리
  const signalHistoryRef = useRef(new Map()); // 코인별 신호 이력
  const portfolioTargetRef = useRef(new Map()); // 코인별 목표 비율

  // WebSocket ref for subscription management
  const wsRef = useRef(null);

  // ===========================
  // 전역 초기화 및 상태 동기화
  // ===========================
  useEffect(() => {
    // 브라우저 전역 데이터 초기화
    if (!window.__priceHistory) window.__priceHistory = new Map();
    if (!window.__lastDataLog) window.__lastDataLog = new Map();
  }, []);

  // Refs 동기화
  useEffect(() => {
    selectedCoinsRef.current = selectedCoins;
  }, [selectedCoins]);
  useEffect(() => {
    tradingModeRef.current = tradingMode;
  }, [tradingMode]);
  useEffect(() => {
    monitoringStatsRef.current = monitoringStats;
  }, [monitoringStats]);
  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);
  useEffect(() => {
    tradingSettingsRef.current = tradingSettings;
  }, [tradingSettings]);

  // ===========================
  // 로깅 시스템 (중복 방지 포함)
  // ===========================
  const addLog = useCallback(
    (msg, type = "info") => {
      const now = Date.now();
      const dedupeWindowMs = 500;
      const lastMsgTime = recentMessagesRef.current.get(msg) || 0;

      // 중복 메시지 방지
      if (now - lastMsgTime < dedupeWindowMs) {
        return;
      }
      recentMessagesRef.current.set(msg, now);

      logIdRef.current += 1;
      const id = `${now}_${logIdRef.current}`;
      const logKey = `${msg}_${type}`;

      // 개발 모드가 아닌 경우 추가 중복 방지
      const isDev = debugMode || process.env.NODE_ENV === "development";
      if (!isDev) {
        const lastTime = lastLogTimeRef.current.get(logKey) || 0;
        if (now - lastTime < 3000) return;
        lastLogTimeRef.current.set(logKey, now);
      }

      const newLog = {
        id,
        timestamp: new Date().toLocaleTimeString(),
        message: msg,
        type,
      };

      setLogs((prev) => [newLog, ...prev.slice(0, 49)]);
      setMonitoringStats((prev) => ({
        ...prev,
        lastActivity: new Date().toLocaleTimeString(),
      }));
    },
    [debugMode]
  );

  // ===========================
  // 포트폴리오 관리
  // ===========================
  // ✅ 수정된 updatePortfolio 함수
  const updatePortfolio = useCallback(() => {
    try {
      // paperTradingEngine의 실제 함수명 확인 후 사용
      if (typeof paperTradingEngine.getPortfolioSummary === "function") {
        const p = paperTradingEngine.getPortfolioSummary();
        setPortfolio(p);
      } else if (typeof paperTradingEngine.getPortfolio === "function") {
        // getPortfolio가 async이고 userId가 필요한 경우
        paperTradingEngine
          .getPortfolio(userId)
          .then((p) => {
            setPortfolio(p);
          })
          .catch((error) => {
            addLog(`포트폴리오 조회 실패: ${error.message}`, "error");
          });
      } else if (typeof paperTradingEngine.portfolio !== "undefined") {
        // 직접 portfolio 속성 접근
        setPortfolio(paperTradingEngine.portfolio);
      } else {
        // 기본 포트폴리오 생성
        const defaultPortfolio = {
          krw: 1840000,
          coins: [],
          totalValue: 1840000,
          totalReturn: 0,
          totalReturnRate: 0,
        };
        setPortfolio(defaultPortfolio);
        addLog("기본 포트폴리오로 초기화", "info");
      }
    } catch (error) {
      addLog(`포트폴리오 업데이트 실패: ${error.message}`, "error");
      console.error("포트폴리오 업데이트 에러:", error);
    }
  }, [addLog, userId]);

  // 동적 포트폴리오 할당 계산
  const calculateDynamicAllocation = useCallback(() => {
    const settings = tradingSettingsRef.current;
    let targetCoins = [];

    if (tradingModeRef.current === "selected") {
      targetCoins = selectedCoinsRef.current || [];
    } else {
      targetCoins = topCoins || [];
    }

    const activeCoinsCount =
      targetCoins.length > 0
        ? Math.min(targetCoins.length, settings.maxCoinsToTrade || 8)
        : 0;

    if (activeCoinsCount === 0) {
      addLog(
        `⚠️ 거래 대상 코인이 없습니다. 모드: ${tradingModeRef.current}`,
        "warning"
      );
      return {
        maxPositionSize: 0,
        reserveCash: settings.reserveCashRatio || 0.15,
        activeCoinsCount: 0,
        targetCoins: [],
      };
    }

    const totalInvestableRatio = 1 - (settings.reserveCashRatio || 0.15);
    const maxPositionSize = totalInvestableRatio / activeCoinsCount;

    addLog(
      `📊 포트폴리오 할당: ${activeCoinsCount}개 코인 × ${(maxPositionSize * 100).toFixed(1)}% = ${totalInvestableRatio * 100}% 투자, ${(settings.reserveCashRatio || 0.15) * 100}% 예비현금`,
      "info"
    );

    return {
      maxPositionSize,
      reserveCash: settings.reserveCashRatio || 0.15,
      activeCoinsCount,
      targetCoins: targetCoins.slice(0, activeCoinsCount),
    };
  }, [addLog, topCoins]);

  // ✅ 4. 구독 목록 동적 생성 함수 추가
  const getSubscriptionList = useCallback(() => {
    if (tradingModeRef.current === "selected") {
      return selectedCoinsRef.current.map((c) => c.market || `KRW-${c.symbol}`);
    } else {
      return topCoins.map((c) => c.market);
    }
  }, [topCoins]);

  // ===========================
  // 기술적 분석 시스템 (기존 코드와 동일)
  // ===========================
  const calculateRSI = useCallback((prices, period = 14) => {
    if (prices.length < period + 1) return null;

    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = gains.slice(-period).reduce((a, b) => a + b) / period;
    const avgLoss = losses.slice(-period).reduce((a, b) => a + b) / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }, []);

  const calculateTechnicalScore = useCallback(
    (symbol, currentPrice, changePercent, volume) => {
      const priceData = priceDataRef.current.get(symbol) || [];

      if (priceData.length < 20) {
        return {
          rsi: 50,
          rsiScore: 5,
          maScore: 5,
          volumeScore: 5,
          trendScore: 5,
          totalScore: 5,
          signalStrength: "weak",
        };
      }

      // RSI 계산
      const rsi = calculateRSI(priceData);
      let rsiScore = 5;

      if (rsi !== null) {
        if (rsi <= 25)
          rsiScore = 10; // 극도 과매도
        else if (rsi <= 30)
          rsiScore = 9; // 강한 과매도
        else if (rsi <= 40)
          rsiScore = 7; // 과매도
        else if (rsi >= 75)
          rsiScore = 0; // 극도 과매수
        else if (rsi >= 70)
          rsiScore = 1; // 강한 과매수
        else if (rsi >= 60)
          rsiScore = 3; // 과매수
        else rsiScore = 5; // 중립
      }

      // 이동평균 점수
      const ma20 = priceData.slice(-20).reduce((a, b) => a + b) / 20;
      const ma60 =
        priceData.length >= 60
          ? priceData.slice(-60).reduce((a, b) => a + b) / 60
          : ma20;

      let maScore = 5;
      if (priceData.length >= 60) {
        const priceVsMa20 = ((currentPrice - ma20) / ma20) * 100;
        const ma20VsMa60 = ((ma20 - ma60) / ma60) * 100;

        if (priceVsMa20 > 2 && ma20VsMa60 > 1)
          maScore = 9; // 강한 상승 추세
        else if (priceVsMa20 > 0 && ma20VsMa60 > 0)
          maScore = 7; // 상승 추세
        else if (priceVsMa20 < -2 && ma20VsMa60 < -1)
          maScore = 1; // 강한 하락 추세
        else if (priceVsMa20 < 0 && ma20VsMa60 < 0)
          maScore = 3; // 하락 추세
        else maScore = 5; // 횡보
      }

      // 거래량 점수 (변동률과 거래량 관계)
      let volumeScore = 5;
      if (Math.abs(changePercent) > 2 && volume)
        volumeScore = 9; // 큰 변동 + 거래량
      else if (Math.abs(changePercent) > 1 && volume)
        volumeScore = 7; // 보통 변동 + 거래량
      else if (Math.abs(changePercent) < 0.5) volumeScore = 3; // 미미한 변동

      // 추세 점수 (최근 5일 추세)
      const recent5 = priceData.slice(-5);
      let trendScore = 5;
      if (recent5.length >= 5) {
        const trend = ((recent5[4] - recent5) / recent5) * 100;
        if (trend > 5) trendScore = 8;
        else if (trend > 2) trendScore = 7;
        else if (trend < -5) trendScore = 2;
        else if (trend < -2) trendScore = 3;
      }

      // 가중평균으로 총점 계산
      const weights = {
        rsi: 0.35, // RSI 가중치 높임
        ma: 0.25, // 이동평균
        volume: 0.2, // 거래량
        trend: 0.2, // 추세
      };

      const totalScore =
        rsiScore * weights.rsi +
        maScore * weights.ma +
        volumeScore * weights.volume +
        trendScore * weights.trend;

      // 신호 강도 결정
      let signalStrength = "weak";
      if (totalScore >= 8.5) signalStrength = "very_strong";
      else if (totalScore >= 7.5) signalStrength = "strong";
      else if (totalScore >= 6.5) signalStrength = "moderate";
      else if (totalScore >= 5.5) signalStrength = "weak";
      else signalStrength = "very_weak";

      return {
        rsi,
        rsiScore,
        maScore,
        volumeScore,
        trendScore,
        totalScore,
        signalStrength,
        weights,
      };
    },
    [calculateRSI]
  );

  // 향상된 신호 생성 (뉴스 통합) - 기존과 동일
  const generateEnhancedSignal = useCallback(
    async (data, coinInfo) => {
      try {
        const price = data.trade_price;
        const symbol = data.code.replace("KRW-", "");
        const changePercent = (data.signed_change_rate || 0) * 100;

        // 1단계: 기술적 분석
        const techAnalysis = calculateTechnicalScore(
          symbol,
          price,
          changePercent,
          data.acc_trade_volume_24h
        );

        // 2단계: 뉴스 분석 - 클라이언트 캐시만 사용
        let newsAnalysis;

        try {
          // ✅ 클라이언트 캐시에서 뉴스 점수 가져오기
          newsAnalysis = await clientNewsCache.getNewsScore(symbol);

          // 캐시 상태 로깅
          if (debugMode) {
            addLog(
              `📰 ${symbol} 뉴스 점수: ${newsAnalysis.score.toFixed(1)}/10 (${newsAnalysis.strength}) ${newsAnalysis.cached ? "[캐시됨]" : "[신규호출]"}`
            );
          }
        } catch (newsError) {
          // 뉴스 분석 실패 시 중립 기본값
          console.warn(`⚠️ ${symbol} 뉴스 분석 실패:`, newsError.message);
          newsAnalysis = {
            score: 5.0,
            strength: "neutral",
            recentTrend: "neutral",
            cached: false,
            error: newsError.message,
          };
        }

        // 3단계: 디버그 로그 (종합)
        if (debugMode) {
          addLog(
            `🔍 ${symbol} 종합 분석: 기술=${techAnalysis.totalScore.toFixed(1)}/10, 뉴스=${newsAnalysis.score.toFixed(1)}/10 (${newsAnalysis.strength})`
          );
        }

        // 4단계: 뉴스 변별력 확인 (5.0이 아닌 경우만 로그)
        if (newsAnalysis.score !== 5.0) {
          addLog(
            `📊 ${symbol} 뉴스 변별력 발견: ${newsAnalysis.score}/10 (기본값 아님)`,
            "info"
          );
        }

        // 5단계: 복합 점수 계산
        const baseCompositeScore =
          techAnalysis.totalScore * 0.65 + // 기술적 분석 65%
          newsAnalysis.score * 0.35; // 뉴스 분석 35%

        // 6단계: 신호 승수 계산 (뉴스 강도에 따른 가중치)
        let signalMultiplier = 1.0;

        if (
          newsAnalysis.strength === "very_positive" &&
          techAnalysis.totalScore >= 7.0
        ) {
          signalMultiplier = 1.25; // 매우 긍정적 뉴스 + 좋은 기술적 점수
        } else if (
          newsAnalysis.strength === "positive" &&
          techAnalysis.totalScore >= 6.5
        ) {
          signalMultiplier = 1.15; // 긍정적 뉴스 + 괜찮은 기술적 점수
        } else if (newsAnalysis.strength === "very_negative") {
          signalMultiplier = 0.75; // 매우 부정적 뉴스
        } else if (newsAnalysis.strength === "negative") {
          signalMultiplier = 0.85; // 부정적 뉴스
        } else if (newsAnalysis.recentTrend === "improving") {
          signalMultiplier = 1.1; // 개선되는 트렌드
        } else if (newsAnalysis.recentTrend === "worsening") {
          signalMultiplier = 0.9; // 악화되는 트렌드
        }

        const finalScore = Math.min(baseCompositeScore * signalMultiplier, 10);

        // 7단계: 거래 설정 확인
        const settings = tradingSettingsRef.current;

        // 최소 점수 미달 시 신호 없음
        if (finalScore < settings.minScore) {
          if (debugMode) {
            addLog(
              `⏭️ ${symbol} 신호 생성 안함: 점수=${finalScore.toFixed(1)} < 최소점수=${settings.minScore}`
            );
          }
          return null;
        }

        // 8단계: 매수/매도 신호 생성
        let signalType = null;
        let confidence = "medium";
        let signalReason = [];

        // 매수 신호 조건
        if (
          changePercent <= settings.buyThreshold && // 하락 중이고
          finalScore >= 7.0 && // 종합 점수가 높고
          techAnalysis.totalScore >= 6.0 // 기술적으로도 괜찮을 때
        ) {
          signalType = "BUY";

          // 매수 신뢰도 결정
          if (newsAnalysis.strength === "very_positive" && finalScore >= 8.5) {
            confidence = "high";
          } else if (
            newsAnalysis.strength === "positive" &&
            finalScore >= 8.0
          ) {
            confidence = "medium";
          } else {
            confidence = "low";
          }

          signalReason.push(`하락률 ${changePercent.toFixed(2)}%`);
          signalReason.push(`종합점수 ${finalScore.toFixed(1)}/10`);
          if (newsAnalysis.strength !== "neutral") {
            signalReason.push(`뉴스 ${newsAnalysis.strength}`);
          }
        }

        // 매도 신호 조건
        else if (
          changePercent >= settings.sellThreshold && // 상승 중이고
          (finalScore <= 4.0 || // 종합 점수가 낮거나
            newsAnalysis.strength === "very_negative") // 뉴스가 매우 부정적일 때
        ) {
          signalType = "SELL";
          confidence = "high";

          signalReason.push(`상승률 ${changePercent.toFixed(2)}%`);
          if (finalScore <= 4.0) {
            signalReason.push(`낮은 종합점수 ${finalScore.toFixed(1)}/10`);
          }
          if (newsAnalysis.strength === "very_negative") {
            signalReason.push(`매우 부정적 뉴스`);
          }
        }

        // 신호가 생성되지 않은 경우
        if (!signalType) {
          if (debugMode) {
            addLog(
              `💤 ${symbol} 거래 조건 미충족: 변동률=${changePercent.toFixed(2)}%, 점수=${finalScore.toFixed(1)}`
            );
          }
          return null;
        }

        // 9단계: 최종 신호 객체 생성
        const signal = {
          symbol,
          type: signalType,
          price,
          totalScore: Number(finalScore.toFixed(2)),
          confidence,
          reason: `${symbol} ${signalType} - ${signalReason.join(", ")}`,
          detailedReason: `기술:${techAnalysis.totalScore.toFixed(1)} + 뉴스:${newsAnalysis.score.toFixed(1)}(${newsAnalysis.strength}) = 복합:${finalScore.toFixed(1)}`,
          timestamp: new Date(),
          changePercent: Number(changePercent.toFixed(2)),

          // 상세 분석 데이터
          technicalAnalysis: techAnalysis,
          newsAnalysis: {
            score: newsAnalysis.score,
            strength: newsAnalysis.strength,
            recentTrend: newsAnalysis.recentTrend,
            cached: newsAnalysis.cached,
            articlesCount: newsAnalysis.articlesCount || 0,
          },

          // 계산 과정
          compositeScore: Number(baseCompositeScore.toFixed(2)),
          signalMultiplier: Number(signalMultiplier.toFixed(2)),

          // 메타데이터
          generatedAt: Date.now(),
          settingsUsed: {
            buyThreshold: settings.buyThreshold,
            sellThreshold: settings.sellThreshold,
            minScore: settings.minScore,
          },
        };

        // 성공 로그
        addLog(
          `🎯 ${symbol} ${signalType} 신호 생성! 점수=${finalScore.toFixed(1)}/10, 신뢰도=${confidence}`,
          signalType === "BUY" ? "success" : "warning"
        );

        return signal;
      } catch (error) {
        // 전체 프로세스 실패 시
        addLog(
          `❌ ${data.code} 신호 생성 중 예외 발생: ${error.message}`,
          "error"
        );

        // 에러 상세 정보 (디버그 모드에서만)
        if (debugMode) {
          console.error(`신호 생성 스택 트레이스:`, error);
        }

        return null;
      }
    },
    [addLog, calculateTechnicalScore, debugMode] // ✅ debugMode 의존성 추가
  );

  // ===========================
  // 실시간 데이터 처리
  // ===========================
  const handleMarketData = useCallback(
    async (data) => {
      if (!isActiveRef.current) return;
      if (!data || !data.code || typeof data.trade_price !== "number") {
        addLog(`⚠️ 잘못된 데이터 형식: ${JSON.stringify(data)}`, "warning");
        return;
      }

      const symbol = data.code.replace("KRW-", "");

      // 통계 업데이트
      monitoringStatsRef.current.dataReceived =
        (monitoringStatsRef.current.dataReceived || 0) + 1;
      setMonitoringStats((prev) => ({
        ...prev,
        dataReceived: monitoringStatsRef.current.dataReceived,
      }));

      // 주기적 로그
      const now = Date.now();
      const last = window.__lastDataLog.get(symbol) || 0;
      if (now - last > 8000) {
        // 8초마다 로그
        const cp = (data.signed_change_rate || 0) * 100;
        const icon = cp >= 0 ? "📈" : "📉";
        addLog(
          `${icon} ${symbol}: ${data.trade_price.toLocaleString()}원 (${cp >= 0 ? "+" : ""}${cp.toFixed(2)}%)`,
          cp >= 0 ? "success" : "error"
        );
        window.__lastDataLog.set(symbol, now);
      }

      // 시장 데이터 저장
      setMarketData((prev) => new Map(prev.set(symbol, data)));

      // 보유 코인 가격 업데이트
      if (portfolio?.coins?.some((c) => c.symbol === symbol)) {
        paperTradingEngine.updateCoinPrice(symbol, data.trade_price);
        updatePortfolio();
      }

      // 거래 대상 확인
      let shouldTrade = false;
      let coinInfo = null;

      if (tradingModeRef.current === "selected") {
        coinInfo = selectedCoinsRef.current.find(
          (c) => c.symbol === symbol || c.market === `KRW-${symbol}`
        );
        shouldTrade = !!coinInfo;
      } else {
        coinInfo = topCoins.find((c) => c.symbol === symbol);
        shouldTrade = !!coinInfo;
      }

      if (!shouldTrade && !debugMode) {
        return;
      }

      // 스마트 신호 생성 및 거래 실행
      const signal = await generateEnhancedSignal(data, coinInfo);
      const settings = tradingSettingsRef.current;

      if (signal && signal.totalScore >= settings.minScore) {
        setLastSignal(signal);

        // 동적 포지션 사이징
        const allocation = signal.allocation || calculateDynamicAllocation();
        const basePositionSize =
          allocation.maxPositionSize * (signal.positionSizeMultiplier || 1);

        const config = coinConfigs[signal.symbol] || {
          isActive: true,
          buySettings: {
            enabled: true,
            buyPercentage: Math.min(basePositionSize * 100, 25), // 최대 25%
            maxPositionSize: basePositionSize * 1840000,
          },
          sellSettings: {
            enabled: true,
            sellPercentage: (signal.positionSizeMultiplier || 1) * 100,
            profitTarget: 8,
            stopLoss: -5,
          },
        };

        try {
          const result = await paperTradingEngine.executeSignal(signal, config);

          if (result?.executed) {
            // 통계 업데이트
            monitoringStatsRef.current.tradesExecuted =
              (monitoringStatsRef.current.tradesExecuted || 0) + 1;
            setMonitoringStats((prev) => ({
              ...prev,
              tradesExecuted: monitoringStatsRef.current.tradesExecuted,
            }));

            const portfolioUpdate = paperTradingEngine.getPortfolioSummary();
            const cashRatio = (
              (portfolioUpdate.krw / portfolioUpdate.totalValue) *
              100
            ).toFixed(1);

            addLog(
              `✅ ${signal.symbol} ${signal.type} 실행! 금액=${result.trade.amount?.toLocaleString()}원, 현금비율=${cashRatio}% (${signal.technicalAnalysis?.signalStrength || signal.confidence})`,
              "success"
            );
            updatePortfolio();
          } else {
            addLog(`❌ 거래 실행 실패: ${result.reason}`, "error");
          }
        } catch (err) {
          addLog(`❌ 거래 실행 오류: ${err.message}`, "error");
        }
      }
    },
    [
      addLog,
      generateEnhancedSignal,
      topCoins,
      updatePortfolio,
      portfolio,
      coinConfigs,
      debugMode,
      calculateDynamicAllocation,
    ]
  );

  // ===========================
  // ✅ 간소화된 WebSocket 메시지 처리
  // ===========================
  const handleMessage = useCallback(
    async (data) => {
      if (!isActive) return;

      try {
        // data는 이미 parseWebSocketMessage에서 파싱된 객체
        await handleMarketData(data);
      } catch (error) {
        console.error("❌ 페이퍼 트레이딩 처리 오류:", error);
      }
    },
    [isActive, handleMarketData]
  );

  // ===========================
  // ✅ useResilientWebSocket 사용 (구독 메시지 포함)
  // ===========================
  const {
    isConnected,
    reconnect,
    connectionStatus: wsStatus,
  } = useResilientWebSocket("wss://api.upbit.com/websocket/v1", {
    onMessage: handleMessage,
    onConnect: () => {
      console.log("✅ 페이퍼 트레이딩 WebSocket 연결됨");
      setConnectionStatus("connected");

      // ✅ 연결 즉시 구독 메시지 전송
      if (isActiveRef.current) {
        const subscriptionList = getSubscriptionList();
        if (subscriptionList.length > 0) {
          setTimeout(() => {
            const ws = window.__resilientWebSocket;
            if (ws && ws.readyState === WebSocket.OPEN) {
              // ✅ 업비트 표준 구독 형식
              const subscriptionMessage = [
                { ticket: "cryptowise-upbit-" + Date.now() }, // 고유 티켓
                {
                  type: "ticker",
                  codes: subscriptionList,
                  isOnlySnapshot: false,
                  isOnlyRealtime: true,
                },
              ];

              ws.send(JSON.stringify(subscriptionMessage));
              console.log(
                `📡 업비트 구독 완료: ${subscriptionList.length}개 코인`
              );
              addLog(
                `📡 WebSocket 구독: ${subscriptionList.length}개 코인`,
                "success"
              );
            }
          }, 200); // 200ms 대기
        }
      }
    },
    onDisconnect: (event) => {
      console.log("🔌 페이퍼 트레이딩 WebSocket 끊어짐:", event.reason);
      setConnectionStatus("disconnected");
      addLog(`🔌 WebSocket 연결 끊어짐 (${event.code})`, "warning");
    },
    maxReconnectAttempts: 10,
    reconnectInterval: 2000,
  });

  // 상태 동기화
  useEffect(() => {
    setConnectionStatus(wsStatus);
  }, [wsStatus]);

  // ===========================
  // ✅ 간소화된 startPaperTrading (WebSocket 로직 제거)
  // ===========================
  const startPaperTrading = useCallback(async () => {
    if (isActiveRef.current) return;

    try {
      const settings = tradingSettingsRef.current;

      // 초기화
      priceDataRef.current.clear();
      signalHistoryRef.current.clear();
      portfolioTargetRef.current.clear();

      // paperTradingEngine 초기화 확인
      if (!paperTradingEngine) {
        addLog("❌ paperTradingEngine을 찾을 수 없습니다", "error");
        return;
      }

      // 포트폴리오 엔진 초기화
      try {
        if (typeof paperTradingEngine.initialize === "function") {
          await paperTradingEngine.initialize();
        } else if (typeof paperTradingEngine.resetPortfolio === "function") {
          paperTradingEngine.resetPortfolio();
        }
      } catch (initError) {
        console.warn("포트폴리오 엔진 초기화 실패:", initError.message);
      }

      // 코인 목록 로드
      if (tradingModeRef.current === "selected") {
        if (
          !selectedCoinsRef.current ||
          selectedCoinsRef.current.length === 0
        ) {
          addLog("❌ 관심등록된 코인이 없습니다", "error");
          return;
        }
        addLog(
          `🎯 관심코인 ${selectedCoinsRef.current.length}개 로드 완료`,
          "success"
        );
      } else {
        // 전체코인 모드: topCoins 먼저 로드
        addLog("🔄 전체코인 목록 로딩중...", "info");
        try {
          const coins = await upbitMarketService.getInvestableCoins();
          const popular = coins
            .filter((c) => c.market?.startsWith("KRW-"))
            .slice(0, settings.maxCoinsToTrade || 8);

          setTopCoins(popular);
          addLog(`🌍 전체코인 상위 ${popular.length}개 로드 완료`, "success");
        } catch (error) {
          addLog(`❌ 전체코인 로드 실패: ${error.message}`, "error");
          return;
        }
      }

      // 할당 계산
      const allocation = calculateDynamicAllocation();
      if (allocation.activeCoinsCount === 0) {
        addLog("❌ 거래 가능한 코인이 없습니다", "error");
        return;
      }

      // 뉴스 프리로더 시작
      try {
        if (
          typeof hybridSignalGenerator?.newsPreloader?.startPreloading ===
          "function"
        ) {
          hybridSignalGenerator.newsPreloader.startPreloading();
          addLog("📰 뉴스 백그라운드 캐싱 시작", "info");
        }
      } catch (newsError) {
        console.warn("뉴스 프리로더 시작 실패:", newsError.message);
      }

      addLog(
        `🚀 스마트 페이퍼 트레이딩 시작! ${allocation.activeCoinsCount}개 코인 × ${(allocation.maxPositionSize * 100).toFixed(1)}%`,
        "success"
      );

      // 통계 초기화
      setMonitoringStats({
        dataReceived: 0,
        signalsGenerated: 0,
        tradesExecuted: 0,
        lastActivity: new Date().toLocaleTimeString(),
      });

      // 상태 업데이트
      setIsActive(true);
      isActiveRef.current = true;

      // 포트폴리오 초기 업데이트
      updatePortfolio();

      // ✅ WebSocket 연결 실패 대비 폴링 모드 시작
      if (!isConnected) {
        addLog("⚠️ WebSocket 연결 실패 - 폴링 모드로 전환", "warning");
        startPollingMode();
      } else {
        addLog("✅ WebSocket 연결됨 - 실시간 모드", "success");
      }
    } catch (error) {
      addLog(`❌ 페이퍼 트레이딩 시작 실패: ${error.message}`, "error");
      console.error("startPaperTrading 에러:", error);

      // 실패 시 상태 복구
      setIsActive(false);
      isActiveRef.current = false;
    }
  }, [
    addLog,
    updatePortfolio,
    calculateDynamicAllocation,
    getSubscriptionList,
    isConnected,
    selectedCoinsRef,
    tradingModeRef,
  ]);

  // ✅ 폴링 모드 함수 (WebSocket 대체)
  const startPollingMode = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      if (!isActiveRef.current) {
        clearInterval(pollingIntervalRef.current);
        return;
      }

      try {
        const subscriptionList = getSubscriptionList();

        for (const market of subscriptionList.slice(0, 5)) {
          // 5개씩 제한
          try {
            // Upbit REST API로 현재가 조회
            const response = await fetch(
              `https://api.upbit.com/v1/ticker?markets=${market}`,
              {
                method: "GET",
                headers: {
                  Accept: "application/json",
                },
              }
            );

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const [data] = await response.json();

            if (data) {
              // WebSocket 데이터 형식으로 변환
              const wsData = {
                code: data.market,
                trade_price: data.trade_price,
                signed_change_rate: data.signed_change_rate,
                acc_trade_volume_24h: data.acc_trade_volume_24h,
                timestamp: Date.now(),
              };

              // 기존 WebSocket 핸들러로 처리
              await handleMarketData(wsData);
            }
          } catch (error) {
            if (debugMode) {
              console.warn(`폴링 실패 (${market}):`, error.message);
            }
          }

          // API 제한 방지를 위한 지연 (100ms)
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        addLog(`폴링 모드 오류: ${error.message}`, "error");
      }
    }, 12000); // 12초마다 폴링 (업비트 API 제한 고려)

    addLog("📊 폴링 모드 시작 (12초 간격)", "info");
  }, [getSubscriptionList, handleMarketData, isActiveRef, debugMode, addLog]);

  // ✅ 폴링 모드 정리를 위한 ref
  const pollingIntervalRef = useRef(null);

  // ===========================
  // ✅ 간소화된 stopPaperTrading
  // ===========================
  // ✅ 수정된 stopPaperTrading 함수
  const stopPaperTrading = useCallback(() => {
    try {
      // 폴링 모드 정리
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        addLog("📊 폴링 모드 중지", "info");
      }

      // 뉴스 프리로더 중지
      if (
        typeof hybridSignalGenerator?.newsPreloader?.stopPreloading ===
        "function"
      ) {
        hybridSignalGenerator.newsPreloader.stopPreloading();
        addLog("📰 뉴스 백그라운드 캐싱 중지", "info");
      }

      // 상태 업데이트
      setIsActive(false);
      isActiveRef.current = false;

      addLog("⏹️ 스마트 페이퍼 트레이딩 중지", "warning");
    } catch (error) {
      addLog(`트레이딩 중지 중 오류: ${error.message}`, "error");
    }
  }, [addLog]);

  // ✅ 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // ✅ paperTradingEngine 모듈 확인 및 초기화
  useEffect(() => {
    if (paperTradingEngine) {
      console.log(
        "📋 paperTradingEngine 사용 가능한 함수들:",
        Object.getOwnPropertyNames(paperTradingEngine).filter(
          (name) => typeof paperTradingEngine[name] === "function"
        )
      );
    } else {
      console.error("❌ paperTradingEngine을 불러올 수 없습니다");
    }
  }, []);

  // ===========================
  // 상태 리포트 (3분마다)
  // ===========================
  useEffect(() => {
    if (!isActive) return;

    const id = setInterval(() => {
      const allocation = calculateDynamicAllocation();
      const currentPortfolio = paperTradingEngine.getPortfolioSummary();
      const cashRatio = (
        (currentPortfolio.krw / currentPortfolio.totalValue) *
        100
      ).toFixed(1);

      // 뉴스 상태 (혹시 있다면)
      let newsStatus = "";
      if (typeof hybridSignalGenerator?.getNewsStatus === "function") {
        const newsCache = hybridSignalGenerator.getNewsStatus();
        newsStatus = ` | 뉴스:${newsCache.length}개`;
      }

      addLog(
        `📊 [${tradingMode === "selected" ? "관심" : "전체"}코인] 대상=${allocation.activeCoinsCount}개, 현금=${cashRatio}%/${allocation.reserveCash * 100}%, 포지션=${(allocation.maxPositionSize * 100).toFixed(1)}%/코인 | 수신:${monitoringStatsRef.current.dataReceived} 신호:${monitoringStatsRef.current.signalsGenerated} 거래:${monitoringStatsRef.current.tradesExecuted}${newsStatus}`,
        "info"
      );
    }, 180000); // 3분마다

    return () => clearInterval(id);
  }, [isActive, tradingMode, addLog, calculateDynamicAllocation]);

  // ===========================
  // 동적 코인 설정 초기화
  // ===========================
  useEffect(() => {
    if (selectedCoins.length > 0) {
      const allocation = calculateDynamicAllocation();
      const defaultConfigs = {};

      selectedCoins.forEach((coin) => {
        const symbol = coin.symbol || coin.market?.replace("KRW-", "");
        if (symbol) {
          defaultConfigs[symbol] = {
            isActive: true,
            buySettings: {
              enabled: true,
              buyPercentage: allocation.maxPositionSize * 100,
              maxPositionSize: allocation.maxPositionSize * 1840000,
            },
            sellSettings: {
              enabled: true,
              sellPercentage: 50, // 기본 50% 부분매도
              profitTarget: 8,
              stopLoss: -5,
            },
          };
        }
      });

      setCoinConfigs(defaultConfigs);
      addLog(
        `⚙️ 코인별 설정 업데이트: ${selectedCoins.length}개 코인, 각각 최대 ${(allocation.maxPositionSize * 100).toFixed(1)}% 할당`,
        "info"
      );
    }
  }, [selectedCoins, calculateDynamicAllocation, addLog]);

  // coinStore 동기화
  useEffect(() => {
    if (selectedCoins.length > 0) {
      setInterestCoins(
        selectedCoins.map((coin) => ({
          symbol: coin.symbol || coin.market?.replace("KRW-", "") || "",
          korean_name: coin.korean_name || "",
          market: coin.market || "",
          isActive: true,
          priority: "medium",
        }))
      );
    } else {
      setInterestCoins([]);
    }
  }, [selectedCoins]);

  // 포트폴리오 초기 로드
  useEffect(() => {
    if (isActive && userId) {
      paperTradingEngine.getPortfolio(userId).then(setPortfolio);
    }
  }, [isActive, userId]);

  // ===========================
  // 반환 객체
  // ===========================
  return {
    // 상태
    portfolio,
    isActive,
    isConnected,
    connectionStatus,
    lastSignal,
    logs,
    marketData,
    monitoringStats,

    // 코인 관련
    availableCoins,
    interestCoins,
    topCoins,
    coinConfigs,
    selectedCoinsCount: selectedCoins.length,
    hasSelectedCoins: selectedCoins.length > 0,

    // 설정
    tradingMode,
    setTradingMode,
    tradingSettings,
    setTradingSettings,
    debugMode,
    setDebugMode,

    // 액션
    startPaperTrading,
    stopPaperTrading,
    updatePortfolio,
    reconnect,
    addLog,

    // 코인 관리
    toggleInterestCoin: (symbol) =>
      setInterestCoins((prev) =>
        prev.map((c) =>
          c.symbol === symbol ? { ...c, isActive: !c.isActive } : c
        )
      ),
    setCoinConfigs,

    // 리셋
    resetPortfolio: () => {
      paperTradingEngine.resetPortfolio();
      priceDataRef.current.clear();
      signalHistoryRef.current.clear();
      portfolioTargetRef.current.clear();
      updatePortfolio();
      addLog("🔄 포트폴리오 및 분석 데이터 리셋 완료", "warning");
    },

    // 고급 기능
    generateEnhancedSignal,

    // 뉴스 상태 (혹시 있다면)
    getNewsStatus: () => {
      if (typeof hybridSignalGenerator?.getNewsStatus === "function") {
        return hybridSignalGenerator.getNewsStatus();
      }
      return [];
    },
  };
};

export default usePaperTrading;
