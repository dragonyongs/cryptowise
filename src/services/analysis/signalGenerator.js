import { technicalAnalysis } from "./technicalAnalysis";

/**
 * CryptoWise 신호 생성기
 * 기술적 분석 기반으로 매수/매도 신호를 생성합니다
 */
class SignalGenerator {
  constructor() {
    // CryptoWise 전략 가중치 [11]
    this.weights = {
      technical: {
        rsi: 0.25, // RSI 25%
        movingAverage: 0.2, // 이동평균 20%
        bollinger: 0.15, // 볼링거밴드 15%
        macd: 0.15, // MACD 15%
        volume: 0.1, // 거래량 10%
        support: 0.15, // 지지저항 15%
      },
    };

    // 신호 임계값
    this.thresholds = {
      minBuyScore: 3.5, // CryptoWise 핵심: 8점 이상만 매수
      minSellScore: 6.0, // 매도는 6점 이상
      strongBuyScore: 9.0, // 강력매수 9점 이상
      maxScore: 10.0, // 최대 점수
    };

    // 코인별 특별 조건 [11]
    this.coinSpecificRules = {
      BTC: {
        rsiOversold: 35, // BTC는 RSI 35 이하에서 매수
        rsiOverbought: 75, // BTC는 RSI 75 이상에서 매도
        volumeMultiplier: 1.2,
      },
      ETH: {
        rsiOversold: 30,
        rsiOverbought: 70,
        volumeMultiplier: 1.5,
      },
      XRP: {
        rsiOversold: 25, // 알트코인은 더 극단적 수치
        rsiOverbought: 75,
        volumeMultiplier: 2.0,
      },
    };
  }

