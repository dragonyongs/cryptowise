// src/config/portfolioConfig.js

import { useState, useCallback, useEffect } from "react";

// 🎯 중앙화된 포트폴리오 상수
export const PORTFOLIO_CONSTANTS = {
  // 🔥 초기값 0으로 설정 (하드코딩 완전 제거)
  DEFAULT_INITIAL_BALANCE: 0, // 데이터 로딩 전 상태
  FALLBACK_INITIAL_BALANCE: 1840000, // 완전 백업용
  BACKUP_INITIAL_BALANCE: 2000000,

  // 환경별 커스텀 자본 설정
  CUSTOM_CAPITAL: {
    development: 3000000,
    testing: 5000000,
    demo: 10000000,
    production: null, // API에서 가져올 예정
  },

  // 기본 포트폴리오 할당
  DEFAULT_ALLOCATIONS: {
    cash: 0.3,
    t1: 0.4,
    t2: 0.2,
    t3: 0.1,
  },

  // 기본 거래 전략
  DEFAULT_STRATEGY: {
    buyThreshold: 7.0,
    sellThreshold: 3.0,
    profitTarget: 8,
    stopLoss: -8,
    maxHoldingPeriod: 14,
    reentryDelay: 2,
    maxPositions: 4,
  },

  // 기본 기술적 지표
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

  // 기본 리스크 관리
  DEFAULT_RISK_MANAGEMENT: {
    maxPositionSize: 20,
    dailyLossLimit: 5,
    maxDrawdown: 15,
    emergencyCashRatio: 20,
  },

  // 수수료 설정
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

  // API 엔드포인트
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

// 🎯 메인 설정 객체
export const PORTFOLIO_CONFIG = {
  // 🔥 동적 초기 자본 getter
  get INITIAL_CAPITAL() {
    return this.getCurrentPortfolioValue();
  },

  // 기존 설정들 유지
  CUSTOM_CAPITAL: PORTFOLIO_CONSTANTS.CUSTOM_CAPITAL,
  DEFAULT_ALLOCATIONS: PORTFOLIO_CONSTANTS.DEFAULT_ALLOCATIONS,
  DEFAULT_STRATEGY: PORTFOLIO_CONSTANTS.DEFAULT_STRATEGY,
  DEFAULT_INDICATORS: PORTFOLIO_CONSTANTS.DEFAULT_INDICATORS,
  DEFAULT_RISK_MANAGEMENT: PORTFOLIO_CONSTANTS.DEFAULT_RISK_MANAGEMENT,

  // 🔥 포트폴리오 스토어에서 실제 총액 가져오기 (우선순위별 로드)
  getCurrentPortfolioValue: () => {
    // 브라우저 환경 체크
    if (typeof window === "undefined") {
      return PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;
    }

    try {
      console.log("🔍 포트폴리오 총액 조회 시작...");

      // 🎯 우선순위 1: Zustand persist 스토어
      const stored = localStorage.getItem("portfolio-store");
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedValue = parsed?.state?.portfolioData?.totalValue;
        if (storedValue && storedValue > 0) {
          console.log(
            "📊 Zustand 스토어에서 총액 조회:",
            storedValue.toLocaleString()
          );
          return storedValue;
        }
      }

      // 🎯 우선순위 2: 전역 포트폴리오 스토어
      if (window.__PORTFOLIO_STORE__) {
        const state = window.__PORTFOLIO_STORE__.getState();
        const storeValue = state?.portfolioData?.totalValue;
        if (storeValue && storeValue > 0) {
          console.log(
            "📊 전역 스토어에서 총액 조회:",
            storeValue.toLocaleString()
          );
          return storeValue;
        }
      }

      // 🎯 우선순위 3: paperTradingEngine
      if (
        window.paperTradingEngine &&
        typeof window.paperTradingEngine.getPortfolioSummary === "function"
      ) {
        const portfolio = window.paperTradingEngine.getPortfolioSummary();
        const engineValue = portfolio?.totalValue;
        if (engineValue && engineValue > 0) {
          console.log(
            "📊 트레이딩 엔진에서 총액 조회:",
            engineValue.toLocaleString()
          );
          return engineValue;
        }
      }

      // 🎯 우선순위 4: 트레이딩 설정
      const settings = localStorage.getItem("cryptowise_trading_settings");
      if (settings) {
        const parsed = JSON.parse(settings);
        const settingsValue = parsed?.portfolioValue;
        if (settingsValue && settingsValue > 0) {
          console.log(
            "⚙️ 트레이딩 설정에서 총액 조회:",
            settingsValue.toLocaleString()
          );
          return settingsValue;
        }
      }

      // 🎯 우선순위 5: 일반 설정
      const config = localStorage.getItem("cryptowise_config");
      if (config) {
        const parsed = JSON.parse(config);
        const configValue = parsed?.initialCapital;
        if (configValue && configValue > 0) {
          console.log(
            "🔧 일반 설정에서 총액 조회:",
            configValue.toLocaleString()
          );
          return configValue;
        }
      }
    } catch (error) {
      console.warn("포트폴리오 총액 조회 중 오류:", error);
    }

    // 🔥 기본값 0 반환 (데이터 로딩 중)
    console.log("⏳ 포트폴리오 데이터 로딩 중... 기본값 0 반환");
    return PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;
  },

  // 🔥 초기 자본 유효성 검사
  hasValidInitialCapital: () => {
    const currentValue = PORTFOLIO_CONFIG.getCurrentPortfolioValue();
    return currentValue > 0;
  },

  // 🔥 초기 자본 설정 함수
  setInitialCapital: (amount) => {
    if (typeof window === "undefined" || !amount || amount <= 0) {
      console.warn("초기 자본 설정 실패: 유효하지 않은 값", amount);
      return false;
    }

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
      if (
        window.paperTradingEngine &&
        typeof window.paperTradingEngine.updateInitialBalance === "function"
      ) {
        window.paperTradingEngine.updateInitialBalance(amount);
      }

      console.log("✅ 초기 자본 설정 완료:", amount.toLocaleString());

      // 4. 이벤트 발생 (다른 컴포넌트 알림)
      window.dispatchEvent(
        new CustomEvent("portfolio-capital-updated", {
          detail: { amount, timestamp: new Date().toISOString() },
        })
      );

      return true;
    } catch (error) {
      console.error("초기 자본 설정 실패:", error);
      return false;
    }
  },

  // 🔥 환경별 초기 자본 가져오기
  getInitialCapital: async (
    customAmount = null,
    environment = "development",
    userId = null
  ) => {
    // 커스텀 금액이 있으면 우선 사용
    if (customAmount && customAmount > 0) {
      console.log("🎯 커스텀 초기 자본 사용:", customAmount.toLocaleString());
      return customAmount;
    }

    // 🔥 현재 포트폴리오에서 실제 값 가져오기
    const currentValue = PORTFOLIO_CONFIG.getCurrentPortfolioValue();
    if (currentValue > 0) {
      console.log(
        "📊 현재 포트폴리오 총액 사용:",
        currentValue.toLocaleString()
      );
      return currentValue;
    }

    // API 연동 (프로덕션 환경)
    if (environment === "production" && userId) {
      try {
        // 추후 실제 API 호출 시 사용
        // const response = await fetch(`${PORTFOLIO_CONSTANTS.API_ENDPOINTS.config.get}?userId=${userId}`);
        // const data = await response.json();
        // return data.initialBalance || PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;

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
      console.log(
        `🌍 ${environment} 환경 기본값 사용:`,
        envCapital.toLocaleString()
      );
      return envCapital;
    }

    console.log(
      "⚙️ 기본 초기 자본 사용:",
      PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE
    );
    return PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;
  },

  // 중앙화된 상수 액세스
  getConstants: () => PORTFOLIO_CONSTANTS,

  // 수수료 계산 함수
  calculateTradeFee: (tradeValueKRW, feeType = "paperTrading") => {
    const feeConfig = PORTFOLIO_CONSTANTS.FEE_CONFIG;

    if (feeType === "paperTrading" && feeConfig.paperTradingFees.enabled) {
      return tradeValueKRW * feeConfig.paperTradingFees.rate;
    }

    if (feeType === "upbit") {
      return tradeValueKRW * feeConfig.upbitFees.taker;
    }

    return 0;
  },

  // 🔥 포트폴리오 데이터 리셋
  resetPortfolioData: () => {
    try {
      console.log("🔄 포트폴리오 데이터 리셋 시작");

      // 로컬 스토리지 클리어
      localStorage.removeItem("portfolio-store");
      localStorage.removeItem("cryptowise_trading_settings");
      localStorage.removeItem("cryptowise_config");

      // paperTradingEngine 리셋
      if (
        window.paperTradingEngine &&
        typeof window.paperTradingEngine.reset === "function"
      ) {
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

  // 🔥 설정 동기화
  syncAllSettings: () => {
    try {
      const currentValue = PORTFOLIO_CONFIG.getCurrentPortfolioValue();
      if (currentValue > 0) {
        PORTFOLIO_CONFIG.setInitialCapital(currentValue);
        return true;
      }
      return false;
    } catch (error) {
      console.error("설정 동기화 실패:", error);
      return false;
    }
  },
};

// 🎯 포트폴리오 설정 훅
export const usePortfolioConfig = (customCapital = null, userId = null) => {
  const environment = process.env.NODE_ENV;

  // 🔥 동적 초기 자본 상태
  const [config, setConfig] = useState(() => ({
    initialCapital: PORTFOLIO_CONFIG.getCurrentPortfolioValue(),
    allocations: { ...PORTFOLIO_CONSTANTS.DEFAULT_ALLOCATIONS },
    strategy: { ...PORTFOLIO_CONSTANTS.DEFAULT_STRATEGY },
    indicators: { ...PORTFOLIO_CONSTANTS.DEFAULT_INDICATORS },
    riskManagement: { ...PORTFOLIO_CONSTANTS.DEFAULT_RISK_MANAGEMENT },
    feeConfig: { ...PORTFOLIO_CONSTANTS.FEE_CONFIG },
  }));

  const [originalConfig, setOriginalConfig] = useState(config);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 🔥 포트폴리오 변경 감지 및 자동 업데이트
  useEffect(() => {
    let updateTimeout;

    const updateInitialCapital = () => {
      // 디바운싱 적용
      if (updateTimeout) clearTimeout(updateTimeout);

      updateTimeout = setTimeout(() => {
        const currentValue = PORTFOLIO_CONFIG.getCurrentPortfolioValue();
        if (currentValue !== config.initialCapital) {
          console.log("🔄 초기 자본 자동 업데이트:", {
            이전값: config.initialCapital,
            새값: currentValue,
          });

          setConfig((prev) => ({
            ...prev,
            initialCapital: currentValue,
          }));
        }
      }, 1000);
    };

    // 주기적 업데이트 (5초마다)
    const interval = setInterval(updateInitialCapital, 5000);

    // 이벤트 리스너들
    const handlePortfolioUpdate = updateInitialCapital;
    const handleCapitalUpdate = (event) => {
      const newAmount = event.detail?.amount;
      if (newAmount && newAmount > 0) {
        setConfig((prev) => ({
          ...prev,
          initialCapital: newAmount,
        }));
      }
    };
    const handleDataReset = () => {
      setConfig((prev) => ({
        ...prev,
        initialCapital: PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE,
      }));
    };

    if (typeof window !== "undefined") {
      window.addEventListener("portfolio-updated", handlePortfolioUpdate);
      window.addEventListener("portfolio-capital-updated", handleCapitalUpdate);
      window.addEventListener("portfolio-data-reset", handleDataReset);
    }

    return () => {
      if (updateTimeout) clearTimeout(updateTimeout);
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("portfolio-updated", handlePortfolioUpdate);
        window.removeEventListener(
          "portfolio-capital-updated",
          handleCapitalUpdate
        );
        window.removeEventListener("portfolio-data-reset", handleDataReset);
      }
    };
  }, [config.initialCapital]);

  // 🔥 비동기 초기 자본 로드
  useEffect(() => {
    let isMounted = true;

    const loadInitialCapital = async () => {
      try {
        setIsLoading(true);
        const initialCapital = await PORTFOLIO_CONFIG.getInitialCapital(
          customCapital,
          environment,
          userId
        );

        if (isMounted) {
          const updatedConfig = {
            ...config,
            initialCapital,
          };
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
  }, [customCapital, userId, environment]);

  // 🔥 저장된 설정 로드
  useEffect(() => {
    const loadSavedConfig = async () => {
      try {
        let savedConfig = null;

        // API 연동 (프로덕션)
        if (environment === "production" && userId) {
          // 추후 API 호출
        }

        // 로컬 스토리지에서 로드
        if (!savedConfig) {
          const saved = localStorage.getItem("cryptowise_config");
          if (saved) {
            savedConfig = JSON.parse(saved);
          }
        }

        if (savedConfig) {
          // 현재 포트폴리오 총액으로 업데이트
          savedConfig.initialCapital =
            PORTFOLIO_CONFIG.getCurrentPortfolioValue();
          setConfig(savedConfig);
          setOriginalConfig(savedConfig);
        }
      } catch (err) {
        console.warn("저장된 설정을 불러오는데 실패했습니다:", err);
      }
    };

    loadSavedConfig();
  }, [environment, userId]);

  // 설정 변경 여부 계산
  const isDirty = JSON.stringify(config) !== JSON.stringify(originalConfig);

  // 설정 업데이트
  const updateConfig = useCallback((updates) => {
    setConfig((prevConfig) => ({
      ...prevConfig,
      ...updates,
    }));
    setError(null);
  }, []);

  // 기본값으로 초기화
  const resetToDefaults = useCallback(async () => {
    try {
      const initialCapital = PORTFOLIO_CONFIG.getCurrentPortfolioValue();
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
      await new Promise((resolve) => setTimeout(resolve, 500));

      setOriginalConfig(config);
      console.log("✅ 설정이 저장되었습니다:", config);
    } catch (err) {
      setError("설정 저장 중 오류가 발생했습니다.");
      throw err;
    } finally {
      setIsLoading(false);
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

// 🎯 호환성을 위한 매니저
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

  // 중앙화된 액세스
  getConstants: () => PORTFOLIO_CONSTANTS,
  calculateFee: PORTFOLIO_CONFIG.calculateTradeFee,
  getCurrentPortfolioValue: PORTFOLIO_CONFIG.getCurrentPortfolioValue,
  hasValidInitialCapital: PORTFOLIO_CONFIG.hasValidInitialCapital,
  setInitialCapital: PORTFOLIO_CONFIG.setInitialCapital,
  syncAllSettings: PORTFOLIO_CONFIG.syncAllSettings,
  resetPortfolioData: PORTFOLIO_CONFIG.resetPortfolioData,
};
