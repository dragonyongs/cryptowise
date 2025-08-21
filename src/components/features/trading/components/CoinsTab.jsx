// src/components/features/testing/components/CoinsTab.jsx - 에러 수정 버전

import React, { useState, useMemo } from "react";
import { SearchIcon, PlusIcon, MinusIcon, FilterIcon, StarIcon, TrendingUpIcon } from "lucide-react";

const CoinsTab = ({
  selectedCoins,
  onCoinsChange,
  watchlistCoins,
  tradingMode,
  setTradingMode,
  isActive,
}) => {
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // ✅ **안전한 코인 데이터 처리**
  const availableCoins = useMemo(() => {
    if (tradingMode === "watchlist") {
      // watchlistCoins에서 안전하게 데이터 추출
      return (watchlistCoins || []).map(coin => ({
        symbol: coin.symbol || coin.market?.replace('KRW-', '') || 'UNKNOWN',
        name: coin.name || coin.korean_name || coin.symbol || 'Unknown',
        price: coin.price || coin.currentPrice || 0, // ✅ 기본값 0
        market: coin.market || `KRW-${coin.symbol}`,
        isSelected: selectedCoins.includes(coin.symbol || coin.market?.replace('KRW-', ''))
      }));
    }

    // 상위 코인들 (기본 데이터)
    return [
      { symbol: "BTC", name: "Bitcoin", price: 45000000, market: "KRW-BTC" },
      { symbol: "ETH", name: "Ethereum", price: 3200000, market: "KRW-ETH" },
      { symbol: "XRP", name: "Ripple", price: 650, market: "KRW-XRP" },
      { symbol: "ADA", name: "Cardano", price: 520, market: "KRW-ADA" },
      { symbol: "SOL", name: "Solana", price: 95000, market: "KRW-SOL" },
      { symbol: "DOT", name: "Polkadot", price: 8500, market: "KRW-DOT" },
      { symbol: "LINK", name: "Chainlink", price: 18000, market: "KRW-LINK" },
      { symbol: "MATIC", name: "Polygon", price: 1200, market: "KRW-MATIC" },
    ].map(coin => ({
      ...coin,
      isSelected: selectedCoins.includes(coin.symbol)
    }));
  }, [tradingMode, watchlistCoins, selectedCoins]);

  const filteredCoins = useMemo(() => {
    let coins = availableCoins;

    if (searchTerm) {
      coins = coins.filter(
        (coin) =>
          coin.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          coin.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter === "selected") {
      coins = coins.filter((coin) => coin.isSelected);
    } else if (filter === "unselected") {
      coins = coins.filter((coin) => !coin.isSelected);
    }

    return coins;
  }, [availableCoins, searchTerm, filter]);

  const handleCoinToggle = (symbol) => {
    if (isActive) {
      alert("거래 중에는 코인 선택을 변경할 수 없습니다.");
      return;
    }

    if (selectedCoins.includes(symbol)) {
      onCoinsChange(selectedCoins.filter((s) => s !== symbol));
    } else {
      onCoinsChange([...selectedCoins, symbol]);
    }
  };

  // 관심코인 모드인데 코인이 없는 경우
  if (tradingMode === "watchlist" && (!watchlistCoins || watchlistCoins.length === 0)) {
    return (
      <div className="empty-state text-center py-12">
        <StarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">관심코인이 없습니다</h3>
        <p className="text-gray-500 mb-6">
          관심코인 모드에서는 메인 화면에서 코인을 먼저 관심등록해주세요.
        </p>
        <button
          onClick={() => setTradingMode("top")}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
        >
          상위코인 모드로 전환
        </button>
      </div>
    );
  }

  return (
    <div className="coins-tab space-y-6">
      {/* 🎮 **모드 선택 및 필터** */}
      <div className="controls-section bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* 모드 선택 */}
          <div className="mode-selector">
            <label className="text-sm font-medium text-gray-700 mb-2 block">거래 모드</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setTradingMode("watchlist")}
                disabled={isActive}
                className={`px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${tradingMode === "watchlist"
                    ? "bg-purple-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <StarIcon className="w-4 h-4 inline mr-2" />
                관심코인
              </button>
              <button
                onClick={() => setTradingMode("top")}
                disabled={isActive}
                className={`px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${tradingMode === "top"
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                <TrendingUpIcon className="w-4 h-4 inline mr-2" />
                상위코인
              </button>
            </div>
          </div>

          {/* 검색 및 필터 */}
          <div className="search-filter flex items-center space-x-3">
            <div className="search-box relative">
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="코인 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">전체</option>
              <option value="selected">선택됨</option>
              <option value="unselected">미선택</option>
            </select>
          </div>
        </div>
      </div>

      {/* 📊 **선택된 코인 요약** */}
      <div className="summary-section bg-blue-50 border border-blue-200 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-blue-800 font-semibold">선택된 코인: </span>
            <span className="text-blue-600 text-lg font-bold">{selectedCoins.length}개</span>
          </div>
          <div className="text-sm text-blue-600">
            {tradingMode === "watchlist" ? "관심코인 모드" : "상위코인 모드"}
          </div>
        </div>
      </div>

      {/* 🪙 **코인 목록** */}
      <div className="coins-list bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="list-header bg-gray-50 px-6 py-3 border-b">
          <h3 className="font-semibold text-gray-800">
            사용 가능한 코인 ({filteredCoins.length}개)
          </h3>
        </div>

        <div className="coins-container max-h-96 overflow-y-auto">
          {filteredCoins.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <SearchIcon className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p>검색 결과가 없습니다.</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="text-blue-500 hover:text-blue-700 mt-2"
                >
                  검색 초기화
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredCoins.map((coin) => (
                <li
                  key={coin.symbol}
                  className={`coin-item px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${isActive ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  onClick={() => !isActive && handleCoinToggle(coin.symbol)}
                >
                  <div className="flex items-center justify-between">
                    {/* 코인 정보 */}
                    <div className="coin-info flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${coin.isSelected ? "bg-green-500" : "bg-gray-300"
                        }`}></div>

                      <div>
                        <div className="font-bold text-lg text-gray-900">
                          {coin.symbol}
                        </div>
                        <div className="text-sm text-gray-500 truncate max-w-48">
                          {coin.name}
                        </div>
                      </div>
                    </div>

                    {/* 가격 및 액션 */}
                    <div className="flex items-center space-x-4">
                      <div className="price-info text-right">
                        <div className="text-lg font-semibold text-gray-900 font-mono">
                          {/* ✅ 안전한 가격 표시 */}
                          ₩{(coin.price ?? 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {coin.market || `KRW-${coin.symbol}`}
                        </div>
                      </div>

                      <div className="action-button">
                        {coin.isSelected ? (
                          <div className="flex items-center text-red-500">
                            <MinusIcon className="w-5 h-5 mr-1" />
                            <span className="text-sm font-medium">제거</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-green-500">
                            <PlusIcon className="w-5 h-5 mr-1" />
                            <span className="text-sm font-medium">추가</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 💡 **안내 메시지** */}
      <div className="guide-section bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="text-yellow-600 mt-0.5">💡</div>
          <div className="text-yellow-800">
            <p className="font-medium">코인 선택 가이드</p>
            <ul className="text-sm mt-2 space-y-1">
              <li>• 관심코인을 선택하고 실시간 페이퍼 트레이딩을 체험하세요</li>
              <li>• 거래 중에는 코인 선택을 변경할 수 없습니다</li>
              <li>• 최대 10개까지 선택 가능합니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoinsTab;
