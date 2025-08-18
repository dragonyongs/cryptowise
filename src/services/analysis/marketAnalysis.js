// src/services/analysis/marketAnalysis.js - 뉴스 기반 비중 조정 통합

import { portfolioAllocationService } from "../portfolio/portfolioAllocation.js";

class MarketAnalysisService {
  constructor() {
    this.marketCache = new Map();
    this.newsCache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5분 캐시
  }

  // ✅ 뉴스 점수 분석 및 비중 조정 적용
  async analyzeNewsImpact(symbol, newsData) {
    const newsScore = this.calculateNewsScore(newsData);

    // 뉴스 점수에 따른 포트폴리오 비중 조정
    if (newsScore >= 8.0) {
      // 매우 긍정적 뉴스 - 비중 50% 증가, 48시간 유지
      portfolioAllocationService.applyNewsBasedAdjustment(symbol, {
        multiplier: 1.5,
        reason: `매우 긍정적 뉴스 (점수: ${newsScore.toFixed(1)})`,
        durationHours: 48,
      });
    } else if (newsScore >= 6.5) {
      // 긍정적 뉴스 - 비중 30% 증가, 24시간 유지
      portfolioAllocationService.applyNewsBasedAdjustment(symbol, {
        multiplier: 1.3,
        reason: `긍정적 뉴스 (점수: ${newsScore.toFixed(1)})`,
        durationHours: 24,
      });
    } else if (newsScore <= 2.0) {
      // 매우 부정적 뉴스 - 비중 50% 감소, 72시간 유지
      portfolioAllocationService.applyNewsBasedAdjustment(symbol, {
        multiplier: 0.5,
        reason: `매우 부정적 뉴스 (점수: ${newsScore.toFixed(1)})`,
        durationHours: 72,
      });
    } else if (newsScore <= 3.5) {
      // 부정적 뉴스 - 비중 30% 감소, 36시간 유지
      portfolioAllocationService.applyNewsBasedAdjustment(symbol, {
        multiplier: 0.7,
        reason: `부정적 뉴스 (점수: ${newsScore.toFixed(1)})`,
        durationHours: 36,
      });
    }

    // 뉴스 점수 캐시에 저장
    this.newsCache.set(symbol, {
      score: newsScore,
      data: newsData,
      timestamp: Date.now(),
    });

    return {
      symbol,
      newsScore,
      impactLevel: this.getNewsImpactLevel(newsScore),
      adjustmentApplied: newsScore >= 6.5 || newsScore <= 3.5,
    };
  }

  // ✅ 뉴스 점수 계산
  calculateNewsScore(newsData) {
    if (!newsData || !Array.isArray(newsData)) return 5.0;

    let totalScore = 0;
    let validNews = 0;

    for (const news of newsData) {
      if (!news.title && !news.content) continue;

      let score = 5.0; // 중립 기준

      // 긍정적 키워드
      const positiveKeywords = [
        "partnership",
        "adoption",
        "integration",
        "upgrade",
        "launch",
        "bullish",
        "growth",
        "expansion",
        "breakthrough",
        "milestone",
        "상승",
        "긍정",
        "성장",
        "파트너십",
        "채택",
        "출시",
        "업그레이드",
      ];

      // 부정적 키워드
      const negativeKeywords = [
        "hack",
        "crash",
        "ban",
        "regulation",
        "scam",
        "bearish",
        "decline",
        "drop",
        "fall",
        "concern",
        "risk",
        "warning",
        "하락",
        "금지",
        "규제",
        "해킹",
        "사기",
        "우려",
        "경고",
        "폭락",
      ];

      const text = (news.title + " " + (news.content || "")).toLowerCase();

      // 긍정적 키워드 점수
      const positiveCount = positiveKeywords.filter((keyword) =>
        text.includes(keyword.toLowerCase())
      ).length;

      // 부정적 키워드 점수
      const negativeCount = negativeKeywords.filter((keyword) =>
        text.includes(keyword.toLowerCase())
      ).length;

      // 점수 조정
      score += positiveCount * 0.8;
      score -= negativeCount * 1.0;

      // 최신성 반영 (24시간 이내 뉴스에 가중치)
      if (news.publishedAt) {
        const newsAge = Date.now() - new Date(news.publishedAt).getTime();
        const hoursAge = newsAge / (1000 * 60 * 60);

        if (hoursAge <= 24) {
          score *= 1.2; // 최신 뉴스 가중치
        } else if (hoursAge <= 72) {
          score *= 1.1;
        }
      }

      // 뉴스 소스 신뢰도 반영
      if (news.source) {
        const reliableSources = [
          "coindesk",
          "cointelegraph",
          "bloomberg",
          "reuters",
        ];
        if (
          reliableSources.some((source) =>
            news.source.toLowerCase().includes(source)
          )
        ) {
          score *= 1.1;
        }
      }

      totalScore += Math.max(0, Math.min(10, score));
      validNews++;
    }

    return validNews > 0 ? totalScore / validNews : 5.0;
  }

