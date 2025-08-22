// src/features/trading/components/TradingSettings.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CogIcon,
  PieChartIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  BarChart3Icon,
  SaveIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  InfoIcon,
  TestTubeIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ZapIcon,
  XIcon,
  SlidersIcon,
  DollarSignIcon,
  PercentIcon,
  TimerIcon
} from "lucide-react";

// 기존 정규화/유틸들 (원본 유지)
const normalizeAllocations = (allocations) => {
  const { cash, t1, t2, t3 } = allocations;
  const total = cash + t1 + t2 + t3;
  if (Math.abs(total - 1) > 0.001) {
    return {
      cash: cash / total,
      t1: t1 / total,
      t2: t2 / total,
      t3: t3 / total,
    };
  }
  return { cash, t1, t2, t3 };
};

const adjustOtherAllocations = (changedKey, newValue, currentAllocations) => {
  const keys = ["cash", "t1", "t2", "t3"];
  const otherKeys = keys.filter((key) => key !== changedKey);
  const otherSum = otherKeys.reduce((sum, key) => sum + currentAllocations[key], 0);
  const remainingValue = 1 - newValue;

  if (otherSum === 0) {
    const equalShare = remainingValue / otherKeys.length;
    const result = { ...currentAllocations, [changedKey]: newValue };
    otherKeys.forEach((key) => {
      result[key] = equalShare;
    });
    return result;
  }

  const ratio = remainingValue / otherSum;
  const result = { ...currentAllocations, [changedKey]: newValue };
  otherKeys.forEach((key) => {
    result[key] = currentAllocations[key] * ratio;
  });
  return result;
};

// NumberInput 컴포넌트 (원본 유지)
const NumberInput = React.memo(({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  unit = "%",
  placeholder,
  icon: Icon = null,
  disabled = false
}) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
        {Icon && <Icon className="w-4 h-4 mr-1" />}
        {label}
      </label>
      <div className="flex items-center space-x-2">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        <span className="text-sm text-gray-500 dark:text-gray-400 min-w-[20px]">{unit}</span>
      </div>
    </div>
  );
});

