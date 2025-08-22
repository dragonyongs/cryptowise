// src/components/features/coins/CoinItem.jsx
import React from 'react';
import { Plus, Minus, TrendingUp, TrendingDown, Star, StarOff } from 'lucide-react';
import { useCoinStore } from '../../../stores/coinStore';
import { useRefreshPriceAndAnalysis } from '../../../hooks/useRefreshPriceAndAnalysis';
import {
    ClockIcon, CheckCircleIcon
} from '@heroicons/react/24/outline';
const CoinItem = ({ coin, isSelected = false, showActions = true }) => {
    const { addCoin, removeCoin, getRemainingSlots } = useCoinStore();
    const { refreshPriceAndAnalysis } = useRefreshPriceAndAnalysis();

    const handleToggleSelection = async () => {
        if (isSelected) {
            const result = removeCoin(coin.market);
            if (!result.success) console.error(result.message);
            else {
                // 필요시 가격/분석 갱신 호출
                await refreshPriceAndAnalysis();
            }
        } else {
            const result = addCoin(coin.market);
            if (!result.success) console.error(result.message);
            else {
                // 최신 가격/분석 데이터 API 호출 후 상태 반영
                await refreshPriceAndAnalysis();
            }
        }
    };


    const formatPrice = (price) => {
        if (price >= 1000) {
            return price.toLocaleString('ko-KR');
        }
        return price.toFixed(2);
    };

    const formatVolume = (volume) => {
        if (volume >= 1e9) {
            return `${(volume / 1e9).toFixed(1)}B`;
        }
        if (volume >= 1e6) {
            return `${(volume / 1e6).toFixed(1)}M`;
        }
        return volume.toLocaleString('ko-KR');
    };

    const getRecommendationColor = (recommendation) => {
        switch (recommendation) {
            case 'STRONG_BUY': return 'text-emerald-600 bg-emerald-50';
            case 'BUY': return 'text-blue-600 bg-blue-50';
            case 'HOLD': return 'text-yellow-600 bg-yellow-50';
            case 'SELL': return 'text-red-600 bg-red-50';
            case 'ANALYZING': return 'text-gray-600 bg-gray-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getScoreColor = (score) => {
        if (score >= 8) return 'text-emerald-600';
        if (score >= 7) return 'text-blue-600';
        if (score >= 6) return 'text-yellow-600';
        if (score >= 5) return 'text-orange-600';
        return 'text-red-600';
    };

    return (
        <div className={`
      bg-white rounded-lg border transition-all duration-200 hover:shadow-md
      ${isSelected ? 'ring-2 ring-blue-500 border-blue-200' : 'border-gray-200 hover:border-gray-300'}
    `}>
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        {/* 코인 정보 */}
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-lg text-gray-900">{coin.symbol}</h3>
                                <span className="text-sm text-gray-500">{coin.korean_name}</span>
                            </div>
                            <p className="text-xs text-gray-400">{coin.english_name}</p>
                        </div>
                    </div>

                    {/* 선택 버튼 */}
                    {showActions && (
                        <button
                            onClick={handleToggleSelection}
                            className={`
                                p-2 rounded-lg transition-colors duration-200
                                ${isSelected
                                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }
                             `}
                            disabled={!isSelected && getRemainingSlots() === 0}
                        >
                            {isSelected ? (
                                <StarOff className="w-5 h-5" />
                            ) : (
                                <Star className="w-5 h-5" />
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* 가격 정보 */}
            <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold text-gray-900">
                                ₩{formatPrice(coin.current_price)}
                            </span>
                            <div className={`
                                flex items-center space-x-1 px-2 py-1 rounded-full text-sm
                                ${coin.change_rate >= 0
                                    ? 'text-red-600 bg-red-50'
                                    : 'text-blue-600 bg-blue-50'
                                }
                            `}>
                                {coin.change_rate >= 0 ? (
                                    <TrendingUp className="w-4 h-4" />
                                ) : (
                                    <TrendingDown className="w-4 h-4" />
                                )}
                                <span>
                                    {coin.change_rate >= 0 ? '+' : ''}{coin.change_rate?.toFixed(2) || '0.00'}%
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                            {coin.change_rate >= 0 ? '+' : ''}₩{formatPrice(coin.change_price)}
                        </p>
                    </div>
                </div>

                {/* 거래량 */}
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">24시간 거래량</span>
                    <span className="font-medium text-gray-900">
                        ₩{formatVolume(coin.volume_24h)}
                    </span>
                </div>

                {/* AI 분석 정보 */}
                {coin.analysis && (
                    <div className="pt-3 border-t border-gray-100 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">AI 분석 점수</span>
                            <div className="flex items-center space-x-2">
                                {/* ✅ 분석 상태 아이콘 */}
                                {coin.analysis.score > 0 ? (
                                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                                ) : (
                                    <ClockIcon className="w-4 h-4 text-yellow-500 animate-pulse" />
                                )}
                                <div className={`font-bold ${getScoreColor(coin.analysis.score || 0)}`}>
                                    {coin.analysis?.score !== undefined && coin.analysis.score > 0
                                        ? `${coin.analysis.score.toFixed(1)}/10`
                                        : "0.0/10"}
                                </div>
                                <span className={`
                                    px-2 py-1 rounded-full text-xs font-medium
                                    ${getRecommendationColor(coin.analysis.recommendation || 'ANALYZING')}
                                `}>
                                    {(() => {
                                        switch (coin.analysis.recommendation) {
                                            case 'STRONG_BUY': return '강력매수';
                                            case 'BUY': return '매수';
                                            case 'HOLD': return '보유';
                                            case 'SELL': return '매도';
                                            case 'WEAK_SELL': return '약매도';
                                            default: return '분석전';
                                        }
                                    })()}
                                </span>
                            </div>
                        </div>

                        {/* 세부 점수 - 안전한 렌더링 */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="font-medium text-gray-900">
                                    {(coin.analysis.technical_score || 0).toFixed(1)}
                                </div>
                                <div className="text-gray-500">기술</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="font-medium text-gray-900">
                                    {(coin.analysis.fundamental_score || 0).toFixed(1)}
                                </div>
                                <div className="text-gray-500">펀더멘탈</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="font-medium text-gray-900">
                                    {(coin.analysis.sentiment_score || 0).toFixed(1)}
                                </div>
                                <div className="text-gray-500">심리</div>
                            </div>
                        </div>

                        {/* 분석 상태 및 마지막 업데이트 */}
                        <div className="flex justify-between items-center text-xs text-gray-400 pt-1">
                            <span>
                                {coin.analysis.last_analyzed
                                    ? `분석: ${new Date(coin.analysis.last_analyzed).toLocaleTimeString('ko-KR')}`
                                    : '분석 대기중'}
                            </span>
                            {coin.analysis.signals && coin.analysis.signals.length > 0 && (
                                <span className="text-blue-600">
                                    신호 {coin.analysis.signals.length}개
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                        <button
                            onClick={async () => {
                                console.log('🧪 분석 테스트 실행:', coin.market);
                                const { useAnalysisStore } = await import('../../../components/features/analysis/state/analysisStore');
                                const { fetchIndicators } = useAnalysisStore.getState();

                                // 임시 가격 데이터로 테스트
                                const mockPrices = Array.from({ length: 50 }, (_, i) =>
                                    coin.current_price * (1 + Math.sin(i * 0.1) * 0.02)
                                );
                                await fetchIndicators(coin.market, mockPrices, []);
                            }}
                            className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded"
                        >
                            🧪 분석 테스트
                        </button>
                    </div>
                )}

                {/* 마지막 업데이트 */}
                <div className="flex justify-between items-center pt-2 text-xs text-gray-400">
                    <span>마지막 업데이트</span>
                    <span>{new Date(coin.last_updated).toLocaleString('ko-KR')}</span>
                </div>
            </div>
        </div>
    );
};

export default CoinItem;
