// src/features/trading/components/SignalsTab.jsx - useSignalManager 연동

import React, { useState, useMemo } from "react";
import { ZapIcon, TrendingUpIcon, TrendingDownIcon, AlertTriangleIcon, ActivityIcon, WifiOffIcon, RefreshCwIcon } from "lucide-react";

const SignalsTab = ({
  signals = [],
  isActive = false,
  isProcessing = false,
  tradingMode = "paper",
  lastUpdateTime = null,
  onSignalAction = null,
  onRefreshSignals = null
}) => {
  const [filter, setFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");

  // 🎯 실제 신호 데이터 처리
  const safeSignals = useMemo(() => {
    console.log('Raw signals:', signals);
    if (!Array.isArray(signals) || signals.length === 0) {
      return [];
    }

    // useSignalManager에서 오는 신호 구조에 맞춰 처리
    return signals.filter(signal =>
      signal &&
      signal.symbol &&
      signal.type &&
      typeof signal.totalScore === 'number'
    ).map(signal => ({
      ...signal,
      // 표준 형식으로 정규화
      symbol: signal.symbol.replace('KRW-', '').toUpperCase(),
      type: signal.type.toUpperCase(),
      confidence: signal.confidence || 'MEDIUM',
      price: signal.price || 0,
      totalScore: Number(signal.totalScore) || 0,  // 숫자 변환 보장
      executed: Boolean(signal.executed)
    }));
  }, [signals]);

  // 필터링 및 정렬
  const filteredSignals = useMemo(() => {
    let filtered = safeSignals;

    if (filter !== "all") {
      filtered = filtered.filter((signal) => signal.type === filter);
    }

    if (confidenceFilter !== "all") {
      filtered = filtered.filter((signal) => {
        const confidenceValue = typeof signal.confidence === 'string'
          ? ({ 'HIGH': 0.8, 'MEDIUM': 0.6, 'LOW': 0.4, 'VERY_LOW': 0.2 }[signal.confidence] || 0.5)
          : signal.confidence;

        switch (confidenceFilter) {
          case "high": return confidenceValue >= 0.8;
          case "medium": return confidenceValue >= 0.5 && confidenceValue < 0.8;
          case "low": return confidenceValue < 0.5;
          default: return true;
        }
      });
    }

    return filtered.sort((a, b) => b.totalScore - a.totalScore);
  }, [safeSignals, filter, confidenceFilter]);
  console.log('Safe signals after filtering:', safeSignals);
  console.log('Final filtered signals:', filteredSignals);
  // 통계 계산
  const signalStats = useMemo(() => {
    const total = filteredSignals.length;
    const buySignals = filteredSignals.filter((s) => s.type === "BUY").length;
    const sellSignals = filteredSignals.filter((s) => s.type === "SELL").length;
    const executed = filteredSignals.filter((s) => s.executed).length;
    const avgScore = total > 0 ? (filteredSignals.reduce((sum, s) => sum + s.totalScore, 0) / total).toFixed(1) : 0;

    return { total, buySignals, sellSignals, executed, avgScore };
  }, [filteredSignals]);

  // 신뢰도 표시
  const getConfidenceDisplay = (confidence) => {
    const styles = {
      'HIGH': { level: "높음", color: "text-green-600", bgColor: "bg-green-100" },
      'MEDIUM': { level: "보통", color: "text-yellow-600", bgColor: "bg-yellow-100" },
      'LOW': { level: "낮음", color: "text-red-600", bgColor: "bg-red-100" },
      'VERY_LOW': { level: "매우낮음", color: "text-gray-600", bgColor: "bg-gray-100" }
    };
    return styles[confidence] || styles['MEDIUM'];
  };

  // 신호 타입별 스타일
  const getSignalStyle = (type, totalScore) => {
    switch (type) {
      case "BUY":
        return {
          icon: TrendingUpIcon,
          bgColor: totalScore >= 9.0 ? "bg-green-500" : totalScore >= 7.5 ? "bg-green-400" : "bg-green-300",
          textColor: "text-green-700",
          borderColor: "border-green-200"
        };
      case "SELL":
        return {
          icon: TrendingDownIcon,
          bgColor: "bg-red-500",
          textColor: "text-red-700",
          borderColor: "border-red-200"
        };
      default:
        return {
          icon: AlertTriangleIcon,
          bgColor: "bg-gray-400",
          textColor: "text-gray-700",
          borderColor: "border-gray-200"
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ZapIcon className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold">AI 거래 신호</h3>
          <span className="text-sm text-gray-500">
            ({signalStats.total}개, 평균: {signalStats.avgScore}점)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}>
            {isActive ? `활성 (${tradingMode === 'paper' ? '테스트' : '실전'})` : '비활성'}
          </span>

          {lastUpdateTime && (
            <span className="text-xs text-gray-500">
              {lastUpdateTime.toLocaleTimeString()}
            </span>
          )}

          <button
            onClick={onRefreshSignals}
            disabled={!isActive || isProcessing}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="신호 새로고침"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      {signalStats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-xs text-blue-600 font-medium">총 신호</div>
            <div className="text-lg font-bold text-blue-900">{signalStats.total}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-xs text-green-600 font-medium">매수</div>
            <div className="text-lg font-bold text-green-900">{signalStats.buySignals}</div>
          </div>
          <div className="bg-red-50 p-3 rounded-lg">
            <div className="text-xs text-red-600 font-medium">매도</div>
            <div className="text-lg font-bold text-red-900">{signalStats.sellSignals}</div>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-xs text-purple-600 font-medium">실행됨</div>
            <div className="text-lg font-bold text-purple-900">{signalStats.executed}</div>
          </div>
        </div>
      )}

      {/* 필터 */}
      {signalStats.total > 0 && (
        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 신호</option>
            <option value="BUY">매수</option>
            <option value="SELL">매도</option>
          </select>

          <select
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 신뢰도</option>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
        </div>
      )}

      {/* 신호 목록 */}
      <div className="space-y-3">
        {isProcessing && (
          <div className="text-center py-4">
            <div className="inline-flex items-center space-x-2 text-blue-600">
              <RefreshCwIcon className="w-4 h-4 animate-spin" />
              <span className="text-sm">AI가 시장을 분석하여 신호를 생성하고 있습니다...</span>
            </div>
          </div>
        )}

        {filteredSignals.length > 0 ? (
          filteredSignals.map((signal) => {
            const signalStyle = getSignalStyle(signal.type, signal.totalScore);
            const confidenceDisplay = getConfidenceDisplay(signal.confidence);
            const SignalIcon = signalStyle.icon;

            return (
              <div
                key={signal.id}
                className={`border ${signalStyle.borderColor} bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all duration-200`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${signalStyle.bgColor}`}>
                      <SignalIcon className="w-4 h-4 text-white" />
                    </div>

                    <div>
                      <div className="font-semibold text-gray-900 flex items-center space-x-2">
                        <span>{signal.symbol}</span>
                        <span className="text-sm text-blue-600 font-medium">
                          {signal.totalScore.toFixed(1)}점
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {signal.reason || 'AI 분석 완료'}
                      </div>
                      {signal.tradingMode && (
                        <div className="text-xs text-purple-600">
                          {signal.tradingMode === 'paper' ? '테스트' : '실전'} 모드
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                      <div className={`text-sm font-medium ${signalStyle.textColor}`}>
                        {signal.type}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(signal.timestamp || signal.generatedAt).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className={`px-2 py-1 rounded text-xs font-medium ${confidenceDisplay.bgColor} ${confidenceDisplay.color}`}>
                      {confidenceDisplay.level}
                    </div>

                    {signal.price > 0 && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">
                          ₩{signal.price.toLocaleString()}
                        </div>
                      </div>
                    )}

                    {/* 실행 버튼 */}
                    {!signal.executed && isActive && onSignalAction && (
                      <button
                        onClick={() => onSignalAction(signal)}
                        className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                      >
                        실행
                      </button>
                    )}

                    {signal.executed && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                        실행완료
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : !isProcessing ? (
          <div className="text-center py-8">
            <WifiOffIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 mb-2">
              {!isActive
                ? "거래를 시작하면 실시간 AI 분석 신호가 표시됩니다"
                : "현재 조건에 맞는 거래 신호가 없습니다"}
            </div>
            {isActive && onRefreshSignals && (
              <button
                onClick={onRefreshSignals}
                className="mt-4 px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                다시 분석하기
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SignalsTab;
