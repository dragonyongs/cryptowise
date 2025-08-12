// src/utils/calculations.js
export function calculateRSI(prices, period = 14) {
  // FreePlan.txt 기반 RSI 계산 로직
  let gains = 0, losses = 0;
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
}

export function calculateMACD(prices, short = 12, long = 26, signal = 9) {
  // 간단 EMA 계산 (실제 구현 시 더 정교하게)
  return { macd: 0, signal: 0, histogram: 0 }; // 플레이스홀더
}

export function calculateVolatility(prices) {
  // 표준편차 기반 volatility
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length;
  return Math.sqrt(variance);
}

export function calculateMaxDrawdown(prices) {
  let max = prices[0], maxDD = 0;
  for (const price of prices) {
    if (price > max) max = price;
    const dd = (max - price) / max;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}
