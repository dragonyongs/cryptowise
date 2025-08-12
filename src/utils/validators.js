// src/utils/validators.js
export function validateCoinConfig(config) {
  if (!config.symbol || typeof config.buyPercentage !== 'number' || config.buyPercentage < 0 || config.buyPercentage > 100) {
    return { valid: false, error: '잘못된 buyPercentage' };
  }
  // 추가 검증 (tuja-rojig.txt 기반)
  return { valid: true };
}

export function validateSignal(signal) {
  return signal.confidence > 0.5 && signal.reason; // 기본 threshold
}
