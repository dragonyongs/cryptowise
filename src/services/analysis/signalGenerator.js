// src/services/analysis/signalGenerator.js
class SignalGenerator {
  constructor() {
    // 기본 설정값
    this.defaultStrategy = {
      rsiBuy: 30,
      rsiSell: 70,
      macdBullish: true,
      volumeThreshold: 1.5
    };
  }

  /**
   * 시장 데이터와 전략을 입력받아 신호 생성
   * @param {Object} marketData - 단일 날짜의 시장 데이터
   * @param {Object} strategy - 전략 설정
   * @returns {Promise<Object[]>} 생성된 신호 배열
   */
  async generateSignals(marketData, strategy = {}) {
    console.log('🔍 신호 생성 시작:', marketData?.symbol, 'RSI:', marketData?.rsi);
    
    // 데이터 유효성 검증
    if (!this.validateMarketData(marketData)) {
      console.log('❌ 유효하지 않은 데이터');
      return [];
    }

    const signals = [];
    
    try {
      // 전략 설정 (기본값 사용)
      const config = { ...this.defaultStrategy, ...strategy };
      
      // RSI 기반 매수 신호
      if (marketData.rsi < config.rsiBuy) {
        signals.push(this.createSignal({
          symbol: marketData.symbol,
          type: 'BUY',
          price: marketData.price,
          timestamp: marketData.timestamp,
          confidence: 70,
          reason: `RSI 과매도 (${marketData.rsi.toFixed(1)})`
        }));
        console.log('🟢 매수 신호 생성:', marketData.symbol);
      } 
      // RSI 기반 매도 신호
      else if (marketData.rsi > config.rsiSell) {
        signals.push(this.createSignal({
          symbol: marketData.symbol,
          type: 'SELL',
          price: marketData.price,
          timestamp: marketData.timestamp,
          confidence: 70,
          reason: `RSI 과매수 (${marketData.rsi.toFixed(1)})`
        }));
        console.log('🔴 매도 신호 생성:', marketData.symbol);
      }

      console.log(`📊 ${marketData.symbol} 신호 ${signals.length}개 생성됨`);
      return signals;
      
    } catch (error) {
      console.error('❌ 신호 생성 중 오류:', error);
      return [];
    }
  }

  /**
   * 고급 매수 신호 생성 (추후 확장용)
   * @param {Object} coinData - 코인 데이터
   * @returns {Object} 종합 신호 결과
   */
  generateAdvancedBuySignal(coinData) {
    if (!coinData) return { score: 0, signals: [] };

    const signals = {
      // 40% 기술적 분석
      technical: {
        rsi: coinData.rsi < 35,
        macd: coinData.macd?.signal === 'bullish',
        support: this.isPriceNearSupport(coinData, 0.05),
        volume: coinData.volume > (coinData.avgVolume || 0) * 1.5
      },
      
      // 30% 펀더멘털 분석 (기본값 설정)
      fundamental: {
        news: this.getPositiveNewsScore(coinData) > 0.6,
        development: this.getRecentDevelopment(coinData).length > 0,
        partnerships: this.getRecentPartnerships(coinData).length > 0,
        marketSentiment: this.getMarketSentiment(coinData) > 0.5
      },
      
      // 20% 시장 분석
      market: {
        bitcoinTrend: this.getBitcoinTrend() === 'bullish',
        altcoinSeason: this.isAltcoinSeason(),
        marketCap: this.getTotalMarketCapTrend() === 'rising',
        dominance: this.getBitcoinDominance() < 45
      },
      
      // 10% 리스크 분석
      risk: {
        correlation: this.getBitcoinCorrelation(coinData) < 0.8,
        volatility: this.getVolatility(coinData) < 0.15,
        drawdown: this.getCurrentDrawdown(coinData) < 0.3
      }
    };
    
    return this.calculateCompositeSignal(signals);
  }

  // ===== 유틸리티 메서드들 =====
  
  validateMarketData(data) {
    return data && 
           typeof data.rsi === 'number' && 
           typeof data.price === 'number' && 
           data.symbol && 
           data.timestamp;
  }

  createSignal({ symbol, type, price, timestamp, confidence, reason }) {
    return {
      symbol,
      type,
      price,
      timestamp,
      confidence,
      reason,
      id: `${symbol}_${type}_${Date.now()}`
    };
  }

  // ===== 분석 함수들 (기본 구현) =====
  
  isPriceNearSupport(coinData, threshold = 0.05) {
    // 임시 구현 - 실제로는 지지선 계산 로직 필요
    return Math.random() > 0.5;
  }

  getPositiveNewsScore(coinData) {
    // 임시 구현 - 실제로는 뉴스 감정 분석 필요
    return 0.7;
  }

  getRecentDevelopment(coinData) {
    // 임시 구현 - 실제로는 GitHub API 등에서 개발 활동 조회
    return [{ type: 'commit', date: new Date() }];
  }

  getRecentPartnerships(coinData) {
    // 임시 구현 - 실제로는 뉴스 파싱으로 파트너십 정보 수집
    return [];
  }

  getMarketSentiment(coinData) {
    // 임시 구현 - 실제로는 소셜 미디어 감정 분석
    return 0.6;
  }

  getBitcoinTrend() {
    // 임시 구현 - 실제로는 비트코인 가격 추세 분석
    return 'bullish';
  }

  isAltcoinSeason() {
    // 임시 구현 - 실제로는 비트코인 도미넌스 기반 계산
    return true;
  }

  getTotalMarketCapTrend() {
    // 임시 구현 - 실제로는 전체 시장 시가총액 추세 분석
    return 'rising';
  }

  getBitcoinDominance() {
    // 임시 구현 - 실제로는 CoinGecko API에서 도미넌스 조회
    return 42;
  }

  getBitcoinCorrelation(coinData) {
    // 임시 구현 - 실제로는 비트코인과의 상관관계 계산
    return 0.7;
  }

  getVolatility(coinData) {
    // 임시 구현 - 실제로는 표준편차 기반 변동성 계산
    return 0.12;
  }

  getCurrentDrawdown(coinData) {
    // 임시 구현 - 실제로는 최고점 대비 하락률 계산
    return 0.25;
  }

  calculateCompositeSignal(signals) {
    let score = 0;
    let details = [];

    // 기술적 분석 점수 (40%)
    const techScore = Object.values(signals.technical).filter(Boolean).length * 10;
    score += techScore;
    details.push(`기술적: ${techScore}점`);

    // 펀더멘털 분석 점수 (30%)
    const fundScore = Object.values(signals.fundamental).filter(Boolean).length * 7.5;
    score += fundScore;
    details.push(`펀더멘털: ${fundScore}점`);

    // 시장 분석 점수 (20%)
    const marketScore = Object.values(signals.market).filter(Boolean).length * 5;
    score += marketScore;
    details.push(`시장: ${marketScore}점`);

    // 리스크 분석 점수 (10%)
    const riskScore = Object.values(signals.risk).filter(Boolean).length * 2.5;
    score += riskScore;
    details.push(`리스크: ${riskScore}점`);

    return {
      score: Math.round(score),
      confidence: score > 70 ? 'HIGH' : score > 50 ? 'MEDIUM' : 'LOW',
      details,
      signals
    };
  }
}

export default new SignalGenerator();
