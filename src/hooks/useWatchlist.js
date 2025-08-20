// src/hooks/useWatchlist.js
import { useState, useEffect, useCallback } from "react";
import { hybridAnalyzer } from "../services/analysis/hybridAnalyzer.js";
import { useUserStore } from "../stores/userStore.js";

export const useWatchlist = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [topCoins, setTopCoins] = useState([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useUserStore();

  // 관심코인 업데이트
  const updateWatchlist = useCallback(
    async (newWatchlist) => {
      setIsUpdating(true);

      try {
        setWatchlist(newWatchlist);

        // 뉴스 캐시 업데이트
        const updateResult = await hybridAnalyzer.updateWatchedCoins(
          newWatchlist,
          topCoins
        );

        console.log("관심코인 업데이트 완료:", updateResult);

        // 사용자 설정에 저장
        await saveUserWatchlist(user?.id, newWatchlist);
      } catch (error) {
        console.error("관심코인 업데이트 실패:", error);
      } finally {
        setIsUpdating(false);
      }
    },
    [topCoins, user]
  );

  // 상위코인 업데이트
  const updateTopCoins = useCallback(
    async (newTopCoins) => {
      setIsUpdating(true);

      try {
        setTopCoins(newTopCoins);

        // 뉴스 캐시 업데이트
        const updateResult = await hybridAnalyzer.updateWatchedCoins(
          watchlist,
          newTopCoins
        );

        console.log("상위코인 업데이트 완료:", updateResult);
      } catch (error) {
        console.error("상위코인 업데이트 실패:", error);
      } finally {
        setIsUpdating(false);
      }
    },
    [watchlist]
  );

  // 초기 로딩
  useEffect(() => {
    const initializeCoins = async () => {
      if (user?.id) {
        const userWatchlist = await getUserWatchlist(user.id);
        const marketTopCoins = await getTopCoins(20); // 상위 20개

        setWatchlist(userWatchlist);
        setTopCoins(marketTopCoins);

        // 뉴스 캐시 초기화
        await hybridAnalyzer.updateWatchedCoins(userWatchlist, marketTopCoins);
      }
    };

    initializeCoins();
  }, [user]);

  return {
    watchlist,
    topCoins,
    isUpdating,
    updateWatchlist,
    updateTopCoins,
    addToWatchlist: (coin) => updateWatchlist([...watchlist, coin]),
    removeFromWatchlist: (coin) =>
      updateWatchlist(watchlist.filter((c) => c !== coin)),
  };
};

// 유틸리티 함수들
const saveUserWatchlist = async (userId, watchlist) => {
  // Supabase 저장 로직
};

const getUserWatchlist = async (userId) => {
  // Supabase 조회 로직
  return [];
};

const getTopCoins = async (limit = 20) => {
  // CoinGecko API 호출
  return [];
};
