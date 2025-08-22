// src/services/portfolio/cashManagement.js

export class CashManagement {
  constructor() {
    this.baseCashRatio = 0.15; // 기본 15% 현금 보유
    this.minCashRatio = 0.05; // 최소 5%
    this.maxCashRatio = 0.4; // 최대 40%
  }

  /**
   * 시장 상황별 적정 현금 비중 계산
   */
  calculateOptimalCashRatio(marketCondition, portfolioHealth, marketMetrics) {
    let optimalCash = this.baseCashRatio;

    // 1. 시장 상황별 조정
    optimalCash += this.getMarketAdjustment(marketCondition);

    // 2. 포트폴리오 건강도별 조정
    optimalCash += this.getHealthAdjustment(portfolioHealth);

    // 3. 시장 지표별 조정
    optimalCash += this.getMetricsAdjustment(marketMetrics);

    // 4. 변동성 조정
    optimalCash += this.getVolatilityAdjustment(marketMetrics.volatility);

    return Math.max(
      this.minCashRatio,
      Math.min(this.maxCashRatio, optimalCash)
    );
  }

  /**
   * 현금 부족/과다 상황 처리
   */
  handleCashImbalance(currentCashRatio, optimalCashRatio, portfolio) {
    const difference = currentCashRatio - optimalCashRatio;
    const actions = [];

    if (Math.abs(difference) < 0.05) {
      return { balanced: true, actions: [] };
    }

    if (difference > 0.1) {
      // 현금이 너무 많음 - 투자 기회 모색
      const investAmount = portfolio.totalValue * (difference - 0.05);
      actions.push({
        type: "INCREASE_INVESTMENT",
        amount: investAmount,
        reason: `현금 비중 ${(currentCashRatio * 100).toFixed(1)}% → ${(optimalCashRatio * 100).toFixed(1)}%로 조정`,
        priority: "MEDIUM",
      });
    } else if (difference < -0.05) {
      // 현금이 부족함 - 일부 포지션 정리
      const needCash = portfolio.totalValue * Math.abs(difference + 0.05);
      const weakestPositions = this.findPositionsToReduce(
        portfolio.positions,
        needCash
      );

      for (const position of weakestPositions) {
        actions.push({
          type: "REDUCE_POSITION",
          symbol: position.symbol,
          reduceRatio: position.reduceRatio,
          amount: position.amount,
          reason: `현금 확보를 위한 부분 매도`,
          priority: "HIGH",
        });
      }
    }

    return { balanced: false, actions, difference };
  }

  /**
   * 긴급 상황별 현금 관리
   */
  handleEmergencyScenario(scenario, portfolio) {
    switch (scenario) {
      case "MARKET_CRASH":
        return {
          targetCashRatio: 0.35, // 35% 현금 확보
          urgency: "IMMEDIATE",
          actions: this.generateCrashResponse(portfolio),
        };

      case "FLASH_CRASH":
        return {
          targetCashRatio: 0.25, // 25% 현금 확보
          urgency: "HIGH",
          actions: this.generateFlashCrashResponse(portfolio),
        };

      case "MAJOR_NEWS":
        return {
          targetCashRatio: 0.2, // 20% 현금 확보
          urgency: "MEDIUM",
          actions: this.generateNewsResponse(portfolio),
        };

      default:
        return null;
    }
  }

  // 보조 메서드들
  getMarketAdjustment(condition) {
    switch (condition) {
      case "BEAR":
        return 0.15; // 약세장: +15%
      case "SIDEWAYS":
        return 0.1; // 횡보장: +10%
      case "BULL":
        return -0.05; // 강세장: -5%
      case "UNCERTAINTY":
        return 0.2; // 불확실성: +20%
      default:
        return 0;
    }
  }

  getHealthAdjustment(health) {
    const { unrealizedLoss, winRate, recentPerformance } = health;

    let adjustment = 0;

    // 미실현 손실별 조정
    if (unrealizedLoss < -15) adjustment += 0.15;
    else if (unrealizedLoss < -10) adjustment += 0.1;
    else if (unrealizedLoss < -5) adjustment += 0.05;

    // 승률별 조정
    if (winRate < 0.4) adjustment += 0.1;
    else if (winRate > 0.7) adjustment -= 0.05;

    // 최근 성과별 조정
    if (recentPerformance < -10) adjustment += 0.1;
    else if (recentPerformance > 10) adjustment -= 0.05;

    return adjustment;
  }

  getMetricsAdjustment(metrics) {
    const { fearGreedIndex, bitcoinDominance, totalMarketCap } = metrics;
    let adjustment = 0;

    // 공포탐욕지수별 조정
    if (fearGreedIndex < 20)
      adjustment -= 0.05; // 극도의 공포: 매수 기회
    else if (fearGreedIndex < 40)
      adjustment += 0.05; // 공포: 신중
    else if (fearGreedIndex > 80) adjustment += 0.1; // 극도의 탐욕: 매도 준비

    return adjustment;
  }

  getVolatilityAdjustment(volatility) {
    if (volatility > 0.8) return 0.1; // 높은 변동성: +10%
    if (volatility > 0.6) return 0.05; // 중간 변동성: +5%
    if (volatility < 0.3) return -0.03; // 낮은 변동성: -3%
    return 0;
  }

  findPositionsToReduce(positions, targetAmount) {
    // 약한 포지션부터 정리하여 현금 확보
    return positions
      .map((pos) => ({
        ...pos,
        weakness: this.calculatePositionWeakness(pos),
      }))
      .sort((a, b) => b.weakness - a.weakness)
      .reduce(
        (acc, pos) => {
          if (acc.totalAmount >= targetAmount) return acc;

          const reduceRatio = Math.min(
            0.5,
            (targetAmount - acc.totalAmount) / pos.value
          );
          const amount = pos.value * reduceRatio;

          acc.positions.push({
            symbol: pos.symbol,
            reduceRatio,
            amount,
          });
          acc.totalAmount += amount;

          return acc;
        },
        { positions: [], totalAmount: 0 }
      ).positions;
  }

  calculatePositionWeakness(position) {
    const profitWeight =
      position.profitPercent < 0 ? Math.abs(position.profitPercent) * 2 : 0;
    const scoreWeight =
      position.currentScore < 6.5 ? (6.5 - position.currentScore) * 10 : 0;
    const timeWeight =
      position.holdingDays > 14 ? (position.holdingDays - 14) * 0.5 : 0;

    return profitWeight + scoreWeight + timeWeight;
  }

  generateCrashResponse(portfolio) {
    return [
      { type: "STOP_NEW_ENTRIES", priority: "IMMEDIATE" },
      { type: "REDUCE_ALL_POSITIONS", ratio: 0.4, priority: "HIGH" },
      { type: "ACTIVATE_STOP_LOSSES", priority: "HIGH" },
    ];
  }

  generateFlashCrashResponse(portfolio) {
    return [
      { type: "PAUSE_TRADING", duration: "10min", priority: "IMMEDIATE" },
      { type: "EVALUATE_POSITIONS", priority: "HIGH" },
      { type: "SELECTIVE_BUYING", condition: "oversold", priority: "MEDIUM" },
    ];
  }

  generateNewsResponse(portfolio) {
    return [
      { type: "MONITOR_CLOSELY", priority: "HIGH" },
      { type: "PREPARE_QUICK_EXIT", priority: "MEDIUM" },
      { type: "REDUCE_RISKY_POSITIONS", priority: "MEDIUM" },
    ];
  }
}

export const cashManagement = new CashManagement();
