// src/components/features/testing/components/TradingControls.jsx
import React, { useState } from "react";
import {
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  SettingsIcon,
  WifiIcon,
  WifiOffIcon,
} from "lucide-react";
import { formatCurrency, formatPercent } from "../../../../utils/formatters";

const TradingControls = ({
  isActive,
  connectionStatus,
  onStart,
  onStop,
  onReset,
  settings,
  onSettingsChange,
  portfolio,
  performance,
}) => {
  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
      case "active":
        return <WifiIcon className="h-4 w-4 text-green-600" />;
      default:
        return <WifiOffIcon className="h-4 w-4 text-red-600" />;
    }
  };

  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case "connected":
        return "연결됨";
      case "active":
        return "활성";
      case "connecting":
        return "연결 중...";
      default:
        return "연결 안됨";
    }
  };

  return (
    <div className="space-y-4">
      {/* 상태 표시 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">연결 상태</p>
              <p className="font-semibold flex items-center space-x-2">
                {getConnectionIcon()}
                <span>{getConnectionStatus()}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div>
            <p className="text-sm text-gray-600">총 자산</p>
            <p className="font-semibold text-lg">
              {formatCurrency(portfolio.totalValue)}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div>
            <p className="text-sm text-gray-600">총 수익률</p>
            <p
              className={`font-semibold text-lg ${
                performance.totalReturn >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatPercent(performance.totalReturn)}
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div>
            <p className="text-sm text-gray-600">승률</p>
            <p className="font-semibold text-lg">
              {performance.winRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* 컨트롤 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {!isActive ? (
            <button
              onClick={onStart}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <PlayIcon className="h-4 w-4" />
              <span>거래 시작</span>
            </button>
          ) : (
            <button
              onClick={onStop}
              className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
            >
              <PauseIcon className="h-4 w-4" />
              <span>거래 중지</span>
            </button>
          )}

          <button
            onClick={onReset}
            disabled={isActive}
            className="flex items-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCwIcon className="h-4 w-4" />
            <span>초기화</span>
          </button>
        </div>

        <div className="text-sm text-gray-600">
          거래 횟수:{" "}
          <span className="font-medium">{performance.totalTrades}</span>
        </div>
      </div>
    </div>
  );
};

export default TradingControls;
