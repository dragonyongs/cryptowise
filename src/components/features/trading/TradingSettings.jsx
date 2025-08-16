import React, { useState, useEffect } from "react";

const TradingSettings = ({ settings, onSettingsChange }) => {
  const [localSettings, setLocalSettings] = useState({
    buyThreshold: -0.5,
    sellThreshold: 0.5,
    rsiOversold: 30,
    rsiOverbought: 70,
    volumeThreshold: 1.5,
    minScore: 7.5,
    maxScore: 10,
    strategy: "balanced", // conservative, balanced, aggressive
    ...settings,
  });

  useEffect(() => {
    setLocalSettings((prev) => ({ ...prev, ...settings }));
  }, [settings]);

  const handleChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  const presetStrategies = {
    conservative: {
      buyThreshold: -2.0,
      sellThreshold: 1.0,
      rsiOversold: 25,
      rsiOverbought: 75,
      minScore: 8.5,
      volumeThreshold: 2.0,
    },
    balanced: {
      buyThreshold: -1.0,
      sellThreshold: 0.8,
      rsiOversold: 30,
      rsiOverbought: 70,
      minScore: 7.5,
      volumeThreshold: 1.5,
    },
    aggressive: {
      buyThreshold: -0.3,
      sellThreshold: 0.3,
      rsiOversold: 35,
      rsiOverbought: 65,
      minScore: 6.5,
      volumeThreshold: 1.2,
    },
  };

  const applyPreset = (presetName) => {
    const preset = presetStrategies[presetName];
    const newSettings = { ...localSettings, ...preset, strategy: presetName };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  return (
    <div className="trading-settings bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">매매 조건 설정</h3>
        <div className="flex gap-2">
          <button
            onClick={() => applyPreset("conservative")}
            className={`px-3 py-1 text-xs rounded ${
              localSettings.strategy === "conservative"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            보수적
          </button>
          <button
            onClick={() => applyPreset("balanced")}
            className={`px-3 py-1 text-xs rounded ${
              localSettings.strategy === "balanced"
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            균형
          </button>
          <button
            onClick={() => applyPreset("aggressive")}
            className={`px-3 py-1 text-xs rounded ${
              localSettings.strategy === "aggressive"
                ? "bg-red-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            공격적
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 매수 조건 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 border-b pb-2">매수 조건</h4>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              매수 임계값 (하락률 %)
            </label>
            <input
              type="number"
              step="0.1"
              value={localSettings.buyThreshold}
              onChange={(e) =>
                handleChange("buyThreshold", parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              음수값 입력 (예: -1.0 = 1% 하락시 매수)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              RSI 과매도 기준
            </label>
            <input
              type="number"
              min="10"
              max="50"
              value={localSettings.rsiOversold}
              onChange={(e) =>
                handleChange("rsiOversold", parseInt(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              최소 신호 점수
            </label>
            <input
              type="number"
              step="0.1"
              min="5"
              max="10"
              value={localSettings.minScore}
              onChange={(e) =>
                handleChange("minScore", parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 매도 조건 */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700 border-b pb-2">매도 조건</h4>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              매도 임계값 (상승률 %)
            </label>
            <input
              type="number"
              step="0.1"
              value={localSettings.sellThreshold}
              onChange={(e) =>
                handleChange("sellThreshold", parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              양수값 입력 (예: 1.0 = 1% 상승시 매도)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              RSI 과매수 기준
            </label>
            <input
              type="number"
              min="50"
              max="90"
              value={localSettings.rsiOverbought}
              onChange={(e) =>
                handleChange("rsiOverbought", parseInt(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              거래량 임계값 (배수)
            </label>
            <input
              type="number"
              step="0.1"
              min="1"
              max="5"
              value={localSettings.volumeThreshold}
              onChange={(e) =>
                handleChange("volumeThreshold", parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              평균 거래량의 몇 배인지 설정
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-md">
        <h5 className="font-medium text-gray-700 mb-2">현재 설정 요약</h5>
        <div className="text-sm text-gray-600 grid grid-cols-2 gap-2">
          <div>매수: {localSettings.buyThreshold}% 하락</div>
          <div>매도: {localSettings.sellThreshold}% 상승</div>
          <div>RSI 매수: {localSettings.rsiOversold} 이하</div>
          <div>RSI 매도: {localSettings.rsiOverbought} 이상</div>
          <div>최소 점수: {localSettings.minScore}</div>
          <div>거래량: {localSettings.volumeThreshold}배</div>
        </div>
      </div>
    </div>
  );
};

export default TradingSettings;
