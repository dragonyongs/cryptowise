// src/hooks/useSignalGenerator.js - 최신 signalGenerator 서비스 완전 연동

import { useCallback, useRef, useEffect } from "react";
import { signalGenerator } from "../services/analysis/signalGenerator.js";

/**
 * 신호 생성 훅 (최신 백엔드 서비스 연동)
 * - signalGenerator 서비스 완전 연동
 * - 테스트 모드 완전 지원
 * - 성능 최적화된 신호 생성
 */
export const useSignalGenerator = (
  tradingSettings,
  marketCondition,
  marketSentiment,
  addLog,
  updateStats,
  testMode
) => {
  const lastSignalTime = useRef(new Map());
  const signalCache = useRef(new Map());
  const tradingSettingsRef = useRef(tradingSettings);
  const testModeRef = useRef(testMode);

  // ✅ Refs 동기화
  useEffect(() => {
    tradingSettingsRef.current = tradingSettings;
  }, [tradingSettings]);

  useEffect(() => {
    testModeRef.current = testMode;
    // 테스트 모드 변경시 신호 생성기 모드도 변경
    signalGenerator.setTestMode(testMode);
  }, [testMode]);

  // ✅ 캐시 정리
  useEffect(() => {
    const cleanupCache = () => {
      const now = Date.now();
      const cacheLifetime = 60000; // 1분

      for (const [key, value] of signalCache.current.entries()) {
        if (now - value.timestamp > cacheLifetime) {
          signalCache.current.delete(key);
        }
      }
    };

    const interval = setInterval(cleanupCache, 60000); // 1분마다 정리
    return () => clearInterval(interval);
  }, []);

  // ✅ 거래 신호 생성 (최신 서비스 사용) - 개선된 버전
  const generateTradingSignal = useCallback(
    async (marketData) => {
      try {
        if (!marketData || !marketData.symbol) {
          addLog?.("❌ 유효하지 않은 마켓 데이터", "debug");
          return null;
        }

        const symbol = marketData.symbol;
        const now = Date.now();

        // ✅ 쿨다운 확인 (테스트 모드에서는 완화)
        const cooldownTime = testModeRef.current ? 300000 : 600000; // 5분 vs 10분
        const lastTime = lastSignalTime.current.get(symbol) || 0;

        if (now - lastTime < cooldownTime) {
          addLog?.(
            `⏱️ ${symbol} 쿨다운 중 (${Math.ceil((cooldownTime - (now - lastTime)) / 60000)}분 남음)`,
            "debug"
          );
          return null;
        }

        // ✅ 캐시 확인
        const cacheKey = `${symbol}_${JSON.stringify(tradingSettingsRef.current)}_${testModeRef.current}`;
        const cachedSignal = signalCache.current.get(cacheKey);
        if (cachedSignal && now - cachedSignal.timestamp < 30000) {
          return cachedSignal.signal;
        }

        updateStats?.((prev) => ({
          ...prev,
          signalsEvaluated: (prev.signalsEvaluated || 0) + 1,
        }));

        // 🎯 NEW: 거래 조건에서 동적으로 값 추출
        const tradingConditions =
          tradingSettingsRef.current.tradingConditions || {};
        const buyConditions = tradingConditions.buyConditions || {};
        const sellConditions = tradingConditions.sellConditions || {};
        const riskManagement = tradingConditions.riskManagement || {};

        // 🎯 동적 설정값 추출 (테스트 모드 고려)
        const minBuyScore =
          buyConditions.minBuyScore || (testModeRef.current ? 6.0 : 8.0);
        const strongBuyScore =
          buyConditions.strongBuyScore || (testModeRef.current ? 8.0 : 9.0);
        const rsiOversold =
          buyConditions.rsiOversold || (testModeRef.current ? 35 : 30);
        const rsiOverbought =
          sellConditions.rsiOverbought || (testModeRef.current ? 65 : 70);

        // ✅ 최신 신호 생성기 사용 (동적 설정값 전달)
        const signals = await signalGenerator.generateSignalsWithSettings(
          [marketData],
          {
            ...tradingSettingsRef.current,

            // 🎯 거래 조건에서 추출한 실제 설정값 사용
            minBuyScore,
            strongBuyScore,
            rsiOversold,
            rsiOverbought,

            // 기존 테스트/실전 모드 설정은 유지하되 동적 값으로 덮어씀
            strategy: testModeRef.current ? "test_mode" : "live_mode",

            // 시장 조건 반영
            ...(marketCondition
              ? {
                  marketCondition:
                    marketCondition.buyability?.level || "neutral",
                  marketScore: marketCondition.overallBuyScore || 50,
                }
              : {}),

            // 감정 지수 반영
            ...(marketSentiment
              ? {
                  fearGreedIndex: marketSentiment.fearGreedIndex || 50,
                  sentiment: marketSentiment.overall || "neutral",
                }
              : {}),
          }
        );

        // ✅ 신호 검증 및 반환
        if (!signals || signals.length === 0) {
          addLog?.(`📊 ${symbol} 신호 조건 미달`, "debug");
          updateStats?.((prev) => ({
            ...prev,
            signalsRejected: (prev.signalsRejected || 0) + 1,
          }));
          return null;
        }

        const signal = signals[0]; // 최고 점수 신호 사용

        // ✅ 마지막 신호 시간 업데이트
        lastSignalTime.current.set(symbol, now);

        // ✅ 캐시에 저장
        signalCache.current.set(cacheKey, {
          signal,
          timestamp: now,
        });

        // 🎯 신호 품질 검증 (동적 임계값 사용)
        if (signal.totalScore < minBuyScore) {
          addLog?.(
            `📊 ${symbol} 신호 점수 부족: ${signal.totalScore} < ${minBuyScore}`,
            "debug"
          );
          updateStats?.((prev) => ({
            ...prev,
            signalsRejected: (prev.signalsRejected || 0) + 1,
          }));
          return null;
        }

        // ✅ 로그 및 통계 업데이트
        const modeText = testModeRef.current ? "테스트" : "실전";
        addLog?.(
          `🎯 ${symbol} ${signal.type} 신호 생성! 점수: ${signal.totalScore.toFixed(1)} (${modeText} 모드, 임계값: ${minBuyScore})`,
          signal.type === "BUY" ? "success" : "warning"
        );

        updateStats?.((prev) => ({
          ...prev,
          signalsGenerated: (prev.signalsGenerated || 0) + 1,
          conditionsMet: (prev.conditionsMet || 0) + 1,
        }));

        // 🎯 성공시에도 상세 정보 로그
        addLog(
          `🎯 [${symbol}] ${signal.type} 신호 검증 통과! 점수: ${signal.totalScore.toFixed(1)}, 사용된 설정: minBuyScore=${minBuyScore}`,
          "success"
        );

        return {
          ...signal,
          // ✅ 추가 메타데이터
          generatedAt: new Date(),
          mode: testModeRef.current ? "TEST" : "LIVE",
          cooldownTime,
          marketCondition: marketCondition?.buyability?.level,
          sentiment: marketSentiment?.overall,
          // 🎯 사용된 설정값 기록
          usedSettings: {
            minBuyScore,
            strongBuyScore,
            rsiOversold,
            rsiOverbought,
          },
        };
      } catch (error) {
        addLog?.(
          `❌ ${marketData?.symbol || "Unknown"} 신호 생성 실패: ${error.message}`,
          "error"
        );
        console.error("Signal generation error:", error);
        return null;
      }
    },
    [addLog, updateStats]
  );

  // ✅ 신호 통계 조회
  const getSignalStats = useCallback(() => {
    return {
      cacheSize: signalCache.current.size,
      lastSignalsCount: lastSignalTime.current.size,
      testMode: testModeRef.current,
      currentSettings: tradingSettingsRef.current,
    };
  }, []);

  // ✅ 캐시 초기화
  const clearCache = useCallback(() => {
    signalCache.current.clear();
    lastSignalTime.current.clear();
    addLog?.("🧹 신호 생성 캐시 초기화", "info");
  }, [addLog]);

  return {
    generateTradingSignal,
    getSignalStats,
    clearCache,

    // ✅ 호환성 유지
    volumeHistory: useRef(new Map()), // 기존 코드 호환성
  };
};
