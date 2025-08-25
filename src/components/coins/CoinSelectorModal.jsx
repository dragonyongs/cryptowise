// src/components/coins/CoinSelectorModal.jsx - 내부에서 직접 코인 추가
import React, { useState } from "react";
import { XMarkIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useCoinStore } from "../../stores/coinStore";

const CoinSelectorModal = ({
    isOpen,
    onClose,
    title = "코인 선택",
    excludeMarkets = []
}) => {
    const [searchQuery, setSearchQuery] = useState("");

    const {
        availableCoins,
        getFilteredCoins,
        addCoin, // ✅ 직접 코인스토어에서 addCoin 사용
        isLoading,
        initializeData
    } = useCoinStore();

    // ✅ 코인 추가 핸들러 (내부에서 직접 처리)
    const handleAddCoin = (market) => {
        const result = addCoin(market);
        if (result?.success) {
            console.log(`✅ ${market} 코인 추가됨`);
            onClose(); // ✅ 성공시 모달 닫기
        } else {
            alert(result?.message || '코인 추가 실패');
        }
    };

    // ✅ CoinAnalysis.jsx와 동일한 검색 로직
    const getSearchedCoins = () => {
        if (!searchQuery) return getFilteredCoins();

        return getFilteredCoins().filter(coin =>
            // 제외할 코인들 필터링
            !excludeMarkets.includes(coin.market) &&
            (
                // 한글명 검색
                coin.korean_name?.includes(searchQuery) ||
                // 심볼 검색 (대소문자 무관)
                coin.symbol?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                // 영문명 검색 (대소문자 무관)
                coin.english_name?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden">
                {/* 헤더 */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-lg font-semibold dark:text-slate-200">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* 검색 및 목록 */}
                <div className="p-4">
                    {/* 검색 입력 */}
                    <div className="relative mb-4">
                        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="코인 검색..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {/* 코인 목록 */}
                    <div className="max-h-64 overflow-y-auto">
                        {isLoading ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                                <p className="text-sm text-gray-500">코인 데이터 로딩중...</p>
                            </div>
                        ) : getSearchedCoins().length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-500 dark:text-gray-400">
                                    {availableCoins.length === 0
                                        ? "코인 데이터가 없습니다"
                                        : searchQuery
                                            ? "검색 결과가 없습니다"
                                            : "추가할 수 있는 코인이 없습니다"
                                    }
                                </p>
                                {availableCoins.length === 0 && (
                                    <button
                                        onClick={() => initializeData(true)}
                                        className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                    >
                                        데이터 다시 로드
                                    </button>
                                )}
                            </div>
                        ) : (
                            getSearchedCoins().map((coin) => (
                                <div
                                    key={coin.market}
                                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                                    onClick={() => handleAddCoin(coin.market)} // ✅ 직접 추가 처리
                                >
                                    <div>
                                        <div className="font-medium text-gray-900 dark:text-white">
                                            {coin.korean_name}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {coin.symbol}
                                        </div>
                                    </div>
                                    <PlusIcon className="h-5 w-5 text-blue-600" />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoinSelectorModal;
