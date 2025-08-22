// src/hooks/useTopCoinsUpdater.js - 하드코딩 문제 해결 버전

import { useEffect, useCallback } from "react";
import { useCoinStore } from "../stores/coinStore.js";
import { upbitMarketService } from "../services/upbit/upbitMarketService.js";

export const useTopCoinsUpdater = (
  isActive,
  tradingMode,
  testMode,
  addLog,
  topCoinsLimit = 10
) => {
  const { setSelectedCoins } = useCoinStore();

  const updateTopCoins = useCallback(async () => {
    if (!isActive || tradingMode !== "top") return;

    try {
      // ✅ 하드코딩 제거 - topCoinsLimit 파라미터 사용
      const maxCoins = topCoinsLimit;

      const topCoins = await upbitMarketService.getTopCoins(maxCoins, testMode);

      const formattedCoins = topCoins.map((coin) => ({
        symbol: coin.symbol,
        market: `KRW-${coin.symbol}`,
        name: coin.korean_name || coin.symbol,
        score: coin.score || 0,
        tier: coin.tier || "TIER3",
        price: coin.price || 0,
        changePercent: coin.change_percent || 0,
        isTopCoin: true,
        lastUpdated: new Date(),
      }));

      // ✅ 보호 모드로 호출하여 관심코인 보존
      setSelectedCoins(formattedCoins, false); // 덮어쓰기 모드

      addLog?.(
        `🔄 상위 코인 UI 업데이트: ${formattedCoins.length}개 (설정: ${maxCoins}개)`,
        "info"
      );
    } catch (error) {
      addLog?.(`❌ 상위 코인 UI 업데이트 실패: ${error.message}`, "error");
    }
  }, [
    isActive,
    tradingMode,
    testMode,
    topCoinsLimit,
    setSelectedCoins,
    addLog,
  ]);

  // 5분마다 상위 코인 업데이트 (상위코인 모드일 때만)
  useEffect(() => {
    if (!isActive || tradingMode !== "top") return;

    updateTopCoins(); // 즉시 실행

    const interval = setInterval(() => {
      // ✅ 한번 더 체크
      if (tradingMode === "top") {
        updateTopCoins();
      }
    }, 300000); // 5분마다

    return () => clearInterval(interval);
  }, [isActive, tradingMode, updateTopCoins]);

  return { updateTopCoins };
};
