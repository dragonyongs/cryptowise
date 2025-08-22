// src/hooks/useRefreshPriceAndAnalysis.js - useEffect 제거 버전

import { useCoinStore } from "../../../stores/coinStore";
import { useAnalysisStore } from "../../../stores/analysisStore";
import { useRef, useCallback } from "react";

export function useRefreshPriceAndAnalysis() {
  const { selectedCoins, refreshData } = useCoinStore();
  const { fetchIndicators } = useAnalysisStore();

  const isRunningRef = useRef(false);
  const lastExecutionTimeRef = useRef(0);

  // ✅ useEffect 완전 제거, 수동 호출만 지원
  const fetchChartData = useCallback(async (market) => {
    try {
      const response = await fetch(
        `https://api.upbit.com/v1/candles/days?market=${market}&count=100`
      );
      if (!response.ok) throw new Error("차트 데이터 조회 실패");

      const data = await response.json();
      const closes = data.reverse().map((c) => c.trade_price);
      const volumes = data.map((c) => c.candle_acc_trade_volume);

      return { closes, volumes };
    } catch (error) {
      console.error("차트 데이터 fetch 실패:", market, error);
      return { closes: [], volumes: [] };
    }
  }, []);

  const refreshPriceAndAnalysis = useCallback(async () => {
    const now = Date.now();

    // ✅ 5초 내 중복 실행 방지
    if (isRunningRef.current || now - lastExecutionTimeRef.current < 5000) {
      console.log("⏭️ 중복 실행 방지 또는 최근 실행됨");
      return;
    }

    isRunningRef.current = true;
    lastExecutionTimeRef.current = now;

    try {
      console.log("🔄 수동 트리거: 가격 및 분석 데이터 업데이트 시작");

      const currentCoins = useCoinStore.getState().selectedCoins; // 최신 상태 직접 조회
      const markets = currentCoins.map((coin) => coin.market);

      if (markets.length === 0) {
        console.log("⚠️ 관심 코인 없음");
        return;
      }

      // 가격 데이터 업데이트
      await refreshData();

      // 분석 실행 (최대 5개)
      const analysisMarkets = markets.slice(0, 5);
      console.log("📊 분석 대상:", analysisMarkets);

      for (const market of analysisMarkets) {
        try {
          const { closes, volumes } = await fetchChartData(market);
          if (closes.length > 14) {
            await fetchIndicators(market, closes, volumes);
            console.log(`✅ ${market} 분석 완료`);
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        } catch (error) {
          console.error(`❌ ${market} 분석 실패:`, error);
        }
      }

      console.log("✅ 전체 업데이트 완료");
    } catch (error) {
      console.error("❌ 업데이트 실패:", error);
    } finally {
      isRunningRef.current = false;
    }
  }, [refreshData, fetchChartData, fetchIndicators]);

  return { refreshPriceAndAnalysis };
}
