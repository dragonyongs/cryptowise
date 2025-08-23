// src/features/trading/components/TradingSettings/RiskManagement.jsx
import React, { useMemo } from "react";
import { ShieldCheckIcon, AlertTriangleIcon } from "lucide-react";
import NumberInput from "../common/NumberInput";
import SliderInput from "../common/SliderInput";
import ValidationMessage from "../common/ValidationMessage";
import { calculateRiskScore } from "../../utils/portfolioCalculations";
import { ratioToPercentage } from "../../utils/settingsNormalizer";

const RiskManagement = React.memo(
  ({
    riskManagement,
    allocation,
    onRiskManagementChange,
    errors = {},
    className = "",
  }) => {
    const riskScore = useMemo(
      () => calculateRiskScore(allocation, riskManagement),
      [allocation, riskManagement]
    );

    const riskLevel = useMemo(() => {
      if (riskScore < 30)
        return {
          level: "low",
          label: "낮음",
          color: "#10b981",
          bgColor: "bg-green-100 dark:bg-green-900/20",
          textColor: "text-green-800 dark:text-green-200",
        };
      if (riskScore < 60)
        return {
          level: "medium",
          label: "보통",
          color: "#f59e0b",
          bgColor: "bg-yellow-100 dark:bg-yellow-900/20",
          textColor: "text-yellow-800 dark:text-yellow-200",
        };
      return {
        level: "high",
        label: "높음",
        color: "#ef4444",
        bgColor: "bg-red-100 dark:bg-red-900/20",
        textColor: "text-red-800 dark:text-red-200",
      };
    }, [riskScore]);

    const riskRewardRatio = useMemo(() => {
      const { stopLoss, takeProfit } = riskManagement;
      return stopLoss > 0 ? (takeProfit / stopLoss).toFixed(2) : "∞";
    }, [riskManagement.stopLoss, riskManagement.takeProfit]);

    return (
      <div
        className={`space-y-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm ${className}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon size={20} className="text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              리스크 관리
            </h3>
          </div>

          <div
            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${riskLevel.bgColor} ${riskLevel.textColor}`}
          >
            <AlertTriangleIcon size={16} />
            <span>
              리스크: {riskLevel.label} ({riskScore})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <NumberInput
            label="손절매 (%)"
            value={ratioToPercentage(riskManagement.stopLoss)}
            onChange={(value) =>
              onRiskManagementChange("stopLoss", value / 100)
            }
            min={1}
            max={50}
            step={0.1}
            unit="%"
            error={errors.stopLoss}
            icon={AlertTriangleIcon}
          />

          <NumberInput
            label="익절매 (%)"
            value={ratioToPercentage(riskManagement.takeProfit)}
            onChange={(value) =>
              onRiskManagementChange("takeProfit", value / 100)
            }
            min={1}
            max={200}
            step={0.1}
            unit="%"
            error={errors.takeProfit}
          />
        </div>

        <div className="space-y-6">
          <SliderInput
            label="최대 포지션 크기"
            value={ratioToPercentage(riskManagement.maxPositionSize)}
            onChange={(value) =>
              onRiskManagementChange("maxPositionSize", value / 100)
            }
            min={1}
            max={50}
            step={0.1}
            unit="%"
            error={errors.maxPositionSize}
            marks={[
              { value: 5, label: "5%" },
              { value: 15, label: "15%" },
              { value: 25, label: "25%" },
            ]}
          />

          <SliderInput
            label="최대 손실 허용도"
            value={ratioToPercentage(riskManagement.maxDrawdown)}
            onChange={(value) =>
              onRiskManagementChange("maxDrawdown", value / 100)
            }
            min={5}
            max={50}
            step={1}
            unit="%"
            error={errors.maxDrawdown}
            marks={[
              { value: 10, label: "10%" },
              { value: 25, label: "25%" },
              { value: 40, label: "40%" },
            ]}
          />
        </div>

        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div className="flex flex-col items-center space-y-1">
              <span className="text-gray-600 dark:text-gray-400">
                위험 대비 수익 비율
              </span>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {riskRewardRatio}:1
              </span>
            </div>

            <div className="flex flex-col items-center space-y-1">
              <span className="text-gray-600 dark:text-gray-400">
                예상 최대 손실
              </span>
              <span
                className={`text-lg font-semibold ${
                  riskLevel.level === "high"
                    ? "text-red-600 dark:text-red-400"
                    : riskLevel.level === "medium"
                      ? "text-yellow-600 dark:text-yellow-400"
                      : "text-green-600 dark:text-green-400"
                }`}
              >
                {ratioToPercentage(riskManagement.maxDrawdown).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

RiskManagement.displayName = "RiskManagement";

export default RiskManagement;
