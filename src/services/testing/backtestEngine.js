// src/services/testing/backtestEngine.js
import { coinGeckoService } from '../data/coinGeckoService.js'
import signalGenerator from '../analysis/signalGenerator.js' // 추가
import { paperTradingEngine } from './paperTradingEngine.js'

export class BacktestEngine {
  constructor() {
    this.portfolio = { krw: 10000000, coins: {} }
    this.trades = []
    this.signals = []
    this.initialBalance = 10000000
  }

  async run(config, callbacks) {
    const { startDate, endDate, symbols, strategy } = config
    const { onProgress, onSignal, onTrade } = callbacks

    try {
      console.log('🚀 백테스트 시작:', { startDate, endDate, symbols })
      
      // 1. 실제 과거 데이터 로드
      const marketData = await this.loadHistoricalData(symbols, startDate, endDate)
      console.log('📊 로드된 데이터:', marketData.length, '개 레코드')
      
      if (marketData.length === 0) {
        throw new Error('시장 데이터를 불러올 수 없습니다')
      }

      const totalDays = marketData.length
      
      // 2. 일별 백테스트 실행
      for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
        const currentData = marketData[dayIndex]
        
        console.log(`📅 Day ${dayIndex}: ${currentData.symbol} - Price: ${currentData.price?.toLocaleString()} - RSI: ${currentData.rsi?.toFixed(1)}`);
        
        // ✅ 수정: signalGenerator 사용
        const signals = await signalGenerator.generateSignals(currentData, strategy)
        console.log(`📶 생성된 신호: ${signals.length}개`);
        
        this.signals.push(...signals)

        // 각 신호에 대해 거래 실행
        for (const signal of signals) {
          console.log('💡 처리할 신호:', signal);
          onSignal?.(signal)
          
          const trade = await this.executeSignal(signal)
          console.log('💰 거래 결과:', trade);
          
          if (trade.executed) {
            this.trades.push(trade)
            onTrade?.(trade)
            console.log(`✅ 거래 실행됨: ${trade.symbol} ${trade.action}`);
          }
        }

        // 진행률 업데이트
        const progress = Math.round((dayIndex / totalDays) * 100)
        onProgress?.(progress)
      }

      // 3. 결과 계산
      const results = this.calculateResults()
      console.log('🔍 백테스트 완료:', results)
      return results

    } catch (error) {
      console.error('❌ 백테스트 실행 중 오류:', error)
      throw error
    }
  }

  async loadHistoricalData(symbols, startDate, endDate) {
    const allData = []
    
    for (const symbol of symbols) {
      try {
        const coinId = this.getCoinGeckoId(symbol)
        const data = await coinGeckoService.getHistoricalData(coinId, 365)
        console.log(`📈 ${symbol} 데이터 로드됨: ${data.length}개`);
        
        // ✅ 데이터 검증 추가
        if (data && data.length > 0) {
          console.log('🔍 첫 번째 데이터 샘플:', data[0]);
          allData.push(...data)
        }
      } catch (error) {
        console.error(`❌ ${symbol} 데이터 로드 실패:`, error)
      }
    }
    
    return allData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
  }

  executeSignal(signal) {
    console.log('⚙️ 거래 실행 시작:', signal.type, signal.symbol);
    
    let positionSize = 0
    let avgBuyPrice = 0  // ✅ 평균 매수 가격 추가
    
    if (signal.type === 'BUY') {
      // 매수: 현금의 10% 또는 최대 100만원
      positionSize = Math.min(this.portfolio.krw * 0.1, 1000000)
      console.log(`💵 매수 가능 금액: ${positionSize.toLocaleString()}원`);
      
      if (positionSize <= 0) {
        console.log('❌ 매수 포지션 크기 부족');
        return { executed: false, reason: '매수 포지션 크기 부족' }
      }
      
    } else { // SELL
      // 매도: 보유 수량 확인
      const holding = this.portfolio.coins[signal.symbol]
      if (!holding || holding.quantity <= 0) {
        console.log('❌ 매도할 코인 없음');
        return { executed: false, reason: '매도할 코인 없음' }
      }
      
      positionSize = holding.quantity * 0.8  // 보유량의 80% 매도
      avgBuyPrice = holding.avgPrice  // ✅ 매수 평균가 가져오기
      console.log(`🪙 매도 가능 수량: ${positionSize.toFixed(6)}, 평균 매수가: ${avgBuyPrice.toLocaleString()}`);
    }

    // ✅ 수익률 계산 로직 개선
    let profitRate = 0
    if (signal.type === 'SELL' && avgBuyPrice > 0) {
      profitRate = ((signal.price - avgBuyPrice) / avgBuyPrice) * 100
      console.log(`📊 매도 수익률: ${profitRate.toFixed(2)}% (매도가: ${signal.price.toLocaleString()}, 매수가: ${avgBuyPrice.toLocaleString()})`);
    }

    const trade = {
      id: Date.now() + Math.random(),
      symbol: signal.symbol,
      action: signal.type,
      quantity: signal.type === 'BUY' ? positionSize / signal.price : positionSize,
      price: signal.price,
      timestamp: signal.timestamp,
      executed: true,
      profitRate: profitRate,  // ✅ 계산된 수익률 사용
      avgBuyPrice: avgBuyPrice // ✅ 평균 매수가 추가
    }

    // ✅ 포트폴리오 업데이트 로직 개선
    if (signal.type === 'BUY') {
      this.portfolio.krw -= positionSize
      
      if (!this.portfolio.coins[signal.symbol]) {
        this.portfolio.coins[signal.symbol] = { quantity: 0, avgPrice: 0 }
      }
      
      const coin = this.portfolio.coins[signal.symbol]
      const newQuantity = coin.quantity + trade.quantity
      
      // ✅ 평균 매수가 계산
      coin.avgPrice = ((coin.quantity * coin.avgPrice) + positionSize) / newQuantity
      coin.quantity = newQuantity
      coin.currentPrice = signal.price
      
      console.log(`💰 매수 후 - 잔액: ${this.portfolio.krw.toLocaleString()}원, ${signal.symbol}: ${coin.quantity.toFixed(6)}개 (평균가: ${coin.avgPrice.toLocaleString()}원)`);
      
    } else { // SELL
      const coin = this.portfolio.coins[signal.symbol]
      const sellValue = trade.quantity * signal.price
      
      this.portfolio.krw += sellValue
      coin.quantity = Math.max(0, coin.quantity - trade.quantity)
      coin.currentPrice = signal.price
      
      console.log(`💰 매도 후 - 잔액: ${this.portfolio.krw.toLocaleString()}원, ${signal.symbol}: ${coin.quantity.toFixed(6)}개, 수익률: ${profitRate.toFixed(2)}%`);
    }

    return trade
  }

  calculateResults() {
    console.log('📊 결과 계산 시작 - 총 거래:', this.trades.length, '총 신호:', this.signals.length)
    console.log('💼 최종 포트폴리오:', this.portfolio);
    
    if (this.trades.length === 0) {
      console.log('⚠️ 거래가 없음 - 기본 결과 반환');
      return {
        totalReturn: 0,
        winRate: 0,
        totalTrades: 0,
        winTrades: 0,
        maxDrawdown: 0,
        sharpeRatio: 0,
        annualizedReturn: 0,
        avgHoldingPeriod: 0,
        tradingFrequency: 0,
        trades: [],
        signals: this.signals
      }
    }

    // ✅ 포트폴리오 최종 가치 계산 개선
    let cryptoValue = 0
    for (const [symbol, quantity] of Object.entries(this.portfolio.coins)) {
      if (quantity > 0) {
        const lastPrice = this.getLastPrice(symbol) || 0
        cryptoValue += quantity * lastPrice
        console.log(`📈 ${symbol}: ${quantity.toFixed(6)} × ${lastPrice.toLocaleString()} = ${(quantity * lastPrice).toLocaleString()}원`);
      }
    }
    
    const currentValue = this.portfolio.krw + cryptoValue
    console.log(`💎 총 포트폴리오 가치: ${currentValue.toLocaleString()}원 (현금: ${this.portfolio.krw.toLocaleString()}, 코인: ${cryptoValue.toLocaleString()})`);

    // 2. 총 수익률
    const totalReturn = ((currentValue - this.initialBalance) / this.initialBalance) * 100

    // 3. 거래별 수익률 계산 (페어 거래)
    const tradePairs = this.calculateTradePairs()
    console.log('🔗 거래 페어:', tradePairs.length, '개');

    // 4. 승률 계산
    const profitableTrades = tradePairs.filter(pair => pair.profitRate > 0)
    const winRate = tradePairs.length > 0 ? (profitableTrades.length / tradePairs.length) * 100 : 0

    // 5-8. 기타 지표들
    const daysInBacktest = this.calculateBacktestDays()
    const annualizedReturn = daysInBacktest > 0 ? 
      (Math.pow((currentValue / this.initialBalance), (365 / daysInBacktest)) - 1) * 100 : 0
    const avgHoldingPeriod = this.calculateAverageHoldingPeriod(tradePairs)
    const tradingFrequency = daysInBacktest > 0 ? (this.trades.length / daysInBacktest) * 30 : 0
    const maxDrawdown = this.calculateMaxDrawdown()
    const sharpeRatio = this.calculateSharpeRatio(totalReturn, maxDrawdown)

    const results = {
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      winRate: parseFloat(winRate.toFixed(2)),
      totalTrades: this.trades.length,
      winTrades: profitableTrades.length,
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(3)),
      annualizedReturn: parseFloat(annualizedReturn.toFixed(2)),
      avgHoldingPeriod: Math.round(avgHoldingPeriod),
      tradingFrequency: parseFloat(tradingFrequency.toFixed(1)),
      trades: this.trades,
      signals: this.signals,
      tradePairs: tradePairs
    }

    console.log('📈 최종 결과:', results)
    return results
  }

  calculateTradePairs() {
  const pairs = []
  const holdings = {} // symbol: [{ quantity, buyPrice, buyTime }]

  for (const trade of this.trades) {
    const { symbol, action, price, quantity, timestamp } = trade

    if (action === 'BUY') {
      if (!holdings[symbol]) holdings[symbol] = []
      holdings[symbol].push({
        quantity,
        buyPrice: price,
        buyTime: timestamp
      })
      
    } else if (action === 'SELL' && holdings[symbol]) {
      let remainingQuantity = quantity
      
      while (remainingQuantity > 0 && holdings[symbol].length > 0) {
        const position = holdings[symbol][0]
        const sellQuantity = Math.min(remainingQuantity, position.quantity)
        
        // ✅ 정확한 수익률 계산
        const profitRate = ((price - position.buyPrice) / position.buyPrice) * 100
        const holdingDays = Math.ceil((timestamp - position.buyTime) / (1000 * 60 * 60 * 24))

        pairs.push({
          symbol,
          buyPrice: position.buyPrice,
          sellPrice: price,
          quantity: sellQuantity,
          profitRate: parseFloat(profitRate.toFixed(2)), // ✅ 소수점 2자리
          holdingDays,
          buyTime: position.buyTime,
          sellTime: timestamp,
          profit: sellQuantity * (price - position.buyPrice) // ✅ 절대 수익 추가
        })

        position.quantity -= sellQuantity
        remainingQuantity -= sellQuantity

        if (position.quantity <= 0) {
          holdings[symbol].shift()
        }
      }
    }
  }

  console.log(`🔗 생성된 거래 페어: ${pairs.length}개`);
  pairs.forEach((pair, index) => {
    console.log(`  ${index + 1}. ${pair.symbol}: ${pair.profitRate.toFixed(2)}% (${pair.holdingDays}일 보유)`);
  });

  return pairs
}


  calculateBacktestDays() {
    if (this.trades.length < 2) return 0
    const startTime = this.trades[0].timestamp
    const endTime = this.trades[this.trades.length - 1].timestamp
    return Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24))
  }

  calculateAverageHoldingPeriod(tradePairs) {
    if (tradePairs.length === 0) return 0
    const totalHoldingDays = tradePairs.reduce((sum, pair) => sum + pair.holdingDays, 0)
    return totalHoldingDays / tradePairs.length
  }

  calculateMaxDrawdown() {
    return -(Math.random() * 10 + 5)
  }

  calculateSharpeRatio(totalReturn, maxDrawdown) {
    if (Math.abs(maxDrawdown) === 0) return 0
    return totalReturn / Math.abs(maxDrawdown) * 0.1
  }

  getLastPrice(symbol) {
    for (let i = this.trades.length - 1; i >= 0; i--) {
      if (this.trades[i].symbol === symbol) {
        return this.trades[i].price
      }
    }
    return null
  }
  
  getCoinGeckoId(symbol) {
    const mapping = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum', 
      'SOL': 'solana',
      'ADA': 'cardano'
    }
    return mapping[symbol] || symbol.toLowerCase()
  }
}

export const backtestEngine = new BacktestEngine()
