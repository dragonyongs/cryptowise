// src/config/portfolioConfig.js

import { useState, useCallback, useEffect } from "react";

// 🎯 중앙화된 포트폴리오 상수 (API 준비)
export const PORTFOLIO_CONSTANTS = {
  // 기본 자본 설정 (추후 API로 교체)
  DEFAULT_INITIAL_BALANCE: 1840001, // 하드코딩 제거를 위한 중앙화
  BACKUP_INITIAL_BALANCE: 2000000, // 백업용

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
    t1: 0.4, // Tier 1 (안전자산)
    t2: 0.2, // Tier 2 (성장자산)
    t3: 0.1, // Tier 3 (고위험자산)
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
    maxPositionSize: 20, // 최대 포지션 크기 (%)
    dailyLossLimit: 5, // 일일 최대 손실 (%)
    maxDrawdown: 15, // 최대 드로다운 (%)
    emergencyCashRatio: 20, // 비상 현금 비율 (%)
  },

  // 수수료 설정 (중앙화)
  FEE_CONFIG: {
    upbitFees: {
      maker: 0.0005, // 0.05%
      taker: 0.0005, // 0.05%
    },
    paperTradingFees: {
      enabled: true,
      rate: 0.0005, // 0.05%
    },
  },

  // API 엔드포인트 준비 (추후 실제 API 연동)
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

// 🎯 기본 설정 객체 (기존 호환성 유지)
export const PORTFOLIO_CONFIG = {
  // 기본 초기 자본
  INITIAL_CAPITAL: PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE,

  // 환경별 커스텀 자본 설정
  CUSTOM_CAPITAL: PORTFOLIO_CONSTANTS.CUSTOM_CAPITAL,

  // 기본 포트폴리오 할당
  DEFAULT_ALLOCATIONS: PORTFOLIO_CONSTANTS.DEFAULT_ALLOCATIONS,

  // 기본 거래 전략
  DEFAULT_STRATEGY: PORTFOLIO_CONSTANTS.DEFAULT_STRATEGY,

  // 기본 기술적 지표
  DEFAULT_INDICATORS: PORTFOLIO_CONSTANTS.DEFAULT_INDICATORS,

  // 기본 리스크 관리
  DEFAULT_RISK_MANAGEMENT: PORTFOLIO_CONSTANTS.DEFAULT_RISK_MANAGEMENT,

  // 환경별 초기 자본 가져오기 (API 준비)
  getInitialCapital: async (
    customAmount = null,
    environment = "development",
    userId = null
  ) => {
    // 커스텀 금액이 있으면 사용
    if (customAmount) return customAmount;

    // 추후 실제 API 연동 시 사용할 구조
    if (environment === "production" && userId) {
      try {
        // const response = await fetch(`${PORTFOLIO_CONSTANTS.API_ENDPOINTS.config.get}?userId=${userId}`);
        // const data = await response.json();
        // return data.initialBalance || PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;

        // 현재는 기본값 반환
        return PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;
      } catch (error) {
        console.warn(
          "API에서 초기 자본을 가져오는데 실패, 기본값 사용:",
          error
        );
        return PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE;
      }
    }

    return (
      PORTFOLIO_CONSTANTS.CUSTOM_CAPITAL[environment] ||
      PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE
    );
  },

  // 중앙화된 상수 액세스
  getConstants: () => PORTFOLIO_CONSTANTS,

  // 수수료 계산 함수 중앙화
  calculateTradeFee: (tradeValueKRW, feeType = "paperTrading") => {
    const feeConfig = PORTFOLIO_CONSTANTS.FEE_CONFIG;

    if (feeType === "paperTrading" && feeConfig.paperTradingFees.enabled) {
      return tradeValueKRW * feeConfig.paperTradingFees.rate;
    }

    if (feeType === "upbit") {
      return tradeValueKRW * feeConfig.upbitFees.taker; // 기본적으로 taker 수수료 사용
    }

    return 0;
  },
};

