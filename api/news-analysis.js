// api/news-analysis.js - 다중 코인 지원 + CORS 해결 완전 버전
import Parser from "rss-parser";

const parser = new Parser({
  headers: {
    "User-Agent": "CryptoWise/1.0",
    Accept: "application/rss+xml, text/xml, application/xml",
  },
});

// ✅ 메모리 캐시
const cache = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10분
const MAX_CACHE_SIZE = 100; // 다중 코인 지원으로 증가
const MAX_ARTICLES = 8;

// ✅ API 호출 제한
const apiCallTracker = new Map();
const MAX_CALLS_PER_MINUTE = 20; // 다중 처리로 증가

// ✅ 기본 키워드 매핑 (핵심만)
const CORE_KEYWORDS = {
  BTC: ["bitcoin", "btc", "비트코인"],
  ETH: ["ethereum", "eth", "이더리움", "ether"],
  XRP: ["ripple", "xrp", "리플"],
  ADA: ["cardano", "ada", "카르다노"],
  SOL: ["solana", "sol", "솔라나"],
  DOT: ["polkadot", "dot", "폴카닷"],
  LINK: ["chainlink", "link", "체인링크"],
  MATIC: ["polygon", "matic", "폴리곤"],
  AVAX: ["avalanche", "avax", "아발란체"],
  ALGO: ["algorand", "algo", "알고랜드"],
  DOGE: ["dogecoin", "doge", "도지코인"],
  SHIB: ["shiba inu", "shib", "시바이누"],
  ETC: ["ethereum classic", "etc", "이더리움클래식"],
  BCH: ["bitcoin cash", "bch", "비트코인캐시"],
  LTC: ["litecoin", "ltc", "라이트코인"],
};

// ✅ 동적 키워드 생성 함수
function generateDynamicKeywords(symbol) {
  const symbolUpper = symbol.toUpperCase();
  const symbolLower = symbol.toLowerCase();

  let keywords = CORE_KEYWORDS[symbolUpper] || [];

  const dynamicKeywords = [
    symbolLower,
    symbolUpper,
    `$${symbolUpper}`,
    `${symbolUpper}/USD`,
    `${symbolUpper}/USDT`,
    `${symbolUpper} price`,
    `${symbolLower} price`,
    `${symbolUpper} coin`,
    `${symbolLower} coin`,
    `${symbolUpper} token`,
    `${symbolLower} token`,
    `${symbolLower} crypto`,
    `${symbolLower} cryptocurrency`,
    `${symbolLower} blockchain`,
    `${symbolUpper} analysis`,
    `${symbolLower} trading`,
    `${symbolUpper} market`,
    `${symbolUpper} surge`,
    `${symbolUpper} rally`,
    `${symbolUpper} crash`,
    `${symbolUpper} pump`,
    `${symbolUpper} dump`,
  ];

  return [...new Set([...keywords, ...dynamicKeywords])];
}

function checkRateLimit() {
  const now = Date.now();
  const minuteAgo = now - 60000;

  for (const [timestamp] of apiCallTracker) {
    if (timestamp < minuteAgo) {
      apiCallTracker.delete(timestamp);
    }
  }

  return apiCallTracker.size < MAX_CALLS_PER_MINUTE;
}

