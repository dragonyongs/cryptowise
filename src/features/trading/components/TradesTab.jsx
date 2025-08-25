// src/features/trading/components/TradesTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import {
  ActivityIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  FilterIcon,
  RefreshCwIcon,
  DownloadIcon,
  CalendarIcon
} from "lucide-react";

const TradesTab = ({ trades = [] }) => {
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");

  useEffect(() => {
    console.log("🔍 TradesTab 데이터 확인:", {
      trades: trades ? "exists" : "null",
      tradesType: typeof trades,
      isArray: Array.isArray(trades),
      tradesLength: trades?.length || 0,
      firstTrade: trades?.[0],
    });
  }, [trades]);

  // ✅ 안전한 거래 내역 처리
  const safeTrades = Array.isArray(trades) ? trades : [];

  // 🎯 필터링된 거래내역
  const filteredTrades = useMemo(() => {
    let filtered = safeTrades;

    // 거래 타입 필터
    if (filter !== "all") {
      filtered = filtered.filter(trade => trade.action?.toUpperCase() === filter.toUpperCase());
    }

    // 날짜 필터
    if (dateFilter !== "all") {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(trade => {
        if (!trade.timestamp) return false;
        const tradeDate = new Date(trade.timestamp);

        switch (dateFilter) {
          case "today":
            return tradeDate >= today;
          case "week":
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            return tradeDate >= weekAgo;
          case "month":
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            return tradeDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.timestamp || 0);
      const dateB = new Date(b.timestamp || 0);
      return dateB - dateA; // 최신순 정렬
    });
  }, [safeTrades, filter, dateFilter]);

  // 🎯 통계 계산
  const stats = useMemo(() => {
    const totalTrades = safeTrades.length;
    const buyTrades = safeTrades.filter(t => t.action === 'BUY').length;
    const sellTrades = safeTrades.filter(t => t.action === 'SELL').length;

    const todayTrades = safeTrades.filter(t => {
      if (!t.timestamp) return false;
      const today = new Date().toDateString();
      const tradeDate = new Date(t.timestamp).toDateString();
      return today === tradeDate;
    }).length;

    const profitableTrades = safeTrades.filter(t => (t.profitRate || 0) > 0).length;
    const totalVolume = safeTrades.reduce((sum, t) => sum + (t.amount || 0), 0);
    const avgProfit = totalTrades > 0
      ? safeTrades.reduce((sum, t) => sum + (t.profitRate || 0), 0) / totalTrades
      : 0;

    return {
      totalTrades,
      buyTrades,
      sellTrades,
      todayTrades,
      profitableTrades,
      totalVolume,
      avgProfit,
      winRate: totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0
    };
  }, [safeTrades]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">거래 내역</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            실행된 거래 기록과 수익률을 확인하세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
            <DownloadIcon className="h-4 w-4" />
            <span>내보내기</span>
          </button>
          <button className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            <RefreshCwIcon className="h-4 w-4" />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <ActivityIcon className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-gray-600 dark:text-gray-300">총 거래</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {stats.totalTrades}회
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUpIcon className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-600 dark:text-green-400">매수</span>
          </div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            {stats.buyTrades}회
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDownIcon className="h-4 w-4 text-red-600" />
            <span className="text-xs text-red-600 dark:text-red-400">매도</span>
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">
            {stats.sellTrades}회
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <CalendarIcon className="h-4 w-4 text-purple-600" />
            <span className="text-xs text-purple-600 dark:text-purple-400">오늘</span>
          </div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {stats.todayTrades}회
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs text-gray-600 dark:text-gray-300">승률</span>
          </div>
          <div className={`text-xl font-bold ${stats.winRate >= 50 ? 'text-green-600' : 'text-red-600'}`}>
            {stats.winRate.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs text-gray-600 dark:text-gray-300">총 거래량</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(stats.totalVolume)}
          </div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FilterIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">필터:</span>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">전체</option>
            <option value="BUY">매수만</option>
            <option value="SELL">매도만</option>
          </select>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">전체 기간</option>
            <option value="today">오늘</option>
            <option value="week">1주일</option>
            <option value="month">1개월</option>
          </select>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {filteredTrades.length}개의 거래 표시 중
        </div>
      </div>

      {/* 거래 내역 테이블 */}
      <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  시간
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  종목
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  구분
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  가격
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  수량
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  금액
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  수익률
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {filteredTrades.map((trade) => (
                <tr key={trade.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {trade.timestamp?.toLocaleTimeString
                      ? trade.timestamp.toLocaleTimeString()
                      : new Date(trade.timestamp).toLocaleTimeString()
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-300">
                          {(trade.symbol?.charAt(0) || 'N').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {trade.symbol?.toUpperCase() || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${trade.action === 'BUY'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                      {trade.action === 'BUY' ? '매수' : '매도'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {formatCurrency(trade.price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {trade.quantity?.toFixed(8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(trade.amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    {trade.profitRate ? (
                      <span className={`font-medium ${trade.profitRate >= 0 ? "text-green-600" : "text-red-600"
                        }`}>
                        {formatPercent(trade.profitRate)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTrades.length === 0 && (
          <div className="text-center py-12">
            <ActivityIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              거래 내역이 없습니다
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              거래가 실행되면 여기에 표시됩니다
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(TradesTab);
