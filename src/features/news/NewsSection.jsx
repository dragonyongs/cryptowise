// src/features/news/NewsSection.jsx
import { useState, useEffect } from 'react'
import { Newspaper, TrendingUp, TrendingDown, ExternalLink } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import newsService from '@/services/news/newsService'

export default function NewsSection() {
    const [newsData, setNewsData] = useState({})
    const [loading, setLoading] = useState(true)
    const [selectedSymbol, setSelectedSymbol] = useState('BTC')

    const symbols = ['BTC', 'ETH', 'SOL', 'ADA', 'XRP']

    const fetchNewsForSymbol = async (symbol) => {
        try {
            const summary = await newsService.getNewsSummary(symbol)
            setNewsData(prev => ({ ...prev, [symbol]: summary }))
        } catch (error) {
            console.error(`뉴스 로드 실패 (${symbol}):`, error)
            setNewsData(prev => ({ ...prev, [symbol]: null }))
        }
    }

    useEffect(() => {
        const loadAllNews = async () => {
            setLoading(true)
            // 모든 심볼의 뉴스를 병렬로 로드
            await Promise.all(symbols.map(symbol => fetchNewsForSymbol(symbol)))
            setLoading(false)
        }
        loadAllNews()
    }, [])

    const getSentimentColor = (score) => {
        if (score > 0.1) return 'text-green-600'
        if (score < -0.1) return 'text-red-600'
        return 'text-gray-600'
    }

    const getSentimentIcon = (score) => {
        if (score > 0.1) return <TrendingUp className="h-4 w-4 text-green-600" />
        if (score < -0.1) return <TrendingDown className="h-4 w-4 text-red-600" />
        return <div className="h-4 w-4 rounded-full bg-gray-400" />
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-3">뉴스 분석 중...</span>
            </div>
        )
    }

    const currentNews = newsData[selectedSymbol]

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Newspaper className="h-6 w-6 text-blue-600" />
                    <h2 className="text-2xl font-bold">뉴스 감성 분석</h2>
                </div>
                <div className="text-sm text-gray-500">
                    마지막 업데이트: {new Date().toLocaleTimeString()}
                </div>
            </div>

            {/* 심볼 선택 탭 */}
            <div className="flex space-x-2 overflow-x-auto">
                {symbols.map(symbol => {
                    const data = newsData[symbol]
                    return (
                        <button
                            key={symbol}
                            onClick={() => setSelectedSymbol(symbol)}
                            className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${selectedSymbol === symbol
                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 text-blue-600'
                                : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                                }`}
                        >
                            <span className="font-medium">{symbol}</span>
                            {data && getSentimentIcon(data.sentimentScore)}
                            {data && (
                                <span className={`text-xs ${getSentimentColor(data.sentimentScore)}`}>
                                    {(data.sentimentScore * 100).toFixed(0)}%
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* 뉴스 내용 */}
            {currentNews ? (
                <div className="grid gap-6 md:grid-cols-2">
                    {/* 감성 분석 요약 */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                                <span>{selectedSymbol} 감성 분석</span>
                                {getSentimentIcon(currentNews.sentimentScore)}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="text-center">
                                    <div className={`text-3xl font-bold ${getSentimentColor(currentNews.sentimentScore)}`}>
                                        {currentNews.sentiment}
                                    </div>
                                    <div className="text-lg text-gray-600 dark:text-gray-400">
                                        점수: {(currentNews.sentimentScore * 100).toFixed(1)}%
                                    </div>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        분석된 뉴스: {currentNews.newsCount}개
                                    </div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                        업데이트: {new Date(currentNews.lastUpdated).toLocaleString()}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 최신 헤드라인 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>최신 헤드라인</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {currentNews.topHeadlines.map((article, index) => (
                                    <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-b-0">
                                        <a
                                            href={article.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-start space-x-2 group"
                                        >
                                            <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-blue-600 mt-1 flex-shrink-0" />
                                            <div>
                                                <h4 className="text-sm font-medium group-hover:text-blue-600 transition-colors line-clamp-2">
                                                    {article.title}
                                                </h4>
                                                <div className="flex items-center space-x-2 mt-1 text-xs text-gray-500">
                                                    <span>{article.source}</span>
                                                    <span>•</span>
                                                    <span>{Math.round(article.age)}시간 전</span>
                                                </div>
                                            </div>
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <Card>
                    <CardContent className="text-center py-8">
                        <div className="text-gray-500">
                            {selectedSymbol}에 대한 뉴스를 불러올 수 없습니다.
                        </div>
                        <Button
                            onClick={() => fetchNewsForSymbol(selectedSymbol)}
                            className="mt-4"
                            variant="outline"
                        >
                            다시 시도
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
