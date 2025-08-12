// api/external/coinGecko.js
export default async function handler(req, res) {
  const { method, query } = req;
  
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  // OPTIONS 요청 처리 (CORS preflight)
  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // URL 파라미터에서 엔드포인트 추출
    const { endpoint, ...params } = query;
    
    console.log('🔗 API 요청:', { endpoint, params });

    // CoinGecko API 엔드포인트 매핑
    let apiUrl;
    
    if (endpoint === 'markets') {
      const { vs_currency = 'krw', per_page = 250, page = 1, ids } = params;
      const idsParam = ids ? `&ids=${ids}` : '';
      apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs_currency}&per_page=${per_page}&page=${page}${idsParam}`;
    } 
    else if (endpoint === 'market_chart') {
      const { coinId, vs_currency = 'krw', days = 365 } = params;
      if (!coinId) {
        return res.status(400).json({ error: 'coinId is required for market_chart' });
      }
      apiUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=${vs_currency}&days=${days}`;
    }
    else {
      return res.status(400).json({ error: `Unsupported endpoint: ${endpoint}` });
    }

    console.log(`🌐 CoinGecko API 호출: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'CryptoWise/2.0 (+https://cryptowise.vercel.app)',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('⚠️ Rate limit reached, returning dummy data');
        return res.status(200).json(generateDummyData(endpoint, params));
      }
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('❌ CoinGecko API Handler 오류:', error.message);
    
    // 오류 시 더미 데이터 반환
    const dummyData = generateDummyData(query.endpoint, query);
    return res.status(200).json(dummyData);
  }
}

// 더미 데이터 생성 함수들
function generateDummyData(endpoint, params) {
  if (endpoint === 'markets') {
    return [
      {
        id: 'bitcoin',
        symbol: 'btc', 
        name: 'Bitcoin',
        current_price: Math.round(164628296 * (0.95 + Math.random() * 0.1)),
        market_cap_rank: 1,
        price_change_percentage_24h: (Math.random() - 0.5) * 10,
        market_cap: 164628296 * 19000000,
        total_volume: 164628296 * 400000
      },
      {
        id: 'ethereum',
        symbol: 'eth',
        name: 'Ethereum', 
        current_price: Math.round(5943835 * (0.95 + Math.random() * 0.1)),
        market_cap_rank: 2,
        price_change_percentage_24h: (Math.random() - 0.5) * 10,
        market_cap: 5943835 * 120000000,
        total_volume: 5943835 * 600000
      },
      {
        id: 'ripple',
        symbol: 'xrp',
        name: 'XRP',
        current_price: Math.round(4341 * (0.95 + Math.random() * 0.1)),
        market_cap_rank: 3,
        price_change_percentage_24h: (Math.random() - 0.5) * 10,
        market_cap: 4341 * 55000000000,
        total_volume: 4341 * 800000000
      }
    ];
  }
  
  return { error: 'No dummy data available' };
}
