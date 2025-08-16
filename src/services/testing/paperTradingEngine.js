class PaperTradingEngine {
  constructor() {
    this.portfolio = {
      krw: 1840000,
      coins: [],
      totalValue: 1840000,
      trades: [],
      recentTrades: [],
      performance: {
        totalReturn: 0,
        winRate: 0,
        maxDrawdown: 0,
        totalTrades: 0,
        winTrades: 0,
      },
    };
  }

  async executeSignal(signal, config) {
    if (!this.validateSignal(signal, config)) {
      return { executed: false, reason: "Config validation failed" };
    }

    const positionSize = this.calculatePositionSize(signal, config);
    if (positionSize <= 0) {
      return { executed: false, reason: "Invalid position size" };
    }

    const trade = {
      id: Date.now(),
      symbol: signal.symbol,
      action: signal.type,
      price: signal.price,
      quantity:
        signal.type === "BUY" ? positionSize / signal.price : positionSize,
      amount:
        signal.type === "BUY" ? positionSize : positionSize * signal.price,
      timestamp: new Date(),
      executed: true,
      reason: signal.reason,
    };

    this.updatePortfolio(trade);
    this.portfolio.trades.push(trade);
    this.portfolio.recentTrades.unshift(trade);

    if (this.portfolio.recentTrades.length > 50) {
      this.portfolio.recentTrades = this.portfolio.recentTrades.slice(0, 50);
    }

    this.calculatePerformance();

    return { executed: true, trade };
  }

  validateSignal(signal, config) {
    if (!config.isActive) return false;
    if (signal.type === "BUY" && !config.buySettings.enabled) return false;
    if (signal.type === "SELL" && !config.sellSettings.enabled) return false;
    return true;
  }

  calculatePositionSize(signal, config) {
    if (signal.type === "BUY") {
      const maxAmount = Math.min(
        this.portfolio.krw * (config.buySettings.buyPercentage / 100),
        config.buySettings.maxPositionSize || this.portfolio.krw * 0.1
      );
      return maxAmount;
    } else {
      const holding = this.portfolio.coins.find(
        (coin) => coin.symbol === signal.symbol
      );
      if (!holding || holding.quantity <= 0) return 0;
      return holding.quantity * (config.sellSettings.sellPercentage / 100);
    }
  }

  updatePortfolio(trade) {
    if (trade.action === "BUY") {
      this.portfolio.krw -= trade.amount;

      const existingCoin = this.portfolio.coins.find(
        (coin) => coin.symbol === trade.symbol
      );
      if (existingCoin) {
        const totalValue =
          existingCoin.avgPrice * existingCoin.quantity + trade.amount;
        const totalQuantity = existingCoin.quantity + trade.quantity;
        existingCoin.avgPrice = totalValue / totalQuantity;
        existingCoin.quantity = totalQuantity;
      } else {
        this.portfolio.coins.push({
          symbol: trade.symbol,
          quantity: trade.quantity,
          avgPrice: trade.price,
          currentPrice: trade.price,
          currentValue: trade.amount,
          profitRate: 0,
        });
      }
    } else if (trade.action === "SELL") {
      const existingCoin = this.portfolio.coins.find(
        (coin) => coin.symbol === trade.symbol
      );
      if (existingCoin) {
        existingCoin.quantity -= trade.quantity;
        this.portfolio.krw += trade.amount;

        if (existingCoin.quantity <= 0.00000001) {
          this.portfolio.coins = this.portfolio.coins.filter(
            (coin) => coin.symbol !== trade.symbol
          );
        }

        trade.profitRate =
          ((trade.price - existingCoin.avgPrice) / existingCoin.avgPrice) * 100;
      }
    }

    this.updatePortfolioValue();
  }

  updatePortfolioValue() {
    const cryptoValue = this.portfolio.coins.reduce((total, coin) => {
      coin.currentValue = coin.quantity * coin.currentPrice;
      coin.profitRate =
        ((coin.currentPrice - coin.avgPrice) / coin.avgPrice) * 100;
      return total + coin.currentValue;
    }, 0);

    this.portfolio.totalValue = this.portfolio.krw + cryptoValue;

    // ✅ 실시간 성과 계산
    this.calculatePerformance();
  }

  calculatePerformance() {
    const initialBalance = 1840000;
    this.portfolio.performance.totalReturn =
      ((this.portfolio.totalValue - initialBalance) / initialBalance) * 100;

    const profitTrades = this.portfolio.trades.filter(
      (trade) => trade.profitRate && trade.profitRate > 0
    );
    this.portfolio.performance.totalTrades = this.portfolio.trades.filter(
      (trade) => trade.action === "SELL"
    ).length;
    this.portfolio.performance.winTrades = profitTrades.length;
    this.portfolio.performance.winRate =
      this.portfolio.performance.totalTrades > 0
        ? (this.portfolio.performance.winTrades /
            this.portfolio.performance.totalTrades) *
          100
        : 0;
  }

  getPortfolioSummary() {
    this.updatePortfolioValue();
    return { ...this.portfolio };
  }

  resetPortfolio() {
    this.portfolio = {
      krw: 1840000,
      coins: [],
      totalValue: 1840000,
      trades: [],
      recentTrades: [],
      performance: {
        totalReturn: 0,
        winRate: 0,
        maxDrawdown: 0,
        totalTrades: 0,
        winTrades: 0,
      },
    };
    return this.portfolio;
  }

  updateCoinPrice(symbol, price) {
    const coin = this.portfolio.coins.find((c) => c.symbol === symbol);
    if (coin) {
      coin.currentPrice = price;
      this.updatePortfolioValue();
    }
  }
}

export const paperTradingEngine = new PaperTradingEngine();
