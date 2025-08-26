// src/services/analysis/signalGenerator.js - 중앙 데이터 매니저 연동 + API 최적화 버전

import { technicalAnalysis } from "./technicalAnalysis.js";

/**
 * CryptoWise 차세대 신호 생성기
 * - 중앙 데이터 매니저 연동으로 API 호출 최소화
 * - 테스트 모드와 실전 모드 완전 지원
 * - 캐시 기반 고성능 신호 생성
 * - 코인별 맞춤형 분석 전략
 */
class SignalGenerator {
  constructor() {
    // ✅ 기술적 분석 가중치 (검증된 비율)
    this.weights = {
      technical: {
        rsi: 0.25, // RSI 25% - 과매수/과매도 핵심 지표
        movingAverage: 0.2, // 이동평균 20% - 추세 확인
        bollinger: 0.15, // 볼링거밴드 15% - 변동성 측정
        macd: 0.15, // MACD 15% - 모멘텀 분석
        volume: 0.1, // 거래량 10% - 강도 측정
        support: 0.15, // 지지저항 15% - 가격 레벨
      },
    };

    // ✅ 실전 모드 기본 임계값 (엄격한 기준)
    this.defaultThresholds = {
      minBuyScore: 7.5, // 매수 최소 점수
      minSellScore: 6.0, // 매도 최소 점수
      strongBuyScore: 9.0, // 강력매수 점수
      maxScore: 10.0, // 최대 점수
      rsiOversold: 30, // RSI 과매도
      rsiOverbought: 70, // RSI 과매수
    };

    // ✅ 테스트 모드 완화된 임계값
    this.testModeThresholds = {
      minBuyScore: 6.0, // 7.5 → 6.0으로 완화
      minSellScore: 4.5, // 6.0 → 4.5로 완화
      strongBuyScore: 8.0, // 9.0 → 8.0으로 완화
      maxScore: 10.0, // 동일 유지
      rsiOversold: 35, // 30 → 35로 완화
      rsiOverbought: 65, // 70 → 65로 완화
    };

    // 코인별 특수 규칙
    this.coinSpecificRules = {
      BTC: {
        rsiOversold: 35,
        rsiOverbought: 75,
        volumeMultiplier: 1.2,
        volatilityThreshold: 0.05,
      },
      ETH: {
        rsiOversold: 30,
        rsiOverbought: 70,
        volumeMultiplier: 1.5,
        volatilityThreshold: 0.06,
      },
      XRP: {
        rsiOversold: 25,
        rsiOverbought: 75,
        volumeMultiplier: 2.0,
        volatilityThreshold: 0.08,
      },
      SOL: {
        rsiOversold: 28,
        rsiOverbought: 72,
        volumeMultiplier: 1.8,
        volatilityThreshold: 0.07,
      },
    };

    // ✅ 현재 모드 설정
    this.isTestMode = false;
    this.currentThresholds = { ...this.defaultThresholds };

    // 🎯 NEW: 중앙 데이터 매니저 연동
    this.cachedMarketData = new Map();
    this.dataSubscription = null;
    this.isDataReady = false;

    // 성능 최적화
    this.scoreCache = new Map();
    this.lastCacheClean = Date.now();
    this.cacheLifetime = 60000; // 1분 캐시 유효시간

    // 디버그 모드
    this.debugMode = process.env.NODE_ENV === "development";

    // 🎯 NEW: 통계 추적
    this.stats = {
      totalAnalyses: 0,
      cacheHits: 0,
      avgAnalysisTime: 0,
      lastAnalysisTime: 0,
    };
  }

