// src/components/features/testing/PaperTrading.jsx - 모던 디자인 개선 버전

import React, { useState, useEffect, useMemo } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { usePaperTrading } from "../../../hooks/usePaperTrading";

// 컴포넌트 imports
import CoinsTab from "./components/CoinsTab";
import OverviewTab from "./components/OverviewTab";
import PortfolioTab from "./components/PortfolioTab";
import TradesTab from "./components/TradesTab";
import SignalsTab from "./components/SignalsTab";
import LogsTab from "./components/LogsTab";
import TradingSettings from "./TradingSettings";

// 아이콘 imports (통일된 아이콘만 사용)
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
} from "lucide-react";

const PaperTrading = () => {
  // usePaperTrading 훅에서 모든 상태와 함수 가져오기
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

  // UI 상태
  const [activeTab, setActiveTab] = useState("overview");
  const [showSettings, setShowSettings] = useState(false);

  // 통합된 색상 시스템 (3가지 주요 색상만 사용)
  const colors = {
    primary: "slate", // 기본 색상
    success: "emerald", // 성공/활성
    danger: "red", // 위험/오류
    warning: "amber", // 경고
  };

  // 탭 정의 (색상 통일)
  const tabs = [
    { id: "overview", label: "대시보드", icon: MonitorIcon },
    { id: "coins", label: "코인 관리", icon: CoinsIcon },
    { id: "portfolio", label: "포트폴리오", icon: PieChartIcon },
    { id: "trades", label: "거래 내역", icon: ActivityIcon },
    { id: "signals", label: "신호", icon: ZapIcon },
    { id: "logs", label: "로그", icon: LineChartIcon },
  ];

  // 연결 상태 색상
  const getConnectionColor = () => {
    switch (connectionStatus) {
      case 'connected':
      case 'active':
        return 'text-emerald-500';
      case 'connecting':
        return 'text-amber-500';
      default:
        return 'text-slate-400';
    }
  };

  const handleSelectedCoinsChange = (newCoins) => {
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
  }

  // 탭 콘텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <OverviewTab
            portfolio={portfolio}
            isActive={isActive}
            connectionStatus={connectionStatus}
            performance={portfolio?.performance}
            lastSignal={lastSignal}
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
          />
        );
      case "portfolio":
        return (
          <PortfolioTab
            portfolio={portfolio}
            totalValue={portfolio?.totalValue}
          />
        );
      case "trades":
        return <TradesTab trades={portfolio?.trades || portfolio?.tradeHistory || []} />;
      case "signals":
        return <SignalsTab signals={logs || []} isActive={isActive} />;
      case "logs":
        return <LogsTab logs={logs} />;
      default:
        return <div className="text-center text-slate-500 py-8">탭을 선택하세요</div>;
    }
  };

  // 빠른 액션 핸들러
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
    <div className="min-h-screen bg-slate-50">
      {/* 통일된 헤더 */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">페이퍼 트레이딩</h1>
              <p className="text-slate-600 mt-1">실제 자금 없이 안전하게 거래 연습</p>
            </div>

            {/* 연결 상태 표시 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {connectionStatus === 'connected' ? (
                  <WifiIcon className="w-4 h-4 text-emerald-500" />
                ) : (
                  <WifiOffIcon className="w-4 h-4 text-slate-400" />
                )}
                <span className={`text-sm font-medium ${getConnectionColor()}`}>
                  {connectionStatus === 'connected' ? '연결됨' : '연결 안됨'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 통합된 상태 대시보드 */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* 총 자산 */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">총 자산</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(portfolio?.totalValue || 1840000)}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${(portfolio?.performance?.totalReturn || 0) >= 0
                ? 'bg-emerald-100'
                : 'bg-red-100'
                }`}>
                {(portfolio?.performance?.totalReturn || 0) >= 0 ? (
                  <TrendingUpIcon className="w-6 h-6 text-emerald-600" />
                ) : (
                  <TrendingDownIcon className="w-6 h-6 text-red-600" />
                )}
              </div>
            </div>
            <div className="mt-2">
              <span className={`text-sm font-medium ${(portfolio?.performance?.totalReturn || 0) >= 0
                ? 'text-emerald-600'
                : 'text-red-600'
                }`}>
                {formatPercent(portfolio?.performance?.totalReturn || 0)}
              </span>
              <span className="text-slate-500 text-sm"> 수익률</span>
            </div>
          </div>

          {/* 거래 상태 */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">거래 상태</p>
                <p className={`text-lg font-semibold ${isActive ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                  {isActive ? '활성' : '비활성'}
                </p>
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
            <div className="mt-2">
              <span className="text-sm text-slate-500">
                {testMode ? '테스트 모드' : '실전 모드'}
              </span>
            </div>
          </div>

          {/* 선택된 코인 */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">선택 코인</p>
                <p className="text-2xl font-bold text-slate-900">
                  {selectedCoinsCount}개
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-100">
                <CoinsIcon className="w-6 h-6 text-slate-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-slate-500">활성 모니터링</span>
            </div>
          </div>

          {/* 승률 */}
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">승률</p>
                <p className="text-2xl font-bold text-slate-900">
                  {(portfolio?.performance?.winRate || 0).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 rounded-lg bg-slate-100">
                <ZapIcon className="w-6 h-6 text-slate-600" />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-sm text-slate-500">
                {monitoringStats?.tradesExecuted || 0}회 거래
              </span>
            </div>
          </div>
        </div>

        {/* 통합된 제어 패널 */}
        <div className="bg-white rounded-lg border border-slate-200 mb-6">
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">거래 제어</h2>
              <div className="flex space-x-3">
                <button
                  onClick={toggleTestMode}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${testMode
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                >
                  {testMode ? '🧪 테스트 모드' : '💎 실전 모드'}
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="flex space-x-4">
              {!isActive ? (
                <button
                  onClick={handleQuickStart}
                  disabled={!hasSelectedCoins}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-all ${hasSelectedCoins
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    }`}
                >
                  <PlayIcon className="w-5 h-5" />
                  <span>거래 시작</span>
                </button>
              ) : (
                <button
                  onClick={handleQuickStop}
                  className="flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition-all"
                >
                  <PauseIcon className="w-5 h-5" />
                  <span>거래 중지</span>
                </button>
              )}

              <button
                onClick={refreshPriceAndAnalysis}
                className="px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                새로고침
              </button>
            </div>
          </div>
        </div>

        {/* 설정 패널 */}
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

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                      ? 'border-slate-900 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
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

        {/* 도움말 (코인 미선택 시) */}
        {!hasSelectedCoins && !isActive && (
          <div className="mt-6 bg-slate-100 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              🚀 페이퍼트레이딩 시작 가이드
            </h3>
            <div className="space-y-2 text-slate-600">
              <p><strong>1단계:</strong> "코인 관리" 탭에서 거래할 코인을 선택하세요</p>
              <p><strong>2단계:</strong> 필요시 설정 버튼으로 거래 전략을 조정하세요</p>
              <p><strong>3단계:</strong> "거래 시작" 버튼을 클릭하세요</p>
              <p><strong>4단계:</strong> 실시간 업비트 시세로 자동 거래가 시작됩니다!</p>
            </div>
          </div>
        )}

        {/* 활성 거래 알림 */}
        {isActive && (
          <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-emerald-800 font-medium">
                실시간 페이퍼트레이딩 진행 중 ({selectedCoinsCount}개 코인 모니터링)
              </p>
            </div>
            {lastSignal && (
              <p className="text-emerald-700 text-sm mt-2">
                최신 신호: {lastSignal.symbol} {lastSignal.type}
                ({(lastSignal.totalScore || 0).toFixed(1)}점)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperTrading;