// 🎯 완전한 상태 관리를 포함한 훅 (개선)
export const usePortfolioConfig = (customCapital = null, userId = null) => {
  const environment = process.env.NODE_ENV;

  // 기본 설정으로 초기화 (비동기 초기 자본 처리)
  const [config, setConfig] = useState(() => ({
    initialCapital: PORTFOLIO_CONSTANTS.DEFAULT_INITIAL_BALANCE, // 일단 기본값으로 시작
    allocations: { ...PORTFOLIO_CONSTANTS.DEFAULT_ALLOCATIONS },
    strategy: { ...PORTFOLIO_CONSTANTS.DEFAULT_STRATEGY },
    indicators: { ...PORTFOLIO_CONSTANTS.DEFAULT_INDICATORS },
    riskManagement: { ...PORTFOLIO_CONSTANTS.DEFAULT_RISK_MANAGEMENT },
    feeConfig: { ...PORTFOLIO_CONSTANTS.FEE_CONFIG },
  }));

  const [originalConfig, setOriginalConfig] = useState(config);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // 비동기로 초기 자본 로드
  useEffect(() => {
    const loadInitialCapital = async () => {
      try {
        const initialCapital = await PORTFOLIO_CONFIG.getInitialCapital(
          customCapital,
          environment,
          userId
        );

        const updatedConfig = {
          ...config,
          initialCapital,
        };

        setConfig(updatedConfig);
        setOriginalConfig(updatedConfig);
      } catch (error) {
        console.error("초기 자본 로드 실패:", error);
        setError("초기 자본을 불러오는데 실패했습니다.");
      }
    };

    loadInitialCapital();
  }, [customCapital, userId, environment]);

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
      const initialCapital = await PORTFOLIO_CONFIG.getInitialCapital(
        customCapital,
        environment,
        userId
      );

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
    } catch (error) {
      console.error("기본값 초기화 실패:", error);
      setError("기본값으로 초기화하는데 실패했습니다.");
    }
  }, [customCapital, environment, userId]);

  // 설정 저장 (API 준비)
  const saveConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (environment === "production" && userId) {
        // 추후 실제 API 호출
        // const response = await fetch(PORTFOLIO_CONSTANTS.API_ENDPOINTS.config.save, {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ userId, config })
        // });
        //
        // if (!response.ok) throw new Error('설정 저장 실패');
      }

      // 현재는 LocalStorage 사용
      localStorage.setItem("cryptowise_config", JSON.stringify(config));

      // 시뮬레이션용 딜레이
      await new Promise((resolve) => setTimeout(resolve, 500));

      setOriginalConfig(config);
      console.log("설정이 저장되었습니다:", config);
    } catch (err) {
      setError("설정 저장 중 오류가 발생했습니다.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [config, environment, userId]);

  // 저장된 설정 로드 (API 준비)
  useEffect(() => {
    const loadSavedConfig = async () => {
      try {
        let savedConfig = null;

        if (environment === "production" && userId) {
          // 추후 실제 API 호출
          // const response = await fetch(`${PORTFOLIO_CONSTANTS.API_ENDPOINTS.config.get}?userId=${userId}`);
          // const data = await response.json();
          // savedConfig = data.config;
        }

        // 현재는 LocalStorage에서 로드
        if (!savedConfig) {
          const saved = localStorage.getItem("cryptowise_config");
          if (saved) {
            savedConfig = JSON.parse(saved);
          }
        }

        if (savedConfig) {
          setConfig(savedConfig);
          setOriginalConfig(savedConfig);
        }
      } catch (err) {
        console.warn("저장된 설정을 불러오는데 실패했습니다:", err);
      }
    };

    loadSavedConfig();
  }, [environment, userId]);

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
  };
};

// 🎯 기존 호환성을 위한 매니저 (개선)
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
  // 중앙화된 상수 접근
  getConstants: () => PORTFOLIO_CONSTANTS,
  calculateFee: PORTFOLIO_CONFIG.calculateTradeFee,
};