  // 🎯 NEW: 중앙 데이터 매니저 초기화 및 구독
  // ✅ initialize 메서드 수정
  async initialize(centralDataManager) {
    if (this.dataSubscription) {
      console.log("🔄 SignalGenerator 이미 초기화됨");
      return;
    }

    try {
      console.log("🚀 SignalGenerator 중앙 데이터 매니저 연동 시작");

      // 중앙 데이터 매니저 구독
      this.dataSubscription = centralDataManager.subscribe(
        "signalGenerator",
        (data) => {
          this.onDataReceived(data);
        },
        ["prices", "markets"]
      );

      this.isDataReady = true;
      this.log("✅ 중앙 데이터 매니저 구독 완료", "success");

      return true;
    } catch (error) {
      this.log(`❌ 중앙 데이터 매니저 연동 실패: ${error.message}`, "error");
      throw error;
    }
  }

  getTradingSettings() {
    // usePaperTrading store 참조 (의존성 주입 방식으로 개선)
    if (typeof window !== "undefined" && window.tradingStore) {
      return window.tradingStore.getState().tradingSettings;
    }
    return null;
  }

  getEffectiveSettings() {
    // usePaperTrading store에서 실제 설정 가져오기
    const tradingSettings = this.getTradingSettings?.() || {};

    // 저장된 설정이 있으면 우선 적용
    const effectiveSettings = {
      minBuyScore: tradingSettings.minBuyScore || (this.isTestMode ? 6.0 : 7.5),
      minSellScore:
        tradingSettings.minSellScore || (this.isTestMode ? 4.5 : 6.0),
      strongBuyScore:
        tradingSettings.strongBuyScore || (this.isTestMode ? 8.0 : 9.0),
      strategy: tradingSettings.strategy || "balanced",
    };

    // aggressive 전략 추가 완화
    if (effectiveSettings.strategy === "aggressive") {
      effectiveSettings.minBuyScore = Math.max(
        effectiveSettings.minBuyScore - 0.5,
        4.0
      );
      effectiveSettings.minSellScore = Math.max(
        effectiveSettings.minSellScore - 0.5,
        3.0
      );
    }

    return effectiveSettings;
  }

  // 🎯 NEW: 데이터 수신 콜백
  onDataReceived(data) {
    try {
      // 가격 데이터 캐시 업데이트
      if (data.prices) {
        const priceEntries = Object.entries(data.prices);
        for (const [symbol, priceEntry] of priceEntries) {
          if (priceEntry && priceEntry.data) {
            this.cachedMarketData.set(symbol, priceEntry.data);
          }
        }

        this.log(
          `📊 캐시 업데이트: ${priceEntries.length}개 코인 데이터`,
          "debug"
        );
      }

      // 실시간 신호 생성 트리거 (필요시)
      if (this.isDataReady) {
        this.triggerRealTimeAnalysis();
      }
    } catch (error) {
      this.log(`❌ 데이터 수신 처리 실패: ${error.message}`, "error");
    }
  }

  // 🎯 NEW: 실시간 분석 트리거 (선택적)
  triggerRealTimeAnalysis() {
    // 실시간 신호 생성이 필요한 경우 여기서 처리
    // 현재는 요청 기반으로만 동작
    this.log("📡 실시간 데이터 수신됨", "debug");
  }

  // ✅ 테스트 모드 설정
  setTestMode(isTestMode = false) {
    this.isTestMode = isTestMode;
    this.currentThresholds = isTestMode
      ? { ...this.testModeThresholds }
      : { ...this.defaultThresholds };

    this.log(`🔄 신호생성기 ${isTestMode ? "테스트" : "실전"} 모드 전환`);
    this.log(
      `📊 임계값: 매수 ${this.currentThresholds.minBuyScore}점, 강매수 ${this.currentThresholds.strongBuyScore}점`
    );

    // 캐시 초기화 (모드 변경시)
    this.scoreCache.clear();
    return this;
  }

  // ✅ 로깅 유틸리티
  log(message, level = "info") {
    if (!this.debugMode && level === "debug") return;

    const timestamp = new Date().toLocaleTimeString();
    const prefix = this.isTestMode ? "[테스트신호]" : "[실전신호]";
    console.log(`${timestamp} ${prefix} ${message}`);
  }

