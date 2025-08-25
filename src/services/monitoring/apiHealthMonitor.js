// src/services/monitoring/apiHealthMonitor.js
class ApiHealthMonitor {
  constructor() {
    this.healthMetrics = {
      uptime: 1.0,
      responseTime: 0,
      errorRate: 0,
      throughput: 0,
      lastCheck: Date.now(),
    };

    this.thresholds = {
      responseTimeWarning: 2000,
      responseTimeCritical: 5000,
      errorRateWarning: 0.05,
      errorRateCritical: 0.15,
      uptimeWarning: 0.95,
      uptimeCritical: 0.9,
    };

    this.history = [];
    this.maxHistoryLength = 100;
  }

  // 🎯 실시간 건강도 평가
  assessHealth() {
    const { responseTime, errorRate, uptime } = this.healthMetrics;

    if (
      errorRate > this.thresholds.errorRateCritical ||
      responseTime > this.thresholds.responseTimeCritical ||
      uptime < this.thresholds.uptimeCritical
    ) {
      return "critical";
    }

    if (
      errorRate > this.thresholds.errorRateWarning ||
      responseTime > this.thresholds.responseTimeWarning ||
      uptime < this.thresholds.uptimeWarning
    ) {
      return "warning";
    }

    return "healthy";
  }

  // 🎯 건강도 기반 자동 조정
  getRecommendedStrategy(healthStatus) {
    const strategies = {
      healthy: {
        aggressiveness: 1.0,
        batchSize: 100,
        interval: 1000,
        concurrency: 3,
      },
      warning: {
        aggressiveness: 0.7,
        batchSize: 50,
        interval: 2000,
        concurrency: 2,
      },
      critical: {
        aggressiveness: 0.3,
        batchSize: 20,
        interval: 5000,
        concurrency: 1,
      },
    };

    return strategies[healthStatus];
  }

  // 🎯 메트릭 업데이트
  updateMetrics(callResult) {
    const { success, responseTime, timestamp } = callResult;

    // 히스토리 업데이트
    this.history.push(callResult);
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }

    // 메트릭 계산
    if (this.history.length > 0) {
      const recentCalls = this.history.slice(-50); // 최근 50개
      const successCount = recentCalls.filter((call) => call.success).length;

      this.healthMetrics.errorRate = 1 - successCount / recentCalls.length;
      this.healthMetrics.responseTime =
        recentCalls.reduce((sum, call) => sum + call.responseTime, 0) /
        recentCalls.length;
      this.healthMetrics.uptime = successCount / recentCalls.length;
      this.healthMetrics.throughput =
        recentCalls.length / ((Date.now() - recentCalls[0].timestamp) / 1000);
      this.healthMetrics.lastCheck = Date.now();
    }
  }

  // 🎯 상태 조회
  getStatus() {
    const health = this.assessHealth();
    return {
      health,
      metrics: this.healthMetrics,
      recommendation: this.getRecommendedStrategy(health),
      history: this.history.slice(-10), // 최근 10개만
    };
  }
}

export { ApiHealthMonitor };
