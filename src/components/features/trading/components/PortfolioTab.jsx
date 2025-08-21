// src/components/features/testing/components/PortfolioTab.jsx - 에러 수정 버전

import React, { useMemo } from "react";
import { formatCurrency, formatPercent } from "../../../../utils/formatters";
import {
  PieChartIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  CoinsIcon
} from "lucide-react";

const PortfolioTab = ({ portfolio, totalValue }) => {
  // 🔒 **핵심 수정: 안전한 데이터 추출**
  const portfolioData = useMemo(() => {
    // ✅ portfolio가 없거나 coins가 없을 때 안전하게 처리
    const safePortfolio = portfolio || {};
    const coinsObj = safePortfolio.coins || {};

    // ✅ Object.entries 호출 전에 타입 검사
    if (typeof coinsObj !== 'object' || coinsObj === null) {
      return {
        coins: [],
        cash: { symbol: "KRW", value: safePortfolio.krw || 1840000, percentage: 100 }
      };
    }

    const coins = Object.entries(coinsObj).map(([symbol, coin]) => {
      // ✅ 각 값에 대해서도 안전하게 처리
      const quantity = coin?.quantity || 0;
      const avgPrice = coin?.avgPrice || 0;
      const currentPrice = coin?.currentPrice || 0;

      const value = quantity * currentPrice;
      const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
      const profit = (currentPrice - avgPrice) * quantity;
      const profitPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;

      return {
        symbol,
        quantity,
        avgPrice,
        currentPrice,
        value: Math.round(value),
        percentage,
        profit: Math.round(profit),
        profitPercent: Number(profitPercent.toFixed(2)),
      };
    });

    const cashValue = safePortfolio.krw || 0;
    const safeTotalValue = totalValue || cashValue + coins.reduce((sum, coin) => sum + coin.value, 0);

    const cashData = {
      symbol: "KRW",
      value: cashValue,
      percentage: safeTotalValue > 0 ? (cashValue / safeTotalValue) * 100 : 100,
    };

    return { coins, cash: cashData };
  }, [portfolio, totalValue]);

  // ✅ 안전하게 계산된 총합
  const totalProfit = portfolioData.coins.reduce((sum, coin) => sum + coin.profit, 0);
  const safeTotalValue = totalValue || (portfolioData.cash.value + portfolioData.coins.reduce((sum, coin) => sum + coin.value, 0));
  const totalProfitPercent = safeTotalValue > 0 ? ((safeTotalValue - 1840000) / 1840000) * 100 : 0;

  return (
    <div className="portfolio-tab space-y-6">
      {/* 📊 **포트폴리오 요약** */}
      <div className="summary-section bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="summary-card text-center">
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(safeTotalValue)}
            </div>
            <div className="text-sm text-gray-600">총 자산</div>
          </div>

          <div className="summary-card text-center">
            <div className={`text-3xl font-bold ${totalProfit >= 0 ? "text-green-600" : "text-red-600"
              }`}>
              {formatCurrency(totalProfit)}
            </div>
            <div className="text-sm text-gray-600">총 수익/손실</div>
          </div>

          <div className="summary-card text-center">
            <div className="text-3xl font-bold text-purple-600">
              {portfolioData.coins.length}개
            </div>
            <div className="text-sm text-gray-600">보유 종목</div>
          </div>
        </div>
      </div>

      {/* 📋 **보유 자산 테이블** */}
      <div className="holdings-section bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="table-header bg-gray-50 px-6 py-3 border-b">
          <h3 className="text-lg font-semibold text-gray-800">보유 자산 현황</h3>
        </div>

        <div className="table-container overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">자산</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">보유량</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균단가</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">현재가</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평가금액</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수익률</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비중</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* 현금 행 */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <DollarSignIcon className="w-5 h-5 text-green-500 mr-3" />
                    <span className="font-semibold">현금 (KRW)</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                  {formatCurrency(portfolioData.cash.value)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {portfolioData.cash.percentage.toFixed(1)}%
                </td>
              </tr>

              {/* 코인 행들 */}
              {portfolioData.coins.map((coin) => (
                <tr key={coin.symbol} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <CoinsIcon className="w-5 h-5 text-orange-500 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {coin.symbol.toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-500">Cryptocurrency</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coin.quantity.toFixed(8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(coin.avgPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(coin.currentPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    {formatCurrency(coin.value)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${coin.profitPercent >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                    <div className="flex items-center">
                      {coin.profitPercent >= 0 ? (
                        <TrendingUpIcon className="w-4 h-4 mr-1" />
                      ) : (
                        <TrendingDownIcon className="w-4 h-4 mr-1" />
                      )}
                      {formatPercent(coin.profitPercent)}
                    </div>
                    <div className="text-xs">
                      ({coin.profit >= 0 ? "+" : ""}{formatCurrency(coin.profit)})
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coin.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 빈 상태 */}
        {portfolioData.coins.length === 0 && (
          <div className="text-center py-12">
            <CoinsIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">보유 중인 코인이 없습니다</h3>
            <p className="text-gray-500">거래를 시작하면 포트폴리오가 표시됩니다</p>
          </div>
        )}
      </div>

      {/* 📊 **차트 영역** (향후 구현) */}
      <div className="chart-section bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold mb-4">포트폴리오 분포</h3>
        <div className="text-center py-8 text-gray-500">
          <PieChartIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>차트 구현 예정</p>
        </div>
      </div>
    </div>
  );
};

export default PortfolioTab;
