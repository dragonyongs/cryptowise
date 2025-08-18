// src/components/features/testing/TradingSettings.jsx - 완전 수정 버전
import React, { useState, useEffect } from "react";
import {
  ChevronDownIcon, ChevronUpIcon, CogIcon, PieChartIcon,
  ClockIcon, TrendingUpIcon, NewspaperIcon, BarChart3Icon
} from "lucide-react";

// ✅ props에 기본값 설정하여 에러 방지
const TradingSettings = ({
  settings = {},
  onChange = () => { }, // ✅ 기본 함수 제공
  testMode = false,
  marketCondition = null,
  onToggleTestMode = () => { },
  tradingMode = "favorites",
  onTradingModeChange = () => { }
}) => {
  const [localSettings, setLocalSettings] = useState({
    // 기존 설정
    buyThreshold: -1.5,
    sellThreshold: 2.0,
    rsiOversold: 35,
    rsiOverbought: 65,
    volumeThreshold: 1.2,
    minScore: 6.5,
    maxCoinsToTrade: 8,
    reserveCashRatio: 0.15,
    strategy: "balanced",

    // 새로운 차등 배분 설정
    tierBasedAllocation: true,
    tier1Allocation: 0.55, // BTC, ETH - 55%
    tier2Allocation: 0.30, // 상위 알트코인 - 30%
    tier3Allocation: 0.15, // 나머지 - 15%

    // 유연한 대기시간 설정
    flexibleWaitTime: true,
    baseWaitTime: 120, // 기본 2시간
    crashBuyWaitTime: 10, // 급락 시 10분
    dipBuyWaitTime: 60, // 하락 시 1시간

    // 뉴스 기반 조정 설정
    newsBasedAdjustment: true,
    newsPositiveMultiplier: 1.3,
    newsNegativeMultiplier: 0.7,
    newsAdjustmentDuration: 24,

    ...settings,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState("allocation");

  useEffect(() => {
    setLocalSettings((prev) => ({
      ...prev,
      ...settings,
    }));
  }, [settings]);

  // 시장 상황별 프리셋
  const presetStrategies = {
    conservative: {
      tier1Allocation: 0.70, // BTC/ETH 70%
      tier2Allocation: 0.25, // 알트 25%
      tier3Allocation: 0.05, // 기타 5%
      reserveCashRatio: 0.25,
      minScore: 7.5,
      baseWaitTime: 180,
      strategy: "conservative"
    },
    balanced: {
      tier1Allocation: 0.55, // BTC/ETH 55%
      tier2Allocation: 0.30, // 알트 30%
      tier3Allocation: 0.15, // 기타 15%
      reserveCashRatio: 0.15,
      minScore: 6.5,
      baseWaitTime: 120,
      strategy: "balanced"
    },
    aggressive: {
      tier1Allocation: 0.40, // BTC/ETH 40%
      tier2Allocation: 0.35, // 알트 35%
      tier3Allocation: 0.25, // 기타 25%
      reserveCashRatio: 0.10,
      minScore: 5.5,
      baseWaitTime: 90,
      strategy: "aggressive"
    }
  };

  const handleChange = (key, value) => {
    const newSettings = {
      ...localSettings,
      [key]: value,
    };
    setLocalSettings(newSettings);

    // ✅ 안전한 함수 호출 - 함수인지 확인 후 실행
    if (typeof onChange === "function") {
      onChange(newSettings);
    } else {
      console.warn("Warning: onChange prop is not a function");
    }
  };

  // ✅ applyPreset 함수도 안전하게 수정
  const applyPreset = (presetName) => {
    const preset = presetStrategies[presetName];
    if (!preset) {
      console.warn(`Warning: Preset "${presetName}" not found`);
      return;
    }

    const newSettings = {
      ...localSettings,
      ...preset,
    };

    setLocalSettings(newSettings);

    // ✅ 안전한 함수 호출
    if (typeof onChange === "function") {
      onChange(newSettings);
    } else {
      console.warn("Warning: onChange prop is not a function");
    }

    console.log(`🔧 ${presetName} 전략 적용:`, preset);
  };

  // 포트폴리오 미리보기 계산
  const getPortfolioPreview = () => {
    const totalAllocation = localSettings.tier1Allocation + localSettings.tier2Allocation + localSettings.tier3Allocation;
    const cashRatio = localSettings.reserveCashRatio;
    const investableRatio = 1 - cashRatio;

    return {
      tier1Amount: localSettings.tier1Allocation * 1840000,
      tier2Amount: localSettings.tier2Allocation * 1840000,
      tier3Amount: localSettings.tier3Allocation * 1840000,
      cashAmount: cashRatio * 1840000,
      totalAllocation,
      isValid: totalAllocation + cashRatio <= 1.0,
    };
  };

  const preview = getPortfolioPreview();

  // 시장 조건 경고
  const getMarketWarnings = () => {
    if (!marketCondition) return [];

    const warnings = [];
    if (marketCondition.riskLevel >= 4) {
      warnings.push("⚠️ 고위험 시장 - TIER1 비중 증대 권장");
    }
    if (marketCondition.volatility === 'extreme') {
      warnings.push("🌊 극도 변동성 - 현금 비중 25% 이상 권장");
    }
    if (!marketCondition.isBuyableMarket) {
      warnings.push("🚫 매수 부적절 시장 - 관망 모드 권장");
    }
    return warnings;
  };

  const sections = [
    { id: 'allocation', name: '포트폴리오 배분', icon: PieChartIcon },
    { id: 'timing', name: '거래 타이밍', icon: ClockIcon },
    { id: 'news', name: '뉴스 연동', icon: NewspaperIcon },
    { id: 'technical', name: '기술적 설정', icon: BarChart3Icon },
  ];

  return (
    <div className="space-y-6">
      {/* 헤더 및 프리셋 선택 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CogIcon className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">고급 거래 설정</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${testMode ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
              }`}>
              {testMode ? '테스트 모드' : '실전 모드'}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* 전략 프리셋 선택 */}
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(presetStrategies).map(([key, preset]) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`p-3 rounded-xl border-2 transition-all duration-200 text-sm font-medium ${localSettings.strategy === key
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-25'
                }`}
            >
              <div className="font-semibold mb-1 capitalize">{key}</div>
              <div className="text-xs opacity-75">
                현금 {(preset.reserveCashRatio * 100).toFixed(0)}% |
                점수 {preset.minScore}+
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 시장 경고 */}
      {getMarketWarnings().length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-xl">
          <div className="space-y-1">
            {getMarketWarnings().map((warning, index) => (
              <p key={index} className="text-sm text-yellow-700 font-medium">
                {warning}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 확장 가능한 상세 설정 */}
      {isExpanded && (
        <div className="space-y-6">
          {/* 섹션 네비게이션 */}
          <div className="flex space-x-2 bg-gray-100 rounded-xl p-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeSection === section.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                  }`}
              >
                <section.icon className="h-4 w-4" />
                <span>{section.name}</span>
              </button>
            ))}
          </div>

          {/* 포트폴리오 배분 섹션 */}
          {activeSection === 'allocation' && (
            <div className="space-y-6">
              {/* 계층별 배분 설정 */}
              <div className="bg-white rounded-2xl p-6 border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <PieChartIcon className="h-5 w-5 mr-2 text-blue-600" />
                  계층별 자산 배분
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 설정 슬라이더들 */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        TIER 1 (BTC, ETH): {(localSettings.tier1Allocation * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0.2"
                        max="0.8"
                        step="0.05"
                        value={localSettings.tier1Allocation}
                        onChange={(e) => handleChange('tier1Allocation', parseFloat(e.target.value))}
                        className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        안정적인 대형 코인 ({preview.tier1Amount.toLocaleString()}원)
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        TIER 2 (상위 알트): {(localSettings.tier2Allocation * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="0.5"
                        step="0.05"
                        value={localSettings.tier2Allocation}
                        onChange={(e) => handleChange('tier2Allocation', parseFloat(e.target.value))}
                        className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        성장성 있는 알트코인 ({preview.tier2Amount.toLocaleString()}원)
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        TIER 3 (기타): {(localSettings.tier3Allocation * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="0.3"
                        step="0.05"
                        value={localSettings.tier3Allocation}
                        onChange={(e) => handleChange('tier3Allocation', parseFloat(e.target.value))}
                        className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        소형 및 신규 코인 ({preview.tier3Amount.toLocaleString()}원)
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        현금 보유: {(localSettings.reserveCashRatio * 100).toFixed(0)}%
                      </label>
                      <input
                        type="range"
                        min="0.05"
                        max="0.5"
                        step="0.05"
                        value={localSettings.reserveCashRatio}
                        onChange={(e) => handleChange('reserveCashRatio', parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        비상 자금 및 기회 대기 ({preview.cashAmount.toLocaleString()}원)
                      </div>
                    </div>
                  </div>

                  {/* 미리보기 차트 */}
                  <div className="bg-gray-50 rounded-2xl p-4">
                    <h5 className="text-sm font-semibold text-gray-900 mb-3">배분 미리보기</h5>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">TIER 1</span>
                        </div>
                        <span className="text-sm font-semibold">{(localSettings.tier1Allocation * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">TIER 2</span>
                        </div>
                        <span className="text-sm font-semibold">{(localSettings.tier2Allocation * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-sm text-gray-700">TIER 3</span>
                        </div>
                        <span className="text-sm font-semibold">{(localSettings.tier3Allocation * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                          <span className="text-sm text-gray-700">현금</span>
                        </div>
                        <span className="text-sm font-semibold">{(localSettings.reserveCashRatio * 100).toFixed(0)}%</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">총 배분</span>
                          <span className={`text-sm font-bold ${preview.isValid ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {((preview.totalAllocation + localSettings.reserveCashRatio) * 100).toFixed(0)}%
                          </span>
                        </div>
                        {!preview.isValid && (
                          <p className="text-xs text-red-600 mt-1">
                            ⚠️ 총 배분이 100%를 초과합니다
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 거래 타이밍 섹션 */}
          {activeSection === 'timing' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-green-600" />
                동적 거래 타이밍
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      기본 대기시간: {localSettings.baseWaitTime}분
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="300"
                      step="30"
                      value={localSettings.baseWaitTime}
                      onChange={(e) => handleChange('baseWaitTime', parseInt(e.target.value))}
                      className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      평상시 거래 간격
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      급락시 대기시간: {localSettings.crashBuyWaitTime}분
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="5"
                      value={localSettings.crashBuyWaitTime}
                      onChange={(e) => handleChange('crashBuyWaitTime', parseInt(e.target.value))}
                      className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      -5% 이상 급락 시 매수 간격
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      하락시 대기시간: {localSettings.dipBuyWaitTime}분
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="120"
                      step="15"
                      value={localSettings.dipBuyWaitTime}
                      onChange={(e) => handleChange('dipBuyWaitTime', parseInt(e.target.value))}
                      className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      -2% 이상 하락 시 매수 간격
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">타이밍 전략</h5>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>평상시:</span>
                      <span className="font-medium">{localSettings.baseWaitTime}분 간격</span>
                    </div>
                    <div className="flex justify-between">
                      <span>하락시 (-2%):</span>
                      <span className="font-medium">{localSettings.dipBuyWaitTime}분 간격</span>
                    </div>
                    <div className="flex justify-between">
                      <span>급락시 (-5%):</span>
                      <span className="font-medium text-red-600">{localSettings.crashBuyWaitTime}분 간격</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="text-xs text-gray-500">
                        시장 상황에 따라 거래 빈도가 자동 조정됩니다
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 뉴스 연동 섹션 */}
          {activeSection === 'news' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <NewspaperIcon className="h-5 w-5 mr-2 text-purple-600" />
                뉴스 기반 전략 조정
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="newsBasedAdjustment"
                      checked={localSettings.newsBasedAdjustment}
                      onChange={(e) => handleChange('newsBasedAdjustment', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="newsBasedAdjustment" className="text-sm font-medium text-gray-700">
                      뉴스 기반 자동 조정 활성화
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      긍정 뉴스 승수: {localSettings.newsPositiveMultiplier}x
                    </label>
                    <input
                      type="range"
                      min="1.0"
                      max="2.0"
                      step="0.1"
                      value={localSettings.newsPositiveMultiplier}
                      onChange={(e) => handleChange('newsPositiveMultiplier', parseFloat(e.target.value))}
                      className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                      disabled={!localSettings.newsBasedAdjustment}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      긍정적 뉴스 시 매수 신호 강화
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      부정 뉴스 승수: {localSettings.newsNegativeMultiplier}x
                    </label>
                    <input
                      type="range"
                      min="0.3"
                      max="1.0"
                      step="0.1"
                      value={localSettings.newsNegativeMultiplier}
                      onChange={(e) => handleChange('newsNegativeMultiplier', parseFloat(e.target.value))}
                      className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer"
                      disabled={!localSettings.newsBasedAdjustment}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      부정적 뉴스 시 매수 신호 약화
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      조정 지속시간: {localSettings.newsAdjustmentDuration}시간
                    </label>
                    <input
                      type="range"
                      min="6"
                      max="72"
                      step="6"
                      value={localSettings.newsAdjustmentDuration}
                      onChange={(e) => handleChange('newsAdjustmentDuration', parseInt(e.target.value))}
                      className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                      disabled={!localSettings.newsBasedAdjustment}
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      뉴스 영향 지속 기간
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">뉴스 전략</h5>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">긍정적 뉴스</div>
                        <div className="text-gray-600">매수 신호 {((localSettings.newsPositiveMultiplier - 1) * 100).toFixed(0)}% 증폭</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">부정적 뉴스</div>
                        <div className="text-gray-600">매수 신호 {((1 - localSettings.newsNegativeMultiplier) * 100).toFixed(0)}% 감소</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">지속 시간</div>
                        <div className="text-gray-600">{localSettings.newsAdjustmentDuration}시간 동안 유효</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 기술적 설정 섹션 */}
          {activeSection === 'technical' && (
            <div className="bg-white rounded-2xl p-6 border border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <BarChart3Icon className="h-5 w-5 mr-2 text-orange-600" />
                기술적 분석 설정
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      매수 임계값: {localSettings.buyThreshold}%
                    </label>
                    <input
                      type="range"
                      min="-5"
                      max="-0.5"
                      step="0.1"
                      value={localSettings.buyThreshold}
                      onChange={(e) => handleChange('buyThreshold', parseFloat(e.target.value))}
                      className="w-full h-2 bg-green-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      이 수치 이하로 하락 시 매수 신호
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      매도 임계값: +{localSettings.sellThreshold}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.1"
                      value={localSettings.sellThreshold}
                      onChange={(e) => handleChange('sellThreshold', parseFloat(e.target.value))}
                      className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      이 수치 이상 상승 시 매도 신호
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RSI 과매도: {localSettings.rsiOversold}
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="40"
                      step="1"
                      value={localSettings.rsiOversold}
                      onChange={(e) => handleChange('rsiOversold', parseInt(e.target.value))}
                      className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RSI 과매수: {localSettings.rsiOverbought}
                    </label>
                    <input
                      type="range"
                      min="60"
                      max="80"
                      step="1"
                      value={localSettings.rsiOverbought}
                      onChange={(e) => handleChange('rsiOverbought', parseInt(e.target.value))}
                      className="w-full h-2 bg-red-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      최소 종합 점수: {localSettings.minScore}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="8"
                      step="0.1"
                      value={localSettings.minScore}
                      onChange={(e) => handleChange('minScore', parseFloat(e.target.value))}
                      className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      거래 실행을 위한 최소 신호 강도
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="text-sm font-semibold text-gray-900 mb-3">현재 설정 요약</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">매수 기준:</span>
                      <span className="font-medium text-green-600">{localSettings.buyThreshold}% 하락</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">매도 기준:</span>
                      <span className="font-medium text-red-600">+{localSettings.sellThreshold}% 상승</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RSI 매수:</span>
                      <span className="font-medium">{localSettings.rsiOversold} 이하</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">RSI 매도:</span>
                      <span className="font-medium">{localSettings.rsiOverbought} 이상</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">최소 점수:</span>
                      <span className="font-medium">{localSettings.minScore}점</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 mt-2">
                      <div className="text-xs text-gray-500">
                        {testMode ? '테스트 모드: 완화된 조건' : '실전 모드: 엄격한 조건'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 모드 및 기본 설정 */}
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border border-gray-200">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">기본 설정</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">거래 모드</label>
                <select
                  value={tradingMode}
                  onChange={(e) => onTradingModeChange && onTradingModeChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="favorites">관심코인</option>
                  <option value="top">상위코인</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">최대 거래 코인</label>
                <input
                  type="number"
                  min="3"
                  max="15"
                  value={localSettings.maxCoinsToTrade}
                  onChange={(e) => handleChange('maxCoinsToTrade', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">거래량 임계값</label>
                <input
                  type="number"
                  min="1"
                  max="3"
                  step="0.1"
                  value={localSettings.volumeThreshold}
                  onChange={(e) => handleChange('volumeThreshold', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="testMode"
                  checked={testMode}
                  onChange={onToggleTestMode}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="testMode" className="text-sm font-medium text-gray-700">
                  테스트 모드 (완화된 조건)
                </label>
              </div>

              <div className="text-xs text-gray-500">
                마지막 업데이트: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TradingSettings;
