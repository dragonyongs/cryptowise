// src/features/trading/components/OverviewTab.jsx
import React, { useMemo, useEffect, useState } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { usePortfolioStore } from "../../../stores/portfolioStore";
import { useCapital } from "../../../hooks/useCapital";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  PieChartIcon,
  ActivityIcon,
  WifiIcon,
  WifiOffIcon,
  ShieldCheckIcon,
  ClockIcon,
  BarChart3Icon,
  AlertCircleIcon,
  CheckCircleIcon,
  InfoIcon,
  CoinsIcon,
  StarIcon,
  TargetIcon,
  ZapIcon,
  LineChartIcon,
  RefreshCwIcon,
  EyeIcon,
  AlertTriangleIcon,
  TimerIcon,
  TrendingUpIcon as GrowthIcon
} from "lucide-react";

const OverviewTab = ({
  isActive = false,
  connectionStatus = "disconnected",
  performance = {},
  lastSignal = null,
  // 🔥 PortfolioTab과 같은 props 받기
  portfolio,
  totalValue
}) => {
  // 🔥 중앙화된 자본금 사용
  const { capital, formatCapital } = useCapital();

  // Store에서 데이터 가져오기 (백업용)
  const { portfolioData: storePortfolioData, portfolioStats: storePortfolioStats } = usePortfolioStore();

  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

  // 🔥 PortfolioTab과 동일한 데이터 처리 로직
  const portfolioData = useMemo(() => {
    // props로 받은 portfolio 우선 사용 (PortfolioTab과 동일)
    const sourcePortfolio = portfolio || storePortfolioData;

    if (!sourcePortfolio) {
      return {
        coins: [],
        cash: { symbol: "KRW", value: capital, percentage: 100 },
        totalValue: capital
      };
    }

    let coinsObj = {};

    if (sourcePortfolio.coins && typeof sourcePortfolio.coins === 'object') {
      coinsObj = sourcePortfolio.coins;
    } else if (sourcePortfolio.positions && Array.isArray(sourcePortfolio.positions)) {
      coinsObj = sourcePortfolio.positions.reduce((acc, pos) => {
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
      const currentTotal = totalValue || sourcePortfolio.totalValue || 0;
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

    let cashValue = sourcePortfolio.cashValue || sourcePortfolio.krw || 0;
    const coinsValue = coins.reduce((sum, coin) => sum + coin.value, 0);
    let safeTotalValue = totalValue || sourcePortfolio.totalValue || (cashValue + coinsValue);

    if (safeTotalValue === 0 && capital > 0) {
      safeTotalValue = capital;
      cashValue = capital;
    }

    const cashData = {
      symbol: "KRW",
      value: cashValue,
      percentage: safeTotalValue > 0 ? (cashValue / safeTotalValue) * 100 : 100,
    };

    return {
      coins,
      cash: cashData,
      totalValue: safeTotalValue
    };
  }, [portfolio, storePortfolioData, totalValue, capital]);

  // 🔥 PortfolioTab과 동일한 통계 계산 로직
  const portfolioStats = useMemo(() => {
    const coins = portfolioData.coins;
    const totalInvestment = coins.reduce((sum, coin) => sum + (coin.quantity * coin.avgPrice), 0);
    const currentValue = coins.reduce((sum, coin) => sum + coin.value, 0);
    const totalProfit = coins.reduce((sum, coin) => sum + coin.profit, 0);
    const profitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;
    const portfolioProfitPercent = capital > 0 ? ((portfolioData.totalValue - capital) / capital) * 100 : 0;

    return {
      totalInvestment,
      currentValue,
      totalProfit,
      profitPercent,
      portfolioProfitPercent,
      initialCapital: capital,
    };
  }, [portfolioData, capital]);

  // ✅ Store 상태 디버깅 (개발 모드)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 OverviewTab 데이터 연결:", {
        hasPortfolio: !!portfolio,
        hasStoreData: !!storePortfolioData,
        totalValue: portfolioData.totalValue,
        capital,
        coinsCount: portfolioData.coins?.length || 0,
        cashValue: portfolioData.cash.value,
        source: portfolio ? "props" : "store"
      });
    }
  }, [portfolio, storePortfolioData, portfolioData, capital]);

  // 🎯 성과 데이터 처리
  const winRate = performance?.winRate || 0;
  const totalTrades = performance?.totalTrades || 0;
  const profitableTrades = performance?.profitableTrades || 0;

  // 🎯 연결 상태 정보
  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case "connected":
      case "active":
        return {
          icon: WifiIcon,
          text: "연결됨",
          color: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
          dotColor: "bg-emerald-500",
        };
      case "connecting":
        return {
          icon: WifiIcon,
          text: "연결 중",
          color: "text-amber-600 dark:text-amber-400",
          bgColor: "bg-amber-50 dark:bg-amber-900/20",
          dotColor: "bg-amber-500 animate-pulse",
        };
      default:
        return {
          icon: WifiOffIcon,
          text: "연결 안됨",
          color: "text-slate-400 dark:text-slate-500",
          bgColor: "bg-slate-50 dark:bg-slate-900/20",
          dotColor: "bg-slate-400",
        };
    }
  };

  const connectionInfo = getConnectionStatus();
  const ConnectionIcon = connectionInfo.icon;

  // 🎯 새로고침 핸들러
  const handleRefresh = async () => {
    setRefreshing(true);
    setLastUpdateTime(new Date());
    // 실제 데이터 새로고침 로직
    setTimeout(() => setRefreshing(false), 1000);
  };

  // 🎯 수익률 색상
  const getProfitColor = (value) => {
    if (value > 0) return "text-emerald-600 dark:text-emerald-400";
    if (value < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  // 🎯 수익률 아이콘
  const getProfitIcon = (value) => {
    if (value > 0) return TrendingUpIcon;
    if (value < 0) return TrendingDownIcon;
    return BarChart3Icon;
  };

  return (
    <div className="space-y-6">
      {/* 헤더 섹션 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          포트폴리오 개요
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          페이퍼 트레이딩 대시보드에서 실시간 성과를 확인하세요
        </p>
      </div>

      {/* 메인 통계 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 총 자산 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                총 자산
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(portfolioData.totalValue)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-full">
              <DollarSignIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        {/* 총 수익/손실 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                총 수익/손실
              </p>
              <p className={`text-2xl font-bold ${getProfitColor(portfolioStats.totalProfit)}`}>
                {portfolioStats.totalProfit >= 0 ? '+' : ''}
                {formatCurrency(portfolioStats.totalProfit)}
              </p>
              <p className={`text-sm ${getProfitColor(portfolioStats.portfolioProfitPercent)}`}>
                {portfolioStats.portfolioProfitPercent >= 0 ? '+' : ''}
                {portfolioStats.portfolioProfitPercent.toFixed(2)}%
              </p>
            </div>
            <div className={`p-3 rounded-full ${portfolioStats.totalProfit >= 0
              ? 'bg-emerald-100 dark:bg-emerald-900/20'
              : 'bg-red-100 dark:bg-red-900/20'
              }`}>
              {React.createElement(getProfitIcon(portfolioStats.totalProfit), {
                className: `h-6 w-6 ${getProfitColor(portfolioStats.totalProfit)}`
              })}
            </div>
          </div>
        </div>

        {/* 보유 코인 수 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                보유 코인
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {portfolioData.coins.length}개
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-full">
              <CoinsIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* 현금 비율 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                현금 비율
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {portfolioData.cash.percentage.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatCurrency(portfolioData.cash.value)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <PieChartIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 연결 상태 및 성과 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 연결 상태 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              시스템 상태
            </h3>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <RefreshCwIcon className={`h-4 w-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-full ${connectionInfo.bgColor}`}>
                  <ConnectionIcon className={`h-4 w-4 ${connectionInfo.color}`} />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  연결 상태
                </span>
              </div>
              <span className={`text-sm font-medium ${connectionInfo.color}`}>
                {connectionInfo.text}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                마지막 업데이트
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {lastUpdateTime.toLocaleTimeString()}
              </span>
            </div>

            {lastSignal && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    최근 신호
                  </span>
                  <span className={`text-sm font-bold ${lastSignal.type === 'BUY' ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {lastSignal.type}
                  </span>
                </div>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  {lastSignal.symbol} - {lastSignal.totalScore?.toFixed(1)}점
                </p>
              </div>
            )}

            {!lastSignal && (
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  신호 대기 중...
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 거래 성과 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            거래 성과
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">승률</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {winRate.toFixed(1)}%
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">총 거래</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {totalTrades}회
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">수익 거래</span>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {profitableTrades}회
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">손실 거래</span>
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {totalTrades - profitableTrades}회
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 보유 코인 테이블 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            보유 코인 현황
          </h3>
        </div>

        <div className="overflow-x-auto">
          {portfolioData.coins.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    종목
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    수량
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    평균단가
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    현재가치
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    수익률
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {portfolioData.coins.map((coin) => (
                  <tr key={coin.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                            {coin.symbol?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {coin.symbol?.toUpperCase() || 'Unknown'}
                          </div>
                          {coin.tier && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {coin.tier}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                      {coin.quantity?.toFixed(8) || '0.00000000'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(coin.avgPrice || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-gray-100">
                      {formatCurrency(coin.value || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <span className={getProfitColor(coin.profitPercent)}>
                        {coin.profitPercent >= 0 ? '+' : ''} {(coin.profitPercent || 0).toFixed(2)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <CoinsIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                보유 중인 코인이 없습니다
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                거래를 시작하면 포트폴리오가 표시됩니다
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
