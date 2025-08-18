// src/utils/newsCache.js
class NewsScoreCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 5 * 60 * 1000; // 5분 TTL
  }

  async getNewsScore(symbol, newsService) {
    const cacheKey = symbol.toUpperCase();
    const cached = this.cache.get(cacheKey);

    // 캐시가 유효한 경우 반환
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }

    try {
      // 새로운 데이터 가져오기
      const response = await fetch(`/api/news-analysis?symbol=${symbol}`);
      const data = await response.json();

      // 캐시에 저장
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      console.error(`뉴스 점수 가져오기 실패 (${symbol}):`, error);

      // 캐시된 데이터가 있으면 만료되어도 반환
      if (cached) {
        return cached.data;
      }

      // 완전 실패 시 기본값
      return {
        score: 5.0,
        strength: "neutral",
        recentTrend: "neutral",
        cached: false,
        error: error.message,
      };
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

export const newsScoreCache = new NewsScoreCache();
