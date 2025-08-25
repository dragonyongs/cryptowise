// src/pages/CoinManagement.jsx - 더 보기 기능 및 UX 개선 버전

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoinStore } from '../stores/coinStore';
import { useRefreshPriceAndAnalysis } from '../features/analysis/hooks/useRefreshPriceAndAnalysis';
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    InformationCircleIcon,
    ChartBarIcon
} from '@heroicons/react/24/outline';

// 컴포넌트 임포트
import CoinSearch from '../features/coins/CoinSearch';
import CoinList from '../features/coins/CoinList';
import SelectedCoins from '../features/coins/SelectedCoins';
import { LoadingCoinsState, ErrorCoinsState } from '../components/ui/EmptyStates';

export default function CoinManagement() {
    const navigate = useNavigate();

    // 로컬 상태
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        minPrice: '',
        maxPrice: '',
        changeFilter: 'all',
        scoreFilter: 'all',
        showFilterPanel: false
    });
    const [refreshing, setRefreshing] = useState(false);
    const [notification, setNotification] = useState(null);

    // ✅ 더 보기 기능을 위한 상태 개선
    const [displayLimit, setDisplayLimit] = useState(25); // 초기 25개
    const LOAD_MORE_COUNT = 25; // 더 보기 시 25개씩 추가

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
        getLoadingState,
        initializeData,
        addCoin,
        removeCoin,
        batchAnalyzeCoins
    } = useCoinStore();

    const { isLoading, isInitialized, hasData, isEmpty, progress, error } = getLoadingState();
    const { refreshPriceAndAnalysis } = useRefreshPriceAndAnalysis();
    const remainingSlots = getRemainingSlots();

    // 초기화 로직
    useEffect(() => {
        if (!isInitialized && !isLoading && availableCoins.length === 0) {
            console.log('🚀 CoinManagement에서 데이터 초기화 시작');
            initializeData(true);
        }
    }, [isInitialized, isLoading, availableCoins.length, initializeData]);

    // ✅ 동적 표시 개수 조정 (더 보기 기능과 연계)
    useEffect(() => {
        if (availableCoins.length > 0) {
            // 전체 데이터가 25개 미만이면 모두 표시
            if (availableCoins.length <= 25) {
                setDisplayLimit(availableCoins.length);
            }
            // 그렇지 않으면 현재 limit 유지
        }
    }, [availableCoins.length]);

    // 배치 분석 진행률 실시간 업데이트
    useEffect(() => {
        if (!batchAnalysisStarted || !availableCoins.length) return;

        const recentlyAnalyzed = availableCoins.filter(coin => {
            if (!coin.analysis?.last_analyzed) return false;
            const analyzedTime = new Date(coin.analysis.last_analyzed);
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            return analyzedTime > fiveMinutesAgo && coin.analysis.investment_score > 0;
        });

        if (batchTargetCount > 0) {
            const progressPercentage = Math.min(100, Math.round((recentlyAnalyzed.length / batchTargetCount) * 100));
            setBatchProgress(progressPercentage);

            if (progressPercentage >= 100) {
                setTimeout(() => {
                    setBatchAnalysisStarted(false);
                    setBatchProgress(0);
                    setBatchTargetCount(0);
                }, 3000);
            }
        }
    }, [availableCoins, batchAnalysisStarted, batchTargetCount]);

    // 알림 표시 헬퍼
    const showNotification = (type, message, duration = 3000) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), duration);
    };

    // 코인 추가 핸들러
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

    // ✅ 더 보기 핸들러 구현
    const handleLoadMore = () => {
        const newLimit = displayLimit + LOAD_MORE_COUNT;
        setDisplayLimit(newLimit);
        console.log(`📈 더 보기 클릭: ${displayLimit} → ${newLimit}`);
    };

    // 배치 분석 핸들러
    const handleBatchAnalysis = async () => {
        setBatchAnalyzing(true);
        try {
            if (!hasData && !isLoading) {
                showNotification('info', '데이터 초기화 중입니다. 잠시 후 다시 시도해주세요.', 3000);
                await initializeData(true);
            }

            const currentState = useCoinStore.getState();
            if (currentState.availableCoins.length === 0) {
                throw new Error('코인 데이터가 로드되지 않았습니다.');
            }

            const unanalyzedCoins = currentState.availableCoins.filter(coin => {
                return !coin.analysis?.investment_score ||
                    coin.analysis.investment_score === 0 ||
                    (coin.analysis.last_analyzed &&
                        Date.now() - new Date(coin.analysis.last_analyzed).getTime() > 3600000);
            });

            const priorityCoins = unanalyzedCoins
                .sort((a, b) => (b.investment_priority || 0) - (a.investment_priority || 0))
                .slice(0, 30);

            if (priorityCoins.length === 0) {
                showNotification('info', '모든 우선순위 코인이 이미 분석되었습니다.', 3000);
                return;
            }

            setBatchAnalysisStarted(true);
            setBatchTargetCount(priorityCoins.length);
            setBatchProgress(0);

            console.log(`🎯 우선순위 기반 배치 분석 시작: ${priorityCoins.length}개 코인`);

            await batchAnalyzeCoins(priorityCoins.length);
            showNotification('success', `${priorityCoins.length}개 우선순위 코인 분석이 시작되었습니다`);

        } catch (error) {
            console.error('배치 분석 실패:', error);
            showNotification('error', error.message || '배치 분석 중 오류가 발생했습니다', 5000);

            setBatchAnalysisStarted(false);
            setBatchProgress(0);
            setBatchTargetCount(0);
        } finally {
            setBatchAnalyzing(false);
        }
    };

    // 검색 및 필터링 로직
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

        // 가격 필터
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

        // 변동률 필터
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

        // ✅ 투자 지수 필터 (기존 점수 필터 대체)
        if (filters.scoreFilter && filters.scoreFilter !== 'all') {
            switch (filters.scoreFilter) {
                case 'excellent':
                    filtered = filtered.filter(coin => coin.analysis?.investment_score && coin.analysis.investment_score >= 80);
                    break;
                case 'good':
                    filtered = filtered.filter(coin => coin.analysis?.investment_score && coin.analysis.investment_score >= 60 && coin.analysis.investment_score < 80);
                    break;
                case 'fair':
                    filtered = filtered.filter(coin => coin.analysis?.investment_score && coin.analysis.investment_score >= 40 && coin.analysis.investment_score < 60);
                    break;
                case 'poor':
                    filtered = filtered.filter(coin => coin.analysis?.investment_score && coin.analysis.investment_score < 40);
                    break;
                case 'analyzing':
                    filtered = filtered.filter(coin => !coin.analysis?.investment_score || coin.analysis.recommendation === 'ANALYZING');
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

    // ✅ 분석 페이지로 이동 (관심 코인이 있을 때만)
    const handleAnalyzeClick = () => {
        if (selectedCoins.length === 0) {
            showNotification('error', '분석할 관심 코인이 없습니다', 3000);
            return;
        }
        navigate('/analysis');
    };

    // 로딩 상태 처리
    if (isLoading && !hasData) {
        return (
            <LoadingCoinsState
                progress={progress}
                message="전체 코인 데이터를 불러오고 있습니다..."
            />
        );
    }

    // 에러 상태 처리
    if (error && !hasData) {
        return (
            <ErrorCoinsState
                error={error}
                onRetry={() => initializeData(true)}
            />
        );
    }

    const filteredCoins = getFilteredCoins();
    // ✅ 표시할 코인 개수 제한
    const coinsToDisplay = filteredCoins.slice(0, displayLimit);
    const remainingCoins = filteredCoins.length - displayLimit;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* 알림 표시 */}
                <AnimatePresence>
                    {notification && (
                        <motion.div
                            initial={{ opacity: 0, y: -50 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -50 }}
                            className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg ${notification.type === 'success'
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : notification.type === 'error'
                                        ? 'bg-red-100 text-red-800 border border-red-200'
                                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                                }`}
                        >
                            <div className="flex items-center space-x-2">
                                {notification.type === 'success' && <CheckCircleIcon className="h-5 w-5" />}
                                {notification.type === 'error' && <ExclamationTriangleIcon className="h-5 w-5" />}
                                {notification.type === 'info' && <InformationCircleIcon className="h-5 w-5" />}
                                <span className="font-medium">{notification.message}</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 헤더 */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg bg-white shadow-sm border border-gray-200 hover:bg-gray-50 transition-colors"
                        >
                            <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">코인 관리</h1>
                            <p className="text-gray-600 mt-1">
                                관심 코인을 추가하고 투자 지수를 확인하세요
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleBatchAnalysis}
                            disabled={batchAnalyzing || isLoading}
                            className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all
                ${batchAnalyzing || isLoading
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                                }
              `}
                        >
                            {batchAnalyzing ? (
                                <ClockIcon className="h-4 w-4 animate-spin" />
                            ) : (
                                <ChartBarIcon className="h-4 w-4" />
                            )}
                            <span>{batchAnalyzing ? '분석 중...' : '투자지수 분석'}</span>
                        </button>

                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing || isLoading}
                            className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg border font-medium transition-colors
                ${refreshing || isLoading
                                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                }
              `}
                        >
                            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            <span>{refreshing ? '업데이트 중...' : '새로고침'}</span>
                        </button>
                    </div>
                </div>

                {/* 배치 분석 진행률 */}
                <AnimatePresence>
                    {batchAnalysisStarted && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6"
                        >
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-blue-800">
                                        우선순위 코인 투자지수 분석 진행 중...
                                    </span>
                                    <span className="text-sm text-blue-600">
                                        {Math.round((batchProgress / 100) * batchTargetCount)}개 / {batchTargetCount}개 완료
                                    </span>
                                </div>
                                <div className="w-full bg-blue-200 rounded-full h-2">
                                    <motion.div
                                        className="bg-blue-600 h-2 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${batchProgress}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                                <p className="text-xs text-blue-600 mt-2">
                                    기술지표, 뉴스감성, 펀더멘탈, 거래량을 종합하여 투자지수를 계산합니다
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 메인 콘텐츠 */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 관심 코인 목록 (좌측) */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    관심 코인
                                </h2>
                                <div className="text-sm text-gray-500">
                                    {selectedCoins.length}/{maxCoins}개
                                    {remainingSlots > 0 && ` (${remainingSlots}개 더 추가 가능)`}
                                </div>
                            </div>

                            <SelectedCoins
                                onAnalyzeClick={handleAnalyzeClick}
                            />

                            {selectedCoins.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={handleAnalyzeClick}
                                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl"
                                    >
                                        <ChartBarIcon className="h-4 w-4" />
                                        <span>선택된 코인 분석하기</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 전체 코인 목록 (우측) */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                            {/* 검색 및 필터 */}
                            <div className="p-6 border-b border-gray-100">
                                <CoinSearch
                                    searchTerm={searchTerm}
                                    onSearchChange={setSearchTerm}
                                    filters={filters}
                                    onFiltersChange={setFilters}
                                    showFilters={true}
                                />
                            </div>

                            {/* 코인 목록 */}
                            <div className="p-6">
                                {searchTerm && filteredCoins.length === 0 ? (
                                    <div className="text-center py-12">
                                        <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            검색 결과가 없습니다
                                        </h3>
                                        <p className="text-gray-600 mb-4">
                                            다른 검색어를 시도해보거나 필터를 확인해주세요
                                        </p>
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setFilters(prev => ({
                                                    ...prev,
                                                    minPrice: '',
                                                    maxPrice: '',
                                                    changeFilter: 'all',
                                                    scoreFilter: 'all'
                                                }));
                                            }}
                                            className="text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            필터 초기화
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <CoinList
                                            coins={coinsToDisplay}
                                            enableActions={true}
                                            onAddCoin={handleAddCoin}
                                            onRemoveCoin={handleRemoveCoin}
                                        // ✅ onCoinClick 제거 - 카드 클릭 비활성화
                                        />

                                        {/* ✅ 개선된 더 보기 버튼 */}
                                        {remainingCoins > 0 && (
                                            <div className="flex justify-center pt-6 border-t border-gray-100 mt-6">
                                                <button
                                                    onClick={handleLoadMore}
                                                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all border border-gray-200 shadow-sm hover:shadow-md"
                                                >
                                                    <span className="font-medium">
                                                        더 보기 ({remainingCoins}개 더)
                                                    </span>
                                                    <ChartBarIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 정보 카드 */}
                        <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                💡 투자지수 안내
                            </h3>
                            <div className="space-y-3 text-sm text-gray-700">
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-600 font-bold">•</span>
                                    <span>
                                        **기술지표 (30%)**: RSI, MACD, 볼린저밴드 등 차트 분석
                                    </span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-600 font-bold">•</span>
                                    <span>
                                        **뉴스감성 (25%)**: 최근 뉴스 및 소셜미디어 감성 분석
                                    </span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-600 font-bold">•</span>
                                    <span>
                                        **펀더멘탈 (25%)**: 프로젝트 가치 및 개발 현황 평가
                                    </span>
                                </div>
                                <div className="flex items-start space-x-2">
                                    <span className="text-blue-600 font-bold">•</span>
                                    <span>
                                        **거래량 (20%)**: 시장 참여도 및 유동성 평가
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-blue-200">
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                                        <span>80-100: 매우 우수</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <span>60-79: 우수</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                        <span>40-59: 보통</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                        <span>0-39: 주의</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
