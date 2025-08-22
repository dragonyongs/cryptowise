import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    MinusIcon,
    FireIcon
} from '@heroicons/react/24/outline';

export default function MarketOverview() {
    const [timeframe, setTimeframe] = useState('24h');

    const marketData = [
        {
            symbol: 'BTC',
            name: '비트코인',
            price: 65420000,
            change: 2.3,
            volume: '2.4조',
            rank: 1,
            trending: true
        },
        {
            symbol: 'ETH',
            name: '이더리움',
            price: 3250000,
            change: -1.2,
            volume: '1.8조',
            rank: 2,
            trending: false
        },
        {
            symbol: 'XRP',
            name: '리플',
            price: 850,
            change: 8.7,
            volume: '1.2조',
            rank: 5,
            trending: true
        },
        {
            symbol: 'ADA',
            name: '에이다',
            price: 520,
            change: 4.2,
            volume: '890억',
            rank: 8,
            trending: true
        },
        {
            symbol: 'SOL',
            name: '솔라나',
            price: 185000,
            change: -2.8,
            volume: '756억',
            rank: 6,
            trending: false
        }
    ];

    const getChangeIcon = (change) => {
        if (change > 0) return ArrowTrendingUpIcon;
        if (change < 0) return ArrowTrendingDownIcon;
        return MinusIcon;
    };

    const getChangeColor = (change) => {
        if (change > 0) return 'text-crypto-success-600';
        if (change < 0) return 'text-crypto-danger-600';
        return 'text-crypto-neutral-500';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-crypto-neutral-900">
                    시장 개요
                </h2>

                <div className="flex space-x-1 bg-crypto-neutral-100 rounded-lg p-1">
                    {['1h', '24h', '7d'].map((period) => (
                        <button
                            key={period}
                            onClick={() => setTimeframe(period)}
                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${timeframe === period
                                ? 'bg-white text-crypto-primary-600 shadow-sm'
                                : 'text-crypto-neutral-600 hover:text-crypto-neutral-900'
                                }`}
                        >
                            {period}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-3">
                {marketData.map((coin, index) => {
                    const ChangeIcon = getChangeIcon(coin.change);

                    return (
                        <motion.div
                            key={coin.symbol}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 hover:bg-crypto-neutral-50 rounded-lg transition-colors group"
                        >
                            <div className="flex items-center space-x-3">
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-crypto-neutral-500 w-4">
                                        #{coin.rank}
                                    </span>
                                    {coin.trending && (
                                        <FireIcon className="w-3 h-3 text-orange-500" />
                                    )}
                                </div>

                                <div>
                                    <div className="flex items-center space-x-2">
                                        <span className="font-semibold text-crypto-neutral-900">
                                            {coin.symbol}
                                        </span>
                                        <span className="text-sm text-crypto-neutral-600">
                                            {coin.name}
                                        </span>
                                    </div>
                                    <span className="text-xs text-crypto-neutral-500">
                                        거래량: {coin.volume}
                                    </span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="font-semibold text-crypto-neutral-900">
                                    ₩{coin.price.toLocaleString()}
                                </div>
                                <div className={`flex items-center space-x-1 text-sm ${getChangeColor(coin.change)}`}>
                                    <ChangeIcon className="w-4 h-4" />
                                    <span>{Math.abs(coin.change)}%</span>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div className="mt-4 pt-4 border-t border-crypto-neutral-200">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-crypto-neutral-600">전체 시가총액</span>
                    <span className="font-semibold text-crypto-neutral-900">2,847조원</span>
                </div>
            </div>
        </motion.div>
    );
}
