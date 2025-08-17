// src/services/news/newsPreloader.js
class NewsPreloader {
  constructor() {
    this.newsCache = new Map();
    this.lastUpdate = null;
    this.isRunning = false;
    this.updateInterval = 3 * 60 * 1000; // 3분마다
    this.batchSize = 3; // 한 번에 3개씩만 처리
  }

  startPreloading() {
    if (this.isRunning) return;

    console.log("📰 뉴스 백그라운드 캐싱 시작...");
    this.isRunning = true;

    // 즉시 한 번 실행
    this.updateAllNews();

    // 5분마다 백그라운드 업데이트
    this.intervalId = setInterval(() => {
      this.updateAllNews();
    }, this.updateInterval);
  }

  stopPreloading() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("📰 뉴스 백그라운드 캐싱 중지");
  }

  async updateAllNews() {
    if (!this.isRunning) return;
    console.log("🔄 백그라운드 뉴스 업데이트 시작...");

    const watchedCoins = ["BTC", "ETH", "ADA", "SOL", "DOT", "LINK", "XRP"];

    // 배치 처리로 API 부하 분산
    for (let i = 0; i < watchedCoins.length; i += this.batchSize) {
      const batch = watchedCoins.slice(i, i + this.batchSize);

      await Promise.all(
        batch.map(async (coin) => {
          try {
            const newsData = await this.fetchNewsForCoin(coin);
            this.newsCache.set(coin, {
              data: newsData,
              timestamp: Date.now(),
            });
          } catch (error) {
            console.warn(`${coin} 뉴스 업데이트 실패:`, error.message);
          }
        })
      );

      // 배치 간 1초 대기 (API 제한 방지)
      if (i + this.batchSize < watchedCoins.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  async fetchNewsForCoin(coin) {
    try {
      // ✅ Vercel Functions API 사용 (CORS 문제 해결)
      const apiUrl = `/api/news-analysis?symbol=${coin}`;

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      // 네트워크 오류나 API 오류 시 기본값 반환
      console.warn(`📰 ${coin} API 호출 실패, 기본값 사용:`, error.message);
      return {
        sentiment: "neutral",
        score: 5.0,
        strength: "neutral",
        recentTrend: "neutral",
        articles: [],
        source: "client_fallback",
        error: error.message,
      };
    }
  }

  // 즉시 사용 가능한 뉴스 점수 반환 (캐시에서)
  getNewsScore(symbol) {
    const cached = this.newsCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
      // 10분 유효
      return {
        score: cached.data.score || 5.0,
        strength: cached.data.strength || "neutral",
        recentTrend: cached.data.recentTrend || "neutral",
        cached: true,
        lastUpdate: new Date(cached.timestamp).toLocaleTimeString(),
        articlesCount: cached.data.articlesCount || 0,
      };
    }

    return {
      score: 5.0,
      strength: "neutral",
      recentTrend: "neutral",
      cached: false,
      lastUpdate: null,
      articlesCount: 0,
    };
  }

  getScoreStrength(score) {
    if (score >= 8.5) return "very_positive";
    if (score >= 7.0) return "positive";
    if (score >= 6.0) return "slightly_positive";
    if (score <= 1.5) return "very_negative";
    if (score <= 3.0) return "negative";
    if (score <= 4.0) return "slightly_negative";
    return "neutral";
  }

  // 캐시 상태 확인
  getCacheStatus() {
    const status = [];
    for (const [coin, data] of this.newsCache.entries()) {
      const age = Date.now() - data.timestamp;
      status.push({
        coin,
        score: data.data.score || 5.0,
        age: Math.floor(age / 1000 / 60), // 분 단위
        articles: data.data.articlesCount || 0,
        source: data.data.source || "unknown",
      });
    }
    return status;
  }
}

export const newsPreloader = new NewsPreloader();
