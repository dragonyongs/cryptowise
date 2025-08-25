// src/hooks/useTradingLogger.js - 전역 상태 관리 완전 버전

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { create } from "zustand";

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

// 🎯 동적 포지션 관리 관련 패턴
const SPECIAL_PATTERNS = {
  websocketData: /메시지 수신|데이터 처리|브로드캐스트/,
  priceUpdate: /가격 업데이트|₩.*원/,
  signalEvaluation: /신호 평가|조건 미달/,
  marketData: /마켓 데이터|시장 데이터/,
  dynamicPosition: /동적|포지션 관리|최적화 계획|리밸런싱/,
  positionAdjustment: /추매|감매|포지션 추가|포지션 감소/,
  riskAssessment: /리스크|위험|손절|안전/,
  cashManagement: /현금 비중|현금 관리|유동성/,
};

// 🔥 전역 로그 스토어 (Zustand)
const useGlobalLogStore = create((set, get) => ({
  logs: [],

  addLogToStore: (logEntry) => {
    console.log("🌍 전역 스토어에 로그 추가:", logEntry);
    set((state) => ({
      logs: [logEntry, ...state.logs.slice(0, 49)],
    }));
  },

  clearAllLogs: () => {
    console.log("🗑️ 전역 로그 모두 삭제");
    set({ logs: [] });
  },

  setLogs: (logs) => {
    console.log("📝 전역 로그 설정:", logs.length, "개");
    set({ logs });
  },
}));

