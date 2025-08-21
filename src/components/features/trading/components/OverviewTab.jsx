// src/components/features/testing/components/OverviewTab.jsx
import React from "react";
import { formatCurrency, formatPercent } from "../../../../utils/formatters";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  PieChartIcon,
  ActivityIcon,
  WifiIcon,
  WifiOffIcon,
  ShieldCheckIcon,
} from "lucide-react";

const OverviewTab = ({
  portfolio,
  isActive,
  connectionStatus,
  performance,
  lastSignal,
}) => {
  return (
    <div className="space-y-6">
      {/* 상단 안내 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-2">
          <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">
            가상 투자로 전략을 테스트해보세요
          </h3>
        </div>
        <p className="text-blue-700">(초기자본: ₩1,840,000)</p>
      </div>

      {/* 주요 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">현재 잔고</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(portfolio?.krw || 0)}
              </p>
            </div>
            <DollarSignIcon className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">총 자산</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(portfolio?.totalValue || 0)}
              </p>
            </div>
            <PieChartIcon className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">총 수익률</p>
              <p
                className={`text-2xl font-bold ${
                  (portfolio?.performance?.totalReturn || 0) >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {formatPercent(portfolio?.performance?.totalReturn || 0)}
              </p>
            </div>
            {(portfolio?.performance?.totalReturn || 0) >= 0 ? (
              <TrendingUpIcon className="h-8 w-8 text-green-600" />
            ) : (
              <TrendingDownIcon className="h-8 w-8 text-red-600" />
            )}
          </div>
        </div>
      </div>

      {/* 포트폴리오 상세 */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <PieChartIcon className="h-5 w-5 mr-2" />
          포트폴리오 현황
        </h3>

        {portfolio?.coins && Object.keys(portfolio.coins).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">종목</th>
                  <th className="text-right py-2">수량</th>
                  <th className="text-right py-2">평균단가</th>
                  <th className="text-right py-2">현재가치</th>
                  <th className="text-right py-2">수익률</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(portfolio.coins).map(([symbol, coin]) => (
                  <tr key={symbol} className="border-b">
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <span className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {symbol.charAt(0)}
                        </span>
                        <span className="font-medium">{symbol}</span>
                      </div>
                    </td>
                    <td className="text-right py-3">
                      {coin.quantity?.toFixed(8)}
                    </td>
                    <td className="text-right py-3">
                      {formatCurrency(coin.avgPrice)}
                    </td>
                    <td className="text-right py-3">
                      {formatCurrency(coin.currentValue || 0)}
                    </td>
                    <td
                      className={`text-right py-3 ${
                        (coin.profitRate || 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatPercent(coin.profitRate || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <PieChartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              보유 중인 코인이 없습니다
            </p>
            <p className="text-gray-400 text-sm mt-2">
              거래를 시작하면 포트폴리오가 표시됩니다
            </p>
          </div>
        )}
      </div>

      {/* 최근 신호 */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <ActivityIcon className="h-5 w-5 mr-2" />
          최근 신호
        </h3>

        {lastSignal ? (
          <div
            className={`p-4 rounded-lg ${
              lastSignal.type === "BUY"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {lastSignal.symbol} {lastSignal.type}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {lastSignal.reason}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium">
                  {formatCurrency(lastSignal.price)}
                </p>
                <p className="text-sm text-gray-600">
                  {new Date(lastSignal.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <ActivityIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-500">신호를 기다리는 중...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewTab;
