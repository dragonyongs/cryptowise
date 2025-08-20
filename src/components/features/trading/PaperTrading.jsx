// src/components/features/testing/PaperTrading.jsx - 완전 반응형 + 다크모드 최적화 버전
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { usePaperTrading } from "../../../hooks/usePaperTrading";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { ConnectionStatus } from "../../ui/ConnectionStatus";
import TradingSettings from "./TradingSettings";
import SentimentIndicator from "./SentimentIndicator";
import {
  PlayIcon, PauseIcon, RefreshCwIcon, TrendingUpIcon, TrendingDownIcon,
  DollarSignIcon, BarChart3Icon, SettingsIcon, EyeIcon, GlobeIcon,
  HeartIcon, WifiIcon, WifiOffIcon, TestTubeIcon, ActivityIcon,
  PieChartIcon, CalendarIcon, RotateCcwIcon, ZapIcon, ArrowUpIcon,
  ArrowDownIcon, CpuIcon, ShieldCheckIcon, LightbulbIcon, ChevronDownIcon,
  MonitorIcon, ClockIcon, ServerIcon, SparklesIcon, AlertTriangleIcon,
  CheckCircleIcon, InfoIcon, StarIcon, CoinsIcon, TargetIcon,
  ChevronUpIcon, FilterIcon, GridIcon, ListIcon, XIcon, MenuIcon
} from "lucide-react";

