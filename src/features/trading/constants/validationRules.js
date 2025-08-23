// src/features/trading/constants/validationRules.js
import { TRADING_DEFAULTS } from "./tradingDefaults";

const { VALIDATION_THRESHOLDS } = TRADING_DEFAULTS;

export const VALIDATION_RULES = {
  allocation: {
    required: true,
    min: VALIDATION_THRESHOLDS.MIN_ALLOCATION,
    max: VALIDATION_THRESHOLDS.MAX_ALLOCATION,
    sum: 1,
    tolerance: 0.001,
  },

  stopLoss: {
    required: true,
    min: VALIDATION_THRESHOLDS.MIN_STOP_LOSS,
    max: VALIDATION_THRESHOLDS.MAX_STOP_LOSS,
    type: "number",
  },

  takeProfit: {
    required: true,
    min: 0.01,
    max: 2,
    type: "number",
  },

  rsiPeriod: {
    required: true,
    min: 5,
    max: 50,
    type: "integer",
  },

  macdFast: {
    required: true,
    min: 5,
    max: 30,
    type: "integer",
  },

  macdSlow: {
    required: true,
    min: 15,
    max: 50,
    type: "integer",
  },
};

export const ERROR_MESSAGES = {
  ALLOCATION_SUM: "포트폴리오 할당의 합계는 100%여야 합니다.",
  ALLOCATION_MIN: `최소 할당 비율은 ${VALIDATION_THRESHOLDS.MIN_ALLOCATION * 100}%입니다.`,
  ALLOCATION_MAX: `최대 할당 비율은 ${VALIDATION_THRESHOLDS.MAX_ALLOCATION * 100}%입니다.`,
  STOP_LOSS_RANGE: `손절매는 ${VALIDATION_THRESHOLDS.MIN_STOP_LOSS * 100}%~${VALIDATION_THRESHOLDS.MAX_STOP_LOSS * 100}% 범위여야 합니다.`,
  REQUIRED_FIELD: "필수 입력 항목입니다.",
  INVALID_NUMBER: "올바른 숫자를 입력해주세요.",
  MACD_FAST_SLOW: "MACD 빠른선은 느린선보다 작아야 합니다.",
};
