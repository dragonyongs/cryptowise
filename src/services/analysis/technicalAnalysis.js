/**
 * 기술적 분석 유틸리티
 */
export class TechnicalAnalysis {
  /**
   * RSI 계산 (14일 기준)
   */
  static calculateRSI(prices, period = 14) {
    if (!prices || prices.length < period + 1) return null;

    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain = this.sma(gains.slice(-period));
    const avgLoss = this.sma(losses.slice(-period));

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }

  /**
   * 단순이동평균 계산
   */
  static sma(values) {
    if (!values || values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * MACD 계산
   */
  static calculateMACD(prices, fast = 12, slow = 26, signal = 9) {
    if (!prices || prices.length < slow) return null;

    const ema12 = this.ema(prices, fast);
    const ema26 = this.ema(prices, slow);

    if (!ema12 || !ema26) return null;

    const macdLine = ema12 - ema26;
    const signalLine = this.ema([macdLine], signal);
    const histogram = macdLine - signalLine;

    return {
      line: macdLine,
      signal: signalLine,
      histogram: histogram,
    };
  }

  /**
   * 지수이동평균 계산
   */
  static ema(prices, period) {
    if (!prices || prices.length < period) return null;

    const multiplier = 2 / (period + 1);
    let ema = prices[0];

    for (let i = 1; i < prices.length; i++) {
      ema = prices[i] * multiplier + ema * (1 - multiplier);
    }

    return ema;
  }

  /**
   * 볼링거밴드 계산
   */
  static calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (!prices || prices.length < period) return null;

    const recentPrices = prices.slice(-period);
    const sma = this.sma(recentPrices);
    const std = this.standardDeviation(recentPrices);

    return {
      upper: sma + std * stdDev,
      middle: sma,
      lower: sma - std * stdDev,
    };
  }

  /**
   * 표준편차 계산
   */
  static standardDeviation(values) {
    if (!values || values.length === 0) return 0;

    const avg = this.sma(values);
    const squaredDiffs = values.map((val) => Math.pow(val - avg, 2));
    const avgSquaredDiff = this.sma(squaredDiffs);

    return Math.sqrt(avgSquaredDiff);
  }
}

export const technicalAnalysis = new TechnicalAnalysis();
export default TechnicalAnalysis;
