// src/features/trading/components/TradingSettings/AdvancedSettings.jsx
import React, { useState } from "react";
import {
  SlidersIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  TestTubeIcon,
  ZapIcon,
  TimerIcon,
} from "lucide-react";
import NumberInput from "../common/NumberInput";
import ValidationMessage from "../common/ValidationMessage";

const AdvancedSettings = React.memo(
  ({ settings, onSettingsChange, errors = {}, className = "" }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const advancedOptions = [
      {
        key: "signalConfirmationTime",
        label: "신호 확인 시간",
        value: settings.signalConfirmationTime || 300,
        min: 60,
        max: 1800,
        step: 60,
        unit: "초",
        icon: TimerIcon,
        description: "매매 신호 확인을 위한 대기 시간",
      },
      {
        key: "maxConcurrentTrades",
        label: "최대 동시 거래",
        value: settings.maxConcurrentTrades || 3,
        min: 1,
        max: 10,
        step: 1,
        unit: "개",
        icon: ZapIcon,
        description: "동시에 진행할 수 있는 최대 거래 수",
      },
      {
        key: "cooldownPeriod",
        label: "쿨다운 기간",
        value: settings.cooldownPeriod || 3600,
        min: 300,
        max: 86400,
        step: 300,
        unit: "초",
        icon: TimerIcon,
        description: "같은 코인 재거래까지의 대기 시간",
      },
      {
        key: "volatilityThreshold",
        label: "변동성 임계값",
        value: settings.volatilityThreshold || 0.05,
        min: 0.01,
        max: 0.2,
        step: 0.01,
        unit: "",
        icon: TestTubeIcon,
        description: "거래 중단을 위한 변동성 기준",
      },
    ];

    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}
      >
        <button
          className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors rounded-lg"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
        >
          <div className="flex items-center space-x-3">
            <SlidersIcon size={20} className="text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              고급 설정
            </h3>
          </div>
          {isExpanded ? (
            <ChevronUpIcon size={20} className="text-gray-400" />
          ) : (
            <ChevronDownIcon size={20} className="text-gray-400" />
          )}
        </button>

        {isExpanded && (
          <div className="px-6 pb-6 space-y-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
              {advancedOptions.map(
                ({
                  key,
                  label,
                  value,
                  min,
                  max,
                  step,
                  unit,
                  icon: Icon,
                  description,
                }) => (
                  <div key={key} className="space-y-2">
                    <NumberInput
                      label={label}
                      value={value}
                      onChange={(newValue) => onSettingsChange(key, newValue)}
                      min={min}
                      max={max}
                      step={step}
                      unit={unit}
                      icon={Icon}
                      error={errors[key]}
                    />
                    {description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {description}
                      </p>
                    )}
                  </div>
                )
              )}
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-base font-medium text-gray-900 dark:text-white mb-4">
                거래 모드
              </h4>
              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.paperTradingMode || false}
                    onChange={(e) =>
                      onSettingsChange("paperTradingMode", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">
                    페이퍼 트레이딩 모드
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.aggressiveMode || false}
                    onChange={(e) =>
                      onSettingsChange("aggressiveMode", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">
                    공격적 모드
                  </span>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.conservativeMode || false}
                    onChange={(e) =>
                      onSettingsChange("conservativeMode", e.target.checked)
                    }
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-900 dark:text-white">
                    보수적 모드
                  </span>
                </label>
              </div>
            </div>

            {Object.keys(errors).length > 0 && (
              <ValidationMessage
                type="error"
                message="고급 설정에 오류가 있습니다. 각 항목을 확인해주세요."
              />
            )}
          </div>
        )}
      </div>
    );
  }
);

AdvancedSettings.displayName = "AdvancedSettings";

export default AdvancedSettings;
