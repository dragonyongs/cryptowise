// services/trading/tradingEngine.js
import { PaperTradingEngine } from "../testing/paperTradingEngine.js";

export class UnifiedTradingEngine {
  constructor(mode = "paper") {
    this.mode = mode;
    this.paperEngine = new PaperTradingEngine();
    this.liveEngine = null; // 실전 거래용
  }

  async executeTrade(signal, config) {
    const engine = this.mode === "paper" ? this.paperEngine : this.liveEngine;
    return await engine.executeTrade(signal, config);
  }

  async getPortfolio(userId) {
    if (this.mode === "paper") {
      return await this.paperEngine.getVirtualPortfolio(userId);
    } else {
      return await this.liveEngine.getRealPortfolio(userId);
    }
  }
}
