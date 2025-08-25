// src/features/trading/components/CoinsTab.jsx - 수정 버전
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  SearchIcon, RefreshCwIcon, TrendingUpIcon, TrendingDownIcon,
  EyeOffIcon, XIcon, PlusIcon, AlertCircleIcon
} from "lucide-react";
import { useCoinStore } from "../../../stores/coinStore";
import CoinSelectorModal from "../../../components/coins/CoinSelectorModal";

const CoinsTab = ({
  onRefresh = () => { },
  isActive = false
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [showAddModal, setShowAddModal] = useState(false); // ✅ 모달 상태 추가

  // ✅ 코인스토어에서 실제 데이터 가져오기
  const {
    selectedCoins = [],
    removeCoin,
    isLoading,
    refreshData,
    initializeData
  } = useCoinStore();

  // ✅ 필터링된 선택 코인 목록
  const filteredSelectedCoins = useMemo(() => {
    if (!Array.isArray(selectedCoins)) return [];

    let filtered = [...selectedCoins];

    // 검색 필터
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(coin => {
        const symbol = (coin.symbol || "").toLowerCase();
        const name = (coin.korean_name || coin.name || "").toLowerCase();
        return symbol.includes(searchLower) || name.includes(searchLower);
      });
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return (a.symbol || "").localeCompare(b.symbol || "");
        case "change":
          return (b.change_rate || 0) - (a.change_rate || 0);
        case "price":
          return (b.current_price || 0) - (a.current_price || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [selectedCoins, searchTerm, sortBy]);

  // ✅ 통계 계산
  const stats = useMemo(() => {
    const totalCoins = selectedCoins.length;
    const avgChange = totalCoins > 0
      ? selectedCoins.reduce((sum, coin) => sum + (coin.change_rate || 0), 0) / totalCoins
      : 0;

    const positiveCoins = selectedCoins.filter(coin => (coin.change_rate || 0) > 0).length;
    const negativeCoins = selectedCoins.filter(coin => (coin.change_rate || 0) < 0).length;

    return {
      totalCoins,
      positiveCoins,
      negativeCoins,
      avgChange
    };
  }, [selectedCoins]);

  // ✅ 포맷터들
  const formatPrice = useCallback((price) => {
    if (!price || typeof price !== 'number') return '₩0';
    if (price >= 1000000) return `₩${(price / 1000000).toFixed(2)}M`;
    if (price >= 1000) return `₩${(price / 1000).toFixed(0)}K`;
    if (price < 1) return `₩${price.toFixed(4)}`;
    return `₩${price.toLocaleString()}`;
  }, []);

  const formatPercentage = useCallback((value) => {
    if (typeof value !== 'number') return '+0.00%';
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  }, []);

  // ✅ 코인 제거 핸들러  
  const handleRemoveCoin = useCallback((market) => {
    if (!removeCoin) return;

    const result = removeCoin(market);
    if (result?.success) {
      console.log(`✅ ${market} 코인 제거됨`);
    } else {
      alert(result?.message || '코인 제거 실패');
    }
  }, [removeCoin]);

  // ✅ 새로고침 핸들러
  const handleRefresh = useCallback(() => {
    if (refreshData) {
      refreshData();
    } else if (initializeData) {
      initializeData(true);
    }
    if (onRefresh) {
      onRefresh();
    }
  }, [refreshData, initializeData, onRefresh]);

  // ✅ 검색 초기화
  const clearSearch = useCallback(() => {
    setSearchTerm("");
  }, []);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            선택된 코인 관리
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            거래할 코인을 관리하고 모니터링하세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAddModal(true)} // ✅ 모달 열기
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            코인 추가
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCwIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCoins}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">총 코인</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-green-600">{stats.positiveCoins}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">상승</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-red-600">{stats.negativeCoins}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">하락</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className={`text-2xl font-bold ${stats.avgChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(stats.avgChange)}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">평균 변동</div>
        </div>
      </div>

      {/* 검색 및 정렬 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 검색 */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="코인 검색..."
              className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <XIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* 정렬 */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="name">이름순</option>
            <option value="change">변동률순</option>
            <option value="price">가격순</option>
          </select>

          {/* 상태 표시 */}
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' :
                selectedCoins.length > 0 ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
            <span>
              {isLoading ? '업데이트 중...' :
                selectedCoins.length > 0 ? `${selectedCoins.length}개 코인` : '코인 없음'}
            </span>
          </div>
        </div>
      </div>

      {/* 코인 목록 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {filteredSelectedCoins.length === 0 ? (
          <div className="text-center py-12">
            {selectedCoins.length === 0 ? (
              <div className="flex flex-col items-center">
                <AlertCircleIcon className="h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  선택된 코인이 없습니다
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  코인을 추가해서 거래를 시작하세요
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  첫 코인 추가하기
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <SearchIcon className="h-12 w-12 text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  검색 결과가 없습니다
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  다른 검색어를 시도해보세요
                </p>
                <button
                  onClick={clearSearch}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  검색 초기화
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    코인
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    가격
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    변동률 (24h)
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    액션
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredSelectedCoins.map((coin) => (
                  <tr key={coin.market} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {coin.symbol?.slice(0, 2) || 'N/A'}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {coin.korean_name || coin.symbol}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {coin.symbol}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                      {formatPrice(coin.current_price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={`inline-flex items-center font-medium ${(coin.change_rate || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                        {(coin.change_rate || 0) >= 0 ? (
                          <TrendingUpIcon className="h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDownIcon className="h-4 w-4 mr-1" />
                        )}
                        {formatPercentage(coin.change_rate)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleRemoveCoin(coin.market)}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300"
                      >
                        <EyeOffIcon className="h-4 w-4 mr-1" />
                        제거
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ✅ 코인 선택 모달 */}
      <CoinSelectorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)} // ✅ 모달 닫기만 처리
        excludeMarkets={selectedCoins.map(coin => coin.market)}
        title="거래 코인 추가"
      />
    </div>
  );
};

export default React.memo(CoinsTab);
