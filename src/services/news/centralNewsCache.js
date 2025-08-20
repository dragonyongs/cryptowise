// src/services/news/centralNewsCache.js - 완전 수정 버전
import { newsApiClient } from "./newsApiClient.js";

class CentralNewsCache {
  constructor() {
    this.newsCache = new Map();
    this.loadingQueue = new Set();
    this.lastUpdate = new Map();
    this.userWatchlist = new Set();
    this.topCoins = [];
    this.batchSize = 5;
    this.batchDelay = 2000; // 2초 (newsApiClient가 내부적으로 관리)
    this.cacheExpiry = 30 * 60 * 1000; // 30분
    this.debugMode = process.env.NODE_ENV === "development";

    // ✅ newsApiClient 연결
    this.apiClient = newsApiClient;
  }

  log(message, level = "info") {
    if (!this.debugMode && level === "debug") return;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp} [뉴스캐시] ${message}`);
  }

  // ✅ 동적 관심코인 업데이트
  async updateWatchedCoins(watchlist = [], topCoins = []) {
    const previousCoins = new Set([...this.userWatchlist, ...this.topCoins]);
    this.userWatchlist = new Set(watchlist);
    this.topCoins = topCoins;

    const currentCoins = new Set([...watchlist, ...topCoins]);
    const newCoins = [...currentCoins].filter(
      (coin) => !previousCoins.has(coin)
    );

    this.log(`관심코인 업데이트: ${newCoins.length}개 신규 코인 감지`);

    if (newCoins.length > 0) {
      await this.preloadNewsForCoins(newCoins);
    }

    return { updated: newCoins.length, total: currentCoins.size, newCoins };
  }

  // ✅ 백그라운드 뉴스 프리로딩 (newsApiClient 사용)
  async preloadNewsForCoins(coinList, callback = null) {
    if (!coinList || coinList.length === 0) return 0;

    this.log(`백그라운드 뉴스 프리로딩: ${coinList.length}개 코인`);

    try {
      // ✅ newsApiClient의 배치 처리 사용
      const apiResults = await this.apiClient.fetchNewsForCoins(coinList);
      let completed = 0;

      // ✅ 결과를 캐시에 저장
      for (const [symbol, newsData] of apiResults) {
        this.newsCache.set(symbol, {
          symbol,
          score: newsData.score || 5.0,
          articles: newsData.articles || [],
          timestamp: Date.now(),
        });
        completed++;

        callback?.({
          type: "preload_progress",
          completed,
          total: coinList.length,
          currentBatch: Math.ceil(completed / this.batchSize),
          totalBatches: Math.ceil(coinList.length / this.batchSize),
        });
      }

      this.log(`백그라운드 뉴스 프리로딩 완료: ${completed}개 코인`);
      return completed;
    } catch (error) {
      this.log(`프리로딩 실패: ${error.message}`, "error");
      return 0;
    }
  }

  // ✅ 사용자 요청 시 즉시 분석 (캐시 우선 + newsApiClient)
  async loadNewsForCoins(coinList, callback) {
    const results = new Map();
    const needsLoading = [];

    // 1단계: 캐시된 뉴스 확인
    for (const coin of coinList) {
      const cached = this.getCachedNews(coin);
      if (cached.status === "loaded") {
        results.set(coin, cached);
      } else {
        needsLoading.push(coin);
      }
    }

    callback({
      type: "cache_loaded",
      cached: results.size,
      needsLoading: needsLoading.length,
    });

    // 2단계: 필요한 뉴스만 newsApiClient로 로딩
    if (needsLoading.length > 0) {
      try {
        this.log(`신규 뉴스 로딩: ${needsLoading.length}개 코인`);

        // ✅ newsApiClient 배치 처리 사용
        const apiResults = await this.apiClient.fetchNewsForCoins(needsLoading);
        let processed = 0;

        // ✅ API 결과를 캐시에 저장하고 results에 추가
        for (const [symbol, newsData] of apiResults) {
          const processedData = {
            score: newsData.score || 5.0,
            status: "loaded",
            articles: newsData.articles || [],
            lastUpdate: new Date(),
            error: newsData.error || null,
          };

          // 캐시 저장
          this.newsCache.set(symbol, {
            symbol,
            score: processedData.score,
            articles: processedData.articles,
            timestamp: Date.now(),
          });

          // results에 추가
          results.set(symbol, processedData);
          processed++;

          callback({
            type: "loading_progress",
            completed: processed,
            total: needsLoading.length,
            totalCached: results.size - processed,
          });
        }

        this.log(`신규 뉴스 로딩 완료: ${processed}개 코인`);
      } catch (error) {
        this.log(`신규 뉴스 로딩 실패: ${error.message}`, "error");

        // ✅ 실패한 코인들에 기본값 설정
        needsLoading.forEach((symbol) => {
          const defaultData = {
            score: 5.0,
            status: "error",
            articles: [],
            lastUpdate: new Date(),
            error: error.message,
          };

          results.set(symbol, defaultData);

          this.newsCache.set(symbol, {
            symbol,
            score: 5.0,
            articles: [],
            timestamp: Date.now(),
          });
        });
      }
    }

    callback({ type: "complete", totalLoaded: coinList.length });
    return results;
  }

  // ✅ 개별 코인 뉴스 로딩 (newsApiClient 사용)
  async loadSingleCoinNews(symbol) {
    if (this.loadingQueue.has(symbol)) return;
    this.loadingQueue.add(symbol);

    try {
      // ✅ newsApiClient 사용
      const newsData = await this.apiClient.fetchNewsForCoin(symbol);

      if (newsData.error && !newsData.score) {
        throw new Error(newsData.error);
      }

      // ✅ 캐시에 저장
      this.newsCache.set(symbol, {
        symbol,
        score: newsData.score || 5.0,
        articles: newsData.articles || [],
        timestamp: Date.now(),
      });

      this.log(`${symbol} 뉴스 점수: ${newsData.score || 5.0}`, "debug");
    } catch (error) {
      this.log(`${symbol} 뉴스 로딩 실패: ${error.message}`, "error");

      // ✅ 기본값 설정
      this.newsCache.set(symbol, {
        symbol,
        score: 5.0,
        articles: [],
        timestamp: Date.now(),
      });
    } finally {
      this.loadingQueue.delete(symbol);
    }
  }

  // ✅ 캐시된 뉴스 조회
  getCachedNews(symbol) {
    const cached = this.newsCache.get(symbol);

    if (!cached) {
      return { score: 5.0, status: "pending", articles: [] };
    }

    const age = Date.now() - cached.timestamp;
    if (age > this.cacheExpiry) {
      return { score: 5.0, status: "expired", articles: [] };
    }

    return {
      score: cached.score,
      status: "loaded",
      articles: cached.articles,
      lastUpdate: new Date(cached.timestamp),
    };
  }

  // ✅ 배치 생성 (newsApiClient에게 위임)
  createBatches(coinList) {
    const batches = [];
    for (let i = 0; i < coinList.length; i += this.batchSize) {
      batches.push(coinList.slice(i, i + this.batchSize));
    }
    return batches;
  }

  // ✅ 지연 함수
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ✅ 상태 조회
  getStatus() {
    return {
      cached: this.newsCache.size,
      loading: this.loadingQueue.size,
      watchlist: [...this.userWatchlist],
      topCoins: this.topCoins.length,
      cacheHitRate: this.calculateCacheHitRate(),
      lastUpdate: this.getLastUpdateTime(),
    };
  }

  // ✅ 캐시 적중률 계산
  calculateCacheHitRate() {
    if (this.newsCache.size === 0) return 0;
    const validCaches = [...this.newsCache.values()].filter(
      (cache) => Date.now() - cache.timestamp < this.cacheExpiry
    );
    return Math.round((validCaches.length / this.newsCache.size) * 100);
  }

  // ✅ 마지막 업데이트 시간
  getLastUpdateTime() {
    if (this.newsCache.size === 0) return null;
    const timestamps = [...this.newsCache.values()].map(
      (cache) => cache.timestamp
    );
    return new Date(Math.max(...timestamps));
  }

  // ✅ 캐시 정리
  cleanupExpiredCache() {
    const now = Date.now();
    let cleaned = 0;

    for (const [symbol, cache] of this.newsCache.entries()) {
      if (now - cache.timestamp > this.cacheExpiry * 2) {
        this.newsCache.delete(symbol);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.log(`만료된 캐시 정리: ${cleaned}개 제거`, "info");
    }

    return cleaned;
  }

  // ✅ 수동 캐시 새로고침
  async refreshCache(coinList = null) {
    const coinsToRefresh = coinList || [
      ...this.userWatchlist,
      ...this.topCoins,
    ];

    if (coinsToRefresh.length === 0) {
      this.log("새로고침할 코인이 없습니다", "warning");
      return { refreshed: 0, total: 0 };
    }

    this.log(`캐시 수동 새로고침: ${coinsToRefresh.length}개 코인`);

    try {
      const apiResults = await this.apiClient.fetchNewsForCoins(coinsToRefresh);
      let refreshed = 0;

      for (const [symbol, newsData] of apiResults) {
        this.newsCache.set(symbol, {
          symbol,
          score: newsData.score || 5.0,
          articles: newsData.articles || [],
          timestamp: Date.now(),
        });
        refreshed++;
      }

      this.log(`캐시 새로고침 완료: ${refreshed}개 코인`);
      return { refreshed, total: coinsToRefresh.length };
    } catch (error) {
      this.log(`캐시 새로고침 실패: ${error.message}`, "error");
      return {
        refreshed: 0,
        total: coinsToRefresh.length,
        error: error.message,
      };
    }
  }

  // ✅ 디버그 정보
  getDebugInfo() {
    return {
      cacheSize: this.newsCache.size,
      loadingQueue: [...this.loadingQueue],
      watchlist: [...this.userWatchlist],
      topCoinsCount: this.topCoins.length,
      cacheExpiry: this.cacheExpiry,
      batchSize: this.batchSize,
      debugMode: this.debugMode,
      apiClientStats: this.apiClient.getStats?.() || null,
    };
  }
}

export const centralNewsCache = new CentralNewsCache();
export default CentralNewsCache;
