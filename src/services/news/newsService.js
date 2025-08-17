import { cache } from "../../utils/cache.js";

class NewsService {
  constructor() {
    this.sources = [
      "https://cointelegraph.com/rss",
      "https://coindesk.com/arc/outboundfeeds/rss/",
      "https://bitcoinist.com/feed",
      "https://cryptonews.com/news/feed/",
    ];

    // ✅ 한국어 키워드 추가로 업비트 뉴스도 반영
    this.sentimentKeywords = {
      positive: [
        // 영어
        "bullish",
        "surge",
        "rally",
        "breakout",
        "adoption",
        "partnership",
        "bull",
        "moon",
        "pump",
        "breakthrough",
        "soar",
        "skyrocket",
        "institutional",
        "etf",
        "approved",
        "upgrade",
        "milestone",
        // 한국어 (업비트 관련)
        "상승",
        "급등",
        "돌파",
        "채택",
        "파트너십",
        "긍정",
        "호재",
      ],
      negative: [
        // 영어
        "bearish",
        "crash",
        "dump",
        "regulation",
        "ban",
        "hack",
        "bear",
        "drop",
        "plunge",
        "decline",
        "sell-off",
        "correction",
        "regulatory",
        "lawsuit",
        "investigation",
        "crackdown",
        // 한국어
        "하락",
        "급락",
        "규제",
        "금지",
        "해킹",
        "부정",
        "악재",
      ],
      neutral: [
        "analysis",
        "report",
        "update",
        "commentary",
        "overview",
        "분석",
        "리포트",
        "업데이트",
        "전망",
      ],
    };

    this.coinAliases = {
      bitcoin: ["BTC", "bitcoin"],
      ethereum: ["ETH", "ethereum"],
      xrp: ["XRP", "ripple"],
      cardano: ["ADA", "cardano"],
      solana: ["SOL", "solana"],
      polygon: ["MATIC", "polygon"],
      chainlink: ["LINK", "chainlink"],
    };

    this.lastFetch = new Map();
  }

