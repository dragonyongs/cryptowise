// src/config/portfolioConfig.js
import { useState, useCallback, useEffect, useRef, useMemo } from "react";

// 🎯 중앙화된 포트폴리오 상수
export const PORTFOLIO_CONSTANTS = {
  DEFAULT_INITIAL_BALANCE: 0,
  FALLBACK_INITIAL_BALANCE: 1840000,
  BACKUP_INITIAL_BALANCE: 2000000,

  CUSTOM_CAPITAL: {
    development: 3000000,
    testing: 5000000,
    demo: 10000000,
    production: null,
  },

  DEFAULT_ALLOCATIONS: {
    cash: 0.3,
    t1: 0.4,
    t2: 0.2,
    t3: 0.1,
  },

  DEFAULT_STRATEGY: {
    buyThreshold: 7.0,
    sellThreshold: 3.0,
    profitTarget: 8,
    stopLoss: -8,
    maxHoldingPeriod: 14,
    reentryDelay: 2,
    maxPositions: 4,
  },

  DEFAULT_INDICATORS: {
    rsi: {
      name: "RSI",
      description: "상대강도지수 - 과매수/과매도 구간 판단",
      enabled: true,
    },
    macd: {
      name: "MACD",
      description: "이동평균수렴확산 - 추세 변화 감지",
      enabled: true,
    },
    bollinger: {
      name: "볼린저 밴드",
      description: "가격 변동성과 지지/저항선 분석",
      enabled: true,
    },
    volume: {
      name: "거래량",
      description: "거래량 급증/급감 패턴 분석",
      enabled: true,
    },
    ma: {
      name: "이동평균선",
      description: "단기/장기 이동평균선 교차 신호",
      enabled: false,
    },
  },

  DEFAULT_RISK_MANAGEMENT: {
    maxPositionSize: 20,
    dailyLossLimit: 5,
    maxDrawdown: 15,
    emergencyCashRatio: 20,
  },

  FEE_CONFIG: {
    upbitFees: {
      maker: 0.0005,
      taker: 0.0005,
    },
    paperTradingFees: {
      enabled: true,
      rate: 0.0005,
    },
  },

  API_ENDPOINTS: {
    portfolio: {
      get: "/api/portfolio/get",
      update: "/api/portfolio/update",
      reset: "/api/portfolio/reset",
    },
    trading: {
      paperTrade: "/api/trading/paper",
      realTrade: "/api/trading/real",
      history: "/api/trading/history",
    },
    config: {
      get: "/api/config/get",
      save: "/api/config/save",
      reset: "/api/config/reset",
    },
  },
};

// 🔥 캐시된 포트폴리오 값 관리
class PortfolioValueCache {
  constructor() {
    this.cache = new Map();
    this.lastFetch = 0;
    this.CACHE_DURATION = 3000; // 3초 캐시
    this.isInitialized = false;
    this.subscribers = new Set();
  }

  // 구독자 등록
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // 구독자들에게 알림
  notifySubscribers(value) {
    this.subscribers.forEach((callback) => {
      try {
        callback(value);
      } catch (error) {
        console.warn("구독자 알림 실패:", error);
      }
    });
  }

