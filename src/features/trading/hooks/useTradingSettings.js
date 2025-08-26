// src/features/trading/hooks/useTradingSettings.js
import { useState, useCallback, useMemo, useEffect } from "react";
import { usePortfolioStore } from "../../../stores/portfolioStore";
import { useTradingStore } from "../../../stores/tradingStore";
import { normalizeSettings } from "../utils/settingsNormalizer";
import { adjustOtherAllocations } from "../utils/portfolioCalculations";
import { TRADING_DEFAULTS } from "../constants/tradingDefaults";

const STORAGE_KEY = "cryptowise_trading_settings";

// 🔥 기본 설정 정의
const getDefaultSettings = () => ({
  allocation: { cash: 0.4, t1: 0.42, t2: 0.15, t3: 0.03 },
  tradingConditions: {
    buyConditions: {
      priceDropThreshold: -3,
      rsiOversold: 30,
      minBuyScore: 7.0,
      volumeThreshold: 1.2,
    },
    sellConditions: {
      profitTarget1: 3,
      profitTarget2: 5,
      profitTarget3: 8,
      stopLoss: -6,
      rsiOverbought: 70,
      timeBasedExit: 7,
    },
  },
  indicators: {
    rsi: { enabled: true, oversold: 30, overbought: 70 },
    macd: { enabled: true },
    bollinger: { enabled: true },
    volume: { enabled: true, threshold: 1.5 },
  },
  riskManagement: {
    stopLoss: 8,
    takeProfit: 15,
    maxPositions: 5,
  },
  advanced: {
    signalConfirmationTime: 300,
    maxConcurrentTrades: 3,
    cooldownPeriod: 3600,
    volatilityThreshold: 0.05,
  },
});

