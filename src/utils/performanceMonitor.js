// src/utils/performanceMonitor.js
export class PerformanceMonitor {
  constructor() {
    this.subscribeCallCount = 0;
    this.apiCallCount = 0;
    this.renderCount = 0;
    this.lastReset = Date.now();
    this.metrics = new Map();
    this.isEnabled = process.env.NODE_ENV === "development";
  }

  // 구독 호출 추적
  trackSubscribeCall(storeName, selector) {
    if (!this.isEnabled) return;

    this.subscribeCallCount++;
    const key = `${storeName}_subscribe`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);

    // 100회마다 통계 출력
    if (this.subscribeCallCount % 100 === 0) {
      this.logPerformanceStats();
    }
  }

  // API 호출 추적
  trackApiCall(apiName, duration = 0) {
    if (!this.isEnabled) return;

    this.apiCallCount++;
    const key = `api_${apiName}`;
    const stats = this.metrics.get(key) || { count: 0, totalDuration: 0 };
    stats.count++;
    stats.totalDuration += duration;
    this.metrics.set(key, stats);
  }

  // 렌더링 추적
  trackRender(componentName) {
    if (!this.isEnabled) return;

    this.renderCount++;
    const key = `render_${componentName}`;
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + 1);
  }

  // 메모리 사용량 추적
  trackMemoryUsage(label = "general") {
    if (!this.isEnabled || !performance.memory) return;

    const memory = {
      used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
    };

    this.metrics.set(`memory_${label}`, memory);
  }

  // 성능 통계 출력
  logPerformanceStats() {
    if (!this.isEnabled) return;

    const elapsed = (Date.now() - this.lastReset) / 1000;

    console.group("📊 CryptoWise Performance Stats");
    console.log(`⏱️ Elapsed Time: ${elapsed.toFixed(1)}s`);
    console.log(`🔔 Subscribe Calls: ${this.subscribeCallCount}`);
    console.log(`🌐 API Calls: ${this.apiCallCount}`);
    console.log(`🎨 Renders: ${this.renderCount}`);

    // 상세 메트릭스
    console.group("📈 Detailed Metrics");
    for (const [key, value] of this.metrics.entries()) {
      if (key.startsWith("api_")) {
        console.log(
          `${key}: ${value.count} calls, avg ${(value.totalDuration / value.count).toFixed(2)}ms`
        );
      } else if (key.startsWith("memory_")) {
        console.log(
          `${key}: ${value.used}MB / ${value.total}MB (limit: ${value.limit}MB)`
        );
      } else {
        console.log(`${key}: ${value}`);
      }
    }
    console.groupEnd();
    console.groupEnd();
  }

  // 통계 초기화
  reset() {
    this.subscribeCallCount = 0;
    this.apiCallCount = 0;
    this.renderCount = 0;
    this.lastReset = Date.now();
    this.metrics.clear();
    console.log("📊 Performance monitor reset");
  }

  // 성능 리포트 생성
  generateReport() {
    if (!this.isEnabled) return null;

    const elapsed = (Date.now() - this.lastReset) / 1000;
    return {
      elapsed,
      subscribeCallCount: this.subscribeCallCount,
      apiCallCount: this.apiCallCount,
      renderCount: this.renderCount,
      subscribeCallsPerSecond: (this.subscribeCallCount / elapsed).toFixed(2),
      apiCallsPerSecond: (this.apiCallCount / elapsed).toFixed(2),
      rendersPerSecond: (this.renderCount / elapsed).toFixed(2),
      metrics: Object.fromEntries(this.metrics),
    };
  }

  // 콘솔 명령어 등록
  registerConsoleCommands() {
    if (!this.isEnabled) return;

    window.cryptoPerformance = {
      stats: () => this.logPerformanceStats(),
      reset: () => this.reset(),
      report: () => this.generateReport(),
      memory: (label) => this.trackMemoryUsage(label),
    };

    console.log("🔧 Performance commands available:");
    console.log("  cryptoPerformance.stats()  - 성능 통계 출력");
    console.log("  cryptoPerformance.reset()  - 통계 초기화");
    console.log("  cryptoPerformance.report() - 리포트 생성");
    console.log("  cryptoPerformance.memory() - 메모리 사용량 확인");
  }
}

// 전역 인스턴스
export const performanceMonitor = new PerformanceMonitor();

// 자동 초기화
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  performanceMonitor.registerConsoleCommands();
}

// 성능 모니터링
// cryptoPerformance.stats()     // 현재 성능 통계
// cryptoPerformance.reset()     // 통계 초기화
// cryptoPerformance.report()    // 상세 리포트
// cryptoPerformance.memory()    // 메모리 사용량

// // 디버깅 레벨 제어
// cryptoDebug.setLevel("off")   // 디버깅 끄기
// cryptoDebug.setLevel("auto")  // 자동 디버깅
// cryptoDebug.setLevel("full")  // 전체 디버깅
// cryptoDebug.config()          // 현재 설정 확인
// cryptoDebug.test()            // 테스트 로그