  // 🎯 NEW: 캐시된 데이터 기반 신호 생성 (메인 함수)
  async generateSignalsWithSettings(symbolList, userSettings = {}) {
    const startTime = Date.now();

    try {
      this.log(`🎯 캐시 기반 신호 생성 시작: ${symbolList.length}개 코인`);
      this.cleanCache();

      const signals = [];
      const effectiveSettings = this.mergeSettings(userSettings);

      // 🎯 캐시된 데이터에서 마켓 데이터 구성
      const marketDataArray = [];

      for (const symbol of symbolList) {
        const cachedData = this.cachedMarketData.get(symbol);
        if (cachedData) {
          marketDataArray.push({
            ...cachedData,
            symbol: symbol,
          });
        } else {
          this.log(`⚠️ ${symbol} 캐시된 데이터 없음`, "warning");
        }
      }

      if (marketDataArray.length === 0) {
        this.log("❌ 분석 가능한 캐시된 데이터가 없음", "warning");
        return [];
      }

      // ✅ 병렬 처리로 성능 최적화
      const promises = marketDataArray.map((marketData) =>
        this.analyzeSymbolWithSettings(marketData, effectiveSettings).catch(
          (error) => {
            this.log(
              `❌ ${marketData.symbol} 분석 오류: ${error.message}`,
              "error"
            );
            return null;
          }
        )
      );

      const results = await Promise.all(promises);

      // 유효한 신호만 필터링
      for (const signal of results) {
        if (signal && signal.totalScore >= effectiveSettings.minBuyScore) {
          signals.push(signal);
          this.log(
            `✅ 신호 생성: ${signal.symbol} ${signal.type} (${signal.totalScore.toFixed(1)}점) - ${this.isTestMode ? "테스트" : "실전"}`,
            "info"
          );
        }
      }

      // 점수 높은 순으로 정렬
      const sortedSignals = signals.sort((a, b) => b.totalScore - a.totalScore);

      // 🎯 통계 업데이트
      const analysisTime = Date.now() - startTime;
      this.updateStats(analysisTime, marketDataArray.length);

      this.log(
        `📈 최종 신호: ${sortedSignals.length}개 생성 (${analysisTime}ms, 상위 5개: ${sortedSignals
          .slice(0, 5)
          .map((s) => `${s.symbol}:${s.totalScore.toFixed(1)}`)
          .join(", ")})`
      );

      return sortedSignals;
    } catch (error) {
      this.log(`❌ 신호 생성 전체 오류: ${error.message}`, "error");
      return [];
    }
  }

  // 🎯 NEW: 통계 업데이트
  updateStats(analysisTime, coinsAnalyzed) {
    this.stats.totalAnalyses++;
    this.stats.lastAnalysisTime = analysisTime;
    this.stats.avgAnalysisTime =
      (this.stats.avgAnalysisTime * (this.stats.totalAnalyses - 1) +
        analysisTime) /
      this.stats.totalAnalyses;
  }

  // ✅ 설정 병합 (테스트 모드 고려)
  mergeSettings(userSettings) {
    const baseSettings = { ...this.currentThresholds };
    const mergedSettings = { ...baseSettings, ...userSettings };

    // 테스트 모드에서 추가 완화
    if (this.isTestMode) {
      mergedSettings.confidenceBoost = 0.5; // 신뢰도 보정
      mergedSettings.scoreMultiplier = 1.1; // 점수 보정
      mergedSettings.strategy = `${userSettings.strategy || "default"}_test`;
    }

    return mergedSettings;
  }

  // ✅ 개별 코인 분석 (설정 기반) - 캐시 우선 사용
  async analyzeSymbolWithSettings(marketData, settings) {
    if (!marketData || !marketData.symbol) {
      throw new Error("잘못된 시장 데이터");
    }

    const {
      symbol,
      trade_price: price,
      acc_trade_price_24h: volume24h,
      rsi,
      macd,
      bollinger,
    } = marketData;

    // 캐시 확인
    const cacheKey = `${symbol}_${JSON.stringify(settings)}_${this.isTestMode}`;
    if (this.scoreCache.has(cacheKey)) {
      const cached = this.scoreCache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheLifetime) {
        this.stats.cacheHits++;
        return { ...cached.signal, timestamp: new Date() };
      }
    }

