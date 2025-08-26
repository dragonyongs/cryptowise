// src/services/data/centralDataManager.js - 완전 버전

import { upbitMarketService } from "../upbit/upbitMarketService.js";
import { AdaptiveRateLimiter } from "./adaptiveRateLimiter.js";
import { ApiCircuitBreaker } from "../patterns/circuitBreaker.js";
import { ExponentialBackoffStrategy } from "../strategies/backoffStrategy.js";
import { ApiHealthMonitor } from "../monitoring/apiHealthMonitor.js";
import {
  sma,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
} from "../analysis/technicalAnalysis.js";

class CentralDataManager {
  constructor() {
    // 🎯 전문가급 시스템 통합
    this.rateLimiter = new AdaptiveRateLimiter();
    this.circuitBreaker = new ApiCircuitBreaker();
    this.backoffStrategy = new ExponentialBackoffStrategy();
    this.healthMonitor = new ApiHealthMonitor();

    // 🎯 데이터 관리
    this.priceCache = new Map();
    this.marketCache = new Map();
    this.lastUpdate = new Map();
    this.subscribers = new Map();
    this.priceHistory = new Map();
    this.maxHistoryLength = 100;

    // 🎯 계층적 업데이트 전략 (하드코딩 제거)
    this.updateStrategies = {
      critical: {
        coins: [], // 🔄 하드코딩 제거됨
        interval: 10000, // 10초
        priority: 1,
        maxRetries: 3,
      },
      important: {
        coins: [],
        interval: 30000, // 30초
        priority: 2,
        maxRetries: 2,
      },
      background: {
        coins: [],
        interval: 120000, // 2분
        priority: 3,
        maxRetries: 1,
      },
    };

    // 🎯 시스템 상태
    this.isInitialized = false;
    this.updateIntervals = {};
    this.selectedCoins = [];
    this.systemHealth = "healthy";
    this.currentUserId = null;

    // 🎯 5분마다 자동 최적화
    setInterval(() => this.optimizePerformance(), 300000);
  }

  // 🎯 스토어에서 코인 목록 가져오기
  getCoinsFromStores(userId) {
    try {
      // 포트폴리오 스토어에서 보유 코인 가져오기
      const portfolioCoins = this.getPortfolioCoins(userId);

      // 코인 스토어에서 선택된 코인 가져오기
      const selectedCoins = this.getSelectedCoins(userId);

      return { portfolioCoins, selectedCoins };
    } catch (error) {
      console.error("스토어에서 코인 목록 가져오기 실패:", error);
      return { portfolioCoins: [], selectedCoins: [] };
    }
  }

