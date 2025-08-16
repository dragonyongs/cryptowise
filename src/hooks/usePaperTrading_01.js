import { useState, useEffect, useCallback, useRef } from "react";
import { useCoinStore } from "../stores/coinStore";
import { paperTradingEngine } from "../services/testing/paperTradingEngine";
import { upbitMarketService } from "../services/upbit/upbitMarketService";

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

  // ✅ 새로 추가: 매매 조건 설정 상태
  const [tradingSettings, setTradingSettings] = useState({
    buyThreshold: -1.0, // -1% 하락시 매수
    sellThreshold: 0.8, // 0.8% 상승시 매도
    rsiOversold: 30,
    rsiOverbought: 70,
    volumeThreshold: 1.5,
    minScore: 7.5,
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
  // ✅ 설정 기반 신호 생성 (하드코딩 제거)
  // -------------------------
  const generateConfigurableSignal = useCallback(
    (data, coinInfo) => {
      try {
        const price = data.trade_price;
        const symbol = data.code.replace("KRW-", "");
        const changePercent = (data.signed_change_rate || 0) * 100;
        const settings = tradingSettingsRef.current;

        addLog(
          `🎯 ${symbol} 분석: 가격=${price.toLocaleString()}원, 변동률=${changePercent.toFixed(2)}%, 기준(매수<${settings.buyThreshold}%, 매도>${settings.sellThreshold}%)`,
          "info"
        );

        // 가격 히스토리 저장
        if (!window.__priceHistory.has(symbol))
          window.__priceHistory.set(symbol, []);
        const ph = window.__priceHistory.get(symbol);
        ph.push(price);
        if (ph.length > 20) ph.shift();

        if (ph.length < 5) {
          addLog(`⏳ ${symbol} 데이터 수집중... (${ph.length}/5)`, "info");
          return null;
        }

        let signalType = null;
        let score = 0;

        // ✅ 설정 기반 매수/매도 조건
        if (changePercent <= settings.buyThreshold) {
          signalType = "BUY";
          score = Math.min(8 + Math.abs(changePercent) * 0.5, 10);
          addLog(
            `🟢 ${symbol} 매수 신호! 하락률: ${changePercent.toFixed(2)}% (기준: ${settings.buyThreshold}% 이하)`,
            "success"
          );
        } else if (changePercent >= settings.sellThreshold) {
          signalType = "SELL";
          score = Math.min(8 + changePercent * 0.3, 10);
          addLog(
            `🔴 ${symbol} 매도 신호! 상승률: ${changePercent.toFixed(2)}% (기준: ${settings.sellThreshold}% 이상)`,
            "success"
          );
        } else {
          addLog(
            `ℹ️ ${symbol} 신호 없음 (변동률 ${changePercent.toFixed(2)}% - 범위: 매수<${settings.buyThreshold}%, 매도>${settings.sellThreshold}%)`,
            "info"
          );
        }

        if (!signalType) return null;

        // 추가 검증: RSI 기반 필터링 (가상의 RSI 계산)
        const simpleRSI = 50 + changePercent * 2; // 간단한 RSI 근사값

        if (signalType === "BUY" && simpleRSI > settings.rsiOversold + 20) {
          addLog(
            `⚠️ ${symbol} 매수 신호 RSI 필터링: ${simpleRSI.toFixed(1)} > ${settings.rsiOversold + 20}`,
            "warning"
          );
          return null;
        }

        if (signalType === "SELL" && simpleRSI < settings.rsiOverbought - 20) {
          addLog(
            `⚠️ ${symbol} 매도 신호 RSI 필터링: ${simpleRSI.toFixed(1)} < ${settings.rsiOverbought - 20}`,
            "warning"
          );
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
          totalScore: score,
          reason: `${coinInfo?.korean_name || symbol} ${signalType} 신호 (변동률: ${changePercent.toFixed(2)}%, 설정: ${settings.strategy})`,
          timestamp: new Date(),
          changePercent,
          settings: { ...settings },
        };
      } catch (error) {
        addLog(`❌ ${data.code} 신호 생성 오류: ${error.message}`, "error");
        return null;
      }
    },
    [addLog]
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
      if (now - last > 5000) {
        const cp = (data.signed_change_rate || 0) * 100;
        const icon = cp >= 0 ? "📈" : "📉";
        addLog(
          `${icon} ${symbol}: ${data.trade_price.toLocaleString()}원 (${cp >= 0 ? "+" : ""}${cp.toFixed(2)}%)`,
          cp >= 0 ? "success" : "error"
        );
        window.__lastDataLog.set(symbol, now);
      }

      setMarketData((prev) => new Map(prev.set(symbol, data)));

      // ✅ 보유 코인 실시간 가격 업데이트
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

      // ✅ 설정 기반 신호 생성 및 거래 실행
      const signal = generateConfigurableSignal(data, coinInfo);
      const settings = tradingSettingsRef.current;

      if (signal && signal.totalScore >= settings.minScore) {
        setLastSignal(signal); // ✅ 최근 신호 탭에 표시

        // ✅ 코인별 설정 (기본값 제공)
        const config = coinConfigs[signal.symbol] || {
          isActive: true,
          buySettings: {
            enabled: true,
            buyPercentage: 10, // 10%만 매수
            maxPositionSize: 184000, // 최대 18만원
          },
          sellSettings: {
            enabled: true,
            sellPercentage: 100, // 전량 매도
            profitTarget: 5,
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

            addLog(
              `✅ ${signal.symbol} ${signal.type} 거래 실행! ${result.trade.amount?.toLocaleString()}원 (설정: ${settings.strategy})`,
              "success"
            );

            // ✅ 포트폴리오 즉시 업데이트
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
      generateConfigurableSignal,
      topCoins,
      updatePortfolio,
      portfolio,
      coinConfigs,
      debugMode,
    ]
  );

  // -------------------------
  // 상태 리포트 (2분마다)
  // -------------------------
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      const settings = tradingSettingsRef.current;
      addLog(
        `📊 [${tradingMode === "selected" ? "관심코인" : "전체코인"}] 수신:${monitoringStatsRef.current.dataReceived} 신호:${monitoringStatsRef.current.signalsGenerated} 거래:${monitoringStatsRef.current.tradesExecuted} (${settings.strategy} 전략)`,
        "info"
      );
    }, 120000);
    return () => clearInterval(id);
  }, [isActive, tradingMode, addLog]);

  // -------------------------
  // ✅ 코인 설정 기본값 초기화
  // -------------------------
  useEffect(() => {
    if (selectedCoins.length > 0) {
      const defaultConfigs = {};
      selectedCoins.forEach((coin) => {
        const symbol = coin.symbol || coin.market?.replace("KRW-", "");
        if (symbol) {
          defaultConfigs[symbol] = {
            isActive: true,
            buySettings: {
              enabled: true,
              buyPercentage: 10,
              maxPositionSize: 184000,
            },
            sellSettings: {
              enabled: true,
              sellPercentage: 100,
              profitTarget: 5,
              stopLoss: -5,
            },
          };
        }
      });
      setCoinConfigs(defaultConfigs);
    }
  }, [selectedCoins]);

  // -------------------------
  // WebSocket 연결 제어
  // -------------------------
  const startPaperTrading = useCallback(async () => {
    if (isActiveRef.current) return;
    const settings = tradingSettingsRef.current;
    addLog(`🚀 페이퍼 트레이딩 시작 (${settings.strategy} 전략)`, "success");

    monitoringStatsRef.current = {
      dataReceived: 0,
      signalsGenerated: 0,
      tradesExecuted: 0,
      lastActivity: new Date().toLocaleTimeString(),
    };
    setMonitoringStats({ ...monitoringStatsRef.current });

    let subscriptionList = [];
    if (tradingModeRef.current === "selected") {
      if (!selectedCoinsRef.current || selectedCoinsRef.current.length === 0) {
        addLog("❌ 관심등록된 코인이 없습니다", "error");
        return;
      }

      subscriptionList = selectedCoinsRef.current.map(
        (c) => c.market || `KRW-${c.symbol}`
      );
      addLog(
        `🎯 관심코인 ${subscriptionList.length}개 모니터링 (매수<${settings.buyThreshold}%, 매도>${settings.sellThreshold}%)`,
        "info"
      );
    } else {
      const coins = await upbitMarketService.getInvestableCoins();
      const popular = coins
        .filter((c) => c.market?.startsWith("KRW-"))
        .slice(0, 20);
      setTopCoins(popular);
      subscriptionList = popular.map((c) => c.market);
      addLog(
        `🌍 전체코인 상위 ${subscriptionList.length}개 모니터링 (${settings.strategy} 전략)`,
        "info"
      );
    }

    const ws = new WebSocket("wss://api.upbit.com/websocket/v1");
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      addLog("🔗 WebSocket 연결 성공", "success");
      const req = [
        { ticket: "cryptowise" },
        { type: "ticker", codes: subscriptionList },
      ];
      ws.send(JSON.stringify(req));
      addLog(`📡 구독 요청 전송: ${subscriptionList.length}개 코인`, "info");
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
            `✅ 데이터 수신: ${data.code} - ${data.trade_price}원`,
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
  }, [addLog, handleMarketData, updatePortfolio]);

  const stopPaperTrading = useCallback(() => {
    if (window.__paperTradingWebSocket) {
      window.__paperTradingWebSocket.close();
      delete window.__paperTradingWebSocket;
    }

    setIsActive(false);
    isActiveRef.current = false;
    setIsConnected(false);
    addLog("⏹️ 페이퍼 트레이딩 중지", "warning");
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
    tradingSettings, // ✅ 새로 추가
    setTradingSettings, // ✅ 새로 추가
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
      updatePortfolio();
      addLog("🔄 포트폴리오 리셋 완료", "warning");
    },
    addLog,
    selectedCoinsCount: selectedCoins.length,
    hasSelectedCoins: selectedCoins.length > 0,
    debugMode,
    setDebugMode,
  };
};

export default usePaperTrading;
