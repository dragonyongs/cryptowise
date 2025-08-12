// api/rss-proxy.js (Vercel 서버리스 함수)
export default async function handler(req, res) {
  const { url } = req.query; // 클라이언트에서 RSS URL 전달

  if (!url) {
    return res.status(400).json({ error: 'RSS URL is required' });
  }

  try {
    // RSS 피드 요청
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CryptoWise/1.0 (+https://your-vercel-app.vercel.app)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Failed to fetch RSS: ${response.statusText}` });
    }

    const xmlText = await response.text();

    // CORS 헤더 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/rss+xml');

    return res.status(200).send(xmlText);
  } catch (error) {
    console.error('RSS Proxy Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
