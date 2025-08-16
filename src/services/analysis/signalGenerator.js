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

    // ✅ 기본 신호 임계값 (설정으로 오버라이드 가능)
    this.defaultThresholds = {
      minBuyScore: 7.5, // 기본 매수 점수
      minSellScore: 6.0, // 매도 점수
      strongBuyScore: 9.0, // 강력매수 9점 이상
      maxScore: 10.0, // 최대 점수
    };

    // 코인별 특별 조건 [11]
    this.coinSpecificRules = {
      BTC: {
        rsiOversold: 35,
        rsiOverbought: 75,
        volumeMultiplier: 1.2,
      },
      ETH: {
        rsiOversold: 30,
        rsiOverbought: 70,
        volumeMultiplier: 1.5,
      },
      XRP: {
        rsiOversold: 25,
        rsiOverbought: 75,
        volumeMultiplier: 2.0,
      },
    };
  }

  /**
   * ✅ 설정 기반 신호 생성 함수 (새로 추가)
   */
  async generateSignalsWithSettings(marketDataArray, userSettings = {}) {
    console.log("🎯 설정 기반 신호 생성:", marketDataArray.length, "개 코인");
    console.log("📋 사용자 설정:", userSettings);

    const signals = [];
    const thresholds = { ...this.defaultThresholds, ...userSettings };

    for (const marketData of marketDataArray) {
      try {
        const signal = await this.analyzeSymbolWithSettings(
          marketData,
          thresholds
        );
        if (signal && signal.totalScore >= thresholds.minBuyScore) {
          signals.push(signal);
          console.log(
            `✅ 신호 생성: ${signal.symbol} ${signal.type} (${signal.totalScore.toFixed(1)}점) - 설정: ${userSettings.strategy || "default"}`
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
   * ✅ 설정 기반 개별 코인 분석 (새로 추가)
   */
  async analyzeSymbolWithSettings(marketData, settings) {
    const { symbol, price, volume24h, rsi, macd, bollinger } = marketData;

    // 1. 기술적 분석 점수 계산
    const technicalScores = this.calculateTechnicalScores(marketData);

    // 2. 총점 계산
    const totalScore = this.calculateTotalScore(technicalScores);

    // 3. 설정 기반 신호 유형 결정
    const signalType = this.determineSignalTypeWithSettings(
      marketData,
      totalScore,
      settings
    );

    if (!signalType) return null;

    // 4. 신호 객체 생성
    return {
      symbol,
      type: signalType,
      price,
      totalScore,
      technicalScore: totalScore,
      fundamentalScore: 0,
      marketScore: 0,
      riskScore: this.calculateRiskScore(marketData),
      timestamp: new Date(),
      reason: this.generateReasonWithSettings(
        marketData,
        signalType,
        totalScore,
        settings
      ),
      confidence: this.calculateConfidence(totalScore),
      volume24h,
      indicators: {
        rsi: marketData.rsi,
        macd: marketData.macd,
        bollinger: marketData.bollinger,
      },
      settings: settings, // ✅ 사용된 설정 포함
    };
  }

  /**
   * ✅ 설정 기반 신호 유형 결정 (새로 추가)
   */
  determineSignalTypeWithSettings(marketData, totalScore, settings) {
    const { rsi } = marketData;

    console.log(
      `🔍 ${marketData.symbol} 신호판단: 점수=${totalScore.toFixed(2)}, RSI=${rsi?.toFixed(1)}, 최소점수=${settings.minBuyScore}`
    );

    // 매수 신호 조건 (설정 기반)
    if (totalScore >= settings.minBuyScore) {
      if (rsi && rsi < (settings.rsiOverbought || 75)) {
        console.log(`✅ ${marketData.symbol} 매수신호 발생! (설정 기반)`);
        return "BUY";
      }
    }

    // 매도 신호 조건 (설정 기반)
    if (
      totalScore <= (settings.minSellScore || 3) ||
      (rsi && rsi > (settings.rsiOverbought || 80))
    ) {
      return "SELL";
    }

    return null;
  }

  /**
   * ✅ 설정 기반 사유 생성 (새로 추가)
   */
  generateReasonWithSettings(marketData, signalType, totalScore, settings) {
    const { symbol, rsi, volume24h, avgVolume } = marketData;
    const volumeRatio =
      volume24h && avgVolume ? (volume24h / avgVolume).toFixed(1) : "?";

    if (signalType === "BUY") {
      if (totalScore >= (settings.strongBuyScore || 9.0)) {
        return `${symbol} 강력매수: 종합점수 ${totalScore.toFixed(1)}점, RSI ${rsi?.toFixed(1)}, 거래량 ${volumeRatio}배 (${settings.strategy || "default"} 전략)`;
      } else {
        return `${symbol} 매수: 종합점수 ${totalScore.toFixed(1)}점, RSI ${rsi?.toFixed(1)} (${settings.strategy || "default"} 전략)`;
      }
    } else if (signalType === "SELL") {
      return `${symbol} 매도: 기술적 과열, RSI ${rsi?.toFixed(1)} (${settings.strategy || "default"} 전략)`;
    }

    return `${symbol} 분석완료 (${settings.strategy || "default"})`;
  }

  /**
   * 메인 신호 생성 함수 (기존 호환성 유지)
   */
  async generateSignals(marketDataArray, strategy = "cryptowise") {
    console.log("🎯 신호 생성 시작:", marketDataArray.length, "개 코인");
    const signals = [];

    for (const marketData of marketDataArray) {
      try {
        const signal = await this.analyzeSymbol(marketData, strategy);
        if (signal && signal.totalScore >= this.defaultThresholds.minBuyScore) {
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

    return signals.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * 개별 코인 분석 (기존 코드 유지)
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
      technicalScore: totalScore,
      fundamentalScore: 0,
      marketScore: 0,
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

    const totalScore = this.calculateTotalScore(scores);

    console.log(`🎯 ${symbol} 신호분석:`, {
      price: price,
      rsi: rsi?.toFixed(1),
      totalScore: totalScore.toFixed(2),
      threshold: this.defaultThresholds.minBuyScore,
      willBuy: totalScore >= this.defaultThresholds.minBuyScore,
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

    if (rsi <= rules.rsiOversold) {
      return 10;
    } else if (rsi <= rules.rsiOversold + 10) {
      return 7;
    } else if (rsi >= rules.rsiOverbought) {
      return 0;
    } else if (rsi >= rules.rsiOverbought - 10) {
      return 3;
    } else {
      return 5;
    }
  }

  /**
   * 이동평균 점수 계산
   */
  calculateMovingAverageScore(marketData) {
    const { price, ma20, ma60 } = marketData;
    if (!ma20 || !ma60) return 5;

    if (price > ma20 && ma20 > ma60) {
      return 10;
    } else if (price < ma20 && ma20 < ma60) {
      return 0;
    } else if (price > ma20 && price < ma60) {
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

    if (price <= lower * 1.02) {
      return 10;
    } else if (price <= lower * 1.05) {
      return 8;
    } else if (price >= upper * 0.98) {
      return 0;
    } else {
      return 5;
    }
  }

  /**
   * MACD 점수 계산
   */
  calculateMacdScore(macd) {
    if (!macd) return 5;

    const { line, signal, histogram } = macd;

    if (line > signal && histogram > 0) {
      return 10;
    } else if (line < signal && histogram < 0) {
      return 0;
    } else if (line > signal) {
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

    if (volumeRatio >= 2.0) {
      return 10;
    } else if (volumeRatio >= 1.5) {
      return 8;
    } else if (volumeRatio >= 0.8) {
      return 5;
    } else {
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

    if (supportDistance <= 0.03 && supportDistance >= 0) {
      return 10;
    } else if (resistanceDistance <= 0.03) {
      return 2;
    } else {
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

    return Math.min(Math.max(totalScore, 0), this.defaultThresholds.maxScore);
  }

  /**
   * 신호 유형 결정 (기존 코드)
   */
  determineSignalType(marketData, totalScore) {
    const { rsi } = marketData;

    console.log(
      `🔍 ${marketData.symbol} 신호판단: 점수=${totalScore.toFixed(2)}, RSI=${rsi?.toFixed(1)}`
    );

    if (totalScore >= 5.0) {
      if (rsi && rsi < 80) {
        console.log(`✅ ${marketData.symbol} 매수신호 발생!`);
        return "BUY";
      }
    }

    if (totalScore <= 3 || (rsi && rsi > 85)) {
      return "SELL";
    }

    return null;
  }

  /**
   * 위험 점수 계산
   */
  calculateRiskScore(marketData) {
    const { rsi, volume24h, avgVolume } = marketData;
    let riskScore = 5;

    if (rsi > 80 || rsi < 20) riskScore += 2;
    if (volume24h && avgVolume && volume24h > avgVolume * 3) {
      riskScore += 1;
    }

    return Math.min(Math.max(riskScore, 1), 10);
  }

  /**
   * 신뢰도 계산
   */
  calculateConfidence(totalScore) {
    if (totalScore >= this.defaultThresholds.strongBuyScore) return "HIGH";
    if (totalScore >= this.defaultThresholds.minBuyScore) return "MEDIUM";
    if (totalScore >= this.defaultThresholds.minSellScore) return "LOW";
    return "VERY_LOW";
  }

  /**
   * 신호 사유 생성 (기존 코드)
   */
  generateReason(marketData, signalType, totalScore) {
    const { symbol, rsi, volume24h, avgVolume } = marketData;
    const volumeRatio =
      volume24h && avgVolume ? (volume24h / avgVolume).toFixed(1) : "?";

    if (signalType === "BUY") {
      if (totalScore >= this.defaultThresholds.strongBuyScore) {
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

// ✅ 새로 추가된 설정 기반 함수들
export const generateSignalsWithSettings =
  signalGenerator.generateSignalsWithSettings.bind(signalGenerator);
export const analyzeSymbolWithSettings =
  signalGenerator.analyzeSymbolWithSettings.bind(signalGenerator);
