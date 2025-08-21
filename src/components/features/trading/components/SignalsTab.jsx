// src/components/features/testing/components/SignalsTab.jsx - 신호/로그 분리 개선

import React, { useState, useMemo, useEffect } from "react";
import {
  ZapIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  FilterIcon,
  ClockIcon,
  DollarSignIcon,
  ActivityIcon,
  WifiOffIcon
} from "lucide-react";

const SignalsTab = ({
  signals = [],
  isActive = false,
  tradingMode = "inactive"
}) => {
  const [filter, setFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");

  // 🎯 엄격한 신호 데이터 검증 - 로그 메시지 완전 차단
  const safeSignals = useMemo(() => {
    console.log("🔍 SignalsTab 받은 원본 데이터:", signals);

    if (!Array.isArray(signals) || signals.length === 0) {
      console.log("⚠️ 신호 배열이 비어있거나 유효하지 않음");
      return [];
    }

    const validSignals = signals.filter(signal => {
      // 🎯 로그 메시지 패턴 완전 차단
      if (signal.message || signal.level || signal.color || signal.category) {
        console.log("❌ 로그 메시지 제외:", signal);
        return false;
      }

      // 🎯 로그 메시지 텍스트 패턴 체크
      if (signal.reason && (
        signal.reason.includes('포트폴리오') ||
        signal.reason.includes('초기화') ||
        signal.reason.includes('모드로') ||
        signal.reason.includes('업데이트') ||
        signal.reason.includes('Store') ||
        signal.reason.includes('🎯') ||
        signal.reason.includes('📊') ||
        signal.reason.includes('🔄')
      )) {
        console.log("❌ 로그 메시지 패턴 제외:", signal);
        return false;
      }

      // 🎯 필수 거래 신호 필드 검증 - 더 엄격하게
      const hasRequiredFields =
        signal &&
        typeof signal === 'object' &&
        typeof signal.symbol === 'string' &&
        signal.symbol.length > 0 &&
        typeof signal.type === 'string' &&
        (signal.type === 'BUY' || signal.type === 'SELL' || signal.type === 'HOLD') &&
        typeof signal.confidence === 'number' &&
        signal.confidence >= 0 && signal.confidence <= 1 &&
        typeof signal.price === 'number' &&
        signal.price > 0;

      if (!hasRequiredFields) {
        console.log("❌ 필수 신호 필드 누락:", signal);
        return false;
      }

      // 🎯 추가 유효성 검증
      if (signal.symbol.length < 2 || signal.symbol.length > 20) {
        console.log("❌ 잘못된 심볼 형식:", signal);
        return false;
      }

      return true;
    });

    // 🎯 안전한 데이터 매핑
    const processedSignals = validSignals.map(signal => {
      const processedSignal = {
        id: signal.id || `signal-${signal.symbol}-${Date.now()}-${Math.random()}`,
        symbol: signal.symbol.replace('KRW-', '').toUpperCase(),
        type: signal.type.toUpperCase(),
        confidence: Math.max(0, Math.min(1, signal.confidence)),
        price: Number(signal.price),
        volume: Number(signal.volume || 0),
        reason: signal.reason || '분석 완료',
        timestamp: signal.timestamp || new Date().toISOString(),
        executed: Boolean(signal.executed),
        status: signal.status || (signal.executed ? 'executed' : 'pending')
      };

      console.log("✅ 처리된 유효한 신호:", processedSignal);
      return processedSignal;
    });

    console.log(`📊 총 ${processedSignals.length}개 유효한 신호 처리 완료`);
    return processedSignals;
  }, [signals]);

  // 🎯 거래 상태 기반 표시 제어
  const shouldShowSignals = useMemo(() => {
    if (!isActive) {
      console.log("🚫 거래 비활성 상태 - 신호 숨김");
      return false;
    }
    return safeSignals.length > 0;
  }, [isActive, safeSignals.length]);

  // 필터링 및 정렬
  const filteredSignals = useMemo(() => {
    let filtered = safeSignals;

    if (filter !== "all") {
      filtered = filtered.filter((signal) => signal.type === filter);
    }

    if (confidenceFilter !== "all") {
      filtered = filtered.filter((signal) => {
        const confidence = signal.confidence;
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

    return filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [safeSignals, filter, confidenceFilter]);

  // 통계 계산
  const signalStats = useMemo(() => {
    const total = filteredSignals.length;
    const buySignals = filteredSignals.filter((s) => s.type === "BUY").length;
    const sellSignals = filteredSignals.filter((s) => s.type === "SELL").length;
    const highConfidence = filteredSignals.filter((s) => s.confidence >= 0.8).length;
    const executed = filteredSignals.filter((s) => s.executed).length;

    return { total, buySignals, sellSignals, highConfidence, executed };
  }, [filteredSignals]);

  // 신뢰도 레벨 가져오기
  const getConfidenceLevel = (confidence) => {
    if (confidence >= 0.8) return { level: "HIGH", color: "text-green-600", bgColor: "bg-green-100" };
    if (confidence >= 0.5) return { level: "MED", color: "text-yellow-600", bgColor: "bg-yellow-100" };
    return { level: "LOW", color: "text-red-600", bgColor: "bg-red-100" };
  };

  // 신호 타입별 아이콘 및 색상
  const getSignalStyle = (type, confidence) => {
    const confidenceData = getConfidenceLevel(confidence);

    switch (type) {
      case "BUY":
        return {
          icon: TrendingUpIcon,
          bgColor: confidence >= 0.8 ? "bg-green-500" : confidence >= 0.5 ? "bg-green-400" : "bg-green-300",
          textColor: "text-green-700",
          borderColor: "border-green-200"
        };
      case "SELL":
        return {
          icon: TrendingDownIcon,
          bgColor: confidence >= 0.8 ? "bg-red-500" : confidence >= 0.5 ? "bg-red-400" : "bg-red-300",
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

  // 🎯 거래 비활성 상태 또는 신호 없음
  if (!shouldShowSignals) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          {!isActive ? <WifiOffIcon className="w-8 h-8 text-slate-400" /> : <ActivityIcon className="w-8 h-8 text-slate-400 animate-pulse" />}
        </div>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          {!isActive ? "신호 대기 중" : "분석 중"}
        </h3>
        <p className="text-slate-500 max-w-md">
          {!isActive
            ? "페이퍼트레이딩을 시작하면 실시간 거래 신호가 표시됩니다"
            : "업비트 API 데이터를 분석하여 거래 신호를 생성하는 중입니다"
          }
        </p>
        {isActive && (
          <div className="mt-4 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center">
            <ActivityIcon className="w-4 h-4 mr-1 animate-spin" />
            실시간 분석 중...
          </div>
        )}
        {!isActive && tradingMode !== "inactive" && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
            <div className="flex items-center text-amber-700">
              <InfoIcon className="w-4 h-4 mr-2" />
              시작 버튼을 눌러 실시간 신호 분석을 활성화하세요
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 통계 및 필터 섹션 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* 통계 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-600">{signalStats.total}</div>
            <div className="text-xs text-blue-500">총 신호</div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-600">{signalStats.buySignals}</div>
            <div className="text-xs text-green-500">매수 신호</div>
          </div>
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <div className="text-lg font-semibold text-red-600">{signalStats.sellSignals}</div>
            <div className="text-xs text-red-500">매도 신호</div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded-lg">
            <div className="text-lg font-semibold text-purple-600">{signalStats.highConfidence}</div>
            <div className="text-xs text-purple-500">고신뢰도</div>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <div className="text-lg font-semibold text-gray-600">{signalStats.executed}</div>
            <div className="text-xs text-gray-500">실행됨</div>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <FilterIcon className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            >
              <option value="all">모든 타입</option>
              <option value="BUY">매수 신호</option>
              <option value="SELL">매도 신호</option>
            </select>
          </div>
          <select
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="all">모든 신뢰도</option>
            <option value="high">높음 (80%+)</option>
            <option value="medium">보통 (50-80%)</option>
            <option value="low">낮음 (50% 미만)</option>
          </select>
        </div>
      </div>

      {/* 신호 목록 */}
      <div className="space-y-3">
        {filteredSignals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            필터 조건에 맞는 신호가 없습니다.
          </div>
        ) : (
          filteredSignals.map((signal) => {
            const signalStyle = getSignalStyle(signal.type, signal.confidence);
            const confidenceData = getConfidenceLevel(signal.confidence);
            const SignalIcon = signalStyle.icon;

            return (
              <div
                key={signal.id}
                className={`bg-white rounded-lg border ${signalStyle.borderColor} p-4 hover:shadow-md transition-shadow ${signal.executed ? 'opacity-75' : ''
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 ${signalStyle.bgColor} rounded-full flex items-center justify-center`}>
                      <SignalIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900">{signal.symbol}</span>
                        <span className={`px-2 py-0.5 text-xs font-medium ${confidenceData.bgColor} ${confidenceData.color} rounded-full`}>
                          {confidenceData.level} {(signal.confidence * 100).toFixed(0)}%
                        </span>
                        {signal.executed && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full flex items-center">
                            <CheckCircleIcon className="w-3 h-3 mr-1" />
                            실행됨
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                        <div className="flex items-center">
                          <DollarSignIcon className="w-4 h-4 mr-1" />
                          ₩{signal.price.toLocaleString()}
                        </div>
                        <div className="flex items-center">
                          <ClockIcon className="w-4 h-4 mr-1" />
                          {new Date(signal.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${signalStyle.bgColor} text-white`}>
                    {signal.type}
                  </div>
                </div>

                {signal.reason && (
                  <div className="mt-3 p-2 bg-gray-50 rounded text-sm text-gray-700">
                    <div className="flex items-start">
                      <InfoIcon className="w-4 h-4 mr-2 mt-0.5 text-gray-400" />
                      <span>{signal.reason}</span>
                    </div>
                  </div>
                )}

                {signal.volume > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    거래량: ₩{signal.volume.toLocaleString()}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 하단 안내 메시지 */}
      {isActive && filteredSignals.length > 0 && (
        <div className="text-center py-4">
          <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
            <ActivityIcon className="w-4 h-4 mr-2" />
            실시간 업비트 API 기반 신호 분석 중
          </div>
        </div>
      )}
    </div>
  );
};

export default SignalsTab;
