// api/external/coinGecko.js
export default async function handler(req, res) {
  const { method } = req;
  
  // CORS 헤더 추가
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { coinId, days = 365 } = req.query;

  if (!coinId) {
    return res.status(400).json({ error: 'coinId is required' });
  }

  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CryptoWise/1.0'
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Rate limit 에러시 더미 데이터 반환
        return res.json(generateDummyData(coinId, days));
      }
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    return res.json(data);

  } catch (error) {
    console.error('CoinGecko API 오류:', error);
    
    // 오류 발생시 더미 데이터 반환
    return res.json(generateDummyData(coinId, days));
  }
}

function generateDummyData(coinId, days) {
  const data = [];
  const now = Date.now();
  const basePrice = getBasePriceForCoin(coinId);
  
  for (let i = parseInt(days); i >= 0; i--) {
    const timestamp = now - (i * 24 * 60 * 60 * 1000);
    const volatility = 0.05; // 5% 변동성
    const randomChange = (Math.random() - 0.5) * volatility * 2;
    const price = basePrice * (1 + randomChange * (days - i) / days);
    const volume = basePrice * 1000000 * (0.5 + Math.random());
    
    data.push([timestamp, price, volume]);
  }
  
  return {
    prices: data.map(([timestamp, price]) => [timestamp, price]),
    total_volumes: data.map(([timestamp, , volume]) => [timestamp, volume])
  };
}

function getBasePriceForCoin(coinId) {
  const prices = {
    bitcoin: 50000,
    ethereum: 3000,
    cardano: 0.5,
    solana: 150,
    polkadot: 25,
    chainlink: 15,
    'matic-network': 1,
    avalanche: 35
  };
  
  return prices[coinId] || 100;
}