function getCachedNews(symbol) {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function cacheNews(symbol, data) {
  if (cache.size >= MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }

  cache.set(symbol, {
    data: { ...data, cached: false, fetchTime: new Date().toISOString() },
    timestamp: Date.now(),
  });
}

// ✅ RSS 소스
const RSS_SOURCES = [
  "https://cointelegraph.com/rss",
  "https://www.coindesk.com/arc/outboundfeeds/rss/",
  "https://cryptonews.com/news/feed/",
  "https://bitcoinist.com/feed/",
];

async function fetchRSSFeed(url, timeout = 5000) {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: ${url}`));
    }, timeout);

    try {
      console.log(`📡 RSS 요청: ${url}`);
      const feed = await parser.parseURL(url);
      clearTimeout(timeoutId);

      if (!feed || !feed.items || feed.items.length === 0) {
        throw new Error("Empty feed data");
      }

      console.log(`✅ RSS 응답: ${feed.items.length}개 기사`);
      resolve(feed);
    } catch (error) {
      clearTimeout(timeoutId);
      console.error(`❌ RSS 에러: ${error.message}`);
      reject(error);
    }
  });
}

function getRelevantArticles(feed, symbol) {
  if (!feed?.items || !Array.isArray(feed.items)) {
    console.warn("Invalid feed items");
    return [];
  }

  const keywords = generateDynamicKeywords(symbol);
  const relevantArticles = [];

  for (const item of feed.items.slice(0, 30)) {
    try {
      const title = (item.title || "").toLowerCase();
      const content = (item.contentSnippet || item.content || "").toLowerCase();
      const text = `${title} ${content}`;

      const hasMatch = keywords.some((keyword) => {
        const keywordLower = keyword.toLowerCase();
        if (text.includes(keywordLower)) return true;

        const wordBoundaryRegex = new RegExp(`\\b${keywordLower}\\b`, "i");
        if (wordBoundaryRegex.test(title) || wordBoundaryRegex.test(content))
          return true;

        const symbolRegex = new RegExp(
          `[\\$\\s]${symbol.toUpperCase()}[\\s\\:\\/\\-\\.]`,
          "i"
        );
        if (symbolRegex.test(text)) return true;

        return false;
      });

      if (hasMatch) {
        relevantArticles.push({
          title: item.title || "제목 없음",
          content: content.substring(0, 200),
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          url: item.link || "",
          publishDate: new Date(item.pubDate || item.isoDate || Date.now()),
        });

        if (relevantArticles.length >= MAX_ARTICLES) break;
      }
    } catch (itemError) {
      console.warn("기사 처리 에러:", itemError.message);
      continue;
    }
  }

  console.log(`📰 ${symbol} 관련 기사 ${relevantArticles.length}개 발견`);
  return relevantArticles;
}

function analyzeSentiment(articles) {
  if (!articles || articles.length === 0) {
    return {
      sentiment: "neutral",
      score: 5.0,
      strength: "neutral",
      recentTrend: "quiet",
      articlesCount: 0,
    };
  }

  const positiveKeywords = [
    "bullish",
    "surge",
    "rally",
    "breakout",
    "adoption",
    "partnership",
    "positive",
    "growth",
    "institutional",
    "approved",
    "milestone",
    "breakthrough",
    "soar",
    "pump",
    "moon",
    "rocket",
    "gains",
    "bull market",
    "uptrend",
    "rising",
    "increase",
    "high",
    "상승",
    "급등",
    "돌파",
    "채택",
    "긍정",
    "호재",
    "강세",
    "상승세",
  ];

  const negativeKeywords = [
    "bearish",
    "crash",
    "dump",
    "regulation",
    "ban",
    "hack",
    "negative",
    "decline",
    "correction",
    "warning",
    "drop",
    "fall",
    "plunge",
    "bear market",
    "downtrend",
    "falling",
    "decrease",
    "low",
    "sell-off",
    "panic",
    "fear",
    "하락",
    "급락",
    "규제",
    "금지",
    "해킹",
    "악재",
    "약세",
    "하락세",
  ];

  let totalScore = 0;
  let scoredArticles = 0;
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  articles.forEach((article) => {
    try {
      const text = `${article.title} ${article.content}`.toLowerCase();
      const isRecent = article.publishDate > oneDayAgo;
      const timeWeight = isRecent ? 1.5 : 1.0;

      const positiveCount = positiveKeywords.filter((word) =>
        text.includes(word.toLowerCase())
      ).length;

      const negativeCount = negativeKeywords.filter((word) =>
        text.includes(word.toLowerCase())
      ).length;

      let articleScore = 5.0;
      if (positiveCount > negativeCount) {
        articleScore = Math.min(5.0 + positiveCount * 1.0, 8.5);
      } else if (negativeCount > positiveCount) {
        articleScore = Math.max(5.0 - negativeCount * 1.0, 1.5);
      }

      totalScore += articleScore * timeWeight;
      scoredArticles += timeWeight;
    } catch (scoreError) {
      console.warn("점수 계산 에러:", scoreError.message);
    }
  });

  const finalScore = scoredArticles > 0 ? totalScore / scoredArticles : 5.0;
  let strength = "neutral";

  if (finalScore >= 7.0) strength = "positive";
  else if (finalScore <= 3.0) strength = "negative";
  else if (finalScore >= 6.0) strength = "slightly_positive";
  else if (finalScore <= 4.0) strength = "slightly_negative";

  return {
    sentiment: strength,
    score: Number(finalScore.toFixed(2)),
    strength,
    recentTrend: articles.length >= 3 ? "active" : "quiet",
    articlesCount: articles.length,
  };
}

// ✅ 핵심 개선: 뉴스 분석 함수 분리
async function analyzeNews(symbol) {
  console.log(`🔄 ${symbol} 뉴스 분석 시작`);

  // 캐시 확인
  const cached = getCachedNews(symbol);
  if (cached) {
    console.log(`📋 ${symbol} 캐시된 데이터 반환`);
    return { ...cached, cached: true };
  }

  // RSS 소스 순차 처리
  let allArticles = [];
  let successSource = null;

  for (const source of RSS_SOURCES) {
    try {
      console.log(`📰 ${symbol} RSS 시도: ${source}`);
      const feed = await fetchRSSFeed(source, 4000);
      const articles = getRelevantArticles(feed, symbol);

      if (articles.length > 0) {
        allArticles = articles;
        successSource = source;
        console.log(`✅ ${symbol} 뉴스 수집 완료: ${articles.length}개`);
        break;
      }
    } catch (error) {
      console.log(`❌ ${symbol} RSS 실패: ${source} - ${error.message}`);
      continue;
    }
  }

  // 감정 분석
  const analysis = analyzeSentiment(allArticles);
  const result = {
    ...analysis,
    articles: allArticles.slice(0, 5),
    source: successSource || "no_source_available",
    cached: false,
    timestamp: Date.now(),
    fetchTime: new Date().toISOString(),
  };

  // 캐시 저장
  cacheNews(symbol, result);

  console.log(
    `✅ ${symbol} 분석 완료: ${analysis.score}/10 (${analysis.strength})`
  );
  return result;
}

// ✅ 메인 핸들러 (다중 코인 지원)
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { symbol, symbols } = req.query;

  try {
    // ✅ 다중 코인 처리 (신규 기능)
    if (symbols) {
      const symbolList = symbols
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s);

      // 최대 5개 코인만 처리 (API 제한)
      const limitedSymbols = symbolList.slice(0, 5);
      console.log(`📊 다중 코인 분석 시작: ${limitedSymbols.join(", ")}`);

      const results = {};

      // API 제한 확인
      if (!checkRateLimit()) {
        console.warn(`⚠️ 다중 분석 API 호출 제한 도달`);
        // 모든 코인에 기본값 반환
        limitedSymbols.forEach((sym) => {
          results[sym] = {
            sentiment: "neutral",
            score: 5.0,
            strength: "neutral",
            recentTrend: "neutral",
            articles: [],
            articlesCount: 0,
            cached: false,
            error: "Rate limit exceeded",
            timestamp: Date.now(),
          };
        });
        return res.status(200).json(results);
      }

      // API 호출 기록
      apiCallTracker.set(Date.now(), `multi:${limitedSymbols.join(",")}`);

      // 각 코인별 분석 실행
      for (const sym of limitedSymbols) {
        try {
          const result = await analyzeNews(sym);
          results[sym] = result;
        } catch (error) {
          console.error(`❌ ${sym} 분석 실패:`, error.message);
          results[sym] = {
            sentiment: "neutral",
            score: 5.0,
            strength: "neutral",
            recentTrend: "neutral",
            articles: [],
            articlesCount: 0,
            cached: false,
            error: error.message,
            timestamp: Date.now(),
            fallback: true,
          };
        }
      }

      console.log(`✅ 다중 코인 분석 완료: ${Object.keys(results).length}개`);
      return res.status(200).json(results);
    }

    // ✅ 단일 코인 처리 (기존 기능 유지)
    if (!symbol) {
      return res.status(400).json({
        error: "Symbol parameter required",
        timestamp: Date.now(),
      });
    }

    // API 제한 확인
    if (!checkRateLimit()) {
      console.warn(`⚠️ ${symbol} API 호출 제한 도달`);
      return res.status(429).json({
        sentiment: "neutral",
        score: 5.0,
        strength: "neutral",
        recentTrend: "neutral",
        articles: [],
        articlesCount: 0,
        cached: false,
        error: "Rate limit exceeded",
        timestamp: Date.now(),
      });
    }

    // API 호출 기록
    apiCallTracker.set(Date.now(), symbol);

    // 단일 코인 분석
    const result = await analyzeNews(symbol);
    return res.status(200).json(result);
  } catch (error) {
    console.error(`❌ 전체 분석 오류:`, error);

    // 다중 코인 오류 처리
    if (symbols) {
      const symbolList = symbols
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s)
        .slice(0, 5);
      const errorResults = {};
      symbolList.forEach((sym) => {
        errorResults[sym] = {
          sentiment: "neutral",
          score: 5.0,
          strength: "neutral",
          recentTrend: "neutral",
          articles: [],
          articlesCount: 0,
          cached: false,
          error: error.message || "Unknown error",
          timestamp: Date.now(),
          fallback: true,
        };
      });
      return res.status(200).json(errorResults);
    }

    // 단일 코인 오류 처리
    return res.status(200).json({
      sentiment: "neutral",
      score: 5.0,
      strength: "neutral",
      recentTrend: "neutral",
      articles: [],
      articlesCount: 0,
      cached: false,
      error: error.message || "Unknown error",
      timestamp: Date.now(),
      fallback: true,
    });
  }
}

// ✅ 캐시 정리 (기존 유지)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_DURATION * 2) {
          cache.delete(key);
        }
      }
      console.log(`🧹 뉴스 캐시 정리: ${cache.size}개 유지`);
    },
    15 * 60 * 1000
  );
}
