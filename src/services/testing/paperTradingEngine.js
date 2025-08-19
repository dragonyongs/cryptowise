// src/services/testing/paperTradingEngine.js - 완전 안정화 버전

class PaperTradingEngine {
  constructor(initialBalance = 1840000) {
    this.initialBalance = initialBalance;
    this.isActive = true; // ✅ 활성 상태 추가

    this.portfolio = {
      krw: initialBalance,
      coins: new Map(),
      trades: [],
      performance: { totalReturn: 0, winRate: 0, maxDrawdown: 0 },
    };

    // ✅ 실전 모드 기본 설정 (엄격한 조건)
    this.defaultLimits = {
      maxDailyTrades: 6,
      maxPositionSize: 0.25,
      minTradingAmount: 50000,
      maxTradingAmount: 400000,
      maxPositions: 4,
      cooldownPeriod: 600000, // 10분
      reserveCashRatio: 0.4,
      minSignalScore: 8.0,
    };

    // ✅ 테스트 모드 설정 (완화된 조건)
    this.testModeLimits = {
      maxDailyTrades: 12,
      maxPositionSize: 0.35,
      minTradingAmount: 30000,
      maxTradingAmount: 600000,
      maxPositions: 6,
      cooldownPeriod: 120000, // 2분
      reserveCashRatio: 0.3,
      minSignalScore: 6.0,
    };

    this.isTestMode = false;
    this.tradingLimits = { ...this.defaultLimits };

    this.tierAllocation = {
      TIER1: 0.55, // BTC, ETH - 55%
      TIER2: 0.3, // 상위 알트코인 - 30%
      TIER3: 0.15, // 나머지 - 15%
    };

    this.todayTrades = 0;
    this.lastResetDate = new Date().toDateString();
    this.debugMode = process.env.NODE_ENV === "development";
  }

  // ✅ 활성 상태 설정
  setActive(isActive = true) {
    this.isActive = isActive;
    this.log(`🔄 페이퍼 트레이딩 엔진 ${isActive ? "활성화" : "비활성화"}`);
    return this;
  }

  setTestMode(isTestMode = false) {
    this.isTestMode = isTestMode;
    this.tradingLimits = isTestMode
      ? { ...this.testModeLimits }
      : { ...this.defaultLimits };

    this.log(`🔄 ${isTestMode ? "테스트" : "실전"} 모드로 전환`);
    this.log(
      `📊 설정: 일일거래 ${this.tradingLimits.maxDailyTrades}회, 최소점수 ${this.tradingLimits.minSignalScore}점`
    );

    return this;
  }

  log(message, level = "info") {
    if (!this.debugMode && level === "debug") return;

    const timestamp = new Date().toLocaleTimeString();
    const prefix = this.isTestMode ? "[테스트엔진]" : "[실전엔진]";
    console.log(`${timestamp} ${prefix} ${message}`);
  }

