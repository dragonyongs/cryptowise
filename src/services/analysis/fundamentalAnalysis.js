// src/services/analysis/fundamentalAnalysis.js
import { cache } from '../../utils/cache.js'; // FreePlan.txt 기반 캐시 임포트
import { FreeNewsService } from '../news/newsService.js'; // FreePlan.txt의 뉴스 서비스 임포트 (감정 분석용)

export class FundamentalAnalysis {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.newsService = new FreeNewsService();
  }

  async analyzeCoin(coinId) {
    const coinData = await this.getCoinDetails(coinId);
    const survivalPassed = this.checkSurvivalCriteria(coinData);
    if (!survivalPassed) {
      return { score: 0, reason: '생존성 기준 미달' };
    }

    const resilienceScore = this.calculateResilienceScore(coinData);
    const sentimentScore = await this.analyzeSentiment(coinId);
    const developmentScore = this.evaluateDevelopmentActivity(coinData);

    const fundamentalScore = (resilienceScore * 0.4 + sentimentScore * 0.3 + developmentScore * 0.3) * 100;

    return {
      fundamentalScore: Math.min(fundamentalScore, 100),
      level: fundamentalScore > 70 ? 'strong' : fundamentalScore > 40 ? 'medium' : 'weak',
      details: { resilienceScore, sentimentScore, developmentScore },
    };
  }

  async getCoinDetails(coinId) {
    const cacheKey = `coinDetails_${coinId}`;
    let data = cache.get(cacheKey);
    if (!data) {
      const response = await fetch(`${this.baseURL}/coins/${coinId}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true`);
      data = await response.json();
      cache.set(cacheKey, data, 600); // 10분 캐시
    }
    return data;
  }

  checkSurvivalCriteria(coinData) {
    // tuja-rojig.txt 기반 생존성 필터
    const criteria = {
      marketCap: coinData.market_data.market_cap.usd > 100000000,
      rank: coinData.market_cap_rank <= 200,
      volume: coinData.market_data.total_volume.usd > 10000000,
      exchanges: coinData.tickers.length >= 3, // 최소 3개 거래소
      // 추가: Upbit 상장 여부 (실제 구현 시 Upbit API로 확인)
    };
    return Object.values(criteria).every(Boolean);
  }

  calculateResilienceScore(coinData) {
    // tuja-rojig.txt 기반 회복력 스코어 계산
    const factors = {
      historicalRecovery: coinData.market_data.ath_change_percentage.usd > -80 ? 0.8 : 0.5, // ATH 대비 회복력
      ecosystem: coinData.community_data.twitter_followers > 100000 ? 1 : 0.5, // 커뮤니티 크기
      developerActivity: coinData.developer_data.pull_requests_merged > 10 ? 1 : 0.5, // GitHub 활동
      liquidity: coinData.market_data.liquidity_score || 0.7, // 유동성 점수 (CoinGecko 제공)
    };
    return Object.values(factors).reduce((sum, val) => sum + val, 0) / Object.keys(factors).length;
  }

  async analyzeSentiment(coinId) {
    // FreePlan.txt 기반 뉴스 감정 분석
    const articles = await this.newsService.collectNews(); // 전체 뉴스 수집 (coinId 필터링 추가 가능)
    const relevantArticles = articles.filter(article => article.title.includes(coinId) || article.description.includes(coinId));
    const sentiment = this.newsService.analyzeSentiment(relevantArticles);
    return sentiment.reduce((sum, art) => sum + art.score, 0) / (sentiment.length || 1); // 평균 점수
  }

  evaluateDevelopmentActivity(coinData) {
    // tuja-rojig.txt 기반 개발 활동 평가
    const activity = {
      commits: coinData.developer_data.commits_last_3_months > 10 ? 1 : 0,
      stars: coinData.developer_data.stars > 1000 ? 1 : 0,
      forks: coinData.developer_data.forks > 500 ? 1 : 0,
    };
    return Object.values(activity).reduce((sum, val) => sum + val, 0) / 3;
  }
}
