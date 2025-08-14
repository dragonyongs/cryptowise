import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

export default function PortfolioOverview({ portfolio }) {
    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-white p-3 shadow-lg rounded-lg border">
                    <p className="font-semibold">{data.korean_name}</p>
                    <p className="text-sm text-gray-600">
                        ₩{formatCurrency(data.value)} ({data.weight}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
        >
            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-6">
                포트폴리오 구성
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
                {/* 파이 차트 */}
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={portfolio}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {portfolio.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={COLORS[index % COLORS.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* 상세 목록 */}
                <div className="space-y-3">
                    {portfolio.map((holding, index) => (
                        <motion.div
                            key={holding.symbol}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 bg-crypto-neutral-50 rounded-lg"
                        >
                            <div className="flex items-center space-x-3">
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                />
                                <div>
                                    <span className="font-semibold text-crypto-neutral-900">
                                        {holding.symbol}
                                    </span>
                                    <p className="text-sm text-crypto-neutral-600">
                                        {holding.korean_name}
                                    </p>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="font-semibold text-crypto-neutral-900">
                                    {holding.weight}%
                                </div>
                                <div className="text-sm text-crypto-neutral-600">
                                    ₩{formatCurrency(holding.value)}
                                </div>
                                {holding.amount !== undefined && (
                                    <div className="text-xs text-crypto-neutral-500">
                                        {holding.amount} {holding.symbol}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* 요약 정보 */}
            <div className="mt-6 pt-6 border-t border-crypto-neutral-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-lg font-bold text-crypto-neutral-900">
                            {portfolio.length}
                        </div>
                        <div className="text-sm text-crypto-neutral-600">보유 자산</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-crypto-success-600">
                            {portfolio.filter(p => p.symbol !== 'KRW').length}
                        </div>
                        <div className="text-sm text-crypto-neutral-600">암호화폐</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-crypto-primary-600">
                            {Math.round(portfolio.reduce((sum, p) => sum + (p.weight || 0), 0))}%
                        </div>
                        <div className="text-sm text-crypto-neutral-600">투자 비율</div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
