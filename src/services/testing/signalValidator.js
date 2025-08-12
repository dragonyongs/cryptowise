// src/services/testing/signalValidator.js
export class SignalValidator {
  validateSignal(signal, marketData, config) {
    if (!signal || !marketData) return { valid: false, reason: '데이터 누락' };

    // tuja-rojig.txt 기반: RSI, volume 등 검증
    const isValid = 
      (signal.type === 'buy' && marketData.rsi < 35 && marketData.volume > config.avgVolume * 1.5) ||
      (signal.type === 'sell' && marketData.rsi > 70 && marketData.volume < config.avgVolume * 0.7);

    return {
      valid: isValid,
      confidence: isValid ? 0.85 : 0,
      reason: isValid ? '신호 조건 충족' : '조건 불충족 (RSI/Volume)',
    };
  }
}
