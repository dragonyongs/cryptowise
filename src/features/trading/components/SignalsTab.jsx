// src/features/trading/components/SignalsTab.jsx
import React, { useState, useMemo } from "react";
import {
  ZapIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  ActivityIcon,
  WifiOffIcon,
  RefreshCwIcon,
  FilterIcon,
  SortAscIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from "lucide-react";

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
  const [sortBy, setSortBy] = useState("score");

  // 🎯 실제 신호 데이터 처리
  const safeSignals = useMemo(() => {
    if (!Array.isArray(signals) || signals.length === 0) {
      return [];
    }

    return signals.filter(signal =>
      signal &&
      signal.symbol &&
      signal.type &&
      typeof signal.totalScore === 'number'
    ).map(signal => ({
      ...signal,
      symbol: signal.symbol.replace('KRW-', '').toUpperCase(),
      type: signal.type.toUpperCase(),
      confidence: signal.confidence || 'MEDIUM',
      price: signal.price || 0,
      totalScore: Number(signal.totalScore) || 0,
      executed: Boolean(signal.executed)
    }));
  }, [signals]);

  // 🎯 필터링 및 정렬
  const filteredSignals = useMemo(() => {
    let filtered = safeSignals;

    // 타입 필터
    if (filter !== "all") {
      filtered = filtered.filter((signal) => signal.type === filter);
    }

    // 신뢰도 필터
    if (confidenceFilter !== "all") {
      filtered = filtered.filter((signal) => {
        const confidenceValue = typeof signal.confidence === 'string'
          ? ({
            'HIGH': 0.8,
            'MEDIUM': 0.6,
            'LOW': 0.4,
            'VERY_LOW': 0.2
          }[signal.confidence] || 0.5)
          : signal.confidence;

        switch (confidenceFilter) {
          case "high":
            return confidenceValue >= 0.8;
          case "medium":
            return confidenceValue >= 0.5 && confidenceValue < 0.8;
          case "low":
            return confidenceValue < 0.5;
          default:
            return true;
        }
      });
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "score":
          return b.totalScore - a.totalScore;
        case "time":
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        case "symbol":
          return a.symbol.localeCompare(b.symbol);
        case "confidence":
          const confA = typeof a.confidence === 'string' ?
            ({ 'HIGH': 0.8, 'MEDIUM': 0.6, 'LOW': 0.4, 'VERY_LOW': 0.2 }[a.confidence] || 0.5) :
            a.confidence;
          const confB = typeof b.confidence === 'string' ?
            ({ 'HIGH': 0.8, 'MEDIUM': 0.6, 'LOW': 0.4, 'VERY_LOW': 0.2 }[b.confidence] || 0.5) :
            b.confidence;
          return confB - confA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [safeSignals, filter, confidenceFilter, sortBy]);

  // 🎯 통계 계산
  const signalStats = useMemo(() => {
    const total = filteredSignals.length;
    const buySignals = filteredSignals.filter((s) => s.type === "BUY").length;
    const sellSignals = filteredSignals.filter((s) => s.type === "SELL").length;
    const executed = filteredSignals.filter((s) => s.executed).length;
    const avgScore = total > 0
      ? (filteredSignals.reduce((sum, s) => sum + s.totalScore, 0) / total).toFixed(1)
      : 0;
    const highConfidence = filteredSignals.filter(s =>
      (typeof s.confidence === 'string' ? s.confidence === 'HIGH' : s.confidence >= 0.8)
    ).length;

    return { total, buySignals, sellSignals, executed, avgScore, highConfidence };
  }, [filteredSignals]);

  // 🎯 신뢰도 표시
  const getConfidenceDisplay = (confidence) => {
    const styles = {
      'HIGH': { level: "높음", color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900" },
      'MEDIUM': { level: "보통", color: "text-yellow-600", bgColor: "bg-yellow-100 dark:bg-yellow-900" },
      'LOW': { level: "낮음", color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900" },
      'VERY_LOW': { level: "매우낮음", color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-900" }
    };
    return styles[confidence] || styles['MEDIUM'];
  };

  // 🎯 신호 타입별 스타일
  const getSignalStyle = (type, totalScore) => {
    switch (type) {
      case "BUY":
        return {
          icon: TrendingUpIcon,
          bgColor: totalScore >= 9.0 ? "bg-green-500" : totalScore >= 7.5 ? "bg-green-400" : "bg-green-300",
          textColor: "text-green-700 dark:text-green-300",
          borderColor: "border-green-200 dark:border-green-700"
        };
      case "SELL":
        return {
          icon: TrendingDownIcon,
          bgColor: "bg-red-500",
          textColor: "text-red-700 dark:text-red-300",
          borderColor: "border-red-200 dark:border-red-700"
        };
      default:
        return {
          icon: AlertTriangleIcon,
          bgColor: "bg-gray-400",
          textColor: "text-gray-700 dark:text-gray-300",
          borderColor: "border-gray-200 dark:border-gray-700"
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">매매 신호</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            생성된 매매 신호와 실행 현황을 확인하세요
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm ${isActive
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
            }`}>
            <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
            <span>{isActive ? '신호 생성 중' : '대기 중'}</span>
          </div>
          <button
            onClick={onRefreshSignals}
            disabled={isProcessing}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCwIcon className={`h-4 w-4 ${isProcessing ? 'animate-spin' : ''}`} />
            <span>새로고침</span>
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <ZapIcon className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-gray-600 dark:text-gray-300">총 신호</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {signalStats.total}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUpIcon className="h-4 w-4 text-green-600" />
            <span className="text-xs text-green-600 dark:text-green-400">매수</span>
          </div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            {signalStats.buySignals}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingDownIcon className="h-4 w-4 text-red-600" />
            <span className="text-xs text-red-600 dark:text-red-400">매도</span>
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">
            {signalStats.sellSignals}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircleIcon className="h-4 w-4 text-purple-600" />
            <span className="text-xs text-purple-600 dark:text-purple-400">실행됨</span>
          </div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
            {signalStats.executed}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs text-gray-600 dark:text-gray-300">평균 점수</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {signalStats.avgScore}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs text-gray-600 dark:text-gray-300">고신뢰도</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {signalStats.highConfidence}
          </div>
        </div>
      </div>

      {/* 필터 및 정렬 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FilterIcon className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-300">필터:</span>
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">전체</option>
            <option value="BUY">매수</option>
            <option value="SELL">매도</option>
          </select>
          <select
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="all">모든 신뢰도</option>
            <option value="high">높음</option>
            <option value="medium">보통</option>
            <option value="low">낮음</option>
          </select>
        </div>
        <div className="flex items-center space-x-2">
          <SortAscIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-300">정렬:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="score">점수순</option>
            <option value="time">시간순</option>
            <option value="symbol">종목순</option>
            <option value="confidence">신뢰도순</option>
          </select>
        </div>
      </div>

      {/* 신호 리스트 */}
      <div className="space-y-3">
        {filteredSignals.map((signal) => {
          const signalStyle = getSignalStyle(signal.type, signal.totalScore);
          const confidenceDisplay = getConfidenceDisplay(signal.confidence);
          const SignalIcon = signalStyle.icon;

          return (
            <div
              key={signal.id}
              className={`bg-white dark:bg-gray-700 border rounded-lg p-4 hover:shadow-md transition-shadow ${signalStyle.borderColor}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${signalStyle.bgColor}`}>
                    <SignalIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {signal.symbol}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${signalStyle.textColor} ${signalStyle.bgColor.replace('bg-', 'bg-').replace('-500', '-100').replace('-400', '-100').replace('-300', '-100')} dark:${signalStyle.bgColor.replace('bg-', 'bg-').replace('-500', '-900').replace('-400', '-900').replace('-300', '-900')}`}>
                        {signal.type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${confidenceDisplay.color} ${confidenceDisplay.bgColor}`}>
                        {confidenceDisplay.level}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {signal.reason || '자동 생성된 신호'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {signal.totalScore.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">점수</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      ₩{(signal.price || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {signal.timestamp
                        ? new Date(signal.timestamp).toLocaleTimeString()
                        : '-'
                      }
                    </div>
                  </div>
                  <div className="flex items-center">
                    {signal.executed ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    ) : (
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 빈 상태 */}
      {filteredSignals.length === 0 && (
        <div className="text-center py-12">
          {safeSignals.length === 0 ? (
            <>
              <WifiOffIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                신호가 없습니다
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {isActive ? '신호를 기다리는 중입니다...' : '거래를 시작하면 신호가 생성됩니다'}
              </p>
            </>
          ) : (
            <>
              <FilterIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                필터 조건에 맞는 신호가 없습니다
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                필터 조건을 변경해보세요
              </p>
            </>
          )}
        </div>
      )}

      {/* 마지막 업데이트 시간 */}
      {lastUpdateTime && (
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          마지막 업데이트: {lastUpdateTime.toLocaleString('ko-KR')}
        </div>
      )}
    </div>
  );
};

export default React.memo(SignalsTab);
