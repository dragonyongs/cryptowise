export const generateTradeId = () => {
  return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const calculateProfitRate = (currentPrice, avgPrice) => {
  if (!avgPrice || avgPrice === 0) return 0;
  return ((currentPrice - avgPrice) / avgPrice) * 100;
};
