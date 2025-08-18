// src/components/features/testing/PaperTrading.jsx - 완전 수정 버전

import React, { useState } from "react";
import { usePaperTrading } from "../../../hooks/usePaperTrading";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { ConnectionStatus } from "../../ui/ConnectionStatus";
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
  CalendarIcon,
  RotateCcwIcon,
  ZapIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "lucide-react";

// ✅ 성능 최적화된 로그 뷰어 (키 중복 방지)
const LogViewer = React.memo(({ logs }) => (
  <div className="bg-gray-50 rounded-lg p-4 h-80 overflow-y-auto font-mono text-sm">
    {logs.length === 0 ? (
      <div className="text-center text-gray-400 mt-8">
        <ActivityIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium">로그가 없습니다</p>
        <p className="text-sm">거래를 시작해보세요</p>
      </div>
    ) : (
      <div className="space-y-1">
        {logs.map((log) => (
          <div
            key={log.id} // ✅ 고유 ID 사용
            className={`flex items-start gap-2 p-2 rounded text-xs ${log.type === "error"
                ? "bg-red-100 text-red-800"
                : log.type === "warning"
                  ? "bg-yellow-100 text-yellow-800"
                  : log.type === "success"
                    ? "bg-green-100 text-green-800"
                    : log.type === "debug"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-blue-100 text-blue-800"
              }`}
          >
            <span className="text-gray-500 shrink-0 w-20">
              {log.timestamp}
            </span>
            <span className="flex-1">{log.message}</span>
          </div>
        ))}
      </div>
    )}
  </div>
));

