// src/services/news/smartNewsCache.js (새로운 접근법)
class SmartNewsCache {
  constructor() {
    this.cache = new Map();
    this.maxAge = 10 * 60 * 1000; // 10분으로 연장
    this.requestQueue = new Map(); // 요청 큐잉
    this.dailyCallCount = 0;
    this.maxDailyCalls = 50; // 하루 50회 제한
  }

  async getNewsScore(symbol) {
    const cacheKey = symbol.toUpperCase();

    // 1. 캐시 확인 (10분 유효)
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      return { ...cached.data, cached: true };
    }

    // 2. 호출 제한 확인
    if (this.dailyCallCount >= this.maxDailyCalls) {
      console.warn(`일일 호출 제한 도달 (${this.maxDailyCalls})`);
      return this.getFallbackNews(symbol, cached);
    }

    // 3. 큐잉된 요청 확인
    if (this.requestQueue.has(cacheKey)) {
      return await this.requestQueue.get(cacheKey);
    }

    // 4. 새로운 요청
    const requestPromise = this.fetchNewsWithRetry(symbol);
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.dailyCallCount++;

      // 캐시 저장 (성공 시)
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return { ...result, cached: false };
    } catch (error) {
      return this.getFallbackNews(symbol, cached, error);
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  // ✅ 재시도 로직 포함 fetch
  async fetchNewsWithRetry(symbol, maxRetries = 2) {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const response = await fetch(`/api/news-analysis?symbol=${symbol}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000), // 10초 타임아웃
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        return {
          score: data.score || 5.0,
          strength: data.strength || "neutral",
          recentTrend: data.recentTrend || "neutral",
          articles: data.articles || [],
          articlesCount: data.articlesCount || 0,
          source: data.source || "api",
        };
      } catch (error) {
        if (i === maxRetries) {
          throw error;
        }
        // 재시도 전 대기 (지수 백오프)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, i) * 1000)
        );
      }
    }
  }

  // ✅ 폴백 뉴스 (만료된 캐시 또는 기본값)
  getFallbackNews(symbol, cached, error = null) {
    if (cached && cached.data) {
      console.warn(`${symbol} 만료된 캐시 사용`);
      return {
        ...cached.data,
        cached: true,
        stale: true,
        fallback: true,
      };
    }

    return {
      score: 5.0,
      strength: "neutral",
      recentTrend: "neutral",
      articles: [],
      articlesCount: 0,
      source: "fallback",
      cached: false,
      error: error?.message || "No data available",
      fallback: true,
    };
  }

  // ✅ 배치 처리로 효율성 증대
  async getBatchNewsScores(symbols) {
    const results = {};
    const uncachedSymbols = [];

    // 캐시된 것들 먼저 처리
    for (const symbol of symbols) {
      const cached = this.cache.get(symbol.toUpperCase());
      if (cached && Date.now() - cached.timestamp < this.maxAge) {
        results[symbol] = { ...cached.data, cached: true };
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    // 캐시되지 않은 것들을 배치로 처리 (3개씩)
    for (let i = 0; i < uncachedSymbols.length; i += 3) {
      const batch = uncachedSymbols.slice(i, i + 3);
      const batchPromises = batch.map((symbol) =>
        this.getNewsScore(symbol).catch((error) => ({
          score: 5.0,
          strength: "neutral",
          error: error.message,
          symbol,
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach((result, idx) => {
        const symbol = batch[idx];
        results[symbol] = result;
      });

      // 배치 간 1초 대기 (API 제한 방지)
      if (i + 3 < uncachedSymbols.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  // 통계 조회
  getStats() {
    return {
      cacheSize: this.cache.size,
      dailyCalls: this.dailyCallCount,
      maxCalls: this.maxDailyCalls,
      remaining: this.maxDailyCalls - this.dailyCallCount,
    };
  }
}

export const smartNewsCache = new SmartNewsCache();
