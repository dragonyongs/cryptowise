// src/components/features/testing/components/CoinsTab.jsx
import React, { useState, useMemo } from "react";
import { SearchIcon, PlusIcon, MinusIcon, FilterIcon } from "lucide-react";

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

  // 사용 가능한 코인 목록
  const availableCoins = useMemo(() => {
    if (tradingMode === "watchlist") {
      return watchlistCoins || [];
    }

    // 상위 코인들 (실제 API에서 가져온 데이터)
    return [
      { symbol: "BTC", name: "Bitcoin", price: 45000000 },
      { symbol: "ETH", name: "Ethereum", price: 3200000 },
      { symbol: "XRP", name: "Ripple", price: 650 },
      { symbol: "ADA", name: "Cardano", price: 520 },
      { symbol: "SOL", name: "Solana", price: 95000 },
      { symbol: "DOT", name: "Polkadot", price: 8500 },
      { symbol: "LINK", name: "Chainlink", price: 18000 },
      { symbol: "MATIC", name: "Polygon", price: 1200 },
    ];
  }, [tradingMode, watchlistCoins]);

  const filteredCoins = useMemo(() => {
    let coins = availableCoins;

    if (searchTerm) {
      coins = coins.filter(
        (coin) =>
          coin.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
          coin.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter === "selected") {
      coins = coins.filter((coin) => selectedCoins.includes(coin.symbol));
    } else if (filter === "unselected") {
      coins = coins.filter((coin) => !selectedCoins.includes(coin.symbol));
    }

    return coins;
  }, [availableCoins, searchTerm, filter, selectedCoins]);

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

  if (
    tradingMode === "watchlist" &&
    (!watchlistCoins || watchlistCoins.length === 0)
  ) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-4">
          <p className="text-lg font-medium">관심코인이 없습니다</p>
          <p>관심코인 모드에서는 메인 화면에서 코인을 먼저 관심등록해주세요.</p>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setTradingMode("all")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            전체코인 모드로 변경
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 모드 선택 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTradingMode("all")}
              className={`px-4 py-2 rounded-md transition-colors ${
                tradingMode === "all"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              전체 코인
            </button>
            <button
              onClick={() => setTradingMode("watchlist")}
              className={`px-4 py-2 rounded-md transition-colors ${
                tradingMode === "watchlist"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              관심 코인
            </button>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          선택된 코인:{" "}
          <span className="font-medium">{selectedCoins.length}개</span>
        </div>
      </div>

      {/* 검색 및 필터 */}
      <div className="flex items-center space-x-4">
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="코인 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center space-x-2">
          <FilterIcon className="h-4 w-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">전체</option>
            <option value="selected">선택됨</option>
            <option value="unselected">선택 안됨</option>
          </select>
        </div>
      </div>

      {/* 코인 리스트 */}
      {filteredCoins.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>검색 결과가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCoins.map((coin) => {
            const isSelected = selectedCoins.includes(coin.symbol);
            return (
              <div
                key={coin.symbol}
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
                onClick={() => handleCoinToggle(coin.symbol)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-lg">{coin.symbol}</span>
                      {isSelected && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">{coin.name}</p>
                    <p className="text-sm font-medium mt-1">
                      ₩{coin.price.toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCoinToggle(coin.symbol);
                    }}
                    className={`p-2 rounded-full transition-colors ${
                      isSelected
                        ? "bg-red-100 text-red-600 hover:bg-red-200"
                        : "bg-green-100 text-green-600 hover:bg-green-200"
                    }`}
                    disabled={isActive}
                  >
                    {isSelected ? (
                      <MinusIcon className="h-4 w-4" />
                    ) : (
                      <PlusIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 text-sm">
          💡 관심코인을 선택하고 실시간 페이퍼 트레이딩을 체험하세요
        </p>
      </div>
    </div>
  );
};

export default CoinsTab;
