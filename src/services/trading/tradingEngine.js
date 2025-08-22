// src/services/trading/tradingEngine.js - 동적 포지션 관리 통합 실전 거래 엔진

import { dynamicPositionManager } from "../portfolio/dynamicPositionManager.js";
import { positionSizing } from "../portfolio/positionSizing.js";
import { cashManagement } from "../portfolio/cashManagement.js";
import { paperTradingEngine } from "../testing/paperTradingEngine.js";

/**
 * 통합 거래 엔진 - 페이퍼/실전 거래 통합 관리
 * 동적 포지션 관리 시스템 완전 통합
 */
export class UnifiedTradingEngine {
  constructor(initialMode = "paper") {
    this.mode = initialMode; // "paper" | "live"
    this.isActive = false;

    // 페이퍼 트레이딩 엔진 (항상 사용)
    this.paperEngine = paperTradingEngine;

    // 실전 거래 엔진 (나중에 구현)
    this.liveEngine = null;

    // 동적 포지션 관리 설정
    this.dynamicPositionEnabled = true;
    this.currentMarketCondition = "NEUTRAL";

    // 거래 설정
    this.tradingConfig = {
      maxDailyTrades: 8,
      minSignalScore: 7.0,
      emergencyStopEnabled: true,
      riskManagementEnabled: true,
    };

    // 통계 및 모니터링
    this.stats = {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfit: 0,
      currentDrawdown: 0,
      lastTradeTime: null,
    };

    this.log("🚀 통합 거래 엔진 초기화 완료", "info");
  }

  // 🎯 모드 변경
  async setMode(mode) {
    if (this.isActive) {
      throw new Error("거래 중에는 모드를 변경할 수 없습니다");
    }

    const previousMode = this.mode;
    this.mode = mode;

    if (mode === "paper") {
      this.paperEngine.setActive(true);
    } else if (mode === "live") {
      if (!this.liveEngine) {
        throw new Error("실전 거래 엔진이 아직 구현되지 않았습니다");
      }
      this.paperEngine.setActive(false);
    }

    this.log(`🔄 거래 모드 변경: ${previousMode} → ${mode}`, "info");
    return true;
  }

  // 🎯 엔진 활성화/비활성화
  async setActive(isActive) {
    this.isActive = isActive;

    if (this.mode === "paper") {
      this.paperEngine.setActive(isActive);
    } else if (this.liveEngine) {
      await this.liveEngine.setActive(isActive);
    }

    this.log(`🔄 거래 엔진 ${isActive ? "활성화" : "비활성화"}`, "info");
    return true;
  }

  // 🎯 동적 포지션 관리 설정
  setDynamicPositionEnabled(enabled) {
    this.dynamicPositionEnabled = enabled;

    if (this.mode === "paper") {
      this.paperEngine.setDynamicPositionEnabled(enabled);
    }

    this.log(`🔄 동적 포지션 관리 ${enabled ? "활성화" : "비활성화"}`, "info");
    return true;
  }

  // 🎯 시장 상황 업데이트
  updateMarketCondition(condition) {
    this.currentMarketCondition = condition;

    if (this.mode === "paper") {
      this.paperEngine.updateMarketCondition(condition);
    }

    this.log(`📊 시장 상황 업데이트: ${condition}`, "info");
  }

  // 🎯 신호 실행 (통합)
  async executeSignal(signal) {
    if (!this.isActive) {
      return { executed: false, reason: "거래 엔진이 비활성화됨" };
    }

    try {
      this.log(
        `🎯 신호 실행 시작: ${signal.symbol} ${signal.type} (${this.mode} 모드)`,
        "debug"
      );

      // 사전 검증
      const validation = await this.validateSignal(signal);
      if (!validation.isValid) {
        this.stats.failedTrades++;
        return { executed: false, reason: validation.reason };
      }

      let result;

      if (this.mode === "paper") {
        result = await this.paperEngine.executeSignal(signal);
      } else if (this.mode === "live" && this.liveEngine) {
        result = await this.liveEngine.executeSignal(signal);
      } else {
        return { executed: false, reason: "사용 가능한 거래 엔진이 없습니다" };
      }

      // 통계 업데이트
      this.updateStats(result);

      if (result.executed) {
        this.log(
          `✅ 신호 실행 성공: ${signal.symbol} ${signal.type}`,
          "success"
        );
      } else {
        this.log(`❌ 신호 실행 실패: ${result.reason}`, "warning");
      }

      return result;
    } catch (error) {
      this.stats.failedTrades++;
      this.log(`💥 신호 실행 오류: ${error.message}`, "error");
      return { executed: false, reason: `시스템 오류: ${error.message}` };
    }
  }

