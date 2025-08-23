// src/features/trading/utils/settingsNormalizer.js
import { TRADING_DEFAULTS } from "../constants/tradingDefaults";

/**
 * 설정값을 정규화하고 기본값으로 채웁니다
 * @param {Object} settings - 원본 설정
 * @returns {Object} 정규화된 설정
 */
export const normalizeSettings = (settings) => {
  return {
    allocation: {
      ...TRADING_DEFAULTS.PORTFOLIO_ALLOCATION,
      ...settings.allocation,
    },
    indicators: {
      ...TRADING_DEFAULTS.TECHNICAL_INDICATORS,
      ...settings.indicators,
    },
    riskManagement: {
      ...TRADING_DEFAULTS.RISK_MANAGEMENT,
      ...settings.riskManagement,
    },
    environment:
      settings.environment || TRADING_DEFAULTS.TRADING_ENVIRONMENT.PAPER,
    initialCapital: settings.initialCapital || TRADING_DEFAULTS.INITIAL_CAPITAL,
    lastUpdated: new Date().toISOString(),
  };
};

/**
 * 숫자 값을 안전하게 파싱합니다
 * @param {any} value - 파싱할 값
 * @param {number} defaultValue - 기본값
 * @param {number} min - 최솟값
 * @param {number} max - 최댓값
 * @returns {number} 파싱된 숫자
 */
export const safeParseNumber = (
  value,
  defaultValue,
  min = -Infinity,
  max = Infinity
) => {
  const parsed = parseFloat(value);
  if (isNaN(parsed)) return defaultValue;
  return Math.min(Math.max(parsed, min), max);
};

/**
 * 백분율 값을 0-1 범위로 정규화합니다
 * @param {number} percentage - 백분율 (0-100)
 * @returns {number} 정규화된 값 (0-1)
 */
export const normalizePercentage = (percentage) => {
  return safeParseNumber(percentage, 0, 0, 100) / 100;
};

/**
 * 0-1 범위 값을 백분율로 변환합니다
 * @param {number} ratio - 비율 (0-1)
 * @returns {number} 백분율 (0-100)
 */
export const ratioToPercentage = (ratio) => {
  return safeParseNumber(ratio, 0, 0, 1) * 100;
};

/**
 * 기술적 지표 설정을 정규화합니다
 * @param {Object} indicators - 지표 설정
 * @returns {Object} 정규화된 지표 설정
 */
export const normalizeIndicators = (indicators) => {
  const normalized = {};

  Object.keys(TRADING_DEFAULTS.TECHNICAL_INDICATORS).forEach((key) => {
    const defaultIndicator = TRADING_DEFAULTS.TECHNICAL_INDICATORS[key];
    const userIndicator = indicators[key] || {};

    normalized[key] = {
      ...defaultIndicator,
      ...userIndicator,
      enabled: Boolean(userIndicator.enabled),
    };
  });

  return normalized;
};
