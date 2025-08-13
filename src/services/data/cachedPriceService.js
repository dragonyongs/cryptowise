// src/services/data/cachedPriceService.js
import { marketDataService } from "./marketDataService";

export class CachedPriceService {
  constructor() {
    this.priceCache = new Map();
    this.lastUpdate = new Map();
    this.UPDATE_INTERVAL = 5 * 60 * 1000; // 5분마다 업데이트
    this.isUpdating = false;
  }

  // 캐시된 가격 데이터 반환
  getCachedPrices(coinIds) {
    const results = new Map();

    coinIds.forEach((coinId) => {
      const cached = this.priceCache.get(coinId);
      if (cached) {
        results.set(coinId, {
          ...cached,
          isStale: this.isDataStale(coinId),
        });
      } else {
        // 기본값 제공
        results.set(coinId, this.getDefaultPriceData(coinId));
      }
    });

    return results;
  }

  // 기본값 데이터 생성
  getDefaultPriceData(coinId) {
    const symbol = coinId.toUpperCase();
    return {
      current_price: 0,
      price_change_24h: 0,
      price_change_percentage_24h: 0,
      market_cap: 0,
      volume_24h: 0,
      rsi: 50, // 중성값
      sentiment: 0.5, // 중성값
      last_updated: new Date().toISOString(),
      isStale: true,
      source: "default",
    };
  }

  // 데이터가 오래된지 확인
  isDataStale(coinId) {
    const lastUpdate = this.lastUpdate.get(coinId);
    if (!lastUpdate) return true;
    return Date.now() - lastUpdate > this.UPDATE_INTERVAL;
  }

  // 백그라운드에서 가격 데이터 업데이트
  async updatePricesInBackground(coinIds) {
    if (this.isUpdating || coinIds.length === 0) return;

    this.isUpdating = true;
    console.log("📊 백그라운드 가격 업데이트 시작:", coinIds.length, "개 코인");

    try {
      // CoinGecko 무료 API 사용 (제한된 호출)
      const batchSize = 10; // 한 번에 10개씩 처리
      const batches = this.chunkArray(coinIds, batchSize);

      for (const batch of batches) {
        try {
          await this.updateBatch(batch);
          // API 제한 방지를 위한 딜레이
          await this.delay(2000); // 2초 대기
        } catch (error) {
          console.warn("배치 업데이트 실패:", error);
        }
      }

      console.log("✅ 백그라운드 가격 업데이트 완료");
    } catch (error) {
      console.error("❌ 백그라운드 업데이트 실패:", error);
    } finally {
      this.isUpdating = false;
    }
  }

  // 배치 단위로 가격 업데이트
  async updateBatch(coinIds) {
    try {
      const idsString = coinIds.join(",");
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${idsString}&vs_currencies=krw&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );

      if (!response.ok) throw new Error(`API 오류: ${response.status}`);

      const data = await response.json();
      const now = Date.now();

      Object.entries(data).forEach(([coinId, priceData]) => {
        this.priceCache.set(coinId, {
          current_price: priceData.krw || 0,
          price_change_24h: priceData.krw_24h_change || 0,
          price_change_percentage_24h: priceData.krw_24h_change || 0,
          market_cap: priceData.krw_market_cap || 0,
          volume_24h: priceData.krw_24h_vol || 0,
          rsi: this.calculateMockRSI(priceData.krw_24h_change), // Mock RSI
          sentiment: this.calculateMockSentiment(priceData.krw_24h_change), // Mock 감성지수
          last_updated: new Date().toISOString(),
          isStale: false,
          source: "coingecko",
        });
        this.lastUpdate.set(coinId, now);
      });
    } catch (error) {
      console.warn("배치 가격 업데이트 실패:", error);
    }
  }

  // Mock RSI 계산 (실제 RSI 대신 24시간 변화율 기반)
  calculateMockRSI(priceChange) {
    if (!priceChange) return 50;

    // 24시간 변화율을 RSI 스타일로 변환
    if (priceChange > 10) return 80; // 과매수
    if (priceChange > 5) return 70;
    if (priceChange > 0) return 60;
    if (priceChange > -5) return 40;
    if (priceChange > -10) return 30;
    return 20; // 과매도
  }

  // Mock 감성지수 계산
  calculateMockSentiment(priceChange) {
    if (!priceChange) return 0.5;

    // -100% ~ +100% 변화를 0 ~ 1 감성지수로 변환
    const normalized = Math.max(-100, Math.min(100, priceChange)) / 100;
    return Math.max(0, Math.min(1, 0.5 + normalized * 0.5));
  }

  // 배열을 청크로 나누기
  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  // 딜레이 함수
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // 캐시 상태 정보
  getCacheStatus() {
    return {
      cachedCoins: this.priceCache.size,
      isUpdating: this.isUpdating,
      lastUpdateTimes: Array.from(this.lastUpdate.entries()),
    };
  }
}

export const cachedPriceService = new CachedPriceService();
