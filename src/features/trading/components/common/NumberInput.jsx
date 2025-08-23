// src/features/trading/components/common/NumberInput.jsx
import React, { useCallback, useRef, useEffect, useState } from "react";

const NumberInput = React.memo(
  ({
    label,
    value,
    onChange,
    min = 0,
    max = 100,
    step = 0.1,
    unit = "%",
    placeholder,
    icon: Icon = null,
    disabled = false,
    error,
    className = "",
    debounceMs = 300,
  }) => {
    const [localValue, setLocalValue] = useState(value);
    const timeoutRef = useRef();

    const handleInputChange = useCallback(
      (e) => {
        const inputValue = parseFloat(e.target.value) || 0;
        setLocalValue(inputValue);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          onChange(inputValue);
        }, debounceMs);
      },
      [onChange, debounceMs]
    );

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <div className={`space-y-2 ${className}`}>
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
            type="number"
            min={min}
            max={max}
            step={step}
            value={localValue}
            placeholder={placeholder}
            disabled={disabled}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm transition-colors focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed ${
              error
                ? "border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500"
                : "border-gray-300 text-gray-900 placeholder-gray-400"
            } dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:placeholder-gray-400`}
            aria-invalid={!!error}
            aria-describedby={error ? `${label}-error` : undefined}
          />

          {unit && (
            <span className="absolute inset-y-0 right-3 flex items-center text-sm text-gray-500 dark:text-gray-400">
              {unit}
            </span>
          )}
        </div>

        {error && (
          <p
            id={`${label}-error`}
            className="text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

NumberInput.displayName = "NumberInput";

export default NumberInput;
