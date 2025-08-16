import React, { useState } from "react";
import { usePaperTrading } from "../../../hooks/usePaperTrading";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { paperTradingEngine } from "../../../services/testing/paperTradingEngine";
import TradingSettings from "./TradingSettings"; // ✅ 새로 추가

// ✅ 성능 최적화된 로그 뷰어 추가
const LogViewer = React.memo(({ logs }) => (
  <div className="h-64 overflow-y-auto bg-gray-50 rounded p-3">
    <div className="space-y-1">
      {logs.slice(0, 50).map((log) => (
        <div
          key={log.id}
          className={`text-xs p-2 rounded ${
            log.type === "success"
              ? "bg-green-100 text-green-800"
              : log.type === "error"
                ? "bg-red-100 text-red-800"
                : log.type === "warning"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-gray-100 text-gray-700"
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
    tradingMode,
    setTradingMode,
    tradingSettings, // ✅ 새로 추가
    setTradingSettings, // ✅ 새로 추가
    startPaperTrading,
    stopPaperTrading,
    resetPortfolio,
    hasSelectedCoins,
    debugMode,
    setDebugMode,
  } = usePaperTrading();

  const [activeTab, setActiveTab] = useState("portfolio");

  const handleStart = () => {
    if (!hasSelectedCoins) {
      alert("메인 화면에서 코인을 관심등록한 후 시작해주세요.");
      return;
    }
    startPaperTrading();
  };

  if (!hasSelectedCoins) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <div className="text-yellow-600 mb-2">⚠️ 관심 코인이 없습니다</div>
          <p className="text-gray-600">
            메인 화면에서 코인을 관심등록한 후 페이퍼 트레이딩을 시작하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              페이퍼 트레이딩
            </h1>
            <p className="text-gray-600">
              가상 투자로 전략을 테스트해보세요 (초기자본: 184만원)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span className="text-sm text-gray-600">
                {isConnected ? "연결됨" : "연결 끊김"}
              </span>
            </div>

            {/* ✅ 디버그 모드 토글 */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">상세 로그</span>
            </label>

            <div className="flex gap-2">
              {isActive ? (
                <button
                  onClick={stopPaperTrading}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  중지
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  시작
                </button>
              )}
              <button
                onClick={resetPortfolio}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                리셋
              </button>
            </div>
          </div>
        </div>

        {/* ✅ 매매 조건 설정 UI 추가 */}
        <TradingSettings
          settings={tradingSettings}
          onSettingsChange={setTradingSettings}
        />

        {/* 상태 표시 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-blue-800 font-semibold">데이터 수신</div>
            <div className="text-2xl font-bold text-blue-600">
              {monitoringStats.dataReceived}
            </div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-green-800 font-semibold">신호 생성</div>
            <div className="text-2xl font-bold text-green-600">
              {monitoringStats.signalsGenerated}
            </div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-purple-800 font-semibold">거래 실행</div>
            <div className="text-2xl font-bold text-purple-600">
              {monitoringStats.tradesExecuted}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-gray-800 font-semibold">마지막 활동</div>
            <div className="text-sm text-gray-600">
              {monitoringStats.lastActivity || "-"}
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "portfolio", label: "포트폴리오", icon: "💼" },
            { id: "signals", label: "최근 신호", icon: "📊" },
            { id: "trades", label: "거래 내역", icon: "📈" },
            { id: "logs", label: "실시간 로그", icon: "📝" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === "portfolio" && (
        <div className="space-y-6">
          {/* 포트폴리오 요약 */}
          {portfolio && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-gray-700 mb-2">보유 현금</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(portfolio.krw)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-gray-700 mb-2">총 자산</h3>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(portfolio.totalValue)}
                </p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="font-semibold text-gray-700 mb-2">수익률</h3>
                <p
                  className={`text-2xl font-bold ${
                    portfolio.performance.totalReturn >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatPercent(portfolio.performance.totalReturn)}
                </p>
                <p className="text-sm text-gray-500">
                  승률: {formatPercent(portfolio.performance.winRate)}
                </p>
              </div>
            </div>
          )}

          {/* 보유 코인 */}
          {portfolio?.coins?.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h3 className="font-semibold text-gray-800">보유 코인</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        종목
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        수량
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        평균단가
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        현재가치
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        수익률
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {portfolio.coins.map((coin, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {coin.symbol}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {coin.quantity.toFixed(8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {formatCurrency(coin.avgPrice)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                          {formatCurrency(coin.currentValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`${
                              coin.profitRate >= 0
                                ? "text-green-600"
                                : "text-red-600"
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
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-800 mb-4">최근 신호</h3>
          {lastSignal ? (
            <div className="space-y-4">
              <div
                className={`p-4 rounded-lg border-l-4 ${
                  lastSignal.type === "BUY"
                    ? "bg-green-50 border-green-500"
                    : "bg-red-50 border-red-500"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold">
                      {lastSignal.symbol} {lastSignal.type}
                    </h4>
                    <p className="text-gray-600 mt-1">{lastSignal.reason}</p>
                    <div className="mt-2 text-sm space-y-1">
                      <div>가격: {formatCurrency(lastSignal.price)}</div>
                      <div>점수: {lastSignal.totalScore?.toFixed(1)}/10</div>
                      <div>변동률: {lastSignal.changePercent?.toFixed(2)}%</div>
                      {lastSignal.settings && (
                        <div>전략: {lastSignal.settings.strategy}</div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {lastSignal.timestamp?.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              아직 신호가 없습니다
            </p>
          )}
        </div>
      )}

      {activeTab === "trades" && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="font-semibold text-gray-800">거래 내역</h3>
          </div>
          {portfolio?.recentTrades?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      시간
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      종목
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      구분
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      가격
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      수량
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      금액
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      수익률
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {portfolio.recentTrades.slice(0, 50).map((trade, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.timestamp?.toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                        {trade.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            trade.action === "BUY"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {trade.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {formatCurrency(trade.price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {trade.quantity?.toFixed(8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                        {formatCurrency(trade.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {trade.profitRate ? (
                          <span
                            className={`${
                              trade.profitRate >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatPercent(trade.profitRate)}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              거래 내역이 없습니다
            </div>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">실시간 로그</h3>
            <div className="text-sm text-gray-500">
              최근 {logs.length}개 로그 (자동 업데이트)
            </div>
          </div>
          <LogViewer logs={logs} />
        </div>
      )}
    </div>
  );
};

export default PaperTrading;
