// src/services/analysis/coinFilter.js
export class CoinFilter {
  constructor() {
    this.coinGeckoAPI = 'https://api.coingecko.com/api/v3';
    this.cache = new Map();
    this.cacheExpiry = 10 * 60 * 1000; // 10분 캐시
  }

  /**
   * 오늘의 추천 코인 분석
   * @returns {Promise<Array>} 추천 코인 배열
   */
  async getTodayRecommendations() {
    const cacheKey = `recommendations_${new Date().toDateString()}`;
    
    // 캐시 확인
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
    }

    try {
      console.log('🔍 추천 코인 분석 시작...');
      
      // 1단계: 생존 가능성 필터링
      const survivableCoins = await this.filterSurvivableCoins();
      console.log(`✅ 생존 가능한 코인: ${survivableCoins.length}개`);
      
      // 2단계: 성장 잠재력 평가
      const scoredCoins = await this.evaluateGrowthPotential(survivableCoins);
      console.log(`📊 점수 평가 완료: ${scoredCoins.length}개`);
      
      // 3단계: 상위 10개 추천
      const recommendations = scoredCoins
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 10)
        .map(coin => this.formatRecommendation(coin));

      // 캐시 저장
      this.cache.set(cacheKey, {
        data: recommendations,
        timestamp: Date.now()
      });

