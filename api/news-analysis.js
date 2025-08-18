// api/news-analysis.js - 동적 키워드 생성 & 확장성 개선

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
const MAX_CACHE_SIZE = 50;
const MAX_ARTICLES = 8;

// ✅ API 호출 제한
const apiCallTracker = new Map();
const MAX_CALLS_PER_MINUTE = 15; // 더 보수적으로

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

// ✅ 동적 키워드 생성 함수 (핵심 개선!)
function generateDynamicKeywords(symbol) {
  const symbolUpper = symbol.toUpperCase();
  const symbolLower = symbol.toLowerCase();

  // 기본 키워드에서 시작
  let keywords = CORE_KEYWORDS[symbolUpper] || [];

  // ✅ 동적으로 키워드 확장 (새로운 코인에도 대응)
  const dynamicKeywords = [
    // 심볼 기반 변형들
    symbolLower,
    symbolUpper,
    `$${symbolUpper}`, // $BTC, $SOL 형태
    `${symbolUpper}/USD`,
    `${symbolUpper}/USDT`,
    `${symbolUpper} price`,
    `${symbolLower} price`,
    `${symbolUpper} coin`,
    `${symbolLower} coin`,
    `${symbolUpper} token`,
    `${symbolLower} token`,

    // 일반적인 패턴들
    `${symbolLower} crypto`,
    `${symbolLower} cryptocurrency`,
    `${symbolLower} blockchain`,
    `${symbolUpper} analysis`,
    `${symbolLower} trading`,
    `${symbolUpper} market`,

    // 가격 관련
    `${symbolUpper} surge`,
    `${symbolUpper} rally`,
    `${symbolUpper} crash`,
    `${symbolUpper} pump`,
    `${symbolUpper} dump`,
  ];

  // 중복 제거하고 합치기
  const allKeywords = [...new Set([...keywords, ...dynamicKeywords])];

  console.log(
    `🔍 ${symbol} 생성된 키워드 ${allKeywords.length}개:`,
    allKeywords.slice(0, 10)
  );
  return allKeywords;
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
    data: {
      ...data,
      cached: false,
      fetchTime: new Date().toISOString(),
    },
    timestamp: Date.now(),
  });
}

// ✅ 개선된 RSS 소스 (검증된 URL들)
const RSS_SOURCES = [
  "https://cointelegraph.com/rss",
  "https://www.coindesk.com/arc/outboundfeeds/rss/", // ✅ 수정된 URL
  "https://cryptonews.com/news/feed/",
  "https://bitcoinist.com/feed/", // ✅ 추가
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

// ✅ 개선된 관련 기사 필터링 (유연한 매칭)
function getRelevantArticles(feed, symbol) {
  if (!feed?.items || !Array.isArray(feed.items)) {
    console.warn("Invalid feed items");
    return [];
  }

  const keywords = generateDynamicKeywords(symbol);
  const relevantArticles = [];

  // ✅ 첫 3개 기사 제목 디버깅
  console.log(
    `📖 첫 3개 기사 제목:`,
    feed.items
      .slice(0, 3)
      .map((item) => `"${item.title}"`)
      .join(", ")
  );

  for (const item of feed.items.slice(0, 30)) {
    // 30개 검토로 확장
    try {
      const title = (item.title || "").toLowerCase();
      const content = (item.contentSnippet || item.content || "").toLowerCase();
      const text = `${title} ${content}`;

      // ✅ 더 유연한 매칭 로직
      const hasMatch = keywords.some((keyword) => {
        const keywordLower = keyword.toLowerCase();

        // 1. 완전 일치
        if (text.includes(keywordLower)) return true;

        // 2. 단어 경계 일치 (더 정확한 매칭)
        const wordBoundaryRegex = new RegExp(`\\b${keywordLower}\\b`, "i");
        if (wordBoundaryRegex.test(title) || wordBoundaryRegex.test(content))
          return true;

        // 3. 심볼 특별 매칭 ($BTC, BTC: 등)
        const symbolRegex = new RegExp(
          `[\\$\\s]${symbol.toUpperCase()}[\\s\\:\\/\\-\\.]`,
          "i"
        );
        if (symbolRegex.test(text)) return true;

        return false;
      });

      if (hasMatch) {
        console.log(`✅ 매칭됨: "${item.title}"`);
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

// ✅ 개선된 감정 분석
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
    // 영어
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
    // 한국어
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
    // 영어
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
    // 한국어
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
      const timeWeight = isRecent ? 1.5 : 1.0; // 최근 뉴스 가중치

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

      console.log(
        `📊 기사 점수: ${articleScore.toFixed(1)} (긍정:${positiveCount}, 부정:${negativeCount})`
      );
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

export default async function handler(req, res) {
  // ✅ CORS 헤더
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { symbol } = req.query;
  if (!symbol) {
    return res.status(400).json({
      error: "Symbol parameter required",
      timestamp: Date.now(),
    });
  }

  try {
    console.log(`🔄 ${symbol} 뉴스 분석 시작`);

    // ✅ 캐시 확인
    const cached = getCachedNews(symbol);
    if (cached) {
      console.log(`📋 ${symbol} 캐시된 데이터 반환`);
      return res.status(200).json({
        ...cached,
        cached: true,
        timestamp: Date.now(),
      });
    }

    // ✅ API 호출 제한 확인
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

    // ✅ API 호출 기록
    apiCallTracker.set(Date.now(), symbol);

    let allArticles = [];
    let successSource = null;

    // ✅ RSS 소스 순차 처리
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

    // ✅ 감정 분석
    const analysis = analyzeSentiment(allArticles);
    const response = {
      ...analysis,
      articles: allArticles.slice(0, 5),
      source: successSource || "no_source_available",
      cached: false,
      timestamp: Date.now(),
      fetchTime: new Date().toISOString(),
    };

    // ✅ 캐시 저장
    cacheNews(symbol, response);

    console.log(
      `✅ ${symbol} 분석 완료: ${analysis.score}/10 (${analysis.strength})`
    );
    return res.status(200).json(response);
  } catch (error) {
    console.error(`❌ ${symbol} 전체 에러:`, error);

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

// ✅ 캐시 정리
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
