// src/services/news/newsService.js
/**
 * 실무용 뉴스 수집 및 감성 분석 서비스
 * - Vercel 서버리스 프록시를 통한 RSS 접근 (CORS 문제 해결)
 * - 에러 처리 강화
 * - Fallback 시스템
 */
class NewsService {
  constructor() {
    this.sources = [
      'https://cointelegraph.com/rss',
      'https://coindesk.com/arc/outboundfeeds/rss/',
      'https://bitcoinist.com/feed/',
      'https://cryptonews.com/news/feed/'
    ];
    
    this.cache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30분
    this.maxCacheSize = 1000;
    
    // 🆕 실서버 감지 (window 객체 안전 체크)
    this.isProduction = typeof window !== 'undefined' && 
                       !window.location.hostname.includes('localhost') &&
                       !window.location.hostname.includes('127.0.0.1');
    
    // 주기적 캐시 정리
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
        return this.generateDummySentimentScore(symbol);
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
        .sort((a, b) => b[1].timestamp - a[1].timestamp)[0]?.[1];
      
      if (oldCache) {
        console.log(`${symbol} 이전 캐시값 사용: ${oldCache.score}`);
        return oldCache.score;
      }
      
      return this.generateDummySentimentScore(symbol);
    }
  }

  /**
   * 🆕 더미 감성 점수 생성
   */
  generateDummySentimentScore(symbol) {
    // 심볼별 베이스 감성 점수 (현실적인 범위)
    const baseScores = {
      'BTC': 0.15,   // 비트코인은 보통 긍정적
      'ETH': 0.10,   // 이더리움도 긍정적
      'SOL': 0.05,   // 솔라나는 중립~약간 긍정
      'ADA': 0.02,   // 카르다노는 중립
      'XRP': -0.05,  // 리플은 약간 부정적 (규제 이슈)
      'LINK': 0.08,  // 체인링크는 긍정적
      'DOT': 0.03    // 폴카닷은 중립~약간 긍정
    };
    
    const baseScore = baseScores[symbol] || 0;
    
    // 시간에 따른 약간의 변동성 추가 (±0.1 범위)
    const timeVariation = Math.sin(Date.now() / 86400000) * 0.05; // 일별 변동
    const randomVariation = (Math.random() - 0.5) * 0.1; // 랜덤 변동
    
    const finalScore = baseScore + timeVariation + randomVariation;
    
    // -1 ~ 1 범위로 제한
    return Math.max(-1, Math.min(1, finalScore));
  }

  /**
   * RSS 피드에서 최근 뉴스 수집
   * @param {string} symbol - 대상 심볼
   * @returns {Promise<Array>} 뉴스 기사 배열
   */
  async collectRecentNews(symbol) {
    const allNews = [];
    const keywords = this.getKeywords(symbol);
    
    // 모든 심볼의 뉴스를 병렬로 로드
    const promises = this.sources.map(source => this.fetchRSSFeed(source, keywords));
    const results = await Promise.allSettled(promises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.length > 0) {
        allNews.push(...result.value);
      }
    });
    
    return allNews
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate)) // 최신순 정렬
      .slice(0, 50); // 전체 최대 50개
  }

  /**
   * RSS 피드 가져오기 (Vercel 프록시 사용)
   * @param {string} source - RSS URL
   * @param {Array} keywords - 필터링 키워드
   * @returns {Promise<Array>} 파싱된 뉴스 배열
   */
  async fetchRSSFeed(source, keywords) {
    try {
      // 🆕 Vercel 프록시 사용
      const proxyUrl = `/api/rss-proxy?url=${encodeURIComponent(source)}`;
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(`Proxy HTTP ${response.status}`);
      }

      const xmlText = await response.text();

      // 🆕 XML 유효성 검사
      if (!xmlText.includes('<rss') && !xmlText.includes('<?xml')) {
        throw new Error('Invalid XML response');
      }

      return this.parseRSSXML(xmlText, keywords);
    } catch (error) {
      console.warn(`RSS 피드 오류 (${source}):`, error.message);
      return [];
    }
  }

  /**
   * RSS XML 직접 파싱
   * @param {string} xmlText - RSS XML 문자열
   * @param {Array} keywords - 필터링 키워드
   * @returns {Array} 파싱된 뉴스 배열
   */
  parseRSSXML(xmlText, keywords) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      const items = Array.from(xmlDoc.querySelectorAll('item'));
      const relevantNews = [];
      
      items.forEach(item => {
        const title = item.querySelector('title')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDate = item.querySelector('pubDate')?.textContent || '';
        
        // HTML 태그 제거
        const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
        
        if (this.isRelevant({ title, description: cleanDescription }, keywords)) {
          relevantNews.push({
            title: title.trim(),
            description: cleanDescription,
            link: link.trim(),
            pubDate: new Date(pubDate),
            source: this.getSourceName(link)
          });
        }
      });
      
      return relevantNews.slice(0, 10); // 소스당 최대 10개
    } catch (error) {
      console.error('XML 파싱 오류:', error);
      return [];
    }
  }

  /**
   * 🆕 개선된 뉴스 요약 생성
   */
  async getNewsSummary(symbol) {
    try {
      console.log(`🔄 ${symbol} 뉴스 요약 생성 중...`);
      
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
        sentimentScore: this.generateDummySentimentScore(symbol),
        sentiment: this.getSentimentLabel(this.generateDummySentimentScore(symbol)),
        newsCount: 0,
        topHeadlines: this.generateDummyHeadlines(symbol),
        lastUpdated: new Date().toISOString(),
        isDummy: true
      };
    }
  }

  /**
   * 🆕 더미 헤드라인 생성
   */
  generateDummyHeadlines(symbol) {
    const headlines = {
      'BTC': [
        { title: 'Bitcoin 시장 분석: 기관 투자 지속', source: 'demo', age: 2 },
        { title: 'BTC ETF 승인 이후 변화하는 시장', source: 'demo', age: 5 },
        { title: '비트코인 채굴 난이도 조정 완료', source: 'demo', age: 8 }
      ],
      'ETH': [
        { title: 'Ethereum 2.0 업그레이드 진행 상황', source: 'demo', age: 3 },
        { title: 'DeFi 생태계 성장과 ETH 수요', source: 'demo', age: 6 },
        { title: '이더리움 가스비 최적화 방안', source: 'demo', age: 10 }
      ]
    };
    
    return headlines[symbol] || [
      { title: `${symbol} 최근 시장 동향`, source: 'demo', age: 2 },
      { title: `${symbol} 기술적 분석 리포트`, source: 'demo', age: 5 },
      { title: `${symbol} 투자자 심리 변화`, source: 'demo', age: 8 }
    ];
  }

  // 기존 메서드들 유지 (analyzeSentiment, getKeywords 등)
  analyzeSentiment(articles, symbol) {
    if (!articles.length) return 0;

    // 실제 뉴스에서 자주 등장하는 키워드로 업데이트
    const sentimentKeywords = {
      strong_positive: ['breakout', 'surge', 'rally', 'moonshot', 'skyrocket', 'ATH', 'all-time high'],
      positive: ['bullish', 'adoption', 'partnership', 'upgrade', 'growth', 'rise', 'gain', 'pump'],
      neutral_positive: ['stable', 'consolidate', 'hold', 'support'],
      neutral_negative: ['volatile', 'uncertain', 'sideways'],
      negative: ['bearish', 'decline', 'drop', 'fall', 'correction', 'pullback', 'resistance'],
      strong_negative: ['crash', 'dump', 'plummet', 'collapse', 'ban', 'hack', 'exploit']
    };

    let totalScore = 0;
    let totalWeight = 0;

    articles.forEach(article => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      const age = this.getArticleAge(article.pubDate);
      
      // 시간별 가중치 (최신 뉴스일수록 높은 가중치)
      const timeWeight = age < 2 ? 1.0 : age < 6 ? 0.7 : age < 24 ? 0.4 : 0.1;
      
      // 심볼 언급 가중치
      const symbolWeight = this.isSymbolMentioned(text, symbol) ? 2.0 : 0.5;
      
      // 소스별 신뢰도 가중치
      const sourceWeight = this.getSourceWeight(article.source);
      
      const finalWeight = timeWeight * symbolWeight * sourceWeight;
      
      let articleScore = 0;
      
      // 강한 감성 키워드 점수 계산
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
    // 시그모이드 함수로 -1~1 범위로 정규화
    return Math.tanh(rawScore / 10);
  }

  getArticleAge(pubDate) {
    const now = new Date();
    const articleDate = new Date(pubDate);
    return (now - articleDate) / (1000 * 60 * 60); // 시간 단위
  }

  getSourceWeight(source) {
    const weights = {
      'cointelegraph': 1.0,
      'coindesk': 1.0,
      'bitcoinist': 0.8,
      'cryptonews': 0.7
    };
    
    const sourceName = source.toLowerCase();
    return Object.keys(weights).find(key => sourceName.includes(key)) 
      ? weights[Object.keys(weights).find(key => sourceName.includes(key))]
      : 0.5;
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

const newsService = new NewsService();
export default newsService;
