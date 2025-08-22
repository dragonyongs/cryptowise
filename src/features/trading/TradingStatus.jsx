// src/features/trading/TradingStatus.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    CpuChipIcon,
    SignalIcon,
    EyeIcon,
    BoltIcon,
    CogIcon
} from '@heroicons/react/24/outline';

export default function TradingStatus() {
    const [realTimeData, setRealTimeData] = useState({
        signalsProcessed: 0,
        marketsScanned: 0,
        lastUpdate: new Date().toLocaleTimeString()
    });

    const [savedConfig, setSavedConfig] = useState(null);

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

    // 저장된 설정 로드 함수
    const loadSavedConfig = () => {
        try {
            if (typeof window !== "undefined" && window.localStorage) {
                const saved = window.localStorage.getItem('cryptowise_trading_config');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setSavedConfig(parsed);
                    return;
                }
            }
        } catch (error) {
            console.error('설정 로드 실패:', error);
        }
        setSavedConfig(null);
    };

    useEffect(() => {
        // 초기 로드
        loadSavedConfig();

        // 폴링(다른 탭에서 변경될 때 감지)
        const pollInterval = setInterval(loadSavedConfig, 2000);

        // storage 이벤트 리스너(다른 탭에서 저장할 때 즉시 반영)
        const onStorage = (e) => {
            if (e.key === 'cryptowise_trading_config') {
                loadSavedConfig();
            }
        };
        window.addEventListener && window.addEventListener('storage', onStorage);

        return () => {
            clearInterval(pollInterval);
            window.removeEventListener && window.removeEventListener('storage', onStorage);
        };
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
            value: savedConfig ? '대기' : '설정 필요',
            status: savedConfig ? 'standby' : 'inactive',
            icon: BoltIcon,
            description: savedConfig
                ? '매수/매도 조건 충족 시 자동으로 실행됩니다'
                : '거래 설정을 먼저 완료해주세요'
        }
    ];

    const getStatusColor = (status) => {
        const colors = {
            active: 'crypto-success',
            processing: 'crypto-primary',
            monitoring: 'crypto-warning',
            standby: 'crypto-neutral',
            inactive: 'text-red-500'
        };
        return colors[status] || 'crypto-neutral';
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
                    <h2 className="text-xl font-bold">실시간 시스템 상태</h2>
                    <p className="text-blue-100">실행 중</p>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {statusItems.map((item, index) => {
                            const colorClass = getStatusColor(item.status);
                            return (
                                <motion.div
                                    key={index}
                                    className="text-center p-4 bg-gray-50 rounded-lg border"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <item.icon className={`w-8 h-8 mx-auto mb-2 ${colorClass}`} />
                                    <h3 className="font-semibold text-gray-900">{item.label}</h3>
                                    <p className={`text-lg font-bold ${colorClass}`}>{item.value}</p>
                                    <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
                <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4">
                    <h2 className="text-xl font-bold flex items-center">
                        <CogIcon className="w-6 h-6 mr-2" />
                        현재 활성 거래 설정
                    </h2>
                    <p className="text-green-100">저장된 거래 조건과 포트폴리오 할당 상태</p>
                </div>

                <div className="p-6">
                    {savedConfig ? (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-lg font-semibold mb-3">포트폴리오 할당</h4>
                                <div className="grid grid-cols-4 gap-4">
                                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {Math.round((savedConfig.portfolioAllocation?.cash || 0) * 100)}%
                                        </div>
                                        <div className="text-sm text-gray-600">현금</div>
                                    </div>
                                    <div className="text-center p-3 bg-green-50 rounded-lg">
                                        <div className="text-2xl font-bold text-green-600">
                                            {Math.round((savedConfig.portfolioAllocation?.t1 || 0) * 100)}%
                                        </div>
                                        <div className="text-sm text-gray-600">Tier 1</div>
                                    </div>
                                    <div className="text-center p-3 bg-yellow-50 rounded-lg">
                                        <div className="text-2xl font-bold text-yellow-600">
                                            {Math.round((savedConfig.portfolioAllocation?.t2 || 0) * 100)}%
                                        </div>
                                        <div className="text-sm text-gray-600">Tier 2</div>
                                    </div>
                                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-600">
                                            {Math.round((savedConfig.portfolioAllocation?.t3 || 0) * 100)}%
                                        </div>
                                        <div className="text-sm text-gray-600">Tier 3</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <h5 className="font-semibold text-green-800 mb-3">매수 조건</h5>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>최소 점수:</span>
                                            <span className="font-bold">{savedConfig.buyConditions?.minScore ?? '-'}점</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>RSI 임계값:</span>
                                            <span className="font-bold">{savedConfig.buyConditions?.rsiThreshold ?? '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>신뢰도 수준:</span>
                                            <span className="font-bold">{Math.round((savedConfig.buyConditions?.confidenceLevel || 0) * 100)}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <h5 className="font-semibold text-red-800 mb-3">매도 조건</h5>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span>수익 목표(1차):</span>
                                            <span className="font-bold text-green-600">+{savedConfig.sellConditions?.profitTarget ?? '-'}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>손절 기준:</span>
                                            <span className="font-bold text-red-600">{savedConfig.sellConditions?.stopLoss ?? '-'}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>RSI 과매수:</span>
                                            <span className="font-bold">{savedConfig.sellConditions?.rsiOverbought ?? '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {savedConfig.savedAt && (
                                <div className="text-center text-sm text-gray-500 border-t pt-4">
                                    마지막 저장: {new Date(savedConfig.savedAt).toLocaleString()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <CogIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-semibold text-gray-600 mb-2">저장된 거래 설정이 없습니다</h3>
                            <p className="text-gray-500">거래 설정 페이지에서 먼저 설정을 완료해주세요.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg border overflow-hidden">
                <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold">시스템 로그</h3>
                    <p className="text-sm text-gray-600">{realTimeData.lastUpdate}</p>
                </div>

                <div className="p-4 bg-gray-900 text-green-400 font-mono text-sm max-h-40 overflow-y-auto">
                    <div className="space-y-1">
                        <div>[분석] BTC/KRW 기술적 지표 업데이트 완료</div>
                        <div>[신호] ETH 매집 구간 진입 감지</div>
                        <div>[실행] 포트폴리오 리밸런싱 대기 중...</div>
                        {savedConfig && (
                            <div>[설정] 거래 조건 활성화됨 - 수익목표: {savedConfig.sellConditions?.profitTarget}%</div>
                        )}
                    </div>
                </div>

                <div className="p-3 bg-gray-50 text-xs text-gray-500 text-right">
                    마지막 업데이트: {realTimeData.lastUpdate}
                </div>
            </div>
        </div>
    );
}
