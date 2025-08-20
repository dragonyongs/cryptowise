// api/upbit-proxy.js
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    const { endpoint, markets, market, count = 100 } = req.query;

    if (!endpoint) {
      return res.status(400).json({ error: "Endpoint parameter is required" });
    }

    let upbitUrl;

    // 다양한 엔드포인트 지원
    switch (endpoint) {
      case "ticker":
        if (!markets) {
          return res
            .status(400)
            .json({ error: "Markets parameter is required for ticker" });
        }
        upbitUrl = `https://api.upbit.com/v1/ticker?markets=${markets}`;
        break;

      case "candles/days":
        if (!market) {
          return res
            .status(400)
            .json({ error: "Market parameter is required for candles" });
        }
        upbitUrl = `https://api.upbit.com/v1/candles/days?market=${market}&count=${count}`;
        break;

      default:
        return res.status(400).json({ error: "Unsupported endpoint" });
    }

    // 서버에서 업비트 API 호출 (CORS 제한 없음)
    const response = await fetch(upbitUrl);

    if (!response.ok) {
      throw new Error(`Upbit API error: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error("Upbit Proxy error:", error);
    res.status(500).json({ error: error.message });
  }
}
