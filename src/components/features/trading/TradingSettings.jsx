// src/components/features/testing/TradingSettings.jsx - 완전 수정 버전

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

const TradingSettings = ({ settings, onChange, testMode }) => { // ✅ onChange로 수정
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

  // ✅ 실전형 프리셋 (현재 시장에 맞게 조정)
  const presetStrategies = {
    conservative: {
      buyThreshold: -2.0, // 2% 하락 시 매수
      sellThreshold: 1.5, // 1.5% 상승 시 매도
      rsiOversold: 25, // 더 보수적
      rsiOverbought: 75,
      minScore: 7.0, // 높은 점수 요구
      maxCoinsToTrade: 5,
      reserveCashRatio: 0.30, // 현금 30% 보유
      strategy: "conservative"
    },
    balanced: {
      buyThreshold: -1.2, // 1.2% 하락 시 매수
      sellThreshold: 1.8, // 1.8% 상승 시 매도
      rsiOversold: 30,
      rsiOverbought: 70,
      minScore: 6.0, // 적당한 점수
      maxCoinsToTrade: 8,
      reserveCashRatio: 0.20, // 현금 20% 보유
      strategy: "balanced"
    },
    aggressive: {
      buyThreshold: -0.8, // 0.8% 하락만으로도 매수
      sellThreshold: 2.2, // 2.2% 상승 시 매도
      rsiOversold: 35, // 더 공격적
      rsiOverbought: 65,
      minScore: 5.0, // 낮은 점수로도 거래
      maxCoinsToTrade: 12,
      reserveCashRatio: 0.10, // 현금 10%만 보유
      strategy: "aggressive"
    },
    // ✅ 테스트용 추가
    testing: {
      buyThreshold: -0.3, // 매우 관대
      sellThreshold: 0.8,
      rsiOversold: 45,
      rsiOverbought: 60,
      minScore: 4.0, // 매우 낮은 점수
      maxCoinsToTrade: 15,
      reserveCashRatio: 0.05,
      strategy: "testing"
    }
  };

  const handleChange = (key, value) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onChange(newSettings); // ✅ onChange로 수정
  };

  const applyPreset = (presetName) => {
    const preset = presetStrategies[presetName];
    const newSettings = { ...localSettings, ...preset };
    setLocalSettings(newSettings);
    onChange(newSettings); // ✅ onChange로 수정
    console.log(`🔧 ${presetName} 전략 적용:`, preset);
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
    <div className="trading-settings bg-white rounded-lg border border-gray-200">
      {/* 헤더 */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <CogIcon className="w-5 h-5 text-gray-600" />
          <div>
            <h3 className="font-medium text-gray-900">거래 설정</h3>
            <p className="text-sm text-gray-600">
              📊 {localSettings.maxCoinsToTrade}개 코인 ×{" "}
              {(preview.positionSizePerCoin * 100).toFixed(1)}% + 예비현금{" "}
              {localSettings.reserveCashRatio * 100}% | 매수{" "}
              {localSettings.buyThreshold}% | 매도{" "}
              {localSettings.sellThreshold}%
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* 설정 내용 */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* 프리셋 전략 */}
          <div className="p-4 bg-gray-50">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
              <UsersIcon className="w-4 h-4" />
              투자 성향
            </h4>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(presetStrategies).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={`p-3 rounded-lg text-sm font-medium transition-all ${localSettings.strategy === key
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-blue-50 border border-gray-200"
                    }`}
                >
                  {key === "conservative" && "보수적"}
                  {key === "balanced" && "균형"}
                  {key === "aggressive" && "공격적"}
                  {key === "testing" && "테스트"}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-500 mt-2">
              💡 지표 기반으로 자동 리밸런싱됩니다
            </p>
          </div>

          {/* 탭 네비게이션 */}
          <div className="flex border-b border-gray-200">
            {[
              { key: "basic", label: "기본 설정", icon: <CogIcon className="w-4 h-4" /> },
              { key: "advanced", label: "고급 설정", icon: <TrendingUpIcon className="w-4 h-4" /> },
              { key: "portfolio", label: "포트폴리오", icon: <PieChartIcon className="w-4 h-4" /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${activeSection === key
                    ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                    : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </div>

          {/* 설정 패널 */}
          <div className="p-4 space-y-6">
            {activeSection === "basic" && (
              <div className="space-y-4">
                {/* 매수 임계값 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    매수 임계값 ({localSettings.buyThreshold}%)
                  </label>
                  <input
                    type="range"
                    min="-3"
                    max="0"
                    step="0.1"
                    value={localSettings.buyThreshold}
                    onChange={(e) => handleChange("buyThreshold", parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>-3% (공격적)</span>
                    <span>0% (보수적)</span>
                  </div>
                </div>

                {/* 매도 임계값 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    매도 임계값 (+{localSettings.sellThreshold}%)
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={localSettings.sellThreshold}
                    onChange={(e) => handleChange("sellThreshold", parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0.5% (공격적)</span>
                    <span>3% (보수적)</span>
                  </div>
                </div>

                {/* 최소 점수 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    최소 신호 점수 ({localSettings.minScore})
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="8"
                    step="0.1"
                    value={localSettings.minScore}
                    onChange={(e) => handleChange("minScore", parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>3 (관대함)</span>
                    <span>8 (엄격함)</span>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "advanced" && (
              <div className="space-y-4">
                {/* RSI 설정 */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RSI 과매도 ({localSettings.rsiOversold})
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="40"
                      step="1"
                      value={localSettings.rsiOversold}
                      onChange={(e) => handleChange("rsiOversold", parseInt(e.target.value))}
                      className="w-full"
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
                      step="1"
                      value={localSettings.rsiOverbought}
                      onChange={(e) => handleChange("rsiOverbought", parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* 볼륨 임계값 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    볼륨 임계값 ({localSettings.volumeThreshold}x)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={localSettings.volumeThreshold}
                    onChange={(e) => handleChange("volumeThreshold", parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>1x (낮음)</span>
                    <span>3x (높음)</span>
                  </div>
                </div>
              </div>
            )}

            {activeSection === "portfolio" && (
              <div className="space-y-4">
                {/* 최대 거래 코인 수 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    최대 거래 코인 수 ({localSettings.maxCoinsToTrade}개)
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="15"
                    step="1"
                    value={localSettings.maxCoinsToTrade}
                    onChange={(e) => handleChange("maxCoinsToTrade", parseInt(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>3개 (집중)</span>
                    <span>15개 (분산)</span>
                  </div>
                </div>

                {/* 예비 현금 비율 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    예비 현금 비율 ({(localSettings.reserveCashRatio * 100).toFixed(0)}%)
                  </label>
                  <input
                    type="range"
                    min="0.05"
                    max="0.40"
                    step="0.05"
                    value={localSettings.reserveCashRatio}
                    onChange={(e) => handleChange("reserveCashRatio", parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>5% (공격적)</span>
                    <span>40% (보수적)</span>
                  </div>
                </div>

                {/* 포트폴리오 미리보기 */}
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h5 className="font-medium text-blue-900 mb-2">💰 포트폴리오 시뮬레이션</h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-blue-700">투자 가능 금액</div>
                      <div className="font-bold text-blue-900">
                        ₩{preview.investableAmount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-700">예비 현금</div>
                      <div className="font-bold text-blue-900">
                        ₩{preview.reserveAmount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-700">코인당 배분</div>
                      <div className="font-bold text-blue-900">
                        ₩{preview.positionAmountPerCoin.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-blue-700">분산도</div>
                      <div className="font-bold text-blue-900">
                        {(preview.positionSizePerCoin * 100).toFixed(1)}% × {localSettings.maxCoinsToTrade}개
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 테스트 모드 알림 */}
          {testMode && (
            <div className="p-4 bg-yellow-50 border-t border-yellow-200">
              <div className="flex items-center gap-2 text-yellow-800 text-sm">
                <span>🧪</span>
                <span className="font-medium">테스트 모드 활성</span>
                <span className="text-yellow-600">- 더 관대한 거래 조건이 적용됩니다</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TradingSettings;
