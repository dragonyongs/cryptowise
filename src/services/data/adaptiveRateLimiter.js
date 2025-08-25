// src/services/data/adaptiveRateLimiter.js
class AdaptiveRateLimiter {
  constructor() {
    this.config = {
      baseLimit: 70,
      minLimit: 30,
      maxLimit: 90,
      successThreshold: 0.95,
      errorThreshold: 0.1,
      adjustmentFactor: 0.1,
    };

    this.metrics = {
      successRate: 1.0,
      avgResponseTime: 0,
      errorCount: 0,
      totalCalls: 0,
      recentCalls: [],
    };

    this.currentLimit = this.config.baseLimit;
    this.rateLimiter = {
      calls: 0,
      resetTime: Date.now(),
      lastCall: 0,
    };
  }

  // 🎯 성능 기반 동적 조정
  adjustLimits() {
    const { successRate, avgResponseTime } = this.metrics;

    if (successRate >= this.config.successThreshold && avgResponseTime < 1000) {
      this.currentLimit = Math.min(
        this.config.maxLimit,
        this.currentLimit * (1 + this.config.adjustmentFactor)
      );
    } else if (successRate < 1 - this.config.errorThreshold) {
      this.currentLimit = Math.max(
        this.config.minLimit,
        this.currentLimit * (1 - this.config.adjustmentFactor * 2)
      );
    }

    console.log(`🔄 Rate Limit 자동 조정: ${Math.round(this.currentLimit)}/분`);
  }

  // 🎯 지능형 간격 계산
  calculateOptimalInterval() {
    const optimalInterval = Math.max(500, (60000 / this.currentLimit) * 0.8);
    return optimalInterval;
  }

  // 🎯 API 호출 가능 여부 체크 (우선순위별)
  canMakeCall(priority = "background") {
    const now = Date.now();

    // 분당 제한 리셋
    if (now - this.rateLimiter.resetTime > 60000) {
      this.rateLimiter.calls = 0;
      this.rateLimiter.resetTime = now;
    }

    // 우선순위별 한계치
    const priorityLimits = {
      critical: this.currentLimit * 0.9,
      important: this.currentLimit * 0.75,
      background: this.currentLimit * 0.6,
    };

    if (this.rateLimiter.calls >= priorityLimits[priority]) {
      return false;
    }

    // 최소 간격 체크
    const minInterval = this.calculateOptimalInterval();
    if (now - this.rateLimiter.lastCall < minInterval) {
      return false;
    }

    return true;
  }

  // 🎯 API 호출 기록
  recordCall(success, responseTime) {
    this.rateLimiter.calls++;
    this.rateLimiter.lastCall = Date.now();

    // 메트릭 업데이트
    this.metrics.totalCalls++;
    this.metrics.recentCalls.push({
      success,
      responseTime,
      timestamp: Date.now(),
    });

    // 최근 100개만 유지
    if (this.metrics.recentCalls.length > 100) {
      this.metrics.recentCalls.shift();
    }

    this.updateMetrics();
  }

  // 🎯 메트릭 업데이트
  updateMetrics() {
    const recent = this.metrics.recentCalls;
    if (recent.length === 0) return;

    const successCount = recent.filter((call) => call.success).length;
    this.metrics.successRate = successCount / recent.length;

    const totalTime = recent.reduce((sum, call) => sum + call.responseTime, 0);
    this.metrics.avgResponseTime = totalTime / recent.length;

    this.metrics.errorCount = recent.length - successCount;
  }

  // 🎯 상태 조회
  getStatus() {
    return {
      currentLimit: Math.round(this.currentLimit),
      calls: this.rateLimiter.calls,
      successRate: this.metrics.successRate,
      avgResponseTime: Math.round(this.metrics.avgResponseTime),
      canCall: this.canMakeCall(),
    };
  }
}

export { AdaptiveRateLimiter };
