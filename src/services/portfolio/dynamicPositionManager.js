// src/services/portfolio/dynamicPositionManager.js

export class DynamicPositionManager {
  constructor() {
    this.maxPositions = 6;
    this.minCashRatio = 0.05; // 최소 5% 현금 보유
    this.maxCashRatio = 0.4; // 최대 40% 현금 보유
  }

  /**
   * 신호 강도별 진입 결정
   */
  shouldEnterPosition(signal, currentPositions, portfolioState) {
    const positionCount = currentPositions.length;
    const availableCash = portfolioState.totalCash;
    const cashRatio = availableCash / portfolioState.totalValue;

    // 현금이 너무 적으면 진입 금지
    if (cashRatio < this.minCashRatio) {
      return { enter: false, reason: "현금 부족" };
    }

    // 🎯 저장된 설정 가져오기
    const getTradingSettings = () => {
      if (typeof window !== "undefined" && window.tradingStore) {
        return window.tradingStore.getState().tradingSettings;
      }
      return null;
    };

    const savedSettings = getTradingSettings();

    // 🎯 설정 기반 임계값 계산
    let baseThreshold = 7.0;
    if (savedSettings && savedSettings.minBuyScore) {
      baseThreshold = savedSettings.minBuyScore;
    }

    // aggressive 전략 완화
    if (savedSettings?.strategy === "aggressive") {
      baseThreshold = Math.max(baseThreshold - 0.5, 4.0);
    }

    // 테스트 모드 완화
    if (savedSettings?.testMode) {
      baseThreshold = Math.max(baseThreshold - 0.5, 3.5);
    }

    console.log(`🔍 [${signal.symbol}] 기본 설정:`, {
      포지션수: positionCount,
      신호점수: signal.totalScore.toFixed(1),
      기본임계값: baseThreshold.toFixed(1),
      전략: savedSettings?.strategy || "default",
      테스트모드: savedSettings?.testMode || false,
    });

    // 🎯 포지션 수별 진입 기준 (완전히 수정된 로직)
    const entryRules = [
      {
        maxPositions: 2,
        minScore: Math.max(baseThreshold - 1.0, 4.0), // 더 관대하게
        description: "2개까지: 완화된 기준",
      },
      {
        maxPositions: 3,
        minScore: Math.max(baseThreshold - 0.5, 4.5),
        description: "3개까지: 약간 완화",
      },
      {
        maxPositions: 4,
        minScore: baseThreshold,
        description: "4개까지: 기본 기준",
      },
      {
        maxPositions: 5,
        minScore: baseThreshold + 0.5,
        description: "5개까지: 약간 엄격",
      },
      {
        maxPositions: 6,
        minScore: baseThreshold + 1.0,
        description: "6개까지: 엄격한 기준",
      },
    ];

    // 🎯 수정된 로직: 현재 포지션 수에 맞는 규칙 찾기
    let applicableRule = null;

    // 현재 포지션 수보다 maxPositions가 큰 첫 번째 규칙을 찾음
    for (const rule of entryRules) {
      if (positionCount < rule.maxPositions) {
        applicableRule = rule;
        break;
      }
    }

    // 적용 가능한 규칙이 없으면 (최대 포지션 수 초과)
    if (!applicableRule) {
      console.log(
        `❌ [${signal.symbol}] 최대 포지션 수 초과: ${positionCount}개 >= 6개`
      );
      return {
        enter: false,
        reason: `최대 포지션 수 초과 (${positionCount}/6개)`,
      };
    }

    // 🎯 상세 로깅
    console.log(`🎯 [${signal.symbol}] 규칙 적용:`, {
      현재포지션: `${positionCount}개`,
      적용규칙: applicableRule.description,
      요구점수: applicableRule.minScore.toFixed(1),
      신호점수: signal.totalScore.toFixed(1),
      통과여부: signal.totalScore >= applicableRule.minScore ? "✅" : "❌",
    });

    // 점수 검증
    if (signal.totalScore >= applicableRule.minScore) {
      console.log(
        `🎯 [${signal.symbol}] 진입 승인: ${signal.totalScore.toFixed(1)} >= ${applicableRule.minScore.toFixed(1)} (${applicableRule.description}, 설정: ${savedSettings?.strategy || "default"})`
      );

      return {
        enter: true,
        confidence: signal.totalScore,
        reason: applicableRule.description,
        appliedRule: applicableRule, // 디버깅용
      };
    }

    // 진입 거부
    console.log(
      `❌ [${signal.symbol}] 진입 거부: 포지션 ${positionCount}개, 신호강도 ${signal.totalScore.toFixed(1)}점 부족 (최소: ${applicableRule.minScore.toFixed(1)}, 설정: ${savedSettings?.strategy || "default"})`
    );

    return {
      enter: false,
      reason: `포지션 ${positionCount}개, 신호강도 ${signal.totalScore.toFixed(1)}점 부족`,
      requiredScore: applicableRule.minScore, // 디버깅용
      appliedRule: applicableRule, // 디버깅용
    };
  }