export const useTradingSettings = (initialSettings = {}) => {
  // localStorage에서 초기 설정 로드 (정규화 적용)
  const loadSettingsFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        console.log("📚 localStorage에서 설정 로드:", parsedSettings);
        // 🔥 FIXED: 초기 로드 시에만 정규화 적용
        return normalizeSettings({
          ...getDefaultSettings(),
          ...parsedSettings,
        });
      }
    } catch (error) {
      console.warn("⚠️ localStorage 로드 실패:", error);
    }

    const defaultSettings = getDefaultSettings();
    console.log("🔧 기본 설정 사용:", defaultSettings);
    return normalizeSettings({ ...defaultSettings, ...initialSettings });
  }, [initialSettings]);

  const { portfolioData } = usePortfolioStore();
  const tradingStore = useTradingStore;

  const [settings, setSettings] = useState(loadSettingsFromStorage);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tradingMode, setTradingMode] = useState("paper");

  // localStorage 저장 함수
  const saveToStorage = useCallback(
    (settingsToSave) => {
      try {
        const dataToSave = {
          ...settingsToSave,
          tradingMode,
          savedAt: new Date().toISOString(),
        };

        console.log("💾 localStorage 저장할 데이터:", dataToSave);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        console.log("✅ localStorage 저장 완료");
        return true;
      } catch (error) {
        console.error("❌ localStorage 저장 실패:", error);
        return false;
      }
    },
    [tradingMode]
  );

  // store 동기화 함수
  const syncToStore = useCallback(
    (rawSettings) => {
      try {
        if (
          typeof tradingStore.getState === "function" &&
          tradingStore.getState().updateTradingSettings
        ) {
          tradingStore.getState().updateTradingSettings(rawSettings);
        }

        if (typeof window !== "undefined") {
          window.currentTradingSettings = rawSettings;
          window.dispatchEvent(
            new CustomEvent("tradingSettingsChanged", {
              detail: rawSettings,
            })
          );
        }
      } catch (e) {
        console.warn("store 동기화 실패:", e);
      }
    },
    [tradingStore]
  );

  // 🔥 FIXED: 설정 업데이트 함수 - 정규화 제거
  const updateSettings = useCallback(
    (newSettings) => {
      console.log("📝 updateSettings 호출:", newSettings);

      // 🔥 KEY FIX: 정규화하지 않고 그대로 저장
      setSettings(newSettings);
      setIsDirty(true);

      // 자동 저장 (디바운싱)
      const timeoutId = setTimeout(() => {
        saveToStorage(newSettings);
        syncToStore(newSettings);
      }, 500);

      return () => clearTimeout(timeoutId);
    },
    [saveToStorage, syncToStore]
  );

  // 명시적 저장 함수 (저장 버튼 클릭 시)
  const saveSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      // 🔥 FIXED: 저장 시에도 정규화하지 않음
      const storageSaved = saveToStorage(settings);
      if (!storageSaved) {
        throw new Error("localStorage 저장 실패");
      }

      // 트레이딩 엔진에 설정 적용
      if (
        window.paperTradingEngine &&
        typeof window.paperTradingEngine.updateSettings === "function"
      ) {
        window.paperTradingEngine.updateSettings({
          ...settings,
          tradingMode,
        });
      }

      // 중앙 설정 매니저에도 반영
      if (
        window.centralSettingsManager &&
        typeof window.centralSettingsManager.updateTradingSettings ===
          "function"
      ) {
        window.centralSettingsManager.updateTradingSettings(settings);
      }

      syncToStore(settings);

      setIsDirty(false);
      console.log("✅ 설정 저장 완료:", settings);
      return { success: true };
    } catch (error) {
      console.error("❌ 설정 저장 실패:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [settings, tradingMode, saveToStorage, syncToStore]);

  // 거래모드 변경
  const toggleTradingMode = useCallback(() => {
    const newMode = tradingMode === "paper" ? "live" : "paper";
    setTradingMode(newMode);
    setIsDirty(true);

    const merged = { ...settings, tradingMode: newMode };
    syncToStore(merged);
  }, [tradingMode, settings, syncToStore]);

  // 할당 변경 핸들러
  const updateAllocation = useCallback(
    (key, value) => {
      setSettings((prev) => {
        const newAllocations = adjustOtherAllocations(
          key,
          value,
          prev.allocation
        );
        const newSettings = { ...prev, allocation: newAllocations };
        setIsDirty(true);

        setTimeout(() => {
          saveToStorage(newSettings);
          syncToStore(newSettings);
        }, 100);

        return newSettings;
      });
    },
    [saveToStorage, syncToStore]
  );

  // 현재 포트폴리오 총액 기반 할당 금액 계산
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

  // 지표 업데이트
  const updateIndicator = useCallback(
    (indicatorKey, property, value) => {
      setSettings((prev) => {
        const newSettings = {
          ...prev,
          indicators: {
            ...prev.indicators,
            [indicatorKey]: {
              ...prev.indicators[indicatorKey],
              [property]: value,
            },
          },
        };
        setIsDirty(true);

        setTimeout(() => {
          saveToStorage(newSettings);
          syncToStore(newSettings);
        }, 100);

        return newSettings;
      });
    },
    [saveToStorage, syncToStore]
  );

  // 리스크 관리 변경 핸들러
  const updateRiskManagement = useCallback(
    (property, value) => {
      setSettings((prev) => {
        const newSettings = {
          ...prev,
          riskManagement: {
            ...prev.riskManagement,
            [property]: value,
          },
        };
        setIsDirty(true);

        setTimeout(() => {
          saveToStorage(newSettings);
          syncToStore(newSettings);
        }, 100);

        return newSettings;
      });
    },
    [saveToStorage, syncToStore]
  );

  // 설정 초기화
  const resetSettings = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      const defaultSettings = getDefaultSettings();
      const normalized = normalizeSettings(defaultSettings); // 초기화 시에만 정규화

      setSettings(normalized);
      setTradingMode("paper");
      setIsDirty(true);

      syncToStore(normalized);
      console.log("🔄 설정 초기화 완료");
    } catch (error) {
      console.error("❌ 설정 초기화 실패:", error);
    }
  }, [syncToStore]);

  // 활성화된 지표 목록
  const activeIndicators = useMemo(() => {
    return Object.entries(settings.indicators || {})
      .filter(([_, config]) => config && config.enabled)
      .map(([key, _]) => key);
  }, [settings.indicators]);

  // 지표 활성화 토글
  const toggleIndicator = useCallback(
    (indicatorKey) => {
      const enabled = !!(
        settings.indicators &&
        settings.indicators[indicatorKey] &&
        settings.indicators[indicatorKey].enabled
      );
      updateIndicator(indicatorKey, "enabled", !enabled);
    },
    [settings.indicators, updateIndicator]
  );

  // 컴포넌트 마운트 시 설정 동기화
  useEffect(() => {
    syncToStore(settings);
  }, []);

  return {
    settings,
    isDirty,
    isLoading,
    tradingMode,
    allocationAmounts,
    activeIndicators,
    updateAllocation,
    updateIndicator,
    updateRiskManagement,
    updateSettings,
    resetSettings,
    saveSettings,
    toggleTradingMode,
    toggleIndicator,
  };
};
