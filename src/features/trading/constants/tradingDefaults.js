// src/features/trading/constants/tradingDefaults.js
export const TRADING_DEFAULTS = {
  PORTFOLIO_ALLOCATION: {
    cash: 0.2,
    t1: 0.4,
    t2: 0.3,
    t3: 0.1,
  },

  TECHNICAL_INDICATORS: {
    RSI: {
      enabled: true,
      period: 14,
      oversold: 30,
      overbought: 70,
      weight: 0.25,
    },
    MACD: {
      enabled: true,
      fast: 12,
      slow: 26,
      signal: 9,
      weight: 0.25,
    },
    BOLLINGER_BANDS: {
      enabled: true,
      period: 20,
      standardDeviation: 2,
      weight: 0.2,
    },
    MOVING_AVERAGE: {
      enabled: true,
      shortPeriod: 20,
      longPeriod: 60,
      weight: 0.3,
    },
  },

  RISK_MANAGEMENT: {
    maxPositionSize: 0.15,
    stopLoss: 0.08,
    takeProfit: 0.15,
    maxDrawdown: 0.25,
    riskRewardRatio: 2,
  },

  TRADING_ENVIRONMENT: {
    PAPER: "paper",
    LIVE: "live",
  },

  INITIAL_CAPITAL: 1840000,

  DEBOUNCE_DELAY: 500,

  VALIDATION_THRESHOLDS: {
    MIN_ALLOCATION: 0.05,
    MAX_ALLOCATION: 0.8,
    MIN_STOP_LOSS: 0.01,
    MAX_STOP_LOSS: 0.5,
  },
};

export const TIER_NAMES = {
  t1: "1티어 (안정)",
  t2: "2티어 (균형)",
  t3: "3티어 (성장)",
  cash: "현금 보유",
};

export const INDICATOR_NAMES = {
  RSI: "RSI (상대강도지수)",
  MACD: "MACD",
  BOLLINGER_BANDS: "볼린저 밴드",
  MOVING_AVERAGE: "이동평균선",
};
