// src/services/data/coinGeckoService.js
class CoinGeckoService {
  constructor() {
    // 개발환경에서는 직접 API 호출 (CORS 에러 발생하지만 더미데이터로 대체)
    this.baseURL = 'https://api.coingecko.com/api/v3'
    this.exchangeRate = 1300
    this.requestCount = 0 // API 호출 제한용
  }

  async getHistoricalData(coinId, days = 365) {
    try {
      console.log(`📊 데이터 요청: ${coinId} (${days}일)`);

      // API 호출 횟수 제한 (개발용)
      if (this.requestCount >= 3) {
        console.log('⚠️ API 호출 제한 - 더미 데이터 사용');
        return this.generateRealisticData(coinId, days);
      }

      const url = `${this.baseURL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
      
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'CryptoWise/1.0' }
        });

        if (!response.ok || response.status === 429) {
          throw new Error('API 호출 실패');
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('JSON이 아닌 응답');
        }

        const data = await response.json();
        this.requestCount++;
        
        console.log(`✅ 실제 데이터 수신: ${data.prices.length}개`);
        
        return data.prices.map(([timestamp, priceUSD], index) => ({
          symbol: coinId.toUpperCase(),
          timestamp: new Date(timestamp),
          price: priceUSD * this.exchangeRate,
          volume: data.total_volumes?.[index]?.[1] || 0,
          rsi: 30 + Math.random() * 40,
          macd: Math.random() > 0.5 ? 'bullish' : 'bearish'
        }));
        
      } catch (apiError) {
        console.log('🔄 API 실패, 더미 데이터로 대체');
        return this.generateRealisticData(coinId, days);
      }
      
    } catch (error) {
      console.error('❌ 전체 실패:', error);
      return this.generateRealisticData(coinId, days);
    }
  }

  generateRealisticData(coinId, days) {
    const data = [];
    const basePrice = this.getBasePrice(coinId);
    const now = Date.now();
    
    let currentPrice = basePrice;
    
    for (let i = parseInt(days); i >= 0; i--) {
      const timestamp = new Date(now - (i * 24 * 60 * 60 * 1000));
      
      // 현실적인 가격 변동 (일일 ±5%)
      const dailyChange = (Math.random() - 0.5) * 0.1; // ±5%
      currentPrice *= (1 + dailyChange);
      
      // 가격이 너무 벗어나지 않게 조정
      if (currentPrice < basePrice * 0.5) currentPrice = basePrice * 0.6;
      if (currentPrice > basePrice * 2) currentPrice = basePrice * 1.8;
      
      data.push({
        symbol: coinId.toUpperCase(),
        timestamp,
        price: Math.round(currentPrice),
        volume: Math.random() * 1000000 + 500000,
        rsi: 20 + Math.random() * 60, // 20-80 범위 (더 넓은 범위)
        macd: Math.random() > 0.5 ? 'bullish' : 'bearish'
      });
    }
    
    console.log(`📈 ${coinId} 현실적 더미데이터 ${data.length}개 생성`);
    return data;
  }

  getBasePrice(coinId) {
    const prices = {
      bitcoin: 85000000,      // 8천5백만원
      ethereum: 3500000,      // 3백50만원
      solana: 180000,         // 18만원
      cardano: 550,           // 550원
      polkadot: 8500,         // 8천5백원
      chainlink: 18000,       // 1만8천원
      'matic-network': 650,   // 650원
      'avalanche-2': 42000    // 4만2천원
    };
    
    return prices[coinId] || 80000;
  }

  getCoinGeckoId(symbol) {
    const mapping = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      SOL: 'solana', 
      ADA: 'cardano',
      DOT: 'polkadot',
      LINK: 'chainlink',
      MATIC: 'matic-network',
      AVAX: 'avalanche-2'
    };
    
    return mapping[symbol.toUpperCase()] || symbol.toLowerCase();
  }
}

export const coinGeckoService = new CoinGeckoService();
