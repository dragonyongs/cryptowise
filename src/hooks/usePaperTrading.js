// src/hooks/usePaperTrading.js
import { useState, useEffect, useCallback, useRef } from "react";
import { useCoinStore } from "../stores/coinStore";
import { paperTradingEngine } from "../services/testing/paperTradingEngine";
import { upbitMarketService } from "../services/upbit/upbitMarketService";

/**
 * 안정화된 usePaperTrading 훅 (Hooks 호출 순서 고정)
 * - 모든 훅은 조건 없이 최상단에서 선언됩니다.
 * - 전역 초기화는 useEffect로 옮겨 렌더 흐름에 영향 주지 않음.
 */

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

  // Refs (also declared unconditionally)
  const selectedCoinsRef = useRef(selectedCoins);
  const tradingModeRef = useRef(tradingMode);
  const monitoringStatsRef = useRef({ ...monitoringStats });
  const isActiveRef = useRef(isActive);

  const lastLogTimeRef = useRef(new Map());
  const logIdRef = useRef(0); // 안전한 단조 증가 ID
  const recentMessagesRef = useRef(new Map()); // message -> lastTimestamp (dedupe)
  // -------------------------
  // 전역/한번 초기화: useEffect 안에서만 수행
  // -------------------------
  useEffect(() => {
    if (!window.__priceHistory) window.__priceHistory = new Map();
    if (!window.__lastDataLog) window.__lastDataLog = new Map();
  }, []);

  // -------------------------
  // 상태 <-> ref 동기화 (unconditional effects)
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

  // -------------------------
  // addLog: 중복 방지 (개발/디버그시 완화 가능)
  // -------------------------
  const addLog = useCallback(
    (msg, type = "info") => {
      const now = Date.now();

      // --- dedupe: 같은 메시지 재추가 방지 (500ms) ---
      const dedupeWindowMs = 500; // 필요시 값 조정 (개발중엔 200~500 권장)
      const lastMsgTime = recentMessagesRef.current.get(msg) || 0;
      if (now - lastMsgTime < dedupeWindowMs) {
        // 짧게는 동일 메시지 재출력을 막아 로그 폭주 방지
        return;
      }
      recentMessagesRef.current.set(msg, now);

      // --- 안전한 고유 id 생성 ---
      logIdRef.current += 1;
      // id는 문자열로 저장: "${timestamp}_${counter}"
      const id = `${now}_${logIdRef.current}`;

      // (기존의 중복시간 필터도 유지/조정 가능 — 개발모드에 너무 느슨하지 않게)
      const logKey = `${msg}_${type}`;
      const isDev = debugMode || process.env.NODE_ENV === "development";
      if (!isDev) {
        const lastTime = lastLogTimeRef.current.get(logKey) || 0;
        if (now - lastTime < 3000) return; // 기존 3초 필터
        lastLogTimeRef.current.set(logKey, now);
      }

      const newLog = {
        id, // string guaranteed unique
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
  // 포트폴리오 유틸
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
  // 간단 신호 생성 (테스트용)
  // -------------------------
  const generateTestSignal = useCallback(
    (data, coinInfo) => {
      try {
        const price = data.trade_price;
        const symbol = data.code.replace("KRW-", "");
        const changePercent = (data.signed_change_rate || 0) * 100;

        addLog(
          `🎯 ${symbol} 간단분석: 가격=${price.toLocaleString()}원, 변동률=${changePercent.toFixed(2)}%`,
          "info"
        );

        // price history 저장
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

        if (changePercent < -2) {
          signalType = "BUY";
          score = 8 + Math.random() * 1.5;
          addLog(
            `🟢 ${symbol} 매수 신호! 하락률: ${changePercent.toFixed(2)}%`,
            "success"
          );
        } else if (changePercent > 3) {
          signalType = "SELL";
          score = 8 + Math.random() * 1.0;
          addLog(
            `🔴 ${symbol} 매도 신호! 상승률: ${changePercent.toFixed(2)}%`,
            "success"
          );
        } else {
          addLog(
            `ℹ️ ${symbol} 신호 없음 (변동률 ${changePercent.toFixed(2)}% - 기준 미달)`,
            "info"
          );
        }

        if (!signalType) return null;

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
          reason: `${coinInfo?.korean_name || symbol} ${signalType} 신호 (${changePercent.toFixed(2)}%)`,
          timestamp: new Date(),
          changePercent,
        };
      } catch (error) {
        addLog(`❌ ${data.code} 신호 생성 오류: ${error.message}`, "error");
        return null;
      }
    },
    [addLog]
  );

  // -------------------------
  // 실시간 데이터 처리 (항상 동일한 함수 선언)
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
        // 정상적으로 skip (디버그가 켜지면 아래로 진행하도록 변경 가능)
        return;
      }

      const signal = generateTestSignal(data, coinInfo);
      if (signal && signal.totalScore >= 7.5) {
        setLastSignal(signal);

        const config = {
          isActive: true,
          buySettings: { enabled: true, buyPercentage: 10 },
          sellSettings: {
            enabled: true,
            sellPercentage: 100,
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
              `✅ ${signal.symbol} ${signal.type} 거래 실행! ${result.trade.amount?.toLocaleString()}원`,
              "success"
            );
            updatePortfolio();
          }
        } catch (err) {
          addLog(`❌ 거래 실행 오류: ${err.message}`, "error");
        }
      }
    },
    [addLog, generateTestSignal, topCoins, updatePortfolio, portfolio]
  );

  // -------------------------
  // 상태 리포트 (2분마다) — effect 안에서만 실행
  // -------------------------
  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => {
      addLog(
        `📊 [${tradingMode === "selected" ? "관심코인" : "전체코인"}] 수신:${monitoringStatsRef.current.dataReceived} 신호:${monitoringStatsRef.current.signalsGenerated} 거래:${monitoringStatsRef.current.tradesExecuted}`,
        "info"
      );
    }, 120000);
    return () => clearInterval(id);
  }, [isActive, tradingMode, addLog]);

  // -------------------------
  // WebSocket 연결 제어
  // -------------------------
  const startPaperTrading = useCallback(async () => {
    if (isActiveRef.current) return;
    addLog("🚀 페이퍼 트레이딩 시작", "success");

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
      addLog(`🎯 관심코인 ${subscriptionList.length}개 모니터링`, "info");
    } else {
      const coins = await upbitMarketService.getInvestableCoins();
      const popular = coins
        .filter((c) => c.market?.startsWith("KRW-"))
        .slice(0, 20);
      setTopCoins(popular);
      subscriptionList = popular.map((c) => c.market);
      addLog(`🌍 전체코인 상위 ${subscriptionList.length}개 모니터링`, "info");
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

  // coinStore 동기화 (unconditional effect)
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
