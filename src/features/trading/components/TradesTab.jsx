// src/components/features/testing/components/TradesTab.jsx - 완전 수정
import React, { useEffect } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { ActivityIcon, TrendingUpIcon, TrendingDownIcon } from "lucide-react";

const TradesTab = ({ trades }) => {
  // ✅ 완전히 수정된 디버깅 로그
  useEffect(() => {
    console.log("🔍 TradesTab 데이터 확인:", {
      trades: trades ? "exists" : "null",
      tradesType: typeof trades,
      isArray: Array.isArray(trades),
      tradesLength: trades?.length || 0,
      firstTrade: trades?.[0],
      sampleTrade: trades?.[0] ? {
        symbol: trades.symbol,
        action: trades.action,
        timestamp: trades.timestamp,
        hasTimestamp: !!trades.timestamp,
      } : null,
    });
  }, [trades]);

  // ✅ 안전한 거래 내역 처리
  const safeTrades = Array.isArray(trades) ? trades : [];
  const recentTrades = safeTrades.slice(0, 50);

  return (
    <div className="space-y-6">
      {/* 거래 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <ActivityIcon className="h-6 w-6 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">총 거래</p>
              <p className="text-xl font-bold text-gray-900">{safeTrades.length}회</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingUpIcon className="h-6 w-6 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">매수</p>
              <p className="text-xl font-bold text-green-600">
                {safeTrades.filter(t => t.action === 'BUY').length}회
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <TrendingDownIcon className="h-6 w-6 text-red-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">매도</p>
              <p className="text-xl font-bold text-red-600">
                {safeTrades.filter(t => t.action === 'SELL').length}회
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center">
            <ActivityIcon className="h-6 w-6 text-purple-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">오늘</p>
              <p className="text-xl font-bold text-purple-600">
                {safeTrades.filter(t => {
                  if (!t.timestamp) return false;
                  const today = new Date().toDateString();
                  const tradeDate = new Date(t.timestamp).toDateString();
                  return today === tradeDate;
                }).length}회
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 거래 내역 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <ActivityIcon className="h-6 w-6 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">거래 내역</h3>
            {safeTrades.length > 50 && (
              <span className="ml-2 text-sm text-gray-500">(최근 50개)</span>
            )}
          </div>
        </div>

        {recentTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">시간</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">종목</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">구분</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">가격</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수량</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">금액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수익률</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTrades.map((trade, index) => (
                  <tr key={trade.id || `${trade.symbol}_${index}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trade.timestamp?.toLocaleTimeString ?
                        trade.timestamp.toLocaleTimeString() :
                        new Date(trade.timestamp).toLocaleTimeString()
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {trade.symbol?.toUpperCase() || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${trade.action === 'BUY'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                        }`}>
                        {trade.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(trade.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trade.quantity?.toFixed(8)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(trade.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
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
        ) : (
          <div className="px-6 py-12 text-center">
            <ActivityIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">거래 내역이 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">거래가 실행되면 여기에 표시됩니다</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradesTab;
