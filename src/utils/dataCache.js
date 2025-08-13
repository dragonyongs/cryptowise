// src/utils/dataCache.js
class DataCacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.CACHE_DURATION = {
      UPBIT_MARKETS: 24 * 60 * 60 * 1000, // 24시간
      COINGECKO_LIST: 6 * 60 * 60 * 1000, // 6시간
      PRICE_DATA: 1 * 60 * 1000, // 1분
    };
  }

  async getCachedData(key, fetchFn, duration) {
    const now = Date.now();

    if (this.cache.has(key) && this.cacheExpiry.get(key) > now) {
      return this.cache.get(key);
    }

    try {
      const data = await fetchFn();
      this.cache.set(key, data);
      this.cacheExpiry.set(key, now + duration);
      return data;
    } catch (error) {
      // 캐시된 오래된 데이터라도 반환
      if (this.cache.has(key)) {
        console.warn("Fresh data failed, using stale cache:", error);
        return this.cache.get(key);
      }
      throw error;
    }
  }

  // 점진적 업데이트 (백그라운드에서 새 데이터 페치)
  async refreshCacheInBackground(key, fetchFn, duration) {
    setTimeout(async () => {
      try {
        const freshData = await fetchFn();
        this.cache.set(key, freshData);
        this.cacheExpiry.set(key, Date.now() + duration);
      } catch (error) {
        console.warn("Background refresh failed:", error);
      }
    }, 100);
  }
}

export const cacheManager = new DataCacheManager();

// 사용 예시
export async function getCachedUpbitMarkets() {
  return cacheManager.getCachedData(
    "upbit_markets",
    () => fetch("https://api.upbit.com/v1/market/all").then((r) => r.json()),
    cacheManager.CACHE_DURATION.UPBIT_MARKETS
  );
}
