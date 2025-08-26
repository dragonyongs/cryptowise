// src/services/testing/paperTradingEngine.js - 동적 포지션 관리 통합 버전

import { dynamicPositionManager } from "../portfolio/dynamicPositionManager.js";
import { positionSizing } from "../portfolio/positionSizing.js";
import { cashManagement } from "../portfolio/cashManagement.js";
import {
  normalizeMarketCondition,
  getMarketConditionLabel,
} from "../../utils/marketConditions.js";
import { PORTFOLIO_CONFIG } from "../../config/portfolioConfig.js";

class PaperTradingEngine {
  constructor(initialBalance = null, customConfig = null) {
    this.initialBalance =
      initialBalance ||
      PORTFOLIO_CONFIG.getInitialCapital(customConfig?.customCapital);
    this.isActive = true;

    this.portfolio = {
      krw: this.initialBalance,
      coins: new Map(),
      trades: [],
      performance: { totalReturn: 0, winRate: 0, maxDrawdown: 0 },
    };

    // ✅ 기존 설정 유지하면서 동적 관리 추가
    this.defaultLimits = {
      maxDailyTrades: 6,
      maxPositionSize: 0.25,
      minTradingAmount: 50000,
      maxTradingAmount: 400000,
      maxPositions: 4, // 기본값은 유지하되 동적으로 조정
      cooldownPeriod: 600000,
      reserveCashRatio: 0.4,
      minSignalScore: 8.0,
    };

    this.testModeLimits = {
      maxDailyTrades: 12,
      maxPositionSize: 0.35,
      minTradingAmount: 30000,
      maxTradingAmount: 600000,
      maxPositions: 6,
      cooldownPeriod: 120000,
      reserveCashRatio: 0.3,
      minSignalScore: 6.0,
    };

    this.isTestMode = false;
    this.tradingLimits = { ...this.defaultLimits };

    // 🎯 NEW: 동적 포지션 관리 설정
    this.dynamicPositionEnabled = true;
    this.currentMarketCondition = "NEUTRAL";
    this.optimizationPlan = null;

    // 기존 tier 설정 유지
    this.tierAllocation = {
      TIER1: 0.55,
      TIER2: 0.3,
      TIER3: 0.15,
    };

    this.todayTrades = 0;
    this.lastResetDate = new Date().toDateString();
    this.debugMode = process.env.NODE_ENV === "development";
  }

  getTradingSettings() {
    // usePaperTrading store 참조 (의존성 주입 방식으로 개선)
    if (typeof window !== "undefined" && window.tradingStore) {
      return window.tradingStore.getState().tradingSettings;
    }
    return null;
  }

  // ✅ 기존 메서드들 유지
  setActive(isActive = true) {
    this.isActive = isActive;
    this.log(`🔄 페이퍼 트레이딩 엔진 ${isActive ? "활성화" : "비활성화"}`);
    return this;
  }

  setTestMode(isTestMode = false) {
    this.isTestMode = isTestMode;
    this.tradingLimits = isTestMode
      ? { ...this.testModeLimits }
      : { ...this.defaultLimits };
    this.log(`🔄 ${isTestMode ? "테스트" : "실전"} 모드로 전환`);
    return this;
  }

  // 🎯 NEW: 동적 포지션 관리 활성화/비활성화
  setDynamicPositionEnabled(enabled = true) {
    this.dynamicPositionEnabled = enabled;
    this.log(`🔄 동적 포지션 관리 ${enabled ? "활성화" : "비활성화"}`);
    return this;
  }

  // paperTradingEngine.js에 추가
  async updatePortfolioWithRealTimePrices(marketDataArray) {
    if (!this.isActive) return;

    let updatedCount = 0;

    for (const marketData of marketDataArray) {
      const symbol = marketData.code?.replace("KRW-", "") || marketData.symbol;
      const coin = this.portfolio.coins.get(symbol);

      if (coin && marketData.trade_price) {
        const oldPrice = coin.currentPrice;
        coin.currentPrice = marketData.trade_price;
        coin.lastUpdated = new Date();

        // 수익률 재계산
        const profitAmount =
          (coin.currentPrice - coin.avgPrice) * coin.quantity;
        const profitRate =
          coin.avgPrice > 0
            ? ((coin.currentPrice - coin.avgPrice) / coin.avgPrice) * 100
            : 0;

        coin.totalProfit = profitAmount;
        coin.profitRate = profitRate;

        if (oldPrice !== coin.currentPrice) {
          updatedCount++;
          console.log(
            `📈 [${symbol}] 가격 업데이트: ${oldPrice.toLocaleString()} → ${coin.currentPrice.toLocaleString()} (${profitRate.toFixed(2)}%)`
          );
        }
      }
    }

    if (updatedCount > 0) {
      console.log(`✅ ${updatedCount}개 코인 가격 업데이트 완료`);
    }
  }

  // 🎯 NEW: 시장 상황 업데이트
  updateMarketCondition(condition) {
    this.currentMarketCondition = normalizeMarketCondition(condition);
    const conditionLabel = getMarketConditionLabel(condition);

    // 시장 상황에 따른 동적 조정
    if (this.dynamicPositionEnabled) {
      const optimalCashRatio = cashManagement.calculateOptimalCashRatio(
        this.currentMarketCondition,
        this.getPortfolioHealth(),
        this.getMarketMetrics()
      );

      this.tradingLimits.reserveCashRatio = optimalCashRatio;
      this.log(
        `📊 시장 상황 ${conditionLabel}(${this.currentMarketCondition})에 따른 현금 비중 조정: ${(optimalCashRatio * 100).toFixed(1)}%`
      );
    }
  }

  log(message, level = "info") {
    if (!this.debugMode && level === "debug") return;
    const timestamp = new Date().toLocaleTimeString();
    const prefix = this.isTestMode ? "[테스트엔진]" : "[실전엔진]";
    console.log(`${timestamp} ${prefix} ${message}`);
  }

