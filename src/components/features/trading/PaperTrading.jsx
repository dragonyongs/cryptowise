// src/components/features/testing/PaperTrading.jsx - 완전 개선된 UI 버전 (다크모드 + 테스트 모드 + 상위 코인 선별)

import React, { useState, useEffect } from "react";
import { usePaperTrading } from "../../../hooks/usePaperTrading";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { ConnectionStatus } from "../../ui/ConnectionStatus";
import TradingSettings from "./TradingSettings";
import SentimentIndicator from "./SentimentIndicator";
import {
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  BarChart3Icon,
  SettingsIcon,
  EyeIcon,
  GlobeIcon,
  HeartIcon,
  WifiIcon,
  WifiOffIcon,
  TestTubeIcon,
  ActivityIcon,
  PieChartIcon,
  CalendarIcon,
  RotateCcwIcon,
  ZapIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CpuIcon,
  ShieldCheckIcon,
  LightbulbIcon,
  ChevronDownIcon,
  MonitorIcon,
  ClockIcon,
  ServerIcon,
  SparklesIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  StarIcon,
  TrendingUpIcon as TrendIcon,
  CoinsIcon,
  TargetIcon
} from "lucide-react";

// ✅ 로그 뷰어 컴포넌트 (다크모드 적용)
const LogViewer = React.memo(({ logs }) => (
  <div className="h-64 overflow-y-auto bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
    {logs.length === 0 ? (
      <div className="text-center text-gray-500 dark:text-gray-400 py-8">
        <ActivityIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>거래 로그가 표시됩니다</p>
      </div>
    ) : (
      <div className="space-y-2">
        {logs.slice(-50).reverse().map((log, index) => (
          <div
            key={index}
            className={`p-2 rounded text-sm font-mono ${log.level === 'error'
              ? 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 border-l-2 border-red-500'
              : log.level === 'warning'
                ? 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-200 border-l-2 border-orange-500'
                : log.level === 'success'
                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 border-l-2 border-green-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-l-2 border-blue-500'
              }`}
          >
            <span className="text-xs opacity-75 mr-2">
              {new Date(log.timestamp || Date.now()).toLocaleTimeString()}
            </span>
            {log.message}
          </div>
        ))}
      </div>
    )}
  </div>
));