  // 🎯 신호 검증
  async validateSignal(signal) {
    // 기본 검증
    if (!signal || !signal.symbol || !signal.type) {
      return { isValid: false, reason: "필수 신호 정보 누락" };
    }

    if (!["BUY", "SELL"].includes(signal.type)) {
      return { isValid: false, reason: "유효하지 않은 신호 타입" };
    }

    // 점수 검증
    if ((signal.totalScore || 0) < this.tradingConfig.minSignalScore) {
      return {
        isValid: false,
        reason: `신호 점수 부족: ${signal.totalScore} < ${this.tradingConfig.minSignalScore}`,
      };
    }

    // 일일 거래 한도 검증
    if (this.stats.dailyTrades >= this.tradingConfig.maxDailyTrades) {
      return {
        isValid: false,
        reason: `일일 거래 한도 초과: ${this.stats.dailyTrades}/${this.tradingConfig.maxDailyTrades}`,
      };
    }

    // 비상 정지 확인
    if (this.tradingConfig.emergencyStopEnabled && this.isEmergencyStop()) {
      return { isValid: false, reason: "비상 정지 활성화됨" };
    }

    return { isValid: true };
  }

  // 🎯 비상 정지 조건 확인
  isEmergencyStop() {
    // 과도한 손실 확인
    const currentPortfolio = this.getCurrentPortfolio();
    if (currentPortfolio && currentPortfolio.totalProfitRate < -20) {
      this.log("⚠️ 비상 정지: 총 손실 20% 초과", "error");
      return true;
    }

    // 연속 실패 확인
    const recentTrades = this.getRecentTrades(10);
    const failureRate =
      recentTrades.filter((t) => !t.executed).length / recentTrades.length;
    if (failureRate > 0.8) {
      this.log("⚠️ 비상 정지: 최근 거래 실패율 80% 초과", "error");
      return true;
    }

    return false;
  }

  // 🎯 통계 업데이트
  updateStats(result) {
    this.stats.totalTrades++;
    this.stats.lastTradeTime = new Date();

    if (result.executed) {
      this.stats.successfulTrades++;
      if (result.trade && result.trade.profitRate) {
        this.stats.totalProfit += result.trade.profitRate;
      }
    } else {
      this.stats.failedTrades++;
    }

    // 일일 거래 수 업데이트
    const today = new Date().toDateString();
    if (this.stats.lastResetDate !== today) {
      this.stats.dailyTrades = 1;
      this.stats.lastResetDate = today;
    } else {
      this.stats.dailyTrades = (this.stats.dailyTrades || 0) + 1;
    }
  }

  // 🎯 포트폴리오 조회 (통합)
  async getCurrentPortfolio() {
    if (this.mode === "paper") {
      return this.paperEngine.getPortfolioSummary();
    } else if (this.mode === "live" && this.liveEngine) {
      return await this.liveEngine.getPortfolio();
    }
    return null;
  }

  // 🎯 포지션 최적화 계획 생성
  async generateOptimizationPlan(signals) {
    if (!this.dynamicPositionEnabled) {
      return { success: false, reason: "동적 포지션 관리가 비활성화됨" };
    }

    try {
      if (this.mode === "paper") {
        const plan = await this.paperEngine.generateOptimizationPlan(signals);
        return { success: true, plan };
      } else if (this.mode === "live" && this.liveEngine) {
        // 실전 모드 구현 필요
        return {
          success: false,
          reason: "실전 모드 최적화 계획은 아직 구현되지 않음",
        };
      }

      return { success: false, reason: "사용 가능한 엔진이 없습니다" };
    } catch (error) {
      this.log(`최적화 계획 생성 실패: ${error.message}`, "error");
      return { success: false, reason: error.message };
    }
  }

