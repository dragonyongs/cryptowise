// src/features/trading/hooks/useTradingSettings.js
import { useState, useCallback, useMemo, useEffect } from "react";
import { usePortfolioStore } from "../../../stores/portfolioStore";
import { useTradingStore } from "../../../stores/tradingStore"; // 추가
import { normalizeSettings } from "../utils/settingsNormalizer";
import { adjustOtherAllocations } from "../utils/portfolioCalculations";
import { TRADING_DEFAULTS } from "../constants/tradingDefaults";

export const useTradingSettings = (initialSettings = {}) => {
  // 포트폴리오 스토어 연결
  const { portfolioData, updatePortfolio } = usePortfolioStore();

  // 전역 trading store의 즉시 업데이트 함수 가져오기 (getState 호출을 내부에서 사용)
  const tradingStore = useTradingStore; // 직접 getState()로 호출할 것

  const [settings, setSettings] = useState(() =>
    normalizeSettings(initialSettings)
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tradingMode, setTradingMode] = useState("paper"); // paper | live

  // ====== 내부 헬퍼: store 동기화 ======
  const syncToStore = useCallback((rawSettings) => {
    try {
      const normalized = normalizeSettings(rawSettings);
      // tradingStore의 updateTradingSettings는 내부적으로 set() 처리함
      if (
        typeof tradingStore.getState === "function" &&
        tradingStore.getState().updateTradingSettings
      ) {
        tradingStore.getState().updateTradingSettings(normalized);
      }
    } catch (e) {
      console.warn("store 동기화 실패:", e);
    }
  }, []);

  // 실제 설정 저장 함수
  const saveSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const normalized = normalizeSettings(settings);

      // 로컬 스토리지에 저장
      localStorage.setItem(
        "cryptowise_trading_settings",
        JSON.stringify({
          ...normalized,
          tradingMode,
          savedAt: new Date().toISOString(),
        })
      );

      // 트레이딩 엔진에 설정 적용 (기존 로직 유지)
      if (
        window.paperTradingEngine &&
        typeof window.paperTradingEngine.updateSettings === "function"
      ) {
        window.paperTradingEngine.updateSettings({
          allocation: normalized.allocation,
          indicators: normalized.indicators,
          riskManagement: {
            ...normalized.riskManagement,
            // 내부 엔진이 소수(0.x)로 기대하면 변환
            stopLoss: normalized.riskManagement.stopLoss / 100,
            takeProfit: normalized.riskManagement.takeProfit / 100,
          },
          advanced: normalized.advanced,
          tradingMode,
        });
      }

      // 중앙 설정 매니저에도 반영
      if (
        window.centralSettingsManager &&
        typeof window.centralSettingsManager.updateTradingSettings ===
          "function"
      ) {
        window.centralSettingsManager.updateTradingSettings(normalized);
      }

      // ✅ 전역 store에도 동기화
      syncToStore(normalized);

      setIsDirty(false);
      return { success: true };
    } catch (error) {
      console.error("설정 저장 실패:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [settings, tradingMode, syncToStore]);

  // 저장된 설정 불러오기 -> 로컬 + store 동기화
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cryptowise_trading_settings");
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        const normalized = normalizeSettings(parsedSettings);
        setSettings(normalized);
        setTradingMode(parsedSettings.tradingMode || "paper");

        // store에 동기화 (중요)
        syncToStore(normalized);
      } else {
        // 초기값이 있으면 그것도 store에 반영
        const normalizedInit = normalizeSettings(initialSettings || {});
        if (Object.keys(normalizedInit).length > 0) {
          syncToStore(normalizedInit);
        }
      }
    } catch (error) {
      console.warn("저장된 설정 불러오기 실패:", error);
    }
    // initialSettings는 훅 인자로 받는 경우 의존성에 포함할 수 있음
  }, []); // 의도적으로 빈 의존성: 컴포넌트 마운트 시 한 번만 로드/동기화

  // 거래모드 변경 (토글) -> store 동기화
  const toggleTradingMode = useCallback(() => {
    const newMode = tradingMode === "paper" ? "live" : "paper";
    setTradingMode(newMode);
    setIsDirty(true);

    // store의 tradingSettings 에도 tradingMode 반영 (선택사항: store에 저장하려면 다음 호출)
    const merged = { ...settings, tradingMode: newMode };
    syncToStore(merged);
  }, [tradingMode, settings, syncToStore]);

  // 할당 변경 핸들러 (포트폴리오 총액 반영) + store 동기화
  const updateAllocation = useCallback(
    (key, value) => {
      setSettings((prev) => {
        const newAllocations = adjustOtherAllocations(
          key,
          value,
          prev.allocation
        );
        const newSettings = {
          ...prev,
          allocation: newAllocations,
        };
        setIsDirty(true);

        // 즉시 store에 동기화
        syncToStore(newSettings);
        return newSettings;
      });
    },
    [syncToStore]
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

  // 지표 업데이트 + store 동기화
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
        syncToStore(newSettings);
        return newSettings;
      });
    },
    [syncToStore]
  );

  // 리스크 관리 변경 핸들러 + store 동기화
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
        syncToStore(newSettings);
        return newSettings;
      });
    },
    [syncToStore]
  );

  // 전체 설정 업데이트 (외부에서 전체 객체로 바꿀 때) + store 동기화
  const updateSettings = useCallback(
    (newSettings) => {
      const normalized = normalizeSettings(newSettings);
      setSettings(normalized);
      setIsDirty(true);
      syncToStore(normalized);
    },
    [syncToStore]
  );

  // 설정 초기화
  const resetSettings = useCallback(() => {
    const normalized = normalizeSettings({});
    setSettings(normalized);
    setTradingMode("paper");
    setIsDirty(true);

    // store에도 초기값 반영
    syncToStore(normalized);
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
      // 안전하게 기존 값이 없으면 초기화
      const enabled = !!(
        settings.indicators &&
        settings.indicators[indicatorKey] &&
        settings.indicators[indicatorKey].enabled
      );
      updateIndicator(indicatorKey, "enabled", !enabled);
    },
    [settings.indicators, updateIndicator]
  );

  return {
    settings,
    isDirty,
    isLoading,
    tradingMode,
    allocationAmounts, // 실제 금액 정보 제공
    activeIndicators,
    updateAllocation,
    updateIndicator,
    updateRiskManagement,
    updateSettings,
    resetSettings,
    saveSettings, // 실제 저장 함수
    toggleTradingMode, // 거래모드 토글
    toggleIndicator,
  };
};
