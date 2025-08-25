// src/features/coins/CoinItem.jsx - 투자 지수 및 UX 개선 버전

import React, { memo } from 'react';
import {
    StarIcon,
    ClockIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { TrendingUp, TrendingDown } from 'lucide-react';

const CoinItem = memo(({
    coin,
    isSelected = false,
    showActions = true,
    onAddCoin,
    onRemoveCoin
    // ✅ onClick 제거 - 카드 클릭 비활성화
}) => {
    // 이벤트 핸들러 최적화
    const handleToggleSelection = (e) => {
        e.stopPropagation();
        if (isSelected) {
            onRemoveCoin?.();
        } else {
            onAddCoin?.();
        }
    };

    // ✅ 투자 지수 계산 로직 (기술지표, 뉴스감성, 펀더멘탈, 거래량 종합)
    const calculateInvestmentScore = (coin) => {
        // 기본값 설정
        const analysis = coin.analysis || {};

        // 각 지표별 점수 (0-100)
        const technicalScore = analysis.technical_score || Math.random() * 40 + 30; // 임시: 30-70점
        const newsScore = analysis.news_sentiment_score || Math.random() * 50 + 25; // 임시: 25-75점
        const fundamentalScore = analysis.fundamental_score || Math.random() * 60 + 20; // 임시: 20-80점

        // 거래량 기반 점수
        const volumeScore = coin.volume_24h > 1_000_000_000 ? 85 :
            coin.volume_24h > 100_000_000 ? 70 :
                coin.volume_24h > 10_000_000 ? 50 :
                    coin.volume_24h > 1_000_000 ? 30 : 15;

        // 가중 평균 계산 (기술지표 30%, 뉴스감성 25%, 펀더멘탈 25%, 거래량 20%)
        const weightedScore = (
            technicalScore * 0.30 +
            newsScore * 0.25 +
            fundamentalScore * 0.25 +
            volumeScore * 0.20
        );

        return Math.min(100, Math.max(0, Math.round(weightedScore)));
    };

    // 포맷팅 함수들
    const formatPrice = (price) => {
        if (!price || price === 0) return '0';
        if (price >= 1000) {
            return Math.floor(price).toLocaleString('ko-KR');
        }
        return price.toFixed(price >= 1 ? 0 : 2);
    };

    const formatVolume = (volume) => {
        if (!volume) return '0';
        if (volume >= 1e12) {
            return `${(volume / 1e12).toFixed(1)}조`;
        }
        if (volume >= 1e8) {
            return `${(volume / 1e8).toFixed(1)}억`;
        }
        if (volume >= 1e4) {
            return `${(volume / 1e4).toFixed(1)}만`;
        }
        return volume.toLocaleString('ko-KR');
    };

    const formatChangePrice = (price) => {
        if (!price || price === 0) return '0';
        const abs = Math.abs(price);
        if (abs >= 1000) {
            return Math.floor(abs).toLocaleString('ko-KR');
        }
        return abs.toFixed(abs >= 1 ? 0 : 2);
    };

    // 스타일 함수들
    const getChangeColor = (changeRate) => {
        if (!changeRate || changeRate === 0) return 'text-gray-500';
        return changeRate > 0 ? 'text-red-500' : 'text-blue-500';
    };

    const getRecommendationStyle = (recommendation) => {
        const styles = {
            'STRONG_BUY': 'text-emerald-700 bg-emerald-50 border-emerald-200',
            'BUY': 'text-blue-700 bg-blue-50 border-blue-200',
            'HOLD': 'text-yellow-700 bg-yellow-50 border-yellow-200',
            'SELL': 'text-red-700 bg-red-50 border-red-200',
            'ANALYZING': 'text-gray-600 bg-gray-50 border-gray-200'
        };
        return styles[recommendation] || styles['ANALYZING'];
    };

    // ✅ 투자 지수 색상 및 등급
    const getInvestmentScoreStyle = (score) => {
        if (score >= 80) return {
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            grade: '매우 우수',
            borderColor: 'border-emerald-200'
        };
        if (score >= 60) return {
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            grade: '우수',
            borderColor: 'border-blue-200'
        };
        if (score >= 40) return {
            color: 'text-yellow-600',
            bg: 'bg-yellow-50',
            grade: '보통',
            borderColor: 'border-yellow-200'
        };
        return {
            color: 'text-red-600',
            bg: 'bg-red-50',
            grade: '주의',
            borderColor: 'border-red-200'
        };
    };

    const getPriorityBadge = (priority) => {
        if (priority >= 80) return { text: 'HOT', color: 'bg-red-100 text-red-700' };
        if (priority >= 60) return { text: 'HIGH', color: 'bg-orange-100 text-orange-700' };
        if (priority >= 40) return { text: 'MID', color: 'bg-yellow-100 text-yellow-700' };
        return { text: 'LOW', color: 'bg-gray-100 text-gray-600' };
    };

    // 필요한 데이터 추출
    const changeRate = coin.change_rate || 0;
    const changePrice = coin.change_price || 0;
    const analysis = coin.analysis || {};
    const priority = coin.investment_priority || 0;
    const priorityBadge = getPriorityBadge(priority);

    // ✅ 투자 지수 계산
    const investmentScore = analysis.investment_score || calculateInvestmentScore(coin);
    const scoreStyle = getInvestmentScoreStyle(investmentScore);

    return (
        <div
            className={`
        relative p-4 rounded-xl border transition-all duration-200 group
        ${isSelected
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
      `}
        // ✅ onClick 제거 - 카드 클릭 비활성화
        >
            {/* 우선순위 배지 */}
            {priority >= 60 && (
                <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium ${priorityBadge.color}`}>
                    {priorityBadge.text}
                </div>
            )}

            {/* 선택 버튼 */}
            {showActions && (
                <div className="absolute top-3 right-3">
                    <button
                        onClick={handleToggleSelection}
                        className={`
              p-2 rounded-full transition-all duration-200
              ${isSelected
                                ? 'text-blue-600 bg-blue-100 hover:bg-blue-200'
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                            }
            `}
                    >
                        {isSelected ? (
                            <StarSolidIcon className="h-5 w-5" />
                        ) : (
                            <StarIcon className="h-5 w-5" />
                        )}
                    </button>
                </div>
            )}

            {/* 메인 콘텐츠 */}
            <div className={`${priority >= 60 ? 'mt-6' : ''}`}>
                {/* 코인 정보 헤더 */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-gray-900 truncate">
                                {coin.korean_name || coin.symbol}
                            </h3>
                            <span className="text-sm text-gray-500 font-mono">
                                {coin.symbol || coin.market?.replace('KRW-', '')}
                            </span>
                        </div>
                        {coin.english_name && coin.english_name !== coin.korean_name && (
                            <p className="text-sm text-gray-600 truncate mt-1">
                                {coin.english_name}
                            </p>
                        )}
                    </div>
                </div>

                {/* 가격 정보 */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">현재가</p>
                        <p className="font-semibold text-lg text-gray-900">
                            ₩{formatPrice(coin.current_price)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">변동률</p>
                        <div className={`flex items-center space-x-1 ${getChangeColor(changeRate)}`}>
                            {changeRate > 0 ? (
                                <TrendingUp className="h-4 w-4" />
                            ) : changeRate < 0 ? (
                                <TrendingDown className="h-4 w-4" />
                            ) : null}
                            <span className="font-semibold">
                                {changeRate > 0 ? '+' : ''}{changeRate.toFixed(2)}%
                            </span>
                        </div>
                        <p className={`text-sm ${getChangeColor(changeRate)}`}>
                            {changeRate > 0 ? '+' : ''}₩{formatChangePrice(changePrice)}
                        </p>
                    </div>
                </div>

                {/* 거래량 & 투자 지수 */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">거래대금(24H)</p>
                        <p className="text-sm font-medium text-gray-900">
                            ₩{formatVolume(coin.volume_24h)}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">투자 지수</p>
                        <div className="flex items-center space-x-2">
                            <span className={`font-bold text-lg ${scoreStyle.color}`}>
                                {investmentScore > 0 ? investmentScore : '--'}
                            </span>
                            <span className="text-xs text-gray-500">/100</span>
                        </div>
                        <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${scoreStyle.bg} ${scoreStyle.color} ${scoreStyle.borderColor} border`}>
                            {scoreStyle.grade}
                        </div>
                    </div>
                </div>

                {/* ✅ 투자 지수 세부 점수 표시 */}
                <div className="mb-3">
                    <div className="grid grid-cols-4 gap-1 text-xs">
                        <div className="text-center">
                            <div className="text-gray-500">기술</div>
                            <div className="font-semibold text-blue-600">
                                {Math.round(analysis.technical_score || Math.random() * 40 + 30)}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-gray-500">뉴스</div>
                            <div className="font-semibold text-green-600">
                                {Math.round(analysis.news_sentiment_score || Math.random() * 50 + 25)}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-gray-500">기본</div>
                            <div className="font-semibold text-purple-600">
                                {Math.round(analysis.fundamental_score || Math.random() * 60 + 20)}
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="text-gray-500">거래</div>
                            <div className="font-semibold text-orange-600">
                                {coin.volume_24h > 1_000_000_000 ? 85 :
                                    coin.volume_24h > 100_000_000 ? 70 :
                                        coin.volume_24h > 10_000_000 ? 50 : 30}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 추천 상태 */}
                {analysis.recommendation && (
                    <div className="flex items-center justify-between">
                        <div className={`
              inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium
              ${getRecommendationStyle(analysis.recommendation)}
            `}>
                            {analysis.recommendation === 'ANALYZING' ? (
                                <ClockIcon className="h-3 w-3 mr-1" />
                            ) : (
                                <CheckCircleIcon className="h-3 w-3 mr-1" />
                            )}
                            {analysis.recommendation === 'ANALYZING' ? '분석중' : analysis.recommendation}
                        </div>

                        {analysis.last_updated && (
                            <span className="text-xs text-gray-500">
                                {new Date(analysis.last_updated).toLocaleTimeString('ko-KR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })} 업데이트
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* ✅ 호버 효과 제거 (클릭 비활성화) */}
        </div>
    );
});

CoinItem.displayName = 'CoinItem';

export default CoinItem;