  checkAndResetDailyLimits() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.todayTrades = 0;
      this.lastResetDate = today;
      this.log(`🌅 새로운 날 시작 - 거래 카운트 리셋`);
    }
  }

  // ✅ 메인 신호 실행 함수 (활성 상태 체크 강화)
  async executeSignal(signal) {
    // ✅ 활성 상태 체크 (가장 먼저)
    if (!this.isActive) {
      return { executed: false, reason: "페이퍼 트레이딩 엔진이 비활성화됨" };
    }

    try {
      this.log(`🔄 신호 처리 시작: ${signal.symbol} ${signal.type}`, "debug");
      this.checkAndResetDailyLimits();

      // 1단계: 기본 신호 검증
      const basicValidation = this.validateBasicSignal(signal);
      if (!basicValidation.isValid) {
        this.log(`❌ 기본 검증 실패: ${basicValidation.reason}`);
        return { executed: false, reason: basicValidation.reason };
      }

      // 2단계: 거래 제한 검증
      const limitValidation = this.validateTradingLimits(signal);
      if (!limitValidation.isValid) {
        this.log(`❌ 거래 제한 검증 실패: ${limitValidation.reason}`);
        return { executed: false, reason: limitValidation.reason };
      }

      // 3단계: 포트폴리오 상태 검증
      const portfolioValidation = this.validatePortfolioState(signal);
      if (!portfolioValidation.isValid) {
        this.log(`❌ 포트폴리오 검증 실패: ${portfolioValidation.reason}`);
        return { executed: false, reason: portfolioValidation.reason };
      }

      // ✅ 활성 상태 재확인 (거래 실행 직전)
      if (!this.isActive) {
        return { executed: false, reason: "거래 실행 직전 엔진 비활성화됨" };
      }

      // 4단계: 거래 실행
      const { symbol, type, price, totalScore } = signal;
      let result;

      if (type === "BUY") {
        result = await this.executeBuy(symbol, price, totalScore, signal);
      } else if (type === "SELL") {
        result = await this.executeSell(symbol, price, totalScore, signal);
      } else {
        return { executed: false, reason: "잘못된 신호 타입" };
      }

      if (result.executed) {
        this.log(`✅ 거래 성공: ${symbol} ${type}`, "info");
        this.logPortfolioState();
      }

      return result;
    } catch (error) {
      this.log(`❌ executeSignal 오류: ${error.message}`, "error");
      return { executed: false, reason: `시스템 오류: ${error.message}` };
    }
  }

  validateBasicSignal(signal) {
    if (!signal) {
      return { isValid: false, reason: "신호가 없습니다" };
    }

    if (!signal.symbol || !signal.type || typeof signal.price !== "number") {
      return { isValid: false, reason: "필수 신호 정보 누락" };
    }

    if (signal.price <= 0) {
      return { isValid: false, reason: "유효하지 않은 가격" };
    }

    if (!["BUY", "SELL"].includes(signal.type)) {
      return { isValid: false, reason: "유효하지 않은 신호 타입" };
    }

    const requiredScore = this.tradingLimits.minSignalScore;
    const currentScore = signal.totalScore || 0;

    if (currentScore < requiredScore) {
      return {
        isValid: false,
        reason: `신호 점수 부족: ${currentScore.toFixed(1)} < ${requiredScore} ${this.isTestMode ? "(테스트 모드 완화)" : "(실전 모드 엄격)"}`,
      };
    }

    return { isValid: true };
  }

  validateTradingLimits(signal) {
    // 일일 거래 한도 검증
    if (this.todayTrades >= this.tradingLimits.maxDailyTrades) {
      return {
        isValid: false,
        reason: `일일 거래 한도 초과 (${this.todayTrades}/${this.tradingLimits.maxDailyTrades}) ${this.isTestMode ? "- 테스트 모드" : "- 실전 모드"}`,
      };
    }

    // 쿨다운 기간 확인
    const lastTrade = this.portfolio.trades
      .filter((t) => t.symbol === signal.symbol)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (lastTrade) {
      const timeDiff = Date.now() - new Date(lastTrade.timestamp).getTime();
      if (timeDiff < this.tradingLimits.cooldownPeriod) {
        const remainingTime = Math.ceil(
          (this.tradingLimits.cooldownPeriod - timeDiff) / 60000
        );
        return {
          isValid: false,
          reason: `쿨다운 중 (${remainingTime}분 남음) ${this.isTestMode ? "- 테스트 5분" : "- 실전 10분"}`,
        };
      }
    }

    return { isValid: true };
  }

  validatePortfolioState(signal) {
    if (signal.type === "BUY") {
      const totalValue = this.portfolio.krw + this.getTotalCoinValue();
      const requiredCash = totalValue * this.tradingLimits.reserveCashRatio;
      const minTradingAmount = this.tradingLimits.minTradingAmount;

      if (this.portfolio.krw < requiredCash + minTradingAmount) {
        return {
          isValid: false,
          reason: `현금 비중 부족 (${this.tradingLimits.reserveCashRatio * 100}% 이상 유지 필요) ${this.isTestMode ? "- 테스트 30%" : "- 실전 40%"}`,
        };
      }

      if (this.portfolio.coins.size >= this.tradingLimits.maxPositions) {
        return {
          isValid: false,
          reason: `최대 포지션 수 초과 (${this.tradingLimits.maxPositions}개) ${this.isTestMode ? "- 테스트 6개" : "- 실전 4개"}`,
        };
      }
    } else if (signal.type === "SELL") {
      const coin = this.portfolio.coins.get(signal.symbol);
      if (!coin || coin.quantity <= 0) {
        return { isValid: false, reason: "보유하지 않은 코인" };
      }
    }

    return { isValid: true };
  }

  calculatePositionSize(signal) {
    const tier = this.getCoinTier(signal.symbol);
    const totalValue = this.portfolio.krw + this.getTotalCoinValue();
    const investableAmount =
      totalValue * (1 - this.tradingLimits.reserveCashRatio);

    const tierRatio = this.tierAllocation[tier];
    let basePositionSize =
      (investableAmount * tierRatio) / this.tradingLimits.maxPositions;

    // 신호 점수에 따른 조정
    const scoreRange = this.isTestMode ? 4.0 : 2.0;
    const minScore = this.tradingLimits.minSignalScore;
    const scoreMultiplier = Math.min(
      (signal.totalScore - minScore) / scoreRange + 1.0,
      this.isTestMode ? 1.5 : 1.3
    );

    basePositionSize *= scoreMultiplier;

    // 신뢰도 조정
    const confidenceMultipliers = {
      high: this.isTestMode ? 1.3 : 1.2,
      medium: 1.0,
      low: this.isTestMode ? 0.9 : 0.8,
    };

    basePositionSize *= confidenceMultipliers[signal.confidence] || 1.0;

    if (this.isTestMode) {
      basePositionSize *= 1.2; // 테스트 모드에서 20% 더 적극적
    }

    // 최종 제한 적용
    const minAmount = this.tradingLimits.minTradingAmount;
    const maxAmount = Math.min(
      this.tradingLimits.maxTradingAmount,
      this.portfolio.krw * (this.isTestMode ? 0.7 : 0.6)
    );

    const finalSize = Math.max(
      minAmount,
      Math.min(maxAmount, basePositionSize)
    );

    this.log(
      `💰 포지션 크기: ${finalSize.toLocaleString()}원 (${tier}, 점수: ${signal.totalScore?.toFixed(1)})`,
      "debug"
    );

    return finalSize;
  }

  async executeBuy(symbol, price, score, signal) {
    const positionSize = this.calculatePositionSize(signal);

    if (this.portfolio.krw < positionSize) {
      return { executed: false, reason: "계산된 포지션 크기만큼 현금 부족" };
    }

    const quantity = positionSize / price;
    const tier = this.getCoinTier(symbol);
    const fee = positionSize * 0.0005; // 0.05% 수수료

    const existingCoin = this.portfolio.coins.get(symbol);

    if (existingCoin) {
      const totalQuantity = existingCoin.quantity + quantity;
      const totalCost =
        existingCoin.avgPrice * existingCoin.quantity + positionSize;

      existingCoin.quantity = totalQuantity;
      existingCoin.avgPrice = totalCost / totalQuantity;
      existingCoin.currentPrice = price;
      existingCoin.tier = tier;

      this.log(
        `🔄 포지션 추가: ${symbol} 기존 ${existingCoin.quantity.toFixed(8)} → ${totalQuantity.toFixed(8)}`
      );
    } else {
      this.portfolio.coins.set(symbol, {
        symbol,
        quantity,
        avgPrice: price,
        currentPrice: price,
        firstBought: new Date(),
        tier,
        profitTargets: this.isTestMode
          ? {
              target1: price * 1.025, // 2.5%
              target2: price * 1.04, // 4%
              target3: price * 1.06, // 6%
              target4: price * 1.1, // 10%
            }
          : {
              target1: price * 1.03, // 3%
              target2: price * 1.05, // 5%
              target3: price * 1.08, // 8%
              target4: price * 1.12, // 12%
            },
        stopLoss: price * (this.isTestMode ? 0.96 : 0.94),
      });

      this.log(`🆕 신규 포지션: ${symbol} ${quantity.toFixed(8)}개 생성`);
    }

    this.portfolio.krw -= positionSize + fee;

    const trade = {
      id: `${Date.now()}_${symbol}`,
      symbol,
      action: "BUY",
      quantity,
      price,
      amount: positionSize,
      fee,
      timestamp: new Date(),
      score: Number(score?.toFixed(1)) || 0,
      confidence: signal.confidence,
      reason: signal.reason,
      tier,
      allocation: ((positionSize / this.initialBalance) * 100).toFixed(1) + "%",
      mode: this.isTestMode ? "TEST" : "LIVE",
    };

    this.portfolio.trades.push(trade);
    this.todayTrades++;

    this.log(
      `✅ ${this.isTestMode ? "테스트" : "실전"} 매수 완료: ${symbol} (${tier}) ${quantity.toFixed(8)}개 @ ₩${price.toLocaleString()} (배분: ${trade.allocation})`
    );

    return { executed: true, trade };
  }

  async executeSell(symbol, price, score, signal) {
    const coin = this.portfolio.coins.get(symbol);

    if (!coin || coin.quantity <= 0) {
      return { executed: false, reason: "매도할 포지션 없음" };
    }

    const profitRate = ((price - coin.avgPrice) / coin.avgPrice) * 100;
    let sellRatio = 0;
    let sellReason = "";

    if (this.isTestMode) {
      // 테스트 모드: 더 낮은 기준으로 매도
      if (profitRate >= 10) {
        sellRatio = 1.0;
        sellReason = "10% 목표 달성 (테스트)";
      } else if (profitRate >= 6) {
        sellRatio = 0.5;
        sellReason = "6% 부분 수익실현 (테스트)";
      } else if (profitRate >= 4) {
        sellRatio = 0.3;
        sellReason = "4% 1차 수익실현 (테스트)";
      } else if (profitRate >= 2.5) {
        sellRatio = 0.2;
        sellReason = "2.5% 초기 수익실현 (테스트)";
      } else if (profitRate <= -4) {
        sellRatio = 1.0;
        sellReason = "테스트 손절매 (-4%)";
      } else if (profitRate <= -2) {
        sellRatio = 0.5;
        sellReason = "테스트 부분 손절 (-2%)";
      } else {
        return { executed: false, reason: "테스트 모드 매도 조건 불만족" };
      }
    } else {
      // 실전 모드: 엄격한 기준
      if (profitRate >= 12) {
        sellRatio = 1.0;
        sellReason = "12% 목표 달성";
      } else if (profitRate >= 8) {
        sellRatio = 0.5;
        sellReason = "8% 1차 수익실현";
      } else if (profitRate >= 5) {
        sellRatio = 0.3;
        sellReason = "5% 부분 수익실현";
      } else if (profitRate >= 3) {
        sellRatio = 0.2;
        sellReason = "3% 초기 수익실현";
      } else if (profitRate <= -6) {
        sellRatio = 1.0;
        sellReason = "실전 손절매 (-6%)";
      } else if (profitRate <= -3) {
        sellRatio = 0.5;
        sellReason = "실전 부분 손절 (-3%)";
      } else {
        return { executed: false, reason: "실전 모드 매도 조건 불만족" };
      }
    }

    const sellQuantity = coin.quantity * sellRatio;
    const sellAmount = sellQuantity * price;
    const fee = sellAmount * 0.0005;

    coin.quantity -= sellQuantity;
    coin.currentPrice = price;

    if (coin.quantity < 0.00000001) {
      this.portfolio.coins.delete(symbol);
      this.log(`🗑️ ${symbol} 포지션 완전 청산`);
    }

    this.portfolio.krw += sellAmount - fee;

    const trade = {
      id: `${Date.now()}_${symbol}`,
      symbol,
      action: "SELL",
      quantity: sellQuantity,
      price,
      amount: sellAmount,
      fee,
      timestamp: new Date(),
      profitRate: Number(profitRate.toFixed(2)),
      sellRatio: Number((sellRatio * 100).toFixed(1)),
      sellReason,
      score: Number(score?.toFixed(1)) || 0,
      confidence: signal.confidence,
      reason: signal.reason,
      mode: this.isTestMode ? "TEST" : "LIVE",
    };

    this.portfolio.trades.push(trade);
    this.todayTrades++;

    this.log(
      `✅ ${this.isTestMode ? "테스트" : "실전"} 매도: ${sellReason} - ${symbol} ${sellQuantity.toFixed(8)}개 @ ₩${price.toLocaleString()} (수익률: ${profitRate.toFixed(2)}%)`
    );

    return { executed: true, trade };
  }

  getTotalCoinValue() {
    let totalValue = 0;
    for (const [symbol, coin] of this.portfolio.coins) {
      totalValue += coin.quantity * coin.currentPrice;
    }
    return totalValue;
  }

  updateCoinPrice(symbol, price) {
    const coin = this.portfolio.coins.get(symbol);
    if (coin && typeof price === "number" && price > 0) {
      coin.currentPrice = price;
      coin.profitRate = ((price - coin.avgPrice) / coin.avgPrice) * 100;
    }
  }

  getCoinTier(symbol) {
    const tier1 = ["BTC", "ETH"];
    const tier2 = [
      "SOL",
      "ADA",
      "XRP",
      "DOT",
      "LINK",
      "AVAX",
      "MATIC",
      "ATOM",
      "NEAR",
      "ALGO",
      "VET",
    ];

    if (tier1.includes(symbol)) return "TIER1";
    if (tier2.includes(symbol)) return "TIER2";
    return "TIER3";
  }

  // ✅ 포트폴리오 요약 (활성 상태에서만 생성)
  getPortfolioSummary() {
    if (!this.isActive) {
      this.log("⚠️ 엔진이 비활성화되어 포트폴리오 요약 생성 중단", "warning");
      return null;
    }

    this.log("🔍 포트폴리오 요약 생성 중...", "debug");

    let totalCryptoValue = 0;
    const positions = [];

    for (const [symbol, coin] of this.portfolio.coins) {
      const currentValue = coin.quantity * coin.currentPrice;
      const profitRate =
        ((coin.currentPrice - coin.avgPrice) / coin.avgPrice) * 100;
      const totalProfit = currentValue - coin.quantity * coin.avgPrice;

      totalCryptoValue += currentValue;

      positions.push({
        symbol,
        quantity: coin.quantity,
        avgPrice: coin.avgPrice,
        currentPrice: coin.currentPrice,
        currentValue,
        profitRate: Number(profitRate.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(0)),
        tier: coin.tier,
        firstBought: coin.firstBought,
        profitTargets: coin.profitTargets,
        stopLoss: coin.stopLoss,
      });
    }

    const totalPortfolioValue = this.portfolio.krw + totalCryptoValue;
    const totalReturn =
      ((totalPortfolioValue - this.initialBalance) / this.initialBalance) * 100;
    const cashRatio = (this.portfolio.krw / totalPortfolioValue) * 100;

    const sellTrades = this.portfolio.trades.filter((t) => t.action === "SELL");
    const profitTrades = sellTrades.filter(
      (t) => t.profitRate && t.profitRate > 0
    );
    const winRate =
      sellTrades.length > 0
        ? (profitTrades.length / sellTrades.length) * 100
        : 0;

    const testTrades = this.portfolio.trades.filter((t) => t.mode === "TEST");
    const liveTrades = this.portfolio.trades.filter((t) => t.mode === "LIVE");

    const summary = {
      positions,
      tradeHistory: [...this.portfolio.trades].reverse(),
      totalValue: Math.floor(totalPortfolioValue),
      investedValue: Math.floor(totalCryptoValue),
      cashValue: Math.floor(this.portfolio.krw),
      totalProfitRate: Number(totalReturn.toFixed(2)),
      totalProfit: Math.floor(totalPortfolioValue - this.initialBalance),
      cashRatio: Number(cashRatio.toFixed(1)),
      investedRatio: Number(
        ((totalCryptoValue / totalPortfolioValue) * 100).toFixed(1)
      ),
      performance: {
        totalReturn: Number(totalReturn.toFixed(2)),
        winRate: Number(winRate.toFixed(1)),
        maxDrawdown: this.calculateMaxDrawdown(),
      },
      tradingStats: {
        totalTrades: this.portfolio.trades.length,
        buyTrades: this.portfolio.trades.filter((t) => t.action === "BUY")
          .length,
        sellTrades: sellTrades.length,
        profitTrades: profitTrades.length,
        todayTrades: this.todayTrades,
        dailyLimit: this.tradingLimits.maxDailyTrades,
      },
      mode: {
        isTestMode: this.isTestMode,
        testTrades: testTrades.length,
        liveTrades: liveTrades.length,
        currentLimits: { ...this.tradingLimits },
        isActive: this.isActive, // ✅ 활성 상태 추가
      },
      activePositions: this.portfolio.coins.size,
      maxPositions: this.tradingLimits.maxPositions,
      lastUpdated: new Date(),
      tierAllocation: this.tierAllocation,
    };

    this.log(
      `📊 요약 완료: 총자산 ₩${summary.totalValue.toLocaleString()}, 수익률 ${summary.totalProfitRate}%, 승률 ${summary.performance.winRate}%`
    );

    return summary;
  }

  calculateMaxDrawdown() {
    if (this.portfolio.trades.length === 0) return 0;

    let maxValue = this.initialBalance;
    let maxDrawdown = 0;
    let currentValue = this.initialBalance;

    for (const trade of this.portfolio.trades) {
      if (trade.action === "BUY") {
        currentValue -= trade.amount + trade.fee;
      } else {
        currentValue += trade.amount - trade.fee;
      }

      maxValue = Math.max(maxValue, currentValue);
      const drawdown = ((maxValue - currentValue) / maxValue) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return Number(maxDrawdown.toFixed(2));
  }

  logPortfolioState() {
    if (!this.isActive) return; // ✅ 비활성화 시 로그 중단

    const totalValue = this.portfolio.krw + this.getTotalCoinValue();
    const cashRatio = (this.portfolio.krw / totalValue) * 100;

    this.log(
      `📊 현재 포트폴리오: 총자산 ₩${totalValue.toLocaleString()}, 현금 ${cashRatio.toFixed(1)}%, 코인 ${this.portfolio.coins.size}개, 오늘 거래 ${this.todayTrades}/${this.tradingLimits.maxDailyTrades}회`,
      "debug"
    );
  }

  getCurrentSettings() {
    return {
      mode: this.isTestMode ? "TEST" : "LIVE",
      limits: { ...this.tradingLimits },
      tierAllocation: { ...this.tierAllocation },
      debugMode: this.debugMode,
      isActive: this.isActive, // ✅ 활성 상태 추가
    };
  }

  resetPortfolio() {
    const currentMode = this.isTestMode;
    const currentActiveState = this.isActive;

    this.portfolio = {
      krw: this.initialBalance,
      coins: new Map(),
      trades: [],
      performance: { totalReturn: 0, winRate: 0, maxDrawdown: 0 },
    };

    this.todayTrades = 0;
    this.lastResetDate = new Date().toDateString();

    this.setTestMode(currentMode);
    this.setActive(currentActiveState);

    this.log(
      `✅ 포트폴리오가 초기화되었습니다 (${currentMode ? "테스트" : "실전"} 모드, ${currentActiveState ? "활성" : "비활성"} 상태 유지)`
    );
  }
}

export const paperTradingEngine = new PaperTradingEngine();
export default PaperTradingEngine;
