// src/config/portfolioCapitalSync.js
// 자본금 변경 시 포트폴리오 스토어 동기화
import { useEffect } from "react";
import { usePortfolioStore } from "../stores/portfolioStore";

export function usePortfolioCapitalSync() {
  useEffect(() => {
    const handler = () => {
      // 자본금 변경 시 포트폴리오를 초기화/재계산
      const { calculateAndUpdatePortfolio } = usePortfolioStore.getState();
      calculateAndUpdatePortfolio(null, null); // 초기화
    };
    window.addEventListener("portfolio-capital-updated", handler);
    return () => {
      window.removeEventListener("portfolio-capital-updated", handler);
    };
  }, []);
}
