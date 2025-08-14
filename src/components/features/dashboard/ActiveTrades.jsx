import React from 'react';
import { motion } from 'framer-motion';
import {
    ArrowUpIcon,
    ArrowDownIcon,
    ClockIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function ActiveTrades({ trades }) {
    const getActionIcon = (action) => {
        return action === 'BUY' ? ArrowUpIcon : ArrowDownIcon;
    };

    const getActionColor = (action) => {
        return action === 'BUY' ? 'text-crypto-success-600' : 'text-crypto-danger-600';
    };

    const getTypeBadge = (type) => {
        const badges = {
            trade: { label: '거래', color: 'crypto-primary' },
            analysis: { label: '분석', color: 'crypto-warning' },
            alert: { label: '알림', color: 'crypto-danger' }
        };

        const badge = badges[type] || badges.trade;
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${badge.color}-50 text-${badge.color}-700`}>
                {badge.label}
            </span>
        );
    };

    if (!trades || trades.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
            >
                <h2 className="text-lg font-semibold text-crypto-neutral-900 mb-6">
                    최근 활동
                </h2>

                <div className="text-center py-12">
                    <ClockIcon className="w-12 h-12 text-crypto-neutral-400 mx-auto mb-3" />
                    <p className="text-crypto-neutral-500">아직 활동 내역이 없습니다</p>
                    <p className="text-sm text-crypto-neutral-400 mt-1">
                        첫 번째 전략을 설정해보세요
                    </p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-crypto-neutral-900">
                    최근 활동
                </h2>
                <span className="text-sm text-crypto-neutral-500">
                    실시간 업데이트
                </span>
            </div>

            <div className="space-y-4">
                {trades.map((trade, index) => (
                    <motion.div
                        key={trade.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-4 border border-crypto-neutral-200 rounded-lg hover:shadow-sm transition-shadow"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                {getTypeBadge(trade.type)}

                                {trade.type === 'trade' && (
                                    <div className={`w-8 h-8 rounded-full bg-crypto-neutral-100 flex items-center justify-center ${getActionColor(trade.action)}`}>
                                        {React.createElement(getActionIcon(trade.action), { className: 'w-4 h-4' })}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1">
                                {trade.type === 'trade' ? (
                                    <div>
                                        <div className="flex items-center space-x-2">
                                            <span className="font-semibold text-crypto-neutral-900">
                                                {trade.symbol}
                                            </span>
                                            <span className={`text-sm font-medium ${getActionColor(trade.action)}`}>
                                                {trade.action === 'BUY' ? '매수' : '매도'}
                                            </span>
                                            <span className="text-sm text-crypto-neutral-600">
                                                {trade.amount}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <span className="text-sm text-crypto-neutral-500">
                                                {trade.strategy}
                                            </span>
                                            <span className="text-sm font-medium text-crypto-neutral-700">
                                                ₩{trade.value?.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="font-medium text-crypto-neutral-900">
                                            {trade.message}
                                        </p>
                                        {trade.confidence && (
                                            <div className="flex items-center space-x-2 mt-1">
                                                <span className="text-sm text-crypto-neutral-500">신뢰도:</span>
                                                <span className="text-sm font-medium text-crypto-primary-600">
                                                    {trade.confidence}%
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="text-right">
                            <span className="text-sm text-crypto-neutral-500">
                                {trade.time}
                            </span>
                            {trade.level === 'warning' && (
                                <div className="flex items-center justify-end mt-1">
                                    <span className="w-2 h-2 bg-crypto-warning-500 rounded-full animate-pulse"></span>
                                </div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t border-crypto-neutral-200">
                <button className="w-full text-sm text-crypto-primary-600 hover:text-crypto-primary-700 font-medium transition-colors">
                    모든 활동 보기
                </button>
            </div>
        </motion.div>
    );
}
