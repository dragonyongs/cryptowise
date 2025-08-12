// src/services/data/dataCollector.js
import { cache } from '../../utils/cache.js'; // FreePlan.txt 기반 캐시 임포트

export class DataCollector {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
  }

  async getTopCoins(limit = 250) {
    const cacheKey = `topCoins_${limit}`;
    let data = cache.get(cacheKey);
    if (!data) {
      const response = await fetch(`${this.baseURL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1`);
      data = await response.json();
      cache.set(cacheKey, data, 300); // 5분 캐시
    }
    return data;
  }

  async getHistoricalData(coinId, days = 30) {
    // 유사 로직으로 Upbit WebSocket 통합 가능
    const response = await fetch(`${this.baseURL}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
    return await response.json();
  }
}