  checkAndResetDailyLimits() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.todayTrades = 0;
      this.lastResetDate = today;
      this.log(`🌅 새로운 날 시작 - 거래 카운트 리셋`);
    }
  }

  // 🎯 ENHANCED: 메인 신호 실행 함수 (동적 포지션 관리 통합)
  async executeSignal(signal) {
    if (!this.isActive) {
      return { executed: false, reason: "페이퍼 트레이딩 엔진이 비활성화됨" };
    }

    try {
      this.log(`🔄 신호 처리 시작: ${signal.symbol} ${signal.type}`, "debug");
      this.checkAndResetDailyLimits();

      // 🎯 동적 포지션 관리가 활성화된 경우
      if (this.dynamicPositionEnabled) {
        return await this.executeSignalWithDynamicPositioning(signal);
      }

      // 기존 로직 유지 (하위호환성)
      return await this.executeSignalLegacy(signal);
    } catch (error) {
      this.log(`❌ executeSignal 오류: ${error.message}`, "error");
      return { executed: false, reason: `시스템 오류: ${error.message}` };
    }
  }

  // 🎯 NEW: 동적 포지션 관리를 사용한 신호 실행
  async executeSignalWithDynamicPositioning(signal) {
    const currentPositions = this.getCurrentPositions();
    const portfolioState = this.getPortfolioState();

    // 1단계: 기본 신호 검증
    const basicValidation = this.validateBasicSignal(signal);
    if (!basicValidation.isValid) {
      this.log(`❌ 기본 검증 실패: ${basicValidation.reason}`);
      return { executed: false, reason: basicValidation.reason };
    }

    const { symbol, type, price, totalScore } = signal;

    if (type === "BUY") {
      // 매수 시나리오 처리
      return await this.handleBuySignal(
        signal,
        currentPositions,
        portfolioState
      );
    } else if (type === "SELL") {
      // 매도 시나리오 처리
      return await this.handleSellSignal(
        signal,
        currentPositions,
        portfolioState
      );
    }

    return { executed: false, reason: "잘못된 신호 타입" };
  }

  // 🎯 NEW: 매수 신호 처리 (동적 포지션 관리)
  async handleBuySignal(signal, currentPositions, portfolioState) {
    const existingPosition = currentPositions.find(
      (pos) => pos.symbol === signal.symbol
    );

    if (existingPosition) {
      // 기존 포지션이 있는 경우 - 추매 검토
      const adjustment = dynamicPositionManager.evaluatePositionAdjustment(
        existingPosition,
        signal
      );

      if (adjustment.action === "ADD") {
        return await this.executePositionAdjustment(signal, adjustment, "ADD");
      } else {
        return {
          executed: false,
          reason: `추매 조건 불만족: ${adjustment.reason}`,
        };
      }
    } else {
      // 신규 진입 검토
      const entryEvaluation = dynamicPositionManager.shouldEnterPosition(
        signal,
        currentPositions,
        portfolioState
      );

      if (entryEvaluation.enter) {
        return await this.executeNewEntry(signal, portfolioState);
      } else {
        console.log(
          `📊 [${signal.symbol}] 동적 진입 거부: ${entryEvaluation.reason}`
        );
        return { executed: false, reason: entryEvaluation.reason };
      }
    }
  }

  // 🎯 NEW: 매도 신호 처리 (동적 포지션 관리)
  async handleSellSignal(signal, currentPositions, portfolioState) {
    const existingPosition = currentPositions.find(
      (pos) => pos.symbol === signal.symbol
    );

    if (!existingPosition) {
      return { executed: false, reason: "보유하지 않은 코인" };
    }

    // 감매 또는 전량 매도 결정
    const adjustment = dynamicPositionManager.evaluatePositionAdjustment(
      existingPosition,
      signal
    );

    if (adjustment.action === "REDUCE") {
      return await this.executePositionAdjustment(signal, adjustment, "REDUCE");
    } else {
      // 기존 매도 로직 사용
      return await this.executeSell(
        signal.symbol,
        signal.price,
        signal.totalScore,
        signal
      );
    }
  }

  // 🎯 NEW: 신규 진입 실행
  async executeNewEntry(signal, portfolioState) {
    const positionSizeInfo = positionSizing.calculatePositionSize(
      signal,
      portfolioState,
      this.currentMarketCondition
    );

    const positionSize = positionSizeInfo.amount;

    if (this.portfolio.krw < positionSize) {
      return { executed: false, reason: "계산된 포지션 크기만큼 현금 부족" };
    }

    // 기존 executeBuy 로직 활용하되 동적 크기 적용
    return await this.executeDynamicBuy(
      signal,
      positionSize,
      positionSizeInfo.reasoning
    );
  }

  // 🎯 NEW: 포지션 조정 실행 (추매/감매)
  async executePositionAdjustment(signal, adjustment, type) {
    const coin = this.portfolio.coins.get(signal.symbol);

    if (type === "ADD") {
      // 추매
      const addSize = positionSizing.calculateAdjustmentSize(
        coin,
        adjustment,
        this.getPortfolioState()
      );

      if (this.portfolio.krw < addSize.amount) {
        return { executed: false, reason: "추매할 현금 부족" };
      }

      return await this.executeAddPosition(
        signal,
        addSize.amount,
        adjustment.reason
      );
    } else if (type === "REDUCE") {
      // 감매
      const reduceQuantity = coin.quantity * adjustment.ratio;
      return await this.executeReducePosition(
        signal,
        reduceQuantity,
        adjustment.reason
      );
    }
  }

  // 🎯 NEW: 동적 크기 매수
  async executeDynamicBuy(signal, positionSize, reasoning) {
    const { symbol, price, totalScore } = signal;
    const quantity = positionSize / price;
    const tier = this.getCoinTier(symbol);
    const fee = positionSize * 0.0005;

    const existingCoin = this.portfolio.coins.get(symbol);
    if (existingCoin) {
      // 기존 로직 유지
      const totalQuantity = existingCoin.quantity + quantity;
      const totalCost =
        existingCoin.avgPrice * existingCoin.quantity + positionSize;
      existingCoin.quantity = totalQuantity;
      existingCoin.avgPrice = totalCost / totalQuantity;
      existingCoin.currentPrice = price;
      existingCoin.tier = tier;

      // 🎯 동적 정보 추가
      existingCoin.lastAdjustment = {
        type: "ADD",
        amount: positionSize,
        reason: reasoning.finalRatio
          ? `동적 배분 ${(reasoning.finalRatio * 100).toFixed(1)}%`
          : "추매",
        timestamp: new Date(),
      };

      this.log(
        `🔄 동적 추매: ${symbol} ${quantity.toFixed(8)}개 추가 (배분비: ${(reasoning.finalRatio * 100).toFixed(1)}%)`
      );
    } else {
      // 신규 포지션 생성
      this.portfolio.coins.set(symbol, {
        symbol,
        quantity,
        avgPrice: price,
        currentPrice: price,
        firstBought: new Date(),
        tier,
        entryScore: totalScore,
        // 🎯 동적 포지션 정보 추가
        positionType: "DYNAMIC",
        targetAllocation: reasoning.finalRatio,
        dynamicInfo: {
          baseRatio: reasoning.baseRatio,
          signalMultiplier: reasoning.signalMultiplier,
          marketMultiplier: reasoning.marketMultiplier,
          confidenceMultiplier: reasoning.confidenceMultiplier,
        },
        profitTargets: this.isTestMode
          ? {
              target1: price * 1.025,
              target2: price * 1.04,
              target3: price * 1.06,
              target4: price * 1.1,
            }
          : {
              target1: price * 1.03,
              target2: price * 1.05,
              target3: price * 1.08,
              target4: price * 1.12,
            },
        stopLoss: price * (this.isTestMode ? 0.96 : 0.94),
      });

      this.log(
        `🆕 동적 신규 포지션: ${symbol} ${quantity.toFixed(8)}개 (목표배분: ${(reasoning.finalRatio * 100).toFixed(1)}%)`
      );
    }

    this.portfolio.krw -= positionSize + fee;

    const trade = {
      id: `${Date.now()}_${symbol}`,
      symbol,
      action: "BUY",
      quantity,
      price,
      amount: positionSize,
      fee,
      timestamp: new Date(),
      score: Number(totalScore?.toFixed(1)) || 0,
      confidence: signal.confidence,
      reason: signal.reason,
      tier,
      allocation: ((positionSize / this.initialBalance) * 100).toFixed(1) + "%",
      mode: this.isTestMode ? "TEST" : "LIVE",
      // 🎯 동적 포지션 정보 추가
      positionType: existingCoin ? "ADD_POSITION" : "NEW_POSITION",
      dynamicReasoning: reasoning,
    };

    this.portfolio.trades.push(trade);
    this.todayTrades++;

    return { executed: true, trade, positionInfo: reasoning };
  }

  // 🎯 NEW: 포지션 추가
  async executeAddPosition(signal, addAmount, reason) {
    const { symbol, price } = signal;
    const coin = this.portfolio.coins.get(symbol);
    const addQuantity = addAmount / price;
    const fee = addAmount * 0.0005;

    // 기존 포지션 업데이트
    const totalQuantity = coin.quantity + addQuantity;
    const totalCost = coin.avgPrice * coin.quantity + addAmount;
    coin.quantity = totalQuantity;
    coin.avgPrice = totalCost / totalQuantity;
    coin.currentPrice = price;
    coin.lastAdjustment = {
      type: "ADD",
      amount: addAmount,
      reason: reason,
      timestamp: new Date(),
    };

    this.portfolio.krw -= addAmount + fee;

    const trade = {
      id: `${Date.now()}_${symbol}`,
      symbol,
      action: "ADD_BUY",
      quantity: addQuantity,
      price,
      amount: addAmount,
      fee,
      timestamp: new Date(),
      reason: reason,
      mode: this.isTestMode ? "TEST" : "LIVE",
      positionType: "POSITION_ADD",
    };

    this.portfolio.trades.push(trade);
    this.todayTrades++;

    this.log(
      `➕ 포지션 추가: ${symbol} ${addQuantity.toFixed(8)}개 추가 (사유: ${reason})`
    );
    return { executed: true, trade, actionType: "ADD" };
  }

  // 🎯 NEW: 포지션 감소
  async executeReducePosition(signal, reduceQuantity, reason) {
    const { symbol, price } = signal;
    const coin = this.portfolio.coins.get(symbol);
    const reduceAmount = reduceQuantity * price;
    const fee = reduceAmount * 0.0005;

    const profitRate = ((price - coin.avgPrice) / coin.avgPrice) * 100;

    // 포지션 감소
    coin.quantity -= reduceQuantity;
    coin.currentPrice = price;
    coin.lastAdjustment = {
      type: "REDUCE",
      amount: reduceAmount,
      reason: reason,
      timestamp: new Date(),
    };

    if (coin.quantity < 0.00000001) {
      this.portfolio.coins.delete(symbol);
      this.log(`🗑️ ${symbol} 포지션 완전 청산 (동적 감매)`);
    }

    this.portfolio.krw += reduceAmount - fee;

    const trade = {
      id: `${Date.now()}_${symbol}`,
      symbol,
      action: "REDUCE_SELL",
      quantity: reduceQuantity,
      price,
      amount: reduceAmount,
      fee,
      timestamp: new Date(),
      profitRate: Number(profitRate.toFixed(2)),
      reason: reason,
      mode: this.isTestMode ? "TEST" : "LIVE",
      positionType: "POSITION_REDUCE",
    };

    this.portfolio.trades.push(trade);
    this.todayTrades++;

    this.log(
      `➖ 포지션 감소: ${symbol} ${reduceQuantity.toFixed(8)}개 매도 (사유: ${reason}, 수익률: ${profitRate.toFixed(2)}%)`
    );
    return { executed: true, trade, actionType: "REDUCE" };
  }

  // ✅ 기존 executeBuy 메서드 유지 (하위호환성)
  async executeBuy(symbol, price, score, signal) {
    // 동적 포지션 관리가 비활성화된 경우 기존 로직 사용
    if (!this.dynamicPositionEnabled) {
      return await this.executeBuyLegacy(symbol, price, score, signal);
    }

    // 동적 관리 활성화 시 새로운 로직 사용
    const enhancedSignal = { ...signal, symbol, price, totalScore: score };
    return await this.executeNewEntry(enhancedSignal, this.getPortfolioState());
  }

  // 🎯 기존 executeBuy 로직을 별도 메서드로 분리
  async executeBuyLegacy(symbol, price, score, signal) {
    const positionSize = this.calculatePositionSize(signal);
    if (this.portfolio.krw < positionSize) {
      return { executed: false, reason: "계산된 포지션 크기만큼 현금 부족" };
    }

    // 기존 로직 그대로 유지...
    const quantity = positionSize / price;
    const tier = this.getCoinTier(symbol);
    const fee = positionSize * 0.0005;

    const existingCoin = this.portfolio.coins.get(symbol);
    if (existingCoin) {
      const totalQuantity = existingCoin.quantity + quantity;
      const totalCost =
        existingCoin.avgPrice * existingCoin.quantity + positionSize;
      existingCoin.quantity = totalQuantity;
      existingCoin.avgPrice = totalCost / totalQuantity;
      existingCoin.currentPrice = price;
      existingCoin.tier = tier;
      this.log(
        `🔄 포지션 추가: ${symbol} 기존 ${existingCoin.quantity.toFixed(8)} → ${totalQuantity.toFixed(8)}`
      );
    } else {
      this.portfolio.coins.set(symbol, {
        symbol,
        quantity,
        avgPrice: price,
        currentPrice: price,
        firstBought: new Date(),
        tier,
        profitTargets: this.isTestMode
          ? {
              target1: price * 1.025,
              target2: price * 1.04,
              target3: price * 1.06,
              target4: price * 1.1,
            }
          : {
              target1: price * 1.03,
              target2: price * 1.05,
              target3: price * 1.08,
              target4: price * 1.12,
            },
        stopLoss: price * (this.isTestMode ? 0.96 : 0.94),
      });
      this.log(`🆕 신규 포지션: ${symbol} ${quantity.toFixed(8)}개 생성`);
    }

    this.portfolio.krw -= positionSize + fee;
    const trade = {
      id: `${Date.now()}_${symbol}`,
      symbol,
      action: "BUY",
      quantity,
      price,
      amount: positionSize,
      fee,
      timestamp: new Date(),
      score: Number(score?.toFixed(1)) || 0,
      confidence: signal.confidence,
      reason: signal.reason,
      tier,
      allocation: ((positionSize / this.initialBalance) * 100).toFixed(1) + "%",
      mode: this.isTestMode ? "TEST" : "LIVE",
    };

    this.portfolio.trades.push(trade);
    this.todayTrades++;

    this.log(
      `✅ ${this.isTestMode ? "테스트" : "실전"} 매수 완료: ${symbol} (${tier}) ${quantity.toFixed(8)}개 @ ₩${price.toLocaleString()} (배분: ${trade.allocation})`
    );
    return { executed: true, trade };
  }

  // 🎯 NEW: 기존 신호 실행 로직 (하위호환성)
  async executeSignalLegacy(signal) {
    // 기존 검증 로직들
    const basicValidation = this.validateBasicSignal(signal);
    if (!basicValidation.isValid) {
      this.log(`❌ 기본 검증 실패: ${basicValidation.reason}`);
      return { executed: false, reason: basicValidation.reason };
    }

    const limitValidation = this.validateTradingLimits(signal);
    if (!limitValidation.isValid) {
      this.log(`❌ 거래 제한 검증 실패: ${limitValidation.reason}`);
      return { executed: false, reason: limitValidation.reason };
    }

    const portfolioValidation = this.validatePortfolioState(signal);
    if (!portfolioValidation.isValid) {
      this.log(`❌ 포트폴리오 검증 실패: ${portfolioValidation.reason}`);
      return { executed: false, reason: portfolioValidation.reason };
    }

    // 기존 거래 실행 로직
    const { symbol, type, price, totalScore } = signal;
    let result;

    if (type === "BUY") {
      result = await this.executeBuyLegacy(symbol, price, totalScore, signal);
    } else if (type === "SELL") {
      result = await this.executeSell(symbol, price, totalScore, signal);
    } else {
      return { executed: false, reason: "잘못된 신호 타입" };
    }

    if (result.executed) {
      this.log(`✅ 거래 성공: ${symbol} ${type}`, "info");
      this.logPortfolioState();
    }

    return result;
  }

  // 🎯 NEW: 현재 포지션 정보 반환
  getCurrentPositions() {
    const positions = [];
    for (const [symbol, coin] of this.portfolio.coins) {
      const currentValue = coin.quantity * coin.currentPrice;
      const profitRate =
        ((coin.currentPrice - coin.avgPrice) / coin.avgPrice) * 100;

      positions.push({
        symbol,
        quantity: coin.quantity,
        avgPrice: coin.avgPrice,
        currentPrice: coin.currentPrice,
        value: currentValue,
        profitPercent: profitRate,
        tier: coin.tier,
        entryScore: coin.entryScore || 7.0,
        currentScore: 7.0, // 실제로는 최신 신호에서 가져와야 함
        holdingDays: Math.floor(
          (Date.now() - (coin.firstBought?.getTime() || Date.now())) /
            (1000 * 60 * 60 * 24)
        ),
        lastAdjustment: coin.lastAdjustment,
      });
    }
    return positions;
  }

  // 🎯 NEW: 포트폴리오 상태 반환
  getPortfolioState() {
    const totalCoinValue = this.getTotalCoinValue();
    const totalValue = this.portfolio.krw + totalCoinValue;

    return {
      totalValue,
      totalCash: this.portfolio.krw,
      availableCash: this.portfolio.krw,
      totalInvestment: totalCoinValue,
      cashRatio: this.portfolio.krw / totalValue,
      positions: this.getCurrentPositions(),
      health: this.getPortfolioHealth(),
      metrics: this.getMarketMetrics(),
    };
  }

  // 🎯 NEW: 포트폴리오 건강도
  getPortfolioHealth() {
    const positions = this.getCurrentPositions();
    const profitablePositions = positions.filter((p) => p.profitPercent > 0);
    const totalUnrealizedLoss = positions
      .filter((p) => p.profitPercent < 0)
      .reduce((sum, p) => sum + (p.value * p.profitPercent) / 100, 0);

    const winRate =
      positions.length > 0 ? profitablePositions.length / positions.length : 0;

    // 최근 거래 성과 (지난 10개 거래)
    const recentTrades = this.portfolio.trades
      .filter((t) => t.action.includes("SELL"))
      .slice(0, 10);

    const recentPerformance =
      recentTrades.length > 0
        ? recentTrades.reduce((sum, t) => sum + (t.profitRate || 0), 0) /
          recentTrades.length
        : 0;

    return {
      unrealizedLoss: (totalUnrealizedLoss / this.initialBalance) * 100,
      winRate,
      recentPerformance,
    };
  }

  // 🎯 NEW: 시장 지표 (실제로는 외부에서 주입받아야 함)
  getMarketMetrics() {
    return {
      fearGreedIndex: 50, // 기본값
      bitcoinDominance: 50,
      totalMarketCap: 1000000000000,
      volatility: 0.5,
    };
  }

  // ✅ 기존 메서드들 모두 유지...
  validateBasicSignal(signal) {
    if (!signal || !signal.symbol || !signal.type) {
      return { isValid: false, reason: "필수 신호 정보 누락" };
    }

    if (!["BUY", "SELL"].includes(signal.type)) {
      return { isValid: false, reason: "유효하지 않은 신호 타입" };
    }

    // 저장된 설정 우선 적용
    const savedSettings = this.getTradingSettings();
    let requiredScore;

    if (savedSettings && savedSettings.minBuyScore) {
      requiredScore = savedSettings.minBuyScore;

      // aggressive 전략 추가 완화
      if (savedSettings.strategy === "aggressive") {
        requiredScore = Math.max(requiredScore - 0.5, 4.0);
      }

      // 테스트 모드 추가 완화
      if (this.isTestMode) {
        requiredScore = Math.max(requiredScore - 0.5, 3.5);
      }
    } else {
      // 기본값 사용
      requiredScore = this.isTestMode ? 5.0 : this.tradingLimits.minSignalScore;
    }

    const currentScore = signal.totalScore || 0;

    console.log(
      `🔍 [${signal.symbol}] 점수 검증: ${currentScore.toFixed(1)} >= ${requiredScore.toFixed(1)} (저장된설정: ${!!savedSettings}, 전략: ${savedSettings?.strategy}, 테스트: ${this.isTestMode})`
    );

    if (currentScore < requiredScore) {
      return {
        isValid: false,
        reason: `신호 점수 부족: ${currentScore.toFixed(1)} < ${requiredScore.toFixed(1)} (설정: ${savedSettings?.strategy || "default"}, ${this.isTestMode ? "테스트" : "실전"})`,
      };
    }

    return { isValid: true };
  }

  validateTradingLimits(signal) {
    const effectiveLimit = this.isTestMode
      ? this.tradingLimits.maxDailyTrades * 2
      : this.tradingLimits.maxDailyTrades;

    if (this.todayTrades >= effectiveLimit) {
      return {
        isValid: false,
        reason: `일일 거래 한도 초과 (${this.todayTrades}/${effectiveLimit}회) - ${this.isTestMode ? "테스트" : "실전"} 모드`,
      };
    }

    const effectiveCooldown = this.isTestMode
      ? this.tradingLimits.cooldownPeriod / 2
      : this.tradingLimits.cooldownPeriod;

    const lastTrade = this.portfolio.trades
      .filter((t) => t.symbol === signal.symbol)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

    if (lastTrade) {
      const timeDiff = Date.now() - new Date(lastTrade.timestamp).getTime();
      if (timeDiff < effectiveCooldown) {
        const remainingTime = Math.ceil((effectiveCooldown - timeDiff) / 60000);
        return {
          isValid: false,
          reason: `쿨다운 중 (${remainingTime}분 남음) - ${this.isTestMode ? "완화됨" : "기본"}`,
        };
      }
    }

    return { isValid: true };
  }

  validatePortfolioState(signal) {
    if (signal.type === "BUY") {
      const totalValue = this.portfolio.krw + this.getTotalCoinValue();
      const requiredCash = totalValue * this.tradingLimits.reserveCashRatio;
      const minTradingAmount = this.tradingLimits.minTradingAmount;

      if (this.portfolio.krw < requiredCash + minTradingAmount) {
        return {
          isValid: false,
          reason: `현금 비중 부족 (${this.tradingLimits.reserveCashRatio * 100}% 이상 유지 필요) ${this.isTestMode ? "- 테스트 30%" : "- 실전 40%"}`,
        };
      }

      // 🎯 동적 포지션 관리가 활성화된 경우 더 유연한 제한
      const maxPositions = this.dynamicPositionEnabled
        ? Math.min(this.tradingLimits.maxPositions + 2, 8) // 최대 2개 추가 허용
        : this.tradingLimits.maxPositions;

      if (this.portfolio.coins.size >= maxPositions) {
        return {
          isValid: false,
          reason: `최대 포지션 수 초과 (${maxPositions}개) ${this.dynamicPositionEnabled ? "- 동적 관리" : this.isTestMode ? "- 테스트 6개" : "- 실전 4개"}`,
        };
      }
    } else if (signal.type === "SELL") {
      const coin = this.portfolio.coins.get(signal.symbol);
      if (!coin || coin.quantity <= 0) {
        return { isValid: false, reason: "보유하지 않은 코인" };
      }
    }
    return { isValid: true };
  }

  // ✅ 기존 calculatePositionSize 유지하되 동적 관리 옵션 추가
  calculatePositionSize(signal) {
    // 동적 포지션 관리가 활성화된 경우
    if (this.dynamicPositionEnabled) {
      const portfolioState = this.getPortfolioState();
      const sizeInfo = positionSizing.calculatePositionSize(
        signal,
        portfolioState,
        this.currentMarketCondition
      );
      return sizeInfo.amount;
    }

    // 기존 로직 유지
    const tier = this.getCoinTier(signal.symbol);
    const totalValue = this.portfolio.krw + this.getTotalCoinValue();
    const investableAmount =
      totalValue * (1 - this.tradingLimits.reserveCashRatio);
    const tierRatio = this.tierAllocation[tier];
    let basePositionSize =
      (investableAmount * tierRatio) / this.tradingLimits.maxPositions;

    const scoreRange = this.isTestMode ? 4.0 : 2.0;
    const minScore = this.tradingLimits.minSignalScore;
    const scoreMultiplier = Math.min(
      (signal.totalScore - minScore) / scoreRange + 1.0,
      this.isTestMode ? 1.5 : 1.3
    );
    basePositionSize *= scoreMultiplier;

    const confidenceMultipliers = {
      high: this.isTestMode ? 1.3 : 1.2,
      medium: 1.0,
      low: this.isTestMode ? 0.9 : 0.8,
    };
    basePositionSize *= confidenceMultipliers[signal.confidence] || 1.0;

    if (this.isTestMode) {
      basePositionSize *= 1.2;
    }

    const minAmount = this.tradingLimits.minTradingAmount;
    const maxAmount = Math.min(
      this.tradingLimits.maxTradingAmount,
      this.portfolio.krw * (this.isTestMode ? 0.7 : 0.6)
    );
    const finalSize = Math.max(
      minAmount,
      Math.min(maxAmount, basePositionSize)
    );

    this.log(
      `💰 포지션 크기: ${finalSize.toLocaleString()}원 (${tier}, 점수: ${signal.totalScore?.toFixed(1)}, ${this.dynamicPositionEnabled ? "고정" : "동적"})`,
      "debug"
    );
    return finalSize;
  }

  // ✅ 기존 executeSell 메서드 유지
  async executeSell(symbol, price, score, signal) {
    const coin = this.portfolio.coins.get(symbol);
    if (!coin || coin.quantity <= 0) {
      return { executed: false, reason: "매도할 포지션 없음" };
    }

    const profitRate = ((price - coin.avgPrice) / coin.avgPrice) * 100;
    let sellRatio = 0;
    let sellReason = "";

    if (this.isTestMode) {
      if (profitRate >= 10) {
        sellRatio = 1.0;
        sellReason = "10% 목표 달성 (테스트)";
      } else if (profitRate >= 6) {
        sellRatio = 0.5;
        sellReason = "6% 부분 수익실현 (테스트)";
      } else if (profitRate >= 4) {
        sellRatio = 0.3;
        sellReason = "4% 1차 수익실현 (테스트)";
      } else if (profitRate >= 2.5) {
        sellRatio = 0.2;
        sellReason = "2.5% 초기 수익실현 (테스트)";
      } else if (profitRate <= -4) {
        sellRatio = 1.0;
        sellReason = "테스트 손절매 (-4%)";
      } else if (profitRate <= -2) {
        sellRatio = 0.5;
        sellReason = "테스트 부분 손절 (-2%)";
      } else {
        return { executed: false, reason: "테스트 모드 매도 조건 불만족" };
      }
    } else {
      if (profitRate >= 12) {
        sellRatio = 1.0;
        sellReason = "12% 목표 달성";
      } else if (profitRate >= 8) {
        sellRatio = 0.5;
        sellReason = "8% 1차 수익실현";
      } else if (profitRate >= 5) {
        sellRatio = 0.3;
        sellReason = "5% 부분 수익실현";
      } else if (profitRate >= 3) {
        sellRatio = 0.2;
        sellReason = "3% 초기 수익실현";
      } else if (profitRate <= -6) {
        sellRatio = 1.0;
        sellReason = "실전 손절매 (-6%)";
      } else if (profitRate <= -3) {
        sellRatio = 0.5;
        sellReason = "실전 부분 손절 (-3%)";
      } else {
        return { executed: false, reason: "실전 모드 매도 조건 불만족" };
      }
    }

    const sellQuantity = coin.quantity * sellRatio;
    const sellAmount = sellQuantity * price;
    const fee = sellAmount * 0.0005;

    coin.quantity -= sellQuantity;
    coin.currentPrice = price;

    if (coin.quantity < 0.00000001) {
      this.portfolio.coins.delete(symbol);
      this.log(`🗑️ ${symbol} 포지션 완전 청산`);
    }

    this.portfolio.krw += sellAmount - fee;

    const trade = {
      id: `${Date.now()}_${symbol}`,
      symbol,
      action: "SELL",
      quantity: sellQuantity,
      price,
      amount: sellAmount,
      fee,
      timestamp: new Date(),
      profitRate: Number(profitRate.toFixed(2)),
      sellRatio: Number((sellRatio * 100).toFixed(1)),
      sellReason,
      score: Number(score?.toFixed(1)) || 0,
      confidence: signal.confidence,
      reason: signal.reason,
      mode: this.isTestMode ? "TEST" : "LIVE",
    };

    this.portfolio.trades.push(trade);
    this.todayTrades++;

    this.log(
      `✅ ${this.isTestMode ? "테스트" : "실전"} 매도: ${sellReason} - ${symbol} ${sellQuantity.toFixed(8)}개 @ ₩${price.toLocaleString()} (수익률: ${profitRate.toFixed(2)}%)`
    );
    return { executed: true, trade };
  }

  // ✅ 나머지 기존 메서드들 모두 유지...
  getTotalCoinValue() {
    let totalValue = 0;
    for (const [symbol, coin] of this.portfolio.coins) {
      totalValue += coin.quantity * coin.currentPrice;
    }
    return totalValue;
  }

  updateCoinPrice(symbol, price) {
    const coin = this.portfolio.coins.get(symbol);
    if (coin && typeof price === "number" && price > 0) {
      coin.currentPrice = price;
      coin.profitRate = ((price - coin.avgPrice) / coin.avgPrice) * 100;
    }
  }

  getCoinTier(symbol) {
    const tier1 = ["BTC", "ETH"];
    const tier2 = [
      "SOL",
      "ADA",
      "XRP",
      "DOT",
      "LINK",
      "AVAX",
      "MATIC",
      "ATOM",
      "NEAR",
      "ALGO",
      "VET",
    ];
    if (tier1.includes(symbol)) return "TIER1";
    if (tier2.includes(symbol)) return "TIER2";
    return "TIER3";
  }

  // 🎯 ENHANCED: 포트폴리오 요약에 동적 포지션 정보 추가
  getPortfolioSummary() {
    if (!this.isActive) {
      this.log("⚠️ 엔진이 비활성화되어 포트폴리오 요약 생성 중단", "warning");
      return null;
    }

    this.log("🔍 포트폴리오 요약 생성 중...", "debug");
    let totalCryptoValue = 0;
    const positions = [];
    const coinsObject = {};

    for (const [symbol, coin] of this.portfolio.coins) {
      const currentValue = coin.quantity * coin.currentPrice;
      const profitRate =
        ((coin.currentPrice - coin.avgPrice) / coin.avgPrice) * 100;
      const totalProfit = currentValue - coin.quantity * coin.avgPrice;
      totalCryptoValue += currentValue;

      const positionData = {
        symbol,
        quantity: coin.quantity,
        avgPrice: coin.avgPrice,
        currentPrice: coin.currentPrice,
        currentValue,
        profitRate: Number(profitRate.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(0)),
        tier: coin.tier,
        firstBought: coin.firstBought,
        profitTargets: coin.profitTargets,
        stopLoss: coin.stopLoss,
        // 🎯 동적 포지션 정보 추가
        positionType: coin.positionType || "LEGACY",
        targetAllocation: coin.targetAllocation,
        dynamicInfo: coin.dynamicInfo,
        lastAdjustment: coin.lastAdjustment,
        entryScore: coin.entryScore,
      };

      positions.push(positionData);
      coinsObject[symbol] = {
        ...positionData,
        price: coin.currentPrice,
        value: currentValue,
      };
    }

    const totalPortfolioValue = this.portfolio.krw + totalCryptoValue;
    const totalReturn =
      ((totalPortfolioValue - this.initialBalance) / this.initialBalance) * 100;
    const cashRatio = (this.portfolio.krw / totalPortfolioValue) * 100;

    const sellTrades = this.portfolio.trades.filter((t) => t.action === "SELL");
    const profitTrades = sellTrades.filter(
      (t) => t.profitRate && t.profitRate > 0
    );
    const winRate =
      sellTrades.length > 0
        ? (profitTrades.length / sellTrades.length) * 100
        : 0;

    const testTrades = this.portfolio.trades.filter((t) => t.mode === "TEST");
    const liveTrades = this.portfolio.trades.filter((t) => t.mode === "LIVE");

    // 🎯 동적 포지션 통계 추가
    const dynamicPositions = positions.filter(
      (p) => p.positionType === "DYNAMIC"
    );
    const addPositions = this.portfolio.trades.filter(
      (t) => t.positionType === "POSITION_ADD"
    ).length;
    const reducePositions = this.portfolio.trades.filter(
      (t) => t.positionType === "POSITION_REDUCE"
    ).length;

    const summary = {
      positions,
      coins: coinsObject,
      trades: [...this.portfolio.trades].reverse(),
      tradeHistory: [...this.portfolio.trades].reverse(),

      totalValue: Math.floor(totalPortfolioValue),
      investedValue: Math.floor(totalCryptoValue),
      cashValue: Math.floor(this.portfolio.krw),
      krw: Math.floor(this.portfolio.krw),
      totalProfitRate: Number(totalReturn.toFixed(2)),
      totalProfit: Math.floor(totalPortfolioValue - this.initialBalance),
      cashRatio: Number(cashRatio.toFixed(1)),
      investedRatio: Number(
        ((totalCryptoValue / totalPortfolioValue) * 100).toFixed(1)
      ),

      performance: {
        totalReturn: Number(totalReturn.toFixed(2)),
        winRate: Number(winRate.toFixed(1)),
        maxDrawdown: this.calculateMaxDrawdown(),
      },

      tradingStats: {
        totalTrades: this.portfolio.trades.length,
        buyTrades: this.portfolio.trades.filter((t) => t.action === "BUY")
          .length,
        sellTrades: sellTrades.length,
        profitTrades: profitTrades.length,
        todayTrades: this.todayTrades,
        dailyLimit: this.tradingLimits.maxDailyTrades,
        // 🎯 동적 포지션 통계 추가
        addPositions,
        reducePositions,
        dynamicPositions: dynamicPositions.length,
      },

      mode: {
        isTestMode: this.isTestMode,
        testTrades: testTrades.length,
        liveTrades: liveTrades.length,
        currentLimits: { ...this.tradingLimits },
        isActive: this.isActive,
        // 🎯 동적 관리 정보 추가
        dynamicPositionEnabled: this.dynamicPositionEnabled,
        marketCondition: this.currentMarketCondition,
      },

      activePositions: this.portfolio.coins.size,
      maxPositions: this.tradingLimits.maxPositions,
      lastUpdated: new Date(),
      tierAllocation: this.tierAllocation,

      // 🎯 동적 포지션 요약 추가
      dynamicSummary: {
        totalDynamicPositions: dynamicPositions.length,
        averageTargetAllocation:
          dynamicPositions.length > 0
            ? dynamicPositions.reduce(
                (sum, p) => sum + (p.targetAllocation || 0),
                0
              ) / dynamicPositions.length
            : 0,
        recentAdjustments: positions
          .filter((p) => p.lastAdjustment)
          .sort(
            (a, b) =>
              new Date(b.lastAdjustment.timestamp) -
              new Date(a.lastAdjustment.timestamp)
          )
          .slice(0, 5),
        portfolioHealth: this.getPortfolioHealth(),
      },
    };

    this.log(
      `📊 요약 완료: 총자산 ₩${summary.totalValue.toLocaleString()}, ` +
        `수익률 ${summary.totalProfitRate}%, 승률 ${summary.performance.winRate}%, ` +
        `positions ${summary.positions.length}개 (동적: ${dynamicPositions.length}개), ` +
        `trades ${summary.trades.length}개`
    );

    this.log("요약 전체: ", summary);
    return summary;
  }

  calculateMaxDrawdown() {
    if (this.portfolio.trades.length === 0) return 0;
    let maxValue = this.initialBalance;
    let maxDrawdown = 0;
    let currentValue = this.initialBalance;

    for (const trade of this.portfolio.trades) {
      if (trade.action === "BUY") {
        currentValue -= trade.amount + trade.fee;
      } else {
        currentValue += trade.amount - trade.fee;
      }
      maxValue = Math.max(maxValue, currentValue);
      const drawdown = ((maxValue - currentValue) / maxValue) * 100;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    return Number(maxDrawdown.toFixed(2));
  }

  logPortfolioState() {
    if (!this.isActive) return;
    const totalValue = this.portfolio.krw + this.getTotalCoinValue();
    const cashRatio = (this.portfolio.krw / totalValue) * 100;
    this.log(
      `📊 현재 포트폴리오: 총자산 ₩${totalValue.toLocaleString()}, 현금 ${cashRatio.toFixed(1)}%, 코인 ${this.portfolio.coins.size}개, 오늘 거래 ${this.todayTrades}/${this.tradingLimits.maxDailyTrades}회 ${this.dynamicPositionEnabled ? "(동적관리)" : "(고정관리)"}`,
      "debug"
    );
  }

  getCurrentSettings() {
    return {
      mode: this.isTestMode ? "TEST" : "LIVE",
      limits: { ...this.tradingLimits },
      tierAllocation: { ...this.tierAllocation },
      debugMode: this.debugMode,
      isActive: this.isActive,
      dynamicPositionEnabled: this.dynamicPositionEnabled,
      marketCondition: this.currentMarketCondition,
    };
  }

  resetPortfolio() {
    const currentMode = this.isTestMode;
    const currentActiveState = this.isActive;
    const currentDynamicState = this.dynamicPositionEnabled;

    this.portfolio = {
      krw: this.initialBalance,
      coins: new Map(),
      trades: [],
      performance: { totalReturn: 0, winRate: 0, maxDrawdown: 0 },
    };

    this.todayTrades = 0;
    this.lastResetDate = new Date().toDateString();
    this.optimizationPlan = null;

    this.setTestMode(currentMode);
    this.setActive(currentActiveState);
    this.setDynamicPositionEnabled(currentDynamicState);

    this.log(
      `✅ 포트폴리오가 초기화되었습니다 (${currentMode ? "테스트" : "실전"} 모드, ${currentActiveState ? "활성" : "비활성"} 상태, ${currentDynamicState ? "동적" : "고정"} 관리 유지)`
    );
  }

  // 🎯 NEW: 포지션 최적화 계획 생성
  async generateOptimizationPlan(signals) {
    if (!this.dynamicPositionEnabled) {
      this.log(
        "동적 포지션 관리가 비활성화되어 최적화 계획 생성 중단",
        "warning"
      );
      return null;
    }

    try {
      const currentPortfolio = this.getPortfolioState();
      this.optimizationPlan = dynamicPositionManager.generateOptimizationPlan(
        currentPortfolio,
        signals,
        this.currentMarketCondition
      );

      this.log(
        `📋 포지션 최적화 계획 생성: ${this.optimizationPlan.actions.length}개 액션`,
        "info"
      );
      return this.optimizationPlan;
    } catch (error) {
      this.log(`최적화 계획 생성 실패: ${error.message}`, "error");
      return null;
    }
  }

  // 🎯 NEW: 최적화 계획 실행
  async executeOptimizationPlan(plan = null) {
    const targetPlan = plan || this.optimizationPlan;
    if (!targetPlan || !targetPlan.actions.length) {
      return { executed: false, reason: "실행할 계획이 없습니다" };
    }

    const results = [];
    for (const action of targetPlan.actions) {
      try {
        let result;
        switch (action.type) {
          case "ADJUST":
            result = await this.executeAdjustmentAction(action);
            break;
          case "SWAP":
            result = await this.executeSwapAction(action);
            break;
          case "NEW_ENTRY":
            result = await this.executeNewEntryAction(action);
            break;
          default:
            result = {
              executed: false,
              reason: `지원하지 않는 액션: ${action.type}`,
            };
        }
        results.push({ action, result, success: result.executed });
      } catch (error) {
        results.push({ action, error: error.message, success: false });
      }
    }

    this.log(
      `📊 최적화 계획 실행 완료: ${results.filter((r) => r.success).length}/${results.length} 성공`,
      "info"
    );
    return { executed: true, results };
  }

  // 🎯 NEW: 조정 액션 실행
  async executeAdjustmentAction(action) {
    const coin = this.portfolio.coins.get(action.symbol);
    if (!coin) {
      return { executed: false, reason: "해당 코인을 보유하지 않음" };
    }

    const currentPrice = coin.currentPrice;
    const signal = {
      symbol: action.symbol,
      type: action.action === "ADD" ? "BUY" : "SELL",
      price: currentPrice,
      totalScore: 7.0, // 기본 점수
      reason: action.reason,
    };

    const adjustment = {
      action: action.action,
      ratio: action.ratio,
      reason: action.reason,
    };
    return await this.executePositionAdjustment(
      signal,
      adjustment,
      action.action
    );
  }

  // 🎯 NEW: 스왑 액션 실행
  async executeSwapAction(action) {
    const sellCoin = this.portfolio.coins.get(action.sellSymbol);
    if (!sellCoin) {
      return { executed: false, reason: "매도할 코인을 보유하지 않음" };
    }

    // 1단계: 기존 포지션 전량 매도
    const sellSignal = {
      symbol: action.sellSymbol,
      type: "SELL",
      price: sellCoin.currentPrice,
      totalScore: 6.0,
      reason: `포지션 교체를 위한 매도: ${action.reason}`,
    };

    const sellResult = await this.executeSell(
      action.sellSymbol,
      sellCoin.currentPrice,
      6.0,
      sellSignal
    );
    if (!sellResult.executed) {
      return { executed: false, reason: `매도 실패: ${sellResult.reason}` };
    }

    // 2단계: 새로운 코인 매수
    const buySignal = {
      symbol: action.buySymbol,
      type: "BUY",
      price: action.buyPrice || sellCoin.currentPrice, // 실제 가격 필요
      totalScore: 8.0,
      reason: `포지션 교체 매수: ${action.reason}`,
    };

    const buyResult = await this.executeNewEntry(
      buySignal,
      this.getPortfolioState()
    );
    if (!buyResult.executed) {
      this.log(
        `⚠️ 교체 매수 실패, 현금만 증가: ${buyResult.reason}`,
        "warning"
      );
    }

    return {
      executed: true,
      sellResult,
      buyResult: buyResult.executed ? buyResult : null,
      reason: action.reason,
    };
  }

  // 🎯 NEW: 신규 진입 액션 실행
  async executeNewEntryAction(action) {
    const signal = {
      symbol: action.symbol,
      type: "BUY",
      price: action.price || 0, // 실제 가격 필요
      totalScore: action.score,
      reason: action.reason,
    };

    return await this.executeNewEntry(signal, this.getPortfolioState());
  }
}

export const paperTradingEngine = new PaperTradingEngine();
export default PaperTradingEngine;
