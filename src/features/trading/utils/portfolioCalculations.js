// src/features/trading/utils/portfolioCalculations.js
import { TRADING_DEFAULTS } from "../constants/tradingDefaults";

/**
 * 포트폴리오 할당 비율을 정규화합니다
 * @param {Object} allocations - 할당 객체
 * @returns {Object} 정규화된 할당 객체
 */
export const normalizeAllocations = (allocations) => {
  const { cash, t1, t2, t3 } = allocations;
  const total = cash + t1 + t2 + t3;

  if (Math.abs(total - 1) > 0.001) {
    return {
      cash: cash / total,
      t1: t1 / total,
      t2: t2 / total,
      t3: t3 / total,
    };
  }

  return { cash, t1, t2, t3 };
};

/**
 * 특정 할당이 변경될 때 다른 할당들을 비례적으로 조정합니다
 * @param {string} changedKey - 변경된 키
 * @param {number} newValue - 새로운 값
 * @param {Object} currentAllocations - 현재 할당
 * @returns {Object} 조정된 할당 객체
 */
export const adjustOtherAllocations = (
  changedKey,
  newValue,
  currentAllocations
) => {
  const keys = ["cash", "t1", "t2", "t3"];
  const otherKeys = keys.filter((key) => key !== changedKey);
  const otherSum = otherKeys.reduce(
    (sum, key) => sum + currentAllocations[key],
    0
  );
  const remainingValue = 1 - newValue;

  if (otherSum === 0) {
    const equalShare = remainingValue / otherKeys.length;
    const result = { ...currentAllocations, [changedKey]: newValue };
    otherKeys.forEach((key) => {
      result[key] = equalShare;
    });
    return result;
  }

  const ratio = remainingValue / otherSum;
  const result = { ...currentAllocations, [changedKey]: newValue };
  otherKeys.forEach((key) => {
    result[key] = currentAllocations[key] * ratio;
  });

  return result;
};

/**
 * 포트폴리오 총 가치를 계산합니다
 * @param {Object} allocations - 할당 객체
 * @param {number} initialCapital - 초기 자본
 * @returns {Object} 계산된 가치 객체
 */
export const calculatePortfolioValues = (
  allocations,
  initialCapital = TRADING_DEFAULTS.INITIAL_CAPITAL
) => {
  return {
    cash: allocations.cash * initialCapital,
    t1: allocations.t1 * initialCapital,
    t2: allocations.t2 * initialCapital,
    t3: allocations.t3 * initialCapital,
    total: initialCapital,
  };
};

/**
 * 리스크 점수를 계산합니다
 * @param {Object} allocations - 할당 객체
 * @param {Object} riskSettings - 리스크 설정
 * @returns {number} 리스크 점수 (0-100)
 */
export const calculateRiskScore = (allocations, riskSettings) => {
  const { t1, t2, t3 } = allocations;
  const { stopLoss, maxDrawdown } = riskSettings;

  // 티어별 리스크 가중치
  const tierRiskWeights = { t1: 1, t2: 2, t3: 4 };
  const allocationRisk =
    t1 * tierRiskWeights.t1 + t2 * tierRiskWeights.t2 + t3 * tierRiskWeights.t3;

  // 손절매와 최대 손실 고려
  const stopLossRisk = (1 - stopLoss) * 20;
  const drawdownRisk = maxDrawdown * 30;

  return Math.min(
    100,
    Math.round(allocationRisk * 20 + stopLossRisk + drawdownRisk)
  );
};

/**
 * 포트폴리오 다양성 지수를 계산합니다 (허핀달 지수 변형)
 * @param {Object} allocations - 할당 객체
 * @returns {number} 다양성 지수 (0-1, 1에 가까울수록 다양함)
 */
export const calculateDiversityIndex = (allocations) => {
  const values = Object.values(allocations);
  const herfindahl = values.reduce((sum, value) => sum + value * value, 0);
  return (1 - herfindahl) / (1 - 1 / values.length);
};
