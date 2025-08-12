// src/features/analysis/TodayRecommendations.jsx  
import { useState, useEffect } from 'react'
import { Star, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import coinFilter from '@/services/analysis/coinFilter'

export default function TodayRecommendations() {
    const [recommendations, setRecommendations] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdate, setLastUpdate] = useState(null)

    const fetchRecommendations = async () => {
        setLoading(true)
        setError(null)

        try {
            console.log('🔄 추천 코인 데이터 로딩 시작...')
            const recommendations = await coinFilter.getTodayRecommendations()

            setRecommendations(recommendations)
            setLastUpdate(new Date())
            console.log('✅ 추천 코인 데이터 로딩 완료:', recommendations.length)

        } catch (err) {
            console.error('❌ 추천 코인 로딩 실패:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchRecommendations()
    }, [])

    const getRiskColor = (level) => {
        switch (level) {
            case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
            case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
            case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <div className="text-center">
                    <p className="font-medium">추천 코인 분석 중...</p>
                    <p className="text-sm text-gray-500">시장 데이터 수집 및 AI 분석 진행 중</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <Card className="p-6">
                <div className="text-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
                    <div>
                        <h3 className="text-lg font-semibold text-red-600">데이터 로딩 실패</h3>
                        <p className="text-sm text-gray-600">{error}</p>
                    </div>
                    <Button onClick={fetchRecommendations} variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        다시 시도
                    </Button>
                </div>
            </Card>
        )
    }

    if (!recommendations.length) {
        return (
            <Card className="p-6">
                <div className="text-center">
                    <p>현재 추천할 수 있는 코인이 없습니다.</p>
                    <Button onClick={fetchRecommendations} className="mt-4" variant="outline">
                        새로고침
                    </Button>
                </div>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Star className="h-6 w-6 text-yellow-500" />
                    <h2 className="text-2xl font-bold">오늘의 추천 코인</h2>
                    <div className="text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {new Date().toLocaleDateString('ko-KR')} 기준
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    {lastUpdate && (
                        <span className="text-sm text-gray-500">
                            업데이트: {lastUpdate.toLocaleTimeString()}
                        </span>
                    )}
                    <Button onClick={fetchRecommendations} size="sm" variant="outline">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        새로고침
                    </Button>
                </div>
            </div>

            {/* 추천 코인 그리드 */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((coin, index) => (
                    <Card key={coin.symbol} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                                        <CardTitle className="text-lg">{coin.symbol}</CardTitle>
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{coin.name}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-green-600">
                                        {coin.score.toFixed(1)}/10
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(coin.riskLevel)}`}>
                                        {coin.riskLevel === 'low' ? '낮음' : coin.riskLevel === 'medium' ? '보통' : '높음'}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600 dark:text-gray-400">현재가:</span>
                                    <div className="text-right">
                                        <div className="font-mono font-medium">{coin.currentPrice}</div>
                                        <div className={`text-xs ${coin.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {coin.change24h >= 0 ? '+' : ''}{coin.change24h}% (24h)
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center text-sm">
                                    <TrendingUp className="h-4 w-4 mr-1 text-green-600" />
                                    <span className="text-gray-600 dark:text-gray-400">예상 수익률:</span>
                                    <span className="ml-auto font-medium text-green-600">{coin.expectedReturn}</span>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                    <div className="flex items-start space-x-2">
                                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div>
                                            <span className="text-xs font-medium text-blue-600">추천 이유:</span>
                                            <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">{coin.reason}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                    <div>순위: #{coin.rank}</div>
                                    <div>거래량: ₩{(coin.volume / 1e9).toFixed(1)}억</div>
                                </div>

                                <Button className="w-full" size="sm" variant="outline">
                                    상세 분석 보기
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* 면책 조항 */}
            <div className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                ⚠️ 이 추천은 AI 분석 기반이며 투자 조언이 아닙니다. 투자 결정은 본인 책임하에 신중히 하시기 바랍니다.
            </div>
        </div>
    )
}
