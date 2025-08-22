// src/stores/tradingStore.js - 차등 배분 및 시장 상황 반영

import { create } from "zustand";
import { portfolioAllocationService } from "../services/portfolio/portfolioAllocation.js";
import { marketAnalysisService } from "../services/analysis/marketAnalysis.js";

export const useTradingStore = create((set, get) => ({
  // 기본 상태
  portfolio: {
    krw: 1840000,
    coins: new Map(),
    totalValue: 1840000,
  },

  marketCondition: null,
  portfolioAllocation: null,
  newsAdjustments: [],

  // 거래 설정
  tradingSettings: {
    strategy: "balanced",
    buyThreshold: -1.5,
    sellThreshold: 2.0,
    minScore: 6.5,
    maxCoinsToTrade: 8,
    reserveCashRatio: 0.15,

    // ✅ 새로운 차등 배분 설정
    tierBasedAllocation: true,
    tier1Allocation: 0.55, // BTC, ETH
    tier2Allocation: 0.3, // 상위 알트코인
    tier3Allocation: 0.15, // 나머지

    // ✅ 유연한 대기시간 설정
    flexibleWaitTime: true,
    baseWaitTime: 120, // 기본 2시간 (분)
    crashBuyWaitTime: 10, // 급락 시 10분
    dipBuyWaitTime: 60, // 하락 시 1시간

    // ✅ 뉴스 기반 조정 설정
    newsBasedAdjustment: true,
    newsPositiveMultiplier: 1.3,
    newsNegativeMultiplier: 0.7,
    newsAdjustmentDuration: 24, // 시간
  },

  // ✅ 시장 상황 업데이트
  updateMarketCondition: async () => {
    try {
      const condition = await marketAnalysisService.analyzeMarketCondition();
      set({ marketCondition: condition });

      // 시장 상황에 따른 설정 자동 조정
      const currentSettings = get().tradingSettings;
      const adjustedSettings = get().adjustSettingsForMarket(
        currentSettings,
        condition
      );

      set({ tradingSettings: adjustedSettings });
      return condition;
    } catch (error) {
      console.error("시장 상황 업데이트 실패:", error);
      return null;
    }
  },

  // ✅ 시장 상황에 따른 설정 자동 조정
  adjustSettingsForMarket: (currentSettings, marketCondition) => {
    const adjusted = { ...currentSettings };

    if (!marketCondition) return adjusted;

    // 고위험 시장 조정
    if (marketCondition.riskLevel >= 4) {
      adjusted.tier1Allocation = Math.min(0.7, adjusted.tier1Allocation * 1.2);
      adjusted.tier3Allocation = Math.max(0.05, adjusted.tier3Allocation * 0.7);
      adjusted.reserveCashRatio = Math.min(
        0.3,
        adjusted.reserveCashRatio + 0.1
      );
      adjusted.minScore += 1.0;
    }

    // 극도 변동성 시 조정
    if (marketCondition.volatility === "extreme") {
      adjusted.tier1Allocation = Math.min(0.7, adjusted.tier1Allocation * 1.3);
      adjusted.reserveCashRatio = Math.min(
        0.4,
        adjusted.reserveCashRatio + 0.15
      );
      adjusted.baseWaitTime = Math.min(300, adjusted.baseWaitTime * 1.5);
    }

    // 좋은 시장 시 공격적 조정
    if (marketCondition.overallBuyScore >= 75) {
      adjusted.tier2Allocation = Math.min(0.4, adjusted.tier2Allocation * 1.1);
      adjusted.tier3Allocation = Math.min(0.25, adjusted.tier3Allocation * 1.2);
      adjusted.maxCoinsToTrade = Math.min(12, adjusted.maxCoinsToTrade + 2);
      adjusted.baseWaitTime = Math.max(60, adjusted.baseWaitTime * 0.8);
    }

    return adjusted;
  },

  // ✅ 포트폴리오 배분 계산
  updatePortfolioAllocation: () => {
    const { portfolio, marketCondition } = get();
    const allocation = portfolioAllocationService.calculatePortfolioAllocation(
      portfolio,
      marketCondition
    );

    set({ portfolioAllocation: allocation });
    return allocation;
  },

  // ✅ 뉴스 기반 비중 조정 적용
  applyNewsAdjustment: (symbol, newsData) => {
    const { tradingSettings } = get();

    if (!tradingSettings.newsBasedAdjustment) return;

    if (newsData.score >= 7.0) {
      portfolioAllocationService.handlePositiveNews(symbol, newsData.score);
    } else if (newsData.score <= 3.0) {
      portfolioAllocationService.handleNegativeNews(symbol, newsData.score);
    }

    // 활성 뉴스 조정 현황 업데이트
    const activeAdjustments =
      portfolioAllocationService.getActiveNewsAdjustments();
    set({ newsAdjustments: activeAdjustments });
  },

  // ✅ 거래 신호 검증 (차등 배분 반영)
  validateTradingSignal: (signal) => {
    const { portfolio, marketCondition, tradingSettings } = get();

    // 기본 검증
    if (!signal || signal.totalScore < tradingSettings.minScore) {
      return { valid: false, reason: "신호 점수 부족" };
    }

    // Tier 기반 포지션 크기 계산
    const allocation = portfolioAllocationService.getTierAllocation(
      signal.symbol,
      marketCondition
    );

    const maxPositionSize = portfolio.totalValue * allocation.maxRatio;
    const currentPositionValue = get().getCurrentPositionValue(signal.symbol);

    if (currentPositionValue >= maxPositionSize) {
      return {
        valid: false,
        reason: `${allocation.tier} 최대 배분 초과`,
      };
    }

    return {
      valid: true,
      allocation,
      recommendedSize: Math.min(
        maxPositionSize - currentPositionValue,
        portfolio.totalValue * 0.15 // 한 번에 최대 15%
      ),
    };
  },

  // ✅ 현재 포지션 가치 계산
  getCurrentPositionValue: (symbol) => {
    const { portfolio } = get();
    const coin = portfolio.coins.get(symbol);
    return coin ? coin.quantity * coin.currentPrice : 0;
  },

  // ✅ 설정 업데이트
  updateTradingSettings: (newSettings) => {
    setTimeout(() => {
      const currentSettings = get().tradingSettings;
      const updatedSettings = { ...currentSettings, ...newSettings };

      // 설정 검증
      updatedSettings.tier1Allocation = Math.max(
        0.3,
        Math.min(0.7, updatedSettings.tier1Allocation)
      );
      updatedSettings.tier2Allocation = Math.max(
        0.2,
        Math.min(0.4, updatedSettings.tier2Allocation)
      );
      updatedSettings.tier3Allocation = Math.max(
        0.05,
        Math.min(0.25, updatedSettings.tier3Allocation)
      );

      // 총 배분 비율 검증
      const totalAllocation =
        updatedSettings.tier1Allocation +
        updatedSettings.tier2Allocation +
        updatedSettings.tier3Allocation;

      if (totalAllocation > 1.0) {
        // 비례 조정
        const ratio = 0.9 / totalAllocation; // 10% 현금 보유
        updatedSettings.tier1Allocation *= ratio;
        updatedSettings.tier2Allocation *= ratio;
        updatedSettings.tier3Allocation *= ratio;
      }

      set({ tradingSettings: updatedSettings });
    }, 0);
  },

  // ✅ 포트폴리오 리밸런싱 추천
  getRebalanceRecommendations: () => {
    const { portfolioAllocation } = get();
    return portfolioAllocation?.recommendations || [];
  },

  // ✅ 대기시간 계산
  calculateWaitTime: (symbol, signal) => {
    const { marketCondition, tradingSettings } = get();

    if (!tradingSettings.flexibleWaitTime) {
      return tradingSettings.baseWaitTime * 60 * 1000; // 기본 대기시간
    }

    // 급락 감지
    if (signal.priceChange < -0.15) {
      return tradingSettings.crashBuyWaitTime * 60 * 1000;
    }

    if (signal.priceChange < -0.05) {
      return tradingSettings.dipBuyWaitTime * 60 * 1000;
    }

    // 시장 상황 반영
    let waitTime = tradingSettings.baseWaitTime;

    if (marketCondition) {
      if (marketCondition.overallBuyScore >= 80) {
        waitTime *= 0.5; // 좋은 시장에서는 단축
      } else if (marketCondition.riskLevel >= 4) {
        waitTime *= 1.5; // 고위험 시장에서는 연장
      }
    }

    return waitTime * 60 * 1000; // 밀리초로 변환
  },

  // ✅ 포트폴리오 현황 요약
  getPortfolioSummary: () => {
    const { portfolio, portfolioAllocation, newsAdjustments } = get();

    return {
      ...portfolio,
      allocation: portfolioAllocation,
      activeNewsAdjustments: newsAdjustments,
      tierBreakdown: get().getTierBreakdown(),
    };
  },

  // ✅ Tier별 현황
  getTierBreakdown: () => {
    const { portfolio } = get();
    const breakdown = {
      TIER1: { value: 0, coins: [] },
      TIER2: { value: 0, coins: [] },
      TIER3: { value: 0, coins: [] },
    };

    for (const [symbol, coin] of portfolio.coins) {
      const tier = portfolioAllocationService.getCoinTier(symbol);
      const value = coin.quantity * coin.currentPrice;

      breakdown[tier].value += value;
      breakdown[tier].coins.push({
        symbol,
        value,
        percentage: ((value / portfolio.totalValue) * 100).toFixed(1),
      });
    }

    return breakdown;
  },
}));
