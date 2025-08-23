// src/features/trading/components/TradingSettings/PortfolioAllocation.jsx
import React, { useMemo } from "react";
import { PieChartIcon, DollarSignIcon } from "lucide-react";
import SliderInput from "../common/SliderInput";
import ValidationMessage from "../common/ValidationMessage";
import { TIER_NAMES } from "../../constants/tradingDefaults";
import {
  calculatePortfolioValues,
  calculateDiversityIndex,
} from "../../utils/portfolioCalculations";
import { ratioToPercentage } from "../../utils/settingsNormalizer";

const PortfolioAllocation = React.memo(
  ({
    allocation,
    onAllocationChange,
    initialCapital,
    errors = {},
    className = "",
  }) => {
    const portfolioValues = useMemo(
      () => calculatePortfolioValues(allocation, initialCapital),
      [allocation, initialCapital]
    );

    const diversityIndex = useMemo(
      () => calculateDiversityIndex(allocation),
      [allocation]
    );

    const allocationItems = useMemo(
      () => [
        { key: "cash", name: TIER_NAMES.cash, color: "#10b981" },
        { key: "t1", name: TIER_NAMES.t1, color: "#3b82f6" },
        { key: "t2", name: TIER_NAMES.t2, color: "#f59e0b" },
        { key: "t3", name: TIER_NAMES.t3, color: "#ef4444" },
      ],
      []
    );

    return (
      <div
        className={`space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <PieChartIcon size={20} className="text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              포트폴리오 할당
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              다양성:
            </span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                diversityIndex > 0.7
                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  : diversityIndex > 0.5
                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
              }`}
            >
              {Math.round(diversityIndex * 100)}%
            </span>
          </div>
        </div>

        {errors.sum && <ValidationMessage type="error" message={errors.sum} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {allocationItems.map(({ key, name, color }) => (
            <div
              key={key}
              className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-medium text-gray-900 dark:text-white">
                    {name}
                  </span>
                </div>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {ratioToPercentage(allocation[key]).toFixed(1)}%
                </span>
              </div>

              <SliderInput
                value={ratioToPercentage(allocation[key])}
                onChange={(value) => onAllocationChange(key, value / 100)}
                min={0}
                max={80}
                step={0.1}
                unit="%"
                error={errors[key]}
                showInput={false}
                marks={[
                  { value: 10, label: "10%" },
                  { value: 40, label: "40%" },
                  { value: 70, label: "70%" },
                ]}
              />

              <div className="flex items-center justify-center space-x-2 text-sm">
                <DollarSignIcon
                  size={14}
                  className="text-gray-500 dark:text-gray-400"
                />
                <span className="font-medium" style={{ color: color }}>
                  {portfolioValues[key].toLocaleString()}원
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                총 투자금
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {portfolioValues.total.toLocaleString()}원
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 dark:text-gray-400">
                위험 자산 비율
              </span>
              <span
                className={`font-semibold ${
                  allocation.t2 + allocation.t3 > 0.3
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                }`}
              >
                {((allocation.t2 + allocation.t3) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PortfolioAllocation.displayName = "PortfolioAllocation";

export default PortfolioAllocation;
