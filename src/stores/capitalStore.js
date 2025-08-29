// src/stores/capitalStore.js - 새로 생성
import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";

const STORAGE_KEY = "cryptowise_capital_store";

export const useCapitalStore = create(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // 🎯 단일 진실 공급원
        initialCapital: 0,
        currentCapital: 0,

        // 📊 자본금 변경 기록
        capitalHistory: [],
        lastUpdated: null,

        // 🔄 초기화 상태
        isInitialized: false,

        // 🎯 자본금 설정 (모든 시스템 동기화)
        setCapital: (amount, source = "manual") => {
          if (!amount || amount <= 0) {
            console.warn("❌ 유효하지 않은 자본금:", amount);
            return false;
          }

          const previousAmount = get().currentCapital;
          const timestamp = new Date().toISOString();

          set((state) => ({
            initialCapital: amount,
            currentCapital: amount,
            capitalHistory: [
              ...state.capitalHistory.slice(-9), // 최근 10개만 유지
              {
                amount: previousAmount,
                newAmount: amount,
                source,
                timestamp,
              },
            ],
            lastUpdated: timestamp,
            isInitialized: true,
          }));

          // 🔥 모든 시스템에 동기화 이벤트 발생
          window.dispatchEvent(
            new CustomEvent("capital-changed", {
              detail: {
                amount,
                previousAmount,
                source,
                timestamp,
              },
            })
          );

          console.log(
            `✅ 자본금 업데이트: ${amount.toLocaleString()}원 (출처: ${source})`
          );
          return true;
        },

        // 🎯 자본금 조회 (캐시된 값)
        getCapital: () => {
          const state = get();
          return state.currentCapital || state.initialCapital || 0;
        },

        // 🎯 초기화 함수
        initialize: async (fallbackAmount = 3000000) => {
          const state = get();

          if (state.isInitialized && state.currentCapital > 0) {
            console.log(
              "🔄 이미 초기화됨:",
              state.currentCapital.toLocaleString()
            );
            return state.currentCapital;
          }

          try {
            // 1. localStorage에서 확인
            let foundAmount = 0;

            // 트레이딩 설정에서 확인
            const tradingSettings = localStorage.getItem(
              "cryptowise_trading_settings"
            );
            if (tradingSettings) {
              const parsed = JSON.parse(tradingSettings);
              foundAmount = parsed.portfolioValue || parsed.initialCapital;
            }

            // 포트폴리오 설정에서 확인
            if (!foundAmount) {
              const portfolioSettings =
                localStorage.getItem("cryptowise_config");
              if (portfolioSettings) {
                const parsed = JSON.parse(portfolioSettings);
                foundAmount = parsed.initialCapital;
              }
            }

            // Zustand persist에서 확인
            if (!foundAmount) {
              const portfolioStore = localStorage.getItem("portfolio-store");
              if (portfolioStore) {
                const parsed = JSON.parse(portfolioStore);
                foundAmount = parsed?.state?.config?.initialCapital;
              }
            }

            const finalAmount = foundAmount || fallbackAmount;
            get().setCapital(finalAmount, "initialization");

            return finalAmount;
          } catch (error) {
            console.error("❌ 자본금 초기화 실패:", error);
            get().setCapital(fallbackAmount, "fallback");
            return fallbackAmount;
          }
        },

        // 🎯 리셋 함수
        reset: (newAmount = 3000000) => {
          set({
            initialCapital: newAmount,
            currentCapital: newAmount,
            capitalHistory: [],
            lastUpdated: new Date().toISOString(),
            isInitialized: true,
          });

          // 다른 저장소들도 정리
          localStorage.removeItem("cryptowise_trading_settings");
          localStorage.removeItem("cryptowise_config");

          window.dispatchEvent(
            new CustomEvent("capital-reset", {
              detail: { amount: newAmount },
            })
          );

          console.log(`🔄 자본금 리셋: ${newAmount.toLocaleString()}원`);
          return true;
        },

        // 📊 통계 정보
        getStats: () => {
          const state = get();
          return {
            current: state.currentCapital,
            initial: state.initialCapital,
            changeCount: state.capitalHistory.length,
            lastChanged: state.lastUpdated,
            isInitialized: state.isInitialized,
          };
        },
      }),
      {
        name: STORAGE_KEY,
        partialize: (state) => ({
          initialCapital: state.initialCapital,
          currentCapital: state.currentCapital,
          capitalHistory: state.capitalHistory,
          lastUpdated: state.lastUpdated,
          isInitialized: state.isInitialized,
        }),
      }
    )
  )
);

// 🔥 자본금 변경 구독 함수
export const subscribeToCapitalChanges = (callback) => {
  return useCapitalStore.subscribe(
    (state) => state.currentCapital,
    (currentCapital, previousCapital) => {
      if (currentCapital !== previousCapital) {
        callback(currentCapital, previousCapital);
      }
    }
  );
};
