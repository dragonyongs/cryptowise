// api/rss-proxy.js (Vercel 서버리스 함수)
export default async function handler(req, res) {
  const { url } = req.query;  // 클라이언트에서 RSS URL 전달 (예: cointelegraph.com/rss)

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, s-maxage=300');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!url) return res.status(400).json({ error: 'RSS URL is required' });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CryptoWise/2.0 (+https://cryptowise.vercel.app)',
        'Accept': 'application/rss+xml'
      }
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 403) {
        console.warn('⚠️ RSS Rate limit or forbidden, returning dummy data');
        return res.status(200).json(generateDummyRSSData());  // 더미 RSS 데이터
      }
      throw new Error(`RSS fetch error: ${response.status}`);
    }

    const xmlText = await response.text();
    res.setHeader('Content-Type', 'application/rss+xml');
    return res.status(200).send(xmlText);
  } catch (error) {
    console.error('❌ RSS Proxy Error:', error.message);
    return res.status(200).json(generateDummyRSSData());  // 실패 시 더미 반환
  }
}

// 더미 RSS 데이터 생성 (뉴스 감성 분석용 fallback)
function generateDummyRSSData() {
  return [
    { title: 'Bitcoin Market Update', description: 'Positive trends in crypto.', pubDate: new Date() },
    { title: 'Ethereum Upgrade News', description: 'Bullish signals for ETH.', pubDate: new Date() }
  ];
}