  // ✅ RSS 피드 파싱 (CORS 문제 해결)
  async fetchRSSFeed(symbol) {
    try {
      const apiUrl = `/api/news-analysis?symbol=${symbol}`;

      console.log(`📰 ${symbol} 뉴스 분석 API 호출: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      console.log(`✅ ${symbol} 뉴스 분석 완료:`, data);
      return data;
    } catch (error) {
      console.error(`❌ ${symbol} 뉴스 API 호출 실패:`, error.message);

      // 폴백 데이터 반환
      return {
        sentiment: "neutral",
        score: 5.0,
        strength: "neutral",
        recentTrend: "neutral",
        articles: [],
        source: "client_fallback",
        error: error.message,
        cached: false,
      };
    }
  }

  // ✅ 텍스트 정리 (HTML 태그 제거)
  cleanText(text) {
    return text
      .replace(/<[^>]*>/g, "") // HTML 태그 제거
      .replace(/&[^;]+;/g, "") // HTML 엔티티 제거
      .replace(/\s+/g, " ") // 공백 정리
      .trim();
  }

  // ✅ 코인별 뉴스 수집
  async collectCoinNews(symbol) {
    try {
      console.log(`📰 ${symbol} 뉴스 수집 시작...`);

      // 직접 API 호출로 변경 (RSS 프록시 제거)
      const newsData = await this.fetchRSSFeed(symbol);

      return {
        articles: newsData.articles || [],
        sentiment: newsData.sentiment || "neutral",
        score: newsData.score || 5.0,
        source: newsData.source || "api",
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`❌ ${symbol} 뉴스 수집 에러:`, error.message);

      return {
        articles: [],
        sentiment: "neutral",
        score: 5.0,
        source: "error_fallback",
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  // ✅ 코인별 키워드 반환
  getCoinKeywords(symbol) {
    const keywords = [symbol];

    // 알리아스 추가
    Object.entries(this.coinAliases).forEach(([key, aliases]) => {
      if (aliases.includes(symbol.toUpperCase())) {
        keywords.push(...aliases);
      }
    });

    return [...new Set(keywords)]; // 중복 제거
  }

  // ✅ 중복 뉴스 제거
  removeDuplicates(articles) {
    const seen = new Set();
    return articles.filter((article) => {
      const key = article.title.substring(0, 50); // 제목 앞 50자로 중복 판단
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ✅ 감정 점수 계산 (0-10점)
  calculateSentimentScore(articles) {
    if (!articles || articles.length === 0) {
      return {
        score: 5.0, // 중립
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0,
        strength: "neutral",
        recentTrend: "neutral",
      };
    }

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    const detailedArticles = [];

    // 최근 24시간 내 뉴스만 가중치 적용
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    articles.forEach((article) => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      const isRecent = article.pubDate > oneDayAgo;
      const weight = isRecent ? 1.5 : 1.0; // 최근 뉴스 가중치

      let positiveScore = 0;
      let negativeScore = 0;
      let neutralScore = 0;

      // 키워드 매칭
      this.sentimentKeywords.positive.forEach((keyword) => {
        const matches = (
          text.match(new RegExp(keyword.toLowerCase(), "g")) || []
        ).length;
        positiveScore += matches * weight;
      });

      this.sentimentKeywords.negative.forEach((keyword) => {
        const matches = (
          text.match(new RegExp(keyword.toLowerCase(), "g")) || []
        ).length;
        negativeScore += matches * weight;
      });

      this.sentimentKeywords.neutral.forEach((keyword) => {
        const matches = (
          text.match(new RegExp(keyword.toLowerCase(), "g")) || []
        ).length;
        neutralScore += matches * weight;
      });

      // 감정 분류
      let sentiment = "neutral";
      if (positiveScore > negativeScore && positiveScore > neutralScore) {
        sentiment = "positive";
        positiveCount += weight;
      } else if (
        negativeScore > positiveScore &&
        negativeScore > neutralScore
      ) {
        sentiment = "negative";
        negativeCount += weight;
      } else {
        sentiment = "neutral";
        neutralCount += weight;
      }

      detailedArticles.push({
        ...article,
        sentiment,
        positiveScore,
        negativeScore,
        neutralScore,
        weight,
        isRecent,
      });
    });

    const total = positiveCount + negativeCount + neutralCount;

    // 점수 계산 (0-10점)
    let score = 5.0; // 기본 중립
    if (total > 0) {
      const positiveRatio = positiveCount / total;
      const negativeRatio = negativeCount / total;

      // 긍정 비율이 높으면 5점 이상, 부정 비율이 높으면 5점 이하
      if (positiveRatio > negativeRatio) {
        score = 5.0 + positiveRatio * 5.0;
      } else if (negativeRatio > positiveRatio) {
        score = 5.0 - negativeRatio * 5.0;
      }

      score = Math.max(0, Math.min(10, score)); // 0-10 범위 제한
    }

    // 신호 강도 결정
    let strength = "neutral";
    if (score >= 7.5) strength = "very_positive";
    else if (score >= 6.5) strength = "positive";
    else if (score <= 2.5) strength = "very_negative";
    else if (score <= 3.5) strength = "negative";

    // 최근 트렌드 분석 (최근 12시간 vs 12-24시간)
    const recentTrend = this.calculateRecentTrend(detailedArticles);

    return {
      score: Number(score.toFixed(2)),
      positive: Math.round(positiveCount),
      negative: Math.round(negativeCount),
      neutral: Math.round(neutralCount),
      total: articles.length,
      strength,
      recentTrend,
      articles: detailedArticles.slice(0, 10), // 상위 10개 뉴스만
      timestamp: new Date(),
    };
  }

  // ✅ 최근 트렌드 분석
  calculateRecentTrend(articles) {
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const recent = articles.filter((a) => a.pubDate > twelveHoursAgo);
    const older = articles.filter(
      (a) => a.pubDate > oneDayAgo && a.pubDate <= twelveHoursAgo
    );

    if (recent.length === 0 && older.length === 0) return "neutral";

    const recentScore =
      recent.length > 0
        ? recent.reduce(
            (sum, a) => sum + (a.positiveScore - a.negativeScore),
            0
          ) / recent.length
        : 0;

    const olderScore =
      older.length > 0
        ? older.reduce(
            (sum, a) => sum + (a.positiveScore - a.negativeScore),
            0
          ) / older.length
        : 0;

    if (recentScore > olderScore * 1.2) return "improving";
    else if (recentScore < olderScore * 0.8) return "worsening";
    else return "stable";
  }

  // ✅ 메인 API: 코인 뉴스 점수 반환
  async getNewsScore(symbol) {
    try {
      const cacheKey = `news_${symbol}`;
      const cached = cache.get(cacheKey, 5 * 60);

      if (cached) {
        console.log(`📊 ${symbol} 뉴스 점수 (캐시): ${cached.score}/10`);
        return { ...cached, cached: true };
      }

      // ✅ API 호출 전 로깅 추가
      console.log(`🔄 ${symbol} 새로운 뉴스 데이터 수집 시작...`);

      const newsData = await this.collectCoinNews(symbol);

      // ✅ 수집된 데이터 검증
      if (!newsData || newsData.articles?.length === 0) {
        console.warn(`⚠️ ${symbol} 뉴스 데이터 없음 - 기본값 사용`);
        return {
          score: 5.0,
          sentiment: "neutral",
          strength: "neutral",
          articles: [],
          cached: false,
          error: "No news data available",
        };
      }

      // ✅ 실제 감정 분석 수행
      const sentimentResult = this.calculateSentimentScore(newsData.articles);

      const result = {
        score: sentimentResult.score, // 실제 계산된 점수 사용
        sentiment: sentimentResult.strength,
        strength: sentimentResult.strength,
        recentTrend: sentimentResult.recentTrend,
        articles: sentimentResult.articles,
        source: "live_analysis",
        cached: false,
        timestamp: Date.now(),
      };

      cache.set(cacheKey, result, 5 * 60);

      console.log(
        `📊 ${symbol} 뉴스 점수: ${result.score}/10 (${result.sentiment}) - ${result.articles.length}개 뉴스`
      );
      return result;
    } catch (error) {
      console.error(`❌ ${symbol} 뉴스 점수 계산 실패:`, error);
      // 에러 시에만 기본값 반환
      return {
        score: 5.0,
        sentiment: "neutral",
        strength: "neutral",
        error: error.message,
        cached: false,
      };
    }
  }

  // ✅ 캐시 클리어 메서드 추가
  clearCache() {
    // 뉴스 관련 캐시만 삭제
    const newsKeys = [];

    // cache가 Map이라면
    if (cache.cache && cache.cache instanceof Map) {
      for (const key of cache.cache.keys()) {
        if (key.startsWith("news_")) {
          newsKeys.push(key);
        }
      }
    }

    newsKeys.forEach((key) => cache.delete && cache.delete(key));
    console.log(`🔄 뉴스 캐시 ${newsKeys.length}개 클리어 완료`);
  }

  // ✅ 캐시 상태 확인 메서드
  getCacheStatus() {
    const entries = [];

    if (cache.cache && cache.cache instanceof Map) {
      for (const [key, value] of cache.cache.entries()) {
        if (key.startsWith("news_")) {
          const age = Math.floor(
            (Date.now() - (value.timestamp || Date.now())) / 1000
          );
          entries.push({
            key,
            score: value.score || "N/A",
            age: `${age}초 전`,
            articles: value.articles?.length || 0,
          });
        }
      }
    }

    return entries;
  }

  // ✅ 여러 코인 동시 분석
  async getBatchNewsScores(symbols) {
    const results = {};

    const promises = symbols.map(async (symbol) => {
      const score = await this.getNewsScore(symbol);
      return { symbol, score };
    });

    const scores = await Promise.all(promises);

    scores.forEach(({ symbol, score }) => {
      results[symbol] = score;
    });

    return results;
  }
}

// 싱글톤 인스턴스 생성
export const newsService = new NewsService();
export default newsService;
