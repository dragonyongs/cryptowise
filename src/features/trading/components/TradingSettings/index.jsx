// src/features/trading/components/TradingSettings/index.jsx - 완전한 버전

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ChevronDownIcon, ChevronUpIcon, CogIcon, PieChartIcon, ClockIcon,
  TrendingUpIcon, TrendingDownIcon, BarChart3Icon, SaveIcon, RefreshCwIcon,
  AlertTriangleIcon, InfoIcon, TestTubeIcon, SparklesIcon, ShieldCheckIcon,
  ZapIcon, XIcon, SlidersIcon, DollarSignIcon, PercentIcon, TimerIcon,
} from "lucide-react";
import {
  CheckCircleIcon
} from '@heroicons/react/24/outline';
// 🔥 개선된 훅 사용
import { useTradingSettings } from "../../hooks/useTradingSettings";
import { usePortfolioStore } from "../../../../stores/portfolioStore";
import { TRADING_DEFAULTS } from "../../constants/tradingDefaults";

// 컴포넌트 import (기존 유지)
import NumberInput from "../common/NumberInput";
import PortfolioAllocation from "./PortfolioAllocation";
import TechnicalIndicators from "./TechnicalIndicators";
import RiskManagement from "./RiskManagement";
import AdvancedSettings from "./AdvancedSettings";

// 🔥 기존 유틸리티 함수들 완전히 유지
const adjustOtherAllocations = (changedKey, newValue, currentAllocations) => {
  const keys = ["cash", "t1", "t2", "t3"];
  const otherKeys = keys.filter((key) => key !== changedKey);
  const otherSum = otherKeys.reduce(
    (sum, key) => sum + currentAllocations[key],
    0
  );
  const remainingValue = 1 - newValue;

  if (otherSum === 0) {
    const equalShare = remainingValue / otherKeys.length;
    const result = { ...currentAllocations, [changedKey]: newValue };
    otherKeys.forEach((key) => {
      result[key] = equalShare;
    });
    return result;
  }

  const ratio = remainingValue / otherSum;
  const result = { ...currentAllocations, [changedKey]: newValue };
  otherKeys.forEach((key) => {
    result[key] = currentAllocations[key] * ratio;
  });
  return result;
};

const normalizeAllocations = (allocations) => {
  const { cash, t1, t2, t3 } = allocations;
  const total = cash + t1 + t2 + t3;

  if (Math.abs(total - 1) > 0.001) {
    return {
      cash: cash / total,
      t1: t1 / total,
      t2: t2 / total,
      t3: t3 / total,
    };
  }
  return { cash, t1, t2, t3 };
};

