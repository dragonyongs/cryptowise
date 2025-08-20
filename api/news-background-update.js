// api/news-background-update.js (신규)
import { centralNewsCache } from "../src/services/news/centralNewsCache.js";

export default async function handler(req, res) {
  try {
    // 백그라운드에서 상위 20개 코인 뉴스 업데이트
    const majorCoins = [
      "BTC",
      "ETH",
      "XRP",
      "ADA",
      "SOL",
      "DOT",
      "LINK",
      "MATIC",
      "AVAX",
      "UNI",
      "LTC",
      "BCH",
      "ALGO",
      "ATOM",
      "ICP",
      "NEAR",
      "MANA",
      "SAND",
      "CRV",
      "FTM",
    ];

    let completed = 0;
    await centralNewsCache.preloadNewsForCoins(majorCoins, (progress) => {
      if (progress.type === "preload_progress") {
        completed = progress.completed;
        console.log(
          `백그라운드 뉴스 업데이트: ${progress.completed}/${progress.total}`
        );
      }
    });

    res.status(200).json({
      success: true,
      updated: completed,
      total: majorCoins.length,
      timestamp: new Date().toISOString(),
      cacheStatus: centralNewsCache.getStatus(),
    });
  } catch (error) {
    console.error("백그라운드 뉴스 업데이트 실패:", error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
