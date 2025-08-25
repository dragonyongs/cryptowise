// src/services/patterns/circuitBreaker.js
class ApiCircuitBreaker {
  constructor() {
    this.states = {
      CLOSED: "closed",
      OPEN: "open",
      HALF_OPEN: "half_open",
    };

    this.currentState = this.states.CLOSED;
    this.failureCount = 0;
    this.failureThreshold = 5;
    this.recoveryTimeout = 30000;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.halfOpenSuccessThreshold = 3;
  }

  // 🎯 API 호출 래핑
  async execute(apiCall) {
    if (this.currentState === this.states.OPEN) {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.currentState = this.states.HALF_OPEN;
        this.successCount = 0;
        console.log("🔄 API 서킷 브레이커: HALF_OPEN 상태로 전환");
      } else {
        throw new Error("API_CIRCUIT_OPEN");
      }
    }

    try {
      const result = await apiCall();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    if (this.currentState === this.states.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.currentState = this.states.CLOSED;
        this.failureCount = 0;
        console.log("✅ API 서킷 브레이커: CLOSED 상태로 복구");
      }
    } else if (this.currentState === this.states.CLOSED) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.currentState === this.states.HALF_OPEN) {
      this.currentState = this.states.OPEN;
      console.log("🚨 API 서킷 브레이커: HALF_OPEN에서 OPEN으로 전환");
    } else if (this.failureCount >= this.failureThreshold) {
      this.currentState = this.states.OPEN;
      console.log("🚨 API 서킷 브레이커: OPEN 상태로 전환");
    }
  }

  // 🎯 상태 조회
  getStatus() {
    return {
      state: this.currentState,
      failureCount: this.failureCount,
      isAvailable: this.currentState !== this.states.OPEN,
    };
  }

  // 🎯 강제 리셋
  reset() {
    this.currentState = this.states.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    console.log("🔄 API 서킷 브레이커: 강제 리셋");
  }
}

export { ApiCircuitBreaker };
