// src/services/data/cachedMetadataService.js - 데이터베이스 중심 메타데이터 캐시
export class CachedMetadataService {
  constructor(supabase) {
    this.supabase = supabase;
    this.memoryCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5분
  }

  // ✅ 캐시된 메타데이터 조회 (가격 제외)
  async getCachedMetadata(coinIds) {
    const results = new Map();
    const uncachedIds = [];

    // 1. 메모리 캐시 확인
    for (const coinId of coinIds) {
      const cached = this.memoryCache.get(coinId);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        results.set(coinId, cached.data);
      } else {
        uncachedIds.push(coinId);
      }
    }

    // 2. 데이터베이스에서 메타데이터 조회
    if (uncachedIds.length > 0) {
      try {
        const { data: dbMetadata, error } = await this.supabase
          .from("coins_metadata")
          .select(
            `
                        id,
                        symbol,
                        name,
                        korean_name,
                        english_name,
                        image_url,
                        market_cap_rank,
                        market_cap,
                        coingecko_id,
                        upbit_supported,
                        upbit_market_code,
                        categories,
                        description,
                        homepage_url,
                        is_active,
                        last_updated
                    `
          )
          .in("id", uncachedIds)
          .eq("is_active", true);

        if (!error && dbMetadata) {
          dbMetadata.forEach((coin) => {
            const enrichedData = {
              ...coin,
              // 이미지 URL 처리
              image_sources: this.generateImageSources(coin),
              // 업비트 정보
              has_korean_name: !!coin.korean_name,
              display_name: coin.korean_name || coin.name,
              // 메타데이터
              is_top_tier: (coin.market_cap_rank || 999) <= 50,
              risk_level: this.calculateRiskLevel(coin),
              // 캐시 정보
              cached_at: Date.now(),
              data_source: "database",
            };

            results.set(coin.id, enrichedData);

            // 메모리 캐시에 저장
            this.memoryCache.set(coin.id, {
              data: enrichedData,
              timestamp: Date.now(),
            });
          });
        }
      } catch (error) {
        console.error("데이터베이스 메타데이터 조회 실패:", error);
      }
    }

    return results;
  }

  // ✅ 이미지 소스 생성
  generateImageSources(coin) {
    return [
      coin.image_url,
      coin.coingecko_id
        ? `https://assets.coingecko.com/coins/images/${coin.coingecko_id}/large/${coin.symbol.toLowerCase()}.png`
        : null,
      `/crypto-icons/${coin.symbol.toLowerCase()}.png`,
      this.generatePlaceholderUrl(coin),
    ].filter(Boolean);
  }

  // ✅ 위험도 계산
  calculateRiskLevel(coin) {
    const rank = coin.market_cap_rank || 999;

    if (rank <= 10) return "low";
    if (rank <= 50) return "medium";
    if (rank <= 200) return "high";
    return "very_high";
  }

  // ✅ 플레이스홀더 URL 생성
  generatePlaceholderUrl(coin) {
    const symbol = coin.symbol?.toUpperCase() || "COIN";
    return `data:image/svg+xml,${encodeURIComponent(`
            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="24" r="24" fill="#6366f1"/>
                <text x="24" y="28" text-anchor="middle" fill="white" 
                      font-family="Arial, sans-serif" font-size="12" font-weight="bold">
                    ${symbol.slice(0, 3)}
                </text>
            </svg>
        `)}`;
  }

  // ✅ 메타데이터 업데이트 (백그라운드)
  async updateMetadataInBackground(coinId, newData) {
    try {
      const { error } = await this.supabase.from("coins_metadata").upsert(
        {
          id: coinId,
          ...newData,
          last_updated: new Date().toISOString(),
        },
        {
          onConflict: "id",
          ignoreDuplicates: false,
        }
      );

      if (!error) {
        // 메모리 캐시도 업데이트
        this.memoryCache.delete(coinId);
        console.log(`✅ 메타데이터 백그라운드 업데이트: ${coinId}`);
      }
    } catch (error) {
      console.error("메타데이터 백그라운드 업데이트 실패:", error);
    }
  }

  // ✅ 캐시 상태 확인
  getCacheStatus() {
    return {
      memoryCache: this.memoryCache.size,
      cacheExpiry: this.cacheExpiry,
      lastCleanup: this.lastCleanup || null,
    };
  }

  // ✅ 캐시 정리
  cleanup() {
    const now = Date.now();
    const expired = [];

    for (const [key, value] of this.memoryCache.entries()) {
      if (now - value.timestamp > this.cacheExpiry) {
        expired.push(key);
      }
    }

    expired.forEach((key) => this.memoryCache.delete(key));
    this.lastCleanup = now;

    if (expired.length > 0) {
      console.log(`🧹 메타데이터 캐시 정리: ${expired.length}개 항목 삭제`);
    }
  }
}