// 🔥 메인 TradingSettings 컴포넌트
const TradingSettings = ({ isActive = false, onClose }) => {
  // 상태 관리 (기존 유지)
  const [activeTab, setActiveTab] = useState("portfolio");
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // 🔥 개선된 훅 사용 (모든 기존 기능 + 새 기능)
  const {
    settings,
    isDirty,
    isLoading,
    tradingMode,
    allocationAmounts,
    activeIndicators,
    updateAllocation,
    updateIndicator,
    updateRiskManagement,
    updateSettings,
    resetSettings,
    saveSettings,
    toggleTradingMode,
    toggleIndicator,
  } = useTradingSettings();

  // 🔥 포트폴리오 스토어에서 실제 총액 가져오기
  const { portfolioData } = usePortfolioStore();

  // 탭 설정 (기존 유지)
  const tabs = [
    {
      id: "portfolio",
      label: "포트폴리오 할당",
      icon: PieChartIcon,
      description: "자산 배분과 투자 전략을 설정합니다"
    },
    {
      id: "indicators",
      label: "기술적 지표",
      icon: BarChart3Icon,
      description: "매매 신호 생성을 위한 지표를 설정합니다"
    },
    {
      id: "risk",
      label: "리스크 관리",
      icon: ShieldCheckIcon,
      description: "손실 제한과 수익 실현 전략을 설정합니다"
    },
    {
      id: "advanced",
      label: "고급 설정",
      icon: SlidersIcon,
      description: "세부적인 거래 조건을 설정합니다"
    }
  ];

  // 🔥 실제 저장 핸들러 (기존 시뮬레이션에서 실제 저장으로 변경)
  const handleSave = useCallback(async () => {
    setErrors({});

    try {
      const result = await saveSettings();
      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);

        // 성공 알림
        if (window.addLog) {
          window.addLog("✅ 트레이딩 설정이 성공적으로 저장되었습니다", "success");
        }
      } else {
        setErrors({ general: `저장 실패: ${result.error}` });
      }
    } catch (error) {
      console.error("Save failed:", error);
      setErrors({ general: `저장 중 오류: ${error.message}` });
    }
  }, [saveSettings]);

  // 🔥 초기화 핸들러 (기존 로직 개선)
  const handleReset = useCallback(() => {
    if (window.confirm("모든 설정을 기본값으로 초기화하시겠습니까?")) {
      resetSettings();
      setErrors({});

      if (window.addLog) {
        window.addLog("🔄 트레이딩 설정이 기본값으로 초기화되었습니다", "info");
      }
    }
  }, [resetSettings]);

  // 🔥 설정 변경 핸들러 (기존 로직 완전 유지하면서 개선)
  const handleSettingsChange = useCallback((section, changes) => {
    const newSettings = {
      ...settings,
      [section]: typeof changes === 'function'
        ? changes(settings[section])
        : { ...settings[section], ...changes }
    };
    updateSettings(newSettings);
  }, [settings, updateSettings]);

  // 할당 변경 핸들러 (기존 로직 유지)
  const handleAllocationChange = useCallback((key, value) => {
    const normalizedValue = Math.max(0, Math.min(1, value / 100));
    const newAllocations = adjustOtherAllocations(key, normalizedValue, settings.allocation);
    const normalized = normalizeAllocations(newAllocations);
    handleSettingsChange('allocation', normalized);
  }, [settings.allocation, handleSettingsChange]);

  // 지표 토글 핸들러 (기존 로직 유지)
  const handleIndicatorToggle = useCallback((indicator) => {
    toggleIndicator(indicator);
  }, [toggleIndicator]);

  // 지표 설정 변경 핸들러 (기존 로직 유지)
  const handleIndicatorChange = useCallback((indicator, parameter, value) => {
    updateIndicator(indicator, parameter, value);
  }, [updateIndicator]);

  // 리스크 관리 변경 핸들러 (기존 로직 유지)
  const handleRiskManagementChange = useCallback((property, value) => {
    updateRiskManagement(property, value);
  }, [updateRiskManagement]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col">

        {/* 🔥 헤더 (완전히 개선) */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CogIcon className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                트레이딩 설정
              </h2>
            </div>

            {/* 🔥 거래모드 토글 (새 기능) */}
            <div className="flex items-center space-x-2 px-3 py-1 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-300">거래모드:</span>
              <button
                onClick={toggleTradingMode}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${tradingMode === "live"
                  ? "bg-red-100 text-red-700 border-2 border-red-200 hover:bg-red-200"
                  : "bg-green-100 text-green-700 border-2 border-green-200 hover:bg-green-200"
                  }`}
                title={`현재: ${tradingMode === "live" ? "실거래" : "페이퍼트레이딩"} 모드`}
              >
                {tradingMode === "live" ? "🔴 실거래" : "🟢 페이퍼"}
              </button>
            </div>

            {/* 🔥 총 자산 표시 (동적 값) */}
            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <DollarSignIcon className="w-4 h-4 text-blue-600" />
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-300">총 자산: </span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  ₩{allocationAmounts.total.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 🔥 활성 상태 표시 */}
            {isActive && (
              <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium">
                <ZapIcon className="w-3 h-3" />
                <span>활성 거래 중</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-3">
            {/* 성공 메시지 */}
            {showSuccess && (
              <div className="flex items-center space-x-2 text-green-600 text-sm font-medium">
                <CheckCircleIcon className="w-4 h-4" />
                <span>저장 완료!</span>
              </div>
            )}

            {/* 오류 메시지 */}
            {errors.general && (
              <div className="flex items-center space-x-2 text-red-600 text-sm font-medium max-w-xs">
                <AlertTriangleIcon className="w-4 h-4" />
                <span className="truncate">{errors.general}</span>
              </div>
            )}

            {/* 초기화 버튼 */}
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="기본값으로 초기화"
            >
              <RefreshCwIcon className="w-4 h-4" />
              <span className="text-sm">초기화</span>
            </button>

            {/* 저장 버튼 (개선) */}
            <button
              onClick={handleSave}
              disabled={!isDirty || isLoading}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${isDirty && !isLoading
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>저장 중...</span>
                </>
              ) : (
                <>
                  <SaveIcon className="w-4 h-4" />
                  <span>저장</span>
                </>
              )}
            </button>

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="설정 닫기"
            >
              <XIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 변경사항 안내 (기존 로직 개선) */}
        <div className="px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
            <InfoIcon className="w-4 h-4" />
            <p className="text-sm">
              포트폴리오 할당과 거래 전략을 설정하세요.
              {isDirty && " 변경사항을 적용하려면 저장 버튼을 클릭하세요."}
              {isActive && " 활성 거래 중에는 일부 설정이 다음 거래부터 적용됩니다."}
            </p>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 flex overflow-hidden">
          {/* 탭 내비게이션 (기존 로직 유지 + 스타일 개선) */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              설정 카테고리
            </h3>

            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActiveTab = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left p-3 rounded-lg mb-2 transition-all ${isActiveTab
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-l-4 border-blue-600 shadow-sm"
                    : "hover:bg-white dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                    }`}
                >
                  <div className="flex items-center space-x-3">
                    <IconComponent className={`w-5 h-5 ${isActiveTab ? "text-blue-600 dark:text-blue-400" : "text-gray-500"
                      }`} />
                    <div>
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {tab.description}
                      </div>
                    </div>
                  </div>

                  {/* 활성 지표 표시 */}
                  {tab.id === "indicators" && (
                    <div className="mt-2 text-xs">
                      <span className="text-gray-500">활성: </span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {activeIndicators.length}개
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* 탭 컨텐츠 (기존 로직 유지 + props 개선) */}
          <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-900">
            {activeTab === "portfolio" && (
              <PortfolioAllocation
                allocation={settings.allocation}
                onAllocationChange={handleAllocationChange}
                initialCapital={allocationAmounts.total} // 🔥 동적 총액 전달
                allocationAmounts={allocationAmounts} // 🔥 실제 금액 전달
                totalValue={allocationAmounts.total}
                errors={errors}
              />
            )}

            {activeTab === "indicators" && (
              <TechnicalIndicators
                indicators={settings.indicators}
                onIndicatorChange={handleIndicatorChange}
                onToggleIndicator={handleIndicatorToggle}
                errors={errors}
              />
            )}

            {activeTab === "risk" && (
              <RiskManagement
                riskManagement={settings.riskManagement}
                allocation={settings.allocation}
                onRiskManagementChange={handleRiskManagementChange}
                errors={errors}
              />
            )}

            {activeTab === "advanced" && (
              <AdvancedSettings
                settings={settings.advanced || {}}
                onSettingsChange={(changes) => handleSettingsChange('advanced', changes)}
                errors={errors}
              />
            )}
          </div>
        </div>

        {/* 하단 상태 바 (새로 추가) */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-3 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <span>현재 탭: {tabs.find(t => t.id === activeTab)?.label}</span>
              <span>•</span>
              <span>총 자산: ₩{allocationAmounts.total.toLocaleString()}</span>
              <span>•</span>
              <span>모드: {tradingMode === "live" ? "실거래" : "페이퍼트레이딩"}</span>
            </div>

            <div className="flex items-center space-x-2">
              {isDirty && (
                <span className="text-orange-600 dark:text-orange-400">
                  • 저장되지 않은 변경사항
                </span>
              )}

              <span className="text-xs text-gray-500">
                마지막 저장: {localStorage.getItem("cryptowise_trading_settings")
                  ? new Date(JSON.parse(localStorage.getItem("cryptowise_trading_settings") || '{}').savedAt || Date.now()).toLocaleString()
                  : "없음"
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingSettings;
