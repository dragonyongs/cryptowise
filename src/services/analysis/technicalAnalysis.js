// src/utils/technicalAnalysis.js

/**
 * 기술적 분석 지표 계산 클래스
 * RSI, MACD, 볼린저밴드, 지지/저항선 등을 계산합니다.
 */
export class TechnicalAnalyzer {
  
  /**
   * RSI (Relative Strength Index) 계산
   * @param {number[]} prices - 가격 배열
   * @param {number} period - 기간 (기본값: 14)
   * @returns {number} RSI 값 (0-100)
   */
  calculateRSI(prices, period = 14) {
    if (prices.length < period + 1) return 50; // 데이터 부족 시 중립값

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
    return 100 - (100 / (1 + rs));
  }

  /**
   * MACD (Moving Average Convergence Divergence) 계산
   * @param {number[]} prices - 가격 배열
   * @param {number} fastPeriod - 빠른 EMA 기간 (기본값: 12)
   * @param {number} slowPeriod - 느린 EMA 기간 (기본값: 26)
   * @param {number} signalPeriod - 시그널 라인 기간 (기본값: 9)
   * @returns {Object} { macd, signal, histogram }
   */
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const ema12 = this.ema(prices, fastPeriod);
    const ema26 = this.ema(prices, slowPeriod);
    
    const macdLine = ema12.map((val, i) => val - ema26[i]);
    const signalLine = this.ema(macdLine, signalPeriod);
    const histogram = macdLine.map((val, i) => val - signalLine[i]);

    return {
      macd: macdLine[macdLine.length - 1],
      signal: signalLine[signalLine.length - 1],
      histogram: histogram[histogram.length - 1]
    };
  }

  /**
   * 볼린저 밴드 계산
   * @param {number[]} prices - 가격 배열
   * @param {number} period - 기간 (기본값: 20)
   * @param {number} stdDev - 표준편차 배수 (기본값: 2)
   * @returns {Object} { upper, middle, lower }
   */
  calculateBollingerBands(prices, period = 20, stdDev = 2) {
    if (prices.length < period) {
      return { upper: null, middle: null, lower: null };
    }

    const slice = prices.slice(-period);
    const sma = this.sma(slice);
    const std = this.standardDeviation(slice);

    return {
      upper: sma + (std * stdDev),
      middle: sma,
      lower: sma - (std * stdDev)
    };
  }

  /**
   * 지지/저항선 찾기
   * @param {number[]} prices - 가격 배열
   * @param {number} minTouches - 최소 터치 횟수 (기본값: 3)
   * @returns {Object} { support, resistance }
   */
  findSupportResistance(prices, minTouches = 3) {
    const peaks = this.findPeaks(prices);
    const valleys = this.findValleys(prices);
    
    const resistance = this.findSignificantLevels(peaks, minTouches);
    const support = this.findSignificantLevels(valleys, minTouches);

    return { support, resistance };
  }

  /**
   * 피크(고점) 찾기
   * @param {number[]} prices - 가격 배열
   * @returns {Array} 피크 배열 [{ index, value }]
   */
  findPeaks(prices) {
    const peaks = [];
    for (let i = 1; i < prices.length - 1; i++) {
      if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1]) {
        peaks.push({ index: i, value: prices[i] });
      }
    }
    return peaks;
  }

  /**
   * 밸리(저점) 찾기
   * @param {number[]} prices - 가격 배열
   * @returns {Array} 밸리 배열 [{ index, value }]
   */
  findValleys(prices) {
    const valleys = [];
    for (let i = 1; i < prices.length - 1; i++) {
      if (prices[i] < prices[i - 1] && prices[i] < prices[i + 1]) {
        valleys.push({ index: i, value: prices[i] });
      }
    }
    return valleys;
  }

  /**
   * 중요한 레벨 찾기
   * @param {Array} points - 포인트 배열
   * @param {number} minTouches - 최소 터치 횟수
   * @returns {Array} 중요한 레벨 배열
   */
  findSignificantLevels(points, minTouches) {
    const tolerance = 0.02; // 2% 허용 오차
    const levels = {};

    points.forEach(point => {
      const roundedValue = Math.round(point.value / (point.value * tolerance)) * (point.value * tolerance);
      levels[roundedValue] = (levels[roundedValue] || 0) + 1;
    });

    return Object.keys(levels)
      .filter(level => levels[level] >= minTouches)
      .map(level => parseFloat(level))
      .sort((a, b) => a - b);
  }

  /**
   * 단순 이동평균 (SMA) 계산
   * @param {number[]} values - 값 배열
   * @returns {number} SMA 값
   */
  sma(values) {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * 지수 이동평균 (EMA) 계산
   * @param {number[]} prices - 가격 배열
   * @param {number} period - 기간
   * @returns {number[]} EMA 배열
   */
  ema(prices, period) {
    const k = 2 / (period + 1);
    const emaArray = [prices[0]];

    for (let i = 1; i < prices.length; i++) {
      const ema = (prices[i] * k) + (emaArray[i - 1] * (1 - k));
      emaArray.push(ema);
    }

    return emaArray;
  }

  /**
   * 표준편차 계산
   * @param {number[]} values - 값 배열
   * @returns {number} 표준편차
   */
  standardDeviation(values) {
    const avg = this.sma(values);
    const squareDiffs = values.map(val => Math.pow(val - avg, 2));
    const avgSquareDiff = this.sma(squareDiffs);
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * 스토캐스틱 오실레이터 계산
   * @param {number[]} highs - 고가 배열
   * @param {number[]} lows - 저가 배열
   * @param {number[]} closes - 종가 배열
   * @param {number} period - 기간 (기본값: 14)
   * @returns {number} %K 값
   */
  calculateStochastic(highs, lows, closes, period = 14) {
    if (closes.length < period) return 50;

    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];

    const highestHigh = Math.max(...recentHighs);
    const lowestLow = Math.min(...recentLows);

    if (highestHigh === lowestLow) return 50;

    return ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
  }

  /**
   * 윌리엄스 %R 계산
   * @param {number[]} highs - 고가 배열
   * @param {number[]} lows - 저가 배열
   * @param {number[]} closes - 종가 배열
   * @param {number} period - 기간 (기본값: 14)
   * @returns {number} Williams %R 값
   */
  calculateWilliamsR(highs, lows, closes, period = 14) {
    const stochastic = this.calculateStochastic(highs, lows, closes, period);
    return stochastic - 100; // Williams %R = %K - 100
  }
}

// 싱글톤 인스턴스 내보내기
export const technicalAnalyzer = new TechnicalAnalyzer();

// 기본 내보내기
export default TechnicalAnalyzer;
