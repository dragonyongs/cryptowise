import React, { useState } from "react";
import { usePaperTrading } from "../../../hooks/usePaperTrading";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { paperTradingEngine } from "../../../services/testing/paperTradingEngine";
import TradingSettings from "./TradingSettings";
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
  BugIcon,
  ActivityIcon,
  PieChartIcon,
} from "lucide-react";

// Performance optimized log viewer
const LogViewer = React.memo(({ logs }) => (
  <div className="h-80 overflow-y-auto bg-slate-900 rounded-lg p-4">
    <div className="space-y-2">
      {logs.slice(0, 50).map((log) => (
        <div
          key={log.id}
          className={`text-sm p-3 rounded-md ${
            log.type === "success"
              ? "bg-emerald-500/10 text-emerald-400 border-l-2 border-emerald-500"
              : log.type === "error"
                ? "bg-red-500/10 text-red-400 border-l-2 border-red-500"
                : log.type === "warning"
                  ? "bg-amber-500/10 text-amber-400 border-l-2 border-amber-500"
                  : "bg-slate-700/50 text-slate-300 border-l-2 border-slate-600"
          }`}
        >
          <span className="font-mono text-xs text-slate-400">
            [{log.timestamp}]
          </span>{" "}
          <span className="ml-2">{log.message}</span>
        </div>
      ))}
    </div>
  </div>
));

