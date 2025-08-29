import React, { useState, useEffect, useMemo } from 'react';
import { usePortfolioConfig } from '../config/portfolioConfig';
import { Link, useNavigate } from 'react-router-dom';
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
    BoltIcon,
    CurrencyDollarIcon,
    StarIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

// 컴포넌트들 (나중에 구현할 예정)
// import QuickStats from '../components/dashboard/QuickStats';
// import StrategyCards from '../components/dashboard/StrategyCards';
// import MarketOverview from '../components/dashboard/MarketOverview';
// import ActiveTrades from '../components/dashboard/ActiveTrades';
// import NotificationCenter from '../components/dashboard/NotificationCenter';

export default function Dashboard() {
    const { user } = useAuthStore();
    const {
        systemHealth,
        isConnected,
        checkSystemHealth,
        forceHealthyState, // ✅ 디버깅용 추가
        isCheckingHealth
    } = useSystemStore();

    const {
        selectedCoins,
        userPlan,
        maxCoins,
        getRemainingSlots,
        initializeData,
        isLoading: coinLoading,
        error
    } = useCoinStore();

    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    // ✅ 중앙화된 자본금 사용
    const { config } = usePortfolioConfig();
    const baseCash = config?.initialCapital || 0;
    const portfolioData = useMemo(() => {
        if (selectedCoins.length === 0) {
            return {
                totalPortfolioValue: baseCash,
                totalReturn: 0,
                dailyChange: 0,
                activeStrategies: 0,
                totalTrades: 0,
                winRate: 0,
                topPerformer: null
            };
        }

        // 실제 선택된 코인들을 기반으로 포트폴리오 계산
        const totalCoinValue = selectedCoins.reduce((sum, coin) => {
            // 가상의 보유량 (현재가의 0.1% 정도)
            const virtualHolding = (baseCash * 0.1) / selectedCoins.length / coin.current_price;
            return sum + (virtualHolding * coin.current_price);
        }, 0);

        const totalValue = baseCash + totalCoinValue;
        const totalInvested = baseCash + (baseCash * 0.1); // 총 투자금액
        const totalReturn = ((totalValue - totalInvested) / totalInvested) * 100;

        // 일일 변화율은 선택된 코인들의 평균
        const dailyChange = selectedCoins.reduce((sum, coin) => sum + coin.change_rate, 0) / selectedCoins.length;

        // 활성 전략 수 (매수/강력매수 신호인 코인들)
        const activeStrategies = selectedCoins.filter(coin =>
            coin.analysis?.recommendation === 'BUY' || coin.analysis?.recommendation === 'STRONG_BUY'
        ).length;

        // 최고 수익 코인
        const topPerformer = selectedCoins.reduce((best, coin) =>
            (!best || coin.change_rate > best.change_rate) ? coin : best
            , null);

        return {
            totalPortfolioValue: Math.round(totalValue),
            totalReturn: Math.round(totalReturn * 100) / 100,
            dailyChange: Math.round(dailyChange * 100) / 100,
            activeStrategies,
            totalTrades: selectedCoins.length * 3, // 코인당 평균 3회 거래 가정
            winRate: Math.min(95, 60 + (selectedCoins.length * 2)), // 코인 수에 따라 승률 증가
            topPerformer
        };
    }, [selectedCoins, baseCash]);

    // 최근 활동 목업 데이터 (선택된 코인 기반)
    const recentActivities = useMemo(() => {
        if (selectedCoins.length === 0) return [];

        return selectedCoins.slice(0, 3).map((coin, index) => ({
            id: index + 1,
            type: index === 0 ? 'trade' : index === 1 ? 'analysis' : 'alert',
            action: index === 0 ? (coin.change_rate >= 0 ? 'BUY' : 'SELL') : null,
            symbol: coin.symbol,
            korean_name: coin.korean_name,
            amount: index === 0 ? `0.1 ${coin.symbol}` : null,
            value: index === 0 ? Math.round(coin.current_price * 0.1) : null,
            time: index === 0 ? '10분 전' : index === 1 ? '25분 전' : '1시간 전',
            strategy: index === 0 ? '스마트 스윙' : null,
            message: index === 1 ? `${coin.korean_name} 매집 신호 감지` :
                index === 2 ? `${coin.korean_name} ${Math.abs(coin.change_rate).toFixed(1)}% 변동` : null,
            confidence: index === 1 ? Math.round(coin.analysis.score * 10) : null,
            level: index === 2 ? (coin.change_rate >= 5 ? 'success' : coin.change_rate <= -5 ? 'danger' : 'warning') : null
        }));
    }, [selectedCoins]);

    useEffect(() => {
        const loadDashboardData = async () => {
            setLoading(true);

            try {
                // ✅ 시스템 상태 체크 먼저 실행
                await checkSystemHealth();

                // ✅ 코인 데이터 초기화
                if (!coinLoading && selectedCoins.length === 0) {
                    await initializeData();
                }

                // ✅ 최소 로딩 시간 보장 (UX 개선)
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                console.error('대시보드 로딩 실패:', error);

                // ✅ 개발 환경에서 강제로 정상 상태 설정
                if (process.env.NODE_ENV === 'development') {
                    console.warn('개발 환경: 강제로 정상 상태로 설정');
                    forceHealthyState();
                }
            } finally {
                setLoading(false);
            }
        };

        loadDashboardData();
    }, [checkSystemHealth, initializeData, coinLoading, forceHealthyState, selectedCoins.length]);

    // 로딩 화면
    if (loading || coinLoading || isCheckingHealth) {
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
                        {isCheckingHealth ? '시스템 상태 확인 중...' : '대시보드 로딩 중...'}
                    </h2>
                    <p className="text-crypto-neutral-600 mb-6">
                        {isCheckingHealth ? '서버 연결을 확인하고 있습니다' : '최신 시장 데이터를 분석하고 있습니다'}
                    </p>

                    {/* ✅ 디버깅 버튼 (개발 환경에서만) */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="space-x-3">
                            <button
                                onClick={forceHealthyState}
                                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
                            >
                                강제 정상 상태
                            </button>
                            <button
                                onClick={() => setLoading(false)}
                                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                강제 로딩 완료
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ✅ 에러 상태 처리
    if (error) {
        return (
            <div className="min-h-screen bg-crypto-neutral-50 flex items-center justify-center">
                <div className="text-center">
                    <ExclamationTriangleIcon className="w-16 h-16 text-crypto-danger-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-crypto-neutral-800 mb-2">
                        데이터 로딩 실패
                    </h2>
                    <p className="text-crypto-neutral-600 mb-6">
                        {error}
                    </p>
                    <div className="space-x-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-crypto-primary-500 text-white px-6 py-3 rounded-xl hover:bg-crypto-primary-600 transition-colors"
                        >
                            페이지 새로고침
                        </button>
                        <button
                            onClick={initializeData}
                            className="border border-crypto-neutral-300 text-crypto-neutral-700 px-6 py-3 rounded-xl hover:bg-crypto-neutral-50 transition-colors"
                        >
                            다시 시도
                        </button>
                    </div>
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
                            안녕하세요, {user?.name || '사용자'}님 👋
                        </motion.h1>
                        <p className="text-crypto-neutral-600">
                            {selectedCoins.length > 0
                                ? `${selectedCoins.length}개 코인을 추적 중입니다`
                                : '관심 코인을 추가해서 투자를 시작해보세요'
                            }
                        </p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-4 sm:mt-0 flex space-x-3"
                    >
                        <Link
                            to="/coins"
                            className="bg-crypto-primary-500 text-white px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-crypto-primary-600 transition-colors shadow-lg hover:shadow-xl"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>코인 추가 ({getRemainingSlots()})</span>
                        </Link>

                        {selectedCoins.length > 0 && (
                            <Link
                                to="/analysis"
                                className="bg-crypto-neutral-100 text-crypto-neutral-700 px-4 py-2 rounded-xl flex items-center space-x-2 hover:bg-crypto-neutral-200 transition-colors"
                            >
                                <BoltIcon className="w-5 h-5" />
                                <span>퀵 분석</span>
                            </Link>
                        )}
                    </motion.div>
                </div>
            </div>

            <div className="p-4 lg:p-6 space-y-6">
                {/* 플랜 상태 표시 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl ${userPlan === 'free' ? 'bg-gray-50 border border-gray-200' : 'bg-crypto-primary-50 border border-crypto-primary-200'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <StarIcon className={`w-5 h-5 ${userPlan === 'free' ? 'text-gray-500' : 'text-crypto-primary-600'}`} />
                            <div>
                                <h3 className="font-semibold">
                                    {userPlan === 'free' ? '무료 플랜' : '프리미엄 플랜'}
                                </h3>
                                <p className="text-sm text-crypto-neutral-600">
                                    {selectedCoins.length}/{maxCoins}개 코인 추가됨
                                    {getRemainingSlots() > 0 && ` (${getRemainingSlots()}개 더 추가 가능)`}
                                </p>
                            </div>
                        </div>
                        {userPlan === 'free' && (
                            <button className="bg-crypto-primary-500 text-white px-4 py-2 rounded-lg hover:bg-crypto-primary-600 transition-colors">
                                업그레이드
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* 시스템 상태 알림 */}
                {systemHealth?.api !== 'healthy' && (
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

                {/* 빠른 통계 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        {
                            title: '총 자산',
                            value: `₩${portfolioData.totalPortfolioValue.toLocaleString()}`,
                            change: `${portfolioData.totalReturn >= 0 ? '+' : ''}${portfolioData.totalReturn}%`,
                            icon: CurrencyDollarIcon,
                            color: 'crypto-primary'
                        },
                        {
                            title: '일일 변화',
                            value: `${portfolioData.dailyChange >= 0 ? '+' : ''}${portfolioData.dailyChange}%`,
                            change: portfolioData.dailyChange >= 0 ? '상승' : '하락',
                            icon: portfolioData.dailyChange >= 0 ? ArrowTrendingUpIcon : ArrowTrendingDownIcon,
                            color: portfolioData.dailyChange >= 0 ? 'crypto-success' : 'crypto-danger'
                        },
                        {
                            title: '활성 전략',
                            value: `${portfolioData.activeStrategies}개`,
                            change: '실행 중',
                            icon: BoltIcon,
                            color: 'crypto-warning'
                        },
                        {
                            title: '승률',
                            value: `${portfolioData.winRate}%`,
                            change: `${portfolioData.totalTrades}회 거래`,
                            icon: ChartBarIcon,
                            color: 'crypto-primary'
                        }
                    ].map((stat, index) => (
                        <motion.div
                            key={stat.title}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 bg-${stat.color}-50 rounded-lg flex items-center justify-center`}>
                                    <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full font-medium
                                    ${stat.title === '일일 변화' && portfolioData.dailyChange >= 0 ? 'bg-crypto-success-100 text-crypto-success-700' :
                                        stat.title === '일일 변화' && portfolioData.dailyChange < 0 ? 'bg-crypto-danger-100 text-crypto-danger-700' :
                                            'bg-crypto-neutral-100 text-crypto-neutral-600'}`}
                                >
                                    {stat.change}
                                </span>
                            </div>

                            <div className="space-y-1">
                                <h3 className="text-sm font-medium text-crypto-neutral-600">
                                    {stat.title}
                                </h3>
                                <p className="text-2xl font-bold text-crypto-neutral-900">
                                    {stat.value}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* 메인 그리드 */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* 좌측 섹션 */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* 선택된 코인 현황 또는 코인 추가 안내 */}
                        {selectedCoins.length > 0 ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-crypto-neutral-900">
                                        관심 코인 현황
                                    </h3>
                                    <Link
                                        to="/analysis"
                                        className="text-crypto-primary-600 hover:text-crypto-primary-700 text-sm font-medium"
                                    >
                                        전체 분석 보기
                                    </Link>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4">
                                    {selectedCoins.slice(0, 4).map((coin) => (
                                        <motion.div
                                            key={coin.market}
                                            whileHover={{ scale: 1.02 }}
                                            className="p-4 bg-crypto-neutral-50 rounded-lg cursor-pointer transition-colors hover:bg-crypto-neutral-100"
                                            onClick={() => navigate('/analysis', { state: { selectedCoin: coin.market } })}
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-8 h-8 bg-crypto-primary-100 rounded-full flex items-center justify-center">
                                                        <span className="font-bold text-crypto-primary-700 text-xs">
                                                            {coin.symbol.slice(0, 2)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-medium text-crypto-neutral-900">
                                                            {coin.korean_name}
                                                        </h4>
                                                        <p className="text-xs text-crypto-neutral-600">
                                                            {coin.symbol}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="font-medium text-crypto-neutral-900">
                                                        ₩{coin.current_price.toLocaleString()}
                                                    </div>
                                                    <div className={`text-sm flex items-center justify-end ${coin.change_rate >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'
                                                        }`}>
                                                        {coin.change_rate >= 0 ? (
                                                            <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                                                        ) : (
                                                            <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                                                        )}
                                                        {Math.abs(coin.change_rate).toFixed(2)}%
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-crypto-neutral-600">AI 분석 점수</span>
                                                <div className="flex items-center space-x-1">
                                                    <span className={`font-medium ${coin.analysis.score >= 8 ? 'text-crypto-success-600' :
                                                        coin.analysis.score >= 7 ? 'text-crypto-warning-600' : 'text-crypto-neutral-600'
                                                        }`}>
                                                        {coin.analysis.score}/10
                                                    </span>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${coin.analysis.recommendation === 'STRONG_BUY' ? 'bg-crypto-success-100 text-crypto-success-700' :
                                                        coin.analysis.recommendation === 'BUY' ? 'bg-crypto-primary-100 text-crypto-primary-700' :
                                                            'bg-crypto-neutral-100 text-crypto-neutral-700'
                                                        }`}>
                                                        {coin.analysis.recommendation === 'STRONG_BUY' ? '강매수' :
                                                            coin.analysis.recommendation === 'BUY' ? '매수' : '보유'}
                                                    </span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>

                                {selectedCoins.length > 4 && (
                                    <div className="mt-4 text-center">
                                        <Link
                                            to="/analysis"
                                            className="text-crypto-primary-600 hover:text-crypto-primary-700 text-sm font-medium"
                                        >
                                            {selectedCoins.length - 4}개 코인 더 보기
                                        </Link>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-12 text-center"
                            >
                                <div className="w-16 h-16 bg-crypto-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <ChartBarIcon className="w-8 h-8 text-crypto-neutral-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-2">
                                    관심 코인을 추가해보세요
                                </h3>
                                <p className="text-crypto-neutral-600 mb-6">
                                    업비트 상장 코인 중에서 관심있는 코인을 선택하여<br />
                                    AI 분석과 자동매매를 시작할 수 있습니다.
                                </p>
                                <Link
                                    to="/coins"
                                    className="inline-flex items-center space-x-2 bg-crypto-primary-500 text-white px-6 py-3 rounded-xl hover:bg-crypto-primary-600 transition-colors"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    <span>첫 번째 코인 추가하기</span>
                                </Link>
                            </motion.div>
                        )}

                        {/* 최근 활동 */}
                        {recentActivities.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                            >
                                <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                                    최근 활동
                                </h3>

                                <div className="space-y-3">
                                    {recentActivities.map((activity) => (
                                        <div
                                            key={activity.id}
                                            className="flex items-center justify-between p-4 bg-crypto-neutral-50 rounded-lg"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.type === 'trade' && activity.action === 'BUY' ? 'bg-crypto-success-100 text-crypto-success-600' :
                                                    activity.type === 'trade' && activity.action === 'SELL' ? 'bg-crypto-danger-100 text-crypto-danger-600' :
                                                        activity.type === 'analysis' ? 'bg-crypto-primary-100 text-crypto-primary-600' :
                                                            'bg-crypto-warning-100 text-crypto-warning-600'
                                                    }`}>
                                                    {activity.type === 'trade' ?
                                                        (activity.action === 'BUY' ? <ArrowTrendingUpIcon className="w-5 h-5" /> : <ArrowTrendingDownIcon className="w-5 h-5" />) :
                                                        activity.type === 'analysis' ? <ChartBarIcon className="w-5 h-5" /> :
                                                            <ExclamationTriangleIcon className="w-5 h-5" />
                                                    }
                                                </div>
                                                <div>
                                                    {activity.type === 'trade' ? (
                                                        <div>
                                                            <div className="font-medium text-crypto-neutral-900">
                                                                {activity.action} {activity.amount}
                                                            </div>
                                                            <div className="text-sm text-crypto-neutral-600">
                                                                {activity.strategy} • ₩{activity.value?.toLocaleString()}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div>
                                                            <div className="font-medium text-crypto-neutral-900">
                                                                {activity.message}
                                                            </div>
                                                            {activity.confidence && (
                                                                <div className="text-sm text-crypto-neutral-600">
                                                                    신뢰도: {activity.confidence}%
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="text-sm text-crypto-neutral-500">
                                                {activity.time}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* 우측 사이드바 */}
                    <div className="space-y-6">
                        {/* 빠른 실행 */}
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
                                {[
                                    {
                                        title: '전략 빌더',
                                        link: '/strategy',
                                        icon: CogIcon,
                                        color: 'crypto-primary',
                                        disabled: selectedCoins.length === 0
                                    },
                                    {
                                        title: '코인 분석',
                                        link: '/analysis',
                                        icon: ChartBarIcon,
                                        color: 'crypto-primary',
                                        disabled: selectedCoins.length === 0
                                    },
                                    {
                                        title: '백테스팅',
                                        link: '/backtesting',
                                        icon: ClockIcon,
                                        color: 'crypto-success',
                                        disabled: selectedCoins.length === 0
                                    },
                                    {
                                        title: '자동매매',
                                        link: '/trading',
                                        icon: PlayIcon,
                                        color: 'gradient',
                                        disabled: selectedCoins.length === 0
                                    }
                                ].map((action) => (
                                    action.disabled ? (
                                        <div
                                            key={action.title}
                                            className="w-full bg-crypto-neutral-50 text-crypto-neutral-400 py-3 px-4 rounded-lg flex items-center justify-between cursor-not-allowed opacity-50"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <action.icon className="w-5 h-5" />
                                                <span className="font-medium">{action.title}</span>
                                            </div>
                                            <InformationCircleIcon className="w-4 h-4" title="코인을 먼저 추가해주세요" />
                                        </div>
                                    ) : action.color === 'gradient' ? (
                                        <Link
                                            key={action.title}
                                            to={action.link}
                                            className="w-full bg-gradient-to-r from-crypto-primary-500 to-crypto-primary-600 text-white py-3 px-4 rounded-lg flex items-center space-x-3 hover:from-crypto-primary-600 hover:to-crypto-primary-700 transition-all shadow-lg group"
                                        >
                                            <action.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            <span className="font-medium">{action.title}</span>
                                        </Link>
                                    ) : (
                                        <Link
                                            key={action.title}
                                            to={action.link}
                                            className={`w-full bg-${action.color}-50 text-${action.color}-700 py-3 px-4 rounded-lg flex items-center space-x-3 hover:bg-${action.color}-100 transition-colors group`}
                                        >
                                            <action.icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                            <span className="font-medium">{action.title}</span>
                                        </Link>
                                    )
                                ))}
                            </div>
                        </motion.div>

                        {/* 성과 요약 */}
                        {selectedCoins.length > 0 && (
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
                                        <span className="text-xl font-bold">+{portfolioData.totalReturn}%</span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-crypto-success-100">승률</span>
                                        <span className="font-semibold">{portfolioData.winRate}%</span>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-crypto-success-100">거래 수</span>
                                        <span className="font-semibold">{portfolioData.totalTrades}회</span>
                                    </div>
                                </div>

                                {portfolioData.topPerformer && (
                                    <div className="mt-4 pt-4 border-t border-crypto-success-400">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-crypto-success-100">최고 수익 코인</span>
                                            <div className="text-right">
                                                <div className="font-semibold">{portfolioData.topPerformer.symbol}</div>
                                                <div className="text-sm text-crypto-success-100">
                                                    +{Math.abs(portfolioData.topPerformer.change_rate)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* 시장 정보 (간단버전) */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-crypto-neutral-900">
                                    시장 현황
                                </h3>
                                <span className="text-xs text-crypto-neutral-500">실시간</span>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-crypto-neutral-600">시장 심리</span>
                                    <span className="px-2 py-1 bg-crypto-success-100 text-crypto-success-700 rounded-full text-xs font-medium">
                                        강세
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-crypto-neutral-600">김프율</span>
                                    <span className="font-medium text-crypto-neutral-900">+2.3%</span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-crypto-neutral-600">공포탐욕지수</span>
                                    <span className="font-medium text-crypto-warning-600">68 (탐욕)</span>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
