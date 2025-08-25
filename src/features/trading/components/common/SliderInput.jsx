// src/features/trading/components/common/SliderInput.jsx
import React, { useState, useCallback } from "react";

const SliderInput = React.memo(({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "%",
  disabled = false,
  className = ""
}) => {
  const [localValue, setLocalValue] = useState(value);

  const handleSliderChange = useCallback((e) => {
    const newValue = parseFloat(e.target.value);
    setLocalValue(newValue);
    onChange(newValue);
  }, [onChange]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">{label}</label>
        <span className="text-sm font-semibold text-gray-900 dark:text-slate-400">
          {localValue.toFixed(1)}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localValue}
        onChange={handleSliderChange}
        disabled={disabled}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
    </div>
  );
});

export default SliderInput;
