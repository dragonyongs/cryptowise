// src/services/data/marketDataService.js
import { coinImageManager } from "../../utils/imageUtils";

export class MarketDataService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.rateLimiter = new Map();

    // 초기 캐시 설정
    this.initializeCache();
  }

  // 🔧 초기 캐시 설정
  initializeCache() {
    // 업비트 마켓 데이터를 캐시에 설정할 수 있도록 준비
    this.cache.set("upbit_markets", new Map());
    this.cache.set("all_coins_1_250", []);
  }

  // ✅ 누락된 searchInCache 메서드 구현
  searchInCache(query, limit = 30) {
    const queryLower = query.toLowerCase();
    const results = [];

    // 모든 캐시된 데이터에서 검색
    this.cache.forEach((data, key) => {
      if (key.startsWith("all_coins_") && Array.isArray(data)) {
        data.forEach((coin) => {
          const symbol = coin.symbol?.toLowerCase() || "";
          const name = coin.name?.toLowerCase() || "";
          const id = coin.id?.toLowerCase() || "";

          if (
            symbol.includes(queryLower) ||
            name.includes(queryLower) ||
            id.includes(queryLower)
          ) {
            results.push({
              ...coin,
              source: "cache",
              image_url: coin.image || coin.image_url,
              search_score: this.calculateSearchScore(coin, queryLower),
            });
          }
        });
      }
    });

    return results
      .sort((a, b) => (b.search_score || 0) - (a.search_score || 0))
      .slice(0, limit);
  }

  // ✅ 검색 점수 계산 메서드
  calculateSearchScore(coin, query) {
    let score = 0;
    const symbol = coin.symbol?.toLowerCase() || "";
    const name = coin.name?.toLowerCase() || "";
    const id = coin.id?.toLowerCase() || "";

    // 정확 매치 보너스
    if (symbol === query) score += 1000;
    else if (name === query) score += 900;
    else if (id === query) score += 850;
    // 시작 매치 보너스
    else if (symbol.startsWith(query)) score += 800;
    else if (name.startsWith(query)) score += 700;
    // 포함 매치
    else if (symbol.includes(query)) score += 600;
    else if (name.includes(query)) score += 500;

    // 시가총액 순위 보너스
    if (coin.market_cap_rank) {
      score += Math.max(0, 200 - coin.market_cap_rank);
    }

    // 업비트 지원 보너스
    if (coin.upbit_supported) score += 100;

    return score;
  }

  // ✅ 실시간 검색 메서드 (완전한 구현)
  async searchCoinsRealtime(query, limit = 30) {
    if (!query.trim()) return [];

    console.log("🔍 실시간 마켓 검색 시작:", query);

    try {
      // 1. 캐시된 데이터에서 먼저 검색
      const cachedResults = this.searchInCache(query, limit);

      // 2. API에서 추가 검색 (병렬 처리)
      const [coinGeckoResults] = await Promise.allSettled([
        this.searchCoinGecko(query, Math.max(10, limit - cachedResults.length)),
      ]);

      // 3. 결과 병합 및 중복 제거
      const allResults = [
        ...cachedResults,
        ...(coinGeckoResults.status === "fulfilled"
          ? coinGeckoResults.value
          : []),
      ];

      return this.deduplicateAndRank(allResults, query).slice(0, limit);
    } catch (error) {
      console.error("실시간 검색 실패:", error);
      // 오류 시 캐시된 결과만 반환
      return this.searchInCache(query, limit);
    }
  }

  // ✅ CoinGecko 검색 API
  async searchCoinGecko(query, limit = 10) {
    if (this.isRateLimited("coingecko_search")) {
      console.log("CoinGecko 검색 API 제한 중, 스킵");
      return [];
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8초 타임아웃

      const response = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
        {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          this.setRateLimit("coingecko_search", 60000); // 1분 제한
        }
        throw new Error(`CoinGecko 검색 API 오류: ${response.status}`);
      }

      const data = await response.json();

      if (!data.coins || !Array.isArray(data.coins)) {
        return [];
      }

      return data.coins.slice(0, limit).map((coin) => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image_url: coin.large || coin.thumb,
        image_urls: coinImageManager
          ? coinImageManager.generateImageUrls(coin)
          : [coin.large, coin.thumb].filter(Boolean),
        market_cap_rank: coin.market_cap_rank,
        source: "coingecko_search",
        search_score: this.calculateSearchScore(coin, query.toLowerCase()),
      }));
    } catch (error) {
      if (error.name === "AbortError") {
        console.warn("CoinGecko 검색 타임아웃");
      } else {
        console.error("CoinGecko 검색 실패:", error);
      }
      return [];
    }
  }

  // ✅ 중복 제거 및 순위 매기기
  deduplicateAndRank(results, query) {
    const uniqueResults = new Map();
    const queryLower = query.toLowerCase();

    results.forEach((coin) => {
      const key = coin.id || `${coin.symbol}_${coin.name}`.toLowerCase();

      // 중복 제거 - 더 높은 점수의 결과를 유지
      if (uniqueResults.has(key)) {
        const existing = uniqueResults.get(key);
        if ((coin.search_score || 0) > (existing.search_score || 0)) {
          uniqueResults.set(key, coin);
        }
      } else {
        uniqueResults.set(key, coin);
      }
    });

    return Array.from(uniqueResults.values()).sort(
      (a, b) => (b.search_score || 0) - (a.search_score || 0)
    );
  }

  // ✅ Rate limiting 관리
  isRateLimited(service) {
    const limit = this.rateLimiter.get(service);
    return limit && Date.now() < limit;
  }

  setRateLimit(service, duration) {
    this.rateLimiter.set(service, Date.now() + duration);
    console.log(`⏰ ${service} API 제한 설정: ${duration}ms`);
  }

  // ✅ 업비트 마켓 데이터 캐시 설정 (외부에서 호출)
  setUpbitMarketsCache(upbitMarkets) {
    this.cache.set("upbit_markets", upbitMarkets);
    console.log(
      "✅ 업비트 마켓 데이터 캐시 업데이트:",
      upbitMarkets.size,
      "개"
    );
  }

  // ✅ 코인 데이터 캐시 설정 (외부에서 호출)
  setCachedCoins(coins) {
    this.cache.set("all_coins_1_250", coins);
    console.log("✅ 코인 데이터 캐시 업데이트:", coins.length, "개");
  }

  // ✅ 한글명 매핑
  async getKoreanName(symbol) {
    const upbitData = this.cache.get("upbit_markets");
    return upbitData?.get(symbol.toUpperCase())?.korean_name || null;
  }

  // ✅ 업비트 지원 확인
  async checkUpbitSupport(symbol) {
    const upbitData = this.cache.get("upbit_markets");
    return upbitData?.has(symbol.toUpperCase()) || false;
  }

  // ✅ 캐시 상태 확인
  getCacheStatus() {
    const upbitMarkets = this.cache.get("upbit_markets");
    const cachedCoins = this.cache.get("all_coins_1_250");

    return {
      upbitMarkets: upbitMarkets?.size || 0,
      cachedCoins: cachedCoins?.length || 0,
      cacheKeys: Array.from(this.cache.keys()),
      rateLimits: Array.from(this.rateLimiter.entries()),
    };
  }

  // ✅ 캐시 초기화
  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
    this.rateLimiter.clear();
    this.initializeCache();
    console.log("🧹 캐시 초기화 완료");
  }
}

// ✅ 인스턴스 export
export const marketDataService = new MarketDataService();
