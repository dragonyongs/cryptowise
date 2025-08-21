// src/components/features/testing/TradingSettings.jsx - 오류 수정 버전

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  XIcon,
  SaveIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  InfoIcon,
  SlidersIcon,
  PieChartIcon,
  ZapIcon,
  ShieldCheckIcon,
  DollarSignIcon,
  PercentIcon,
  TimerIcon,
} from "lucide-react";

// ✅ 기존 정규화 함수 그대로 유지
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

// ✅ 기존 슬라이더 연동 조정 함수 그대로 유지
const adjustOtherAllocations = (changedKey, newValue, currentAllocations) => {
  const keys = ["cash", "t1", "t2", "t3"];
  const otherKeys = keys.filter((key) => key !== changedKey);
  const otherSum = otherKeys.reduce(
    (sum, key) => sum + currentAllocations[key],
    0
  );
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

// ✅ 기존 슬라이더 컴포넌트 로직 그대로 유지 (UI만 개선)
const SliderInput = React.memo(
  ({
    label,
    value,
    onChange,
    min = 0,
    max = 1,
    step = 0.01,
    unit = "%",
    className = "",
    disabled = false,
    icon: Icon = null,
  }) => {
    const [localValue, setLocalValue] = useState((value * 100).toFixed(1));

    useEffect(() => {
      setLocalValue((value * 100).toFixed(1));
    }, [value]);

    const handleSliderChange = useCallback(
      (e) => {
        const newValue = parseFloat(e.target.value) / 100;
        onChange(newValue);
      },
      [onChange]
    );

    const handleInputChange = useCallback((e) => {
      const inputValue = e.target.value;
      setLocalValue(inputValue);
    }, []);

    const handleInputBlur = useCallback(() => {
      const numValue = parseFloat(localValue);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
        onChange(numValue / 100);
      } else {
        setLocalValue((value * 100).toFixed(1));
      }
    }, [localValue, onChange, value]);

    const handleInputKeyPress = useCallback(
      (e) => {
        if (e.key === "Enter") {
          handleInputBlur();
        }
      },
      [handleInputBlur]
    );

    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {Icon && <Icon className="w-4 h-4 text-slate-500" />}
            <label className="text-sm font-medium text-slate-700">{label}</label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={localValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyPress={handleInputKeyPress}
              disabled={disabled}
              className="w-16 px-2 py-1 text-sm text-right border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent disabled:bg-slate-100"
            />
            <span className="text-sm text-slate-500">{unit}</span>
          </div>
        </div>
        <div className="relative">
          <input
            type="range"
            min={min * 100}
            max={max * 100}
            step={step * 100}
            value={value * 100}
            onChange={handleSliderChange}
            disabled={disabled}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed
                     focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-opacity-50
                     slider:appearance-none slider:w-4 slider:h-4 slider:bg-slate-600 slider:rounded-full slider:cursor-pointer"
          />
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>{(min * 100).toFixed(0)}%</span>
            <span>{(max * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    );
  }
);

SliderInput.displayName = 'SliderInput';

const TradingSettings = ({
  settings,
  onSettingsChange,
  onClose,
  isActive = false
}) => {
  // ✅ 기존 상태 관리 로직 그대로 유지
  const [localSettings, setLocalSettings] = useState(() => ({
    allocation: {
      cash: 0.2,
      t1: 0.4,
      t2: 0.3,
      t3: 0.1,
      ...settings?.allocation
    },
    trading: {
      buyThreshold: 0.65,
      sellThreshold: 0.7,
      profitTarget: 0.08,
      stopLoss: 0.08,
      ...settings?.trading
    },
    risk: {
      maxPositionSize: 0.15,
      dailyTradingLimit: 0.1,
      volatilityAdjustment: 0.8,
      correlationLimit: 0.7,
      ...settings?.risk
    }
  }));

  const [hasChanges, setHasChanges] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    allocation: true,
    trading: true,
    risk: true,
  });

  // ✅ allocation 업데이트 로직 그대로 유지
  const updateAllocation = useCallback((key, value) => {
    setLocalSettings(prev => {
      const currentAllocation = prev.allocation;
      const adjusted = adjustOtherAllocations(key, value, currentAllocation);
      const normalized = normalizeAllocations(adjusted);

      return {
        ...prev,
        allocation: normalized
      };
    });
    setHasChanges(true);
  }, []);

  // ✅ 기타 설정 업데이트 로직 그대로 유지
  const updateSetting = useCallback((section, key, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
    setHasChanges(true);
  }, []);

  // ✅ 저장/리셋 로직 그대로 유지
  const handleSave = useCallback(() => {
    onSettingsChange(localSettings);
    setHasChanges(false);
  }, [localSettings, onSettingsChange]);

  const handleReset = useCallback(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  // ✅ allocation 총합 계산 (기존 로직)
  const allocationTotal = useMemo(() => {
    const { cash, t1, t2, t3 } = localSettings.allocation;
    return cash + t1 + t2 + t3;
  }, [localSettings.allocation]);

  const toggleSection = useCallback((section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  }, []);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center space-x-3">
          <SlidersIcon className="w-5 h-5 text-slate-600" />
          <div>
            <h3 className="text-lg font-semibold text-slate-900">거래 설정</h3>
            <p className="text-sm text-slate-600">포트폴리오 할당과 거래 전략을 설정하세요</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <>
              <button
                onClick={handleReset}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                title="초기화"
              >
                <RefreshCwIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
              >
                <SaveIcon className="w-4 h-4" />
                <span>저장</span>
              </button>
            </>
          )}
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 설정 섹션들 */}
      <div className="divide-y divide-slate-200">
        {/* 포트폴리오 할당 섹션 */}
        <div className="p-6">
          <button
            onClick={() => toggleSection('allocation')}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <div className="flex items-center space-x-3">
              <PieChartIcon className="w-5 h-5 text-slate-600" />
              <h4 className="text-base font-semibold text-slate-900">포트폴리오 할당</h4>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`text-sm px-2 py-1 rounded-full ${Math.abs(allocationTotal - 1) < 0.001
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-red-100 text-red-700'
                }`}>
                {(allocationTotal * 100).toFixed(1)}%
              </span>
            </div>
          </button>

          {expandedSections.allocation && (
            <div className="space-y-4">
              <SliderInput
                label="현금 비중"
                value={localSettings.allocation.cash}
                onChange={(value) => updateAllocation('cash', value)}
                icon={DollarSignIcon}
              />
              <SliderInput
                label="Tier 1 코인 (BTC, ETH)"
                value={localSettings.allocation.t1}
                onChange={(value) => updateAllocation('t1', value)}
                icon={ZapIcon}
              />
              <SliderInput
                label="Tier 2 코인 (주요 알트코인)"
                value={localSettings.allocation.t2}
                onChange={(value) => updateAllocation('t2', value)}
                icon={ZapIcon}
              />
              <SliderInput
                label="Tier 3 코인 (소형주)"
                value={localSettings.allocation.t3}
                onChange={(value) => updateAllocation('t3', value)}
                icon={ZapIcon}
              />
            </div>
          )}
        </div>

        {/* 거래 설정 섹션 */}
        <div className="p-6">
          <button
            onClick={() => toggleSection('trading')}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <div className="flex items-center space-x-3">
              <ZapIcon className="w-5 h-5 text-slate-600" />
              <h4 className="text-base font-semibold text-slate-900">거래 설정</h4>
            </div>
          </button>

          {expandedSections.trading && (
            <div className="space-y-4">
              <SliderInput
                label="매수 신호 임계값"
                value={localSettings.trading.buyThreshold}
                onChange={(value) => updateSetting('trading', 'buyThreshold', value)}
                icon={PercentIcon}
              />
              <SliderInput
                label="매도 신호 임계값"
                value={localSettings.trading.sellThreshold}
                onChange={(value) => updateSetting('trading', 'sellThreshold', value)}
                icon={PercentIcon}
              />
              <SliderInput
                label="목표 수익률"
                value={localSettings.trading.profitTarget}
                onChange={(value) => updateSetting('trading', 'profitTarget', value)}
                max={0.3}
                icon={PercentIcon}
              />
              <SliderInput
                label="손실 제한"
                value={localSettings.trading.stopLoss}
                onChange={(value) => updateSetting('trading', 'stopLoss', value)}
                max={0.2}
                icon={PercentIcon}
              />
            </div>
          )}
        </div>

        {/* 위험 관리 섹션 */}
        <div className="p-6">
          <button
            onClick={() => toggleSection('risk')}
            className="flex items-center justify-between w-full text-left mb-4"
          >
            <div className="flex items-center space-x-3">
              <ShieldCheckIcon className="w-5 h-5 text-slate-600" />
              <h4 className="text-base font-semibold text-slate-900">위험 관리</h4>
            </div>
          </button>

          {expandedSections.risk && (
            <div className="space-y-4">
              <SliderInput
                label="최대 포지션 크기"
                value={localSettings.risk.maxPositionSize}
                onChange={(value) => updateSetting('risk', 'maxPositionSize', value)}
                max={0.5}
                icon={PercentIcon}
              />
              <SliderInput
                label="일일 거래 한도"
                value={localSettings.risk.dailyTradingLimit}
                onChange={(value) => updateSetting('risk', 'dailyTradingLimit', value)}
                max={0.5}
                icon={TimerIcon}
              />
              <SliderInput
                label="변동성 조정 비율"
                value={localSettings.risk.volatilityAdjustment}
                onChange={(value) => updateSetting('risk', 'volatilityAdjustment', value)}
                max={1.5}
                icon={PercentIcon}
              />
              <SliderInput
                label="상관관계 한도"
                value={localSettings.risk.correlationLimit}
                onChange={(value) => updateSetting('risk', 'correlationLimit', value)}
                icon={PercentIcon}
              />
            </div>
          )}
        </div>
      </div>

      {/* 하단 알림 */}
      <div className="p-6 bg-slate-50 border-t border-slate-200">
        {hasChanges && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <AlertTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">설정 변경 사항이 있습니다</p>
                <p className="text-sm text-amber-700 mt-1">
                  변경사항을 적용하려면 저장 버튼을 클릭하세요.
                  {isActive && " 활성 거래 중에는 일부 설정이 다음 거래부터 적용됩니다."}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start space-x-3">
          <InfoIcon className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-slate-600">
            설정 변경 시 기존 거래 전략에 즉시 반영됩니다.
            백테스팅을 통해 검증 후 적용하는 것을 권장합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TradingSettings;
