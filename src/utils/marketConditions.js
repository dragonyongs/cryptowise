// utils/marketConditions.js
export const MARKET_CONDITIONS = {
  BULL: "강세장",
  BEAR: "약세장",
  NEUTRAL: "보합세",
  VOLATILE: "변동성 높음",
};

export const normalizeMarketCondition = (condition) => {
  if (typeof condition === "string") {
    return condition.toUpperCase();
  }

  if (typeof condition === "object" && condition !== null) {
    return (
      condition.condition ||
      condition.phase ||
      condition.type ||
      "NEUTRAL"
    ).toUpperCase();
  }

  return "NEUTRAL";
};

export const getMarketConditionLabel = (condition) => {
  const normalized = normalizeMarketCondition(condition);
  return MARKET_CONDITIONS[normalized] || normalized;
};