  /**
   * 메인 신호 생성 함수
   */
  async generateSignals(marketDataArray, strategy = "cryptowise") {
    console.log("🎯 신호 생성 시작:", marketDataArray.length, "개 코인");

    const signals = [];

    for (const marketData of marketDataArray) {
      try {
        const signal = await this.analyzeSymbol(marketData, strategy);
        if (signal && signal.totalScore >= this.thresholds.minBuyScore) {
          signals.push(signal);
          console.log(
            `✅ 신호 생성: ${signal.symbol} ${signal.type} (${signal.totalScore.toFixed(1)}점)`
          );
        }
      } catch (error) {
        console.error(
          `❌ 신호 생성 오류 (${marketData.symbol}):`,
          error.message
        );
      }
    }

    // 점수 높은 순으로 정렬
    return signals.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * 개별 코인 분석
   */
  async analyzeSymbol(marketData, strategy) {
    const { symbol, price, volume24h, rsi, macd, bollinger } = marketData;

    // 1. 기술적 분석 점수 계산
    const technicalScores = this.calculateTechnicalScores(marketData);

    // 2. 총점 계산
    const totalScore = this.calculateTotalScore(technicalScores);

    // 3. 신호 유형 결정
    const signalType = this.determineSignalType(marketData, totalScore);

    if (!signalType) return null;

    // 4. 신호 객체 생성
    return {
      symbol,
      type: signalType,
      price,
      totalScore,
      technicalScore: totalScore, // 현재는 기술적 분석만
      fundamentalScore: 0, // 추후 구현
      marketScore: 0, // 추후 구현
      riskScore: this.calculateRiskScore(marketData),
      timestamp: new Date(),
      reason: this.generateReason(marketData, signalType, totalScore),
      confidence: this.calculateConfidence(totalScore),
      volume24h,
      indicators: {
        rsi: marketData.rsi,
        macd: marketData.macd,
        bollinger: marketData.bollinger,
      },
    };
  }

  /**
   * 기술적 분석 점수 계산 [11]
   */
  calculateTechnicalScores(marketData) {
    const { symbol, price, volume24h, rsi, macd, bollinger } = marketData;
    const rules =
      this.coinSpecificRules[symbol] || this.coinSpecificRules["ETH"];

    const scores = {
      rsi: this.calculateRsiScore(rsi, rules),
      movingAverage: this.calculateMovingAverageScore(marketData),
      bollinger: this.calculateBollingerScore(bollinger, price),
      macd: this.calculateMacdScore(macd),
      volume: this.calculateVolumeScore(volume24h, marketData.avgVolume),
      support: this.calculateSupportResistanceScore(marketData),
    };

    // ✅ 디버깅 로그 추가 - 여기가 핵심!
    const totalScore = this.calculateTotalScore(scores);
    console.log(`🎯 ${symbol} 신호분석:`, {
      price: price,
      rsi: rsi?.toFixed(1),
      totalScore: totalScore.toFixed(2),
      threshold: this.thresholds.minBuyScore,
      willBuy: totalScore >= this.thresholds.minBuyScore,
      scores: Object.fromEntries(
        Object.entries(scores).map(([key, value]) => [key, value.toFixed(1)])
      ),
    });

    return scores;
  }

  /**
   * RSI 점수 계산
   */
  calculateRsiScore(rsi, rules) {
    if (!rsi) return 0;

    // 매수 시그널
    if (rsi <= rules.rsiOversold) {
      return 10; // 강력매수
    } else if (rsi <= rules.rsiOversold + 10) {
      return 7; // 매수
    } else if (rsi >= rules.rsiOverbought) {
      return 0; // 매도 (음수 점수)
    } else if (rsi >= rules.rsiOverbought - 10) {
      return 3; // 중립
    } else {
      return 5; // 보통
    }
  }

  /**
   * 이동평균 점수 계산
   */
  calculateMovingAverageScore(marketData) {
    const { price, ma20, ma60 } = marketData;

    if (!ma20 || !ma60) return 5; // 기본 점수

    // 골든크로스 (강력매수)
    if (price > ma20 && ma20 > ma60) {
      return 10;
    }
    // 데스크로스 (매도)
    else if (price < ma20 && ma20 < ma60) {
      return 0;
    }
    // 이동평균 사이 (중립)
    else if (price > ma20 && price < ma60) {
      return 6;
    } else {
      return 4;
    }
  }

  /**
   * 볼링거밴드 점수 계산
   */
  calculateBollingerScore(bollinger, price) {
    if (!bollinger || !price) return 5;

    const { upper, middle, lower } = bollinger;

    // 하단밴드 터치 (강력매수)
    if (price <= lower * 1.02) {
      return 10;
    }
    // 하단밴드 근처 (매수)
    else if (price <= lower * 1.05) {
      return 8;
    }
    // 상단밴드 터치 (매도)
    else if (price >= upper * 0.98) {
      return 0;
    }
    // 중간선 근처 (중립)
    else {
      return 5;
    }
  }

  /**
   * MACD 점수 계산
   */
  calculateMacdScore(macd) {
    if (!macd) return 5;

    const { line, signal, histogram } = macd;

    // MACD 라인이 시그널 라인 위로 교차 (매수)
    if (line > signal && histogram > 0) {
      return 10;
    }
    // MACD 라인이 시그널 라인 아래로 교차 (매도)
    else if (line < signal && histogram < 0) {
      return 0;
    }
    // MACD 라인이 시그널 라인 위 (상승)
    else if (line > signal) {
      return 7;
    } else {
      return 3;
    }
  }

  /**
   * 거래량 점수 계산
   */
  calculateVolumeScore(volume24h, avgVolume) {
    if (!volume24h || !avgVolume) return 5;

    const volumeRatio = volume24h / avgVolume;

    // 폭등 거래량 (강력매수)
    if (volumeRatio >= 2.0) {
      return 10;
    }
    // 높은 거래량 (매수)
    else if (volumeRatio >= 1.5) {
      return 8;
    }
    // 보통 거래량 (중립)
    else if (volumeRatio >= 0.8) {
      return 5;
    }
    // 저조한 거래량 (주의)
    else {
      return 2;
    }
  }

  /**
   * 지지저항 점수 계산
   */
  calculateSupportResistanceScore(marketData) {
    const { price, support, resistance } = marketData;

    if (!support || !resistance) return 5;

    const supportDistance = (price - support) / support;
    const resistanceDistance = (resistance - price) / price;

    // 지지선 근처에서 반등 (매수)
    if (supportDistance <= 0.03 && supportDistance >= 0) {
      return 10;
    }
    // 저항선 근처 도달 (매도 주의)
    else if (resistanceDistance <= 0.03) {
      return 2;
    }
    // 지지선과 저항선 사이 (중립)
    else {
      return 5;
    }
  }

  /**
   * 총점 계산
   */
  calculateTotalScore(technicalScores) {
    let totalScore = 0;

    for (const [indicator, score] of Object.entries(technicalScores)) {
      const weight = this.weights.technical[indicator] || 0;
      totalScore += score * weight;
    }

    return Math.min(Math.max(totalScore, 0), this.thresholds.maxScore);
  }

  /**
   * 신호 유형 결정
   */
  determineSignalType(marketData, totalScore) {
    const { rsi } = marketData;

    // ✅ 테스트용 완화된 조건
    console.log(
      `🔍 ${marketData.symbol} 신호판단: 점수=${totalScore.toFixed(2)}, RSI=${rsi?.toFixed(1)}`
    );

    // 테스트용: 5점 이상이면 매수 신호 생성
    if (totalScore >= 5.0) {
      // 8.0 → 5.0으로 완화
      if (rsi && rsi < 80) {
        // 75 → 80으로 완화
        console.log(`✅ ${marketData.symbol} 매수신호 발생!`);
        return "BUY";
      }
    }

    if (totalScore <= 3 || (rsi && rsi > 85)) {
      return "SELL";
    }
    return null;
  }
  // determineSignalType(marketData, totalScore) {
  //   const { rsi, volume24h } = marketData;

  //   // 매수 신호 조건
  //   if (totalScore >= this.thresholds.minBuyScore) {
  //     // 추가 검증: RSI가 너무 높지 않아야 함
  //     if (rsi && rsi < 75) {
  //       return "BUY";
  //     }
  //   }

  //   // 매도 신호 조건 (기존 보유시)
  //   if (totalScore <= 3 || (rsi && rsi > 80)) {
  //     return "SELL";
  //   }

  //   return null; // 신호 없음
  // }

  /**
   * 위험 점수 계산
   */
  calculateRiskScore(marketData) {
    const { rsi, volume24h, avgVolume } = marketData;

    let riskScore = 5; // 기본 중간 위험

    // RSI 극단값은 위험 증가
    if (rsi > 80 || rsi < 20) riskScore += 2;

    // 거래량 급증은 위험 증가
    if (volume24h && avgVolume && volume24h > avgVolume * 3) {
      riskScore += 1;
    }

    return Math.min(Math.max(riskScore, 1), 10);
  }

  /**
   * 신뢰도 계산
   */
  calculateConfidence(totalScore) {
    if (totalScore >= this.thresholds.strongBuyScore) return "HIGH";
    if (totalScore >= this.thresholds.minBuyScore) return "MEDIUM";
    if (totalScore >= this.thresholds.minSellScore) return "LOW";
    return "VERY_LOW";
  }

  /**
   * 신호 사유 생성
   */
  generateReason(marketData, signalType, totalScore) {
    const { symbol, rsi, volume24h, avgVolume } = marketData;
    const volumeRatio =
      volume24h && avgVolume ? (volume24h / avgVolume).toFixed(1) : "?";

    if (signalType === "BUY") {
      if (totalScore >= this.thresholds.strongBuyScore) {
        return `${symbol} 강력매수: 종합점수 ${totalScore.toFixed(1)}점, RSI ${rsi?.toFixed(1)}, 거래량 ${volumeRatio}배`;
      } else {
        return `${symbol} 매수: 종합점수 ${totalScore.toFixed(1)}점, RSI ${rsi?.toFixed(1)}`;
      }
    } else if (signalType === "SELL") {
      return `${symbol} 매도: 기술적 과열, RSI ${rsi?.toFixed(1)}`;
    }

    return `${symbol} 분석완료`;
  }
}

// 싱글톤 인스턴스 생성
export const signalGenerator = new SignalGenerator();

// 기본 내보내기
export default signalGenerator;

// 편의 함수들
export const generateSignals =
  signalGenerator.generateSignals.bind(signalGenerator);
export const analyzeSymbol =
  signalGenerator.analyzeSymbol.bind(signalGenerator);
