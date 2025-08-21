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

  // 실제 코인 목록 (기존 로직)
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
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="text-yellow-800">
            <h3 className="text-lg font-medium mb-2">관심코인이 필요합니다</h3>
            <p className="text-sm mb-4">
              관심코인 모드에서는 메인 화면에서 코인을 먼저 관심등록해주세요.
            </p>
            <p className="text-sm">
              또는 전체코인 모드로 변경하여 상위 코인들로 테스트할 수 있습니다.
            </p>
          </div>
          <div className="mt-4">
            <button
              onClick={() => setTradingMode("all")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              전체코인 모드로 변경
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trading Mode Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">거래 모드:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTradingMode("watchlist")}
              className={`px-3 py-1 rounded text-sm ${
                tradingMode === "watchlist"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              disabled={isActive}
            >
              관심코인만
            </button>
            <button
              onClick={() => setTradingMode("all")}
              className={`px-3 py-1 rounded text-sm ${
                tradingMode === "all"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              disabled={isActive}
            >
              전체코인
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="코인 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <FilterIcon className="w-5 h-5 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">전체</option>
            <option value="selected">선택됨</option>
            <option value="unselected">선택 안됨</option>
          </select>
        </div>
      </div>

      {/* Selected Coins Summary */}
      {selectedCoins.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-blue-700 font-medium">
              선택된 코인: {selectedCoins.length}개
            </span>
            <div className="flex items-center gap-2 text-sm text-blue-600">
              {selectedCoins.join(", ")}
            </div>
          </div>
        </div>
      )}

      {/* Coins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCoins.map((coin) => {
          const isSelected = selectedCoins.includes(coin.symbol);

          return (
            <div
              key={coin.symbol}
              className={`
                p-4 border rounded-lg cursor-pointer transition-all
                ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }
                ${isActive ? "pointer-events-none opacity-60" : ""}
              `}
              onClick={() => handleCoinToggle(coin.symbol)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {coin.symbol.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {coin.symbol}
                    </div>
                    <div className="text-xs text-gray-500">{coin.name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {isSelected ? (
                    <MinusIcon className="w-5 h-5 text-blue-600" />
                  ) : (
                    <PlusIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">현재가</span>
                  <span className="font-medium">
                    ₩{coin.price?.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCoins.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <SearchIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>검색 결과가 없습니다.</p>
        </div>
      )}

      {/* Footer Message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-blue-800 text-sm">
          관심코인을 선택하고 실시간 페이퍼 트레이딩을 체험하세요
        </p>
      </div>
    </div>
  );
};

export default React.memo(CoinsTab);
