// src/hooks/useTopCoinsUpdater.js

import { useEffect, useCallback } from "react";
import { useCoinStore } from "../stores/coinStore.js";
import { upbitMarketService } from "../services/upbit/upbitMarketService.js";

export const useTopCoinsUpdater = (isActive, tradingMode, testMode, addLog) => {
  const { setSelectedCoins } = useCoinStore();

  const updateTopCoins = useCallback(async () => {
    if (!isActive || tradingMode !== "top") return;

    try {
      const topCoins = await upbitMarketService.getTopCoins(
        testMode ? 15 : 10,
        testMode
      );

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

      setSelectedCoins(formattedCoins);
      addLog?.(`🔄 상위 코인 UI 업데이트: ${formattedCoins.length}개`, "info");
    } catch (error) {
      addLog?.(`❌ 상위 코인 UI 업데이트 실패: ${error.message}`, "error");
    }
  }, [isActive, tradingMode, testMode, setSelectedCoins, addLog]);

  // 5분마다 상위 코인 업데이트
  useEffect(() => {
    if (!isActive || tradingMode !== "top") return;

    updateTopCoins(); // 즉시 실행

    const interval = setInterval(updateTopCoins, 300000); // 5분마다
    return () => clearInterval(interval);
  }, [isActive, tradingMode, updateTopCoins]);

  return { updateTopCoins };
};
