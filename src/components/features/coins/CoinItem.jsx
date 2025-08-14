// src/components/features/coins/CoinItem.jsx
import React from 'react';
import { Plus, Minus, TrendingUp, TrendingDown, Star, StarOff } from 'lucide-react';
import { useCoinStore } from '../../../stores/coinStore';

const CoinItem = ({ coin, isSelected = false, showActions = true }) => {
    const { addCoin, removeCoin, getRemainingSlots } = useCoinStore();

    const handleToggleSelection = async () => {
        if (isSelected) {
            const result = removeCoin(coin.market);
            if (!result.success) {
                // 에러 핸들링 (토스트 메시지 등)
                console.error(result.message);
            }
        } else {
            const result = addCoin(coin.market);
            if (!result.success) {
                // 에러 핸들링 (토스트 메시지 등)
                console.error(result.message);
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
                                    {coin.change_rate >= 0 ? '+' : ''}{coin.change_rate.toFixed(2)}%
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
                                <span className={`font-bold ${getScoreColor(coin.analysis.score)}`}>
                                    {coin.analysis.score}/10
                                </span>
                                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${getRecommendationColor(coin.analysis.recommendation)}
                `}>
                                    {coin.analysis.recommendation === 'STRONG_BUY' && '강력매수'}
                                    {coin.analysis.recommendation === 'BUY' && '매수'}
                                    {coin.analysis.recommendation === 'HOLD' && '보유'}
                                    {coin.analysis.recommendation === 'SELL' && '매도'}
                                    {coin.analysis.recommendation === 'ANALYZING' && '분석중'}
                                </span>
                            </div>
                        </div>

                        {/* 세부 점수 */}
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="font-medium text-gray-900">
                                    {coin.analysis.technical_score.toFixed(1)}
                                </div>
                                <div className="text-gray-500">기술</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="font-medium text-gray-900">
                                    {coin.analysis.fundamental_score.toFixed(1)}
                                </div>
                                <div className="text-gray-500">펀더멘탈</div>
                            </div>
                            <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="font-medium text-gray-900">
                                    {coin.analysis.sentiment_score.toFixed(1)}
                                </div>
                                <div className="text-gray-500">심리</div>
                            </div>
                        </div>
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
