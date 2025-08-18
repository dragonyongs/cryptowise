// src/services/analysis/fundamentalAnalysis.js
import axios from "axios";

class FundamentalAnalysisService {
  constructor() {
    this.coinGeckoUrl = "https://api.coingecko.com/api/v3";
    this.githubUrl = "https://api.github.com";
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1시간 캐시
  }

  async analyzeFundamentals(symbol) {
    try {
      const coinId = await this.getCoinId(symbol);

      const [
        teamScore,
        developmentActivity,
        tokenomics,
        utilityScore,
        partnerships,
        institutionalAdoption,
      ] = await Promise.all([
        this.evaluateTeam(coinId),
        this.getGitHubActivity(coinId),
        this.analyzeTokenomics(coinId),
        this.evaluateRealWorldUse(coinId),
        this.getPartnershipScore(coinId),
        this.getInstitutionalData(coinId),
      ]);

      const fundamentalScore = this.calculateFundamentalScore({
        teamScore,
        developmentActivity,
        tokenomics,
        utilityScore,
        partnerships,
        institutionalAdoption,
      });

      return {
        teamScore,
        developmentActivity,
        tokenomics,
        utilityScore,
        partnerships,
        institutionalAdoption,
        fundamentalScore,
        timestamp: Date.now(),
        recommendation: this.getFundamentalRecommendation(fundamentalScore),
      };
    } catch (error) {
      console.error("Fundamental analysis failed:", error);
      return this.getDefaultFundamental();
    }
  }

