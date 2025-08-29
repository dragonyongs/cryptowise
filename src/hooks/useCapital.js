// src/hooks/useCapital.js - 새로 생성
import { useEffect, useState, useCallback } from "react";
import {
  useCapitalStore,
  subscribeToCapitalChanges,
} from "../stores/capitalStore";

export const useCapital = (autoInitialize = true) => {
  const {
    initialCapital,
    currentCapital,
    setCapital,
    getCapital,
    initialize,
    reset,
    getStats,
    isInitialized,
  } = useCapitalStore();

  const [isLoading, setIsLoading] = useState(!isInitialized);
  const [error, setError] = useState(null);

  // 🎯 자동 초기화
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      const initializeCapital = async () => {
        setIsLoading(true);
        setError(null);

        try {
          await initialize();
        } catch (err) {
          setError(err.message);
          console.error("자본금 초기화 실패:", err);
        } finally {
          setIsLoading(false);
        }
      };

      initializeCapital();
    } else if (isInitialized) {
      setIsLoading(false);
    }
  }, [autoInitialize, isInitialized, initialize]);

  // 🔥 자본금 업데이트 함수 (디바운싱 적용)
  const updateCapital = useCallback(
    (amount, source = "manual") => {
      if (!amount || amount <= 0) {
        setError("유효한 금액을 입력하세요");
        return false;
      }

      setError(null);
      const success = setCapital(amount, source);

      if (success) {
        // 다른 시스템들도 업데이트
        setTimeout(() => {
          // paperTradingEngine 업데이트
          if (window.paperTradingEngine?.updateInitialBalance) {
            window.paperTradingEngine.updateInitialBalance(amount);
          }

          // portfolioStore 동기화
          if (window.portfolioStore?.getState()?.initializeConfig) {
            window.portfolioStore.getState().initializeConfig();
          }
        }, 100);
      }

      return success;
    },
    [setCapital]
  );

  // 🎯 현재 자본금 조회
  const getCurrentCapital = useCallback(() => {
    return currentCapital || getCapital();
  }, [currentCapital, getCapital]);

  return {
    // 상태
    capital: getCurrentCapital(),
    initialCapital,
    currentCapital,
    isLoading,
    error,
    isInitialized,

    // 액션
    updateCapital,
    resetCapital: reset,
    initializeCapital: initialize,

    // 유틸리티
    stats: getStats(),

    // 포맷팅 함수
    formatCapital: (amount = getCurrentCapital()) => {
      return new Intl.NumberFormat("ko-KR").format(amount);
    },
  };
};

// 🎯 자본금 변경 감지 훅
export const useCapitalSubscription = (callback) => {
  useEffect(() => {
    const unsubscribe = subscribeToCapitalChanges(callback);
    return unsubscribe;
  }, [callback]);
};
