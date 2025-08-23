// src/features/trading/hooks/useSignalManagement.js
import { useState, useCallback, useRef } from "react";
import { signalGenerator } from "../../../services/analysis/signalGenerator.js";

export const useSignalManagement = (
  signalGeneratorReady,
  addLog,
  getTradingSettings
) => {
  const [signals, setSignals] = useState([]);
  const [lastSignal, setLastSignal] = useState(null);

  const generateSignalsFromCachedData = useCallback(
    async (symbolList) => {
      if (!signalGeneratorReady) return;

      try {
        addLog(`🎯 캐시 기반 신호 생성: ${symbolList.length}개 코인`, "debug");

        const currentSettings = getTradingSettings();
        const newSignals = await signalGenerator.generateSignalsWithSettings(
          symbolList,
          currentSettings
        );

        if (newSignals.length > 0) {
          const processedSignals = newSignals.map((signal) => ({
            id: `signal-${signal.symbol}-${Date.now()}-${Math.random()}`,
            symbol: signal.symbol,
            type: signal.type.toUpperCase(),
            confidence: Math.max(0, Math.min(1, signal.totalScore / 10)),
            price: signal.price,
            volume: signal.volume24h || 0,
            reason: signal.reason,
            timestamp: new Date().toISOString(),
            executed: false,
            status: "pending",
            totalScore: signal.totalScore,
          }));

          setSignals((prev) => [...processedSignals, ...prev].slice(0, 50));
          setLastSignal(newSignals[0]);
          addLog(`✅ 신호 ${newSignals.length}개 생성 완료`, "info");

          return processedSignals;
        }
      } catch (error) {
        addLog(`신호 생성 실패: ${error.message}`, "error");
      }
      return [];
    },
    [signalGeneratorReady, addLog, getTradingSettings]
  );

  const clearSignals = useCallback(() => {
    setSignals([]);
    setLastSignal(null);
  }, []);

  const updateSignalStatus = useCallback((signalId, status, result = null) => {
    setSignals((prev) =>
      prev.map((signal) =>
        signal.id === signalId
          ? { ...signal, status, executed: status === "executed", result }
          : signal
      )
    );
  }, []);

  return {
    signals,
    lastSignal,
    generateSignalsFromCachedData,
    clearSignals,
    updateSignalStatus,
  };
};
