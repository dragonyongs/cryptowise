import React, { useState, useEffect } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CogIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from "lucide-react";

const TradingSettings = ({ settings, onSettingsChange }) => {
  const [localSettings, setLocalSettings] = useState({
    buyThreshold: -1.0,
    sellThreshold: 0.8,
    rsiOversold: 30,
    rsiOverbought: 70,
    volumeThreshold: 1.5,
    minScore: 7.5,
    maxScore: 10,
    strategy: "balanced",
    ...settings,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState("basic");

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
      sellThreshold: 1.5,
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

  const getStrategyColor = (strategy) => {
    switch (strategy) {
      case "conservative":
        return "bg-blue-500";
      case "balanced":
        return "bg-green-500";
      case "aggressive":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStrategyIcon = (strategy) => {
    switch (strategy) {
      case "conservative":
        return "🛡️";
      case "balanced":
        return "⚖️";
      case "aggressive":
        return "🚀";
      default:
        return "⚙️";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-lg ${getStrategyColor(localSettings.strategy)} text-white`}
            >
              <CogIcon size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                매매 조건 설정
              </h3>
              <p className="text-sm text-gray-600">
                {getStrategyIcon(localSettings.strategy)}{" "}
                {localSettings.strategy} 전략 | 매수{" "}
                {localSettings.buyThreshold}% | 매도{" "}
                {localSettings.sellThreshold}%
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* 전략 프리셋 버튼들 */}
            <div className="hidden md:flex space-x-2">
              {Object.keys(presetStrategies).map((preset) => (
                <button
                  key={preset}
                  onClick={(e) => {
                    e.stopPropagation();
                    applyPreset(preset);
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition-all duration-200 ${
                    localSettings.strategy === preset
                      ? getStrategyColor(preset) + " text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {preset === "conservative"
                    ? "보수적"
                    : preset === "balanced"
                      ? "균형"
                      : "공격적"}
                </button>
              ))}
            </div>
            {isExpanded ? (
              <ChevronUpIcon size={24} />
            ) : (
              <ChevronDownIcon size={24} />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 bg-gray-50">
          {/* Mobile 프리셋 버튼들 */}
          <div className="md:hidden mb-6">
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(presetStrategies).map((preset) => (
                <button
                  key={preset}
                  onClick={() => applyPreset(preset)}
                  className={`p-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    localSettings.strategy === preset
                      ? getStrategyColor(preset) + " text-white shadow-md"
                      : "bg-white text-gray-700 hover:bg-gray-100 border"
                  }`}
                >
                  {preset === "conservative"
                    ? "🛡️ 보수적"
                    : preset === "balanced"
                      ? "⚖️ 균형"
                      : "🚀 공격적"}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 border">
            {[
              { id: "basic", label: "기본 설정", icon: "⚙️" },
              { id: "advanced", label: "고급 설정", icon: "🔧" },
              { id: "summary", label: "설정 요약", icon: "📊" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeSection === tab.id
                    ? "bg-blue-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Content Sections */}
          {activeSection === "basic" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 매수 조건 */}
              <div className="bg-white rounded-lg p-6 border border-green-100">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingDownIcon size={20} className="text-green-600" />
                  <h4 className="font-semibold text-gray-800">매수 조건</h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      매수 임계값 ({localSettings.buyThreshold}%)
                    </label>
                    <input
                      type="range"
                      min="-5"
                      max="0"
                      step="0.1"
                      value={localSettings.buyThreshold}
                      onChange={(e) =>
                        handleChange("buyThreshold", parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>-5% (매우 보수적)</span>
                      <span>0% (매우 공격적)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RSI 과매도 기준 ({localSettings.rsiOversold})
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={localSettings.rsiOversold}
                      onChange={(e) =>
                        handleChange("rsiOversold", parseInt(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-green"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10 (극단적)</span>
                      <span>50 (보수적)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 매도 조건 */}
              <div className="bg-white rounded-lg p-6 border border-red-100">
                <div className="flex items-center space-x-2 mb-4">
                  <TrendingUpIcon size={20} className="text-red-600" />
                  <h4 className="font-semibold text-gray-800">매도 조건</h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      매도 임계값 ({localSettings.sellThreshold}%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.1"
                      value={localSettings.sellThreshold}
                      onChange={(e) =>
                        handleChange(
                          "sellThreshold",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-red"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0% (매우 공격적)</span>
                      <span>5% (매우 보수적)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RSI 과매수 기준 ({localSettings.rsiOverbought})
                    </label>
                    <input
                      type="range"
                      min="50"
                      max="90"
                      value={localSettings.rsiOverbought}
                      onChange={(e) =>
                        handleChange("rsiOverbought", parseInt(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-red"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>50 (보수적)</span>
                      <span>90 (극단적)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "advanced" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border">
                <h4 className="font-semibold text-gray-800 mb-4">
                  📊 신호 품질
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      최소 신호 점수 ({localSettings.minScore})
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="10"
                      step="0.1"
                      value={localSettings.minScore}
                      onChange={(e) =>
                        handleChange("minScore", parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>5.0 (관대함)</span>
                      <span>10.0 (엄격함)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border">
                <h4 className="font-semibold text-gray-800 mb-4">
                  📈 거래량 분석
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      거래량 임계값 ({localSettings.volumeThreshold}x)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      value={localSettings.volumeThreshold}
                      onChange={(e) =>
                        handleChange(
                          "volumeThreshold",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>1x (평균)</span>
                      <span>5x (급증)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "summary" && (
            <div className="bg-white rounded-lg p-6 border">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {localSettings.buyThreshold}%
                  </div>
                  <div className="text-sm text-gray-600">매수 기준</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {localSettings.sellThreshold}%
                  </div>
                  <div className="text-sm text-gray-600">매도 기준</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {localSettings.minScore}
                  </div>
                  <div className="text-sm text-gray-600">최소 점수</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {localSettings.volumeThreshold}x
                  </div>
                  <div className="text-sm text-gray-600">거래량 배수</div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-800 mb-2">
                  🎯 현재 전략 특징
                </h5>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>
                    •{" "}
                    {localSettings.strategy === "conservative"
                      ? "보수적 접근으로 안정성 중시"
                      : localSettings.strategy === "aggressive"
                        ? "공격적 접근으로 수익성 중시"
                        : "균형잡힌 접근으로 안정성과 수익성 조화"}
                  </div>
                  <div>
                    • RSI 범위: {localSettings.rsiOversold} ~{" "}
                    {localSettings.rsiOverbought}
                  </div>
                  <div>
                    • 신호 품질:{" "}
                    {localSettings.minScore >= 8
                      ? "높음"
                      : localSettings.minScore >= 7
                        ? "보통"
                        : "낮음"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .slider-green::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider-red::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #ef4444;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider-green::-webkit-slider-track {
          background: linear-gradient(to right, #10b981 0%, #d1fae5 100%);
        }
        .slider-red::-webkit-slider-track {
          background: linear-gradient(to right, #fecaca 0%, #ef4444 100%);
        }
      `}</style>
    </div>
  );
};

export default TradingSettings;