  // 캐시된 값 가져오기 (메모이제이션)
  getCurrentValue() {
    const now = Date.now();

    // 캐시가 유효한 경우
    if (
      this.cache.has("portfolioValue") &&
      now - this.lastFetch < this.CACHE_DURATION
    ) {
      const cachedValue = this.cache.get("portfolioValue");
      if (cachedValue && cachedValue > 0) {
        return cachedValue;
      }
    }

    // 브라우저 환경 체크
    if (typeof window === "undefined") {
      return PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;
    }

    try {
      let portfolioValue = 0;

      // 우선순위 1: Zustand persist 스토어
      const stored = localStorage.getItem("portfolio-store");
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedValue = parsed?.state?.portfolioData?.totalValue;
        if (storedValue && storedValue > 0) {
          portfolioValue = storedValue;
        }
      }

      // 우선순위 2: 전역 포트폴리오 스토어
      if (!portfolioValue && window.__PORTFOLIO_STORE__) {
        const state = window.__PORTFOLIO_STORE__.getState();
        const storeValue = state?.portfolioData?.totalValue;
        if (storeValue && storeValue > 0) {
          portfolioValue = storeValue;
        }
      }

      // 우선순위 3: paperTradingEngine
      if (!portfolioValue && window.paperTradingEngine?.getPortfolioSummary) {
        const portfolio = window.paperTradingEngine.getPortfolioSummary();
        const engineValue = portfolio?.totalValue;
        if (engineValue && engineValue > 0) {
          portfolioValue = engineValue;
        }
      }

      // 우선순위 4: 트레이딩 설정
      if (!portfolioValue) {
        const settings = localStorage.getItem("cryptowise_trading_settings");
        if (settings) {
          const parsed = JSON.parse(settings);
          const settingsValue = parsed?.portfolioValue;
          if (settingsValue && settingsValue > 0) {
            portfolioValue = settingsValue;
          }
        }
      }

      // 우선순위 5: 일반 설정
      if (!portfolioValue) {
        const config = localStorage.getItem("cryptowise_config");
        if (config) {
          const parsed = JSON.parse(config);
          const configValue = parsed?.initialCapital;
          if (configValue && configValue > 0) {
            portfolioValue = configValue;
          }
        }
      }

      // 캐시 업데이트
      if (portfolioValue > 0) {
        this.cache.set("portfolioValue", portfolioValue);
        this.lastFetch = now;
        this.isInitialized = true;
        this.notifySubscribers(portfolioValue);

        // 로그는 초기화 시에만 출력
        if (!this.isInitialized) {
          console.log(
            "📊 포트폴리오 총액 초기화:",
            portfolioValue.toLocaleString()
          );
        }

        return portfolioValue;
      }
    } catch (error) {
      console.warn("포트폴리오 총액 조회 중 오류:", error);
    }

    // 기본값 반환
    return PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;
  }

  // 값 강제 업데이트
  updateValue(newValue) {
    if (newValue && newValue > 0) {
      this.cache.set("portfolioValue", newValue);
      this.lastFetch = Date.now();
      this.notifySubscribers(newValue);
      return true;
    }
    return false;
  }

  // 캐시 클리어
  clearCache() {
    this.cache.clear();
    this.lastFetch = 0;
    this.isInitialized = false;
  }
}

// 전역 캐시 인스턴스
const portfolioValueCache = new PortfolioValueCache();