      console.log(`🎯 최종 추천 코인: ${recommendations.length}개`);
      return recommendations;
      
    } catch (error) {
      console.error('❌ 추천 코인 분석 실패:', error);
      throw new Error(`추천 분석 실패: ${error.message}`);
    }
  }

  /**
   * 생존 가능성 필터링
   * @returns {Promise<Array>} 필터링된 코인 배열
   */
  async filterSurvivableCoins() {
    try {
      // CoinGecko에서 상위 250개 코인 가져오기
      const response = await fetch(
        `${this.coinGeckoAPI}/coins/markets?vs_currency=krw&order=market_cap_desc&per_page=250&page=1`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API 오류: ${response.status}`);
      }
      
      const allCoins = await response.json();
      
      // 생존 가능성 기준 적용
      const survivable = allCoins.filter(coin => {
        return coin.market_cap >= 100000000 &&        // 1억 이상 시가총액
               coin.market_cap_rank <= 200 &&          // 200위 내
               coin.total_volume >= 10000000 &&        // 일 거래량 1천만 이상
               coin.price_change_percentage_24h !== null && // 가격 데이터 존재
               this.isUpbitListed(coin.symbol);        // Upbit 상장 여부
      });

      return survivable;
    } catch (error) {
      console.error('생존 가능성 필터링 실패:', error);
      throw error;
    }
  }

  /**
   * 성장 잠재력 평가
   * @param {Array} coins - 평가할 코인 배열
   * @returns {Promise<Array>} 점수가 매겨진 코인 배열
   */
  async evaluateGrowthPotential(coins) {
    const scoredCoins = [];

    for (const coin of coins) {
      try {
        const scores = {
          technical: this.calculateTechnicalScore(coin),
          fundamental: await this.calculateFundamentalScore(coin),
          market: this.calculateMarketScore(coin),
          risk: this.calculateRiskScore(coin)
        };

        const totalScore = (
          scores.technical * 0.4 +      // 40% 기술적 분석
          scores.fundamental * 0.3 +    // 30% 펀더멘털
          scores.market * 0.2 +         // 20% 시장 분석
          scores.risk * 0.1             // 10% 리스크
        );

        scoredCoins.push({
          ...coin,
          scores,
          totalScore: Math.round(totalScore * 10) / 10, // 소수점 1자리
          riskLevel: this.assessRiskLevel(coin),
          expectedReturn: this.estimateReturn(coin, totalScore)
        });

      } catch (error) {
        console.warn(`${coin.symbol} 평가 실패:`, error.message);
        continue;
      }
    }

    return scoredCoins;
  }

  /**
   * 기술적 점수 계산
   * @param {Object} coin - 코인 데이터
   * @returns {number} 0-10 점수
   */
  calculateTechnicalScore(coin) {
    let score = 5; // 기본 점수

    // 24시간 변화율 기반 점수
    const change24h = coin.price_change_percentage_24h || 0;
    if (change24h > 5) score += 2;
    else if (change24h > 0) score += 1;
    else if (change24h < -10) score -= 2;
    else if (change24h < -5) score -= 1;

    // 거래량 분석
    const volumeRatio = coin.total_volume / coin.market_cap;
    if (volumeRatio > 0.1) score += 1; // 높은 거래량
    if (volumeRatio < 0.01) score -= 1; // 낮은 거래량

    // 7일 변화율
    const change7d = coin.price_change_percentage_7d_in_currency || 0;
    if (change7d > 10) score += 1;
    else if (change7d < -15) score -= 1;

    return Math.max(0, Math.min(10, score));
  }

  /**
   * 펀더멘털 점수 계산 (비동기)
   * @param {Object} coin - 코인 데이터
   * @returns {Promise<number>} 0-10 점수
   */
  async calculateFundamentalScore(coin) {
    let score = 5; // 기본 점수

    try {
      // 뉴스 감성 분석 (이미 구현된 newsService 활용)
      const newsService = await import('@/services/news/newsService');
      const sentimentScore = await newsService.default.getSentimentScore(
        coin.symbol.toUpperCase(), 
        Date.now()
      );
      
      // 감성 점수를 0-10 스케일로 변환
      score += sentimentScore * 2.5; // -1~1 -> -2.5~2.5

    } catch (error) {
      console.warn(`${coin.symbol} 뉴스 분석 실패:`, error.message);
    }

    // 개발 활동도 (GitHub 기반) - 임시 로직
    if (this.hasActiveDevalopment(coin.symbol)) {
      score += 1;
    }

    return Math.max(0, Math.min(10, score));
  }

  /**
   * 시장 점수 계산
   * @param {Object} coin - 코인 데이터
   * @returns {number} 0-10 점수
   */
  calculateMarketScore(coin) {
    let score = 5;

    // 시가총액 순위 기반
    if (coin.market_cap_rank <= 10) score += 2;
    else if (coin.market_cap_rank <= 50) score += 1;
    else if (coin.market_cap_rank > 150) score -= 1;

    // 시가총액 크기
    if (coin.market_cap > 1e12) score += 1; // 1조 이상
    if (coin.market_cap < 1e11) score -= 1; // 1000억 미만

    return Math.max(0, Math.min(10, score));
  }

  /**
   * 리스크 점수 계산
   * @param {Object} coin - 코인 데이터
   * @returns {number} 0-10 점수 (높을수록 안전)
   */
  calculateRiskScore(coin) {
    let score = 5;

    // 변동성 기반 (낮은 변동성이 더 안전)
    const volatility = Math.abs(coin.price_change_percentage_24h || 0);
    if (volatility < 3) score += 2;
    else if (volatility < 5) score += 1;
    else if (volatility > 15) score -= 2;
    else if (volatility > 10) score -= 1;

    // 유동성 (거래량 기반)
    const volumeScore = Math.log10(coin.total_volume / 1e9); // 10억 기준
    score += Math.min(2, Math.max(-1, volumeScore));

    return Math.max(0, Math.min(10, score));
  }

  /**
   * 추천 포맷팅
   * @param {Object} coin - 점수가 매겨진 코인
   * @returns {Object} UI용 추천 데이터
   */
  formatRecommendation(coin) {
    return {
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      score: coin.totalScore,
      reason: this.generateReason(coin),
      riskLevel: coin.riskLevel,
      expectedReturn: coin.expectedReturn,
      currentPrice: `₩${coin.current_price.toLocaleString()}`,
      change24h: parseFloat((coin.price_change_percentage_24h || 0).toFixed(2)),
      marketCap: coin.market_cap,
      volume: coin.total_volume,
      rank: coin.market_cap_rank
    };
  }

  /**
   * 추천 이유 생성
   * @param {Object} coin - 분석된 코인 데이터
   * @returns {string} 추천 이유
   */
  generateReason(coin) {
    const reasons = [];

    // 기술적 분석 이유
    if (coin.scores.technical > 7) {
      reasons.push('강한 기술적 신호');
    }
    if (coin.price_change_percentage_24h > 3) {
      reasons.push('상승 모멘텀');
    }

    // 펀더멘털 이유
    if (coin.scores.fundamental > 7) {
      reasons.push('긍정적 뉴스 감정');
    }

    // 시장 이유
    if (coin.market_cap_rank <= 20) {
      reasons.push('대형 코인 안정성');
    }
    if (coin.total_volume / coin.market_cap > 0.05) {
      reasons.push('활발한 거래량');
    }

    // 기본 이유
    if (reasons.length === 0) {
      reasons.push('종합 분석 결과 양호');
    }

    return reasons.join(', ');
  }

  /**
   * 리스크 레벨 평가
   * @param {Object} coin - 코인 데이터
   * @returns {string} 'low', 'medium', 'high'
   */
  assessRiskLevel(coin) {
    const volatility = Math.abs(coin.price_change_percentage_24h || 0);
    
    if (coin.market_cap_rank <= 10 && volatility < 5) {
      return 'low';
    } else if (coin.market_cap_rank <= 50 && volatility < 10) {
      return 'medium';
    } else {
      return 'high';
    }
  }

  /**
   * 예상 수익률 추정
   * @param {Object} coin - 코인 데이터
   * @param {number} score - 총점
   * @returns {string} 예상 수익률 범위
   */
  estimateReturn(coin, score) {
    if (score >= 8) {
      return '20-40%';
    } else if (score >= 6) {
      return '10-25%';
    } else if (score >= 4) {
      return '5-15%';
    } else {
      return '0-10%';
    }
  }

  /**
   * Upbit 상장 여부 확인
   * @param {string} symbol - 코인 심볼
   * @returns {boolean} 상장 여부
   */
  isUpbitListed(symbol) {
    const upbitCoins = [
      'btc', 'eth', 'xrp', 'ada', 'dot', 'link', 'sol', 'avax', 
      'matic', 'atom', 'near', 'sand', 'mana', 'axs', 'flow'
    ];
    return upbitCoins.includes(symbol.toLowerCase());
  }

  /**
   * 개발 활동도 확인 (간단한 로직)
   * @param {string} symbol - 코인 심볼
   * @returns {boolean} 활발한 개발 여부
   */
  hasActiveDevalopment(symbol) {
    const activeDev = ['eth', 'sol', 'ada', 'dot', 'atom', 'near'];
    return activeDev.includes(symbol.toLowerCase());
  }
}

// 싱글톤 인스턴스
const coinFilter = new CoinFilter();
export default coinFilter;
