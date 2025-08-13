// src/features/signals/SignalAlerts.jsx - 실시간 신호 알림
import { useState, useEffect } from 'react'
import { AlertCircle, TrendingUp, TrendingDown, X, Zap, Clock, Target } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useSignalGeneration } from '../../hooks/useSignalGeneration'

export default function SignalAlerts({
    enableSignals = true,
    maxDisplaySignals = 4,
    autoHide = true,
    hideDelay = 30000 // 30초 후 자동 숨김
}) {
    const [isVisible, setIsVisible] = useState(true)
    const [dismissedSignals, setDismissedSignals] = useState(new Set())

    const {
        signals,
        signalStats,
        isGenerating,
        dismissSignal,
        clearAllSignals,
        lastAnalysis
    } = useSignalGeneration({
        enableSignals,
        signalInterval: 30000, // 30초마다 분석
        maxSignals: 20,
        confidenceThreshold: 65
    })

    // ✅ 표시할 신호 필터링
    const displaySignals = signals
        .filter(signal => !dismissedSignals.has(signal.id))
        .slice(0, maxDisplaySignals)

    // ✅ 신호 해제 처리
    const handleDismissSignal = (signalId) => {
        setDismissedSignals(prev => new Set([...prev, signalId]))
        dismissSignal(signalId)
    }

    // ✅ 자동 숨김 처리
    useEffect(() => {
        if (autoHide && signals.length === 0) {
            const timer = setTimeout(() => {
                setIsVisible(false)
            }, hideDelay)

            return () => clearTimeout(timer)
        }
    }, [signals.length, autoHide, hideDelay])

    // ✅ 새 신호가 오면 다시 표시
    useEffect(() => {
        if (signals.length > 0) {
            setIsVisible(true)
        }
    }, [signals.length])

    if (!isVisible || displaySignals.length === 0) return null

    return (
        <Card className="border-l-4 border-l-blue-600 bg-blue-50 dark:bg-blue-900/20 shadow-lg">
            <CardContent className="p-4">
                {/* 헤더 */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                        <div className="relative">
                            <Zap className="h-5 w-5 text-blue-600" />
                            {isGenerating && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                            )}
                        </div>
                        <h3 className="font-medium text-blue-900 dark:text-blue-100">
                            실시간 AI 신호 알림
                        </h3>
                        <div className="flex items-center text-xs text-blue-600 dark:text-blue-400">
                            <Clock className="h-3 w-3 mr-1" />
                            {lastAnalysis ? (
                                <span>
                                    {Math.round((Date.now() - lastAnalysis.getTime()) / 1000)}초 전 분석
                                </span>
                            ) : (
                                <span>분석 중...</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* 신호 통계 */}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="text-green-600">매수 {signalStats.buySignals}</span>
                            <span className="mx-1">•</span>
                            <span className="text-red-600">매도 {signalStats.sellSignals}</span>
                        </div>

                        <button
                            onClick={() => setIsVisible(false)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* 신호 카드들 */}
                <div className="grid gap-3 md:grid-cols-2">
                    {displaySignals.map(signal => (
                        <div
                            key={signal.id}
                            className={`relative p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] ${signal.type === 'BUY'
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                }`}
                        >
                            {/* 신호 해제 버튼 */}
                            <button
                                onClick={() => handleDismissSignal(signal.id)}
                                className="absolute top-1 right-1 p-1 text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-3 w-3" />
                            </button>

                            {/* 신호 헤더 */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <span className="font-bold text-lg">
                                        {signal.symbol}
                                    </span>
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

                            {/* 코인 정보 */}
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {signal.korean_name || signal.name}
                                    </span>
                                    <span className="font-mono text-xs text-gray-500">
                                        #{signal.coinId}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">현재가:</span>
                                    <span className="font-mono font-medium">
                                        ₩{signal.price?.toLocaleString() || 'N/A'}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">신뢰도:</span>
                                    <div className="flex items-center space-x-1">
                                        <span className={`font-medium ${signal.confidence >= 80 ? 'text-green-600' :
                                                signal.confidence >= 70 ? 'text-yellow-600' : 'text-orange-600'
                                            }`}>
                                            {signal.confidence}%
                                        </span>
                                        <Target className={`h-3 w-3 ${signal.confidence >= 80 ? 'text-green-600' :
                                                signal.confidence >= 70 ? 'text-yellow-600' : 'text-orange-600'
                                            }`} />
                                    </div>
                                </div>

                                {/* 기술적 지표 */}
                                {signal.rsi && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">RSI:</span>
                                        <span className={`font-medium text-xs ${signal.rsi < 30 ? 'text-green-600' :
                                                signal.rsi > 70 ? 'text-red-600' : 'text-gray-600'
                                            }`}>
                                            {signal.rsi}
                                        </span>
                                    </div>
                                )}

                                {/* 신호 이유 */}
                                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <span className="text-xs text-gray-500 font-medium">분석 근거:</span>
                                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        {signal.reasons}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 푸터 액션 */}
                {signals.length > maxDisplaySignals && (
                    <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-blue-600 dark:text-blue-400">
                                +{signals.length - maxDisplaySignals}개 신호 더 있음
                            </span>
                            <Button
                                onClick={clearAllSignals}
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                                모든 신호 지우기
                            </Button>
                        </div>
                    </div>
                )}

                {/* 실시간 상태 표시 */}
                <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                                }`} />
                            <span>
                                {isGenerating ? 'AI 분석 중...' : '대기 중'}
                            </span>
                        </div>
                        <span>
                            평균 신뢰도: {signalStats.avgConfidence}%
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