  // ✅ 뉴스 영향력 수준 판별
  getNewsImpactLevel(newsScore) {
    if (newsScore >= 8.0) return "VERY_POSITIVE";
    if (newsScore >= 6.5) return "POSITIVE";
    if (newsScore <= 2.0) return "VERY_NEGATIVE";
    if (newsScore <= 3.5) return "NEGATIVE";
    return "NEUTRAL";
  }

  // ✅ 시장 전체 뉴스 영향 분석
  async analyzeMarketNewsImpact(coinList = []) {
    const marketNewsImpact = {
      overallSentiment: "NEUTRAL",
      impactedCoins: [],
      marketScore: 5.0,
      recommendations: [],
    };

    let totalScore = 0;
    let analyzedCoins = 0;

    for (const symbol of coinList) {
      try {
        // 뉴스 데이터 가져오기 (실제로는 뉴스 서비스에서)
        const newsData = await this.fetchNewsForCoin(symbol);
        const analysis = await this.analyzeNewsImpact(symbol, newsData);

        if (analysis.adjustmentApplied) {
          marketNewsImpact.impactedCoins.push({
            symbol,
            newsScore: analysis.newsScore,
            impactLevel: analysis.impactLevel,
            adjustmentReason: analysis.reason,
          });
        }

        totalScore += analysis.newsScore;
        analyzedCoins++;
      } catch (error) {
        console.warn(`${symbol} 뉴스 분석 실패:`, error);
      }
    }

    if (analyzedCoins > 0) {
      marketNewsImpact.marketScore = totalScore / analyzedCoins;

      // 전체 시장 심리 판단
      if (marketNewsImpact.marketScore >= 7.0) {
        marketNewsImpact.overallSentiment = "BULLISH";
        marketNewsImpact.recommendations.push(
          "뉴스 호재로 인한 공격적 매수 고려"
        );
      } else if (marketNewsImpact.marketScore <= 3.0) {
        marketNewsImpact.overallSentiment = "BEARISH";
        marketNewsImpact.recommendations.push(
          "뉴스 악재로 인한 보수적 접근 권장"
        );
      }
    }

    return marketNewsImpact;
  }

