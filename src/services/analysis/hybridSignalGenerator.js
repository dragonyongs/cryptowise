// src/services/analysis/hybridSignalGenerator.js (기존 파일 수정)
import fundamentalAnalysisService from "./fundamentalAnalysis.js";
import marketCorrelationService from "./marketCorrelation.js";
import sentimentAnalysisService from "../market/sentimentAnalysis.js";
import { hybridAnalyzer } from "./hybridAnalyzer.js"; // ✅ 추가

class HybridSignalGenerator {
  constructor() {
    this.signalHistory = [];
    this.maxHistoryLength = 100;
    this.analyzer = hybridAnalyzer; // ✅ 하이브리드 분석기 연결
    this.fallbackMode = true; // ✅ 기존 방식 백업
  }

  // ✅ 새로운 하이브리드 분석 우선, 실패시 기존 방식
  async generateEnhancedSignal(marketData) {
    const symbol = marketData.code.replace("KRW-", "");

    try {
      // 🎯 우선 하이브리드 분석 시도
      const hybridSignal = await this.analyzer.quickAnalyzeCoin(
        symbol,
        marketData
      );

      if (hybridSignal && hybridSignal.totalScore > 0) {
        // 하이브리드 분석 성공 - 기존 형식으로 변환
        const enhancedSignal = {
          symbol,
          totalScore: hybridSignal.totalScore,
          confidence: hybridSignal.confidence,
          action: hybridSignal.action,
          breakdown: {
            technical: hybridSignal.technical || 5,
            fundamental: 5, // 기본값
            correlation: 1.0,
            sentiment: hybridSignal.newsScore
              ? hybridSignal.newsScore / 5
              : 1.0,
            social: 5,
            onchain: 5,
          },
          reason: hybridSignal.reason,
          timestamp: Date.now(),
          marketContext: {
            btcDominance: 50,
            marketPhase: "transition",
            fearGreed: 50,
            altSeasonProb: 0.5,
          },
          isHybridAnalysis: true, // ✅ 하이브리드 분석 플래그
        };

        this.addToHistory(enhancedSignal);
        return enhancedSignal;
      }
    } catch (error) {
      console.warn(
        `하이브리드 분석 실패 (${symbol}), 기존 방식 사용:`,
        error.message
      );
    }

    // 🔄 기존 분석 방식 (백업)
    return await this.generateLegacySignal(marketData);
  }

  // ✅ 기존 분석 방식 (수정 없음, 백업용)
  async generateLegacySignal(marketData) {
    const symbol = marketData.code.replace("KRW-", "");

    try {
      // 모든 분석 서비스 병렬 실행
      const [
        technicalScore,
        fundamentalScore,
        correlationScore,
        sentimentScore,
      ] = await Promise.all([
        this.calculateTechnicalScore(marketData),
        fundamentalAnalysisService.analyzeFundamentals(symbol),
        marketCorrelationService.analyzeBTCImpact(),
        sentimentAnalysisService.analyzeSentiment(),
      ]);

      // 소셜 분석과 온체인 분석은 선택사항 (API 제한 고려)
      const socialScore = { socialScore: 5 }; // 기본값
      const onChainScore = { onChainScore: 5 }; // 기본값

      // 가중 평균 계산
      const totalScore = this.calculateWeightedScore({
        technical: technicalScore.score,
        fundamental: fundamentalScore.fundamentalScore,
        correlation: correlationScore.adjustmentFactor,
        sentiment: sentimentScore.sentimentMultiplier,
        social: socialScore.socialScore,
        onchain: onChainScore.onChainScore,
      });

      const signal = {
        symbol,
        totalScore,
        confidence: this.calculateConfidence(totalScore, {
          technicalScore,
          fundamentalScore,
          correlationScore,
          sentimentScore,
        }),
        action: this.determineAction(
          totalScore,
          sentimentScore,
          correlationScore
        ),
        breakdown: {
          technical: technicalScore.score,
          fundamental: fundamentalScore.fundamentalScore,
          correlation: correlationScore.adjustmentFactor,
          sentiment: sentimentScore.sentimentMultiplier,
          social: socialScore.socialScore,
          onchain: onChainScore.onChainScore,
        },
        reason: this.generateDetailedReason({
          totalScore,
          technicalScore,
          fundamentalScore,
          sentimentScore,
          correlationScore,
        }),
        timestamp: Date.now(),
        marketContext: {
          btcDominance: correlationScore.dominance,
          marketPhase: correlationScore.marketPhase,
          fearGreed: sentimentScore.fearGreedIndex,
          altSeasonProb: correlationScore.altSeasonProbability,
        },
        isHybridAnalysis: false, // ✅ 기존 분석 플래그
      };

      // 신호 히스토리 저장
      this.addToHistory(signal);
      return signal;
    } catch (error) {
      console.error("Legacy signal generation failed:", error);
      return this.getDefaultSignal(symbol);
    }
  }

  // ✅ 관심코인 업데이트 함수 추가
  async updateWatchedCoins(watchlist, topCoins) {
    try {
      return await this.analyzer.updateWatchedCoins(watchlist, topCoins);
    } catch (error) {
      console.warn("관심코인 업데이트 실패:", error);
      return { updated: 0, total: 0, newCoins: [] };
    }
  }

  // 기존 메서드들 유지 (수정 없음)
  calculateWeightedScore(scores) {
    const weights = {
      technical: 0.4, // 40% - 기술적 분석
      fundamental: 0.25, // 25% - 펀더멘탈 분석
      correlation: 0.15, // 15% - 시장 상관관계
      sentiment: 0.1, // 10% - 감정 분석
      social: 0.05, // 5% - 소셜 분석
      onchain: 0.05, // 5% - 온체인 분석
    };

    return (
      scores.technical * weights.technical +
      scores.fundamental * weights.fundamental +
      scores.correlation * weights.correlation +
      scores.sentiment * weights.sentiment +
      scores.social * weights.social +
      scores.onchain * weights.onchain
    );
  }

