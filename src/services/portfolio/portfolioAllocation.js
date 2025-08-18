// src/services/portfolio/portfolioAllocation.js - Tier 기반 차등 배분 시스템

class PortfolioAllocationService {
  constructor() {
    this.tierDefinitions = {
      TIER1: {
        name: "TIER1",
        description: "BTC, ETH - 안정적 대형주",
        baseAllocation: 0.55, // 55%
        maxAllocation: 0.7,
        minAllocation: 0.4,
        coins: ["bitcoin", "ethereum", "BTC", "ETH"],
        riskMultiplier: 0.8,
        priority: 1,
      },
      TIER2: {
        name: "TIER2",
        description: "상위 10위권 - 성장주",
        baseAllocation: 0.3, // 30%
        maxAllocation: 0.4,
        minAllocation: 0.2,
        coins: [
          "solana",
          "cardano",
          "polkadot",
          "chainlink",
          "SOL",
          "ADA",
          "DOT",
          "LINK",
        ],
        riskMultiplier: 1.0,
        priority: 2,
      },
      TIER3: {
        name: "TIER3",
        description: "나머지 - 고성장 가능주",
        baseAllocation: 0.15, // 15%
        maxAllocation: 0.25,
        minAllocation: 0.05,
        coins: [], // 나머지 모든 코인
        riskMultiplier: 1.3,
        priority: 3,
      },
    };

    // 뉴스 기반 임시 비중 조정
    this.newsAdjustments = new Map();
  }

  // ✅ 코인의 Tier 판별
  getCoinTier(symbol) {
    const normalizedSymbol = this.normalizeSymbol(symbol);

    if (this.tierDefinitions.TIER1.coins.includes(normalizedSymbol)) {
      return "TIER1";
    }

    if (this.tierDefinitions.TIER2.coins.includes(normalizedSymbol)) {
      return "TIER2";
    }

    return "TIER3";
  }

  // ✅ 심볼 정규화
  normalizeSymbol(symbol) {
    if (typeof symbol !== "string") return "";

    // KRW- 제거, 대소문자 통일
    const normalized = symbol.replace("KRW-", "").toLowerCase();

    // 매핑 테이블
    const symbolMap = {
      btc: "bitcoin",
      eth: "ethereum",
      sol: "solana",
      ada: "cardano",
      dot: "polkadot",
      link: "chainlink",
    };

    return symbolMap[normalized] || normalized;
  }

  // ✅ Tier별 배분 비율 가져오기
  getTierAllocation(symbol, marketCondition = null) {
    const tier = this.getCoinTier(symbol);
    const tierConfig = this.tierDefinitions[tier];

    let allocation = {
      tier,
      ratio: tierConfig.baseAllocation,
      maxRatio: tierConfig.maxAllocation,
      minRatio: tierConfig.minAllocation,
      priority: tierConfig.priority,
      description: tierConfig.description,
    };

    // 뉴스 기반 임시 조정 적용
    const newsAdjustment = this.newsAdjustments.get(symbol);
    if (newsAdjustment && newsAdjustment.expiry > Date.now()) {
      allocation.ratio *= newsAdjustment.multiplier;
      allocation.newsAdjusted = true;
      allocation.newsReason = newsAdjustment.reason;
    }

    // 시장 상황에 따른 동적 조정
    if (marketCondition) {
      if (marketCondition.riskLevel >= 4) {
        // 고위험 시 TIER1 비중 증가
        if (tier === "TIER1") {
          allocation.ratio *= 1.2;
        } else if (tier === "TIER3") {
          allocation.ratio *= 0.7;
        }
      }

      if (marketCondition.volatility === "extreme") {
        // 극도 변동성 시 보수적 배분
        if (tier === "TIER1") {
          allocation.ratio *= 1.3;
        } else {
          allocation.ratio *= 0.6;
        }
      }
    }

    // 최종 제한 적용
    allocation.ratio = Math.max(
      allocation.minRatio,
      Math.min(allocation.maxRatio, allocation.ratio)
    );

    return allocation;
  }

  // ✅ 전체 포트폴리오 배분 계산
  calculatePortfolioAllocation(portfolio, marketCondition = null) {
    const totalValue =
      portfolio.krw + this.calculateTotalCoinValue(portfolio.coins);
    const allocations = new Map();

    // 각 Tier별 현재 비중 계산
    const currentAllocations = {
      TIER1: 0,
      TIER2: 0,
      TIER3: 0,
      CASH: portfolio.krw / totalValue,
    };

    // 보유 코인들의 현재 배분 계산
    for (const [symbol, coin] of portfolio.coins) {
      const tier = this.getCoinTier(symbol);
      const coinValue = coin.quantity * coin.currentPrice;
      currentAllocations[tier] += coinValue / totalValue;
    }

    // 목표 배분과 비교하여 리밸런싱 필요성 판단
    const rebalanceNeeded = this.checkRebalanceNeeded(
      currentAllocations,
      marketCondition
    );

    return {
      current: currentAllocations,
      target: this.getTargetAllocations(marketCondition),
      rebalanceNeeded,
      totalValue,
      recommendations: this.generateRebalanceRecommendations(
        currentAllocations,
        marketCondition
      ),
    };
  }

