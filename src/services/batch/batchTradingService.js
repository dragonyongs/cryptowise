// src/services/batch/batchTradingService.js - API 호출 오류 수정
class BatchTradingService {
  constructor() {
    this.schedule = {
      morning: "09:00",
      lunch: "13:00",
      afternoon: "16:00",
      evening: "20:00",
      night: "23:00",
    };
    this.isRunning = false;
    this.nextTimeout = null;
    this.onSignalsFound = null;
    this.batchCount = 0;
  }

  async startScheduledTrading() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log("📅 순수 스케줄 시스템 시작 - WebSocket 완전 차단");

    const scheduleNext = () => {
      if (!this.isRunning) return;

      const nextExecution = this.getNextExecutionTime();
      const delay = nextExecution - Date.now();

      console.log(`⏰ ${Math.round(delay / 1000 / 60)}분 후 다음 배치 실행`);

      this.nextTimeout = setTimeout(async () => {
        await this.executeBatchAnalysis();
        scheduleNext();
      }, delay);
    };

    scheduleNext();
  }

  async executeBatchAnalysis() {
    this.batchCount++;
    const startTime = Date.now();
    console.log(`🔍 배치 #${this.batchCount} 분석 시작 - 단일 API 호출`);

    try {
      // ✅ 단 1회 API 호출로 모든 데이터 수집
      const marketData = await this.getBulkMarketData();
      console.log(`📊 ${marketData.length}개 코인 데이터 일괄 수집`);

      // ✅ 종합 결정 (매수/매도/보유)
      const decisions = await this.makeInvestmentDecisions(marketData);

      // ✅ 실행 가능한 거래만 필터링
      const executableTrades = decisions.filter((d) => d.action !== "HOLD");

      if (executableTrades.length > 0) {
        console.log(`✅ ${executableTrades.length}개 거래 결정 실행`);
        if (this.onSignalsFound) {
          await this.onSignalsFound(executableTrades);
        }
      } else {
        console.log("📊 모든 코인 현재 보유 유지");
      }

      const duration = Date.now() - startTime;
      console.log(`⚡ 배치 #${this.batchCount} 완료: ${duration}ms`);
      console.log("😴 다음 스케줄까지 완전 대기 상태");

      return {
        success: true,
        batchNumber: this.batchCount,
        tradesExecuted: executableTrades.length,
        totalAnalyzed: marketData.length,
        duration,
      };
    } catch (error) {
      console.error(`❌ 배치 #${this.batchCount} 실패:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ 무료 플랜 API 호출 - 띄어쓰기 제거로 404 에러 해결
  async getBulkMarketData() {
    const symbols = [
      "KRW-BTC",
      "KRW-ETH",
      "KRW-XRP",
      "KRW-ADA",
      "KRW-SOL",
      "KRW-DOGE",
      "KRW-DOT",
      "KRW-MATIC",
      "KRW-AVAX",
      "KRW-LINK",
      "KRW-ATOM",
      "KRW-NEAR",
      "KRW-ALGO",
      "KRW-AXS",
      "KRW-SAND",
    ];

    // ✅ 띄어쓰기 제거: join(",") 사용 (join(", ") 아님!)
    const markets = symbols.join(",");

    console.log(`🌐 단일 API 호출: ${symbols.length}개 코인`);
    console.log(
      `📍 요청 URL: https://api.upbit.com/v1/ticker?markets=${markets}`
    );

    const response = await fetch(
      `https://api.upbit.com/v1/ticker?markets=${markets}`
    );
    if (!response.ok) {
      throw new Error(
        `API 호출 실패: ${response.status} - ${response.statusText}`
      );
    }

    return response.json();
  }

  // ✅ 투자 결정 로직
  async makeInvestmentDecisions(marketData) {
    const decisions = [];

    for (const coinData of marketData) {
      const symbol = coinData.market.replace("KRW-", "");
      const currentPrice = coinData.trade_price;
      const changePercent = (coinData.signed_change_rate || 0) * 100;
      const volume = coinData.acc_trade_volume_24h;

      // ✅ 종합 점수 계산
      const score = this.calculateInvestmentScore(changePercent, volume);

      let action = "HOLD";
      let reason = "현재 보유";

      // ✅ 투자 결정
      if (score >= 8.0 && changePercent <= -3.0) {
        action = "BUY";
        reason = `강력매수 - 점수:${score.toFixed(1)}, 급락:${changePercent.toFixed(1)}%`;
      } else if (score >= 7.0 && changePercent <= -2.0) {
        action = "BUY";
        reason = `매수 - 점수:${score.toFixed(1)}, 하락:${changePercent.toFixed(1)}%`;
      } else if (changePercent >= 5.0 || score <= 3.0) {
        action = "SELL";
        reason = `매도 - 점수:${score.toFixed(1)}, 상승:${changePercent.toFixed(1)}%`;
      }

      decisions.push({
        symbol,
        type: action,
        price: currentPrice,
        score,
        reason,
        changePercent,
        volume,
        timestamp: new Date(),
        batchMode: true,
      });
    }

    return decisions;
  }

  calculateInvestmentScore(changePercent, volume) {
    let score = 5.0;

    // 가격 변동 점수
    if (changePercent <= -5.0)
      score = 9.5; // 대폭락 -> 강력매수
    else if (changePercent <= -3.0)
      score = 8.5; // 급락 -> 매수
    else if (changePercent <= -2.0)
      score = 7.5; // 하락 -> 매수고려
    else if (changePercent <= -1.0)
      score = 6.0; // 소폭하락
    else if (changePercent >= 5.0)
      score = 2.0; // 급등 -> 매도
    else if (changePercent >= 3.0) score = 3.0; // 상승 -> 매도고려

    // 거래량 가중치
    const avgVolume = 100000000000; // 1000억 기준
    if (volume > avgVolume * 2)
      score += 1.0; // 대량거래
    else if (volume < avgVolume * 0.3) score -= 1.0; // 거래량부족

    return Math.max(1.0, Math.min(10.0, score));
  }

  getNextExecutionTime() {
    const now = new Date();
    const today = now.toDateString();
    const scheduleHours = Object.values(this.schedule);

    for (const timeStr of scheduleHours) {
      const scheduleTime = new Date(`${today} ${timeStr}:00`);
      if (scheduleTime > now) {
        return scheduleTime.getTime();
      }
    }

    // 내일 첫 일정
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowMorning = new Date(
      `${tomorrow.toDateString()} ${this.schedule.morning}:00`
    );
    return tomorrowMorning.getTime();
  }

  stopScheduledTrading() {
    this.isRunning = false;
    if (this.nextTimeout) {
      clearTimeout(this.nextTimeout);
      this.nextTimeout = null;
    }
    console.log("⏹️ 스케줄 시스템 완전 중지");
  }

  setSignalCallback(callback) {
    this.onSignalsFound = callback;
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      nextExecution: this.isRunning
        ? new Date(this.getNextExecutionTime())
        : null,
      schedule: this.schedule,
      batchCount: this.batchCount,
      apiCallsPerDay: 5,
      costPerMonth: 0,
    };
  }
}

export const batchTradingService = new BatchTradingService();
export default BatchTradingService;
