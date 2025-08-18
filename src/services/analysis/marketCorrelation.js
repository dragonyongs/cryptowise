// src/services/analysis/marketCorrelation.js
import axios from "axios";

class MarketCorrelationService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15분 캐시
    this.coinGeckoUrl = "https://api.coingecko.com/api/v3";
    this.priceHistory = new Map(); // 상관관계 계산용
  }

  async analyzeBTCImpact() {
    try {
      const btcDominance = await this.getBTCDominance();
      const dominanceTrend = await this.analyzeDominanceTrend();
      const altSeasonProbability = this.calculateAltSeasonProb(
        btcDominance,
        dominanceTrend
      );
      const btcCorrelation = await this.calculateBTCCorrelation();
      const marketPhase = this.identifyMarketPhase(
        btcDominance,
        dominanceTrend
      );
      const adjustmentFactor = this.getSignalAdjustment(
        marketPhase,
        altSeasonProbability
      );

      return {
        dominance: btcDominance,
        dominanceTrend,
        altSeasonProbability,
        btcCorrelation,
        marketPhase,
        adjustmentFactor,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Market correlation analysis failed:", error);
      return this.getDefaultCorrelation();
    }
  }

  async getBTCDominance() {
    const cacheKey = "btcDominance";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.coinGeckoUrl}/global`, {
        timeout: 10000,
      });

      const dominance = response.data.data.market_cap_percentage.btc;

      this.cache.set(cacheKey, {
        data: dominance,
        timestamp: Date.now(),
      });

      return Math.round(dominance * 100) / 100;
    } catch (error) {
      console.error("BTC Dominance API 오류:", error);
      return 50; // 기본값
    }
  }

  async analyzeDominanceTrend() {
    const cacheKey = "dominanceTrend";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // 최근 7일간의 BTC 도미넌스 변화 분석
      const response = await axios.get(`${this.coinGeckoUrl}/global`, {
        timeout: 10000,
      });

      const currentDominance = response.data.data.market_cap_percentage.btc;

      // 간단한 트렌드 분석 (실제로는 historical 데이터 필요)
      const historicalDominance = this.getHistoricalDominance();
      const trend = this.calculateTrend(historicalDominance, currentDominance);

      this.cache.set(cacheKey, {
        data: trend,
        timestamp: Date.now(),
      });

      return trend;
    } catch (error) {
      console.error("Dominance trend analysis failed:", error);
      return { direction: "neutral", strength: 0, change: 0 };
    }
  }

  calculateAltSeasonProb(dominance, dominanceTrend) {
    let probability = 0;

    // BTC 도미넌스가 낮을수록 알트시즌 확률 높음
    if (dominance < 40) probability += 0.4;
    else if (dominance < 45) probability += 0.2;
    else if (dominance > 55) probability -= 0.2;

    // 도미넌스 하락 트렌드일 때 알트시즌 확률 증가
    if (dominanceTrend.direction === "down") {
      probability += dominanceTrend.strength * 0.3;
    } else if (dominanceTrend.direction === "up") {
      probability -= dominanceTrend.strength * 0.2;
    }

    return Math.max(0, Math.min(1, probability));
  }

  async calculateBTCCorrelation() {
    // 간단한 상관관계 계산 (실제로는 더 복잡한 통계 계산 필요)
    try {
      const btcData = await this.getBTCPriceHistory();
      const marketData = await this.getMarketPriceHistory();

      return this.pearsonCorrelation(btcData, marketData);
    } catch (error) {
      console.error("Correlation calculation failed:", error);
      return 0.7; // 기본 상관관계
    }
  }

  identifyMarketPhase(dominance, trend) {
    if (dominance > 55 && trend.direction === "up") {
      return "accumulation"; // BTC 축적 단계
    } else if (dominance < 45 && trend.direction === "down") {
      return "markup"; // 알트코인 상승 단계
    } else if (dominance < 40) {
      return "distribution"; // 분산 투자 단계
    } else {
      return "transition"; // 전환 단계
    }
  }

  getSignalAdjustment(phase, altSeasonProb) {
    const phaseMultipliers = {
      accumulation: 0.8, // BTC 강세 시 알트코인 신호 약화
      markup: 1.3, // 알트시즌 시 알트코인 신호 강화
      distribution: 1.1, // 분산 단계 시 약간 강화
      transition: 1.0, // 중립
    };

    const baseMultiplier = phaseMultipliers[phase] || 1.0;
    const altSeasonBonus = altSeasonProb * 0.3;

    return Math.round((baseMultiplier + altSeasonBonus) * 100) / 100;
  }

  // 유틸리티 메서드들
  getHistoricalDominance() {
    // 실제로는 historical API 호출 또는 데이터베이스에서 가져옴
    return [52.3, 51.8, 50.9, 49.7, 48.5]; // 예시 데이터
  }

  calculateTrend(historical, current) {
    if (!historical || historical.length === 0) {
      return { direction: "neutral", strength: 0, change: 0 };
    }

    const avg =
      historical.reduce((sum, val) => sum + val, 0) / historical.length;
    const change = current - avg;
    const direction = change > 1 ? "up" : change < -1 ? "down" : "neutral";
    const strength = Math.min(1, Math.abs(change) / 10);

    return { direction, strength, change: Math.round(change * 100) / 100 };
  }

  async getBTCPriceHistory() {
    // BTC 가격 히스토리 가져오기 (간단히 구현)
    return [50000, 52000, 48000, 51000, 49000];
  }

  async getMarketPriceHistory() {
    // 전체 시장 히스토리 가져오기 (간단히 구현)
    return [2000000, 2100000, 1900000, 2050000, 1980000];
  }

  pearsonCorrelation(x, y) {
    if (x.length !== y.length) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY)
    );

    return denominator === 0
      ? 0
      : Math.round((numerator / denominator) * 100) / 100;
  }

  getDefaultCorrelation() {
    return {
      dominance: 50,
      dominanceTrend: { direction: "neutral", strength: 0, change: 0 },
      altSeasonProbability: 0.5,
      btcCorrelation: 0.7,
      marketPhase: "transition",
      adjustmentFactor: 1.0,
      timestamp: Date.now(),
    };
  }
}

export default new MarketCorrelationService();