  // 🎯 최적화 계획 실행
  async executeOptimizationPlan(plan) {
    if (!this.dynamicPositionEnabled) {
      return { success: false, reason: "동적 포지션 관리가 비활성화됨" };
    }

    try {
      if (this.mode === "paper") {
        const result = await this.paperEngine.executeOptimizationPlan(plan);
        return { success: result.executed, result };
      } else if (this.mode === "live" && this.liveEngine) {
        // 실전 모드 구현 필요
        return {
          success: false,
          reason: "실전 모드 계획 실행은 아직 구현되지 않음",
        };
      }

      return { success: false, reason: "사용 가능한 엔진이 없습니다" };
    } catch (error) {
      this.log(`최적화 계획 실행 실패: ${error.message}`, "error");
      return { success: false, reason: error.message };
    }
  }

  // 🎯 현금 비중 최적화
  async optimizeCashRatio() {
    if (!this.dynamicPositionEnabled) {
      return { success: false, reason: "동적 포지션 관리가 비활성화됨" };
    }

    try {
      const portfolio = await this.getCurrentPortfolio();
      if (!portfolio) {
        return {
          success: false,
          reason: "포트폴리오 정보를 가져올 수 없습니다",
        };
      }

      const optimalRatio = cashManagement.calculateOptimalCashRatio(
        this.currentMarketCondition,
        portfolio.dynamicSummary?.portfolioHealth || {},
        { fearGreedIndex: 50, bitcoinDominance: 50, volatility: 0.5 }
      );

      const adjustment = cashManagement.handleCashImbalance(
        portfolio.cashRatio / 100,
        optimalRatio,
        portfolio
      );

      this.log(
        `💰 현금 비중 최적화: 현재 ${portfolio.cashRatio}% → 목표 ${(optimalRatio * 100).toFixed(1)}%`,
        "info"
      );

      return {
        success: true,
        currentRatio: portfolio.cashRatio,
        optimalRatio: optimalRatio * 100,
        adjustment,
      };
    } catch (error) {
      this.log(`현금 비중 최적화 실패: ${error.message}`, "error");
      return { success: false, reason: error.message };
    }
  }

  // 🎯 포지션 분석
  async analyzePositions() {
    try {
      const portfolio = await this.getCurrentPortfolio();
      if (!portfolio || !portfolio.positions) {
        return { success: false, reason: "포지션 정보를 가져올 수 없습니다" };
      }

      const analysis = {
        totalPositions: portfolio.positions.length,
        profitablePositions: portfolio.positions.filter((p) => p.profitRate > 0)
          .length,
        lossPositions: portfolio.positions.filter((p) => p.profitRate < 0)
          .length,
        tierBreakdown: {
          TIER1: portfolio.positions.filter((p) => p.tier === "TIER1").length,
          TIER2: portfolio.positions.filter((p) => p.tier === "TIER2").length,
          TIER3: portfolio.positions.filter((p) => p.tier === "TIER3").length,
        },
        averageProfit:
          portfolio.positions.reduce((sum, p) => sum + p.profitRate, 0) /
          portfolio.positions.length,
        totalValue: portfolio.investedValue,
        recommendations: [],
      };

      // 추천사항 생성
      if (analysis.lossPositions > analysis.profitablePositions) {
        analysis.recommendations.push(
          "손실 포지션이 수익 포지션보다 많습니다. 리스크 관리를 강화하세요."
        );
      }

      if (analysis.tierBreakdown.TIER3 > analysis.tierBreakdown.TIER1) {
        analysis.recommendations.push(
          "고위험 TIER3 포지션이 안전한 TIER1보다 많습니다. 포트폴리오 재조정을 고려하세요."
        );
      }

      return { success: true, analysis };
    } catch (error) {
      this.log(`포지션 분석 실패: ${error.message}`, "error");
      return { success: false, reason: error.message };
    }
  }

