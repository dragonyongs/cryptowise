// src/features/trading/PaperTrading.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { formatCurrency, formatPercent } from "../../utils/formatters";
import { usePaperTrading } from "./hooks/usePaperTrading";
import { useSignalManager } from '../../features/analysis/hooks/useSignalManager';
import { usePortfolioStore } from "../../stores/portfolioStore"; // ✅ 포트폴리오 스토어 추가

// 컴포넌트 imports
import CoinsTab from "./components/CoinsTab";
import OverviewTab from "./components/OverviewTab";
import PortfolioTab from "./components/PortfolioTab";
import TradesTab from "./components/TradesTab";
import SignalsTab from "./components/SignalsTab";
import LogsTab from "./components/LogsTab";
import TradingSettings from "./components/TradingSettings";

// 아이콘 imports
import {
  PlayIcon,
  PauseIcon,
  SettingsIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MonitorIcon,
  CoinsIcon,
  PieChartIcon,
  ActivityIcon,
  ZapIcon,
  LineChartIcon,
  WifiIcon,
  WifiOffIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  InfoIcon,
  BellIcon,
  ShieldIcon,
  DollarSignIcon,
  BarChart3Icon,
  TrendingUpIcon as GainIcon,
  AlertTriangleIcon,
  ClockIcon,
  UsersIcon,
  TargetIcon,
  BrainIcon,
  RocketIcon,
  StarIcon,
} from "lucide-react";

