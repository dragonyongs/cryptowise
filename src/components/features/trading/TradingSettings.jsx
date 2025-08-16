import React, { useState, useEffect } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CogIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  PieChartIcon,
  UsersIcon,
} from "lucide-react";

const TradingSettings = ({ settings, onSettingsChange }) => {
  const [localSettings, setLocalSettings] = useState({
    buyThreshold: -1.8,
    sellThreshold: 2.0,
    rsiOversold: 30,
    rsiOverbought: 70,
    volumeThreshold: 1.5,
    minScore: 7.5,
    portfolioStrategy: "dynamic",
    maxCoinsToTrade: 8,
    reserveCashRatio: 0.15,
    rebalanceThreshold: 0.3,
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
      buyThreshold: -2.5,
      sellThreshold: 1.8,
      rsiOversold: 25,
      rsiOverbought: 75,
      minScore: 8.0,
      maxCoinsToTrade: 5,
      reserveCashRatio: 0.25,
      rebalanceThreshold: 0.2,
    },
    balanced: {
      buyThreshold: -1.8,
      sellThreshold: 2.0,
      rsiOversold: 30,
      rsiOverbought: 70,
      minScore: 7.5,
      maxCoinsToTrade: 8,
      reserveCashRatio: 0.15,
      rebalanceThreshold: 0.3,
    },
    aggressive: {
      buyThreshold: -1.2,
      sellThreshold: 2.5,
      rsiOversold: 35,
      rsiOverbought: 65,
      minScore: 7.0,
      maxCoinsToTrade: 12,
      reserveCashRatio: 0.1,
      rebalanceThreshold: 0.4,
    },
  };

  const applyPreset = (presetName) => {
    const preset = presetStrategies[presetName];
    const newSettings = { ...localSettings, ...preset, strategy: presetName };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  // ✅ 동적 포트폴리오 계산 미리보기
  const getPortfolioPreview = () => {
    const investableRatio = 1 - localSettings.reserveCashRatio;
    const positionSizePerCoin = investableRatio / localSettings.maxCoinsToTrade;

    return {
      investableRatio,
      positionSizePerCoin,
      investableAmount: investableRatio * 1840000,
      reserveAmount: localSettings.reserveCashRatio * 1840000,
      positionAmountPerCoin: positionSizePerCoin * 1840000,
    };
  };

  const preview = getPortfolioPreview();

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-green-50 to-blue-50 p-3 md:p-6 cursor-pointer hover:from-green-100 hover:to-blue-100 transition-all duration-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 text-white">
              <PieChartIcon size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                스마트 포트폴리오 설정
              </h3>
              <p className="text-sm text-gray-600">
                📊 {localSettings.maxCoinsToTrade}개 코인 ×{" "}
                {(preview.positionSizePerCoin * 100).toFixed(1)}% + 예비현금{" "}
                {localSettings.reserveCashRatio * 100}% | 매수{" "}
                {localSettings.buyThreshold}% | 매도{" "}
                {localSettings.sellThreshold}%
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
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
                      ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-md"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
        <div className="p-3 md:p-6 bg-gray-50">
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 border flex-col md:flex-row">
            {[
              { id: "portfolio", label: "포트폴리오", icon: "📊" },
              { id: "signals", label: "신호 설정", icon: "⚡" },
              { id: "preview", label: "할당 미리보기", icon: "🔍" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id)}
                className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
                  activeSection === tab.id
                    ? "bg-gradient-to-r from-green-500 to-blue-500 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Portfolio Tab */}
          {activeSection === "portfolio" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 border border-blue-100">
                <div className="flex items-center space-x-2 mb-4">
                  <UsersIcon size={20} className="text-blue-600" />
                  <h4 className="font-semibold text-gray-800">투자 대상</h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      최대 거래 코인 수 ({localSettings.maxCoinsToTrade}개)
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="15"
                      value={localSettings.maxCoinsToTrade}
                      onChange={(e) =>
                        handleChange(
                          "maxCoinsToTrade",
                          parseInt(e.target.value)
                        )
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>3개 (집중)</span>
                      <span>15개 (분산)</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      예비 현금 비율 ({localSettings.reserveCashRatio * 100}%)
                    </label>
                    <input
                      type="range"
                      min="0.05"
                      max="0.4"
                      step="0.05"
                      value={localSettings.reserveCashRatio}
                      onChange={(e) =>
                        handleChange(
                          "reserveCashRatio",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      예비자금: {preview.reserveAmount.toLocaleString()}원
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-6 border border-green-100">
                <div className="flex items-center space-x-2 mb-4">
                  <PieChartIcon size={20} className="text-green-600" />
                  <h4 className="font-semibold text-gray-800">리밸런싱</h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      리밸런싱 임계값 ({localSettings.rebalanceThreshold * 100}
                      %)
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.5"
                      step="0.1"
                      value={localSettings.rebalanceThreshold}
                      onChange={(e) =>
                        handleChange(
                          "rebalanceThreshold",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      목표 비율에서 {localSettings.rebalanceThreshold * 100}%
                      이상 차이나면 조정
                    </div>
                  </div>

                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm text-green-800">
                      💡 지표 기반으로 자동 리밸런싱됩니다
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Signals Tab */}
          {activeSection === "signals" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      min="-4"
                      max="-0.5"
                      step="0.1"
                      value={localSettings.buyThreshold}
                      onChange={(e) =>
                        handleChange("buyThreshold", parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RSI 과매도 ({localSettings.rsiOversold})
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="40"
                      value={localSettings.rsiOversold}
                      onChange={(e) =>
                        handleChange("rsiOversold", parseInt(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      최소 신호 점수 ({localSettings.minScore})
                    </label>
                    <input
                      type="range"
                      min="6"
                      max="9"
                      step="0.1"
                      value={localSettings.minScore}
                      onChange={(e) =>
                        handleChange("minScore", parseFloat(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

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
                      min="0.8"
                      max="4"
                      step="0.1"
                      value={localSettings.sellThreshold}
                      onChange={(e) =>
                        handleChange(
                          "sellThreshold",
                          parseFloat(e.target.value)
                        )
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RSI 과매수 ({localSettings.rsiOverbought})
                    </label>
                    <input
                      type="range"
                      min="60"
                      max="80"
                      value={localSettings.rsiOverbought}
                      onChange={(e) =>
                        handleChange("rsiOverbought", parseInt(e.target.value))
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      거래량 임계값 ({localSettings.volumeThreshold}x)
                    </label>
                    <input
                      type="range"
                      min="1.2"
                      max="3"
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
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Tab */}
          {activeSection === "preview" && (
            <div className="bg-white rounded-lg p-6 border">
              <h4 className="font-semibold text-gray-800 mb-6">
                📊 포트폴리오 할당 미리보기
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {localSettings.maxCoinsToTrade}개
                  </div>
                  <div className="text-sm text-gray-600">거래 대상 코인</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {(preview.positionSizePerCoin * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">코인당 최대 비율</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {localSettings.reserveCashRatio * 100}%
                  </div>
                  <div className="text-sm text-gray-600">예비 현금</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h5 className="font-medium text-gray-800 mb-3">
                    💰 자금 배분 (총 1,840,000원 기준)
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>투자 가능 금액:</span>
                      <span className="font-semibold text-green-600">
                        {preview.investableAmount.toLocaleString()}원 (
                        {preview.investableRatio * 100}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>코인당 최대 금액:</span>
                      <span className="font-semibold text-blue-600">
                        {preview.positionAmountPerCoin.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>예비 현금:</span>
                      <span className="font-semibold text-purple-600">
                        {preview.reserveAmount.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-medium text-blue-800 mb-2">
                    🎯 동적 거래 원리
                  </h5>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>
                      • **지표 기반**: RSI, 이동평균, 거래량, 추세를 종합 분석
                    </div>
                    <div>
                      • **신호 강도별 거래**: 강한 신호일수록 더 많은 비율 거래
                    </div>
                    <div>• **부분 매도**: 수익률에 따라 30%-80% 부분 매도</div>
                    <div>
                      • **동적 리밸런싱**: 목표 비율에서 벗어나면 자동 조정
                    </div>
                    <div>
                      • **현금 관리**: 예비 현금을 항상{" "}
                      {localSettings.reserveCashRatio * 100}% 이상 유지
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h5 className="font-medium text-yellow-800 mb-2">
                    ⚡ 실제 거래 예시
                  </h5>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <div>• **Very Strong 신호**: 목표 비율의 150% 거래</div>
                    <div>• **Strong 신호**: 목표 비율의 120% 거래</div>
                    <div>• **Moderate 신호**: 목표 비율의 100% 거래</div>
                    <div>• **Weak 신호**: 목표 비율의 70% 거래</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TradingSettings;
