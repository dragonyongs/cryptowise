import { useState, useCallback } from 'react'
import { backtestEngine } from '../services/testing/backtestEngine'
import { useTestingStore } from '../stores/testingStore'

export const useBacktesting = () => {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)

  const { 
    currentSession, 
    results, 
    addSession, 
    updateSession,
    setResults 
  } = useTestingStore()

  const runBacktest = useCallback(async (config) => {
  try {
    setIsRunning(true)
    setProgress(0)
    setError(null)

    const sessionId = await addSession({
      ...config,
      name: config.name || `백테스트 ${new Date().toLocaleDateString()}`
    })

    const result = await backtestEngine.run(config, {
      onProgress: (percent) => setProgress(Math.round(percent)),
      onSignal: (signal) => console.log('신호 생성:', signal),
      onTrade: (trade) => console.log('거래 실행:', trade)
    })

    console.log('백테스트 완료 결과:', result)

    // 세션 업데이트 - 모든 필수 필드 포함
    await updateSession(sessionId, {
      status: 'COMPLETED',
      total_return: result.totalReturn,
      win_rate: result.winRate,
      max_drawdown: result.maxDrawdown,
      sharpe_ratio: result.sharpeRatio,
      // 추가 필드들
      annualized_return: result.annualizedReturn,
      avg_holding_period: result.avgHoldingPeriod,
      trading_frequency: result.tradingFrequency,
      total_trades: result.totalTrades,
      win_trades: result.winTrades,
      completed_at: new Date().toISOString()
    })

    setResults(result)
    setIsRunning(false)
    setProgress(100)

    return result
  } catch (err) {
    console.error('백테스트 실행 실패:', err)
    setError(err.message)
    
    if (currentSession?.id) {
      await updateSession(currentSession.id, {
        status: 'FAILED',
        error: err.message
      })
    }
    
    setIsRunning(false)
    throw err
  }
}, [addSession, updateSession, setResults, currentSession])

  const stopBacktest = useCallback(() => {
    setIsRunning(false)
    setProgress(0)
  }, [])

  const clearResults = useCallback(() => {
    setResults(null)
    setError(null)
    setProgress(0)
  }, [setResults])

  return {
    runBacktest,
    stopBacktest,
    clearResults,
    isRunning,
    progress,
    error,
    results,
    currentSession
  }
}

export default useBacktesting
