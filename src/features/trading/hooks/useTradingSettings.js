// src/features/trading/hooks/useTradingSettings.js
import { useState, useCallback, useMemo } from "react";
import { normalizeSettings } from "../utils/settingsNormalizer";
import { adjustOtherAllocations } from "../utils/portfolioCalculations";
import { TRADING_DEFAULTS } from "../constants/tradingDefaults";

export const useTradingSettings = (initialSettings = {}) => {
  const [settings, setSettings] = useState(() =>
    normalizeSettings(initialSettings)
  );

  const [isDirty, setIsDirty] = useState(false);

  // 할당 변경 핸들러
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

  // 지표 설정 변경 핸들러
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

  // 리스크 관리 설정 변경 핸들러
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
    setIsDirty(false);
  }, []);

  // 변경사항 저장 완료 표시
  const markSaved = useCallback(() => {
    setIsDirty(false);
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
    activeIndicators,
    updateAllocation,
    updateIndicator,
    updateRiskManagement,
    updateSettings,
    resetSettings,
    markSaved,
    toggleIndicator,
  };
};
