// src/hooks/useTradingLogger.js - 로깅 시스템 전용 훅
import { useState, useCallback, useRef } from "react";

const LOG_LEVELS = {
  ERROR: 0,
  WARNING: 1,
  SUCCESS: 2,
  INFO: 3,
  DEBUG: 4,
};

export const useTradingLogger = (currentLogLevel = LOG_LEVELS.INFO) => {
  const [logs, setLogs] = useState([]);
  const [monitoringStats, setMonitoringStats] = useState({
    dataReceived: 0,
    signalsGenerated: 0,
    tradesExecuted: 0,
    signalsRejected: 0,
    lastActivity: null,
    signalsEvaluated: 0,
    conditionsMet: 0,
    marketConditionsChecked: 0,
  });

  const logIdCounter = useRef(0);
  const logThrottle = useRef(new Map());

  const addLog = useCallback(
    (msg, type = "info", throttleKey = null) => {
      const typeLevel =
        {
          error: LOG_LEVELS.ERROR,
          warning: LOG_LEVELS.WARNING,
          success: LOG_LEVELS.SUCCESS,
          info: LOG_LEVELS.INFO,
          debug: LOG_LEVELS.DEBUG,
          sentiment: LOG_LEVELS.INFO,
        }[type] || LOG_LEVELS.INFO;

      if (typeLevel > currentLogLevel) return;

      // 스로틀링 - 같은 메시지 반복 방지 (5초 쿨다운)
      if (throttleKey) {
        const now = Date.now();
        const lastLogged = logThrottle.current.get(throttleKey);

        if (lastLogged && now - lastLogged < 5000) {
          return; // 5초 내 같은 로그는 무시
        }

        logThrottle.current.set(throttleKey, now);
      }

      logIdCounter.current += 1;
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 100000);
      const counter = logIdCounter.current;
      const uniqueId = `${timestamp}_${counter}_${random}_${type}`;

      const newLog = {
        id: uniqueId,
        timestamp: new Date(),
        message: msg,
        type,
      };

      setLogs((prev) => [newLog, ...prev.slice(0, 29)]); // 최대 30개만 유지
      console.log(`[${type.toUpperCase()}] ${msg}`);

      setMonitoringStats((prev) => ({
        ...prev,
        lastActivity: new Date().toLocaleTimeString(),
      }));
    },
    [currentLogLevel]
  );

  const updateStats = useCallback((updates) => {
    setMonitoringStats((prev) => {
      if (typeof updates === "function") {
        return updates(prev); // 함수형 업데이트 지원
      }
      return { ...prev, ...updates }; // 객체 업데이트 지원
    });
  }, []);

  const resetStats = useCallback(() => {
    setMonitoringStats({
      dataReceived: 0,
      signalsGenerated: 0,
      tradesExecuted: 0,
      signalsRejected: 0,
      lastActivity: new Date().toLocaleTimeString(),
      signalsEvaluated: 0,
      conditionsMet: 0,
      marketConditionsChecked: 0,
    });
  }, []);

  return {
    logs,
    monitoringStats,
    addLog,
    updateStats,
    resetStats,
  };
};
