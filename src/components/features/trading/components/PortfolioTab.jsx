// src/components/features/testing/components/PortfolioTab.jsx
import React, { useMemo } from "react";
import { formatCurrency, formatPercent } from "../../../../utils/formatters";
import {
  PieChartIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  CoinsIcon,
} from "lucide-react";

const PortfolioTab = ({ portfolio, totalValue }) => {
  const portfolioData = useMemo(() => {
    const coins = Object.entries(portfolio.coins).map(([symbol, coin]) => {
      const value = coin.quantity * coin.currentPrice;
      const percentage = (value / totalValue) * 100;
      const profit = (coin.currentPrice - coin.avgPrice) * coin.quantity;
      const profitPercent =
        ((coin.currentPrice - coin.avgPrice) / coin.avgPrice) * 100;

      return {
        symbol,
        quantity: coin.quantity,
        avgPrice: coin.avgPrice,
        currentPrice: coin.currentPrice,
        value,
        percentage,
        profit,
        profitPercent,
      };
    });

    const cashData = {
      symbol: "KRW",
      value: portfolio.krw,
      percentage: (portfolio.krw / totalValue) * 100,
    };

    return { coins, cash: cashData };
  }, [portfolio, totalValue]);

  const totalProfit = portfolioData.coins.reduce(
    (sum, coin) => sum + coin.profit,
    0
  );
  const totalProfitPercent = ((totalValue - 1840000) / 1840000) * 100;

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSignIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">총 자산</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totalValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div
              className={`p-3 rounded-lg ${
                totalProfit >= 0 ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {totalProfit >= 0 ? (
                <TrendingUpIcon className="w-6 h-6 text-green-600" />
              ) : (
                <TrendingDownIcon className="w-6 h-6 text-red-600" />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-600">총 수익/손실</p>
              <p
                className={`text-2xl font-bold ${
                  totalProfit >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(totalProfit)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <CoinsIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">보유 종목</p>
              <p className="text-2xl font-bold text-gray-900">
                {portfolioData.coins.length}개
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <PieChartIcon className="w-5 h-5" />
          포트폴리오 상세
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">
                  자산
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">
                  보유량
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">
                  평균단가
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">
                  현재가
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">
                  평가금액
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">
                  수익률
                </th>
                <th className="text-right py-3 px-4 font-medium text-gray-700">
                  비중
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Cash Row */}
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <DollarSignIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium">현금</div>
                      <div className="text-sm text-gray-500">KRW</div>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 text-right">-</td>
                <td className="py-4 px-4 text-right">-</td>
                <td className="py-4 px-4 text-right">-</td>
                <td className="py-4 px-4 text-right font-medium">
                  {formatCurrency(portfolioData.cash.value)}
                </td>
                <td className="py-4 px-4 text-right">-</td>
                <td className="py-4 px-4 text-right">
                  {portfolioData.cash.percentage.toFixed(1)}%
                </td>
              </tr>

              {/* Coin Rows */}
              {portfolioData.coins.map((coin) => (
                <tr
                  key={coin.symbol}
                  className="border-b border-gray-100 hover:bg-gray-50"
                >
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 text-xs font-bold">
                          {coin.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium">{coin.symbol}</div>
                        <div className="text-sm text-gray-500">
                          Cryptocurrency
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">{coin.quantity}</td>
                  <td className="py-4 px-4 text-right">
                    {formatCurrency(coin.avgPrice)}
                  </td>
                  <td className="py-4 px-4 text-right">
                    {formatCurrency(coin.currentPrice)}
                  </td>
                  <td className="py-4 px-4 text-right font-medium">
                    {formatCurrency(coin.value)}
                  </td>
                  <td
                    className={`py-4 px-4 text-right font-medium ${
                      coin.profit >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    <div>{formatPercent(coin.profitPercent)}</div>
                    <div className="text-sm">
                      ({coin.profit >= 0 ? "+" : ""}
                      {formatCurrency(coin.profit)})
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    {coin.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}

              {portfolioData.coins.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    <CoinsIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>보유 중인 코인이 없습니다</p>
                    <p className="text-sm">
                      거래를 시작하면 포트폴리오가 표시됩니다
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio Allocation Chart Placeholder */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">자산 배분</h3>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">
          <div className="text-center">
            <PieChartIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>차트 구현 예정</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PortfolioTab);
