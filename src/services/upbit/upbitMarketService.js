// src/services/upbit/upbitMarketService.js - 상위 코인 선별 안정화 버전

class UpbitMarketService {
  constructor() {
    // 기본 데이터
    this.marketList = [];
    this.tickerData = new Map();
    this.lastUpdated = 0;
    this.lastTickerUpdate = 0;

    // 업데이트 간격
    this.updateInterval = 1000 * 60 * 60; // 1시간
    this.tickerInterval = 1000 * 60 * 3; // 3분

    // ✅ 코인 티어 분류 시스템 (개선)
    this.coinTiers = {
      TIER1: ["BTC", "ETH"], // 메이저 코인
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
      TIER3: [], // 나머지 - 동적으로 할당
    };

    // ✅ 필터링 기준 (개선)
    this.filterCriteria = {
      stableCoins: ["USDT", "USDC", "BUSD", "DAI", "TUSD", "USDD"],
      riskyCoins: ["LUNA", "UST", "LUNC", "USTC"],
      minVolume24h: 500000000, // 5억원 (완화)
      minMarketCapRank: 500,
      minPrice: 1,
      maxDailyChange: 100, // 100% (완화)
    };

    // ✅ 상위 코인 선별 기준 (안정화)
    this.topCoinsCriteria = {
      volumeWeight: 0.35, // 거래량 35%
      momentumWeight: 0.25, // 모멘텀 25%
      stabilityWeight: 0.25, // 안정성 25%
      trendWeight: 0.15, // 트렌드 15%
    };

    this.debugMode = process.env.NODE_ENV === "development";
    this.stats = {
      totalApiCalls: 0,
      lastResponse: null,
      avgResponseTime: 0,
      errorCount: 0,
    };
  }