const PaperTrading = () => {
  const {
    portfolio,
    isActive,
    isConnected,
    connectionStatus,
    lastSignal,
    logs,
    monitoringStats,
    selectedCoins,
    tradingMode,
    setTradingMode,
    topCoinsLimit,
    setTopCoinsLimit,
    tradingSettings,
    setTradingSettings,
    testMode,
    toggleTestMode,
    operationMode,
    setOperationMode,
    getOperationStatus,
    startPaperTrading,
    stopPaperTrading,
    updatePortfolio,
    reconnect,
    selectedCoinsCount,
    hasSelectedCoins,
    isDevelopment,
    executeImmediateBatch, // ✅ 추가된 함수
  } = usePaperTrading();

  const [showSettings, setShowSettings] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ✅ 모드별 아이콘 및 설명
  const getModeConfig = (mode) => {
    const configs = {
      websocket: {
        icon: <WifiIcon className="w-4 h-4" />,
        label: "실시간",
        description: "WebSocket 실시간 데이터",
        color: "text-blue-600",
        bgColor: "bg-blue-100",
      },
      polling: {
        icon: <RefreshCwIcon className="w-4 h-4" />,
        label: "폴링",
        description: "10초마다 API 호출",
        color: "text-orange-600",
        bgColor: "bg-orange-100",
      },
      scheduled: {
        icon: <CalendarIcon className="w-4 h-4" />,
        label: "스케줄",
        description: "하루 5회 자동 실행",
        color: "text-green-600",
        bgColor: "bg-green-100",
      },
    };
    return configs[mode] || configs.scheduled;
  };

  const currentModeConfig = getModeConfig(operationMode);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">페이퍼 트레이딩</h1>
          <p className="text-gray-600 mt-2">
            가상 투자로 전략을 테스트해보세요 • 초기자본: ₩1,840,000
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* 개발자 전용 즉시 배치 버튼 */}
          {isDevelopment && (
            <button
              onClick={executeImmediateBatch}
              disabled={!isActive}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              <ZapIcon className="w-4 h-4" />
              즉시 배치
            </button>
          )}

          {/* 연결 상태 */}
          <div className="flex items-center gap-2">
            <ConnectionStatus
              status={connectionStatus}
              reconnectAttempts={0}
            />
            <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${currentModeConfig.bgColor} ${currentModeConfig.color}`}>
              {currentModeConfig.icon}
              {currentModeConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* 경고 메시지 */}
      {tradingMode === "favorites" && !hasSelectedCoins && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg">
          <div className="flex items-start">
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                <strong>관심코인 모드</strong>에서는 메인 화면에서 코인을 먼저 관심등록해주세요.
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                또는 <strong>전체코인 모드</strong>로 변경하여 상위 코인들로 테스트할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 컨트롤 패널 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 거래 모드 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <GlobeIcon className="w-5 h-5" />
              거래 모드
            </h3>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="tradingMode"
                  value="favorites"
                  checked={tradingMode === "favorites"}
                  onChange={(e) => setTradingMode(e.target.value)}
                  className="text-blue-600"
                />
                <div className="flex items-center gap-2">
                  <HeartIcon className="w-4 h-4 text-red-500" />
                  <span className="font-medium">관심코인 ({selectedCoinsCount}개)</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="tradingMode"
                  value="top"
                  checked={tradingMode === "top"}
                  onChange={(e) => setTradingMode(e.target.value)}
                  className="text-blue-600"
                />
                <div className="flex items-center gap-2">
                  <BarChart3Icon className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">전체코인 상위 {topCoinsLimit}개</span>
                </div>
              </label>
            </div>

            {tradingMode === "top" && (
              <div className="mt-3">
                <input
                  type="range"
                  min="5"
                  max="20"
                  step="5"
                  value={topCoinsLimit}
                  onChange={(e) => setTopCoinsLimit(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>5개</span>
                  <span>20개</span>
                </div>
              </div>
            )}
          </div>

          {/* 운영 모드 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <ActivityIcon className="w-5 h-5" />
              운영 모드
            </h3>

            <div className="space-y-2">
              {["websocket", "polling", "scheduled"].map((mode) => {
                const config = getModeConfig(mode);
                return (
                  <label
                    key={mode}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="operationMode"
                      value={mode}
                      checked={operationMode === mode}
                      onChange={(e) => setOperationMode(e.target.value)}
                      className="text-blue-600"
                    />
                    <div className="flex items-center gap-2">
                      {config.icon}
                      <div>
                        <div className="font-medium">{config.label}</div>
                        <div className="text-xs text-gray-500">{config.description}</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 컨트롤 버튼들 */}
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">컨트롤</h3>

            <div className="space-y-3">
              <button
                onClick={isActive ? stopPaperTrading : startPaperTrading}
                disabled={tradingMode === "favorites" && !hasSelectedCoins}
                className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${isActive
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  }`}
              >
                {isActive ? (
                  <>
                    <PauseIcon className="w-5 h-5" />
                    중지
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    시작
                  </>
                )}
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-2"
              >
                <SettingsIcon className="w-4 h-4" />
                거래 설정
              </button>

              <div className="flex gap-2">
                <button
                  onClick={toggleTestMode}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${testMode
                      ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                      : "bg-gray-100 text-gray-600 border border-gray-300"
                    }`}
                >
                  <BugIcon className="w-4 h-4 inline mr-1" />
                  {testMode ? "테스트" : "일반"}
                </button>

                <button
                  onClick={reconnect}
                  disabled={operationMode === "scheduled"}
                  className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCwIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 거래 설정 패널 */}
      {showSettings && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <TradingSettings
            settings={tradingSettings}
            onChange={setTradingSettings}
            testMode={testMode}
          />
        </div>
      )}

      {/* 모니터링 통계 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "데이터 수신",
            value: monitoringStats.dataReceived,
            icon: <ActivityIcon className="w-5 h-5" />,
            color: "text-blue-600",
          },
          {
            label: "신호 평가",
            value: monitoringStats.signalsEvaluated,
            icon: <EyeIcon className="w-5 h-5" />,
            color: "text-purple-600",
          },
          {
            label: "신호 생성",
            value: monitoringStats.signalsGenerated,
            icon: <ZapIcon className="w-5 h-5" />,
            color: "text-yellow-600",
          },
          {
            label: "거래 실행",
            value: monitoringStats.tradesExecuted,
            icon: <DollarSignIcon className="w-5 h-5" />,
            color: "text-green-600",
          },
          {
            label: "조건 만족",
            value: monitoringStats.conditionsMet,
            icon: <BarChart3Icon className="w-5 h-5" />,
            color: "text-orange-600",
          },
          {
            label: "마지막 활동",
            value: monitoringStats.lastActivity || "-",
            icon: <RotateCcwIcon className="w-5 h-5" />,
            color: "text-gray-600",
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-white rounded-lg border border-gray-200 p-4 text-center"
          >
            <div className={`flex items-center justify-center mb-2 ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 포트폴리오 & 로그 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 포트폴리오 현황 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5" />
            포트폴리오 현황
          </h3>

          {portfolio ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-gray-600">총 자산</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(portfolio.totalValue)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">현금</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(portfolio.krw)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">수익률</div>
                  <div className={`text-lg font-bold ${portfolio.totalReturn >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                    {formatPercent(portfolio.totalReturn)}
                  </div>
                </div>
              </div>

              {/* 보유 종목 */}
              {portfolio.coins?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-800">보유 종목</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-2 font-medium">종목</th>
                          <th className="text-right p-2 font-medium">수량</th>
                          <th className="text-right p-2 font-medium">평균단가</th>
                          <th className="text-right p-2 font-medium">현재가치</th>
                          <th className="text-right p-2 font-medium">수익률</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.coins.map((coin) => (
                          <tr key={coin.symbol} className="border-t">
                            <td className="p-2 font-medium">{coin.symbol}</td>
                            <td className="p-2 text-right">{coin.quantity.toFixed(8)}</td>
                            <td className="p-2 text-right">{formatCurrency(coin.avgPrice)}</td>
                            <td className="p-2 text-right">{formatCurrency(coin.currentValue)}</td>
                            <td className={`p-2 text-right ${coin.profitRate >= 0 ? "text-green-600" : "text-red-600"
                              }`}>
                              {coin.profitRate >= 0 ? (
                                <ArrowUpIcon className="w-3 h-3 inline mr-1" />
                              ) : (
                                <ArrowDownIcon className="w-3 h-3 inline mr-1" />
                              )}
                              {formatPercent(coin.profitRate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              <DollarSignIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>거래가 활성화되면 포트폴리오가 표시됩니다</p>
            </div>
          )}
        </div>

        {/* 실시간 로그 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ActivityIcon className="w-5 h-5" />
            실시간 로그
            <span className="ml-auto text-sm text-gray-500">
              {logs.length}/50
            </span>
          </h3>

          <LogViewer logs={logs} />
        </div>
      </div>

      {/* 최근 신호 */}
      {lastSignal && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ZapIcon className="w-5 h-5" />
            최근 신호
          </h3>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${lastSignal.type === "BUY"
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                  }`}>
                  {lastSignal.type}
                </span>
                <span className="font-bold">{lastSignal.symbol}</span>
                <span className="text-sm text-gray-600">
                  {lastSignal.confidence} 신뢰도
                </span>
              </div>
              <div className="text-sm text-gray-500">
                {lastSignal.timestamp?.toLocaleTimeString()}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-600">가격</div>
                <div className="font-medium">{formatCurrency(lastSignal.price)}</div>
              </div>
              <div>
                <div className="text-gray-600">변동률</div>
                <div className={`font-medium ${lastSignal.changePercent >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                  {lastSignal.changePercent >= 0 ? "+" : ""}{lastSignal.changePercent}%
                </div>
              </div>
              <div>
                <div className="text-gray-600">총점</div>
                <div className="font-medium">{lastSignal.totalScore}</div>
              </div>
              <div>
                <div className="text-gray-600">RSI</div>
                <div className="font-medium">
                  {lastSignal.technicalAnalysis?.rsi?.toFixed(1)}
                </div>
              </div>
            </div>

            <div className="mt-3 p-2 bg-white rounded text-xs text-gray-700">
              {lastSignal.reason}
            </div>
          </div>
        </div>
      )}

      {/* 거래 내역 */}
      {portfolio?.trades?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3Icon className="w-5 h-5" />
            거래 내역
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium">시간</th>
                  <th className="text-left p-3 font-medium">종목</th>
                  <th className="text-center p-3 font-medium">구분</th>
                  <th className="text-right p-3 font-medium">가격</th>
                  <th className="text-right p-3 font-medium">수량</th>
                  <th className="text-right p-3 font-medium">금액</th>
                  <th className="text-right p-3 font-medium">수익률</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.trades.slice(0, 10).map((trade, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-3 text-gray-600">
                      {trade.timestamp?.toLocaleTimeString()}
                    </td>
                    <td className="p-3 font-medium">{trade.symbol}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${trade.action === 'BUY'
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                        }`}>
                        {trade.action === 'BUY' ? '매수' : '매도'}
                      </span>
                    </td>
                    <td className="p-3 text-right">{formatCurrency(trade.price)}</td>
                    <td className="p-3 text-right">{trade.quantity?.toFixed(8)}</td>
                    <td className="p-3 text-right">{formatCurrency(trade.amount)}</td>
                    <td className="p-3 text-right">
                      {trade.profitRate ? (
                        <span className={`px-2 py-1 rounded-full text-xs ${trade.profitRate >= 0
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                          }`}>
                          {trade.profitRate >= 0 ? (
                            <ArrowUpIcon className="w-3 h-3 inline mr-1" />
                          ) : (
                            <ArrowDownIcon className="w-3 h-3 inline mr-1" />
                          )}
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

          {portfolio.trades.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <BarChart3Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>거래가 실행되면 여기에 표시됩니다</p>
            </div>
          )}
        </div>
      )}

      {/* 도움말 */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          💡 페이퍼 트레이딩이란?
        </h3>
        <p className="text-blue-800 text-sm leading-relaxed">
          실제 돈을 사용하지 않고 가상의 자금으로 거래를 시뮬레이션하는 기능입니다.
          거래 시스템의 실시간 활동을 모니터링할 수 있습니다.
        </p>
      </div>
    </div>
  );
};

export default PaperTrading;
