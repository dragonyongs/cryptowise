// src/services/data/coinListAggregator.js
class CoinListAggregator {
  constructor() {
    this.coinSources = {
      portfolio: new Set(),
      selected: new Set(),
      paperTrading: new Set(),
      configs: new Set(),
    };
  }

  // 🎯 모든 소스에서 코인 목록 통합
  async getUserActiveCoins(userId) {
    try {
      // 1. 포트폴리오 스토어에서 실제 보유 코인
      const portfolioCoins = this.getPortfolioCoins();

      // 2. 코인 스토어에서 사용자 선택 코인
      const selectedCoins = this.getSelectedCoins();

      // 3. DB에서 페이퍼트레이딩 활성 코인
      const paperTradingCoins = await this.getPaperTradingCoins(userId);

      // 4. DB에서 사용자 설정된 코인
      const configuredCoins = await this.getUserConfiguredCoins(userId);

      // 통합 및 우선순위 분류
      return this.categorizeByPriority({
        portfolioCoins,
        selectedCoins,
        paperTradingCoins,
        configuredCoins,
      });
    } catch (error) {
      console.error("코인 목록 통합 실패:", error);
      return this.getFallbackStrategy();
    }
  }

  // 🎯 포트폴리오 스토어에서 보유 코인
  getPortfolioCoins() {
    const portfolio = portfolioStore.getState().portfolio;
    return Object.keys(portfolio?.coins || {});
  }

  // 🎯 코인 스토어에서 선택된 코인
  getSelectedCoins() {
    const coinState = coinStore.getState();
    return [...coinState.selectedCoins, ...coinState.watchlist];
  }

  // 🎯 DB에서 최근 페이퍼트레이딩 코인
  async getPaperTradingCoins(userId) {
    const { data } = await supabase
      .from("papertrades")
      .select("symbol")
      .eq("userid", userId)
      .gte("createdat", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) // 최근 7일
      .order("createdat", { ascending: false });

    return [...new Set(data?.map((trade) => trade.symbol) || [])];
  }

  // 🎯 DB에서 사용자 코인 설정
  async getUserConfiguredCoins(userId) {
    const { data } = await supabase
      .from("usercoinconfigs")
      .select("symbol, priority")
      .eq("userid", userId)
      .eq("isactive", true);

    return (
      data?.map((config) => ({
        symbol: config.symbol,
        priority: config.priority || "medium",
      })) || []
    );
  }

  // 🎯 우선순위별 분류 (하드코딩 완전 제거)
  categorizeByPriority(sources) {
    const {
      portfolioCoins,
      selectedCoins,
      paperTradingCoins,
      configuredCoins,
    } = sources;

    const strategies = {
      critical: { coins: [], interval: 10000, priority: 1 },
      important: { coins: [], interval: 30000, priority: 2 },
      background: { coins: [], interval: 120000, priority: 3 },
    };

    // 전체 코인 목록 (중복 제거)
    const allCoins = new Set([
      ...portfolioCoins,
      ...selectedCoins,
      ...paperTradingCoins,
      ...configuredCoins.map((c) => c.symbol),
    ]);

    allCoins.forEach((symbol) => {
      // 포트폴리오 보유 = Critical (최우선)
      if (portfolioCoins.includes(symbol)) {
        strategies.critical.coins.push(symbol);
      }
      // 최근 페이퍼트레이딩 = Important
      else if (paperTradingCoins.includes(symbol)) {
        strategies.important.coins.push(symbol);
      }
      // 사용자 선택/설정 = Important
      else if (
        selectedCoins.includes(symbol) ||
        configuredCoins.some((c) => c.symbol === symbol)
      ) {
        strategies.important.coins.push(symbol);
      }
      // 나머지 = Background
      else {
        strategies.background.coins.push(symbol);
      }
    });

    // Critical이 비어있으면 Important에서 상위 2개 이동
    if (
      strategies.critical.coins.length === 0 &&
      strategies.important.coins.length > 0
    ) {
      strategies.critical.coins = strategies.important.coins.splice(0, 2);
    }

    console.log(`📊 스토어 기반 코인 분류:`);
    console.log(`  Critical: ${strategies.critical.coins.join(", ")}`);
    console.log(`  Important: ${strategies.important.coins.join(", ")}`);

    return strategies;
  }

  // 🎯 폴백 (API 실패시)
  getFallbackStrategy() {
    return {
      critical: { coins: [], interval: 10000, priority: 1 },
      important: { coins: [], interval: 30000, priority: 2 },
      background: { coins: [], interval: 120000, priority: 3 },
    };
  }
}

export const coinListAggregator = new CoinListAggregator();
