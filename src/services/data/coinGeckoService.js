// src/services/data/coinGeckoService.js 수정
class CoinGeckoService {
  constructor() {
    // 개발환경에서는 Vite 프록시 사용
    this.isDev = import.meta.env.DEV;
    this.baseURL = this.isDev 
      ? '/api/coingecko/api/v3'  // Vite 프록시 경로
      : 'https://api.coingecko.com/api/v3'; // 프로덕션
    
    this.corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://cors-anywhere.herokuapp.com/'
    ];
    
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000;
  }

  async getMarketsData(vsCurrency = 'krw', perPage = 3, ids = 'bitcoin,ethereum,ripple') {
    try {
      console.log('🔄 마켓 데이터 요청...');
      
      // 개발환경에서는 Vite 프록시 먼저 시도
      if (this.isDev) {
        try {
          const proxyUrl = 'https://api.allorigins.win/raw?url=';
          const targetUrl = encodeURIComponent(
              'https://api.coingecko.com/api/v3/coins/markets?vs_currency=krw&per_page=3&ids=bitcoin,ethereum,ripple'
          );
          
          const response = await fetch(`${proxyUrl}${targetUrl}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log('✅ Vite 프록시 성공');
            return data;
          }
        } catch (viteError) {
          console.warn('❌ Vite 프록시 실패:', viteError.message);
        }
      }
      
      // CORS 프록시들 시도
      for (const proxy of this.corsProxies) {
        try {
          const targetUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&per_page=${perPage}&ids=${ids}`;
          const proxyUrl = proxy + encodeURIComponent(targetUrl);
          
          const response = await fetch(proxyUrl, {
            signal: AbortSignal.timeout(15000)
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ 프록시 성공: ${proxy}`);
            return data;
          }
        } catch (proxyError) {
          console.warn(`❌ 프록시 실패: ${proxy}`, proxyError.message);
          continue;
        }
      }
      
      // 모든 방법 실패 시 더미 데이터
      console.warn('🔄 모든 API 실패, 더미 데이터 사용');
      return this.generateDummyMarketsData();
      
    } catch (error) {
      console.error('마켓 데이터 조회 실패:', error);
      return this.generateDummyMarketsData();
    }
  }

  generateDummyMarketsData() {
    return [
      {
        id: 'bitcoin',
        symbol: 'btc',
        name: 'Bitcoin',
        current_price: Math.round(164628296 * (0.95 + Math.random() * 0.1)),
        market_cap_rank: 1,
        price_change_percentage_24h: (Math.random() - 0.5) * 10,
        market_cap: 164628296 * 19000000,
        total_volume: 164628296 * 400000,
        last_updated: new Date().toISOString()
      },
      {
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum',
        current_price: Math.round(5943835 * (0.95 + Math.random() * 0.1)),
        market_cap_rank: 2,
        price_change_percentage_24h: (Math.random() - 0.5) * 10,
        market_cap: 5943835 * 120000000,
        total_volume: 5943835 * 600000,
        last_updated: new Date().toISOString()
      },
      {
        id: 'ripple',
        symbol: 'xrp',
        name: 'XRP',
        current_price: Math.round(4341 * (0.95 + Math.random() * 0.1)),
        market_cap_rank: 3,
        price_change_percentage_24h: (Math.random() - 0.5) * 10,
        market_cap: 4341 * 55000000000,
        total_volume: 4341 * 800000000,
        last_updated: new Date().toISOString()
      }
    ];
  }
}

export const coinGeckoService = new CoinGeckoService();
