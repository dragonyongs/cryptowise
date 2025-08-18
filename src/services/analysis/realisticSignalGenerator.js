// src/services/analysis/realisticSignalGenerator.js
class RealisticSignalGenerator {
  constructor() {
    this.signalHistory = new Map();
    this.priceHistory = new Map();
    this.lastSignalTime = new Map();
  }

  async generateRealisticSignal(marketData) {
    const symbol = marketData.code.replace("KRW-", "");
    const price = marketData.trade_price;
    const changePercent = (marketData.signed_change_rate || 0) * 100;

    // 최근 신호 중복 방지 (5분 간격)
    const lastSignal = this.lastSignalTime.get(symbol) || 0;
    const now = Date.now();
    if (now - lastSignal < 300000) return null; // 5분

    // 실전형 조건들
    const conditions = {
      // 강한 하락 후 반등 기회
      strongDip: changePercent <= -2.5 && this.isNearSupport(symbol, price),

      // 볼륨 급증 브레이크아웃
      volumeBreakout:
        this.detectVolumeSpike(marketData) && changePercent >= 1.0,

      // RSI 다이버전스
      rsiDivergence: this.detectRSIDivergence(symbol, price, changePercent),

      // 이동평균 골든크로스
      goldenCross: this.detectGoldenCross(symbol, price),

      // 급락 후 바닥 신호
      bottomSignal:
        changePercent <= -1.5 && this.isPriceAtBottom(symbol, price),
    };

    let signalType = null;
    let confidence = "medium";
    let reason = [];

    if (conditions.strongDip) {
      signalType = "BUY";
      confidence = "high";
      reason.push("강한 하락 후 지지선 근처");
    } else if (conditions.bottomSignal) {
      signalType = "BUY";
      confidence = "medium";
      reason.push("급락 후 바닥권 진입");
    } else if (conditions.volumeBreakout) {
      signalType = "BUY";
      confidence = "high";
      reason.push("거래량 급증 브레이크아웃");
    } else if (changePercent <= -1.2 && Math.random() > 0.7) {
      // 30% 확률로 하락 시 매수 신호 (실전적)
      signalType = "BUY";
      confidence = "medium";
      reason.push("하락 매수 기회");
    } else if (changePercent >= 2.0 && Math.random() > 0.8) {
      // 20% 확률로 상승 시 매도 신호
      signalType = "SELL";
      confidence = "medium";
      reason.push("상승 후 차익실현");
    }

    if (!signalType) return null;

    this.lastSignalTime.set(symbol, now);

    return {
      symbol,
      type: signalType,
      price,
      totalScore: this.calculateRealisticScore(conditions, changePercent),
      confidence,
      reason: `${symbol} ${signalType} - ${reason.join(", ")}`,
      timestamp: new Date(),
      changePercent,
      conditions,
      realistic: true, // 실전형 신호 표시
    };
  }

  detectVolumeSpike(marketData) {
    const volume = marketData.trade_volume || 0;
    const avgVolume = this.getAverageVolume(marketData.code);
    return volume > avgVolume * 2.0; // 평균 2배 이상
  }

  isPriceAtBottom(symbol, currentPrice) {
    const history = this.priceHistory.get(symbol) || [];
    if (history.length < 10) return false;

    const recentLow = Math.min(...history.slice(-10));
    return currentPrice <= recentLow * 1.02; // 최근 최저가 2% 이내
  }

  calculateRealisticScore(conditions, changePercent) {
    let score = 5.0;

    if (conditions.strongDip) score += 2.5;
    if (conditions.volumeBreakout) score += 2.0;
    if (conditions.bottomSignal) score += 1.5;
    if (Math.abs(changePercent) >= 2.0) score += 1.0;

    return Math.min(score, 10.0);
  }
}

export const realisticSignalGenerator = new RealisticSignalGenerator();
