import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useSystemStore } from '../stores/systemStore';
import { useCoinStore } from '../stores/coinStore';
import {
    PlusIcon,
    ChartBarIcon,
    CogIcon,
    CpuChipIcon,
    PlayIcon,
    ClockIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ExclamationTriangleIcon,
    BoltIcon
} from '@heroicons/react/24/outline';

// 컴포넌트들
import QuickStats from '../components/dashboard/QuickStats';
import StrategyCards from '../components/dashboard/StrategyCards';
import MarketOverview from '../components/dashboard/MarketOverview';
import ActiveTrades from '../components/dashboard/ActiveTrades';
import NotificationCenter from '../components/dashboard/NotificationCenter';

export default function Dashboard() {
    const { user } = useAuthStore();
    const { systemHealth, notifications, checkSystemHealth } = useSystemStore();
    const { selectedCoins, userPlan, maxCoins, getRemainingSlots, initializeData, isLoading, error } = useCoinStore();
    const [marketData, setMarketData] = useState(null);
    const [loading, setLoading] = useState(true);

    // 목업 데이터
    const mockDashboardData = {
        totalPortfolioValue: 12350000,
        totalReturn: 23.5,
        dailyChange: 2.1,
        activeStrategies: 3,
        totalTrades: 42,
        winRate: 67.2,
        topPerformer: { symbol: 'BTC', return: 15.8 },
        marketSentiment: 'bullish', // bullish, bearish, neutral
        recentActivities: [
            {
                id: 1,
                type: 'trade',
                action: 'BUY',
                symbol: 'ETH',
                amount: '0.5 ETH',
                value: 1625000,
                time: '10분 전',
                strategy: '스윙 트레이딩'
            },
            {
                id: 2,
                type: 'analysis',
                message: 'BTC 매집 신호 감지',
                time: '25분 전',
                confidence: 85
            },
            {
                id: 3,
                type: 'alert',
                message: 'ADA 15% 상승, 익절 타이밍 검토 필요',
                time: '1시간 전',
                level: 'warning'
            }
        ]
    };

    useEffect(() => {
        const loadDashboardData = async () => {
            setLoading(true);
            await checkSystemHealth();

            // 시뮬레이션 딜레이
            setTimeout(() => {
                setMarketData(mockDashboardData);
                setLoading(false);
            }, 1500);
        };

        loadDashboardData();
    }, [checkSystemHealth]);

    if (loading) {
        return (
            <div className="min-h-screen bg-crypto-neutral-50 flex items-center justify-center">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 mx-auto mb-4"
                    >
                        <CpuChipIcon className="w-full h-full text-crypto-primary-500" />
                    </motion.div>
                    <h2 className="text-xl font-semibold text-crypto-neutral-800 mb-2">
                        대시보드 로딩 중...
                    </h2>
                    <p className="text-crypto-neutral-600">
                        최신 시장 데이터를 분석하고 있습니다
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-crypto-neutral-50">
            {/* 헤더 */}
            <div className="bg-white border-b border-crypto-neutral-200 px-4 py-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <motion.h1
                            initial={{ opacity: 0, y: -20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-2xl font-bold text-crypto-neutral-900 mb-1"
                        >
                            안녕하세요, {user?.name}님 👋
                        </motion.h1>
                        <p className="text-crypto-neutral-600">
                            오늘도 성공적인 투자 되세요
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-4 sm:mt-0 flex space-x-3"
                    >
                        <Link
                            to="/strategy"
                            className="bg-crypto-primary-500 text-white px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-crypto-primary-600 transition-colors shadow-lg hover:shadow-xl"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>새 전략</span>
                        </Link>

                        <button className="bg-crypto-neutral-100 text-crypto-neutral-700 px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-crypto-neutral-200 transition-colors">
                            <BoltIcon className="w-5 h-5" />
                            <span>퀵 분석</span>
                        </button>
                    </motion.div>
                </div>
            </div>

            <div className="p-4 lg:p-6 space-y-6">
                {/* 빠른 통계 */}
                <QuickStats data={marketData} />

                {/* 시스템 상태 알림 */}
                {systemHealth.api !== 'healthy' && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-crypto-warning-50 border border-crypto-warning-200 rounded-xl p-4"
                    >
                        <div className="flex items-center space-x-3">
                            <ExclamationTriangleIcon className="w-6 h-6 text-crypto-warning-600" />
                            <div>
                                <h3 className="font-semibold text-crypto-warning-800">
                                    API 연결 상태 주의
                                </h3>
                                <p className="text-sm text-crypto-warning-700">
                                    일부 데이터 업데이트가 지연될 수 있습니다
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 메인 그리드 */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* 좌측 섹션 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 전략 카드들 */}
                        <StrategyCards />

                        {/* 시장 개요 */}
                        <MarketOverview />

                        {/* 활성 거래 */}
                        <ActiveTrades trades={marketData?.recentActivities || []} />
                    </div>

                    {/* 우측 사이드바 */}
                    <div className="space-y-6">
                        {/* 알림 센터 */}
                        <NotificationCenter notifications={notifications} />

                        {/* 퀵 액션 */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                        >
                            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                                빠른 실행
                            </h3>

                            <div className="space-y-3">
                                <Link
                                    to="/analysis"
                                    className="w-full bg-crypto-primary-50 text-crypto-primary-700 py-3 px-4 rounded-lg flex items-center space-x-3 hover:bg-crypto-primary-100 transition-colors group"
                                >
                                    <ChartBarIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="font-medium">코인 분석</span>
                                </Link>

                                <Link
                                    to="/backtesting"
                                    className="w-full bg-crypto-success-50 text-crypto-success-700 py-3 px-4 rounded-lg flex items-center space-x-3 hover:bg-crypto-success-100 transition-colors group"
                                >
                                    <ClockIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="font-medium">백테스팅</span>
                                </Link>

                                <Link
                                    to="/trading"
                                    className="w-full bg-gradient-to-r from-crypto-primary-500 to-crypto-primary-600 text-white py-3 px-4 rounded-lg flex items-center space-x-3 hover:from-crypto-primary-600 hover:to-crypto-primary-700 transition-all shadow-lg group"
                                >
                                    <PlayIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="font-medium">자동매매</span>
                                </Link>
                            </div>
                        </motion.div>

                        {/* 성과 요약 */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-gradient-to-r from-crypto-success-500 to-crypto-success-600 rounded-xl text-white p-6"
                        >
                            <h3 className="text-lg font-semibold mb-4">이번 달 성과</h3>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-crypto-success-100">총 수익률</span>
                                    <span className="text-xl font-bold">+{marketData?.totalReturn || 0}%</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-crypto-success-100">승률</span>
                                    <span className="font-semibold">{marketData?.winRate || 0}%</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-crypto-success-100">거래 수</span>
                                    <span className="font-semibold">{marketData?.totalTrades || 0}회</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-crypto-success-400">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-crypto-success-100">최고 수익 코인</span>
                                    <div className="text-right">
                                        <div className="font-semibold">{marketData?.topPerformer?.symbol}</div>
                                        <div className="text-sm text-crypto-success-100">+{marketData?.topPerformer?.return}%</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