const TradingSettings = ({
  settings = {},
  onSettingsChange = () => { },
  isActive = false,
  onClose = () => { },
  testMode = false,
  marketCondition = null,
  onToggleTestMode = () => { },
  tradingMode = "favorites",
  onTradingModeChange = () => { },
  topCoinsLimit = 10,
  onTopCoinsLimitChange = () => { }
}) => {

  const getDefaultTradingSettings = useCallback(() => ({
    portfolioAllocation: {
      cash: 0.4,
      t1: 0.42,
      t2: 0.15,
      t3: 0.03,
    },
    tradingConditions: {
      buyConditions: {
        minBuyScore: testMode ? 6.0 : 8.0,
        rsiOversold: testMode ? 35 : 30,
        strongBuyScore: testMode ? 8.0 : 9.0,
        buyThreshold: testMode ? -1.5 : -2.0,
        requireMultipleSignals: true,
      },
      sellConditions: {
        profitTarget1: 3,
        profitTarget2: 5,
        profitTarget3: 8,
        stopLoss: -6,
        sellThreshold: testMode ? 2.0 : 3.0,
        rsiOverbought: testMode ? 65 : 70,
        timeBasedExit: 7,
      },
      riskManagement: {
        maxCoinsToTrade: testMode ? 6 : 4,
        reserveCashRatio: 0.3,
        maxSinglePosition: 15,
        dailyTradeLimit: testMode ? 12 : 6,
        volumeThreshold: 1.5,
      }
    },
    strategy: "balanced",
    testMode: testMode,
  }), [testMode]);

  const [tempSettings, setTempSettings] = useState(() => getDefaultTradingSettings());
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState("allocation");
  const [hasChanges, setHasChanges] = useState(false);
  const prevSettingsRef = useRef(settings);

  const presetStrategies = useMemo(() => ({
    ultraConservative: { // 초보수적 (가장 보수적)
      portfolioAllocation: { cash: 0.7, t1: 0.2, t2: 0.08, t3: 0.02 },
      tradingConditions: {
        buyConditions: { minBuyScore: 9.0, rsiOversold: 38, strongBuyScore: 8.5, buyThreshold: -1.0, requireMultipleSignals: true },
        sellConditions: { profitTarget1: 2, profitTarget2: 4, profitTarget3: 6, stopLoss: -4, sellThreshold: 2.0, rsiOverbought: 66, timeBasedExit: 10 },
        riskManagement: { maxCoinsToTrade: 3, reserveCashRatio: 0.5, maxSinglePosition: 10, dailyTradeLimit: 4, volumeThreshold: 1.2 }
      },
      strategy: "ultraConservative"
    },
    conservative: {
      portfolioAllocation: { cash: 0.55, t1: 0.3, t2: 0.12, t3: 0.03 },
      tradingConditions: {
        buyConditions: { minBuyScore: 8.0, rsiOversold: 36, strongBuyScore: 8.8, buyThreshold: -1.5, requireMultipleSignals: true },
        sellConditions: { profitTarget1: 3, profitTarget2: 5, profitTarget3: 7, stopLoss: -5, sellThreshold: 2.5, rsiOverbought: 68, timeBasedExit: 8 },
        riskManagement: { maxCoinsToTrade: 4, reserveCashRatio: 0.4, maxSinglePosition: 12, dailyTradeLimit: 5, volumeThreshold: 1.3 }
      },
      strategy: "conservative"
    },
    balanced: {
      ortfolioAllocation: { cash: 0.4, t1: 0.42, t2: 0.15, t3: 0.03 },
      tradingConditions: {
        buyConditions: { minBuyScore: 6.5, rsiOversold: 30, strongBuyScore: 9.0, buyThreshold: -2.0, requireMultipleSignals: true },
        sellConditions: { profitTarget1: 3, profitTarget2: 5, profitTarget3: 8, stopLoss: -6, sellThreshold: 3.0, rsiOverbought: 70, timeBasedExit: 7 },
        riskManagement: { maxCoinsToTrade: 4, reserveCashRatio: 0.3, maxSinglePosition: 15, dailyTradeLimit: 6, volumeThreshold: 1.5 }
      },
      strategy: "balanced"
    },
    aggressive: { // 적극적 (가장 공격적)
      portfolioAllocation: { cash: 0.2, t1: 0.5, t2: 0.2, t3: 0.1 },
      tradingConditions: {
        buyConditions: { minBuyScore: 4.5, rsiOversold: 28, strongBuyScore: 9.5, buyThreshold: -3.0, requireMultipleSignals: false },
        sellConditions: { profitTarget1: 4, profitTarget2: 8, profitTarget3: 12, stopLoss: -8, sellThreshold: 4.0, rsiOverbought: 72, timeBasedExit: 5 },
        riskManagement: { maxCoinsToTrade: 6, reserveCashRatio: 0.15, maxSinglePosition: 20, dailyTradeLimit: 10, volumeThreshold: 1.8 }
      },
      strategy: "aggressive"
    }
  }), [testMode]);

  useEffect(() => {
    if (settings && JSON.stringify(settings) !== JSON.stringify(prevSettingsRef.current)) {
      const defaultSettings = getDefaultTradingSettings();
      const mergedSettings = {
        ...defaultSettings,
        ...settings,
        portfolioAllocation: {
          ...defaultSettings.portfolioAllocation,
          ...(settings.portfolioAllocation || {})
        },
        tradingConditions: {
          ...defaultSettings.tradingConditions,
          ...(settings.tradingConditions || {})
        }
      };
      setTempSettings(mergedSettings);
      prevSettingsRef.current = settings;
      setHasChanges(false);
    }
  }, [settings, getDefaultTradingSettings]);

  useEffect(() => {
    if (JSON.stringify(tempSettings) !== JSON.stringify(prevSettingsRef.current)) {
      setHasChanges(true);
    } else {
      setHasChanges(false);
    }
  }, [tempSettings]);

  const updateTradingCondition = useCallback((section, key, value) => {
    setTempSettings(prev => ({
      ...prev,
      tradingConditions: {
        ...prev.tradingConditions,
        [section]: {
          ...prev.tradingConditions[section],
          [key]: value
        }
      }
    }));
  }, []);

  const handleAllocationChange = useCallback((key, value) => {
    const numValue = parseFloat(value);
    if (numValue < 0 || numValue > 1) return;

    const currentAllocations = {
      cash: tempSettings.portfolioAllocation?.cash || 0.3,
      t1: tempSettings.portfolioAllocation?.t1 || 0.4,
      t2: tempSettings.portfolioAllocation?.t2 || 0.2,
      t3: tempSettings.portfolioAllocation?.t3 || 0.1,
    };

    const adjustedAllocations = adjustOtherAllocations(key, numValue, currentAllocations);

    setTempSettings(prev => ({
      ...prev,
      portfolioAllocation: adjustedAllocations,
    }));
  }, [tempSettings.portfolioAllocation]);

  const applyPreset = useCallback((presetName) => {
    const preset = presetStrategies[presetName];
    if (!preset) {
      console.warn(`Preset "${presetName}" not found`);
      return;
    }

    // portfolioAllocation이 없을 경우 기본값 사용
    const normalizedAllocation = preset.portfolioAllocation
      ? normalizeAllocations(preset.portfolioAllocation)
      : normalizeAllocations(getDefaultTradingSettings().portfolioAllocation);

    const newSettings = {
      ...tempSettings,
      portfolioAllocation: normalizedAllocation,
      tradingConditions: preset.tradingConditions || getDefaultTradingSettings().tradingConditions,
      strategy: preset.strategy || tempSettings.strategy,
    };

    setTempSettings(newSettings);
    console.log(`🔧 ${presetName} 전략 프리셋 적용 (테스트모드: ${testMode}):`, newSettings);
  }, [presetStrategies, tempSettings, testMode, getDefaultTradingSettings]);

  // --------------------------
  // ✅ 변경: 저장 시 로컬스토리지에도 저장 (TradingStatus와 동기화)
  // --------------------------
  const handleSave = useCallback(() => {
    const normalizedSettings = {
      ...tempSettings,
      portfolioAllocation: normalizeAllocations(tempSettings.portfolioAllocation),
    };

    console.log("💾 [TradingSettings] 저장할 설정:", normalizedSettings);
    console.log("💾 [TradingSettings] minBuyScore 값:", normalizedSettings.tradingConditions?.buyConditions?.minBuyScore);

    // props로 전달된 함수 호출 (예: setTradingSettings)
    onSettingsChange?.(normalizedSettings);

    // 로컬스토리지에 저장해서 TradingStatus가 즉시 읽을 수 있도록 함
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        const savedConfig = {
          portfolioAllocation: normalizedSettings.portfolioAllocation,
          buyConditions: {
            minScore: normalizedSettings.tradingConditions?.buyConditions?.minBuyScore ?? null,
            rsiThreshold: normalizedSettings.tradingConditions?.buyConditions?.rsiOversold ?? null,
            confidenceLevel: normalizedSettings.tradingConditions?.buyConditions?.strongBuyScore
              ? (normalizedSettings.tradingConditions.buyConditions.strongBuyScore / 10)
              : 0
          },
          sellConditions: {
            profitTarget: normalizedSettings.tradingConditions?.sellConditions?.profitTarget1 ?? null,
            stopLoss: normalizedSettings.tradingConditions?.sellConditions?.stopLoss ?? null,
            rsiOverbought: normalizedSettings.tradingConditions?.sellConditions?.rsiOverbought ?? null
          },
          tradingConditions: normalizedSettings.tradingConditions,
          strategy: normalizedSettings.strategy,
          savedAt: new Date().toISOString()
        };

        window.localStorage.setItem('cryptowise_trading_config', JSON.stringify(savedConfig));
        console.log("💾 로컬 저장소에 저장됨: cryptowise_trading_config", savedConfig);
      }
    } catch (error) {
      console.error("로컬 저장 실패:", error);
    }

    prevSettingsRef.current = normalizedSettings;
    setHasChanges(false);

    console.log("✅ [TradingSettings] 설정 저장 완료");
  }, [tempSettings, onSettingsChange]);

  const handleReset = useCallback(() => {
    setTempSettings(getDefaultTradingSettings());
    setHasChanges(true);
  }, [getDefaultTradingSettings]);


  const tradingConditions = useMemo(() => {
    const defaultConditions = getDefaultTradingSettings().tradingConditions;

    if (!tempSettings?.tradingConditions) {
      return defaultConditions;
    }

    return {
      buyConditions: {
        ...defaultConditions.buyConditions,
        ...(tempSettings.tradingConditions.buyConditions || {})
      },
      sellConditions: {
        ...defaultConditions.sellConditions,
        ...(tempSettings.tradingConditions.sellConditions || {})
      },
      riskManagement: {
        ...defaultConditions.riskManagement,
        ...(tempSettings.tradingConditions.riskManagement || {})
      }
    };
  }, [tempSettings, getDefaultTradingSettings]);

  const buyConditions = tradingConditions.buyConditions;
  const sellConditions = tradingConditions.sellConditions;
  const riskManagement = tradingConditions.riskManagement;

  const portfolioPreview = useMemo(() => {
    const allocation = tempSettings.portfolioAllocation || {};
    const total = (allocation.cash || 0) + (allocation.t1 || 0) + (allocation.t2 || 0) + (allocation.t3 || 0);

    return {
      tier1Amount: Math.floor((allocation.t1 || 0) * 1840000),
      tier2Amount: Math.floor((allocation.t2 || 0) * 1840000),
      tier3Amount: Math.floor((allocation.t3 || 0) * 1840000),
      cashAmount: Math.floor((allocation.cash || 0) * 1840000),
      totalPercent: (total * 100).toFixed(1),
      isValid: Math.abs(total - 1) < 0.001,
    };
  }, [tempSettings.portfolioAllocation]);

  const sections = [
    { id: 'allocation', name: '포트폴리오 배분', icon: PieChartIcon },
    { id: 'trading', name: '거래 조건', icon: ZapIcon },
    { id: 'timing', name: '거래 타이밍', icon: ClockIcon },
    { id: 'technical', name: '기술적 설정', icon: BarChart3Icon },
  ];

  // --- 전체 UI (원본 구조 재사용) ---
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <SlidersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">거래 설정</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">포트폴리오 할당과 거래 전략을 설정하세요</p>
            </div>

            {testMode && (
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900 dark:to-yellow-900 text-orange-800 dark:text-orange-200 rounded-full text-xs font-medium">
                <TestTubeIcon className="w-3 h-3" />
                <span>테스트 모드</span>
              </div>
            )}

            {hasChanges && (
              <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                변경됨
              </span>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <XIcon className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* 내용 영역 (원본 UI: 프리셋, 섹션 탭, allocation/trading/.. 등) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* 프리셋 전략 버튼들 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              전략 프리셋 {testMode && <span className="text-blue-600 dark:text-blue-400 text-sm">(테스트 완화)</span>}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.keys(presetStrategies).map((presetName) => {
                const preset = presetStrategies[presetName];
                const displayName = presetName === 'ultraConservative' ? '초보수적'
                  : presetName === 'conservative' ? '보수적'
                    : presetName === 'balanced' ? '균형'
                      : presetName === 'aggressive' ? '적극적' : presetName;
                const minScore = preset?.tradingConditions?.buyConditions?.minBuyScore ?? '-';
                return (
                  <button
                    key={presetName}
                    onClick={() => applyPreset(presetName)}
                    className="p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-500 transition-colors text-center"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-white capitalize mb-2">
                      {displayName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {minScore === '-' ? '설정값 없음' : `${minScore}점 이상`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 섹션 탭 */}
          <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-xl">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center ${activeSection === section.id
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{section.name}</span>
                </button>
              );
            })}
          </div>

          {/* 포트폴리오 배분 섹션 */}
          {activeSection === 'allocation' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">포트폴리오 배분</h4>
                <div className="space-y-4">
                  {/* 할당 슬라이더들 */}
                  {[
                    { key: 'cash', label: '현금 비중', max: 0.8, color: 'blue' },
                    { key: 't1', label: 'TIER1 (BTC, ETH)', max: 0.8, color: 'green' },
                    { key: 't2', label: 'TIER2 (상위 알트코인)', max: 0.5, color: 'yellow' },
                    { key: 't3', label: 'TIER3 (기타 코인)', max: 0.3, color: 'red' }
                  ].map(({ key, label, max, color }) => {
                    const value = tempSettings.portfolioAllocation?.[key] || 0;
                    const percent = (value * 100).toFixed(1);
                    const amount = Math.floor(value * 1840000);
                    return (
                      <div key={key}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {label} ({percent}%) - ₩{amount.toLocaleString()}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max={max}
                          step="0.01"
                          value={value}
                          onChange={(e) => handleAllocationChange(key, e.target.value)}
                          className={`w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-${color}`}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* 포트폴리오 미리보기 */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-3">포트폴리오 미리보기</h5>
                  <div className="text-sm">
                    <div className={`font-bold ${portfolioPreview.isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      총 할당: {portfolioPreview.totalPercent}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🎯 NEW: 거래 조건 섹션 */}
          {activeSection === 'trading' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 매수 조건 */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUpIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <h4 className="font-medium text-green-800 dark:text-green-200">매수 조건</h4>
                  </div>

                  <NumberInput
                    label="최소 매수 점수"
                    value={buyConditions.minBuyScore || 6.0}
                    onChange={(value) => updateTradingCondition('buyConditions', 'minBuyScore', value)}
                    min={1}
                    max={10}
                    step={0.1}
                    unit="점"
                    icon={ZapIcon}
                  />

                  <NumberInput
                    label="매수 기준점 (가격 하락률)"
                    value={buyConditions.buyThreshold || -2.0}
                    onChange={(value) => updateTradingCondition('buyConditions', 'buyThreshold', value)}
                    min={-10}
                    max={0}
                    step={0.1}
                    unit="%"
                  />

                  <NumberInput
                    label="RSI 과매도 기준"
                    value={buyConditions.rsiOversold || 35}
                    onChange={(value) => updateTradingCondition('buyConditions', 'rsiOversold', value)}
                    min={20}
                    max={50}
                    step={1}
                    unit=""
                  />
                </div>

                {/* 매도 조건 */}
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 space-y-4">
                  <div className="flex items-center space-x-2">
                    <TrendingDownIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <h4 className="font-medium text-red-800 dark:text-red-200">매도 조건</h4>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <NumberInput
                      label="1차 수익"
                      value={sellConditions.profitTarget1 || 3}
                      onChange={(value) => updateTradingCondition('sellConditions', 'profitTarget1', value)}
                      min={1}
                      max={20}
                      step={0.5}
                      unit="%"
                    />
                    <NumberInput
                      label="2차 수익"
                      value={sellConditions.profitTarget2 || 5}
                      onChange={(value) => updateTradingCondition('sellConditions', 'profitTarget2', value)}
                      min={1}
                      max={20}
                      step={0.5}
                      unit="%"
                    />
                    <NumberInput
                      label="3차 수익"
                      value={sellConditions.profitTarget3 || 8}
                      onChange={(value) => updateTradingCondition('sellConditions', 'profitTarget3', value)}
                      min={1}
                      max={20}
                      step={0.5}
                      unit="%"
                    />
                  </div>

                  <NumberInput
                    label="손절선"
                    value={sellConditions.stopLoss || -6}
                    onChange={(value) => updateTradingCondition('sellConditions', 'stopLoss', value)}
                    min={-20}
                    max={-1}
                    step={0.5}
                    unit="%"
                    icon={ShieldCheckIcon}
                  />

                  <NumberInput
                    label="매도 기준점 (가격 상승률)"
                    value={sellConditions.sellThreshold || 3.0}
                    onChange={(value) => updateTradingCondition('sellConditions', 'sellThreshold', value)}
                    min={0}
                    max={20}
                    step={0.1}
                    unit="%"
                  />
                </div>
              </div>

              {/* 리스크 관리 */}
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <ShieldCheckIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">리스크 관리</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <NumberInput
                    label="최대 거래 코인 수"
                    value={riskManagement.maxCoinsToTrade || 4}
                    onChange={(value) => updateTradingCondition('riskManagement', 'maxCoinsToTrade', value)}
                    min={1}
                    max={10}
                    step={1}
                    unit="개"
                  />

                  <NumberInput
                    label="일일 거래 제한"
                    value={riskManagement.dailyTradeLimit || 6}
                    onChange={(value) => updateTradingCondition('riskManagement', 'dailyTradeLimit', value)}
                    min={1}
                    max={20}
                    step={1}
                    unit="회"
                    icon={TimerIcon}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'timing' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  매수/매도 기준점 {testMode && <span className="text-blue-600 dark:text-blue-400 text-sm">(테스트 완화)</span>}
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      매수 기준점 ({buyConditions.buyThreshold || -2.0}%)
                      {testMode && <span className="text-blue-600 dark:text-blue-400 ml-2">(완화됨)</span>}
                    </label>
                    <input
                      type="range"
                      min="-5"
                      max="0"
                      step="0.1"
                      value={buyConditions.buyThreshold || -2.0}
                      onChange={(e) => updateTradingCondition('buyConditions', 'buyThreshold', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>-5%</span>
                      <span>0%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      매도 기준점 ({sellConditions.sellThreshold || 3.0}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.1"
                      value={sellConditions.sellThreshold || 3.0}
                      onChange={(e) => updateTradingCondition('sellConditions', 'sellThreshold', parseFloat(e.target.value))}
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
                      최소 신호 점수 ({buyConditions.minBuyScore || 6.0}점)
                      {testMode && <span className="text-blue-600 dark:text-blue-400 ml-2">(완화됨)</span>}
                    </label>
                    <input
                      type="range"
                      min={testMode ? "5" : "6"}
                      max="10"
                      step="0.1"
                      value={buyConditions.minBuyScore || 6.0}
                      onChange={(e) => updateTradingCondition('buyConditions', 'minBuyScore', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{testMode ? '5' : '6'}점</span>
                      <span>10점</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      최대 동시 거래 ({riskManagement.maxCoinsToTrade || 4}개)
                      {testMode && <span className="text-blue-600 dark:text-blue-400 ml-2">(증가됨)</span>}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max={testMode ? "8" : "6"}
                      step="1"
                      value={riskManagement.maxCoinsToTrade || 4}
                      onChange={(e) => updateTradingCondition('riskManagement', 'maxCoinsToTrade', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>1개</span>
                      <span>{testMode ? '8' : '6'}개</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">자동 매도 타이밍</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      시간 기반 매도 ({sellConditions.timeBasedExit || 7}일)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      step="1"
                      value={sellConditions.timeBasedExit || 7}
                      onChange={(e) => updateTradingCondition('sellConditions', 'timeBasedExit', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>1일</span>
                      <span>30일</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      일일 거래 제한 ({riskManagement.dailyTradeLimit || 6}회)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="1"
                      value={riskManagement.dailyTradeLimit || 6}
                      onChange={(e) => updateTradingCondition('riskManagement', 'dailyTradeLimit', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>1회</span>
                      <span>20회</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 기술적 설정 섹션 */}
          {activeSection === 'technical' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  RSI 설정 {testMode && <span className="text-blue-600 dark:text-blue-400 text-sm">(테스트 완화)</span>}
                </h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      RSI 과매도 ({buyConditions.rsiOversold || 35})
                      {testMode && <span className="text-blue-600 dark:text-blue-400 ml-2">(완화됨)</span>}
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="40"
                      step="1"
                      value={buyConditions.rsiOversold || 35}
                      onChange={(e) => updateTradingCondition('buyConditions', 'rsiOversold', parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>20</span>
                      <span>40</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      RSI 과매수 ({sellConditions.rsiOverbought || 70})
                      {testMode && <span className="text-blue-600 dark:text-blue-400 ml-2">(완화됨)</span>}
                    </label>
                    <input
                      type="range"
                      min="60"
                      max="80"
                      step="1"
                      value={sellConditions.rsiOverbought || 70}
                      onChange={(e) => updateTradingCondition('sellConditions', 'rsiOverbought', parseInt(e.target.value))}
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
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">거래량 분석</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      평균 대비 거래량 배수 ({riskManagement.volumeThreshold || 1.5}배)
                    </label>
                    <input
                      type="range"
                      min="1.0"
                      max="3.0"
                      step="0.1"
                      value={riskManagement.volumeThreshold || 1.5}
                      onChange={(e) => updateTradingCondition('riskManagement', 'volumeThreshold', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>1.0배</span>
                      <span>2.0배</span>
                      <span>3.0배</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      강매수 점수 ({buyConditions.strongBuyScore || 8.0}점)
                    </label>
                    <input
                      type="range"
                      min="7.0"
                      max="10.0"
                      step="0.1"
                      value={buyConditions.strongBuyScore || 8.0}
                      onChange={(e) => updateTradingCondition('buyConditions', 'strongBuyScore', parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>7.0점</span>
                      <span>10.0점</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">신호 확인</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div>
                      <label className="text-sm font-medium text-gray-900 dark:text-white">복수 신호 필요</label>
                      <p className="text-xs text-gray-500 dark:text-gray-400">여러 지표가 동시에 신호를 줄 때만 거래</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={buyConditions.requireMultipleSignals || true}
                        onChange={(e) => updateTradingCondition('buyConditions', 'requireMultipleSignals', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p className="mb-2">현재 활성화된 기술적 지표:</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">RSI</span>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">거래량</span>
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">가격변동</span>
                      <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 rounded text-xs">뉴스분석</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-900">
          {hasChanges && (
            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangleIcon className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="text-amber-800 dark:text-amber-200 font-medium">설정 변경 사항이 있습니다</p>
                  <p className="text-amber-700 dark:text-amber-300">
                    변경사항을 적용하려면 저장 버튼을 클릭하세요.
                    {isActive && " 활성 거래 중에는 일부 설정이 다음 거래부터 적용됩니다."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-2"
            >
              <RefreshCwIcon className="w-4 h-4" />
              <span>초기화</span>
            </button>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 ${hasChanges
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  }`}
              >
                <SaveIcon className="w-4 h-4" />
                <span>저장</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingSettings;
