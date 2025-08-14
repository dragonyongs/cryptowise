// RSI 계산 (종가 배열과 기간)
export function calculateRSI(closes, period = 14) {
  let gains = 0,
    losses = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) gains += delta;
    else losses -= delta;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  let rs = avgGain / avgLoss;
  let rsiArray = [100 - 100 / (1 + rs)];

  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta > 0) {
      avgGain = (avgGain * (period - 1) + delta) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - delta) / period;
    }
    rs = avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    rsiArray.push(rsi);
  }
  return rsiArray;
}
