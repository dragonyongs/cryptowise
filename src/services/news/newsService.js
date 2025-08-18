// src/services/news/newsService.js - 안전한 뉴스 서비스

import { cache } from "../../utils/cache.js";

class NewsService {
  constructor() {
    this.lastCallTime = new Map();
    this.callInterval = 3000; // 3초 간격 제한
  }

  // ✅ 호출 제한 체크
  canMakeCall(symbol) {
    const lastCall = this.lastCallTime.get(symbol);
    if (!lastCall) return true;
    return Date.now() - lastCall > this.callInterval;
  }

  // ✅ 기본값 반환 (안전한 구조)
  getDefaultScore(errorMessage = null) {
    return {
      score: 5.0,
      sentiment: "neutral",
      strength: "neutral",
      recentTrend: "neutral",
      articles: [], // ✅ 빈 배열 보장
      articlesCount: 0,
      cached: false,
      error: errorMessage,
      fallback: true,
    };
  }

  // ✅ 메인 뉴스 점수 API (안전한 처리)
  async getNewsScore(symbol) {
    try {
      const cacheKey = `news_${symbol}`;

      // ✅ 캐시 확인 (10분)
      const cached = cache.get(cacheKey, 10 * 60);
      if (cached) {
        console.log(`📊 ${symbol} 뉴스 점수 (캐시): ${cached.score}/10`);
        // ✅ articles 배열 보장
        return {
          ...cached,
          cached: true,
          articles: cached.articles || [],
        };
      }

      // ✅ 호출 제한 체크
      if (!this.canMakeCall(symbol)) {
        console.warn(`⏳ ${symbol} 호출 제한 - 기본값 반환`);
        return this.getDefaultScore("호출 제한");
      }

      console.log(`🔄 ${symbol} 뉴스 API 호출`);
      this.lastCallTime.set(symbol, Date.now());

      const response = await fetch(`/api/news-analysis?symbol=${symbol}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(8000), // 8초 타임아웃
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      // ✅ 안전한 데이터 구조화
      const result = {
        score: data.score || 5.0,
        sentiment: data.strength || "neutral",
        strength: data.strength || "neutral",
        recentTrend: data.recentTrend || "neutral",
        articles: Array.isArray(data.articles) ? data.articles : [], // ✅ 배열 보장
        articlesCount: data.articlesCount || 0,
        source: data.source || "api",
        cached: data.cached || false,
        fetchTime: data.fetchTime,
        timestamp: Date.now(),
      };

      // ✅ 캐시 저장 (10분)
      cache.set(cacheKey, result, 10 * 60);

      console.log(
        `📊 ${symbol} 뉴스 점수: ${result.score}/10 (${result.sentiment})`
      );
      return result;
    } catch (error) {
      console.error(`❌ ${symbol} 뉴스 점수 실패:`, error);
      return this.getDefaultScore(error.message);
    }
  }

  // ✅ 캐시 상태 확인
  getCacheStatus() {
    const entries = [];
    const cacheMap = cache.cache || new Map();

    for (const [key, value] of cacheMap.entries()) {
      if (key.startsWith("news_")) {
        const age = Math.floor(
          (Date.now() - (value.timestamp || Date.now())) / 1000
        );
        entries.push({
          symbol: key.replace("news_", ""),
          score: value.score || "N/A",
          age: `${age}초 전`,
          articles: Array.isArray(value.articles) ? value.articles.length : 0,
          cached: value.cached || false,
        });
      }
    }
    return entries;
  }

  // ✅ 캐시 클리어
  clearCache() {
    const cacheMap = cache.cache || new Map();
    const newsKeys = [];

    for (const key of cacheMap.keys()) {
      if (key.startsWith("news_")) {
        newsKeys.push(key);
      }
    }

    newsKeys.forEach((key) => {
      if (cache.delete) cache.delete(key);
    });

    console.log(`🔄 뉴스 캐시 ${newsKeys.length}개 클리어 완료`);
  }
}

// 싱글톤 인스턴스
export const newsService = new NewsService();
export default newsService;
