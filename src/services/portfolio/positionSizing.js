// src/services/portfolio/positionSizing.js

export class PositionSizing {
  constructor() {
    this.basePositionRatio = 0.15; // 기본 15%
    this.maxPositionRatio = 0.25; // 최대 25%
    this.minPositionAmount = 50000; // 최소 5만원
  }

  /**
   * 신호 강도와 시장 상황별 포지션 크기 계산
   */
  calculatePositionSize(signal, portfolioState, marketCondition = "NEUTRAL") {
    const { totalValue, availableCash, positions } = portfolioState;

    // 기본 포지션 크기
    let positionRatio = this.basePositionRatio;

    // 신호 강도별 배수
    const signalMultiplier = this.getSignalMultiplier(signal.score);
    positionRatio *= signalMultiplier;

    // 시장 상황별 조정
    const marketMultiplier = this.getMarketMultiplier(marketCondition);
    positionRatio *= marketMultiplier;

    // 확신도별 조정
    const confidenceMultiplier = this.getConfidenceMultiplier(
      signal.confidence || 0.5
    );
    positionRatio *= confidenceMultiplier;

    // 포트폴리오 집중도 조정 (포지션이 많을수록 축소)
    const diversificationMultiplier = this.getDiversificationMultiplier(
      positions.length
    );
    positionRatio *= diversificationMultiplier;

    // 최종 비율 제한
    positionRatio = Math.min(positionRatio, this.maxPositionRatio);

    // 실제 금액 계산
    const calculatedAmount = totalValue * positionRatio;
    const availableAmount = Math.min(calculatedAmount, availableCash * 0.9); // 현금의 90%까지만

    return {
      ratio: positionRatio,
      amount: Math.max(availableAmount, this.minPositionAmount),
      reasoning: {
        baseRatio: this.basePositionRatio,
        signalMultiplier,
        marketMultiplier,
        confidenceMultiplier,
        diversificationMultiplier,
        finalRatio: positionRatio,
      },
    };
  }

  /**
   * 추매/감매 크기 계산
   */
  calculateAdjustmentSize(existingPosition, adjustment, portfolioState) {
    const currentPositionValue =
      existingPosition.quantity * existingPosition.currentPrice;

    if (adjustment.action === "ADD") {
      // 추매: 기존 포지션의 ratio만큼 추가
      const addAmount = currentPositionValue * adjustment.ratio;
      const maxAddAmount = portfolioState.availableCash * 0.5; // 현금의 50%까지

      return {
        amount: Math.min(addAmount, maxAddAmount),
        type: "ADD",
        reasoning: `기존 포지션 ${adjustment.ratio * 100}% 추가`,
      };
    }

    if (adjustment.action === "REDUCE") {
      // 감매: 기존 포지션의 ratio만큼 감소
      const reduceQuantity = existingPosition.quantity * adjustment.ratio;

      return {
        quantity: reduceQuantity,
        amount: reduceQuantity * existingPosition.currentPrice,
        type: "REDUCE",
        reasoning: `기존 포지션 ${adjustment.ratio * 100}% 감소`,
      };
    }

    return null;
  }

  // 보조 메서드들
  getSignalMultiplier(score) {
    if (score >= 9.0) return 1.5; // 최강 신호: +50%
    if (score >= 8.5) return 1.3; // 매우 강한 신호: +30%
    if (score >= 8.0) return 1.2; // 강한 신호: +20%
    if (score >= 7.5) return 1.0; // 중간 신호: 기본
    if (score >= 7.0) return 0.8; // 약한 신호: -20%
    return 0.6; // 매우 약한 신호: -40%
  }

  getMarketMultiplier(condition) {
    switch (condition) {
      case "BULL":
        return 1.2; // 강세장: +20%
      case "BEAR":
        return 0.7; // 약세장: -30%
      case "SIDEWAYS":
        return 0.9; // 횡보장: -10%
      default:
        return 1.0; // 중립: 기본
    }
  }

  getConfidenceMultiplier(confidence) {
    if (confidence >= 0.8) return 1.2; // 높은 확신: +20%
    if (confidence >= 0.6) return 1.0; // 중간 확신: 기본
    if (confidence >= 0.4) return 0.9; // 낮은 확신: -10%
    return 0.8; // 매우 낮은 확신: -20%
  }

  getDiversificationMultiplier(positionCount) {
    if (positionCount <= 2) return 1.1; // 2개 이하: +10%
    if (positionCount <= 4) return 1.0; // 4개 이하: 기본
    if (positionCount <= 6) return 0.9; // 6개 이하: -10%
    return 0.8; // 6개 초과: -20%
  }
}

export const positionSizing = new PositionSizing();
