// src/components/features/analysis/RealtimeAnalysis.jsx
import React, { useState, useEffect } from 'react';
import { hybridAnalyzer } from '../../../services/analysis/hybridAnalyzer';
import { useWatchlist } from '../../../hooks/useWatchlist';
import { Card } from '../../ui/Card';
import { LoadingSpinner } from '../../ui/LoadingSpinner';

export const RealtimeAnalysis = ({ coinList }) => {
    const [analysisResults, setAnalysisResults] = useState({});
    const [loadingState, setLoadingState] = useState('idle');
    const [progress, setProgress] = useState(null);
    const { watchlist, topCoins, updateWatchlist } = useWatchlist();

    useEffect(() => {
        if (coinList.length > 0) {
            startAnalysis();
        }
    }, [coinList]);

    const startAnalysis = async () => {
        setLoadingState('analyzing');

        await hybridAnalyzer.analyzeCoins(coinList, (update) => {
            switch (update.type) {
                case 'technical_ready':
                    setAnalysisResults(update.results);
                    setLoadingState('technical_ready');
                    break;
                case 'news_cache_ready':
                    setAnalysisResults(update.results);
                    setLoadingState('news_cache_ready');
                    break;
                case 'news_loading_progress':
                    setAnalysisResults(update.results);
                    setProgress(update.progress);
                    setLoadingState('news_loading');
                    break;
                case 'analysis_complete':
                    setAnalysisResults(update.results);
                    setLoadingState('complete');
                    setProgress(null);
                    break;
            }
        });
    };

    const getLoadingMessage = () => {
        switch (loadingState) {
            case 'analyzing':
                return '분석 시작 중...';
            case 'technical_ready':
                return '기술적 분석 완료 · 뉴스 분석 시작';
            case 'news_cache_ready':
                return '캐시된 뉴스 로딩 완료 · 신규 뉴스 확인 중';
            case 'news_loading':
                return `뉴스 로딩 중... ${progress?.completed}/${progress?.total}`;
            case 'complete':
                return '분석 완료!';
            default:
                return '대기 중...';
        }
    };

    return (
        <div className="space-y-4">
            {/* 헤더 */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">실시간 하이브리드 분석</h2>
                <div className="text-sm px-3 py-1 bg-blue-100 rounded-full">
                    {getLoadingMessage()}
                </div>
            </div>

            {/* 관심코인 관리 */}
            <Card className="p-4">
                <h3 className="font-medium mb-2">관심코인 관리</h3>
                <div className="text-sm text-gray-600">
                    현재 관심코인: {watchlist.length}개 | 상위코인: {topCoins.length}개
                </div>
                <button
                    className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm"
                    onClick={() => updateWatchlist([...watchlist, 'DOGE'])}
                >
                    코인 추가 예시
                </button>
            </Card>

            {/* 분석 결과 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(analysisResults).map(result => (
                    <CoinAnalysisCard
                        key={result.symbol}
                        result={result}
                        showNewsStatus={loadingState !== 'complete'}
                    />
                ))}
            </div>

            {/* 진행률 */}
            {progress && (
                <Card className="p-4">
                    <div className="flex justify-between mb-2">
                        <span>뉴스 로딩 진행률</span>
                        <span>{Math.round((progress.completed / progress.total) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                        />
                    </div>
                </Card>
            )}
        </div>
    );
};

const CoinAnalysisCard = ({ result, showNewsStatus }) => {
    const getScoreColor = (score) => {
        if (score >= 7) return 'text-green-600';
        if (score <= 3) return 'text-red-600';
        return 'text-gray-600';
    };

    return (
        <Card className="p-4">
            <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg">{result.symbol}</h3>
                <span className={`text-xl font-bold ${getScoreColor(result.combined)}`}>
                    {result.combined}/10
                </span>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                    <span>기술적 분석</span>
                    <span className={getScoreColor(result.technical)}>{result.technical}</span>
                </div>

                <div className="flex justify-between items-center">
                    <span>뉴스 분석</span>
                    <div className="flex items-center space-x-2">
                        <span className={getScoreColor(result.news.score)}>{result.news.score}</span>
                        {showNewsStatus && (
                            <div className="text-xs">
                                {result.news.status === 'loading' && (
                                    <span className="bg-yellow-100 px-2 py-1 rounded">로딩중</span>
                                )}
                                {result.news.status === 'loaded' && (
                                    <span className="bg-green-100 px-2 py-1 rounded">완료</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {result.news.articles && result.news.articles.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-gray-500">최신 뉴스</div>
                    <div className="text-xs mt-1">
                        {result.news.articles[0].title.substring(0, 50)}...
                    </div>
                </div>
            )}
        </Card>
    );
};
