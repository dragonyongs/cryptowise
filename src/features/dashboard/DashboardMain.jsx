// src/features/dashboard/DashboardMain.jsx
import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, Activity, AlertCircle, Wifi, WifiOff } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { coinGeckoService } from '@/services/data/coinGeckoService'

export default function DashboardMain() {
    const [prices, setPrices] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [lastUpdate, setLastUpdate] = useState(null)
    const [retryCount, setRetryCount] = useState(0)
    const [connectionStatus, setConnectionStatus] = useState('online')
    const [dataSource, setDataSource] = useState('unknown')

    /**
     * 🚀 개선된 가격 데이터 가져오기 (상태 업데이트 추가)
     */
    const fetchPricesWithRetry = useCallback(async (attempt = 0) => {
        try {
            setLoading(true)
            setError(null)
            setConnectionStatus('connecting')

            console.log(`🔄 가격 데이터 요청 시도 ${attempt + 1}`)

            const data = await coinGeckoService.getMarketsData('krw', 3, 'bitcoin,ethereum,ripple')

            if (!data || data.length === 0) {
                throw new Error('데이터를 받지 못했습니다')
            }

            setPrices(data)
            setLastUpdate(new Date())
            setRetryCount(0) // 성공 시 재시도 카운트 초기화
            setConnectionStatus('online')

            // 데이터 소스 판별 개선
            if (data[0]?._isDummy) {
                setDataSource('dummy')
            } else if (data[0]?.last_updated && new Date(data[0].last_updated) > new Date(Date.now() - 60000)) {
                setDataSource('live') // 실시간 데이터
            } else {
                setDataSource('cached') // 캐시 데이터
            }

            console.log(`✅ 가격 데이터 성공: ${data.length}개 코인`)

        } catch (err) {
            console.error('❌ 가격 데이터 실패:', err.message)
            setError(err.message)
            setRetryCount(prev => prev + 1)
            setConnectionStatus('offline')

            // 3회 실패 시 백업 방법 시도
            if (attempt < 2) {
                console.log(`🔄 ${3 - attempt}초 후 재시도...`)
                setTimeout(() => {
                    fetchPricesWithRetry(attempt + 1)
                }, 3000)
                return
            }

        } finally {
            setLoading(false)
        }
    }, [])

    /**
     * 🆕 CORS 프록시 백업 방법
     */
    const fetchWithCorsProxy = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            setConnectionStatus('connecting')

            console.log('🔄 CORS 프록시 시도...')

            const proxyUrl = 'https://api.allorigins.win/raw?url='
            const targetUrl = encodeURIComponent(
                'https://api.coingecko.com/api/v3/coins/markets?vs_currency=krw&per_page=3&ids=bitcoin,ethereum,ripple'
            )

            const response = await fetch(`${proxyUrl}${targetUrl}`, {
                signal: AbortSignal.timeout(20000) // 20초 타임아웃
            })

            if (!response.ok) {
                throw new Error(`프록시 오류: ${response.status}`)
            }

            const data = await response.json()
            setPrices(data)
            setLastUpdate(new Date())
            setRetryCount(0) // 성공 시 재시도 카운트 초기화
            setConnectionStatus('online')
            setDataSource('proxy')

            console.log('✅ CORS 프록시 성공')

        } catch (err) {
            console.error('❌ CORS 프록시 실패:', err.message)
            setError(`프록시 서비스 오류: ${err.message}`)
            setRetryCount(prev => prev + 1)
            setConnectionStatus('offline')
        } finally {
            setLoading(false)
        }
    }, [])

    /**
     * 🆕 스마트 새로고침 로직
     */
    const handleManualRefresh = () => {
        if (retryCount >= 3) {
            fetchWithCorsProxy()
        } else {
            fetchPricesWithRetry()
        }
    }

    /**
     * 🆕 자동 갱신 간격 조정 (연결 상태에 따라)
     */
    useEffect(() => {
        fetchPricesWithRetry()

        // 연결 상태에 따른 간격 조정
        const getInterval = () => {
            if (connectionStatus === 'offline') return 300000 // 5분
            if (dataSource === 'live') return 120000 // 2분
            return 180000 // 3분 (기본)
        }

        const interval = setInterval(() => {
            fetchPricesWithRetry()
        }, getInterval())

        return () => clearInterval(interval)
    }, [fetchPricesWithRetry, connectionStatus, dataSource])

    /**
     * 🆕 연결 상태 표시 컴포넌트
     */
    const ConnectionStatus = () => {
        const statusConfig = {
            online: { icon: Wifi, color: 'text-green-600', label: '온라인' },
            offline: { icon: WifiOff, color: 'text-red-600', label: '오프라인' },
            connecting: { icon: Activity, color: 'text-blue-600', label: '연결 중' }
        }

        const { icon: Icon, color, label } = statusConfig[connectionStatus]

        return (
            <div className={`flex items-center space-x-1 text-xs ${color}`}>
                <Icon className="h-3 w-3" />
                <span>{label}</span>
                {dataSource !== 'unknown' && (
                    <span className="text-gray-500">
                        ({dataSource === 'live' ? '실시간' :
                            dataSource === 'cached' ? '캐시' :
                                dataSource === 'dummy' ? '더미' : '프록시'})
                    </span>
                )}
            </div>
        )
    }

    // 로딩 상태
    if (loading && prices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <Activity className="animate-spin h-8 w-8 text-blue-600" />
                <div className="text-center">
                    <span className="text-lg">데이터 로딩 중...</span>
                    <div className="mt-2">
                        <ConnectionStatus />
                    </div>
                </div>
            </div>
        )
    }

    // 에러 상태 (데이터가 없는 경우)
    if (error && prices.length === 0) {
        return (
            <Card className="p-6">
                <div className="flex items-center text-red-600 mb-4">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>데이터를 불러올 수 없습니다</span>
                </div>
                <div className="text-sm text-gray-600 mb-4">
                    <strong>오류:</strong> {error}
                </div>
                <div className="flex items-center justify-between">
                    <ConnectionStatus />
                    <div className="space-x-2">
                        <Button onClick={handleManualRefresh} variant="outline">
                            다시 시도
                        </Button>
                        <Button onClick={fetchWithCorsProxy} variant="ghost">
                            백업 서버 사용
                        </Button>
                    </div>
                </div>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                        실시간 시세
                    </h1>
                    <div className="flex items-center space-x-4 mt-1">
                        {lastUpdate && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                마지막 업데이트: {lastUpdate.toLocaleTimeString()}
                                {retryCount > 0 && (
                                    <span className="ml-2 text-yellow-600">
                                        (재시도 {retryCount}회)
                                    </span>
                                )}
                            </p>
                        )}
                        <ConnectionStatus />
                    </div>
                </div>
                <Button
                    onClick={handleManualRefresh}
                    disabled={loading}
                    variant="outline"
                    size="sm"
                >
                    {loading ? <Activity className="animate-spin h-4 w-4" /> : '새로고침'}
                </Button>
            </div>

            {/* 가격 카드들 */}
            <section className="grid gap-6 md:grid-cols-3">
                {prices.map(coin => (
                    <Card key={coin.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-lg font-semibold">
                                    {coin.name}
                                </CardTitle>
                                <div className="flex items-center space-x-2">
                                    {coin.price_change_percentage_24h >= 0 ? (
                                        <TrendingUp className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <TrendingDown className="h-5 w-5 text-red-600" />
                                    )}
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        {coin.symbol.toUpperCase()}
                                    </span>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent>
                            <div className="space-y-2">
                                <p className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
                                    ₩{coin.current_price.toLocaleString()}
                                </p>

                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-medium ${coin.price_change_percentage_24h >= 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                        }`}>
                                        {coin.price_change_percentage_24h >= 0 ? '+' : ''}
                                        {coin.price_change_percentage_24h.toFixed(2)}%
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        24시간
                                    </span>
                                </div>

                                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                                        <span>시가총액</span>
                                        <span>₩{(coin.market_cap / 1e12).toFixed(1)}조</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        <span>24시간 거래량</span>
                                        <span>₩{(coin.total_volume / 1e9).toFixed(1)}억</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </section>

            {/* 에러 표시 (데이터가 있지만 업데이트 실패한 경우) */}
            {error && prices.length > 0 && (
                <div className="flex items-center justify-between text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                    <span>⚠️ 최신 데이터 업데이트 실패: {error}</span>
                    <Button
                        onClick={fetchWithCorsProxy}
                        size="sm"
                        variant="ghost"
                    >
                        백업 서버로 재시도
                    </Button>
                </div>
            )}
        </div>
    )
}
