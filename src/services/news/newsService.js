// src/services/news/newsService.js

/**
 * 실무용 뉴스 수집 및 감성 분석 서비스 (CORS 문제 해결)
 * - CORS 프록시를 통한 RSS 접근
 * - 에러 처리 강화
 * - Fallback 시스템
 */
class NewsService {
  constructor() {
    // CORS 프록시를 통한 RSS 소스
    this.corsProxy = import.meta.env.VITE_RSS_PROXY || '/api/rss?url='; 
    this.sources = [
      'https://cointelegraph.com/rss',
      'https://coindesk.com/arc/outboundfeeds/rss/',
      'https://bitcoinist.com/feed/',
      'https://cryptonews.com/news/feed/'
    ];
    
    // 백업 프록시들 (Fallback용)
    this.backupProxies = [
      'https://cors-anywhere.herokuapp.com/',
      'https://api.allorigins.win/raw?url=',
      'https://cors.sh/'
    ];
    
    this.cache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30분
    this.maxCacheSize = 1000;
    
    // 캐시 정리 (메모리 누수 방지)
    setInterval(() => this.cleanupCache(), 10 * 60 * 1000);
  }

  /**
   * 감성 점수 반환 (CORS 에러 처리 포함)
   */
  async getSentimentScore(symbol, timestamp) {
    const cacheKey = `sentiment_${symbol}_${timestamp}`;
    
    try {
      // 캐시 확인
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.score;
        }
      }

      const startTime = Date.now();
      const news = await this.collectRecentNews(symbol);
      
      if (news.length === 0) {
        console.warn(`${symbol}에 대한 뉴스를 찾을 수 없습니다.`);
        return 0;
      }
      
      const score = this.analyzeSentiment(news, symbol);
      const processingTime = Date.now() - startTime;
      
      // 캐시 저장
      this.cache.set(cacheKey, {
        score,
        timestamp: Date.now(),
        newsCount: news.length,
        processingTime
      });

