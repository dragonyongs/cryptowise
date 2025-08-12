// src/features/testing/BacktestRunner.jsx
import { useState } from 'react'
import { useBacktesting } from '../../hooks/useBacktesting'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'

const BacktestRunner = () => {
    const [config, setConfig] = useState({
        startDate: '2025-01-01',
        endDate: '2025-07-31',
        symbols: ['BTC', 'ETH', 'SOL'],
        strategy: 'rsi_simple'
    })

    const { runBacktest, results, isRunning, progress } = useBacktesting()

    const handleRunTest = async () => {
        try {
            console.log('백테스트 실행:', config)
            await runBacktest(config)
        } catch (error) {
            console.error('백테스트 실패:', error)
            alert('백테스트 실행 중 오류가 발생했습니다: ' + error.message)
        }
    }

    return (
        <Card className="backtest-runner p-6">
            <h2 className="text-2xl font-bold mb-4">백테스트 실행</h2>

            {/* 설정 폼 */}
            <div className="mb-6 space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">시작일</label>
                    <input
                        type="date"
                        value={config.startDate}
                        onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">종료일</label>
                    <input
                        type="date"
                        value={config.endDate}
                        onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
                        className="w-full p-2 border rounded"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">코인 (쉼표로 구분)</label>
                    <input
                        type="text"
                        value={config.symbols.join(', ')}
                        onChange={(e) => setConfig({ ...config, symbols: e.target.value.split(',').map(s => s.trim()) })}
                        className="w-full p-2 border rounded"
                        placeholder="BTC, ETH, SOL"
                    />
                </div>
            </div>

            {/* 실행 버튼 */}
            <Button
                onClick={handleRunTest}
                disabled={isRunning}
                className="w-full mb-4"
            >
                {isRunning ? `백테스트 실행 중... ${progress}%` : '백테스트 실행'}
            </Button>

            {/* 진행 바 */}
            {isRunning && (
                <div className="mb-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* 결과 표시 */}
            {results && (
                <Card className="mt-6 p-4 bg-gray-50">
                    <h3 className="text-lg font-semibold mb-3">백테스트 결과</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <span className="text-sm text-gray-600">총 수익률</span>
                            <p className={`text-lg font-bold ${results.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {results.totalReturn}%
                            </p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">승률</span>
                            <p className="text-lg font-bold">{results.winRate}%</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">총 거래 수</span>
                            <p className="text-lg font-bold">{results.totalTrades}</p>
                        </div>
                        <div>
                            <span className="text-sm text-gray-600">수익 거래</span>
                            <p className="text-lg font-bold text-green-600">{results.winTrades}</p>
                        </div>
                    </div>
                </Card>
            )}
        </Card>
    )
}

export default BacktestRunner
