// src/services/upbit/upbitMarketService.js - 기존 코드 + KRW 마켓 우선 처리 통합

class UpbitMarketService {
  constructor() {
    // ✅ 기존 데이터 구조 유지
    this.marketList = [];
    this.tickerData = new Map();
    this.lastUpdated = 0;
    this.lastTickerUpdate = 0;

    // ✅ 기존 업데이트 간격 유지
    this.updateInterval = 1000 * 60 * 60; // 1시간
    this.tickerInterval = 1000 * 60 * 3; // 3분

    // 🎯 NEW: 마켓 타입 설정 추가 (기존 로직에 영향 없음)
    this.selectedMarketType = "KRW"; // 기본값: KRW
    this.supportedMarkets = ["KRW", "BTC", "USDT"];

    // ✅ 기존 코인 티어 분류 시스템 유지
    this.coinTiers = {
      TIER1: ["BTC", "ETH"],
      TIER2: [
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
        "HBAR",
        "UNI",
        "AAVE",
        "COMP",
      ],
      TIER3: [],
    };

    // ✅ 기존 필터링 기준 유지
    this.filterCriteria = {
      stableCoins: ["USDT", "USDC", "BUSD", "DAI", "TUSD", "USDD"],
      riskyCoins: ["LUNA", "UST", "LUNC", "USTC"],
      minVolume24h: 500000000, // 5억원
      minMarketCapRank: 500,
      minPrice: 1,
      maxDailyChange: 100, // 100%
    };

    // ✅ 기존 상위 코인 선별 기준 유지
    this.topCoinsCriteria = {
      volumeWeight: 0.35,
      momentumWeight: 0.25,
      stabilityWeight: 0.25,
      trendWeight: 0.15,
    };

    // ✅ 기존 디버그 및 통계 유지
    this.debugMode = process.env.NODE_ENV === "development";
    this.stats = {
      totalApiCalls: 0,
      lastResponse: null,
      avgResponseTime: 0,
      errorCount: 0,
    };
  }

