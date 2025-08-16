import { useState, useEffect, useCallback, useRef } from "react";
import { useCoinStore } from "../stores/coinStore";
import { paperTradingEngine } from "../services/testing/paperTradingEngine";
import { upbitMarketService } from "../services/upbit/upbitMarketService";
import { newsService } from "../services/news/newsService";
import { newsScoreCache } from "../utils/newsCache";

export const usePaperTrading = (userId = "demo-user") => {
  // -------------------------
  // Hooks: 반드시 조건 없이 고정된 순서로 선언
  // -------------------------
  const selectedCoins = useCoinStore((s) => s.selectedCoins || []);
  const [portfolio, setPortfolio] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSignal, setLastSignal] = useState(null);
  const [logs, setLogs] = useState([]);
  const [availableCoins, setAvailableCoins] = useState([]);
  const [marketData, setMarketData] = useState(new Map());
  const [interestCoins, setInterestCoins] = useState([]);
  const [coinConfigs, setCoinConfigs] = useState({});
  const [tradingMode, setTradingMode] = useState("selected");
  const [topCoins, setTopCoins] = useState([]);
  const [monitoringStats, setMonitoringStats] = useState({
    dataReceived: 0,
    signalsGenerated: 0,
    tradesExecuted: 0,
    lastActivity: null,
  });
  const [debugMode, setDebugMode] = useState(false);

  // ✅ 스마트 포트폴리오 설정
  const [tradingSettings, setTradingSettings] = useState({
    buyThreshold: -1.8,
    sellThreshold: 2.0,
    rsiOversold: 30,
    rsiOverbought: 70,
    volumeThreshold: 1.5,
    minScore: 7.5,
    // ✅ 동적 포트폴리오 관리
    portfolioStrategy: "dynamic", // dynamic, fixed
    maxCoinsToTrade: 8, // 최대 거래 코인 수
    reserveCashRatio: 0.15, // 예비 현금 15%
    rebalanceThreshold: 0.3, // 30% 이상 차이나면 리밸런싱
    strategy: "balanced",
  });

  // Refs
  const selectedCoinsRef = useRef(selectedCoins);
  const tradingModeRef = useRef(tradingMode);
  const monitoringStatsRef = useRef({ ...monitoringStats });
  const isActiveRef = useRef(isActive);
  const lastLogTimeRef = useRef(new Map());
  const logIdRef = useRef(0);
  const recentMessagesRef = useRef(new Map());
  const tradingSettingsRef = useRef(tradingSettings);

  // ✅ 포트폴리오 관리를 위한 Ref
  const priceDataRef = useRef(new Map());
  const signalHistoryRef = useRef(new Map()); // 코인별 신호 이력
  const portfolioTargetRef = useRef(new Map()); // 코인별 목표 비율

  // -------------------------
  // 전역 초기화
  // -------------------------
  useEffect(() => {
    if (!window.__priceHistory) window.__priceHistory = new Map();
    if (!window.__lastDataLog) window.__lastDataLog = new Map();
  }, []);

  // -------------------------
  // 상태 동기화
  // -------------------------
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

  // -------------------------
  // addLog: 중복 방지
  // -------------------------
  const addLog = useCallback(
    (msg, type = "info") => {
      const now = Date.now();
      const dedupeWindowMs = 500;
      const lastMsgTime = recentMessagesRef.current.get(msg) || 0;
      if (now - lastMsgTime < dedupeWindowMs) {
        return;
      }

      recentMessagesRef.current.set(msg, now);
      logIdRef.current += 1;
      const id = `${now}_${logIdRef.current}`;
      const logKey = `${msg}_${type}`;
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

  // -------------------------
  // 포트폴리오 업데이트
  // -------------------------
  const updatePortfolio = useCallback(() => {
    try {
      const p = paperTradingEngine.getPortfolioSummary();
      setPortfolio(p);
    } catch (e) {
      addLog(`❌ 포트폴리오 업데이트 실패: ${e.message}`, "error");
    }
  }, [addLog]);

  // -------------------------
  // ✅ 동적 포트폴리오 할당 계산
  // -------------------------
  const calculateDynamicAllocation = useCallback(() => {
    const settings = tradingSettingsRef.current;
    let targetCoins = [];

    if (tradingModeRef.current === "selected") {
      targetCoins = selectedCoinsRef.current || [];
    } else {
      targetCoins = topCoins || [];
    }

    // ✅ undefined 방지: 기본값 설정
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
  }, [addLog, topCoins]); // ✅ topCoins 의존성 추가

  // -------------------------
  // ✅ 기술적 지표 계산
  // -------------------------
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

  // -------------------------
  // ✅ 지표 기반 스마트 신호 생성
  // -------------------------
  const generateSmartSignal = useCallback(
    (data, coinInfo) => {
      try {
        const price = data.trade_price;
        const symbol = data.code.replace("KRW-", "");
        const changePercent = (data.signed_change_rate || 0) * 100;
        const volume = data.acc_trade_volume_24h || 0;
        const settings = tradingSettingsRef.current;

        // 포트폴리오 할당 정보 가져오기
        const allocation = calculateDynamicAllocation();
        const currentPortfolio = paperTradingEngine.getPortfolioSummary();

        // 현재 포지션 확인
        const currentPosition = currentPortfolio.coins.find(
          (coin) => coin.symbol === symbol
        );
        const currentPositionRatio = currentPosition
          ? currentPosition.currentValue / currentPortfolio.totalValue
          : 0;

        // 가격 데이터 저장
        if (!priceDataRef.current.has(symbol)) {
          priceDataRef.current.set(symbol, []);
        }
        const priceData = priceDataRef.current.get(symbol);
        priceData.push(price);
        if (priceData.length > 100) priceData.shift();

        if (priceData.length < 20) {
          addLog(
            `⏳ ${symbol} 데이터 수집중... (${priceData.length}/20)`,
            "info"
          );
          return null;
        }

        // 기술적 분석 수행
        const techAnalysis = calculateTechnicalScore(
          symbol,
          price,
          changePercent,
          volume
        );

        // 신호 이력 업데이트
        if (!signalHistoryRef.current.has(symbol)) {
          signalHistoryRef.current.set(symbol, []);
        }
        const signalHistory = signalHistoryRef.current.get(symbol);
        signalHistory.push({
          timestamp: Date.now(),
          score: techAnalysis.totalScore,
          rsi: techAnalysis.rsi,
          changePercent,
          signalStrength: techAnalysis.signalStrength,
        });
        if (signalHistory.length > 50) signalHistory.shift();

        let signalType = null;
        let positionSizeMultiplier = 1;

        // ✅ 매수 신호 판단 (지표 기반)
        if (
          changePercent <= settings.buyThreshold &&
          techAnalysis.totalScore >= 7.0
        ) {
          const cashRatio = currentPortfolio.krw / currentPortfolio.totalValue;

          // 현금 보유량 확인
          if (cashRatio > allocation.reserveCash) {
            // 목표 포지션 대비 현재 포지션 확인
            const targetPositionRatio = allocation.maxPositionSize;

            if (currentPositionRatio < targetPositionRatio) {
              signalType = "BUY";

              // 신호 강도에 따른 포지션 크기 조정
              if (techAnalysis.signalStrength === "very_strong") {
                positionSizeMultiplier = 1.5; // 150%
              } else if (techAnalysis.signalStrength === "strong") {
                positionSizeMultiplier = 1.2; // 120%
              } else if (techAnalysis.signalStrength === "moderate") {
                positionSizeMultiplier = 1.0; // 100%
              } else {
                positionSizeMultiplier = 0.7; // 70%
              }

              addLog(
                `🟢 ${symbol} 매수 신호! 변동률=${changePercent.toFixed(2)}%, 기술점수=${techAnalysis.totalScore.toFixed(1)}, 신호강도=${techAnalysis.signalStrength}, 포지션=${(targetPositionRatio * 100).toFixed(1)}%`,
                "success"
              );
            } else {
              addLog(
                `📊 ${symbol} 매수 보류: 이미 목표 포지션 달성 (${(currentPositionRatio * 100).toFixed(1)}%/${(targetPositionRatio * 100).toFixed(1)}%)`,
                "info"
              );
            }
          } else {
            addLog(
              `💰 ${symbol} 매수 보류: 현금 부족 (${(cashRatio * 100).toFixed(1)}% < ${allocation.reserveCash * 100}%)`,
              "warning"
            );
          }
        }

        // ✅ 매도 신호 판단 (보유 중인 경우만)
        else if (currentPosition && currentPosition.quantity > 0) {
          const profitRate = currentPosition.profitRate || 0;
          const shouldSell =
            (changePercent >= settings.sellThreshold &&
              techAnalysis.totalScore <= 3.0) ||
            (profitRate >= 8 && techAnalysis.rsi >= 70) || // 8% 이익 + RSI 과매수
            profitRate <= -5 || // 손절
            (techAnalysis.signalStrength === "very_weak" && profitRate > 2); // 매우 약한 신호 + 약간의 이익

          if (shouldSell) {
            signalType = "SELL";

            // 매도 비율 결정 (부분 매도)
            if (profitRate >= 15)
              positionSizeMultiplier = 0.8; // 80% 매도
            else if (profitRate >= 8)
              positionSizeMultiplier = 0.5; // 50% 매도
            else if (profitRate <= -5)
              positionSizeMultiplier = 1.0; // 전량 매도 (손절)
            else positionSizeMultiplier = 0.3; // 30% 매도

            addLog(
              `🔴 ${symbol} 매도 신호! 수익률=${profitRate.toFixed(1)}%, 기술점수=${techAnalysis.totalScore.toFixed(1)}, 매도비율=${positionSizeMultiplier * 100}%`,
              "success"
            );
          }
        }

        if (!signalType) {
          if (Math.abs(changePercent) > 1.0) {
            addLog(
              `ℹ️ ${symbol} 신호없음: 변동률=${changePercent.toFixed(2)}%, 기술점수=${techAnalysis.totalScore.toFixed(1)} (${techAnalysis.signalStrength}), 포지션=${(currentPositionRatio * 100).toFixed(1)}%`,
              "info"
            );
          }
          return null;
        }

        monitoringStatsRef.current.signalsGenerated =
          (monitoringStatsRef.current.signalsGenerated || 0) + 1;
        setMonitoringStats((prev) => ({
          ...prev,
          signalsGenerated: monitoringStatsRef.current.signalsGenerated,
        }));

        return {
          symbol,
          type: signalType,
          price,
          totalScore: techAnalysis.totalScore,
          reason: `${coinInfo?.korean_name || symbol} ${signalType} - 강도:${techAnalysis.signalStrength}, 점수:${techAnalysis.totalScore.toFixed(1)}, RSI:${techAnalysis.rsi?.toFixed(1)}`,
          timestamp: new Date(),
          changePercent,
          technicalAnalysis: techAnalysis,
          positionSizeMultiplier,
          allocation,
          settings: { ...settings },
        };
      } catch (error) {
        addLog(`❌ ${data.code} 신호 생성 오류: ${error.message}`, "error");
        return null;
      }
    },
    [addLog, calculateDynamicAllocation, calculateTechnicalScore]
  );

  // ✅ 향상된 신호 생성 (뉴스 통합)
  const generateEnhancedSignal = useCallback(
    async (data, coinInfo) => {
      try {
        const price = data.trade_price;
        const symbol = data.code.replace("KRW-", "");
        const changePercent = (data.signed_change_rate || 0) * 100;

        // 기존 기술적 분석
        const techAnalysis = calculateTechnicalScore(
          symbol,
          price,
          changePercent,
          data.acc_trade_volume_24h
        );

        // ✅ 기술적 분석이 임계값에 근접한 경우에만 뉴스 분석 실행
        const needsNewsAnalysis =
          techAnalysis.totalScore >= 6.0 || // 기술 점수가 높거나
          Math.abs(changePercent) >= 1.5; // 큰 변동이 있을 때

        let newsAnalysis = {
          score: 5.0,
          strength: "neutral",
          recentTrend: "neutral",
        }; // 기본값

        // ✅ 캐시된 뉴스 분석 사용 (중복 호출 방지)
        if (needsNewsAnalysis) {
          newsAnalysis = await newsScoreCache.getNewsScore(symbol, newsService);
        } else {
          console.log(
            `⏭️ ${symbol} 뉴스 분석 건너뜀 (기술점수: ${techAnalysis.totalScore.toFixed(1)})`
          );
        }

        // ✅ 복합 점수 계산
        const compositeScore =
          techAnalysis.totalScore * 0.6 + newsAnalysis.score * 0.4;

        // 나머지 로직은 동일...
        let signalMultiplier = 1.0;
        if (
          newsAnalysis.strength === "very_positive" &&
          techAnalysis.totalScore >= 7.0
        ) {
          signalMultiplier = 1.3;
        } else if (newsAnalysis.strength === "very_negative") {
          signalMultiplier = 0.7;
        } else if (newsAnalysis.recentTrend === "improving") {
          signalMultiplier = 1.1;
        }

        const finalScore = Math.min(compositeScore * signalMultiplier, 10);
        const settings = tradingSettingsRef.current;

        if (finalScore < settings.minScore) {
          return null;
        }

        // 신호 생성 로직...
        let signalType = null;
        let confidence = "medium";

        if (
          changePercent <= settings.buyThreshold &&
          finalScore >= 7.5 &&
          newsAnalysis.score >= 6.0
        ) {
          signalType = "BUY";
          confidence =
            newsAnalysis.strength === "very_positive" ? "high" : "medium";
        } else if (
          changePercent >= settings.sellThreshold &&
          (finalScore <= 3.0 || newsAnalysis.strength === "very_negative")
        ) {
          signalType = "SELL";
          confidence = "high";
        }

        if (!signalType) return null;

        return {
          symbol,
          type: signalType,
          price,
          totalScore: finalScore,
          confidence,
          reason: `${symbol} ${signalType} - 기술:${techAnalysis.totalScore.toFixed(1)} 뉴스:${newsAnalysis.score.toFixed(1)}(${newsAnalysis.strength}) 복합:${finalScore.toFixed(1)}`,
          timestamp: new Date(),
          changePercent,
          technicalAnalysis: techAnalysis,
          newsAnalysis: newsAnalysis,
          compositeScore,
          signalMultiplier,
        };
      } catch (error) {
        addLog(
          `❌ ${data.code} 향상된 신호 생성 오류: ${error.message}`,
          "error"
        );
        return null;
      }
    },
    [addLog, calculateTechnicalScore]
  );

  // -------------------------
  // 실시간 데이터 처리
  // -------------------------
  const handleMarketData = useCallback(
    async (data) => {
      if (!isActiveRef.current) return;
      if (!data || !data.code || typeof data.trade_price !== "number") {
        addLog(`⚠️ 잘못된 데이터 형식: ${JSON.stringify(data)}`, "warning");
        return;
      }

      const symbol = data.code.replace("KRW-", "");
      monitoringStatsRef.current.dataReceived =
        (monitoringStatsRef.current.dataReceived || 0) + 1;
      setMonitoringStats((prev) => ({
        ...prev,
        dataReceived: monitoringStatsRef.current.dataReceived,
      }));

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

      setMarketData((prev) => new Map(prev.set(symbol, data)));

      // 보유 코인 가격 업데이트
      if (portfolio?.coins?.some((c) => c.symbol === symbol)) {
        paperTradingEngine.updateCoinPrice(symbol, data.trade_price);
        updatePortfolio();
      }

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

      // ✅ 스마트 신호 생성 및 거래 실행
      const signal = await generateEnhancedSignal(data, coinInfo);
      const settings = tradingSettingsRef.current;

      if (signal && signal.totalScore >= settings.minScore) {
        setLastSignal(signal);

        // ✅ 동적 포지션 사이징
        const allocation = signal.allocation;
        const basePositionSize =
          allocation.maxPositionSize * signal.positionSizeMultiplier;

        const config = coinConfigs[signal.symbol] || {
          isActive: true,
          buySettings: {
            enabled: true,
            buyPercentage: Math.min(basePositionSize * 100, 25), // 최대 25%
            maxPositionSize: basePositionSize * 1840000,
          },
          sellSettings: {
            enabled: true,
            sellPercentage: signal.positionSizeMultiplier * 100, // 신호 강도에 따른 매도량
            profitTarget: 8,
            stopLoss: -5,
          },
        };

        try {
          const result = await paperTradingEngine.executeSignal(signal, config);
          if (result?.executed) {
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
              `✅ ${signal.symbol} ${signal.type} 실행! 금액=${result.trade.amount?.toLocaleString()}원, 현금비율=${cashRatio}% (${signal.technicalAnalysis.signalStrength})`,
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
    ]
  );

  // -------------------------
  // 상태 리포트 (3분마다)
  // -------------------------
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      const settings = tradingSettingsRef.current;
      const allocation = calculateDynamicAllocation();
      const currentPortfolio = paperTradingEngine.getPortfolioSummary();
      const cashRatio = (
        (currentPortfolio.krw / currentPortfolio.totalValue) *
        100
      ).toFixed(1);

      addLog(
        `📊 [${tradingMode === "selected" ? "관심" : "전체"}코인] 대상=${allocation.activeCoinsCount}개, 현금=${cashRatio}%/${allocation.reserveCash * 100}%, 포지션=${(allocation.maxPositionSize * 100).toFixed(1)}%/코인 | 수신:${monitoringStatsRef.current.dataReceived} 신호:${monitoringStatsRef.current.signalsGenerated} 거래:${monitoringStatsRef.current.tradesExecuted}`,
        "info"
      );
    }, 180000); // 3분마다
    return () => clearInterval(id);
  }, [isActive, tradingMode, addLog, calculateDynamicAllocation]);

  // -------------------------
  // ✅ 동적 코인 설정 초기화
  // -------------------------
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

  // -------------------------
  // WebSocket 연결 제어
  // -------------------------
  // ✅ WebSocket 연결 시 topCoins 먼저 로드
  const startPaperTrading = useCallback(async () => {
    if (isActiveRef.current) return;
    const settings = tradingSettingsRef.current;

    // 초기화
    priceDataRef.current.clear();
    signalHistoryRef.current.clear();
    portfolioTargetRef.current.clear();

    let subscriptionList = [];
    if (tradingModeRef.current === "selected") {
      if (!selectedCoinsRef.current || selectedCoinsRef.current.length === 0) {
        addLog("❌ 관심등록된 코인이 없습니다", "error");
        return;
      }
      subscriptionList = selectedCoinsRef.current.map(
        (c) => c.market || `KRW-${c.symbol}`
      );
      addLog(`🎯 관심코인 ${subscriptionList.length}개 로드 완료`, "success");
    } else {
      // ✅ 전체코인 모드: topCoins 먼저 로드
      addLog("🔄 전체코인 목록 로딩중...", "info");
      try {
        const coins = await upbitMarketService.getInvestableCoins();
        const popular = coins
          .filter((c) => c.market?.startsWith("KRW-"))
          .slice(0, settings.maxCoinsToTrade || 8);
        setTopCoins(popular);
        subscriptionList = popular.map((c) => c.market);
        addLog(
          `🌍 전체코인 상위 ${subscriptionList.length}개 로드 완료`,
          "success"
        );
      } catch (error) {
        addLog(`❌ 전체코인 로드 실패: ${error.message}`, "error");
        return;
      }
    }

    // ✅ 할당 계산 (topCoins 로드 후)
    const allocation = calculateDynamicAllocation();
    if (allocation.activeCoinsCount === 0) {
      addLog("❌ 거래 가능한 코인이 없습니다", "error");
      return;
    }

    addLog(
      `🚀 스마트 페이퍼 트레이딩 시작! ${allocation.activeCoinsCount}개 코인 × ${(allocation.maxPositionSize * 100).toFixed(1)}% + ${allocation.reserveCash * 100}% 예비현금`,
      "success"
    );

    monitoringStatsRef.current = {
      dataReceived: 0,
      signalsGenerated: 0,
      tradesExecuted: 0,
      lastActivity: new Date().toLocaleTimeString(),
    };
    setMonitoringStats({ ...monitoringStatsRef.current });

    const ws = new WebSocket("wss://api.upbit.com/websocket/v1");
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      addLog("🔗 WebSocket 연결 성공 (지표 기반 모드)", "success");
      const req = [
        { ticket: "cryptowise-smart" },
        { type: "ticker", codes: subscriptionList },
      ];
      ws.send(JSON.stringify(req));
      addLog(
        `📡 구독 요청 전송: ${subscriptionList.length}개 코인 (스마트 거래)`,
        "info"
      );
      setIsConnected(true);
    };

    ws.onmessage = async (event) => {
      try {
        let data;
        if (event.data instanceof ArrayBuffer) {
          data = JSON.parse(new TextDecoder("utf-8").decode(event.data));
        } else if (event.data instanceof Blob) {
          const ab = await event.data.arrayBuffer();
          data = JSON.parse(new TextDecoder("utf-8").decode(ab));
        } else if (typeof event.data === "string") {
          data = JSON.parse(event.data);
        } else {
          addLog(
            `⚠️ 처리할 수 없는 데이터 형식: ${typeof event.data}`,
            "warning"
          );
          return;
        }

        if (monitoringStatsRef.current.dataReceived < 3) {
          addLog(
            `✅ 데이터 수신: ${data.code} - ${data.trade_price}원 (스마트 모드)`,
            "success"
          );
        }

        await handleMarketData(data);
      } catch (e) {
        addLog(`❌ 파싱 오류: ${e.message}`, "error");
      }
    };

    ws.onclose = (ev) => {
      setIsConnected(false);
      addLog(`🔌 연결 종료 (코드: ${ev.code})`, "warning");
      if (isActiveRef.current) {
        setTimeout(() => {
          if (isActiveRef.current) startPaperTrading();
        }, 5000);
      }
    };

    ws.onerror = (err) => {
      addLog(`❌ WebSocket 오류: ${JSON.stringify(err)}`, "error");
    };

    window.__paperTradingWebSocket = ws;
    setIsActive(true);
    isActiveRef.current = true;
    updatePortfolio();
  }, [addLog, handleMarketData, updatePortfolio, calculateDynamicAllocation]);

  const stopPaperTrading = useCallback(() => {
    if (window.__paperTradingWebSocket) {
      window.__paperTradingWebSocket.close();
      delete window.__paperTradingWebSocket;
    }

    setIsActive(false);
    isActiveRef.current = false;
    setIsConnected(false);
    addLog("⏹️ 스마트 페이퍼 트레이딩 중지", "warning");
  }, [addLog]);

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

  return {
    portfolio,
    isActive,
    isConnected,
    lastSignal,
    logs,
    availableCoins,
    interestCoins,
    coinConfigs,
    marketData,
    monitoringStats,
    tradingMode,
    setTradingMode,
    topCoins,
    tradingSettings,
    setTradingSettings,
    startPaperTrading,
    stopPaperTrading,
    toggleInterestCoin: (symbol) =>
      setInterestCoins((prev) =>
        prev.map((c) =>
          c.symbol === symbol ? { ...c, isActive: !c.isActive } : c
        )
      ),
    setCoinConfigs,
    updatePortfolio,
    resetPortfolio: () => {
      paperTradingEngine.resetPortfolio();
      priceDataRef.current.clear();
      signalHistoryRef.current.clear();
      portfolioTargetRef.current.clear();
      updatePortfolio();
      addLog("🔄 포트폴리오 및 분석 데이터 리셋 완료", "warning");
    },
    addLog,
    selectedCoinsCount: selectedCoins.length,
    hasSelectedCoins: selectedCoins.length > 0,
    debugMode,
    setDebugMode,
    generateEnhancedSignal,
  };
};

export default usePaperTrading;
