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

const OverviewTab = ({ portfolio, totalValue, isActive, connectionStatus }) => {
  const returnRate = ((totalValue - 1840000) / 1840000) * 100;
  const totalReturn = totalValue - 1840000;

  const stats = [
    {
      label: "총 포트폴리오 가치",
      value: formatCurrency(totalValue),
      icon: DollarSignIcon,
      change: returnRate,
      color: returnRate >= 0 ? "green" : "red",
    },
    {
      label: "현금 잔고",
      value: formatCurrency(portfolio.krw),
      icon: PieChartIcon,
      color: "blue",
    },
    {
      label: "총 수익률",
      value: formatPercent(returnRate),
      icon: returnRate >= 0 ? TrendingUpIcon : TrendingDownIcon,
      change: totalReturn,
      color: returnRate >= 0 ? "green" : "red",
    },
    {
      label: "보유 코인 종류",
      value: `${Object.keys(portfolio.coins).length}개`,
      icon: ActivityIcon,
      color: "purple",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-3">
          {connectionStatus === "connected" ? (
            <WifiIcon className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOffIcon className="w-5 h-5 text-red-600" />
          )}
          <span className="font-medium">
            연결 상태:{" "}
            {connectionStatus === "connected" ? "연결됨" : "연결 안됨"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          <span className="text-sm text-gray-600">
            {isActive ? "거래 활성" : "거래 비활성"}
          </span>
        </div>
      </div>

      {/* Portfolio Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const colorClasses = {
            green: "bg-green-100 text-green-800 border-green-200",
            red: "bg-red-100 text-red-800 border-red-200",
            blue: "bg-blue-100 text-blue-800 border-blue-200",
            purple: "bg-purple-100 text-purple-800 border-purple-200",
          };

          return (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${colorClasses[stat.color]}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>

                {stat.change !== undefined && (
                  <div
                    className={`flex items-center gap-1 text-sm ${
                      stat.change >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {stat.change >= 0 ? (
                      <TrendingUpIcon className="w-4 h-4" />
                    ) : (
                      <TrendingDownIcon className="w-4 h-4" />
                    )}
                    <span>
                      {stat.change >= 0 ? "+" : ""}
                      {formatCurrency(Math.abs(stat.change))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Portfolio Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <PieChartIcon className="w-5 h-5" />
          포트폴리오 구성
        </h3>

        <div className="space-y-4">
          {/* Cash */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSignIcon className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <div className="font-medium">현금 (KRW)</div>
                <div className="text-sm text-gray-500">
                  비율: {((portfolio.krw / totalValue) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">
                {formatCurrency(portfolio.krw)}
              </div>
            </div>
          </div>

          {/* Coins */}
          {Object.entries(portfolio.coins).map(([symbol, coin]) => {
            const coinValue = coin.quantity * coin.currentPrice;
            const percentage = (coinValue / totalValue) * 100;

            return (
              <div
                key={symbol}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-xs font-bold">
                      {symbol.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{symbol}</div>
                    <div className="text-sm text-gray-500">
                      {coin.quantity} 개 • 비율: {percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {formatCurrency(coinValue)}
                  </div>
                  <div className="text-sm text-gray-500">
                    @ {formatCurrency(coin.currentPrice)}
                  </div>
                </div>
              </div>
            );
          })}

          {Object.keys(portfolio.coins).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <ShieldCheckIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>보유 중인 코인이 없습니다</p>
              <p className="text-sm">거래를 시작하면 포트폴리오가 표시됩니다</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions or Tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          💡 페이퍼 트레이딩 팁
        </h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p>• 실제 자금 없이 안전하게 거래 전략을 테스트하세요</p>
          <p>• 다양한 시나리오에서 포트폴리오 성과를 확인하세요</p>
          <p>• 리스크 관리와 수익률 최적화를 연습하세요</p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(OverviewTab);
