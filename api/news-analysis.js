// api/news-analysis.js
import Parser from "rss-parser";

const parser = new Parser({
  headers: {
    "User-Agent": "CryptoWise/1.0 (https://cryptowise.com)",
    Accept: "application/rss+xml, text/xml, application/xml",
  },
});

// 메모리 캐시
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5분
const coinInfoCache = new Map(); // 코인 정보 캐시
const COIN_INFO_CACHE_DURATION = 30 * 60 * 1000; // 30분

// ✅ 동적 코인 키워드 관리
const STATIC_CRYPTO_KEYWORDS = {
  // 주요 코인들 (정적 백업용)
  BTC: ["bitcoin", "btc", "비트코인", "btc/usd", "bitcoin price"],
  ETH: ["ethereum", "eth", "이더리움", "eth/usd", "ethereum price", "ether"],
  XRP: ["ripple", "xrp", "리플", "xrp/usd", "ripple price"],
  ADA: ["cardano", "ada", "카르다노", "ada/usd", "cardano price"],
  SOL: ["solana", "sol", "솔라나", "sol/usd", "solana price"],
  DOT: ["polkadot", "dot", "폴카닷", "dot/usd", "polkadot price"],
  LINK: ["chainlink", "link", "체인링크", "link/usd", "chainlink price"],
  MATIC: ["polygon", "matic", "폴리곤", "matic/usd", "polygon price"],
  AVAX: ["avalanche", "avax", "아발란체", "avax/usd", "avalanche price"],
  ALGO: ["algorand", "algo", "알고랜드", "algo/usd", "algorand price"],
  // 한국 거래소 인기 코인들
  DOGE: ["dogecoin", "doge", "도지코인", "doge/usd", "dogecoin price"],
  SHIB: ["shiba inu", "shib", "시바이누", "shib/usd", "shiba price"],
  ETC: ["ethereum classic", "etc", "이더리움클래식", "etc/usd"],
  BCH: ["bitcoin cash", "bch", "비트코인캐시", "bch/usd"],
  LTC: ["litecoin", "ltc", "라이트코인", "ltc/usd", "litecoin price"],
};

// ✅ 동적으로 코인 정보 가져오기
async function fetchCoinInfo(symbol) {
  const cacheKey = `coin_info_${symbol}`;
  const cached = coinInfoCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < COIN_INFO_CACHE_DURATION) {
    return cached.data;
  }

  try {
    // CoinGecko에서 코인 정보 가져오기 (무료 API)
    const response = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${symbol}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "CryptoWise/1.0",
        },
        signal: AbortSignal.timeout(3000), // 3초 타임아웃
      }
    );

    if (!response.ok)
      throw new Error(`CoinGecko API error: ${response.status}`);

    const data = await response.json();
    const coin = data.coins?.find(
      (c) => c.symbol?.toLowerCase() === symbol.toLowerCase()
    );

    if (coin) {
      const coinInfo = {
        name: coin.name?.toLowerCase(),
        symbol: coin.symbol?.toLowerCase(),
        id: coin.id,
        aliases: [
          coin.name?.toLowerCase(),
          coin.symbol?.toLowerCase(),
          coin.id?.toLowerCase(),
          // 일반적인 변형들
          `${coin.symbol}/usd`.toLowerCase(),
          `${coin.symbol}/krw`.toLowerCase(),
          `${coin.name} price`.toLowerCase(),
        ].filter(Boolean),
      };

      // 캐시 저장
      coinInfoCache.set(cacheKey, {
        data: coinInfo,
        timestamp: Date.now(),
      });

      return coinInfo;
    }
  } catch (error) {
    console.warn(`🔍 ${symbol} CoinGecko 조회 실패:`, error.message);
  }

  // 실패 시 정적 키워드 사용
  return {
    name: symbol.toLowerCase(),
    symbol: symbol.toLowerCase(),
    aliases: STATIC_CRYPTO_KEYWORDS[symbol.toUpperCase()] || [
      symbol.toLowerCase(),
    ],
  };
}

// ✅ 향상된 키워드 생성
async function generateSearchKeywords(symbol) {
  const coinInfo = await fetchCoinInfo(symbol);
  const baseKeywords = [
    symbol.toLowerCase(),
    symbol.toUpperCase(),
    ...coinInfo.aliases,
  ];

  // 일반적인 암호화폐 키워드 (관련성 확장)
  const cryptoGeneralKeywords = [
    "crypto",
    "cryptocurrency",
    "blockchain",
    "digital currency",
    "암호화폐",
    "가상화폐",
    "블록체인",
    "디지털화폐",
    "altcoin",
    "defi",
    "trading",
    "investment",
  ];

  return {
    specific: [...new Set(baseKeywords)], // 특정 코인 키워드
    general: cryptoGeneralKeywords, // 일반 암호화폐 키워드
    coinInfo,
  };
}

