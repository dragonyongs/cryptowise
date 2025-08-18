// src/components/features/testing/SentimentIndicator.jsx
import React from 'react';
import { TrendingUpIcon, TrendingDownIcon, AlertTriangleIcon, EyeIcon } from 'lucide-react';

const SentimentIndicator = ({ sentiment, loading }) => {
    if (loading) {
        return (
            <div className="bg-gray-50 rounded-lg p-4">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!sentiment) return null;

    const getSentimentColor = (phase) => {
        switch (phase) {
            case 'extreme_fear': return 'text-red-600 bg-red-50';
            case 'fear': return 'text-red-500 bg-red-50';
            case 'neutral': return 'text-gray-600 bg-gray-50';
            case 'greed': return 'text-green-500 bg-green-50';
            case 'extreme_greed': return 'text-green-600 bg-green-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getSentimentIcon = (phase) => {
        if (phase.includes('fear')) return <TrendingDownIcon className="h-4 w-4" />;
        if (phase.includes('greed')) return <TrendingUpIcon className="h-4 w-4" />;
        return <EyeIcon className="h-4 w-4" />;
    };

    const getSentimentText = (phase) => {
        const texts = {
            extreme_fear: '극공포 - 매수기회',
            fear: '공포 - 점진매수',
            neutral: '중립 - 관망',
            greed: '탐욕 - 신중',
            extreme_greed: '극탐욕 - 수익실현'
        };
        return texts[phase] || '알 수 없음';
    };

    const progressWidth = `${sentiment.fearGreedIndex}%`;

    return (
        <div className="bg-white rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    {getSentimentIcon(sentiment.sentimentPhase)}
                    <span className="font-medium text-gray-900">시장 감정</span>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSentimentColor(sentiment.sentimentPhase)}`}>
                    {getSentimentText(sentiment.sentimentPhase)}
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">공포탐욕지수</span>
                    <span className="font-semibold">{sentiment.fearGreedIndex}/100</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all duration-500 ${sentiment.fearGreedIndex < 25 ? 'bg-red-500' :
                                sentiment.fearGreedIndex < 50 ? 'bg-orange-500' :
                                    sentiment.fearGreedIndex < 75 ? 'bg-yellow-500' :
                                        'bg-green-500'
                            }`}
                        style={{ width: progressWidth }}
                    ></div>
                </div>

                <div className="flex justify-between text-xs text-gray-500">
                    <span>극공포</span>
                    <span>중립</span>
                    <span>극탐욕</span>
                </div>
            </div>

            {sentiment.contrarian?.buySignal && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
                    <div className="flex items-center">
                        <AlertTriangleIcon className="h-4 w-4 text-blue-400 mr-2" />
                        <span className="text-sm text-blue-800">
                            역순환 매수 신호 (강도: {(sentiment.contrarian.strength * 100).toFixed(0)}%)
                        </span>
                    </div>
                </div>
            )}

            {sentiment.contrarian?.sellSignal && (
                <div className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded">
                    <div className="flex items-center">
                        <AlertTriangleIcon className="h-4 w-4 text-orange-400 mr-2" />
                        <span className="text-sm text-orange-800">
                            수익실현 구간 (강도: {(sentiment.contrarian.strength * 100).toFixed(0)}%)
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SentimentIndicator;
