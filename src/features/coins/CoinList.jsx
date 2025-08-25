// src/features/coins/CoinList.jsx - 더 보기 및 클릭 비활성화 버전

import React, { useEffect, memo, useMemo } from 'react';
import { useCoinStore } from '../../stores/coinStore';
import CoinItem from './CoinItem';
import { EmptyCoinsState, LoadingCoinsState, ErrorCoinsState } from '../../components/ui/EmptyStates';

const CoinList = memo(({
    coins = null,
    showSelected = false,
    limit = null,
    enableActions = true,
    onAddCoin,
    onRemoveCoin
    // ✅ onCoinClick 제거 - 카드 클릭 비활성화
}) => {
    const {
        availableCoins,
        selectedCoins,
        getLoadingState,
        initializeData,
        refreshData,
        isSelected
    } = useCoinStore();

    const { isLoading, isInitialized, hasData, isEmpty, progress, error } = getLoadingState();

    // 초기화
    useEffect(() => {
        if (!coins && !isInitialized && !isLoading) {
            console.log('🚀 CoinList에서 초기화 시작');
            initializeData(true);
        }
    }, [coins, isInitialized, isLoading, initializeData]);

    // ✅ useMemo로 계산 결과 캐시
    const coinsToShow = useMemo(() => {
        // 1. props로 전달된 coins가 있으면 우선 사용
        if (coins && Array.isArray(coins)) {
            const base = showSelected
                ? coins.filter(coin => isSelected(coin.market))
                : coins;
            return limit ? base.slice(0, limit) : base;
        }

        // 2. props가 없으면 스토어에서 직접 가져오기
        if (showSelected) {
            return limit ? selectedCoins.slice(0, limit) : selectedCoins;
        }

        // 3. 전체 코인 목록에서 제한 적용
        return limit ? availableCoins.slice(0, limit) : availableCoins;
    }, [coins, showSelected, selectedCoins, availableCoins, limit, isSelected]);

    // ✅ 핸들러 함수들
    const handleAddCoin = (market) => {
        if (onAddCoin) {
            onAddCoin(market);
        }
    };

    const handleRemoveCoin = (market) => {
        if (onRemoveCoin) {
            onRemoveCoin(market);
        }
    };

    // 에러 상태 처리
    if (error && !hasData) {
        return (
            <ErrorCoinsState
                error={error}
                onRetry={() => initializeData(true)}
            />
        );
    }

    // 로딩 상태 처리
    if (!coins && isLoading && !hasData) {
        return (
            <LoadingCoinsState
                progress={progress}
                message="코인 데이터를 불러오는 중입니다..."
            />
        );
    }

    // 빈 상태 처리
    if (isEmpty || (coinsToShow.length === 0 && isInitialized)) {
        return (
            <EmptyCoinsState
                showSelected={showSelected}
                onRefresh={() => refreshData()}
            />
        );
    }

    // ✅ 메인 렌더링
    return (
        <div className="space-y-3">
            {/* 상태 표시 */}
            <div className="flex items-center justify-between text-sm text-gray-500 px-1">
                <span>
                    {coinsToShow.length}개 표시 중
                    {!coins && ` (전체 ${showSelected ? selectedCoins.length : availableCoins.length}개)`}
                </span>
                {isLoading && (
                    <div className="flex items-center space-x-2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        <span>업데이트 중...</span>
                    </div>
                )}
            </div>

            {/* 코인 목록 */}
            <div className="grid gap-3">
                {coinsToShow.map((coin, index) => (
                    <CoinItem
                        key={`${coin.market}-${index}`}
                        coin={coin}
                        isSelected={isSelected(coin.market)}
                        showActions={enableActions}
                        onAddCoin={() => handleAddCoin(coin.market)}
                        onRemoveCoin={() => handleRemoveCoin(coin.market)}
                    // ✅ onClick 제거 - 카드 클릭 비활성화
                    />
                ))}
            </div>
        </div>
    );
});

CoinList.displayName = 'CoinList';

export default CoinList;
