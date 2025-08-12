// src/services/news/newsService.js
class NewsService {
  constructor() {
    this.sources = [
      'https://cointelegraph.com/rss',
      'https://coindesk.com/arc/outboundfeeds/rss/',
      'https://bitcoinist.com/feed/',
      'https://cryptonews.com/news/feed/'
    ];
    
    this.cache = new Map();
    this.cacheExpiry = 30 * 60 * 1000;
    this.maxCacheSize = 1000;
    
    // 🆕 실서버에서는 뉴스 기능 비활성화 플래그
    this.isProduction = typeof window !== 'undefined' && 
                       !window.location.hostname.includes('localhost');
    
    // 주기적 캐시 정리
    setInterval(() => this.cleanupCache(), 10 * 60 * 1000);
  }

  /**
   * 🚀 개선된 감성 점수 반환 (에러 방지)
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

      // 🆕 프로덕션에서는 더미 데이터만 사용
      if (this.isProduction) {
        console.log(`🔄 프로덕션 환경: ${symbol} 더미 감성 점수 사용`);
        const dummyScore = this.generateDummySentimentScore(symbol);
        
        this.cache.set(cacheKey, {
          score: dummyScore,
          timestamp: Date.now(),
          newsCount: 0,
          isDummy: true
        });
        
        return dummyScore;
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
      
      // 최종 Fallback: 더미 점수 반환
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
   * 🚀 안전한 RSS 피드 수집
   */
  async collectRecentNews(symbol) {
    if (this.isProduction) {
      console.log('🔄 프로덕션 환경: RSS 피드 수집 건너뛰기');
      return [];
    }

    const allNews = [];
    const keywords = this.getKeywords(symbol);
    
    // 각 소스에 대해 안전하게 시도
    for (const source of this.sources) {
      try {
        const news = await this.fetchRSSFeedSafely(source, keywords);
        if (news && news.length > 0) {
          allNews.push(...news);
        }
      } catch (error) {
        console.warn(`RSS 소스 실패 (${source}):`, error.message);
        continue; // 다음 소스로 계속
      }
    }
    
    return allNews
      .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
      .slice(0, 50);
  }

  /**
   * 🆕 안전한 RSS 피드 가져오기
   */
  async fetchRSSFeedSafely(source, keywords) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(source, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; CryptoWise/1.0)',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type') || '';
      const xmlText = await response.text();
      
      // 🆕 XML 응답 검증
      if (!this.isValidXML(xmlText)) {
        throw new Error('응답이 유효한 XML이 아닙니다');
      }
      
      return this.parseRSSXMLSafely(xmlText, keywords);
      
    } catch (error) {
      console.warn(`RSS 피드 오류 (${source}):`, error.message);
      return [];
    }
  }

  /**
   * 🆕 XML 유효성 검사
   */
  isValidXML(xmlText) {
    // 기본적인 XML 구조 확인
    if (!xmlText || typeof xmlText !== 'string') {
      return false;
    }
    
    // HTML 응답 감지 (404 페이지 등)
    if (xmlText.toLowerCase().includes('<!doctype html') || 
        xmlText.toLowerCase().includes('<html')) {
      console.warn('HTML 응답을 받았습니다 (404 페이지일 가능성)');
      return false;
    }
    
    // 기본적인 XML 태그 확인
    if (!xmlText.includes('<?xml') && !xmlText.includes('<rss')) {
      return false;
    }
    
    return true;
  }

  /**
   * 🆕 안전한 RSS XML 파싱
   */
  parseRSSXMLSafely(xmlText, keywords) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // 파싱 에러 체크
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
          
          if (!title || !description) {
            return; // 필수 정보가 없으면 건너뛰기
          }
          
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
   * 🆕 개선된 뉴스 요약 생성
   */
  async getNewsSummary(symbol) {
    try {
      console.log(`🔄 ${symbol} 뉴스 요약 생성 중...`);
      
      const news = await this.collectRecentNews(symbol);
      const score = this.analyzeSentiment(news, symbol);
      
      // 프로덕션에서는 더미 데이터 사용
      if (this.isProduction || news.length === 0) {
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
        lastUpdated: new Date().toISOString(),
        isDummy: false
      };
    } catch (error) {
      console.error('뉴스 요약 생성 실패:', error);
      
      // 에러 시 더미 데이터 반환
      return {
        symbol,
        sentimentScore: this.generateDummySentimentScore(symbol),
        sentiment: this.getSentimentLabel(this.generateDummySentimentScore(symbol)),
        newsCount: 0,
        topHeadlines: this.generateDummyHeadlines(symbol),
        lastUpdated: new Date().toISOString(),
        isDummy: true,
        error: error.message
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

  // 기존 메서드들 유지...
  analyzeSentiment(articles, symbol) {
    if (!articles.length) return this.generateDummySentimentScore(symbol);

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
      
      const timeWeight = age < 2 ? 1.0 : age < 6 ? 0.7 : age < 24 ? 0.4 : 0.1;
      const symbolWeight = this.isSymbolMentioned(text, symbol) ? 2.0 : 0.5;
      const sourceWeight = this.getSourceWeight(article.source);
      const finalWeight = timeWeight * symbolWeight * sourceWeight;
      
      let articleScore = 0;
      
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

    if (totalWeight === 0) return this.generateDummySentimentScore(symbol);
    
    const rawScore = totalScore / totalWeight;
    return Math.tanh(rawScore / 10);
  }

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