  // ✅ 뉴스 기반 임시 비중 조정
  applyNewsBasedAdjustment(symbol, adjustment) {
    const { multiplier, reason, durationHours = 24 } = adjustment;

    this.newsAdjustments.set(symbol, {
      multiplier: Math.max(0.5, Math.min(2.0, multiplier)), // 0.5x ~ 2.0x 제한
      reason,
      expiry: Date.now() + durationHours * 60 * 60 * 1000,
      appliedAt: new Date(),
    });

    console.log(
      `📰 뉴스 기반 비중 조정: ${symbol} ${multiplier}x (${durationHours}시간), 이유: ${reason}`
    );
  }

  // ✅ 긍정 뉴스 시 비중 증가
  handlePositiveNews(symbol, newsScore) {
    if (newsScore >= 8.0) {
      this.applyNewsBasedAdjustment(symbol, {
        multiplier: 1.5,
        reason: `긍정 뉴스 (점수: ${newsScore})`,
        durationHours: 48,
      });
    } else if (newsScore >= 6.0) {
      this.applyNewsBasedAdjustment(symbol, {
        multiplier: 1.2,
        reason: `긍정 뉴스 (점수: ${newsScore})`,
        durationHours: 24,
      });
    }
  }

  // ✅ 부정 뉴스 시 비중 감소
  handleNegativeNews(symbol, newsScore) {
    if (newsScore <= 2.0) {
      this.applyNewsBasedAdjustment(symbol, {
        multiplier: 0.5,
        reason: `부정 뉴스 (점수: ${newsScore})`,
        durationHours: 72,
      });
    } else if (newsScore <= 4.0) {
      this.applyNewsBasedAdjustment(symbol, {
        multiplier: 0.7,
        reason: `부정 뉴스 (점수: ${newsScore})`,
        durationHours: 24,
      });
    }
  }

  // ✅ 최대 포지션 수 계산
  getMaxPositions(portfolio, marketCondition = null) {
    let baseMaxPositions = 8;

    if (marketCondition) {
      if (marketCondition.riskLevel >= 4) {
        baseMaxPositions = 6; // 고위험 시 포지션 수 감소
      }

      if (marketCondition.overallBuyScore >= 75) {
        baseMaxPositions = 10; // 좋은 시장 시 포지션 수 증가
      }
    }

    // 현재 포트폴리오 크기에 따른 조정
    const totalValue =
      portfolio.krw + this.calculateTotalCoinValue(portfolio.coins);
    if (totalValue < 500000) {
      // 50만원 미만
      baseMaxPositions = Math.min(baseMaxPositions, 5);
    }

    return baseMaxPositions;
  }

  // ✅ 유틸리티 메서드들
  calculateTotalCoinValue(coinsMap) {
    let total = 0;
    for (const coin of coinsMap.values()) {
      total += coin.quantity * coin.currentPrice;
    }
    return total;
  }

  getTargetAllocations(marketCondition = null) {
    const base = {
      TIER1: this.tierDefinitions.TIER1.baseAllocation,
      TIER2: this.tierDefinitions.TIER2.baseAllocation,
      TIER3: this.tierDefinitions.TIER3.baseAllocation,
      CASH: 0.0,
    };

    // 시장 조건에 따른 목표 배분 조정
    if (marketCondition?.riskLevel >= 4) {
      base.TIER1 *= 1.2;
      base.TIER3 *= 0.7;
      base.CASH = 0.1; // 현금 10% 보유
    }

    return base;
  }

  checkRebalanceNeeded(current, target, threshold = 0.1) {
    for (const tier in target) {
      const diff = Math.abs(current[tier] - target[tier]);
      if (diff > threshold) {
        return true;
      }
    }
    return false;
  }

  generateRebalanceRecommendations(current, marketCondition) {
    const recommendations = [];
    const target = this.getTargetAllocations(marketCondition);

    for (const [tier, currentRatio] of Object.entries(current)) {
      const targetRatio = target[tier] || 0;
      const diff = currentRatio - targetRatio;

      if (Math.abs(diff) > 0.05) {
        // 5% 이상 차이
        recommendations.push({
          tier,
          action: diff > 0 ? "REDUCE" : "INCREASE",
          currentRatio: (currentRatio * 100).toFixed(1) + "%",
          targetRatio: (targetRatio * 100).toFixed(1) + "%",
          difference: (Math.abs(diff) * 100).toFixed(1) + "%",
          priority: Math.abs(diff) > 0.15 ? "HIGH" : "MEDIUM",
        });
      }
    }

    return recommendations;
  }

  // ✅ 뉴스 조정 현황 조회
  getActiveNewsAdjustments() {
    const active = [];
    const now = Date.now();

    for (const [symbol, adjustment] of this.newsAdjustments) {
      if (adjustment.expiry > now) {
        active.push({
          symbol,
          multiplier: adjustment.multiplier,
          reason: adjustment.reason,
          remainingHours: Math.ceil(
            (adjustment.expiry - now) / (60 * 60 * 1000)
          ),
          appliedAt: adjustment.appliedAt,
        });
      }
    }

    return active;
  }
}

export const portfolioAllocationService = new PortfolioAllocationService();
export default portfolioAllocationService;
