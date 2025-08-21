// src/components/features/testing/components/CoinsTab.jsx - 데이터 연결 수정

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  SearchIcon, PlusIcon, MinusIcon, CoinsIcon, StarIcon, TrendingUpIcon,
  RefreshCwIcon, HeartIcon, InfoIcon, CheckCircleIcon, AlertCircleIcon,
  WifiIcon, WifiOffIcon
} from "lucide-react";
import { useCoinStore } from "../../../../stores/coinStore";

const CoinsTab = ({
  selectedCoins = [],
  onCoinsChange,
  favoriteCoins = [], // 🎯 관심 코인 목록
  onFavoriteCoinsChange, // 🎯 관심 코인 변경 핸들러
  tradingMode = "favorites",
  setTradingMode,
  topCoinsLimit = 10,
  setTopCoinsLimit,
  isActive
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  // 🎯 실제 coinStore에서 데이터 가져오기
  const {
    availableCoins,
    selectedCoins: storeSelectedCoins, // 🎯 coinStore의 선택된 코인
    isLoading,
    isInitialized,
    error,
    refreshData,
    initializeData
  } = useCoinStore();

  // 🎯 초기 데이터 로드
  useEffect(() => {
    if (!isInitialized && !isLoading && !error) {
      console.log("🚀 CoinsTab에서 coinStore 초기화 요청");
      initializeData(true);
    }
  }, [isInitialized, isLoading, error, initializeData]);

  // 🎯 coinStore 데이터와 favoriteCoins 동기화
  useEffect(() => {
    if (isInitialized && storeSelectedCoins.length > 0 && favoriteCoins.length === 0) {
      console.log("🔄 coinStore selectedCoins를 favoriteCoins로 동기화:", storeSelectedCoins.length);
      // coinStore의 선택된 코인을 관심코인으로 변환
      const convertedFavorites = storeSelectedCoins.map(coin => ({
        symbol: coin.symbol,
        korean_name: coin.korean_name,
        english_name: coin.english_name,
        market: coin.market,
        current_price: coin.current_price,
        change_rate: coin.change_rate
      }));
      onFavoriteCoinsChange?.(convertedFavorites);
    }
  }, [isInitialized, storeSelectedCoins, favoriteCoins, onFavoriteCoinsChange]);

  // 🎯 검색 필터링
  const filteredCoins = useMemo(() => {
    if (!availableCoins || availableCoins.length === 0) return [];

    if (!searchTerm.trim()) return availableCoins;

    const searchLower = searchTerm.toLowerCase();
    return availableCoins.filter(coin =>
      coin.symbol?.toLowerCase().includes(searchLower) ||
      coin.korean_name?.toLowerCase().includes(searchLower) ||
      coin.english_name?.toLowerCase().includes(searchLower)
    );
  }, [availableCoins, searchTerm]);

  // 🎯 현재 표시할 코인 목록 결정
  const displayCoins = useMemo(() => {
    if (searchTerm.trim()) {
      // 검색 중이면 필터링된 결과
      return filteredCoins.map(coin => ({
        ...coin,
        isSelected: selectedCoins.includes(coin.symbol),
        isFavorite: favoriteCoins.some(fav => fav.symbol === coin.symbol)
      }));
    }

    if (tradingMode === "favorites") {
      // 🎯 관심 코인 모드 - 실제 업비트 데이터와 병합
      if (favoriteCoins.length === 0) {
        return []; // 관심 코인이 정말로 없으면 빈 배열
      }

      return favoriteCoins.map(favCoin => {
        // 업비트 데이터에서 최신 정보 찾기
        const upbitData = availableCoins.find(coin => coin.symbol === favCoin.symbol);
        return {
          // 업비트 최신 데이터 우선, 없으면 관심코인 데이터 사용
          ...(upbitData || favCoin),
          // 관심코인 고유 정보 유지
          symbol: favCoin.symbol,
          korean_name: favCoin.korean_name || upbitData?.korean_name,
          isSelected: selectedCoins.includes(favCoin.symbol),
          isFavorite: true
        };
      }).filter(coin => coin.symbol); // 유효한 코인만
    } else {
      // 상위 코인 모드
      const sortedCoins = [...(availableCoins || [])]
        .sort((a, b) => {
          const aScore = a.investment_priority || a.volume_24h || 0;
          const bScore = b.investment_priority || b.volume_24h || 0;
          return bScore - aScore;
        })
        .slice(0, topCoinsLimit);

      return sortedCoins.map(coin => ({
        ...coin,
        isSelected: selectedCoins.includes(coin.symbol),
        isFavorite: favoriteCoins.some(fav => fav.symbol === coin.symbol)
      }));
    }
  }, [
    searchTerm, filteredCoins, tradingMode, favoriteCoins,
    availableCoins, topCoinsLimit, selectedCoins
  ]);

  // 🎯 관심 코인 추가/제거
  const handleFavoriteToggle = useCallback((coin) => {
    const isFavorite = favoriteCoins.some(fav => fav.symbol === coin.symbol);

    if (isFavorite) {
      // 관심 코인에서 제거
      const newFavorites = favoriteCoins.filter(fav => fav.symbol !== coin.symbol);
      onFavoriteCoinsChange?.(newFavorites);
    } else {
      // 관심 코인에 추가
      const newFavorite = {
        symbol: coin.symbol,
        korean_name: coin.korean_name,
        english_name: coin.english_name,
        market: coin.market,
        current_price: coin.current_price,
        change_rate: coin.change_rate
      };
      onFavoriteCoinsChange?.([...favoriteCoins, newFavorite]);
    }
  }, [favoriteCoins, onFavoriteCoinsChange]);

  // 🎯 코인 선택/해제
  const handleCoinToggle = useCallback((coin) => {
    if (isActive) {
      alert("거래 중에는 코인 선택을 변경할 수 없습니다.");
      return;
    }

    const newSelectedCoins = selectedCoins.includes(coin.symbol)
      ? selectedCoins.filter(s => s !== coin.symbol)
      : [...selectedCoins, coin.symbol];

    onCoinsChange(newSelectedCoins);
  }, [isActive, selectedCoins, onCoinsChange]);

  // 🎯 전체 선택/해제
  const handleSelectAll = useCallback(() => {
    if (isActive) {
      alert("거래 중에는 코인 선택을 변경할 수 없습니다.");
      return;
    }

    const visibleSymbols = displayCoins.map(coin => coin.symbol);
    const allSelected = visibleSymbols.every(symbol => selectedCoins.includes(symbol));

    if (allSelected) {
      const newSelected = selectedCoins.filter(symbol => !visibleSymbols.includes(symbol));
      onCoinsChange(newSelected);
    } else {
      const newSelected = [...new Set([...selectedCoins, ...visibleSymbols])];
      onCoinsChange(newSelected);
    }
  }, [isActive, displayCoins, selectedCoins, onCoinsChange]);

  return (
    <div className="space-y-6">

      {/* 🎯 디버깅 정보 표시 (개발 모드에서만) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
          <div className="font-medium text-yellow-800 mb-1">디버깅 정보:</div>
          <div className="text-yellow-700">
            • favoriteCoins: {favoriteCoins.length}개 | selectedCoins: {selectedCoins.length}개 | storeSelectedCoins: {storeSelectedCoins.length}개
            <br />• availableCoins: {availableCoins?.length || 0}개 | displayCoins: {displayCoins.length}개
            <br />• 모드: {tradingMode} | 초기화: {isInitialized ? '완료' : '진행중'}
          </div>
        </div>
      )}

      {/* 거래 모드 선택 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">거래 대상 선택</h3>
          <div className="flex items-center space-x-2">
            <div className={`flex items-center space-x-1 text-sm ${isInitialized ? "text-green-600" : "text-gray-500"
              }`}>
              {isInitialized ? <WifiIcon className="w-4 h-4" /> : <WifiOffIcon className="w-4 h-4" />}
              <span>{isLoading ? "로딩중..." : isInitialized ? `연결됨 (${availableCoins?.length || 0}개)` : "연결안됨"}</span>
            </div>

            <button
              onClick={() => refreshData()}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCwIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>
          </div>
        </div>

        {/* 모드 선택 버튼 */}
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => setTradingMode("favorites")}
            disabled={isActive}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${tradingMode === "favorites"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } ${isActive ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <HeartIcon className="w-4 h-4" />
            <span>관심 코인</span>
            <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
              {favoriteCoins.length}개
            </span>
          </button>

          <button
            onClick={() => setTradingMode("top")}
            disabled={isActive}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${tradingMode === "top"
              ? "bg-blue-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } ${isActive ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <TrendingUpIcon className="w-4 h-4" />
            <span>상위 코인</span>
            <span className="bg-white/20 px-2 py-1 rounded-full text-xs">
              {topCoinsLimit}개
            </span>
          </button>

          {tradingMode === "top" && (
            <select
              value={topCoinsLimit}
              onChange={(e) => setTopCoinsLimit(parseInt(e.target.value))}
              disabled={isActive}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
            >
              {[5, 10, 15, 20, 30].map(num => (
                <option key={num} value={num}>{num}개</option>
              ))}
            </select>
          )}
        </div>

        {/* 모드별 안내 */}
        <div className="text-sm text-gray-600">
          {tradingMode === "favorites" ? (
            <div className="flex items-center space-x-2">
              <InfoIcon className="w-4 h-4 text-blue-500" />
              <span>관심 코인 목록에서 거래할 코인을 선택합니다. 하단에서 관심 코인을 추가/삭제할 수 있습니다.</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <InfoIcon className="w-4 h-4 text-blue-500" />
              <span>거래량/시가총액 기준 상위 {topCoinsLimit}개 코인에서 거래 대상을 선택합니다.</span>
            </div>
          )}
        </div>
      </div>

      {/* 검색 */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <SearchIcon className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="코인 이름이나 심볼로 검색... (예: 비트코인, BTC, Bitcoin)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <MinusIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 코인 목록 */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">
            {searchTerm ? `검색 결과 (${displayCoins.length}개)` :
              tradingMode === "favorites" ? `관심 코인 (${favoriteCoins.length}개)` : `상위 ${topCoinsLimit}개 코인`}
          </h3>

          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-500">{selectedCoins.length}개 선택됨</span>
            {displayCoins.length > 0 && (
              <button
                onClick={handleSelectAll}
                disabled={isActive}
                className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-md transition-colors disabled:opacity-50"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span>전체선택</span>
              </button>
            )}
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCwIcon className="w-6 h-6 text-blue-500 animate-spin mr-2" />
              <span className="text-gray-500">업비트에서 코인 데이터를 불러오는 중...</span>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              <AlertCircleIcon className="w-12 h-12 mx-auto mb-4" />
              <p className="text-lg font-medium">데이터 로드 실패</p>
              <p className="mt-2">{error}</p>
              <button
                onClick={() => initializeData(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                다시 시도
              </button>
            </div>
          ) : displayCoins.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? (
                <div>
                  <SearchIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">검색 결과가 없습니다</p>
                  <p className="mt-2">"<strong>{searchTerm}</strong>"에 해당하는 코인을 찾을 수 없습니다</p>
                </div>
              ) : tradingMode === "favorites" ? (
                <div>
                  <HeartIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">관심 코인이 없습니다</p>
                  <p className="mt-2">하단에서 코인을 검색하여 관심 목록에 추가하세요</p>
                  {/* 🎯 관심코인 복구 버튼 추가 */}
                  {storeSelectedCoins.length > 0 && (
                    <button
                      onClick={() => {
                        const converted = storeSelectedCoins.map(coin => ({
                          symbol: coin.symbol,
                          korean_name: coin.korean_name,
                          english_name: coin.english_name,
                          market: coin.market,
                          current_price: coin.current_price,
                          change_rate: coin.change_rate
                        }));
                        onFavoriteCoinsChange?.(converted);
                      }}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      저장된 관심코인 {storeSelectedCoins.length}개 복구하기
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <CoinsIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">코인 데이터를 불러올 수 없습니다</p>
                  <p className="mt-2">새로고침 버튼을 클릭해주세요</p>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {displayCoins.map((coin, index) => (
                <div key={coin.symbol || coin.market || index} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">

                        {/* 순위 (상위 코인 모드일 때) */}
                        {tradingMode === "top" && (
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 text-sm font-bold rounded-full flex items-center justify-center">
                            {index + 1}
                          </div>
                        )}

                        {/* 코인 정보 */}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-900">{coin.symbol}</span>
                            <span className="text-sm text-gray-500">{coin.korean_name}</span>

                            {/* 관심 코인 하트 */}
                            <button
                              onClick={() => handleFavoriteToggle(coin)}
                              className={`p-1 rounded transition-colors ${coin.isFavorite
                                ? "text-red-500 hover:text-red-600"
                                : "text-gray-300 hover:text-red-500"
                                }`}
                            >
                              <HeartIcon className={`w-4 h-4 ${coin.isFavorite ? 'fill-current' : ''}`} />
                            </button>
                          </div>

                          {/* 가격 및 변동률 */}
                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-sm font-medium">
                              ₩{coin.current_price?.toLocaleString() || '0'}
                            </span>
                            {coin.change_rate !== undefined && (
                              <span className={`text-xs px-2 py-1 rounded-full ${coin.change_rate >= 0
                                ? "bg-red-100 text-red-600"
                                : "bg-blue-100 text-blue-600"
                                }`}>
                                {coin.change_rate >= 0 ? '+' : ''}{coin.change_rate.toFixed(2)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 선택 버튼 */}
                    <button
                      onClick={() => handleCoinToggle(coin)}
                      disabled={isActive}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${coin.isSelected
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        } ${isActive ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {coin.isSelected ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4" />
                          <span>선택됨</span>
                        </>
                      ) : (
                        <>
                          <PlusIcon className="w-4 h-4" />
                          <span>선택</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 선택된 코인 요약 */}
      {selectedCoins.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircleIcon className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                선택된 코인: {selectedCoins.join(", ")}
              </span>
            </div>
            <span className="text-sm text-blue-700">
              총 {selectedCoins.length}개 코인이 거래 대상으로 설정됩니다
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoinsTab;
