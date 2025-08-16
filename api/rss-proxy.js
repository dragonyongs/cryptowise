export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL parameter required" });
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "CryptoWise-NewsBot/1.0",
        Accept: "application/rss+xml, application/xml, text/xml",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const xmlText = await response.text();

    res.setHeader("Content-Type", "text/xml");
    res.status(200).send(xmlText);
  } catch (error) {
    console.error("RSS Proxy Error:", error);
    res.status(500).json({
      error: "Failed to fetch RSS feed",
      details: error.message,
    });
  }
}
