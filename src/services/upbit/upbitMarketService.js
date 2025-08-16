class UpbitMarketService {
  constructor() {
    this.marketList = [];
    this.lastUpdated = null;
    this.updateInterval = 1000 * 60 * 60; // 1시간
  }

  async getMarketList(forceUpdate = false) {
    const now = Date.now();

    if (
      !forceUpdate &&
      this.marketList.length > 0 &&
      this.lastUpdated &&
      now - this.lastUpdated < this.updateInterval
    ) {
      return this.marketList;
    }

    try {
      const response = await fetch("https://api.upbit.com/v1/market/all");
      const markets = await response.json();

      this.marketList = markets
        .filter((market) => market.market.startsWith("KRW-"))
        .map((market) => ({
          symbol: market.market.replace("KRW-", ""),
          market: market.market,
          korean_name: market.korean_name,
          english_name: market.english_name,
          isActive: true,
        }));

      this.lastUpdated = now;
      console.log(
        `✅ 업비트 상장코인 ${this.marketList.length}개 업데이트 완료`
      );

      return this.marketList;
    } catch (error) {
      console.error("업비트 마켓 리스트 가져오기 실패:", error);
      return this.marketList;
    }
  }

  async getInvestableCoins() {
    const markets = await this.getMarketList();

    const investableCoins = markets.filter((coin) => {
      const stableCoins = ["USDT", "USDC", "BUSD", "DAI"];
      if (stableCoins.includes(coin.symbol)) return false;

      const riskyCoins = ["LUNA", "UST"];
      if (riskyCoins.includes(coin.symbol)) return false;

      return true;
    });

    return investableCoins;
  }

  generateSubscriptionList(userInterestCoins) {
    return userInterestCoins
      .filter((coin) => coin.isActive)
      .map((coin) => `KRW-${coin.symbol}`);
  }
}

export const upbitMarketService = new UpbitMarketService();
