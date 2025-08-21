// src/components/features/testing/components/TradesTab.jsx
import React from "react";
import { formatCurrency, formatPercent } from "../../../../utils/formatters";
import { ActivityIcon } from "lucide-react";

const TradesTab = ({ trades }) => {
  return (
    <div className="space-y-6">
      {/* Trades Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">거래 내역</h3>
        </div>

        {trades && trades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">
                    시간
                  </th>
                  <th className="text-left py-3 px-6 font-medium text-gray-700">
                    종목
                  </th>
                  <th className="text-center py-3 px-6 font-medium text-gray-700">
                    구분
                  </th>
                  <th className="text-right py-3 px-6 font-medium text-gray-700">
                    가격
                  </th>
                  <th className="text-right py-3 px-6 font-medium text-gray-700">
                    수량
                  </th>
                  <th className="text-right py-3 px-6 font-medium text-gray-700">
                    금액
                  </th>
                  <th className="text-right py-3 px-6 font-medium text-gray-700">
                    수익률
                  </th>
                </tr>
              </thead>
              <tbody>
                {trades.map((trade, index) => (
                  <tr
                    key={trade.id || index}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {trade.timestamp?.toLocaleTimeString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                          <span className="text-orange-600 text-xs font-bold">
                            {trade.symbol?.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium">{trade.symbol}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          trade.action === "BUY"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {trade.action}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {formatCurrency(trade.price)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {trade.quantity?.toFixed(8)}
                    </td>
                    <td className="py-4 px-6 text-right font-medium">
                      {formatCurrency(trade.amount)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {trade.profitRate ? (
                        <span
                          className={`font-medium ${
                            trade.profitRate >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
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
          <div className="text-center py-12 text-gray-500">
            <ActivityIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>거래 내역이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(TradesTab);
