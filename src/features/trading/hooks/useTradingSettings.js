// src/features/trading/hooks/useTradingSettings.js
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../../../stores/authStore";

export const useTradingSettings = () => {
  const { user } = useAuthStore();
  const [tradingSettings, setTradingSettings] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 기본 설정값
  const defaultSettings = {
    mode: "paper",
    strategy: "balanced",
    minBuyScore: 6.5,
    maxPositions: 4,
    riskLevel: "medium",
    autoTrading: false,
    portfolio: {
      cash: 0.4,
      t1: 0.35,
      t2: 0.15,
      t3: 0.1,
    },
    indicators: {
      rsi: { enabled: true, overbought: 70, oversold: 30 },
      macd: { enabled: true },
      bollinger: { enabled: true },
      volume: { enabled: true, threshold: 1.5 },
    },
    lastUpdated: new Date(),
  };

  // 설정 로드
  const loadSettings = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Supabase에서 사용자 트레이딩 설정 로드
      const response = await fetch(`/api/user/${user.id}/trading-settings`);
      if (response.ok) {
        const data = await response.json();
        setTradingSettings(data || defaultSettings);
      } else {
        setTradingSettings(defaultSettings);
      }
    } catch (error) {
      console.error("설정 로드 실패:", error);
      setTradingSettings(defaultSettings);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // 설정 저장
  const saveSettings = useCallback(
    async (newSettings) => {
      if (!user?.id) return false;

      setIsLoading(true);
      try {
        const response = await fetch(`/api/user/${user.id}/trading-settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...newSettings,
            lastUpdated: new Date(),
          }),
        });

        if (response.ok) {
          setTradingSettings(newSettings);
          setHasUnsavedChanges(false);
          return true;
        }
        return false;
      } catch (error) {
        console.error("설정 저장 실패:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [user?.id]
  );

  // 설정 업데이트 (로컬)
  const updateSettings = useCallback((updates) => {
    setTradingSettings((prev) => ({
      ...prev,
      ...updates,
      lastUpdated: new Date(),
    }));
    setHasUnsavedChanges(true);
  }, []);

  // 현재 전략 가져오기
  const currentStrategy = tradingSettings?.strategy || "balanced";

  // 초기 로드
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    tradingSettings,
    currentStrategy,
    isLoading,
    hasUnsavedChanges,
    loadSettings,
    saveSettings,
    updateSettings,
  };
};