  // 🎯 리스크 관리
  async performRiskCheck() {
    try {
      const portfolio = await this.getCurrentPortfolio();
      if (!portfolio) {
        return { riskLevel: "UNKNOWN", issues: ["포트폴리오 정보 없음"] };
      }

      const issues = [];
      let riskLevel = "LOW";

      // 손실 확인
      if (portfolio.totalProfitRate < -10) {
        issues.push(
          `총 손실 ${Math.abs(portfolio.totalProfitRate).toFixed(1)}%`
        );
        riskLevel = "HIGH";
      } else if (portfolio.totalProfitRate < -5) {
        issues.push(
          `총 손실 ${Math.abs(portfolio.totalProfitRate).toFixed(1)}%`
        );
        riskLevel = "MEDIUM";
      }

      // 현금 비중 확인
      if (portfolio.cashRatio < 10) {
        issues.push(`현금 비중 부족: ${portfolio.cashRatio}%`);
        if (riskLevel === "LOW") riskLevel = "MEDIUM";
      }

      // 포지션 집중도 확인
      if (portfolio.positions && portfolio.positions.length > 0) {
        const maxPositionRatio = Math.max(
          ...portfolio.positions.map(
            (p) => (p.currentValue / portfolio.totalValue) * 100
          )
        );

        if (maxPositionRatio > 30) {
          issues.push(`과도한 포지션 집중: ${maxPositionRatio.toFixed(1)}%`);
          riskLevel = "HIGH";
        }
      }

      // 연속 거래 실패 확인
      const recentTrades = this.getRecentTrades(5);
      const recentFailures = recentTrades.filter((t) => !t.executed).length;
      if (recentFailures >= 3) {
        issues.push(`최근 ${recentFailures}회 연속 거래 실패`);
        if (riskLevel === "LOW") riskLevel = "MEDIUM";
      }

      return {
        riskLevel,
        issues,
        recommendations: this.generateRiskRecommendations(riskLevel, issues),
      };
    } catch (error) {
      this.log(`리스크 확인 실패: ${error.message}`, "error");
      return { riskLevel: "ERROR", issues: [error.message] };
    }
  }

  // 🎯 리스크 추천사항 생성
  generateRiskRecommendations(riskLevel, issues) {
    const recommendations = [];

    if (riskLevel === "HIGH") {
      recommendations.push("즉시 포지션 축소를 고려하세요");
      recommendations.push("손절매 라인을 엄격히 적용하세요");
      recommendations.push("새로운 진입을 중단하고 관망하세요");
    } else if (riskLevel === "MEDIUM") {
      recommendations.push("포지션 크기를 줄이고 신중하게 거래하세요");
      recommendations.push("현금 비중을 늘려 안정성을 높이세요");
    } else {
      recommendations.push("현재 리스크 수준은 양호합니다");
      recommendations.push("지속적인 모니터링을 유지하세요");
    }

    return recommendations;
  }

  // 🎯 거래 기록 조회
  getRecentTrades(count = 10) {
    if (this.mode === "paper") {
      const portfolio = this.paperEngine.getPortfolioSummary();
      return portfolio ? portfolio.trades.slice(0, count) : [];
    }
    return [];
  }

  // 🎯 설정 업데이트
  updateConfig(newConfig) {
    this.tradingConfig = { ...this.tradingConfig, ...newConfig };
    this.log(`⚙️ 거래 설정 업데이트: ${JSON.stringify(newConfig)}`, "info");
  }

  // 🎯 상태 정보 반환
  getEngineStatus() {
    return {
      mode: this.mode,
      isActive: this.isActive,
      dynamicPositionEnabled: this.dynamicPositionEnabled,
      currentMarketCondition: this.currentMarketCondition,
      config: this.tradingConfig,
      stats: this.stats,
      lastUpdate: new Date(),
    };
  }

  // 🎯 엔진 리셋
  async reset() {
    this.isActive = false;
    this.stats = {
      totalTrades: 0,
      successfulTrades: 0,
      failedTrades: 0,
      totalProfit: 0,
      currentDrawdown: 0,
      lastTradeTime: null,
    };

    if (this.mode === "paper") {
      this.paperEngine.resetPortfolio();
    }

    this.log("🔄 거래 엔진 리셋 완료", "info");
  }

  // 🎯 로깅
  log(message, level = "info") {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[통합엔진-${this.mode.toUpperCase()}]`;
    console.log(`${timestamp} ${prefix} ${message}`);
  }
}

// 싱글톤 인스턴스
export const unifiedTradingEngine = new UnifiedTradingEngine();
export default UnifiedTradingEngine;
