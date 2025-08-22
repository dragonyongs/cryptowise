// src/features/trading/hooks/usePositionManager.js

import { useState, useEffect, useCallback } from "react";
import { dynamicPositionManager } from "../../../services/portfolio/dynamicPositionManager.js";
import { positionSizing } from "../../../services/portfolio/positionSizing.js";
import { cashManagement } from "../../../services/portfolio/cashManagement.js";
import { usePortfolioStore } from "../../../stores/portfolioStore.js";
import { useTradingStore } from "../../../stores/tradingStore.js";

export const usePositionManager = () => {
  const [optimizationPlan, setOptimizationPlan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const portfolioStore = usePortfolioStore();
  const tradingStore = useTradingStore();

  // 포트폴리오 최적화 계획 생성
  const generateOptimizationPlan = useCallback(
    async (signals, marketCondition) => {
      setIsProcessing(true);

      try {
        const currentPortfolio = portfolioStore.getState();
        const plan = dynamicPositionManager.generateOptimizationPlan(
          currentPortfolio,
          signals,
          marketCondition
        );

        // 현금 관리 계획 추가
        const cashPlan = cashManagement.handleCashImbalance(
          currentPortfolio.cashRatio,
          cashManagement.calculateOptimalCashRatio(
            marketCondition,
            currentPortfolio.health,
            currentPortfolio.metrics
          ),
          currentPortfolio
        );

        plan.cashManagement = cashPlan;

        setOptimizationPlan(plan);
        setLastUpdate(new Date());

        return plan;
      } catch (error) {
        console.error("포지션 최적화 계획 생성 실패:", error);
        return null;
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  // 개별 포지션 크기 계산
  const calculatePositionSize = useCallback(
    (signal, marketCondition = "NEUTRAL") => {
      const portfolioState = portfolioStore.getState();
      return positionSizing.calculatePositionSize(
        signal,
        portfolioState,
        marketCondition
      );
    },
    []
  );

  // 포지션 진입 가능성 체크
  const canEnterPosition = useCallback((signal) => {
    const currentPositions = portfolioStore.getState().positions;
    const portfolioState = portfolioStore.getState();

    return dynamicPositionManager.shouldEnterPosition(
      signal,
      currentPositions,
      portfolioState
    );
  }, []);

  // 포지션 조정 추천
  const getPositionAdjustmentRecommendation = useCallback(
    (symbol, newSignal) => {
      const positions = portfolioStore.getState().positions;
      const position = positions.find((p) => p.symbol === symbol);

      if (!position) return null;

      return dynamicPositionManager.evaluatePositionAdjustment(
        position,
        newSignal
      );
    },
    []
  );

  // 포지션 교체 기회 확인
  const findSwapOpportunities = useCallback((newSignals) => {
    const currentPositions = portfolioStore.getState().positions;
    return dynamicPositionManager.evaluatePositionSwap(
      currentPositions,
      newSignals
    );
  }, []);

  // 현금 비중 최적화
  const optimizeCashRatio = useCallback((marketCondition) => {
    const portfolioState = portfolioStore.getState();
    const optimalRatio = cashManagement.calculateOptimalCashRatio(
      marketCondition,
      portfolioState.health,
      portfolioState.metrics
    );

    return cashManagement.handleCashImbalance(
      portfolioState.cashRatio,
      optimalRatio,
      portfolioState
    );
  }, []);

  // 긴급 상황 대응
  const handleEmergencyScenario = useCallback((scenario) => {
    const portfolioState = portfolioStore.getState();
    return cashManagement.handleEmergencyScenario(scenario, portfolioState);
  }, []);

  // 계획 실행
  const executePlan = useCallback(async (plan) => {
    if (!plan || !plan.actions || plan.actions.length === 0) return;

    setIsProcessing(true);

    try {
      const results = [];

      // 우선순위별로 액션 실행
      const sortedActions = plan.actions.sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        return (
          (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
        );
      });

      for (const action of sortedActions) {
        try {
          const result = await executeAction(action);
          results.push({ action, result, success: true });
        } catch (error) {
          results.push({ action, error: error.message, success: false });
        }
      }

      return results;
    } catch (error) {
      console.error("계획 실행 실패:", error);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // 액션 실행 (실제 거래 로직과 연동)
  const executeAction = async (action) => {
    const tradingEngine = tradingStore.getState().engine;

    switch (action.type) {
      case "NEW_ENTRY":
        return await tradingEngine.executeBuy(action.symbol, action.amount);
      case "ADJUST":
        if (action.action === "ADD") {
          return await tradingEngine.executeBuy(action.symbol, action.amount);
        } else {
          return await tradingEngine.executeSell(
            action.symbol,
            action.quantity
          );
        }
      case "SWAP":
        const sellResult = await tradingEngine.executeSell(
          action.sellSymbol,
          "ALL"
        );
        if (sellResult.success) {
          return await tradingEngine.executeBuy(
            action.buySymbol,
            sellResult.amount
          );
        }
        throw new Error("스왑 거래 실패");
      default:
        throw new Error(`지원하지 않는 액션: ${action.type}`);
    }
  };

  return {
    // 상태
    optimizationPlan,
    isProcessing,
    lastUpdate,

    // 메서드
    generateOptimizationPlan,
    calculatePositionSize,
    canEnterPosition,
    getPositionAdjustmentRecommendation,
    findSwapOpportunities,
    optimizeCashRatio,
    handleEmergencyScenario,
    executePlan,
  };
};
