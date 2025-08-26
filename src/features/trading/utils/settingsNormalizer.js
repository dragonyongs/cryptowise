// src/features/trading/utils/settingsNormalizer.js
import { TRADING_DEFAULTS } from "../constants/tradingDefaults";

/**
 * 🔥 FIXED: 사용자 입력을 우선시하는 안전한 파싱 함수
 */
export const safeParseUserInput = (userValue, defaultValue) => {
  // 사용자가 실제로 값을 입력했으면 그 값을 우선 사용
  if (userValue !== null && userValue !== undefined && userValue !== "") {
    const parsed = parseFloat(userValue);
    if (!isNaN(parsed)) {
      return parsed;
    }
  }
  return defaultValue;
};

/**
 * 설정값을 정규화하고 기본값으로 채웁니다
 * @param {Object} settings - 원본 설정
 * @returns {Object} 정규화된 설정
 */
export const normalizeSettings = (settings = {}) => {
  console.log("🔧 normalizeSettings 입력 설정:", settings);
  console.log("🔍 tradingConditions 입력값:", settings.tradingConditions);

  const normalized = {
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

    // 🔥 FIXED: 사용자 입력을 완전히 우선시하는 방식으로 변경
    tradingConditions: settings.tradingConditions
      ? {
          buyConditions: settings.tradingConditions.buyConditions
            ? {
                priceDropThreshold: safeParseUserInput(
                  settings.tradingConditions.buyConditions.priceDropThreshold,
                  -3
                ),
                rsiOversold: safeParseUserInput(
                  settings.tradingConditions.buyConditions.rsiOversold,
                  30
                ),
                minBuyScore: safeParseUserInput(
                  settings.tradingConditions.buyConditions.minBuyScore,
                  7.0
                ),
                volumeThreshold: safeParseUserInput(
                  settings.tradingConditions.buyConditions.volumeThreshold,
                  1.2
                ),
              }
            : {
                priceDropThreshold: -3,
                rsiOversold: 30,
                minBuyScore: 7.0,
                volumeThreshold: 1.2,
              },

          sellConditions: settings.tradingConditions.sellConditions
            ? {
                profitTarget1: safeParseUserInput(
                  settings.tradingConditions.sellConditions.profitTarget1,
                  3
                ),
                profitTarget2: safeParseUserInput(
                  settings.tradingConditions.sellConditions.profitTarget2,
                  5
                ),
                profitTarget3: safeParseUserInput(
                  settings.tradingConditions.sellConditions.profitTarget3,
                  8
                ),
                stopLoss: safeParseUserInput(
                  settings.tradingConditions.sellConditions.stopLoss,
                  -6
                ),
                rsiOverbought: safeParseUserInput(
                  settings.tradingConditions.sellConditions.rsiOverbought,
                  70
                ),
                timeBasedExit: safeParseUserInput(
                  settings.tradingConditions.sellConditions.timeBasedExit,
                  7
                ),
              }
            : {
                profitTarget1: 3,
                profitTarget2: 5,
                profitTarget3: 8,
                stopLoss: -6,
                rsiOverbought: 70,
                timeBasedExit: 7,
              },
        }
      : {
          buyConditions: {
            priceDropThreshold: -3,
            rsiOversold: 30,
            minBuyScore: 7.0,
            volumeThreshold: 1.2,
          },
          sellConditions: {
            profitTarget1: 3,
            profitTarget2: 5,
            profitTarget3: 8,
            stopLoss: -6,
            rsiOverbought: 70,
            timeBasedExit: 7,
          },
        },

    advanced: {
      signalConfirmationTime: 300,
      maxConcurrentTrades: 3,
      cooldownPeriod: 3600,
      volatilityThreshold: 0.05,
      ...settings.advanced,
    },

    environment:
      settings.environment ||
      TRADING_DEFAULTS.TRADING_ENVIRONMENT?.PAPER ||
      "paper",
    initialCapital:
      settings.initialCapital || TRADING_DEFAULTS.INITIAL_CAPITAL || 1840000,
    lastUpdated: new Date().toISOString(),
  };

  console.log("✅ normalizeSettings 결과:", normalized);
  console.log(
    "🔍 최종 buyConditions:",
    normalized.tradingConditions.buyConditions
  );
  console.log(
    "🔍 최종 sellConditions:",
    normalized.tradingConditions.sellConditions
  );

  return normalized;
};

/**
 * 숫자 값을 안전하게 파싱합니다 (기존 함수 유지)
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
 */
export const normalizePercentage = (percentage) => {
  return safeParseNumber(percentage, 0, 0, 100) / 100;
};

/**
 * 0-1 범위 값을 백분율로 변환합니다
 */
export const ratioToPercentage = (ratio) => {
  return safeParseNumber(ratio, 0, 0, 1) * 100;
};

/**
 * 기술적 지표 설정을 정규화합니다
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

/**
 * 설정 유효성 검증 함수
 */
export const validateSettings = (settings) => {
  const errors = {};

  if (!settings.tradingConditions) {
    errors.tradingConditions = "매매 조건이 누락되었습니다";
  }

  if (settings.allocation) {
    const total = Object.values(settings.allocation).reduce(
      (sum, val) => sum + val,
      0
    );
    if (Math.abs(total - 1) > 0.01) {
      errors.allocation = "포트폴리오 할당 비율의 합이 100%가 아닙니다";
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};
