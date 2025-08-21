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

const TradingControls = ({
  isActive,
  connectionStatus,
  onStart,
  onStop,
  onReset,
  settings,
  onSettingsChange,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const handleSettingChange = (key, value) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  return (
    <div className="flex items-center gap-3">
      {/* Connection Status */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
        {connectionStatus === "connected" ? (
          <WifiIcon className="w-4 h-4 text-green-600" />
        ) : (
          <WifiOffIcon className="w-4 h-4 text-red-600" />
        )}
        <span className="text-sm text-gray-600">
          {connectionStatus === "connected" ? "연결됨" : "연결 안됨"}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {!isActive ? (
          <button
            onClick={onStart}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <PlayIcon className="w-4 h-4" />
            시작
          </button>
        ) : (
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <PauseIcon className="w-4 h-4" />
            중지
          </button>
        )}

        <button
          onClick={onReset}
          disabled={isActive}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCwIcon className="w-4 h-4" />
          초기화
        </button>

        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
            설정
          </button>

          {/* Settings Dropdown */}
          {showSettings && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-medium text-gray-900">거래 설정</h4>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.autoTrade}
                      onChange={(e) =>
                        handleSettingChange("autoTrade", e.target.checked)
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">자동 거래</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    리스크 레벨: {settings.riskLevel}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.riskLevel}
                    onChange={(e) =>
                      handleSettingChange("riskLevel", parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>보수적</span>
                    <span>공격적</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    최대 포지션 수
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={settings.maxPositions}
                    onChange={(e) =>
                      handleSettingChange(
                        "maxPositions",
                        parseInt(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    손절매 (%)
                  </label>
                  <input
                    type="number"
                    min="-50"
                    max="0"
                    value={settings.stopLoss}
                    onChange={(e) =>
                      handleSettingChange(
                        "stopLoss",
                        parseFloat(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    익절매 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={settings.takeProfit}
                    onChange={(e) =>
                      handleSettingChange(
                        "takeProfit",
                        parseFloat(e.target.value)
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={() => setShowSettings(false)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  설정 완료
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(TradingControls);
