// src/hooks/useTradingLogger.js - 로그 폭발 문제 완전 해결 버전

import { useState, useCallback, useRef, useEffect } from "react";

const LOG_LEVELS = {
  error: 0,
  success: 1,
  warning: 2,
  info: 3,
  debug: 4,
};

const LOG_COLORS = {
  error: "#ef4444",
  success: "#10b981",
  warning: "#f59e0b",
  info: "#3b82f6",
  debug: "#6b7280",
};

// ✅ 레벨별 스로틀링 설정
const THROTTLE_SETTINGS = {
  error: 0,
  success: 2000,
  warning: 5000,
  info: 10000,
  debug: 30000,
};

// 🎯 NEW: 동적 포지션 관리 관련 패턴 추가
const SPECIAL_PATTERNS = {
  websocketData: /메시지 수신|데이터 처리|브로드캐스트/,
  priceUpdate: /가격 업데이트|₩.*원/,
  signalEvaluation: /신호 평가|조건 미달/,
  marketData: /마켓 데이터|시장 데이터/,
  // 🎯 동적 포지션 관리 패턴 추가
  dynamicPosition: /동적|포지션 관리|최적화 계획|리밸런싱/,
  positionAdjustment: /추매|감매|포지션 추가|포지션 감소/,
  riskAssessment: /리스크|위험|손절|안전/,
  cashManagement: /현금 비중|현금 관리|유동성/,
};

