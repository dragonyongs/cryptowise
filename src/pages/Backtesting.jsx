import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCoinStore } from '../stores/coinStore'; // ✅ 중앙 상태관리 통합
import { useBacktestStore } from '../stores/backtestStore'; // ✅ 백테스팅 전용 스토어
import {
    ArrowLeftIcon,
    PlayIcon,
    CalendarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ChartBarIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    CogIcon,
    InformationCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function Backtesting() {
    const location = useLocation();
    const navigate = useNavigate();

    // ✅ 중앙 상태 사용
    const { selectedCoins, getSelectedCoin } = useCoinStore();
    const {
        runBacktest,
        backtestResults,
        isLoading,
        error,
        clearResults,
        backtestHistory
    } = useBacktestStore();

    const [backtestConfig, setBacktestConfig] = useState({
        startDate: '2024-01-01',
        endDate: '2024-08-01',
        initialAmount: 10000000,
        maxPositionSize: 20, // 포지션당 최대 비중 (%)
        rebalanceFrequency: 'weekly', // daily, weekly, monthly
        strategy: 'balanced' // conservative, balanced, aggressive
    });

    const [selectedBacktestCoins, setSelectedBacktestCoins] = useState([]);

    // location.state에서 전달받은 데이터 처리
    const { strategyData, selectedCoins: routeSelectedCoins, analysisData } = location.state || {};

    // ✅ 초기 설정
    useEffect(() => {
        // 라우트에서 전달받은 코인이 있으면 사용, 없으면 전체 선택된 코인 사용
        if (routeSelectedCoins && routeSelectedCoins.length > 0) {
            setSelectedBacktestCoins(routeSelectedCoins);
        } else if (selectedCoins.length > 0) {
            setSelectedBacktestCoins(selectedCoins.map(coin => coin.market));
        }
    }, [routeSelectedCoins, selectedCoins]);

    // ✅ 백테스팅할 코인들의 상세 정보
    const backtestCoinsData = useMemo(() => {
        return selectedBacktestCoins.map(market => {
            const coinData = getSelectedCoin(market) || selectedCoins.find(coin => coin.market === market);
            return coinData || { market, symbol: market.replace('KRW-', ''), korean_name: '알 수 없음' };
        }).filter(Boolean);
    }, [selectedBacktestCoins, getSelectedCoin, selectedCoins]);

    // ✅ 백테스팅 실행
    const handleRunBacktest = async () => {
        if (selectedBacktestCoins.length === 0) {
            alert('백테스팅할 코인을 선택해주세요.');
            return;
        }

        const config = {
            ...backtestConfig,
            coins: backtestCoinsData,
            strategy: strategyData || { name: '기본 전략', type: 'balanced' }
        };

        await runBacktest(config);
    };

    // ✅ 자동매매 시작
    const startAutoTrading = () => {
        navigate('/trading', {
            state: {
                strategyData,
                selectedCoins: selectedBacktestCoins,
                backtestResults,
                backtestConfig
            }
        });
    };

    // ✅ 코인 선택 토글
    const toggleCoinSelection = (market) => {
        setSelectedBacktestCoins(prev =>
            prev.includes(market)
                ? prev.filter(m => m !== market)
                : [...prev, market]
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR').format(amount);
    };

    const formatPercent = (value) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 shadow-lg rounded-lg border">
                    <p className="font-semibold text-crypto-neutral-900">{label}</p>
                    <div className="space-y-1 mt-2">
                        <p className="text-sm">
                            <span className="text-crypto-primary-600">포트폴리오: </span>
                            <span className="font-medium">₩{payload[0]?.value?.toLocaleString()}</span>
                        </p>
                        {payload[1] && (
                            <p className="text-sm">
                                <span className="text-crypto-neutral-600">벤치마크: </span>
                                <span className="font-medium">₩{payload[1]?.value?.toLocaleString()}</span>
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    // ✅ 선택된 코인이 없는 경우
    if (selectedCoins.length === 0) {
        return (
            <div className="min-h-screen bg-crypto-neutral-50">
                <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate('/analysis')}
                            className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                            <span>이전</span>
                        </button>

                        <h1 className="text-lg font-semibold text-crypto-neutral-900">백테스팅</h1>
                        <div className="w-20"></div>
                    </div>
                </div>

                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center p-8">
                        <ChartBarIcon className="w-20 h-20 text-crypto-neutral-300 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-crypto-neutral-900 mb-4">
                            백테스팅할 코인을 추가해주세요
                        </h2>
                        <p className="text-crypto-neutral-600 mb-8">
                            관심 코인을 먼저 추가한 후 전략을 검증해보세요
                        </p>
                        <button
                            onClick={() => navigate('/coins')}
                            className="bg-crypto-primary-500 text-white px-6 py-3 rounded-xl hover:bg-crypto-primary-600 transition-colors"
                        >
                            코인 추가하기
                        </button>
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
                        onClick={() => navigate('/analysis')}
                        className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span>이전</span>
                    </button>

                    <h1 className="text-lg font-semibold text-crypto-neutral-900">
                        백테스팅
                    </h1>

                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-crypto-neutral-500">전략 검증</span>
                        {backtestResults && (
                            <button
                                onClick={clearResults}
                                className="text-crypto-neutral-500 hover:text-crypto-neutral-700 transition-colors"
                                title="결과 초기화"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
                {/* 백테스팅 설정 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-crypto-neutral-900">
                            백테스팅 설정
                        </h2>
                        {strategyData && (
                            <div className="flex items-center space-x-2 text-sm text-crypto-neutral-600">
                                <CogIcon className="w-4 h-4" />
                                <span>전략: {strategyData.name || '사용자 정의'}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* 백테스팅 기간 및 설정 */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-crypto-neutral-700 mb-3">
                                    백테스팅 기간
                                </label>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-crypto-neutral-500 mb-1">시작일</label>
                                        <input
                                            type="date"
                                            value={backtestConfig.startDate}
                                            onChange={(e) => setBacktestConfig(prev => ({ ...prev, startDate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-crypto-neutral-500 mb-1">종료일</label>
                                        <input
                                            type="date"
                                            value={backtestConfig.endDate}
                                            onChange={(e) => setBacktestConfig(prev => ({ ...prev, endDate: e.target.value }))}
                                            className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                    초기 투자금
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={backtestConfig.initialAmount}
                                        onChange={(e) => setBacktestConfig(prev => ({ ...prev, initialAmount: parseInt(e.target.value) }))}
                                        className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg text-sm pr-12"
                                    />
                                    <span className="absolute right-3 top-2 text-sm text-crypto-neutral-500">원</span>
                                </div>
                                <div className="mt-1 text-xs text-crypto-neutral-500">
                                    권장: 1,000만원 이상
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                    리밸런싱 주기
                                </label>
                                <select
                                    value={backtestConfig.rebalanceFrequency}
                                    onChange={(e) => setBacktestConfig(prev => ({ ...prev, rebalanceFrequency: e.target.value }))}
                                    className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg text-sm"
                                >
                                    <option value="daily">매일</option>
                                    <option value="weekly">매주</option>
                                    <option value="monthly">매월</option>
                                </select>
                            </div>
                        </div>

                        {/* 코인 선택 */}
                        <div>
                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-3">
                                백테스팅 코인 선택 ({selectedBacktestCoins.length}/{selectedCoins.length})
                            </label>

                            <div className="space-y-2 max-h-64 overflow-y-auto border border-crypto-neutral-200 rounded-lg p-3">
                                {selectedCoins.map((coin) => (
                                    <label
                                        key={coin.market}
                                        className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${selectedBacktestCoins.includes(coin.market)
                                            ? 'bg-crypto-primary-50 border border-crypto-primary-200'
                                            : 'hover:bg-crypto-neutral-50'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedBacktestCoins.includes(coin.market)}
                                            onChange={() => toggleCoinSelection(coin.market)}
                                            className="w-4 h-4 text-crypto-primary-600 rounded"
                                        />
                                        <div className="flex items-center space-x-2 flex-1">
                                            <div className="w-6 h-6 bg-crypto-primary-100 rounded-full flex items-center justify-center">
                                                <span className="text-xs font-bold text-crypto-primary-700">
                                                    {coin.symbol.slice(0, 2)}
                                                </span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-medium text-crypto-neutral-900">
                                                    {coin.korean_name}
                                                </div>
                                                <div className="text-xs text-crypto-neutral-600">
                                                    {coin.symbol} • AI 점수: {coin.analysis.score}/10
                                                </div>
                                            </div>
                                        </div>
                                        <div className={`text-xs ${coin.change_rate >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'}`}>
                                            {formatPercent(coin.change_rate)}
                                        </div>
                                    </label>
                                ))}
                            </div>

                            <div className="mt-3 flex space-x-2">
                                <button
                                    onClick={() => setSelectedBacktestCoins(selectedCoins.map(coin => coin.market))}
                                    className="text-xs bg-crypto-primary-100 text-crypto-primary-700 px-3 py-1 rounded-full hover:bg-crypto-primary-200 transition-colors"
                                >
                                    전체 선택
                                </button>
                                <button
                                    onClick={() => setSelectedBacktestCoins([])}
                                    className="text-xs bg-crypto-neutral-100 text-crypto-neutral-700 px-3 py-1 rounded-full hover:bg-crypto-neutral-200 transition-colors"
                                >
                                    전체 해제
                                </button>
                            </div>
                        </div>

                        {/* 전략 설정 */}
                        <div>
                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-3">
                                백테스팅 전략
                            </label>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs text-crypto-neutral-500 mb-1">투자 스타일</label>
                                    <select
                                        value={backtestConfig.strategy}
                                        onChange={(e) => setBacktestConfig(prev => ({ ...prev, strategy: e.target.value }))}
                                        className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg text-sm"
                                    >
                                        <option value="conservative">보수적 (위험 회피)</option>
                                        <option value="balanced">균형 (리스크 관리)</option>
                                        <option value="aggressive">공격적 (고수익 추구)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs text-crypto-neutral-500 mb-1">
                                        최대 포지션 크기: {backtestConfig.maxPositionSize}%
                                    </label>
                                    <input
                                        type="range"
                                        min="5"
                                        max="50"
                                        value={backtestConfig.maxPositionSize}
                                        onChange={(e) => setBacktestConfig(prev => ({ ...prev, maxPositionSize: parseInt(e.target.value) }))}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-crypto-neutral-500 mt-1">
                                        <span>5%</span>
                                        <span>25%</span>
                                        <span>50%</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start space-x-2">
                                    <InformationCircleIcon className="w-4 h-4 text-blue-600 mt-0.5" />
                                    <div className="text-xs text-blue-800">
                                        <p className="font-medium mb-1">백테스팅 방식</p>
                                        <p>• 선택된 코인들의 과거 가격 데이터 기반</p>
                                        <p>• AI 분석 점수를 활용한 가중치 적용</p>
                                        <p>• 리밸런싱 주기에 따른 자동 재조정</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 백테스팅 실행 버튼 */}
                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={handleRunBacktest}
                            disabled={isLoading || selectedBacktestCoins.length === 0}
                            className="bg-crypto-primary-500 text-white px-8 py-3 rounded-xl hover:bg-crypto-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors shadow-lg"
                        >
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>백테스팅 실행 중...</span>
                                </>
                            ) : (
                                <>
                                    <PlayIcon className="w-5 h-5" />
                                    <span>백테스팅 실행 ({selectedBacktestCoins.length}개 코인)</span>
                                </>
                            )}
                        </button>
                    </div>
                </motion.div>

                {/* 에러 표시 */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-crypto-danger-50 border border-crypto-danger-200 rounded-xl p-6"
                    >
                        <div className="flex items-center space-x-3">
                            <ExclamationTriangleIcon className="w-6 h-6 text-crypto-danger-600" />
                            <div>
                                <h3 className="font-semibold text-crypto-danger-900">백테스팅 실행 실패</h3>
                                <p className="text-sm text-crypto-danger-800 mt-1">{error}</p>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* 백테스팅 결과 */}
                {backtestResults && (
                    <>
                        {/* 성과 요약 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-crypto-neutral-900">
                                    백테스팅 결과
                                </h3>
                                <div className="text-sm text-crypto-neutral-500">
                                    기간: {backtestConfig.startDate} ~ {backtestConfig.endDate}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="text-center p-4 bg-crypto-success-50 rounded-lg">
                                    <div className="text-2xl font-bold text-crypto-success-600">
                                        {formatPercent(backtestResults.performance.totalReturn)}
                                    </div>
                                    <div className="text-sm text-crypto-success-700">총 수익률</div>
                                </div>
                                <div className="text-center p-4 bg-crypto-primary-50 rounded-lg">
                                    <div className="text-2xl font-bold text-crypto-primary-600">
                                        {backtestResults.performance.winRate.toFixed(1)}%
                                    </div>
                                    <div className="text-sm text-crypto-primary-700">승률</div>
                                </div>
                                <div className="text-center p-4 bg-crypto-warning-50 rounded-lg">
                                    <div className="text-2xl font-bold text-crypto-warning-600">
                                        {backtestResults.performance.maxDrawdown.toFixed(1)}%
                                    </div>
                                    <div className="text-sm text-crypto-warning-700">최대 낙폭</div>
                                </div>
                                <div className="text-center p-4 bg-crypto-neutral-50 rounded-lg">
                                    <div className="text-2xl font-bold text-crypto-neutral-600">
                                        {backtestResults.performance.sharpeRatio.toFixed(2)}
                                    </div>
                                    <div className="text-sm text-crypto-neutral-700">샤프 비율</div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div>
                                    <h4 className="font-semibold text-crypto-neutral-900 mb-3">포트폴리오 성과</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-crypto-neutral-600">초기 자금</span>
                                            <span className="font-medium">₩{formatCurrency(backtestResults.portfolio.initialAmount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-crypto-neutral-600">최종 자금</span>
                                            <span className="font-medium text-crypto-success-600">₩{formatCurrency(backtestResults.portfolio.finalAmount)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-crypto-neutral-600">순 수익</span>
                                            <span className="font-medium text-crypto-success-600">
                                                +₩{formatCurrency(backtestResults.portfolio.finalAmount - backtestResults.portfolio.initialAmount)}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-crypto-neutral-900 mb-3">거래 통계</h4>
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-crypto-neutral-600">총 거래 수</span>
                                            <span className="font-medium">{backtestResults.performance.totalTrades}회</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-crypto-neutral-600">수익 거래</span>
                                            <span className="font-medium text-crypto-success-600">
                                                {Math.round(backtestResults.performance.totalTrades * backtestResults.performance.winRate / 100)}회
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-crypto-neutral-600">손실 거래</span>
                                            <span className="font-medium text-crypto-danger-600">
                                                {Math.round(backtestResults.performance.totalTrades * (100 - backtestResults.performance.winRate) / 100)}회
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold text-crypto-neutral-900 mb-3">코인별 성과</h4>
                                    <div className="space-y-2 text-sm">
                                        {backtestResults.coinPerformance?.slice(0, 3).map((coin, index) => (
                                            <div key={index} className="flex justify-between">
                                                <span className="text-crypto-neutral-600">{coin.symbol}</span>
                                                <span className={`font-medium ${coin.return >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'}`}>
                                                    {formatPercent(coin.return)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* 성과 차트 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                        >
                            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                                포트폴리오 성과 추이
                            </h3>

                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={backtestResults.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                        <XAxis dataKey="date" className="text-xs" />
                                        <YAxis
                                            tickFormatter={(value) => `₩${(value / 1000000).toFixed(0)}M`}
                                            className="text-xs"
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Line
                                            type="monotone"
                                            dataKey="value"
                                            stroke="#3B82F6"
                                            strokeWidth={3}
                                            dot={{ fill: '#3B82F6', strokeWidth: 0, r: 4 }}
                                            name="포트폴리오"
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="benchmark"
                                            stroke="#94A3B8"
                                            strokeWidth={2}
                                            strokeDasharray="5 5"
                                            dot={false}
                                            name="벤치마크"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </motion.div>

                        {/* 거래 내역 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                        >
                            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                                주요 거래 내역 (최근 5건)
                            </h3>

                            <div className="space-y-3">
                                {backtestResults.trades.slice(0, 5).map((trade, index) => (
                                    <div key={index} className="flex items-center justify-between p-4 bg-crypto-neutral-50 rounded-lg">
                                        <div className="flex items-center space-x-4">
                                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${trade.action === 'BUY'
                                                ? 'bg-crypto-success-100 text-crypto-success-700'
                                                : 'bg-crypto-danger-100 text-crypto-danger-700'
                                                }`}>
                                                {trade.action === 'BUY' ? '매수' : '매도'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-crypto-neutral-900">
                                                    {trade.symbol} • ₩{formatCurrency(trade.price)}
                                                </div>
                                                <div className="text-sm text-crypto-neutral-600">
                                                    {trade.date} • {trade.reason}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium text-crypto-neutral-900">
                                                ₩{formatCurrency(trade.total)}
                                            </div>
                                            {trade.profit && (
                                                <div className={`text-sm ${trade.profit >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'}`}>
                                                    {trade.profit >= 0 ? '+' : ''}₩{formatCurrency(Math.abs(trade.profit))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>

                        {/* 결론 및 액션 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                        >
                            <div className="text-center">
                                <div className={`inline-flex items-center px-4 py-2 rounded-full ${backtestResults.performance.totalReturn > 15
                                    ? 'bg-crypto-success-100 text-crypto-success-700'
                                    : backtestResults.performance.totalReturn > 5
                                        ? 'bg-crypto-warning-100 text-crypto-warning-700'
                                        : 'bg-crypto-danger-100 text-crypto-danger-700'
                                    }`}>
                                    {backtestResults.performance.totalReturn > 15 ? (
                                        <CheckCircleIcon className="w-5 h-5 mr-2" />
                                    ) : (
                                        <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                                    )}
                                    <span className="font-semibold">
                                        {backtestResults.performance.totalReturn > 15
                                            ? '우수한 전략입니다!'
                                            : backtestResults.performance.totalReturn > 5
                                                ? '양호한 전략입니다'
                                                : '전략 개선이 필요합니다'
                                        }
                                    </span>
                                </div>

                                <p className="text-crypto-neutral-600 mt-4 mb-6">
                                    {backtestResults.performance.totalReturn > 15
                                        ? `선택하신 ${selectedBacktestCoins.length}개 코인으로 구성된 포트폴리오의 백테스팅 결과가 우수합니다. 실제 자동매매를 시작해보세요.`
                                        : backtestResults.performance.totalReturn > 5
                                            ? '전략이 양호하지만 리스크 관리를 강화하는 것이 좋겠습니다.'
                                            : '코인 구성이나 투자 전략을 수정하여 다시 백테스팅해보세요.'
                                    }
                                </p>

                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                        onClick={() => setSelectedBacktestCoins([])}
                                        className="px-6 py-3 border border-crypto-neutral-300 text-crypto-neutral-700 rounded-xl hover:bg-crypto-neutral-50 transition-colors"
                                    >
                                        코인 다시 선택
                                    </button>
                                    <button
                                        onClick={() => navigate('/strategy')}
                                        className="px-6 py-3 border border-crypto-primary-300 text-crypto-primary-700 rounded-xl hover:bg-crypto-primary-50 transition-colors"
                                    >
                                        전략 수정하기
                                    </button>
                                    <button
                                        onClick={startAutoTrading}
                                        disabled={backtestResults.performance.totalReturn < 5}
                                        className="px-6 py-3 bg-crypto-success-600 text-white rounded-xl hover:bg-crypto-success-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
                                    >
                                        <PlayIcon className="w-5 h-5" />
                                        <span>자동매매 시작</span>
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    );
}
