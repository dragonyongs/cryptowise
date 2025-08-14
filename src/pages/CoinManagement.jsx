// src/pages/CoinManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoinStore } from '../stores/coinStore';
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    MagnifyingGlassIcon
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

    // 중앙 상태
    const {
        selectedCoins,
        availableCoins,
        userPlan,
        maxCoins,
        getRemainingSlots,
        isLoading,
        error,
        initializeData,
        refreshData
    } = useCoinStore();

    const remainingSlots = getRemainingSlots();

    // 초기화
    useEffect(() => {
        if (!availableCoins.length) {
            initializeData();
        }
    }, [availableCoins.length, initializeData]);

    // 알림 표시 헬퍼
    const showNotification = (type, message, duration = 3000) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), duration);
    };

    // 검색 및 필터링 로직
    const getFilteredCoins = () => {
        let filtered = availableCoins;

        // ✅ 실제 업비트 API 키값으로 검색 수정
        if (searchTerm) {
            const term = searchTerm.toLowerCase().trim();
            filtered = filtered.filter(coin => {
                // 한국어 이름 검색
                if (coin.korean_name && coin.korean_name.includes(searchTerm)) {
                    return true;
                }

                // 영문 이름 검색  
                if (coin.english_name && coin.english_name.toLowerCase().includes(term)) {
                    return true;
                }

                // 마켓 코드 검색 (KRW-BTC)
                if (coin.market && coin.market.toLowerCase().includes(term)) {
                    return true;
                }

                // 심볼 검색 (BTC)
                if (coin.market) {
                    const symbol = coin.market.replace('KRW-', '');
                    if (symbol.toLowerCase().includes(term)) {
                        return true;
                    }
                }

                return false;
            });
        }

        // ✅ 가격 범위 필터링 수정
        if (filters.minPrice && filters.minPrice !== '') {
            try {
                const minPrice = parseFloat(filters.minPrice);
                filtered = filtered.filter(coin =>
                    coin.current_price && coin.current_price >= minPrice
                );
            } catch (e) {
                console.warn('Invalid minPrice filter:', filters.minPrice);
            }
        }

        if (filters.maxPrice && filters.maxPrice !== '') {
            try {
                const maxPrice = parseFloat(filters.maxPrice);
                filtered = filtered.filter(coin =>
                    coin.current_price && coin.current_price <= maxPrice
                );
            } catch (e) {
                console.warn('Invalid maxPrice filter:', filters.maxPrice);
            }
        }

        // ✅ 24시간 변화율 필터링 수정
        if (filters.changeFilter && filters.changeFilter !== 'all') {
            switch (filters.changeFilter) {
                case 'positive':
                    filtered = filtered.filter(coin =>
                        coin.change_rate && coin.change_rate > 0
                    );
                    break;
                case 'negative':
                    filtered = filtered.filter(coin =>
                        coin.change_rate && coin.change_rate < 0
                    );
                    break;
                case 'neutral':
                    filtered = filtered.filter(coin =>
                        coin.change_rate && Math.abs(coin.change_rate) <= 0.1
                    );
                    break;
                case 'strong_up':
                    filtered = filtered.filter(coin =>
                        coin.change_rate && coin.change_rate >= 5
                    );
                    break;
                case 'strong_down':
                    filtered = filtered.filter(coin =>
                        coin.change_rate && coin.change_rate <= -5
                    );
                    break;
            }
        }

        // ✅ AI 점수 필터링 수정
        if (filters.scoreFilter && filters.scoreFilter !== 'all') {
            switch (filters.scoreFilter) {
                case 'excellent':
                    filtered = filtered.filter(coin =>
                        coin.analysis?.score && coin.analysis.score >= 8
                    );
                    break;
                case 'good':
                    filtered = filtered.filter(coin =>
                        coin.analysis?.score && coin.analysis.score >= 6 && coin.analysis.score < 8
                    );
                    break;
                case 'fair':
                    filtered = filtered.filter(coin =>
                        coin.analysis?.score && coin.analysis.score >= 4 && coin.analysis.score < 6
                    );
                    break;
                case 'poor':
                    filtered = filtered.filter(coin =>
                        coin.analysis?.score && coin.analysis.score < 4
                    );
                    break;
                case 'analyzing':
                    filtered = filtered.filter(coin =>
                        !coin.analysis?.score || coin.analysis.recommendation === 'ANALYZING'
                    );
                    break;
            }
        }

        return filtered;
    };

    // 수동 새로고침
    const handleManualRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshData();
            showNotification('success', '최신 데이터로 업데이트되었습니다');
        } catch (error) {
            showNotification('error', '데이터 업데이트에 실패했습니다', 5000);
        } finally {
            setRefreshing(false);
        }
    };

    // 이벤트 핸들러들
    const handleCoinClick = (coin) => {
        navigate('/analysis', { state: { selectedCoin: coin.market } });
    };

    const handleAnalyzeClick = () => {
        navigate('/analysis');
    };

    // 로딩 상태
    if (isLoading && !availableCoins.length) {
        return (
            <div className="min-h-screen bg-crypto-neutral-50">
                <LoadingCoinsState progress={75} />
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
                            title="수동 새로고침"
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
                    searchResults={filteredCoins.length} // 검색 결과 수 전달
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
                        <div className="flex items-center space-x-2 text-sm text-crypto-neutral-500">
                            <span>마지막 업데이트:</span>
                            <span className="font-medium">
                                {availableCoins[0]?.last_updated
                                    ? new Date(availableCoins[0].last_updated).toLocaleTimeString('ko-KR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })
                                    : '알 수 없음'
                                }
                            </span>
                        </div>
                    </div>

                    {/* ✅ 여기에 추가! - 검색 결과가 없을 때 UI */}
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
                        <CoinList
                            coins={filteredCoins}
                            showSelected={false}
                            enableActions={true}
                        />
                    )}
                </motion.div>

                {/* API 최적화 안내 */}
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
                                <p>• <strong>매일 오전 9시</strong>에 자동으로 모든 관심 코인 분석 업데이트</p>
                                <p>• <strong>수동 새로고침</strong>으로 언제든지 최신 데이터 확인 가능</p>
                                <p>• API 호출 제한을 고려하여 효율적으로 데이터 관리</p>
                                <p>• 분석 결과는 24시간 동안 캐시되어 빠른 조회 가능</p>
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
            </div>
        </div>
    );
}
