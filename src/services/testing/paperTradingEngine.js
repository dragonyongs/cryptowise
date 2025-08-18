// src/services/testing/paperTradingEngine.js - 완전 수정 버전

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
  }

  // ✅ 신호 실행
  async executeSignal(signal) {
    try {
      const { symbol, type, price, totalScore } = signal;

      if (type === "BUY") {
        return await this.executeBuy(symbol, price, totalScore);
      } else if (type === "SELL") {
        return await this.executeSell(symbol, price, totalScore);
      }

      return { executed: false, reason: "Invalid signal type" };
    } catch (error) {
      console.error("Signal execution failed:", error);
      return { executed: false, reason: error.message };
    }
  }

  // ✅ 매수 실행
  async executeBuy(symbol, price, score) {
    const positionSize = Math.min(this.portfolio.krw * 0.1, 200000); // 10% 또는 최대 20만원

    if (this.portfolio.krw < positionSize) {
      return { executed: false, reason: "Insufficient balance" };
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
    } else {
      this.portfolio.coins.set(symbol, {
        symbol,
        quantity,
        avgPrice: price,
        currentPrice: price,
      });
    }

    // 현금 차감
    this.portfolio.krw -= positionSize;

    // 거래 기록
    const trade = {
      id: Date.now(),
      symbol,
      action: "BUY",
      quantity,
      price,
      amount: positionSize,
      timestamp: new Date(),
      score,
    };

    this.portfolio.trades.push(trade);

    return { executed: true, trade };
  }

  // ✅ 매도 실행
  async executeSell(symbol, price, score) {
    const coin = this.portfolio.coins.get(symbol);
    if (!coin || coin.quantity <= 0) {
      return { executed: false, reason: "No position to sell" };
    }

    const sellQuantity = coin.quantity * 0.5; // 50% 매도
    const sellAmount = sellQuantity * price;

    // 포지션 업데이트
    coin.quantity -= sellQuantity;
    coin.currentPrice = price; // ✅ 현재 가격 업데이트

    if (coin.quantity < 0.00000001) {
      this.portfolio.coins.delete(symbol);
    }

    // 현금 증가
    this.portfolio.krw += sellAmount;

    // 거래 기록
    const profitRate = ((price - coin.avgPrice) / coin.avgPrice) * 100;
    const trade = {
      id: Date.now(),
      symbol,
      action: "SELL",
      quantity: sellQuantity,
      price,
      amount: sellAmount,
      timestamp: new Date(),
      profitRate,
      score,
    };

    this.portfolio.trades.push(trade);

    return { executed: true, trade };
  }

  // ✅ 실시간 가격 업데이트 - 수익률 계산 수정
  updatePrices(priceData) {
    for (const [symbol, coin] of this.portfolio.coins) {
      const marketSymbol = `KRW-${symbol}`;
      if (priceData[marketSymbol]) {
        coin.currentPrice = priceData[marketSymbol];
        // ✅ 수익률도 즉시 업데이트
        coin.profitRate =
          ((coin.currentPrice - coin.avgPrice) / coin.avgPrice) * 100;
      }
    }
  }

  // ✅ 단일 코인 가격 업데이트
  updateCoinPrice(symbol, price) {
    const coin = this.portfolio.coins.get(symbol);
    if (coin) {
      coin.currentPrice = price;
      coin.profitRate = ((price - coin.avgPrice) / coin.avgPrice) * 100;
    }
  }

  // ✅ 포트폴리오 요약 - 수익률 계산 완전 수정
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
        profitRate: Number(profitRate.toFixed(4)), // ✅ 소수점 4자리
      });
    }

    const totalPortfolioValue = this.portfolio.krw + totalCryptoValue;

    // ✅ 전체 포트폴리오 수익률 계산 수정
    const totalReturn =
      ((totalPortfolioValue - this.initialBalance) / this.initialBalance) * 100;

    // ✅ 성과 업데이트
    this.portfolio.performance.totalReturn = totalReturn;

    return {
      krw: Math.floor(this.portfolio.krw), // ✅ 정수로 반올림
      totalValue: Math.floor(totalPortfolioValue),
      totalReturn: Number(totalReturn.toFixed(4)), // ✅ 소수점 4자리로 정확한 계산
      coins,
      trades: this.portfolio.trades.slice(-10), // 최근 10개 거래만
      performance: {
        ...this.portfolio.performance,
        totalReturn: Number(totalReturn.toFixed(4)),
      },
      // ✅ 추가 통계
      activePositions: this.portfolio.coins.size,
      cashRatio: ((this.portfolio.krw / totalPortfolioValue) * 100).toFixed(1),
    };
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
  }

  // ✅ 거래 통계
  getTradingStats() {
    const buyTrades = this.portfolio.trades.filter((t) => t.action === "BUY");
    const sellTrades = this.portfolio.trades.filter((t) => t.action === "SELL");
    const profitTrades = sellTrades.filter(
      (t) => t.profitRate && t.profitRate > 0
    );

    return {
      totalTrades: this.portfolio.trades.length,
      buyTrades: buyTrades.length,
      sellTrades: sellTrades.length,
      winRate:
        sellTrades.length > 0
          ? ((profitTrades.length / sellTrades.length) * 100).toFixed(2)
          : 0,
      totalFees: this.portfolio.trades.reduce(
        (sum, trade) => sum + trade.amount * 0.0005,
        0
      ), // 0.05% 수수료
    };
  }

  // ✅ 디버그용 로깅
  logPortfolioState() {
    console.log("=== 포트폴리오 상태 ===");
    console.log(`초기 자본: ${this.initialBalance.toLocaleString()}원`);
    console.log(`현재 현금: ${this.portfolio.krw.toLocaleString()}원`);
    console.log(`보유 코인: ${this.portfolio.coins.size}개`);

    for (const [symbol, coin] of this.portfolio.coins) {
      const currentValue = coin.quantity * coin.currentPrice;
      const profitRate =
        ((coin.currentPrice - coin.avgPrice) / coin.avgPrice) * 100;
      console.log(
        `- ${symbol}: ${coin.quantity.toFixed(8)}개, 평균가 ${coin.avgPrice.toLocaleString()}원, 현재가 ${coin.currentPrice.toLocaleString()}원, 수익률 ${profitRate.toFixed(2)}%`
      );
    }

    const summary = this.getPortfolioSummary();
    console.log(`전체 가치: ${summary.totalValue.toLocaleString()}원`);
    console.log(`전체 수익률: ${summary.totalReturn.toFixed(4)}%`);
    console.log("===================");
  }
}

// 싱글톤 인스턴스 생성
export const paperTradingEngine = new PaperTradingEngine();
export default PaperTradingEngine;
