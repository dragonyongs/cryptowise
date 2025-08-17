class PaperTradingEngine {
  constructor(initialBalance = 1840000) {
    this.initialBalance = initialBalance;
    this.portfolio = {
      krw: initialBalance,
      coins: [],
      totalValue: initialBalance,
      trades: [],
      recentTrades: [],
      performance: {
        totalReturn: 0,
        winRate: 0,
        maxDrawdown: 0,
        totalTrades: 0,
        winTrades: 0,
        sharpeRatio: 0,
        profitFactor: 0,
      },
      // ✅ 추가된 메타데이터
      createdAt: new Date(),
      lastUpdated: new Date(),
      maxPortfolioValue: initialBalance,
      dailyReturns: [], // 샤프 비율 계산용
    };

    // ✅ 거래 설정
    this.tradingFees = {
      maker: 0.0005, // 0.05% 업비트 수수료
      taker: 0.0005,
    };

    // ✅ 리스크 관리 설정
    this.riskSettings = {
      maxPositionSize: 0.3, // 최대 30% 포지션
      maxDrawdownAlert: 0.15, // 15% 손실 시 알림
      emergencyStopLoss: 0.25, // 25% 손실 시 긴급 정지
    };
  }

  // ✅ 개선된 executeSignal
  async executeSignal(signal, config) {
    try {
      // 기본 검증
      const validation = this.validateSignal(signal, config);
      if (!validation.isValid) {
        return { executed: false, reason: validation.reason };
      }

      // 리스크 체크
      const riskCheck = this.checkRiskLimits(signal, config);
      if (!riskCheck.passed) {
        return { executed: false, reason: riskCheck.reason };
      }

      const positionSize = this.calculatePositionSize(signal, config);
      if (positionSize <= 0) {
        return { executed: false, reason: "Invalid position size" };
      }

      // ✅ 수수료 포함 거래 계산
      const trade = this.createTrade(signal, positionSize);
      const feeAdjustedTrade = this.applyTradingFees(trade);

      // 포트폴리오 업데이트
      this.updatePortfolio(feeAdjustedTrade);
      this.portfolio.trades.push(feeAdjustedTrade);
      this.addToRecentTrades(feeAdjustedTrade);

      // 성과 계산 및 상태 업데이트
      this.calculatePerformance();
      this.updatePortfolioMetadata();

      // ✅ 리스크 모니터링
      this.checkEmergencyConditions();

      return {
        executed: true,
        trade: feeAdjustedTrade,
        portfolioAfter: this.getPortfolioSummary(),
      };
    } catch (error) {
      console.error("거래 실행 중 오류:", error);
      return {
        executed: false,
        reason: `거래 실행 오류: ${error.message}`,
      };
    }
  }

  // ✅ 개선된 검증 시스템
  validateSignal(signal, config) {
    // 기본 검증
    if (!signal || !config) {
      return { isValid: false, reason: "신호 또는 설정이 없습니다" };
    }

    if (!config.isActive) {
      return { isValid: false, reason: "비활성화된 코인입니다" };
    }

    if (signal.type === "BUY" && !config.buySettings?.enabled) {
      return { isValid: false, reason: "매수 설정이 비활성화되어 있습니다" };
    }

    if (signal.type === "SELL" && !config.sellSettings?.enabled) {
      return { isValid: false, reason: "매도 설정이 비활성화되어 있습니다" };
    }

    // ✅ 가격 유효성 검증
    if (!signal.price || signal.price <= 0) {
      return { isValid: false, reason: "유효하지 않은 가격입니다" };
    }

    // ✅ 매도 시 보유량 확인
    if (signal.type === "SELL") {
      const holding = this.portfolio.coins.find(
        (c) => c.symbol === signal.symbol
      );
      if (!holding || holding.quantity <= 0) {
        return { isValid: false, reason: "보유하지 않은 코인입니다" };
      }
    }

    return { isValid: true };
  }

  // ✅ 새로운 리스크 체크 시스템
  checkRiskLimits(signal, config) {
    // 현재 드로다운 체크
    const currentDrawdown = this.getCurrentDrawdown();
    if (currentDrawdown > this.riskSettings.maxDrawdownAlert) {
      return {
        passed: false,
        reason: `높은 드로다운 상태 (${(currentDrawdown * 100).toFixed(1)}%)`,
      };
    }

    // 매수 시 포지션 사이즈 제한
    if (signal.type === "BUY") {
      const positionRatio =
        this.calculatePositionSize(signal, config) / this.portfolio.totalValue;
      if (positionRatio > this.riskSettings.maxPositionSize) {
        return {
          passed: false,
          reason: `포지션 크기 초과 (${(positionRatio * 100).toFixed(1)}% > ${this.riskSettings.maxPositionSize * 100}%)`,
        };
      }

      // 현금 부족 체크
      const requiredAmount = this.calculatePositionSize(signal, config);
      if (requiredAmount > this.portfolio.krw) {
        return {
          passed: false,
          reason: `보유 현금 부족 (필요: ${requiredAmount.toLocaleString()}원, 보유: ${this.portfolio.krw.toLocaleString()}원)`,
        };
      }
    }

    return { passed: true };
  }

  // ✅ 수수료 적용 시스템
  applyTradingFees(trade) {
    const feeRate = this.tradingFees.taker;
    const fee = trade.amount * feeRate;

    return {
      ...trade,
      fee: fee,
      feeRate: feeRate,
      netAmount:
        trade.action === "BUY" ? trade.amount + fee : trade.amount - fee,
    };
  }

  // ✅ 향상된 성과 계산
  calculatePerformance() {
    const initialBalance = this.initialBalance;

    // 총 수익률
    this.portfolio.performance.totalReturn =
      ((this.portfolio.totalValue - initialBalance) / initialBalance) * 100;

    // 거래 통계
    const sellTrades = this.portfolio.trades.filter(
      (trade) => trade.action === "SELL"
    );
    const profitTrades = sellTrades.filter(
      (trade) => trade.profitRate && trade.profitRate > 0
    );

    this.portfolio.performance.totalTrades = sellTrades.length;
    this.portfolio.performance.winTrades = profitTrades.length;
    this.portfolio.performance.winRate =
      sellTrades.length > 0
        ? (profitTrades.length / sellTrades.length) * 100
        : 0;

    // ✅ 최대 드로다운 계산
    this.calculateMaxDrawdown();

    // ✅ 프로핏 팩터 계산
    this.calculateProfitFactor(sellTrades);

    // ✅ 샤프 비율 계산 (단순화된 버전)
    this.calculateSharpeRatio();
  }

  // ✅ 최대 드로다운 계산
  calculateMaxDrawdown() {
    if (this.portfolio.maxPortfolioValue < this.portfolio.totalValue) {
      this.portfolio.maxPortfolioValue = this.portfolio.totalValue;
    }

    const currentDrawdown =
      (this.portfolio.maxPortfolioValue - this.portfolio.totalValue) /
      this.portfolio.maxPortfolioValue;

    if (currentDrawdown > this.portfolio.performance.maxDrawdown) {
      this.portfolio.performance.maxDrawdown = currentDrawdown * 100;
    }
  }

  // ✅ 현재 드로다운 반환
  getCurrentDrawdown() {
    return (
      (this.portfolio.maxPortfolioValue - this.portfolio.totalValue) /
      this.portfolio.maxPortfolioValue
    );
  }

  // ✅ 프로핏 팩터 계산
  calculateProfitFactor(sellTrades) {
    const profitTrades = sellTrades.filter((t) => t.profitRate > 0);
    const lossTrades = sellTrades.filter((t) => t.profitRate <= 0);

    const totalProfit = profitTrades.reduce(
      (sum, t) => sum + (t.amount * t.profitRate) / 100,
      0
    );
    const totalLoss = Math.abs(
      lossTrades.reduce((sum, t) => sum + (t.amount * t.profitRate) / 100, 0)
    );

    this.portfolio.performance.profitFactor =
      totalLoss > 0 ? totalProfit / totalLoss : 0;
  }

  // ✅ 샤프 비율 계산 (단순화)
  calculateSharpeRatio() {
    const returns = this.portfolio.dailyReturns;
    if (returns.length < 2) return;

    const avgReturn = returns.reduce((a, b) => a + b) / returns.length;
    const variance =
      returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) /
      returns.length;
    const stdDev = Math.sqrt(variance);

    this.portfolio.performance.sharpeRatio =
      stdDev > 0 ? avgReturn / stdDev : 0;
  }

  // ✅ 거래 생성 헬퍼
  createTrade(signal, positionSize) {
    return {
      id: `${Date.now()}_${signal.symbol}_${signal.type}`,
      symbol: signal.symbol,
      action: signal.type,
      price: signal.price,
      quantity:
        signal.type === "BUY" ? positionSize / signal.price : positionSize,
      amount:
        signal.type === "BUY" ? positionSize : positionSize * signal.price,
      timestamp: new Date(),
      executed: true,
      reason: signal.reason || `${signal.type} 신호`,
      confidence: signal.confidence || "medium",
      signalScore: signal.totalScore || 0,
    };
  }

  // ✅ 최근 거래 관리
  addToRecentTrades(trade) {
    this.portfolio.recentTrades.unshift(trade);
    if (this.portfolio.recentTrades.length > 100) {
      this.portfolio.recentTrades = this.portfolio.recentTrades.slice(0, 100);
    }
  }

  // ✅ 포트폴리오 메타데이터 업데이트
  updatePortfolioMetadata() {
    this.portfolio.lastUpdated = new Date();

    // 일일 수익률 추가 (하루에 한 번만)
    const today = new Date().toDateString();
    const lastUpdateDate = new Date(this.portfolio.lastUpdated).toDateString();

    if (today !== lastUpdateDate) {
      const dailyReturn = this.portfolio.performance.totalReturn;
      this.portfolio.dailyReturns.push(dailyReturn);

      // 최대 30일 데이터만 보관
      if (this.portfolio.dailyReturns.length > 30) {
        this.portfolio.dailyReturns = this.portfolio.dailyReturns.slice(-30);
      }
    }
  }

  // ✅ 긴급 상황 체크
  checkEmergencyConditions() {
    const currentDrawdown = this.getCurrentDrawdown();

    if (currentDrawdown > this.riskSettings.emergencyStopLoss) {
      console.warn(
        `🚨 긴급 손실 한계 도달: ${(currentDrawdown * 100).toFixed(1)}%`
      );
      return {
        emergency: true,
        reason: "최대 손실 한계 초과",
        action: "모든 포지션 정리 권장",
      };
    }

    return { emergency: false };
  }

  // ✅ 향상된 포트폴리오 요약
  getPortfolioSummary() {
    this.updatePortfolioValue();
    return {
      ...this.portfolio,
      // 추가 통계
      totalFees: this.portfolio.trades.reduce(
        (sum, t) => sum + (t.fee || 0),
        0
      ),
      activePositions: this.portfolio.coins.length,
      cashRatio: (
        (this.portfolio.krw / this.portfolio.totalValue) *
        100
      ).toFixed(1),
      riskMetrics: {
        currentDrawdown: (this.getCurrentDrawdown() * 100).toFixed(2),
        maxDrawdown: this.portfolio.performance.maxDrawdown.toFixed(2),
        riskLevel: this.assessRiskLevel(),
      },
    };
  }

  // ✅ 리스크 레벨 평가
  assessRiskLevel() {
    const drawdown = this.getCurrentDrawdown();
    const cashRatio = this.portfolio.krw / this.portfolio.totalValue;

    if (drawdown > 0.2 || cashRatio < 0.1) return "HIGH";
    if (drawdown > 0.1 || cashRatio < 0.2) return "MEDIUM";
    return "LOW";
  }

  // ✅ 포트폴리오 상태 저장/로드
  exportPortfolio() {
    return JSON.stringify(this.portfolio, null, 2);
  }

  importPortfolio(portfolioJson) {
    try {
      const imported = JSON.parse(portfolioJson);
      this.portfolio = { ...this.portfolio, ...imported };
      this.updatePortfolioValue();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ✅ 거래 통계 조회
  getTradingStats(days = 30) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentTrades = this.portfolio.trades.filter(
      (t) => new Date(t.timestamp) > cutoffDate
    );

    return {
      period: `최근 ${days}일`,
      totalTrades: recentTrades.length,
      buyTrades: recentTrades.filter((t) => t.action === "BUY").length,
      sellTrades: recentTrades.filter((t) => t.action === "SELL").length,
      avgTradeSize:
        recentTrades.reduce((sum, t) => sum + t.amount, 0) /
          recentTrades.length || 0,
      totalFees: recentTrades.reduce((sum, t) => sum + (t.fee || 0), 0),
    };
  }
}

export const paperTradingEngine = new PaperTradingEngine();
