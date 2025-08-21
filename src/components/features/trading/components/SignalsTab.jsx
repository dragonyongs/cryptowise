// src/components/features/testing/components/SignalsTab.jsx
import React, { useState, useMemo } from "react";
import {
  ZapIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  FilterIcon,
} from "lucide-react";

const SignalsTab = ({ signals, isActive }) => {
  const [filter, setFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");

  const filteredSignals = useMemo(() => {
    let filtered = signals;

    if (filter !== "all") {
      filtered = filtered.filter((signal) => signal.type === filter);
    }

    if (confidenceFilter !== "all") {
      filtered = filtered.filter((signal) => {
        const confidence = signal.confidence || 0;
        switch (confidenceFilter) {
          case "high":
            return confidence >= 0.8;
          case "medium":
            return confidence >= 0.5 && confidence < 0.8;
          case "low":
            return confidence < 0.5;
          default:
            return true;
        }
      });
    }

    return filtered.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [signals, filter, confidenceFilter]);

  const signalStats = useMemo(() => {
    const total = filteredSignals.length;
    const buySignals = filteredSignals.filter((s) => s.type === "BUY").length;
    const sellSignals = filteredSignals.filter((s) => s.type === "SELL").length;
    const highConfidence = filteredSignals.filter(
      (s) => (s.confidence || 0) >= 0.8
    ).length;

    return { total, buySignals, sellSignals, highConfidence };
  }, [filteredSignals]);

  const getSignalIcon = (type, confidence) => {
    if (type === "BUY") {
      return confidence >= 0.8 ? CheckCircleIcon : TrendingUpIcon;
    } else if (type === "SELL") {
      return confidence >= 0.8 ? AlertTriangleIcon : TrendingDownIcon;
    }
    return InfoIcon;
  };

  const getSignalColor = (type, confidence) => {
    if (confidence >= 0.8) {
      return type === "BUY"
        ? "text-green-600 bg-green-100"
        : "text-red-600 bg-red-100";
    } else if (confidence >= 0.5) {
      return type === "BUY"
        ? "text-blue-600 bg-blue-100"
        : "text-orange-600 bg-orange-100";
    }
    return "text-gray-600 bg-gray-100";
  };

  const getConfidenceLabel = (confidence) => {
    if (confidence >= 0.8) return "높음";
    if (confidence >= 0.5) return "보통";
    return "낮음";
  };

  return (
    <div className="space-y-6">
      {/* Signal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <ZapIcon className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-600">총 신호</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {signalStats.total}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUpIcon className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">매수 신호</span>
          </div>
          <p className="text-2xl font-bold text-green-600">
            {signalStats.buySignals}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDownIcon className="w-5 h-5 text-red-600" />
            <span className="text-sm text-gray-600">매도 신호</span>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {signalStats.sellSignals}
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleIcon className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">고신뢰도</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {signalStats.highConfidence}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <FilterIcon className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">모든 신호</option>
              <option value="BUY">매수 신호</option>
              <option value="SELL">매도 신호</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">신뢰도:</span>
            <select
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">전체</option>
              <option value="high">높음 (80% 이상)</option>
              <option value="medium">보통 (50-80%)</option>
              <option value="low">낮음 (50% 미만)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Signals List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">신호 분석</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {filteredSignals.map((signal, index) => {
            const Icon = getSignalIcon(signal.type, signal.confidence);
            const colorClass = getSignalColor(signal.type, signal.confidence);

            return (
              <div key={signal.id || index} className="p-6 hover:bg-gray-50">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-gray-900">
                          {signal.symbol}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            signal.type === "BUY"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {signal.type === "BUY" ? "매수" : "매도"}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          신뢰도: {getConfidenceLabel(signal.confidence)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(signal.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                      <div>
                        <span className="text-xs text-gray-500">가격</span>
                        <p className="font-medium">
                          ₩{signal.price?.toLocaleString() || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">신뢰도</span>
                        <p className="font-medium">
                          {((signal.confidence || 0) * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">볼륨</span>
                        <p className="font-medium">
                          {signal.volume?.toLocaleString() || "N/A"}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">상태</span>
                        <p
                          className={`font-medium ${
                            signal.executed
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {signal.executed ? "실행됨" : "대기중"}
                        </p>
                      </div>
                    </div>

                    {signal.reason && (
                      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        <span className="font-medium">신호 근거: </span>
                        {signal.reason}
                      </div>
                    )}

                    {signal.technicalIndicators && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Object.entries(signal.technicalIndicators).map(
                          ([key, value]) => (
                            <span
                              key={key}
                              className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs"
                            >
                              {key}:{" "}
                              {typeof value === "number"
                                ? value.toFixed(2)
                                : value}
                            </span>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredSignals.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <ZapIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>생성된 신호가 없습니다</p>
              {!isActive ? (
                <p className="text-sm">
                  거래를 활성화하면 실시간 신호가 표시됩니다
                </p>
              ) : (
                <p className="text-sm">신호 생성을 기다리는 중입니다</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(SignalsTab);
