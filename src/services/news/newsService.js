// src/services/news/newsService.js

/**
 * 뉴스 수집 및 감성 분석 서비스
 * RSS 피드에서 뉴스를 수집하고 암호화폐 감성 점수를 계산합니다.
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
    this.cacheExpiry = 30 * 60 * 1000; // 30분 캐시
  }

  /**
   * 특정 심볼에 대한 감성 점수 반환
   * @param {string} symbol - 코인 심볼 (예: "BTC")
   * @param {string} timestamp - 타임스탬프
   * @returns {Promise<number>} 감성 점수 (-1 ~ 1)
   */
  async getSentimentScore(symbol, timestamp) {
    const cacheKey = `sentiment_${symbol}_${timestamp}`;
    
    // 캐시 확인
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.score;
      }
    }

    try {
      const news = await this.collectRecentNews(symbol);
      const score = this.analyzeSentiment(news, symbol);
      
      // 캐시 저장
      this.cache.set(cacheKey, {
        score,
        timestamp: Date.now()
      });

      return score;
    } catch (error) {
      console.error('뉴스 감성 분석 실패:', error);
      return 0; // 중립 점수 반환
    }
  }

  /**
   * RSS 피드에서 최근 뉴스 수집
   * @param {string} symbol - 대상 심볼
   * @returns {Promise<Array>} 뉴스 기사 배열
   */
  async collectRecentNews(symbol) {
    const allNews = [];
    const keywords = this.getKeywords(symbol);

    for (const source of this.sources) {
      try {
        const response = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source)}`);
        const data = await response.json();
        
        if (data.status === 'ok') {
          const relevantNews = data.items
            .filter(item => this.isRelevant(item, keywords))
            .slice(0, 10); // 소스당 최대 10개
          
          allNews.push(...relevantNews);
        }
      } catch (error) {
        console.warn(`RSS 소스 오류 (${source}):`, error.message);
      }
    }

    return allNews.slice(0, 50); // 전체 최대 50개
  }

  /**
   * 뉴스 기사들의 감성 분석
   * @param {Array} articles - 뉴스 기사 배열
   * @param {string} symbol - 대상 심볼
   * @returns {number} 감성 점수 (-1 ~ 1)
   */
  analyzeSentiment(articles, symbol) {
    if (!articles.length) return 0;

    const positiveKeywords = [
      'bullish', 'surge', 'rally', 'breakout', 'adoption', 
      'partnership', 'upgrade', 'launch', 'growth', 'rise',
      'pump', 'moon', 'breakthrough', 'milestone', 'success'
    ];

    const negativeKeywords = [
      'bearish', 'crash', 'dump', 'regulation', 'ban', 
      'hack', 'fall', 'decline', 'drop', 'fear',
      'sell-off', 'correction', 'risk', 'warning', 'concern'
    ];

    let totalScore = 0;
    let articleCount = 0;

    articles.forEach(article => {
      const text = `${article.title} ${article.description || ''}`.toLowerCase();
      
      let positiveScore = 0;
      let negativeScore = 0;

      positiveKeywords.forEach(keyword => {
        const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
        positiveScore += matches;
      });

      negativeKeywords.forEach(keyword => {
        const matches = (text.match(new RegExp(keyword, 'g')) || []).length;
        negativeScore += matches;
      });

      // 심볼별 가중치 적용
      const symbolWeight = this.isSymbolMentioned(text, symbol) ? 2 : 1;
      
      const articleSentiment = (positiveScore - negativeScore) * symbolWeight;
      totalScore += articleSentiment;
      articleCount++;
    });

    if (articleCount === 0) return 0;

    // -1 ~ 1 범위로 정규화
    const rawScore = totalScore / articleCount;
    return Math.max(-1, Math.min(1, rawScore / 5));
  }

  /**
   * 심볼에 해당하는 키워드 생성
   * @param {string} symbol - 코인 심볼
   * @returns {Array} 키워드 배열
   */
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

  /**
   * 기사가 특정 키워드와 관련있는지 확인
   * @param {Object} item - 뉴스 아이템
   * @param {Array} keywords - 키워드 배열
   * @returns {boolean} 관련성 여부
   */
  isRelevant(item, keywords) {
    const text = `${item.title} ${item.description || ''}`.toLowerCase();
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * 텍스트에서 특정 심볼이 언급되었는지 확인
   * @param {string} text - 분석할 텍스트
   * @param {string} symbol - 확인할 심볼
   * @returns {boolean} 언급 여부
   */
  isSymbolMentioned(text, symbol) {
    const keywords = this.getKeywords(symbol);
    return keywords.some(keyword => text.includes(keyword));
  }

  /**
   * 캐시 정리
   */
  clearCache() {
    this.cache.clear();
  }
}

// 싱글톤 인스턴스 생성 및 내보내기
const newsService = new NewsService();
export default newsService;
