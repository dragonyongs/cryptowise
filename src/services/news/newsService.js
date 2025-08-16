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
    this.newsCache = new Map();
  }

  // ✅ RSS 피드 파싱 (CORS 문제 해결)
  async fetchRSSFeed(url) {
    try {
      // Vercel API 엔드포인트를 통해 RSS 가져오기 (CORS 회피)
      const response = await fetch(
        `/api/rss-proxy?url=${encodeURIComponent(url)}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      const items = xmlDoc.querySelectorAll("item");
      const articles = [];

      items.forEach((item, index) => {
        if (index >= 20) return; // 최대 20개만

        const title = item.querySelector("title")?.textContent || "";
        const description =
          item.querySelector("description")?.textContent || "";
        const pubDate = item.querySelector("pubDate")?.textContent || "";
        const link = item.querySelector("link")?.textContent || "";

        articles.push({
          title: this.cleanText(title),
          description: this.cleanText(description),
          pubDate: new Date(pubDate),
          link,
          source: url,
        });
      });

      return articles;
    } catch (error) {
      console.error(`RSS 피드 에러 (${url}):`, error.message);
      return [];
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
    const cacheKey = `news_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    const allNews = [];
    const coinKeywords = this.getCoinKeywords(symbol);

    // 모든 RSS 소스에서 뉴스 수집
    for (const source of this.sources) {
      try {
        const articles = await this.fetchRSSFeed(source);

        // 코인 관련 뉴스만 필터링
        const relevantArticles = articles.filter((article) => {
          const text = `${article.title} ${article.description}`.toLowerCase();
          return coinKeywords.some((keyword) =>
            text.includes(keyword.toLowerCase())
          );
        });

        allNews.push(...relevantArticles);
      } catch (error) {
        console.error(`뉴스 수집 에러 (${source}):`, error);
      }
    }

    // 중복 제거 및 최신순 정렬
    const uniqueNews = this.removeDuplicates(allNews)
      .sort((a, b) => b.pubDate - a.pubDate)
      .slice(0, 30); // 최대 30개

    // 30분 캐시
    cache.set(cacheKey, uniqueNews, 1800);

    return uniqueNews;
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
      console.log(`📰 ${symbol} 뉴스 분석 시작...`);

      const news = await this.collectCoinNews(symbol);
      const sentiment = this.calculateSentimentScore(news);

      console.log(
        `📊 ${symbol} 뉴스 점수: ${sentiment.score}/10 (${sentiment.strength}) - ${news.length}개 뉴스`
      );

      return sentiment;
    } catch (error) {
      console.error(`뉴스 점수 계산 에러 (${symbol}):`, error);
      return {
        score: 5.0,
        positive: 0,
        negative: 0,
        neutral: 0,
        total: 0,
        strength: "neutral",
        recentTrend: "neutral",
        error: error.message,
      };
    }
  }

  // ✅ 여러 코인 동시 분석
  async getBatchNewsScores(symbols) {
    const results = {};

    // 동시 요청으로 성능 향상
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
