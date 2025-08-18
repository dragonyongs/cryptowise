// src/services/market/sentimentAnalysis.js
import axios from "axios";

class SentimentAnalysisService {
  constructor() {
    this.fearGreedApiUrl = "https://api.alternative.me/fng/";
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30분 캐시
  }

  async analyzeSentiment() {
    try {
      const fearGreedIndex = await this.getFearGreedIndex();
      const sentimentPhase = this.categorizePhase(fearGreedIndex);
      const contrarian = this.calculateContrarian(fearGreedIndex);
      const sentimentMultiplier = this.getSentimentMultiplier(
        fearGreedIndex,
        sentimentPhase
      );

      return {
        fearGreedIndex,
        sentimentPhase,
        contrarian,
        sentimentMultiplier,
        timestamp: Date.now(),
        recommendation: this.getRecommendation(fearGreedIndex, sentimentPhase),
      };
    } catch (error) {
      console.error("Sentiment analysis failed:", error);
      return this.getDefaultSentiment();
    }
  }

  async getFearGreedIndex() {
    const cacheKey = "fearGreed";
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await axios.get(this.fearGreedApiUrl, {
        timeout: 10000,
        params: { limit: 1 },
      });

      const fearGreedData = response.data.data[0];
      const index = parseInt(fearGreedData.value);

      this.cache.set(cacheKey, {
        data: index,
        timestamp: Date.now(),
      });

      return index;
    } catch (error) {
      console.error("Fear & Greed Index API 오류:", error);
      // 기본값 반환 (중성)
      return 50;
    }
  }

  categorizePhase(fearGreedIndex) {
    if (fearGreedIndex <= 20) return "extreme_fear";
    if (fearGreedIndex <= 40) return "fear";
    if (fearGreedIndex <= 60) return "neutral";
    if (fearGreedIndex <= 80) return "greed";
    return "extreme_greed";
  }

  calculateContrarian(fearGreedIndex) {
    const buySignal = fearGreedIndex < 25;
    const sellSignal = fearGreedIndex > 75;

    let strength = 0;
    if (buySignal) {
      strength = Math.max(0.5, (25 - fearGreedIndex) / 25); // 0.5 ~ 1.0
    } else if (sellSignal) {
      strength = Math.max(0.5, (fearGreedIndex - 75) / 25); // 0.5 ~ 1.0
    }

    return {
      buySignal,
      sellSignal,
      strength: Math.round(strength * 100) / 100,
    };
  }

  getSentimentMultiplier(fearGreedIndex, phase) {
    // 극공포시 매수 가중치 증가, 극탐욕시 매도 가중치 증가
    const multipliers = {
      extreme_fear: 1.3, // 매수 신호 강화
      fear: 1.1, // 약간 매수 신호 강화
      neutral: 1.0, // 중립
      greed: 0.9, // 매수 신호 약화
      extreme_greed: 0.7, // 매수 신호 대폭 약화
    };

    return multipliers[phase] || 1.0;
  }

  getRecommendation(fearGreedIndex, phase) {
    if (fearGreedIndex < 20) {
      return {
        action: "STRONG_BUY",
        reason: "극공포 상황에서 역순환 매수 기회",
        confidence: 0.85,
      };
    } else if (fearGreedIndex < 35) {
      return {
        action: "BUY",
        reason: "공포 상황에서 점진적 매수",
        confidence: 0.7,
      };
    } else if (fearGreedIndex > 80) {
      return {
        action: "SELL",
        reason: "극탐욕 상황에서 수익실현",
        confidence: 0.8,
      };
    } else if (fearGreedIndex > 65) {
      return {
        action: "HOLD",
        reason: "탐욕 상황에서 신중한 관망",
        confidence: 0.6,
      };
    } else {
      return {
        action: "HOLD",
        reason: "중립적 시장 상황",
        confidence: 0.5,
      };
    }
  }

  getDefaultSentiment() {
    return {
      fearGreedIndex: 50,
      sentimentPhase: "neutral",
      contrarian: { buySignal: false, sellSignal: false, strength: 0 },
      sentimentMultiplier: 1.0,
      timestamp: Date.now(),
      recommendation: {
        action: "HOLD",
        reason: "API 오류로 기본값 사용",
        confidence: 0.3,
      },
    };
  }
}

export default new SentimentAnalysisService();
