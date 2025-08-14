import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    CpuChipIcon,
    SignalIcon,
    EyeIcon,
    BoltIcon
} from '@heroicons/react/24/outline';

export default function TradingStatus() {
    const [realTimeData, setRealTimeData] = useState({
        signalsProcessed: 0,
        marketsScanned: 0,
        lastUpdate: new Date().toLocaleTimeString()
    });

    useEffect(() => {
        const interval = setInterval(() => {
            setRealTimeData(prev => ({
                signalsProcessed: prev.signalsProcessed + Math.floor(Math.random() * 3),
                marketsScanned: Math.floor(Math.random() * 50) + 100,
                lastUpdate: new Date().toLocaleTimeString()
            }));
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const statusItems = [
        {
            label: 'AI 분석 엔진',
            value: '활성',
            status: 'active',
            icon: CpuChipIcon,
            description: '시장 데이터를 실시간으로 분석하고 있습니다'
        },
        {
            label: '신호 처리',
            value: `${realTimeData.signalsProcessed}건`,
            status: 'processing',
            icon: SignalIcon,
            description: '오늘 처리된 매매 신호 수입니다'
        },
        {
            label: '시장 모니터링',
            value: `${realTimeData.marketsScanned}개`,
            status: 'monitoring',
            icon: EyeIcon,
            description: '실시간으로 모니터링 중인 코인 수입니다'
        },
        {
            label: '자동 실행',
            value: '대기',
            status: 'standby',
            icon: BoltIcon,
            description: '매수/매도 조건 충족 시 자동으로 실행됩니다'
        }
    ];

    const getStatusColor = (status) => {
        const colors = {
            active: 'crypto-success',
            processing: 'crypto-primary',
            monitoring: 'crypto-warning',
            standby: 'crypto-neutral'
        };
        return colors[status] || 'crypto-neutral';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-crypto-neutral-900">
                    실시간 시스템 상태
                </h3>

                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-crypto-success-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-crypto-neutral-600">
                        실행 중
                    </span>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
                {statusItems.map((item, index) => {
                    const colorClass = getStatusColor(item.status);

                    return (
                        <motion.div
                            key={item.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className={`p-4 border border-${colorClass}-200 bg-${colorClass}-50 rounded-lg`}
                        >
                            <div className="flex items-center space-x-3">
                                <div className={`w-10 h-10 bg-${colorClass}-100 rounded-lg flex items-center justify-center`}>
                                    <item.icon className={`w-5 h-5 text-${colorClass}-600`} />
                                </div>

                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-crypto-neutral-700">
                                            {item.label}
                                        </span>
                                        <span className={`text-sm font-bold text-${colorClass}-600`}>
                                            {item.value}
                                        </span>
                                    </div>
                                    <p className="text-xs text-crypto-neutral-500 mt-1">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            {/* 실시간 로그 */}
            <div className="bg-crypto-neutral-900 rounded-lg p-4 text-sm font-mono">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-crypto-success-400">시스템 로그</span>
                    <span className="text-crypto-neutral-400 text-xs">
                        {realTimeData.lastUpdate}
                    </span>
                </div>

                <div className="space-y-1 text-crypto-neutral-300">
                    <div className="flex items-center space-x-2">
                        <span className="text-crypto-primary-400">[분석]</span>
                        <span>BTC/KRW 기술적 지표 업데이트 완료</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-crypto-warning-400">[신호]</span>
                        <span>ETH 매집 구간 진입 감지</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-crypto-success-400">[실행]</span>
                        <span>포트폴리오 리밸런싱 대기 중...</span>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-crypto-neutral-200 text-center">
                <span className="text-xs text-crypto-neutral-500">
                    마지막 업데이트: {realTimeData.lastUpdate}
                </span>
            </div>
        </motion.div>
    );
}
