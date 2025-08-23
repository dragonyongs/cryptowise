// src/features/trading/hooks/useSettingsPersistence.js
import { useCallback, useEffect, useRef } from "react";
import { debounce } from "lodash-es";
import { TRADING_DEFAULTS } from "../constants/tradingDefaults";

const STORAGE_KEY = "trading-settings";

export const useSettingsPersistence = (settings, isDirty, onSave, onLoad) => {
  const saveTimeoutRef = useRef();
  const lastSavedRef = useRef(null);

  // 디바운스된 자동 저장 함수
  const debouncedAutoSave = useCallback(
    debounce((settingsToSave) => {
      if (
        JSON.stringify(settingsToSave) !== JSON.stringify(lastSavedRef.current)
      ) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
          lastSavedRef.current = settingsToSave;
          console.log("Settings auto-saved");
        } catch (error) {
          console.error("Failed to auto-save settings:", error);
        }
      }
    }, TRADING_DEFAULTS.DEBOUNCE_DELAY),
    []
  );

  // 수동 저장
  const saveSettings = useCallback(async () => {
    try {
      // 로컬 스토리지에 저장
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      lastSavedRef.current = settings;

      // 외부 저장 콜백 호출 (예: API 저장)
      if (onSave) {
        await onSave(settings);
      }

      return { success: true };
    } catch (error) {
      console.error("Failed to save settings:", error);
      return { success: false, error: error.message };
    }
  }, [settings, onSave]);

  // 설정 로드
  const loadSettings = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        if (onLoad) {
          onLoad(parsedSettings);
        }
        return parsedSettings;
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
    return null;
  }, [onLoad]);

  // 설정 내보내기
  const exportSettings = useCallback(() => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `trading-settings-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [settings]);

  // 설정 가져오기
  const importSettings = useCallback(
    (file) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedSettings = JSON.parse(e.target.result);
            if (onLoad) {
              onLoad(importedSettings);
            }
            resolve(importedSettings);
          } catch (error) {
            reject(new Error("잘못된 파일 형식입니다."));
          }
        };
        reader.onerror = () => reject(new Error("파일을 읽을 수 없습니다."));
        reader.readAsText(file);
      });
    },
    [onLoad]
  );

  // 자동 저장 효과
  useEffect(() => {
    if (isDirty) {
      debouncedAutoSave(settings);
    }

    return () => {
      debouncedAutoSave.cancel();
    };
  }, [settings, isDirty, debouncedAutoSave]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    saveSettings,
    loadSettings,
    exportSettings,
    importSettings,
  };
};
