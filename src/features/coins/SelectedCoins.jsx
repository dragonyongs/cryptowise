// src/components/features/coins/SelectedCoins.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StarIcon, TrashIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { useCoinStore } from '../../stores/coinStore';

const SelectedCoins = ({ onCoinClick, onAnalyzeClick }) => {
    const { selectedCoins, removeCoin } = useCoinStore();

    const handleRemoveCoin = (e, market) => {
        e.stopPropagation();
        removeCoin(market);
    };

    const formatCurrency = (amount) => {
        if (amount >= 1000000000000) {
            return `${(amount / 1000000000000).toFixed(1)}조`;
        } else if (amount >= 100000000) {
            return `${(amount / 100000000).toFixed(1)}억`;
        } else if (amount >= 10000) {
            return `${(amount / 10000).toFixed(1)}만`;
        }
        return amount.toLocaleString();
    };

    if (selectedCoins.length === 0) {
        return (
            <div className="bg-white border-2 border-dashed border-crypto-neutral-300 rounded-xl p-8 text-center">
                <StarIcon className="w-12 h-12 text-crypto-neutral-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-2">
                    관심 코인을 추가해보세요
                </h3>
                <p className="text-crypto-neutral-600">
                    아래 목록에서 관심있는 코인을 선택하여<br />
                    AI 분석과 포트폴리오 관리를 시작하세요
                </p>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-crypto-neutral-900 flex items-center">
                    <StarIcon className="w-5 h-5 mr-2 text-yellow-500" />
                    관심 코인 ({selectedCoins.length})
                </h2>

                {selectedCoins.length > 0 && onAnalyzeClick && (
                    <button
                        onClick={onAnalyzeClick}
                        className="bg-crypto-success-600 text-white px-4 py-2 rounded-lg 
                     hover:bg-crypto-success-700 transition-colors flex items-center space-x-2"
                    >
                        <ArrowTrendingUpIcon className="w-4 h-4" />
                        <span>분석 시작</span>
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1">
                <AnimatePresence>
                    {selectedCoins.map((coin) => (
                        <motion.div
                            key={coin.market}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            whileHover={{ scale: 1.02 }}
                            className="relative p-4 border border-crypto-neutral-200 rounded-lg 
                       hover:shadow-md transition-all group cursor-pointer
                       bg-gradient-to-br from-crypto-success-50 to-white
                       border-crypto-success-200"
                            onClick={() => onCoinClick && onCoinClick(coin)}
                        >
                            {/* 제거 버튼 */}
                            <button
                                onClick={(e) => handleRemoveCoin(e, coin.market)}
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 
                         transition-opacity z-10 p-1 rounded-full hover:bg-red-100"
                            >
                                <TrashIcon className="w-4 h-4 text-crypto-danger-500 hover:text-crypto-danger-700" />
                            </button>

                            {/* 코인 정보 */}
                            <div className="flex items-center space-x-3 mb-3">
                                <div className="w-10 h-10 bg-crypto-primary-100 rounded-full flex items-center justify-center">
                                    <span className="font-bold text-crypto-primary-700 text-sm">
                                        {coin.symbol.slice(0, 2)}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-crypto-neutral-900">
                                        {coin.korean_name}
                                    </h3>
                                    <p className="text-xs text-crypto-neutral-600">
                                        {coin.market} • #{coin.rank}
                                    </p>
                                </div>
                            </div>

                            {/* 가격 및 변화율 */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-crypto-neutral-600">현재가</span>
                                    <span className="font-medium">
                                        ₩{formatCurrency(coin.current_price || 0)}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-crypto-neutral-600">변화율</span>
                                    <span className={`font-medium flex items-center ${(coin.change_rate || 0) >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'
                                        }`}>
                                        {(coin.change_rate || 0) >= 0 ? (
                                            <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                                        ) : (
                                            <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                                        )}
                                        {Math.abs(coin.change_rate || 0).toFixed(2)}%
                                    </span>
                                </div>

                                {/* AI 분석 점수 - 개선된 렌더링 */}
                                <div className="flex justify-between items-center pt-2 border-t border-crypto-neutral-200">
                                    <span className="text-sm text-crypto-neutral-600">AI 점수</span>
                                    <div className="flex items-center space-x-2">
                                        <span className={`font-medium ${(coin.analysis?.score || 0) >= 8 ? 'text-crypto-success-600' :
                                            (coin.analysis?.score || 0) >= 6 ? 'text-crypto-warning-600' : 'text-crypto-neutral-600'
                                            }`}>
                                            {(coin.analysis?.score || 0).toFixed(1)}/10
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${coin.analysis?.recommendation === 'STRONG_BUY' ? 'bg-crypto-success-100 text-crypto-success-700' :
                                            coin.analysis?.recommendation === 'BUY' ? 'bg-crypto-primary-100 text-crypto-primary-700' :
                                                'bg-crypto-neutral-100 text-crypto-neutral-700'
                                            }`}>
                                            {coin.analysis?.recommendation === 'STRONG_BUY' ? '강매수' :
                                                coin.analysis?.recommendation === 'BUY' ? '매수' :
                                                    coin.analysis?.recommendation === 'HOLD' ? '보유' :
                                                        coin.analysis?.recommendation === 'SELL' ? '매도' : '분석중'}
                                        </span>
                                    </div>
                                </div>

                                {/* 마지막 업데이트 시간 */}
                                <div className="text-xs text-crypto-neutral-400 text-center pt-2">
                                    마지막 업데이트: {coin.last_updated ?
                                        new Date(coin.last_updated).toLocaleTimeString('ko-KR') : '알 수 없음'}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </motion.div>
    );
};

export default SelectedCoins;
