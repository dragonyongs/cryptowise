// api/rss.js
// Vercel Serverless Function (Node 18+ 환경에서 global fetch 사용 가능)
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 60 * 30, checkperiod: 600 }); // 30분 기본 TTL
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1분
const RATE_LIMIT_MAX = 30; // IP 당 30 요청/분 (조정 가능)
const ipCounters = new Map();

module.exports = async (req, res) => {
  try {
    const url = req.query.url || req.body?.url;
    if (!url) {
      res.status(400).json({ error: 'url 쿼리 필요: /api/rss?url=https://...' });
      return;
    }

    // 간단 IP 레이트리밋 (초기용). 프로덕션에선 외부 레디스 기반 레이트리밋 추천
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const bucket = ipCounters.get(ip) || { ts: now, count: 0 };
    if (now - bucket.ts > RATE_LIMIT_WINDOW_MS) {
      bucket.ts = now;
      bucket.count = 0;
    }
    bucket.count++;
    ipCounters.set(ip, bucket);
    if (bucket.count > RATE_LIMIT_MAX) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(429).json({ error: 'Too Many Requests' });
      return;
    }

    // 캐시 확인
    const cacheKey = url;
    const cached = cache.get(cacheKey);
    if (cached) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('X-Cache', 'HIT');
      res.type('application/xml').send(cached);
      return;
    }

    // 외부 fetch (타임아웃 처리)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15초
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CryptoWiseProxy/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(response.status).send(`Upstream error: ${response.status}`);
      return;
    }

    const text = await response.text();
    cache.set(cacheKey, text); // 메모리 캐시
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Cache', 'MISS');
    res.type('application/xml').send(text);

  } catch (err) {
    if (err.name === 'AbortError') {
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(504).json({ error: 'Timeout fetching upstream' });
    }
    console.error('rss proxy error', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(502).json({ error: 'Bad Gateway', message: err.message });
  }
};