    try {
      // 1. 기술적 분석 점수 계산
      const technicalScores = this.calculateTechnicalScores(marketData);

      // 2. 총점 계산 (테스트 모드 보정 적용)
      let totalScore = this.calculateTotalScore(technicalScores);
      if (this.isTestMode && settings.scoreMultiplier) {
        totalScore *= settings.scoreMultiplier;
        totalScore = Math.min(totalScore, settings.maxScore || 10.0);
      }

      // 3. 신호 유형 결정
      const signalType = this.determineSignalTypeWithSettings(
        marketData,
        totalScore,
        settings
      );

      if (!signalType) return null;

      // 4. 신호 객체 생성
      const signal = {
        id: `${symbol}_${Date.now()}`,
        symbol,
        type: signalType,
        price: price || marketData.trade_price,
        totalScore: Number(totalScore.toFixed(2)),
        technicalScore: Number(totalScore.toFixed(2)),
        fundamentalScore: 0, // 향후 확장용
        marketScore: 0, // 향후 확장용
        riskScore: this.calculateRiskScore(marketData),
        timestamp: new Date(),
        reason: this.generateReasonWithSettings(
          marketData,
          signalType,
          totalScore,
          settings
        ),
        confidence: this.calculateConfidence(totalScore, settings),
        volume24h,
        indicators: {
          rsi: rsi || null,
          macd: macd || null,
          bollinger: bollinger || null,
        },
        coinRules:
          this.coinSpecificRules[symbol] || this.coinSpecificRules["ETH"],
        settings: {
          strategy:
            settings.strategy ||
            (this.isTestMode ? "test_default" : "live_default"),
          mode: this.isTestMode ? "TEST" : "LIVE",
          thresholds: { ...settings },
        },
        metadata: {
          analysisTime: Date.now(),
          version: "3.0.0",
          generator: "CryptoWise_SignalGenerator_Optimized",
          dataSource: "centralCache",
        },
      };

      // 캐시에 저장
      this.scoreCache.set(cacheKey, {
        signal,
        timestamp: Date.now(),
      });

      return signal;
    } catch (error) {
      this.log(`❌ ${symbol} 분석 중 오류: ${error.message}`, "error");
      return null;
    }
  }

  // ✅ 신호 유형 결정 (테스트 모드 고려)
  determineSignalTypeWithSettings(marketData, totalScore, settings) {
    const effectiveSettings = this.getEffectiveSettings();
    const finalSettings = { ...effectiveSettings, ...settings };

    console.log(
      `🎯 [${marketData.symbol}] 최종 설정: minBuyScore=${finalSettings.minBuyScore}, strategy=${finalSettings.strategy}`
    );

    const { symbol, rsi } = marketData;
    const coinRules =
      this.coinSpecificRules[symbol] || this.coinSpecificRules["ETH"];

    this.log(
      `🔍 ${symbol} 신호판단: 점수=${totalScore.toFixed(2)}, RSI=${rsi?.toFixed(1)}, 최소=${settings.minBuyScore}, 모드=${this.isTestMode ? "TEST" : "LIVE"}`,
      "debug"
    );

    // 매수 신호 조건
    if (totalScore >= finalSettings.minBuyScore) {
      const rsiLimit = this.isTestMode
        ? settings.rsiOverbought || coinRules.rsiOverbought || 65
        : settings.rsiOverbought || coinRules.rsiOverbought || 70;

      if (!rsi || rsi < rsiLimit) {
        const signalStrength =
          totalScore >= settings.strongBuyScore ? "STRONG_BUY" : "BUY";

        this.log(
          `✅ ${symbol} ${signalStrength} 신호 발생! (점수: ${totalScore.toFixed(1)}, RSI: ${rsi?.toFixed(1)})`,
          "info"
        );
        return "BUY";
      }
    }

    // 매도 신호 조건
    const sellThreshold = this.isTestMode
      ? settings.minSellScore || 4.5
      : settings.minSellScore || 6.0;
    const rsiSellLimit = this.isTestMode ? 75 : 80;

    if (totalScore <= sellThreshold || (rsi && rsi > rsiSellLimit)) {
      this.log(
        `📉 ${symbol} SELL 신호 (점수: ${totalScore.toFixed(1)}, RSI: ${rsi?.toFixed(1)})`,
        "info"
      );
      return "SELL";
    }

    this.log(`⏸️ ${symbol} 신호 없음 (대기)`, "debug");
    return null;
  }

  // ✅ 사유 생성 (테스트 모드 표시)
  generateReasonWithSettings(marketData, signalType, totalScore, settings) {
    const { symbol, rsi, acc_trade_price_24h: volume24h } = marketData;
    const volumeRatio = "미상"; // 평균 거래량 데이터가 없어서 임시
    const modeLabel = this.isTestMode ? "테스트" : "실전";
    const strategyLabel = settings.strategy || "default";

    if (signalType === "BUY") {
      if (totalScore >= (settings.strongBuyScore || 9.0)) {
        return `${symbol} 강력매수 [${modeLabel}]: 종합점수 ${totalScore.toFixed(1)}점, RSI ${rsi?.toFixed(1)}, 거래량 ${volumeRatio}배 (${strategyLabel} 전략)`;
      } else {
        return `${symbol} 매수 [${modeLabel}]: 종합점수 ${totalScore.toFixed(1)}점, RSI ${rsi?.toFixed(1)} (${strategyLabel} 전략)`;
      }
    } else if (signalType === "SELL") {
      return `${symbol} 매도 [${modeLabel}]: 기술적 과열 감지, RSI ${rsi?.toFixed(1)} (${strategyLabel} 전략)`;
    }

    return `${symbol} 분석완료 [${modeLabel}] (${strategyLabel})`;
  }

  // ✅ 기술적 점수 계산 (최적화된 버전)
  calculateTechnicalScores(marketData) {
    const {
      symbol,
      trade_price: price,
      signed_change_rate: changeRate,
      acc_trade_price_24h: volume24h,
      rsi,
      macd,
      bollinger,
      ma20,
      ma60,
      support,
      resistance,
      avgVolume,
    } = marketData;

    const coinRules =
      this.coinSpecificRules[symbol] || this.coinSpecificRules["ETH"];

    // 🎯 NEW: RSI가 없으면 가격 변동률로 추정
    const effectiveRsi = rsi || this.estimateRSIFromChange(changeRate);

    const scores = {
      rsi: this.calculateRsiScore(effectiveRsi, coinRules),
      movingAverage: this.calculateMovingAverageScore({ price, ma20, ma60 }),
      bollinger: this.calculateBollingerScore(bollinger, price),
      macd: this.calculateMacdScore(macd),
      volume: this.calculateVolumeScore(
        volume24h,
        avgVolume || volume24h * 0.8,
        coinRules.volumeMultiplier
      ),
      support: this.calculateSupportResistanceScore({
        price,
        support: null,
        resistance: null,
      }),
    };

    const totalScore = this.calculateTotalScore(scores);
    this.log(
      `🎯 ${symbol} 분석결과: 변동률=${(changeRate * 100).toFixed(2)}% | RSI=${effectiveRsi?.toFixed(1)} | 총점=${totalScore.toFixed(2)}`,
      "debug"
    );
    this.log(
      `🎯 ${symbol} 기술적분석: RSI=${scores.rsi.toFixed(1)}, MA=${scores.movingAverage.toFixed(1)}, 볼링거=${scores.bollinger.toFixed(1)}, MACD=${scores.macd.toFixed(1)}, 거래량=${scores.volume.toFixed(1)}, 지지저항=${scores.support.toFixed(1)} → 총점=${totalScore.toFixed(2)}`,
      "debug"
    );

    console.log(`📊 [${symbol}] 계산된 점수:`, {
      rsi: scores.rsi.toFixed(1),
      ma: scores.movingAverage.toFixed(1),
      총점: this.calculateTotalScore(scores).toFixed(1),
    });

    return scores;
  }

  // 🎯 NEW: 가격 변동률로 RSI 추정
  estimateRSIFromChange(changeRate) {
    if (!changeRate) return 50; // 중간값

    const changePercent = changeRate * 100;

    // 간단한 RSI 추정 로직
    if (changePercent <= -5)
      return 25; // 강한 하락 → 과매도
    else if (changePercent <= -3) return 35;
    else if (changePercent <= -1) return 45;
    else if (changePercent >= 5)
      return 75; // 강한 상승 → 과매수
    else if (changePercent >= 3) return 65;
    else if (changePercent >= 1) return 55;
    else return 50; // 중립
  }

  // ✅ RSI 점수 계산 (향상된 버전)
  calculateRsiScore(rsi, rules) {
    if (!rsi || isNaN(rsi)) return 5.0; // 중간값

    const { rsiOversold, rsiOverbought } = rules;

    if (rsi <= rsiOversold) {
      return 10.0; // 과매도 - 강력 매수 신호
    } else if (rsi <= rsiOversold + 5) {
      return 8.5; // 과매도 근처
    } else if (rsi <= rsiOversold + 10) {
      return 7.0; // 약간 과매도
    } else if (rsi >= rsiOverbought) {
      return 0.0; // 과매수 - 매도 신호
    } else if (rsi >= rsiOverbought - 5) {
      return 2.0; // 과매수 근처
    } else if (rsi >= rsiOverbought - 10) {
      return 3.5; // 약간 과매수
    } else {
      return 5.0; // 중간 영역
    }
  }

  // ✅ 이동평균 점수 계산
  calculateMovingAverageScore(data) {
    const { price, ma20, ma60 } = data;
    if (!price || !ma20 || !ma60) return 5.0;

    if (price > ma20 && ma20 > ma60) {
      return 10.0; // 골든 크로스 상태
    } else if (price < ma20 && ma20 < ma60) {
      return 0.0; // 데드 크로스 상태
    } else if (price > ma20 && price < ma60) {
      return 6.5; // 혼재 상태 - 약간 긍정적
    } else if (price < ma20 && price > ma60) {
      return 4.0; // 혼재 상태 - 약간 부정적
    } else {
      return 5.0; // 중간
    }
  }

  // ✅ 볼링거밴드 점수 계산
  calculateBollingerScore(bollinger, price) {
    if (!bollinger || !price) return 5.0;

    const { upper, middle, lower } = bollinger;
    if (!upper || !middle || !lower) return 5.0;

    if (price <= lower * 1.01) {
      return 10.0; // 하단 밴드 터치 - 강력 매수
    } else if (price <= lower * 1.03) {
      return 8.5; // 하단 밴드 근처
    } else if (price <= lower * 1.05) {
      return 7.0; // 하단 근처
    } else if (price >= upper * 0.99) {
      return 0.0; // 상단 밴드 터치 - 매도 신호
    } else if (price >= upper * 0.97) {
      return 2.0; // 상단 밴드 근처
    } else if (price >= middle) {
      return 6.0; // 중간선 위
    } else {
      return 4.0; // 중간선 아래
    }
  }

  // ✅ MACD 점수 계산
  calculateMacdScore(macd) {
    if (!macd) return 5.0;

    const { line, signal, histogram } = macd;
    if (line === undefined || signal === undefined) return 5.0;

    if (line > signal && histogram > 0) {
      return 10.0; // 강력한 상승 신호
    } else if (line > signal && histogram <= 0) {
      return 7.5; // 상승 신호이지만 히스토그램 약화
    } else if (line < signal && histogram < 0) {
      return 0.0; // 강력한 하락 신호
    } else if (line < signal && histogram >= 0) {
      return 2.5; // 하락 신호이지만 히스토그램 개선
    } else if (line > signal) {
      return 6.5; // 약간 긍정적
    } else {
      return 3.5; // 약간 부정적
    }
  }

  // ✅ 거래량 점수 계산
  calculateVolumeScore(volume24h, avgVolume, multiplier = 1.0) {
    if (!volume24h || !avgVolume) return 5.0;

    const volumeRatio = (volume24h / avgVolume) * multiplier;

    if (volumeRatio >= 2.5) {
      return 10.0; // 폭증 거래량
    } else if (volumeRatio >= 2.0) {
      return 9.0; // 매우 높은 거래량
    } else if (volumeRatio >= 1.5) {
      return 8.0; // 높은 거래량
    } else if (volumeRatio >= 1.2) {
      return 6.5; // 평균 이상
    } else if (volumeRatio >= 0.8) {
      return 5.0; // 평균 수준
    } else if (volumeRatio >= 0.5) {
      return 3.0; // 낮은 거래량
    } else {
      return 1.0; // 매우 낮은 거래량
    }
  }

  // ✅ 지지저항 점수 계산
  calculateSupportResistanceScore(data) {
    const { price, support, resistance } = data;
    if (!price || !support || !resistance) return 5.0;

    const supportDistance = ((price - support) / support) * 100;
    const resistanceDistance = ((resistance - price) / price) * 100;

    if (supportDistance <= 2.0 && supportDistance >= 0) {
      return 10.0; // 지지선 근처에서 반등
    } else if (supportDistance <= 5.0 && supportDistance >= 0) {
      return 8.0; // 지지선 근처
    } else if (resistanceDistance <= 2.0) {
      return 2.0; // 저항선 근처
    } else if (resistanceDistance <= 5.0) {
      return 4.0; // 저항선 접근
    } else {
      return 5.0; // 중간 영역
    }
  }

  // ✅ 총점 계산
  calculateTotalScore(technicalScores) {
    let totalScore = 0;

    for (const [indicator, score] of Object.entries(technicalScores)) {
      const weight = this.weights.technical[indicator] || 0;
      const adjustedScore = Math.max(0, Math.min(10, score || 0)); // 0-10 범위 보장
      totalScore += adjustedScore * weight;
    }

    return Math.min(Math.max(totalScore, 0), this.currentThresholds.maxScore);
  }

  // ✅ 위험 점수 계산
  calculateRiskScore(marketData) {
    const {
      rsi,
      acc_trade_price_24h: volume24h,
      avgVolume,
      trade_price: price,
    } = marketData;
    let riskScore = 5.0; // 기본 위험도

    // RSI 극값 시 위험도 증가
    if (rsi) {
      if (rsi > 80 || rsi < 20) {
        riskScore += 2.0;
      } else if (rsi > 75 || rsi < 25) {
        riskScore += 1.0;
      }
    }

    // 거래량 급증 시 위험도 증가
    if (volume24h && avgVolume) {
      const volumeRatio = volume24h / avgVolume;
      if (volumeRatio > 5.0) {
        riskScore += 2.0;
      } else if (volumeRatio > 3.0) {
        riskScore += 1.0;
      }
    }

    // 테스트 모드에서 위험도 완화
    if (this.isTestMode) {
      riskScore *= 0.8; // 20% 완화
    }

    return Math.min(Math.max(riskScore, 1.0), 10.0);
  }

  // ✅ 신뢰도 계산 (테스트 모드 고려)
  calculateConfidence(totalScore, settings) {
    // 테스트 모드에서 신뢰도 보정
    let effectiveScore = totalScore;
    if (this.isTestMode && settings.confidenceBoost) {
      effectiveScore += settings.confidenceBoost;
    }

    if (
      effectiveScore >=
      (settings.strongBuyScore || this.currentThresholds.strongBuyScore)
    ) {
      return "HIGH";
    } else if (
      effectiveScore >=
      (settings.minBuyScore || this.currentThresholds.minBuyScore)
    ) {
      return "MEDIUM";
    } else if (
      effectiveScore >=
      (settings.minSellScore || this.currentThresholds.minSellScore)
    ) {
      return "LOW";
    } else {
      return "VERY_LOW";
    }
  }

  // ✅ 캐시 정리
  cleanCache() {
    const now = Date.now();
    if (now - this.lastCacheClean < 300000) return; // 5분마다만 정리

    let cleanedCount = 0;
    for (const [key, value] of this.scoreCache.entries()) {
      if (now - value.timestamp > this.cacheLifetime) {
        this.scoreCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.log(
        `🧹 캐시 정리: ${cleanedCount}개 항목 제거, 현재 ${this.scoreCache.size}개 유지`,
        "debug"
      );
    }

    this.lastCacheClean = now;
  }

  // ✅ 기존 호환성 유지 함수들
  async generateSignals(symbolList, strategy = "cryptowise") {
    return this.generateSignalsWithSettings(symbolList, { strategy });
  }

  async analyzeSymbol(marketData, strategy) {
    return this.analyzeSymbolWithSettings(marketData, { strategy });
  }

  // ✅ 설정 조회
  getCurrentSettings() {
    return {
      mode: this.isTestMode ? "TEST" : "LIVE",
      thresholds: { ...this.currentThresholds },
      weights: { ...this.weights },
      coinRules: { ...this.coinSpecificRules },
      cacheSize: this.scoreCache.size,
      dataReady: this.isDataReady,
      stats: { ...this.stats },
    };
  }

  // ✅ 성능 통계
  getPerformanceStats() {
    const cacheHitRate =
      this.stats.totalAnalyses > 0
        ? ((this.stats.cacheHits / this.stats.totalAnalyses) * 100).toFixed(1)
        : 0;

    return {
      cacheSize: this.scoreCache.size,
      marketDataCacheSize: this.cachedMarketData.size,
      cacheHitRate: `${cacheHitRate}%`,
      avgAnalysisTime: `${this.stats.avgAnalysisTime.toFixed(1)}ms`,
      totalAnalyses: this.stats.totalAnalyses,
      isDataReady: this.isDataReady,
      lastAnalysisTime: this.stats.lastAnalysisTime,
    };
  }

  // 🎯 NEW: 리소스 정리
  cleanup() {
    if (this.dataSubscription) {
      this.dataSubscription(); // 구독 해제
      this.dataSubscription = null;
    }

    this.cachedMarketData.clear();
    this.scoreCache.clear();
    this.isDataReady = false;

    this.log("🧹 SignalGenerator 리소스 정리 완료");
  }
}

// ✅ 싱글톤 인스턴스 생성 및 익스포트
export const signalGenerator = new SignalGenerator();
export default signalGenerator;

// 편의 함수들
export const generateSignals =
  signalGenerator.generateSignals.bind(signalGenerator);
export const analyzeSymbol =
  signalGenerator.analyzeSymbol.bind(signalGenerator);

// ✅ 새로운 설정 기반 함수들
export const generateSignalsWithSettings =
  signalGenerator.generateSignalsWithSettings.bind(signalGenerator);
export const analyzeSymbolWithSettings =
  signalGenerator.analyzeSymbolWithSettings.bind(signalGenerator);
export const setTestMode = signalGenerator.setTestMode.bind(signalGenerator);
export const getCurrentSettings =
  signalGenerator.getCurrentSettings.bind(signalGenerator);

// 🎯 NEW: 초기화 및 정리 함수
export const initializeSignalGenerator =
  signalGenerator.initialize.bind(signalGenerator);
export const cleanupSignalGenerator =
  signalGenerator.cleanup.bind(signalGenerator);