      console.log(`${symbol} 감성 점수: ${score.toFixed(3)} (뉴스 ${news.length}개)`);
      return score;
      
    } catch (error) {
      console.error(`뉴스 감성 분석 실패 (${symbol}):`, error.message);
      
      // Fallback: 이전 캐시값 사용
      const oldCache = Array.from(this.cache.entries())
        .filter(([key]) => key.startsWith(`sentiment_${symbol}_`))
        .sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      if (oldCache.length > 0) {
        const latest = oldCache[0][1]; // [ [key, value], ... ]
        if (latest && typeof latest.score !== 'undefined') {
          console.log(`${symbol} 이전 캐시값 사용: ${latest.score}`);
          return latest.score;
        }
      }
      
      return 0;
    }
  }

  /**
   * RSS 뉴스 수집 (CORS 우회)
   */
  async collectRecentNews(symbol) {
    const allNews = [];
    const keywords = this.getKeywords(symbol);
    
    // 병렬로 모든 소스에서 뉴스 수집 시도
    const promises = this.sources.map(source => this.fetchRSSWithFallback(source, keywords));
    const results = await Promise.allSettled(promises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allNews.push(...result.value);
      }
    });
    
    return allNews
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 50);
  }

  /**
   * Fallback 시스템을 갖춘 RSS 가져오기
   */
  async fetchRSSWithFallback(source, keywords) {
    // 1차: 메인 프록시 시도
    try {
      return await this.fetchRSSFeed(this.corsProxy + encodeURIComponent(source), keywords);
    } catch (error) {
      console.warn(`메인 프록시 실패 (${source}):`, error.message);
    }
    
    // 2차: 백업 프록시들 순차 시도
    for (const proxy of this.backupProxies) {
      try {
        const proxyUrl = proxy.includes('url=') 
          ? proxy + encodeURIComponent(source)
          : proxy + source;
        return await this.fetchRSSFeed(proxyUrl, keywords);
      } catch (error) {
        console.warn(`백업 프록시 실패 (${proxy}):`, error.message);
        continue;
      }
    }
    
    // 3차: 로컬 데모 데이터 반환 (최후의 수단)
    console.warn(`모든 프록시 실패, 데모 데이터 사용: ${source}`);
    return this.getDemoNews(keywords);
  }

  /**
   * RSS 피드 가져오기 (개선된 에러 처리)
   */
  async fetchRSSFeed(url, keywords) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'User-Agent': 'Mozilla/5.0 (compatible; CryptoWise/1.0)',
        },
        mode: 'cors'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      return this.parseRSSXML(text, keywords);
      
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('요청 타임아웃');
      }
      throw error;
    }
  }

  /**
   * RSS XML 파싱 (강화된 에러 처리)
   */
  parseRSSXML(xmlText, keywords) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // XML 파싱 에러 확인
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('XML 파싱 에러: ' + parserError.textContent);
      }
      
      const items = Array.from(xmlDoc.querySelectorAll('item'));
      const relevantNews = [];
      
      items.forEach(item => {
        try {
          const title = item.querySelector('title')?.textContent?.trim() || '';
          const description = item.querySelector('description')?.textContent || '';
          const link = item.querySelector('link')?.textContent?.trim() || '';
          const pubDate = item.querySelector('pubDate')?.textContent || '';
          
          // HTML 태그 제거
          const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
          
          if (this.isRelevant({ title, description: cleanDescription }, keywords)) {
            relevantNews.push({
              title,
              description: cleanDescription,
              link,
              pubDate: new Date(pubDate),
              source: this.getSourceName(link)
            });
          }
        } catch (itemError) {
          console.warn('RSS 아이템 파싱 실패:', itemError.message);
        }
      });
      
      return relevantNews.slice(0, 10);
    } catch (error) {
      console.error('XML 파싱 실패:', error.message);
      return [];
    }
  }

  /**
   * 데모 뉴스 데이터 (Fallback용)
   */
  getDemoNews(keywords) {
    const demoArticles = [
      {
        title: `${keywords[0]} 시장 동향 분석`,
        description: `${keywords} 관련 최신 시장 분석 및 전문가 의견`,
        link: 'https://example.com/demo',
        pubDate: new Date(),
        source: 'demo'
      },
      {
        title: `${keywords[0]} 기술적 분석 리포트`,
        description: `${keywords}의 기술적 지표 및 차트 분석`,
        link: 'https://example.com/demo2',
        pubDate: new Date(Date.now() - 3600000), // 1시간 전
        source: 'demo'
      }
    ];
    
    return demoArticles;
  }

  /**
   * 감성 분석 (개선된 버전)
   */
  analyzeSentiment(articles, symbol) {
    if (!articles.length) return 0;

    const sentimentKeywords = {
      strong_positive: ['breakout', 'surge', 'rally', 'moon', 'skyrocket', 'ath', 'all-time high'],
      positive: ['bullish', 'adoption', 'partnership', 'upgrade', 'growth', 'rise', 'gain', 'pump'],
      neutral_positive: ['stable', 'consolidate', 'hold', 'support'],
      neutral_negative: ['volatile', 'uncertain', 'sideways'],
      negative: ['bearish', 'decline', 'drop', 'fall', 'correction', 'pullback'],
      strong_negative: ['crash', 'dump', 'plummet', 'collapse', 'ban', 'hack', 'exploit']
    };

    let totalScore = 0;
    let totalWeight = 0;

    articles.forEach(article => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      const age = this.getArticleAge(article.pubDate);
      
      // 가중치 계산
      const timeWeight = age < 2 ? 1.0 : age < 6 ? 0.7 : age < 24 ? 0.4 : 0.1;
      const symbolWeight = this.isSymbolMentioned(text, symbol) ? 2.0 : 0.5;
      const sourceWeight = this.getSourceWeight(article.source);
      const finalWeight = timeWeight * symbolWeight * sourceWeight;
      
      let articleScore = 0;
      
      // 감성 키워드 점수 계산
      Object.entries(sentimentKeywords).forEach(([category, keywords]) => {
        const matches = keywords.reduce((count, keyword) => {
          return count + (text.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
        }, 0);
        
        if (matches > 0) {
          switch(category) {
            case 'strong_positive': articleScore += matches * 3; break;
            case 'positive': articleScore += matches * 1.5; break;
            case 'neutral_positive': articleScore += matches * 0.5; break;
            case 'neutral_negative': articleScore -= matches * 0.5; break;
            case 'negative': articleScore -= matches * 1.5; break;
            case 'strong_negative': articleScore -= matches * 3; break;
          }
        }
      });
      
      totalScore += articleScore * finalWeight;
      totalWeight += finalWeight;
    });

    if (totalWeight === 0) return 0;
    
    const rawScore = totalScore / totalWeight;
    return Math.tanh(rawScore / 10);
  }

  /**
   * 뉴스 요약 생성
   */
  async getNewsSummary(symbol) {
    try {
      const news = await this.collectRecentNews(symbol);
      const score = this.analyzeSentiment(news, symbol);
      
      return {
        symbol,
        sentimentScore: score,
        sentiment: this.getSentimentLabel(score),
        newsCount: news.length,
        topHeadlines: news.slice(0, 3).map(article => ({
          title: article.title,
          link: article.link,
          source: article.source,
          age: this.getArticleAge(article.pubDate)
        })),
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('뉴스 요약 생성 실패:', error);
      return {
        symbol,
        sentimentScore: 0,
        sentiment: 'Neutral',
        newsCount: 0,
        topHeadlines: [],
        lastUpdated: new Date().toISOString(),
        error: error.message
      };
    }
  }

  // 유틸리티 메서드들
  getArticleAge(pubDate) {
    const now = new Date();
    const articleDate = new Date(pubDate);
    return (now - articleDate) / (1000 * 60 * 60);
  }

  getSourceWeight(source) {
    const weights = {
      'cointelegraph': 1.0,
      'coindesk': 1.0,
      'bitcoinist': 0.8,
      'cryptonews': 0.7,
      'demo': 0.5
    };
    
    const sourceName = source.toLowerCase();
    for (const [key, weight] of Object.entries(weights)) {
      if (sourceName.includes(key)) return weight;
    }
    return 0.5;
  }

  getKeywords(symbol) {
    const symbolMap = {
      'BTC': ['bitcoin', 'btc'],
      'ETH': ['ethereum', 'eth', 'ether'],
      'SOL': ['solana', 'sol'],
      'ADA': ['cardano', 'ada'],
      'DOT': ['polkadot', 'dot'],
      'LINK': ['chainlink', 'link'],
      'XRP': ['ripple', 'xrp']
    };
    return symbolMap[symbol] || [symbol.toLowerCase()];
  }

  isRelevant(item, keywords) {
    const text = `${item.title} ${item.description || ''}`.toLowerCase();
    return keywords.some(keyword => text.includes(keyword));
  }

  isSymbolMentioned(text, symbol) {
    const keywords = this.getKeywords(symbol);
    return keywords.some(keyword => text.includes(keyword));
  }

  getSourceName(url) {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '').split('.')[0];
    } catch {
      return 'unknown';
    }
  }

  getSentimentLabel(score) {
    if (score > 0.3) return 'Very Positive';
    if (score > 0.1) return 'Positive';
    if (score > -0.1) return 'Neutral';
    if (score > -0.3) return 'Negative';
    return 'Very Negative';
  }

  cleanupCache() {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (this.cache.size > this.maxCacheSize) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      for (let i = this.maxCacheSize; i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`뉴스 캐시 정리: ${deletedCount}개 항목 삭제`);
    }
  }

  clearCache() {
    this.cache.clear();
    console.log('뉴스 캐시가 완전히 정리되었습니다.');
  }
}

// 싱글톤 인스턴스 생성
const newsService = new NewsService();
export default newsService;
