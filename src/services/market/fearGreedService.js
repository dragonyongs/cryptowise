// services/market/fearGreedService.js
async getMarketSentiment() {
  const fearGreedIndex = await fetch('https://api.alternative.me/fng/');
  const btcData = await coinGecko.getBTCDominance();
  
  return {
    fearGreed: fearGreedIndex.value,
    btcDominance: btcData.dominance,
    marketPhase: this.determineMarketPhase(fearGreedIndex.value)
  };
}
