// src/features/trading/utils/settingsValidator.js
import { VALIDATION_RULES, ERROR_MESSAGES } from "../constants/validationRules";

/**
 * 포트폴리오 할당을 검증합니다
 * @param {Object} allocations - 할당 객체
 * @returns {Object} 검증 결과
 */
export const validateAllocations = (allocations) => {
  const errors = {};
  const { cash, t1, t2, t3 } = allocations;
  const total = cash + t1 + t2 + t3;

  // 합계 검증
  if (Math.abs(total - 1) > VALIDATION_RULES.allocation.tolerance) {
    errors.sum = ERROR_MESSAGES.ALLOCATION_SUM;
  }

  // 개별 할당 검증
  Object.entries(allocations).forEach(([key, value]) => {
    if (value < VALIDATION_RULES.allocation.min) {
      errors[key] = ERROR_MESSAGES.ALLOCATION_MIN;
    }
    if (value > VALIDATION_RULES.allocation.max) {
      errors[key] = ERROR_MESSAGES.ALLOCATION_MAX;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * 리스크 관리 설정을 검증합니다
 * @param {Object} riskManagement - 리스크 관리 설정
 * @returns {Object} 검증 결과
 */
export const validateRiskManagement = (riskManagement) => {
  const errors = {};
  const { stopLoss, takeProfit, maxPositionSize } = riskManagement;

  // 손절매 검증
  if (
    stopLoss < VALIDATION_RULES.stopLoss.min ||
    stopLoss > VALIDATION_RULES.stopLoss.max
  ) {
    errors.stopLoss = ERROR_MESSAGES.STOP_LOSS_RANGE;
  }

  // 익절 검증
  if (
    takeProfit < VALIDATION_RULES.takeProfit.min ||
    takeProfit > VALIDATION_RULES.takeProfit.max
  ) {
    errors.takeProfit = `익절매는 ${VALIDATION_RULES.takeProfit.min * 100}%~${VALIDATION_RULES.takeProfit.max * 100}% 범위여야 합니다.`;
  }

  // 최대 포지션 크기 검증
  if (maxPositionSize < 0.01 || maxPositionSize > 0.5) {
    errors.maxPositionSize = "최대 포지션 크기는 1%~50% 범위여야 합니다.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * 기술적 지표 설정을 검증합니다
 * @param {Object} indicators - 지표 설정
 * @returns {Object} 검증 결과
 */
export const validateIndicators = (indicators) => {
  const errors = {};

  // RSI 검증
  if (indicators.RSI?.enabled) {
    const { period, oversold, overbought } = indicators.RSI;
    if (period < 5 || period > 50) {
      errors["RSI.period"] = "RSI 기간은 5~50 범위여야 합니다.";
    }
    if (oversold >= overbought) {
      errors["RSI.levels"] = "RSI 과매도 수준은 과매수 수준보다 작아야 합니다.";
    }
  }

  // MACD 검증
  if (indicators.MACD?.enabled) {
    const { fast, slow } = indicators.MACD;
    if (fast >= slow) {
      errors["MACD.periods"] = ERROR_MESSAGES.MACD_FAST_SLOW;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * 전체 설정을 검증합니다
 * @param {Object} settings - 설정 객체
 * @returns {Object} 종합 검증 결과
 */
export const validateAllSettings = (settings) => {
  const allocationResult = validateAllocations(settings.allocation);
  const riskResult = validateRiskManagement(settings.riskManagement);
  const indicatorResult = validateIndicators(settings.indicators);

  const allErrors = {
    ...allocationResult.errors,
    ...riskResult.errors,
    ...indicatorResult.errors,
  };

  return {
    isValid: Object.keys(allErrors).length === 0,
    errors: allErrors,
    breakdown: {
      allocation: allocationResult,
      riskManagement: riskResult,
      indicators: indicatorResult,
    },
  };
};
