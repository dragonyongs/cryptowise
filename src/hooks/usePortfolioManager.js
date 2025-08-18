// src/hooks/usePortfolioManager.js - 포트폴리오 상태 관리 전용 훅
import { useState, useCallback, useRef } from "react";
import { paperTradingEngine } from "../services/testing/paperTradingEngine";

export const usePortfolioManager = (marketData, addLog) => {
  const [portfolio, setPortfolio] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const portfolioCache = useRef(null);

  // 포트폴리오 변경 검증 함수
  const hasPortfolioChanged = useCallback((oldPortfolio, newPortfolio) => {
    if (!oldPortfolio || !newPortfolio) return true;

    return (
      oldPortfolio.positions?.length !== newPortfolio.positions?.length ||
      oldPortfolio.tradeHistory?.length !== newPortfolio.tradeHistory?.length ||
      Math.abs(oldPortfolio.totalValue - newPortfolio.totalValue) > 1000 ||
      Math.abs(oldPortfolio.totalProfitRate - newPortfolio.totalProfitRate) >
        0.001
    );
  }, []);

  const updatePortfolio = useCallback(
    async (forceUpdate = false) => {
      try {
        // 캐시된 데이터가 있고 강제 업데이트가 아닌 경우 5초 쿨다운
        if (
          !forceUpdate &&
          portfolioCache.current &&
          lastUpdateTime &&
          Date.now() - lastUpdateTime < 5000
        ) {
          return portfolioCache.current;
        }

        const portfolioData = await paperTradingEngine.getPortfolioSummary();

        if (!portfolioData) {
          if (forceUpdate) {
            addLog("⚠️ 포트폴리오 데이터가 null입니다", "warning");
          }
          return null;
        }

        // 기본 구조 보장
        const normalizedPortfolio = {
          totalValue: portfolioData.totalValue || 1840000,
          investedValue: portfolioData.investedValue || 0,
          totalProfitRate: portfolioData.totalProfitRate || 0,
          positions: Array.isArray(portfolioData.positions)
            ? portfolioData.positions
            : [],
          tradeHistory: Array.isArray(portfolioData.tradeHistory)
            ? portfolioData.tradeHistory
            : [],
          performance: portfolioData.performance || {
            totalReturn: 0,
            winRate: 0,
            maxDrawdown: 0,
          },
          lastUpdated: new Date(),
        };

        // 포지션에 현재 가치 계산
        if (normalizedPortfolio.positions.length > 0) {
          normalizedPortfolio.positions = normalizedPortfolio.positions.map(
            (position) => {
              const currentPrice =
                marketData.get(position.symbol)?.trade_price ||
                position.avgPrice;
              const currentValue = position.quantity * currentPrice;
              const profitRate =
                position.avgPrice > 0
                  ? (currentPrice - position.avgPrice) / position.avgPrice
                  : 0;

              return {
                ...position,
                currentPrice,
                currentValue,
                profitRate,
              };
            }
          );

          // 투자된 값과 현재 가치 재계산
          normalizedPortfolio.investedValue =
            normalizedPortfolio.positions.reduce(
              (sum, pos) => sum + pos.quantity * pos.avgPrice,
              0
            );

          const currentPortfolioValue = normalizedPortfolio.positions.reduce(
            (sum, pos) => sum + pos.currentValue,
            0
          );

          normalizedPortfolio.totalProfitRate =
            normalizedPortfolio.investedValue > 0
              ? (currentPortfolioValue - normalizedPortfolio.investedValue) /
                normalizedPortfolio.investedValue
              : 0;
        }

        // 실제 변경사항이 있을 때만 업데이트
        if (hasPortfolioChanged(portfolioCache.current, normalizedPortfolio)) {
          portfolioCache.current = normalizedPortfolio;
          setPortfolio(normalizedPortfolio);
          setLastUpdateTime(Date.now());

          if (forceUpdate) {
            addLog(
              `✅ 포트폴리오 업데이트 완료 - 포지션: ${normalizedPortfolio.positions.length}개, 거래내역: ${normalizedPortfolio.tradeHistory.length}개`,
              "success"
            );
          }
        }

        return normalizedPortfolio;
      } catch (error) {
        if (forceUpdate) {
          addLog(`❌ 포트폴리오 업데이트 실패: ${error.message}`, "error");
        }
        console.error("Portfolio update error:", error);
        return null;
      }
    },
    [marketData, addLog, hasPortfolioChanged, lastUpdateTime]
  );

  return {
    portfolio,
    updatePortfolio,
  };
};
