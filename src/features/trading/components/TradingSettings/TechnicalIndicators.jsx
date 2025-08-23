// src/features/trading/components/TradingSettings/TechnicalIndicators.jsx
import React, { useCallback } from "react";
import { BarChart3Icon, ToggleLeftIcon, ToggleRightIcon } from "lucide-react";
import NumberInput from "../common/NumberInput";
import ValidationMessage from "../common/ValidationMessage";
import { INDICATOR_NAMES } from "../../constants/tradingDefaults";

const TechnicalIndicators = React.memo(
  ({
    indicators,
    onIndicatorChange,
    onToggleIndicator,
    errors = {},
    className = "",
  }) => {
    const handleParameterChange = useCallback(
      (indicatorKey, parameter, value) => {
        onIndicatorChange(indicatorKey, parameter, value);
      },
      [onIndicatorChange]
    );

    const indicatorComponents = {
      RSI: ({ config, onChange, error }) => (
        <div className="space-y-4">
          <NumberInput
            label="기간"
            value={config.period}
            onChange={(value) => onChange("period", value)}
            min={5}
            max={50}
            step={1}
            unit="일"
            error={error?.period}
          />
          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              label="과매도"
              value={config.oversold}
              onChange={(value) => onChange("oversold", value)}
              min={10}
              max={40}
              step={1}
              unit=""
              error={error?.oversold}
            />
            <NumberInput
              label="과매수"
              value={config.overbought}
              onChange={(value) => onChange("overbought", value)}
              min={60}
              max={90}
              step={1}
              unit=""
              error={error?.overbought}
            />
          </div>
        </div>
      ),

      MACD: ({ config, onChange, error }) => (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              label="빠른선"
              value={config.fast}
              onChange={(value) => onChange("fast", value)}
              min={5}
              max={30}
              step={1}
              unit="일"
              error={error?.fast}
            />
            <NumberInput
              label="느린선"
              value={config.slow}
              onChange={(value) => onChange("slow", value)}
              min={15}
              max={50}
              step={1}
              unit="일"
              error={error?.slow}
            />
          </div>
          <NumberInput
            label="시그널선"
            value={config.signal}
            onChange={(value) => onChange("signal", value)}
            min={5}
            max={20}
            step={1}
            unit="일"
            error={error?.signal}
          />
        </div>
      ),

      BOLLINGER_BANDS: ({ config, onChange, error }) => (
        <div className="space-y-4">
          <NumberInput
            label="기간"
            value={config.period}
            onChange={(value) => onChange("period", value)}
            min={10}
            max={50}
            step={1}
            unit="일"
            error={error?.period}
          />
          <NumberInput
            label="표준편차"
            value={config.standardDeviation}
            onChange={(value) => onChange("standardDeviation", value)}
            min={1}
            max={3}
            step={0.1}
            unit=""
            error={error?.standardDeviation}
          />
        </div>
      ),

      MOVING_AVERAGE: ({ config, onChange, error }) => (
        <div className="grid grid-cols-2 gap-4">
          <NumberInput
            label="단기 이평선"
            value={config.shortPeriod}
            onChange={(value) => onChange("shortPeriod", value)}
            min={5}
            max={30}
            step={1}
            unit="일"
            error={error?.shortPeriod}
          />
          <NumberInput
            label="장기 이평선"
            value={config.longPeriod}
            onChange={(value) => onChange("longPeriod", value)}
            min={30}
            max={100}
            step={1}
            unit="일"
            error={error?.longPeriod}
          />
        </div>
      ),
    };

    return (
      <div
        className={`space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}
      >
        <div className="flex items-center space-x-3">
          <BarChart3Icon size={20} className="text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            기술적 지표 설정
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(indicators).map(([key, config]) => {
            const IndicatorComponent = indicatorComponents[key];
            const indicatorError = errors[key] || {};

            return (
              <div
                key={key}
                className={`p-4 border rounded-lg transition-all duration-200 ${
                  config.enabled
                    ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className={`font-medium ${
                      config.enabled
                        ? "text-blue-900 dark:text-blue-100"
                        : "text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    {INDICATOR_NAMES[key]}
                  </span>

                  <button
                    onClick={() => onToggleIndicator(key)}
                    className={`p-1 rounded-md transition-colors hover:bg-white dark:hover:bg-gray-600 ${
                      config.enabled ? "text-blue-600" : "text-gray-400"
                    }`}
                    aria-label={`${INDICATOR_NAMES[key]} ${config.enabled ? "비활성화" : "활성화"}`}
                  >
                    {config.enabled ? (
                      <ToggleRightIcon size={20} />
                    ) : (
                      <ToggleLeftIcon size={20} />
                    )}
                  </button>
                </div>

                {config.enabled && (
                  <div className="space-y-4">
                    <IndicatorComponent
                      config={config}
                      onChange={(param, value) =>
                        handleParameterChange(key, param, value)
                      }
                      error={indicatorError}
                    />

                    <NumberInput
                      label="가중치"
                      value={config.weight * 100}
                      onChange={(value) =>
                        handleParameterChange(key, "weight", value / 100)
                      }
                      min={0}
                      max={100}
                      step={1}
                      unit="%"
                      error={indicatorError.weight}
                    />
                  </div>
                )}

                {Object.keys(indicatorError).length > 0 && (
                  <div className="mt-3">
                    <ValidationMessage
                      type="error"
                      message={Object.values(indicatorError)[0]}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

TechnicalIndicators.displayName = "TechnicalIndicators";

export default TechnicalIndicators;
