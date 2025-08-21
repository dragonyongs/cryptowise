// src/services/data/centralDataManager.js - 완전한 최종 버전

import { upbitMarketService } from "../upbit/upbitMarketService.js";
import {
  sma,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from "../analysis/technicalAnalysis.js";

class CentralDataManager {
  constructor() {
    this.priceCache = new Map();
    this.marketCache = new Map();
    this.lastUpdate = new Map();
    this.subscribers = new Map(); // 구독자 관리

    // API 호출 제한 관리
    this.rateLimiter = {
      upbit: { calls: 0, resetTime: 0, limit: 10 }, // 분당 10회
      lastCall: 0,
      minInterval: 6000, // 6초 간격
    };

    // 업데이트 스케줄
    this.updateSchedule = {
      prices: 30000, // 30초마다
      markets: 300000, // 5분마다
      tickers: 60000, // 1분마다
    };

    this.isInitialized = false;
    this.updateIntervals = {};
    this.selectedCoins = []; // 선택된 코인 추적
    this.priceHistory = new Map(); // 가격 히스토리 저장
    this.maxHistoryLength = 100; // 최대 100개 캔들
  }

  // 🎯 초기화 - 한 번만 데이터 로드
  async initialize(selectedCoins = []) {
    if (this.isInitialized) {
      console.log("🔄 중앙 데이터 매니저 이미 초기화됨");
      return;
    }

    console.log("🚀 중앙 데이터 매니저 초기화");

    try {
      // 선택된 코인 저장
      this.selectedCoins =
        selectedCoins.length > 0 ? selectedCoins : ["BTC", "ETH"];

      // 1. 초기 마켓 리스트 로드 (한 번만)
      await this.loadInitialMarketData();

      // 2. 선택된 코인들의 초기 데이터 로드
      if (this.selectedCoins.length > 0) {
        await this.loadInitialPriceData(this.selectedCoins);
      }

      // 3. 스케줄러 시작
      this.startUpdateScheduler();

      this.isInitialized = true;
      console.log("✅ 중앙 데이터 매니저 초기화 완료");
    } catch (error) {
      console.error("❌ 초기화 실패:", error);
      throw error;
    }
  }

  // 🎯 초기 마켓 데이터 로드
  async loadInitialMarketData() {
    try {
      console.log("📊 초기 마켓 데이터 로드 시작");

      const marketList = await upbitMarketService.getMarketList(true);

      // 마켓 캐시에 저장
      marketList.forEach((market) => {
        this.marketCache.set(market.symbol, {
          data: market,
          timestamp: Date.now(),
        });
      });

      console.log(`✅ 초기 마켓 데이터 ${marketList.length}개 로드 완료`);
    } catch (error) {
      console.error("❌ 초기 마켓 데이터 로드 실패:", error);
      throw error;
    }
  }

  // 🎯 초기 가격 데이터 로드
  async loadInitialPriceData(selectedCoins) {
    try {
      console.log("💰 초기 가격 데이터 로드 시작", selectedCoins);

      const tickerData = await upbitMarketService.getTickerData(selectedCoins);

      // 가격 캐시에 저장
      Array.from(tickerData.values()).forEach((ticker) => {
        const symbol = ticker.market.replace("KRW-", "");
        this.priceCache.set(symbol, {
          data: ticker,
          timestamp: Date.now(),
        });
      });

      console.log(`✅ 초기 가격 데이터 ${tickerData.size}개 로드 완료`);
    } catch (error) {
      console.error("❌ 초기 가격 데이터 로드 실패:", error);
      throw error;
    }
  }

  // 🎯 구독 기반 데이터 제공
  subscribe(serviceId, callback, dataTypes = ["prices"]) {
    if (!this.subscribers.has(serviceId)) {
      this.subscribers.set(serviceId, { callback, dataTypes });
      console.log(`📡 ${serviceId} 구독 등록:`, dataTypes);
    }

    // 즉시 현재 데이터 제공
    this.notifySubscriber(serviceId);

    return () => this.unsubscribe(serviceId);
  }

  // 🎯 구독 해제
  unsubscribe(serviceId) {
    const removed = this.subscribers.delete(serviceId);
    if (removed) {
      console.log(`📡 ${serviceId} 구독 해제`);
    }
    return removed;
  }

  // 🎯 캐시된 데이터 조회 (API 호출 없음)
  getCachedPrice(symbol) {
    const cached = this.priceCache.get(symbol);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > 300000) return null; // 5분 이상 된 데이터는 무효

    return cached.data;
  }

  // 🎯 여러 코인 데이터 한 번에 조회
  getCachedPrices(symbols) {
    const result = new Map();
    symbols.forEach((symbol) => {
      const data = this.getCachedPrice(symbol);
      if (data) result.set(symbol, data);
    });
    return result;
  }

  // 🎯 스케줄러 기반 업데이트
  startUpdateScheduler() {
    // 30초마다 가격 업데이트
    this.updateIntervals.prices = setInterval(() => {
      this.updateSelectedCoinsData();
    }, this.updateSchedule.prices);

    // 5분마다 마켓 데이터 업데이트
    this.updateIntervals.markets = setInterval(() => {
      this.updateMarketData();
    }, this.updateSchedule.markets);

    console.log("⏰ 업데이트 스케줄러 시작");
  }

  // 🎯 선택된 코인 데이터 업데이트
  async updateSelectedCoinsData() {
    const activeSymbols = this.getActiveSymbols();
    if (activeSymbols.length === 0) return;

    if (!this.canMakeApiCall()) {
      console.log("🛑 API 제한으로 업데이트 건너뜀");
      return;
    }

    try {
      console.log(`🔄 ${activeSymbols.length}개 코인 업데이트`);

      // 한 번만 API 호출
      const tickerData = await upbitMarketService.getTickerData(activeSymbols);

      // 한 번의 루프로 히스토리 업데이트 + 지표 계산 + 캐시 저장
      Array.from(tickerData.values()).forEach((ticker) => {
        const symbol = ticker.market.replace("KRW-", "");
        const currentPrice = ticker.trade_price;

        // 가격 히스토리 업데이트
        this.updatePriceHistory(
          symbol,
          currentPrice,
          ticker.acc_trade_price_24h
        );

        // 기술적 지표 계산
        const indicators = this.calculateTechnicalIndicators(
          symbol,
          currentPrice
        );

        // 모든 데이터 포함해서 한 번에 캐시 저장
        this.priceCache.set(symbol, {
          data: {
            ...ticker,
            ...indicators, // 계산된 지표들
            signed_change_rate: ticker.signed_change_rate,
            avgVolume: this.calculateAverageVolume(symbol),
          },
          timestamp: Date.now(),
        });
      });

      this.rateLimiter.calls++;
      this.rateLimiter.lastCall = Date.now();

      // 구독자들에게 알림
      this.notifyAllSubscribers("prices");
    } catch (error) {
      console.error("가격 데이터 업데이트 실패:", error);
    }
  }

  // 🎯 가격 히스토리 업데이트
  updatePriceHistory(symbol, currentPrice, volume) {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }

    const history = this.priceHistory.get(symbol);
    history.push({
      price: currentPrice,
      timestamp: Date.now(),
      volume: volume || 0,
    });

    // 최대 길이 유지
    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  // 🎯 마켓 데이터 업데이트
  async updateMarketData() {
    if (!this.canMakeApiCall()) {
      console.log("🛑 API 제한으로 마켓 업데이트 건너뜀");
      return;
    }

    try {
      console.log("🔄 마켓 데이터 업데이트");

      const marketList = await upbitMarketService.getMarketList(true);

      // 마켓 캐시 업데이트
      marketList.forEach((market) => {
        this.marketCache.set(market.symbol, {
          data: market,
          timestamp: Date.now(),
        });
      });

      this.rateLimiter.calls++;
      this.rateLimiter.lastCall = Date.now();

      // 구독자들에게 알림
      this.notifyAllSubscribers("markets");
    } catch (error) {
      console.error("마켓 데이터 업데이트 실패:", error);
    }
  }

  // 🎯 활성 심볼 가져오기
  getActiveSymbols() {
    // 선택된 코인들 + 구독자들이 요청한 코인들
    const subscriberSymbols = Array.from(this.subscribers.keys())
      .map((id) => this.selectedCoins)
      .flat();

    const allSymbols = [
      ...new Set([...this.selectedCoins, ...subscriberSymbols]),
    ];
    return allSymbols.filter(Boolean);
  }

  // 🎯 API 호출 가능 여부 체크
  canMakeApiCall() {
    const now = Date.now();

    // 분당 호출 제한 체크
    if (now - this.rateLimiter.resetTime > 60000) {
      this.rateLimiter.calls = 0;
      this.rateLimiter.resetTime = now;
    }

    if (this.rateLimiter.calls >= this.rateLimiter.limit) {
      return false;
    }

    // 최소 간격 체크
    if (now - this.rateLimiter.lastCall < this.rateLimiter.minInterval) {
      return false;
    }

    return true;
  }

  // 🎯 구독자들에게 데이터 배포
  notifyAllSubscribers(dataType) {
    this.subscribers.forEach((subscriber, serviceId) => {
      if (subscriber.dataTypes.includes(dataType)) {
        this.notifySubscriber(serviceId);
      }
    });
  }

  // 🎯 개별 구독자 알림
  notifySubscriber(serviceId) {
    const subscriber = this.subscribers.get(serviceId);
    if (!subscriber) return;

    const data = {
      prices: Object.fromEntries(this.priceCache),
      markets: Object.fromEntries(this.marketCache),
      timestamp: Date.now(),
    };

    try {
      subscriber.callback(data);
    } catch (error) {
      console.error(`구독자 ${serviceId} 알림 실패:`, error);
    }
  }

  // 🎯 코인 목록 업데이트
  updateWatchedCoins(newCoins) {
    this.selectedCoins = [...new Set([...this.selectedCoins, ...newCoins])];
    console.log(`👀 감시 코인 업데이트: ${this.selectedCoins.length}개`);
  }

  // 🎯 기술적 지표 계산 함수 (완전 수정)
  calculateTechnicalIndicators(symbol, currentPrice) {
    const history = this.priceHistory.get(symbol) || [];

    // 데이터 부족시에도 의미 있는 지표 제공
    if (history.length < 2) {
      return {
        rsi: 50, // 중립값
        macd: { line: 0, signal: 0, histogram: 0 },
        ma20: currentPrice,
        ma60: currentPrice,
        bollinger: {
          upper: currentPrice * 1.02,
          middle: currentPrice,
          lower: currentPrice * 0.98,
        },
      };
    }

    const prices = history.map((h) => h.price);

    try {
      // 점진적 지표 계산 (데이터 부족해도 계산)
      const rsi =
        prices.length >= 14
          ? calculateRSI(prices, 14)
          : this.estimateRSI(prices, currentPrice);

      const ma20 = prices.length >= 20 ? sma(prices.slice(-20)) : sma(prices);

      const ma60 = prices.length >= 60 ? sma(prices.slice(-60)) : ma20;

      const macd = calculateMACD(prices) || {
        line: 0,
        signal: 0,
        histogram: 0,
      };
      const bollinger = calculateBollingerBands(prices) || {
        upper: currentPrice * 1.02,
        middle: currentPrice,
        lower: currentPrice * 0.98,
      };

      return {
        rsi: Math.max(0, Math.min(100, rsi || 50)),
        macd,
        ma20: ma20 || currentPrice,
        ma60: ma60 || ma20,
        bollinger,
      };
    } catch (error) {
      console.error(`기술적 지표 계산 실패 [${symbol}]:`, error);
      return {
        rsi: 50,
        macd: { line: 0, signal: 0, histogram: 0 },
        ma20: currentPrice,
        ma60: currentPrice,
        bollinger: {
          upper: currentPrice * 1.02,
          middle: currentPrice,
          lower: currentPrice * 0.98,
        },
      };
    }
  }

  // 🎯 RSI 추정 함수
  estimateRSI(prices, currentPrice) {
    if (prices.length < 2) return 50;

    const recentChanges = [];
    for (let i = 1; i < prices.length; i++) {
      const change = ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100;
      recentChanges.push(change);
    }

    const avgChange =
      recentChanges.reduce((sum, change) => sum + change, 0) /
      recentChanges.length;

    // 단순 추정: 강한 상승이면 70+, 강한 하락이면 30-, 나머지는 50 근처
    if (avgChange > 3) return Math.min(75, 50 + avgChange * 5);
    if (avgChange < -3) return Math.max(25, 50 + avgChange * 5);
    return 50;
  }

  // 🎯 평균 거래량 계산
  calculateAverageVolume(symbol) {
    const history = this.priceHistory.get(symbol) || [];
    if (history.length < 7) return null;

    const recentVolumes = history
      .slice(-7)
      .map((h) => h.volume)
      .filter((vol) => vol && vol > 0); // null/0 값 필터링

    if (recentVolumes.length === 0) return null;

    return (
      recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length
    );
  }

  // 🎯 상태 조회
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      subscriberCount: this.subscribers.size,
      cachedPrices: this.priceCache.size,
      cachedMarkets: this.marketCache.size,
      selectedCoins: this.selectedCoins.length,
      rateLimiter: {
        calls: this.rateLimiter.calls,
        limit: this.rateLimiter.limit,
        canCall: this.canMakeApiCall(),
      },
      priceHistorySize: this.priceHistory.size,
      totalHistoryRecords: Array.from(this.priceHistory.values()).reduce(
        (sum, history) => sum + history.length,
        0
      ),
    };
  }

  // 🎯 디버그 정보
  getDebugInfo(symbol) {
    const cached = this.priceCache.get(symbol);
    if (!cached) return null;

    return {
      symbol,
      hasData: !!cached.data,
      hasRSI: cached.data?.rsi !== undefined,
      hasMACD: cached.data?.macd !== undefined,
      hasMA20: cached.data?.ma20 !== undefined,
      priceHistoryLength: this.priceHistory.get(symbol)?.length || 0,
      lastUpdate: new Date(cached.timestamp).toLocaleTimeString(),
      dataAge: Date.now() - cached.timestamp,
    };
  }

  // 🎯 정리
  cleanup() {
    console.log("🧹 중앙 데이터 매니저 정리 시작...");

    // 인터벌 정리
    Object.values(this.updateIntervals).forEach((intervalId) => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    });

    // 캐시 정리
    this.priceCache.clear();
    this.marketCache.clear();
    this.subscribers.clear();
    this.priceHistory.clear();

    // 상태 초기화
    this.isInitialized = false;
    this.updateIntervals = {};
    this.selectedCoins = [];

    console.log("✅ 중앙 데이터 매니저 정리 완료");
  }
}

export const centralDataManager = new CentralDataManager();
export default centralDataManager;
