// src/components/features/trading/TradingSettings.jsx - 차등 배분 설정 지원

import React, { useState, useEffect } from "react";
import {
  ChevronDownIcon, ChevronUpIcon, CogIcon, PieChartIcon,
  ClockIcon, TrendingUpIcon, NewspaperIcon, BarChart3Icon
} from "lucide-react";

const TradingSettings = ({ settings, onChange, testMode, marketCondition = null }) => {
  const [localSettings, setLocalSettings] = useState({
    // 기존 설정
    buyThreshold: -1.5,
    sellThreshold: 2.0,
    rsiOversold: 35,
    rsiOverbought: 65,
    volumeThreshold: 1.2,
    minScore: 6.5,
    maxCoinsToTrade: 8,
    reserveCashRatio: 0.15,
    strategy: "balanced",

    // ✅ 새로운 차등 배분 설정
    tierBasedAllocation: true,
    tier1Allocation: 0.55, // BTC, ETH - 55%
    tier2Allocation: 0.30, // 상위 알트코인 - 30%
    tier3Allocation: 0.15, // 나머지 - 15%

    // ✅ 유연한 대기시간 설정
    flexibleWaitTime: true,
    baseWaitTime: 120, // 기본 2시간
    crashBuyWaitTime: 10, // 급락 시 10분
    dipBuyWaitTime: 60, // 하락 시 1시간

    // ✅ 뉴스 기반 조정 설정
    newsBasedAdjustment: true,
    newsPositiveMultiplier: 1.3,
    newsNegativeMultiplier: 0.7,
    newsAdjustmentDuration: 24,

    ...settings,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState("allocation");

  useEffect(() => {
    setLocalSettings((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  // ✅ 시장 상황별 프리셋
  const presetStrategies = {
    conservative: {
      tier1Allocation: 0.70, // BTC/ETH 70%
      tier2Allocation: 0.25, // 알트 25%
      tier3Allocation: 0.05, // 기타 5%
      reserveCashRatio: 0.25,
      minScore: 7.5,
      baseWaitTime: 180,
      strategy: "conservative"
    },
    balanced: {
      tier1Allocation: 0.55, // BTC/ETH 55%
      tier2Allocation: 0.30, // 알트 30%
      tier3Allocation: 0.15, // 기타 15%
      reserveCashRatio: 0.15,
      minScore: 6.5,
      baseWaitTime: 120,
      strategy: "balanced"
    },
    aggressive: {
      tier1Allocation: 0.40, // BTC/ETH 40%
      tier2Allocation: 0.35, // 알트 35%
      tier3Allocation: 0.25, // 기타 25%
      reserveCashRatio: 0.10,
      minScore: 5.5,
      baseWaitTime: 90,
      strategy: "aggressive"
    }
  };

  const handleChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onChange(newSettings);
  };

  const applyPreset = (presetName) => {
    const preset = presetStrategies[presetName];
    const newSettings = { ...localSettings, ...preset };
    setLocalSettings(newSettings);
    onChange(newSettings);
    console.log(`🔧 ${presetName} 전략 적용:`, preset);
  };

  // ✅ 포트폴리오 미리보기 계산
  const getPortfolioPreview = () => {
    const totalAllocation = localSettings.tier1Allocation +
      localSettings.tier2Allocation +
      localSettings.tier3Allocation;
    const cashRatio = localSettings.reserveCashRatio;
    const investableRatio = 1 - cashRatio;

    return {
      tier1Amount: localSettings.tier1Allocation * 1840000,
      tier2Amount: localSettings.tier2Allocation * 1840000,
      tier3Amount: localSettings.tier3Allocation * 1840000,
      cashAmount: cashRatio * 1840000,
      totalAllocation,
      isValid: totalAllocation + cashRatio <= 1.0,
    };
  };

  const preview = getPortfolioPreview();

  // ✅ 시장 조건 경고
  const getMarketWarnings = () => {
    if (!marketCondition) return [];

    const warnings = [];

    if (marketCondition.riskLevel >= 4) {
      warnings.push("⚠️ 고위험 시장 - TIER1 비중 증대 권장");
    }

    if (marketCondition.volatility === 'extreme') {
      warnings.push("🌊 극도 변동성 - 현금 비중 25% 이상 권장");
    }

    if (!marketCondition.isBuyableMarket) {
      warnings.push("🚫 매수 부적절 시장 - 관망 모드 권장");
    }

    return warnings;
  };

  const sections = [
    { id: 'allocation', name: '포트폴리오 배분', icon: PieChartIcon },
    { id: 'timing', name: '거래 타이밍', icon: ClockIcon },
    { id: 'news', name: '뉴스 연동', icon: NewspaperIcon },
    { id: 'technical', name: '기술적 설정', icon: BarChart3Icon },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CogIcon className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-semibold">거래 설정</h3>
          {marketCondition && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              시장분석 연동
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-2 hover:bg-gray-100 rounded"
        >
          {isExpanded ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
        </button>
      </div>

      {/* 시장 경고 */}
      {getMarketWarnings().length > 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          {getMarketWarnings().map((warning, idx) => (
            <div key={idx} className="text-sm text-yellow-800">{warning}</div>
          ))}
        </div>
      )}

      {/* 전략 프리셋 */}
      <div className="mb-4">
        <div className="flex space-x-2">
          {Object.keys(presetStrategies).map((preset) => (
            <button
              key={preset}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1 text-sm rounded ${localSettings.strategy === preset
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {preset === 'conservative' ? '보수적' : preset === 'balanced' ? '균형' : '공격적'}
            </button>
          ))}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* 섹션 탭 */}
          <div className="flex space-x-1 mb-4">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center space-x-1 px-3 py-2 text-sm rounded ${activeSection === section.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <section.icon className="w-4 h-4" />
                <span>{section.name}</span>
              </button>
            ))}
          </div>

          {/* 포트폴리오 배분 섹션 */}
          {activeSection === 'allocation' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">📊 차등 포트폴리오 배분</h4>

              {/* Tier 배분 설정 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TIER1 (BTC, ETH) - {(localSettings.tier1Allocation * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="0.7"
                    step="0.05"
                    value={localSettings.tier1Allocation}
                    onChange={(e) => handleChange('tier1Allocation', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">
                    약 {preview.tier1Amount.toLocaleString()}원
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TIER2 (상위 알트) - {(localSettings.tier2Allocation * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0.2"
                    max="0.4"
                    step="0.05"
                    value={localSettings.tier2Allocation}
                    onChange={(e) => handleChange('tier2Allocation', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">
                    약 {preview.tier2Amount.toLocaleString()}원
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    TIER3 (기타) - {(localSettings.tier3Allocation * 100).toFixed(0)}%
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.25"
                    step="0.05"
                    value={localSettings.tier3Allocation}
                    onChange={(e) => handleChange('tier3Allocation', parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500">
                    약 {preview.tier3Amount.toLocaleString()}원
                  </div>
                </div>
              </div>

              {/* 포트폴리오 미리보기 */}
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-sm">
                  <div>💰 총 투자: {(preview.totalAllocation * 100).toFixed(0)}%</div>
                  <div>🏦 현금 보유: {(localSettings.reserveCashRatio * 100).toFixed(0)}% ({preview.cashAmount.toLocaleString()}원)</div>
                  {!preview.isValid && (
                    <div className="text-red-600 mt-1">⚠️ 총 배분이 100%를 초과합니다</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 거래 타이밍 섹션 */}
          {activeSection === 'timing' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">⏰ 유연한 대기시간 설정</h4>

              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  checked={localSettings.flexibleWaitTime}
                  onChange={(e) => handleChange('flexibleWaitTime', e.target.checked)}
                  className="rounded"
                />
                <label className="text-sm">시장 상황별 유연한 대기시간 적용</label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    기본 대기시간: {localSettings.baseWaitTime}분
                  </label>
                  <input
                    type="range"
                    min="60"
                    max="300"
                    step="30"
                    value={localSettings.baseWaitTime}
                    onChange={(e) => handleChange('baseWaitTime', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    급락 시: {localSettings.crashBuyWaitTime}분
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={localSettings.crashBuyWaitTime}
                    onChange={(e) => handleChange('crashBuyWaitTime', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    하락 시: {localSettings.dipBuyWaitTime}분
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="180"
                    step="15"
                    value={localSettings.dipBuyWaitTime}
                    onChange={(e) => handleChange('dipBuyWaitTime', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded text-sm">
                💡 <strong>유연 대기시간:</strong> 15% 이상 급락 시 {localSettings.crashBuyWaitTime}분,
                5% 이상 하락 시 {localSettings.dipBuyWaitTime}분, 일반적인 경우 {localSettings.baseWaitTime}분 대기
              </div>
            </div>
          )}

          {/* 뉴스 연동 섹션 */}
          {activeSection === 'news' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">📰 뉴스 기반 비중 조정</h4>

              <div className="flex items-center space-x-2 mb-3">
                <input
                  type="checkbox"
                  checked={localSettings.newsBasedAdjustment}
                  onChange={(e) => handleChange('newsBasedAdjustment', e.target.checked)}
                  className="rounded"
                />
                <label className="text-sm">뉴스 점수에 따른 자동 비중 조정</label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    긍정 뉴스 배수: {localSettings.newsPositiveMultiplier}x
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="2.0"
                    step="0.1"
                    value={localSettings.newsPositiveMultiplier}
                    onChange={(e) => handleChange('newsPositiveMultiplier', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    부정 뉴스 배수: {localSettings.newsNegativeMultiplier}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.1"
                    value={localSettings.newsNegativeMultiplier}
                    onChange={(e) => handleChange('newsNegativeMultiplier', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  뉴스 조정 지속시간: {localSettings.newsAdjustmentDuration}시간
                </label>
                <input
                  type="range"
                  min="6"
                  max="72"
                  step="6"
                  value={localSettings.newsAdjustmentDuration}
                  onChange={(e) => handleChange('newsAdjustmentDuration', parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="p-3 bg-green-50 rounded text-sm">
                🔄 <strong>뉴스 조정:</strong> 긍정 뉴스 시 비중 {((localSettings.newsPositiveMultiplier - 1) * 100).toFixed(0)}% 증가,
                부정 뉴스 시 {((1 - localSettings.newsNegativeMultiplier) * 100).toFixed(0)}% 감소하여 {localSettings.newsAdjustmentDuration}시간 유지
              </div>
            </div>
          )}

          {/* 기술적 설정 섹션 */}
          {activeSection === 'technical' && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">📈 기술적 분석 설정</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최소 신호 점수: {localSettings.minScore}
                  </label>
                  <input
                    type="range"
                    min="4.0"
                    max="8.0"
                    step="0.5"
                    value={localSettings.minScore}
                    onChange={(e) => handleChange('minScore', parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최대 포지션 수: {localSettings.maxCoinsToTrade}개
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="12"
                    step="1"
                    value={localSettings.maxCoinsToTrade}
                    onChange={(e) => handleChange('maxCoinsToTrade', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RSI 과매도: {localSettings.rsiOversold}
                  </label>
                  <input
                    type="range"
                    min="20"
                    max="40"
                    step="5"
                    value={localSettings.rsiOversold}
                    onChange={(e) => handleChange('rsiOversold', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    RSI 과매수: {localSettings.rsiOverbought}
                  </label>
                  <input
                    type="range"
                    min="60"
                    max="80"
                    step="5"
                    value={localSettings.rsiOverbought}
                    onChange={(e) => handleChange('rsiOverbought', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TradingSettings;
