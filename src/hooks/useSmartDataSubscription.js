// src/hooks/useSmartDataSubscription.js - 에러 수정 버전

import { useEffect, useState } from "react";
import { centralDataManager } from "../services/data/centralDataManager.js";
import { usePortfolioStore } from "../stores/portfolioStore.js";
import { useCoinStore } from "../stores/coinStore.js";

export const useSmartDataSubscription = (userId) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState({
    isInitialized: false,
    prices: {},
    markets: {},
    systemHealth: "initializing",
    strategies: null,
  });

  const portfolio = usePortfolioStore((state) => state.portfolioData);
  const selectedCoins = useCoinStore((state) => state.selectedCoins);

  useEffect(() => {
    if (!userId) return;

    const initializeAndSubscribe = async () => {
      try {
        console.log(`🚀 사용자 ${userId} 데이터 구독 초기화`);

        // ✅ 선택된 코인을 심볼 배열로 변환
        const coinSymbols = Array.isArray(selectedCoins)
          ? selectedCoins
              .map((coin) => coin.symbol || coin.market?.replace("KRW-", ""))
              .filter(Boolean)
          : [];

        console.log("📊 코인 심볼들:", coinSymbols);

        // centralDataManager 초기화 (배열로 전달)
        await centralDataManager.initialize(coinSymbols, userId);

        // 구독 등록
        const unsubscribe = centralDataManager.subscribe(
          `user_${userId}`,
          (data) => {
            setSubscriptionStatus({
              isInitialized: true,
              prices: data.prices || {},
              markets: data.markets || {},
              systemHealth: data.systemHealth || "healthy",
              strategies: centralDataManager.getStatus()?.strategies || null,
              timestamp: data.timestamp,
            });
          },
          ["prices", "markets"]
        );

        console.log("✅ 데이터 구독 초기화 완료");
        return unsubscribe;
      } catch (error) {
        console.error("❌ 데이터 구독 초기화 실패:", error);
        setSubscriptionStatus((prev) => ({
          ...prev,
          systemHealth: "error",
          error: error.message,
        }));
      }
    };

    initializeAndSubscribe();
  }, [userId]);

  // ✅ 스토어 변경시 자동 갱신 (메서드명 수정)
  useEffect(() => {
    if (!userId || !subscriptionStatus.isInitialized) return;

    console.log("🔄 스토어 변경 감지 - 데이터 매니저 갱신");

    // ✅ refreshFromStores 메서드로 호출 (존재하는 메서드)
    if (centralDataManager.refreshFromStores) {
      centralDataManager.refreshFromStores();
    }
  }, [portfolio, selectedCoins, userId, subscriptionStatus.isInitialized]);

  return {
    ...subscriptionStatus,
    // 편의 메서드들
    getCoinPrice: (symbol) => subscriptionStatus.prices[symbol]?.data || null,
    getMarketInfo: (symbol) => subscriptionStatus.markets[symbol]?.data || null,
    isHealthy: subscriptionStatus.systemHealth === "healthy",
  };
};
