// src/services/data/centralDataManager.js - 완전한 중앙 데이터 매니저

import { upbitMarketService } from "../upbit/upbitMarketService.js";
import { upbitWebSocketService } from "../upbit/upbitWebSocket.js";

class CentralDataManager {
  constructor() {
    this.subscribers = new Map();
    this.marketData = new Map(); // symbol -> data
    this.priceData = new Map(); // symbol -> price info
    this.isInitialized = false;
    this.updateInterval = null;
    this.watchedSymbols = [];

    // 성능 최적화
    this.lastUpdate = new Map();
    this.batchUpdateInterval = 5000; // 5초마다 배치 업데이트

    this.log("🚀 CentralDataManager 생성됨");
  }

  // ✅ 초기화
  async initialize(initialSymbols = []) {
    if (this.isInitialized) {
      this.log("⚠️ 이미 초기화됨");
      return true;
    }

    try {
      this.log("🔄 CentralDataManager 초기화 시작");

      this.watchedSymbols = [...initialSymbols];

      // 초기 시장 데이터 로드
      if (this.watchedSymbols.length > 0) {
        await this.loadInitialData();
      }

      // 주기적 업데이트 시작
      this.startPeriodicUpdates();

      this.isInitialized = true;
      this.log("✅ CentralDataManager 초기화 완료");

      return true;
    } catch (error) {
      this.log(`❌ 초기화 실패: ${error.message}`, "error");
      return false;
    }
  }

  // ✅ 초기 데이터 로드
  async loadInitialData() {
    try {
      this.log(`📊 초기 데이터 로드: ${this.watchedSymbols.length}개 심볼`);

      // 🔧 수정: 새로운 메서드 사용
      const markets = upbitMarketService.symbolsToMarkets(this.watchedSymbols);
      const priceDataArray =
        await upbitMarketService.getTickerDataForCentralManager(markets);

      // 나머지 로직은 동일...
      for (const priceData of priceDataArray) {
        const symbol = priceData.market.replace("KRW-", "");

        this.priceData.set(symbol, {
          symbol,
          market: priceData.market,
          trade_price: priceData.trade_price,
          signed_change_rate: priceData.signed_change_rate,
          acc_trade_price_24h: priceData.acc_trade_price_24h,
          timestamp: new Date(),
          rsi: this.estimateRSI(priceData.signed_change_rate),
          macd: null,
          bollinger: null,
        });

        this.lastUpdate.set(symbol, Date.now());
      }

      this.log(`✅ ${priceDataArray.length}개 코인 초기 데이터 로드 완료`);
      this.notifySubscribers();
    } catch (error) {
      this.log(`❌ 초기 데이터 로드 실패: ${error.message}`, "error");
      throw error;
    }
  }

  // ✅ RSI 추정 (간단한 버전)
  estimateRSI(changeRate) {
    if (!changeRate) return 50;

    const changePercent = changeRate * 100;

    if (changePercent <= -5) return 25;
    else if (changePercent <= -3) return 35;
    else if (changePercent <= -1) return 45;
    else if (changePercent >= 5) return 75;
    else if (changePercent >= 3) return 65;
    else if (changePercent >= 1) return 55;
    else return 50;
  }

