// src/services/testing/paperTradingEngine.js - 완전 수정 버전

import { marketAnalysisService } from "../analysis/marketAnalysis.js";
import { portfolioAllocationService } from "../portfolio/portfolioAllocation.js";

class PaperTradingEngine {
  constructor(initialBalance = 1840000) {
    this.initialBalance = initialBalance;
    this.portfolio = {
      krw: initialBalance,
      coins: new Map(),
      trades: [],
      performance: {
        totalReturn: 0,
        winRate: 0,
        maxDrawdown: 0,
      },
    };

    // 실전적 거래 제한 설정
    this.tradingLimits = {
      maxDailyTrades: 15,
      maxPositionSize: 0.3,
      minTradingAmount: 30000,
      maxTradingAmount: 500000,
      cooldownPeriod: 300000,
      flexibleWaitTime: true,
    };

    this.todayTrades = 0;
    this.lastResetDate = new Date().toDateString();
  }

  // 일일 거래 수 리셋
  checkAndResetDailyLimits() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.todayTrades = 0;
      this.lastResetDate = today;
    }
  }

  // 시장 상황별 유연한 대기시간 계산
  calculateWaitTime(symbol, signal, marketCondition = null) {
    const baseWaitTime = 120 * 60 * 1000; // 기본 2시간

    // 급락 시 즉시 매수 허용
    if (signal.changePercent < -15) {
      return 10 * 60 * 1000; // 10분만 대기
    }
    if (signal.changePercent < -10) {
      return 30 * 60 * 1000; // 30분 대기
    }
    if (signal.changePercent < -5) {
      return 60 * 60 * 1000; // 1시간 대기
    }

    // 시장 상황별 조정
    if (marketCondition) {
      if (marketCondition.riskLevel >= 4) {
        return baseWaitTime * 1.5;
      }
      if (marketCondition.volatility === "extreme") {
        return baseWaitTime * 2;
      }
      if (marketCondition.overallBuyScore >= 75) {
        return baseWaitTime * 0.5;
      }
    }

    return baseWaitTime;
  }

  // ✅ 엄격한 신호 검증
  async executeSignal(signal) {
    try {
      console.log("🔄 executeSignal 시작:", signal.symbol, signal.type);

      this.checkAndResetDailyLimits();

      // 1단계: 기본 검증
      const basicValidation = this.validateBasicSignal(signal);
      if (!basicValidation.isValid) {
        console.log("❌ 기본 검증 실패:", basicValidation.reason);
        return { executed: false, reason: basicValidation.reason };
      }

      // 2단계: 거래 제한 검증
      const limitValidation = this.validateTradingLimits(signal);
      if (!limitValidation.isValid) {
        console.log("❌ 거래 제한 검증 실패:", limitValidation.reason);
        return { executed: false, reason: limitValidation.reason };
      }

      // 3단계: 포트폴리오 상태 검증
      const portfolioValidation = this.validatePortfolioState(signal);
      if (!portfolioValidation.isValid) {
        console.log("❌ 포트폴리오 검증 실패:", portfolioValidation.reason);
        return { executed: false, reason: portfolioValidation.reason };
      }

      // 4단계: 거래 실행
      const { symbol, type, price, totalScore } = signal;
      let result;

      if (type === "BUY") {
        result = await this.executeBuy(symbol, price, totalScore, signal);
      } else if (type === "SELL") {
        result = await this.executeSell(symbol, price, totalScore, signal);
      } else {
        return { executed: false, reason: "Invalid signal type" };
      }

      if (result.executed) {
        console.log("✅ 거래 성공:", symbol, type, "내부 상태 업데이트 완료");
        this.logPortfolioState(); // 디버깅용
      }

      return result;
    } catch (error) {
      console.error("❌ executeSignal 실패:", error);
      return { executed: false, reason: error.message };
    }
  }

  // ✅ 디버깅용 포트폴리오 상태 로깅
  logPortfolioState() {
    console.log("📊 현재 포트폴리오 상태:", {
      현금: this.portfolio.krw,
      코인수: this.portfolio.coins.size,
      거래내역: this.portfolio.trades.length,
      코인목록: Array.from(this.portfolio.coins.keys()),
    });
  }

  // 기본 신호 검증
  validateBasicSignal(signal) {
    if (!signal) {
      return { isValid: false, reason: "신호가 없습니다" };
    }

    if (!signal.symbol || !signal.type || !signal.price) {
      return { isValid: false, reason: "필수 신호 정보 누락" };
    }

    if (signal.price <= 0) {
      return { isValid: false, reason: "유효하지 않은 가격" };
    }

    if (!["BUY", "SELL"].includes(signal.type)) {
      return { isValid: false, reason: "유효하지 않은 신호 타입" };
    }

    if (signal.totalScore < 5.0) {
      return { isValid: false, reason: `신호 점수 부족: ${signal.totalScore}` };
    }

    return { isValid: true };
  }

  // 거래 제한 검증
  validateTradingLimits(signal) {
    if (this.todayTrades >= this.tradingLimits.maxDailyTrades) {
      return {
        isValid: false,
        reason: `일일 거래 한도 초과 (${this.todayTrades}/${this.tradingLimits.maxDailyTrades})`,
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
          reason: `쿨다운 중 (${remainingTime}분 남음)`,
        };
      }
    }

    return { isValid: true };
  }

  // 포트폴리오 상태 검증
  validatePortfolioState(signal) {
    if (signal.type === "BUY") {
      if (this.portfolio.krw < this.tradingLimits.minTradingAmount) {
        return { isValid: false, reason: "보유 현금 부족" };
      }

      if (this.portfolio.coins.size >= 8) {
        return {
          isValid: false,
          reason: "최대 포지션 수 초과 (8개)",
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

  // 포지션 크기 계산
  calculatePositionSize(signal, marketCondition = null) {
    const availableCash = this.portfolio.krw;
    let basePositionSize = availableCash * 0.15; // 기본 15%

    // 신호 점수에 따른 조정
    const scoreMultiplier = Math.min(signal.totalScore / 7.0, 1.3);
    basePositionSize *= scoreMultiplier;

    // 신뢰도에 따른 조정
    const confidenceMultipliers = {
      high: 1.3,
      medium: 1.0,
      low: 0.7,
    };
    basePositionSize *= confidenceMultipliers[signal.confidence] || 1.0;

    // 최종 제한 적용
    const minAmount = this.tradingLimits.minTradingAmount;
    const maxAmount = Math.min(
      this.tradingLimits.maxTradingAmount,
      availableCash * this.tradingLimits.maxPositionSize
    );

    return Math.max(minAmount, Math.min(maxAmount, basePositionSize));
  }

  // ✅ 개선된 매수 실행
  async executeBuy(symbol, price, score, signal) {
    const positionSize = this.calculatePositionSize(signal);

    if (this.portfolio.krw < positionSize) {
      return { executed: false, reason: "계산된 포지션 크기만큼 현금 부족" };
    }

    const quantity = positionSize / price;

    // 기존 포지션 업데이트 또는 새로 생성
    const existingCoin = this.portfolio.coins.get(symbol);
    if (existingCoin) {
      const totalQuantity = existingCoin.quantity + quantity;
      const totalValue =
        existingCoin.avgPrice * existingCoin.quantity + positionSize;
      existingCoin.quantity = totalQuantity;
      existingCoin.avgPrice = totalValue / totalQuantity;
      existingCoin.currentPrice = price;
      existingCoin.tier = this.getCoinTier(symbol);
    } else {
      this.portfolio.coins.set(symbol, {
        symbol,
        quantity,
        avgPrice: price,
        currentPrice: price,
        firstBought: new Date(),
        tier: this.getCoinTier(symbol),
      });
    }

    // 현금 차감 (수수료 포함)
    const fee = positionSize * 0.0005;
    this.portfolio.krw -= positionSize + fee;

    // 거래 기록
    const trade = {
      id: Date.now(),
      symbol,
      action: "BUY",
      quantity,
      price,
      amount: positionSize,
      fee,
      timestamp: new Date(),
      score,
      confidence: signal.confidence,
      reason: signal.reason,
      tier: this.getCoinTier(symbol),
    };

    this.portfolio.trades.push(trade);
    this.todayTrades++;

    console.log(
      `✅ ${trade.tier} 매수 완료: ${symbol} ${quantity.toFixed(8)}개 @ ${price.toLocaleString()}원 (배분: ${((positionSize / this.initialBalance) * 100).toFixed(1)}%)`
    );

    return { executed: true, trade };
  }

  // 개선된 매도 실행
  async executeSell(symbol, price, score, signal) {
    const coin = this.portfolio.coins.get(symbol);
    if (!coin || coin.quantity <= 0) {
      return { executed: false, reason: "매도할 포지션 없음" };
    }

    // 매도 비율 계산
    const profitRate = ((price - coin.avgPrice) / coin.avgPrice) * 100;
    let sellRatio = 0.5; // 기본 50%

    if (profitRate > 5) sellRatio = 0.7;
    else if (profitRate > 2) sellRatio = 0.5;
    else if (profitRate < -3) sellRatio = 1.0;
    else if (profitRate < 0) sellRatio = 0.8;

    const sellQuantity = coin.quantity * sellRatio;
    const sellAmount = sellQuantity * price;
    const fee = sellAmount * 0.0005;

    // 포지션 업데이트
    coin.quantity -= sellQuantity;
    coin.currentPrice = price;

    if (coin.quantity < 0.00000001) {
      this.portfolio.coins.delete(symbol);
    }

    // 현금 증가
    this.portfolio.krw += sellAmount - fee;

    // 거래 기록
    const trade = {
      id: Date.now(),
      symbol,
      action: "SELL",
      quantity: sellQuantity,
      price,
      amount: sellAmount,
      fee,
      timestamp: new Date(),
      profitRate: Number(profitRate.toFixed(2)),
      sellRatio: Number((sellRatio * 100).toFixed(1)),
      score,
      confidence: signal.confidence,
      reason: signal.reason,
    };

    this.portfolio.trades.push(trade);
    this.todayTrades++;

    console.log(
      `✅ 매도 완료: ${symbol} ${sellQuantity.toFixed(8)}개 @ ${price.toLocaleString()}원 (수익률: ${profitRate.toFixed(2)}%)`
    );

    return { executed: true, trade };
  }

  // 가격 업데이트
  updateCoinPrice(symbol, price) {
    const coin = this.portfolio.coins.get(symbol);
    if (coin) {
      coin.currentPrice = price;
      coin.profitRate = ((price - coin.avgPrice) / coin.avgPrice) * 100;
    }
  }

  // 코인 티어 가져오기
  getCoinTier(symbol) {
    const tier1 = ["BTC", "ETH"];
    const tier2 = ["SOL", "ADA", "XRP", "DOT"];

    if (tier1.includes(symbol)) return "TIER1";
    if (tier2.includes(symbol)) return "TIER2";
    return "TIER3";
  }

  // ✅ 핵심 수정: 포트폴리오 요약 - positions와 tradeHistory로 반환
  getPortfolioSummary() {
    console.log("🔍 getPortfolioSummary 호출됨");

    let totalCryptoValue = 0;
    const positions = []; // ✅ positions로 변경

    // 현재 시세로 코인 가치 계산
    for (const [symbol, coin] of this.portfolio.coins) {
      const currentValue = coin.quantity * coin.currentPrice;
      const profitRate =
        ((coin.currentPrice - coin.avgPrice) / coin.avgPrice) * 100;
      totalCryptoValue += currentValue;

      positions.push({
        symbol,
        quantity: coin.quantity,
        avgPrice: coin.avgPrice,
        currentPrice: coin.currentPrice,
        currentValue,
        profitRate: Number(profitRate.toFixed(4)),
        tier: coin.tier,
        firstBought: coin.firstBought,
      });
    }

    const totalPortfolioValue = this.portfolio.krw + totalCryptoValue;
    const totalReturn =
      ((totalPortfolioValue - this.initialBalance) / this.initialBalance) * 100;

    // 거래 내역 복사
    const tradeHistory = [...this.portfolio.trades]; // ✅ tradeHistory로 변경

    console.log("📊 getPortfolioSummary 반환 데이터:", {
      positions: positions.length,
      tradeHistory: tradeHistory.length,
      totalValue: totalPortfolioValue,
      totalReturn,
    });

    return {
      // ✅ 핵심: usePaperTrading.js가 기대하는 필드명으로 변경
      positions, // coins -> positions
      tradeHistory, // trades -> tradeHistory

      // 기본 정보
      totalValue: Math.floor(totalPortfolioValue),
      investedValue: Math.floor(totalCryptoValue),
      totalProfitRate: Number(totalReturn.toFixed(4)),

      // 성과 지표
      performance: {
        totalReturn: Number(totalReturn.toFixed(4)),
        winRate: this.calculateWinRate(),
        maxDrawdown: 0,
      },

      // 추가 정보
      lastUpdated: new Date(),
      activePositions: this.portfolio.coins.size,
      cashRatio: ((this.portfolio.krw / totalPortfolioValue) * 100).toFixed(1),
      todayTrades: this.todayTrades,
    };
  }

  // 승률 계산
  calculateWinRate() {
    const sellTrades = this.portfolio.trades.filter((t) => t.action === "SELL");
    if (sellTrades.length === 0) return 0;

    const profitTrades = sellTrades.filter(
      (t) => t.profitRate && t.profitRate > 0
    );
    return Number(((profitTrades.length / sellTrades.length) * 100).toFixed(1));
  }

  // 포트폴리오 리셋
  resetPortfolio() {
    this.portfolio = {
      krw: this.initialBalance,
      coins: new Map(),
      trades: [],
      performance: {
        totalReturn: 0,
        winRate: 0,
        maxDrawdown: 0,
      },
    };
    this.todayTrades = 0;
    this.lastResetDate = new Date().toDateString();
    console.log("✅ 포트폴리오가 초기화되었습니다.");
  }

  // 거래 통계
  getTradingStats() {
    const buyTrades = this.portfolio.trades.filter((t) => t.action === "BUY");
    const sellTrades = this.portfolio.trades.filter((t) => t.action === "SELL");

    return {
      totalTrades: this.portfolio.trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      winRate: this.calculateWinRate(),
      todayTrades: this.todayTrades,
      dailyLimit: this.tradingLimits.maxDailyTrades,
    };
  }
}

// 싱글톤 인스턴스 생성
export const paperTradingEngine = new PaperTradingEngine();
export default PaperTradingEngine;
