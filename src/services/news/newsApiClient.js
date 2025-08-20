// src/services/news/newsApiClient.js - 완전 수정 버전
class NewsApiClient {
  constructor() {
    this.baseUrl = "/api/news-analysis";
    this.cache = new Map();
    this.batchSize = 5;
    this.requestDelay = 2000; // 2초
    this.debugMode = process.env.NODE_ENV === "development";
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      lastRequestTime: null,
    };
  }

  log(message, level = "info") {
    if (!this.debugMode && level === "debug") return;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp} [뉴스API클라이언트] ${message}`);
  }

  // ✅ 배치 처리로 다중 코인 뉴스 요청
  async fetchNewsForCoins(coinList) {
    if (!coinList || coinList.length === 0) return new Map();

    this.log(`배치 뉴스 요청: ${coinList.length}개 코인`);
    const batches = this.createBatches(coinList);
    const results = new Map();

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        const symbols = batch.join(",");
        this.log(`배치 ${i + 1}/${batches.length}: ${symbols}`, "debug");

        const response = await fetch(`${this.baseUrl}?symbols=${symbols}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 10000,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const batchResults = await response.json();
        this.stats.totalRequests++;
        this.stats.successfulRequests++;
        this.stats.lastRequestTime = new Date();

        // ✅ 결과 매핑 및 검증
        Object.entries(batchResults).forEach(([symbol, data]) => {
          if (data && typeof data === "object") {
            results.set(symbol, {
              score: data.score || 5.0,
              articles: data.articles || [],
              sentiment: data.sentiment || "neutral",
              strength: data.strength || "neutral",
              articlesCount: data.articlesCount || 0,
              cached: data.cached || false,
              error: data.error || null,
              timestamp: data.timestamp || Date.now(),
            });
          } else {
            // 잘못된 데이터 처리
            results.set(symbol, {
              score: 5.0,
              articles: [],
              sentiment: "neutral",
              strength: "neutral",
              articlesCount: 0,
              cached: false,
              error: "Invalid response data",
              timestamp: Date.now(),
            });
          }
        });

        this.log(`배치 ${i + 1} 완료: ${batch.length}개 코인`, "debug");

        // ✅ API 제한 준수 지연
        if (i < batches.length - 1) {
          await this.delay(this.requestDelay);
        }
      } catch (error) {
        this.log(`배치 ${i + 1} 오류: ${error.message}`, "error");
        this.stats.totalRequests++;
        this.stats.failedRequests++;

        // ✅ 실패한 배치의 모든 코인에 기본값 설정
        batch.forEach((symbol) => {
          results.set(symbol, {
            score: 5.0,
            articles: [],
            sentiment: "neutral",
            strength: "neutral",
            articlesCount: 0,
            cached: false,
            error: error.message,
            timestamp: Date.now(),
          });
        });
      }
    }

    this.log(`배치 뉴스 완료: ${results.size}개 결과`);
    return results;
  }

  // ✅ 단일 코인 뉴스 요청
  async fetchNewsForCoin(symbol) {
    if (!symbol) {
      throw new Error("Symbol parameter required");
    }

    try {
      this.log(`단일 뉴스 요청: ${symbol}`, "debug");

      const response = await fetch(`${this.baseUrl}?symbol=${symbol}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 8000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      this.stats.totalRequests++;
      this.stats.successfulRequests++;
      this.stats.lastRequestTime = new Date();

      // ✅ 응답 데이터 검증 및 정규화
      return {
        score: data.score || 5.0,
        articles: data.articles || [],
        sentiment: data.sentiment || "neutral",
        strength: data.strength || "neutral",
        articlesCount: data.articlesCount || 0,
        cached: data.cached || false,
        error: data.error || null,
        timestamp: data.timestamp || Date.now(),
      };
    } catch (error) {
      this.log(`단일 뉴스 요청 실패 (${symbol}): ${error.message}`, "error");
      this.stats.totalRequests++;
      this.stats.failedRequests++;

      return {
        score: 5.0,
        articles: [],
        sentiment: "neutral",
        strength: "neutral",
        articlesCount: 0,
        cached: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  // ✅ 배치 생성
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

  // ✅ 통계 조회
  getStats() {
    return {
      ...this.stats,
      successRate:
        this.stats.totalRequests > 0
          ? Math.round(
              (this.stats.successfulRequests / this.stats.totalRequests) * 100
            )
          : 0,
      failureRate:
        this.stats.totalRequests > 0
          ? Math.round(
              (this.stats.failedRequests / this.stats.totalRequests) * 100
            )
          : 0,
    };
  }

  // ✅ 통계 초기화
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      cacheHits: 0,
      lastRequestTime: null,
    };
    this.log("통계 초기화 완료");
  }

  // ✅ 연결 테스트
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}?symbol=BTC`, {
        method: "GET",
        timeout: 5000,
      });

      return {
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}

export const newsApiClient = new NewsApiClient();
export default NewsApiClient;
