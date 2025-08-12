// src/services/analysis/survivalFilter.js
const survivalCriteria = {
    marketCap: { min: 100000000 }, // 1억 이상
    rank: { max: 200 }, // CMC 200위 내
    volume: { daily_min: 10000000 }, // 일 거래량 1천만 이상
    consistency: { days: 30, threshold: 0.7 }, // 30일 중 70% 이상 거래
    exchange: {
        tier1: ['upbit', 'binance', 'coinbase', 'kraken'],
        minExchanges: 3
    },
    upbitListing: true // Upbit 상장 필수
};

export async function filterSurvivableCoins(coinList) {
    return coinList.filter(coin => {
        return coin.market_cap >= survivalCriteria.marketCap.min &&
            coin.market_cap_rank <= survivalCriteria.rank.max &&
            coin.total_volume >= survivalCriteria.volume.daily_min &&
            coin.exchanges.includes('upbit');
    });
}