// 🎯 메인 설정 객체 (최적화됨)
export const PORTFOLIO_CONFIG = {
  // 🔥 캐시된 초기 자본 getter (무한 호출 방지)
  get INITIAL_CAPITAL() {
    return portfolioValueCache.getCurrentValue();
  },

  CUSTOM_CAPITAL: PORTFOLIO_CONSTANTS.CUSTOM_CAPITAL,
  DEFAULT_ALLOCATIONS: PORTFOLIO_CONSTANTS.DEFAULT_ALLOCATIONS,
  DEFAULT_STRATEGY: PORTFOLIO_CONSTANTS.DEFAULT_STRATEGY,
  DEFAULT_INDICATORS: PORTFOLIO_CONSTANTS.DEFAULT_INDICATORS,
  DEFAULT_RISK_MANAGEMENT: PORTFOLIO_CONSTANTS.DEFAULT_RISK_MANAGEMENT,

  // 🔥 캐시된 포트폴리오 값 가져오기
  getCurrentPortfolioValue: () => portfolioValueCache.getCurrentValue(),

  // 🔥 초기 자본 유효성 검사 (메모이제이션)
  hasValidInitialCapital: () => {
    const currentValue = portfolioValueCache.getCurrentValue();
    return currentValue > 0;
  },

  // 🔥 디바운싱된 초기 자본 설정 함수
  setInitialCapital: (() => {
    let timeoutId = null;

    return (amount) => {
      if (typeof window === "undefined" || !amount || amount <= 0) {
        console.warn("초기 자본 설정 실패: 유효하지 않은 값", amount);
        return false;
      }

      // 디바운싱 적용
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        try {
          console.log("💾 초기 자본 설정 시작:", amount.toLocaleString());

          // 1. 트레이딩 설정에 저장
          const currentTradingSettings = localStorage.getItem(
            "cryptowise_trading_settings"
          );
          const tradingSettings = currentTradingSettings
            ? JSON.parse(currentTradingSettings)
            : {};
          tradingSettings.portfolioValue = amount;
          tradingSettings.updatedAt = new Date().toISOString();
          localStorage.setItem(
            "cryptowise_trading_settings",
            JSON.stringify(tradingSettings)
          );

          // 2. 일반 설정에도 저장
          const currentConfig = localStorage.getItem("cryptowise_config");
          const config = currentConfig ? JSON.parse(currentConfig) : {};
          config.initialCapital = amount;
          config.updatedAt = new Date().toISOString();
          localStorage.setItem("cryptowise_config", JSON.stringify(config));

          // 3. paperTradingEngine에 반영
          if (window.paperTradingEngine?.updateInitialBalance) {
            window.paperTradingEngine.updateInitialBalance(amount);
          }

          // 4. 캐시 업데이트
          portfolioValueCache.updateValue(amount);

          console.log("✅ 초기 자본 설정 완료:", amount.toLocaleString());

          // 5. 이벤트 발생 (디바운싱됨)
          window.dispatchEvent(
            new CustomEvent("portfolio-capital-updated", {
              detail: { amount, timestamp: new Date().toISOString() },
            })
          );
        } catch (error) {
          console.error("초기 자본 설정 실패:", error);
        }
      }, 300); // 300ms 디바운싱

      return true;
    };
  })(),

  // 🔥 비동기 초기 자본 가져오기 (캐시됨)
  getInitialCapital: async (
    customAmount = null,
    environment = "development",
    userId = null
  ) => {
    // 커스텀 금액이 있으면 우선 사용
    if (customAmount && customAmount > 0) {
      console.log("🎯 커스텀 초기 자본 사용:", customAmount.toLocaleString());
      portfolioValueCache.updateValue(customAmount);
      return customAmount;
    }

    // 캐시된 값 사용
    const currentValue = portfolioValueCache.getCurrentValue();
    if (currentValue > 0) {
      return currentValue;
    }

    // API 연동 (프로덕션 환경)
    if (environment === "production" && userId) {
      try {
        console.log("🚀 프로덕션 환경: API 연동 예정");
        return PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;
      } catch (error) {
        console.warn("API에서 초기 자본을 가져오는데 실패:", error);
        return PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;
      }
    }

    // 환경별 기본값
    const envCapital = PORTFOLIO_CONSTANTS.CUSTOM_CAPITAL[environment];
    if (envCapital) {
      portfolioValueCache.updateValue(envCapital);
      console.log(
        `🌍 ${environment} 환경 기본값 사용:`,
        envCapital.toLocaleString()
      );
      return envCapital;
    }

    return PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;
  },

  // 수수료 계산 함수 (메모이제이션)
  calculateTradeFee: (() => {
    const cache = new Map();

    return (tradeValueKRW, feeType = "paperTrading") => {
      const cacheKey = `${tradeValueKRW}_${feeType}`;

      if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
      }

      const feeConfig = PORTFOLIO_CONSTANTS.FEE_CONFIG;
      let fee = 0;

      if (feeType === "paperTrading" && feeConfig.paperTradingFees.enabled) {
        fee = tradeValueKRW * feeConfig.paperTradingFees.rate;
      } else if (feeType === "upbit") {
        fee = tradeValueKRW * feeConfig.upbitFees.taker;
      }

      cache.set(cacheKey, fee);
      return fee;
    };
  })(),

  // 🔥 포트폴리오 데이터 리셋 (개선됨)
  resetPortfolioData: () => {
    try {
      console.log("🔄 포트폴리오 데이터 리셋 시작");

      // 캐시 클리어
      portfolioValueCache.clearCache();

      // 로컬 스토리지 클리어
      localStorage.removeItem("portfolio-store");
      localStorage.removeItem("cryptowise_trading_settings");
      localStorage.removeItem("cryptowise_config");

      // paperTradingEngine 리셋
      if (window.paperTradingEngine?.reset) {
        window.paperTradingEngine.reset();
      }

      // 이벤트 발생
      window.dispatchEvent(new CustomEvent("portfolio-data-reset"));
      console.log("✅ 포트폴리오 데이터 리셋 완료");

      return true;
    } catch (error) {
      console.error("포트폴리오 데이터 리셋 실패:", error);
      return false;
    }
  },

  // 🔥 설정 동기화 (디바운싱됨)
  syncAllSettings: (() => {
    let timeoutId = null;

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        try {
          const currentValue = portfolioValueCache.getCurrentValue();
          if (currentValue > 0) {
            PORTFOLIO_CONFIG.setInitialCapital(currentValue);
            return true;
          }
          return false;
        } catch (error) {
          console.error("설정 동기화 실패:", error);
          return false;
        }
      }, 500);
    };
  })(),

  // 캐시 구독 함수
  subscribeToValueChanges: (callback) =>
    portfolioValueCache.subscribe(callback),

  // 상수 액세스
  getConstants: () => PORTFOLIO_CONSTANTS,
};

