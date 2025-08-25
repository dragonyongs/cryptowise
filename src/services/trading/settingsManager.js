// src/services/trading/settingsManager.js
class TradingSettingsManager {
  constructor() {
    this.settings = null;
    this.listeners = new Set();
    this.loadSettings();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem("cryptowise_trading_settings");
      if (saved) {
        this.settings = JSON.parse(saved);
        this.notifyListeners();
      }
    } catch (error) {
      console.error("설정 로드 실패:", error);
    }
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.notifyListeners();

    // paperTradingEngine에 즉시 반영
    if (window.paperTradingEngine) {
      window.paperTradingEngine.updateSettings(this.settings);
    }
  }

  getSettings() {
    return this.settings;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((listener) => listener(this.settings));
  }
}

// 전역 인스턴스 생성
if (typeof window !== "undefined") {
  window.tradingSettingsManager = new TradingSettingsManager();
}

export default TradingSettingsManager;