  /**
   * 기존 포지션 조정 평가
   */
  evaluatePositionAdjustment(position, newSignal) {
    if (!newSignal) return { action: "HOLD", reason: "신호 없음" };

    const scoreDiff = newSignal.totalScore - position.entryScore;
    const currentProfit =
      ((position.currentPrice - position.entryPrice) / position.entryPrice) *
      100;

    // 추매 조건: 신호가 1.0점 이상 강해졌고, 손실이 -3% 이내
    if (scoreDiff >= 1.0 && currentProfit >= -3) {
      return {
        action: "ADD",
        ratio: 0.5, // 기존 포지션의 50% 추가
        reason: `신호 강화 (+${scoreDiff.toFixed(1)}점), 손실 제한적 (${currentProfit.toFixed(1)}%)`,
      };
    }

    // 감매 조건: 신호가 1.5점 이상 약해졌거나 손실이 -8% 이상
    if (scoreDiff <= -1.5 || currentProfit <= -8) {
      return {
        action: "REDUCE",
        ratio: 0.3, // 30% 감량
        reason:
          scoreDiff <= -1.5
            ? `신호 약화 (${scoreDiff.toFixed(1)}점)`
            : `손절 기준 (${currentProfit.toFixed(1)}%)`,
      };
    }

    return { action: "HOLD", reason: "유지 조건" };
  }

  /**
   * 포지션 교체 기회 평가
   */
  evaluatePositionSwap(currentPositions, newSignals) {
    // 가장 약한 포지션 찾기
    const weakestPosition = currentPositions
      .filter((pos) => pos.currentScore < 6.5 || pos.profitPercent < -5)
      .sort(
        (a, b) =>
          a.currentScore +
          a.profitPercent / 10 -
          (b.currentScore + b.profitPercent / 10)
      )[0];

    // 가장 강한 새 신호 찾기
    const strongestNewSignal = newSignals
      .filter((signal) => signal.totalScore >= 7.5)
      .filter(
        (signal) =>
          !currentPositions.find((pos) => pos.symbol === signal.symbol)
      )
      .sort((a, b) => b.totalScore - a.totalScore)[0];

    if (weakestPosition && strongestNewSignal) {
      const scoreDifference =
        strongestNewSignal.totalScore - weakestPosition.currentScore;
      const profitImpact = Math.abs(weakestPosition.profitPercent);

      // 교체 조건: 신호 차이 1.5점 이상 또는 기존 포지션 손실 5% 이상
      if (scoreDifference >= 1.5 || profitImpact >= 5) {
        return {
          action: "SWAP",
          sellPosition: weakestPosition,
          buySignal: strongestNewSignal,
          reason: `${weakestPosition.symbol}(${weakestPosition.currentScore}점, ${weakestPosition.profitPercent.toFixed(1)}%) → ${strongestNewSignal.symbol}(${strongestNewSignal.totalScore}점)`,
        };
      }
    }

    return null;
  }

  /**
   * 전체 포트폴리오 최적화 제안
   */
  generateOptimizationPlan(currentPortfolio, signals, marketCondition) {
    const plan = {
      timestamp: new Date(),
      marketCondition,
      currentPositions: currentPortfolio.positions.length,
      totalValue: currentPortfolio.totalValue,
      cashRatio: currentPortfolio.cashRatio,
      actions: [],
    };

    // 1. 기존 포지션 조정
    for (const position of currentPortfolio.positions) {
      const relatedSignal = signals.find((s) => s.symbol === position.symbol);
      const adjustment = this.evaluatePositionAdjustment(
        position,
        relatedSignal
      );

      if (adjustment.action !== "HOLD") {
        plan.actions.push({
          type: "ADJUST",
          symbol: position.symbol,
          action: adjustment.action,
          ratio: adjustment.ratio,
          reason: adjustment.reason,
          priority: adjustment.action === "REDUCE" ? "HIGH" : "MEDIUM",
        });
      }
    }

    // 2. 포지션 교체
    const swapOpportunity = this.evaluatePositionSwap(
      currentPortfolio.positions,
      signals
    );
    if (swapOpportunity) {
      plan.actions.push({
        type: "SWAP",
        sellSymbol: swapOpportunity.sellPosition.symbol,
        buySymbol: swapOpportunity.buySignal.symbol,
        reason: swapOpportunity.reason,
        priority: "HIGH",
      });
    }

    // 3. 새로운 진입 기회
    const newOpportunities = signals
      .filter(
        (signal) =>
          !currentPortfolio.positions.find(
            (pos) => pos.symbol === signal.symbol
          )
      )
      .filter(
        (signal) =>
          this.shouldEnterPosition(
            signal,
            currentPortfolio.positions,
            currentPortfolio
          ).enter
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 2); // 최대 2개

    for (const opportunity of newOpportunities) {
      plan.actions.push({
        type: "NEW_ENTRY",
        symbol: opportunity.symbol,
        score: opportunity.score,
        reason: `새로운 기회: ${opportunity.score}점`,
        priority: opportunity.score >= 8.5 ? "HIGH" : "MEDIUM",
      });
    }

    return plan;
  }
}

export const dynamicPositionManager = new DynamicPositionManager();
