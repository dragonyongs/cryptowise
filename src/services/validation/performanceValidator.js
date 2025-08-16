// src/services/validation/performanceValidator.js
export class PerformanceValidator {
  async validateStrategy(userId, minPeriod = 30) {
    const paperTrades = await this.getPaperTrades(userId, minPeriod);

    const metrics = {
      totalTrades: paperTrades.length,
      winRate: this.calculateWinRate(paperTrades),
      avgReturn: this.calculateAvgReturn(paperTrades),
      maxDrawdown: this.calculateMaxDrawdown(paperTrades),
      sharpeRatio: this.calculateSharpeRatio(paperTrades),
      profitFactor: this.calculateProfitFactor(paperTrades),
    };

    const readyForLive = this.checkLiveReadiness(metrics);
    return { metrics, readyForLive };
  }

  checkLiveReadiness(metrics) {
    return {
      passed:
        metrics.winRate >= 60 &&
        metrics.totalTrades >= 20 &&
        metrics.maxDrawdown >= -20 &&
        metrics.avgReturn >= 5,
      requirements: {
        winRate: { current: metrics.winRate, required: 60 },
        totalTrades: { current: metrics.totalTrades, required: 20 },
        maxDrawdown: { current: metrics.maxDrawdown, required: -20 },
        avgReturn: { current: metrics.avgReturn, required: 5 },
      },
    };
  }
}