export const useTradingLogger = (currentLogLevel = LOG_LEVELS.info) => {
  const [logs, setLogs] = useState([]);

  // 🎯 동적 포지션 관리 통계 추가
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
    logsBlocked: 0,
    logsThrottled: 0,
    // 🎯 NEW: 동적 포지션 관리 통계
    dynamicPositionEvents: 0,
    optimizationPlansGenerated: 0,
    positionAdjustments: 0,
    riskAssessments: 0,
    cashOptimizations: 0,
  });

  const logIdCounter = useRef(0);
  const throttleMap = useRef(new Map());
  const duplicateMap = useRef(new Map());
  const messageCountMap = useRef(new Map());
  const lastCleanup = useRef(Date.now());

  // 🎯 NEW: 동적 포지션 관리 성능 추적
  const dynamicStatsRef = useRef({
    lastOptimization: null,
    optimizationFrequency: 0,
    avgOptimizationTime: 0,
    successfulAdjustments: 0,
    failedAdjustments: 0,
  });

  const performanceRef = useRef({
    logsPerSecond: 0,
    lastSecond: Math.floor(Date.now() / 1000),
    currentSecondCount: 0,
    peakLogsPerSecond: 0,
  });

  // 기존 성능 카운터 업데이트 로직 유지
  useEffect(() => {
    const interval = setInterval(() => {
      const currentSecond = Math.floor(Date.now() / 1000);
      if (currentSecond !== performanceRef.current.lastSecond) {
        const logsThisSecond = performanceRef.current.currentSecondCount;
        performanceRef.current.logsPerSecond = logsThisSecond;

        if (logsThisSecond > performanceRef.current.peakLogsPerSecond) {
          performanceRef.current.peakLogsPerSecond = logsThisSecond;
        }

        performanceRef.current.currentSecondCount = 0;
        performanceRef.current.lastSecond = currentSecond;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 기존 정리 로직 유지
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();

      setLogs((prev) => {
        if (prev.length > 100) {
          return prev.slice(0, 50);
        }
        return prev;
      });

      for (const [key, timestamp] of throttleMap.current.entries()) {
        if (now - timestamp > 300000) {
          throttleMap.current.delete(key);
        }
      }

      for (const [key, data] of duplicateMap.current.entries()) {
        if (now - data.lastTime > 300000) {
          duplicateMap.current.delete(key);
        }
      }

      messageCountMap.current.clear();
      lastCleanup.current = now;

      if (process.env.NODE_ENV === "development") {
        console.log(
          `🧹 로그 캐시 정리 완료 - 스로틀맵: ${throttleMap.current.size}, 중복맵: ${duplicateMap.current.size}`
        );
      }
    }, 300000);
    return () => clearInterval(cleanup);
  }, []);

  // 🎯 개선된 메시지 패턴 체크 (동적 포지션 관리 패턴 포함)
  const checkSpecialPattern = useCallback((message) => {
    for (const [patternName, pattern] of Object.entries(SPECIAL_PATTERNS)) {
      if (pattern.test(message)) {
        return patternName;
      }
    }
    return null;
  }, []);

  // 🎯 동적 포지션 관리 이벤트 추적
  const trackDynamicEvent = useCallback((eventType, metadata = {}) => {
    const now = Date.now();

    switch (eventType) {
      case "OPTIMIZATION_PLAN":
        setMonitoringStats((prev) => ({
          ...prev,
          optimizationPlansGenerated: prev.optimizationPlansGenerated + 1,
          dynamicPositionEvents: prev.dynamicPositionEvents + 1,
        }));
        dynamicStatsRef.current.lastOptimization = now;
        break;

      case "POSITION_ADJUSTMENT":
        setMonitoringStats((prev) => ({
          ...prev,
          positionAdjustments: prev.positionAdjustments + 1,
          dynamicPositionEvents: prev.dynamicPositionEvents + 1,
        }));

        if (metadata.success) {
          dynamicStatsRef.current.successfulAdjustments++;
        } else {
          dynamicStatsRef.current.failedAdjustments++;
        }
        break;

      case "RISK_ASSESSMENT":
        setMonitoringStats((prev) => ({
          ...prev,
          riskAssessments: prev.riskAssessments + 1,
          dynamicPositionEvents: prev.dynamicPositionEvents + 1,
        }));
        break;

      case "CASH_OPTIMIZATION":
        setMonitoringStats((prev) => ({
          ...prev,
          cashOptimizations: prev.cashOptimizations + 1,
          dynamicPositionEvents: prev.dynamicPositionEvents + 1,
        }));
        break;
    }
  }, []);

  // ✅ 기존 강화된 로그 추가 함수 유지하면서 동적 이벤트 추적 추가
  const addLog = useCallback(
    (message, level = "info", throttleKey = null, metadata = {}) => {
      if (!message) return;

      const numericLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
      const now = Date.now();

      // 기존 검증 로직들 모두 유지...
      if (numericLevel > currentLogLevel) {
        setMonitoringStats((prev) => ({
          ...prev,
          logsBlocked: prev.logsBlocked + 1,
        }));
        return;
      }

      if (level === "debug" && process.env.NODE_ENV !== "development") {
        setMonitoringStats((prev) => ({
          ...prev,
          logsBlocked: prev.logsBlocked + 1,
        }));
        return;
      }

      const specialPattern = checkSpecialPattern(message);

      // 🎯 동적 포지션 관리 이벤트 자동 추적
      if (specialPattern === "dynamicPosition") {
        if (message.includes("최적화 계획")) {
          trackDynamicEvent("OPTIMIZATION_PLAN", metadata);
        } else if (message.includes("추매") || message.includes("감매")) {
          trackDynamicEvent("POSITION_ADJUSTMENT", metadata);
        }
      } else if (specialPattern === "riskAssessment") {
        trackDynamicEvent("RISK_ASSESSMENT", metadata);
      } else if (specialPattern === "cashManagement") {
        trackDynamicEvent("CASH_OPTIMIZATION", metadata);
      }

      if (specialPattern) {
        // 동적 포지션 관리 패턴은 덜 강하게 스로틀링 (30초)
        const throttleTime =
          specialPattern.includes("dynamic") ||
          specialPattern.includes("position") ||
          specialPattern.includes("risk") ||
          specialPattern.includes("cash")
            ? 30000
            : 60000;

        const patternKey = `pattern_${specialPattern}`;
        const lastPatternTime = throttleMap.current.get(patternKey);
        if (lastPatternTime && now - lastPatternTime < throttleTime) {
          setMonitoringStats((prev) => ({
            ...prev,
            logsThrottled: prev.logsThrottled + 1,
          }));
          return;
        }
        throttleMap.current.set(patternKey, now);
      }

      // 기존 스로틀링 및 중복 체크 로직 모두 유지...
      if (throttleKey) {
        const lastThrottleTime = throttleMap.current.get(throttleKey);
        const throttleDelay = THROTTLE_SETTINGS[level] || 5000;
        if (lastThrottleTime && now - lastThrottleTime < throttleDelay) {
          setMonitoringStats((prev) => ({
            ...prev,
            logsThrottled: prev.logsThrottled + 1,
          }));
          return;
        }
        throttleMap.current.set(throttleKey, now);
      }

      const messageHash = message.substring(0, 100);
      const duplicateKey = `${level}_${messageHash}`;
      const duplicateData = duplicateMap.current.get(duplicateKey);

      if (duplicateData) {
        const timeSinceLastDuplicate = now - duplicateData.lastTime;
        const minInterval = level === "error" ? 10000 : 30000;
        if (timeSinceLastDuplicate < minInterval) {
          duplicateData.count++;
          duplicateData.lastTime = now;
          setMonitoringStats((prev) => ({
            ...prev,
            logsThrottled: prev.logsThrottled + 1,
          }));
          return;
        } else {
          if (duplicateData.count > 1) {
            message = `${message} (이전 ${duplicateData.count}회 생략됨)`;
          }
          duplicateData.count = 1;
          duplicateData.lastTime = now;
        }
      } else {
        duplicateMap.current.set(duplicateKey, { count: 1, lastTime: now });
      }

      performanceRef.current.currentSecondCount++;
      if (performanceRef.current.currentSecondCount > 10) {
        setMonitoringStats((prev) => ({
          ...prev,
          logsBlocked: prev.logsBlocked + 1,
        }));
        return;
      }

      // 로그 생성
      logIdCounter.current += 1;
      const timestamp = Date.now();
      const uniqueId = `${timestamp}_${logIdCounter.current}`;

      const logEntry = {
        id: uniqueId,
        timestamp: new Date(),
        message: String(message).substring(0, 500),
        level,
        color: LOG_COLORS[level] || LOG_COLORS.info,
        metadata: {
          ...metadata,
          sessionTime: timestamp - monitoringStats.sessionStartTime?.getTime(),
          specialPattern: specialPattern || undefined,
          // 🎯 NEW: 동적 포지션 관리 관련 메타데이터
          isDynamicEvent:
            specialPattern &&
            (specialPattern.includes("dynamic") ||
              specialPattern.includes("position") ||
              specialPattern.includes("risk") ||
              specialPattern.includes("cash")),
        },
      };

      setLogs((prev) => [logEntry, ...prev.slice(0, 49)]);

      const shouldConsoleLog =
        process.env.NODE_ENV === "development" ||
        level === "error" ||
        level === "success";

      if (shouldConsoleLog) {
        const emoji =
          {
            error: "❌",
            success: "✅",
            warning: "⚠️",
            info: "ℹ️",
            debug: "🐛",
          }[level] || "ℹ️";
        console.log(`${emoji} [${level.toUpperCase()}] ${message}`, metadata);
      }

      setMonitoringStats((prev) => ({
        ...prev,
        lastActivity: new Date().toLocaleTimeString(),
      }));
    },
    [
      currentLogLevel,
      checkSpecialPattern,
      monitoringStats.sessionStartTime,
      trackDynamicEvent,
    ]
  );

  // 기존 updateStats, resetStats 함수들 유지하되 동적 관리 통계 추가
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

  const resetStats = useCallback(() => {
    const now = new Date();
    throttleMap.current.clear();
    duplicateMap.current.clear();
    messageCountMap.current.clear();

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
      logsBlocked: 0,
      logsThrottled: 0,
      // 🎯 동적 포지션 관리 통계 리셋
      dynamicPositionEvents: 0,
      optimizationPlansGenerated: 0,
      positionAdjustments: 0,
      riskAssessments: 0,
      cashOptimizations: 0,
    });

    // 🎯 동적 관리 성능 통계 리셋
    dynamicStatsRef.current = {
      lastOptimization: null,
      optimizationFrequency: 0,
      avgOptimizationTime: 0,
      successfulAdjustments: 0,
      failedAdjustments: 0,
    };

    performanceRef.current = {
      logsPerSecond: 0,
      lastSecond: Math.floor(Date.now() / 1000),
      currentSecondCount: 0,
      peakLogsPerSecond: 0,
    };

    addLog(
      "📊 통계 및 로그 캐시 완전 초기화 (동적 포지션 관리 포함)",
      "success"
    );
  }, [addLog]);

  // 기존 함수들 유지 (exportLogs, getFilteredLogs, getLogSystemStatus)...
  const exportLogs = useCallback(
    (format = "json") => {
      const exportData = {
        exportTime: new Date().toISOString(),
        stats: monitoringStats,
        logs: logs.slice(0, 200),
        performance: {
          logsPerSecond: performanceRef.current.logsPerSecond,
          peakLogsPerSecond: performanceRef.current.peakLogsPerSecond,
          totalLogs: logIdCounter.current,
          throttleMapSize: throttleMap.current.size,
          duplicateMapSize: duplicateMap.current.size,
        },
        // 🎯 동적 포지션 관리 성능 데이터 추가
        dynamicPositionPerformance: {
          ...dynamicStatsRef.current,
          adjustmentSuccessRate:
            dynamicStatsRef.current.successfulAdjustments +
              dynamicStatsRef.current.failedAdjustments >
            0
              ? (
                  (dynamicStatsRef.current.successfulAdjustments /
                    (dynamicStatsRef.current.successfulAdjustments +
                      dynamicStatsRef.current.failedAdjustments)) *
                  100
                ).toFixed(1) + "%"
              : "0%",
        },
        cacheInfo: {
          throttledLogs: monitoringStats.logsThrottled,
          blockedLogs: monitoringStats.logsBlocked,
          cacheSize: throttleMap.current.size + duplicateMap.current.size,
        },
      };

      if (format === "json") {
        return JSON.stringify(exportData, null, 2);
      } else if (format === "csv") {
        const csvHeaders =
          "timestamp,level,message,blocked,throttled,isDynamic";
        const csvRows = logs.map(
          (log) =>
            `"${log.timestamp.toISOString()}","${log.level}","${log.message.replace(/"/g, '""')}","${log.metadata?.isDynamicEvent || false}"`
        );
        return [csvHeaders, ...csvRows].join("\n");
      }
      return exportData;
    },
    [logs, monitoringStats]
  );

  const getFilteredLogs = useCallback(
    (filterLevel = null, searchTerm = null, filterDynamic = null) => {
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

      // 🎯 NEW: 동적 포지션 관리 필터 추가
      if (filterDynamic === true) {
        filtered = filtered.filter(
          (log) => log.metadata?.isDynamicEvent === true
        );
      } else if (filterDynamic === false) {
        filtered = filtered.filter((log) => !log.metadata?.isDynamicEvent);
      }

      return filtered;
    },
    [logs]
  );

  // 🎯 개선된 시스템 상태 정보 (동적 관리 통계 포함)
  const getLogSystemStatus = useCallback(() => {
    const totalAdjustments =
      dynamicStatsRef.current.successfulAdjustments +
      dynamicStatsRef.current.failedAdjustments;

    return {
      isHealthy: performanceRef.current.logsPerSecond < 5,
      logsPerSecond: performanceRef.current.logsPerSecond,
      peakLogsPerSecond: performanceRef.current.peakLogsPerSecond,
      totalLogs: logIdCounter.current,
      activeThrottles: throttleMap.current.size,
      duplicatesTracked: duplicateMap.current.size,
      blockedPercentage:
        (monitoringStats.logsBlocked / (logIdCounter.current || 1)) * 100,
      throttledPercentage:
        (monitoringStats.logsThrottled / (logIdCounter.current || 1)) * 100,
      memoryUsage: `${Math.round(((throttleMap.current.size + duplicateMap.current.size) * 50) / 1024)} KB`,
      // 🎯 NEW: 동적 포지션 관리 상태
      dynamicPositionHealth: {
        totalEvents: monitoringStats.dynamicPositionEvents,
        optimizationPlans: monitoringStats.optimizationPlansGenerated,
        positionAdjustments: monitoringStats.positionAdjustments,
        riskAssessments: monitoringStats.riskAssessments,
        cashOptimizations: monitoringStats.cashOptimizations,
        adjustmentSuccessRate:
          totalAdjustments > 0
            ? `${((dynamicStatsRef.current.successfulAdjustments / totalAdjustments) * 100).toFixed(1)}%`
            : "0%",
        lastOptimization: dynamicStatsRef.current.lastOptimization
          ? new Date(dynamicStatsRef.current.lastOptimization).toLocaleString()
          : "None",
      },
    };
  }, [monitoringStats]);

  return {
    // 기존 반환값 모두 유지
    logs,
    monitoringStats,
    addLog,
    updateStats,
    resetStats,
    exportLogs,
    getFilteredLogs, // 🎯 동적 필터 기능 추가됨
    getLogSystemStatus, // 🎯 동적 관리 상태 정보 추가됨

    performance: {
      logsPerSecond: performanceRef.current.logsPerSecond,
      peakLogsPerSecond: performanceRef.current.peakLogsPerSecond,
      totalLogs: logIdCounter.current,
      throttleMapSize: throttleMap.current.size,
      duplicateMapSize: duplicateMap.current.size,
    },

    // 🎯 NEW: 동적 포지션 관리 전용 기능들
    trackDynamicEvent,
    dynamicStats: dynamicStatsRef.current,

    logLevels: LOG_LEVELS,
    logColors: LOG_COLORS,
    throttleSettings: THROTTLE_SETTINGS,

    ...(process.env.NODE_ENV === "development" && {
      debug: {
        throttleMap: throttleMap.current,
        duplicateMap: duplicateMap.current,
        specialPatterns: SPECIAL_PATTERNS, // 🎯 동적 패턴 포함
        dynamicStats: dynamicStatsRef.current,
      },
    }),
  };
};

export default useTradingLogger;
