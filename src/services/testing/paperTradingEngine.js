// src/services/testing/paperTradingEngine.js - 실전적 개선 완전 버전

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

    // ✅ 실전적 거래 제한 설정
    this.tradingLimits = {
      maxDailyTrades: 15, // 일일 최대 거래 수 증가
      maxPositionSize: 0.3, // 최대 포지션 30%
      minTradingAmount: 30000, // 최소 거래 금액 3만원
      maxTradingAmount: 500000, // 최대 거래 금액 50만원
      cooldownPeriod: 300000, // 쿨다운 5분
      flexibleWaitTime: true, // ✅ 유연한 대기시간 활성화
    };

    this.todayTrades = 0;
    this.lastResetDate = new Date().toDateString();
  }

  // ✅ 일일 거래 수 리셋
  checkAndResetDailyLimits() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.todayTrades = 0;
      this.lastResetDate = today;
    }
  }

  // ✅ 시장 상황별 유연한 대기시간 계산
  calculateWaitTime(symbol, signal, marketCondition = null) {
    const baseWaitTime = 120 * 60 * 1000; // 기본 2시간

    // 급락 시 즉시 매수 허용
    if (signal.priceChange < -0.15) {
      // 15% 이상 급락
      return 10 * 60 * 1000; // 10분만 대기
    }

    if (signal.priceChange < -0.1) {
      // 10% 이상 급락
      return 30 * 60 * 1000; // 30분 대기
    }

    if (signal.priceChange < -0.05) {
      // 5% 이상 하락
      return 60 * 60 * 1000; // 1시간 대기
    }

    // 시장 상황별 조정
    if (marketCondition) {
      if (marketCondition.riskLevel >= 4) {
        return baseWaitTime * 1.5; // 고위험 시 대기시간 증가
      }

      if (marketCondition.volatility === "extreme") {
        return baseWaitTime * 2; // 극도 변동성 시 대기시간 증가
      }

      if (marketCondition.overallBuyScore >= 75) {
        return baseWaitTime * 0.5; // 좋은 매수 신호 시 단축
      }
    }

    return baseWaitTime;
  }

  // ✅ 엄격한 신호 검증
  async executeSignal(signal) {
    try {
      this.checkAndResetDailyLimits();

      // ✅ 1단계: 기본 검증
      const basicValidation = this.validateBasicSignal(signal);
      if (!basicValidation.isValid) {
        return { executed: false, reason: basicValidation.reason };
      }

      // ✅ 2단계: 거래 제한 검증
      const limitValidation = this.validateTradingLimits(signal);
      if (!limitValidation.isValid) {
        return { executed: false, reason: limitValidation.reason };
      }

      // ✅ 3단계: 포트폴리오 상태 검증
      const portfolioValidation = this.validatePortfolioState(signal);
      if (!portfolioValidation.isValid) {
        return { executed: false, reason: portfolioValidation.reason };
      }

      // ✅ 4단계: 거래 실행
      const { symbol, type, price, totalScore } = signal;
      if (type === "BUY") {
        return await this.executeBuy(symbol, price, totalScore, signal);
      } else if (type === "SELL") {
        return await this.executeSell(symbol, price, totalScore, signal);
      }

      return { executed: false, reason: "Invalid signal type" };
    } catch (error) {
      console.error("Signal execution failed:", error);
      return { executed: false, reason: error.message };
    }
  }

  // ✅ 기본 신호 검증
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

    // 신호 점수 검증
    if (signal.totalScore < 5.0) {
      return { isValid: false, reason: `신호 점수 부족: ${signal.totalScore}` };
    }

    // 신뢰도 검증
    if (signal.confidence === "low") {
      return { isValid: false, reason: "신뢰도가 낮은 신호" };
    }

    return { isValid: true };
  }

  // ✅ 거래 제한 검증
  validateTradingLimits(signal) {
    // 일일 거래 수 제한
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

  // ✅ 포트폴리오 상태 검증 - 유연한 대기시간 적용
  validatePortfolioState(signal) {
    if (signal.type === "BUY") {
      // 매수 시 현금 보유량 확인
      if (this.portfolio.krw < this.tradingLimits.minTradingAmount) {
        return { isValid: false, reason: "보유 현금 부족" };
      }

      // 최대 포지션 수 확인 (동적 조정)
      const maxPositions = portfolioAllocationService.getMaxPositions(
        this.portfolio
      );
      if (this.portfolio.coins.size >= maxPositions) {
        return {
          isValid: false,
          reason: `최대 포지션 수 초과 (${maxPositions}개)`,
        };
      }

      // ✅ 유연한 대기시간 적용
      const recentBuy = this.portfolio.trades
        .filter((t) => t.symbol === signal.symbol && t.action === "BUY")
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      if (recentBuy) {
        const marketCondition =
          marketAnalysisService.getCurrentMarketCondition();
        const waitTime = this.calculateWaitTime(
          signal.symbol,
          signal,
          marketCondition
        );
        const timeDiff = Date.now() - new Date(recentBuy.timestamp).getTime();

        if (timeDiff < waitTime) {
          const remainingTime = Math.ceil((waitTime - timeDiff) / 60000);
          return {
            isValid: false,
            reason: `유연 대기 중 (${remainingTime}분 남음, 시장조건 반영)`,
          };
        }
      }
    } else if (signal.type === "SELL") {
      // 매도 시 보유량 확인
      const coin = this.portfolio.coins.get(signal.symbol);
      if (!coin || coin.quantity <= 0) {
        return { isValid: false, reason: "보유하지 않은 코인" };
      }

      // 최소 보유 기간 확인 (15분으로 단축)
      const lastBuy = this.portfolio.trades
        .filter((t) => t.symbol === signal.symbol && t.action === "BUY")
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      if (lastBuy) {
        const holdingTime = Date.now() - new Date(lastBuy.timestamp).getTime();
        if (holdingTime < 15 * 60 * 1000) {
          // 15분
          return { isValid: false, reason: "최소 보유 기간 미달 (15분)" };
        }
      }
    }

    return { isValid: true };
  }

  // ✅ 차등 포지션 크기 계산 (Tier 기반)
  calculatePositionSize(signal, marketCondition = null) {
    const availableCash = this.portfolio.krw;

    // Tier 기반 기본 배분 가져오기
    const allocation = portfolioAllocationService.getTierAllocation(
      signal.symbol
    );
    let basePositionSize = availableCash * allocation.ratio;

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

    // 시장 조건에 따른 조정
    if (marketCondition) {
      if (marketCondition.riskLevel >= 4) {
        basePositionSize *= 0.6; // 고위험 시 감소
      }

      if (marketCondition.volatility === "extreme") {
        basePositionSize *= 0.5; // 극도 변동성 시 감소
      }

      if (marketCondition.overallBuyScore >= 80) {
        basePositionSize *= 1.2; // 좋은 시장 시 증가
      }
    }

    // 최종 제한 적용
    const minAmount = this.tradingLimits.minTradingAmount;
    const maxAmount = Math.min(
      this.tradingLimits.maxTradingAmount,
      availableCash * this.tradingLimits.maxPositionSize
    );

    return Math.max(minAmount, Math.min(maxAmount, basePositionSize));
  }

  // ✅ 개선된 매수 실행 - 차등 배분 적용
  async executeBuy(symbol, price, score, signal) {
    const marketCondition =
      await marketAnalysisService.analyzeMarketCondition();
    const positionSize = this.calculatePositionSize(signal, marketCondition);

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
      existingCoin.tier = portfolioAllocationService.getCoinTier(symbol); // Tier 정보 추가
    } else {
      this.portfolio.coins.set(symbol, {
        symbol,
        quantity,
        avgPrice: price,
        currentPrice: price,
        firstBought: new Date(),
        tier: portfolioAllocationService.getCoinTier(symbol), // Tier 정보 추가
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
      tier: portfolioAllocationService.getCoinTier(symbol),
      marketCondition: marketCondition?.overallBuyScore,
      waitTimeUsed: signal.waitTimeUsed || "flexible",
    };

    this.portfolio.trades.push(trade);
    this.todayTrades++;

    console.log(
      `✅ ${trade.tier} 매수 완료: ${symbol} ${quantity.toFixed(8)}개 @ ${price.toLocaleString()}원 (배분: ${((positionSize / this.initialBalance) * 100).toFixed(1)}%)`
    );

    return { executed: true, trade };
  }

  // ✅ 개선된 매도 실행
  async executeSell(symbol, price, score, signal) {
    const coin = this.portfolio.coins.get(symbol);
    if (!coin || coin.quantity <= 0) {
      return { executed: false, reason: "매도할 포지션 없음" };
    }

    // 매도 비율 계산 (수익률과 시장 조건에 따라)
    const profitRate = ((price - coin.avgPrice) / coin.avgPrice) * 100;
    let sellRatio = 0.5; // 기본 50% 매도

    // 수익률에 따른 매도 비율 조정
    if (profitRate > 5)
      sellRatio = 0.7; // 5% 이상 수익 시 70% 매도
    else if (profitRate > 2)
      sellRatio = 0.5; // 2% 이상 수익 시 50% 매도
    else if (profitRate < -3)
      sellRatio = 1.0; // 3% 손실 시 전량 매도
    else if (profitRate < 0) sellRatio = 0.8; // 손실 시 80% 매도

    const sellQuantity = coin.quantity * sellRatio;
    const sellAmount = sellQuantity * price;
    const fee = sellAmount * 0.0005; // 0.05% 수수료

    // 포지션 업데이트
    coin.quantity -= sellQuantity;
    coin.currentPrice = price;

    if (coin.quantity < 0.00000001) {
      this.portfolio.coins.delete(symbol);
    }

    // 현금 증가 (수수료 차감)
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

  // ✅ 실시간 가격 업데이트 (누락된 함수)
  updatePrices(priceData) {
    for (const [symbol, coin] of this.portfolio.coins) {
      const marketSymbol = `KRW-${symbol}`;
      if (priceData[marketSymbol]) {
        coin.currentPrice = priceData[marketSymbol];
        coin.profitRate =
          ((coin.currentPrice - coin.avgPrice) / coin.avgPrice) * 100;
      }
    }
  }

  // ✅ 개별 코인 가격 업데이트 (누락된 함수)
  updateCoinPrice(symbol, price) {
    const coin = this.portfolio.coins.get(symbol);
    if (coin) {
      coin.currentPrice = price;
      coin.profitRate = ((price - coin.avgPrice) / coin.avgPrice) * 100;
    }
  }

  // ✅ 포트폴리오 요약
  getPortfolioSummary() {
    let totalCryptoValue = 0;
    const coins = [];

    // 현재 시세로 코인 가치 계산
    for (const [symbol, coin] of this.portfolio.coins) {
      const currentValue = coin.quantity * coin.currentPrice;
      const profitRate =
        ((coin.currentPrice - coin.avgPrice) / coin.avgPrice) * 100;
      totalCryptoValue += currentValue;

      coins.push({
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

    // 성과 업데이트
    this.portfolio.performance.totalReturn = totalReturn;

    // 거래 통계
    const buyTrades = this.portfolio.trades.filter((t) => t.action === "BUY");
    const sellTrades = this.portfolio.trades.filter((t) => t.action === "SELL");
    const profitTrades = sellTrades.filter(
      (t) => t.profitRate && t.profitRate > 0
    );

    const totalFees = this.portfolio.trades.reduce(
      (sum, t) => sum + (t.fee || 0),
      0
    );

    return {
      // 기본 정보
      krw: Math.floor(this.portfolio.krw),
      totalValue: Math.floor(totalPortfolioValue),
      totalReturn: Number(totalReturn.toFixed(4)),
      coins,
      trades: this.portfolio.trades.slice(-10),

      // 성과 지표
      performance: {
        totalReturn: Number(totalReturn.toFixed(4)),
        winRate:
          sellTrades.length > 0
            ? Number(
                ((profitTrades.length / sellTrades.length) * 100).toFixed(1)
              )
            : 0,
        totalTrades: this.portfolio.trades.length,
        profitTrades: profitTrades.length,
        totalFees: Math.floor(totalFees),
        avgTradeSize:
          buyTrades.length > 0
            ? Math.floor(
                buyTrades.reduce((sum, t) => sum + t.amount, 0) /
                  buyTrades.length
              )
            : 0,
      },

      // 추가 통계
      activePositions: this.portfolio.coins.size,
      cashRatio: ((this.portfolio.krw / totalPortfolioValue) * 100).toFixed(1),
      todayTrades: this.todayTrades,
      dailyLimit: this.tradingLimits.maxDailyTrades,

      // 리스크 지표
      riskMetrics: {
        maxPositionValue:
          coins.length > 0 ? Math.max(...coins.map((c) => c.currentValue)) : 0,
        portfolioConcentration:
          coins.length > 0
            ? Math.max(
                ...coins.map(
                  (c) => (c.currentValue / totalPortfolioValue) * 100
                )
              )
            : 0,
        avgHoldingTime: this.calculateAvgHoldingTime(),
      },
    };
  }

  // ✅ 평균 보유 시간 계산
  calculateAvgHoldingTime() {
    const holdings = Array.from(this.portfolio.coins.values());
    if (holdings.length === 0) return 0;

    const now = new Date();
    const totalHoldingTime = holdings.reduce((sum, coin) => {
      const holdingTime = now - new Date(coin.firstBought);
      return sum + holdingTime;
    }, 0);

    return Math.floor(totalHoldingTime / holdings.length / (60 * 60 * 1000)); // 시간 단위
  }

  // ✅ 포트폴리오 리셋
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
    console.log("포트폴리오가 초기화되었습니다.");
  }

  // ✅ 거래 통계
  getTradingStats() {
    const buyTrades = this.portfolio.trades.filter((t) => t.action === "BUY");
    const sellTrades = this.portfolio.trades.filter((t) => t.action === "SELL");
    const profitTrades = sellTrades.filter(
      (t) => t.profitRate && t.profitRate > 0
    );

    const totalFees = this.portfolio.trades.reduce(
      (sum, t) => sum + (t.fee || 0),
      0
    );

    return {
      totalTrades: this.portfolio.trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      winRate:
        sellTrades.length > 0
          ? ((profitTrades.length / sellTrades.length) * 100).toFixed(2)
          : 0,
      todayTrades: this.todayTrades,
      dailyLimit: this.tradingLimits.maxDailyTrades,
      totalFees: Math.floor(totalFees),
      avgTradingAmount:
        buyTrades.length > 0
          ? Math.floor(
              buyTrades.reduce((sum, t) => sum + t.amount, 0) / buyTrades.length
            )
          : 0,
      dailyTradesRemaining: Math.max(
        0,
        this.tradingLimits.maxDailyTrades - this.todayTrades
      ),
    };
  }
}

// 싱글톤 인스턴스 생성
export const paperTradingEngine = new PaperTradingEngine();
export default PaperTradingEngine;
