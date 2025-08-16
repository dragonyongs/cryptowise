class NewsScoreCache {
  constructor() {
    this.cache = new Map();
    this.TTL = 10 * 60 * 1000; // 10분 캐시
    this.pendingRequests = new Map(); // 중복 요청 방지
  }

  async getNewsScore(symbol, newsService) {
    const now = Date.now();
    const cached = this.cache.get(symbol);

    // ✅ 캐시된 데이터가 유효하면 바로 반환
    if (cached && now - cached.timestamp < this.TTL) {
      console.log(
        `📋 ${symbol} 뉴스 캐시 사용 (${Math.floor((now - cached.timestamp) / 1000)}초 전)`
      );
      return cached.score;
    }

    // ✅ 이미 요청 진행 중이면 해당 Promise 반환 (중복 요청 방지)
    if (this.pendingRequests.has(symbol)) {
      console.log(`⏳ ${symbol} 뉴스 분석 대기 중...`);
      return await this.pendingRequests.get(symbol);
    }

    // ✅ 새로운 요청 시작
    console.log(`🆕 ${symbol} 뉴스 분석 새로 시작`);
    const requestPromise = newsService.getNewsScore(symbol);
    this.pendingRequests.set(symbol, requestPromise);

    try {
      const score = await requestPromise;
      this.cache.set(symbol, { score, timestamp: now });
      this.pendingRequests.delete(symbol);
      return score;
    } catch (error) {
      this.pendingRequests.delete(symbol);
      throw error;
    }
  }

  clearCache() {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
    };
  }
}

export const newsScoreCache = new NewsScoreCache();
