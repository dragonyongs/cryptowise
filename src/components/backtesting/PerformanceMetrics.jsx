import React from 'react';
import { motion } from 'framer-motion';
import {
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CurrencyDollarIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

export default function PerformanceMetrics({ results }) {
    const metrics = [
        {
            title: '총 수익률',
            value: `${results.totalReturn >= 0 ? '+' : ''}${results.totalReturn}%`,
            change: results.totalReturn >= 10 ? 'excellent' : results.totalReturn >= 5 ? 'good' : 'needs_improvement',
            icon: ArrowTrendingUpIcon,
            color: results.totalReturn >= 0 ? 'crypto-success' : 'crypto-danger'
        },
        {
            title: '승률',
            value: `${results.winRate}%`,
            change: results.winRate >= 60 ? 'excellent' : results.winRate >= 40 ? 'good' : 'needs_improvement',
            icon: ChartBarIcon,
            color: results.winRate >= 60 ? 'crypto-success' : results.winRate >= 40 ? 'crypto-warning' : 'crypto-danger'
        },
        {
            title: '최대 낙폭',
            value: `${results.maxDrawdown}%`,
            change: Math.abs(results.maxDrawdown) <= 5 ? 'excellent' : Math.abs(results.maxDrawdown) <= 10 ? 'good' : 'needs_improvement',
            icon: ArrowTrendingDownIcon,
            color: Math.abs(results.maxDrawdown) <= 10 ? 'crypto-success' : 'crypto-danger'
        },
        {
            title: '샤프 비율',
            value: results.sharpeRatio.toFixed(2),
            change: results.sharpeRatio >= 1.5 ? 'excellent' : results.sharpeRatio >= 1.0 ? 'good' : 'needs_improvement',
            icon: CurrencyDollarIcon,
            color: results.sharpeRatio >= 1.0 ? 'crypto-success' : 'crypto-warning'
        }
    ];

    const getChangeLabel = (change) => {
        const labels = {
            excellent: '우수',
            good: '양호',
            needs_improvement: '개선 필요'
        };
        return labels[change];
    };

    const getChangeColor = (change) => {
        const colors = {
            excellent: 'crypto-success',
            good: 'crypto-warning',
            needs_improvement: 'crypto-danger'
        };
        return colors[change];
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
        >
            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-6">
                성과 분석
            </h3>

            {/* 주요 지표 그리드 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {metrics.map((metric, index) => (
                    <motion.div
                        key={metric.title}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 border border-${metric.color}-200 bg-${metric.color}-50 rounded-lg`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <metric.icon className={`w-5 h-5 text-${metric.color}-600`} />
                            <span className={`text-xs px-2 py-1 rounded-full bg-${getChangeColor(metric.change)}-100 text-${getChangeColor(metric.change)}-700`}>
                                {getChangeLabel(metric.change)}
                            </span>
                        </div>

                        <div className="space-y-1">
                            <h4 className="text-sm font-medium text-crypto-neutral-700">
                                {metric.title}
                            </h4>
                            <p className={`text-xl font-bold text-${metric.color}-600`}>
                                {metric.value}
                            </p>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* 상세 분석 */}
            <div className="grid md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-crypto-neutral-900 mb-3">
                        거래 분석
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-crypto-neutral-600">총 거래 수</span>
                            <span className="font-medium">{results.totalTrades}회</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-crypto-neutral-600">수익 거래</span>
                            <span className="font-medium text-crypto-success-600">
                                {Math.round(results.totalTrades * results.winRate / 100)}회
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-crypto-neutral-600">손실 거래</span>
                            <span className="font-medium text-crypto-danger-600">
                                {results.totalTrades - Math.round(results.totalTrades * results.winRate / 100)}회
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 className="font-semibold text-crypto-neutral-900 mb-3">
                        수익 분석
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-crypto-neutral-600">초기 자금</span>
                            <span className="font-medium">₩{formatCurrency(results.initialAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-crypto-neutral-600">최종 자금</span>
                            <span className="font-medium">₩{formatCurrency(results.finalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-crypto-neutral-600">순 수익</span>
                            <span className={`font-medium ${results.finalAmount - results.initialAmount >= 0
                                ? 'text-crypto-success-600'
                                : 'text-crypto-danger-600'
                                }`}>
                                ₩{formatCurrency(results.finalAmount - results.initialAmount)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 종합 평가 */}
            <div className="mt-6 pt-6 border-t border-crypto-neutral-200">
                <div className="bg-crypto-primary-50 border border-crypto-primary-200 rounded-lg p-4">
                    <h4 className="font-semibold text-crypto-primary-900 mb-2">
                        전략 평가
                    </h4>
                    <p className="text-sm text-crypto-primary-800">
                        {results.totalReturn >= 10
                            ? '우수한 성과를 보이는 전략입니다. 실제 투자를 고려해볼 수 있습니다.'
                            : results.totalReturn >= 5
                                ? '양호한 성과를 보이지만 리스크 관리를 강화하는 것이 좋겠습니다.'
                                : '전략 개선이 필요합니다. 매개변수를 조정하거나 다른 접근 방식을 고려해보세요.'
                        }
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