  // ✅ 주기적 업데이트
  startPeriodicUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      if (this.watchedSymbols.length > 0) {
        await this.updatePriceData();
      }
    }, this.batchUpdateInterval);

    this.log("🔄 주기적 업데이트 시작 (5초 간격)");
  }

  // ✅ 가격 데이터 업데이트
  async updatePriceData() {
    try {
      // 🔧 수정: 새로운 메서드 사용
      const markets = upbitMarketService.symbolsToMarkets(this.watchedSymbols);
      const priceDataArray =
        await upbitMarketService.getTickerDataForCentralManager(markets);

      let updatedCount = 0;

      // 나머지 로직은 동일...
      for (const priceData of priceDataArray) {
        const symbol = priceData.market.replace("KRW-", "");
        const existing = this.priceData.get(symbol);

        if (existing && existing.trade_price !== priceData.trade_price) {
          this.priceData.set(symbol, {
            ...existing,
            trade_price: priceData.trade_price,
            signed_change_rate: priceData.signed_change_rate,
            acc_trade_price_24h: priceData.acc_trade_price_24h,
            timestamp: new Date(),
            rsi: this.estimateRSI(priceData.signed_change_rate),
          });

          this.lastUpdate.set(symbol, Date.now());
          updatedCount++;
        }
      }

      if (updatedCount > 0) {
        this.log(`📊 가격 업데이트: ${updatedCount}개 코인 변경`);
        this.notifySubscribers();
      }
    } catch (error) {
      this.log(`⚠️ 가격 업데이트 실패: ${error.message}`, "warning");
    }
  }

  // ✅ 구독자 관리
  subscribe(subscriberId, callback, dataTypes = ["prices"]) {
    this.subscribers.set(subscriberId, {
      callback,
      dataTypes,
      subscribed: Date.now(),
    });

    this.log(`📡 새 구독자: ${subscriberId} (${dataTypes.join(", ")})`);

    // 즉시 현재 데이터 전송
    if (this.isInitialized) {
      this.notifySubscriber(subscriberId);
    }

    // 구독 해제 함수 반환
    return () => {
      this.subscribers.delete(subscriberId);
      this.log(`📴 구독 해제: ${subscriberId}`);
    };
  }

  // ✅ 개별 구독자에게 알림
  notifySubscriber(subscriberId) {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) return;

    try {
      const data = this.buildNotificationData(subscriber.dataTypes);
      subscriber.callback(data);
    } catch (error) {
      this.log(`❌ ${subscriberId} 알림 실패: ${error.message}`, "error");
    }
  }

  // ✅ 모든 구독자에게 알림
  notifySubscribers() {
    for (const [subscriberId, subscriber] of this.subscribers) {
      try {
        const data = this.buildNotificationData(subscriber.dataTypes);
        subscriber.callback(data);
      } catch (error) {
        this.log(`❌ ${subscriberId} 알림 실패: ${error.message}`, "error");
      }
    }
  }

  // ✅ 알림 데이터 구성
  buildNotificationData(dataTypes) {
    const data = {};

    if (dataTypes.includes("prices")) {
      data.prices = {};
      for (const [symbol, priceInfo] of this.priceData) {
        data.prices[symbol] = {
          data: priceInfo,
          timestamp: this.lastUpdate.get(symbol) || Date.now(),
        };
      }
    }

    if (dataTypes.includes("markets")) {
      data.markets = Array.from(this.priceData.keys());
    }

    return data;
  }

  // ✅ 감시 코인 추가
  addWatchedSymbol(symbol) {
    if (!this.watchedSymbols.includes(symbol)) {
      this.watchedSymbols.push(symbol);
      this.log(`➕ 감시 코인 추가: ${symbol}`);

      // 즉시 데이터 로드
      this.loadSymbolData(symbol);
    }
  }

  // ✅ 감시 코인 제거
  removeWatchedSymbol(symbol) {
    const index = this.watchedSymbols.indexOf(symbol);
    if (index > -1) {
      this.watchedSymbols.splice(index, 1);
      this.priceData.delete(symbol);
      this.lastUpdate.delete(symbol);
      this.log(`➖ 감시 코인 제거: ${symbol}`);
    }
  }

  // ✅ 개별 코인 데이터 로드
  async loadSymbolData(symbol) {
    try {
      // 🔧 수정: 새로운 메서드 사용
      const markets = [`KRW-${symbol}`];
      const priceDataArray =
        await upbitMarketService.getTickerDataForCentralManager(markets);

      if (priceDataArray.length > 0) {
        const priceData = priceDataArray[0];
        this.priceData.set(symbol, {
          symbol,
          market: priceData.market,
          trade_price: priceData.trade_price,
          signed_change_rate: priceData.signed_change_rate,
          acc_trade_price_24h: priceData.acc_trade_price_24h,
          timestamp: new Date(),
          rsi: this.estimateRSI(priceData.signed_change_rate),
        });

        this.lastUpdate.set(symbol, Date.now());
        this.notifySubscribers();

        this.log(`📊 ${symbol} 데이터 로드 완료`);
      }
    } catch (error) {
      this.log(`❌ ${symbol} 데이터 로드 실패: ${error.message}`, "error");
    }
  }

  // ✅ 상태 조회
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      watchedSymbolsCount: this.watchedSymbols.length,
      subscribersCount: this.subscribers.size,
      priceDataCount: this.priceData.size,
      lastUpdateTime: Math.max(...Array.from(this.lastUpdate.values()), 0),
    };
  }

  // ✅ 캐시된 데이터 조회
  getCachedData(symbol) {
    return this.priceData.get(symbol) || null;
  }

  // ✅ 모든 캐시된 데이터 조회
  getAllCachedData() {
    const result = {};
    for (const [symbol, data] of this.priceData) {
      result[symbol] = data;
    }
    return result;
  }

  // ✅ 정리
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.subscribers.clear();
    this.priceData.clear();
    this.lastUpdate.clear();
    this.isInitialized = false;

    this.log("🧹 CentralDataManager 정리 완료");
  }

  // ✅ 로깅
  log(message, level = "info") {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp} [CentralDataManager] ${message}`);
  }
}

// 싱글톤 인스턴스
export const centralDataManager = new CentralDataManager();
export default centralDataManager;
