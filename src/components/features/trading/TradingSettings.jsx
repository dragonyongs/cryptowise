// src/components/features/testing/TradingSettings.jsx - 다크모드 완벽 적용 + 테스트 모드 UI 완성 버전

import React, { useState, useEffect } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CogIcon,
  PieChartIcon,
  ClockIcon,
  TrendingUpIcon,
  NewspaperIcon,
  BarChart3Icon,
  SaveIcon,
  RefreshCwIcon,
  CheckIcon,
  AlertTriangleIcon,
  InfoIcon,
  TestTubeIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ZapIcon
} from "lucide-react";

// ✅ 개선된 정규화 함수 - 비율 유지하면서 100% 강제
const normalizeAllocations = (allocations) => {
  const { cash, t1, t2, t3 } = allocations;
  const total = cash + t1 + t2 + t3;

  if (Math.abs(total - 1) > 0.001) {
    return {
      cash: cash / total,
      t1: t1 / total,
      t2: t2 / total,
      t3: t3 / total
    };
  }

  return { cash, t1, t2, t3 };
};

// ✅ 슬라이더 연동 조정 함수
const adjustOtherAllocations = (changedKey, newValue, currentAllocations) => {
  const keys = ['cash', 't1', 't2', 't3'];
  const otherKeys = keys.filter(key => key !== changedKey);

  const otherSum = otherKeys.reduce((sum, key) => sum + currentAllocations[key], 0);
  const remainingValue = 1 - newValue;

  if (otherSum === 0) {
    const equalShare = remainingValue / otherKeys.length;
    const result = { ...currentAllocations, [changedKey]: newValue };
    otherKeys.forEach(key => {
      result[key] = equalShare;
    });
    return result;
  }

  const ratio = remainingValue / otherSum;
  const result = { ...currentAllocations, [changedKey]: newValue };

  otherKeys.forEach(key => {
    result[key] = currentAllocations[key] * ratio;
  });

  return result;
};