  async calculateTechnicalScore(marketData) {
    // 기존 기술적 분석 로직 (RSI, MACD, 볼린저 밴드 등)
    try {
      const price = parseFloat(marketData.trade_price);
      const volume = parseFloat(marketData.candle_acc_trade_volume);
      // 간단한 기술적 분석 (실제로는 더 복잡한 지표 계산)
      let score = 5; // 기본 점수

      // 볼륨 분석
      if (volume > marketData.prev_closing_price * 0.1) score += 1;

      // 가격 모멘텀 분석
      const priceChange =
        (price - marketData.prev_closing_price) / marketData.prev_closing_price;
      if (priceChange > 0.03) score += 2;
      else if (priceChange > 0.01) score += 1;
      else if (priceChange < -0.03) score -= 2;
      else if (priceChange < -0.01) score -= 1;

      return {
        score: Math.max(0, Math.min(10, score)),
        indicators: {
          priceChange: Math.round(priceChange * 10000) / 100,
          volume: volume,
          momentum: priceChange > 0 ? "bullish" : "bearish",
        },
      };
    } catch (error) {
      console.error("Technical analysis failed:", error);
      return { score: 5, indicators: {} };
    }
  }

  calculateConfidence(totalScore, analysisData) {
    let confidence = 0.5; // 기본 신뢰도

    // 점수가 극단적일수록 신뢰도 증가
    const scoreDeviation = Math.abs(totalScore - 5) / 5;
    confidence += scoreDeviation * 0.3;

    // 여러 지표가 일치할 때 신뢰도 증가
    const scores = [
      analysisData.technicalScore.score,
      analysisData.fundamentalScore.fundamentalScore,
      analysisData.sentimentScore.sentimentMultiplier * 5,
    ];

    const avgScore =
      scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const consistency =
      1 -
      scores.reduce((sum, score) => sum + Math.abs(score - avgScore), 0) /
        scores.length /
        10;

    confidence += consistency * 0.2;

    return Math.max(0.3, Math.min(0.95, confidence));
  }

  determineAction(totalScore, sentimentScore, correlationScore) {
    let action = "HOLD";

    // 기본 점수 기반 판단
    if (totalScore >= 7.5) {
      action = "STRONG_BUY";
    } else if (totalScore >= 6.5) {
      action = "BUY";
    } else if (totalScore <= 2.5) {
      action = "STRONG_SELL";
    } else if (totalScore <= 3.5) {
      action = "SELL";
    }

    // 감정 지수에 따른 조정
    if (sentimentScore.contrarian?.buySignal && totalScore >= 5.5) {
      action = action === "HOLD" ? "BUY" : action;
    }

    if (sentimentScore.contrarian?.sellSignal && totalScore <= 4.5) {
      action = action === "HOLD" ? "SELL" : action;
    }

    // 시장 상황에 따른 조정
    if (
      correlationScore.marketPhase === "accumulation" &&
      action.includes("BUY")
    ) {
      // BTC 축적 단계에서는 매수 신호 약화
      if (action === "STRONG_BUY") action = "BUY";
      else if (action === "BUY") action = "HOLD";
    }

    if (correlationScore.marketPhase === "markup" && action.includes("BUY")) {
      // 알트시즌에서는 매수 신호 강화
      if (action === "BUY") action = "STRONG_BUY";
    }

    return action;
  }

  generateDetailedReason(data) {
    const reasons = [];

    // 기술적 분석 이유
    if (data.technicalScore.score >= 7) {
      reasons.push("강력한 기술적 매수 신호");
    } else if (data.technicalScore.score <= 3) {
      reasons.push("약한 기술적 지표");
    }

    // 펀더멘탈 이유
    if (data.fundamentalScore.fundamentalScore >= 7) {
      reasons.push("우수한 펀더멘탈");
    } else if (data.fundamentalScore.fundamentalScore <= 4) {
      reasons.push("약한 펀더멘탈");
    }

    // 감정 지수 이유
    if (data.sentimentScore.fearGreedIndex < 25) {
      reasons.push("극공포 구간 - 역순환 매수 기회");
    } else if (data.sentimentScore.fearGreedIndex > 75) {
      reasons.push("극탐욕 구간 - 수익실현 고려");
    }

    // 시장 상황 이유
    if (data.correlationScore.altSeasonProbability > 0.7) {
      reasons.push("알트시즌 확률 높음");
    }

    return reasons.length > 0 ? reasons.join(", ") : "종합적 분석 결과";
  }

  addToHistory(signal) {
    this.signalHistory.unshift(signal);
    if (this.signalHistory.length > this.maxHistoryLength) {
      this.signalHistory = this.signalHistory.slice(0, this.maxHistoryLength);
    }
  }

  getSignalHistory(limit = 10) {
    return this.signalHistory.slice(0, limit);
  }

  getDefaultSignal(symbol) {
    return {
      symbol,
      totalScore: 5,
      confidence: 0.3,
      action: "HOLD",
      breakdown: {
        technical: 5,
        fundamental: 5,
        correlation: 1.0,
        sentiment: 1.0,
        social: 5,
        onchain: 5,
      },
      reason: "API 오류로 기본 신호 생성",
      timestamp: Date.now(),
      marketContext: {
        btcDominance: 50,
        marketPhase: "transition",
        fearGreed: 50,
        altSeasonProb: 0.5,
      },
      isHybridAnalysis: false,
    };
  }
}

export default new HybridSignalGenerator();