const PaperTrading = () => {
  const {
    portfolio,
    isActive,
    isConnected,
    lastSignal,
    logs,
    monitoringStats,
    tradingMode,
    setTradingMode,
    tradingSettings,
    setTradingSettings,
    startPaperTrading,
    stopPaperTrading,
    resetPortfolio,
    hasSelectedCoins,
    debugMode,
    setDebugMode,
  } = usePaperTrading();

  const [activeTab, setActiveTab] = useState("portfolio");

  const handleStart = () => {
    if (tradingMode === "selected" && !hasSelectedCoins) {
      alert(
        "관심코인 모드에서는 메인 화면에서 코인을 관심등록한 후 시작해주세요."
      );
      return;
    }
    startPaperTrading();
  };

  const tabs = [
    {
      id: "portfolio",
      label: "Portfolio",
      icon: PieChartIcon,
    },
    { id: "signals", label: "Signals", icon: TrendingUpIcon },
    { id: "trades", label: "Trades", icon: BarChart3Icon },
    { id: "logs", label: "Logs", icon: ActivityIcon },
  ];

  // Warning message for no selected coins in selected mode
  if (tradingMode === "selected" && !hasSelectedCoins) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <HeartIcon className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                관심 코인이 선택되지 않았습니다
              </h2>
              <p className="text-slate-600 mb-6 leading-relaxed">
                관심코인 모드에서는 메인 화면에서 코인을 먼저 관심등록해주세요.
                <br />
                또는 전체코인 모드로 변경하여 상위 코인들로 테스트할 수
                있습니다.
              </p>
              <button
                onClick={() => setTradingMode("all")}
                className="inline-flex items-center px-6 py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                <GlobeIcon className="w-4 h-4 mr-2" />
                전체코인 모드로 변경
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 mb-1">
                Paper Trading
              </h1>
              <p className="text-slate-600">
                가상 투자로 전략을 테스트해보세요 (초기자본: ₩1,840,000)
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Trading mode toggle */}
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setTradingMode("selected")}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    tradingMode === "selected"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <HeartIcon className="w-4 h-4" />
                  <span>관심코인</span>
                </button>
                <button
                  onClick={() => setTradingMode("all")}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    tradingMode === "all"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <GlobeIcon className="w-4 h-4" />
                  <span>전체코인</span>
                </button>
              </div>

              {/* Status and controls */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <WifiIcon className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <WifiOffIcon className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm text-slate-600">
                    {isConnected ? "Connected" : "Disconnected"}
                  </span>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={debugMode}
                    onChange={(e) => setDebugMode(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                  />
                  <BugIcon className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-600">Debug</span>
                </label>

                <div className="flex gap-2">
                  {isActive ? (
                    <button
                      onClick={stopPaperTrading}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                    >
                      <PauseIcon className="w-4 h-4" />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={handleStart}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
                    >
                      <PlayIcon className="w-4 h-4" />
                      Start
                    </button>
                  )}
                  <button
                    onClick={resetPortfolio}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
                  >
                    <RefreshCwIcon className="w-4 h-4" />
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Settings */}
        <TradingSettings
          settings={tradingSettings}
          onSettingsChange={setTradingSettings}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              label: "데이터 수신",
              value: monitoringStats.dataReceived,
              icon: "📡",
            },
            {
              label: "신호 생성",
              value: monitoringStats.signalsGenerated,
              icon: "🎯",
            },
            {
              label: "거래 실행",
              value: monitoringStats.tradesExecuted,
              icon: "💼",
            },
            {
              label: "마지막 활동",
              value: monitoringStats.lastActivity || "-",
              icon: "⏱️",
            },
          ].map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-slate-600 font-medium text-sm mb-1">
                    {stat.label}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    {typeof stat.value === "number"
                      ? stat.value.toLocaleString()
                      : stat.value}
                  </div>
                </div>
                <div className="text-2xl opacity-60">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="border-b border-slate-200">
            <nav className="flex">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium text-sm transition-all relative ${
                      activeTab === tab.id
                        ? "text-slate-900 bg-slate-50"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-25"
                    }`}
                  >
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900" />
                    )}
                    <IconComponent className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "portfolio" && (
              <div className="space-y-6">
                {/* Portfolio Summary */}
                {portfolio && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                          <DollarSignIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-600 text-sm">
                            보유 현금
                          </h3>
                          <p className="text-2xl font-bold text-slate-900">
                            {formatCurrency(portfolio.krw)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <TrendingUpIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-600 text-sm">
                            총 자산
                          </h3>
                          <p className="text-2xl font-bold text-slate-900">
                            {formatCurrency(portfolio.totalValue)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            portfolio.performance.totalReturn >= 0
                              ? "bg-emerald-500"
                              : "bg-red-500"
                          }`}
                        >
                          {portfolio.performance.totalReturn >= 0 ? (
                            <TrendingUpIcon className="w-6 h-6 text-white" />
                          ) : (
                            <TrendingDownIcon className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-600 text-sm">
                            수익률
                          </h3>
                          <p
                            className={`text-2xl font-bold ${
                              portfolio.performance.totalReturn >= 0
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatPercent(portfolio.performance.totalReturn)}
                          </p>
                          <p className="text-sm text-slate-500">
                            승률: {formatPercent(portfolio.performance.winRate)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Holdings Table */}
                {portfolio?.coins?.length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200">
                      <h3 className="font-semibold text-slate-900">
                        보유 코인
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              종목
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              수량
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              평균단가
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              현재가치
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              수익률
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {portfolio.coins.map((coin, index) => (
                            <tr
                              key={index}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                                {coin.symbol}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                {coin.quantity.toFixed(8)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                {formatCurrency(coin.avgPrice)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                {formatCurrency(coin.currentValue)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                    coin.profitRate >= 0
                                      ? "bg-emerald-100 text-emerald-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {formatPercent(coin.profitRate)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "signals" && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-6">최근 신호</h3>
                {lastSignal ? (
                  <div className="space-y-4">
                    <div
                      className={`rounded-xl p-6 border ${
                        lastSignal.type === "BUY"
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h4 className="text-xl font-bold text-slate-900">
                              {lastSignal.symbol}
                            </h4>
                            <span
                              className={`px-3 py-1 rounded-md text-xs font-medium ${
                                lastSignal.type === "BUY"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {lastSignal.type}
                            </span>
                          </div>
                          <p className="text-slate-700 mb-4">
                            {lastSignal.reason}
                          </p>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <div className="text-sm text-slate-500 mb-1">
                                가격
                              </div>
                              <div className="font-semibold text-slate-900">
                                {formatCurrency(lastSignal.price)}
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <div className="text-sm text-slate-500 mb-1">
                                점수
                              </div>
                              <div className="font-semibold text-slate-900">
                                {lastSignal.totalScore?.toFixed(1)}/10
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <div className="text-sm text-slate-500 mb-1">
                                변동률
                              </div>
                              <div
                                className={`font-semibold ${
                                  lastSignal.changePercent >= 0
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }`}
                              >
                                {lastSignal.changePercent?.toFixed(2)}%
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-slate-200">
                              <div className="text-sm text-slate-500 mb-1">
                                전략
                              </div>
                              <div className="font-semibold text-slate-900">
                                {lastSignal.settings?.strategy || "default"}
                              </div>
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-slate-500 ml-4">
                          {lastSignal.timestamp?.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">📊</div>
                    <p className="text-slate-500">신호를 기다리는 중...</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "trades" && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-6">거래 내역</h3>
                {portfolio?.recentTrades?.length > 0 ? (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              시간
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              종목
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              구분
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              가격
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              수량
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              금액
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                              수익률
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {portfolio.recentTrades
                            .slice(0, 50)
                            .map((trade, index) => (
                              <tr
                                key={index}
                                className="hover:bg-slate-50 transition-colors"
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                                  {trade.timestamp?.toLocaleTimeString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">
                                  {trade.symbol}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                      trade.action === "BUY"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {trade.action}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                  {formatCurrency(trade.price)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                  {trade.quantity?.toFixed(8)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-slate-600">
                                  {formatCurrency(trade.amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {trade.profitRate ? (
                                    <span
                                      className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                                        trade.profitRate >= 0
                                          ? "bg-emerald-100 text-emerald-800"
                                          : "bg-red-100 text-red-800"
                                      }`}
                                    >
                                      {formatPercent(trade.profitRate)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-4">📈</div>
                    <p className="text-slate-500">거래 내역이 없습니다</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "logs" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-semibold text-slate-900">실시간 로그</h3>
                  <div className="text-sm text-slate-500">
                    최근 {logs.length}개 로그 (자동 업데이트)
                  </div>
                </div>
                <LogViewer logs={logs} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperTrading;
