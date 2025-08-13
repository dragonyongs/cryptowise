// src/features/dashboard/PersonalizedDashboard.jsx - 완전히 개선된 버전
import { useState } from 'react'
import { useUserProfile } from '../../hooks/useUserProfile'
import { useHybridWatchlist } from '../../hooks/useHybridWatchlist'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { AlertCircle, Coins, TrendingUp, TrendingDown, RefreshCw, Clock, Wifi, WifiOff, Database } from 'lucide-react'
import { CoinImageWithFallback } from '../../components/ui/CoinImageWithFallback'

export default function PersonalizedDashboard() {
    const { profile, loading: profileLoading } = useUserProfile()
    const {
        watchlist,
        loading: watchlistLoading,
        pricesLoading,
        error,
        lastUpdated,
        refreshPrices,
        refreshWatchlist,
        getCacheStatus
    } = useHybridWatchlist()

    const [showCacheInfo, setShowCacheInfo] = useState(false)

    // 개인화된 투자 추천 로직 (기존과 동일하되 캐시된 데이터 활용)
    const getRiskBasedRecommendation = (coin, sentiment) => {
        if (!profile) return null

        const { risk_tolerance, preferred_holding_period } = profile

        // 캐시된 메타데이터 기반 위험도 평가
        const isTopTier = coin.is_top_tier
        const riskLevel = coin.risk_level

        if (risk_tolerance >= 7) {
            if (coin.rsi < 40 && sentiment > 0.2 && riskLevel !== 'very_high') {
                return {
                    action: 'strong_buy',
                    reason: '고위험 투자자용 적극적 매수 신호',
                    confidence: 0.8
                }
            }
        } else if (risk_tolerance <= 3) {
            if (coin.rsi < 25 && sentiment > 0.5 && isTopTier) {
                return {
                    action: 'safe_buy',
                    reason: '안전한 대형 코인 매수 신호',
                    confidence: 0.9
                }
            }
        } else {
            if (coin.rsi < 30 && sentiment > 0.3 && riskLevel !== 'very_high') {
                return {
                    action: 'moderate_buy',
                    reason: '균형잡힌 투자 기회',
                    confidence: 0.7
                }
            }
        }

        return null
    }

    // 로딩 상태
    if (profileLoading || watchlistLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600 dark:text-gray-400">포트폴리오를 불러오는 중...</p>
                        <p className="text-sm text-gray-500 mt-2">캐시된 데이터를 우선 로드합니다</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 에러 상태
    if (error) {
        return (
            <div className="space-y-6">
                <Card className="border-red-200 dark:border-red-800">
                    <CardContent className="p-8 text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2 text-red-800 dark:text-red-200">
                            데이터 로딩 오류
                        </h3>
                        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                        <div className="space-x-2">
                            <Button
                                onClick={refreshWatchlist}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                다시 시도
                            </Button>
                            <Button
                                onClick={() => refreshPrices()}
                                variant="outline"
                            >
                                가격만 새로고침
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* 개인화된 포트폴리오 헤더 */}
            <Card>
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <CardTitle className="text-2xl">
                        {profile?.investment_experience === 'beginner' ? '초보 투자자' :
                            profile?.investment_experience === 'expert' ? '전문 투자자' : '중급 투자자'}를 위한 맞춤 포트폴리오
                    </CardTitle>
                    <div className="mt-2 opacity-90">
                        위험 성향: {profile?.risk_tolerance}/10 |
                        선호 보유기간: {profile?.preferred_holding_period === 'short' ? '단기' :
                            profile?.preferred_holding_period === 'long' ? '장기' : '중기'}
                    </div>
                    <div className="mt-2 text-sm">
                        현재 플랜: <span className="font-bold">{profile?.plan_type?.toUpperCase()}</span>
                        ({watchlist.length}/{profile?.watchlist_limit} 코인 추적 중)
                    </div>

                    {/* ✅ 캐시 상태 표시 */}
                    <div className="mt-2 flex items-center justify-between text-sm opacity-90">
                        <div className="flex items-center space-x-4">
                            {pricesLoading ? (
                                <div className="flex items-center">
                                    <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                    가격 업데이트 중...
                                </div>
                            ) : (
                                <div className="flex items-center space-x-2">
                                    <Database className="h-4 w-4" />
                                    <span>캐시된 메타데이터 사용</span>
                                    <Wifi className="h-4 w-4" />
                                    <span>실시간 가격</span>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={() => setShowCacheInfo(!showCacheInfo)}
                            variant="ghost"
                            size="sm"
                            className="text-white hover:text-gray-200"
                        >
                            캐시 정보
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {/* ✅ 캐시 상태 정보 카드 */}
            {showCacheInfo && (
                <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-blue-900 dark:text-blue-100">
                                캐시 시스템 상태
                            </h3>
                            <Button
                                onClick={() => setShowCacheInfo(false)}
                                variant="ghost"
                                size="sm"
                                className="text-blue-600"
                            >
                                ✕
                            </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                                <div className="font-medium text-blue-800 dark:text-blue-200">메타데이터</div>
                                <div className="text-blue-600 dark:text-blue-400">데이터베이스 캐시</div>
                            </div>
                            <div>
                                <div className="font-medium text-green-800 dark:text-green-200">가격 정보</div>
                                <div className="text-green-600 dark:text-green-400">실시간 + 캐시</div>
                            </div>
                            <div>
                                <div className="font-medium text-purple-800 dark:text-purple-200">이미지</div>
                                <div className="text-purple-600 dark:text-purple-400">다중 소스 폴백</div>
                            </div>
                            <div>
                                <div className="font-medium text-orange-800 dark:text-orange-200">업데이트</div>
                                <div className="text-orange-600 dark:text-orange-400">백그라운드</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 워치리스트가 비어있는 경우 */}
            {watchlist.length === 0 ? (
                <Card className="border-dashed border-2 border-gray-200 dark:border-gray-700">
                    <CardContent className="p-12 text-center">
                        <Coins className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                            추적 중인 코인이 없습니다
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            코인 검색에서 관심 있는 코인을 추가해보세요
                        </p>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            코인 검색하기
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* 새로고침 컨트롤 */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span>마지막 업데이트: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : '로딩 중'}</span>
                            {pricesLoading && (
                                <span className="text-blue-500">• 가격 정보 업데이트 중</span>
                            )}
                        </div>
                        <div className="flex space-x-2">
                            <Button
                                onClick={refreshPrices}
                                variant="outline"
                                size="sm"
                                className="flex items-center space-x-2"
                                disabled={pricesLoading}
                            >
                                <RefreshCw className={`h-4 w-4 ${pricesLoading ? 'animate-spin' : ''}`} />
                                <span>가격 새로고침</span>
                            </Button>
                            <Button
                                onClick={refreshWatchlist}
                                variant="outline"
                                size="sm"
                                className="flex items-center space-x-2"
                            >
                                <Database className="h-4 w-4" />
                                <span>전체 새로고침</span>
                            </Button>
                        </div>
                    </div>

                    {/* ✅ 캐시 기반 코인 카드들 */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {watchlist.map(coin => {
                            const recommendation = getRiskBasedRecommendation(coin, coin.sentiment)

                            return (
                                <Card key={coin.id} className="hover:shadow-lg transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center space-x-2">
                                                {/* ✅ 개선된 이미지 컴포넌트 */}
                                                <CoinImageWithFallback
                                                    coin={coin}
                                                    size={32}
                                                    className="rounded-full"
                                                />
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-gray-100">
                                                        {coin.display_name}
                                                    </h3>
                                                    <div className="flex items-center space-x-1">
                                                        <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                                                            {coin.symbol}
                                                        </span>
                                                        {coin.upbit_supported && (
                                                            <span className="text-xs bg-blue-100 text-blue-600 px-1 rounded">
                                                                KR
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {coin.current_price > 0 ? (
                                                    <>
                                                        <div className="font-bold text-gray-900 dark:text-gray-100">
                                                            ₩{coin.current_price.toLocaleString()}
                                                        </div>
                                                        <div className={`text-sm flex items-center ${coin.price_change_24h > 0 ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                            {coin.price_change_24h > 0 ? (
                                                                <TrendingUp className="h-3 w-3 mr-1" />
                                                            ) : (
                                                                <TrendingDown className="h-3 w-3 mr-1" />
                                                            )}
                                                            {coin.price_change_24h?.toFixed(2)}%
                                                        </div>

                                                        {/* ✅ 데이터 상태 표시 */}
                                                        <div className="text-xs text-gray-400 mt-1 flex items-center">
                                                            {coin.isStale ? (
                                                                <WifiOff className="h-3 w-3 mr-1" />
                                                            ) : (
                                                                <Wifi className="h-3 w-3 mr-1" />
                                                            )}
                                                            <span>{coin.isStale ? '캐시됨' : '실시간'}</span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-sm text-gray-500">
                                                        <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-1" />
                                                        가격 로딩 중...
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 개인화된 투자 신호 */}
                                        {recommendation && (
                                            <div className={`mt-3 p-3 rounded-lg text-sm ${recommendation.action === 'strong_buy' ?
                                                'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
                                                recommendation.action === 'safe_buy' ?
                                                    'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200' :
                                                    'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                                                }`}>
                                                <div className="font-medium mb-1">
                                                    💡 {recommendation.reason}
                                                </div>
                                                <div className="text-xs opacity-80">
                                                    신뢰도: {(recommendation.confidence * 100).toFixed(0)}%
                                                </div>
                                            </div>
                                        )}

                                        {/* 위험도 및 기술적 지표 */}
                                        <div className="mt-3 space-y-2">
                                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                <span>시총 순위: #{coin.market_cap_rank || 'N/A'}</span>
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${coin.risk_level === 'low' ?
                                                    'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400' :
                                                    coin.risk_level === 'medium' ?
                                                        'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400' :
                                                        'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                                                    }`}>
                                                    {coin.risk_level === 'low' ? '안전' :
                                                        coin.risk_level === 'medium' ? '중간' : '위험'}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                <span>RSI: {coin.rsi || 50}</span>
                                                <span>감성지수: {((coin.sentiment || 0.5) * 100).toFixed(0)}%</span>
                                            </div>

                                            {/* ✅ 데이터 소스 정보 */}
                                            <div className="text-xs text-gray-400 pt-1 border-t border-gray-100 dark:border-gray-700">
                                                <div className="flex items-center justify-between">
                                                    <span>메타: {coin.metadata_source}</span>
                                                    <span>가격: {coin.price_source}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}