const PaperTrading = () => {
  const {
    isActive,
    connectionStatus,
    portfolio,
    logs,
    selectedCoins,
    favoriteCoins,
    testMode,
    tradingMode,
    tradingSettings,
    setTradingSettings,
    lastSignal,
    monitoringStats,
    startPaperTrading,
    stopPaperTrading,
    toggleTestMode,
    addFavoriteCoin,
    removeFavoriteCoin,
    setTradingMode,
    refreshPriceAndAnalysis,
    hasSelectedCoins,
    selectedCoinsCount,
  } = usePaperTrading("demo-user");

  const [activeTab, setActiveTab] = useState("overview");
  const { signals, executeSignal } = useSignalManager(isActive);
  const [showSettings, setShowSettings] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // ✅ 포트폴리오 스토어 사용
  const {
    updatePortfolio,
    getUnifiedPortfolioData,
    calculatedPortfolio,
    portfolioStats
  } = usePortfolioStore();

  // ✅ 포트폴리오 변경시 스토어 업데이트
  useEffect(() => {
    if (portfolio) {
      console.log("🔄 PaperTrading - 포트폴리오 스토어 업데이트", portfolio);
      updatePortfolio(portfolio);
    }
  }, [portfolio, updatePortfolio]);

  // ✅ 스토어에서 계산된 데이터 사용 (기존 useMemo 대체)
  const currentPortfolioStats = useMemo(() => {
    // 스토어에서 계산된 결과 우선 사용
    if (portfolioStats && portfolioStats.totalValue > 0) {
      console.log("✅ 스토어에서 계산된 portfolioStats 사용:", portfolioStats);
      return {
        totalValue: portfolioStats.totalValue || 1840000,
        totalInvestment: portfolioStats.totalInvestment || 0,
        currentValue: portfolioStats.currentValue || 0,
        totalProfit: portfolioStats.totalProfit || 0,
        profitPercent: portfolioStats.profitPercent || 0,
        cashValue: calculatedPortfolio?.cash?.value || 1840000,
        dailyChange: portfolioStats.totalProfit * (Math.random() * 0.1 - 0.05), // 시뮬레이션
        dailyChangePercent: portfolioStats.totalValue > 0 ?
          (portfolioStats.totalProfit * 0.02 / portfolioStats.totalValue) * 100 : 0,
        portfolioProfitPercent: portfolioStats.portfolioProfitPercent || 0,
        unrealizedProfit: portfolioStats.totalProfit > 0 ? portfolioStats.totalProfit : 0,
      };
    }

    // 폴백: 스토어 데이터가 없는 경우 기본값
    console.warn("⚠️ 스토어 데이터가 없어 기본값 사용");
    return {
      totalValue: 1840000,
      totalInvestment: 0,
      currentValue: 0,
      totalProfit: 0,
      profitPercent: 0,
      cashValue: 1840000,
      dailyChange: 0,
      dailyChangePercent: 0,
      portfolioProfitPercent: 0,
      unrealizedProfit: 0,
    };
  }, [portfolioStats, calculatedPortfolio]);

  const tabs = [
    { id: "overview", label: "대시보드", icon: MonitorIcon, badge: null },
    { id: "coins", label: "코인 관리", icon: CoinsIcon, badge: selectedCoinsCount || null },
    { id: "portfolio", label: "포트폴리오", icon: PieChartIcon, badge: null },
    { id: "trades", label: "거래 내역", icon: ActivityIcon, badge: portfolio?.trades?.length || null },
    { id: "signals", label: "신호", icon: ZapIcon, badge: signals?.length || null },
    { id: "logs", label: "로그", icon: LineChartIcon, badge: logs?.length > 99 ? "99+" : logs?.length || null },
  ];

  // 연결 상태별 색상 및 텍스트
  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
      case 'active':
        return {
          color: 'text-emerald-500 bg-emerald-50',
          text: '연결됨',
          icon: WifiIcon,
          dot: 'bg-emerald-500'
        };
      case 'connecting':
        return {
          color: 'text-amber-500 bg-amber-50',
          text: '연결 중',
          icon: WifiIcon,
          dot: 'bg-amber-500 animate-pulse'
        };
      case 'error':
        return {
          color: 'text-red-500 bg-red-50',
          text: '연결 오류',
          icon: WifiOffIcon,
          dot: 'bg-red-500'
        };
      default:
        return {
          color: 'text-slate-400 bg-slate-50',
          text: '연결 안됨',
          icon: WifiOffIcon,
          dot: 'bg-slate-400'
        };
    }
  };

  const connectionInfo = getConnectionStatus();

  // 선택된 코인 변경 핸들러
  const handleSelectedCoinsChange = useCallback((newCoins) => {
    const currentSymbols = selectedCoins.map(c => c.symbol || c);

    // 새로 추가된 코인들
    newCoins.forEach(symbol => {
      if (!currentSymbols.includes(symbol)) {
        addFavoriteCoin({
          symbol,
          market: `KRW-${symbol}`,
          name: symbol,
          addedAt: Date.now()
        });
      }
    });

    // 제거된 코인들
    currentSymbols.forEach(symbol => {
      if (!newCoins.includes(symbol)) {
        removeFavoriteCoin(`KRW-${symbol}`);
      }
    });
  }, [selectedCoins, addFavoriteCoin, removeFavoriteCoin]);

  // ✅ 탭 컨텐츠 렌더링 (스토어 데이터 전달)
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            portfolio={portfolio}
            portfolioStats={currentPortfolioStats} // 스토어 데이터 전달
            isActive={isActive}
            connectionStatus={connectionStatus}
            performance={portfolio?.performance}
            lastSignal={lastSignal}
            monitoringStats={monitoringStats}
            totalValue={currentPortfolioStats.totalValue} // 추가
          />
        );
      case "coins":
        return (
          <CoinsTab
            favoriteCoins={favoriteCoins}
            selectedCoins={selectedCoins.map(coin => coin.symbol || coin)}
            onCoinsChange={handleSelectedCoinsChange}
            watchlistCoins={favoriteCoins}
            tradingMode={tradingMode}
            setTradingMode={setTradingMode}
            isActive={isActive}
            testMode={testMode}
          />
        );
      case "portfolio":
        return (
          <PortfolioTab
            portfolio={portfolio}
            portfolioStats={currentPortfolioStats} // 스토어 데이터 전달
            totalValue={currentPortfolioStats.totalValue}
            performance={portfolio?.performance}
          />
        );
      case "trades":
        return (
          <TradesTab
            trades={portfolio?.trades || portfolio?.tradeHistory || []}
            portfolio={portfolio}
            isActive={isActive}
          />
        );
      case "signals":
        return (
          <SignalsTab
            signals={signals}
            isActive={isActive}
            onSignalAction={executeSignal}
            lastSignal={lastSignal}
          />
        );
      case "logs":
        return (
          <LogsTab
            logs={logs}
            isActive={isActive}
            connectionStatus={connectionStatus}
          />
        );
      default:
        return (
          <div className="text-center text-slate-500 py-12">
            <InfoIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>탭을 선택하세요</p>
          </div>
        );
    }
  };

  // 거래 시작 핸들러
  const handleQuickStart = async () => {
    if (!hasSelectedCoins) {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'warning',
        title: '코인 선택 필요',
        message: '거래를 시작하려면 먼저 "코인 관리" 탭에서 거래할 코인을 선택해주세요.',
        timestamp: new Date(),
        action: () => setActiveTab('coins')
      }]);
      return;
    }

    try {
      await startPaperTrading();
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        title: '거래 시작됨',
        message: `${selectedCoinsCount}개 코인에 대한 페이퍼 트레이딩이 시작되었습니다.`,
        timestamp: new Date()
      }]);
    } catch (error) {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        title: '거래 시작 실패',
        message: error.message || '거래 시작 중 오류가 발생했습니다.',
        timestamp: new Date()
      }]);
    }
  };

  // 거래 중지 핸들러
  const handleQuickStop = async () => {
    try {
      await stopPaperTrading();
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'info',
        title: '거래 중지됨',
        message: '페이퍼 트레이딩이 안전하게 중지되었습니다.',
        timestamp: new Date()
      }]);
    } catch (error) {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        title: '거래 중지 실패',
        message: error.message || '거래 중지 중 오류가 발생했습니다.',
        timestamp: new Date()
      }]);
    }
  };

  // 새로고침 핸들러
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshPriceAndAnalysis();
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'success',
        title: '데이터 새로고침 완료',
        message: '가격 및 분석 데이터가 업데이트되었습니다.',
        timestamp: new Date()
      }]);
    } catch (error) {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        title: '새로고침 실패',
        message: '데이터 업데이트 중 오류가 발생했습니다.',
        timestamp: new Date()
      }]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 전략 요약 계산
  const getStrategyLabel = (strategy, settings) => {
    if (strategy) {
      const map = {
        ultraConservative: '초보수적',
        conservative: '보수적',
        balanced: '균형',
        aggressive: '적극적'
      };
      return map[strategy] || strategy;
    }

    const minScore = settings?.tradingConditions?.buyConditions?.minBuyScore;
    if (typeof minScore === 'number') {
      if (minScore >= 9) return '초보수적';
      if (minScore >= 8) return '보수적';
      if (minScore >= 6.5) return '균형';
      return '적극적';
    }
    return '설정없음';
  };

  const summary = useMemo(() => {
    const alloc = tradingSettings?.portfolioAllocation || {};
    const buyCond = tradingSettings?.tradingConditions?.buyConditions || {};
    const sellCond = tradingSettings?.tradingConditions?.sellConditions || {};
    const risk = tradingSettings?.tradingConditions?.riskManagement || {};

    return {
      strategyLabel: getStrategyLabel(tradingSettings?.strategy, tradingSettings),
      testMode: !!tradingSettings?.testMode || !!testMode,
      allocation: {
        cash: Math.round((alloc.cash || 0) * 100),
        t1: Math.round((alloc.t1 || 0) * 100),
        t2: Math.round((alloc.t2 || 0) * 100),
        t3: Math.round((alloc.t3 || 0) * 100),
      },
      minBuyScore: buyCond.minBuyScore ?? '-',
      rsiOversold: buyCond.rsiOversold ?? '-',
      strongBuyScore: buyCond.strongBuyScore ?? '-',
      profitTarget1: sellCond.profitTarget1 ?? '-',
      stopLoss: sellCond.stopLoss ?? '-',
      maxCoinsToTrade: risk.maxCoinsToTrade ?? '-',
      totalRules: Object.keys(buyCond).length + Object.keys(sellCond).length,
    };
  }, [tradingSettings, testMode]);

  // 알림 제거
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // 실시간 업데이트 효과
  useEffect(() => {
    let interval;
    if (isActive) {
      interval = setInterval(() => {
        console.log('📡 실시간 데이터 업데이트');
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  // 알림 자동 제거
  useEffect(() => {
    notifications.forEach(notification => {
      if (notification.type !== 'error') {
        setTimeout(() => {
          removeNotification(notification.id);
        }, 5000);
      }
    });
  }, [notifications]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 🎯 헤더 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                <RocketIcon className="w-8 h-8 mr-3 text-blue-600" />
                페이퍼 트레이딩
              </h1>
              <p className="text-slate-600 mt-1">실제 자금 없이 안전하게 거래 연습</p>
            </div>

            {/* 🎯 헤더 우측 컨트롤 */}
            <div className="flex items-center space-x-4">
              {/* 연결 상태 */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-full ${connectionInfo.color}`}>
                <div className={`w-2 h-2 rounded-full ${connectionInfo.dot}`}></div>
                <connectionInfo.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{connectionInfo.text}</span>
              </div>

              {/* 알림 */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <BellIcon className="w-5 h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {/* 알림 패널 */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
                    <div className="p-4 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">알림</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                          <BellIcon className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p>새로운 알림이 없습니다</p>
                        </div>
                      ) : (
                        notifications.map(notification => (
                          <div key={notification.id} className="p-4 border-b border-slate-100 hover:bg-slate-50">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <h4 className={`font-medium ${notification.type === 'error' ? 'text-red-900' :
                                    notification.type === 'success' ? 'text-green-900' :
                                      notification.type === 'warning' ? 'text-amber-900' :
                                        'text-slate-900'
                                  }`}>
                                  {notification.title}
                                </h4>
                                <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                                <p className="text-xs text-slate-400 mt-2">
                                  {notification.timestamp.toLocaleTimeString()}
                                </p>
                              </div>
                              <button
                                onClick={() => removeNotification(notification.id)}
                                className="text-slate-400 hover:text-slate-600 ml-2"
                              >
                                ×
                              </button>
                            </div>
                            {notification.action && (
                              <button
                                onClick={() => {
                                  notification.action();
                                  setShowNotifications(false);
                                }}
                                className="mt-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                              >
                                바로가기 →
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* 🎯 상태 대시보드 카드들 - ✅ 스토어 데이터 사용 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* 총 자산 카드 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">총 자산</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(currentPortfolioStats.totalValue)}
                </p>
                <div className="flex items-center mt-2 space-x-2">
                  <span className="text-slate-500 text-sm">수익률</span>
                  <span className={`text-sm font-medium flex items-center ${currentPortfolioStats.portfolioProfitPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                    {currentPortfolioStats.portfolioProfitPercent >= 0 ? (
                      <GainIcon className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDownIcon className="w-4 h-4 mr-1" />
                    )}
                    {formatPercent(currentPortfolioStats.portfolioProfitPercent)}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${currentPortfolioStats.portfolioProfitPercent >= 0 ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                <DollarSignIcon className={`w-6 h-6 ${currentPortfolioStats.portfolioProfitPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`} />
              </div>
            </div>
          </div>

          {/* 거래 상태 카드 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">거래 상태</p>
                <p className={`text-lg font-semibold ${isActive ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                  {isActive ? '활성' : '비활성'}
                </p>
                <div className="mt-2">
                  <span className="text-sm text-slate-500">
                    {testMode ? '🧪 테스트 모드' : '💎 실전 모드'}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${isActive ? 'bg-emerald-100' : 'bg-slate-100'
                }`}>
                {isActive ? (
                  <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertCircleIcon className="w-6 h-6 text-slate-400" />
                )}
              </div>
            </div>
          </div>

          {/* 선택된 코인 카드 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">선택 코인</p>
                <p className="text-2xl font-bold text-slate-900">
                  {selectedCoinsCount}개
                </p>
                <div className="mt-2">
                  <span className="text-sm text-slate-500">
                    투자금액: {formatCurrency(currentPortfolioStats.totalInvestment)}
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-blue-100">
                <CoinsIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          {/* 성과 카드 */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">수익금</p>
                <p className={`text-2xl font-bold ${currentPortfolioStats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                  {currentPortfolioStats.totalProfit >= 0 ? '+' : ''}{formatCurrency(currentPortfolioStats.totalProfit)}
                </p>
                <div className="mt-2">
                  <span className="text-sm text-slate-500">
                    승률: {(portfolio?.performance?.winRate || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-purple-100">
                <TargetIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* 🎯 통합 제어 패널 */}
        <div className="bg-white rounded-xl border border-slate-200 mb-6 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <BrainIcon className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">거래 제어</h2>
                  <p className="text-sm text-slate-500">실시간 자동 매매 관리</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={toggleTestMode}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${testMode
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                >
                  {testMode ? '🧪 테스트 모드' : '💎 실전 모드'}
                </button>

                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-2 rounded-lg transition-all ${showSettings
                      ? 'text-blue-600 bg-blue-100'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              <div className="flex items-center space-x-4">
                {!isActive ? (
                  <button
                    onClick={handleQuickStart}
                    disabled={!hasSelectedCoins}
                    className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-semibold transition-all ${hasSelectedCoins
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                        : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      }`}
                  >
                    <PlayIcon className="w-5 h-5" />
                    <span>거래 시작</span>
                    {hasSelectedCoins && (
                      <span className="bg-emerald-500 text-emerald-100 px-2 py-1 rounded-full text-xs">
                        {selectedCoinsCount}개
                      </span>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleQuickStop}
                    className="flex items-center space-x-3 px-6 py-3 rounded-xl font-semibold bg-red-600 hover:bg-red-700 text-white transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  >
                    <PauseIcon className="w-5 h-5" />
                    <span>거래 중지</span>
                  </button>
                )}

                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center space-x-2 px-4 py-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
                >
                  <RefreshCwIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? '새로고침 중...' : '새로고침'}</span>
                </button>
              </div>

              {isActive && (
                <div className="flex items-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-emerald-700 font-medium">실시간 모니터링</span>
                  </div>

                  {lastSignal && (
                    <div className="flex items-center space-x-2 text-slate-600">
                      <ClockIcon className="w-4 h-4" />
                      <span>최근: {lastSignal.symbol} {lastSignal.type} ({(lastSignal.totalScore || 0).toFixed(1)}점)</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 🎯 전략 요약 카드 */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <ShieldIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-700">현재 전략 요약</div>
                <div className="text-xs text-slate-500">거래 시작 전 적용된 설정과 주요 조건</div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${summary.strategyLabel === '초보수적' ? 'bg-red-100 text-red-700' :
                  summary.strategyLabel === '보수적' ? 'bg-amber-100 text-amber-700' :
                    summary.strategyLabel === '균형' ? 'bg-sky-100 text-sky-700' :
                      summary.strategyLabel === '적극적' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-600'
                }`}>
                {summary.strategyLabel}
              </span>
              {summary.totalRules > 0 && (
                <span className="px-2 py-1 bg-white rounded-full text-xs text-slate-600 border">
                  {summary.totalRules}개 규칙
                </span>
              )}
            </div>
          </div>

          {/* 자산 배분 */}
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-3 rounded-lg border border-slate-100 text-center">
              <div className="text-xs text-slate-500 mb-1">현금</div>
              <div className="text-lg font-bold text-slate-900">{summary.allocation.cash}%</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-100 text-center">
              <div className="text-xs text-slate-500 mb-1">T1 (안전)</div>
              <div className="text-lg font-bold text-blue-600">{summary.allocation.t1}%</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-100 text-center">
              <div className="text-xs text-slate-500 mb-1">T2 (균형)</div>
              <div className="text-lg font-bold text-green-600">{summary.allocation.t2}%</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-100 text-center">
              <div className="text-xs text-slate-500 mb-1">T3 (공격)</div>
              <div className="text-lg font-bold text-orange-600">{summary.allocation.t3}%</div>
            </div>
          </div>

          {/* 주요 설정 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
            <div className="bg-white p-3 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-400 mb-1">최소 매수 점수</div>
              <div className="font-semibold text-slate-700">{summary.minBuyScore}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-400 mb-1">수익 목표</div>
              <div className="font-semibold text-green-600">{summary.profitTarget1}%</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-400 mb-1">손절라인</div>
              <div className="font-semibold text-red-600">{summary.stopLoss}%</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-100">
              <div className="text-xs text-slate-400 mb-1">최대 동시 거래</div>
              <div className="font-semibold text-slate-700">{summary.maxCoinsToTrade}개</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {summary.testMode ? '🧪 테스트 모드로 실행됩니다' : '💎 실전 모드 설정'}
            </div>
            {tradingSettings && (
              <div className="text-xs text-slate-400">
                마지막 설정 업데이트: {new Date().toLocaleString()}
              </div>
            )}
          </div>
        </div>

        {/* 🎯 설정 패널 */}
        {showSettings && (
          <div className="mb-6">
            <TradingSettings
              settings={tradingSettings}
              onSettingsChange={setTradingSettings}
              isActive={isActive}
              onClose={() => setShowSettings(false)}
              testMode={testMode}
              onToggleTestMode={toggleTestMode}
            />
          </div>
        )}

        {/* 🎯 탭 네비게이션 */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                        ? 'border-slate-900 text-slate-900'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-200 text-slate-600'
                        }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 🎯 탭 콘텐츠 */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* 🎯 시작 가이드 (코인 미선택시) */}
        {!hasSelectedCoins && !isActive && (
          <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <RocketIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-4">
                  🚀 페이퍼트레이딩 시작 가이드
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-blue-700">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                    <div className="text-sm">
                      <strong>코인 선택</strong><br />
                      "코인 관리" 탭에서 거래할 코인을 선택하세요
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                    <div className="text-sm">
                      <strong>전략 설정</strong><br />
                      설정 버튼으로 거래 전략을 조정하세요
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                    <div className="text-sm">
                      <strong>거래 시작</strong><br />
                      "거래 시작" 버튼을 클릭하세요
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">4</div>
                    <div className="text-sm">
                      <strong>자동 거래</strong><br />
                      실시간 업비트 시세로 자동 거래가 시작됩니다!
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setActiveTab('coins')}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    코인 관리로 이동 →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🎯 활성 거래 상태 표시 */}
        {isActive && (
          <div className="mt-6 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-4 h-4 bg-emerald-400 rounded-full animate-ping"></div>
                </div>
                <div>
                  <p className="text-emerald-800 font-semibold text-lg">
                    실시간 페이퍼트레이딩 진행 중
                  </p>
                  <p className="text-emerald-600 text-sm">
                    {selectedCoinsCount}개 코인 모니터링 • {testMode ? '테스트 모드' : '실전 모드'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                {lastSignal && (
                  <div className="text-emerald-700 text-sm mb-2">
                    <strong>최신 신호:</strong> {lastSignal.symbol} {lastSignal.type}
                    <span className="ml-2 text-emerald-600">({(lastSignal.totalScore || 0).toFixed(1)}점)</span>
                  </div>
                )}
                <div className="text-emerald-600 text-xs">
                  {new Date().toLocaleTimeString()} 기준
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperTrading;
