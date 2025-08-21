// src/components/features/testing/PaperTradingControl.jsx - 독립 컴포넌트

import React from 'react';
import { formatCurrency, formatPercent } from '../../../utils/formatters';

const PaperTradingControl = ({
    // Props from usePaperTrading
    isActive,
    connectionStatus,
    portfolio,
    logs,
    monitoringStats,
    currentSelectedCoins,
    testMode,
    lastSignal,
    marketSentiment,
    marketCondition,
    tradingStats,
    // Action functions
    startPaperTrading,
    stopPaperTrading,
    toggleTestMode
}) => {
    return (
        <div className="paper-trading-control-panel space-y-6">
            {/* 🎮 메인 컨트롤 */}
            <div className="control-section bg-white p-6 rounded-lg shadow-sm border">
                <h2 className="text-xl font-semibold mb-4">거래 제어</h2>

                <div className="flex items-center gap-4 mb-6">
                    {!isActive ? (
                        <button
                            onClick={startPaperTrading}
                            disabled={currentSelectedCoins.length === 0}
                            className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 rounded-lg font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            🚀 페이퍼트레이딩 시작
                        </button>
                    ) : (
                        <button
                            onClick={stopPaperTrading}
                            className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-lg font-bold text-lg transition-all"
                        >
                            🛑 거래 중지
                        </button>
                    )}

                    <label className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            checked={testMode}
                            onChange={toggleTestMode}
                            disabled={isActive}
                            className="w-5 h-5"
                        />
                        <span className="font-medium">테스트 모드 (조건 완화)</span>
                    </label>
                </div>

                {/* 📊 실시간 상태 */}
                <div className="status-grid grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className={`status-card p-3 rounded-lg ${connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
                        connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                        <div className="font-semibold">
                            {connectionStatus === 'connected' ? '🟢 연결됨' :
                                connectionStatus === 'error' ? '🔴 오류' : '⚫ 대기중'}
                        </div>
                    </div>

                    <div className="status-card bg-blue-100 text-blue-800 p-3 rounded-lg">
                        <div className="font-semibold">선택 코인</div>
                        <div>{currentSelectedCoins.length}개</div>
                    </div>

                    <div className="status-card bg-purple-100 text-purple-800 p-3 rounded-lg">
                        <div className="font-semibold">모드</div>
                        <div>{testMode ? '🧪 테스트' : '💎 실전'}</div>
                    </div>

                    <div className="status-card bg-orange-100 text-orange-800 p-3 rounded-lg">
                        <div className="font-semibold">배치</div>
                        <div>{tradingStats?.batch?.isRunning ? '🔄 실행중' : '⏹️ 중지'}</div>
                    </div>
                </div>
            </div>

            {/* 📈 실시간 대시보드 */}
            <div className="dashboard-section bg-white p-6 rounded-lg shadow-sm border">
                <h3 className="text-lg font-semibold mb-4">실시간 대시보드</h3>

                <div className="dashboard-grid grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* 총 자산 */}
                    <div className="dashboard-card bg-blue-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                            ₩{portfolio?.totalValue?.toLocaleString() || '1,840,000'}
                        </div>
                        <div className="text-sm text-gray-600">총 자산</div>
                        <div className="text-xs text-gray-500 mt-1">
                            수익률: {formatPercent(portfolio?.totalProfitRate || 0)}
                        </div>
                    </div>

                    {/* 실행된 거래 */}
                    <div className="dashboard-card bg-green-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                            {monitoringStats?.tradesExecuted || 0}
                        </div>
                        <div className="text-sm text-gray-600">실행된 거래</div>
                        <div className="text-xs text-gray-500 mt-1">
                            성공률: {portfolio?.performance?.winRate?.toFixed(1) || 0}%
                        </div>
                    </div>

                    {/* 생성된 신호 */}
                    <div className="dashboard-card bg-purple-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                            {monitoringStats?.signalsGenerated || 0}
                        </div>
                        <div className="text-sm text-gray-600">생성된 신호</div>
                        <div className="text-xs text-gray-500 mt-1">
                            거부: {monitoringStats?.signalsRejected || 0}개
                        </div>
                    </div>

                    {/* 보유 포지션 */}
                    <div className="dashboard-card bg-orange-50 p-4 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                            {portfolio?.positions?.length || 0}
                        </div>
                        <div className="text-sm text-gray-600">보유 포지션</div>
                        <div className="text-xs text-gray-500 mt-1">
                            최대: {portfolio?.maxPositions || 4}개
                        </div>
                    </div>
                </div>
            </div>

            {/* 🎯 최신 신호 & 시장 상태 */}
            <div className="info-section grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 최신 신호 */}
                <div className="signal-info bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 text-gray-800">🎯 최신 신호</h4>
                    {lastSignal ? (
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-lg font-bold">{lastSignal.symbol}</span>
                                <span className={`px-2 py-1 rounded text-sm font-semibold ${lastSignal.type === 'BUY'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}>
                                    {lastSignal.type}
                                </span>
                                <span className="text-sm text-gray-600">
                                    점수: {lastSignal.totalScore?.toFixed(1)}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600">{lastSignal.reason}</p>
                            <p className="text-xs text-gray-500">
                                {new Date(lastSignal.timestamp || lastSignal.generatedAt).toLocaleTimeString()}
                            </p>
                        </div>
                    ) : (
                        <p className="text-gray-500">신호를 기다리는 중...</p>
                    )}
                </div>

                {/* 시장 상태 */}
                <div className="market-info bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-semibold mb-3 text-gray-800">📊 시장 상태</h4>
                    <div className="space-y-2">
                        {marketCondition && (
                            <div className="text-sm">
                                <span className="font-medium">매수 적합도: </span>
                                <span className={`font-semibold ${marketCondition.isBuyableMarket ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {marketCondition.buyability?.level}
                                </span>
                                <span className="text-gray-500 ml-2">
                                    ({marketCondition.overallBuyScore?.toFixed(1)}점)
                                </span>
                            </div>
                        )}
                        {marketSentiment && (
                            <div className="text-sm">
                                <span className="font-medium">공포탐욕지수: </span>
                                <span className="font-semibold text-purple-600">
                                    {marketSentiment.fearGreedIndex}/100
                                </span>
                                <span className="text-gray-500 ml-2">
                                    ({marketSentiment.overall})
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 📜 실시간 로그 */}
            <div className="logs-section bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-gray-800">📜 실시간 로그</h4>
                    <div className="text-xs text-gray-500">
                        마지막 활동: {monitoringStats?.lastActivity || 'N/A'}
                    </div>
                </div>

                <div className="logs-container bg-gray-50 border rounded-lg p-3 max-h-64 overflow-y-auto">
                    {logs?.slice(0, 15).map(log => (
                        <div key={log.id} className="log-item py-1 border-b border-gray-200 last:border-b-0">
                            <div className="flex items-start gap-2">
                                <span className="text-xs text-gray-500 shrink-0 mt-0.5">
                                    {log.timestamp.toLocaleTimeString()}
                                </span>
                                <span className={`text-sm flex-1 ${log.level === 'success' ? 'text-green-600' :
                                    log.level === 'error' ? 'text-red-600' :
                                        log.level === 'warning' ? 'text-orange-600' :
                                            'text-gray-700'
                                    }`}>
                                    {log.message}
                                </span>
                            </div>
                        </div>
                    ))}
                    {(!logs || logs.length === 0) && (
                        <p className="text-gray-500 text-center py-4">로그가 없습니다</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaperTradingControl;
