// src/hooks/useHybridWatchlist.js - 캐시된 메타데이터 + 실시간 가격
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { CachedMetadataService } from "../services/data/cachedMetadataService";
import { cachedPriceService } from "../services/data/cachedPriceService";

export function useHybridWatchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const { user, supabase } = useAuth();
  const metadataService = useRef(null);
  const priceUpdateInterval = useRef(null);

  // 서비스 초기화
  useEffect(() => {
    if (supabase) {
      metadataService.current = new CachedMetadataService(supabase);
    }
  }, [supabase]);

  // ✅ 워치리스트 로드 (메타데이터는 캐시, 가격은 실시간)
  const loadWatchlist = useCallback(async () => {
    if (!user || !supabase || !metadataService.current) return;

    try {
      setLoading(true);
      setError(null);

      // 1. 데이터베이스에서 워치리스트 기본 정보 조회
      const { data: watchlistData, error: watchlistError } = await supabase
        .from("user_watchlists")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (watchlistError) throw watchlistError;

      if (!watchlistData || watchlistData.length === 0) {
        setWatchlist([]);
        return;
      }

      // 2. 캐시된 메타데이터 조회
      const coinIds = watchlistData.map((item) => item.coin_id);
      const cachedMetadata =
        await metadataService.current.getCachedMetadata(coinIds);

      // 3. 실시간 가격 정보 조회
      const cachedPrices = cachedPriceService.getCachedPrices(coinIds);

      // 4. 데이터 결합
      const enrichedWatchlist = watchlistData.map((watchlistItem) => {
        const metadata = cachedMetadata.get(watchlistItem.coin_id);
        const priceData = cachedPrices.get(watchlistItem.coin_id);

        return {
          // 워치리스트 기본 정보
          id: watchlistItem.id,
          user_id: watchlistItem.user_id,
          coin_id: watchlistItem.coin_id,
          sort_order: watchlistItem.sort_order,
          added_at: watchlistItem.added_at,
          notes: watchlistItem.notes,
          target_price: watchlistItem.target_price,
          alert_enabled: watchlistItem.alert_enabled,

          // 캐시된 메타데이터 (변하지 않는 정보)
          symbol: metadata?.symbol || watchlistItem.symbol,
          name: metadata?.name || watchlistItem.coin_name,
          korean_name: metadata?.korean_name,
          display_name: metadata?.display_name || watchlistItem.coin_name,
          image_url: metadata?.image_sources?.[0],
          image_sources: metadata?.image_sources || [],
          market_cap_rank: metadata?.market_cap_rank,
          upbit_supported: metadata?.upbit_supported || false,
          upbit_market_code: metadata?.upbit_market_code,
          risk_level: metadata?.risk_level || "medium",
          is_top_tier: metadata?.is_top_tier || false,

          // 실시간 가격 정보 (자주 변하는 정보)
          current_price: priceData?.current_price,
          price_change_24h: priceData?.price_change_24h,
          volume_24h: priceData?.volume_24h,
          market_cap: priceData?.market_cap || metadata?.market_cap,

          // 기술적 분석 (캐시된 정보)
          rsi: priceData?.rsi,
          sentiment: priceData?.sentiment,

          // 데이터 상태 정보
          metadata_source: metadata?.data_source || "unknown",
          price_source: priceData?.source || "cache",
          isStale: priceData?.isStale || false,
          last_updated: new Date().toISOString(),
        };
      });

      setWatchlist(enrichedWatchlist);
      setLastUpdated(new Date().toISOString());

      console.log(
        "✅ 하이브리드 워치리스트 로드 완료:",
        enrichedWatchlist.length
      );
    } catch (err) {
      console.error("❌ 하이브리드 워치리스트 로드 실패:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  // ✅ 가격만 업데이트 (메타데이터는 그대로 유지)
  const refreshPrices = useCallback(async () => {
    if (watchlist.length === 0) return;

    try {
      setPricesLoading(true);

      const coinIds = watchlist.map((coin) => coin.coin_id);

      // 백그라운드에서 가격 업데이트 요청
      await cachedPriceService.updatePricesInBackground(coinIds);

      // 잠시 후 최신 가격 정보 조회
      setTimeout(async () => {
        const updatedPrices = cachedPriceService.getCachedPrices(coinIds);

        setWatchlist((prevWatchlist) =>
          prevWatchlist.map((coin) => {
            const newPriceData = updatedPrices.get(coin.coin_id);

            if (newPriceData) {
              return {
                ...coin,
                current_price: newPriceData.current_price,
                price_change_24h: newPriceData.price_change_24h,
                volume_24h: newPriceData.volume_24h,
                market_cap: newPriceData.market_cap,
                rsi: newPriceData.rsi,
                sentiment: newPriceData.sentiment,
                price_source: newPriceData.source,
                isStale: newPriceData.isStale,
                last_updated: new Date().toISOString(),
              };
            }

            return coin;
          })
        );

        setLastUpdated(new Date().toISOString());
        setPricesLoading(false);
      }, 2000);
    } catch (error) {
      console.error("❌ 가격 업데이트 실패:", error);
      setPricesLoading(false);
    }
  }, [watchlist]);

  // ✅ 전체 워치리스트 새로고침
  const refreshWatchlist = useCallback(async () => {
    await loadWatchlist();
  }, [loadWatchlist]);

  // 초기 로드
  useEffect(() => {
    if (user) {
      loadWatchlist();
    }
  }, [user, loadWatchlist]);

  // 자동 가격 업데이트 (5분마다)
  useEffect(() => {
    if (watchlist.length > 0) {
      priceUpdateInterval.current = setInterval(
        () => {
          refreshPrices();
        },
        5 * 60 * 1000
      );

      return () => {
        if (priceUpdateInterval.current) {
          clearInterval(priceUpdateInterval.current);
        }
      };
    }
  }, [watchlist.length, refreshPrices]);

  // 캐시 정리 (10분마다)
  useEffect(() => {
    const cleanupInterval = setInterval(
      () => {
        metadataService.current?.cleanup();
      },
      10 * 60 * 1000
    );

    return () => clearInterval(cleanupInterval);
  }, []);

  return {
    watchlist,
    loading,
    pricesLoading,
    error,
    lastUpdated,
    refreshPrices,
    refreshWatchlist,

    // 통계 정보
    getCacheStatus: () => ({
      metadata: metadataService.current?.getCacheStatus(),
      prices: cachedPriceService?.getCacheStatus?.(),
    }),
  };
}
