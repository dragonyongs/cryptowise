// src/stores/centralDataStore.js - 올바른 위치의 스토어
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCentralDataStore = create(
  persist(
    (set, get) => ({
      // 상태
      trades: [],
      signals: [],
      notifications: [],

      // 거래 추가
      addTrade: (trade) =>
        set((state) => ({
          trades: [
            {
              ...trade,
              id:
                trade.id ||
                `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: trade.timestamp || new Date(),
            },
            ...state.trades.slice(0, 49),
          ],
        })),

      // 신호 추가
      addSignal: (signal) =>
        set((state) => ({
          signals: [
            {
              ...signal,
              id:
                signal.id ||
                `signal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              timestamp: signal.timestamp || new Date(),
            },
            ...state.signals.slice(0, 29),
          ],
        })),

      // 알림 추가
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            {
              ...notification,
              id: notification.id || Date.now(),
              timestamp: notification.timestamp || new Date(),
            },
            ...state.notifications.slice(0, 9),
          ],
        })),

      // 전체 데이터 초기화
      clearAllData: () =>
        set({
          trades: [],
          signals: [],
          notifications: [],
        }),

      // 특정 타입 데이터 제거
      removeTrade: (tradeId) =>
        set((state) => ({
          trades: state.trades.filter((trade) => trade.id !== tradeId),
        })),

      removeSignal: (signalId) =>
        set((state) => ({
          signals: state.signals.filter((signal) => signal.id !== signalId),
        })),

      removeNotification: (notificationId) =>
        set((state) => ({
          notifications: state.notifications.filter(
            (notification) => notification.id !== notificationId
          ),
        })),
    }),
    {
      name: "central-data-store",
      version: 1,
      partialize: (state) => ({
        trades: state.trades,
        signals: state.signals,
        // notifications은 제외 (휘발성 데이터)
      }),
    }
  )
);
