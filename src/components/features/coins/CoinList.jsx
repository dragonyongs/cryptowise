// src/components/features/coins/CoinList.jsx - 최종 버전
import React, { useEffect, memo, useMemo } from 'react';
import { useCoinStore } from '../../../stores/coinStore';
import CoinItem from './CoinItem';
import { EmptyCoinsState, LoadingCoinsState, ErrorCoinsState } from '../../ui/EmptyStates';

const CoinList = memo(({
    coins = null,
    showSelected = false,
    limit = null,
    enableActions = true
}) => {
    const {
        availableCoins,
        selectedCoins,
        getLoadingState,
        error,
        initializeData,
        refreshData,
        isSelected
    } = useCoinStore();

    const { isLoading, isInitialized, hasData, isEmpty, progress } = getLoadingState();

    // 초기화 (props로 코인이 전달되지 않은 경우만)
    useEffect(() => {
        if (!coins && !isInitialized) {
            initializeData();
        }
    }, [coins, isInitialized, initializeData]);

    // ✅ useMemo로 계산 결과 캐시 (비싼 계산이 있는 경우)
    const coinsToShow = useMemo(() => {
        // 1. props로 전달된 coins가 있으면 우선 사용 (필터된 결과)
        if (coins && Array.isArray(coins)) {
            return showSelected
                ? coins.filter(coin => isSelected(coin.market))
                : coins;
        }

        // 2. props가 없으면 스토어에서 직접 가져오기
        if (showSelected) {
            return selectedCoins;
        }

        // 3. 전체 코인 목록에서 제한 적용
        return limit ? availableCoins.slice(0, limit) : availableCoins;
    }, [coins, showSelected, selectedCoins, availableCoins, limit, isSelected]);

    // 로딩 상태
    if (!coins && isLoading && !hasData) {
        return <LoadingCoinsState progress={progress} />;
    }

    // 에러 상태
    if (!coins && error && !hasData) {
        return <ErrorCoinsState error={error} onRetry={initializeData} />;
    }

    // 빈 상태 처리
    if (coinsToShow.length === 0) {
        let emptyMessage = "코인 데이터가 없습니다";

        if (showSelected) {
            emptyMessage = "선택된 코인이 없습니다";
        } else if (coins && coins.length === 0) {
            emptyMessage = "검색 결과가 없습니다";
        }

        return (
            <EmptyCoinsState
                onRetry={refreshData}
                isLoading={isLoading}
                message={emptyMessage}
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* 코인 목록 렌더링 */}
            <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                {coinsToShow.map(coin => (
                    <CoinItem
                        key={coin.market}
                        coin={coin}
                        isSelected={isSelected(coin.market)}
                        showActions={enableActions && !showSelected}
                    />
                ))}
            </div>

            {/* 더 보기 정보 */}
            {!showSelected && limit && availableCoins.length > limit && (
                <div className="text-center pt-4">
                    <p className="text-sm text-gray-500">
                        {coinsToShow.length}개 표시 중 (전체 {coins ? coins.length : availableCoins.length}개)
                    </p>
                </div>
            )}
        </div>
    );
});

// 디스플레이 네임 설정 (디버깅 용)
CoinList.displayName = 'CoinList';

export default CoinList;
