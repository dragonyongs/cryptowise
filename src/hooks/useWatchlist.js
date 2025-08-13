// src/hooks/useWatchlist.js - 완전히 개선된 안정화 버전
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { cachedPriceService } from "../services/data/cachedPriceService";

export function useWatchlist() {
  // ===== State 관리 =====
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [marketDataLoading, setMarketDataLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [upbitMarkets, setUpbitMarkets] = useState(new Map());
  const [cacheStatus, setCacheStatus] = useState({
    isUsingCache: false,
    lastCacheUpdate: null,
    staleCoinCount: 0,
  });

  const { user, supabase } = useAuth();
  const abortControllerRef = useRef(null);
  const loadingRef = useRef(false);

  // ===== 유틸리티 함수들 =====
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const checkNetworkStatus = () => {
    if (!navigator.onLine) {
      console.warn("⚠️ 네트워크 연결 없음");
      setError("인터넷 연결을 확인해주세요");
      return false;
    }
    return true;
  };

  const createAbortController = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  };

  // ===== 업비트 마켓 데이터 로드 =====
  const loadUpbitMarkets = useCallback(async () => {
    try {
      console.log("📊 업비트 마켓 데이터 로드 시작...");

      const controller = createAbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        "https://api.upbit.com/v1/market/all?isDetails=false",
        {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`업비트 API 오류: ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("업비트 API 응답 형식 오류");
      }

      const marketMap = new Map();
      data.forEach((market) => {
        if (market.market && market.market.startsWith("KRW-")) {
          const symbol = market.market.split("-")[1];
          if (symbol) {
            marketMap.set(symbol.toUpperCase(), {
              korean_name: market.korean_name || symbol,
              english_name: market.english_name || symbol,
              market_code: market.market,
              upbit_supported: true,
            });
          }
        }
      });

      setUpbitMarkets(marketMap);
      console.log(
        "✅ 업비트 마켓 데이터 로드 완료:",
        marketMap.size,
        "개 마켓"
      );
      return marketMap;
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("⏰ 업비트 마켓 데이터 로드 취소됨");
      } else {
        console.error("❌ 업비트 마켓 데이터 로드 실패:", error);
      }
      return new Map();
    }
  }, []);

  // ===== 외부 API 호출 함수들 =====
  const fetchCoinGeckoData = useCallback(async (watchlistItems) => {
    const controller = createAbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      console.log("🦎 CoinGecko API 호출 시작...");

      const coinIds = watchlistItems
        .map((item) => item.coin_id)
        .filter(Boolean)
        .join(",");

      if (!coinIds) {
        console.log("🦎 CoinGecko: 유효한 코인 ID 없음");
        return [];
      }

      await delay(500); // Rate limiting 방지

      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/markets?` +
          `vs_currency=krw&ids=${coinIds}&` +
          `order=market_cap_desc&per_page=250&page=1&` +
          `sparkline=false&price_change_percentage=24h&` +
          `include_market_cap=true&include_24hr_vol=true&include_24hr_change=true`,
        {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
          },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(
          `CoinGecko API 오류: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        console.warn("🦎 CoinGecko: 예상치 못한 응답 형식");
        return [];
      }

      console.log("✅ CoinGecko 데이터 수신 완료:", data.length, "개 코인");
      return data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.name === "AbortError") {
        console.log("⏰ CoinGecko API 호출 취소됨");
      } else {
        console.error("❌ CoinGecko API 호출 실패:", error.message);
      }
      return [];
    }
  }, []);

  const fetchUpbitPriceData = useCallback(
    async (watchlistItems) => {
      const controller = createAbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        console.log("📈 업비트 가격 API 호출 시작...");

        const upbitSymbols = watchlistItems
          .filter(
            (item) => item.symbol && upbitMarkets.has(item.symbol.toUpperCase())
          )
          .map((item) => `KRW-${item.symbol.toUpperCase()}`)
          .filter(Boolean)
          .join(",");

        if (!upbitSymbols) {
          console.log("📈 업비트: 지원되는 심볼 없음");
          return new Map();
        }

        await delay(300); // Rate limiting 방지

        const response = await fetch(
          `https://api.upbit.com/v1/ticker?markets=${upbitSymbols}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
              "Cache-Control": "no-cache",
            },
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(
            `업비트 API 오류: ${response.status} ${response.statusText}`
          );
        }

        const data = await response.json();
        const priceMap = new Map();

        if (Array.isArray(data)) {
          data.forEach((ticker) => {
            if (ticker.market) {
              const symbol = ticker.market.split("-")[1];
              if (symbol) {
                priceMap.set(symbol, {
                  trade_price: ticker.trade_price || 0,
                  signed_change_rate: ticker.signed_change_rate || 0,
                  signed_change_price: ticker.signed_change_price || 0,
                  high_price: ticker.high_price || 0,
                  low_price: ticker.low_price || 0,
                  acc_trade_price_24h: ticker.acc_trade_price_24h || 0,
                  timestamp: ticker.timestamp || Date.now(),
                });
              }
            }
          });
        }

        console.log(
          "✅ 업비트 가격 데이터 수신 완료:",
          priceMap.size,
          "개 코인"
        );
        return priceMap;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === "AbortError") {
          console.log("⏰ 업비트 가격 API 호출 취소됨");
        } else {
          console.error("❌ 업비트 가격 API 호출 실패:", error.message);
        }
        return new Map();
      }
    },
    [upbitMarkets]
  );

  // ===== 기술적 지표 계산 함수들 =====
  const calculateRSI = useCallback((prices, period = 14) => {
    try {
      if (!Array.isArray(prices) || prices.length < period + 1) {
        return null;
      }

      const gains = [];
      const losses = [];

      for (let i = 1; i < prices.length; i++) {
        const difference = prices[i] - prices[i - 1];
        gains.push(difference > 0 ? difference : 0);
        losses.push(difference < 0 ? -difference : 0);
      }

      const avgGain =
        gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
      const avgLoss =
        losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

      if (avgLoss === 0) return 100;

      const rs = avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);

      return Math.round(rsi * 100) / 100;
    } catch (error) {
      console.error("RSI 계산 오류:", error);
      return null;
    }
  }, []);

  const calculateMovingAverage = useCallback((prices, period) => {
    try {
      if (!Array.isArray(prices) || prices.length < period) {
        return null;
      }

      const recentPrices = prices.slice(-period);
      const sum = recentPrices.reduce((acc, price) => acc + price, 0);
      return Math.round((sum / period) * 100) / 100;
    } catch (error) {
      console.error("이동평균 계산 오류:", error);
      return null;
    }
  }, []);

  const calculateRealTechnicalIndicators = useCallback(
    async (coinId) => {
      const controller = createAbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      try {
        await delay(1000); // Rate limiting

        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=krw&days=30`,
          {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const ohlcData = await response.json();

          if (Array.isArray(ohlcData) && ohlcData.length > 0) {
            const closes = ohlcData
              .map((candle) => candle[4])
              .filter((price) => price > 0);

            if (closes.length > 0) {
              const rsi = calculateRSI(closes, 14);
              const ma20 = calculateMovingAverage(closes, 20);
              const ma50 = calculateMovingAverage(closes, 50);

              return {
                rsi: rsi,
                ma20: ma20,
                ma50: ma50,
                sentiment: null,
                fear_greed: null,
                last_calculated: new Date().toISOString(),
              };
            }
          }
        }
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name !== "AbortError") {
          console.error(`${coinId} 기술적 지표 계산 실패:`, error);
        }
      }

      return {
        rsi: null,
        ma20: null,
        ma50: null,
        sentiment: null,
        fear_greed: null,
      };
    },
    [calculateRSI, calculateMovingAverage]
  );

  const fetchTechnicalAnalysisData = useCallback(
    async (watchlistItems) => {
      try {
        console.log("🔧 기술적 분석 시작...");

        const technicalMap = new Map();
        const limitedItems = watchlistItems.slice(0, 3); // API 부하 방지

        // 순차 처리로 Rate Limiting 방지
        for (let i = 0; i < limitedItems.length; i++) {
          const item = limitedItems[i];
          try {
            if (i > 0) await delay(2000); // 2초 간격

            console.log(
              `🔧 기술적 분석 처리: ${i + 1}/${limitedItems.length} - ${item.symbol}`
            );
            const technical = await calculateRealTechnicalIndicators(
              item.coin_id
            );
            technicalMap.set(item.coin_id, technical);
          } catch (error) {
            console.error(`❌ ${item.coin_id} 기술적 분석 실패:`, error);
            technicalMap.set(item.coin_id, {
              rsi: null,
              ma20: null,
              ma50: null,
              sentiment: null,
              fear_greed: null,
            });
          }
        }

        console.log("✅ 기술적 분석 완료:", technicalMap.size, "개 코인");
        return technicalMap;
      } catch (error) {
        console.error("❌ 기술적 분석 전체 실패:", error);
        return new Map();
      }
    },
    [calculateRealTechnicalIndicators]
  );

  // ===== 실시간 데이터 처리 함수 =====
  const enrichWatchlistWithRealData = useCallback(
    async (dbWatchlist) => {
      if (loadingRef.current) {
        console.log("⚠️ 이미 데이터 로딩 중, 중복 호출 방지");
        return;
      }

      loadingRef.current = true;
      console.log(
        "🔄 enrichWatchlistWithRealData 시작:",
        dbWatchlist.length,
        "개 코인"
      );

      setMarketDataLoading(true);

      try {
        if (!checkNetworkStatus()) {
          throw new Error("네트워크 연결 없음");
        }

        // 1. 캐시 서비스 확인
        console.log("📦 캐시 서비스 확인 중...");
        const coinIds = dbWatchlist.map((item) => item.coin_id).filter(Boolean);

        let cachedPrices = new Map();
        try {
          cachedPrices = cachedPriceService.getCachedPrices(coinIds);
          console.log(
            "📦 캐시된 데이터:",
            cachedPrices.size,
            "/",
            coinIds.length
          );
        } catch (cacheError) {
          console.warn("📦 캐시 서비스 오류:", cacheError);
        }

        // 2. 외부 API 병렬 호출 (Promise.allSettled로 안정성 확보)
        console.log("🌐 외부 API 호출 시작...");

        const apiPromises = [
          fetchCoinGeckoData(dbWatchlist),
          fetchUpbitPriceData(dbWatchlist),
          fetchTechnicalAnalysisData(dbWatchlist),
        ];

        const [coinGeckoResult, upbitPriceResult, technicalResult] =
          await Promise.allSettled(apiPromises);

        // 결과 로깅
        console.log(
          "🦎 CoinGecko 결과:",
          coinGeckoResult.status,
          coinGeckoResult.status === "fulfilled"
            ? coinGeckoResult.value?.length
            : coinGeckoResult.reason
        );
        console.log(
          "📈 Upbit 결과:",
          upbitPriceResult.status,
          upbitPriceResult.status === "fulfilled"
            ? upbitPriceResult.value?.size
            : upbitPriceResult.reason
        );
        console.log(
          "🔧 Technical 결과:",
          technicalResult.status,
          technicalResult.status === "fulfilled"
            ? technicalResult.value?.size
            : technicalResult.reason
        );

        // 데이터 추출
        const coinGeckoData =
          coinGeckoResult.status === "fulfilled" ? coinGeckoResult.value : [];
        const upbitPriceData =
          upbitPriceResult.status === "fulfilled"
            ? upbitPriceResult.value
            : new Map();
        const technicalData =
          technicalResult.status === "fulfilled"
            ? technicalResult.value
            : new Map();

        // 3. 데이터 통합
        console.log("🔄 데이터 통합 시작...");

        const enrichedWatchlist = dbWatchlist.map((dbItem, index) => {
          console.log(
            `처리 중: ${index + 1}/${dbWatchlist.length} - ${dbItem.symbol}`
          );

          try {
            const cachedPrice = cachedPrices.get(dbItem.coin_id);
            const geckoData = Array.isArray(coinGeckoData)
              ? coinGeckoData.find((item) => item.id === dbItem.coin_id)
              : null;
            const upbitPrice =
              upbitPriceData instanceof Map
                ? upbitPriceData.get(dbItem.symbol?.toUpperCase())
                : null;
            const technical =
              technicalData instanceof Map
                ? technicalData.get(dbItem.coin_id)
                : null;
            const upbitMarket = upbitMarkets.get(dbItem.symbol?.toUpperCase());

            // 가격 데이터 우선순위: 캐시 > 업비트 > 코인게코
            const currentPrice =
              cachedPrice?.current_price ||
              upbitPrice?.trade_price ||
              geckoData?.current_price ||
              null;

            const priceChange24h =
              cachedPrice?.price_change_24h ||
              (upbitPrice?.signed_change_rate
                ? upbitPrice.signed_change_rate * 100
                : null) ||
              geckoData?.price_change_percentage_24h ||
              0;

            return {
              // 기본 정보
              id: dbItem.id,
              user_id: dbItem.user_id,
              symbol: (dbItem.symbol || "").toUpperCase(),
              coin_id: dbItem.coin_id,
              name: dbItem.coin_name || dbItem.name || "Unknown",
              added_at: dbItem.added_at,
              sort_order: dbItem.sort_order || 0,
              notes: dbItem.notes || "",
              target_price: dbItem.target_price || null,
              alert_enabled: dbItem.alert_enabled || false,
              is_active: dbItem.is_active !== false,

              // 시장 데이터
              current_price: currentPrice,
              price_change_24h: priceChange24h,
              market_cap:
                cachedPrice?.market_cap || geckoData?.market_cap || null,
              volume_24h:
                cachedPrice?.volume_24h ||
                upbitPrice?.acc_trade_price_24h ||
                geckoData?.total_volume ||
                0,
              high_24h: upbitPrice?.high_price || geckoData?.high_24h || null,
              low_24h: upbitPrice?.low_price || geckoData?.low_24h || null,

              // 메타데이터
              image:
                geckoData?.image ||
                `/crypto-icons/${(dbItem.symbol || "").toLowerCase()}.png`,
              korean_name: upbitMarket?.korean_name || null,
              upbit_supported: upbitMarkets.has(
                (dbItem.symbol || "").toUpperCase()
              ),
              upbit_market_code: upbitMarket?.market_code || null,
              market_cap_rank: geckoData?.market_cap_rank || null,

              // 기술적 분석
              rsi: cachedPrice?.rsi || technical?.rsi || null,
              sentiment_score:
                cachedPrice?.sentiment || technical?.sentiment || null,
              moving_average_20: technical?.ma20 || null,
              moving_average_50: technical?.ma50 || null,

              // 상태 정보
              isStale: cachedPrice?.isStale || false,
              dataSource: cachedPrice
                ? "cache_priority"
                : upbitPrice
                  ? "upbit"
                  : geckoData
                    ? "coingecko"
                    : "fallback",
              last_updated: new Date().toISOString(),
            };
          } catch (itemError) {
            console.error(`❌ 코인 ${dbItem.symbol} 처리 실패:`, itemError);

            // 최소한의 데이터라도 반환
            return {
              id: dbItem.id,
              user_id: dbItem.user_id,
              symbol: (dbItem.symbol || "").toUpperCase(),
              coin_id: dbItem.coin_id,
              name: dbItem.coin_name || "Unknown",
              current_price: null,
              price_change_24h: 0,
              image: `/crypto-icons/${(dbItem.symbol || "").toLowerCase()}.png`,
              dataSource: "error_fallback",
              last_updated: new Date().toISOString(),
              isStale: true,
            };
          }
        });

        console.log(
          "✅ 데이터 통합 완료:",
          enrichedWatchlist.length,
          "개 코인"
        );

        // 가격 데이터가 있는 코인 수 확인
        const coinsWithPrice = enrichedWatchlist.filter(
          (coin) => coin.current_price && coin.current_price > 0
        );
        console.log(
          "💰 가격 데이터 보유:",
          coinsWithPrice.length,
          "/",
          enrichedWatchlist.length
        );

        setWatchlist(enrichedWatchlist);

        // 캐시 상태 업데이트
        const staleCount = enrichedWatchlist.filter(
          (coin) => coin.isStale
        ).length;
        setCacheStatus({
          isUsingCache: true,
          lastCacheUpdate: new Date().toISOString(),
          staleCoinCount: staleCount,
        });

        setLastUpdated(new Date().toISOString());
      } catch (error) {
        console.error("❌ enrichWatchlistWithRealData 전체 실패:", error);
        setError(error.message);

        // 최소한의 fallback 데이터라도 제공
        const fallbackWatchlist = dbWatchlist.map((item) => ({
          ...item,
          symbol: (item.symbol || "").toUpperCase(),
          name: item.coin_name || item.name || "Unknown",
          current_price: null,
          price_change_24h: 0,
          image: `/crypto-icons/${(item.symbol || "").toLowerCase()}.png`,
          dataSource: "error_fallback",
          last_updated: new Date().toISOString(),
          isStale: true,
        }));

        setWatchlist(fallbackWatchlist);
      } finally {
        console.log("🏁 enrichWatchlistWithRealData 종료");
        setMarketDataLoading(false);
        loadingRef.current = false;
      }
    },
    [
      upbitMarkets,
      fetchCoinGeckoData,
      fetchUpbitPriceData,
      fetchTechnicalAnalysisData,
    ]
  );

  // ===== Fallback 로딩 함수 =====
  const loadWatchlistFallback = useCallback(async () => {
    try {
      console.log("🔄 Fallback 모드: 기본 데이터베이스 조회");
      setError(null);

      const { data, error: watchlistError } = await supabase
        .from("user_watchlists")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (watchlistError) {
        throw watchlistError;
      }

      console.log(`📊 기본 워치리스트 로드 완료: ${data?.length || 0}개 코인`);

      if (data && data.length > 0) {
        await enrichWatchlistWithRealData(data);
      } else {
        setWatchlist([]);
        console.log("📊 워치리스트 비어있음");
      }
    } catch (err) {
      console.error("❌ Fallback 워치리스트 로드 실패:", err);
      setError(err.message);
      setWatchlist([]);
    }
  }, [user, supabase, enrichWatchlistWithRealData]);

  // ===== 메인 캐시 로딩 함수 =====
  const loadWatchlistWithCache = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    if (loadingRef.current) {
      console.log("⚠️ 이미 로딩 중, 중복 호출 방지");
      return;
    }

    console.log("🔄 loadWatchlistWithCache 시작");
    setLoading(true);
    setError(null);

    try {
      // Step 1: 기본 워치리스트 데이터 가져오기
      console.log("📊 워치리스트 데이터베이스 조회...");

      const { data: watchlistData, error: watchlistError } = await supabase
        .from("user_watchlists")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (watchlistError) {
        console.log(
          "❌ 워치리스트 DB 조회 실패, Fallback 모드로 전환:",
          watchlistError
        );
        await loadWatchlistFallback();
        return;
      }

      console.log(
        "✅ 워치리스트 DB 조회 성공:",
        watchlistData?.length || 0,
        "개 코인"
      );

      if (!watchlistData || watchlistData.length === 0) {
        setWatchlist([]);
        console.log("📊 워치리스트 비어있음");
        return;
      }

      // Step 2: 관련 메타데이터 별도 조회 (조인 문제 우회)
      const coinIds = watchlistData.map((item) => item.coin_id).filter(Boolean);

      if (coinIds.length === 0) {
        console.warn("⚠️ 유효한 코인 ID 없음");
        setWatchlist([]);
        return;
      }

      console.log("🔍 메타데이터 조회 시작...");

      const [metadataResults, marketDataResults, technicalDataResults] =
        await Promise.allSettled([
          // 메타데이터 가져오기
          supabase
            .from("coins_metadata")
            .select("id, symbol, name, image_url, market_cap_rank")
            .in("id", coinIds),

          // 시장 데이터 가져오기
          supabase.from("coins_market_data").select("*").in("coin_id", coinIds),

          // 기술적 분석 데이터 가져오기
          supabase
            .from("coins_technical_data")
            .select("*")
            .in("coin_id", coinIds),
        ]);

      // Step 3: 데이터 맵 생성
      const metadataMap = new Map();
      const marketDataMap = new Map();
      const technicalDataMap = new Map();

      // 메타데이터 맵 생성
      if (
        metadataResults.status === "fulfilled" &&
        metadataResults.value.data
      ) {
        metadataResults.value.data.forEach((item) => {
          metadataMap.set(item.id, item);
        });
        console.log("📋 메타데이터 로드:", metadataMap.size, "개");
      }

      // 시장 데이터 맵 생성
      if (
        marketDataResults.status === "fulfilled" &&
        marketDataResults.value.data
      ) {
        marketDataResults.value.data.forEach((item) => {
          marketDataMap.set(item.coin_id, item);
        });
        console.log("📈 시장 데이터 로드:", marketDataMap.size, "개");
      }

      // 기술적 분석 데이터 맵 생성
      if (
        technicalDataResults.status === "fulfilled" &&
        technicalDataResults.value.data
      ) {
        technicalDataResults.value.data.forEach((item) => {
          technicalDataMap.set(item.coin_id, item);
        });
        console.log("🔧 기술적 데이터 로드:", technicalDataMap.size, "개");
      }

      // Step 4: 캐시된 가격 서비스에서 추가 데이터 가져오기
      let cachedPrices = new Map();
      try {
        cachedPrices = cachedPriceService.getCachedPrices(coinIds);
        console.log("📦 캐시 데이터 로드:", cachedPrices.size, "개");
      } catch (cacheError) {
        console.warn("📦 캐시 서비스 오류:", cacheError);
      }

      // Step 5: 최종 데이터 통합
      console.log("🔄 최종 데이터 통합...");

      const enrichedWatchlist = watchlistData.map((item) => {
        const metadata = metadataMap.get(item.coin_id);
        const marketData = marketDataMap.get(item.coin_id);
        const technicalData = technicalDataMap.get(item.coin_id);
        const cachedPrice = cachedPrices.get(item.coin_id);
        const upbitMarket = upbitMarkets.get((item.symbol || "").toUpperCase());

        return {
          // 기본 워치리스트 정보
          id: item.id,
          user_id: item.user_id,
          symbol: (item.symbol || "").toUpperCase(),
          coin_id: item.coin_id,
          name: item.coin_name || metadata?.name || "Unknown",
          added_at: item.added_at,
          sort_order: item.sort_order || 0,
          notes: item.notes || "",
          target_price: item.target_price || null,
          alert_enabled: item.alert_enabled || false,
          is_active: item.is_active !== false,

          // 메타데이터
          image:
            metadata?.image_url ||
            `/crypto-icons/${(item.symbol || "").toLowerCase()}.png`,
          market_cap_rank: metadata?.market_cap_rank,

          // 시장 데이터 (우선순위: 캐시 > DB)
          current_price:
            cachedPrice?.current_price || marketData?.current_price_krw,
          price_change_24h:
            cachedPrice?.price_change_24h ||
            marketData?.price_change_24h_percent,
          price_change_7d: marketData?.price_change_7d_percent,
          market_cap: cachedPrice?.market_cap || marketData?.market_cap_krw,
          volume_24h: cachedPrice?.volume_24h || marketData?.volume_24h_krw,
          high_24h: marketData?.high_24h,
          low_24h: marketData?.low_24h,

          // 기술적 분석 데이터
          rsi: cachedPrice?.rsi || technicalData?.rsi_14,
          moving_average_20: technicalData?.ma_20,
          moving_average_50: technicalData?.ma_50,
          bollinger_upper: technicalData?.bollinger_upper,
          bollinger_lower: technicalData?.bollinger_lower,
          volume_average: technicalData?.volume_sma_20,
          sentiment_score:
            cachedPrice?.sentiment || technicalData?.sentiment_score,
          fear_greed_index: technicalData?.fear_greed_index,

          // 상태 정보
          market_data_updated:
            cachedPrice?.last_updated || marketData?.last_updated,
          technical_data_updated: technicalData?.last_calculated,
          isStale: cachedPrice?.isStale || false,
          dataSource: cachedPrice ? "cache_service" : "database",

          // 업비트 정보
          upbit_supported: upbitMarkets.has((item.symbol || "").toUpperCase()),
          upbit_market_code: upbitMarket?.market_code || null,
          korean_name: upbitMarket?.korean_name || null,

          last_updated: new Date().toISOString(),
        };
      });

      console.log(
        "✅ 분리된 쿼리로 워치리스트 로드 완료:",
        enrichedWatchlist.length,
        "개 코인"
      );

      // 데이터베이스에서 가격이 없는 경우 실시간 API 호출
      const coinsWithoutPrice = enrichedWatchlist.filter(
        (coin) => !coin.current_price || coin.current_price <= 0
      );

      if (coinsWithoutPrice.length > 0) {
        console.log(
          "💰 가격 없는 코인들 실시간 업데이트:",
          coinsWithoutPrice.length,
          "개"
        );
        setWatchlist(enrichedWatchlist); // 일단 기본 데이터 설정

        // 백그라운드에서 실시간 데이터로 보강
        setTimeout(async () => {
          await enrichWatchlistWithRealData(watchlistData);
        }, 500);
      } else {
        setWatchlist(enrichedWatchlist);
      }

      setLastUpdated(new Date().toISOString());

      // 캐시 상태 업데이트
      const staleCount = enrichedWatchlist.filter(
        (coin) => coin.isStale
      ).length;
      setCacheStatus({
        isUsingCache: true,
        lastCacheUpdate: new Date().toISOString(),
        staleCoinCount: staleCount,
      });
    } catch (err) {
      console.error("❌ loadWatchlistWithCache 실패:", err);
      setError(err.message);
      await loadWatchlistFallback();
    } finally {
      console.log("🏁 loadWatchlistWithCache 종료");
      setLoading(false);
    }
  }, [
    user,
    supabase,
    upbitMarkets,
    loadWatchlistFallback,
    enrichWatchlistWithRealData,
  ]);

  // ===== CRUD 함수들 =====
  const addCoin = useCallback(
    async (coinData) => {
      if (!user || !supabase) return false;

      try {
        console.log("🪙 코인 추가 시작:", coinData);
        setError(null);

        // 기본 데이터 검증
        if (!coinData.id || !coinData.symbol) {
          throw new Error("코인 ID와 심볼이 필요합니다");
        }

        // 중복 확인
        const { data: existingWatchlist, error: checkError } = await supabase
          .from("user_watchlists")
          .select("id")
          .eq("user_id", user.id)
          .eq("coin_id", coinData.id)
          .eq("is_active", true)
          .single();

        if (existingWatchlist) {
          throw new Error("이미 워치리스트에 추가된 코인입니다");
        }

        if (checkError && checkError.code !== "PGRST116") {
          throw checkError;
        }

        // coins_metadata에 코인 데이터 확인/추가
        let { data: existingCoin, error: metadataCheckError } = await supabase
          .from("coins_metadata")
          .select("id, symbol, name")
          .eq("id", coinData.id)
          .single();

        if (metadataCheckError && metadataCheckError.code === "PGRST116") {
          console.log("📥 coins_metadata에 코인 추가:", coinData.id);

          const { data: insertedCoin, error: insertError } = await supabase
            .from("coins_metadata")
            .insert({
              id: coinData.id,
              symbol: coinData.symbol.toUpperCase(),
              name: coinData.name || coinData.symbol,
              image_url:
                coinData.image_url ||
                `https://assets.coingecko.com/coins/images/1/thumb/${coinData.symbol.toLowerCase()}.png`,
              market_cap_rank: coinData.market_cap_rank || 999,
              coingecko_id: coinData.id,
              is_active: true,
            })
            .select()
            .single();

          if (insertError) {
            console.error("❌ coins_metadata 삽입 실패:", insertError);
            throw new Error(
              `코인 메타데이터 생성 실패: ${insertError.message}`
            );
          }

          existingCoin = insertedCoin;
        } else if (metadataCheckError) {
          throw metadataCheckError;
        }

        // 워치리스트에 추가
        const { data: watchlistItem, error: watchlistError } = await supabase
          .from("user_watchlists")
          .insert({
            user_id: user.id,
            symbol: coinData.symbol.toUpperCase(),
            coin_id: coinData.id,
            coin_name: coinData.korean_name || coinData.name || coinData.symbol,
            sort_order: watchlist.length,
          })
          .select()
          .single();

        if (watchlistError) {
          if (watchlistError.code === "23505") {
            throw new Error("이미 워치리스트에 추가된 코인입니다");
          }
          throw new Error(`워치리스트 추가 실패: ${watchlistError.message}`);
        }

        console.log("✅ 코인 추가 성공:", watchlistItem);

        // 워치리스트 새로고침
        await loadWatchlistWithCache();
        return true;
      } catch (error) {
        console.error("❌ 코인 추가 실패:", error);

        if (error.message.includes("이미")) {
          throw new Error("이 코인은 이미 워치리스트에 있습니다");
        } else if (error.message.includes("foreign key")) {
          throw new Error("코인 데이터 오류가 발생했습니다. 다시 시도해주세요");
        } else {
          throw new Error(error.message || "코인 추가 중 오류가 발생했습니다");
        }
      }
    },
    [user, supabase, watchlist.length, loadWatchlistWithCache]
  );

  const removeCoin = useCallback(
    async (coinId) => {
      try {
        setError(null);
        console.log("🗑️ 코인 제거 시작:", coinId);

        const { error } = await supabase
          .from("user_watchlists")
          .update({ is_active: false })
          .eq("id", coinId)
          .eq("user_id", user.id);

        if (error) throw error;

        setWatchlist((prev) => prev.filter((coin) => coin.id !== coinId));
        console.log("✅ 코인 제거 완료");
        return true;
      } catch (err) {
        console.error("❌ 코인 제거 실패:", err);
        setError(err.message);
        return false;
      }
    },
    [user, supabase]
  );

  const reorderWatchlist = useCallback(
    async (newOrder) => {
      try {
        setError(null);
        console.log("🔄 워치리스트 순서 변경 시작");

        const updates = newOrder.map((coin, index) => ({
          id: coin.id,
          sort_order: index,
          user_id: user.id,
        }));

        const { error } = await supabase
          .from("user_watchlists")
          .upsert(updates, {
            onConflict: "id",
            ignoreDuplicates: false,
          });

        if (error) throw error;

        setWatchlist(newOrder);
        console.log("✅ 워치리스트 순서 변경 완료");
        return true;
      } catch (err) {
        console.error("❌ 순서 변경 실패:", err);
        setError(err.message);
        return false;
      }
    },
    [user, supabase]
  );

  const updateCoinNotes = useCallback(
    async (coinId, notes) => {
      try {
        setError(null);
        console.log("📝 코인 메모 업데이트:", coinId, notes);

        const { error } = await supabase
          .from("user_watchlists")
          .update({ notes })
          .eq("id", coinId)
          .eq("user_id", user.id);

        if (error) throw error;

        setWatchlist((prev) =>
          prev.map((coin) => (coin.id === coinId ? { ...coin, notes } : coin))
        );

        console.log("✅ 코인 메모 업데이트 완료");
        return true;
      } catch (err) {
        console.error("❌ 메모 업데이트 실패:", err);
        setError(err.message);
        return false;
      }
    },
    [user, supabase]
  );

  const setTargetPrice = useCallback(
    async (coinId, targetPrice) => {
      try {
        setError(null);
        console.log("🎯 목표가 설정:", coinId, targetPrice);

        const { error } = await supabase
          .from("user_watchlists")
          .update({
            target_price: targetPrice,
            alert_enabled: targetPrice > 0,
          })
          .eq("id", coinId)
          .eq("user_id", user.id);

        if (error) throw error;

        setWatchlist((prev) =>
          prev.map((coin) =>
            coin.id === coinId
              ? {
                  ...coin,
                  target_price: targetPrice,
                  alert_enabled: targetPrice > 0,
                }
              : coin
          )
        );

        console.log(`✅ 목표가 설정 완료: ₩${targetPrice?.toLocaleString()}`);
        return true;
      } catch (err) {
        console.error("❌ 목표가 설정 실패:", err);
        setError(err.message);
        return false;
      }
    },
    [user, supabase]
  );

  // ===== 데이터 업데이트 함수들 =====
  const requestMarketDataUpdate = useCallback(async () => {
    if (watchlist.length === 0 || loadingRef.current) {
      console.log(
        "⚠️ 업데이트 조건 미충족 - 워치리스트:",
        watchlist.length,
        "로딩중:",
        loadingRef.current
      );
      return;
    }

    try {
      console.log("📡 시장 데이터 업데이트 요청...");

      const coinIds = watchlist.map((coin) => coin.coin_id).filter(Boolean);

      if (coinIds.length === 0) {
        console.log("⚠️ 업데이트할 코인 ID 없음");
        return;
      }

      // 서버리스 함수 시도
      try {
        const response = await fetch("/api/update-watchlist-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coinIds,
            userId: user.id,
          }),
        });

        if (response.ok) {
          console.log("✅ 서버리스 함수 업데이트 요청 완료");
          setTimeout(() => loadWatchlistWithCache(), 3000);
          return;
        } else {
          console.log("⚠️ 서버리스 함수 응답 오류:", response.status);
        }
      } catch (apiError) {
        console.log(
          "⚠️ 서버리스 함수 없음, 직접 업데이트로 전환:",
          apiError.message
        );
      }

      // 직접 업데이트
      setTimeout(() => refreshMarketData(), 1000);
    } catch (error) {
      console.error("❌ 시장 데이터 업데이트 요청 실패:", error);
      setTimeout(() => refreshMarketData(), 2000);
    }
  }, [watchlist, user, loadWatchlistWithCache]);

  const refreshMarketData = useCallback(async () => {
    if (watchlist.length === 0 || loadingRef.current) {
      console.log("⚠️ 새로고침 조건 미충족");
      return;
    }

    console.log("🔄 시장 데이터 새로고침 시작");

    try {
      const dbData = watchlist.map((item) => ({
        id: item.id,
        user_id: item.user_id,
        symbol: item.symbol,
        coin_id: item.coin_id,
        coin_name: item.name,
        added_at: item.added_at,
        sort_order: item.sort_order,
        notes: item.notes,
        target_price: item.target_price,
        alert_enabled: item.alert_enabled,
        is_active: item.is_active,
      }));

      await enrichWatchlistWithRealData(dbData);
    } catch (error) {
      console.error("❌ 시장 데이터 새로고침 실패:", error);
    }
  }, [watchlist, enrichWatchlistWithRealData]);

  // ===== 통계 함수 =====
  const getWatchlistStats = useCallback(() => {
    if (!watchlist.length) return null;

    const basicStats = {
      totalCoins: watchlist.length,
      activeAlerts: watchlist.filter((coin) => coin.alert_enabled).length,
      upbitSupported: watchlist.filter((coin) => coin.upbit_supported).length,
      coinsWithPrice: watchlist.filter(
        (coin) => coin.current_price && coin.current_price > 0
      ).length,
      gainers: watchlist.filter((coin) => coin.price_change_24h > 0).length,
      losers: watchlist.filter((coin) => coin.price_change_24h < 0).length,
      totalValue: watchlist.reduce(
        (sum, coin) => sum + (coin.current_price || 0),
        0
      ),
      averageChange:
        watchlist.length > 0
          ? watchlist.reduce(
              (sum, coin) => sum + (coin.price_change_24h || 0),
              0
            ) / watchlist.length
          : 0,
      lastUpdated: lastUpdated,
    };

    return {
      ...basicStats,
      cache: {
        isUsingCache: cacheStatus.isUsingCache,
        staleCoinCount: cacheStatus.staleCoinCount,
        freshDataCount: watchlist.filter((coin) => !coin.isStale).length,
        lastCacheUpdate: cacheStatus.lastCacheUpdate,
        cacheHitRate:
          watchlist.length > 0
            ? (
                ((watchlist.length - cacheStatus.staleCoinCount) /
                  watchlist.length) *
                100
              ).toFixed(1)
            : "0.0",
      },
    };
  }, [watchlist, lastUpdated, cacheStatus]);

  // ===== Effects =====
  // 초기 로드
  useEffect(() => {
    if (user && !loadingRef.current) {
      const init = async () => {
        try {
          console.log("🚀 useWatchlist 초기화 시작");
          await loadUpbitMarkets();
          await loadWatchlistWithCache();
        } catch (error) {
          console.error("❌ 초기화 실패:", error);
          setError(error.message);
        }
      };
      init();
    }
  }, [user]); // 의존성 최소화

  // 정기적 업데이트 (5분마다)
  useEffect(() => {
    if (watchlist.length === 0) return;

    console.log("⏰ 정기 업데이트 타이머 설정");

    const interval = setInterval(
      () => {
        console.log("🔄 정기 시장 데이터 업데이트 실행");
        requestMarketDataUpdate();
      },
      5 * 60 * 1000
    ); // 5분

    return () => {
      console.log("⏰ 정기 업데이트 타이머 정리");
      clearInterval(interval);
    };
  }, [watchlist.length]); // requestMarketDataUpdate 의존성 제거로 무한 루프 방지

  // 실시간 데이터베이스 구독
  useEffect(() => {
    if (!user || !supabase) return;

    console.log("📡 실시간 구독 설정");

    const subscription = supabase
      .channel("user_watchlists_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_watchlists",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log(
            "📊 워치리스트 실시간 업데이트:",
            payload.eventType,
            payload
          );

          if (payload.eventType === "INSERT") {
            // 새 코인 추가시 전체 리로드
            setTimeout(() => loadWatchlistWithCache(), 1000);
          } else if (payload.eventType === "UPDATE") {
            // 업데이트시 해당 코인만 수정
            setWatchlist((prev) =>
              prev.map((coin) =>
                coin.id === payload.new.id ? { ...coin, ...payload.new } : coin
              )
            );
          } else if (payload.eventType === "DELETE") {
            // 삭제시 해당 코인 제거
            setWatchlist((prev) =>
              prev.filter((coin) => coin.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      console.log("📡 실시간 구독 정리");
      subscription.unsubscribe();
    };
  }, [user, supabase]); // loadWatchlistWithCache 의존성 제거

  // 컴포넌트 언마운트시 정리
  useEffect(() => {
    return () => {
      console.log("🧹 useWatchlist 정리");
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      loadingRef.current = false;
    };
  }, []);

  // ===== Return =====
  return {
    // State
    watchlist,
    loading,
    error,
    marketDataLoading,
    lastUpdated,
    cacheStatus,

    // CRUD 함수들
    addCoin,
    removeCoin,
    reorderWatchlist,
    updateCoinNotes,
    setTargetPrice,

    // 유틸리티 함수들
    loadWatchlist: loadWatchlistWithCache,
    refreshMarketData: requestMarketDataUpdate,
    getWatchlistStats,
  };
}
