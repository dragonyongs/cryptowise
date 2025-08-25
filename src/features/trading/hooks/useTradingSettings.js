// src/features/trading/hooks/useTradingSettings.js
import { useState, useCallback, useMemo, useEffect } from "react";
import { usePortfolioStore } from "../../../stores/portfolioStore";
import { normalizeSettings } from "../utils/settingsNormalizer";
import { adjustOtherAllocations } from "../utils/portfolioCalculations";
import { TRADING_DEFAULTS } from "../constants/tradingDefaults";

export const useTradingSettings = (initialSettings = {}) => {
  // 🎯 포트폴리오 스토어 연결
  const { portfolioData, updatePortfolio } = usePortfolioStore();

  const [settings, setSettings] = useState(() =>
    normalizeSettings(initialSettings)
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tradingMode, setTradingMode] = useState("paper"); // paper | live

  // 🎯 실제 설정 저장 함수
  const saveSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // 로컬 스토리지에 저장
      localStorage.setItem(
        "cryptowise_trading_settings",
        JSON.stringify({
          ...settings,
          tradingMode,
          savedAt: new Date().toISOString(),
        })
      );

      // 🔥 트레이딩 엔진에 설정 적용
      if (window.paperTradingEngine) {
        window.paperTradingEngine.updateSettings({
          allocation: settings.allocation,
          indicators: settings.indicators,
          riskManagement: {
            ...settings.riskManagement,
            stopLoss: settings.riskManagement.stopLoss / 100, // 퍼센트를 소수로
            takeProfit: settings.riskManagement.takeProfit / 100,
          },
          advanced: settings.advanced,
          tradingMode,
        });
      }

      // 🔥 중앙 설정 매니저에도 반영
      if (window.centralSettingsManager) {
        window.centralSettingsManager.updateTradingSettings(settings);
      }

      setIsDirty(false);
      return { success: true };
    } catch (error) {
      console.error("설정 저장 실패:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [settings, tradingMode]);

  // 🎯 저장된 설정 불러오기
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cryptowise_trading_settings");
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        setSettings(normalizeSettings(parsedSettings));
        setTradingMode(parsedSettings.tradingMode || "paper");
      }
    } catch (error) {
      console.warn("저장된 설정 불러오기 실패:", error);
    }
  }, []);

  // 거래모드 변경
  const toggleTradingMode = useCallback(() => {
    const newMode = tradingMode === "paper" ? "live" : "paper";
    setTradingMode(newMode);
    setIsDirty(true);
  }, [tradingMode]);

  // 할당 변경 핸들러 (포트폴리오 총액 반영)
  const updateAllocation = useCallback((key, value) => {
    setSettings((prev) => {
      const newAllocations = adjustOtherAllocations(
        key,
        value,
        prev.allocation
      );
      setIsDirty(true);
      return {
        ...prev,
        allocation: newAllocations,
      };
    });
  }, []);

  // 🎯 현재 포트폴리오 총액 기반 할당 금액 계산
  const allocationAmounts = useMemo(() => {
    const totalValue = portfolioData?.totalValue || 1840000;
    return {
      cash: totalValue * settings.allocation.cash,
      t1: totalValue * settings.allocation.t1,
      t2: totalValue * settings.allocation.t2,
      t3: totalValue * settings.allocation.t3,
      total: totalValue,
    };
  }, [settings.allocation, portfolioData]);

  const updateIndicator = useCallback((indicatorKey, property, value) => {
    setSettings((prev) => {
      setIsDirty(true);
      return {
        ...prev,
        indicators: {
          ...prev.indicators,
          [indicatorKey]: {
            ...prev.indicators[indicatorKey],
            [property]: value,
          },
        },
      };
    });
  }, []);

  const updateRiskManagement = useCallback((property, value) => {
    setSettings((prev) => {
      setIsDirty(true);
      return {
        ...prev,
        riskManagement: {
          ...prev.riskManagement,
          [property]: value,
        },
      };
    });
  }, []);

  // 전체 설정 업데이트
  const updateSettings = useCallback((newSettings) => {
    setSettings(normalizeSettings(newSettings));
    setIsDirty(true);
  }, []);

  // 설정 초기화
  const resetSettings = useCallback(() => {
    setSettings(normalizeSettings({}));
    setTradingMode("paper");
    setIsDirty(true);
  }, []);

  // 활성화된 지표 목록
  const activeIndicators = useMemo(() => {
    return Object.entries(settings.indicators)
      .filter(([_, config]) => config.enabled)
      .map(([key, _]) => key);
  }, [settings.indicators]);

  // 지표 활성화 토글
  const toggleIndicator = useCallback(
    (indicatorKey) => {
      updateIndicator(
        indicatorKey,
        "enabled",
        !settings.indicators[indicatorKey].enabled
      );
    },
    [settings.indicators, updateIndicator]
  );

  return {
    settings,
    isDirty,
    isLoading,
    tradingMode,
    allocationAmounts, // 🎯 실제 금액 정보 제공
    activeIndicators,
    updateAllocation,
    updateIndicator,
    updateRiskManagement,
    updateSettings,
    resetSettings,
    saveSettings, // 🎯 실제 저장 함수
    toggleTradingMode, // 🎯 거래모드 토글
    toggleIndicator,
  };
};
