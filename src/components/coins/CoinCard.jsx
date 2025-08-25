// src/components/coins/CoinCard.jsx - CoinAnalysis 스타일
import React from 'react';
import { PlusIcon, MinusIcon } from '@heroicons/react/24/outline';

const CoinCard = ({
    coin,
    onAdd,
    onRemove,
    isSelected = false,
    disabled = false,
    variant = 'list' // 'list', 'card'
}) => {
    if (!coin) return null;

    // 목록 스타일 (CoinAnalysis.jsx와 동일)
    if (variant === 'list') {
        return (
            <div
                className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                onClick={() => {
                    if (disabled) return;
                    if (isSelected && onRemove) {
                        onRemove(coin.market);
                    } else if (!isSelected && onAdd) {
                        onAdd(coin.market);
                    }
                }}
            >
                <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                        {coin.korean_name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {coin.symbol}
                    </div>
                </div>
                {isSelected ? (
                    <MinusIcon className="h-5 w-5 text-red-600" />
                ) : (
                    <PlusIcon className="h-5 w-5 text-blue-600" />
                )}
            </div>
        );
    }

    // 카드 스타일 (기존 유지)
    const formatPrice = (price) => {
        if (!price || typeof price !== 'number') return '₩0';
        if (price >= 1000000) return `₩${(price / 1000000).toFixed(2)}M`;
        if (price >= 1000) return `₩${(price / 1000).toFixed(0)}K`;
        if (price < 1) return `₩${price.toFixed(4)}`;
        return `₩${price.toLocaleString()}`;
    };

    const formatChange = (rate) => {
        if (typeof rate !== 'number') return '+0.00%';
        return `${rate >= 0 ? '+' : ''}${rate.toFixed(2)}%`;
    };

    return (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-800">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {coin.symbol?.slice(0, 2) || 'N/A'}
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                            {coin.korean_name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {coin.symbol}
                        </p>
                    </div>
                </div>

                <div className="text-right">
                    <div className="font-semibold text-gray-900 dark:text-white">
                        {formatPrice(coin.current_price)}
                    </div>
                    <div className={`text-sm ${(coin.change_rate || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatChange(coin.change_rate)}
                    </div>
                </div>

                <button
                    disabled={disabled}
                    onClick={() => {
                        if (isSelected && onRemove) {
                            onRemove(coin.market);
                        } else if (!isSelected && onAdd) {
                            onAdd(coin.market);
                        }
                    }}
                    className={`ml-4 p-2 rounded-md transition-colors disabled:opacity-50 ${isSelected
                            ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900 dark:text-red-300'
                            : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300'
                        }`}
                >
                    {isSelected ? <MinusIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
                </button>
            </div>
        </div>
    );
};

export default React.memo(CoinCard);
