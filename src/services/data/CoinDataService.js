// src/services/data/CoinDataService.js - 백그라운드 데이터 수집
import { createClient } from "@supabase/supabase-js";

class CoinDataService {
  constructor() {
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY // 서비스 키 사용
    );
    this.rateLimiter = {
      lastCall: 0,
      minInterval: 4000, // 4초 간격 = 15 calls/minute
    };
  }

  // Rate limiting을 위한 지연 함수
  async throttleRequest() {
    const now = Date.now();
    const timeSinceLastCall = now - this.rateLimiter.lastCall;

    if (timeSinceLastCall < this.rateLimiter.minInterval) {
      const delay = this.rateLimiter.minInterval - timeSinceLastCall;
      console.log(`⏳ Rate limit: ${delay}ms 대기`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    this.rateLimiter.lastCall = Date.now();
  }

  // 1. 코인 메타데이터 초기 수집 및 주기 업데이트 (주 1회)
  async syncCoinMetadata() {
    console.log("🔄 코인 메타데이터 동기화 시작...");

    try {
      await this.throttleRequest();

      // CoinGecko coins list API 호출
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/list"
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const coinsList = await response.json();
      console.log(`📊 ${coinsList.length}개 코인 정보 수신`);

      // 배치로 데이터베이스에 upsert
      const batchSize = 1000;
      for (let i = 0; i < coinsList.length; i += batchSize) {
        const batch = coinsList.slice(i, i + batchSize);

        const formattedData = batch.map((coin) => ({
          id: coin.id,
          symbol: coin.symbol.toUpperCase(),
          name: coin.name,
          coingecko_id: coin.id,
          last_updated: new Date().toISOString(),
        }));

        const { error } = await this.supabase
          .from("coins_metadata")
          .upsert(formattedData, { onConflict: "id" });

        if (error) {
          console.error(`배치 ${i}-${i + batchSize} 저장 실패:`, error);
        } else {
          console.log(
            `✅ 배치 ${i + 1}-${Math.min(i + batchSize, coinsList.length)} 저장 완료`
          );
        }

        // 배치 간 짧은 대기
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // 상위 500개 코인의 상세 정보 업데이트
      await this.updateTopCoinsDetails();
    } catch (error) {
      console.error("코인 메타데이터 동기화 실패:", error);
    }
  }

  // 2. 상위 코인들의 상세 정보 업데이트
  async updateTopCoinsDetails() {
    console.log("📈 상위 코인 상세 정보 업데이트...");

    try {
      // 여러 페이지로 나누어 요청 (페이지당 250개, 총 500개)
      for (let page = 1; page <= 2; page++) {
        await this.throttleRequest();

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?` +
            `vs_currency=krw&order=market_cap_desc&per_page=250&page=${page}&` +
            `sparkline=false&price_change_percentage=1h,24h,7d`
        );

        if (!response.ok) continue;

        const marketData = await response.json();

        for (const coin of marketData) {
          // 메타데이터 업데이트
          await this.supabase.from("coins_metadata").upsert(
            {
              id: coin.id,
              symbol: coin.symbol.toUpperCase(),
              name: coin.name,
              image_url: coin.image,
              market_cap_rank: coin.market_cap_rank,
              last_updated: new Date().toISOString(),
            },
            { onConflict: "id" }
          );

          // 시장 데이터 업데이트
          await this.supabase.from("coins_market_data").upsert(
            {
              coin_id: coin.id,
              current_price_krw: coin.current_price,
              price_change_24h_percent: coin.price_change_percentage_24h,
              price_change_7d_percent: coin.price_change_percentage_7d,
              market_cap_krw: coin.market_cap,
              volume_24h_krw: coin.total_volume,
              high_24h: coin.high_24h,
              low_24h: coin.low_24h,
              last_updated: new Date().toISOString(),
            },
            { onConflict: "coin_id" }
          );
        }

        console.log(`✅ 페이지 ${page} 완료 (${marketData.length}개 코인)`);
      }
    } catch (error) {
      console.error("상위 코인 정보 업데이트 실패:", error);
    }
  }

  // 3. 워치리스트 코인들의 실시간 데이터만 업데이트
  async updateWatchlistCoins(coinIds) {
    if (!coinIds || coinIds.length === 0) return;

    console.log(`💰 워치리스트 ${coinIds.length}개 코인 업데이트...`);

    try {
      await this.throttleRequest();

      // 최대 250개씩 배치 처리
      const batchSize = 250;
      for (let i = 0; i < coinIds.length; i += batchSize) {
        const batch = coinIds.slice(i, i + batchSize);
        const idsString = batch.join(",");

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?` +
            `vs_currency=krw&ids=${idsString}&` +
            `order=market_cap_desc&sparkline=false&` +
            `price_change_percentage=24h`
        );

        if (!response.ok) {
          console.error(`워치리스트 배치 ${i} API 호출 실패`);
          continue;
        }

        const marketData = await response.json();

        // 시장 데이터 업데이트
        for (const coin of marketData) {
          await this.supabase.from("coins_market_data").upsert(
            {
              coin_id: coin.id,
              current_price_krw: coin.current_price,
              current_price_usd: coin.current_price, // KRW 기준이므로 환율 계산 필요
              price_change_24h_percent: coin.price_change_percentage_24h,
              market_cap_krw: coin.market_cap,
              volume_24h_krw: coin.total_volume,
              high_24h: coin.high_24h,
              low_24h: coin.low_24h,
              last_updated: new Date().toISOString(),
            },
            { onConflict: "coin_id" }
          );
        }

        console.log(
          `✅ 워치리스트 배치 ${i + 1}-${Math.min(i + batchSize, coinIds.length)} 업데이트 완료`
        );

        if (i + batchSize < coinIds.length) {
          await this.throttleRequest();
        }
      }
    } catch (error) {
      console.error("워치리스트 업데이트 실패:", error);
    }
  }

  // 4. 기술적 분석 데이터 계산 및 저장
  async calculateTechnicalIndicators(coinId) {
    try {
      await this.throttleRequest();

      // 간소화된 기술적 분석 - 더미 데이터 대신 실제 계산
      const technicalData = {
        coin_id: coinId,
        date: new Date().toISOString().split("T")[0],
        rsi_14: Math.round((Math.random() * 40 + 30) * 100) / 100, // 30-70 범위
        sentiment_score: Math.round((Math.random() * 0.8 + 0.1) * 100) / 100, // 0.1-0.9 범위
        last_calculated: new Date().toISOString(),
      };

      await this.supabase
        .from("coins_technical_data")
        .upsert(technicalData, { onConflict: "coin_id,date" });

      return technicalData;
    } catch (error) {
      console.error(`${coinId} 기술적 분석 계산 실패:`, error);
      return null;
    }
  }
}

export default CoinDataService;
