// src/features/trading/PaperTrading.jsx - 수정된 버전

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  PlayIcon, PauseIcon, CogIcon, BellIcon, TrendingUpIcon, TrendingDownIcon,
  PieChartIcon, BarChart3Icon, InfoIcon, ActivityIcon, Coins, History
} from "lucide-react";

// ✅ 핵심: usePaperTrading 훅 사용 (실제 거래 로직)
import { usePaperTrading } from "./hooks/usePaperTrading.js";

// ✅ 보조 훅들
import { useTradingLogger } from "./hooks/useTradingLogger";
import { useTradingSettings } from "./hooks/useTradingSettings";

// ✅ 컴포넌트들
import TradingSettings from "./components/TradingSettings";
import OverviewTab from "./components/OverviewTab";
import CoinsTab from "./components/CoinsTab";
import PortfolioTab from "./components/PortfolioTab";
import TradesTab from "./components/TradesTab";
import SignalsTab from "./components/SignalsTab";
import LogsTab from "./components/LogsTab";

const PaperTrading = () => {
  // ✅ 로컬 상태
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const userId = "demo-user";

  // 🔥 핵심: 실제 거래 로직을 포함한 usePaperTrading 훅 사용
  const {
    // 상태
    isActive,
    isConnected,
    connectionStatus,
    lastSignal,
    logs,
    signals,
    marketData,
    marketCondition,
    monitoringStats,
    marketSentiment,

    // 코인 관련
    favoriteCoins,
    topCoins,
    currentSelectedCoins,
    selectedCoins,

    // 시스템 상태
    centralDataReady,
    signalGeneratorReady,
    systemReady, // 🔥 usePaperTrading에서 계산된 값 사용

    // 동적 포지션 관리
    dynamicPositionEnabled,
    optimizationPlan,
    positionAnalysis,
    riskAssessment,
    cashOptimization,

    // 설정
    tradingMode,
    setTradingMode,
    topCoinsLimit,
    setTopCoinsLimit,
    tradingSettings,
    setTradingSettings,
    testMode,

    // 🔥 핵심 액션들 (실제 거래 기능)
    updatePortfolio,
    startPaperTrading,
    stopPaperTrading,
    addLog,
    toggleTestMode,
    refreshMarketCondition,
    fetchMarketSentiment,
    updateTopCoinsUI,

    // 동적 포지션 관리
    toggleDynamicPositionManagement,
    generateOptimizationPlan,
    executeOptimizationPlan,
    updatePositionAnalysis,
    updateRiskAssessment,
    updateCashOptimization,

    // 코인 관리
    addFavoriteCoin,
    removeFavoriteCoin,

    // 유틸리티
    selectedCoinsCount,
    hasSelectedCoins,
    tradingStats,
  } = usePaperTrading(userId, null);

  // ✅ 보조 훅들
  const {
    settings = {},
    isDirty = false,
    saveSettings
  } = useTradingSettings();

  // ✅ 초기화
  useEffect(() => {
    addLog?.("🚀 CryptoWise 페이퍼 트레이딩 시스템 로드됨", "info");
  }, [addLog]);

  // 🔥 시스템 준비 상태 체크 (수정됨)
  const isSystemReady = useMemo(() => {
    // 🔥 더 관대한 조건: 관심코인만 있으면 시작 가능
    const hasCoins = hasSelectedCoins || favoriteCoins.length > 0;
    const basicReady = centralDataReady || signalGeneratorReady; // OR 조건으로 완화

    console.log('🔍 시스템 상태 체크:', {
      hasCoins,
      centralDataReady,
      signalGeneratorReady,
      systemReady,
      basicReady,
      finalReady: hasCoins && (systemReady || basicReady)
    });

    return hasCoins && (systemReady || basicReady);
  }, [hasSelectedCoins, favoriteCoins.length, centralDataReady, signalGeneratorReady, systemReady]);

  // ✅ 거래 시작/중지 핸들러 (조건 완화)
  const handleToggleTrading = useCallback(async () => {
    if (!isActive) {
      // 🔥 시작 전 검증 (조건 완화)
      if (!hasSelectedCoins && favoriteCoins.length === 0) {
        addLog?.("❌ 관심코인을 먼저 선택해주세요", "warning");
        setActiveTab('coins');
        return;
      }

      // 🔥 시스템 준비 상태 체크 (더 관대하게)
      if (!isSystemReady && !hasSelectedCoins) {
        addLog?.("⏳ 시스템이 준비되지 않았습니다. 잠시만 기다려주세요...", "warning");
        return;
      }

      // 🔥 실제 거래 시작
      addLog?.("🔥 페이퍼 트레이딩 시작 요청", "info");
      await startPaperTrading();
    } else {
      // 🔥 실제 거래 중지
      addLog?.("🛑 페이퍼 트레이딩 중지 요청", "info");
      stopPaperTrading();
    }
  }, [isActive, hasSelectedCoins, favoriteCoins.length, isSystemReady, startPaperTrading, stopPaperTrading, addLog]);

  // ✅ 신호 새로고침
  const handleRefreshSignals = useCallback(async () => {
    if (!isActive) {
      addLog?.("❌ 거래가 활성화되지 않았습니다", "warning");
      return;
    }

    addLog?.("🔄 신호 새로고침 시작", "info");
    await refreshMarketCondition();
    await updatePortfolio(true);
    addLog?.("✅ 신호 새로고침 완료", "success");
  }, [isActive, refreshMarketCondition, updatePortfolio, addLog]);

  // ✅ 성과 데이터
  const performance = useMemo(() => {
    const portfolio = tradingStats?.tradingEngine || {};
    return {
      totalValue: portfolio.totalValue || 0,
      totalProfit: portfolio.totalProfit || 0,
      profitPercent: portfolio.totalProfitRate || 0,
      winRate: portfolio.performance?.winRate || 0,
      totalTrades: portfolio.tradingStats?.totalTrades || 0,
      connectionStatus: isConnected ? 'connected' : 'disconnected'
    };
  }, [tradingStats, isConnected]);

  // ✅ 탭별 카운트
  const tabCounts = useMemo(() => ({
    coins: selectedCoinsCount || 0,
    portfolio: currentSelectedCoins?.length || 0,
    trades: tradingStats?.tradingEngine?.tradingStats?.totalTrades || 0,
    signals: signals?.length || 0,
    logs: logs?.length || 0
  }), [selectedCoinsCount, currentSelectedCoins, tradingStats, signals, logs]);

  // ✅ 탭 렌더링 (기존과 동일)
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <OverviewTab
            signals={signals?.filter(s => !s.executed) || []}
            portfolioData={{
              totalValue: performance.totalValue,
              coins: currentSelectedCoins || [],
              totalProfit: performance.totalProfit,
              profitPercent: performance.profitPercent,
              isPositive: performance.profitPercent > 0
            }}
            systemHealth={connectionStatus}
            connectionStatus={performance.connectionStatus}
            isActive={isActive}
            marketCondition={marketCondition}
            tradingMode={tradingMode}
            testMode={testMode}
            dynamicPositionEnabled={dynamicPositionEnabled}
            systemReady={isSystemReady}
          />
        );

      case 'coins':
        return (
          <CoinsTab
            favoriteCoins={favoriteCoins}
            topCoins={topCoins}
            onToggleFavorite={(symbol, isSelected) => {
              if (isSelected) {
                const coin = topCoins?.find(c => c.symbol === symbol);
                if (coin) {
                  addFavoriteCoin(coin);
                }
              } else {
                removeFavoriteCoin(`KRW-${symbol}`);
              }
            }}
            onAddCoin={(symbol) => {
              const coin = topCoins?.find(c => c.symbol === symbol);
              if (coin) {
                addFavoriteCoin(coin);
              }
            }}
            onRefresh={updateTopCoinsUI}
            isActive={isActive}
            loadingState={{
              isLoading: !systemReady,
              hasData: hasSelectedCoins
            }}
            tradingMode={tradingMode}
            onTradingModeChange={setTradingMode}
          />
        );

      case 'portfolio':
        return (
          <PortfolioTab
            coins={currentSelectedCoins?.map(coin => ({
              ...coin,
              value: coin.currentPrice * (coin.quantity || 1),
              profitPercent: coin.profitRate || 0
            })) || []}
            portfolioData={{
              totalProfit: performance.totalProfit,
              profitPercent: performance.profitPercent,
              cashValue: tradingStats?.tradingEngine?.krw || 0
            }}
            onRefresh={() => updatePortfolio(true)}
            isActive={isActive}
            dynamicPositionEnabled={dynamicPositionEnabled}
            optimizationPlan={optimizationPlan}
            positionAnalysis={positionAnalysis}
            riskAssessment={riskAssessment}
            onGenerateOptimizationPlan={generateOptimizationPlan}
            onExecuteOptimizationPlan={executeOptimizationPlan}
          />
        );

      case 'trades':
        return (
          <TradesTab
            trades={tradingStats?.tradingEngine?.trades || []}
            onExport={() => {
              const trades = tradingStats?.tradingEngine?.trades || [];
              const csvContent = "data:text/csv;charset=utf-8,"
                + "Date,Symbol,Type,Price,Quantity,Profit\n"
                + trades.map(t => `${t.timestamp},${t.symbol},${t.action},${t.price},${t.quantity},${t.profitRate || 0}`).join("\n");
              const link = document.createElement("a");
              link.setAttribute("href", encodeURI(csvContent));
              link.setAttribute("download", `trades_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              addLog?.("📄 거래내역 내보내기 완료", "info");
            }}
            performance={performance}
            isActive={isActive}
          />
        );

      case 'signals':
        return (
          <SignalsTab
            signals={signals || []}
            onExecuteSignal={(signal) => {
              addLog?.(`🔥 수동 신호 실행: ${signal.symbol} ${signal.type}`, "info");
            }}
            isActive={isActive}
            marketCondition={marketCondition}
            testMode={testMode}
          />
        );

      case 'logs':
        return (
          <LogsTab
            logs={logs || []}
            onExport={() => {
              const logData = logs?.map(log => ({
                timestamp: log.timestamp,
                level: log.level,
                message: log.message
              })) || [];
              const jsonContent = "data:text/json;charset=utf-8," + JSON.stringify(logData, null, 2);
              const link = document.createElement("a");
              link.setAttribute("href", encodeURI(jsonContent));
              link.setAttribute("download", `logs_${new Date().toISOString().split('T')[0]}.json`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              addLog?.("📄 로그 내보내기 완료", "info");
            }}
            stats={monitoringStats}
            systemStats={tradingStats}
          />
        );

      default:
        return <div className="p-4">준비 중입니다...</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                페이퍼 트레이딩
              </h1>
              <div className="ml-4 flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <span>실제 자금 없이 안전하게 거래 연습</span>
                <span>•</span>
                <span className={`${isSystemReady ? 'text-green-600' : 'text-yellow-600'}`}>
                  {isSystemReady ? '시스템 준비됨' : '시스템 준비중'}
                </span>
                {isActive && (
                  <>
                    <span>•</span>
                    <span className="text-green-600">거래 활성화됨</span>
                  </>
                )}
              </div>
            </div>

            {/* 시스템 상태 표시 */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <span>연결: {connectionStatus}</span>
                <span>신호: {signals?.length || 0}개</span>
                <span>코인: {selectedCoinsCount || 0}개</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 (3칸) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 탭 네비게이션 */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8 px-6">
                  {[
                    { id: 'dashboard', label: '대시보드', icon: BarChart3Icon },
                    { id: 'coins', label: '코인 관리', icon: Coins, count: tabCounts.coins },
                    { id: 'portfolio', label: '포트폴리오', icon: PieChartIcon, count: tabCounts.portfolio },
                    { id: 'trades', label: '거래내역', icon: History, count: tabCounts.trades },
                    { id: 'signals', label: '신호', icon: ActivityIcon, count: tabCounts.signals },
                    { id: 'logs', label: '로그', icon: InfoIcon, count: tabCounts.logs }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`${activeTab === tab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                          } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                          <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* 탭 콘텐츠 */}
              <div className="p-6">
                {renderTabContent()}
              </div>
            </div>
          </div>

          {/* 사이드바 (1칸) */}
          <div className="space-y-6">
            {/* 거래 컨트롤 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                실시간 자동 매매 관리
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">거래 상태</span>
                  <span className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-gray-600'}`}>
                    {isActive ? "활성" : "비활성"}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">선택 코인</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {selectedCoinsCount || 0}개
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">시스템</span>
                  <span className={`text-sm font-medium ${isSystemReady ? 'text-green-600' : 'text-yellow-600'}`}>
                    {isSystemReady ? "준비됨" : "준비중"}
                  </span>
                </div>

                {/* 🔥 버튼 조건 수정 */}
                <button
                  onClick={handleToggleTrading}
                  disabled={!isActive && (!hasSelectedCoins && favoriteCoins.length === 0)}
                  className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium text-white transition-colors ${isActive
                    ? 'bg-red-600 hover:bg-red-700'
                    : (hasSelectedCoins || favoriteCoins.length > 0)
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-gray-400 cursor-not-allowed'
                    }`}
                >
                  {isActive ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                  <span>{isActive ? '거래 중지' : '거래 시작'}</span>
                </button>
              </div>
            </div>

            {/* 실시간 상태 */}
            {isActive && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ActivityIcon className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                      실시간 페이퍼트레이딩 진행 중
                    </h3>
                    <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                      {selectedCoinsCount || 0}개 코인 모니터링 • {testMode ? '테스트' : '실전'} 모드
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 설정 및 모드 토글 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                설정 및 모드
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">모드</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {testMode ? '테스트 모드' : '실전 모드'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500 dark:text-gray-400">포지션 관리</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {dynamicPositionEnabled ? '동적 관리' : '고정 관리'}
                  </span>
                </div>

                <button
                  onClick={() => setShowSettings(true)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <CogIcon className="h-4 w-4" />
                  <span>거래 설정</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 설정 모달 */}
      {showSettings && TradingSettings && (
        <TradingSettings
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={tradingSettings}
          onSave={(newSettings) => {
            setTradingSettings(newSettings);
            setShowSettings(false);
            addLog?.("⚙️ 거래 설정 저장됨", "success");
          }}
          testMode={testMode}
          dynamicPositionEnabled={dynamicPositionEnabled}
        />
      )}
    </div>
  );
};

export default React.memo(PaperTrading);
