// src/services/analysis/signalGenerator.js
class SignalGenerator {
  constructor() {
    // TechnicalAnalyzer 임포트 제거하고 단순화
  }

  /**
   * @param {Object} marketData - 단일 날짜의 시장 데이터
   * @param {Object} strategy - 전략 설정  
   * @returns {Promise<Object[]>} - 생성된 신호 배열
   */
  async generateSignals(marketData, strategy = {}) {
    console.log('🔍 신호 생성 시작:', marketData.symbol, 'RSI:', marketData.rsi);
    
    if (!marketData || !marketData.rsi) {
      console.log('❌ 유효하지 않은 데이터');
      return [];
    }

    const signals = [];
    
    try {
      // RSI 기반 매수 신호
      if (marketData.rsi < (strategy.rsiBuy || 30)) {
        signals.push({
          symbol: marketData.symbol,
          type: 'BUY',
          price: marketData.price,
          timestamp: marketData.timestamp,
          confidence: 70,
          reason: `RSI 과매도 (${marketData.rsi.toFixed(1)})`
        });
        console.log('🟢 매수 신호 생성:', marketData.symbol);
      }
      
      // RSI 기반 매도 신호  
      else if (marketData.rsi > (strategy.rsiSell || 70)) {
        signals.push({
          symbol: marketData.symbol,
          type: 'SELL',
          price: marketData.price,
          timestamp: marketData.timestamp,
          confidence: 70,
          reason: `RSI 과매수 (${marketData.rsi.toFixed(1)})`
        });
        console.log('🔴 매도 신호 생성:', marketData.symbol);
      }

      console.log(`📊 ${marketData.symbol} 신호 ${signals.length}개 생성됨`);
      return signals;
      
    } catch (error) {
      console.error('❌ 신호 생성 중 오류:', error);
      return [];
    }
  }
}

export default new SignalGenerator();