// 🎯 최적화된 포트폴리오 설정 훅
export const usePortfolioConfig = (customCapital = null, userId = null) => {
  const environment = process.env.NODE_ENV;
  const mountedRef = useRef(true);
  const updateTimeoutRef = useRef(null);

  // 🔥 메모이제이션된 초기 설정
  const initialConfig = useMemo(
    () => ({
      initialCapital: portfolioValueCache.getCurrentValue(),
      allocations: { ...PORTFOLIO_CONSTANTS.DEFAULT_ALLOCATIONS },
      strategy: { ...PORTFOLIO_CONSTANTS.DEFAULT_STRATEGY },
      indicators: { ...PORTFOLIO_CONSTANTS.DEFAULT_INDICATORS },
      riskManagement: { ...PORTFOLIO_CONSTANTS.DEFAULT_RISK_MANAGEMENT },
      feeConfig: { ...PORTFOLIO_CONSTANTS.FEE_CONFIG },
    }),
    []
  );

  const [config, setConfig] = useState(initialConfig);
  const [originalConfig, setOriginalConfig] = useState(initialConfig);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔥 디바운싱된 설정 업데이트 함수
  const debouncedUpdateConfig = useCallback((updates) => {
    if (!mountedRef.current) return;

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }

    updateTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setConfig((prevConfig) => ({ ...prevConfig, ...updates }));
        setError(null);
      }
    }, 100);
  }, []);

  // 🔥 포트폴리오 값 변경 구독 (한 번만 등록)
  useEffect(() => {
    const unsubscribe = PORTFOLIO_CONFIG.subscribeToValueChanges((newValue) => {
      if (mountedRef.current && newValue !== config.initialCapital) {
        debouncedUpdateConfig({ initialCapital: newValue });
      }
    });

    return unsubscribe;
  }, [config.initialCapital, debouncedUpdateConfig]);

  // 🔥 초기 자본 로드 (한 번만)
  useEffect(() => {
    let isMounted = true;

    const loadInitialCapital = async () => {
      if (!isMounted) return;

      try {
        setIsLoading(true);
        const initialCapital = await PORTFOLIO_CONFIG.getInitialCapital(
          customCapital,
          environment,
          userId
        );

        if (isMounted && initialCapital !== config.initialCapital) {
          const updatedConfig = { ...config, initialCapital };
          setConfig(updatedConfig);
          setOriginalConfig(updatedConfig);
        }
      } catch (error) {
        if (isMounted) {
          console.error("초기 자본 로드 실패:", error);
          setError("초기 자본을 불러오는데 실패했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialCapital();

    return () => {
      isMounted = false;
    };
  }, [customCapital, userId, environment]); // config.initialCapital 제거

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // 설정 변경 여부 계산 (메모이제이션)
  const isDirty = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(originalConfig),
    [config, originalConfig]
  );

  // 설정 업데이트
  const updateConfig = useCallback(
    (updates) => {
      debouncedUpdateConfig(updates);
    },
    [debouncedUpdateConfig]
  );

  // 기본값으로 초기화
  const resetToDefaults = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      const initialCapital = portfolioValueCache.getCurrentValue();
      const defaultConfig = {
        initialCapital,
        allocations: { ...PORTFOLIO_CONSTANTS.DEFAULT_ALLOCATIONS },
        strategy: { ...PORTFOLIO_CONSTANTS.DEFAULT_STRATEGY },
        indicators: { ...PORTFOLIO_CONSTANTS.DEFAULT_INDICATORS },
        riskManagement: { ...PORTFOLIO_CONSTANTS.DEFAULT_RISK_MANAGEMENT },
        feeConfig: { ...PORTFOLIO_CONSTANTS.FEE_CONFIG },
      };

      setConfig(defaultConfig);
      setError(null);
      console.log("🔄 설정 기본값 초기화 완료");
    } catch (error) {
      console.error("기본값 초기화 실패:", error);
      setError("기본값으로 초기화하는데 실패했습니다.");
    }
  }, []);

  // 설정 저장
  const saveConfig = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // API 연동 (프로덕션)
      if (environment === "production" && userId) {
        // 추후 API 호출
      }

      // 로컬 스토리지에 저장
      localStorage.setItem("cryptowise_config", JSON.stringify(config));

      // 시뮬레이션 딜레이
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (mountedRef.current) {
        setOriginalConfig(config);
        console.log("✅ 설정이 저장되었습니다:", config);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError("설정 저장 중 오류가 발생했습니다.");
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [config, environment, userId]);

  return {
    config,
    updateConfig,
    resetToDefaults,
    saveConfig,
    isDirty,
    isLoading,
    error,
    isCustomCapital: !!customCapital,
    environment,
    userId,
    constants: PORTFOLIO_CONSTANTS,
    calculateTradeFee: PORTFOLIO_CONFIG.calculateTradeFee,
    getCurrentPortfolioValue: PORTFOLIO_CONFIG.getCurrentPortfolioValue,
    hasValidInitialCapital: PORTFOLIO_CONFIG.hasValidInitialCapital,
    setInitialCapital: PORTFOLIO_CONFIG.setInitialCapital,
    syncAllSettings: PORTFOLIO_CONFIG.syncAllSettings,
  };
};

// 🎯 호환성을 위한 매니저 (최적화됨)
export const portfolioConfigManager = {
  development: async (amount) => {
    return (
      amount ||
      (await PORTFOLIO_CONFIG.getInitialCapital(amount, "development"))
    );
  },
  testing: async (amount) => {
    return (
      amount || (await PORTFOLIO_CONFIG.getInitialCapital(amount, "testing"))
    );
  },
  production: async (apiCredentials, userId) => {
    return await PORTFOLIO_CONFIG.getInitialCapital(null, "production", userId);
  },
  getConstants: () => PORTFOLIO_CONSTANTS,
  calculateFee: PORTFOLIO_CONFIG.calculateTradeFee,
  getCurrentPortfolioValue: PORTFOLIO_CONFIG.getCurrentPortfolioValue,
  hasValidInitialCapital: PORTFOLIO_CONFIG.hasValidInitialCapital,
  setInitialCapital: PORTFOLIO_CONFIG.setInitialCapital,
  syncAllSettings: PORTFOLIO_CONFIG.syncAllSettings,
  resetPortfolioData: PORTFOLIO_CONFIG.resetPortfolioData,
};
