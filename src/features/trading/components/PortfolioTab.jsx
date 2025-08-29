// src/features/trading/components/PortfolioTab.jsx
import React, { useMemo } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { usePortfolioStore } from "../../../stores/portfolioStore";
import { usePortfolioConfig } from "../../../config/portfolioConfig";
import { useCapital } from "../../../hooks/useCapital";

import {
  PieChartIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  CoinsIcon,
  RefreshCwIcon,
  BarChart3Icon
} from "lucide-react";

const PortfolioTab = ({ portfolio, totalValue }) => {
  const { config } = usePortfolioConfig();
  const initialCapital = config?.initialCapital || 0;
  const { capital, formatCapital } = useCapital();

  // ✅ 안전한 포트폴리오 데이터 추출
  const portfolioData = useMemo(() => {
    if (!portfolio) {
      return {
        coins: [],
        cash: { symbol: "KRW", value: capital, percentage: 100 },
        totalValue: capital
      };
    }

    let coinsObj = {};

    if (portfolio.coins && typeof portfolio.coins === 'object') {
      coinsObj = portfolio.coins;
    } else if (portfolio.positions && Array.isArray(portfolio.positions)) {
      coinsObj = portfolio.positions.reduce((acc, pos) => {
        if (pos && pos.symbol) {
          acc[pos.symbol] = {
            symbol: pos.symbol,
            quantity: pos.quantity || 0,
            avgPrice: pos.avgPrice || 0,
            currentPrice: pos.currentPrice || pos.price || 0,
            value: pos.currentValue || (pos.quantity * pos.currentPrice) || 0,
            totalProfit: pos.totalProfit || 0,
            tier: pos.tier || 'TIER3',
          };
        }
        return acc;
      }, {});
    }

    const coins = Object.entries(coinsObj).map(([symbol, coin]) => {
      const quantity = Number(coin?.quantity) || 0;
      const avgPrice = Number(coin?.avgPrice) || 0;
      let currentPrice = Number(coin?.currentPrice || coin?.price) || 0;

      // 가격 업데이트 로직
      if (window.centralDataManager) {
        const realTimePrice = window.centralDataManager.getLatestPrice(`KRW-${symbol}`);
        if (realTimePrice && realTimePrice.trade_price) {
          currentPrice = realTimePrice.trade_price;
        }
      }

      // 수익 계산
      let profit = 0;
      let profitPercent = 0;
      if (quantity > 0 && avgPrice > 0 && currentPrice > 0) {
        profit = coin?.totalProfit && Math.abs(coin.totalProfit) > 0.01
          ? Number(coin.totalProfit)
          : (currentPrice - avgPrice) * quantity;
        profitPercent = ((currentPrice - avgPrice) / avgPrice) * 100;
      }

      const value = Math.round(quantity * currentPrice);
      const currentTotal = totalValue || portfolio.totalValue || 0;
      const percentage = currentTotal > 0 ? (value / currentTotal) * 100 : 0;

      return {
        symbol,
        quantity,
        avgPrice,
        currentPrice,
        value,
        percentage: Math.max(0, percentage),
        profit: Math.round(profit),
        profitPercent: Number(profitPercent.toFixed(2)),
        tier: coin?.tier || 'TIER3',
      };
    });

    let cashValue = portfolio.cashValue || portfolio.krw || 0;
    const coinsValue = coins.reduce((sum, coin) => sum + coin.value, 0);
    let safeTotalValue = totalValue || portfolio.totalValue || (cashValue + coinsValue);

    if (safeTotalValue === 0 && initialCapital > 0) {
      safeTotalValue = initialCapital;
      cashValue = initialCapital;
    }

    const cashData = {
      symbol: "KRW",
      value: cashValue,
      percentage: safeTotalValue > 0 ? (cashValue / safeTotalValue) * 100 : 100,
    };

    return { coins, cash: cashData, totalValue: safeTotalValue };
  }, [portfolio, totalValue, initialCapital]);

  // 🔥 포트폴리오 통계
  const portfolioStats = useMemo(() => {
    const coins = portfolioData.coins;
    const totalInvestment = coins.reduce((sum, coin) => sum + (coin.quantity * coin.avgPrice), 0);
    const currentValue = coins.reduce((sum, coin) => sum + coin.value, 0);
    const totalProfit = coins.reduce((sum, coin) => sum + coin.profit, 0);
    const profitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
    const portfolioProfitPercent = initialCapital > 0
      ? ((portfolioData.totalValue - initialCapital) / initialCapital) * 100
      : 0;

    return {
      totalInvestment,
      currentValue,
      totalProfit,
      profitPercent,
      portfolioProfitPercent,
      initialCapital,
    };
  }, [portfolioData, initialCapital]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">포트폴리오 현황</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            보유 자산의 상세 현황과 수익률을 확인하세요
          </p>
        </div>
        <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <RefreshCwIcon className="h-4 w-4" />
          <span>새로고침</span>
        </button>
      </div>

      {/* 포트폴리오 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <DollarSignIcon className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">총 자산</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(portfolioData.totalValue)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            초기: {formatCurrency(portfolioStats.initialCapital)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <CoinsIcon className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">투자 평가액</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(portfolioStats.currentValue)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            투자원금: {formatCurrency(portfolioStats.totalInvestment)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUpIcon className={`h-5 w-5 ${portfolioStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">총 수익금</span>
          </div>
          <div className={`text-2xl font-bold ${portfolioStats.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {portfolioStats.totalProfit >= 0 ? '+' : ''}{formatCurrency(portfolioStats.totalProfit)}
          </div>
          <div className={`text-xs mt-1 ${portfolioStats.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            투자수익률: {portfolioStats.profitPercent >= 0 ? '+' : ''}{portfolioStats.profitPercent.toFixed(2)}%
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-6 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <BarChart3Icon className={`h-5 w-5 ${portfolioStats.portfolioProfitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">전체 수익률</span>
          </div>
          <div className={`text-2xl font-bold ${portfolioStats.portfolioProfitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {portfolioStats.portfolioProfitPercent >= 0 ? '+' : ''}{portfolioStats.portfolioProfitPercent.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            기준: 초기 자본 대비
          </div>
        </div>
      </div>

      {/* 보유 자산 테이블 */}
      <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">보유 자산</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  자산
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  보유량
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  평균단가
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  현재가
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  평가금액
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  수익률
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  비중
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {/* 현금 */}
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-green-600 dark:text-green-300">₩</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">현금 (KRW)</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(portfolioData.cash.value)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500 dark:text-gray-400">-</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                  {portfolioData.cash.percentage.toFixed(1)}%
                </td>
              </tr>

              {/* 코인들 */}
              {portfolioData.coins.map((coin) => (
                <tr key={coin.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-300">
                          {coin.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {coin.symbol.toUpperCase()}
                        </div>
                        {coin.tier && (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${coin.tier === 'TIER1' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            coin.tier === 'TIER2' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200' :
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                            {coin.tier}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {coin.quantity.toFixed(8)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {formatCurrency(coin.avgPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {formatCurrency(coin.currentPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(coin.value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className={`${coin.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {coin.profitPercent >= 0 ? '+' : ''}{coin.profitPercent.toFixed(2)}%
                    </div>
                    <div className={`text-xs ${coin.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ({coin.profit >= 0 ? '+' : ''}{formatCurrency(coin.profit)})
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                    {coin.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {portfolioData.coins.length === 0 && (
            <div className="text-center py-12">
              <CoinsIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                보유 중인 코인이 없습니다
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                거래를 시작하면 포트폴리오가 표시됩니다
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 포트폴리오 차트 (향후 구현) */}
      <div className="bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 p-6">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">포트폴리오 분포</h4>
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <PieChartIcon className="h-12 w-12 mx-auto mb-4" />
          <p>포트폴리오 분포를 시각적으로 표시할 예정입니다</p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PortfolioTab);
