// src/features/trading/components/OverviewTab.jsx
import React, { useMemo, useEffect, useState } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { usePortfolioStore } from "../../../stores/portfolioStore";
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
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date());

  // ✅ Store에서 직접 데이터 가져오기
  const { portfolioData, portfolioStats } = usePortfolioStore();

  // ✅ Store 데이터 안전성 체크
  const safePortfolioData = useMemo(() => {
    return (
      portfolioData || {
        coins: [],
        cash: { symbol: "KRW", value: 1840000, percentage: 100 },
        totalValue: 1840000,
      }
    );
  }, [portfolioData]);

  const safePortfolioStats = useMemo(() => {
    return (
      portfolioStats || {
        totalInvestment: 0,
        currentValue: 0,
        totalProfit: 0,
        profitPercent: 0,
        portfolioProfitPercent: 0,
        initialCapital: 1840000,
      }
    );
  }, [portfolioStats]);

  // ✅ Store 상태 디버깅 (개발 모드)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 OverviewTab Store 연결:", {
        hasPortfolioData: !!portfolioData,
        hasPortfolioStats: !!portfolioStats,
        totalValue: safePortfolioData.totalValue,
        coinsCount: safePortfolioData.coins?.length || 0,
      });
    }
  }, [portfolioData, portfolioStats, safePortfolioData]);

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
    // 여기에 실제 데이터 새로고침 로직 추가
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
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            실시간 포트폴리오 현황 및 성과 분석
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            페이퍼 트레이딩 대시보드에서 실시간 성과를 확인하세요
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            마지막 업데이트: {lastUpdateTime.toLocaleTimeString('ko-KR')}
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <RefreshCwIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 메인 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 총 자산 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-20">
            <DollarSignIcon className="h-12 w-12 text-blue-600" />
          </div>
          <div className="relative">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSignIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">총 자산</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatCurrency(safePortfolioData.totalValue)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400">
              초기: {formatCurrency(safePortfolioStats.initialCapital)}
            </div>
          </div>
        </div>

        {/* 투자 평가액 */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-20">
            <CoinsIcon className="h-12 w-12 text-green-600" />
          </div>
          <div className="relative">
            <div className="flex items-center space-x-2 mb-2">
              <CoinsIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">투자 평가액</span>
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {formatCurrency(safePortfolioStats.currentValue)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              투자원금: {formatCurrency(safePortfolioStats.totalInvestment)}
            </div>
          </div>
        </div>

        {/* 총 수익금 */}
        <div className={`bg-gradient-to-br ${safePortfolioStats.totalProfit >= 0
          ? 'from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800'
          : 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800'
          } border rounded-xl p-6 relative overflow-hidden`}>
          <div className="absolute top-2 right-2 opacity-20">
            {React.createElement(getProfitIcon(safePortfolioStats.totalProfit), {
              className: `h-12 w-12 ${getProfitColor(safePortfolioStats.totalProfit)}`
            })}
          </div>
          <div className="relative">
            <div className="flex items-center space-x-2 mb-2">
              {React.createElement(getProfitIcon(safePortfolioStats.totalProfit), {
                className: `h-5 w-5 ${getProfitColor(safePortfolioStats.totalProfit)}`
              })}
              <span className={`text-sm font-medium ${getProfitColor(safePortfolioStats.totalProfit)}`}>
                총 수익금
              </span>
            </div>
            <div className={`text-2xl font-bold ${getProfitColor(safePortfolioStats.totalProfit)} mb-1`}>
              {safePortfolioStats.totalProfit >= 0 ? '+' : ''}
              {formatCurrency(safePortfolioStats.totalProfit)}
            </div>
            <div className={`text-xs ${getProfitColor(safePortfolioStats.totalProfit)}`}>
              수익률: {safePortfolioStats.profitPercent >= 0 ? '+' : ''}
              {safePortfolioStats.profitPercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* 연결 상태 & 성과 */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-2 right-2 opacity-20">
            <ActivityIcon className="h-12 w-12 text-purple-600" />
          </div>
          <div className="relative">
            <div className="flex items-center space-x-2 mb-3">
              <ConnectionIcon className={`h-5 w-5 ${connectionInfo.color}`} />
              <span className={`text-sm font-medium ${connectionInfo.color}`}>
                {connectionInfo.text}
              </span>
              <div className={`w-2 h-2 rounded-full ${connectionInfo.dotColor}`} />
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              승률: {winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">
              {totalTrades}회 거래 중 {profitableTrades}회 성공
            </div>
          </div>
        </div>
      </div>

      {/* 최근 신호 & 알림 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 최근 신호 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">최근 신호</h4>
            <ZapIcon className="h-5 w-5 text-amber-500" />
          </div>
          {lastSignal ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${lastSignal.type === 'BUY' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {lastSignal.symbol}
                  </span>
                  <span className={`px-2 py-1 text-xs rounded-full ${lastSignal.type === 'BUY'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                    {lastSignal.type === 'BUY' ? '매수' : '매도'}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {lastSignal.totalScore || lastSignal.score}/10
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    신뢰도
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                {lastSignal.reason || '자동 생성된 신호'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {lastSignal.timestamp
                  ? new Date(lastSignal.timestamp).toLocaleString('ko-KR')
                  : '방금 전'
                }
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <TimerIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400">신호 대기 중...</p>
            </div>
          )}
        </div>

        {/* 거래 상태 요약 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">거래 현황</h4>
            <BarChart3Icon className="h-5 w-5 text-blue-500" />
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {safePortfolioData.coins?.length || 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">보유 코인</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {totalTrades}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">총 거래</div>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(winRate, 100)}%` }}
              />
            </div>
            <div className="text-center text-sm text-gray-600 dark:text-gray-300">
              성공률 {winRate.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* 포트폴리오 상세 */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">보유 자산</h4>
            <div className="flex items-center space-x-2">
              <EyeIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {safePortfolioData.coins?.length || 0}개 자산
              </span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  종목
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  수량
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  평균단가
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  현재가치
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  수익률
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {safePortfolioData.coins && safePortfolioData.coins.length > 0 ? (
                safePortfolioData.coins.map((coin, index) => (
                  <tr key={coin.symbol || index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {coin.symbol?.charAt(0) || '?'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {coin.symbol?.toUpperCase() || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                      {coin.quantity?.toFixed(8) || '0.00000000'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white">
                      {formatCurrency(coin.avgPrice || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(coin.value || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className={`font-medium ${getProfitColor(coin.profitPercent || 0)}`}>
                        {coin.profitPercent >= 0 ? '+' : ''}
                        {(coin.profitPercent || 0).toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="space-y-3">
                      <CoinsIcon className="h-12 w-12 text-gray-400 mx-auto" />
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          보유 중인 코인이 없습니다
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">
                          거래를 시작하면 포트폴리오가 표시됩니다
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 상태 인디케이터 */}
      {isActive && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
            <div className="flex-1">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                실시간 페이퍼트레이딩 진행 중
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">
                시장 데이터를 실시간으로 분석하며 자동 거래 신호를 생성하고 있습니다
              </div>
            </div>
            <ActivityIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(OverviewTab);