export const useTradingLogger = (currentLogLevel = LOG_LEVELS.info) => {
  // 🔥 전역 스토어에서 로그 상태 가져오기
  const { logs, addLogToStore, clearAllLogs } = useGlobalLogStore();

  // 🎯 동적 포지션 관리 통계 (로컬 상태)
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
    // 🎯 동적 포지션 관리 통계
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

  // 🎯 동적 포지션 관리 성능 추적
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

  // 🔥 전역 로그 기반 logStats 계산
  const logStats = useMemo(() => {
    if (!Array.isArray(logs)) {
      return {
        total: 0,
        errors: 0,
        warnings: 0,
        success: 0,
        info: 0,
        debug: 0,
        recent: {
          last10min: 0,
          lastHour: 0,
          today: 0,
        },
      };
    }

    const validLogs = logs.filter((log) => log && typeof log === "object");
    const total = validLogs.length;

    // 실제 level 기반으로 정확한 카운팅
    const errors = validLogs.filter(
      (log) => (log.level || "").toLowerCase() === "error"
    ).length;
    const warnings = validLogs.filter(
      (log) => (log.level || "").toLowerCase() === "warning"
    ).length;
    const success = validLogs.filter(
      (log) => (log.level || "").toLowerCase() === "success"
    ).length;
    const info = validLogs.filter(
      (log) => (log.level || "").toLowerCase() === "info"
    ).length;
    const debug = validLogs.filter(
      (log) => (log.level || "").toLowerCase() === "debug"
    ).length;

    // 최근 시간별 통계
    const now = new Date();
    const recent = {
      last10min: validLogs.filter((log) => {
        if (!log.timestamp) return false;
        try {
          return (
            new Date(log.timestamp) > new Date(now.getTime() - 10 * 60 * 1000)
          );
        } catch {
          return false;
        }
      }).length,
      lastHour: validLogs.filter((log) => {
        if (!log.timestamp) return false;
        try {
          return (
            new Date(log.timestamp) > new Date(now.getTime() - 60 * 60 * 1000)
          );
        } catch {
          return false;
        }
      }).length,
      today: validLogs.filter((log) => {
        if (!log.timestamp) return false;
        try {
          const today = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate()
          );
          return new Date(log.timestamp) >= today;
        } catch {
          return false;
        }
      }).length,
    };

    return { total, errors, warnings, success, info, debug, recent };
  }, [logs]);

  // 🔥 초기화 시 테스트 로그 생성
  useEffect(() => {
    console.log("🚀 useTradingLogger 초기화됨");

    // 초기화 시 기본 로그 추가
    const initLog = {
      id: `init_${Date.now()}`,
      timestamp: new Date(),
      message: "🚀 CryptoWise 트레이딩 시스템 시작됨",
      level: "success",
      type: "success",
      color: LOG_COLORS.success,
      metadata: {
        sessionTime: 0,
        specialPattern: undefined,
        isDynamicEvent: false,
      },
    };

    addLogToStore(initLog);
  }, [addLogToStore]);

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

      // 로그 개수 제한 (전역 스토어 사용)
      if (logs.length > 100) {
        useGlobalLogStore.getState().setLogs(logs.slice(0, 50));
      }

      // 캐시 정리
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
  }, [logs.length]);

  // 🎯 개선된 메시지 패턴 체크
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

  // 🔥 완전히 개선된 addLog 함수 (전역 스토어 사용)
  const addLog = useCallback(
    (message, level = "info", throttleKey = null, metadata = {}) => {
      console.log("🔥 addLog 호출됨:", {
        message,
        level,
        throttleKey,
        metadata,
      });

      if (!message) {
        console.log("❌ 메시지가 비어있어서 리턴");
        return;
      }

      const numericLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
      const now = Date.now();

      console.log("🔥 로그 레벨 체크:", { numericLevel, currentLogLevel });

      // 기존 검증 로직들 모두 유지
      if (numericLevel > currentLogLevel) {
        console.log("❌ 로그 레벨이 높아서 차단됨");
        setMonitoringStats((prev) => ({
          ...prev,
          logsBlocked: prev.logsBlocked + 1,
        }));
        return;
      }

      if (level === "debug" && process.env.NODE_ENV !== "development") {
        console.log("❌ 프로덕션에서 디버그 로그 차단됨");
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

      // 스로틀링 체크
      if (specialPattern) {
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
          console.log("🔄 패턴 스로틀링으로 차단됨:", specialPattern);
          setMonitoringStats((prev) => ({
            ...prev,
            logsThrottled: prev.logsThrottled + 1,
          }));
          return;
        }

        throttleMap.current.set(patternKey, now);
      }

      // 기본 스로틀링 체크
      if (throttleKey) {
        const lastThrottleTime = throttleMap.current.get(throttleKey);
        const throttleDelay = THROTTLE_SETTINGS[level] || 5000;

        if (lastThrottleTime && now - lastThrottleTime < throttleDelay) {
          console.log("🔄 기본 스로틀링으로 차단됨:", throttleKey);
          setMonitoringStats((prev) => ({
            ...prev,
            logsThrottled: prev.logsThrottled + 1,
          }));
          return;
        }

        throttleMap.current.set(throttleKey, now);
      }

      // 중복 메시지 체크
      const messageHash = message.substring(0, 100);
      const duplicateKey = `${level}_${messageHash}`;
      const duplicateData = duplicateMap.current.get(duplicateKey);

      if (duplicateData) {
        const timeSinceLastDuplicate = now - duplicateData.lastTime;
        const minInterval = level === "error" ? 10000 : 30000;

        if (timeSinceLastDuplicate < minInterval) {
          duplicateData.count++;
          duplicateData.lastTime = now;
          console.log("🔄 중복 메시지로 차단됨");
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

      // 성능 제한 체크
      performanceRef.current.currentSecondCount++;
      if (performanceRef.current.currentSecondCount > 10) {
        console.log("⚡ 성능 제한으로 차단됨");
        setMonitoringStats((prev) => ({
          ...prev,
          logsBlocked: prev.logsBlocked + 1,
        }));
        return;
      }

      // 🔥 로그 생성 및 전역 스토어에 저장
      logIdCounter.current += 1;
      const timestamp = Date.now();
      const uniqueId = `${timestamp}_${logIdCounter.current}`;

      const logEntry = {
        id: uniqueId,
        timestamp: new Date(),
        message: String(message).substring(0, 500),
        level,
        type: level,
        color: LOG_COLORS[level] || LOG_COLORS.info,
        metadata: {
          ...metadata,
          sessionTime: timestamp - monitoringStats.sessionStartTime?.getTime(),
          specialPattern: specialPattern || undefined,
          isDynamicEvent:
            specialPattern &&
            (specialPattern.includes("dynamic") ||
              specialPattern.includes("position") ||
              specialPattern.includes("risk") ||
              specialPattern.includes("cash")),
        },
      };

      console.log("✅ 로그 생성 완료:", logEntry);

      // 🌍 전역 스토어에 저장
      addLogToStore(logEntry);

      // 콘솔 출력
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

      // 통계 업데이트
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
      addLogToStore,
    ]
  );

  // updateStats 함수
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

  // 🔥 개선된 resetStats 함수 (전역 로그 포함)
  const resetStats = useCallback(() => {
    console.log("🔄 전체 통계 및 로그 리셋 시작");

    const now = new Date();

    // 전역 로그 초기화
    clearAllLogs();

    // 로컬 캐시 초기화
    throttleMap.current.clear();
    duplicateMap.current.clear();
    messageCountMap.current.clear();

    // 통계 초기화
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
      dynamicPositionEvents: 0,
      optimizationPlansGenerated: 0,
      positionAdjustments: 0,
      riskAssessments: 0,
      cashOptimizations: 0,
    });

    // 동적 관리 성능 통계 리셋
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

    // 리셋 완료 로그 추가
    setTimeout(() => {
      addLog(
        "📊 통계 및 로그 캐시 완전 초기화 (동적 포지션 관리 포함)",
        "success"
      );
    }, 100);
  }, [addLog, clearAllLogs]);

  // 🔥 exportLogs 함수 (전역 로그 사용)
  const exportLogs = useCallback(
    (format = "json") => {
      const exportData = {
        exportTime: new Date().toISOString(),
        stats: logStats,
        logs: logs.slice(0, 200).map((log) => ({
          id: log.id,
          timestamp: log.timestamp,
          type: log.level,
          level: log.level,
          message: log.message,
          details: log.metadata,
        })),
        performance: {
          logsPerSecond: performanceRef.current.logsPerSecond,
          peakLogsPerSecond: performanceRef.current.peakLogsPerSecond,
          totalLogs: logIdCounter.current,
          throttleMapSize: throttleMap.current.size,
          duplicateMapSize: duplicateMap.current.size,
        },
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
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `crypto-wise-logs-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return exportData;
      } else if (format === "csv") {
        const csvHeaders = "timestamp,level,type,message,isDynamic";
        const csvRows = logs.map(
          (log) =>
            `"${log.timestamp.toISOString()}","${log.level}","${log.level}","${log.message.replace(/"/g, '""')}","${log.metadata?.isDynamicEvent || false}"`
        );
        const csvContent = [csvHeaders, ...csvRows].join("\n");

        const csvBlob = new Blob([csvContent], { type: "text/csv" });
        const csvUrl = URL.createObjectURL(csvBlob);
        const csvLink = document.createElement("a");
        csvLink.href = csvUrl;
        csvLink.download = `crypto-wise-logs-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(csvLink);
        csvLink.click();
        document.body.removeChild(csvLink);
        URL.revokeObjectURL(csvUrl);

        return csvContent;
      }

      return exportData;
    },
    [logs, logStats, monitoringStats]
  );

  // getFilteredLogs 함수
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

  // getLogSystemStatus 함수
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
    // 🔥 전역 상태에서 가져온 logs
    logs,
    logStats,
    monitoringStats,
    addLog,
    updateStats,
    resetStats,
    exportLogs,
    getFilteredLogs,
    getLogSystemStatus,
    performance: {
      logsPerSecond: performanceRef.current.logsPerSecond,
      peakLogsPerSecond: performanceRef.current.peakLogsPerSecond,
      totalLogs: logIdCounter.current,
      throttleMapSize: throttleMap.current.size,
      duplicateMapSize: duplicateMap.current.size,
    },
    // 🎯 동적 포지션 관리 전용 기능들
    trackDynamicEvent,
    dynamicStats: dynamicStatsRef.current,
    logLevels: LOG_LEVELS,
    logColors: LOG_COLORS,
    throttleSettings: THROTTLE_SETTINGS,
    ...(process.env.NODE_ENV === "development" && {
      debug: {
        throttleMap: throttleMap.current,
        duplicateMap: duplicateMap.current,
        specialPatterns: SPECIAL_PATTERNS,
        dynamicStats: dynamicStatsRef.current,
      },
    }),
  };
};

// 🌍 전역에서 사용할 수 있는 addLog 함수 내보내기
export const addGlobalLog = (message, level = "info", metadata = {}) => {
  const logEntry = {
    id: `global_${Date.now()}_${Math.random()}`,
    timestamp: new Date(),
    message: String(message).substring(0, 500),
    level,
    type: level,
    color: LOG_COLORS[level] || LOG_COLORS.info,
    metadata: {
      ...metadata,
      sessionTime: 0,
      specialPattern: undefined,
      isDynamicEvent: false,
    },
  };

  useGlobalLogStore.getState().addLogToStore(logEntry);
  console.log("🌍 전역 로그 추가됨:", logEntry);
};

export default useTradingLogger;
