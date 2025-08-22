import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    ArrowUpIcon,
    ArrowDownIcon,
    ClockIcon,
    FilterIcon
} from '@heroicons/react/24/outline';

export default function RecentTrades({ trades }) {
    const [filter, setFilter] = useState('all'); // all, buy, sell
    const [sortBy, setSortBy] = useState('date'); // date, profit, amount

    const getActionIcon = (action) => {
        return action === 'BUY' ? ArrowUpIcon : ArrowDownIcon;
    };

    const getActionColor = (action) => {
        return action === 'BUY'
            ? 'text-crypto-success-600 bg-crypto-success-50'
            : 'text-crypto-danger-600 bg-crypto-danger-50';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    const filteredTrades = trades.filter(trade => {
        if (filter === 'all') return true;
        return trade.action.toLowerCase() === filter;
    });

    const sortedTrades = [...filteredTrades].sort((a, b) => {
        if (sortBy === 'date') {
            return new Date(b.date) - new Date(a.date);
        }
        if (sortBy === 'amount') {
            return b.total - a.total;
        }
        return 0;
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-crypto-neutral-900">
                    최근 거래 내역
                </h3>

                <div className="flex items-center space-x-2">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="text-sm border border-crypto-neutral-300 rounded-lg px-3 py-1"
                    >
                        <option value="all">전체</option>
                        <option value="buy">매수</option>
                        <option value="sell">매도</option>
                    </select>

                    <button className="p-2 text-crypto-neutral-600 hover:text-crypto-neutral-800 transition-colors">
                        <FilterIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {sortedTrades.length === 0 ? (
                <div className="text-center py-12">
                    <ClockIcon className="w-12 h-12 text-crypto-neutral-400 mx-auto mb-3" />
                    <p className="text-crypto-neutral-500">거래 내역이 없습니다</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sortedTrades.map((trade, index) => {
                        const ActionIcon = getActionIcon(trade.action);

                        return (
                            <motion.div
                                key={trade.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="flex items-center justify-between p-4 border border-crypto-neutral-200 rounded-lg hover:shadow-sm transition-shadow"
                            >
                                <div className="flex items-center space-x-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getActionColor(trade.action)}`}>
                                        <ActionIcon className="w-5 h-5" />
                                    </div>

                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-crypto-neutral-900">
                                                {trade.symbol}
                                            </span>
                                            <span className={`text-sm font-medium ${trade.action === 'BUY' ? 'text-crypto-success-600' : 'text-crypto-danger-600'
                                                }`}>
                                                {trade.action === 'BUY' ? '매수' : '매도'}
                                            </span>
                                        </div>

                                        <div className="text-sm text-crypto-neutral-600">
                                            {trade.amount}개 × ₩{formatCurrency(trade.price)}
                                        </div>

                                        <div className="text-xs text-crypto-neutral-500 mt-1">
                                            {trade.reason}
                                        </div>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="font-semibold text-crypto-neutral-900">
                                        ₩{formatCurrency(trade.total)}
                                    </div>
                                    <div className="text-sm text-crypto-neutral-500">
                                        {trade.date}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {sortedTrades.length > 0 && (
                <div className="mt-4 pt-4 border-t border-crypto-neutral-200">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-crypto-neutral-600">
                            총 {sortedTrades.length}건의 거래
                        </span>
                        <button className="text-crypto-primary-600 hover:text-crypto-primary-700 font-medium transition-colors">
                            전체 내역 보기
                        </button>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
