// src/hooks/useTradingLogger.js - 완전 개선된 로깅 시스템

import { useState, useCallback, useRef, useEffect } from "react";

/**
 * 트레이딩 로깅 시스템 훅
 * - 성능 최적화된 로깅
 * - 자동 로그 정리
 * - 상세한 통계 추적
 * - 테스트 모드 지원
 */

const LOG_LEVELS = {
  error: 0,
  warning: 1,
  success: 2,
  info: 3,
  debug: 4,
};

const LOG_COLORS = {
  error: "#ef4444",
  warning: "#f59e0b",
  success: "#10b981",
  info: "#3b82f6",
  debug: "#6b7280",
};

export const useTradingLogger = (currentLogLevel = LOG_LEVELS.info) => {
  const [logs, setLogs] = useState([]);
  const [monitoringStats, setMonitoringStats] = useState({
    dataReceived: 0,
    signalsGenerated: 0,
    signalsEvaluated: 0,
    signalsRejected: 0,
    tradesExecuted: 0,
    conditionsMet: 0,
    marketConditionsChecked: 0,
    lastActivity: null,
    sessionStartTime: new Date(),
  });

  const logIdCounter = useRef(0);
  const logThrottle = useRef(new Map());
  const performanceRef = useRef({
    logsPerSecond: 0,
    lastSecond: Math.floor(Date.now() / 1000),
    currentSecondCount: 0,
  });

  // ✅ 성능 모니터링
  useEffect(() => {
    const interval = setInterval(() => {
      const currentSecond = Math.floor(Date.now() / 1000);
      if (currentSecond !== performanceRef.current.lastSecond) {
        performanceRef.current.logsPerSecond =
          performanceRef.current.currentSecondCount;
        performanceRef.current.currentSecondCount = 0;
        performanceRef.current.lastSecond = currentSecond;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ✅ 자동 로그 정리
  useEffect(() => {
    const cleanup = setInterval(() => {
      setLogs((prev) => {
        if (prev.length > 100) {
          return prev.slice(0, 50); // 100개가 넘으면 50개로 줄임
        }
        return prev;
      });

      // 스로틀 맵 정리
      const now = Date.now();
      for (const [key, timestamp] of logThrottle.current.entries()) {
        if (now - timestamp > 300000) {
          // 5분 이상 된 항목 제거
          logThrottle.current.delete(key);
        }
      }
    }, 60000); // 1분마다

    return () => clearInterval(cleanup);
  }, []);

  // ✅ 개선된 로그 추가
  const addLog = useCallback(
    (message, level = "info", throttleKey = null, metadata = {}) => {
      if (!message) return;

      const numericLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;

      // 로그 레벨 체크
      if (numericLevel > currentLogLevel) return;

      // ✅ 스로틀링 (같은 메시지 반복 방지)
      if (throttleKey) {
        const now = Date.now();
        const lastLogged = logThrottle.current.get(throttleKey);
        if (lastLogged && now - lastLogged < 5000) {
          // 5초 스로틀
          return;
        }
        logThrottle.current.set(throttleKey, now);
      }

      // ✅ 성능 카운터 업데이트
      performanceRef.current.currentSecondCount++;

      // ✅ 고유 ID 생성
      logIdCounter.current += 1;
      const timestamp = Date.now();
      const uniqueId = `${timestamp}_${logIdCounter.current}_${Math.floor(Math.random() * 1000)}`;

      // ✅ 로그 객체 생성
      const logEntry = {
        id: uniqueId,
        timestamp: new Date(),
        message: String(message).substring(0, 500), // 메시지 길이 제한
        level,
        color: LOG_COLORS[level] || LOG_COLORS.info,
        metadata: {
          ...metadata,
          sessionTime: timestamp - monitoringStats.sessionStartTime?.getTime(),
        },
      };

      // ✅ 상태 업데이트 (성능 최적화)
      setLogs((prev) => [logEntry, ...prev.slice(0, 49)]); // 최대 50개 유지

      // ✅ 콘솔 로그 (환경에 따라)
      if (process.env.NODE_ENV === "development" || level === "error") {
        const emoji =
          {
            error: "❌",
            warning: "⚠️",
            success: "✅",
            info: "ℹ️",
            debug: "🐛",
          }[level] || "ℹ️";

        console.log(`${emoji} [${level.toUpperCase()}] ${message}`, metadata);
      }

      // ✅ 마지막 활동 시간 업데이트
      setMonitoringStats((prev) => ({
        ...prev,
        lastActivity: new Date().toLocaleTimeString(),
      }));
    },
    [currentLogLevel, monitoringStats.sessionStartTime]
  );

  // ✅ 통계 업데이트 (성능 최적화)
  const updateStats = useCallback((updateFunction) => {
    setMonitoringStats((prev) => {
      if (typeof updateFunction === "function") {
        return {
          ...updateFunction(prev),
          lastActivity: new Date().toLocaleTimeString(),
        };
      } else if (typeof updateFunction === "object") {
        return {
          ...prev,
          ...updateFunction,
          lastActivity: new Date().toLocaleTimeString(),
        };
      }
      return prev;
    });
  }, []);

  // ✅ 통계 리셋
  const resetStats = useCallback(() => {
    const now = new Date();
    setMonitoringStats({
      dataReceived: 0,
      signalsGenerated: 0,
      signalsEvaluated: 0,
      signalsRejected: 0,
      tradesExecuted: 0,
      conditionsMet: 0,
      marketConditionsChecked: 0,
      lastActivity: now.toLocaleTimeString(),
      sessionStartTime: now,
    });

    addLog("📊 통계 초기화 완료", "info");
  }, [addLog]);

  // ✅ 로그 내보내기
  const exportLogs = useCallback(
    (format = "json") => {
      const exportData = {
        exportTime: new Date().toISOString(),
        stats: monitoringStats,
        logs: logs.slice(0, 100), // 최근 100개만
        performance: {
          logsPerSecond: performanceRef.current.logsPerSecond,
          totalLogs: logIdCounter.current,
        },
      };

      if (format === "json") {
        return JSON.stringify(exportData, null, 2);
      } else if (format === "csv") {
        const csvHeaders = "timestamp,level,message";
        const csvRows = logs.map(
          (log) =>
            `"${log.timestamp.toISOString()}","${log.level}","${log.message.replace(/"/g, '""')}"`
        );
        return [csvHeaders, ...csvRows].join("\n");
      }

      return exportData;
    },
    [logs, monitoringStats]
  );

  // ✅ 로그 필터링
  const getFilteredLogs = useCallback(
    (filterLevel = null, searchTerm = null) => {
      let filtered = logs;

      if (filterLevel && LOG_LEVELS[filterLevel] !== undefined) {
        filtered = filtered.filter(
          (log) => LOG_LEVELS[log.level] <= LOG_LEVELS[filterLevel]
        );
      }

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter((log) =>
          log.message.toLowerCase().includes(term)
        );
      }

      return filtered;
    },
    [logs]
  );

  return {
    // 기본 반환값
    logs,
    monitoringStats,
    addLog,
    updateStats,
    resetStats,

    // ✅ 추가 기능
    exportLogs,
    getFilteredLogs,

    // ✅ 성능 정보
    performance: {
      logsPerSecond: performanceRef.current.logsPerSecond,
      totalLogs: logIdCounter.current,
      throttleMapSize: logThrottle.current.size,
    },

    // ✅ 유틸리티
    logLevels: LOG_LEVELS,
    logColors: LOG_COLORS,
  };
};
