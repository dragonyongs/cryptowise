// src/services/news/clientNewsCache.js
class ClientNewsCache {
  constructor() {
    this.cache = new Map();
    this.maxAge = 5 * 60 * 1000; // 5분
    this.maxEntries = 100; // 최대 100개 코인
    this.requestInProgress = new Map(); // 중복 요청 방지
  }

  async getNewsScore(symbol) {
    const cacheKey = symbol.toUpperCase();
    const cached = this.cache.get(cacheKey);

    // 1. 유효한 캐시가 있으면 반환
    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      return { ...cached.data, cached: true };
    }

    // 2. 진행 중인 요청이 있으면 대기
    if (this.requestInProgress.has(cacheKey)) {
      try {
        return await this.requestInProgress.get(cacheKey);
      } catch (error) {
        console.warn(`${symbol} 진행 중인 요청 실패:`, error.message);
      }
    }

    // 3. 새로운 API 요청
    const requestPromise = this._fetchNewsScore(symbol);
    this.requestInProgress.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;

      // 4. 성공적으로 받은 데이터 캐시 저장
      this._cacheResult(cacheKey, result);

      return { ...result, cached: false };
    } catch (error) {
      console.error(`${symbol} 뉴스 API 호출 실패:`, error);

      // 5. 만료된 캐시라도 에러 시에는 반환
      if (cached) {
        console.warn(`${symbol} 만료된 캐시 사용 (에러 시 폴백)`);
        return { ...cached.data, cached: true, stale: true };
      }

      // 6. 완전 실패 시 기본값
      return {
        score: 5.0,
        strength: "neutral",
        recentTrend: "neutral",
        cached: false,
        error: error.message,
        fallback: true,
      };
    } finally {
      // 7. 진행 중인 요청 정리
      this.requestInProgress.delete(cacheKey);
    }
  }

  async _fetchNewsScore(symbol) {
    const response = await fetch(`/api/news-analysis?symbol=${symbol}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000), // 8초 타임아웃
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return {
      score: data.score || 5.0,
      strength: data.strength || "neutral",
      recentTrend: data.recentTrend || "neutral",
      articlesCount: data.articlesCount || 0,
      source: data.source || "unknown",
    };
  }

  _cacheResult(cacheKey, result) {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxEntries) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });
  }

  // 캐시 상태 확인
  getCacheStatus() {
    const entries = [];
    for (const [key, value] of this.cache.entries()) {
      const age = Math.floor((Date.now() - value.timestamp) / 1000);
      entries.push({
        symbol: key,
        score: value.data.score || "N/A",
        age: `${age}초 전`,
        articles: value.data.articlesCount || 0,
        isStale: Date.now() - value.timestamp > this.maxAge,
      });
    }
    return entries;
  }

  // 수동 캐시 클리어
  clearCache() {
    this.cache.clear();
    this.requestInProgress.clear();
    console.log("🧹 뉴스 캐시 완전 클리어");
  }
}

export const clientNewsCache = new ClientNewsCache();
