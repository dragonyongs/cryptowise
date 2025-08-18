// src/services/batch/batchTradingService.js - 404 오류 수정 및 동적 코인 선정

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
    this.topCoinsCache = null;
    this.topCoinsCacheTime = 0;
    this.CACHE_DURATION = 30 * 60 * 1000; // 30분 캐시
  }

  async startScheduledTrading() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("📅 동적 코인 선정 스케줄 시스템 시작");

    const scheduleNext = () => {
      if (!this.isRunning) return;
      const nextExecution = this.getNextExecutionTime();
      const delay = nextExecution - Date.now();
      console.log(
        `⏰ ${Math.round(delay / 1000 / 60)}분 후 다음 배치 실행 (동적 상위 10개)`
      );

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
    console.log(`🔍 배치 #${this.batchCount} 분석 시작 - 동적 상위 10개 코인`);

    try {
      // ✅ 동적 상위 10개 코인 데이터 수집
      const marketData = await this.getBulkMarketData();
      console.log(`📊 ${marketData.length}개 코인 데이터 수집 완료`);
      console.log(
        `🎯 분석 대상: ${marketData.map((d) => d.market.replace("KRW-", "")).join(", ")}`
      );

      // 투자 결정
      const decisions = await this.makeInvestmentDecisions(marketData);
      const executableTrades = decisions.filter((d) => d.type !== "HOLD");

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

      return {
        success: true,
        batchNumber: this.batchCount,
        tradesExecuted: executableTrades.length,
        totalAnalyzed: marketData.length,
        duration,
        analyzedCoins: marketData.map((d) => d.market.replace("KRW-", "")),
      };
    } catch (error) {
      console.error(`❌ 배치 #${this.batchCount} 실패:`, error);
      return { success: false, error: error.message };
    }
  }

  // ✅ 동적 상위 10개 코인 조회
  async getTopCoins() {
    const now = Date.now();

    // 캐시 확인 (30분)
    if (
      this.topCoinsCache &&
      now - this.topCoinsCacheTime < this.CACHE_DURATION
    ) {
      console.log("📋 캐시된 상위 코인 사용");
      return this.topCoinsCache;
    }

    console.log("🌐 실시간 상위 10개 코인 조회");

    try {
      // 1단계: 전체 KRW 마켓 조회
      const marketResponse = await fetch("https://api.upbit.com/v1/market/all");
      if (!marketResponse.ok) {
        throw new Error(`마켓 조회 실패: ${marketResponse.status}`);
      }

      const allMarkets = await marketResponse.json();
      const krwMarkets = allMarkets
        .filter((market) => market.market.startsWith("KRW-"))
        .filter((market) => !market.market.includes("KRW-BTC")) // BTC는 별도 처리 가능
        .slice(0, 50); // 상위 50개만 고려

      // 2단계: 거래량 기준 상위 10개 선정
      console.log(
        `📈 ${krwMarkets.length}개 KRW 마켓 중 거래량 상위 10개 선정`
      );

      const symbols = krwMarkets.slice(0, 15).map((m) => m.market); // 15개로 안전하게

      // ✅ 띄어쓰기 제거하여 404 오류 방지
      const markets = symbols.join(","); // 쉼표만, 띄어쓰기 없음
      console.log(
        `🔗 API 호출 URL: https://api.upbit.com/v1/ticker?markets=${markets}`
      );

      const tickerResponse = await fetch(
        `https://api.upbit.com/v1/ticker?markets=${markets}`
      );
      if (!tickerResponse.ok) {
        throw new Error(
          `시세 조회 실패: ${tickerResponse.status} - ${tickerResponse.statusText}`
        );
      }

      const tickerData = await tickerResponse.json();

      // 3단계: 거래량 순으로 정렬하여 상위 10개 선정
      const sortedByVolume = tickerData
        .sort((a, b) => b.acc_trade_price_24h - a.acc_trade_price_24h)
        .slice(0, 10);

      const topCoins = sortedByVolume.map((coin) => ({
        symbol: coin.market,
        volume24h: coin.acc_trade_price_24h,
        price: coin.trade_price,
        change: coin.signed_change_rate * 100,
      }));

      // 캐시 저장
      this.topCoinsCache = topCoins;
      this.topCoinsCacheTime = now;

      console.log("🏆 선정된 상위 10개 코인:");
      topCoins.forEach((coin, idx) => {
        const symbol = coin.symbol.replace("KRW-", "");
        console.log(
          `  ${idx + 1}. ${symbol}: ${coin.volume24h.toLocaleString()}원 (${coin.change.toFixed(2)}%)`
        );
      });

      return topCoins;
    } catch (error) {
      console.error("동적 코인 조회 실패, 기본 코인 사용:", error);

      // 실패 시 기본 코인 사용
      return [
        { symbol: "KRW-BTC" },
        { symbol: "KRW-ETH" },
        { symbol: "KRW-XRP" },
        { symbol: "KRW-ADA" },
        { symbol: "KRW-SOL" },
        { symbol: "KRW-DOGE" },
        { symbol: "KRW-DOT" },
        { symbol: "KRW-MATIC" },
        { symbol: "KRW-AVAX" },
        { symbol: "KRW-LINK" },
      ];
    }
  }

  // ✅ 수정된 getBulkMarketData - 404 오류 해결
  async getBulkMarketData() {
    const topCoins = await this.getTopCoins();
    const symbols = topCoins.map((coin) => coin.symbol);

    // ✅ 중요: 띄어쓰기 제거하여 404 오류 방지
    const markets = symbols.join(","); // "KRW-BTC,KRW-ETH,..." (띄어쓰기 없음)

    console.log(`🌐 API 호출: ${symbols.length}개 동적 선정 코인`);
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

    const data = await response.json();
    console.log(`✅ ${data.length}개 코인 데이터 수집 성공`);

    return data;
  }

  // ✅ 투자 결정 로직 (기존과 동일하지만 더 엄격)
  async makeInvestmentDecisions(marketData) {
    const decisions = [];

    for (const coinData of marketData) {
      const symbol = coinData.market.replace("KRW-", "");
      const currentPrice = coinData.trade_price;
      const changePercent = (coinData.signed_change_rate || 0) * 100;
      const volume = coinData.acc_trade_price_24h; // 거래대금 기준

      // 종합 점수 계산
      const score = this.calculateInvestmentScore(changePercent, volume);

      let action = "HOLD";
      let reason = "현재 보유";

      // ✅ 더 엄격한 투자 결정
      if (score >= 8.5 && changePercent <= -4.0) {
        action = "BUY";
        reason = `강력매수 - 점수:${score.toFixed(1)}, 급락:${changePercent.toFixed(1)}%`;
      } else if (score >= 7.5 && changePercent <= -2.5) {
        action = "BUY";
        reason = `매수 - 점수:${score.toFixed(1)}, 하락:${changePercent.toFixed(1)}%`;
      } else if (changePercent >= 6.0 || score <= 2.5) {
        action = "SELL";
        reason = `매도 - 점수:${score.toFixed(1)}, 상승:${changePercent.toFixed(1)}%`;
      }

      decisions.push({
        symbol,
        type: action,
        price: currentPrice,
        totalScore: score,
        reason,
        changePercent,
        volume,
        timestamp: new Date(),
        confidence: score >= 8 ? "high" : score >= 6 ? "medium" : "low",
        batchMode: true,
      });
    }

    const buyDecisions = decisions.filter((d) => d.type === "BUY").length;
    const sellDecisions = decisions.filter((d) => d.type === "SELL").length;
    const holdDecisions = decisions.filter((d) => d.type === "HOLD").length;

    console.log(
      `📊 투자 결정: 매수 ${buyDecisions}개, 매도 ${sellDecisions}개, 보유 ${holdDecisions}개`
    );

    return decisions;
  }

  calculateInvestmentScore(changePercent, volume) {
    let score = 5.0;

    // 가격 변동 점수 (더 엄격)
    if (changePercent <= -6.0)
      score = 9.5; // 대폭락 -> 강력매수
    else if (changePercent <= -4.0)
      score = 8.5; // 급락 -> 매수
    else if (changePercent <= -2.5)
      score = 7.5; // 하락 -> 매수고려
    else if (changePercent <= -1.5)
      score = 6.0; // 소폭하락
    else if (changePercent >= 6.0)
      score = 2.0; // 급등 -> 매도
    else if (changePercent >= 4.0) score = 3.0; // 상승 -> 매도고려

    // 거래량 가중치 (거래대금 기준)
    const avgVolume = 50000000000; // 500억 기준
    if (volume > avgVolume * 3)
      score += 1.5; // 대량거래
    else if (volume > avgVolume * 2)
      score += 1.0; // 많은 거래
    else if (volume < avgVolume * 0.2) score -= 1.5; // 거래량부족

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
    console.log("⏹️ 동적 스케줄 시스템 완전 중지");
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
      topCoinsCache:
        this.topCoinsCache?.map((c) => c.symbol.replace("KRW-", "")) || [],
      cacheUpdatedAt: this.topCoinsCacheTime
        ? new Date(this.topCoinsCacheTime)
        : null,
      apiCallsPerDay: 5, // 스케줄 기반
      costPerMonth: 0, // 무료
      dynamicSelection: true, // 동적 선정 활성화
    };
  }

  // ✅ 개발용 - 캐시 강제 갱신
  async refreshTopCoins() {
    this.topCoinsCache = null;
    this.topCoinsCacheTime = 0;
    return await this.getTopCoins();
  }
}

export const batchTradingService = new BatchTradingService();
export default BatchTradingService;
