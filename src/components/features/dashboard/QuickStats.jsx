// QuickStats.jsx 수정된 import
import React from 'react';
import { motion } from 'framer-motion';
import {
    CurrencyDollarIcon,
    ArrowTrendingUpIcon,     // ✅ TrendingUpIcon 대신 사용
    ArrowTrendingDownIcon,   // ✅ TrendingDownIcon 대신 사용
    ChartBarIcon,
    ClockIcon
} from '@heroicons/react/24/outline';

export default function QuickStats({ data }) {
    const stats = [
        {
            title: '총 자산',
            value: `₩${data?.totalPortfolioValue?.toLocaleString() || '0'}`,
            change: `+${data?.totalReturn || 0}%`,
            changeType: data?.totalReturn >= 0 ? 'positive' : 'negative',
            icon: CurrencyDollarIcon,
            color: 'crypto-primary'
        },
        {
            title: '일일 수익',
            value: `${data?.dailyChange >= 0 ? '+' : ''}${data?.dailyChange || 0}%`,
            change: `₩${((data?.totalPortfolioValue || 0) * (data?.dailyChange || 0) / 100).toLocaleString()}`,
            changeType: data?.dailyChange >= 0 ? 'positive' : 'negative',
            icon: ArrowTrendingUpIcon, // ✅ 수정됨
            color: data?.dailyChange >= 0 ? 'crypto-success' : 'crypto-danger'
        },
        {
            title: '활성 전략',
            value: `${data?.activeStrategies || 0}개`,
            change: '실행 중',
            changeType: 'neutral',
            icon: ChartBarIcon,
            color: 'crypto-primary'
        },
        {
            title: '승률',
            value: `${data?.winRate || 0}%`,
            change: `${data?.totalTrades || 0}회 거래`,
            changeType: data?.winRate >= 60 ? 'positive' : data?.winRate >= 40 ? 'neutral' : 'negative',
            icon: ClockIcon,
            color: data?.winRate >= 60 ? 'crypto-success' : 'crypto-warning'
        }
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
                <motion.div
                    key={stat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-4 lg:p-6"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 bg-${stat.color}-50 rounded-lg flex items-center justify-center`}>
                            <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                        </div>

                        <span
                            className={`text-xs px-2 py-1 rounded-full ${stat.changeType === 'positive'
                                    ? 'bg-crypto-success-50 text-crypto-success-700'
                                    : stat.changeType === 'negative'
                                        ? 'bg-crypto-danger-50 text-crypto-danger-700'
                                        : 'bg-crypto-neutral-100 text-crypto-neutral-600'
                                }`}
                        >
                            {stat.change}
                        </span>
                    </div>

                    <div className="space-y-1">
                        <h3 className="text-sm font-medium text-crypto-neutral-600">
                            {stat.title}
                        </h3>
                        <p className="text-xl lg:text-2xl font-bold text-crypto-neutral-900">
                            {stat.value}
                        </p>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}
