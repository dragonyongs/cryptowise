import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useBacktesting } from '../../hooks/useBacktesting'
import { formatPrice, formatNumber, formatDate } from '../../utils/formatters'
import { Play, Pause, RotateCcw, TrendingUp, TrendingDown, Activity } from 'lucide-react'

const BacktestRunner = () => {
    const [config, setConfig] = useState({
        name: '',
        startDate: '2025-01-01',
        endDate: '2025-07-31',
        symbols: ['BTC', 'ETH', 'SOL', 'ADA', 'DOT'],
        strategy: 'survival_filter',
        initialBalance: 10000000
    })

    const { runBacktest, results, isRunning, progress, currentSession, error } = useBacktesting()

    const handleRunTest = async () => {
        try {
            await runBacktest(config)
        } catch (error) {
            console.error('백테스트 실행 실패:', error)
        }
    }

    const handleConfigChange = (field, value) => {
        setConfig(prev => ({
            ...prev,
            [field]: value
        }))
    }

    return (
        <div className="space-y-6">
            {/* 백테스트 설정 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        백테스트 설정
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">테스트 이름</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                                value={config.name}
                                onChange={(e) => handleConfigChange('name', e.target.value)}
                                placeholder="백테스트 이름을 입력하세요"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">전략</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                                value={config.strategy}
                                onChange={(e) => handleConfigChange('strategy', e.target.value)}
                            >
                                <option value="survival_filter">생존 필터 전략</option>
                                <option value="technical_momentum">기술적 모멘텀 전략</option>
                                <option value="mean_reversion">평균 회귀 전략</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">시작 날짜</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                                value={config.startDate}
                                onChange={(e) => handleConfigChange('startDate', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">종료 날짜</label>
                            <input
                                type="date"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                                value={config.endDate}
                                onChange={(e) => handleConfigChange('endDate', e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">대상 코인</label>
                        <div className="flex flex-wrap gap-2">
                            {['BTC', 'ETH', 'SOL', 'ADA', 'DOT', 'LINK', 'MATIC', 'AVAX'].map(symbol => (
                                <label key={symbol} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={config.symbols.includes(symbol)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                handleConfigChange('symbols', [...config.symbols, symbol])
                                            } else {
                                                handleConfigChange('symbols', config.symbols.filter(s => s !== symbol))
                                            }
                                        }}
                                        className="mr-2"
                                    />
                                    <span className="text-sm">{symbol}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={handleRunTest}
                            disabled={isRunning || config.symbols.length === 0}
                            className="flex items-center gap-2"
                        >
                            {isRunning ? (
                                <>
                                    <Pause className="h-4 w-4" />
                                    실행 중... ({progress}%)
                                </>
                            ) : (
                                <>
                                    <Play className="h-4 w-4" />
                                    백테스트 실행
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setConfig(prev => ({ ...prev, symbols: [] }))}
                            disabled={isRunning}
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            초기화
                        </Button>
                    </div>

                    {/* 진행률 표시 */}
                    {isRunning && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}

                    {/* 에러 표시 */}
                    {error && (
                        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 백테스트 결과 */}
            {results && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5" />
                            백테스트 결과
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                <div className="text-sm text-gray-600 dark:text-gray-400">총 수익률</div>
                                <div className={`text-2xl font-bold ${results.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatNumber.percent(results.totalReturn)}
                                </div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                <div className="text-sm text-gray-600 dark:text-gray-400">승률</div>
                                <div className="text-2xl font-bold text-green-600">
                                    {formatNumber.percent(results.winRate)}
                                </div>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                                <div className="text-sm text-gray-600 dark:text-gray-400">최대 낙폭</div>
                                <div className="text-2xl font-bold text-yellow-600">
                                    {formatNumber.percent(results.maxDrawdown)}
                                </div>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                                <div className="text-sm text-gray-600 dark:text-gray-400">샤프 비율</div>
                                <div className="text-2xl font-bold text-purple-600">
                                    {formatNumber.number(results.sharpeRatio, 2)}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h4 className="text-lg font-semibold mb-3">거래 통계</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>총 거래 수:</span>
                                        <span className="font-medium">{results.totalTrades}회</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>수익 거래:</span>
                                        <span className="font-medium text-green-600">{results.winTrades}회</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>손실 거래:</span>
                                        <span className="font-medium text-red-600">{results.totalTrades - results.winTrades}회</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-lg font-semibold mb-3">성과 지표</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>연간 수익률:</span>
                                        <span className="font-medium">{formatNumber.percent(results.annualizedReturn || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>평균 보유 기간:</span>
                                        <span className="font-medium">{results.avgHoldingPeriod || 0}일</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>거래 빈도:</span>
                                        <span className="font-medium">{results.tradingFrequency || 0}회/월</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 최근 거래 내역 */}
                        {results.trades && results.trades.length > 0 && (
                            <div className="mt-6">
                                <h4 className="text-lg font-semibold mb-3">최근 거래 내역</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2">날짜</th>
                                                <th className="text-left p-2">코인</th>
                                                <th className="text-left p-2">행동</th>
                                                <th className="text-right p-2">가격</th>
                                                <th className="text-right p-2">수량</th>
                                                <th className="text-right p-2">수익률</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {results.trades.slice(0, 10).map((trade, index) => (
                                                <tr key={index} className="border-b">
                                                    <td className="p-2">{formatDate.short(trade.timestamp)}</td>
                                                    <td className="p-2 font-medium">{trade.symbol}</td>
                                                    <td className="p-2">
                                                        <span className={`px-2 py-1 rounded text-xs ${trade.action === 'BUY'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : 'bg-red-100 text-red-800'
                                                            }`}>
                                                            {trade.action}
                                                        </span>
                                                    </td>
                                                    <td className="text-right p-2">{formatPrice(trade.price)}</td>
                                                    <td className="text-right p-2">{formatNumber.crypto(trade.quantity)}</td>
                                                    <td className={`text-right p-2 ${trade.profitRate >= 0 ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {formatNumber.percent(trade.profitRate || 0)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

export default BacktestRunner