  // 🎯 포트폴리오 스토어에서 보유 코인
  getPortfolioCoins(userId) {
    try {
      // 실제 구현시 portfolioStore import 필요
      if (typeof window !== "undefined" && window.cryptoStore) {
        const state = window.cryptoStore.getState();
        return Object.keys(state.portfolio?.coins || {});
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  // 🎯 코인 스토어에서 선택된 코인
  getSelectedCoins(userId) {
    try {
      // 실제 구현시 coinStore import 필요
      if (typeof window !== "undefined" && window.cryptoStore) {
        const state = window.cryptoStore.getState();
        return state.selectedCoins?.map((c) => c.symbol) || [];
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  // 🎯 코인 분류 (스토어 기반으로 변경) - 에러 수정
  categorizeCoins(selectedCoins, userId = null) {
    // ✅ 안전한 배열 변환
    const safeSelectedCoins = Array.isArray(selectedCoins) ? selectedCoins : [];

    // 스토어에서 실제 코인 목록 가져오기
    const { portfolioCoins, selectedCoins: storeSelectedCoins } =
      this.getCoinsFromStores(userId);

    // 전체 코인 목록 결합
    const allCoins = [
      ...new Set([
        ...safeSelectedCoins,
        ...storeSelectedCoins,
        ...portfolioCoins,
      ]),
    ].filter(Boolean);

    console.log("📊 코인 분류 입력:", {
      safeSelectedCoins,
      storeSelectedCoins,
      portfolioCoins,
      allCoins,
    });

    // 🎯 우선순위 분류 (하드코딩 완전 제거)
    // Critical: 포트폴리오 보유 코인 (실제 돈이 걸린 코인)
    this.updateStrategies.critical.coins =
      portfolioCoins.length > 0 ? portfolioCoins : allCoins.slice(0, 2); // 포트폴리오가 비어있으면 상위 2개

    // Important: 사용자 선택 코인 (포트폴리오 제외)
    this.updateStrategies.important.coins = allCoins.filter(
      (coin) => !this.updateStrategies.critical.coins.includes(coin)
    );

    this.selectedCoins = allCoins;

    console.log(`📊 스토어 기반 코인 분류:`);
    console.log(
      `  Critical: ${this.updateStrategies.critical.coins.join(", ")}`
    );
    console.log(
      `  Important: ${this.updateStrategies.important.coins.join(", ")}`
    );
  }

  // 🎯 초기화 (사용자 ID 추가)
  async initialize(selectedCoins = [], userId = null) {
    if (this.isInitialized && this.currentUserId === userId) {
      console.log("🔄 중앙 데이터 매니저 이미 초기화됨");
      return;
    }

    console.log("🚀 스토어 기반 중앙 데이터 매니저 초기화 시작");
    this.currentUserId = userId;

    try {
      // 🎯 스토어 기반 코인 분류
      this.categorizeCoins(selectedCoins, userId);

      // 초기 데이터 로드
      await this.loadInitialData();

      // 스케줄러 시작
      this.startSmartScheduler();

      this.isInitialized = true;
      console.log("✅ 스토어 기반 중앙 데이터 매니저 초기화 완료");
    } catch (error) {
      console.error("❌ 초기화 실패:", error);
      throw error;
    }
  }

  // 🎯 스토어 변경 감지 및 자동 갱신
  refreshFromStores() {
    if (!this.isInitialized || !this.currentUserId) return;

    console.log("🔄 스토어 변경 감지 - 코인 목록 갱신");

    // 스토어에서 최신 코인 목록 가져와서 재분류
    this.categorizeCoins(this.selectedCoins, this.currentUserId);

    // 스케줄러 재시작
    this.stopAllSchedulers();
    this.startSmartScheduler();

    // 구독자들에게 알림
    this.notifyAllSubscribers("coins_updated");
  }

  // 🎯 스케줄러 정지
  stopAllSchedulers() {
    Object.values(this.updateIntervals).forEach((intervalId) => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    });
    this.updateIntervals = {};
  }

  // 🎯 초기 데이터 로드
  async loadInitialData() {
    // 마켓 데이터 로드
    await this.executeSmartApiCall(
      () => this.loadMarketData(),
      "market_load",
      "critical"
    );

    // 가격 데이터 로드
    if (this.selectedCoins.length > 0) {
      await this.executeSmartApiCall(
        () => this.loadPriceData(this.selectedCoins),
        "price_load",
        "critical"
      );
    }
  }

  // 🎯 스마트 API 실행 (모든 전략 통합)
  async executeSmartApiCall(operation, operationId, priority = "background") {
    return await this.circuitBreaker.execute(async () => {
      return await this.backoffStrategy.executeWithBackoff(
        async () => {
          const startTime = Date.now();

          // Rate Limiter 체크
          if (!this.rateLimiter.canMakeCall(priority)) {
            const delay = this.rateLimiter.calculateOptimalInterval();
            throw new Error(`RATE_LIMIT: ${delay}ms 대기 필요`);
          }

          try {
            const result = await operation();
            const responseTime = Date.now() - startTime;

            // 성공 기록
            this.rateLimiter.recordCall(true, responseTime);
            this.healthMonitor.updateMetrics({
              success: true,
              responseTime,
              timestamp: Date.now(),
            });
            return result;
          } catch (error) {
            const responseTime = Date.now() - startTime;

            // 실패 기록
            this.rateLimiter.recordCall(false, responseTime);
            this.healthMonitor.updateMetrics({
              success: false,
              responseTime,
              timestamp: Date.now(),
            });
            throw error;
          }
        },
        operationId,
        this.updateStrategies[priority]?.maxRetries || 1
      );
    });
  }

  // 🎯 스마트 스케줄러
  startSmartScheduler() {
    // Critical 코인 스케줄러
    if (this.updateStrategies.critical.coins.length > 0) {
      this.updateIntervals.critical = setInterval(() => {
        this.updateCoinsData("critical");
      }, this.updateStrategies.critical.interval);
    }

    // Important 코인 스케줄러
    if (this.updateStrategies.important.coins.length > 0) {
      this.updateIntervals.important = setInterval(() => {
        this.updateCoinsData("important");
      }, this.updateStrategies.important.interval);
    }

    // Background 업데이트
    this.updateIntervals.markets = setInterval(() => {
      this.updateMarketData();
    }, 300000); // 5분

    console.log("⏰ 스마트 스케줄러 시작");
  }

  // 🎯 우선순위별 코인 데이터 업데이트
  async updateCoinsData(priority) {
    const strategy = this.updateStrategies[priority];
    if (!strategy || strategy.coins.length === 0) return;

    try {
      console.log(`🔄 ${priority} 코인 업데이트: ${strategy.coins.join(", ")}`);

      const tickerData = await this.executeSmartApiCall(
        () => upbitMarketService.getTickerData(strategy.coins),
        `update_${priority}`,
        priority
      );

      // 데이터 처리
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

        // 캐시 저장
        this.priceCache.set(symbol, {
          data: {
            ...ticker,
            ...indicators,
            signed_change_rate: ticker.signed_change_rate,
            avgVolume: this.calculateAverageVolume(symbol),
          },
          timestamp: Date.now(),
          priority,
        });
      });

      // 구독자 알림
      this.notifyAllSubscribers("prices", priority);
    } catch (error) {
      console.error(`❌ ${priority} 코인 업데이트 실패:`, error.message);
    }
  }

  // 🎯 마켓 데이터 업데이트
  async updateMarketData() {
    try {
      console.log("🔄 마켓 데이터 업데이트");
      const marketList = await this.executeSmartApiCall(
        () => upbitMarketService.getMarketList(true),
        "market_update",
        "background"
      );

      // 마켓 캐시 업데이트
      marketList.forEach((market) => {
        this.marketCache.set(market.symbol, {
          data: market,
          timestamp: Date.now(),
        });
      });

      this.notifyAllSubscribers("markets");
    } catch (error) {
      console.error("❌ 마켓 데이터 업데이트 실패:", error.message);
    }
  }

  // 🎯 성능 기반 자동 최적화
  async optimizePerformance() {
    const healthStatus = this.healthMonitor.assessHealth();
    const strategy = this.healthMonitor.getRecommendedStrategy(healthStatus);

    console.log(`🎯 성능 최적화 실행: ${healthStatus} 상태`);

    // Rate Limiter 조정
    this.rateLimiter.adjustLimits();

    // 업데이트 간격 조정
    if (healthStatus === "critical") {
      this.adjustUpdateIntervals(2.0); // 간격 2배 증가
    } else if (healthStatus === "warning") {
      this.adjustUpdateIntervals(1.5); // 간격 1.5배 증가
    } else {
      this.adjustUpdateIntervals(1.0); // 정상
    }

    this.systemHealth = healthStatus;
    console.log(`✅ 최적화 완료: ${JSON.stringify(strategy)}`);
  }

  // 🎯 업데이트 간격 조정
  adjustUpdateIntervals(multiplier) {
    Object.keys(this.updateStrategies).forEach((priority) => {
      const newInterval = Math.round(
        this.updateStrategies[priority].interval * multiplier
      );
      this.updateStrategies[priority].interval = Math.min(newInterval, 300000); // 최대 5분
    });
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

    if (history.length > this.maxHistoryLength) {
      history.shift();
    }
  }

  // 🎯 기술적 지표 계산
  calculateTechnicalIndicators(symbol, currentPrice) {
    const history = this.priceHistory.get(symbol) || [];
    if (history.length < 2) {
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

    const prices = history.map((h) => h.price);
    try {
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

  // 🎯 RSI 추정
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
      .filter((vol) => vol && vol > 0);

    if (recentVolumes.length === 0) return null;

    return (
      recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length
    );
  }

  // 🎯 마켓 데이터 로드
  async loadMarketData() {
    console.log("📊 마켓 데이터 로드");
    const marketList = await upbitMarketService.getMarketList(true);
    marketList.forEach((market) => {
      this.marketCache.set(market.symbol, {
        data: market,
        timestamp: Date.now(),
      });
    });
    return marketList;
  }

  // 🎯 가격 데이터 로드
  async loadPriceData(symbols) {
    console.log("💰 가격 데이터 로드:", symbols);
    const tickerData = await upbitMarketService.getTickerData(symbols);
    Array.from(tickerData.values()).forEach((ticker) => {
      const symbol = ticker.market.replace("KRW-", "");
      this.priceCache.set(symbol, {
        data: ticker,
        timestamp: Date.now(),
      });
    });
    return tickerData;
  }

  // 🎯 구독 관리
  subscribe(serviceId, callback, dataTypes = ["prices"]) {
    if (!this.subscribers.has(serviceId)) {
      this.subscribers.set(serviceId, { callback, dataTypes });
      console.log(`📡 ${serviceId} 구독 등록:`, dataTypes);
    }

    this.notifySubscriber(serviceId);
    return () => this.unsubscribe(serviceId);
  }

  unsubscribe(serviceId) {
    const removed = this.subscribers.delete(serviceId);
    if (removed) {
      console.log(`📡 ${serviceId} 구독 해제`);
    }
    return removed;
  }

  // 🎯 구독자 알림
  notifyAllSubscribers(dataType, priority = null) {
    this.subscribers.forEach((subscriber, serviceId) => {
      if (subscriber.dataTypes.includes(dataType)) {
        this.notifySubscriber(serviceId, priority);
      }
    });
  }

  notifySubscriber(serviceId, priority = null) {
    const subscriber = this.subscribers.get(serviceId);
    if (!subscriber) return;

    const data = {
      prices: Object.fromEntries(this.priceCache),
      markets: Object.fromEntries(this.marketCache),
      timestamp: Date.now(),
      priority,
      systemHealth: this.systemHealth,
    };

    try {
      subscriber.callback(data);
    } catch (error) {
      console.error(`구독자 ${serviceId} 알림 실패:`, error);
    }
  }

  // 🎯 캐시된 데이터 조회
  getCachedPrice(symbol) {
    const cached = this.priceCache.get(symbol);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > 300000) return null; // 5분 이상 된 데이터는 무효

    return cached.data;
  }

  getCachedPrices(symbols) {
    const result = new Map();
    symbols.forEach((symbol) => {
      const data = this.getCachedPrice(symbol);
      if (data) result.set(symbol, data);
    });
    return result;
  }

  // 🎯 코인 목록 업데이트
  updateWatchedCoins(newCoins) {
    this.categorizeCoins([...new Set([...this.selectedCoins, ...newCoins])]);
    console.log(`👀 감시 코인 업데이트: ${this.selectedCoins.length}개`);
  }

  // 🎯 통합 상태 조회
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      systemHealth: this.systemHealth,
      selectedCoins: this.selectedCoins.length,
      subscriberCount: this.subscribers.size,
      cachedPrices: this.priceCache.size,
      cachedMarkets: this.marketCache.size,
      priceHistorySize: this.priceHistory.size,
      // 각 시스템 상태
      rateLimiter: this.rateLimiter.getStatus(),
      circuitBreaker: this.circuitBreaker.getStatus(),
      healthMonitor: this.healthMonitor.getStatus(),
      strategies: {
        critical: {
          coins: this.updateStrategies.critical.coins.length,
          interval: this.updateStrategies.critical.interval,
        },
        important: {
          coins: this.updateStrategies.important.coins.length,
          interval: this.updateStrategies.important.interval,
        },
      },
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
      priority: cached.priority || "unknown",
    };
  }

  // 🎯 정리
  cleanup() {
    console.log("🧹 전문가급 중앙 데이터 매니저 정리 시작...");

    // 인터벌 정리
    this.stopAllSchedulers();

    // 캐시 정리
    this.priceCache.clear();
    this.marketCache.clear();
    this.subscribers.clear();
    this.priceHistory.clear();

    // 시스템 리셋
    this.circuitBreaker.reset();

    // 상태 초기화
    this.isInitialized = false;
    this.currentUserId = null;
    this.selectedCoins = [];

    console.log("✅ 전문가급 중앙 데이터 매니저 정리 완료");
  }
}

export const centralDataManager = new CentralDataManager();
export default centralDataManager;
