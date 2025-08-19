// src/hooks/useTradingLogger.js - 로그 폭발 문제 완전 해결 버전

import { useState, useCallback, useRef, useEffect } from "react";

/**
 * 로그 폭발 방지 트레이딩 로깅 시스템
 * - 강화된 스로틀링으로 중복 로그 차단
 * - 레벨별 세밀한 제어
 * - 자동 로그 정리 및 성능 최적화
 * - 개발/운영 환경별 차별화
 */

const LOG_LEVELS = {
  error: 0, // 에러 - 항상 표시
  success: 1, // 성공 - 중요한 이벤트
  warning: 2, // 경고 - 주의 필요
  info: 3, // 정보 - 일반 정보
  debug: 4, // 디버그 - 개발환경만
};

const LOG_COLORS = {
  error: "#ef4444",
  success: "#10b981",
  warning: "#f59e0b",
  info: "#3b82f6",
  debug: "#6b7280",
};

// ✅ 레벨별 스로틀링 설정 (밀리초)
const THROTTLE_SETTINGS = {
  error: 0, // 에러는 스로틀링 없음
  success: 2000, // 성공은 2초
  warning: 5000, // 경고는 5초
  info: 10000, // 정보는 10초
  debug: 30000, // 디버그는 30초
};

// ✅ 특별 처리할 메시지 패턴
const SPECIAL_PATTERNS = {
  websocketData: /메시지 수신|데이터 처리|브로드캐스트/,
  priceUpdate: /가격 업데이트|₩.*원/,
  signalEvaluation: /신호 평가|조건 미달/,
  marketData: /마켓 데이터|시장 데이터/,
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
    logsBlocked: 0, // 차단된 로그 수
    logsThrottled: 0, // 스로틀링된 로그 수
  });

  // ✅ 참조 변수들
  const logIdCounter = useRef(0);
  const throttleMap = useRef(new Map()); // 스로틀링 맵
  const duplicateMap = useRef(new Map()); // 중복 체크 맵
  const messageCountMap = useRef(new Map()); // 메시지 카운트
  const lastCleanup = useRef(Date.now());

  // ✅ 성능 모니터링
  const performanceRef = useRef({
    logsPerSecond: 0,
    lastSecond: Math.floor(Date.now() / 1000),
    currentSecondCount: 0,
    peakLogsPerSecond: 0,
  });

  // ✅ 성능 카운터 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      const currentSecond = Math.floor(Date.now() / 1000);
      if (currentSecond !== performanceRef.current.lastSecond) {
        const logsThisSecond = performanceRef.current.currentSecondCount;
        performanceRef.current.logsPerSecond = logsThisSecond;

        // 피크 기록
        if (logsThisSecond > performanceRef.current.peakLogsPerSecond) {
          performanceRef.current.peakLogsPerSecond = logsThisSecond;
        }

        performanceRef.current.currentSecondCount = 0;
        performanceRef.current.lastSecond = currentSecond;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ✅ 정기 캐시 정리 (5분마다)
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();

      // 로그 개수 제한 (최대 100개)
      setLogs((prev) => {
        if (prev.length > 100) {
          return prev.slice(0, 50);
        }
        return prev;
      });

      // 오래된 스로틀링 데이터 정리
      for (const [key, timestamp] of throttleMap.current.entries()) {
        if (now - timestamp > 300000) {
          // 5분
          throttleMap.current.delete(key);
        }
      }

      // 오래된 중복 체크 데이터 정리
      for (const [key, data] of duplicateMap.current.entries()) {
        if (now - data.lastTime > 300000) {
          // 5분
          duplicateMap.current.delete(key);
        }
      }

      // 메시지 카운트 정리
      messageCountMap.current.clear();

      lastCleanup.current = now;

      // 정리 완료 로그 (개발환경에서만)
      if (process.env.NODE_ENV === "development") {
        console.log(
          `🧹 로그 캐시 정리 완료 - 스로틀맵: ${throttleMap.current.size}, 중복맵: ${duplicateMap.current.size}`
        );
      }
    }, 300000); // 5분마다

    return () => clearInterval(cleanup);
  }, []);

  // ✅ 메시지 패턴 체크
  const checkSpecialPattern = useCallback((message) => {
    for (const [patternName, pattern] of Object.entries(SPECIAL_PATTERNS)) {
      if (pattern.test(message)) {
        return patternName;
      }
    }
    return null;
  }, []);

  // ✅ 강화된 로그 추가 함수
  const addLog = useCallback(
    (message, level = "info", throttleKey = null, metadata = {}) => {
      if (!message) return;

      const numericLevel = LOG_LEVELS[level] ?? LOG_LEVELS.info;
      const now = Date.now();

      // ✅ 1. 로그 레벨 체크
      if (numericLevel > currentLogLevel) {
        setMonitoringStats((prev) => ({
          ...prev,
          logsBlocked: prev.logsBlocked + 1,
        }));
        return;
      }

      // ✅ 2. 개발환경이 아닐 때 디버그 차단
      if (level === "debug" && process.env.NODE_ENV !== "development") {
        setMonitoringStats((prev) => ({
          ...prev,
          logsBlocked: prev.logsBlocked + 1,
        }));
        return;
      }

      // ✅ 3. 특별 패턴 체크 (웹소켓, 가격 데이터 등)
      const specialPattern = checkSpecialPattern(message);
      if (specialPattern) {
        // 웹소켓/가격 데이터는 매우 강하게 스로틀링 (60초)
        const patternKey = `pattern_${specialPattern}`;
        const lastPatternTime = throttleMap.current.get(patternKey);
        if (lastPatternTime && now - lastPatternTime < 60000) {
          setMonitoringStats((prev) => ({
            ...prev,
            logsThrottled: prev.logsThrottled + 1,
          }));
          return;
        }
        throttleMap.current.set(patternKey, now);
      }

      // ✅ 4. 커스텀 스로틀링 키 체크
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

      // ✅ 5. 중복 메시지 체크 (더 강화됨)
      const messageHash = message.substring(0, 100); // 처음 100자로 해시
      const duplicateKey = `${level}_${messageHash}`;
      const duplicateData = duplicateMap.current.get(duplicateKey);

      if (duplicateData) {
        const timeSinceLastDuplicate = now - duplicateData.lastTime;
        const minInterval = level === "error" ? 10000 : 30000; // 에러는 10초, 나머지는 30초

        if (timeSinceLastDuplicate < minInterval) {
          // 중복 카운트 증가
          duplicateData.count++;
          duplicateData.lastTime = now;
          setMonitoringStats((prev) => ({
            ...prev,
            logsThrottled: prev.logsThrottled + 1,
          }));
          return;
        } else {
          // 시간이 지났으면 카운트 정보 포함해서 로그
          if (duplicateData.count > 1) {
            message = `${message} (이전 ${duplicateData.count}회 생략됨)`;
          }
          duplicateData.count = 1;
          duplicateData.lastTime = now;
        }
      } else {
        duplicateMap.current.set(duplicateKey, { count: 1, lastTime: now });
      }

      // ✅ 6. 초당 로그 제한 (폭발 방지)
      performanceRef.current.currentSecondCount++;
      if (performanceRef.current.currentSecondCount > 10) {
        // 초당 최대 10개
        setMonitoringStats((prev) => ({
          ...prev,
          logsBlocked: prev.logsBlocked + 1,
        }));
        return;
      }

      // ✅ 7. 로그 생성 및 추가
      logIdCounter.current += 1;
      const timestamp = Date.now();
      const uniqueId = `${timestamp}_${logIdCounter.current}`;

      const logEntry = {
        id: uniqueId,
        timestamp: new Date(),
        message: String(message).substring(0, 500), // 길이 제한
        level,
        color: LOG_COLORS[level] || LOG_COLORS.info,
        metadata: {
          ...metadata,
          sessionTime: timestamp - monitoringStats.sessionStartTime?.getTime(),
          specialPattern: specialPattern || undefined,
        },
      };

      // ✅ 8. 상태 업데이트 (로그 최대 50개 유지)
      setLogs((prev) => [logEntry, ...prev.slice(0, 49)]);

      // ✅ 9. 콘솔 출력 (조건부)
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

      // ✅ 10. 마지막 활동 시간 업데이트
      setMonitoringStats((prev) => ({
        ...prev,
        lastActivity: new Date().toLocaleTimeString(),
      }));
    },
    [currentLogLevel, checkSpecialPattern, monitoringStats.sessionStartTime]
  );

  // ✅ 통계 업데이트 (기존과 동일)
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

    // 캐시도 함께 정리
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
    });

    // 성능 카운터 리셋
    performanceRef.current = {
      logsPerSecond: 0,
      lastSecond: Math.floor(Date.now() / 1000),
      currentSecondCount: 0,
      peakLogsPerSecond: 0,
    };

    addLog("📊 통계 및 로그 캐시 완전 초기화", "success");
  }, [addLog]);

  // ✅ 로그 내보내기
  const exportLogs = useCallback(
    (format = "json") => {
      const exportData = {
        exportTime: new Date().toISOString(),
        stats: monitoringStats,
        logs: logs.slice(0, 200), // 최근 200개
        performance: {
          logsPerSecond: performanceRef.current.logsPerSecond,
          peakLogsPerSecond: performanceRef.current.peakLogsPerSecond,
          totalLogs: logIdCounter.current,
          throttleMapSize: throttleMap.current.size,
          duplicateMapSize: duplicateMap.current.size,
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
        const csvHeaders = "timestamp,level,message,blocked,throttled";
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

  // ✅ 로그 시스템 상태 정보
  const getLogSystemStatus = useCallback(() => {
    return {
      isHealthy: performanceRef.current.logsPerSecond < 5, // 초당 5개 이하면 건강
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
    };
  }, [monitoringStats]);

  return {
    // ✅ 기본 반환값
    logs,
    monitoringStats,
    addLog,
    updateStats,
    resetStats,

    // ✅ 추가 기능
    exportLogs,
    getFilteredLogs,
    getLogSystemStatus,

    // ✅ 성능 정보
    performance: {
      logsPerSecond: performanceRef.current.logsPerSecond,
      peakLogsPerSecond: performanceRef.current.peakLogsPerSecond,
      totalLogs: logIdCounter.current,
      throttleMapSize: throttleMap.current.size,
      duplicateMapSize: duplicateMap.current.size,
    },

    // ✅ 설정 및 유틸리티
    logLevels: LOG_LEVELS,
    logColors: LOG_COLORS,
    throttleSettings: THROTTLE_SETTINGS,

    // ✅ 디버그 정보 (개발환경에서만)
    ...(process.env.NODE_ENV === "development" && {
      debug: {
        throttleMap: throttleMap.current,
        duplicateMap: duplicateMap.current,
        specialPatterns: SPECIAL_PATTERNS,
      },
    }),
  };
};

export default useTradingLogger;
