// src/services/strategies/backoffStrategy.js
class ExponentialBackoffStrategy {
  constructor() {
    this.baseDelay = 1000;
    this.maxDelay = 30000;
    this.backoffMultiplier = 2;
    this.jitterFactor = 0.1;
    this.retryAttempts = new Map();
  }

  // 🎯 지수 백오프 + 지터
  calculateDelay(attemptCount, errorType = "default") {
    const baseDelay = this.getBaseDelay(errorType);
    const exponentialDelay =
      baseDelay * Math.pow(this.backoffMultiplier, attemptCount);
    const cappedDelay = Math.min(exponentialDelay, this.maxDelay);

    // 지터 추가 (동시 호출 분산)
    const jitter = cappedDelay * this.jitterFactor * Math.random();
    return cappedDelay + jitter;
  }

  getBaseDelay(errorType) {
    const delayMap = {
      rate_limit: 2000,
      server_error: 5000,
      network_error: 1000,
      circuit_open: 10000,
      default: this.baseDelay,
    };
    return delayMap[errorType] || this.baseDelay;
  }

  // 🎯 재시도 횟수 관리
  getAttemptCount(operationId) {
    return this.retryAttempts.get(operationId) || 0;
  }

  incrementAttempt(operationId) {
    const current = this.getAttemptCount(operationId);
    this.retryAttempts.set(operationId, current + 1);
    return current + 1;
  }

  resetAttempts(operationId) {
    this.retryAttempts.delete(operationId);
  }

  // 🎯 에러 타입 분류
  classifyError(error) {
    if (error.message.includes("rate limit") || error.status === 429) {
      return "rate_limit";
    }
    if (error.message.includes("CIRCUIT_OPEN")) {
      return "circuit_open";
    }
    if (error.status >= 500) {
      return "server_error";
    }
    if (error.name === "NetworkError") {
      return "network_error";
    }
    return "default";
  }

  // 🎯 재시도 실행
  async executeWithBackoff(operation, operationId, maxRetries = 3) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        this.resetAttempts(operationId);
        return result;
      } catch (error) {
        lastError = error;

        if (attempt === maxRetries) {
          break;
        }

        const errorType = this.classifyError(error);
        const delay = this.calculateDelay(attempt, errorType);

        console.log(
          `⏳ ${operationId} 재시도 ${attempt + 1}/${maxRetries} (${delay}ms 대기)`
        );
        await this.sleep(delay);
      }
    }

    this.resetAttempts(operationId);
    throw lastError;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export { ExponentialBackoffStrategy };
