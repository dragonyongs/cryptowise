// src/services/data/unifiedDataCollector.js - 통합 데이터 수집
export class UnifiedDataCollector {
  constructor(supabase) {
    this.supabase = supabase;
    this.isCollecting = false;
    this.collectionQueue = new Set();
  }

  // ✅ 통합 데이터 수집 (업비트 + CoinGecko)
  async collectAndCacheAllCoins() {
    if (this.isCollecting) return;

    this.isCollecting = true;
    console.log("🚀 통합 데이터 수집 시작");

    try {
      // 1. 업비트 마켓 데이터 수집
      const upbitMarkets = await this.collectUpbitMarkets();
      console.log("📊 업비트 마켓:", upbitMarkets.size, "개");

      // 2. CoinGecko 상위 코인 수집 (여러 페이지)
      const coinGeckoCoins = await this.collectCoinGeckoCoins();
      console.log("🦎 CoinGecko 코인:", coinGeckoCoins.length, "개");

      // 3. 데이터 병합 및 저장
      const mergedCoins = this.mergeCoinsData(coinGeckoCoins, upbitMarkets);
      const savedCount = await this.saveMergedCoins(mergedCoins);

      console.log("✅ 통합 수집 완료:", savedCount, "개 코인 저장");
      return savedCount;
    } catch (error) {
      console.error("❌ 통합 데이터 수집 실패:", error);
      return 0;
    } finally {
      this.isCollecting = false;
    }
  }

  // 업비트 마켓 데이터 수집
  async collectUpbitMarkets() {
    const upbitMarkets = new Map();

    try {
      const response = await fetch(
        "https://api.upbit.com/v1/market/all?isDetails=false"
      );
      const markets = await response.json();

      markets.forEach((market) => {
        if (market.market && market.market.startsWith("KRW-")) {
          const symbol = market.market.replace("KRW-", "");
          upbitMarkets.set(symbol.toUpperCase(), {
            korean_name: market.korean_name,
            english_name: market.english_name,
            market_code: market.market,
            upbit_supported: true,
          });
        }
      });

      return upbitMarkets;
    } catch (error) {
      console.error("업비트 마켓 수집 실패:", error);
      return new Map();
    }
  }

  // CoinGecko 코인 수집 (페이지네이션)
  async collectCoinGeckoCoins() {
    const allCoins = [];
    const maxPages = 10; // 상위 2500개 코인

    for (let page = 1; page <= maxPages; page++) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // API 제한 방지

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?` +
            `vs_currency=krw&order=market_cap_desc&per_page=250&page=${page}&` +
            `sparkline=false&price_change_percentage=24h`
        );

        if (!response.ok) {
          console.warn(`CoinGecko 페이지 ${page} 실패:`, response.status);
          continue;
        }

        const pageCoins = await response.json();
        if (!pageCoins || pageCoins.length === 0) break;

        allCoins.push(...pageCoins);
        console.log(
          `📄 CoinGecko 페이지 ${page}: ${pageCoins.length}개 코인 수집`
        );
      } catch (error) {
        console.error(`CoinGecko 페이지 ${page} 오류:`, error);
        continue;
      }
    }

    return allCoins;
  }

  // 데이터 병합 (업비트 한글명 + CoinGecko 상세정보)
  mergeCoinsData(coinGeckoCoins, upbitMarkets) {
    return coinGeckoCoins.map((coin) => {
      const symbol = coin.symbol.toUpperCase();
      const upbitData = upbitMarkets.get(symbol);

      return {
        // 기본 정보 (CoinGecko)
        id: coin.id,
        symbol: symbol,
        name: coin.name,
        image_url: coin.image,
        market_cap_rank: coin.market_cap_rank,
        market_cap: coin.market_cap,
        current_price: coin.current_price,
        coingecko_id: coin.id,

        // 한글 정보 (업비트)
        korean_name: upbitData?.korean_name || null,
        english_name: upbitData?.english_name || coin.name,
        upbit_supported: !!upbitData,
        upbit_market_code: upbitData?.market_code || null,

        // 메타 정보
        categories: null, // 필요시 추가 API 호출로 수집
        description: null,
        homepage_url: null,
        blockchain_platform: null,
        contract_address: null,
        is_active: true,
        first_seen_at: null,
        last_updated: new Date().toISOString(),
      };
    });
  }

  // 병합된 코인 데이터 저장
  async saveMergedCoins(mergedCoins) {
    let savedCount = 0;
    const batchSize = 100;

    for (let i = 0; i < mergedCoins.length; i += batchSize) {
      const batch = mergedCoins.slice(i, i + batchSize);

      try {
        const { error } = await this.supabase
          .from("coins_metadata")
          .upsert(batch, {
            onConflict: "id",
            ignoreDuplicates: false,
          });

        if (!error) {
          savedCount += batch.length;
          console.log(
            `💾 배치 ${Math.ceil((i + 1) / batchSize)} 저장 완료: ${batch.length}개`
          );
        } else {
          console.error("배치 저장 실패:", error);
        }
      } catch (error) {
        console.error("배치 저장 오류:", error);
      }
    }

    return savedCount;
  }

  // ✅ 개별 코인 정보 보강 (검색 시 호출)
  async enrichCoinData(coinId) {
    if (this.collectionQueue.has(coinId)) return null;

    this.collectionQueue.add(coinId);

    try {
      // CoinGecko에서 상세 정보 가져오기
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coinId}?` +
          `localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`
      );

      if (!response.ok) return null;

      const coinData = await response.json();

      // 업비트 지원 확인
      const upbitResponse = await fetch(
        "https://api.upbit.com/v1/market/all?isDetails=false"
      );
      const upbitMarkets = await upbitResponse.json();
      const upbitData = upbitMarkets.find(
        (m) => m.market === `KRW-${coinData.symbol.toUpperCase()}`
      );

      const enrichedData = {
        id: coinData.id,
        symbol: coinData.symbol.toUpperCase(),
        name: coinData.name,
        image_url: coinData.image?.thumb || coinData.image?.small,
        market_cap_rank: coinData.market_cap_rank,
        market_cap: coinData.market_data?.market_cap?.krw,
        current_price: coinData.market_data?.current_price?.krw,
        coingecko_id: coinData.id,
        korean_name: upbitData?.korean_name || null,
        english_name: upbitData?.english_name || coinData.name,
        upbit_supported: !!upbitData,
        upbit_market_code: upbitData?.market || null,
        categories: coinData.categories,
        description: coinData.description?.en?.substring(0, 500),
        homepage_url: coinData.links?.homepage?.[0],
        is_active: true,
        last_updated: new Date().toISOString(),
      };

      // 데이터베이스에 저장
      const { error } = await this.supabase
        .from("coins_metadata")
        .upsert([enrichedData], {
          onConflict: "id",
          ignoreDuplicates: false,
        });

      if (!error) {
        console.log("✅ 개별 코인 데이터 보강:", coinId);
        return enrichedData;
      }
    } catch (error) {
      console.error("개별 코인 보강 실패:", error);
    } finally {
      this.collectionQueue.delete(coinId);
    }

    return null;
  }

  // 수집 상태 확인
  getCollectionStatus() {
    return {
      isCollecting: this.isCollecting,
      queueSize: this.collectionQueue.size,
      inQueue: Array.from(this.collectionQueue),
    };
  }
}

// 인스턴스 export
export const unifiedDataCollector = new UnifiedDataCollector();
