// src/services/analysis/technicalAnalysis.js

/**
 * 기술적 분석 유틸리티 클래스
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
   * 볼린저밴드 계산
   */
  static calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (!prices || prices.length < period) {
      const currentPrice = prices?.[prices.length - 1] || 0;
      return {
        upper: currentPrice * 1.02,
        middle: currentPrice,
        lower: currentPrice * 0.98,
      };
    }

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

  /**
   * 지지/저항선 계산
   */
  static findSupportResistance(prices, period = 20) {
    if (!prices || prices.length < period)
      return { support: null, resistance: null };

    const recentPrices = prices.slice(-period);
    const high = Math.max(...recentPrices);
    const low = Math.min(...recentPrices);

    // 간단한 지지/저항선 계산
    const range = high - low;
    const support = low + range * 0.236; // 피보나치 23.6%
    const resistance = high - range * 0.236;

    return { support, resistance };
  }

  /**
   * 거래량 평균 계산
   */
  static calculateVolumeAverage(volumes, period = 20) {
    if (!volumes || volumes.length < period) return null;
    const recentVolumes = volumes.slice(-period);
    return this.sma(recentVolumes);
  }
}

// 🎯 개별 함수들을 편의상 named export로 제공
export const sma = (prices, period = null) => {
  if (!prices || !Array.isArray(prices) || prices.length === 0) {
    return null;
  }

  const validPrices = prices.filter(
    (p) => p !== null && p !== undefined && !isNaN(p)
  );
  if (validPrices.length === 0) return null;

  const actualPeriod = period || validPrices.length;
  const dataToUse = validPrices.slice(-actualPeriod);

  const sum = dataToUse.reduce((acc, price) => acc + price, 0);
  return sum / dataToUse.length;
};

export const calculateRSI = (prices, period = 14) => {
  return TechnicalAnalysis.calculateRSI(prices, period);
};

export const calculateMACD = (
  prices,
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
) => {
  return TechnicalAnalysis.calculateMACD(
    prices,
    fastPeriod,
    slowPeriod,
    signalPeriod
  );
};

export const calculateBollingerBands = (prices, period = 20, stdDev = 2) => {
  return TechnicalAnalysis.calculateBollingerBands(prices, period, stdDev);
};

// 🎯 통합 객체 export (기존 코드 호환성을 위해)
export const technicalAnalysis = {
  sma,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  findSupportResistance: (prices, period = 20) =>
    TechnicalAnalysis.findSupportResistance(prices, period),
  calculateVolumeAverage: (volumes, period = 20) =>
    TechnicalAnalysis.calculateVolumeAverage(volumes, period),
};

// 🎯 기본 export는 클래스만
export default TechnicalAnalysis;
