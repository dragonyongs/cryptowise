// src/features/trading/components/common/SliderInput.jsx
import React, { useCallback, useMemo } from "react";
import NumberInput from "./NumberInput";

const SliderInput = React.memo(
  ({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 1,
    unit = "%",
    icon: Icon = null,
    disabled = false,
    error,
    showInput = true,
    marks = [],
    className = "",
  }) => {
    const handleSliderChange = useCallback(
      (e) => {
        onChange(parseFloat(e.target.value));
      },
      [onChange]
    );

    const percentage = useMemo(() => {
      return ((value - min) / (max - min)) * 100;
    }, [value, min, max]);

    const sliderStyle = useMemo(
      () => ({
        background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`,
      }),
      [percentage]
    );

    return (
      <div className={`space-y-4 ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            <div className="flex items-center space-x-2">
              {Icon && (
                <Icon size={16} className="text-gray-500 dark:text-gray-400" />
              )}
              <span>{label}</span>
            </div>
          </label>
        )}

        <div className="relative">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            onChange={handleSliderChange}
            className={`w-full h-2 rounded-lg appearance-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
              error ? "accent-red-500" : "accent-blue-500"
            } dark:bg-gray-700`}
            style={sliderStyle}
            aria-label={label}
          />

          {marks.length > 0 && (
            <div className="relative mt-2">
              {marks.map((mark, index) => (
                <div
                  key={index}
                  className="absolute text-xs text-gray-500 dark:text-gray-400 transform -translate-x-1/2"
                  style={{
                    left: `${((mark.value - min) / (max - min)) * 100}%`,
                  }}
                >
                  {mark.label}
                </div>
              ))}
            </div>
          )}
        </div>

        {showInput && (
          <NumberInput
            value={value}
            onChange={onChange}
            min={min}
            max={max}
            step={step}
            unit={unit}
            disabled={disabled}
            error={error}
            className="mt-2"
          />
        )}

        {error && !showInput && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

SliderInput.displayName = "SliderInput";

export default SliderInput;
