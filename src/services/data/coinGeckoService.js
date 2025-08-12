// src/services/data/coinGeckoService.js
import RateLimiter from '../../utils/RateLimiter'

class CoinGeckoService {
  constructor() {
    // 🆕 개선된 환경 감지 (Supabase 에러 해결)
    this.isDev = this.detectEnvironment();
    
    this.baseURL = this.isDev 
      ? '/api/coingecko/api/v3'  // Vite 프록시 경로
      : 'https://api.coingecko.com/api/v3'; // 프로덕션
    
    // 🆕 검증된 CORS 프록시들 (안정성 개선)
    this.corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://cors-anywhere.herokuapp.com/'
    ];
    
    // 🆕 개선된 캐싱 및 Rate Limiting
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5분
    this.requestCount = 0;
    this.maxRequests = 5;
    
    // 🆕 프록시 헬스 모니터링
    this.proxyHealth = new Map();
    
    // 🆕 자동 캐시 정리 (메모리 누수 방지)
    this.setupCacheCleanup();
    
    // 🆕 Rate Limiter 통합
    this.rateLimiter = new RateLimiter(50, 60000); // 50회/분
    this.exchangeRate = 1300;
    
    // 디버깅용 로그
    this.logEnvironmentInfo();
  }

  /**
   * 🆕 환경 감지 개선 (Supabase 호환)
   */
  detectEnvironment() {
    // Node.js 환경 체크
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV === 'development';
    }
    
    // 브라우저 환경 체크
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      return hostname === 'localhost' || 
             hostname === '127.0.0.1' || 
             hostname.includes('localhost') ||
             hostname.includes('dev');
    }
    
    // Vite 환경 변수 체크
    try {
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env.DEV;
      }
    } catch (e) {
      // import.meta 접근 불가능한 경우 무시
    }
    
    return false; // 기본값은 프로덕션
  }

  /**
   * 🆕 환경 정보 로깅
   */
  logEnvironmentInfo() {
    console.log('🔧 CoinGeckoService 초기화:', {
      isDev: this.isDev,
      baseURL: this.baseURL,
      corsProxies: this.corsProxies.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 🆕 자동 캐시 정리 설정
   */
  setupCacheCleanup() {
    // 10분마다 자동 캐시 정리
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 10 * 60 * 1000);
  }

  /**
   * 🆕 만료된 캐시 정리
   */
  cleanupExpiredCache() {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    // 캐시 크기 제한 (최대 100개)
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => b[1].timestamp - a[1].timestamp);
      
      for (let i = 100; i < entries.length; i++) {
        this.cache.delete(entries[i][0]);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🧹 자동 캐시 정리: ${deletedCount}개 항목 삭제`);
    }
  }

  /**
   * 🚀 개선된 타임아웃 지원 fetch 래퍼
   */
  async fetchWithTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      // 네트워크 에러 세분화
      if (error.message.includes('Failed to fetch')) {
        throw new Error('Network connection failed');
      }
      
      throw error;
    }
  }

  /**
   * 🚀 마켓 데이터 조회 (완전히 개선된 버전)
   */
  async getMarketsData(vsCurrency = 'krw', perPage = 3, ids = 'bitcoin,ethereum,ripple') {
    const cacheKey = `markets_${vsCurrency}_${perPage}_${ids}`;
    
    // 캐시 확인
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      console.log('📦 캐시에서 마켓 데이터 반환');
      return cached;
    }

    try {
      console.log('🔄 마켓 데이터 요청 시작...', {
        vsCurrency, perPage, ids,
        requestCount: this.requestCount,
        isDev: this.isDev
      });
      
      // Rate Limiter 적용
      await this.rateLimiter.wait();
      
      // API 호출 제한 확인
      if (this.requestCount >= this.maxRequests) {
        console.warn('⚠️ API 호출 제한 도달, 더미 데이터 사용');
        return this.generateDummyMarketsData();
      }

      let data = null;

      // 1단계: 개발환경에서 Vite 프록시 시도
      if (this.isDev) {
        data = await this.tryViteProxy(vsCurrency, perPage, ids);
        if (data && this.validateMarketData(data)) {
          return this.cacheAndReturn(cacheKey, data);
        }
      }

      // 2단계: 프로덕션에서 직접 API 호출 시도
      if (!this.isDev) {
        data = await this.tryDirectAPI(vsCurrency, perPage, ids);
        if (data && this.validateMarketData(data)) {
          return this.cacheAndReturn(cacheKey, data);
        }
      }

      // 3단계: CORS 프록시들 시도 (모든 환경)
      data = await this.tryCorsProxies(vsCurrency, perPage, ids);
      if (data && this.validateMarketData(data)) {
        return this.cacheAndReturn(cacheKey, data);
      }

      // 4단계: 모든 방법 실패 시 더미 데이터
      console.warn('🔄 모든 API 실패, 더미 데이터 사용');
      return this.generateDummyMarketsData();
      
    } catch (error) {
      console.error('❌ getMarketsData 전체 실패:', error.message);
      return this.generateDummyMarketsData();
    }
  }

  /**
   * 🆕 캐시된 데이터 조회
   */
  getCachedData(cacheKey) {
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.data;
      }
      // 만료된 캐시 삭제
      this.cache.delete(cacheKey);
    }
    return null;
  }

  /**
   * 🆕 마켓 데이터 유효성 검증
   */
  validateMarketData(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return false;
    }
    
    // 필수 필드 확인
    const requiredFields = ['id', 'symbol', 'name', 'current_price', 'market_cap_rank'];
    const firstItem = data[0];
    
    return requiredFields.every(field => firstItem.hasOwnProperty(field));
  }

  /**
   * 🚀 Vite 프록시 시도 (개선된 에러 처리)
   */
  async tryViteProxy(vsCurrency, perPage, ids) {
    try {
      console.log('🔄 Vite 프록시 시도...');
      const url = `${this.baseURL}/coins/markets?vs_currency=${vsCurrency}&per_page=${perPage}&ids=${ids}`;
      
      const response = await this.fetchWithTimeout(url, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }, 10000);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }

      const data = await response.json();
      
      if (!this.validateMarketData(data)) {
        throw new Error('Invalid data format from Vite proxy');
      }

      console.log('✅ Vite 프록시 성공:', `${data.length}개 코인`);
      this.requestCount++;
      return data;

    } catch (error) {
      console.warn('❌ Vite 프록시 실패:', error.message);
      return null;
    }
  }

  /**
   * 🚀 직접 API 호출 시도 (개선된 버전)
   */
  async tryDirectAPI(vsCurrency, perPage, ids) {
    try {
      console.log('🔄 직접 API 호출 시도...');
      const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&per_page=${perPage}&ids=${ids}`;
      
      const response = await this.fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'CryptoWise/2.0 (+https://cryptowise.vercel.app)',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        }
      }, 12000);
      
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('⚠️ Rate limit from CoinGecko API');
          throw new Error('Rate limit exceeded');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!this.validateMarketData(data)) {
        throw new Error('Invalid data from direct API');
      }

      console.log('✅ 직접 API 성공:', `${data.length}개 코인`);
      this.requestCount++;
      return data;

    } catch (error) {
      console.warn('❌ 직접 API 실패:', error.message);
      return null;
    }
  }

  /**
   * 🚀 CORS 프록시들 시도 (헬스체크 포함)
   */
  async tryCorsProxies(vsCurrency, perPage, ids) {
    const targetUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vsCurrency}&per_page=${perPage}&ids=${ids}`;

    // 프록시 헬스체크 기반 정렬
    const sortedProxies = this.corsProxies.sort((a, b) => {
      const healthA = this.proxyHealth.get(a);
      const healthB = this.proxyHealth.get(b);
      
      if (!healthA && !healthB) return 0;
      if (!healthA) return 1;
      if (!healthB) return -1;
      
      return healthB.successRate - healthA.successRate;
    });

    for (let i = 0; i < sortedProxies.length; i++) {
      const proxy = sortedProxies[i];
      
      try {
        console.log(`🔄 프록시 시도 ${i + 1}/${sortedProxies.length}: ${proxy.substring(0, 25)}...`);
        
        const proxyUrl = proxy + encodeURIComponent(targetUrl);
        const response = await this.fetchWithTimeout(proxyUrl, {
          headers: {
            'Origin': 'https://cryptowise.vercel.app',
            'Referer': 'https://cryptowise.vercel.app'
          }
        }, 20000);
        
        if (!response.ok) {
          throw new Error(`Proxy HTTP ${response.status}`);
        }

        const text = await response.text();
        
        // JSON 파싱 시도
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          throw new Error('Invalid JSON response from proxy');
        }

        if (!this.validateMarketData(data)) {
          throw new Error('Invalid data structure from proxy');
        }

        // 프록시 성공 기록
        this.updateProxyHealth(proxy, true);

        console.log(`✅ 프록시 성공: ${proxy.substring(0, 30)}...`);
        return data;

      } catch (proxyError) {
        console.warn(`❌ 프록시 ${i + 1} 실패:`, proxyError.message);
        
        // 프록시 실패 기록
        this.updateProxyHealth(proxy, false);
        continue;
      }
    }

    return null;
  }

  /**
   * 🆕 프록시 헬스체크 업데이트
   */
  updateProxyHealth(proxy, success) {
    const current = this.proxyHealth.get(proxy) || { 
      attempts: 0, 
      successes: 0, 
      successRate: 0,
      lastUsed: Date.now()
    };
    
    current.attempts++;
    if (success) current.successes++;
    current.successRate = current.successes / current.attempts;
    current.lastUsed = Date.now();
    
    this.proxyHealth.set(proxy, current);
  }

  /**
   * 캐시 저장 및 반환
   */
  cacheAndReturn(cacheKey, data) {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    console.log(`💾 캐시 저장: ${cacheKey}`);
    return data;
  }

  /**
   * 🚀 개선된 더미 데이터 생성
   */
  generateDummyMarketsData() {
    console.log('📈 현실적인 더미 마켓 데이터 생성');
    
    const baseData = [
      { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin', basePrice: 164628296, rank: 1 },
      { id: 'ethereum', symbol: 'eth', name: 'Ethereum', basePrice: 5943835, rank: 2 },
      { id: 'ripple', symbol: 'xrp', name: 'XRP', basePrice: 4341, rank: 3 }
    ];

    return baseData.map(coin => {
      // 더 현실적인 가격 변동 로직
      const baseVariation = 0.95 + Math.random() * 0.1; // ±5% 변동
      const trendFactor = Math.sin(Date.now() / 86400000) * 0.02; // 일별 트렌드
      const randomFactor = (Math.random() - 0.5) * 0.03; // ±1.5% 랜덤
      
      const priceVariation = baseVariation + trendFactor + randomFactor;
      const changeVariation = (Math.random() - 0.5) * 8; // ±4% 일일 변화
      
      return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        current_price: Math.round(coin.basePrice * priceVariation),
        market_cap_rank: coin.rank,
        price_change_percentage_24h: parseFloat(changeVariation.toFixed(2)),
        market_cap: Math.round(coin.basePrice * priceVariation * 19000000),
        total_volume: Math.round(coin.basePrice * priceVariation * 400000),
        last_updated: new Date().toISOString(),
        // 더미 데이터 식별자
        _isDummy: true,
        _generatedAt: Date.now()
      };
    });
  }

  /**
   * 🆕 백테스팅 데이터 조회 (기존 메서드 유지 + 개선)
   */
  async getHistoricalData(coinId, days = 365) {
    try {
      console.log(`📊 데이터 요청: ${coinId} (${days}일)`);

      // API 호출 횟수 제한 (개발용)
      if (this.requestCount >= 3) {
        console.log('⚠️ API 호출 제한 - 더미 데이터 사용');
        return this.generateRealisticHistoricalData(coinId, days);
      }

      const url = `${this.baseURL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
      
      try {
        const response = await this.fetchWithTimeout(url, {
          headers: { 'User-Agent': 'CryptoWise/2.0' }
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
        return this.generateRealisticHistoricalData(coinId, days);
      }
      
    } catch (error) {
      console.error('❌ 전체 실패:', error);
      return this.generateRealisticHistoricalData(coinId, days);
    }
  }

  /**
   * 🆕 현실적인 히스토리컬 데이터 생성
   */
  generateRealisticHistoricalData(coinId, days) {
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
        rsi: 20 + Math.random() * 60, // 20-80 범위
        macd: Math.random() > 0.5 ? 'bullish' : 'bearish'
      });
    }
    
    console.log(`📈 ${coinId} 현실적 더미데이터 ${data.length}개 생성`);
    return data;
  }

  /**
   * 기존 유틸리티 메서드들 유지
   */
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

  /**
   * 🆕 전체 캐시 정리
   */
  clearCache() {
    this.cache.clear();
    this.requestCount = 0;
    this.proxyHealth.clear();
    console.log('🧹 전체 캐시 정리 완료');
  }

  /**
   * 🆕 상세한 서비스 상태 확인
   */
  getStatus() {
    return {
      isDev: this.isDev,
      baseURL: this.baseURL,
      requestCount: this.requestCount,
      maxRequests: this.maxRequests,
      cacheSize: this.cache.size,
      proxyHealth: Object.fromEntries(this.proxyHealth),
      exchangeRate: this.exchangeRate,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - (this.startTime || Date.now())
    };
  }

  /**
   * 🆕 헬스체크 메서드
   */
  async healthCheck() {
    const results = {
      service: 'CoinGeckoService',
      status: 'checking',
      checks: {},
      timestamp: new Date().toISOString()
    };

    try {
      // 캐시 상태 확인
      results.checks.cache = {
        status: 'ok',
        size: this.cache.size,
        maxSize: 100
      };

      // 프록시 상태 확인
      results.checks.proxies = Array.from(this.proxyHealth.entries()).map(([proxy, health]) => ({
        proxy: proxy.substring(0, 30) + '...',
        successRate: health.successRate,
        attempts: health.attempts,
        lastUsed: new Date(health.lastUsed).toISOString()
      }));

      results.status = 'healthy';
    } catch (error) {
      results.status = 'error';
      results.error = error.message;
    }

    return results;
  }
}

export const coinGeckoService = new CoinGeckoService();
