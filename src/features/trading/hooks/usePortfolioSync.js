// src/features/trading/hooks/usePortfolioSync.js
import { useCallback } from "react";
import { usePortfolioStore } from "../../../stores/portfolioStore.js";

export const usePortfolioSync = (syncPortfolio, addLog) => {
  const { updatePortfolio: updatePortfolioStore } = usePortfolioStore();

  const updatePortfolio = useCallback(
    async (forceUpdate = false) => {
      try {
        // Backend/Engine에서 최신 데이터 가져오기
        const rawPortfolio = await syncPortfolio(forceUpdate);

        if (rawPortfolio) {
          // Store에 데이터 업데이트 (모든 컴포넌트가 자동으로 리렌더링)
          updatePortfolioStore(rawPortfolio, rawPortfolio.totalValue);

          addLog("📊 포트폴리오 Store 동기화 완료", "success");
          return rawPortfolio;
        }
      } catch (error) {
        addLog(`❌ 포트폴리오 동기화 실패: ${error.message}`, "error");
        throw error;
      }
    },
    [syncPortfolio, updatePortfolioStore, addLog]
  );

  return {
    updatePortfolio,
  };
};
