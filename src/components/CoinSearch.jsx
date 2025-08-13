// src/components/CoinSearch.jsx - 수정된 버전
import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, X, TrendingUp, AlertCircle, Coins, Loader2, Database, Zap } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { useWatchlist } from '../hooks/useWatchlist'
import { useDebounce } from '../hooks/useDebounce'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { Button } from './ui/Button'
import SearchInput from './SearchInput'
import SearchResults from './SearchResults'

export default function CoinSearch({ requireLogin = false, onLoginClick }) {
    // State 관리
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [loading, setLoading] = useState(false)
    const [dbStats, setDbStats] = useState({
        totalCoins: 0,
        koreanSupported: 0,
        lastUpdated: null
    })
    const [collectionStatus, setCollectionStatus] = useState({
        isCollecting: false,
        canCollect: true
    })

    // ✅ upbitMarkets 상태 추가
    const [upbitMarkets, setUpbitMarkets] = useState(new Map())
    const [upbitStatus, setUpbitStatus] = useState({
        loading: false,
        loaded: false,
        error: null,
        lastAttempt: null,
        source: null
    })
    const [upbitLoading, setUpbitLoading] = useState(false)
    const [upbitError, setUpbitError] = useState(null)

    // ✅ 중복 호출 방지를 위한 ref
    const initializationRef = useRef({
        upbitInitialized: false,
        dbStatsInitialized: false
    })

    const { user, supabase } = useAuth()
    const { profile } = useUserProfile()
    const { watchlist, addCoin } = useWatchlist()

    const debouncedSearchTerm = useDebounce(searchTerm, 300)


    // ✅ 최적화된 업비트 마켓 로드 (한 번만 실행)
    const loadUpbitMarkets = useCallback(async () => {
        // 이미 로드 중이거나 로드 완료된 경우 스킵
        if (upbitStatus.loading || upbitStatus.loaded) {
            return upbitMarkets
        }

        // 최근 5분 이내에 실패한 경우 스킵 (API 제한 방지)
        if (upbitStatus.lastAttempt && upbitStatus.error) {
            const timeSinceLastAttempt = Date.now() - upbitStatus.lastAttempt
            if (timeSinceLastAttempt < 5 * 60 * 1000) { // 5분
                console.log('⏸️ 업비트 API 재시도 대기 중 (5분 쿨다운)')
                return upbitMarkets
            }
        }

        setUpbitStatus(prev => ({ ...prev, loading: true, lastAttempt: Date.now() }))

        try {
            // 방법 1: 데이터베이스에서 업비트 정보 조회 (우선)
            if (supabase) {
                const { data: cachedUpbitData, error: dbError } = await supabase
                    .from('coins_metadata')
                    .select('symbol, korean_name, english_name, upbit_market_code')
                    .eq('upbit_supported', true)
                    .not('korean_name', 'is', null)

                if (!dbError && cachedUpbitData && cachedUpbitData.length > 0) {
                    const marketMap = new Map()
                    cachedUpbitData.forEach(coin => {
                        if (coin.symbol && coin.korean_name) {
                            marketMap.set(coin.symbol.toUpperCase(), {
                                korean_name: coin.korean_name,
                                english_name: coin.english_name,
                                market_code: coin.upbit_market_code || `KRW-${coin.symbol.toUpperCase()}`,
                                upbit_supported: true
                            })
                        }
                    })

                    setUpbitMarkets(marketMap)
                    setUpbitStatus({
                        loading: false,
                        loaded: true,
                        error: null,
                        lastAttempt: Date.now(),
                        source: 'database'
                    })

                    console.log('✅ 데이터베이스에서 업비트 마켓 로드:', marketMap.size, '개')
                    return marketMap
                }
            }

            // 방법 2: 하드코딩된 주요 업비트 코인 (최종 Fallback)
            const hardcodedUpbitCoins = {
                'BTC': { korean_name: '비트코인', english_name: 'Bitcoin' },
                'ETH': { korean_name: '이더리움', english_name: 'Ethereum' },
                'XRP': { korean_name: '엑스알피', english_name: 'XRP' },
                'ADA': { korean_name: '에이다', english_name: 'Cardano' },
                'DOT': { korean_name: '폴카닷', english_name: 'Polkadot' },
                'LINK': { korean_name: '체인링크', english_name: 'Chainlink' },
                'SOL': { korean_name: '솔라나', english_name: 'Solana' },
                'AVAX': { korean_name: '아발란체', english_name: 'Avalanche' },
                'ATOM': { korean_name: '코스모스', english_name: 'Cosmos' },
                'DOGE': { korean_name: '도지코인', english_name: 'Dogecoin' },
                'SHIB': { korean_name: '시바이누', english_name: 'Shiba Inu' },
                'PEPE': { korean_name: '페페', english_name: 'Pepe' },
                'UNI': { korean_name: '유니스왑', english_name: 'Uniswap' },
                'AAVE': { korean_name: '에이브', english_name: 'Aave' },
                'NEAR': { korean_name: '니어프로토콜', english_name: 'NEAR Protocol' },
                'APT': { korean_name: '앱토스', english_name: 'Aptos' },
                'OP': { korean_name: '옵티미즘', english_name: 'Optimism' },
                'ARB': { korean_name: '아비트럼', english_name: 'Arbitrum' },
                'POL': { korean_name: '폴리곤', english_name: 'Polygon' },
                'HBAR': { korean_name: '헤데라', english_name: 'Hedera' },
                'TRX': { korean_name: '트론', english_name: 'TRON' },
                'BCH': { korean_name: '비트코인캐시', english_name: 'Bitcoin Cash' },
                'ETC': { korean_name: '이더리움클래식', english_name: 'Ethereum Classic' },
                'XLM': { korean_name: '스텔라루멘', english_name: 'Stellar' },
                'XTZ': { korean_name: '테조스', english_name: 'Tezos' },
                'ALGO': { korean_name: '알고랜드', english_name: 'Algorand' },
                'FLOW': { korean_name: '플로우', english_name: 'Flow' },
                'SAND': { korean_name: '샌드박스', english_name: 'The Sandbox' },
                'MANA': { korean_name: '디센트럴랜드', english_name: 'Decentraland' },
                'AXS': { korean_name: '엑시인피니티', english_name: 'Axie Infinity' },
                'CHZ': { korean_name: '칠리즈', english_name: 'Chiliz' },
                'THETA': { korean_name: '쎄타토큰', english_name: 'Theta Token' },
                'FIL': { korean_name: '파일코인', english_name: 'Filecoin' },
                'VET': { korean_name: '비체인', english_name: 'VeChain' },
                'ICP': { korean_name: '인터넷컴퓨터', english_name: 'Internet Computer' },
                'GRT': { korean_name: '더그래프', english_name: 'The Graph' },
                'ENJ': { korean_name: '엔진코인', english_name: 'Enjin Coin' },
                'BAT': { korean_name: '베이직어텐션토큰', english_name: 'Basic Attention Token' },
                'CRO': { korean_name: '크로노스', english_name: 'Cronos' },
                'IMX': { korean_name: '이뮤터블엑스', english_name: 'Immutable X' },
                'ANKR': { korean_name: '앵커', english_name: 'Ankr' },
                'STORJ': { korean_name: '스토리지', english_name: 'Storj' },
                'KNC': { korean_name: '카이버네트워크', english_name: 'Kyber Network' },
                'ZRX': { korean_name: '제로엑스', english_name: '0x Protocol' },
                'CVC': { korean_name: '시빅', english_name: 'Civic' },
                'QTUM': { korean_name: '퀀텀', english_name: 'Qtum' },
                'WAVES': { korean_name: '웨이브', english_name: 'Waves' },
                'LSK': { korean_name: '리스크', english_name: 'Lisk' },
                'ARDR': { korean_name: '아더', english_name: 'Ardor' },
                'ARK': { korean_name: '아크', english_name: 'Ark' },
                'NEO': { korean_name: '네오', english_name: 'NEO' },
                'STEEM': { korean_name: '스팀', english_name: 'Steem' },
                'STRAX': { korean_name: '스트라티스', english_name: 'Stratis' },
                'TT': { korean_name: '썬더코어', english_name: 'ThunderCore' },
                'POWR': { korean_name: '파워렛저', english_name: 'Power Ledger' },
                'SC': { korean_name: '시아코인', english_name: 'Siacoin' },
                'RVN': { korean_name: '레이븐코인', english_name: 'Ravencoin' },
                'IOTA': { korean_name: '아이오타', english_name: 'IOTA' },
                'IOST': { korean_name: '아이오에스티', english_name: 'IOST' }
            }

            const fallbackMap = new Map()
            Object.entries(hardcodedUpbitCoins).forEach(([symbol, data]) => {
                fallbackMap.set(symbol, {
                    ...data,
                    market_code: `KRW-${symbol}`,
                    upbit_supported: true
                })
            })

            setUpbitMarkets(fallbackMap)
            setUpbitStatus({
                loading: false,
                loaded: true,
                error: null,
                lastAttempt: Date.now(),
                source: 'hardcoded'
            })

            // ✅ 로그 메시지 최적화 (한 번만 출력)
            if (!initializationRef.current.upbitInitialized) {
                console.log('📊 업비트 마켓 초기화 완료:', fallbackMap.size, '개 (하드코딩)')
                initializationRef.current.upbitInitialized = true
            }

            return fallbackMap

        } catch (error) {
            console.error('❌ 업비트 마켓 로드 완전 실패:', error)
            setUpbitStatus({
                loading: false,
                loaded: false,
                error: error.message,
                lastAttempt: Date.now(),
                source: 'error'
            })
        }

        return upbitMarkets
    }, [upbitStatus.loading, upbitStatus.loaded, upbitStatus.lastAttempt, upbitStatus.error, supabase, upbitMarkets])

    // 나머지 검색 함수들은 기존과 동일하되, 로그 최적화
    const performDatabaseSearch = useCallback(async (query) => {
        if (!query.trim() || !supabase) return []

        setLoading(true)

        try {
            const searchLower = query.toLowerCase().trim()

            let searchQuery = supabase
                .from('coins_metadata')
                .select('*')
                .eq('is_active', true)

            const conditions = []
            if (searchLower) {
                conditions.push(`symbol.ilike.%${searchLower}%`)
                conditions.push(`name.ilike.%${searchLower}%`)
                conditions.push(`korean_name.ilike.%${searchLower}%`)
                conditions.push(`english_name.ilike.%${searchLower}%`)
            }

            if (conditions.length > 0) {
                searchQuery = searchQuery.or(conditions.join(','))
            }

            const { data: searchResults, error } = await searchQuery
                .order('market_cap_rank', { ascending: true, nullsLast: true })
                .limit(50)

            if (error) throw error

            if (!searchResults || searchResults.length === 0) {
                return await performRealTimeSearch(query)
            }

            // 점수 매기기 로직 (기존과 동일)
            const scoredResults = searchResults.map(coin => {
                let score = 0
                let matchType = 'none'

                const symbol = coin.symbol?.toLowerCase() || ''
                const name = coin.name?.toLowerCase() || ''
                const korean = coin.korean_name?.toLowerCase() || ''
                const english = coin.english_name?.toLowerCase() || ''

                if (symbol === searchLower) { score = 1000; matchType = 'symbol_exact' }
                else if (korean === searchLower) { score = 1200; matchType = 'korean_exact' }
                else if (name === searchLower) { score = 900; matchType = 'name_exact' }
                else if (english === searchLower) { score = 850; matchType = 'english_exact' }
                else if (symbol.includes(searchLower)) { score = 800; matchType = 'symbol_partial' }
                else if (korean.includes(searchLower)) { score = 1000; matchType = 'korean_partial' }
                else if (name.includes(searchLower)) { score = 700; matchType = 'name_partial' }
                else if (english.includes(searchLower)) { score = 650; matchType = 'english_partial' }

                if (coin.upbit_supported) score += 100
                if (coin.market_cap_rank && coin.market_cap_rank <= 100) score += 50

                return {
                    ...coin,
                    search_score: score,
                    match_type: matchType,
                    isInWatchlist: watchlist.some(w => w.coin_id === coin.id)
                }
            })

            return scoredResults
                .filter(coin => coin.search_score > 0)
                .sort((a, b) => {
                    if (!a.isInWatchlist && b.isInWatchlist) return -1
                    if (a.isInWatchlist && !b.isInWatchlist) return 1
                    if (a.match_type.includes('korean') && !b.match_type.includes('korean')) return -1
                    if (b.match_type.includes('korean') && !a.match_type.includes('korean')) return 1
                    return b.search_score - a.search_score
                })
                .slice(0, 30)

        } catch (error) {
            console.error('❌ 데이터베이스 검색 실패:', error)
            return await performRealTimeSearch(query)
        } finally {
            setLoading(false)
        }
    }, [supabase, watchlist])

    // ✅ 안전한 실시간 검색 (upbitMarkets 사용)
    const performRealTimeSearch = useCallback(async (query) => {
        console.log('🌐 실시간 API 검색 시작:', query)

        try {
            const results = []

            // 1. CoinGecko 검색 API (안전한 호출)
            try {
                const response = await fetch(
                    `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`,
                    {
                        method: 'GET',
                        headers: {
                            'Accept': 'application/json',
                        }
                    }
                )

                if (response.ok) {
                    const data = await response.json()

                    if (data.coins && data.coins.length > 0) {
                        const coinGeckoResults = data.coins.slice(0, 10).map(coin => ({
                            id: coin.id,
                            symbol: coin.symbol?.toUpperCase() || 'N/A',
                            name: coin.name,
                            korean_name: null,
                            image_url: coin.thumb || coin.large,
                            market_cap_rank: coin.market_cap_rank,
                            market_cap: null,
                            current_price: null,
                            upbit_supported: false,
                            search_score: 500,
                            match_type: 'api_search',
                            isInWatchlist: watchlist.some(w => w.coin_id === coin.id),
                            source: 'coingecko'
                        }))

                        results.push(...coinGeckoResults)
                    }
                }
            } catch (error) {
                console.warn('CoinGecko 검색 실패:', error)
            }

            // ✅ 2. 안전한 업비트 마켓 데이터 검색
            if (upbitMarkets && upbitMarkets.size > 0) {
                const koreanMatches = []
                const searchLower = query.toLowerCase()

                upbitMarkets.forEach((marketData, symbol) => {
                    const korean = marketData.korean_name?.toLowerCase() || ''
                    const english = marketData.english_name?.toLowerCase() || ''

                    if (korean.includes(searchLower) || english.includes(searchLower)) {
                        koreanMatches.push({
                            id: symbol.toLowerCase(),
                            symbol: symbol,
                            name: marketData.english_name,
                            korean_name: marketData.korean_name,
                            image_url: `https://assets.coingecko.com/coins/images/1/thumb/${symbol.toLowerCase()}.png`,
                            market_cap_rank: 999,
                            market_cap: null,
                            current_price: null,
                            upbit_supported: true,
                            upbit_market_code: marketData.market_code,
                            search_score: korean === searchLower ? 1200 : korean.includes(searchLower) ? 1000 : 600,
                            match_type: korean === searchLower ? 'korean_exact' : 'korean_partial',
                            isInWatchlist: watchlist.some(w => w.symbol === symbol),
                            source: 'upbit'
                        })
                    }
                })

                results.push(...koreanMatches)
            }

            // 중복 제거 및 정렬
            const uniqueResults = results.reduce((acc, current) => {
                const existing = acc.find(item => item.id === current.id || item.symbol === current.symbol)
                if (!existing) {
                    acc.push(current)
                } else if (current.search_score > existing.search_score) {
                    const index = acc.findIndex(item => item.id === existing.id || item.symbol === existing.symbol)
                    acc[index] = current
                }
                return acc
            }, [])

            return uniqueResults
                .sort((a, b) => {
                    if (!a.isInWatchlist && b.isInWatchlist) return -1
                    if (a.isInWatchlist && !b.isInWatchlist) return 1
                    if (a.match_type.includes('korean') && !b.match_type.includes('korean')) return -1
                    if (b.match_type.includes('korean') && !a.match_type.includes('korean')) return 1
                    return b.search_score - a.search_score
                })
                .slice(0, 20)

        } catch (error) {
            console.error('❌ 실시간 API 검색 실패:', error)
            return []
        }
    }, [watchlist, upbitMarkets]) // ✅ upbitMarkets 의존성 추가

    // ✅ 통합 검색 함수 (기존과 동일)
    const performIntegratedSearch = useCallback(async (query) => {
        if (!query.trim()) return []

        const dbResults = await performDatabaseSearch(query)

        if (dbResults.length > 0) {
            console.log('✅ 데이터베이스 검색 성공:', dbResults.length, '개 결과')
            return dbResults
        }

        console.log('🔄 데이터베이스 결과 없음, 실시간 API 검색')
        const apiResults = await performRealTimeSearch(query)

        // API 검색 결과를 데이터베이스에 캐시 (백그라운드)
        if (apiResults.length > 0 && user && supabase) {
            setTimeout(async () => {
                try {
                    const coinsToCache = apiResults
                        .filter(coin => coin.id && coin.symbol && coin.name)
                        .map(coin => ({
                            id: coin.id,
                            symbol: coin.symbol,
                            name: coin.name,
                            image_url: coin.image_url,
                            market_cap_rank: coin.market_cap_rank,
                            korean_name: coin.korean_name,
                            english_name: coin.name,
                            upbit_supported: coin.upbit_supported,
                            upbit_market_code: coin.upbit_market_code,
                            coingecko_id: coin.id,
                            is_active: true,
                            last_updated: new Date().toISOString()
                        }))

                    if (coinsToCache.length > 0) {
                        const { error } = await supabase
                            .from('coins_metadata')
                            .upsert(coinsToCache, {
                                onConflict: 'id',
                                ignoreDuplicates: false
                            })

                        if (!error) {
                            console.log('💾 API 검색 결과 캐시:', coinsToCache.length, '개')
                        }
                    }
                } catch (error) {
                    console.warn('캐시 저장 실패:', error)
                }
            }, 1000)
        }

        return apiResults
    }, [performDatabaseSearch, performRealTimeSearch, user, supabase])

    // ✅ 최적화된 데이터베이스 통계 로드 (한 번만 실행)
    const loadDatabaseStats = useCallback(async () => {
        if (!supabase || initializationRef.current.dbStatsInitialized) return

        try {
            const [totalResult, koreanResult, lastUpdateResult] = await Promise.all([
                supabase
                    .from('coins_metadata')
                    .select('id', { count: 'exact' })
                    .eq('is_active', true),
                supabase
                    .from('coins_metadata')
                    .select('id', { count: 'exact' })
                    .eq('is_active', true)
                    .not('korean_name', 'is', null),
                supabase
                    .from('coins_metadata')
                    .select('last_updated')
                    .eq('is_active', true)
                    .order('last_updated', { ascending: false })
                    .limit(1)
            ])

            setDbStats({
                totalCoins: totalResult.count || 0,
                koreanSupported: koreanResult.count || 0,
                lastUpdated: lastUpdateResult.data?.[0]?.last_updated || null
            })

            initializationRef.current.dbStatsInitialized = true
            console.log('📈 데이터베이스 통계 로드 완료')

        } catch (error) {
            console.error('통계 로드 실패:', error)
        }
    }, [supabase])

    const handleAddCoin = useCallback(async (coin) => {
        if (!user) {
            onLoginClick?.() || alert('로그인이 필요합니다')
            return
        }

        const limit = profile?.watchlist_limit || 5
        if (watchlist.length >= limit) {
            alert(`${profile?.plan_type?.toUpperCase() || 'FREE'} 플랜은 최대 ${limit}개까지만 추가 가능합니다`)
            return
        }

        try {
            const success = await addCoin({
                id: coin.id,
                symbol: coin.symbol,
                name: coin.name,
                korean_name: coin.korean_name,
                upbit_supported: coin.upbit_supported,
                image_url: coin.image_url,
                market_cap_rank: coin.market_cap_rank,
                market_cap: coin.market_cap,
                current_price: coin.current_price
            })

            if (success) {
                setSearchResults(prev => prev.filter(c => c.id !== coin.id))
                console.log(`✅ 코인 추가 성공: ${coin.korean_name || coin.name}`)
            }
        } catch (error) {
            console.error('❌ 코인 추가 실패:', error)
            alert(error.message || '코인 추가 중 오류가 발생했습니다.')
        }
    }, [user, profile, watchlist, addCoin, onLoginClick])

    // ✅ 검색 실행
    useEffect(() => {
        const executeSearch = async () => {
            if (debouncedSearchTerm.trim()) {
                const results = await performIntegratedSearch(debouncedSearchTerm)
                setSearchResults(results)
            } else {
                setSearchResults([])
            }
        }

        executeSearch()
    }, [debouncedSearchTerm, performIntegratedSearch])

    // ✅ 초기 로드 시 업비트 마켓과 통계 로드
    useEffect(() => {
        loadUpbitMarkets()
        loadDatabaseStats()
    }, [loadUpbitMarkets, loadDatabaseStats])

    // 나머지 UI 렌더링은 기존과 동일...
    if (requireLogin && !user) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <Coins className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">로그인이 필요합니다</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        코인 검색 및 추가 기능을 사용하려면 로그인해주세요.
                    </p>
                    <Button onClick={onLoginClick} className="bg-blue-600 hover:bg-blue-700">
                        로그인하기
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <Card>
                <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                    <CardTitle className="text-2xl flex items-center space-x-2">
                        <Database className="h-6 w-6" />
                        <span>스마트 코인 검색</span>
                        <span className="text-sm opacity-75">
                            (데이터베이스 기반)
                        </span>
                    </CardTitle>
                    <div className="text-sm opacity-90">
                        한글, 영문, 심볼 통합 검색 • 업비트 지원 코인 우선 표시
                    </div>
                </CardHeader>
            </Card>

            {/* ✅ 업비트 상태 표시 */}
            {upbitError && (
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2 text-orange-700 dark:text-orange-300">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-sm">
                                업비트 API 오류: Fallback 데이터 사용 중 (기본 {upbitMarkets.size}개 코인 지원)
                            </span>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 검색 통계 */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                                <Database className="h-4 w-4 text-blue-600" />
                                <span>총 {dbStats.totalCoins.toLocaleString()}개 코인</span>
                            </div>
                            <div className="text-green-600">
                                🇰🇷 한글 지원: {dbStats.koreanSupported.toLocaleString()}개
                            </div>
                            <div className="text-purple-600">
                                📈 업비트: {upbitMarkets.size}개 코인
                            </div>
                            {dbStats.lastUpdated && (
                                <div className="text-gray-500 text-xs">
                                    업데이트: {new Date(dbStats.lastUpdated).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 검색 입력 */}
            <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                loading={loading}
                placeholder="비트코인, BTC, Bitcoin 등으로 검색..."
            />

            {/* 검색 결과 */}
            <SearchResults
                results={searchResults}
                loading={loading}
                onAddCoin={handleAddCoin}
                emptyMessage={
                    searchTerm
                        ? "검색 결과가 없습니다. 실시간 데이터 보강이 진행 중일 수 있습니다."
                        : "코인명, 심볼, 한글명으로 검색해보세요"
                }
            />
        </div>
    )
}
