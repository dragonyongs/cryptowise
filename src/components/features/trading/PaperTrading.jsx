// src/components/features/testing/PaperTrading.jsx - 완전 수정 버전
import React, { useState, useEffect } from "react";
import { usePaperTrading } from "../../../hooks/usePaperTrading";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { ConnectionStatus } from "../../ui/ConnectionStatus";
import TradingSettings from "./TradingSettings";
import SentimentIndicator from "./SentimentIndicator";
import {
  PlayIcon, PauseIcon, RefreshCwIcon, TrendingUpIcon, TrendingDownIcon,
  DollarSignIcon, BarChart3Icon, SettingsIcon, EyeIcon, GlobeIcon,
  HeartIcon, WifiIcon, WifiOffIcon, BugIcon, ActivityIcon, PieChartIcon,
  CalendarIcon, RotateCcwIcon, ZapIcon, ArrowUpIcon, ArrowDownIcon,
  Cpu, ShieldCheckIcon, Lightbulb, ChevronDownIcon,
  MonitorIcon, ClockIcon, ServerIcon, SparklesIcon, TrendingUpIcon as TrendIcon
} from "lucide-react";

const LogViewer = React.memo(({ logs }) => (
  <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
    {logs.length === 0 ? (
      <div className="text-center py-12 text-gray-500">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100">
          <BugIcon className="h-12 w-12 mx-auto mb-4 text-blue-400" />
          <h3 className="font-semibold text-gray-700 mb-2">로그가 없습니다</h3>
          <p className="text-sm text-gray-500">거래를 시작해보세요</p>
        </div>
      </div>
    ) : (
      logs.map((log) => (
        <div
          key={`${log.id}-${log.timestamp?.getTime?.() || Date.now()}`}
          className={`p-4 rounded-xl text-sm border-l-4 transition-all duration-200 hover:shadow-md ${log.type === 'trade' ? 'bg-gradient-to-r from-blue-50 to-blue-25 border-blue-400 text-blue-800' :
            log.type === 'error' ? 'bg-gradient-to-r from-red-50 to-red-25 border-red-400 text-red-800' :
              log.type === 'sentiment' ? 'bg-gradient-to-r from-purple-50 to-purple-25 border-purple-400 text-purple-800' :
                log.type === 'success' ? 'bg-gradient-to-r from-green-50 to-green-25 border-green-400 text-green-800' :
                  log.type === 'warning' ? 'bg-gradient-to-r from-yellow-50 to-yellow-25 border-yellow-400 text-yellow-800' :
                    'bg-gradient-to-r from-gray-50 to-gray-25 border-gray-400 text-gray-700'
            }`}
        >
          <div className="flex justify-between items-start">
            <span className="flex-1 font-medium">{log.message}</span>
            <span className="text-xs opacity-75 ml-3 bg-white bg-opacity-50 px-2 py-1 rounded-full">
              {log.timestamp?.toLocaleTimeString?.() || new Date(log.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))
    )}
  </div>
));

export default function PaperTrading() {
  const {
    portfolio,
    isActive,
    isConnected,
    connectionStatus,
    lastSignal,
    logs,
    marketData,
    marketCondition,
    monitoringStats,
    selectedCoins,
    tradingMode,
    setTradingMode,
    tradingSettings,
    setTradingSettings,
    testMode,
    toggleTestMode,
    operationMode,
    setOperationMode,
    startPaperTrading,
    stopPaperTrading,
    updatePortfolio,
    reconnect,
    addLog,
    hasSelectedCoins,
    refreshMarketCondition,
    executeImmediateBatch,
    marketSentiment,
    sentimentLoading,
    fetchMarketSentiment,
    isDevelopment,
  } = usePaperTrading();

  const [activeTab, setActiveTab] = useState('overview');
  const [showSettings, setShowSettings] = useState(false);

  // ✅ 포트폴리오 데이터 실시간 업데이트
  useEffect(() => {
    if (isActive) {
      const interval = setInterval(updatePortfolio, 5000); // 5초마다 업데이트
      return () => clearInterval(interval);
    }
  }, [isActive, updatePortfolio]);

  // ✅ 정확한 잔고 계산
  const balance = React.useMemo(() => {
    if (!portfolio) {
      return {
        total: 1840000,
        invested: 0,
        available: 1840000,
        profitRate: 0,
        totalProfit: 0
      };
    }

    const invested = portfolio.positions?.reduce((sum, coin) => {
      return sum + (coin.quantity * coin.avgPrice);
    }, 0) || 0;

    const currentValue = portfolio.positions?.reduce((sum, coin) => {
      return sum + coin.currentValue;
    }, 0) || 0;

    const available = portfolio.totalValue - invested || (1840000 - invested);
    const totalProfit = currentValue - invested;
    const profitRate = invested > 0 ? (totalProfit / invested) : 0;

    return {
      total: portfolio.totalValue || 1840000,
      invested: invested,
      available: Math.max(0, available),
      profitRate: profitRate,
      totalProfit: totalProfit,
      currentValue: currentValue
    };
  }, [portfolio]);

  // 운영 모드 아이콘 매핑
  const getModeIcon = (mode) => {
    switch (mode) {
      case 'websocket': return <WifiIcon className="h-4 w-4" />;
      case 'scheduled': return <ClockIcon className="h-4 w-4" />;
      case 'polling': return <ServerIcon className="h-4 w-4" />;
      default: return <MonitorIcon className="h-4 w-4" />;
    }
  };

  const getModeColor = (mode) => {
    switch (mode) {
      case 'websocket': return 'bg-blue-500';
      case 'scheduled': return 'bg-green-500';
      case 'polling': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
        {/* ✅ 완전히 재정리된 헤더 섹션 */}
        <div className="bg-white shadow-lg border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-6">
            {/* 메인 타이틀 섹션 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                  <ActivityIcon className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-blue-800 bg-clip-text text-transparent">
                    페이퍼 트레이딩
                  </h1>
                  <p className="text-gray-600 mt-1 flex items-center space-x-2">
                    <span>가상 투자로 전략을 테스트해보세요</span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700 font-medium">
                      초기자본: ₩{balance.total.toLocaleString()}
                    </span>
                  </p>
                  {marketSentiment && (
                    <div className="flex items-center mt-2 space-x-2">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200">
                        <SparklesIcon className="h-4 w-4 mr-1" />
                        감정분석 연동
                      </div>
                      <div className="text-sm text-gray-500">
                        📊 {marketSentiment.sentimentPhase.replace('_', ' ').toUpperCase()} ({marketSentiment.fearGreedIndex}/100)
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 메인 액션 버튼 */}
              <button
                onClick={isActive ? stopPaperTrading : startPaperTrading}
                className={`px-8 py-3 rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg flex items-center space-x-3 ${isActive
                  ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                  }`}
              >
                {isActive ? (
                  <>
                    <PauseIcon className="h-5 w-5" />
                    <span>거래 중지</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-5 w-5" />
                    <span>거래 시작</span>
                  </>
                )}
              </button>
            </div>

            {/* ✅ 깔끔하게 정리된 컨트롤 그룹들 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 모드 및 설정 그룹 */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">운영 설정</h3>
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className={`p-2 rounded-lg transition-colors ${showSettings ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                      }`}
                  >
                    <SettingsIcon className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">모드</span>
                    <select
                      value={operationMode}
                      onChange={(e) => setOperationMode(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="websocket">실시간</option>
                      <option value="scheduled">스케줄</option>
                      <option value="polling">폴링</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">거래모드</span>
                    <select
                      value={tradingMode}
                      onChange={(e) => setTradingMode(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="favorites">관심코인</option>
                      <option value="top">상위코인</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 상태 및 분석 그룹 */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">시스템 상태</h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={fetchMarketSentiment}
                      disabled={sentimentLoading}
                      className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50"
                    >
                      {sentimentLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={refreshMarketCondition}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <RefreshCwIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getModeColor(operationMode)}`}></div>
                    <span className="text-sm text-gray-700 flex items-center">
                      {getModeIcon(operationMode)}
                      <span className="ml-1">
                        {operationMode === 'websocket' ? '실시간 연결' :
                          operationMode === 'scheduled' ? '스케줄 실행' : '폴링 모드'}
                      </span>
                    </span>
                    <ConnectionStatus isConnected={isConnected} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">거래모드</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${testMode ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                      {testMode ? '테스트' : '실전'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 통계 그룹 */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">실시간 통계</h3>
                  {isDevelopment && (
                    <button
                      onClick={executeImmediateBatch}
                      className="px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs font-medium"
                    >
                      🧪 테스트
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">데이터</span>
                    <span className="font-semibold text-blue-600">{monitoringStats.dataReceived}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">신호</span>
                    <span className="font-semibold text-green-600">{monitoringStats.signalsGenerated}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">거래</span>
                    <span className="font-semibold text-purple-600">{monitoringStats.tradesExecuted}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">거부</span>
                    <span className="font-semibold text-red-600">{monitoringStats.signalsRejected}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 경고 메시지 */}
            {!hasSelectedCoins && tradingMode === "favorites" && (
              <div className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-4 rounded-r-xl">
                <div className="flex items-center">
                  <LightBulbIcon className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-700 font-medium">
                      **관심코인 모드**에서는 메인 화면에서 코인을 먼저 관심등록해주세요.
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      또는 <button
                        onClick={() => setTradingMode("top")}
                        className="underline font-semibold hover:text-blue-800"
                      >**전체코인 모드**</button>로 변경하여 상위 코인들로 테스트할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 설정 패널 */}
            {showSettings && (
              <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <SettingsIcon className="h-5 w-5 mr-2" />
                    거래 설정
                  </h3>
                </div>
                <div className="p-6">
                  <TradingSettings
                    settings={tradingSettings}
                    onChange={setTradingSettings}
                    testMode={testMode}
                    onToggleTestMode={toggleTestMode}
                    tradingMode={tradingMode}
                    onTradingModeChange={setTradingMode}
                    marketCondition={marketCondition}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* ✅ 개선된 대시보드 카드 - 실제 데이터 반영 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* 총 자산 카드 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">총 자산</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(balance.total)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">전체 자산</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl">
                  <DollarSignIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {/* 투자 금액 카드 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">투자 금액</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(balance.invested)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">코인 보유분</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl">
                  <PieChartIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {/* 현금 잔액 카드 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">현금 잔액</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(balance.available)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">거래 가능</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-2xl">
                  <WifiIcon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>

            {/* 수익률 카드 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">수익률</p>
                  <p className={`text-2xl font-bold ${balance.profitRate >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {formatPercent(balance.profitRate)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {balance.profitRate >= 0 ? '+' : ''}{formatCurrency(balance.totalProfit)}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl ${balance.profitRate >= 0
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-red-500 to-pink-600'
                  }`}>
                  {balance.profitRate >= 0 ? (
                    <ArrowUpIcon className="h-6 w-6 text-white" />
                  ) : (
                    <ArrowDownIcon className="h-6 w-6 text-white" />
                  )}
                </div>
              </div>
            </div>

            {/* 시장 감정 카드 */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              {sentimentLoading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              ) : marketSentiment ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">시장 감정</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {marketSentiment.fearGreedIndex}/100
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {marketSentiment.sentimentPhase.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  <div className={`p-3 rounded-2xl text-2xl ${marketSentiment.fearGreedIndex < 25 ? 'bg-gradient-to-br from-red-500 to-pink-600' :
                    marketSentiment.fearGreedIndex < 75 ? 'bg-gradient-to-br from-yellow-500 to-orange-600' :
                      'bg-gradient-to-br from-green-500 to-emerald-600'
                    }`}>
                    <span className="text-white text-xl">
                      {marketSentiment.fearGreedIndex < 25 ? '😨' :
                        marketSentiment.fearGreedIndex < 75 ? '😐' : '🤑'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mx-auto w-fit mb-3">
                    <EyeIcon className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-600 mb-1">감정분석</p>
                  <button
                    onClick={fetchMarketSentiment}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                  >
                    분석 시작 →
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 탭 네비게이션 */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
            <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50">
              <nav className="flex space-x-8 px-6">
                {[
                  { id: 'overview', label: '개요', icon: BarChart3Icon },
                  { id: 'sentiment', label: '시장감정', icon: EyeIcon },
                  { id: 'portfolio', label: '포트폴리오', icon: PieChartIcon },
                  { id: 'history', label: '거래내역', icon: CalendarIcon },
                  { id: 'logs', label: '실시간 로그', icon: ActivityIcon }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-all duration-200 ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-8">
              {activeTab === 'overview' && (
                <div className="text-center py-16">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 w-fit mx-auto mb-6 shadow-lg">
                    <ZapIcon className="h-16 w-16 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    감정분석 통합 거래 시스템
                  </h3>
                  <p className="text-gray-600 max-w-2xl mx-auto mb-6">
                    기반 감정 분석과 기술적 지표를 결합하여 최적의 거래 타이밍을 찾아내는
                    차세대 페이퍼 트레이딩 시스템입니다.
                  </p>
                  {marketSentiment && (
                    <div className="inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 border border-purple-200">
                      <SparklesIcon className="h-5 w-5 text-purple-600 mr-2" />
                      <span className="text-purple-700 font-medium">
                        공포탐욕지수 {marketSentiment.fearGreedIndex} - {marketSentiment.sentimentPhase.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* 실시간 상태 표시 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 max-w-4xl mx-auto">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                      <Cpu className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                      <h4 className="font-semibold text-gray-900 mb-2">AI 감정 분석</h4>
                      <p className="text-sm text-gray-600 mb-2">공포탐욕지수 기반 역순환 매매</p>
                      {marketSentiment ? (
                        <p className="text-xs font-medium text-blue-600">
                          현재: {marketSentiment.fearGreedIndex}/100
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500">대기 중...</p>
                      )}
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                      <ShieldCheckIcon className="h-8 w-8 text-green-600 mx-auto mb-3" />
                      <h4 className="font-semibold text-gray-900 mb-2">리스크 관리</h4>
                      <p className="text-sm text-gray-600 mb-2">엄격한 조건 기반 신중한 거래</p>
                      <p className="text-xs font-medium text-green-600">
                        거래: {monitoringStats.tradesExecuted} | 거부: {monitoringStats.signalsRejected}
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                      <TrendIcon className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                      <h4 className="font-semibold text-gray-900 mb-2">실시간 분석</h4>
                      <p className="text-sm text-gray-600 mb-2">기술적 + 펀더멘탈 통합 분석</p>
                      <p className="text-xs font-medium text-purple-600">
                        신호: {monitoringStats.signalsGenerated} | 데이터: {monitoringStats.dataReceived}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'sentiment' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                      <EyeIcon className="h-6 w-6 mr-2 text-purple-600" />
                      AI 시장 감정 분석
                    </h3>
                    <SentimentIndicator
                      sentiment={marketSentiment}
                      loading={sentimentLoading}
                    />
                  </div>

                  {marketSentiment?.recommendation && (
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <Lightbulb className="h-5 w-5 mr-2 text-blue-600" />
                        AI 거래 추천
                      </h4>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-gray-700">{marketSentiment.recommendation.reason}</span>
                        <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${marketSentiment.recommendation.action.includes('BUY') ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                          marketSentiment.recommendation.action.includes('SELL') ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white' :
                            'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                          }`}>
                          {marketSentiment.recommendation.action}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        신뢰도: <span className="font-semibold">{(marketSentiment.recommendation.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}

                  {lastSignal?.sentimentAnalysis && (
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <ActivityIcon className="h-5 w-5 mr-2 text-purple-600" />
                        최근 신호의 감정분석
                      </h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">공포탐욕지수:</span>
                          <span className="ml-2 font-semibold">{lastSignal.sentimentAnalysis.fearGreedIndex}/100</span>
                        </div>
                        <div>
                          <span className="text-gray-600">감정 단계:</span>
                          <span className="ml-2 font-semibold">{lastSignal.sentimentAnalysis.phase.replace('_', ' ')}</span>
                        </div>
                        {lastSignal.sentimentAnalysis.bonus !== 0 && (
                          <div className="col-span-2">
                            <span className="text-gray-600">감정 보너스:</span>
                            <span className={`ml-2 font-semibold ${lastSignal.sentimentAnalysis.bonus > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {lastSignal.sentimentAnalysis.bonus > 0 ? '+' : ''}{lastSignal.sentimentAnalysis.bonus.toFixed(1)}점
                            </span>
                          </div>
                        )}
                        {lastSignal.sentimentAnalysis.reason && (
                          <div className="col-span-2">
                            <span className="text-gray-600">사유:</span>
                            <span className="ml-2 font-medium">{lastSignal.sentimentAnalysis.reason}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ✅ 개선된 포트폴리오 탭 - 실제 데이터 표시 */}
              {activeTab === 'portfolio' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <PieChartIcon className="h-6 w-6 mr-2 text-blue-600" />
                      포트폴리오 현황
                    </h3>
                    <div className="text-sm text-gray-500">
                      마지막 업데이트: {new Date().toLocaleTimeString()}
                    </div>
                  </div>

                  {!portfolio?.positions || portfolio.positions.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-6 w-fit mx-auto mb-6">
                        <PieChartIcon className="h-16 w-16 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">포트폴리오가 비어있습니다</h3>
                      <p className="text-gray-600 mb-4">거래가 실행되면 여기에 포트폴리오가 표시됩니다</p>
                      <div className="text-sm text-gray-500">
                        현재 실행된 거래: {monitoringStats.tradesExecuted}개
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* 포트폴리오 요약 */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-blue-50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{portfolio.positions.length}</div>
                          <div className="text-sm text-gray-600">보유 종목</div>
                        </div>
                        <div className="bg-green-50 rounded-xl p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(balance.currentValue)}
                          </div>
                          <div className="text-sm text-gray-600">현재 가치</div>
                        </div>
                        <div className="bg-purple-50 rounded-xl p-4 text-center">
                          <div className={`text-2xl font-bold ${balance.profitRate >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {formatPercent(balance.profitRate)}
                          </div>
                          <div className="text-sm text-gray-600">총 수익률</div>
                        </div>
                      </div>

                      {/* 포트폴리오 테이블 */}
                      <div className="overflow-hidden rounded-2xl border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                            <tr>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">종목</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">수량</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">평균단가</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">현재가치</th>
                              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">수익률</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {portfolio.positions.map((coin, index) => (
                              <tr key={`${coin.symbol}-${index}`} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <span className="text-sm font-semibold text-gray-900">{coin.symbol}</span>
                                    <span className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                                      {coin.tier || 'TIER3'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                  {coin.quantity.toFixed(8)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                  {formatCurrency(coin.avgPrice)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                  {formatCurrency(coin.currentValue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${coin.profitRate >= 0
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                    }`}>
                                    {coin.profitRate >= 0 ? (
                                      <ArrowUpIcon className="h-3 w-3 mr-1" />
                                    ) : (
                                      <ArrowDownIcon className="h-3 w-3 mr-1" />
                                    )}
                                    {formatPercent(coin.profitRate)}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ✅ 개선된 거래내역 탭 - 실제 데이터 표시 */}
              {activeTab === 'history' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <CalendarIcon className="h-6 w-6 mr-2 text-green-600" />
                      거래 내역
                    </h3>
                    <div className="text-sm text-gray-500">
                      총 {portfolio?.tradeHistory?.length || 0}건의 거래
                    </div>
                  </div>

                  {!portfolio?.tradeHistory || portfolio.tradeHistory.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 w-fit mx-auto mb-6">
                        <CalendarIcon className="h-16 w-16 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">거래 내역이 없습니다</h3>
                      <p className="text-gray-600 mb-4">거래가 실행되면 여기에 표시됩니다</p>
                      <div className="text-sm text-gray-500">
                        현재까지 실행된 거래: {monitoringStats.tradesExecuted}개
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-2xl border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">시간</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">종목</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">구분</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">가격</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">수량</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">금액</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">수익률</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {portfolio.tradeHistory
                            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                            .map((trade, index) => (
                              <tr key={`${trade.symbol}-${trade.timestamp}-${index}`} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                  {new Date(trade.timestamp).toLocaleTimeString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                  {trade.symbol}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${trade.action === 'BUY'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-orange-100 text-orange-800'
                                    }`}>
                                    {trade.action === 'BUY' ? '매수' : '매도'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                  {formatCurrency(trade.price)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                  {trade.quantity?.toFixed(8)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                                  {formatCurrency(trade.amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {trade.profitRate !== undefined && trade.profitRate !== null ? (
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${trade.profitRate >= 0
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                      }`}>
                                      {trade.profitRate >= 0 ? (
                                        <ArrowUpIcon className="h-3 w-3 mr-1" />
                                      ) : (
                                        <ArrowDownIcon className="h-3 w-3 mr-1" />
                                      )}
                                      {formatPercent(trade.profitRate)}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'logs' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center">
                      <ActivityIcon className="h-6 w-6 mr-2 text-blue-600" />
                      실시간 거래 로그
                    </h3>
                    <div className="text-sm text-gray-500">
                      총 {logs.length}개 로그
                    </div>
                  </div>
                  <LogViewer logs={logs} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
            `}</style>
    </>
  );
}
