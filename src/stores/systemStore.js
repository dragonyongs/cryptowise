import { create } from "zustand";

export const useSystemStore = create((set, get) => ({
  systemHealth: {
    api: "healthy", // healthy, warning, error
    database: "healthy",
    trading: "healthy",
    lastCheck: new Date().toISOString(),
  },
  isConnected: true,
  notifications: [
    {
      id: 1,
      type: "info",
      title: "시스템 정상",
      message: "모든 시스템이 정상 작동 중입니다",
      timestamp: new Date().toISOString(),
      priority: "low",
    },
  ],

  // API 호출 제한 추적
  apiLimits: {
    coingecko: { used: 0, limit: 30, resetAt: null },
    upbit: { used: 0, limit: 100, resetAt: null },
    news: { used: 0, limit: 50, resetAt: null },
  },

  checkSystemHealth: async () => {
    // 실제로는 서버 상태 확인 API 호출
    const health = {
      api: Math.random() > 0.9 ? "warning" : "healthy",
      database: Math.random() > 0.95 ? "error" : "healthy",
      trading: Math.random() > 0.85 ? "warning" : "healthy",
      lastCheck: new Date().toISOString(),
    };

    set({ systemHealth: health });
    return health;
  },

  updateApiUsage: (service, count) => {
    const limits = get().apiLimits;
    set({
      apiLimits: {
        ...limits,
        [service]: {
          ...limits[service],
          used: limits[service].used + count,
        },
      },
    });
  },

  addNotification: (notification) => {
    const notifications = get().notifications;
    set({
      notifications: [
        {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          ...notification,
        },
        ...notifications,
      ].slice(0, 10), // 최대 10개만 유지
    });
  },
}));
