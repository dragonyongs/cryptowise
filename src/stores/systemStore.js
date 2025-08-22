// stores/systemStore.js
import { create } from "zustand";
import { upbitMarketService } from "../services/upbit/upbitMarketService";

export const useSystemStore = create((set, get) => ({
  // 시스템 상태
  systemHealth: {
    api: "checking",
    database: "checking",
    trading: "checking",
    lastCheck: null,
  },

  isConnected: navigator.onLine || true,
  isCheckingHealth: false,
  lastHealthCheck: null,

  notifications: [],

  // ✅ upbitMarketService의 API 제한 추적과 연동
  apiLimits: {
    coingecko: { used: 0, limit: 30, resetAt: null },
    upbit: { used: 0, limit: 100, resetAt: null },
    news: { used: 0, limit: 50, resetAt: null },
  },

  // ✅ 실제 시스템 상태 체크 (프록시 API 사용)
  checkSystemHealth: async () => {
    const startTime = Date.now();
    set({ isCheckingHealth: true });

    try {
      const health = {
        api: "healthy",
        database: "healthy",
        trading: "healthy",
        lastCheck: new Date().toISOString(),
      };

      // ✅ upbitMarketService의 healthCheck 메서드 사용
      const upbitHealth = await upbitMarketService.healthCheck();

      if (upbitHealth.status === "unhealthy") {
        health.api = "error";
        health.trading = "error";
        console.warn("업비트 API 연결 실패:", upbitHealth.error);
      } else if (upbitHealth.responseTime > 3000) {
        health.api = "warning";
        health.trading = "warning";
      }

      // ✅ 네트워크 연결 상태 체크 (기존 유지)
      const isOnline = navigator.onLine;
      if (!isOnline) {
        health.api = "error";
        health.database = "error";
        health.trading = "error";
      }

      // ✅ upbitMarketService의 서비스 통계 연동
      const serviceStats = upbitMarketService.getServiceStats();
      const currentApiUsage = {
        upbit: {
          used: serviceStats.performance.totalApiCalls,
          limit: 100, // 업비트 기본 제한
          resetAt: null,
        },
      };

      set({
        systemHealth: health,
        isConnected: isOnline,
        lastHealthCheck: Date.now(),
        isCheckingHealth: false,
        apiLimits: {
          ...get().apiLimits,
          ...currentApiUsage,
        },
      });

      // 성능 알림
      const checkDuration = Date.now() - startTime;
      if (checkDuration > 3000) {
        get().addNotification({
          type: "warning",
          title: "시스템 응답 지연",
          message: `시스템 체크가 ${Math.round(checkDuration / 1000)}초 소요되었습니다`,
          priority: "medium",
        });
      }

      // API 사용률 경고
      if (serviceStats.performance.totalApiCalls >= 80) {
        get().addNotification({
          type: "warning",
          title: "API 사용률 높음",
          message: `업비트 API ${serviceStats.performance.totalApiCalls}/100 사용 중`,
          priority: "medium",
        });
      }

      return health;
    } catch (error) {
      console.error("시스템 상태 체크 오류:", error);
      const errorHealth = {
        api: "error",
        database: "error",
        trading: "error",
        lastCheck: new Date().toISOString(),
      };

      set({
        systemHealth: errorHealth,
        isCheckingHealth: false,
        lastHealthCheck: Date.now(),
      });

      get().addNotification({
        type: "error",
        title: "시스템 체크 실패",
        message: error.message || "시스템 상태를 확인할 수 없습니다",
        priority: "high",
      });

      return errorHealth;
    }
  },

  // ✅ 고급 시스템 진단 (여러 서비스 동시 체크)
  performComprehensiveCheck: async () => {
    set({ isCheckingHealth: true });

    try {
      const results = await Promise.allSettled([
        // 업비트 마켓 리스트 테스트
        upbitMarketService.getMarketList(true),
        // 업비트 티커 데이터 테스트 (소량)
        upbitMarketService.getTickerData(["BTC", "ETH"]),
        // 투자 가능 코인 테스트
        upbitMarketService.getInvestableCoins(true),
      ]);

      const health = {
        api: "healthy",
        database: "healthy",
        trading: "healthy",
        lastCheck: new Date().toISOString(),
      };

      let hasWarnings = 0;
      let hasErrors = 0;

      results.forEach((result, index) => {
        const testNames = ["마켓리스트", "티커데이터", "투자가능코인"];

        if (result.status === "rejected") {
          console.warn(`${testNames[index]} 테스트 실패:`, result.reason);
          hasErrors++;
        } else if (
          result.value &&
          Array.isArray(result.value) &&
          result.value.length === 0
        ) {
          console.warn(`${testNames[index]} 테스트: 빈 결과`);
          hasWarnings++;
        }
      });

      // 결과에 따른 상태 조정
      if (hasErrors >= 2) {
        health.api = "error";
        health.trading = "error";
      } else if (hasErrors >= 1 || hasWarnings >= 2) {
        health.api = "warning";
        health.trading = "warning";
      }

      set({
        systemHealth: health,
        isCheckingHealth: false,
        lastHealthCheck: Date.now(),
      });

      // 종합 진단 결과 알림
      const totalTests = results.length;
      const successCount = results.filter(
        (r) => r.status === "fulfilled"
      ).length;

      get().addNotification({
        type:
          successCount === totalTests
            ? "success"
            : successCount >= totalTests * 0.7
              ? "warning"
              : "error",
        title: "종합 시스템 진단 완료",
        message: `${totalTests}개 테스트 중 ${successCount}개 성공`,
        priority: "medium",
      });

      return health;
    } catch (error) {
      console.error("종합 진단 실패:", error);

      set({
        systemHealth: {
          api: "error",
          database: "error",
          trading: "error",
          lastCheck: new Date().toISOString(),
        },
        isCheckingHealth: false,
      });

      return null;
    }
  },

  // ✅ 네트워크 상태 업데이트
  setConnectionStatus: (isConnected) => {
    set({ isConnected });

    if (!isConnected) {
      get().addNotification({
        type: "error",
        title: "네트워크 연결 끊김",
        message: "인터넷 연결을 확인해주세요",
        priority: "high",
      });
    } else {
      get().addNotification({
        type: "success",
        title: "네트워크 연결 복구",
        message: "인터넷 연결이 복구되었습니다",
        priority: "medium",
      });

      // 연결 복구 시 자동 상태 체크
      setTimeout(() => {
        get().checkSystemHealth();
      }, 1000);
    }
  },

  // ✅ API 사용량 업데이트 (upbitMarketService와 동기화)
  updateApiUsage: (service, count) => {
    const limits = get().apiLimits;
    const newUsed = limits[service].used + count;
    const limit = limits[service].limit;

    set({
      apiLimits: {
        ...limits,
        [service]: {
          ...limits[service],
          used: newUsed,
        },
      },
    });

    // upbitMarketService에도 동기화
    if (service === "upbit") {
      upbitMarketService.updateApiUsage("upbit", count);
    }

    // API 제한 경고
    if (newUsed >= limit * 0.8) {
      get().addNotification({
        type: "warning",
        title: `${service.toUpperCase()} API 제한 임박`,
        message: `${newUsed}/${limit} 사용 중 (${Math.round((newUsed / limit) * 100)}%)`,
        priority: "medium",
      });
    }

    // 제한 초과 시 에러
    if (newUsed >= limit) {
      get().addNotification({
        type: "error",
        title: `${service.toUpperCase()} API 제한 초과`,
        message: "API 사용량이 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
        priority: "high",
      });
    }
  },

  // ✅ upbitMarketService 상태와 동기화
  syncWithUpbitService: () => {
    const serviceStats = upbitMarketService.getServiceStats();
    const currentLimits = get().apiLimits;

    set({
      apiLimits: {
        ...currentLimits,
        upbit: {
          used: serviceStats.performance.totalApiCalls,
          limit: 100,
          resetAt: serviceStats.performance.lastResponse,
        },
      },
    });

    // 서비스 에러율이 높으면 경고
    const errorRate =
      serviceStats.performance.errorCount /
      Math.max(serviceStats.performance.totalApiCalls, 1);
    if (errorRate > 0.1 && serviceStats.performance.totalApiCalls > 5) {
      get().addNotification({
        type: "warning",
        title: "API 에러율 높음",
        message: `업비트 API 에러율: ${Math.round(errorRate * 100)}%`,
        priority: "medium",
      });
    }
  },

  // 기존 알림 관련 메서드들...
  addNotification: (notification) => {
    const notifications = get().notifications;
    const newNotification = {
      id: Date.now() + Math.random(), // 더 유니크한 ID
      timestamp: new Date().toISOString(),
      ...notification,
    };

    set({
      notifications: [newNotification, ...notifications].slice(0, 10),
    });

    // 자동 제거
    const autoRemoveTime =
      notification.type === "error"
        ? 10000
        : notification.type === "warning"
          ? 7000
          : 5000;

    setTimeout(() => {
      get().removeNotification(newNotification.id);
    }, autoRemoveTime);
  },

  removeNotification: (id) => {
    const notifications = get().notifications;
    set({
      notifications: notifications.filter((n) => n.id !== id),
    });
  },

  // ✅ 시스템 상태 요약
  getSystemSummary: () => {
    const { systemHealth, apiLimits, isConnected } = get();
    const serviceStats = upbitMarketService.getServiceStats();

    return {
      overall: Object.values(systemHealth).every(
        (status) => status === "healthy"
      )
        ? "healthy"
        : Object.values(systemHealth).some((status) => status === "error")
          ? "error"
          : "warning",
      details: {
        network: isConnected ? "connected" : "disconnected",
        api: systemHealth.api,
        trading: systemHealth.trading,
        upbitStats: {
          totalCalls: serviceStats.performance.totalApiCalls,
          errorRate: Math.round(
            (serviceStats.performance.errorCount /
              Math.max(serviceStats.performance.totalApiCalls, 1)) *
              100
          ),
          avgResponseTime: serviceStats.performance.avgResponseTime,
          marketType: serviceStats.currentMarket,
        },
        apiUsage: Object.entries(apiLimits).map(([service, limit]) => ({
          service,
          usage: Math.round((limit.used / limit.limit) * 100),
          remaining: limit.limit - limit.used,
        })),
      },
    };
  },
}));
