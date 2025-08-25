// src/features/trading/components/TradingSettings/TechnicalIndicators.jsx
import React, { useCallback } from "react";
import { BarChart3Icon, ToggleLeftIcon, ToggleRightIcon } from "lucide-react";
import NumberInput from "../common/NumberInput";
import ValidationMessage from "../common/ValidationMessage";
import { TRADING_DEFAULTS, INDICATOR_NAMES } from "../../constants/tradingDefaults";

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
        // 🔥 NaN 값 검증 추가
        const validValue = isNaN(value) || value === null || value === undefined ? 0 : Number(value);
        onIndicatorChange(indicatorKey, parameter, validValue);
      },
      [onIndicatorChange]
    );

    const indicatorComponents = {
      RSI: ({ config, onChange, error }) => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberInput
              label="RSI 기간"
              value={config.period ?? TRADING_DEFAULTS.TECHNICAL_INDICATORS.RSI.period}
              onChange={(value) => onChange("period", value)}
              min={5}
              max={50}
              step={1}
              unit="일"
              error={error?.period}
            />
            <NumberInput
              label="과매도 기준"
              value={config.oversold ?? TRADING_DEFAULTS.TECHNICAL_INDICATORS.RSI.oversold}
              onChange={(value) => onChange("oversold", value)}
              min={10}
              max={40}
              step={1}
              unit=""
              error={error?.oversold}
            />
            <NumberInput
              label="과매수 기준"
              value={config.overbought ?? TRADING_DEFAULTS.TECHNICAL_INDICATORS.RSI.overbought}
              onChange={(value) => onChange("overbought", value)}
              min={60}
              max={90}
              step={1}
              unit=""
              error={error?.overbought}
            />
          </div>
          {error?.general && (
            <ValidationMessage type="error" message={error.general} />
          )}
        </div>
      ),

      MACD: ({ config, onChange, error }) => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <NumberInput
              label="빠른 EMA"
              value={config.fast ?? config.fastPeriod ?? TRADING_DEFAULTS.TECHNICAL_INDICATORS.MACD.fast}
              onChange={(value) => onChange("fast", value)}
              min={5}
              max={20}
              step={1}
              unit="일"
              error={error?.fast}
            />
            <NumberInput
              label="느린 EMA"
              value={config.slow ?? config.slowPeriod ?? TRADING_DEFAULTS.TECHNICAL_INDICATORS.MACD.slow}
              onChange={(value) => onChange("slow", value)}
              min={20}
              max={50}
              step={1}
              unit="일"
              error={error?.slow}
            />
            <NumberInput
              label="신호선 EMA"
              value={config.signal ?? config.signalPeriod ?? TRADING_DEFAULTS.TECHNICAL_INDICATORS.MACD.signal}
              onChange={(value) => onChange("signal", value)}
              min={5}
              max={15}
              step={1}
              unit="일"
              error={error?.signal}
            />
          </div>
          {error?.general && (
            <ValidationMessage type="error" message={error.general} />
          )}
        </div>
      ),

      BOLLINGER_BANDS: ({ config, onChange, error }) => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumberInput
              label="기간"
              value={config.period ?? TRADING_DEFAULTS.TECHNICAL_INDICATORS.BOLLINGER_BANDS.period}
              onChange={(value) => onChange("period", value)}
              min={10}
              max={50}
              step={1}
              unit="일"
              error={error?.period}
            />
            <NumberInput
              label="표준편차 배수"
              value={config.standardDeviation ?? config.multiplier ?? TRADING_DEFAULTS.TECHNICAL_INDICATORS.BOLLINGER_BANDS.standardDeviation}
              onChange={(value) => onChange("standardDeviation", value)}
              min={1}
              max={3}
              step={0.1}
              unit="배"
              error={error?.standardDeviation}
            />
          </div>
          {error?.general && (
            <ValidationMessage type="error" message={error.general} />
          )}
        </div>
      ),

      MOVING_AVERAGE: ({ config, onChange, error }) => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumberInput
              label="단기 이평선"
              value={config.shortPeriod ?? TRADING_DEFAULTS.TECHNICAL_INDICATORS.MOVING_AVERAGE.shortPeriod}
              onChange={(value) => onChange("shortPeriod", value)}
              min={5}
              max={50}
              step={1}
              unit="일"
              error={error?.shortPeriod}
            />
            <NumberInput
              label="장기 이평선"
              value={config.longPeriod ?? TRADING_DEFAULTS.TECHNICAL_INDICATORS.MOVING_AVERAGE.longPeriod}
              onChange={(value) => onChange("longPeriod", value)}
              min={20}
              max={200}
              step={1}
              unit="일"
              error={error?.longPeriod}
            />
          </div>
          {error?.general && (
            <ValidationMessage type="error" message={error.general} />
          )}
        </div>
      ),

      // 🔥 기존에 있던 Volume은 유지
      Volume: ({ config, onChange, error }) => (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <NumberInput
              label="거래량 임계값"
              value={config.threshold ?? 1.5}
              onChange={(value) => onChange("threshold", value)}
              min={1}
              max={5}
              step={0.1}
              unit="배"
              error={error?.threshold}
            />
          </div>
          {error?.general && (
            <ValidationMessage type="error" message={error.general} />
          )}
        </div>
      ),
    };

    return (
      <div className={`space-y-6 ${className}`}>
        <div className="text-sm text-gray-600 mb-4">
          활성화된 지표들의 신호가 일치할 때만 매매를 실행합니다.
        </div>

        {Object.entries(indicators).map(([indicatorKey, config]) => {
          const IndicatorComponent = indicatorComponents[indicatorKey];

          // 🔥 컴포넌트 존재 여부 확인
          if (!IndicatorComponent) {
            console.warn(`Unknown indicator: ${indicatorKey}`);
            return null;
          }

          return (
            <div key={indicatorKey} className="border border-gray-200 rounded-lg p-4">
              {/* 지표 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <BarChart3Icon className="w-5 h-5 text-gray-500" />
                  <h3 className="font-medium text-gray-900">
                    {INDICATOR_NAMES[indicatorKey] || indicatorKey}
                  </h3>
                </div>

                {/* 토글 스위치 */}
                <button
                  onClick={() => onToggleIndicator(indicatorKey)}
                  className={`p-2 rounded-lg transition-all ${config.enabled
                      ? "text-blue-600 bg-blue-100"
                      : "text-gray-400 bg-gray-100"
                    }`}
                >
                  {config.enabled ? (
                    <ToggleRightIcon className="w-6 h-6" />
                  ) : (
                    <ToggleLeftIcon className="w-6 h-6" />
                  )}
                </button>
              </div>

              {/* 지표 설정 */}
              {config.enabled && (
                <IndicatorComponent
                  config={config}
                  onChange={(parameter, value) =>
                    handleParameterChange(indicatorKey, parameter, value)
                  }
                  error={errors[indicatorKey]}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }
);

TechnicalIndicators.displayName = "TechnicalIndicators";

export default TechnicalIndicators;