// ✅ 반응형 로그 뷰어 컴포넌트
const ResponsiveLogViewer = React.memo(({ logs, isCollapsed, setIsCollapsed }) => (
  <div className="bg-gray-900 dark:bg-gray-950 rounded-lg border border-gray-700 dark:border-gray-800 transition-all duration-300">
    <div
      className="flex items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-900 transition-colors rounded-t-lg"
      onClick={() => setIsCollapsed(!isCollapsed)}
    >
      <div className="flex items-center space-x-2">
        <ActivityIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
        <span className="text-green-400 font-semibold text-sm sm:text-base">실시간 거래 로그</span>
        <span className="text-xs text-gray-400 bg-gray-800 dark:bg-gray-900 px-2 py-1 rounded-full">
          {logs?.length || 0}
        </span>
      </div>
      {isCollapsed ? (
        <ChevronDownIcon className="h-4 w-4 text-gray-400 transition-transform" />
      ) : (
        <ChevronUpIcon className="h-4 w-4 text-gray-400 transition-transform" />
      )}
    </div>

    {!isCollapsed && (
      <div className="px-3 pb-3 sm:px-4 sm:pb-4">
        <div className="h-32 sm:h-40 lg:h-48 xl:h-56 overflow-y-auto font-mono text-xs sm:text-sm bg-black dark:bg-gray-900 rounded border border-gray-800 dark:border-gray-700">
          {logs && logs.length > 0 ? (
            <div className="p-2 sm:p-3 space-y-1">
              {logs.slice(-30).map((log, idx) => (
                <div key={idx} className="text-gray-300 break-words leading-relaxed hover:bg-gray-800 dark:hover:bg-gray-800 p-1 rounded">
                  <span className="text-blue-400 text-xs">
                    [{new Date(log.timestamp).toLocaleTimeString('ko-KR')}]
                  </span>{' '}
                  <span className={`font-medium ${log.type === 'BUY' ? 'text-green-400' :
                      log.type === 'SELL' ? 'text-red-400' :
                        log.type === 'SIGNAL' ? 'text-yellow-400' :
                          log.type === 'ERROR' ? 'text-red-500' :
                            'text-gray-400'
                    }`}>
                    [{log.type}]
                  </span>{' '}
                  <span className="text-gray-300">{log.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              <div className="text-center">
                <ActivityIcon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <p>거래 로그가 표시됩니다</p>
              </div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
));

// ✅ 반응형 스탯 카드 컴포넌트
const ResponsiveStatCard = React.memo(({
  icon: Icon,
  title,
  value,
  subtitle,
  color = "blue",
  size = "normal",
  className = ""
}) => {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30",
    green: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900/30",
    red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900/30",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30"
  };

  const sizeClasses = size === "large" ? "p-4 sm:p-6" : "p-3 sm:p-4";

  return (
    <div className={`${sizeClasses} rounded-lg border ${colorClasses[color]} transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-2">
            <Icon className={`${size === "large" ? "h-5 w-5 sm:h-6 sm:w-6" : "h-4 w-4 sm:h-5 sm:w-5"} flex-shrink-0`} />
            <span className={`${size === "large" ? "text-sm sm:text-base" : "text-xs sm:text-sm"} font-medium truncate`}>
              {title}
            </span>
          </div>
          <div className="space-y-1">
            <span className={`${size === "large" ? "text-xl sm:text-2xl lg:text-3xl" : "text-lg sm:text-xl"} font-bold block text-gray-900 dark:text-white`}>
              {value}
            </span>
            {subtitle && (
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-tight">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// ✅ 포트폴리오 카드 컴포넌트
const PortfolioCard = React.memo(({ coin, viewType = "grid" }) => {
  if (viewType === "list") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:shadow-md dark:hover:shadow-lg transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs sm:text-sm">
                {coin.symbol.substring(0, 2)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                  {coin.symbol}
                </span>
                <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">
                  {coin.tier || 'TIER3'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">수량</p>
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {coin.quantity.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">평균단가</p>
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {formatCurrency(coin.avgPrice)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">현재가치</p>
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {formatCurrency(coin.currentValue)}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${coin.profitRate >= 0
              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
              : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
            }`}>
            {coin.profitRate >= 0 ? (
              <div className="flex items-center space-x-1">
                <ArrowUpIcon className="h-3 w-3" />
                <span>+{formatPercent(coin.profitRate)}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <ArrowDownIcon className="h-3 w-3" />
                <span>{formatPercent(coin.profitRate)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs sm:text-sm">
              {coin.symbol.substring(0, 2)}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                {coin.symbol}
              </span>
              <span className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex-shrink-0">
                {coin.tier || 'TIER3'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              수량: {coin.quantity.toFixed(8)}
            </p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${coin.profitRate >= 0
            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
            : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
          }`}>
          {coin.profitRate >= 0 ? (
            <div className="flex items-center space-x-1">
              <ArrowUpIcon className="h-3 w-3" />
              <span>+{formatPercent(coin.profitRate)}</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1">
              <ArrowDownIcon className="h-3 w-3" />
              <span>{formatPercent(coin.profitRate)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">평균단가</p>
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {formatCurrency(coin.avgPrice)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">현재가치</p>
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {formatCurrency(coin.currentValue)}
          </p>
        </div>
      </div>
    </div>
  );
});

// ✅ 거래 내역 카드 컴포넌트
const TradeCard = React.memo(({ trade, viewType = "grid" }) => {
  if (viewType === "list") {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:shadow-md dark:hover:shadow-lg transition-all duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${trade.action === 'BUY'
                ? 'bg-green-100 dark:bg-green-900/20'
                : 'bg-red-100 dark:bg-red-900/20'
              }`}>
              {trade.action === 'BUY' ? (
                <ArrowUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                  {trade.symbol}
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${trade.action === 'BUY'
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                  }`}>
                  {trade.action === 'BUY' ? '매수' : '매도'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                <div>
                  <p className="text-gray-500 dark:text-gray-400">시간</p>
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {new Date(trade.timestamp).toLocaleString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">가격</p>
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {formatCurrency(trade.price)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">수량</p>
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {trade.quantity?.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 dark:text-gray-400">총액</p>
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {formatCurrency(trade.amount)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {trade.profitRate !== undefined && trade.profitRate !== null && (
            <div className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${trade.profitRate >= 0
                ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
              }`}>
              {trade.profitRate >= 0 ? '+' : ''}{formatPercent(trade.profitRate)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-4 hover:shadow-lg dark:hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${trade.action === 'BUY'
              ? 'bg-green-100 dark:bg-green-900/20'
              : 'bg-red-100 dark:bg-red-900/20'
            }`}>
            {trade.action === 'BUY' ? (
              <ArrowUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                {trade.symbol}
              </span>
              <span className={`text-xs font-medium px-2 py-1 rounded flex-shrink-0 ${trade.action === 'BUY'
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                  : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}>
                {trade.action === 'BUY' ? '매수' : '매도'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {new Date(trade.timestamp).toLocaleString('ko-KR')}
            </p>
          </div>
        </div>

        {trade.profitRate !== undefined && trade.profitRate !== null && (
          <div className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${trade.profitRate >= 0
              ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
              : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
            }`}>
            {trade.profitRate >= 0 ? '+' : ''}{formatPercent(trade.profitRate)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">가격</p>
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {formatCurrency(trade.price)}
          </p>
        </div>
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs">수량</p>
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {trade.quantity?.toFixed(8)}
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <p className="text-gray-500 dark:text-gray-400 text-xs">총액</p>
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {formatCurrency(trade.amount)}
          </p>
        </div>
      </div>
    </div>
  );
});

// ✅ 빈 상태 컴포넌트
const EmptyState = React.memo(({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-8 sm:py-12 lg:py-16 text-center">
    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
      <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400 dark:text-gray-500" />
    </div>
    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-2">
      {title}
    </h3>
    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-4 max-w-sm">
      {description}
    </p>
    {action}
  </div>
));

// ✅ 메인 PaperTrading 컴포넌트
const PaperTrading = () => {
  // 상태 관리
  const [testMode, setTestMode] = useState(false);
  const [watchlistMode, setWatchlistMode] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [logsCollapsed, setLogsCollapsed] = useState(false);
  const [portfolioView, setPortfolioView] = useState('grid'); // grid, list
  const [tradesView, setTradesView] = useState('grid'); // grid, list

  const {
    isActive,
    setIsActive,
    portfolio,
    trades,
    marketSentiment,
    monitoringStats,
    connectionStatus,
    refreshData,
    logs
  } = usePaperTrading();

  // 포트폴리오 통계 계산 (메모이제이션)
  const portfolioStats = useMemo(() => {
    if (!portfolio?.coins || Object.keys(portfolio.coins).length === 0) {
      return {
        totalValue: portfolio?.krw || 1840000,
        totalProfit: 0,
        totalProfitRate: 0,
        coinsCount: 0,
        bestPerformer: null,
        worstPerformer: null
      };
    }

    const coins = Object.values(portfolio.coins);
    const totalCryptoValue = coins.reduce((sum, coin) => sum + coin.currentValue, 0);
    const totalValue = (portfolio?.krw || 0) + totalCryptoValue;
    const totalProfit = totalValue - 1840000;
    const totalProfitRate = (totalProfit / 1840000) * 100;

    const sortedCoins = [...coins].sort((a, b) => b.profitRate - a.profitRate);

    return {
      totalValue,
      totalProfit,
      totalProfitRate,
      coinsCount: coins.length,
      bestPerformer: sortedCoins[0] || null,
      worstPerformer: sortedCoins[sortedCoins.length - 1] || null
    };
  }, [portfolio]);

  // 거래 통계 계산 (메모이제이션)
  const tradeStats = useMemo(() => {
    if (!trades || trades.length === 0) {
      return {
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        winRate: 0,
        avgProfit: 0,
        bestTrade: null,
        worstTrade: null
      };
    }

    const completedTrades = trades.filter(t => t.profitRate !== undefined);
    const winTrades = completedTrades.filter(t => t.profitRate > 0);
    const lossTrades = completedTrades.filter(t => t.profitRate < 0);
    const avgProfit = completedTrades.length > 0
      ? completedTrades.reduce((sum, t) => sum + (t.profitRate || 0), 0) / completedTrades.length
      : 0;

    const sortedTrades = [...completedTrades].sort((a, b) => b.profitRate - a.profitRate);

    return {
      totalTrades: trades.length,
      winTrades: winTrades.length,
      lossTrades: lossTrades.length,
      winRate: completedTrades.length > 0 ? (winTrades.length / completedTrades.length) * 100 : 0,
      avgProfit,
      bestTrade: sortedTrades[0] || null,
      worstTrade: sortedTrades[sortedTrades.length - 1] || null
    };
  }, [trades]);

  // 이벤트 핸들러
  const handleToggleTrading = useCallback(() => {
    setIsActive(!isActive);
  }, [isActive, setIsActive]);

  const handleRefresh = useCallback(() => {
    refreshData?.();
  }, [refreshData]);

  const handleModeChange = useCallback((mode) => {
    setWatchlistMode(mode === 'watchlist');
  }, []);

  const handleToggleSettings = useCallback(() => {
    setShowSettings(!showSettings);
  }, [showSettings]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">

        {/* 헤더 섹션 */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <div className="flex items-center space-x-2 sm:space-x-3 mb-2">
                <TestTubeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  페이퍼 트레이딩
                </h1>
                {testMode && (
                  <span className="text-xs sm:text-sm bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded-full font-medium">
                    🧪 테스트 모드
                  </span>
                )}
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                감정 분석과 기술적 지표를 결합하여 최적의 거래 타이밍을 찾아내는 차세대 페이퍼 트레이딩 시스템입니다.
              </p>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-3">
              <ConnectionStatus status={connectionStatus} />
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="새로고침"
              >
                <RefreshCwIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleToggleSettings}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                title="설정"
              >
                <SettingsIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 모드 선택 및 컨트롤 */}
          <div className="mt-4 sm:mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  <button
                    onClick={() => handleModeChange('watchlist')}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${watchlistMode
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    <HeartIcon className="h-4 w-4 mr-1 inline" />
                    관심코인
                  </button>
                  <button
                    onClick={() => handleModeChange('top')}
                    className={`px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors ${!watchlistMode
                        ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                  >
                    <TrendingUpIcon className="h-4 w-4 mr-1 inline" />
                    상위코인
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="testMode"
                    checked={testMode}
                    onChange={(e) => setTestMode(e.target.checked)}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600 rounded"
                  />
                  <label htmlFor="testMode" className="text-sm text-gray-700 dark:text-gray-300">
                    테스트 모드
                  </label>
                </div>
              </div>

              <button
                onClick={handleToggleTrading}
                className={`flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isActive
                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl'
                  } transform hover:scale-105`}
              >
                {isActive ? (
                  <>
                    <PauseIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    거래 중지
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    거래 시작
                  </>
                )}
              </button>
            </div>

            {watchlistMode && (
              <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <InfoIcon className="h-4 w-4 inline mr-1" />
                  관심코인 모드에서는 메인 화면에서 코인을 먼저 관심등록해주세요.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 설정 패널 */}
        {showSettings && (
          <div className="mb-6 sm:mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <TradingSettings />
            </div>
          </div>
        )}

        {/* 메인 통계 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <ResponsiveStatCard
            icon={DollarSignIcon}
            title="총 자산"
            value={formatCurrency(portfolioStats.totalValue)}
            subtitle={`초기자본: ₩1,840,000`}
            color={portfolioStats.totalProfitRate >= 0 ? "green" : "red"}
            size="large"
          />

          <ResponsiveStatCard
            icon={TrendingUpIcon}
            title="총 수익률"
            value={portfolioStats.totalProfitRate >= 0 ? `+${formatPercent(portfolioStats.totalProfitRate)}` : formatPercent(portfolioStats.totalProfitRate)}
            subtitle={`${portfolioStats.totalProfit >= 0 ? '+' : ''}${formatCurrency(portfolioStats.totalProfit)}`}
            color={portfolioStats.totalProfitRate >= 0 ? "green" : "red"}
            size="large"
          />

          <ResponsiveStatCard
            icon={CoinsIcon}
            title="보유 코인"
            value={portfolioStats.coinsCount}
            subtitle={portfolioStats.bestPerformer ? `최고: ${portfolioStats.bestPerformer.symbol} (+${formatPercent(portfolioStats.bestPerformer.profitRate)})` : "보유 중인 코인이 없습니다"}
            color="blue"
          />

          <ResponsiveStatCard
            icon={BarChart3Icon}
            title="승률"
            value={`${tradeStats.winRate.toFixed(1)}%`}
            subtitle={`${tradeStats.winTrades}승 ${tradeStats.lossTrades}패 (총 ${tradeStats.totalTrades}거래)`}
            color={tradeStats.winRate >= 50 ? "green" : "red"}
          />
        </div>

        {/* 감정 분석 및 모니터링 통계 */}
        {marketSentiment && (
          <div className="mb-6 sm:mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                  시장 감정 분석
                </h3>
                <SentimentIndicator sentiment={marketSentiment} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">공포탐욕지수</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                    {marketSentiment.fearGreedIndex}/100
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {marketSentiment.sentimentPhase.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">실행된 거래</p>
                  <p className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                    {monitoringStats.tradesExecuted}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">거부된 신호</p>
                  <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">
                    {monitoringStats.signalsRejected}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">생성된 신호</p>
                  <p className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                    {monitoringStats.signalsGenerated}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 컨텐츠 영역 - 데스크탑은 2열, 모바일은 1열 */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">

          {/* 포트폴리오 섹션 */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                포트폴리오
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setPortfolioView(portfolioView === 'grid' ? 'list' : 'grid')}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title={portfolioView === 'grid' ? '목록 보기' : '카드 보기'}
                >
                  {portfolioView === 'grid' ? <ListIcon className="h-4 w-4" /> : <GridIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {portfolio?.coins && Object.keys(portfolio.coins).length > 0 ? (
              <div className={`${portfolioView === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
                  : 'space-y-3'
                }`}>
                {Object.values(portfolio.coins).map((coin) => (
                  <PortfolioCard key={coin.symbol} coin={coin} viewType={portfolioView} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={PieChartIcon}
                title="포트폴리오가 비어있습니다"
                description="거래가 실행되면 여기에 포트폴리오가 표시됩니다"
                action={
                  <button
                    onClick={handleToggleTrading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    거래 시작하기
                  </button>
                }
              />
            )}
          </div>

          {/* 거래 내역 섹션 */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                최근 거래
              </h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setTradesView(tradesView === 'grid' ? 'list' : 'grid')}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title={tradesView === 'grid' ? '목록 보기' : '카드 보기'}
                >
                  {tradesView === 'grid' ? <ListIcon className="h-4 w-4" /> : <GridIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {trades && trades.length > 0 ? (
              <div className={`${tradesView === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 gap-4'
                  : 'space-y-3'
                }`}>
                {trades.slice(-10).reverse().map((trade, idx) => (
                  <TradeCard key={`${trade.timestamp}-${idx}`} trade={trade} viewType={tradesView} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={CoinsIcon}
                title="거래 내역이 없습니다"
                description="거래가 실행되면 여기에 표시됩니다"
                action={
                  <button
                    onClick={handleToggleTrading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                  >
                    거래 시작하기
                  </button>
                }
              />
            )}
          </div>
        </div>

        {/* 로그 뷰어 */}
        <ResponsiveLogViewer
          logs={logs}
          isCollapsed={logsCollapsed}
          setIsCollapsed={setLogsCollapsed}
        />
      </div>
    </div>
  );
};

export default PaperTrading;