const TradingSettings = ({
  settings = {},
  onChange = () => { },
  testMode = false,
  marketCondition = null,
  onToggleTestMode = () => { },
  tradingMode = "favorites",
  onTradingModeChange = () => { },
  topCoinsLimit = 10,
  onTopCoinsLimitChange = () => { }
}) => {
  // 기본 설정값
  const baseDefaults = {
    buyThreshold: -2.0,
    sellThreshold: 3.0,
    rsiOversold: 30,
    rsiOverbought: 70,
    volumeThreshold: 1.5,
    minScore: 8.0,
    maxCoinsToTrade: 4,
    strategy: "conservative",
    tierBasedAllocation: true,
  };

  // ✅ 테스트 모드 전용 설정
  const testModeDefaults = {
    ...baseDefaults,
    buyThreshold: -1.5,
    minScore: 6.0,
    rsiOversold: 35,
    rsiOverbought: 65,
    maxCoinsToTrade: 6,
    ignoreMarketConditions: true,
    bypassMinScore: false,
    allowBearMarketTrading: true,
    reducedRiskChecks: true,
  };

  const getCurrentDefaults = () => testMode ? testModeDefaults : baseDefaults;

  // 상태 관리
  const initialAllocations = normalizeAllocations({
    cash: settings.reserveCashRatio ?? 0.4,
    t1: settings.tier1Allocation ?? 0.42,
    t2: settings.tier2Allocation ?? 0.15,
    t3: settings.tier3Allocation ?? 0.03,
  });

  const [localSettings, setLocalSettings] = useState({
    ...getCurrentDefaults(),
    ...settings,
    reserveCashRatio: initialAllocations.cash,
    tier1Allocation: initialAllocations.t1,
    tier2Allocation: initialAllocations.t2,
    tier3Allocation: initialAllocations.t3,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState("allocation");
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSettings, setSavedSettings] = useState({});

  // ✅ 테스트 모드 변경 시 설정 업데이트
  useEffect(() => {
    const currentDefaults = getCurrentDefaults();
    setLocalSettings(prev => ({
      ...currentDefaults,
      ...prev,
      testMode: testMode,
      ignoreMarketConditions: testMode,
    }));
  }, [testMode]);

  useEffect(() => {
    const normalizedSettings = {
      ...settings,
      ...normalizeAllocations({
        cash: settings.reserveCashRatio ?? 0.4,
        t1: settings.tier1Allocation ?? 0.42,
        t2: settings.tier2Allocation ?? 0.15,
        t3: settings.tier3Allocation ?? 0.03,
      })
    };

    setLocalSettings(prev => ({
      ...prev,
      ...normalizedSettings,
      reserveCashRatio: normalizedSettings.cash,
      tier1Allocation: normalizedSettings.t1,
      tier2Allocation: normalizedSettings.t2,
      tier3Allocation: normalizedSettings.t3,
    }));
    setSavedSettings(normalizedSettings);
  }, [settings]);

  useEffect(() => {
    const hasUnsavedChanges = JSON.stringify(localSettings) !== JSON.stringify(savedSettings);
    setHasChanges(hasUnsavedChanges);
  }, [localSettings, savedSettings]);

  // 프리셋 전략들 (테스트 모드 고려)
  const presetStrategies = {
    ultraConservative: {
      reserveCashRatio: 0.5,
      tier1Allocation: 0.4,
      tier2Allocation: 0.075,
      tier3Allocation: 0.025,
      minScore: testMode ? 7.0 : 9.0,
      baseWaitTime: 240,
      maxCoinsToTrade: testMode ? 3 : 2,
      buyThreshold: testMode ? -2.5 : -3.0,
      strategy: "ultraConservative"
    },
    conservative: {
      reserveCashRatio: 0.4,
      tier1Allocation: 0.42,
      tier2Allocation: 0.15,
      tier3Allocation: 0.03,
      minScore: testMode ? 6.5 : 8.5,
      baseWaitTime: 180,
      maxCoinsToTrade: testMode ? 4 : 3,
      buyThreshold: testMode ? -2.0 : -2.5,
      strategy: "conservative"
    },
    balanced: {
      reserveCashRatio: 0.3,
      tier1Allocation: 0.385,
      tier2Allocation: 0.21,
      tier3Allocation: 0.105,
      minScore: testMode ? 6.0 : 8.0,
      baseWaitTime: 120,
      maxCoinsToTrade: testMode ? 5 : 4,
      buyThreshold: testMode ? -1.5 : -2.0,
      strategy: "balanced"
    },
    aggressive: {
      reserveCashRatio: 0.25,
      tier1Allocation: 0.3,
      tier2Allocation: 0.2625,
      tier3Allocation: 0.1875,
      minScore: testMode ? 5.5 : 7.5,
      baseWaitTime: 90,
      maxCoinsToTrade: testMode ? 6 : 5,
      buyThreshold: testMode ? -1.0 : -1.5,
      strategy: "aggressive"
    }
  };

  // 함수들
  const handleAllocationChange = (key, value) => {
    const numValue = parseFloat(value);
    if (numValue < 0 || numValue > 1) return;

    const currentAllocations = {
      cash: localSettings.reserveCashRatio,
      t1: localSettings.tier1Allocation,
      t2: localSettings.tier2Allocation,
      t3: localSettings.tier3Allocation
    };

    const adjustedAllocations = adjustOtherAllocations(key, numValue, currentAllocations);

    setLocalSettings(prev => ({
      ...prev,
      reserveCashRatio: adjustedAllocations.cash,
      tier1Allocation: adjustedAllocations.t1,
      tier2Allocation: adjustedAllocations.t2,
      tier3Allocation: adjustedAllocations.t3,
    }));
  };

  const setValue = (key) => (val) => {
    setLocalSettings(prev => ({ ...prev, [key]: val }));
  };

  const applySettings = () => {
    const finalSettings = normalizeAllocations({
      cash: localSettings.reserveCashRatio,
      t1: localSettings.tier1Allocation,
      t2: localSettings.tier2Allocation,
      t3: localSettings.tier3Allocation,
    });

    const settingsToApply = {
      ...localSettings,
      reserveCashRatio: finalSettings.cash,
      tier1Allocation: finalSettings.t1,
      tier2Allocation: finalSettings.t2,
      tier3Allocation: finalSettings.t3,
      testMode: testMode,
    };

    if (typeof onChange === "function") {
      onChange(settingsToApply);
      setSavedSettings(settingsToApply);
      setHasChanges(false);
      console.log("🔧 설정 적용 완료:", settingsToApply);
    }
  };

  const resetSettings = () => {
    setLocalSettings(savedSettings);
    setHasChanges(false);
  };

  const applyPreset = (presetName) => {
    const preset = presetStrategies[presetName];
    if (!preset) {
      console.warn(`Warning: Preset "${presetName}" not found`);
      return;
    }

    const normalizedPreset = normalizeAllocations({
      cash: preset.reserveCashRatio,
      t1: preset.tier1Allocation,
      t2: preset.tier2Allocation,
      t3: preset.tier3Allocation,
    });

    const newSettings = {
      ...localSettings,
      ...preset,
      reserveCashRatio: normalizedPreset.cash,
      tier1Allocation: normalizedPreset.t1,
      tier2Allocation: normalizedPreset.t2,
      tier3Allocation: normalizedPreset.t3,
    };

    setLocalSettings(newSettings);
    console.log(`🔧 ${presetName} 전략 프리셋 적용 (테스트모드: ${testMode}):`, newSettings);
  };

  const getPortfolioPreview = () => {
    const total = localSettings.reserveCashRatio + localSettings.tier1Allocation +
      localSettings.tier2Allocation + localSettings.tier3Allocation;

    return {
      tier1Amount: Math.floor(localSettings.tier1Allocation * 1840000),
      tier2Amount: Math.floor(localSettings.tier2Allocation * 1840000),
      tier3Amount: Math.floor(localSettings.tier3Allocation * 1840000),
      cashAmount: Math.floor(localSettings.reserveCashRatio * 1840000),
      investmentTotal: localSettings.tier1Allocation + localSettings.tier2Allocation + localSettings.tier3Allocation,
      totalAllocation: total,
      isValid: Math.abs(total - 1) < 0.001,
      efficiency: (localSettings.tier1Allocation + localSettings.tier2Allocation + localSettings.tier3Allocation) >= 0.5 ? "적정" : "보수적",
      tier1Percent: (localSettings.tier1Allocation * 100).toFixed(1),
      tier2Percent: (localSettings.tier2Allocation * 100).toFixed(1),
      tier3Percent: (localSettings.tier3Allocation * 100).toFixed(1),
      cashPercent: (localSettings.reserveCashRatio * 100).toFixed(1),
      totalPercent: (total * 100).toFixed(1),
    };
  };

  const getMarketWarnings = () => {
    if (!marketCondition) return [];
    const warnings = [];

    if (testMode) {
      warnings.push("🧪 테스트 모드 활성 - 시장 조건을 무시하고 로직 검증 진행");
      if (marketCondition.riskLevel >= 4) {
        warnings.push("📊 참고: 실제로는 고위험 시장 (TIER1 80% 이상 권장)");
      }
      if (!marketCondition.isBuyableMarket) {
        warnings.push("📊 참고: 실제로는 매수 금지 시장");
      }
      if (marketCondition.overallBuyScore < 70) {
        warnings.push("📊 참고: 실제로는 약세 시장 (9.0점 이상 신호만 진입)");
      }
    } else {
      if (marketCondition.riskLevel >= 4) {
        warnings.push("🚨 고위험 시장 - TIER1 80% 이상 권장");
      }
      if (marketCondition.volatility === 'extreme') {
        warnings.push("⚡ 극변동성 - 현금 비중 50% 이상 필수");
      }
      if (!marketCondition.isBuyableMarket) {
        warnings.push("🛑 매수 금지 시장 - 전체 매수 중단 권장");
      }
      if (marketCondition.overallBuyScore < 70) {
        warnings.push("📉 약세 시장 - 9.0점 이상 신호만 진입");
      }
    }

    return warnings;
  };

  const preview = getPortfolioPreview();
  const sections = [
    { id: 'allocation', name: '포트폴리오 배분', icon: PieChartIcon },
    { id: 'timing', name: '거래 타이밍', icon: ClockIcon },
    { id: 'coins', name: '코인 선별', icon: TrendingUpIcon },
    { id: 'technical', name: '기술적 설정', icon: BarChart3Icon },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* ✅ 헤더 - 완전한 다크모드 적용 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CogIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              트레이딩 설정
            </h3>

            {/* ✅ 테스트 모드 표시 - 완전한 다크모드 */}
            {testMode && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900 dark:to-yellow-900 text-orange-800 dark:text-orange-200 rounded-full text-xs font-medium border border-orange-200 dark:border-orange-700">
                <TestTubeIcon className="w-3 h-3" />
                <SparklesIcon className="w-3 h-3" />
                <span>테스트 모드</span>
              </div>
            )}

            {hasChanges && (
              <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full border border-blue-200 dark:border-blue-700">
                변경됨
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* ✅ 테스트 모드 토글 버튼 - 완전한 다크모드 */}
            {/* <button
              onClick={onToggleTestMode}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-2 ${testMode
                ? 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white border-orange-400 shadow-lg'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'
                }`}
              title={testMode ? "실전 모드로 전환" : "테스트 모드로 전환"}
            >
              {testMode ? (
                <>
                  <TestTubeIcon className="w-4 h-4" />
                  <span>테스트</span>
                  <ZapIcon className="w-3 h-3" />
                </>
              ) : (
                <>
                  <ShieldCheckIcon className="w-4 h-4" />
                  <span>실전</span>
                </>
              )}
            </button> */}

            {hasChanges && (
              <>
                <button
                  onClick={resetSettings}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                  title="변경사항 취소"
                >
                  <RefreshCwIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={applySettings}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-sm font-medium transition-colors shadow-sm"
                >
                  <SaveIcon className="w-4 h-4" />
                  <span>적용</span>
                </button>
              </>
            )}

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              {isExpanded ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* ✅ 시장 경고 - 완전한 다크모드 */}
        {getMarketWarnings().length > 0 && (
          <div className="mt-4 space-y-2">
            {getMarketWarnings().map((warning, index) => (
              <div
                key={index}
                className={`flex items-center space-x-2 text-sm px-4 py-3 rounded-lg border ${testMode
                  ? "text-blue-700 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/50 border-blue-200 dark:border-blue-800"
                  : warning.includes('🚨') || warning.includes('🛑')
                    ? "text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900/50 border-red-200 dark:border-red-800"
                    : "text-orange-700 dark:text-orange-200 bg-orange-50 dark:bg-orange-900/50 border-orange-200 dark:border-orange-800"
                  }`}
              >
                {testMode ? (
                  <InfoIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <AlertTriangleIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                )}
                <span className="font-medium">{warning}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ 테스트 모드 정보 패널 - 완전한 다크모드 */}
      {isExpanded && testMode && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-3 mb-3">
            <div className="flex items-center space-x-2">
              <TestTubeIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <SparklesIcon className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
            </div>
            <h4 className="font-bold text-blue-900 dark:text-blue-100">테스트 모드 활성화</h4>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-200">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>최소 신호 점수: <strong>8.0 → 6.0점</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>매수 기준점: <strong>-2.0% → -1.5%</strong></span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>최대 동시 거래: <strong>4 → 6개</strong></span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>시장 조건 무시 활성</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ 메인 콘텐츠 */}
      {isExpanded && (
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
          {/* ✅ 섹션 탭 - 완전한 다크모드 */}
          <div className="flex space-x-1 mb-6 bg-gray-200 dark:bg-gray-800 p-1 rounded-xl">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center ${activeSection === section.id
                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200 dark:border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{section.name}</span>
                </button>
              );
            })}
          </div>

          {/* ✅ 포트폴리오 배분 섹션 */}
          {activeSection === 'allocation' && (
            <div className="space-y-6">
              {/* 프리셋 버튼들 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  전략 프리셋 {testMode && <span className="text-blue-600 dark:text-blue-400 text-sm">(테스트 완화)</span>}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.keys(presetStrategies).map((presetName) => (
                    <button
                      key={presetName}
                      onClick={() => applyPreset(presetName)}
                      className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-500 transition-colors text-center"
                    >
                      <div className="text-sm font-medium text-gray-900 dark:text-white capitalize mb-1">
                        {presetName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {presetStrategies[presetName].minScore}점
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 할당 슬라이더들 */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">포트폴리오 배분</h4>
                <div className="space-y-4">
                  {/* 현금 슬라이더 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      현금 비중 ({preview.cashPercent}%) - ₩{preview.cashAmount.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.8"
                      step="0.01"
                      value={localSettings.reserveCashRatio}
                      onChange={(e) => handleAllocationChange('cash', e.target.value)}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-cash"
                    />
                  </div>

                  {/* TIER1 슬라이더 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      TIER1 (BTC, ETH) ({preview.tier1Percent}%) - ₩{preview.tier1Amount.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.8"
                      step="0.01"
                      value={localSettings.tier1Allocation}
                      onChange={(e) => handleAllocationChange('t1', e.target.value)}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-tier1"
                    />
                  </div>

                  {/* TIER2 슬라이더 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      TIER2 (상위 알트코인) ({preview.tier2Percent}%) - ₩{preview.tier2Amount.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.5"
                      step="0.01"
                      value={localSettings.tier2Allocation}
                      onChange={(e) => handleAllocationChange('t2', e.target.value)}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-tier2"
                    />
                  </div>

                  {/* TIER3 슬라이더 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      TIER3 (기타 코인) ({preview.tier3Percent}%) - ₩{preview.tier3Amount.toLocaleString()}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.3"
                      step="0.01"
                      value={localSettings.tier3Allocation}
                      onChange={(e) => handleAllocationChange('t3', e.target.value)}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-tier3"
                    />
                  </div>
                </div>

                {/* 포트폴리오 미리보기 */}
                <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">포트폴리오 미리보기</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">총 할당:</div>
                      <div className={`font-bold ${preview.isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {preview.totalPercent}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">투자 효율:</div>
                      <div className="font-bold text-gray-900 dark:text-white">{preview.efficiency}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ 거래 타이밍 섹션 */}
          {activeSection === 'timing' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  매수/매도 기준점 {testMode && <span className="text-blue-600 dark:text-blue-400 text-sm">(테스트 완화)</span>}
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      매수 기준점 ({localSettings.buyThreshold}%)
                      {testMode && <span className="text-blue-600 dark:text-blue-400 ml-2">← 완화됨</span>}
                    </label>
                    <input
                      type="range"
                      min="-5"
                      max="0"
                      step="0.1"
                      value={localSettings.buyThreshold}
                      onChange={(e) => setValue('buyThreshold')(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>-5%</span>
                      <span>0%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      매도 기준점 ({localSettings.sellThreshold}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={localSettings.sellThreshold}
                      onChange={(e) => setValue('sellThreshold')(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>0%</span>
                      <span>10%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  거래 빈도 제어 {testMode && <span className="text-blue-600 dark:text-blue-400 text-sm">(테스트 완화)</span>}
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      최소 신호 점수 ({localSettings.minScore}점)
                      {testMode && <span className="text-blue-600 dark:text-blue-400 ml-2">← 완화됨</span>}
                    </label>
                    <input
                      type="range"
                      min={testMode ? "5" : "6"}
                      max="10"
                      step="0.1"
                      value={localSettings.minScore}
                      onChange={(e) => setValue('minScore')(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{testMode ? '5' : '6'}점</span>
                      <span>10점</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      최대 동시 거래 ({localSettings.maxCoinsToTrade}개)
                      {testMode && <span className="text-blue-600 dark:text-blue-400 ml-2">← 증가됨</span>}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max={testMode ? "8" : "6"}
                      step="1"
                      value={localSettings.maxCoinsToTrade}
                      onChange={(e) => setValue('maxCoinsToTrade')(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>1개</span>
                      <span>{testMode ? '8' : '6'}개</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ✅ 코인 선별 섹션 (새로 추가) */}
          {activeSection === 'coins' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">상위 코인 선별 설정</h4>

                {/* 트레이딩 모드 선택 */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button
                    onClick={() => onTradingModeChange("favorites")}
                    className={`p-4 rounded-lg border-2 transition-colors text-left ${tradingMode === "favorites"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                  >
                    <div className="font-medium mb-1">관심 코인 모드</div>
                    <div className="text-sm opacity-75">직접 선택한 코인들로만 거래</div>
                  </button>

                  <button
                    onClick={() => onTradingModeChange("top")}
                    className={`p-4 rounded-lg border-2 transition-colors text-left ${tradingMode === "top"
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
                      : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500"
                      }`}
                  >
                    <div className="font-medium mb-1">상위 코인 모드</div>
                    <div className="text-sm opacity-75">성과 기준 상위 {topCoinsLimit}개 자동선별</div>
                  </button>
                </div>

                {/* 상위 코인 개수 설정 (top 모드일 때만 표시) */}
                {tradingMode === "top" && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="font-semibold text-green-900 dark:text-green-200 flex items-center">
                        <TrendingUpIcon className="w-4 h-4 mr-2" />
                        상위 코인 개수 설정
                      </h5>
                      <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                        현재: {topCoinsLimit}개
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="20"
                      value={topCoinsLimit}
                      onChange={(e) => onTopCoinsLimitChange(parseInt(e.target.value))}
                      className="w-full h-2 bg-green-200 dark:bg-green-800 rounded-lg appearance-none cursor-pointer mb-2"
                    />
                    <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                      <span>5개 (보수적)</span>
                      <span>10개 (균형)</span>
                      <span>15개 (적극적)</span>
                      <span>20개 (최대)</span>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-3">
                      업비트 원화마켓에서 거래량과 모멘텀 기준 상위 {topCoinsLimit}개 코인을 자동 선별합니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ✅ 기술적 설정 섹션 */}
          {activeSection === 'technical' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  RSI 설정 {testMode && <span className="text-blue-600 dark:text-blue-400 text-sm">(테스트 완화)</span>}
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      RSI 과매도 ({localSettings.rsiOversold})
                      {testMode && <span className="text-blue-600 dark:text-blue-400 ml-2">← 완화됨</span>}
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="40"
                      step="1"
                      value={localSettings.rsiOversold}
                      onChange={(e) => setValue('rsiOversold')(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>20</span>
                      <span>40</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      RSI 과매수 ({localSettings.rsiOverbought})
                      {testMode && <span className="text-blue-600 dark:text-blue-400 ml-2">← 완화됨</span>}
                    </label>
                    <input
                      type="range"
                      min="60"
                      max="80"
                      step="1"
                      value={localSettings.rsiOverbought}
                      onChange={(e) => setValue('rsiOverbought')(parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>60</span>
                      <span>80</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">거래량 임계값</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    평균 대비 거래량 배수 ({localSettings.volumeThreshold}배)
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="3.0"
                    step="0.1"
                    value={localSettings.volumeThreshold}
                    onChange={(e) => setValue('volumeThreshold')(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>1.0배</span>
                    <span>2.0배</span>
                    <span>3.0배</span>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                업비트 원화마켓에서 거래량과 모멘텀 기준 상위 {topCoinsLimit}개 코인을 자동 선별합니다.
                {testMode && (
                  <span className="text-amber-600 dark:text-amber-400 ml-2">
                    (테스트 모드에서도 설정값 {topCoinsLimit}개 사용)
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TradingSettings;
