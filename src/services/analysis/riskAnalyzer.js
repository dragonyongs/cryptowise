// src/services/riskAnalyzer.js
import { calculateVolatility, calculateMaxDrawdown } from '../utils/calculations.js';

export class RiskAnalyzer {
  analyzeRisk(coinData, position) {
    const volatility = calculateVolatility(coinData.prices);
    const maxDrawdown = calculateMaxDrawdown(coinData.prices);
    const correlation = this.calculateBitcoinCorrelation(coinData);

    const riskScore = (volatility * 0.4 + maxDrawdown * 0.3 + (1 - correlation) * 0.3) * 100;

    return {
      riskScore: Math.min(riskScore, 100),
      level: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
      details: { volatility, maxDrawdown, correlation },
    };
  }

  calculateBitcoinCorrelation(coinData) {
    // 간단한 상관계수 계산 (실제로는 더 정교한 로직 필요)
    return coinData.correlationBTC || 0.8; // tuja-rojig.txt 기반 기본값
  }
}