  // ✅ 시장 상황 분석 (뉴스 통합)
  async analyzeMarketCondition() {
    const cacheKey = "market_condition";
    const cached = this.marketCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      // 기본 시장 데이터 분석
      const marketData = await this.fetchMarketData();
      const basicAnalysis = this.calculateMarketCondition(marketData);

      // 뉴스 영향 분석 추가
      const topCoins = ["BTC", "ETH", "SOL", "ADA", "DOT"];
      const newsImpact = await this.analyzeMarketNewsImpact(topCoins);

      // 뉴스 점수를 시장 분석에 통합
      const newsAdjustedScore = this.integrateNewsIntoMarketScore(
        basicAnalysis.overallBuyScore,
        newsImpact.marketScore
      );

      const analysis = {
        ...basicAnalysis,
        overallBuyScore: newsAdjustedScore,
        newsImpact,
        newsAdjusted: true,
        newsInfluencedCoins: newsImpact.impactedCoins.length,
      };

      this.marketCache.set(cacheKey, {
        data: analysis,
        timestamp: Date.now(),
      });

      return analysis;
    } catch (error) {
      console.error("시장 분석 실패:", error);
      return this.getDefaultMarketCondition();
    }
  }

  // ✅ 뉴스를 시장 점수에 통합
  integrateNewsIntoMarketScore(technicalScore, newsScore) {
    // 기술적 분석 70%, 뉴스 30% 가중 평균
    const newsWeight = 0.3;
    const technicalWeight = 0.7;

    // 뉴스 점수를 0-100 스케일로 변환
    const normalizedNewsScore = (newsScore / 10.0) * 100;

    const combinedScore =
      technicalScore * technicalWeight + normalizedNewsScore * newsWeight;

    return Math.max(0, Math.min(100, combinedScore));
  }

  // ✅ 뉴스 데이터 가져오기 (모의)
  async fetchNewsForCoin(symbol) {
    // 실제로는 뉴스 API 호출
    // 여기서는 모의 데이터 반환
    return [
      {
        title: `${symbol} shows strong fundamentals`,
        content: "Partnership announcement drives adoption...",
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
        source: "CoinDesk",
      },
      {
        title: `Market analysis: ${symbol} technical outlook`,
        content: "Technical indicators suggest bullish momentum...",
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6시간 전
        source: "CoinTelegraph",
      },
    ];
  }

  // ✅ 현재 뉴스 조정 현황 조회
  getActiveNewsAdjustments() {
    return portfolioAllocationService.getActiveNewsAdjustments();
  }

  // ✅ 현재 시장 상황 조회 (캐시된 데이터)
  getCurrentMarketCondition() {
    const cached = this.marketCache.get("market_condition");
    return cached?.data || null;
  }

  // 기존 메서드들은 그대로 유지...
  // (fetchMarketData, calculateMarketCondition, analyzeTrend 등)

  async fetchMarketData() {
    // 기존 구현 유지
    const btcChange = (Math.random() - 0.5) * 10;
    const totalVolume = Math.random() * 2000000000000;
    const fearGreedIndex = Math.floor(Math.random() * 100);
    const dominance = 40 + Math.random() * 30;

    return {
      btc: {
        price: 45000 + Math.random() * 20000,
        change24h: btcChange,
        volume: totalVolume * 0.4,
      },
      totalMarketCap: 1500000000000 + Math.random() * 500000000000,
      totalVolume,
      fearGreedIndex,
      btcDominance: dominance,
      activeTradingCoins: 150 + Math.floor(Math.random() * 50),
    };
  }

  calculateMarketCondition(data) {
    // 기존 구현 유지하되, 뉴스 통합 준비
    const conditions = {
      trend: this.analyzeTrend(data),
      volatility: this.analyzeVolatility(data),
      buyability: this.analyzeBuyability(data),
      riskLevel: this.analyzeRiskLevel(data),
      rawData: data,
    };

    return {
      ...conditions,
      overallBuyScore: this.calculateOverallBuyScore(conditions),
      isBuyableMarket: this.isBuyableMarket(conditions),
      recommendedCashRatio: this.getRecommendedCashRatio(conditions),
      maxPositions: this.getMaxPositions(conditions),
      updatedAt: new Date(),
    };
  }

  // 나머지 기존 메서드들 유지...
  analyzeTrend(data) {
    if (data.btc.change24h > 5) return "strong_bullish";
    if (data.btc.change24h > 2) return "bullish";
    if (data.btc.change24h < -5) return "strong_bearish";
    if (data.btc.change24h < -2) return "bearish";
    return "sideways";
  }

  analyzeVolatility(data) {
    const volatility = Math.abs(data.btc.change24h);
    if (volatility > 8) return "extreme";
    if (volatility > 5) return "high";
    if (volatility > 2) return "medium";
    return "low";
  }

  analyzeBuyability(data) {
    const score =
      (data.fearGreedIndex < 50 ? 25 : 0) +
      (data.btcDominance < 55 ? 25 : 0) +
      (Math.abs(data.btc.change24h) < 3 ? 25 : 0) +
      (data.totalVolume > 1000000000000 ? 25 : 0);

    return {
      score,
      level:
        score >= 75
          ? "excellent"
          : score >= 50
            ? "good"
            : score >= 25
              ? "fair"
              : "poor",
    };
  }

  analyzeRiskLevel(data) {
    let risk = 3;
    if (data.fearGreedIndex > 80) risk += 2;
    if (Math.abs(data.btc.change24h) > 5) risk += 2;
    if (data.btcDominance > 70) risk += 1;
    return Math.min(risk, 5);
  }

  calculateOverallBuyScore(conditions) {
    let score = conditions.buyability.score;
    if (conditions.trend === "bearish") score -= 20;
    if (conditions.trend === "strong_bearish") score -= 40;
    if (conditions.volatility === "extreme") score -= 30;
    if (conditions.volatility === "high") score -= 15;
    return Math.max(0, Math.min(100, score));
  }

  isBuyableMarket(conditions) {
    return (
      conditions.buyability.score >= 50 &&
      conditions.riskLevel <= 4 &&
      !["extreme"].includes(conditions.volatility)
    );
  }

  getRecommendedCashRatio(conditions) {
    let cashRatio = 0.15;
    if (conditions.riskLevel >= 4) cashRatio += 0.15;
    if (conditions.volatility === "extreme") cashRatio += 0.2;
    if (conditions.buyability.score < 30) cashRatio += 0.1;
    return Math.min(0.5, cashRatio);
  }

  getMaxPositions(conditions) {
    let maxPositions = 8;
    if (conditions.buyability.score >= 75) maxPositions = 10;
    else if (conditions.buyability.score < 50) maxPositions = 5;
    if (conditions.riskLevel >= 4)
      maxPositions = Math.floor(maxPositions * 0.7);
    return Math.max(3, maxPositions);
  }

  getDefaultMarketCondition() {
    return {
      trend: "sideways",
      volatility: "medium",
      buyability: { score: 50, level: "fair" },
      riskLevel: 3,
      overallBuyScore: 50,
      isBuyableMarket: true,
      recommendedCashRatio: 0.2,
      maxPositions: 6,
      rawData: null,
      updatedAt: new Date(),
      isDefault: true,
    };
  }

  // ✅ 개별 코인 분석 (동적 설정)
  async analyzeCoinCondition(symbol, marketCondition, userSettings = {}) {
    const defaultSettings = {
      minScore: 6.0,
      maxPositionRatio: 0.15,
      rsiThreshold: 35,
      changeThreshold: -1.5,
      volumeMultiplier: 1.2,
      priority: "medium",
    };

    const settings = { ...defaultSettings, ...userSettings };

    // 시장 상황에 따른 설정 조정
    if (marketCondition && marketCondition.riskLevel >= 4) {
      settings.minScore += 1.0;
      settings.maxPositionRatio *= 0.8;
    }

    if (marketCondition && marketCondition.volatility === "extreme") {
      settings.minScore += 0.5;
      settings.changeThreshold -= 0.5; // 더 큰 하락 요구
    }

    return {
      symbol,
      settings,
      marketAdjusted: true,
      timestamp: new Date(),
    };
  }
}

export const marketAnalysisService = new MarketAnalysisService();
export default marketAnalysisService;
