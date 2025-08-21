// src/components/features/testing/PaperTrading.jsx - 완전 통합 버전

import React, { useState } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";

// ✅ 실제 업비트 연동 훅 import
import { usePaperTrading } from "../../../hooks/usePaperTrading";

// ✅ 분리된 컴포넌트들 import
import CoinsTab from "./components/CoinsTab";
import OverviewTab from "./components/OverviewTab";
import PortfolioTab from "./components/PortfolioTab";
import TradesTab from "./components/TradesTab";
import SignalsTab from "./components/SignalsTab";
import LogsTab from "./components/LogsTab";
import TradingSettings from "./TradingSettings";
import PaperTradingControl from "./PaperTradingControl";

import {
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  BarChart3Icon,
  SettingsIcon,
  TestTubeIcon,
  ActivityIcon,
  PieChartIcon,
  ZapIcon,
  MonitorIcon,
  CoinsIcon,
  LineChartIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";

const PaperTrading = () => {
  // 🚀 **핵심: 모든 상태를 usePaperTrading 훅에서 가져옴**
  const {
    // === 상태 ===
    isActive,
    connectionStatus,
    portfolio,
    logs,
    currentSelectedCoins,
    selectedCoins,
    favoriteCoins,
    topCoins,
    testMode,
    tradingMode,
    tradingSettings,
    lastSignal,
    marketSentiment,
    marketCondition,
    monitoringStats,

    // === 액션 함수들 (실제 업비트 연동!) ===
    startPaperTrading,      // ⭐ 실제 웹소켓 연결 & 거래 시작
    stopPaperTrading,       // ⭐ 실제 웹소켓 해제 & 거래 중지
    toggleTestMode,
    updatePortfolio,
    addFavoriteCoin,
    removeFavoriteCoin,
    setTradingMode,
    setTradingSettings,
    updateTopCoinsUI,
    fetchMarketSentiment,
    refreshPriceAndAnalysis,

    // === 유틸리티 ===
    hasSelectedCoins,
    selectedCoinsCount,
    tradingStats,
    getLogSystemStatus,
    exportLogs
  } = usePaperTrading("demo-user");

  // 🎮 **UI 상태 (로컬에서만 관리)**
  const [activeTab, setActiveTab] = useState("overview");
  const [showSettings, setShowSettings] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 📋 **탭 목록**
  const tabs = [
    { id: "overview", label: "개요", icon: MonitorIcon, color: "bg-blue-500" },
    { id: "control", label: "거래 제어", icon: PlayIcon, color: "bg-green-500" },
    { id: "coins", label: "코인 관리", icon: CoinsIcon, color: "bg-purple-500" },
    { id: "portfolio", label: "포트폴리오", icon: PieChartIcon, color: "bg-orange-500" },
    { id: "trades", label: "거래 내역", icon: ActivityIcon, color: "bg-pink-500" },
    { id: "signals", label: "신호 분석", icon: ZapIcon, color: "bg-yellow-500" },
    { id: "logs", label: "로그", icon: LineChartIcon, color: "bg-gray-500" },
  ];

  // 🎨 **탭 콘텐츠 렌더링**
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            portfolio={portfolio}
            isActive={isActive}
            connectionStatus={connectionStatus}
            performance={portfolio?.performance || { totalReturn: 0, winRate: 0, totalTrades: 0 }}
            lastSignal={lastSignal}
            selectedCoinsCount={selectedCoinsCount}
            testMode={testMode}
          />
        );

      case "control":
        // 🚀 **거래 제어 패널 (실제 함수 연결!)**
        return (
          <PaperTradingControl
            // 상태 전달
            isActive={isActive}
            connectionStatus={connectionStatus}
            portfolio={portfolio}
            logs={logs}
            monitoringStats={monitoringStats}
            currentSelectedCoins={currentSelectedCoins}
            testMode={testMode}
            tradingMode={tradingMode}
            lastSignal={lastSignal}
            marketSentiment={marketSentiment}
            marketCondition={marketCondition}
            tradingStats={tradingStats}

            // 🎯 **실제 액션 함수들 연결**
            startPaperTrading={startPaperTrading}   // ⭐ 진짜 거래 시작
            stopPaperTrading={stopPaperTrading}     // ⭐ 진짜 거래 중지
            toggleTestMode={toggleTestMode}
            refreshData={refreshPriceAndAnalysis}
            updateMarketSentiment={fetchMarketSentiment}
          />
        );

      case "coins":
        return (
          <CoinsTab
            selectedCoins={selectedCoins.map(coin => coin.symbol || coin)}
            onCoinsChange={(newCoins) => {
              // 코인 추가/제거 로직
              const currentSymbols = selectedCoins.map(c => c.symbol || c);

              newCoins.forEach(symbol => {
                if (!currentSymbols.includes(symbol)) {
                  addFavoriteCoin({
                    symbol,
                    market: `KRW-${symbol}`,
                    name: symbol
                  });
                }
              });

              currentSymbols.forEach(symbol => {
                if (!newCoins.includes(symbol)) {
                  removeFavoriteCoin(`KRW-${symbol}`);
                }
              });
            }}
            watchlistCoins={favoriteCoins}
            tradingMode={tradingMode}
            setTradingMode={setTradingMode}
            isActive={isActive}
          />
        );

      case "portfolio":
        return (
          <PortfolioTab
            portfolio={portfolio || { krw: 1840000, coins: {} }} // ✅ 기본값 제공
            totalValue={portfolio?.totalValue || 1840000}
            updatePortfolio={updatePortfolio}
          />
        );

      case "trades":
        return (
          <TradesTab
            trades={portfolio?.tradeHistory || []}
          />
        );

      case "signals":
        return (
          <SignalsTab
            signals={lastSignal ? [lastSignal] : []}
            isActive={isActive}
          />
        );

      case "logs":
        return (
          <LogsTab
            logs={logs}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            exportLogs={exportLogs}
            systemStatus={getLogSystemStatus()}
          />
        );

      default:
        return <div className="text-center text-gray-500 py-8">탭을 선택하세요</div>;
    }
  };

  // 🎯 **빠른 액션 함수들**
  const handleQuickStart = async () => {
    if (!hasSelectedCoins) {
      alert("거래할 코인을 먼저 선택해주세요!");
      return;
    }
    await startPaperTrading();
  };

  const handleQuickStop = async () => {
    await stopPaperTrading();
  };

  return (
    <div className="paper-trading-app min-h-screen bg-gray-50">
      {/* 📊 **상단 헤더** */}
      <div className="header bg-gradient-to-r from-blue-600 to-purple-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <TrendingUpIcon className="w-8 h-8" />
                CryptoWise 페이퍼 트레이딩
              </h1>
              <p className="text-blue-100 mt-1">실제 자금 없이 안전하게 거래 연습</p>
            </div>

            {/* 📈 **실시간 정보** */}
            <div className="stats-summary text-right">
              <div className="text-3xl font-bold">
                ₩{portfolio?.totalValue?.toLocaleString() || "1,840,000"}
              </div>
              <div className="flex items-center gap-4 text-sm text-blue-100 mt-1">
                <span className={`flex items-center gap-1 ${isActive ? "text-green-300" : "text-gray-300"
                  }`}>
                  {isActive ? <WifiIcon className="w-4 h-4" /> : <WifiOffIcon className="w-4 h-4" />}
                  {isActive ? "거래 중" : "대기 중"}
                </span>
                <span>{testMode ? "🧪 테스트" : "💎 실전"}</span>
                <span>📊 {selectedCoinsCount}개 코인</span>
                <span className="text-yellow-300">
                  수익률: {formatPercent(portfolio?.performance?.totalReturn || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* 🎮 **빠른 액션 바** */}
        <div className="quick-actions bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {!isActive ? (
                <button
                  onClick={handleQuickStart}
                  disabled={!hasSelectedCoins}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white px-8 py-3 rounded-lg font-bold text-lg flex items-center gap-2 transition-all disabled:cursor-not-allowed"
                >
                  <PlayIcon className="w-5 h-5" />
                  페이퍼트레이딩 시작
                </button>
              ) : (
                <button
                  onClick={handleQuickStop}
                  className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-bold text-lg flex items-center gap-2 transition-all"
                >
                  <PauseIcon className="w-5 h-5" />
                  거래 중지
                </button>
              )}

              <button
                onClick={toggleTestMode}
                disabled={isActive}
                className={`px-4 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${testMode
                  ? "bg-yellow-100 text-yellow-800 border-2 border-yellow-300"
                  : "bg-purple-100 text-purple-800 border-2 border-purple-300"
                  }`}
              >
                <TestTubeIcon className="w-4 h-4" />
                {testMode ? "🧪 테스트 모드" : "💎 실전 모드"}
              </button>
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all"
            >
              <SettingsIcon className="w-4 h-4" />
              설정
            </button>
          </div>

          {/* 📊 **실시간 통계** */}
          <div className="stats-bar grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 pt-4 border-t">
            <div className="stat-item text-center">
              <div className="text-2xl font-bold text-blue-600">
                {monitoringStats?.tradesExecuted || 0}
              </div>
              <div className="text-sm text-gray-600">실행된 거래</div>
            </div>
            <div className="stat-item text-center">
              <div className="text-2xl font-bold text-green-600">
                {monitoringStats?.signalsGenerated || 0}
              </div>
              <div className="text-sm text-gray-600">생성된 신호</div>
            </div>
            <div className="stat-item text-center">
              <div className="text-2xl font-bold text-orange-600">
                {portfolio?.positions?.length || 0}
              </div>
              <div className="text-sm text-gray-600">보유 포지션</div>
            </div>
            <div className="stat-item text-center">
              <div className="text-2xl font-bold text-purple-600">
                {portfolio?.performance?.winRate?.toFixed(1) || 0}%
              </div>
              <div className="text-sm text-gray-600">승률</div>
            </div>
            <div className="stat-item text-center">
              <div className="text-2xl font-bold text-pink-600">
                {connectionStatus === 'connected' ? '🟢' : '⚫'}
                {connectionStatus}
              </div>
              <div className="text-sm text-gray-600">연결 상태</div>
            </div>
          </div>
        </div>

        {/* ⚙️ **설정 패널** (토글) */}
        {showSettings && (
          <div className="settings-panel bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">거래 설정</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <TradingSettings
              settings={tradingSettings}
              onSettingsChange={setTradingSettings}
              testMode={testMode}
            />
          </div>
        )}

        {/* 🎮 **탭 네비게이션** */}
        <div className="tabs-container bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="tab-nav flex overflow-x-auto bg-gray-50 border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-3 px-6 py-4 font-semibold whitespace-nowrap transition-all border-b-2 ${activeTab === tab.id
                    ? "bg-white text-blue-600 border-blue-500 shadow-sm"
                    : "text-gray-600 border-transparent hover:text-gray-900 hover:bg-gray-100"
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                  {tab.id === "control" && isActive && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 📄 **메인 콘텐츠** */}
          <div className="tab-content p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* 💡 **도움말 섹션** (코인 미선택 시) */}
        {!hasSelectedCoins && !isActive && (
          <div className="help-section bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-6 mt-6">
            <div className="flex items-start gap-4">
              <InfoIcon className="w-8 h-8 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-semibold text-blue-800 mb-3">
                  🚀 페이퍼트레이딩 시작 가이드
                </h3>
                <ol className="text-blue-700 space-y-2 text-lg">
                  <li><strong>1단계:</strong> "코인 관리" 탭에서 거래할 코인을 선택하세요</li>
                  <li><strong>2단계:</strong> "거래 제어" 탭에서 상세 설정을 확인하세요</li>
                  <li><strong>3단계:</strong> "🚀 페이퍼트레이딩 시작" 버튼을 클릭하세요</li>
                  <li><strong>4단계:</strong> 실시간 업비트 시세로 자동 거래가 시작됩니다!</li>
                </ol>
                <div className="mt-4 p-3 bg-white rounded-lg border border-blue-200">
                  <p className="text-blue-600 text-sm">
                    💡 <strong>참고:</strong> 테스트 모드에서는 거래 조건이 완화되어 더 많은 거래를 경험할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🎯 **활성 거래 알림** (거래 중일 때) */}
        {isActive && (
          <div className="active-trading-notice bg-green-50 border-2 border-green-200 rounded-lg p-4 mt-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-semibold text-green-800">
                🔄 실시간 페이퍼트레이딩 진행 중... ({selectedCoinsCount}개 코인 모니터링)
              </span>
              {lastSignal && (
                <span className="ml-auto text-sm text-green-600">
                  최신 신호: {lastSignal.symbol} {lastSignal.type} ({lastSignal.totalScore?.toFixed(1)}점)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperTrading;
