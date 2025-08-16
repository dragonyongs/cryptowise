import React, { useState } from "react";
import { usePaperTrading } from "../../../hooks/usePaperTrading";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { paperTradingEngine } from "../../../services/testing/paperTradingEngine";

// ✅ 성능 최적화된 로그 뷰어 추가
const LogViewer = React.memo(({ logs }) => (
  <div className="h-96 overflow-y-auto bg-gray-900 text-green-400 p-4 rounded font-mono text-sm">
    {logs.slice(0, 30).map((log) => (
      <div key={String(log.id)} className={`log-${log.type} mb-1`}>
        <span className="text-gray-500">{log.timestamp}</span>{" "}
        <span
          className={
            log.type === "error"
              ? "text-red-400"
              : log.type === "success"
                ? "text-green-400"
                : log.type === "warning"
                  ? "text-yellow-400"
                  : "text-blue-400"
          }
        >
          {log.message}
        </span>
      </div>
    ))}
  </div>
));

const PaperTrading = ({ userId = "demo-user" }) => {
  const {
    portfolio,
    isActive,
    isConnected,
    lastSignal,
    logs,
    availableCoins,
    interestCoins,
    coinConfigs,
    marketData,
    monitoringStats,
    startPaperTrading,
    stopPaperTrading,
    toggleInterestCoin,
    setCoinConfigs,
    updatePortfolio,
    resetPortfolio,
    addLog,
    tradingMode, // ✅ 추가
    setTradingMode, // ✅ 추가
    topCoins, // ✅ 추가
    selectedCoinsCount,
    hasSelectedCoins,
  } = usePaperTrading(userId);

  const [selectedTab, setSelectedTab] = useState("dashboard");
  const [manualTradeForm, setManualTradeForm] = useState({
    symbol: "BTC",
    type: "BUY",
    price: "",
    amount: "",
  });

  // 수동 거래 실행
  const handleManualTrade = async (e) => {
    e.preventDefault();
    if (!manualTradeForm.price) {
      addLog("가격을 입력해주세요", "error");
      return;
    }

    const signal = {
      symbol: manualTradeForm.symbol,
      type: manualTradeForm.type,
      price: parseFloat(manualTradeForm.price),
      totalScore: 8.5,
      reason: "수동 거래",
    };

    try {
      const config = coinConfigs[manualTradeForm.symbol];
      if (config) {
        const result = await paperTradingEngine.executeSignal(signal, config);
        if (result.executed) {
          addLog(
            `✅ 수동 거래 실행: ${result.trade.symbol} ${result.trade.action}`,
            "success"
          );
          updatePortfolio();
        } else {
          addLog(`❌ 수동 거래 실패: ${result.reason}`, "error");
        }
      }
    } catch (error) {
      addLog(`❌ 수동 거래 오류: ${error.message}`, "error");
    }

    setManualTradeForm({ ...manualTradeForm, price: "", amount: "" });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              페이퍼 트레이딩
            </h1>

            {/* ✅ 실시간 연결 상태 개선 */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
              ></div>
              <span className="text-sm text-gray-600">
                {isConnected ? "실시간 연결됨" : "연결 끊어짐"}
              </span>
              {isActive && (
                <span className="text-xs text-gray-500">
                  (수신: {monitoringStats?.dataReceived || 0}, 신호:{" "}
                  {monitoringStats?.signalsGenerated || 0}, 거래:{" "}
                  {monitoringStats?.tradesExecuted || 0})
                </span>
              )}
            </div>
          </div>

          {/* ✅ 거래 모드 선택 추가 */}
          <div className="flex items-center space-x-4 mb-4">
            <span className="text-sm font-medium text-gray-700">
              거래 모드:
            </span>
            <label className="flex items-center">
              <input
                type="radio"
                value="selected"
                disabled={isActive}
                checked={tradingMode === "selected"}
                onChange={(e) => setTradingMode(e.target.value)}
                className="mr-2"
              />
              관심코인만 ({selectedCoinsCount}개)
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="all"
                disabled={isActive}
                checked={tradingMode === "all"}
                onChange={(e) => setTradingMode(e.target.value)}
                className="mr-2"
              />
              전체코인 (상위 20개)
            </label>
          </div>

          {/* 기존 UI 구조 유지 */}
          {!hasSelectedCoins && tradingMode === "selected" ? (
            <div className="text-center py-12 bg-gray-100 rounded-lg">
              <h3 className="text-lg font-medium text-gray-600 mb-2">
                관심코인이 등록되지 않았습니다
              </h3>
              <p className="text-gray-500">
                메인 화면에서 코인을 관심등록한 후 페이퍼 트레이딩을 시작하세요
              </p>
            </div>
          ) : (
            <>
              {/* 기존 탭 버튼들 */}
              <div className="flex space-x-1 mb-6 border-b border-gray-200">
                {[
                  "dashboard",
                  "portfolio",
                  "signals",
                  "trades",
                  "logs",
                  "manual",
                ].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`px-4 py-2 font-medium text-sm transition-colors ${
                      selectedTab === tab
                        ? "text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab === "dashboard"
                      ? "대시보드"
                      : tab === "portfolio"
                        ? "포트폴리오"
                        : tab === "signals"
                          ? "최근 신호"
                          : tab === "trades"
                            ? "거래 내역"
                            : tab === "logs"
                              ? "활동 로그"
                              : "수동 거래"}
                  </button>
                ))}
              </div>

              {/* Dashboard Tab */}
              {selectedTab === "dashboard" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">총 자산</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(portfolio?.totalValue || 0)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">수익률</div>
                      <div
                        className={`text-xl font-bold ${(portfolio?.performance?.totalReturn || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatPercent(
                          portfolio?.performance?.totalReturn || 0
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">현금</div>
                      <div className="text-xl font-bold text-gray-900">
                        {formatCurrency(portfolio?.krw || 0)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">승률</div>
                      <div className="text-xl font-bold text-blue-600">
                        {formatPercent(portfolio?.performance?.winRate || 0)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {portfolio?.performance?.winTrades || 0}/
                        {portfolio?.performance?.totalTrades || 0}
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={isActive ? stopPaperTrading : startPaperTrading}
                      disabled={!hasSelectedCoins && tradingMode === "selected"}
                      className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                        isActive
                          ? "bg-red-500 hover:bg-red-600 text-white"
                          : "bg-blue-500 hover:bg-blue-600 text-white disabled:bg-gray-300 disabled:cursor-not-allowed"
                      }`}
                    >
                      {isActive
                        ? "페이퍼 트레이딩 중단"
                        : "페이퍼 트레이딩 시작"}
                    </button>
                    <button
                      onClick={resetPortfolio}
                      className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      포트폴리오 초기화
                    </button>
                  </div>
                </div>
              )}

              {/* Portfolio Tab */}
              {selectedTab === "portfolio" && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">포트폴리오</h3>
                  {portfolio?.coins?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border p-2 text-left">종목</th>
                            <th className="border p-2 text-right">수량</th>
                            <th className="border p-2 text-right">평균단가</th>
                            <th className="border p-2 text-right">현재가치</th>
                            <th className="border p-2 text-right">수익률</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolio.coins.map((coin) => (
                            <tr key={coin.symbol}>
                              <td className="border p-2">{coin.symbol}</td>
                              <td className="border p-2 text-right">
                                {coin.quantity.toFixed(8)}
                              </td>
                              <td className="border p-2 text-right">
                                {formatCurrency(coin.avgPrice)}
                              </td>
                              <td className="border p-2 text-right">
                                {formatCurrency(coin.currentValue)}
                              </td>
                              <td
                                className={`border p-2 text-right ${coin.profitRate >= 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                {formatPercent(coin.profitRate)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      보유 코인이 없습니다
                    </div>
                  )}
                </div>
              )}

              {/* Signals Tab */}
              {selectedTab === "signals" && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">최근 신호</h3>
                  {lastSignal ? (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">
                            {lastSignal.symbol}
                          </span>
                          <span
                            className={`ml-2 px-2 py-1 rounded text-sm ${
                              lastSignal.type === "BUY"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {lastSignal.type}
                          </span>
                        </div>
                        <div className="text-right">
                          <div>점수: {lastSignal.totalScore?.toFixed(1)}</div>
                          <div className="text-xs text-gray-500">
                            {lastSignal.timestamp?.toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        {lastSignal.reason}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {!hasSelectedCoins && tradingMode === "selected" ? (
                        <>
                          관심등록된 코인이 없습니다
                          <br />
                          메인 화면에서 코인을 관심등록한 후 페이퍼 트레이딩을
                          시작하세요
                        </>
                      ) : (
                        "아직 생성된 신호가 없습니다"
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Trades Tab */}
              {selectedTab === "trades" && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">거래 내역</h3>
                  {portfolio?.trades?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className="border p-2 text-left">시간</th>
                            <th className="border p-2 text-left">종목</th>
                            <th className="border p-2 text-left">구분</th>
                            <th className="border p-2 text-right">가격</th>
                            <th className="border p-2 text-right">수량</th>
                            <th className="border p-2 text-right">금액</th>
                            <th className="border p-2 text-right">수익률</th>
                          </tr>
                        </thead>
                        <tbody>
                          {portfolio.trades.map((trade, index) => (
                            <tr key={index}>
                              <td className="border p-2">
                                {trade.timestamp?.toLocaleTimeString()}
                              </td>
                              <td className="border p-2">{trade.symbol}</td>
                              <td className="border p-2">{trade.action}</td>
                              <td className="border p-2 text-right">
                                {formatCurrency(trade.price)}
                              </td>
                              <td className="border p-2 text-right">
                                {trade.quantity?.toFixed(8)}
                              </td>
                              <td className="border p-2 text-right">
                                {formatCurrency(trade.amount)}
                              </td>
                              <td className="border p-2 text-right">
                                {trade.profitRate ? (
                                  <span
                                    className={
                                      trade.profitRate >= 0
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }
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
                    <div className="text-center py-8 text-gray-500">
                      거래 내역이 없습니다
                      <br />
                      페이퍼 트레이딩을 시작하면 거래 내역이 표시됩니다
                    </div>
                  )}
                </div>
              )}

              {/* ✅ 활동 로그 부분만 개선된 LogViewer로 교체 */}
              {selectedTab === "logs" && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">활동 로그</h3>
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      활동 로그가 없습니다
                      <br />
                      페이퍼 트레이딩을 시작하면 로그가 표시됩니다
                    </div>
                  ) : (
                    <LogViewer logs={logs} />
                  )}
                </div>
              )}

              {/* Manual Trade Tab */}
              {selectedTab === "manual" && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">수동 거래</h3>
                  {!hasSelectedCoins ? (
                    <div className="text-center py-8 text-gray-500">
                      관심등록된 코인이 없습니다
                      <br />
                      메인 화면에서 코인을 관심등록한 후 페이퍼 트레이딩을
                      시작하세요
                    </div>
                  ) : (
                    <form
                      onSubmit={handleManualTrade}
                      className="max-w-md space-y-4"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          코인
                        </label>
                        <select
                          value={manualTradeForm.symbol}
                          onChange={(e) =>
                            setManualTradeForm({
                              ...manualTradeForm,
                              symbol: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          {Object.keys(coinConfigs).map((symbol) => (
                            <option key={symbol} value={symbol}>
                              {symbol}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          거래 유형
                        </label>
                        <select
                          value={manualTradeForm.type}
                          onChange={(e) =>
                            setManualTradeForm({
                              ...manualTradeForm,
                              type: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="BUY">매수</option>
                          <option value="SELL">매도</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          가격
                        </label>
                        <input
                          type="number"
                          value={manualTradeForm.price}
                          onChange={(e) =>
                            setManualTradeForm({
                              ...manualTradeForm,
                              price: e.target.value,
                            })
                          }
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="거래 가격 입력"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                      >
                        거래 실행
                      </button>
                    </form>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaperTrading;
