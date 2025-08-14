import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useCoinStore } from '../stores/coinStore'; // ✅ 중앙 상태관리 사용
import {
    ArrowLeftIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    TrashIcon,
    StarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function CoinManagement() {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [notification, setNotification] = useState(null);

    // ✅ 중앙 상태 사용
    const {
        selectedCoins,
        availableCoins,
        userPlan,
        maxCoins,
        getRemainingSlots,
        addCoin,
        removeCoin,
        isSelected,
        isLoading,
        error,
        initializeData,
        updateCoinPrices
    } = useCoinStore();

    const filteredCoins = availableCoins.filter(coin =>
        coin.korean_name.includes(searchTerm) ||
        coin.english_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.market.toLowerCase().includes(searchTerm.toLowerCase()) ||
        coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const remainingSlots = getRemainingSlots();

    // 컴포넌트 초기화
    useEffect(() => {
        if (availableCoins.length === 0) {
            initializeData();
        }
    }, [availableCoins.length, initializeData]);

    // 코인 추가 핸들러
    const handleAddCoin = (market) => {
        const result = addCoin(market);

        if (result.success) {
            setNotification({
                type: 'success',
                message: result.message
            });

            // 3초 후 알림 제거
            setTimeout(() => setNotification(null), 3000);
        } else {
            setNotification({
                type: 'error',
                message: result.message
            });

            setTimeout(() => setNotification(null), 5000);
        }
    };

    // 코인 제거 핸들러
    const handleRemoveCoin = (market) => {
        const result = removeCoin(market);

        if (result.success) {
            setNotification({
                type: 'success',
                message: result.message
            });

            setTimeout(() => setNotification(null), 3000);
        }
    };

    // 수동 새로고침
    const handleManualRefresh = async () => {
        setRefreshing(true);

        try {
            // 실제로는 API 호출하여 최신 가격 업데이트
            // 현재는 시뮬레이션
            const mockPriceUpdates = availableCoins.map(coin => ({
                market: coin.market,
                current_price: coin.current_price * (1 + (Math.random() - 0.5) * 0.05), // ±2.5% 변동
                change_rate: (Math.random() - 0.5) * 10, // ±5% 변동
                volume_24h: coin.volume_24h * (1 + (Math.random() - 0.5) * 0.2),
                last_updated: new Date().toISOString()
            }));

            await new Promise(resolve => setTimeout(resolve, 2000)); // 로딩 시뮬레이션
            await updateCoinPrices(mockPriceUpdates);

            setNotification({
                type: 'success',
                message: '최신 데이터로 업데이트되었습니다'
            });

        } catch (error) {
            setNotification({
                type: 'error',
                message: '데이터 업데이트에 실패했습니다'
            });
        } finally {
            setRefreshing(false);
            setTimeout(() => setNotification(null), 3000);
        }
    };

    const formatCurrency = (amount) => {
        if (amount >= 1000000000000) {
            return `${(amount / 1000000000000).toFixed(1)}조`;
        } else if (amount >= 100000000) {
            return `${(amount / 100000000).toFixed(1)}억`;
        } else if (amount >= 10000) {
            return `${(amount / 10000).toFixed(1)}만`;
        }
        return amount.toLocaleString();
    };

    // 로딩 상태
    if (isLoading) {
        return (
            <div className="min-h-screen bg-crypto-neutral-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-crypto-primary-500 mx-auto mb-4"></div>
                    <h2 className="text-xl font-semibold text-crypto-neutral-800 mb-2">
                        코인 데이터 로딩 중...
                    </h2>
                    <p className="text-crypto-neutral-600">
                        업비트 상장 코인 정보를 가져오고 있습니다
                    </p>
                </div>
            </div>
        );
    }

    // 에러 상태
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
                    <button
                        onClick={initializeData}
                        className="bg-crypto-primary-500 text-white px-6 py-3 rounded-xl hover:bg-crypto-primary-600 transition-colors"
                    >
                        다시 시도
                    </button>
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
                            className="p-2 text-crypto-neutral-500 hover:text-crypto-neutral-700 disabled:opacity-50 transition-colors"
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

            <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
                {/* 플랜 제한 안내 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border ${remainingSlots <= 1
                        ? 'bg-red-50 border-red-200'
                        : remainingSlots <= 2
                            ? 'bg-yellow-50 border-yellow-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${userPlan === 'free' ? 'bg-gray-100' : 'bg-crypto-primary-100'
                                }`}>
                                <StarIcon className={`w-5 h-5 ${userPlan === 'free' ? 'text-gray-600' : 'text-crypto-primary-600'
                                    }`} />
                            </div>
                            <div>
                                <h3 className="font-semibold">
                                    {userPlan === 'free' ? '무료 플랜' : '프리미엄 플랜'}
                                </h3>
                                <p className="text-sm text-crypto-neutral-600">
                                    {selectedCoins.length}/{maxCoins}개 코인 추가됨
                                    {remainingSlots > 0 && ` (${remainingSlots}개 더 추가 가능)`}
                                </p>
                            </div>
                        </div>

                        {userPlan === 'free' && (
                            <button className="bg-crypto-primary-500 text-white px-4 py-2 rounded-lg hover:bg-crypto-primary-600 transition-colors">
                                프리미엄 업그레이드
                            </button>
                        )}
                    </div>
                </motion.div>

                {/* 검색 및 필터 */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-crypto-neutral-400" />
                        <input
                            type="text"
                            placeholder="코인 이름이나 심볼로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-crypto-neutral-300 rounded-xl focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={() => navigate('/analysis')}
                            disabled={selectedCoins.length === 0}
                            className="bg-crypto-success-600 text-white px-6 py-3 rounded-xl hover:bg-crypto-success-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                        >
                            <ArrowTrendingUpIcon className="w-5 h-5" />
                            <span>분석 시작</span>
                        </button>

                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            className="border border-crypto-neutral-300 text-crypto-neutral-700 px-4 py-3 rounded-xl hover:bg-crypto-neutral-50 disabled:opacity-50 transition-colors flex items-center space-x-2"
                        >
                            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                            <span>{refreshing ? '업데이트 중...' : '새로고침'}</span>
                        </button>
                    </div>
                </div>

                {/* 선택된 코인 목록 */}
                {selectedCoins.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                    >
                        <h2 className="text-lg font-semibold text-crypto-neutral-900 mb-4 flex items-center">
                            <StarIcon className="w-5 h-5 mr-2 text-yellow-500" />
                            관심 코인 ({selectedCoins.length})
                        </h2>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <AnimatePresence>
                                {selectedCoins.map((coin) => (
                                    <motion.div
                                        key={coin.market}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        whileHover={{ scale: 1.02 }}
                                        className="relative p-4 border border-crypto-neutral-200 rounded-lg hover:shadow-sm transition-all group cursor-pointer"
                                        onClick={() => navigate('/analysis', { state: { selectedCoin: coin.market } })}
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveCoin(coin.market);
                                            }}
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        >
                                            <TrashIcon className="w-4 h-4 text-crypto-danger-500 hover:text-crypto-danger-700" />
                                        </button>

                                        <div className="flex items-center space-x-3 mb-3">
                                            <div className="w-10 h-10 bg-crypto-primary-100 rounded-full flex items-center justify-center">
                                                <span className="font-bold text-crypto-primary-700 text-sm">
                                                    {coin.symbol.slice(0, 2)}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-crypto-neutral-900">
                                                    {coin.korean_name}
                                                </h3>
                                                <p className="text-xs text-crypto-neutral-600">
                                                    {coin.market} • #{coin.rank}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-crypto-neutral-600">현재가</span>
                                                <span className="font-medium">₩{formatCurrency(coin.current_price)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-crypto-neutral-600">변화율</span>
                                                <span className={`font-medium flex items-center ${coin.change_rate >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'
                                                    }`}>
                                                    {coin.change_rate >= 0 ? (
                                                        <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                                                    ) : (
                                                        <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                                                    )}
                                                    {Math.abs(coin.change_rate)}%
                                                </span>
                                            </div>
                                            {coin.analysis && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-sm text-crypto-neutral-600">AI 점수</span>
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
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}

                {/* 업비트 코인 목록 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
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

                    <div className="space-y-3">
                        {filteredCoins.map((coin, index) => (
                            <motion.div
                                key={coin.market}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.03 }}
                                className={`p-4 border rounded-lg transition-all ${isSelected(coin.market)
                                    ? 'border-crypto-success-300 bg-crypto-success-50'
                                    : 'border-crypto-neutral-200 hover:border-crypto-neutral-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xs text-crypto-neutral-500 w-8 text-center">
                                                #{coin.rank}
                                            </span>
                                            <div className="w-10 h-10 bg-crypto-primary-100 rounded-full flex items-center justify-center">
                                                <span className="font-bold text-crypto-primary-700 text-sm">
                                                    {coin.symbol.slice(0, 2)}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-crypto-neutral-900">
                                                    {coin.korean_name}
                                                </h3>
                                                <p className="text-sm text-crypto-neutral-600">
                                                    {coin.english_name} • {coin.symbol}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-6">
                                        <div className="text-right">
                                            <div className="font-semibold text-crypto-neutral-900">
                                                ₩{formatCurrency(coin.current_price)}
                                            </div>
                                            <div className={`text-sm flex items-center justify-end ${coin.change_rate >= 0 ? 'text-crypto-success-600' : 'text-crypto-danger-600'
                                                }`}>
                                                {coin.change_rate >= 0 ? (
                                                    <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                                                ) : (
                                                    <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                                                )}
                                                {Math.abs(coin.change_rate)}%
                                            </div>
                                        </div>

                                        <div className="text-right hidden md:block">
                                            <div className="text-sm text-crypto-neutral-600">시가총액</div>
                                            <div className="font-medium text-crypto-neutral-900">
                                                ₩{formatCurrency(coin.market_cap)}
                                            </div>
                                        </div>

                                        <div className="text-right hidden lg:block">
                                            <div className="text-sm text-crypto-neutral-600">24h 거래량</div>
                                            <div className="font-medium text-crypto-neutral-900">
                                                ₩{formatCurrency(coin.volume_24h)}
                                            </div>
                                        </div>

                                        {coin.analysis && (
                                            <div className="text-right hidden xl:block">
                                                <div className="text-sm text-crypto-neutral-600">AI 점수</div>
                                                <div className="font-medium text-crypto-neutral-900">
                                                    {coin.analysis.score}/10
                                                </div>
                                            </div>
                                        )}

                                        {isSelected(coin.market) ? (
                                            <button
                                                onClick={() => handleRemoveCoin(coin.market)}
                                                className="bg-crypto-danger-100 text-crypto-danger-700 px-4 py-2 rounded-lg hover:bg-crypto-danger-200 transition-colors flex items-center space-x-2"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                                <span>제거</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleAddCoin(coin.market)}
                                                disabled={remainingSlots <= 0}
                                                className="bg-crypto-primary-500 text-white px-4 py-2 rounded-lg hover:bg-crypto-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                                                title={remainingSlots <= 0 ? `${userPlan === 'free' ? '무료' : '프리미엄'} 플랜 한도 초과` : ''}
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                                <span>추가</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {filteredCoins.length === 0 && (
                        <div className="text-center py-12">
                            <MagnifyingGlassIcon className="w-12 h-12 text-crypto-neutral-400 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-2">
                                검색 결과가 없습니다
                            </h3>
                            <p className="text-crypto-neutral-600">
                                다른 검색어를 시도해보세요
                            </p>
                        </div>
                    )}
                </motion.div>

                {/* API 호출 최적화 안내 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
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
                                    className="text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {refreshing ? '업데이트 중...' : '지금 수동 업데이트'}
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 선택된 코인이 없을 때 안내 */}
                {selectedCoins.length === 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white border-2 border-dashed border-crypto-neutral-300 rounded-xl p-12 text-center"
                    >
                        <StarIcon className="w-16 h-16 text-crypto-neutral-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-2">
                            첫 번째 관심 코인을 추가해보세요
                        </h3>
                        <p className="text-crypto-neutral-600 mb-6">
                            위 목록에서 관심있는 코인을 선택하면<br />
                            AI 분석과 자동매매 기능을 사용할 수 있습니다
                        </p>
                        <div className="flex items-center justify-center space-x-2 text-sm text-crypto-neutral-500">
                            <InformationCircleIcon className="w-4 h-4" />
                            <span>무료 플랜에서는 최대 {maxCoins}개까지 추가 가능합니다</span>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
