// src/components/SearchResults.jsx
import { useState } from 'react'
import { Plus, TrendingUp, Loader2, AlertCircle, CheckCircle, Info } from 'lucide-react'
import { Button } from './ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import CoinImage from './CoinImage'

export default function SearchResults({
    results = [],
    onAddCoin,
    searchTerm = '',
    loading = false,
    maxResults = 30
}) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">검색 중...</p>
                </div>
            </div>
        )
    }

    if (results.length === 0 && searchTerm) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    "{searchTerm}"에 대한 검색 결과가 없습니다
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    다른 검색어를 시도해보세요 (예: 비트코인, BTC, Bitcoin)
                </div>
            </div>
        )
    }

    if (results.length === 0) {
        return null
    }

    const displayResults = results.slice(0, maxResults)
    const availableCount = displayResults.filter(coin => !coin.isInWatchlist).length
    const alreadyAddedCount = displayResults.filter(coin => coin.isInWatchlist).length
    const allInWatchlist = displayResults.length > 0 && displayResults.every(coin => coin.isInWatchlist)

    return (
        <div className="space-y-4">
            {/* 🎯 검색 결과 헤더 */}
            <Card className="border-blue-100 dark:border-blue-900">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <span>검색 결과 ({displayResults.length}개)</span>
                            {searchTerm && (
                                <span className="text-sm font-normal text-blue-600 dark:text-blue-400">
                                    "{searchTerm}"
                                </span>
                            )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm font-normal">
                            {availableCount > 0 && (
                                <span className="text-green-600 dark:text-green-400 flex items-center">
                                    <Plus className="h-4 w-4 mr-1" />
                                    추가 가능: {availableCount}개
                                </span>
                            )}
                            {alreadyAddedCount > 0 && (
                                <span className="text-gray-500 dark:text-gray-400 flex items-center">
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    이미 추가됨: {alreadyAddedCount}개
                                </span>
                            )}
                        </div>
                    </CardTitle>
                </CardHeader>
            </Card>

            {/* 🚨 모든 결과가 워치리스트에 있는 경우 특별 메시지 */}
            {allInWatchlist && (
                <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                    <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                            <CheckCircle className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <div className="font-medium text-blue-900 dark:text-blue-100">
                                    "{searchTerm}" 관련 코인들은 모두 이미 워치리스트에 추가되어 있습니다!
                                </div>
                                <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                                    다른 코인을 검색해보시거나 워치리스트에서 관리하세요.
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 📋 검색 결과 목록 */}
            <div className="space-y-3">
                {displayResults.map(coin => (
                    <EnhancedCoinResultCard
                        key={coin.id}
                        coin={coin}
                        onAdd={onAddCoin}
                        searchTerm={searchTerm}
                    />
                ))}
            </div>

            {/* 📊 추가 결과 안내 */}
            {results.length > maxResults && (
                <Card className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4 text-center">
                        <Info className="h-5 w-5 text-gray-400 mx-auto mb-2" />
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {results.length - maxResults}개의 추가 결과가 더 있습니다
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            더 구체적인 검색어로 결과를 좁혀보세요
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

// 🎨 개선된 코인 결과 카드
function EnhancedCoinResultCard({ coin, onAdd, searchTerm }) {
    const [imageError, setImageError] = useState(false)
    const [adding, setAdding] = useState(false)

    const handleAdd = async () => {
        if (coin.isInWatchlist) return // 이미 추가된 코인은 추가하지 않음

        setAdding(true)
        try {
            await onAdd(coin)
        } catch (error) {
            console.error('코인 추가 실패:', error)
        } finally {
            setAdding(false)
        }
    }

    const handleImageError = (e) => {
        if (!imageError) {
            setImageError(true)
            e.target.src = `/crypto-icons/${coin.symbol.toLowerCase()}.png`
        } else {
            e.target.src = '/crypto-icons/default.png'
        }
    }

    // 검색어 하이라이트 (개선된 버전)
    const highlightText = (text, searchTerm) => {
        if (!searchTerm || !text) return text

        const regex = new RegExp(`(${searchTerm})`, 'gi')
        const parts = text.split(regex)

        return parts.map((part, index) =>
            regex.test(part) ? (
                <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded-sm">
                    {part}
                </mark>
            ) : (
                part
            )
        )
    }

    // 워치리스트 상태에 따른 카드 스타일
    const getCardStyle = () => {
        if (coin.isInWatchlist) {
            return 'border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800/50 opacity-95'
        }

        if (coin.matchType?.includes('korean')) {
            return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20 hover:shadow-md'
        }
        if (coin.matchType?.includes('exact')) {
            return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 hover:shadow-md'
        }
        return 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 hover:shadow-md'
    }

    // 매치 타입 배지 (워치리스트 상태 우선)
    const getMatchTypeBadge = () => {
        // ✅ 워치리스트 상태 우선 표시
        if (coin.isInWatchlist) {
            return (
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-2 py-1 rounded-full font-medium">
                    ✅ 추적 중
                </span>
            )
        }

        // 기존 매치 타입 배지
        if (coin.matchType?.includes('korean_exact')) {
            return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">🇰🇷 정확</span>
        }
        if (coin.matchType?.includes('korean')) {
            return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">🇰🇷 한글</span>
        }
        if (coin.matchType?.includes('exact')) {
            return <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ 정확</span>
        }
        return null
    }

    // 우선순위 표시 배지
    const getPriorityBadge = () => {
        if (coin.isInWatchlist) return null

        if (coin.upbit_supported && coin.matchType?.includes('korean')) {
            return (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    🌟 추천
                </span>
            )
        }
        return null
    }

    return (
        <div className={`p-4 border rounded-xl transition-all duration-200 ${getCardStyle()}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="relative flex-shrink-0">
                        {/* <img
                            src={coin.image_url || `/crypto-icons/${coin.symbol.toLowerCase()}.png`}
                            alt={coin.name}
                            className={`w-12 h-12 rounded-full object-cover ${coin.isInWatchlist ? 'ring-2 ring-green-300 dark:ring-green-600' : ''
                                }`}
                            onError={handleImageError}
                        /> */}

                        <CoinImage
                            coin={coin}
                            size={48}
                            showStatus={true}
                            className={coin.isInWatchlist ? 'ring-2 ring-green-300 dark:ring-green-600' : ''}
                        />

                        {/* 상태별 아이콘 오버레이 */}
                        {coin.isInWatchlist ? (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                                <CheckCircle className="h-3 w-3 text-white" />
                            </div>
                        ) : coin.upbit_supported ? (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                                <span className="text-white text-xs font-bold">🇰🇷</span>
                            </div>
                        ) : null}
                    </div>

                    <div className="flex-1 min-w-0">
                        {/* 코인명 표시 */}
                        <div className={`font-semibold truncate ${coin.isInWatchlist
                            ? 'text-gray-600 dark:text-gray-400'
                            : 'text-gray-900 dark:text-gray-100'
                            }`}>
                            {coin.korean_name ? (
                                <>
                                    <span className={coin.isInWatchlist
                                        ? 'text-gray-500 dark:text-gray-400'
                                        : 'text-blue-600 dark:text-blue-400'
                                    }>
                                        {highlightText(coin.korean_name, searchTerm)}
                                    </span>
                                    <span className="text-gray-500 ml-2 text-sm">
                                        ({highlightText(coin.name, searchTerm)})
                                    </span>
                                </>
                            ) : (
                                highlightText(coin.name, searchTerm)
                            )}
                        </div>

                        {/* 메타 정보 */}
                        <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <span className={`font-mono font-medium ${coin.isInWatchlist
                                ? 'text-gray-500 dark:text-gray-500'
                                : 'text-gray-700 dark:text-gray-300'
                                }`}>
                                {highlightText(coin.symbol.toUpperCase(), searchTerm)}
                            </span>

                            {coin.market_cap_rank && (
                                <>
                                    <span>•</span>
                                    <span className="flex items-center">
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        #{coin.market_cap_rank}
                                    </span>
                                </>
                            )}

                            {coin.upbit_supported && !coin.isInWatchlist && (
                                <>
                                    <span>•</span>
                                    <span className="text-blue-600 dark:text-blue-400 font-medium">
                                        업비트
                                    </span>
                                </>
                            )}
                        </div>

                        {/* 시가총액 & 배지 */}
                        <div className="flex items-center space-x-2 mt-2">
                            {coin.market_cap && (
                                <div className="text-xs text-gray-400">
                                    시가총액: {formatMarketCap(coin.market_cap)}
                                </div>
                            )}

                            <div className="flex items-center space-x-1">
                                {getMatchTypeBadge()}
                                {getPriorityBadge()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 액션 버튼 */}
                <div className="flex-shrink-0 ml-4">
                    {coin.isInWatchlist ? (
                        <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4" />
                            <span>추적 중</span>
                        </div>
                    ) : (
                        <Button
                            onClick={handleAdd}
                            disabled={adding}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 
                                     disabled:bg-gray-300 disabled:text-gray-500 
                                     dark:disabled:bg-gray-600 dark:disabled:text-gray-400
                                     transition-all duration-200"
                            size="sm"
                        >
                            {adding ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                            <span>{adding ? '추가중' : '추가'}</span>
                        </Button>
                    )}
                </div>
            </div>
        </div>
    )
}

// 💰 시가총액 포맷터 (기존과 동일)
function formatMarketCap(marketCap) {
    if (marketCap >= 1e12) {
        return `$${(marketCap / 1e12).toFixed(1)}T`
    } else if (marketCap >= 1e9) {
        return `$${(marketCap / 1e9).toFixed(1)}B`
    } else if (marketCap >= 1e6) {
        return `$${(marketCap / 1e6).toFixed(1)}M`
    } else if (marketCap >= 1e3) {
        return `$${(marketCap / 1e3).toFixed(1)}K`
    } else {
        return `$${marketCap.toFixed(2)}`
    }
}
