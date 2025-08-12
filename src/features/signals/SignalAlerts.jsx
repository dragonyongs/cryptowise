// src/features/signals/SignalAlerts.jsx
import { useState, useEffect } from 'react'
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'

export default function SignalAlerts() {
    const [signals, setSignals] = useState([])
    const [isVisible, setIsVisible] = useState(true)

    // 실시간 신호 시뮬레이션 (실제로는 WebSocket이나 API polling)
    useEffect(() => {
        // 임시 데모 데이터
        const demoSignals = [
            {
                id: 1,
                symbol: 'BTC',
                type: 'BUY',
                price: '₩164,500,000',
                confidence: 78,
                reason: 'RSI 과매도 구간 + 뉴스 호재',
                timestamp: new Date()
            },
            {
                id: 2,
                symbol: 'ETH',
                type: 'SELL',
                price: '₩5,940,000',
                confidence: 65,
                reason: '저항선 접근 + 거래량 감소',
                timestamp: new Date(Date.now() - 300000) // 5분 전
            }
        ]

        setSignals(demoSignals)
    }, [])

    if (!isVisible || signals.length === 0) return null

    return (
        <Card className="border-l-4 border-l-blue-600 bg-blue-50 dark:bg-blue-900/20">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-blue-600" />
                        <h3 className="font-medium text-blue-900 dark:text-blue-100">
                            실시간 신호 알림
                        </h3>
                    </div>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                        닫기
                    </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                    {signals.map(signal => (
                        <div
                            key={signal.id}
                            className={`p-3 rounded-lg border ${signal.type === 'BUY'
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <span className="font-bold">{signal.symbol}</span>
                                    {signal.type === 'BUY' ? (
                                        <TrendingUp className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <TrendingDown className="h-4 w-4 text-red-600" />
                                    )}
                                    <span className={`text-sm font-medium ${signal.type === 'BUY' ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {signal.type === 'BUY' ? '매수 신호' : '매도 신호'}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-500">
                                    {Math.round((Date.now() - signal.timestamp) / 60000)}분 전
                                </span>
                            </div>

                            <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">가격:</span>
                                    <span className="font-mono">{signal.price}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">신뢰도:</span>
                                    <span className="font-medium">{signal.confidence}%</span>
                                </div>
                                <div className="mt-2">
                                    <span className="text-xs text-gray-500">{signal.reason}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