  async getCoinId(symbol) {
    const cacheKey = `coinId_${symbol}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout * 24) {
      return cached.data;
    }

    try {
      const response = await axios.get(`${this.coinGeckoUrl}/coins/list`, {
        timeout: 10000,
      });

      const coin = response.data.find(
        (coin) => coin.symbol.toLowerCase() === symbol.toLowerCase()
      );

      const coinId = coin ? coin.id : symbol.toLowerCase();

      this.cache.set(cacheKey, {
        data: coinId,
        timestamp: Date.now(),
      });

      return coinId;
    } catch (error) {
      console.error("Failed to get coin ID:", error);
      return symbol.toLowerCase();
    }
  }

  async evaluateTeam(coinId) {
    try {
      const response = await axios.get(`${this.coinGeckoUrl}/coins/${coinId}`, {
        timeout: 15000,
      });

      const coinData = response.data;
      let score = 5; // 기본 점수

      // 팀 투명성 평가
      if (coinData.links?.homepage && coinData.links.homepage.length > 0)
        score += 1;
      if (
        coinData.links?.official_forum_url &&
        coinData.links.official_forum_url.length > 0
      )
        score += 0.5;

      // 소셜 미디어 활성도
      if (coinData.links?.twitter_screen_name) score += 0.5;
      if (coinData.links?.telegram_channel_identifier) score += 0.5;

      // 개발자 정보
      if (coinData.developer_data?.forks > 100) score += 0.5;
      if (coinData.developer_data?.stars > 500) score += 0.5;

      // 커뮤니티 규모
      if (coinData.community_data?.twitter_followers > 10000) score += 1;
      if (coinData.community_data?.reddit_subscribers > 5000) score += 0.5;

      return Math.min(10, Math.round(score * 10) / 10);
    } catch (error) {
      console.error("Team evaluation failed:", error);
      return 5;
    }
  }

  async getGitHubActivity(coinId) {
    try {
      const coinResponse = await axios.get(
        `${this.coinGeckoUrl}/coins/${coinId}`,
        {
          timeout: 15000,
        }
      );

      const repoUrl = coinResponse.data.links?.repos_url?.github?.[0];
      if (!repoUrl) {
        return { score: 3, commits: 0, contributors: 0, activity: "low" };
      }

      // GitHub repo 이름 추출
      const repoMatch = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
      if (!repoMatch) {
        return { score: 3, commits: 0, contributors: 0, activity: "low" };
      }

      const repoName = repoMatch[1];

      // GitHub API 호출 (rate limit 고려)
      const [repoInfo, commits] = await Promise.all([
        axios.get(`${this.githubUrl}/repos/${repoName}`, { timeout: 10000 }),
        axios.get(`${this.githubUrl}/repos/${repoName}/commits?per_page=100`, {
          timeout: 10000,
        }),
      ]);

      const stars = repoInfo.data.stargazers_count;
      const forks = repoInfo.data.forks_count;
      const recentCommits = commits.data.length;

      // 활동성 점수 계산
      let activityScore = 0;
      if (stars > 1000) activityScore += 3;
      else if (stars > 100) activityScore += 2;
      else if (stars > 10) activityScore += 1;

      if (forks > 500) activityScore += 2;
      else if (forks > 50) activityScore += 1;

      if (recentCommits > 50) activityScore += 3;
      else if (recentCommits > 20) activityScore += 2;
      else if (recentCommits > 5) activityScore += 1;

      const activity =
        activityScore > 6 ? "high" : activityScore > 3 ? "medium" : "low";

      return {
        score: Math.min(10, activityScore),
        commits: recentCommits,
        contributors: Math.min(repoInfo.data.network_count, 100),
        stars,
        forks,
        activity,
      };
    } catch (error) {
      console.error("GitHub activity analysis failed:", error);
      return { score: 3, commits: 0, contributors: 0, activity: "unknown" };
    }
  }

  async analyzeTokenomics(coinId) {
    try {
      const response = await axios.get(`${this.coinGeckoUrl}/coins/${coinId}`, {
        timeout: 15000,
      });

      const coinData = response.data;
      const marketData = coinData.market_data;

      let tokenomicsScore = 5; // 기본 점수

      // 공급량 분석
      const totalSupply = marketData?.total_supply;
      const circulatingSupply = marketData?.circulating_supply;
      const maxSupply = marketData?.max_supply;

      if (maxSupply && totalSupply) {
        const inflationRate = (totalSupply - circulatingSupply) / totalSupply;
        if (inflationRate < 0.1)
          tokenomicsScore += 2; // 낮은 인플레이션
        else if (inflationRate < 0.3) tokenomicsScore += 1;
      }

      // 시장 캡 대비 평가
      const marketCap = marketData?.market_cap?.usd;
      if (marketCap) {
        if (marketCap > 1000000000)
          tokenomicsScore += 1; // 10억 달러 이상
        else if (marketCap > 100000000) tokenomicsScore += 0.5; // 1억 달러 이상
      }

      // 유통량 비율
      if (circulatingSupply && totalSupply) {
        const circulatingRatio = circulatingSupply / totalSupply;
        if (circulatingRatio > 0.8) tokenomicsScore += 1.5;
        else if (circulatingRatio > 0.6) tokenomicsScore += 1;
        else if (circulatingRatio > 0.4) tokenomicsScore += 0.5;
      }

      return {
        score: Math.min(10, Math.round(tokenomicsScore * 10) / 10),
        totalSupply,
        circulatingSupply,
        maxSupply,
        marketCap,
        inflationRate:
          totalSupply && circulatingSupply
            ? Math.round(
                ((totalSupply - circulatingSupply) / totalSupply) * 10000
              ) / 100
            : null,
      };
    } catch (error) {
      console.error("Tokenomics analysis failed:", error);
      return {
        score: 5,
        totalSupply: null,
        circulatingSupply: null,
        maxSupply: null,
      };
    }
  }

  async evaluateRealWorldUse(coinId) {
    try {
      const response = await axios.get(`${this.coinGeckoUrl}/coins/${coinId}`, {
        timeout: 15000,
      });

      const coinData = response.data;
      let utilityScore = 3; // 기본 점수

      // 카테고리 기반 유틸리티 평가
      const categories = coinData.categories || [];

      const highUtilityCategories = [
        "decentralized-finance-defi",
        "smart-contracts",
        "ethereum-ecosystem",
        "binance-smart-chain",
        "layer-1",
        "payments",
      ];

      const mediumUtilityCategories = [
        "gaming",
        "nft",
        "metaverse",
        "web3",
        "infrastructure",
      ];

      for (const category of categories) {
        if (highUtilityCategories.includes(category)) {
          utilityScore += 2;
        } else if (mediumUtilityCategories.includes(category)) {
          utilityScore += 1;
        }
      }

      // 실제 사용성 지표
      if (coinData.market_data?.total_volume?.usd > 10000000) {
        // 일일 거래량 1000만 달러 이상
        utilityScore += 1.5;
      }

      return Math.min(10, Math.round(utilityScore * 10) / 10);
    } catch (error) {
      console.error("Real-world utility evaluation failed:", error);
      return 5;
    }
  }

  async getPartnershipScore(coinId) {
    try {
      // 파트너십 정보는 CoinGecko API에서 직접 제공하지 않으므로
      // 기본적인 지표들로 추정
      const response = await axios.get(`${this.coinGeckoUrl}/coins/${coinId}`, {
        timeout: 15000,
      });

      const coinData = response.data;
      let partnershipScore = 4; // 기본 점수

      // 거래소 상장 개수로 파트너십 추정
      if (coinData.tickers && coinData.tickers.length > 50)
        partnershipScore += 3;
      else if (coinData.tickers && coinData.tickers.length > 20)
        partnershipScore += 2;
      else if (coinData.tickers && coinData.tickers.length > 10)
        partnershipScore += 1;

      // 주요 거래소 상장 여부
      const majorExchanges = [
        "binance",
        "coinbase",
        "kraken",
        "huobi",
        "upbit",
      ];
      const listedExchanges = coinData.tickers?.filter((ticker) =>
        majorExchanges.some((exchange) =>
          ticker.market.name.toLowerCase().includes(exchange)
        )
      );

      if (listedExchanges && listedExchanges.length >= 3) partnershipScore += 2;
      else if (listedExchanges && listedExchanges.length >= 1)
        partnershipScore += 1;

      return Math.min(10, Math.round(partnershipScore * 10) / 10);
    } catch (error) {
      console.error("Partnership score evaluation failed:", error);
      return 5;
    }
  }

  async getInstitutionalData(coinId) {
    try {
      const response = await axios.get(`${this.coinGeckoUrl}/coins/${coinId}`, {
        timeout: 15000,
      });

      const coinData = response.data;
      let institutionalScore = 3; // 기본 점수

      // 시장 캡으로 기관 관심도 추정
      const marketCap = coinData.market_data?.market_cap?.usd;
      if (marketCap > 10000000000)
        institutionalScore += 4; // 100억 달러 이상
      else if (marketCap > 1000000000)
        institutionalScore += 3; // 10억 달러 이상
      else if (marketCap > 500000000)
        institutionalScore += 2; // 5억 달러 이상
      else if (marketCap > 100000000) institutionalScore += 1; // 1억 달러 이상

      // 24시간 거래량으로 기관 참여도 추정
      const volume24h = coinData.market_data?.total_volume?.usd;
      if (volume24h && marketCap) {
        const volumeRatio = volume24h / marketCap;
        if (volumeRatio > 0.1) institutionalScore += 1;
        else if (volumeRatio > 0.05) institutionalScore += 0.5;
      }

      return Math.min(10, Math.round(institutionalScore * 10) / 10);
    } catch (error) {
      console.error("Institutional data analysis failed:", error);
      return 5;
    }
  }

  calculateFundamentalScore(data) {
    const weights = {
      teamScore: 0.2, // 20%
      developmentActivity: 0.25, // 25%
      tokenomics: 0.2, // 20%
      utilityScore: 0.15, // 15%
      partnerships: 0.1, // 10%
      institutionalAdoption: 0.1, // 10%
    };

    const totalScore =
      data.teamScore * weights.teamScore +
      data.developmentActivity.score * weights.developmentActivity +
      data.tokenomics.score * weights.tokenomics +
      data.utilityScore * weights.utilityScore +
      data.partnerships * weights.partnerships +
      data.institutionalAdoption * weights.institutionalAdoption;

    return Math.round(totalScore * 10) / 10;
  }

  getFundamentalRecommendation(score) {
    if (score >= 8.5) {
      return {
        rating: "STRONG_BUY",
        confidence: 0.9,
        reason: "뛰어난 펀더멘탈",
      };
    } else if (score >= 7) {
      return { rating: "BUY", confidence: 0.75, reason: "좋은 펀더멘탈" };
    } else if (score >= 6) {
      return { rating: "HOLD", confidence: 0.6, reason: "평균적 펀더멘탈" };
    } else if (score >= 4) {
      return { rating: "WEAK_HOLD", confidence: 0.4, reason: "약한 펀더멘탈" };
    } else {
      return { rating: "SELL", confidence: 0.7, reason: "매우 약한 펀더멘탈" };
    }
  }

  getDefaultFundamental() {
    return {
      teamScore: 5,
      developmentActivity: { score: 3, activity: "unknown" },
      tokenomics: { score: 5 },
      utilityScore: 5,
      partnerships: 5,
      institutionalAdoption: 5,
      fundamentalScore: 5,
      timestamp: Date.now(),
      recommendation: {
        rating: "HOLD",
        confidence: 0.3,
        reason: "API 오류로 기본값 사용",
      },
    };
  }
}

export default new FundamentalAnalysisService();