  // ✅ 기존 로그 함수 유지
  log(message, level = "info") {
    if (!this.debugMode && level === "debug") return;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp} [UpbitMarketService] ${message}`);
  }

  // 🎯 NEW: 마켓 타입 관리 함수 추가 (기존 코드에 영향 없음)
  getMarketPrefix() {
    return this.selectedMarketType === "KRW"
      ? "KRW-"
      : this.selectedMarketType === "BTC"
        ? "BTC-"
        : "KRW-";
  }

  setMarketType(marketType) {
    if (!this.supportedMarkets.includes(marketType)) {
      console.warn(`지원하지 않는 마켓: ${marketType}`);
      return false;
    }

    if (this.selectedMarketType !== marketType) {
      this.log(`🔄 마켓 변경: ${this.selectedMarketType} → ${marketType}`);
      this.selectedMarketType = marketType;
      this.clearCache(); // 기존 함수 재사용
      return true;
    }
    return false;
  }

  // ✅ 기존 API 호출 래퍼 유지하되 약간 개선
  async apiCall(url, options = {}) {
    const startTime = Date.now();
    this.stats.totalApiCalls++;

    try {
      // ✅ 기존 프록시 URL 변환 로직 유지
      let fetchUrl;
      if (url.includes("api.upbit.com/v1/market/all")) {
        fetchUrl = "/api/upbit-proxy?endpoint=market/all";
      } else if (url.includes("api.upbit.com/v1/ticker")) {
        const urlObj = new URL(url);
        const markets = urlObj.searchParams.get("markets");
        fetchUrl = `/api/upbit-proxy?endpoint=ticker&markets=${encodeURIComponent(markets)}`;
      } else {
        fetchUrl = url;
      }

      const response = await fetch(fetchUrl, {
        ...options,
        headers: {
          Accept: "application/json",
          "User-Agent": "CryptoWise/1.0",
          ...options.headers,
        },
        timeout: 10000,
      });

      const responseTime = Date.now() - startTime;
      this.stats.avgResponseTime =
        (this.stats.avgResponseTime * (this.stats.totalApiCalls - 1) +
          responseTime) /
        this.stats.totalApiCalls;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.stats.lastResponse = Date.now();
      this.log(`API 호출 성공: ${fetchUrl} (${responseTime}ms)`, "debug");

      return data;
    } catch (error) {
      this.stats.errorCount++;
      this.log(`API 호출 실패: ${url} - ${error.message}`, "error");
      throw error;
    }
  }

  // ✅ 기존 마켓 리스트 가져오기 로직 유지 + 마켓 타입 적용
  async getMarketList(forceUpdate = false) {
    const now = Date.now();

    if (
      !forceUpdate &&
      this.marketList.length > 0 &&
      this.lastUpdated &&
      now - this.lastUpdated < this.updateInterval
    ) {
      this.log(`캐시된 마켓 리스트 반환: ${this.marketList.length}개`, "debug");
      return this.marketList;
    }

    try {
      this.log(`${this.selectedMarketType} 마켓 리스트 업데이트 시작...`);
      const markets = await this.apiCall("https://api.upbit.com/v1/market/all");

      // 🎯 선택된 마켓 타입으로 필터링 (기존 KRW 필터링 로직 확장)
      const marketPrefix = this.getMarketPrefix();

      this.marketList = markets
        .filter((market) => {
          return (
            market.market.startsWith(marketPrefix) &&
            market.market_warning !== "CAUTION"
          );
        })
        .map((market) => {
          const symbol = market.market.replace(marketPrefix, "");
          return {
            symbol,
            market: market.market,
            korean_name: market.korean_name || "",
            english_name: market.english_name || "",
            market_warning: market.market_warning || null,
            marketType: this.selectedMarketType, // NEW
            isActive: true,
            tier: this.assignTier(symbol),
            addedAt: new Date(),
          };
        });

      this.lastUpdated = now;
      this.log(
        `✅ ${this.selectedMarketType} 마켓 리스트 업데이트 완료: ${this.marketList.length}개`
      );
      return this.marketList;
    } catch (error) {
      this.log(`❌ 마켓 리스트 업데이트 실패: ${error.message}`, "error");
      return this.marketList;
    }
  }

  // ✅ 기존 티어 할당 로직 유지
  assignTier(symbol) {
    if (this.coinTiers.TIER1.includes(symbol)) return "TIER1";
    if (this.coinTiers.TIER2.includes(symbol)) return "TIER2";
    return "TIER3";
  }

  // ✅ 기존 티커 데이터 가져오기 로직 유지 + 배치 최적화
  async getTickerData(symbols = null) {
    const now = Date.now();

    if (
      this.lastTickerUpdate &&
      now - this.lastTickerUpdate < this.tickerInterval
    ) {
      this.log("티커 데이터 캐시 사용", "debug");
      return this.tickerData;
    }

    const marketList = await this.getMarketList();
    const marketCodes = symbols
      ? symbols.map((s) => `${this.getMarketPrefix()}${s}`)
      : marketList.map((m) => m.market);

    // 🎯 배치 크기 최적화 (100 → 50)
    const batches = this.chunkArray(marketCodes, 50);
    const allTickerData = [];

    try {
      for (const batch of batches) {
        const markets = batch.join(",");
        const tickerData = await this.apiCall(
          `https://api.upbit.com/v1/ticker?markets=${markets}`
        );
        allTickerData.push(...tickerData);

        // 🎯 배치 간격 최적화 (150ms → 300ms)
        if (batches.length > 1) {
          await this.sleep(300);
        }
      }

      // ✅ 기존 데이터 저장 로직 유지 + 마켓 타입 추가
      for (const ticker of allTickerData) {
        const symbol = ticker.market.replace(this.getMarketPrefix(), "");
        this.tickerData.set(symbol, {
          symbol,
          market: ticker.market,
          marketType: this.selectedMarketType, // NEW
          trade_price: ticker.trade_price,
          signed_change_rate: ticker.signed_change_rate,
          signed_change_price: ticker.signed_change_price,
          acc_trade_price_24h: ticker.acc_trade_price_24h,
          acc_trade_volume_24h: ticker.acc_trade_volume_24h,
          high_price: ticker.high_price,
          low_price: ticker.low_price,
          prev_closing_price: ticker.prev_closing_price,
          timestamp: now,
          volumeKrw24h: ticker.acc_trade_price_24h,
          priceChangePercent: ticker.signed_change_rate * 100,
          volatility: this.calculateVolatility(ticker),
          momentum: this.calculateMomentum(ticker),
        });
      }

      this.lastTickerUpdate = now;
      this.log(
        `✅ ${this.selectedMarketType} 티커 데이터 업데이트 완료: ${allTickerData.length}개`
      );
      return this.tickerData;
    } catch (error) {
      this.log(`❌ 티커 데이터 가져오기 실패: ${error.message}`, "error");
      return this.tickerData;
    }
  }

  // ✅ 기존 투자 가능한 코인 필터링 로직 완전 유지
  async getInvestableCoins(testMode = false) {
    const marketList = await this.getMarketList();
    await this.getTickerData();

    const criteria = { ...this.filterCriteria };

    if (testMode) {
      criteria.minVolume24h *= 0.3;
      criteria.minMarketCapRank = 1000;
      criteria.maxDailyChange = 200;
      this.log(
        `🧪 ${this.selectedMarketType} 테스트 모드: 투자 가능 코인 기준 완화 적용`
      );
    }

    const investableCoins = marketList.filter((coin) => {
      if (criteria.stableCoins.includes(coin.symbol)) return false;
      if (criteria.riskyCoins.includes(coin.symbol)) return false;

      const tickerData = this.tickerData.get(coin.symbol);
      if (!tickerData) return false;

      if (tickerData.volumeKrw24h < criteria.minVolume24h) return false;
      if (tickerData.trade_price < criteria.minPrice) return false;
      if (Math.abs(tickerData.priceChangePercent) > criteria.maxDailyChange)
        return false;
      if (coin.market_warning === "CAUTION") return false;

      return true;
    });

    this.log(
      `✅ ${this.selectedMarketType} 투자 가능 코인 ${investableCoins.length}개 선별 완료 ${testMode ? "(테스트)" : "(실전)"}`,
      "info"
    );

    return investableCoins.map((coin) => ({
      ...coin,
      tickerData: this.tickerData.get(coin.symbol),
    }));
  }

  // ✅ 기존 상위 코인 선별 알고리즘 완전 유지
  async getTopCoins(limit = 20, testMode = false) {
    try {
      this.log(
        `🏆 ${this.selectedMarketType} 상위 코인 선별 시작 (${testMode ? "테스트" : "실전"} 모드, ${limit}개)`,
        "info"
      );

      const investableCoins = await this.getInvestableCoins(testMode);
      if (investableCoins.length === 0) {
        this.log("⚠️ 투자 가능한 코인이 없습니다", "warning");
        return [];
      }

      const scoredCoins = investableCoins
        .map((coin) => {
          const ticker = coin.tickerData;
          if (!ticker) return null;

          try {
            const volumeScore = this.calculateVolumeScore(ticker.volumeKrw24h);
            const momentumScore = this.calculateMomentumScore(ticker);
            const stabilityScore = this.calculateStabilityScore(ticker);
            const trendScore = this.calculateTrendScore(ticker);

            const compositeScore =
              volumeScore * this.topCoinsCriteria.volumeWeight +
              momentumScore * this.topCoinsCriteria.momentumWeight +
              stabilityScore * this.topCoinsCriteria.stabilityWeight +
              trendScore * this.topCoinsCriteria.trendWeight;

            return {
              ...coin,
              scores: {
                volume: Number(volumeScore.toFixed(2)),
                momentum: Number(momentumScore.toFixed(2)),
                stability: Number(stabilityScore.toFixed(2)),
                trend: Number(trendScore.toFixed(2)),
                composite: Number(compositeScore.toFixed(2)),
              },
              price: ticker.trade_price,
              change_percent: ticker.priceChangePercent,
              volume_krw_24h: ticker.volumeKrw24h,
              market_cap_rank: this.estimateMarketCapRank(ticker),
            };
          } catch (error) {
            this.log(
              `점수 계산 실패 (${coin.symbol}): ${error.message}`,
              "debug"
            );
            return null;
          }
        })
        .filter(Boolean);

      if (scoredCoins.length === 0) {
        this.log("⚠️ 점수 계산된 코인이 없습니다", "warning");
        return [];
      }

      scoredCoins.sort((a, b) => b.scores.composite - a.scores.composite);

      scoredCoins.forEach((coin, index) => {
        coin.ranking = {
          composite: index + 1,
          tier: coin.tier,
        };
      });

      const topCoins = scoredCoins.slice(0, limit);

      this.log(
        `🏆 ${this.selectedMarketType} 상위 ${topCoins.length}개 코인 선별 완료: ${topCoins
          .slice(0, 5)
          .map((c) => `${c.symbol}(${c.scores.composite})`)
          .join(", ")}`,
        "success"
      );

      return topCoins;
    } catch (error) {
      this.log(`❌ 상위 코인 선별 실패: ${error.message}`, "error");
      return [];
    }
  }

  // ✅ 기존 점수 계산 함수들 모두 유지
  calculateVolumeScore(volume24h) {
    const logVolume = Math.log10(volume24h || 1);
    if (logVolume >= 12) return 10;
    if (logVolume >= 11.5) return 9;
    if (logVolume >= 11) return 8;
    if (logVolume >= 10.5) return 7;
    if (logVolume >= 10) return 6;
    if (logVolume >= 9.5) return 5;
    if (logVolume >= 9) return 4;
    if (logVolume >= 8.5) return 3;
    if (logVolume >= 8) return 2;
    return 1;
  }

  calculateMomentumScore(ticker) {
    const changePercent = Math.abs(ticker.priceChangePercent || 0);
    const volume = ticker.volumeKrw24h || 0;
    let momentumScore = 0;

    if (changePercent >= 15) momentumScore += 4;
    else if (changePercent >= 10) momentumScore += 3;
    else if (changePercent >= 7) momentumScore += 2.5;
    else if (changePercent >= 5) momentumScore += 2;
    else if (changePercent >= 3) momentumScore += 1.5;
    else if (changePercent >= 1) momentumScore += 1;

    const volumeBonus = Math.min(6, Math.log10(volume) - 8);
    momentumScore += Math.max(0, volumeBonus);

    return Math.min(10, momentumScore);
  }

  calculateStabilityScore(ticker) {
    const changePercent = Math.abs(ticker.priceChangePercent || 0);
    const price = ticker.trade_price || 0;
    let stabilityScore = 10;

    if (changePercent > 20) stabilityScore -= 4;
    else if (changePercent > 15) stabilityScore -= 3;
    else if (changePercent > 10) stabilityScore -= 2;
    else if (changePercent > 7) stabilityScore -= 1;

    if (price < 10) stabilityScore -= 2;
    else if (price < 100) stabilityScore -= 1;

    return Math.max(0, stabilityScore);
  }

  calculateTrendScore(ticker) {
    const changePercent = ticker.priceChangePercent || 0;
    const volume = ticker.volumeKrw24h || 0;
    let trendScore = 5;

    if (changePercent > 0) {
      if (changePercent >= 10) trendScore += 3;
      else if (changePercent >= 5) trendScore += 2;
      else if (changePercent >= 2) trendScore += 1;
      else trendScore += 0.5;
    } else {
      if (changePercent <= -10) trendScore -= 3;
      else if (changePercent <= -5) trendScore -= 2;
      else if (changePercent <= -2) trendScore -= 1;
      else trendScore -= 0.5;
    }

    if (volume > 5000000000) trendScore += 1;

    return Math.max(0, Math.min(10, trendScore));
  }

  // ✅ 기존 유틸리티 함수들 모두 유지
  calculateVolatility(ticker) {
    const high = ticker.high_price || 0;
    const low = ticker.low_price || 0;
    const price = ticker.trade_price || 0;
    if (price === 0) return 0;
    return ((high - low) / price) * 100;
  }

  calculateMomentum(ticker) {
    const volume = ticker.acc_trade_price_24h || 0;
    const changeRate = Math.abs(ticker.signed_change_rate || 0);
    return Math.log10(volume) * changeRate * 100;
  }

  estimateMarketCapRank(ticker) {
    const volume = ticker.volumeKrw24h || 0;
    if (volume > 100000000000) return 10;
    if (volume > 50000000000) return 20;
    if (volume > 10000000000) return 50;
    if (volume > 1000000000) return 100;
    return 200;
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ✅ 기존 서비스 상태 함수 유지 + 마켓 정보 추가
  getServiceStats() {
    return {
      currentMarket: this.selectedMarketType, // NEW
      supportedMarkets: this.supportedMarkets, // NEW
      marketList: {
        total: this.marketList.length,
        lastUpdated: new Date(this.lastUpdated),
      },
      tickerData: {
        total: this.tickerData.size,
        lastUpdated: new Date(this.lastTickerUpdate),
      },
      performance: {
        totalApiCalls: this.stats.totalApiCalls,
        avgResponseTime: Math.round(this.stats.avgResponseTime),
        errorCount: this.stats.errorCount,
        lastResponse: new Date(this.stats.lastResponse),
      },
      tiers: {
        TIER1: this.coinTiers.TIER1.length,
        TIER2: this.coinTiers.TIER2.length,
        TIER3:
          this.marketList.length -
          this.coinTiers.TIER1.length -
          this.coinTiers.TIER2.length,
      },
    };
  }

  // ✅ 기존 캐시 초기화 함수 유지
  clearCache() {
    this.marketList = [];
    this.tickerData.clear();
    this.lastUpdated = 0;
    this.lastTickerUpdate = 0;
    this.log(`🧹 ${this.selectedMarketType} 캐시 초기화 완료`);
  }

  // ✅ 기존 헬스 체크 함수 유지
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.apiCall("https://api.upbit.com/v1/market/all");
      const responseTime = Date.now() - startTime;

      return {
        status: "healthy",
        market: this.selectedMarketType, // NEW
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        market: this.selectedMarketType, // NEW
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}

// ✅ 기존 싱글톤 및 익스포트 유지
export const upbitMarketService = new UpbitMarketService();
export default upbitMarketService;

// ✅ 기존 편의 함수들 유지
export const getTopCoins =
  upbitMarketService.getTopCoins.bind(upbitMarketService);
export const getInvestableCoins =
  upbitMarketService.getInvestableCoins.bind(upbitMarketService);
export const getMarketList =
  upbitMarketService.getMarketList.bind(upbitMarketService);
