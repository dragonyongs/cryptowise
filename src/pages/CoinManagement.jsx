// src/pages/CoinManagement.jsx - 로딩 상태 개선 버전

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoinStore } from '../stores/coinStore';
import { useRefreshPriceAndAnalysis } from '../hooks/useRefreshPriceAndAnalysis';

import {
    ArrowLeftIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    MagnifyingGlassIcon, XMarkIcon,
    InformationCircleIcon, ChartBarIcon
} from '@heroicons/react/24/outline';

// 컴포넌트 임포트
import CoinSearch from '../components/features/coins/CoinSearch';
import CoinList from '../components/features/coins/CoinList';
import SelectedCoins from '../components/features/coins/SelectedCoins';
import { LoadingCoinsState, ErrorCoinsState } from '../components/ui/EmptyStates';

export default function CoinManagement() {
    const navigate = useNavigate();

    // 로컬 상태
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({});
    const [refreshing, setRefreshing] = useState(false);
    const [notification, setNotification] = useState(null);
    // ✅ 초기값을 50으로 늘리고 동적 조정
    const [limit, setLimit] = useState(50);
    const [batchAnalyzing, setBatchAnalyzing] = useState(false);
    const [batchAnalysisStarted, setBatchAnalysisStarted] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchTargetCount, setBatchTargetCount] = useState(0);

    // 중앙 상태
    const {
        selectedCoins,
        availableCoins,
        userPlan,
        maxCoins,
        getRemainingSlots,
        isLoading,
        error,
        // ✅ 실제 로딩 프로그레스 상태 추가
        loadingProgress,
        initializeData,
        isInitialized,
        addCoin,
        removeCoin,
        batchAnalyzeCoins
    } = useCoinStore();

    // 가격 및 분석 데이터 업데이트 훅
    const { refreshPriceAndAnalysis } = useRefreshPriceAndAnalysis();

    const remainingSlots = getRemainingSlots();

    // 초기화
    useEffect(() => {
        if (!availableCoins.length) {
            initializeData();
        }
    }, [availableCoins.length, initializeData]);

    // ✅ 배치 분석 진행률 실시간 업데이트
    useEffect(() => {
        if (!batchAnalysisStarted || !availableCoins.length) return;

        // 최근 5분 이내에 분석된 코인들만 계산
        const recentlyAnalyzed = availableCoins.filter(coin => {
            if (!coin.analysis?.last_analyzed) return false;

            const analyzedTime = new Date(coin.analysis.last_analyzed);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

            return analyzedTime > fiveMinutesAgo &&
                coin.analysis.score > 0;
        });

        if (batchTargetCount > 0) {
            const progress = Math.min(100, Math.round((recentlyAnalyzed.length / batchTargetCount) * 100));
            setBatchProgress(progress);

            // 분석 완료 시 UI 숨김
            if (progress >= 100) {
                setTimeout(() => {
                    setBatchAnalysisStarted(false);
                    setBatchProgress(0);
                    setBatchTargetCount(0);
                }, 3000); // 3초 후 숨김
            }
        }
    }, [availableCoins, batchAnalysisStarted, batchTargetCount]);

    // ✅ 초기 표시 개수 동적 조정
    useEffect(() => {
        if (availableCoins.length > 0 && limit < availableCoins.length) {
            // 전체 코인이 100개 미만이면 모두 표시, 아니면 50개씩
            const optimalLimit = availableCoins.length <= 100 ? availableCoins.length : 50;
            setLimit(optimalLimit);
        }
    }, [availableCoins.length]);

    // 알림 표시 헬퍼
    const showNotification = (type, message, duration = 3000) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), duration);
    };

    // 코인 추가 핸들러 (가격/분석 데이터 자동 업데이트 포함)
    const handleAddCoin = async (market) => {
        try {
            const result = addCoin(market);

            if (result.success) {
                showNotification('success', result.message);
                await refreshPriceAndAnalysis();
                console.log(`✅ ${market} 코인 추가 및 데이터 업데이트 완료`);
            } else {
                showNotification('error', result.message, 5000);
            }
        } catch (error) {
            console.error('코인 추가 실패:', error);
            showNotification('error', '코인 추가 중 오류가 발생했습니다.', 5000);
        }
    };

    // 코인 제거 핸들러
    const handleRemoveCoin = async (market) => {
        try {
            const result = removeCoin(market);

            if (result.success) {
                showNotification('success', result.message);
                console.log(`✅ ${market} 코인 제거 완료`);
            } else {
                showNotification('error', result.message, 5000);
            }
        } catch (error) {
            console.error('코인 제거 실패:', error);
            showNotification('error', '코인 제거 중 오류가 발생했습니다.', 5000);
        }
    };

    // ✅ 개선된 전체 코인 배치 분석 핸들러
    const handleBatchAnalysis = async () => {
        setBatchAnalyzing(true);

        try {
            // 초기화 체크
            if (!availableCoins.length && !isLoading) {
                showNotification('info', '데이터 초기화 중입니다. 잠시 후 다시 시도해주세요.', 3000);
                await initializeData();
            }

            const currentState = useCoinStore.getState();
            if (currentState.availableCoins.length === 0) {
                throw new Error('코인 데이터가 로드되지 않았습니다.');
            }

            // ✅ 우선순위 기반 분석 대상 선택 (고정값 제거)
            const unanalyzedCoins = currentState.availableCoins.filter(coin => {
                // 분석되지 않았거나 1시간 이상 오래된 분석
                return !coin.analysis?.score ||
                    coin.analysis.score === 0 ||
                    (coin.analysis.last_analyzed &&
                        Date.now() - new Date(coin.analysis.last_analyzed).getTime() > 3600000);
            });

            // ✅ 투자 우선순위 순으로 정렬하여 상위 30개 선택
            const priorityCoins = unanalyzedCoins
                .sort((a, b) => (b.investment_priority || 0) - (a.investment_priority || 0))
                .slice(0, 30); // 20 → 30으로 증가

            if (priorityCoins.length === 0) {
                showNotification('info', '모든 우선순위 코인이 이미 분석되었습니다.', 3000);
                return;
            }

            // 배치 분석 상태 시작
            setBatchAnalysisStarted(true);
            setBatchTargetCount(priorityCoins.length);
            setBatchProgress(0);

            console.log(`🎯 우선순위 기반 배치 분석 시작: ${priorityCoins.length}개 코인`);
            console.log('분석 대상:', priorityCoins.map(c => `${c.market}(${c.investment_priority})`));

            await batchAnalyzeCoins(priorityCoins.length);
            showNotification('success', `${priorityCoins.length}개 우선순위 코인 분석이 시작되었습니다`);

        } catch (error) {
            console.error('배치 분석 실패:', error);
            showNotification('error', error.message || '배치 분석 중 오류가 발생했습니다', 5000);

            // 에러 시 상태 초기화
            setBatchAnalysisStarted(false);
            setBatchProgress(0);
            setBatchTargetCount(0);
        } finally {
            setBatchAnalyzing(false);
        }
    };

    // 검색 및 필터링 로직 (기존과 동일)
    const getFilteredCoins = () => {
        let filtered = availableCoins;

        if (searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(coin => {
                if (coin.korean_name && coin.korean_name.includes(searchTerm)) return true;
                if (coin.english_name && coin.english_name.toLowerCase().includes(term)) return true;
                if (coin.market && coin.market.toLowerCase().includes(term)) return true;
                if (coin.market) {
                    const symbol = coin.market.replace('KRW-', '');
                    if (symbol.toLowerCase().includes(term)) return true;
                }
                return false;
            });
        }

        // 필터 로직 (기존과 동일)
        if (filters.minPrice && filters.minPrice !== '') {
            try {
                const minPrice = parseFloat(filters.minPrice);
                filtered = filtered.filter(coin => coin.current_price && coin.current_price >= minPrice);
            } catch (e) {
                console.warn('Invalid minPrice filter:', filters.minPrice);
            }
        }

        if (filters.maxPrice && filters.maxPrice !== '') {
            try {
                const maxPrice = parseFloat(filters.maxPrice);
                filtered = filtered.filter(coin => coin.current_price && coin.current_price <= maxPrice);
            } catch (e) {
                console.warn('Invalid maxPrice filter:', filters.maxPrice);
            }
        }

        if (filters.changeFilter && filters.changeFilter !== 'all') {
            switch (filters.changeFilter) {
                case 'positive':
                    filtered = filtered.filter(coin => coin.change_rate && coin.change_rate > 0);
                    break;
                case 'negative':
                    filtered = filtered.filter(coin => coin.change_rate && coin.change_rate < 0);
                    break;
                case 'neutral':
                    filtered = filtered.filter(coin => coin.change_rate && Math.abs(coin.change_rate) <= 0.1);
                    break;
                case 'strong_up':
                    filtered = filtered.filter(coin => coin.change_rate && coin.change_rate >= 5);
                    break;
                case 'strong_down':
                    filtered = filtered.filter(coin => coin.change_rate && coin.change_rate <= -5);
                    break;
            }
        }

        if (filters.scoreFilter && filters.scoreFilter !== 'all') {
            switch (filters.scoreFilter) {
                case 'excellent':
                    filtered = filtered.filter(coin => coin.analysis?.score && coin.analysis.score >= 8);
                    break;
                case 'good':
                    filtered = filtered.filter(coin => coin.analysis?.score && coin.analysis.score >= 6 && coin.analysis.score < 8);
                    break;
                case 'fair':
                    filtered = filtered.filter(coin => coin.analysis?.score && coin.analysis.score >= 4 && coin.analysis.score < 6);
                    break;
                case 'poor':
                    filtered = filtered.filter(coin => coin.analysis?.score && coin.analysis.score < 4);
                    break;
                case 'analyzing':
                    filtered = filtered.filter(coin => !coin.analysis?.score || coin.analysis.recommendation === 'ANALYZING');
                    break;
            }
        }

        return filtered;
    };

    // 수동 새로고침
    const handleManualRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshPriceAndAnalysis();
            showNotification('success', '최신 데이터로 업데이트되었습니다');
            console.log('✅ 수동 새로고침 완료');
        } catch (error) {
            console.error('수동 새로고침 실패:', error);
            showNotification('error', '데이터 업데이트에 실패했습니다', 5000);
        } finally {
            setRefreshing(false);
        }
    };

    const handleCoinClick = (coin) => {
        navigate('/analysis', { state: { selectedCoin: coin.market } });
    };

    const handleAnalyzeClick = () => {
        if (selectedCoins.length === 0) {
            showNotification('error', '분석할 관심 코인이 없습니다', 3000);
            return;
        }
        navigate('/analysis');
    };

    // ✅ 실제 로딩 프로그레스 사용
    if (isLoading && !availableCoins.length) {
        return (
            <div className="min-h-screen bg-crypto-neutral-50">
                <LoadingCoinsState progress={loadingProgress || 0} />
            </div>
        );
    }

    // 에러 상태
    if (error && !availableCoins.length) {
        return (
            <div className="min-h-screen bg-crypto-neutral-50">
                <ErrorCoinsState error={error} onRetry={initializeData} />
            </div>
        );
    }

    const filteredCoins = getFilteredCoins();

    return (
        <div className="min-h-screen bg-crypto-neutral-50">
            {/* 헤더 */}
            <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
                <div className="flex items-center justify-between max-w-6xl mx-auto">
                    <button
                        onClick={() => navigate('/analysis')}
                        className="flex items-center space-x-2 text-crypto-neutral-600 
                         hover:text-crypto-neutral-900 transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span>코인 분석</span>
                    </button>

                    <h1 className="text-lg font-semibold text-crypto-neutral-900">
                        관심 코인 관리
                    </h1>

                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-crypto-neutral-500">
                            {selectedCoins.length}/{maxCoins}
                        </span>
                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            className="p-2 text-crypto-neutral-500 hover:text-crypto-neutral-700 
                           disabled:opacity-50 transition-colors"
                            title="수동 새로고침 (가격 + 분석 데이터)"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 알림 메시지 */}
            <AnimatePresence>
                {notification && (
                    <motion.div
                        initial={{ opacity: 0, y: -50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -50 }}
                        className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm ${notification.type === 'success'
                            ? 'bg-crypto-success-50 border border-crypto-success-200 text-crypto-success-800'
                            : 'bg-crypto-danger-50 border border-crypto-danger-200 text-crypto-danger-800'
                            }`}
                    >
                        <div className="flex items-center space-x-2">
                            {notification.type === 'success' ? (
                                <CheckCircleIcon className="w-5 h-5 text-crypto-success-600" />
                            ) : (
                                <ExclamationTriangleIcon className="w-5 h-5 text-crypto-danger-600" />
                            )}
                            <span className="font-medium">{notification.message}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 메인 콘텐츠 */}
            <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
                {/* ✅ 개선된 배치 분석 진행 상황 표시 */}
                {batchAnalysisStarted && batchTargetCount > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="bg-purple-50 border border-purple-200 rounded-xl p-4"
                    >
                        <div className="flex items-center space-x-3">
                            <ArrowPathIcon className="w-5 h-5 text-purple-600 animate-spin" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-purple-900">
                                    우선순위 기반 배치 분석 진행 중... ({batchProgress}%)
                                </h3>
                                <p className="text-sm text-purple-700 mt-1">
                                    {Math.round((batchProgress / 100) * batchTargetCount)}개 / {batchTargetCount}개 완료
                                    (투자 우선순위 순으로 분석)
                                </p>
                                <div className="w-full bg-purple-200 rounded-full h-3 mt-2">
                                    <div
                                        className="bg-purple-600 h-3 rounded-full transition-all duration-500"
                                        style={{ width: `${batchProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setBatchAnalysisStarted(false);
                                    setBatchProgress(0);
                                    setBatchTargetCount(0);
                                }}
                                className="text-purple-600 hover:text-purple-800 p-1"
                                title="진행률 숨김"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* 플랜 정보 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border ${remainingSlots <= 1 ? 'bg-red-50 border-red-200' :
                        remainingSlots <= 2 ? 'bg-yellow-50 border-yellow-200' :
                            'bg-blue-50 border-blue-200'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold">
                                {userPlan === 'free' ? '무료 플랜' : '프리미엄 플랜'}
                            </h3>
                            <p className="text-sm text-crypto-neutral-600">
                                {selectedCoins.length}/{maxCoins}개 코인 추가됨
                                {remainingSlots > 0 && ` (${remainingSlots}개 더 추가 가능)`}
                            </p>
                        </div>
                        {userPlan === 'free' && (
                            <button className="bg-crypto-primary-500 text-white px-4 py-2 rounded-lg 
                               hover:bg-crypto-primary-600 transition-colors">
                                프리미엄 업그레이드
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* 검색 */}
                <CoinSearch
                    searchTerm={searchTerm}
                    onSearchChange={setSearchTerm}
                    filters={filters}
                    onFiltersChange={setFilters}
                    showFilters={true}
                    searchResults={filteredCoins.length}
                />

                {/* 선택된 코인 */}
                <SelectedCoins
                    onCoinClick={handleCoinClick}
                    onAnalyzeClick={handleAnalyzeClick}
                />

                {/* 전체 코인 목록 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-crypto-neutral-900">
                            업비트 원화 상장 코인 ({filteredCoins.length})
                        </h2>
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleBatchAnalysis}
                                disabled={batchAnalyzing || isLoading || !isInitialized || availableCoins.length === 0}
                                className={`bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors
                               flex items-center space-x-2 ${(batchAnalyzing || isLoading || !isInitialized || availableCoins.length === 0)
                                        ? 'opacity-50 cursor-not-allowed bg-gray-400'
                                        : 'hover:bg-purple-700'
                                    }`}
                            >
                                {batchAnalyzing ? (
                                    <>
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        <span>분석 중...</span>
                                    </>
                                ) : !isInitialized ? (
                                    <>
                                        <ClockIcon className="w-4 h-4" />
                                        <span>초기화 대기중</span>
                                    </>
                                ) : availableCoins.length === 0 ? (
                                    <>
                                        <ExclamationTriangleIcon className="w-4 h-4" />
                                        <span>데이터 없음</span>
                                    </>
                                ) : (
                                    <>
                                        <ChartBarIcon className="w-4 h-4" />
                                        <span>우선순위 분석 시작</span>
                                    </>
                                )}
                            </button>

                            <div className="text-sm text-crypto-neutral-500">
                                마지막 업데이트: {availableCoins[0]?.last_updated
                                    ? new Date(availableCoins[0].last_updated).toLocaleTimeString('ko-KR')
                                    : '알 수 없음'}
                            </div>
                        </div>
                    </div>

                    {/* 검색 결과가 없을 때 UI (기존과 동일) */}
                    {filteredCoins.length === 0 && searchTerm ? (
                        <div className="text-center py-12">
                            <MagnifyingGlassIcon className="w-12 h-12 text-crypto-neutral-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-2">
                                '{searchTerm}'에 대한 검색 결과가 없습니다
                            </h3>
                            <p className="text-crypto-neutral-600 mb-4">
                                다른 검색어를 시도해보거나 필터를 확인해주세요
                            </p>
                            <div className="flex justify-center space-x-3">
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="text-blue-600 hover:text-blue-700 underline"
                                >
                                    검색 초기화
                                </button>
                                <button
                                    onClick={() => {
                                        setSearchTerm('');
                                        setFilters({});
                                    }}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    모두 초기화
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* 코인 목록 렌더링 */
                        <>
                            <CoinList
                                coins={filteredCoins}
                                limit={limit}
                                enableActions={true}
                                onAddCoin={handleAddCoin}
                                onRemoveCoin={handleRemoveCoin}
                            />

                            {/* ✅ 개선된 더보기 버튼 */}
                            {limit < filteredCoins.length && (
                                <div className="text-center pt-6">
                                    <button
                                        onClick={() => setLimit(limit + 50)} // 20 → 50으로 증가
                                        className="px-6 py-3 bg-crypto-primary-50 text-crypto-primary-700 
                                                    rounded-lg hover:bg-crypto-primary-100 transition-colors
                                                    font-medium border border-crypto-primary-200"
                                    >
                                        더보기 ({filteredCoins.length - limit}개 더 있음)
                                    </button>
                                    {/* ✅ 모두 보기 버튼 추가 */}
                                    <button
                                        onClick={() => setLimit(filteredCoins.length)}
                                        className="ml-3 px-4 py-2 text-crypto-neutral-600 
                                                   hover:text-crypto-neutral-800 underline"
                                    >
                                        모두 보기 ({filteredCoins.length}개)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>

                {/* API 최적화 안내 (기존과 동일) */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-blue-50 border border-blue-200 rounded-xl p-6"
                >
                    <div className="flex items-start space-x-3">
                        <ClockIcon className="w-6 h-6 text-blue-600 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-blue-900 mb-2">스마트 분석 스케줄</h3>
                            <div className="text-sm text-blue-800 space-y-2">
                                <p>• <strong>우선순위 기반 분석</strong>: 거래량과 투자 가치가 높은 코인 우선 분석</p>
                                <p>• <strong>실시간 진행률</strong>: 분석 진행 상황을 실시간으로 확인 가능</p>
                                <p>• <strong>수동 새로고침</strong>으로 언제든지 최신 데이터 확인 가능</p>
                                <p>• API 호출 제한을 고려하여 효율적으로 데이터 관리</p>
                            </div>

                            <div className="mt-4 flex items-center flex-wrap gap-4 text-sm text-blue-700">
                                <div className="flex items-center space-x-2">
                                    <span>다음 자동 업데이트:</span>
                                    <span className="font-medium">내일 오전 9:00</span>
                                </div>
                                <button
                                    onClick={handleManualRefresh}
                                    disabled={refreshing}
                                    className="text-blue-600 hover:text-blue-800 underline 
                           disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {refreshing ? '업데이트 중...' : '지금 수동 업데이트'}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 관심 코인 추가 안내 (기존과 동일) */}
                {selectedCoins.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gradient-to-r from-crypto-primary-50 to-crypto-success-50 
                                 border border-crypto-primary-200 rounded-xl p-6"
                    >
                        <div className="flex items-start space-x-3">
                            <InformationCircleIcon className="w-6 h-6 text-crypto-primary-600 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-crypto-primary-900 mb-2">
                                    첫 번째 관심 코인을 추가해보세요!
                                </h3>
                                <div className="text-sm text-crypto-primary-800 space-y-1">
                                    <p>• 위 코인 목록에서 ⭐ 버튼을 클릭하여 관심 코인으로 추가</p>
                                    <p>• 추가된 코인은 자동으로 최신 가격 및 AI 분석 실행</p>
                                    <p>• 관심 코인 기반으로 포트폴리오 구성 및 백테스팅 가능</p>
                                    <p>• {userPlan === 'free' ? '무료 플랜' : '프리미엄 플랜'}에서 최대 <strong>{maxCoins}개</strong>까지 추가 가능</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