// ✅ 메인 PaperTrading 컴포넌트
const PaperTrading = () => {
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
    marketSentiment,
    sentimentLoading,
    selectedCoins,
    tradingMode,
    setTradingMode,
    topCoinsLimit,
    setTopCoinsLimit,
    tradingSettings,
    setTradingSettings,
    testMode,
    operationMode,
    setOperationMode,
    startPaperTrading,
    stopPaperTrading,
    updatePortfolio,
    reconnect,
    addLog,
    toggleTestMode,
    refreshMarketCondition,
    fetchMarketSentiment,
    selectedCoinsCount,
    hasSelectedCoins,
    isDevelopment
  } = usePaperTrading();

  // 로컬 상태
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCoinsPreview, setSelectedCoinsPreview] = useState([]);

  // ✅ 포트폴리오 잔액 계산
  const getBalance = () => {
    if (!portfolio || !portfolio.coins) {
      return {
        total: 1840000,
        invested: 0,
        available: 1840000,
        profitRate: 0,
        totalProfit: 0
      };
    }

    const invested = Object.values(portfolio.coins).reduce((sum, coin) => sum + coin.totalValue, 0);
    const available = portfolio.krw || 0;
    const total = invested + available;
    const totalProfit = total - 1840000;
    const profitRate = (totalProfit / 1840000) * 100;

    return {
      total,
      invested,
      available,
      profitRate,
      totalProfit
    };
  };

  const balance = getBalance();

  // ✅ 상위 코인 미리보기 업데이트
  useEffect(() => {
    if (tradingMode === "top" && marketData.size > 0) {
      const topCoins = Array.from(marketData.keys())
        .filter(symbol => {
          const data = marketData.get(symbol);
          return data && data.acc_trade_price_24h > 1000000000;
        })
        .sort((a, b) => {
          const dataA = marketData.get(a);
          const dataB = marketData.get(b);
          const scoreA = Math.log10(dataA?.acc_trade_price_24h || 1) * Math.abs(dataA?.signed_change_rate || 0) * 100;
          const scoreB = Math.log10(dataB?.acc_trade_price_24h || 1) * Math.abs(dataB?.signed_change_rate || 0) * 100;
          return scoreB - scoreA;
        })
        .slice(0, topCoinsLimit)
        .map(symbol => ({
          symbol,
          data: marketData.get(symbol)
        }));

      setSelectedCoinsPreview(topCoins);
    }
  }, [tradingMode, topCoinsLimit, marketData]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6">
        {/* ✅ 헤더 - 완전한 다크모드 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <PieChartIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  {testMode && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full flex items-center justify-center">
                      <TestTubeIcon className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    페이퍼 트레이딩
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    감정분석 기반 가상 투자 시스템
                    {testMode && <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium">🧪 테스트 모드</span>}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* ✅ 테스트 모드 토글 버튼 */}
              <button
                onClick={toggleTestMode}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${testMode
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white border-orange-400 shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600'
                  }`}
                title={testMode ? "실전 모드로 전환" : "테스트 모드로 전환"}
              >
                {testMode ? (
                  <>
                    <TestTubeIcon className="w-4 h-4" />
                    <span>테스트</span>
                    <SparklesIcon className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="w-4 h-4" />
                    <span>실전</span>
                  </>
                )}
              </button>

              {/* 연결 상태 */}
              <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${isConnected
                ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}>
                {isConnected ? <WifiIcon className="w-4 h-4" /> : <WifiOffIcon className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {isConnected ? '연결됨' : '연결 끊김'}
                </span>
              </div>

              {/* 설정 버튼 */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                <SettingsIcon className="w-4 h-4" />
                <span>설정</span>
                <ChevronDownIcon className={`w-4 h-4 transform transition-transform ${showSettings ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>

          {/* ✅ 설정 패널 */}
          {showSettings && (
            <div className="mb-6">
              <TradingSettings
                settings={tradingSettings}
                onChange={setTradingSettings}
                testMode={testMode}
                marketCondition={marketCondition}
                onToggleTestMode={toggleTestMode}
                tradingMode={tradingMode}
                onTradingModeChange={setTradingMode}
                topCoinsLimit={topCoinsLimit}
                onTopCoinsLimitChange={setTopCoinsLimit}
              />
            </div>
          )}
        </div>

        {/* ✅ 트레이딩 모드 선택 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => setTradingMode("favorites")}
            className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${tradingMode === "favorites"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
              }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className={`p-2 rounded-lg ${tradingMode === "favorites"
                ? "bg-blue-100 dark:bg-blue-800"
                : "bg-gray-100 dark:bg-gray-700"
                }`}>
                <HeartIcon className={`w-6 h-6 ${tradingMode === "favorites"
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-600 dark:text-gray-400"
                  }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">관심 코인 모드</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">직접 선택한 코인들로만 거래</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                현재 {selectedCoinsCount}개 코인 선택
              </span>
              {!hasSelectedCoins && (
                <span className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full">
                  코인 추가 필요
                </span>
              )}
            </div>
          </button>

          <button
            onClick={() => setTradingMode("top")}
            className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${tradingMode === "top"
              ? "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg"
              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md"
              }`}
          >
            <div className="flex items-center space-x-3 mb-3">
              <div className={`p-2 rounded-lg ${tradingMode === "top"
                ? "bg-green-100 dark:bg-green-800"
                : "bg-gray-100 dark:bg-gray-700"
                }`}>
                <TrendingUpIcon className={`w-6 h-6 ${tradingMode === "top"
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-600 dark:text-gray-400"
                  }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">상위 코인 모드</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">성과 기준 상위 {topCoinsLimit}개 자동선별</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                거래량 × 모멘텀 기준
              </span>
              <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                실시간 업데이트
              </span>
            </div>
          </button>
        </div>

        {/* ✅ 상위 코인 미리보기 (top 모드일 때만) */}
        {tradingMode === "top" && selectedCoinsPreview.length > 0 && (
          <div className="mb-8 p-6 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl">
            <div className="flex items-center space-x-2 mb-4">
              <TargetIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                선별된 상위 {topCoinsLimit}개 코인
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {selectedCoinsPreview.map((coin, index) => (
                <div key={coin.symbol} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-900 dark:text-white">{coin.symbol}</span>
                    <span className="text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 px-1 rounded">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <div className={`${coin.data?.signed_change_rate >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {coin.data?.signed_change_rate >= 0 ? '+' : ''}{(coin.data?.signed_change_rate * 100 || 0).toFixed(2)}%
                    </div>
                    <div className="text-xs mt-1">
                      ₩{(coin.data?.trade_price || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ✅ 시작/중지 버튼 */}
        <div className="mb-8">
          {!isActive ? (
            <div className="text-center">
              <div className="mb-6 p-8 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-2xl border border-blue-200 dark:border-blue-800">
                <PieChartIcon className="w-16 h-16 text-blue-600 dark:text-blue-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  거래를 시작해보세요
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  가상 투자로 전략을 테스트해보세요
                </p>
                <div className="text-sm text-gray-500 dark:text-gray-500">
                  초기자본: <span className="font-bold text-blue-600 dark:text-blue-400">₩{balance.total.toLocaleString()}</span>
                </div>
              </div>

              {marketSentiment && (
                <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                  <SentimentIndicator sentiment={marketSentiment} />
                </div>
              )}

              {/* 시작 전 알림 */}
              {tradingMode === "favorites" && !hasSelectedCoins && (
                <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangleIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <div className="text-orange-800 dark:text-orange-200">
                      <p className="font-medium">**관심코인 모드**에서는 메인 화면에서 코인을 먼저 관심등록해주세요.</p>
                      <p className="text-sm mt-1">
                        또는 <button
                          onClick={() => setTradingMode("top")}
                          className="underline font-medium hover:text-orange-600 dark:hover:text-orange-300"
                        >
                          상위 코인 모드
                        </button>로 변경하여 상위 코인들로 테스트할 수 있습니다.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={startPaperTrading}
                disabled={tradingMode === "favorites" && !hasSelectedCoins}
                className="group flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold text-lg rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlayIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                <span>페이퍼 트레이딩 시작</span>
                {testMode && <TestTubeIcon className="w-5 h-5" />}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="relative">
                    <ActivityIcon className="w-8 h-8 text-green-600 dark:text-green-400 animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                  </div>
                  <h2 className="text-2xl font-bold text-green-900 dark:text-green-100">
                    트레이딩 활성 상태
                  </h2>
                </div>
                <p className="text-green-700 dark:text-green-300 mb-4">
                  감정분석 기반 감정 분석과 기술적 지표를 결합하여 최적의 거래 타이밍을 찾아내는 차세대 페이퍼 트레이딩 시스템입니다.
                </p>

                {marketSentiment && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-center space-x-2 mb-2">
                        <PieChartIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <span className="font-medium text-gray-900 dark:text-white">공포탐욕지수 기반 역순환 매매</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {marketSentiment ? (
                          <>현재: <span className="font-bold">{marketSentiment.fearGreedIndex}/100</span></>
                        ) : (
                          '대기 중...'
                        )}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-center space-x-2 mb-2">
                        <ShieldCheckIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <span className="font-medium text-gray-900 dark:text-white">엄격한 조건 기반 신중한 거래</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        거래: {monitoringStats.tradesExecuted} | 거부: {monitoringStats.signalsRejected}
                      </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700">
                      <div className="flex items-center space-x-2 mb-2">
                        <BarChart3Icon className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <span className="font-medium text-gray-900 dark:text-white">기술적 + 펀더멘탈 통합 분석</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        신호: {monitoringStats.signalsGenerated} | 데이터: {monitoringStats.dataReceived}
                      </p>
                    </div>
                  </div>
                )}

                <button
                  onClick={stopPaperTrading}
                  className="flex items-center space-x-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors shadow-md hover:shadow-lg"
                >
                  <PauseIcon className="w-5 h-5" />
                  <span>거래 중지</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ✅ 대시보드 탭 */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-200 dark:bg-gray-800 p-1 rounded-xl">
            {[
              { id: 'overview', name: '개요', icon: PieChartIcon },
              { id: 'portfolio', name: '포트폴리오', icon: CoinsIcon },
              { id: 'trades', name: '거래내역', icon: BarChart3Icon },
              { id: 'logs', name: '로그', icon: MonitorIcon }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center ${activeTab === tab.id
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ✅ 탭 컨텐츠 */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 총 자산 카드 */}
            <div className="lg:col-span-1 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">총 자산</h3>
                <DollarSignIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-1">
                {formatCurrency(balance.total)}
              </div>
              <div className="text-xs text-blue-700 dark:text-blue-300">전체 자산</div>
            </div>

            {/* 투자 금액 카드 */}
            <div className="lg:col-span-1 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 p-6 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">투자 금액</h3>
                <TrendingUpIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100 mb-1">
                {formatCurrency(balance.invested)}
              </div>
              <div className="text-xs text-green-700 dark:text-green-300">코인 보유분</div>
            </div>

            {/* 현금 잔액 카드 */}
            <div className="lg:col-span-1 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">현금 잔액</h3>
                <DollarSignIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                {formatCurrency(balance.available)}
              </div>
              <div className="text-xs text-gray-700 dark:text-gray-300">거래 가능</div>
            </div>

            {/* 수익률 카드 */}
            <div className={`lg:col-span-1 p-6 rounded-xl border ${balance.profitRate >= 0
              ? 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 border-green-200 dark:border-green-800'
              : 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800'
              }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-medium ${balance.profitRate >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                  }`}>
                  수익률
                </h3>
                {balance.profitRate >= 0 ? (
                  <ArrowUpIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <ArrowDownIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className={`text-2xl font-bold mb-1 ${balance.profitRate >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'
                }`}>
                {formatPercent(balance.profitRate)}
              </div>
              <div className={`text-xs ${balance.profitRate >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                }`}>
                {balance.profitRate >= 0 ? '+' : ''}{formatCurrency(balance.totalProfit)}
              </div>
            </div>
          </div>
        )}

        {/* ✅ 시장 감정 섹션 (overview 탭) */}
        {activeTab === 'overview' && marketSentiment && (
          <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 rounded-xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-800 rounded-lg">
                <ActivityIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100">시장 감정</h3>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  {marketSentiment.fearGreedIndex}/100 - {marketSentiment.sentimentPhase.replace('_', ' ').toUpperCase()}
                </p>
              </div>
            </div>
            <SentimentIndicator sentiment={marketSentiment} />
            <div className="mt-4 text-sm text-purple-800 dark:text-purple-200">
              <p>감정분석 기반 감정 분석과 기술적 지표를 결합하여 최적의 거래 타이밍을 찾아내는 차세대 페이퍼 트레이딩 시스템입니다.</p>
            </div>

            {marketSentiment && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">공포탐욕지수 기반 역순환 매매</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {marketSentiment ? (
                      <>현재: <span className="font-bold text-purple-600 dark:text-purple-400">{marketSentiment.fearGreedIndex}/100</span></>
                    ) : (
                      '대기 중...'
                    )}
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">엄격한 조건 기반 신중한 거래</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    거래: {monitoringStats.tradesExecuted} | 거부: {monitoringStats.signalsRejected}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ✅ 포트폴리오 탭 */}
        {activeTab === 'portfolio' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">포트폴리오</h3>
            </div>
            <div className="p-6">
              {!portfolio || !portfolio.coins || Object.keys(portfolio.coins).length === 0 ? (
                <div className="text-center py-12">
                  <CoinsIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">거래가 실행되면 여기에 포트폴리오가 표시됩니다</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">첫 거래를 시작해보세요!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">종목</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">수량</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">평균단가</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">현재가치</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">수익률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(portfolio.coins).map(([symbol, coin]) => (
                        <tr key={symbol} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="font-bold text-gray-900 dark:text-white">{coin.symbol}</div>
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                {coin.tier || 'TIER3'}
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-right text-gray-700 dark:text-gray-300">
                            {coin.quantity.toFixed(8)}
                          </td>
                          <td className="py-4 px-4 text-right text-gray-700 dark:text-gray-300">
                            {formatCurrency(coin.avgPrice)}
                          </td>
                          <td className="py-4 px-4 text-right font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(coin.currentValue)}
                          </td>
                          <td className="py-4 px-4 text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${coin.profitRate >= 0 ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200" : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                              }`}>
                              {coin.profitRate >= 0 ? (
                                <ArrowUpIcon className="w-3 h-3 mr-1" />
                              ) : (
                                <ArrowDownIcon className="w-3 h-3 mr-1" />
                              )}
                              {formatPercent(coin.profitRate)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ 거래내역 탭 */}
        {activeTab === 'trades' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">거래내역</h3>
            </div>
            <div className="p-6">
              {!portfolio || !portfolio.trades || portfolio.trades.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3Icon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg">거래가 실행되면 여기에 표시됩니다</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">시간</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">종목</th>
                        <th className="text-center py-3 px-4 font-semibold text-gray-900 dark:text-white">구분</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">가격</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">수량</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">금액</th>
                        <th className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">수익률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.trades.slice().reverse().map((trade, index) => (
                        <tr key={index} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="py-4 px-4 text-sm text-gray-600 dark:text-gray-400">
                            {new Date(trade.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="py-4 px-4 font-semibold text-gray-900 dark:text-white">
                            {trade.symbol}
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${trade.action === 'BUY'
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                              : 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
                              }`}>
                              {trade.action === 'BUY' ? '매수' : '매도'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right text-gray-700 dark:text-gray-300">
                            {formatCurrency(trade.price)}
                          </td>
                          <td className="py-4 px-4 text-right text-gray-700 dark:text-gray-300">
                            {trade.quantity?.toFixed(8)}
                          </td>
                          <td className="py-4 px-4 text-right font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(trade.amount)}
                          </td>
                          <td className="py-4 px-4 text-right">
                            {trade.profitRate !== undefined && trade.profitRate !== null ? (
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${trade.profitRate >= 0 ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200" : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200"
                                }`}>
                                {trade.profitRate >= 0 ? (
                                  <ArrowUpIcon className="w-3 h-3 mr-1" />
                                ) : (
                                  <ArrowDownIcon className="w-3 h-3 mr-1" />
                                )}
                                {formatPercent(trade.profitRate)}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ 로그 탭 */}
        {activeTab === 'logs' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">실시간 로그</h3>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>성공</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span>경고</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>오류</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>정보</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <LogViewer logs={logs} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperTrading;