function getCachedNews(symbol) {
  const cached = cache.get(symbol);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function cacheNews(symbol, data) {
  cache.set(symbol, {
    data,
    timestamp: Date.now(),
  });

  // 캐시 크기 제한 (메모리 관리)
  if (cache.size > 100) {
    const oldestKey = cache.keys().next().value;
    cache.delete(oldestKey);
  }
}

async function fetchRSSFeed(url, timeout = 6000) {
  return new Promise(async (resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: ${url}`));
    }, timeout);

    try {
      const feed = await parser.parseURL(url);
      clearTimeout(timeoutId);
      resolve(feed);
    } catch (error) {
      clearTimeout(timeoutId);
      reject(error);
    }
  });
}

// ✅ 향상된 뉴스 분석 함수
async function analyzeNewsQuickly(feed, symbol) {
  if (!feed || !feed.items || feed.items.length === 0) {
    console.warn(`📰 ${symbol} RSS 피드 데이터 없음`);
    return {
      sentiment: "neutral",
      score: 5.0,
      strength: "neutral",
      recentTrend: "neutral",
      articles: [],
      source: "no_data_fallback",
      articlesCount: 0,
      error: "No RSS feed data available",
    };
  }

  const keywords = await generateSearchKeywords(symbol);
  const relevantArticles = [];

  console.log(`🔍 ${symbol} 키워드 검색:`, {
    specific: keywords.specific.slice(0, 5),
    coinName: keywords.coinInfo.name,
  });

  // ✅ 개선된 관련 기사 필터링
  for (const item of feed.items.slice(0, 150)) {
    // 더 많은 기사 검토
    const title = (item.title || "").toLowerCase();
    const content = (item.contentSnippet || item.content || "").toLowerCase();
    const text = `${title} ${content}`;

    // 특정 코인 키워드 매칭 (높은 우선순위)
    const specificMatch = keywords.specific.some((keyword) => {
      const keywordLower = keyword.toLowerCase();
      return text.includes(keywordLower) || title.includes(keywordLower);
    });

    // 일반 암호화폐 키워드 매칭 (낮은 우선순위, 주요 코인만)
    const generalMatch =
      ["BTC", "ETH", "bitcoin", "ethereum"].includes(symbol.toUpperCase()) &&
      keywords.general.some((keyword) => text.includes(keyword.toLowerCase()));

    if (specificMatch || generalMatch) {
      relevantArticles.push({
        title: item.title || "",
        content: (content || "").substring(0, 300),
        publishedAt: item.pubDate || item.isoDate,
        url: item.link,
        relevanceScore: specificMatch ? 2 : 1, // 특정 매칭이 더 높은 점수
        publishDate: new Date(item.pubDate || item.isoDate || Date.now()),
      });

      if (relevantArticles.length >= 15) break; // 충분한 기사 수집
    }
  }

  console.log(`📰 ${symbol} 관련 기사 ${relevantArticles.length}개 발견`);

  if (relevantArticles.length === 0) {
    return {
      sentiment: "neutral",
      score: 5.0,
      strength: "neutral",
      recentTrend: "quiet",
      articles: [],
      source: "no_relevant_news",
      articlesCount: 0,
    };
  }

  // ✅ 향상된 감정 분석 키워드
  const sentimentKeywords = {
    positive: [
      // 영어
      "bullish",
      "surge",
      "rally",
      "breakout",
      "moon",
      "pump",
      "soar",
      "skyrocket",
      "adoption",
      "partnership",
      "upgrade",
      "positive",
      "growth",
      "breakthrough",
      "innovation",
      "institutional",
      "etf",
      "approved",
      "milestone",
      "record high",
      "all-time high",
      "ath",
      "strong",
      "optimistic",
      "buy",
      "long",
      "investment",
      // 한국어
      "상승",
      "급등",
      "돌파",
      "채택",
      "파트너십",
      "긍정",
      "호재",
      "신고가",
      "최고가",
      "투자",
      "매수",
      "강세",
      "상승세",
      "호황",
      "기관투자",
      "승인",
    ],
    negative: [
      // 영어
      "bearish",
      "crash",
      "dump",
      "plunge",
      "drop",
      "fall",
      "decline",
      "sell-off",
      "regulation",
      "ban",
      "hack",
      "negative",
      "risk",
      "concern",
      "fear",
      "panic",
      "correction",
      "regulatory",
      "lawsuit",
      "investigation",
      "crackdown",
      "volatile",
      "uncertainty",
      "warning",
      "caution",
      "sell",
      "short",
      // 한국어
      "하락",
      "급락",
      "규제",
      "금지",
      "해킹",
      "부정",
      "악재",
      "조정",
      "매도",
      "약세",
      "하락세",
      "불안",
      "경고",
      "주의",
      "리스크",
      "위험",
    ],
    neutral: [
      "analysis",
      "report",
      "update",
      "commentary",
      "overview",
      "review",
      "분석",
      "리포트",
      "업데이트",
      "전망",
      "검토",
      "보고서",
    ],
  };

  // ✅ 시간 가중치 적용 감정 분석
  let totalScore = 0;
  let scoredArticles = 0;
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  relevantArticles.forEach((article) => {
    const text = `${article.title} ${article.content}`.toLowerCase();
    const articleDate = article.publishDate;

    // 시간 가중치 계산
    let timeWeight = 1.0;
    if (articleDate > oneDayAgo) {
      timeWeight = 2.0; // 24시간 이내 뉴스 높은 가중치
    } else if (articleDate > threeDaysAgo) {
      timeWeight = 1.5; // 3일 이내 뉴스 중간 가중치
    }

    // 관련성 가중치
    const relevanceWeight = article.relevanceScore || 1;

    const finalWeight = timeWeight * relevanceWeight;

    // 감정 키워드 매칭
    const positiveCount = sentimentKeywords.positive.filter((word) =>
      text.includes(word.toLowerCase())
    ).length;

    const negativeCount = sentimentKeywords.negative.filter((word) =>
      text.includes(word.toLowerCase())
    ).length;

    let articleScore = 5.0; // 중립 기본값

    if (positiveCount > negativeCount) {
      // 긍정적 뉴스
      const intensity = Math.min(positiveCount * 1.5, 5.0);
      articleScore = 5.0 + intensity;
    } else if (negativeCount > positiveCount) {
      // 부정적 뉴스
      const intensity = Math.min(negativeCount * 1.5, 5.0);
      articleScore = 5.0 - intensity;
    }

    // 0-10 범위로 제한
    articleScore = Math.max(0, Math.min(10, articleScore));

    totalScore += articleScore * finalWeight;
    scoredArticles += finalWeight;

    // 디버깅용
    if (positiveCount > 0 || negativeCount > 0) {
      console.log(
        `📊 ${symbol} 기사 분석: ${articleScore.toFixed(1)}점 (긍정:${positiveCount}, 부정:${negativeCount}, 가중치:${finalWeight.toFixed(1)})`
      );
    }
  });

  const finalScore = scoredArticles > 0 ? totalScore / scoredArticles : 5.0;

  // ✅ 정교한 강도 계산
  let strength = "neutral";
  if (finalScore >= 8.5) strength = "very_positive";
  else if (finalScore >= 7.5) strength = "positive";
  else if (finalScore >= 6.5) strength = "slightly_positive";
  else if (finalScore <= 1.5) strength = "very_negative";
  else if (finalScore <= 2.5) strength = "negative";
  else if (finalScore <= 3.5) strength = "slightly_negative";

  // ✅ 트렌드 분석 개선
  const recentArticles = relevantArticles.filter(
    (a) => a.publishDate > oneDayAgo
  );
  let recentTrend = "neutral";

  if (recentArticles.length >= 3) {
    const recentAvgScore =
      recentArticles.reduce((sum, article) => {
        const text = `${article.title} ${article.content}`.toLowerCase();
        const pos = sentimentKeywords.positive.filter((w) =>
          text.includes(w)
        ).length;
        const neg = sentimentKeywords.negative.filter((w) =>
          text.includes(w)
        ).length;
        return sum + (pos > neg ? 1 : neg > pos ? -1 : 0);
      }, 0) / recentArticles.length;

    if (recentAvgScore > 0.3) recentTrend = "improving";
    else if (recentAvgScore < -0.3) recentTrend = "worsening";
    else recentTrend = "stable";
  } else {
    recentTrend = relevantArticles.length >= 2 ? "active" : "quiet";
  }

  console.log(
    `📊 ${symbol} 감정 분석 완료: ${finalScore.toFixed(2)}/10 (${strength}) - ${relevantArticles.length}개 기사, 트렌드: ${recentTrend}`
  );

  return {
    sentiment: strength,
    score: Number(finalScore.toFixed(2)),
    strength,
    recentTrend,
    articles: relevantArticles.slice(0, 10), // 상위 10개만 반환
    source: "live_analysis",
    articlesCount: relevantArticles.length,
    debugInfo: {
      totalWeightedArticles: scoredArticles,
      recentArticles: recentArticles.length,
      coinKeywords: keywords.specific.length,
      cacheUsed: keywords.coinInfo.id ? "dynamic" : "static",
    },
  };
}

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: "Symbol parameter required" });
  }

  try {
    // 캐시 확인
    const cached = getCachedNews(symbol);
    if (cached) {
      console.log(`📋 ${symbol} 캐시된 데이터 반환`);
      return res.json({
        ...cached,
        cached: true,
        timestamp: Date.now(),
      });
    }

    console.log(`🔄 ${symbol} 새로운 뉴스 분석 시작...`);

    // ✅ RSS 소스들 (신뢰성 순서로 정렬)
    const rssSources = [
      "https://cointelegraph.com/rss",
      "https://coindesk.com/arc/outbound/feeds/rss",
      "https://cryptonews.com/news/feed/",
      "https://bitcoinist.com/feed/",
      "https://decrypt.co/feed",
      "https://cryptopotato.com/feed/",
    ];

    let analysis = null;
    let successSource = null;
    let lastError = null;

    // RSS 소스들을 순차적으로 시도 (더 관대한 타임아웃)
    for (const source of rssSources) {
      try {
        console.log(`🔄 ${symbol} 뉴스 수집 시도: ${source}`);
        const feed = await fetchRSSFeed(source, 6000); // 6초 타임아웃
        analysis = await analyzeNewsQuickly(feed, symbol);
        successSource = source;
        console.log(`✅ ${symbol} 뉴스 수집 성공: ${source}`);
        break;
      } catch (error) {
        lastError = error;
        console.log(
          `❌ ${symbol} 뉴스 수집 실패: ${source} - ${error.message}`
        );
        continue;
      }
    }

    // ✅ 모든 소스가 실패한 경우 더 상세한 폴백
    if (!analysis) {
      console.warn(`⚠️ ${symbol} 모든 RSS 소스 실패, 폴백 데이터 반환`);
      analysis = {
        sentiment: "neutral",
        score: 5.0,
        strength: "neutral",
        recentTrend: "quiet",
        articles: [],
        source: "all_sources_failed",
        error: lastError?.message || "All RSS sources failed",
        articlesCount: 0,
        debugInfo: {
          attemptedSources: rssSources.length,
          lastError: lastError?.message,
        },
      };
    }

    // 결과 검증
    if (analysis.score < 0 || analysis.score > 10) {
      console.warn(
        `⚠️ ${symbol} 점수 범위 오류: ${analysis.score}, 5.0으로 보정`
      );
      analysis.score = 5.0;
      analysis.strength = "neutral";
    }

    // 캐시 저장
    cacheNews(symbol, analysis);

    const response = {
      ...analysis,
      cached: false,
      timestamp: Date.now(),
      successSource,
      processingTime: Date.now(),
    };

    console.log(
      `✅ ${symbol} 뉴스 분석 완료: ${analysis.score}/10 (${analysis.strength})`
    );

    return res.json(response);
  } catch (error) {
    console.error(`❌ ${symbol} 뉴스 분석 중 예외 발생:`, error);

    // 에러 시에도 유용한 정보 제공
    return res.status(500).json({
      sentiment: "neutral",
      score: 5.0,
      strength: "neutral",
      recentTrend: "neutral",
      articles: [],
      source: "error_fallback",
      cached: false,
      error: error.message,
      timestamp: Date.now(),
      errorType: error.name || "UnknownError",
    });
  }
}

// ✅ 캐시 정리 함수 (메모리 관리)
setInterval(
  () => {
    const now = Date.now();

    // 뉴스 캐시 정리
    for (const [key, value] of cache.entries()) {
      if (now - value.timestamp > CACHE_DURATION * 2) {
        cache.delete(key);
      }
    }

    // 코인 정보 캐시 정리
    for (const [key, value] of coinInfoCache.entries()) {
      if (now - value.timestamp > COIN_INFO_CACHE_DURATION * 2) {
        coinInfoCache.delete(key);
      }
    }

    console.log(
      `🧹 캐시 정리 완료 - 뉴스: ${cache.size}개, 코인정보: ${coinInfoCache.size}개`
    );
  },
  10 * 60 * 1000
); // 10분마다 정리
