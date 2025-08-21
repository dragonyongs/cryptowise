// src/components/features/testing/components/TradesTab.jsx
import React, { useState, useMemo } from "react";
import { formatCurrency, formatPercent } from "../../../../utils/formatters";
import {
  ActivityIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  FilterIcon,
  CalendarIcon,
} from "lucide-react";

const TradesTab = ({ trades }) => {
  const [filter, setFilter] = useState("all");
  const [dateRange, setDateRange] = useState("all");

  const filteredTrades = useMemo(() => {
    let filtered = trades;

    if (filter !== "all") {
      filtered = filtered.filter((trade) => trade.type === filter);
    }

    if (dateRange !== "all") {
      const now = new Date();
      const cutoff = new Date();

      switch (dateRange) {
        case "today":
          cutoff.setHours(0, 0, 0, 0);
          break;
        case "week":
          cutoff.setDate(now.getDate() - 7);
          break;
        case "month":
          cutoff.setMonth(now.getMonth() - 1);
          break;
        default:
          return filtered;
      }

      filtered = filtered.filter(
        (trade) => new Date(trade.timestamp) >= cutoff
      );
    }

    return filtered;
  }, [trades, filter, dateRange]);

  const tradeStats = useMemo(() => {
    const totalTrades = filteredTrades.length;
    const buyTrades = filteredTrades.filter((t) => t.type === "BUY").length;
    const sellTrades = filteredTrades.filter((t) => t.type === "SELL").length;
    const totalVolume = filteredTrades.reduce((sum, t) => sum + t.amount, 0);
    const totalProfit = filteredTrades
      .filter((t) => t.type === "SELL")
      .reduce((sum, t) => sum + (t.profit || 0), 0);

    return {
      totalTrades,
      buyTrades,
      sellTrades,
      totalVolume,
      totalProfit,
    };
  }, [filteredTrades]);

  return (
    <div className="space-y-6">
      {/* Trade Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ActivityIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">총 거래</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {tradeStats.totalTrades}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUpIcon className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">매수</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {tradeStats.buyTrades}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDownIcon className="w-5 h-5 text-red-600" />
            <span className="text-sm text-gray-600">매도</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {tradeStats.sellTrades}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">거래량</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {formatCurrency(tradeStats.totalVolume)}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">수익</span>
          </div>
          <p
            className={`text-xl font-bold ${
              tradeStats.totalProfit >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {formatCurrency(tradeStats.totalProfit)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <FilterIcon className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">모든 거래</option>
              <option value="BUY">매수만</option>
              <option value="SELL">매도만</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">전체 기간</option>
              <option value="today">오늘</option>
              <option value="week">최근 7일</option>
              <option value="month">최근 1개월</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">거래 내역</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-700">
                  시간
                </th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">
                  코인
                </th>
                <th className="text-center py-3 px-6 font-medium text-gray-700">
                  타입
                </th>
                <th className="text-right py-3 px-6 font-medium text-gray-700">
                  수량
                </th>
                <th className="text-right py-3 px-6 font-medium text-gray-700">
                  가격
                </th>
                <th className="text-right py-3 px-6 font-medium text-gray-700">
                  금액
                </th>
                <th className="text-right py-3 px-6 font-medium text-gray-700">
                  수수료
                </th>
                <th className="text-right py-3 px-6 font-medium text-gray-700">
                  수익/손실
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.map((trade, index) => (
                <tr
                  key={trade.id || index}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4 px-6 text-sm text-gray-600">
                    {new Date(trade.timestamp).toLocaleString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 text-xs font-bold">
                          {trade.symbol.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium">{trade.symbol}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        trade.type === "BUY"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {trade.type === "BUY" ? "매수" : "매도"}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">{trade.quantity}</td>
                  <td className="py-4 px-6 text-right">
                    {formatCurrency(trade.price)}
                  </td>
                  <td className="py-4 px-6 text-right font-medium">
                    {formatCurrency(trade.amount)}
                  </td>
                  <td className="py-4 px-6 text-right text-gray-600">
                    {formatCurrency(trade.fee || 0)}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {trade.profit !== undefined ? (
                      <span
                        className={`font-medium ${
                          trade.profit >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {trade.profit >= 0 ? "+" : ""}
                        {formatCurrency(trade.profit)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTrades.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ActivityIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>거래 내역이 없습니다</p>
              <p className="text-sm">거래가 실행되면 여기에 표시됩니다</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TradesTab);