  log(message, level = "info") {
    if (!this.debugMode && level === "debug") return;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp} [UpbitMarketService] ${message}`);
  }

  // ✅ API 호출 래퍼 (안정화)
  async apiCall(url, options = {}) {
    const startTime = Date.now();
    this.stats.totalApiCalls++;

    try {
      // ✅ 업비트 API URL을 프록시 URL로 변환
      let fetchUrl;

      if (url.includes("api.upbit.com/v1/market/all")) {
        fetchUrl = "/api/upbit-proxy?endpoint=market/all";
      } else if (url.includes("api.upbit.com/v1/ticker")) {
        // URL에서 markets 파라미터 추출
        const urlObj = new URL(url);
        const markets = urlObj.searchParams.get("markets");
        fetchUrl = `/api/upbit-proxy?endpoint=ticker&markets=${encodeURIComponent(markets)}`;
      } else {
        fetchUrl = url; // 다른 API는 그대로
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

  // ✅ 전체 마켓 리스트 가져오기 (개선)
  async getMarketList(forceUpdate = false) {
    const now = Date.now();

    // 캐시 확인
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
      this.log("업비트 마켓 리스트 업데이트 시작...");
      const markets = await this.apiCall("https://api.upbit.com/v1/market/all");

      // KRW 마켓만 필터링 및 정제
      this.marketList = markets
        .filter((market) => {
          return (
            market.market.startsWith("KRW-") &&
            market.market_warning !== "CAUTION"
          );
        })
        .map((market) => {
          const symbol = market.market.replace("KRW-", "");
          return {
            symbol,
            market: market.market,
            korean_name: market.korean_name || "",
            english_name: market.english_name || "",
            market_warning: market.market_warning || null,
            isActive: true,
            tier: this.assignTier(symbol),
            addedAt: new Date(),
          };
        });

      this.lastUpdated = now;
      this.log(`✅ 마켓 리스트 업데이트 완료: ${this.marketList.length}개`);
      return this.marketList;
    } catch (error) {
      this.log(`❌ 마켓 리스트 업데이트 실패: ${error.message}`, "error");
      return this.marketList; // 기존 캐시 반환
    }
  }

  assignTier(symbol) {
    if (this.coinTiers.TIER1.includes(symbol)) return "TIER1";
    if (this.coinTiers.TIER2.includes(symbol)) return "TIER2";
    return "TIER3";
  }

  // ✅ 실시간 티커 데이터 가져오기 (개선)
  async getTickerData(symbols = null) {
    const now = Date.now();

    // 최근 업데이트 확인 (너무 자주 호출 방지)
    if (
      this.lastTickerUpdate &&
      now - this.lastTickerUpdate < this.tickerInterval
    ) {
      this.log("티커 데이터 캐시 사용", "debug");
      return this.tickerData;
    }

    const marketList = await this.getMarketList();
    const marketCodes = symbols
      ? symbols.map((s) => `KRW-${s}`)
      : marketList.map((m) => m.market);

    // 100개씩 배치 처리 (API 제한)
    const batches = this.chunkArray(marketCodes, 100);
    const allTickerData = [];

    try {
      for (const batch of batches) {
        const markets = batch.join(",");
        const tickerData = await this.apiCall(
          `https://api.upbit.com/v1/ticker?markets=${markets}`
        );

        allTickerData.push(...tickerData);

        // API 호출 간격 (Rate Limit 고려)
        if (batches.length > 1) {
          await this.sleep(150); // 150ms 대기
        }
      }

      // 데이터 정제 및 저장
      for (const ticker of allTickerData) {
        const symbol = ticker.market.replace("KRW-", "");
        this.tickerData.set(symbol, {
          symbol,
          market: ticker.market,
          trade_price: ticker.trade_price,
          signed_change_rate: ticker.signed_change_rate,
          signed_change_price: ticker.signed_change_price,
          acc_trade_price_24h: ticker.acc_trade_price_24h,
          acc_trade_volume_24h: ticker.acc_trade_volume_24h,
          high_price: ticker.high_price,
          low_price: ticker.low_price,
          prev_closing_price: ticker.prev_closing_price,
          timestamp: now,

          // 추가 계산 필드
          volumeKrw24h: ticker.acc_trade_price_24h,
          priceChangePercent: ticker.signed_change_rate * 100,
          volatility: this.calculateVolatility(ticker),
          momentum: this.calculateMomentum(ticker),
        });
      }

      this.lastTickerUpdate = now;
      this.log(`✅ 티커 데이터 업데이트 완료: ${allTickerData.length}개`);
      return this.tickerData;
    } catch (error) {
      this.log(`❌ 티커 데이터 가져오기 실패: ${error.message}`, "error");
      return this.tickerData;
    }
  }

  // ✅ 투자 가능한 코인 필터링 (개선)
  async getInvestableCoins(testMode = false) {
    const marketList = await this.getMarketList();
    await this.getTickerData();

    const criteria = { ...this.filterCriteria };

    // ✅ 테스트 모드에서는 기준 완화
    if (testMode) {
      criteria.minVolume24h *= 0.3; // 거래량 기준 70% 완화
      criteria.minMarketCapRank = 1000; // 시총 순위 1000위까지 확대
      criteria.maxDailyChange = 200; // 변동률 제한 완화
      this.log("🧪 테스트 모드: 투자 가능 코인 기준 완화 적용");
    }

    const investableCoins = marketList.filter((coin) => {
      // 기본 제외 목록
      if (criteria.stableCoins.includes(coin.symbol)) return false;
      if (criteria.riskyCoins.includes(coin.symbol)) return false;

      // 티커 데이터 확인
      const tickerData = this.tickerData.get(coin.symbol);
      if (!tickerData) return false;

      // 거래량 기준
      if (tickerData.volumeKrw24h < criteria.minVolume24h) return false;

      // 가격 기준
      if (tickerData.trade_price < criteria.minPrice) return false;

      // 변동률 기준 (펌프 코인 제외)
      if (Math.abs(tickerData.priceChangePercent) > criteria.maxDailyChange)
        return false;

      // 투자유의 종목 제외
      if (coin.market_warning === "CAUTION") return false;

      return true;
    });

    this.log(
      `✅ 투자 가능 코인 ${investableCoins.length}개 선별 완료 ${testMode ? "(테스트)" : "(실전)"}`,
      "info"
    );

    return investableCoins.map((coin) => ({
      ...coin,
      tickerData: this.tickerData.get(coin.symbol),
    }));
  }

  // ✅ 상위 코인 선별 알고리즘 (완전 개선)
  async getTopCoins(limit = 20, testMode = false) {
    try {
      this.log(
        `🏆 상위 코인 선별 시작 (${testMode ? "테스트" : "실전"} 모드, ${limit}개)`,
        "info"
      );

      const investableCoins = await this.getInvestableCoins(testMode);

      if (investableCoins.length === 0) {
        this.log("⚠️ 투자 가능한 코인이 없습니다", "warning");
        return [];
      }

      // ✅ 복합 점수 계산 (안정화)
      const scoredCoins = investableCoins
        .map((coin) => {
          const ticker = coin.tickerData;
          if (!ticker) return null;

          try {
            // 각 점수 계산 (0-10 스케일)
            const volumeScore = this.calculateVolumeScore(ticker.volumeKrw24h);
            const momentumScore = this.calculateMomentumScore(ticker);
            const stabilityScore = this.calculateStabilityScore(ticker);
            const trendScore = this.calculateTrendScore(ticker);

            // 가중 평균 계산
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
              // 추가 메타데이터
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
        .filter(Boolean); // null 제거

      if (scoredCoins.length === 0) {
        this.log("⚠️ 점수 계산된 코인이 없습니다", "warning");
        return [];
      }

      // 점수순 정렬
      scoredCoins.sort((a, b) => b.scores.composite - a.scores.composite);

      // 순위 할당
      scoredCoins.forEach((coin, index) => {
        coin.ranking = {
          composite: index + 1,
          tier: coin.tier,
        };
      });

      // 상위 N개 선택
      const topCoins = scoredCoins.slice(0, limit);

      this.log(
        `🏆 상위 ${topCoins.length}개 코인 선별 완료: ${topCoins
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

  // ✅ 거래량 점수 계산 (개선)
  calculateVolumeScore(volume24h) {
    const logVolume = Math.log10(volume24h || 1);

    if (logVolume >= 12) return 10; // 1조원 이상
    if (logVolume >= 11.5) return 9; // 316조원 이상
    if (logVolume >= 11) return 8; // 100조원 이상
    if (logVolume >= 10.5) return 7; // 31조원 이상
    if (logVolume >= 10) return 6; // 10조원 이상
    if (logVolume >= 9.5) return 5; // 3조원 이상
    if (logVolume >= 9) return 4; // 1조원 이상
    if (logVolume >= 8.5) return 3; // 3천억원 이상
    if (logVolume >= 8) return 2; // 1천억원 이상
    return 1;
  }

  // ✅ 모멘텀 점수 계산 (개선)
  calculateMomentumScore(ticker) {
    const changePercent = Math.abs(ticker.priceChangePercent || 0);
    const volume = ticker.volumeKrw24h || 0;

    let momentumScore = 0;

    // 변동률 기여도
    if (changePercent >= 15) momentumScore += 4;
    else if (changePercent >= 10) momentumScore += 3;
    else if (changePercent >= 7) momentumScore += 2.5;
    else if (changePercent >= 5) momentumScore += 2;
    else if (changePercent >= 3) momentumScore += 1.5;
    else if (changePercent >= 1) momentumScore += 1;

    // 거래량 기여도
    const volumeBonus = Math.min(6, Math.log10(volume) - 8);
    momentumScore += Math.max(0, volumeBonus);

    return Math.min(10, momentumScore);
  }

  // ✅ 안정성 점수 계산 (개선)
  calculateStabilityScore(ticker) {
    const changePercent = Math.abs(ticker.priceChangePercent || 0);
    const price = ticker.trade_price || 0;

    let stabilityScore = 10;

    // 과도한 변동성 페널티
    if (changePercent > 20) stabilityScore -= 4;
    else if (changePercent > 15) stabilityScore -= 3;
    else if (changePercent > 10) stabilityScore -= 2;
    else if (changePercent > 7) stabilityScore -= 1;

    // 가격 안정성
    if (price < 10) stabilityScore -= 2;
    else if (price < 100) stabilityScore -= 1;

    return Math.max(0, stabilityScore);
  }

  // ✅ 트렌드 점수 계산 (개선)
  calculateTrendScore(ticker) {
    const changePercent = ticker.priceChangePercent || 0;
    const volume = ticker.volumeKrw24h || 0;

    let trendScore = 5; // 기본값

    // 상승 트렌드 보너스
    if (changePercent > 0) {
      if (changePercent >= 10) trendScore += 3;
      else if (changePercent >= 5) trendScore += 2;
      else if (changePercent >= 2) trendScore += 1;
      else trendScore += 0.5;
    } else {
      // 하락은 페널티
      if (changePercent <= -10) trendScore -= 3;
      else if (changePercent <= -5) trendScore -= 2;
      else if (changePercent <= -2) trendScore -= 1;
      else trendScore -= 0.5;
    }

    // 거래량 확인 (트렌드 신뢰성)
    if (volume > 5000000000) trendScore += 1; // 50억원 이상

    return Math.max(0, Math.min(10, trendScore));
  }

  // ✅ 변동성 계산
  calculateVolatility(ticker) {
    const high = ticker.high_price || 0;
    const low = ticker.low_price || 0;
    const price = ticker.trade_price || 0;

    if (price === 0) return 0;
    return ((high - low) / price) * 100;
  }

  // ✅ 모멘텀 계산
  calculateMomentum(ticker) {
    const volume = ticker.acc_trade_price_24h || 0;
    const changeRate = Math.abs(ticker.signed_change_rate || 0);
    return Math.log10(volume) * changeRate * 100;
  }

  // ✅ 시가총액 순위 추정
  estimateMarketCapRank(ticker) {
    const volume = ticker.volumeKrw24h || 0;
    const price = ticker.trade_price || 0;

    // 간단한 추정 로직 (거래량 기반)
    if (volume > 100000000000) return 10; // 1000억원 이상
    if (volume > 50000000000) return 20;
    if (volume > 10000000000) return 50;
    if (volume > 1000000000) return 100;
    return 200;
  }

  // ✅ 유틸리티 함수들
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

  // ✅ 서비스 상태 및 통계
  getServiceStats() {
    return {
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

  // ✅ 캐시 초기화
  clearCache() {
    this.marketList = [];
    this.tickerData.clear();
    this.lastUpdated = 0;
    this.lastTickerUpdate = 0;
    this.log("🧹 캐시 초기화 완료");
  }

  // ✅ 헬스 체크
  async healthCheck() {
    try {
      const startTime = Date.now();
      await this.apiCall("https://api.upbit.com/v1/market/all");
      const responseTime = Date.now() - startTime;

      return {
        status: "healthy",
        responseTime,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}

// ✅ 싱글톤 인스턴스 생성 및 익스포트
export const upbitMarketService = new UpbitMarketService();
export default upbitMarketService;

// 편의 함수들
export const getTopCoins =
  upbitMarketService.getTopCoins.bind(upbitMarketService);
export const getInvestableCoins =
  upbitMarketService.getInvestableCoins.bind(upbitMarketService);
export const getMarketList =
  upbitMarketService.getMarketList.bind(upbitMarketService);
