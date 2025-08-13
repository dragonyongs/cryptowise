// api/update-coins-data.js - Vercel Function
import { createClient } from "@supabase/supabase-js";
import { UnifiedDataCollector } from "../src/services/data/unifiedDataCollector";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    console.log("🚀 자동 데이터 업데이트 시작");

    const collector = new UnifiedDataCollector(supabase);
    const updatedCount = await collector.collectAndCacheAllCoins();

    console.log("✅ 자동 업데이트 완료:", updatedCount);

    return res.status(200).json({
      success: true,
      updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ 자동 업데이트 실패:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
}
