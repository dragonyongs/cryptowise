import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    AreaChart
} from 'recharts';

export default function BacktestChart({ data }) {
    const [chartType, setChartType] = useState('area'); // area, line

    const formatCurrency = (value) => {
        return `₩${(value / 1000000).toFixed(1)}M`;
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString('ko-KR', {
            month: 'short',
            day: 'numeric'
        });
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const value = payload[0].value;
            const initialValue = data[0]?.value || 10000000;
            const returnRate = ((value - initialValue) / initialValue * 100).toFixed(2);

            return (
                <div className="bg-white p-4 shadow-lg rounded-lg border">
                    <p className="font-semibold text-crypto-neutral-900">
                        {formatDate(label)}
                    </p>
                    <div className="space-y-1 mt-2">
                        <p className="text-sm">
                            <span className="text-crypto-neutral-600">포트폴리오 가치: </span>
                            <span className="font-medium">₩{value.toLocaleString()}</span>
                        </p>
                        <p className="text-sm">
                            <span className="text-crypto-neutral-600">수익률: </span>
                            <span className={`font-medium ${returnRate >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'
                                }`}>
                                {returnRate >= 0 ? '+' : ''}{returnRate}%
                            </span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-crypto-neutral-900">
                    포트폴리오 성과 추이
                </h3>

                <div className="flex space-x-1 bg-crypto-neutral-100 rounded-lg p-1">
                    <button
                        onClick={() => setChartType('area')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${chartType === 'area'
                                ? 'bg-white text-crypto-primary-600 shadow-sm'
                                : 'text-crypto-neutral-600 hover:text-crypto-neutral-900'
                            }`}
                    >
                        영역
                    </button>
                    <button
                        onClick={() => setChartType('line')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${chartType === 'line'
                                ? 'bg-white text-crypto-primary-600 shadow-sm'
                                : 'text-crypto-neutral-600 hover:text-crypto-neutral-900'
                            }`}
                    >
                        선형
                    </button>
                </div>
            </div>

            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                className="text-xs"
                            />
                            <YAxis
                                tickFormatter={formatCurrency}
                                className="text-xs"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    ) : (
                        <LineChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={formatDate}
                                className="text-xs"
                            />
                            <YAxis
                                tickFormatter={formatCurrency}
                                className="text-xs"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                dot={{ fill: '#3B82F6', strokeWidth: 0, r: 4 }}
                                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: '#ffffff' }}
                            />
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* 차트 하단 요약 */}
            <div className="mt-6 pt-6 border-t border-crypto-neutral-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-lg font-bold text-crypto-success-600">
                            {data.length > 0 ? Math.max(...data.map(d => d.value)).toLocaleString() : '0'}
                        </div>
                        <div className="text-sm text-crypto-neutral-600">최고 자산</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-crypto-danger-600">
                            {data.length > 0 ? Math.min(...data.map(d => d.value)).toLocaleString() : '0'}
                        </div>
                        <div className="text-sm text-crypto-neutral-600">최저 자산</div>
                    </div>
                    <div>
                        <div className="text-lg font-bold text-crypto-primary-600">
                            {data.length}일
                        </div>
                        <div className="text-sm text-crypto-neutral-600">백테스팅 기간</div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
