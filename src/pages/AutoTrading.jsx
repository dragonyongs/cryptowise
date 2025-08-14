import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoinStore } from '../stores/coinStore'; // ✅ 코인 상태관리
import { useBacktestStore } from '../stores/backtestStore'; // ✅ 백테스팅 결과
import { useTradingStore } from '../stores/tradingStore'; // ✅ 자동매매 전용 스토어
import {
    ArrowLeftIcon,
    PlayIcon,
    PauseIcon,
    StopIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    BoltIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    CurrencyDollarIcon,
    ChartBarIcon,
    CogIcon,
    InformationCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function AutoTrading() {
    const location = useLocation();
    const navigate = useNavigate();

    // ✅ 중앙 상태 사용
    const { selectedCoins, getSelectedCoin } = useCoinStore();
    const { backtestResults } = useBacktestStore();
    const {
        tradingSession,
        tradingStatus,
        positions,
        recentTrades,
        realTimeUpdates,
        alerts,
        startTrading,
        pauseTrading,
        stopTrading,
        updatePositions,
        isLoading,
        error
    } = useTradingStore();

    // location.state에서 전달받은 데이터
    const { strategyData, selectedCoins: routeSelectedCoins, backtestConfig } = location.state || {};

    // ✅ 자동매매할 코인들 (라우트에서 전달받거나 전체 선택된 코인)
    const tradingCoins = useMemo(() => {
        if (routeSelectedCoins && routeSelectedCoins.length > 0) {
            return routeSelectedCoins.map(market =>
                getSelectedCoin(market) || selectedCoins.find(coin => coin.market === market)
            ).filter(Boolean);
        }
        return selectedCoins;
    }, [routeSelectedCoins, getSelectedCoin, selectedCoins]);

    // ✅ 포트폴리오 실시간 계산
    const portfolioSummary = useMemo(() => {
        if (!tradingSession) {
            return {
                totalValue: 0,
                totalReturn: 0,
                dailyReturn: 0,
                cashBalance: 0,
                cryptoValue: 0
            };
        }

        const totalCryptoValue = positions.reduce((sum, pos) => sum + pos.value, 0);
        const totalValue = totalCryptoValue + tradingSession.cashBalance;
        const totalReturn = ((totalValue - tradingSession.initialAmount) / tradingSession.initialAmount) * 100;

        return {
            totalValue,
            totalReturn,
            dailyReturn: tradingSession.dailyReturn || 0,
            cashBalance: tradingSession.cashBalance,
            cryptoValue: totalCryptoValue
        };
    }, [tradingSession, positions]);

    // ✅ 컴포넌트 초기화
    useEffect(() => {
        // 선택된 코인이 없으면 코인 선택 페이지로 리다이렉트
        if (tradingCoins.length === 0) {
            return;
        }

        // 자동매매 세션이 없으면 초기화
        if (!tradingSession) {
            const initialConfig = {
                coins: tradingCoins,
                strategy: strategyData || { name: '기본 전략', type: 'balanced' },
                initialAmount: backtestConfig?.initialAmount || 10000000,
                backtestResults
            };

            // 자동매매 세션 초기화는 시작 버튼을 눌렀을 때 수행
        }
    }, [tradingCoins, tradingSession, strategyData, backtestConfig, backtestResults]);

    // ✅ 자동매매 시작 핸들러
    const handleStartTrading = async () => {
        if (tradingCoins.length === 0) {
            alert('자동매매할 코인을 선택해주세요.');
            return;
        }

        const config = {
            coins: tradingCoins,
            strategy: strategyData || { name: '기본 전략', type: 'balanced' },
            initialAmount: backtestConfig?.initialAmount || 10000000,
            maxPositionSize: backtestConfig?.maxPositionSize || 20,
            rebalanceFrequency: backtestConfig?.rebalanceFrequency || 'daily',
            backtestResults
        };

        await startTrading(config);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('ko-KR').format(Math.round(amount));
    };

    const formatPercent = (percent) => {
        return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
    };

    // ✅ 선택된 코인이 없는 경우
    if (selectedCoins.length === 0) {
        return (
            <div className="min-h-screen bg-crypto-neutral-50">
                <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate('/backtesting')}
                            className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                            <span>이전</span>
                        </button>

                        <h1 className="text-lg font-semibold text-crypto-neutral-900">자동매매</h1>
                        <div className="w-20"></div>
                    </div>
                </div>

                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center p-8">
                        <BoltIcon className="w-20 h-20 text-crypto-neutral-300 mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-crypto-neutral-900 mb-4">
                            자동매매할 코인을 추가해주세요
                        </h2>
                        <p className="text-crypto-neutral-600 mb-8">
                            관심 코인을 먼저 추가하고 백테스팅을 완료한 후<br />
                            자동매매를 시작할 수 있습니다
                        </p>
                        <div className="space-x-3">
                            <button
                                onClick={() => navigate('/coins')}
                                className="bg-crypto-primary-500 text-white px-6 py-3 rounded-xl hover:bg-crypto-primary-600 transition-colors"
                            >
                                코인 추가하기
                            </button>
                            <button
                                onClick={() => navigate('/backtesting')}
                                className="border border-crypto-neutral-300 text-crypto-neutral-700 px-6 py-3 rounded-xl hover:bg-crypto-neutral-50 transition-colors"
                            >
                                백테스팅 먼저
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
                        onClick={() => navigate('/backtesting')}
                        className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span>이전</span>
                    </button>

                    <h1 className="text-lg font-semibold text-crypto-neutral-900">
                        자동매매
                    </h1>

                    <div className="flex items-center space-x-2">
                        <div className={`w-3 h-3 rounded-full ${tradingStatus === 'running' ? 'bg-green-500 animate-pulse' :
                            tradingStatus === 'paused' ? 'bg-yellow-500' : 'bg-gray-400'
                            }`}></div>
                        <span className={`text-sm font-medium ${tradingStatus === 'running' ? 'text-green-600' :
                            tradingStatus === 'paused' ? 'text-yellow-600' : 'text-gray-600'
                            }`}>
                            {tradingStatus === 'running' ? '실행 중' :
                                tradingStatus === 'paused' ? '일시중지' : '중지됨'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
                {/* 전체 성과 요약 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-crypto-success-500 to-crypto-success-600 rounded-xl text-white p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-semibold mb-2">실시간 포트폴리오 성과</h2>
                            <p className="text-crypto-success-100">
                                {tradingSession?.strategy?.name || '기본 전략'} • {tradingCoins.length}개 코인 •
                                시작일: {tradingSession?.startDate ? new Date(tradingSession.startDate).toLocaleDateString() : '미시작'}
                            </p>
                        </div>
                        <ArrowTrendingUpIcon className="w-8 h-8" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                            <div className="text-3xl font-bold">
                                ₩{formatCurrency(portfolioSummary.totalValue)}
                            </div>
                            <div className="text-crypto-success-100 text-sm">현재 총 자산</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold">
                                {formatPercent(portfolioSummary.totalReturn)}
                            </div>
                            <div className="text-crypto-success-100 text-sm">총 수익률</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold">
                                {formatPercent(portfolioSummary.dailyReturn)}
                            </div>
                            <div className="text-crypto-success-100 text-sm">일일 수익률</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold">
                                {recentTrades.length}
                            </div>
                            <div className="text-crypto-success-100 text-sm">총 거래 수</div>
                        </div>
                    </div>
                </motion.div>

                {/* 매매 제어 패널 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-crypto-neutral-900">
                            매매 제어
                        </h3>
                        {tradingSession && (
                            <div className="flex items-center space-x-2 text-sm text-crypto-neutral-600">
                                <CogIcon className="w-4 h-4" />
                                <span>초기 자금: ₩{formatCurrency(tradingSession.initialAmount)}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        {tradingStatus === 'stopped' && (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleStartTrading}
                                disabled={isLoading}
                                className="flex-1 bg-crypto-success-600 text-white py-4 px-6 rounded-xl hover:bg-crypto-success-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2 font-semibold"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                        <span>자동매매 초기화 중...</span>
                                    </>
                                ) : (
                                    <>
                                        <PlayIcon className="w-6 h-6" />
                                        <span>자동매매 시작 ({tradingCoins.length}개 코인)</span>
                                    </>
                                )}
                            </motion.button>
                        )}

                        {tradingStatus === 'running' && (
                            <>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={pauseTrading}
                                    className="flex-1 bg-crypto-warning-600 text-white py-4 px-6 rounded-xl hover:bg-crypto-warning-700 transition-colors flex items-center justify-center space-x-2 font-semibold"
                                >
                                    <PauseIcon className="w-6 h-6" />
                                    <span>일시중지</span>
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={stopTrading}
                                    className="flex-1 bg-crypto-danger-600 text-white py-4 px-6 rounded-xl hover:bg-crypto-danger-700 transition-colors flex items-center justify-center space-x-2 font-semibold"
                                >
                                    <StopIcon className="w-6 h-6" />
                                    <span>완전 중지</span>
                                </motion.button>
                            </>
                        )}

                        {tradingStatus === 'paused' && (
                            <>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => startTrading()}
                                    className="flex-1 bg-crypto-success-600 text-white py-4 px-6 rounded-xl hover:bg-crypto-success-700 transition-colors flex items-center justify-center space-x-2 font-semibold"
                                >
                                    <PlayIcon className="w-6 h-6" />
                                    <span>재시작</span>
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={stopTrading}
                                    className="flex-1 bg-crypto-danger-600 text-white py-4 px-6 rounded-xl hover:bg-crypto-danger-700 transition-colors flex items-center justify-center space-x-2 font-semibold"
                                >
                                    <StopIcon className="w-6 h-6" />
                                    <span>완전 중지</span>
                                </motion.button>
                            </>
                        )}
                    </div>

                    {/* 자동매매 대상 코인 표시 */}
                    <div className="p-4 bg-crypto-neutral-50 rounded-lg">
                        <h4 className="font-semibold text-crypto-neutral-900 mb-3 flex items-center">
                            <ChartBarIcon className="w-5 h-5 mr-2" />
                            자동매매 대상 코인 ({tradingCoins.length}개)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {tradingCoins.map((coin) => (
                                <div
                                    key={coin.market}
                                    className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg border"
                                >
                                    <div className="w-6 h-6 bg-crypto-primary-100 rounded-full flex items-center justify-center">
                                        <span className="text-xs font-bold text-crypto-primary-700">
                                            {coin.symbol.slice(0, 2)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-sm font-medium text-crypto-neutral-900">
                                            {coin.korean_name}
                                        </span>
                                        <div className="flex items-center space-x-1 text-xs text-crypto-neutral-600">
                                            <span>AI: {coin.analysis.score}/10</span>
                                            <span className={coin.change_rate >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'}>
                                                {formatPercent(coin.change_rate)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 백테스팅 결과 요약 */}
                    {backtestResults && tradingStatus === 'stopped' && (
                        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                                백테스팅 검증 완료
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-700">예상 수익률: </span>
                                    <span className="font-semibold text-blue-900">+{backtestResults.performance?.totalReturn}%</span>
                                </div>
                                <div>
                                    <span className="text-blue-700">승률: </span>
                                    <span className="font-semibold text-blue-900">{backtestResults.performance?.winRate}%</span>
                                </div>
                                <div>
                                    <span className="text-blue-700">최대 낙폭: </span>
                                    <span className="font-semibold text-blue-900">{backtestResults.performance?.maxDrawdown}%</span>
                                </div>
                                <div>
                                    <span className="text-blue-700">샤프 비율: </span>
                                    <span className="font-semibold text-blue-900">{backtestResults.performance?.sharpeRatio}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 에러 표시 */}
                    {error && (
                        <div className="mt-4 p-4 bg-crypto-danger-50 border border-crypto-danger-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                                <ExclamationTriangleIcon className="w-5 h-5 text-crypto-danger-600" />
                                <div>
                                    <h4 className="font-semibold text-crypto-danger-900">자동매매 오류</h4>
                                    <p className="text-sm text-crypto-danger-800 mt-1">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* 현재 포지션 */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="lg:col-span-2"
                    >
                        <div className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-crypto-neutral-900 flex items-center">
                                    <CurrencyDollarIcon className="w-5 h-5 mr-2" />
                                    현재 포지션 ({positions.length})
                                </h3>
                                {tradingStatus === 'running' && (
                                    <button
                                        onClick={updatePositions}
                                        className="text-crypto-neutral-500 hover:text-crypto-neutral-700 transition-colors"
                                        title="포지션 업데이트"
                                    >
                                        <ArrowPathIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                {positions.length > 0 ? (
                                    positions.map((position, index) => (
                                        <motion.div
                                            key={position.symbol}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="p-4 border border-crypto-neutral-200 rounded-lg hover:shadow-sm transition-shadow"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-crypto-primary-100 rounded-full flex items-center justify-center">
                                                        <span className="font-bold text-crypto-primary-700 text-sm">
                                                            {position.symbol.slice(0, 2)}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-semibold text-crypto-neutral-900">
                                                            {position.name} ({position.symbol})
                                                        </h4>
                                                        <p className="text-sm text-crypto-neutral-600">
                                                            {position.quantity} {position.symbol} • 평균가: ₩{formatCurrency(position.avgPrice)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className="font-semibold text-crypto-neutral-900">
                                                        ₩{formatCurrency(position.value)}
                                                    </div>
                                                    <div className={`text-sm ${position.pnlPercent >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'
                                                        }`}>
                                                        {formatPercent(position.pnlPercent)} • ₩{formatCurrency(Math.abs(position.unrealizedPnL))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="text-sm text-crypto-neutral-600">
                                                    포트폴리오 비중: {position.allocation?.toFixed(1)}%
                                                </div>
                                                <div className="text-sm text-crypto-neutral-600">
                                                    현재가: ₩{formatCurrency(position.currentPrice)}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <CurrencyDollarIcon className="w-12 h-12 text-crypto-neutral-300 mx-auto mb-4" />
                                        <p className="text-crypto-neutral-600">
                                            {tradingStatus === 'stopped'
                                                ? '자동매매를 시작하면 포지션이 표시됩니다'
                                                : '포지션을 생성 중입니다...'
                                            }
                                        </p>
                                    </div>
                                )}

                                {/* 현금 포지션 */}
                                {tradingSession && (
                                    <div className="p-4 border border-crypto-neutral-200 rounded-lg bg-crypto-neutral-50">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                                    <span className="font-bold text-gray-600 text-sm">KRW</span>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-crypto-neutral-900">원화</h4>
                                                    <p className="text-sm text-crypto-neutral-600">현금 보유</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold text-crypto-neutral-900">
                                                    ₩{formatCurrency(portfolioSummary.cashBalance)}
                                                </div>
                                                <div className="text-sm text-crypto-neutral-600">
                                                    {((portfolioSummary.cashBalance / (portfolioSummary.totalValue || 1)) * 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* 우측 사이드바 */}
                    <div className="space-y-6">
                        {/* 실시간 활동 */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                        >
                            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4 flex items-center">
                                <BoltIcon className="w-5 h-5 mr-2" />
                                실시간 활동
                            </h3>

                            <div className="space-y-3">
                                <AnimatePresence>
                                    {realTimeUpdates.map((update) => (
                                        <motion.div
                                            key={update.id}
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="flex items-start space-x-2 text-sm"
                                        >
                                            <div className="w-2 h-2 bg-crypto-primary-500 rounded-full animate-pulse mt-2"></div>
                                            <div className="flex-1">
                                                <span className="text-crypto-neutral-700">{update.message}</span>
                                                <div className="text-crypto-neutral-500 text-xs mt-1">
                                                    {update.timestamp}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>

                                {realTimeUpdates.length === 0 && (
                                    <div className="text-center py-6">
                                        <ClockIcon className="w-8 h-8 text-crypto-neutral-400 mx-auto mb-2" />
                                        <p className="text-sm text-crypto-neutral-500">
                                            {tradingStatus === 'running'
                                                ? '활동 로그를 수집 중...'
                                                : '자동매매를 시작하면 실시간 활동이 표시됩니다'
                                            }
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        {/* 알림 */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                        >
                            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                                알림
                            </h3>

                            <div className="space-y-3">
                                {alerts.length > 0 ? (
                                    alerts.map((alert) => (
                                        <div
                                            key={alert.id}
                                            className={`p-3 rounded-lg border-l-4 ${alert.level === 'success'
                                                ? 'bg-crypto-success-50 border-crypto-success-400'
                                                : alert.level === 'warning'
                                                    ? 'bg-crypto-warning-50 border-crypto-warning-400'
                                                    : 'bg-crypto-danger-50 border-crypto-danger-400'
                                                }`}
                                        >
                                            <div className="flex items-start space-x-2">
                                                {alert.level === 'success' ? (
                                                    <CheckCircleIcon className="w-4 h-4 text-crypto-success-600 mt-0.5" />
                                                ) : (
                                                    <ExclamationTriangleIcon className="w-4 h-4 text-crypto-warning-600 mt-0.5" />
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium text-crypto-neutral-900">
                                                        {alert.message}
                                                    </p>
                                                    <p className="text-xs text-crypto-neutral-500 mt-1">
                                                        {alert.timestamp}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6">
                                        <InformationCircleIcon className="w-8 h-8 text-crypto-neutral-400 mx-auto mb-2" />
                                        <p className="text-sm text-crypto-neutral-500">
                                            알림이 없습니다
                                        </p>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* 최근 거래 내역 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                >
                    <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                        최근 거래 내역
                    </h3>

                    <div className="space-y-3">
                        {recentTrades.length > 0 ? (
                            recentTrades.slice(0, 5).map((trade, index) => (
                                <motion.div
                                    key={trade.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center justify-between p-4 border border-crypto-neutral-200 rounded-lg"
                                >
                                    <div className="flex items-center space-x-4">
                                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${trade.action === 'BUY'
                                            ? 'bg-crypto-success-100 text-crypto-success-700'
                                            : 'bg-crypto-danger-100 text-crypto-danger-700'
                                            }`}>
                                            {trade.action === 'BUY' ? '매수' : '매도'}
                                        </div>
                                        <div>
                                            <div className="font-medium text-crypto-neutral-900">
                                                {trade.symbol} • {trade.quantity} {trade.unit || trade.symbol}
                                            </div>
                                            <div className="text-sm text-crypto-neutral-600">
                                                ₩{formatCurrency(trade.price)} • {trade.reason}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="font-medium text-crypto-neutral-900">
                                            ₩{formatCurrency(trade.total)}
                                        </div>
                                        <div className="text-sm text-crypto-neutral-500">
                                            {new Date(trade.timestamp).toLocaleString('ko-KR', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="text-center py-8">
                                <ChartBarIcon className="w-12 h-12 text-crypto-neutral-300 mx-auto mb-4" />
                                <p className="text-crypto-neutral-600">
                                    아직 거래 내역이 없습니다
                                </p>
                                <p className="text-sm text-crypto-neutral-500 mt-2">
                                    자동매매가 시작되면 거래 내역이 표시됩니다
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
