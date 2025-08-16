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
} from "lucide-react";

// ✅ 성능 최적화된 로그 뷰어
const LogViewer = React.memo(({ logs }) => (
  <div className="h-64 overflow-y-auto bg-gray-50 rounded-lg p-3 border">
    <div className="space-y-1">
      {logs.slice(0, 50).map((log) => (
        <div
          key={log.id}
          className={`text-xs p-2 rounded border-l-2 ${
            log.type === "success"
              ? "bg-green-50 border-green-400 text-green-800"
              : log.type === "error"
                ? "bg-red-50 border-red-400 text-red-800"
                : log.type === "warning"
                  ? "bg-yellow-50 border-yellow-400 text-yellow-800"
                  : "bg-gray-50 border-gray-300 text-gray-700"
          }`}
        >
          <span className="font-mono text-gray-500">[{log.timestamp}]</span>{" "}
          {log.message}
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
    tradingMode, // ✅ 다시 추가
    setTradingMode, // ✅ 다시 추가
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
      label: "포트폴리오",
      icon: DollarSignIcon,
      color: "blue",
    },
    { id: "signals", label: "최근 신호", icon: TrendingUpIcon, color: "green" },
    { id: "trades", label: "거래 내역", icon: BarChart3Icon, color: "purple" },
    { id: "logs", label: "실시간 로그", icon: SettingsIcon, color: "gray" },
  ];

  // 관심코인이 없고 관심코인 모드일 때의 경고 메시지
  if (tradingMode === "selected" && !hasSelectedCoins) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-8 text-center shadow-lg">
          <div className="text-6xl mb-4">⚠️</div>
          <div className="text-yellow-700 text-xl font-semibold mb-2">
            관심 코인이 없습니다
          </div>
          <p className="text-gray-600 mb-6">
            관심코인 모드에서는 메인 화면에서 코인을 관심등록한 후 페이퍼
            트레이딩을 시작하세요
          </p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              또는 전체코인 모드로 변경하여 상위 코인들로 테스트해보세요
            </p>
            <button
              onClick={() => setTradingMode("all")}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              전체코인 모드로 변경
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              페이퍼 트레이딩
            </h1>
            <p className="text-gray-600">
              가상 투자로 전략을 테스트해보세요 (초기자본: 184만원)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* 거래 모드 선택 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTradingMode("selected")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  tradingMode === "selected"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <HeartIcon size={16} />
                <span>관심코인</span>
              </button>
              <button
                onClick={() => setTradingMode("all")}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  tradingMode === "all"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <GlobeIcon size={16} />
                <span>전체코인</span>
              </button>
            </div>

            {/* 상태 및 컨트롤 */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                {isConnected ? (
                  <WifiIcon size={16} className="text-green-500" />
                ) : (
                  <WifiOffIcon size={16} className="text-red-500" />
                )}
                <span className="text-sm text-gray-600">
                  {isConnected ? "연결됨" : "연결 끊김"}
                </span>
              </div>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={debugMode}
                  onChange={(e) => setDebugMode(e.target.checked)}
                  className="rounded"
                />
                <BugIcon size={16} className="text-gray-500" />
                <span className="text-sm">상세 로그</span>
              </label>

              <div className="flex space-x-2">
                {isActive ? (
                  <button
                    onClick={stopPaperTrading}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-md"
                  >
                    <PauseIcon size={16} />
                    <span>중지</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStart}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-md"
                  >
                    <PlayIcon size={16} />
                    <span>시작</span>
                  </button>
                )}
                <button
                  onClick={resetPortfolio}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-md"
                >
                  <RefreshCwIcon size={16} />
                  <span>리셋</span>
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
            color: "blue",
            icon: "📡",
          },
          {
            label: "신호 생성",
            value: monitoringStats.signalsGenerated,
            color: "green",
            icon: "🎯",
          },
          {
            label: "거래 실행",
            value: monitoringStats.tradesExecuted,
            color: "purple",
            icon: "💼",
          },
          {
            label: "마지막 활동",
            value: monitoringStats.lastActivity || "-",
            color: "gray",
            icon: "⏱️",
          },
        ].map((stat, index) => (
          <div
            key={index}
            className={`bg-gradient-to-br from-${stat.color}-50 to-${stat.color}-100 rounded-xl p-6 border border-${stat.color}-200 shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-${stat.color}-800 font-semibold text-sm`}>
                  {stat.label}
                </div>
                <div
                  className={`text-2xl font-bold text-${stat.color}-600 mt-1`}
                >
                  {typeof stat.value === "number"
                    ? stat.value.toLocaleString()
                    : stat.value}
                </div>
              </div>
              <div className="text-2xl">{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 font-medium text-sm transition-all ${
                    activeTab === tab.id
                      ? `border-b-2 border-${tab.color}-500 text-${tab.color}-600 bg-${tab.color}-50`
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <IconComponent size={18} />
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
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <DollarSignIcon size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-blue-800">
                          보유 현금
                        </h3>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatCurrency(portfolio.krw)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-green-500 rounded-lg">
                        <TrendingUpIcon size={24} className="text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-800">
                          총 자산
                        </h3>
                        <p className="text-2xl font-bold text-green-600">
                          {formatCurrency(portfolio.totalValue)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`bg-gradient-to-br rounded-xl p-6 border ${
                      portfolio.performance.totalReturn >= 0
                        ? "from-emerald-50 to-emerald-100 border-emerald-200"
                        : "from-red-50 to-red-100 border-red-200"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`p-2 rounded-lg ${
                          portfolio.performance.totalReturn >= 0
                            ? "bg-emerald-500"
                            : "bg-red-500"
                        }`}
                      >
                        {portfolio.performance.totalReturn >= 0 ? (
                          <TrendingUpIcon size={24} className="text-white" />
                        ) : (
                          <TrendingDownIcon size={24} className="text-white" />
                        )}
                      </div>
                      <div>
                        <h3
                          className={`font-semibold ${
                            portfolio.performance.totalReturn >= 0
                              ? "text-emerald-800"
                              : "text-red-800"
                          }`}
                        >
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
                        <p className="text-sm text-gray-600">
                          승률: {formatPercent(portfolio.performance.winRate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Holdings Table */}
              {portfolio?.coins?.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">보유 코인</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            종목
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            수량
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            평균단가
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            현재가치
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            수익률
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {portfolio.coins.map((coin, index) => (
                          <tr
                            key={index}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                              {coin.symbol}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                              {coin.quantity.toFixed(8)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                              {formatCurrency(coin.avgPrice)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                              {formatCurrency(coin.currentValue)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  coin.profitRate >= 0
                                    ? "bg-green-100 text-green-800"
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
              <h3 className="font-semibold text-gray-800 mb-6">최근 신호</h3>
              {lastSignal ? (
                <div className="space-y-4">
                  <div
                    className={`rounded-xl p-6 border-l-4 shadow-sm ${
                      lastSignal.type === "BUY"
                        ? "bg-green-50 border-green-500"
                        : "bg-red-50 border-red-500"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-xl font-bold text-gray-800">
                            {lastSignal.symbol} {lastSignal.type}
                          </h4>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              lastSignal.type === "BUY"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {lastSignal.type === "BUY" ? "매수" : "매도"}
                          </span>
                        </div>
                        <p className="text-gray-700 mb-4">
                          {lastSignal.reason}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-white rounded-lg p-3 border">
                            <div className="text-sm text-gray-500">가격</div>
                            <div className="font-semibold">
                              {formatCurrency(lastSignal.price)}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border">
                            <div className="text-sm text-gray-500">점수</div>
                            <div className="font-semibold">
                              {lastSignal.totalScore?.toFixed(1)}/10
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border">
                            <div className="text-sm text-gray-500">변동률</div>
                            <div
                              className={`font-semibold ${
                                lastSignal.changePercent >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {lastSignal.changePercent?.toFixed(2)}%
                            </div>
                          </div>
                          <div className="bg-white rounded-lg p-3 border">
                            <div className="text-sm text-gray-500">전략</div>
                            <div className="font-semibold">
                              {lastSignal.settings?.strategy || "default"}
                            </div>
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 ml-4">
                        {lastSignal.timestamp?.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📊</div>
                  <p>아직 신호가 없습니다</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "trades" && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-6">거래 내역</h3>
              {portfolio?.recentTrades?.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            시간
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            종목
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            구분
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            가격
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            수량
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            금액
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            수익률
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {portfolio.recentTrades
                          .slice(0, 50)
                          .map((trade, index) => (
                            <tr
                              key={index}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                {trade.timestamp?.toLocaleTimeString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                {trade.symbol}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    trade.action === "BUY"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {trade.action}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                {formatCurrency(trade.price)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                {trade.quantity?.toFixed(8)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                                {formatCurrency(trade.amount)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {trade.profitRate ? (
                                  <span
                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                      trade.profitRate >= 0
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {formatPercent(trade.profitRate)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">📈</div>
                  <p>거래 내역이 없습니다</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold text-gray-800">실시간 로그</h3>
                <div className="text-sm text-gray-500">
                  최근 {logs.length}개 로그 (자동 업데이트)
                </div>
              </div>
              <LogViewer logs={logs} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaperTrading;
