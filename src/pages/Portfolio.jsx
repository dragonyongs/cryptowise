import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCoinStore } from '../stores/coinStore';
import { usePortfolioStore } from '../stores/portfolioStore'; // ✅ 포트폴리오 전용 스토어
import { useUpbitStore } from '../stores/upbitStore'; // ✅ 업비트 연동 스토어
import {
    ArrowLeftIcon,
    ArrowTrendingUpIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    CalendarIcon,
    ArrowPathIcon,
    EyeIcon,
    AdjustmentsHorizontalIcon,
    DocumentChartBarIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    KeyIcon,
    LinkIcon
} from '@heroicons/react/24/outline';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts';

export default function Portfolio() {
    const navigate = useNavigate();
    const [selectedPeriod, setSelectedPeriod] = useState('1M');
    const [activeTab, setActiveTab] = useState('overview');
    const [refreshing, setRefreshing] = useState(false);

    // ✅ 중앙 상태 사용
    const { selectedCoins } = useCoinStore();
    const {
        portfolio,
        performance,
        transactions,
        isLoading,
        error,
        lastUpdated,
        fetchPortfolio,
        refreshPortfolio
    } = usePortfolioStore();

    const {
        isConnected: upbitConnected,
        hasValidKeys,
        connectionStatus,
        accounts,
        connectUpbit,
        refreshAccounts
    } = useUpbitStore();

    // ✅ 포트폴리오 요약 데이터 계산
    const portfolioSummary = useMemo(() => {
        if (!portfolio || !portfolio.holdings) {
            return {
                totalValue: 0,
                totalInvested: 0,
                totalReturn: 0,
                dailyChange: 0,
                unrealizedPnL: 0,
                cashBalance: 0
            };
        }

        const totalValue = portfolio.holdings.reduce((sum, holding) => sum + holding.currentValue, 0);
        const totalInvested = portfolio.holdings.reduce((sum, holding) => sum + holding.invested, 0);
        const totalReturn = totalInvested > 0 ? ((totalValue - totalInvested) / totalInvested) * 100 : 0;
        const unrealizedPnL = portfolio.holdings.reduce((sum, holding) => sum + holding.unrealizedPnL, 0);
        const cashBalance = portfolio.holdings.find(h => h.symbol === 'KRW')?.currentValue || 0;

        return {
            totalValue,
            totalInvested,
            totalReturn,
            dailyChange: portfolio.dailyChange || 0,
            unrealizedPnL,
            cashBalance
        };
    }, [portfolio]);

    // ✅ 컴포넌트 초기화
    useEffect(() => {
        if (upbitConnected && hasValidKeys) {
            fetchPortfolio();
        }
    }, [upbitConnected, hasValidKeys, fetchPortfolio]);

    // ✅ 포트폴리오 새로고침
    const handleRefresh = async () => {
        if (!upbitConnected || !hasValidKeys) {
            return;
        }

        setRefreshing(true);
        try {
            await refreshPortfolio();
        } finally {
            setRefreshing(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
    };

    const formatPercent = (percent) => {
        return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 shadow-lg rounded-lg border">
                    <p className="font-semibold text-crypto-neutral-900">{label}</p>
                    <div className="space-y-1 mt-2">
                        <p className="text-sm">
                            <span className="text-crypto-primary-600">포트폴리오 가치: </span>
                            <span className="font-medium">₩{payload[0]?.value?.toLocaleString()}</span>
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    const tabs = [
        { id: 'overview', name: '개요', icon: ChartBarIcon },
        { id: 'performance', name: '성과', icon: ArrowTrendingUpIcon },
        { id: 'allocation', name: '자산배분', icon: AdjustmentsHorizontalIcon },
        { id: 'history', name: '거래내역', icon: DocumentChartBarIcon }
    ];

    // ✅ 업비트 연결이 안된 경우
    if (!upbitConnected || !hasValidKeys) {
        return (
            <div className="min-h-screen bg-crypto-neutral-50">
                <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                            <span>대시보드</span>
                        </button>

                        <h1 className="text-lg font-semibold text-crypto-neutral-900">포트폴리오</h1>
                        <div className="w-20"></div>
                    </div>
                </div>

                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center p-8 max-w-md">
                        <KeyIcon className="w-20 h-20 text-crypto-neutral-300 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-crypto-neutral-900 mb-4">
                            업비트 계정을 연결해주세요
                        </h2>
                        <p className="text-crypto-neutral-600 mb-8">
                            실제 보유 자산을 확인하려면<br />
                            업비트 API 키를 등록해야 합니다
                        </p>

                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-left">
                                <h3 className="font-semibold text-blue-900 mb-2">API 키 발급 단계</h3>
                                <ol className="text-sm text-blue-800 space-y-1">
                                    <li>1. 업비트 웹사이트 → 마이페이지</li>
                                    <li>2. Open API 관리 → API 키 발급</li>
                                    <li>3. 자산조회 권한 체크</li>
                                    <li>4. 발급받은 키를 CryptoWise에 등록</li>
                                </ol>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <a
                                    href="https://upbit.com/mypage/open_api_management"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center space-x-2 border border-crypto-primary-300 text-crypto-primary-700 px-6 py-3 rounded-xl hover:bg-crypto-primary-50 transition-colors"
                                >
                                    <LinkIcon className="w-5 h-5" />
                                    <span>업비트 API 발급</span>
                                </a>
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="bg-crypto-primary-500 text-white px-6 py-3 rounded-xl hover:bg-crypto-primary-600 transition-colors"
                                >
                                    API 키 등록하기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ✅ 로딩 화면
    if (isLoading) {
        return (
            <div className="min-h-screen bg-crypto-neutral-50 flex items-center justify-center">
                <div className="text-center">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="w-16 h-16 mx-auto mb-4"
                    >
                        <CurrencyDollarIcon className="w-full h-full text-crypto-primary-500" />
                    </motion.div>
                    <h2 className="text-xl font-semibold text-crypto-neutral-800 mb-2">
                        포트폴리오 로딩 중...
                    </h2>
                    <p className="text-crypto-neutral-600">
                        업비트에서 최신 자산 데이터를 가져오고 있습니다
                    </p>
                </div>
            </div>
        );
    }

    // ✅ 에러 화면
    if (error) {
        return (
            <div className="min-h-screen bg-crypto-neutral-50">
                <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                            <span>대시보드</span>
                        </button>

                        <h1 className="text-lg font-semibold text-crypto-neutral-900">포트폴리오</h1>
                        <div className="w-20"></div>
                    </div>
                </div>

                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center p-8">
                        <ExclamationTriangleIcon className="w-16 h-16 text-crypto-danger-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-crypto-neutral-800 mb-2">
                            포트폴리오 로딩 실패
                        </h2>
                        <p className="text-crypto-neutral-600 mb-6">
                            {error}
                        </p>
                        <div className="space-x-3">
                            <button
                                onClick={handleRefresh}
                                className="bg-crypto-primary-500 text-white px-6 py-3 rounded-xl hover:bg-crypto-primary-600 transition-colors"
                            >
                                다시 시도
                            </button>
                            <button
                                onClick={() => navigate('/settings')}
                                className="border border-crypto-neutral-300 text-crypto-neutral-700 px-6 py-3 rounded-xl hover:bg-crypto-neutral-50 transition-colors"
                            >
                                API 설정 확인
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-crypto-neutral-50">
            {/* 헤더 */}
            <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span>대시보드</span>
                    </button>

                    <h1 className="text-lg font-semibold text-crypto-neutral-900">
                        포트폴리오
                    </h1>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleRefresh}
                            disabled={refreshing}
                            className="text-crypto-neutral-500 hover:text-crypto-neutral-700 disabled:opacity-50 transition-colors"
                            title="포트폴리오 새로고침"
                        >
                            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>

                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                                }`}></div>
                            <span className={`text-sm ${connectionStatus === 'connected' ? 'text-green-600' : 'text-gray-600'
                                }`}>
                                {connectionStatus === 'connected' ? '연결됨' : '연결 안됨'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 연결 상태 알림 */}
            {connectionStatus !== 'connected' && (
                <div className="bg-crypto-warning-50 border-b border-crypto-warning-200 px-4 py-3">
                    <div className="flex items-center justify-between max-w-7xl mx-auto">
                        <div className="flex items-center space-x-3">
                            <ExclamationTriangleIcon className="w-5 h-5 text-crypto-warning-600" />
                            <span className="text-sm font-medium text-crypto-warning-800">
                                업비트 연결 상태를 확인해주세요. 일부 데이터가 최신이 아닐 수 있습니다.
                            </span>
                        </div>
                        <button
                            onClick={() => navigate('/settings')}
                            className="text-crypto-warning-700 hover:text-crypto-warning-900 text-sm font-medium"
                        >
                            설정 확인
                        </button>
                    </div>
                </div>
            )}

            {/* 포트폴리오 요약 */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-crypto-primary-600 to-crypto-primary-700 text-white p-6"
            >
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="text-3xl font-bold mb-1">
                                ₩{formatCurrency(portfolioSummary.totalValue)}
                            </div>
                            <div className="text-crypto-primary-100 text-sm">총 자산</div>
                            {lastUpdated && (
                                <div className="text-xs text-crypto-primary-200 mt-1">
                                    {new Date(lastUpdated).toLocaleString('ko-KR', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })} 업데이트
                                </div>
                            )}
                        </div>
                        <div className="text-center">
                            <div className={`text-3xl font-bold mb-1 ${portfolioSummary.totalReturn >= 0 ? 'text-green-300' : 'text-red-300'
                                }`}>
                                {formatPercent(portfolioSummary.totalReturn)}
                            </div>
                            <div className="text-crypto-primary-100 text-sm">총 수익률</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-3xl font-bold mb-1 ${portfolioSummary.dailyChange >= 0 ? 'text-green-300' : 'text-red-300'
                                }`}>
                                {formatPercent(portfolioSummary.dailyChange)}
                            </div>
                            <div className="text-crypto-primary-100 text-sm">일일 변화</div>
                        </div>
                        <div className="text-center">
                            <div className={`text-3xl font-bold mb-1 ${portfolioSummary.unrealizedPnL >= 0 ? 'text-green-300' : 'text-red-300'
                                }`}>
                                {portfolioSummary.unrealizedPnL >= 0 ? '+' : ''}₩{formatCurrency(Math.abs(portfolioSummary.unrealizedPnL))}
                            </div>
                            <div className="text-crypto-primary-100 text-sm">미실현 손익</div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* 탭 네비게이션 */}
            <div className="bg-white border-b border-crypto-neutral-200 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex space-x-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-crypto-primary-500 text-crypto-primary-600'
                                    : 'border-transparent text-crypto-neutral-600 hover:text-crypto-neutral-900'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span>{tab.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 콘텐츠 */}
            <div className="p-4 md:p-6 max-w-7xl mx-auto">
                {activeTab === 'overview' && (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* 보유 자산 */}
                        <div className="lg:col-span-2">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-crypto-neutral-900">
                                        보유 자산 ({portfolio?.holdings?.length || 0})
                                    </h3>
                                    <div className="text-sm text-crypto-neutral-500">
                                        업비트 계정 연동
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {portfolio?.holdings?.length > 0 ? (
                                        portfolio.holdings.map((holding, index) => (
                                            <motion.div
                                                key={holding.symbol}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className="flex items-center justify-between p-4 border border-crypto-neutral-200 rounded-lg hover:shadow-sm transition-shadow"
                                            >
                                                <div className="flex items-center space-x-4">
                                                    <div
                                                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                                                        style={{ backgroundColor: holding.color || '#6B7280' }}
                                                    >
                                                        {holding.symbol.slice(0, 2)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-crypto-neutral-900">
                                                            {holding.name} ({holding.symbol})
                                                        </h4>
                                                        <div className="flex items-center space-x-3 text-sm text-crypto-neutral-600">
                                                            <span>
                                                                {holding.symbol === 'KRW'
                                                                    ? formatCurrency(holding.quantity)
                                                                    : parseFloat(holding.quantity).toFixed(8)
                                                                } {holding.symbol}
                                                            </span>
                                                            {holding.avgPrice > 0 && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span>평균가: ₩{formatCurrency(holding.avgPrice)}</span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="font-semibold text-crypto-neutral-900">
                                                        ₩{formatCurrency(holding.currentValue)}
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-sm">
                                                        {holding.pnlPercent !== 0 && (
                                                            <span className={`${holding.pnlPercent >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'
                                                                }`}>
                                                                {formatPercent(holding.pnlPercent)}
                                                            </span>
                                                        )}
                                                        {holding.change24h !== undefined && (
                                                            <>
                                                                <span className="text-crypto-neutral-500">•</span>
                                                                <span className={`${holding.change24h >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'
                                                                    }`}>
                                                                    {formatPercent(holding.change24h)}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8">
                                            <CurrencyDollarIcon className="w-12 h-12 text-crypto-neutral-300 mx-auto mb-4" />
                                            <p className="text-crypto-neutral-600">
                                                보유 자산이 없습니다
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        </div>

                        {/* 자산 배분 파이 차트 */}
                        <div>
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                            >
                                <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                                    자산 배분
                                </h3>

                                {portfolio?.holdings?.length > 0 ? (
                                    <>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={portfolio.holdings}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        paddingAngle={2}
                                                        dataKey="currentValue"
                                                    >
                                                        {portfolio.holdings.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color || '#6B7280'} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        formatter={(value) => [`₩${formatCurrency(value)}`, '가치']}
                                                        labelFormatter={(label) => `${label}`}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            {portfolio.holdings.map((holding) => (
                                                <div key={holding.symbol} className="flex items-center justify-between text-sm">
                                                    <div className="flex items-center space-x-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: holding.color || '#6B7280' }}
                                                        />
                                                        <span className="text-crypto-neutral-700">{holding.symbol}</span>
                                                    </div>
                                                    <span className="font-medium text-crypto-neutral-900">
                                                        {holding.allocation?.toFixed(1) || '0.0'}%
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <AdjustmentsHorizontalIcon className="w-12 h-12 text-crypto-neutral-300 mx-auto mb-4" />
                                        <p className="text-crypto-neutral-600">
                                            자산 배분 데이터가 없습니다
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </div>
                    </div>
                )}

                {activeTab === 'performance' && (
                    <div className="space-y-6">
                        {/* 성과 차트 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-crypto-neutral-900">
                                    포트폴리오 성과
                                </h3>

                                <div className="flex space-x-1 bg-crypto-neutral-100 rounded-lg p-1">
                                    {['1D', '1W', '1M', '3M'].map((period) => (
                                        <button
                                            key={period}
                                            onClick={() => setSelectedPeriod(period)}
                                            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${selectedPeriod === period
                                                ? 'bg-white text-crypto-primary-600 shadow-sm'
                                                : 'text-crypto-neutral-600 hover:text-crypto-neutral-900'
                                                }`}
                                        >
                                            {period}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="h-80">
                                {performance?.[selectedPeriod]?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={performance[selectedPeriod]}>
                                            <defs>
                                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                            <XAxis
                                                dataKey={selectedPeriod === '1D' ? 'time' : 'date'}
                                                className="text-xs"
                                            />
                                            <YAxis
                                                tickFormatter={(value) => `₩${(value / 1000000).toFixed(0)}M`}
                                                className="text-xs"
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="value"
                                                stroke="#3B82F6"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorValue)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="text-center">
                                            <ChartBarIcon className="w-12 h-12 text-crypto-neutral-300 mx-auto mb-4" />
                                            <p className="text-crypto-neutral-600">
                                                성과 데이터가 충분하지 않습니다
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}

                {activeTab === 'allocation' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* 자산 배분 상세 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                        >
                            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                                자산별 배분 현황
                            </h3>

                            <div className="space-y-4">
                                {portfolio?.holdings?.map((holding) => (
                                    <div key={holding.symbol} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <div
                                                    className="w-4 h-4 rounded-full"
                                                    style={{ backgroundColor: holding.color || '#6B7280' }}
                                                />
                                                <span className="font-medium text-crypto-neutral-900">
                                                    {holding.name}
                                                </span>
                                            </div>
                                            <span className="text-sm text-crypto-neutral-600">
                                                {holding.allocation?.toFixed(1) || '0.0'}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-crypto-neutral-200 rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full transition-all duration-500"
                                                style={{
                                                    width: `${holding.allocation || 0}%`,
                                                    backgroundColor: holding.color || '#6B7280'
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-xs text-crypto-neutral-500">
                                            <span>₩{formatCurrency(holding.currentValue)}</span>
                                            <span className={
                                                holding.pnlPercent >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'
                                            }>
                                                {formatPercent(holding.pnlPercent)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* 포트폴리오 분석 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                        >
                            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                                포트폴리오 분석
                            </h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <div className="flex items-start space-x-3">
                                        <CheckCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <div>
                                            <h4 className="font-medium text-blue-900">분산 투자 현황</h4>
                                            <p className="text-sm text-blue-800 mt-1">
                                                현재 {portfolio?.holdings?.filter(h => h.symbol !== 'KRW').length || 0}개 암호화폐에 분산 투자 중입니다.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h4 className="font-medium text-crypto-neutral-900">리스크 분석</h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-crypto-neutral-600">현금 비중</span>
                                            <span className="font-medium">
                                                {((portfolioSummary.cashBalance / portfolioSummary.totalValue) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-crypto-neutral-600">암호화폐 비중</span>
                                            <span className="font-medium">
                                                {(((portfolioSummary.totalValue - portfolioSummary.cashBalance) / portfolioSummary.totalValue) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                    >
                        <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                            거래 내역
                        </h3>

                        <div className="space-y-3">
                            {transactions?.length > 0 ? (
                                transactions.map((transaction) => (
                                    <div key={transaction.id} className="flex items-center justify-between p-4 border border-crypto-neutral-200 rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${transaction.type === 'BUY'
                                                ? 'bg-crypto-success-100 text-crypto-success-700'
                                                : 'bg-crypto-danger-100 text-crypto-danger-700'
                                                }`}>
                                                {transaction.type === 'BUY' ? '매수' : '매도'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-crypto-neutral-900">
                                                    {transaction.symbol} • {transaction.quantity} {transaction.symbol}
                                                </div>
                                                <div className="text-sm text-crypto-neutral-600">
                                                    ₩{formatCurrency(transaction.price)} • 수수료: ₩{formatCurrency(transaction.fee)}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className="font-medium text-crypto-neutral-900">
                                                ₩{formatCurrency(transaction.total)}
                                            </div>
                                            <div className="text-sm text-crypto-neutral-500">
                                                {new Date(transaction.date).toLocaleDateString('ko-KR')}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8">
                                    <DocumentChartBarIcon className="w-12 h-12 text-crypto-neutral-300 mx-auto mb-4" />
                                    <p className="text-crypto-neutral-600">
                                        거래 내역이 없습니다
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
