// src/features/trading/components/TradingSettings/index.jsx - 완전한 버전
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CogIcon,
  PieChartIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  BarChart3Icon,
  SaveIcon,
  RefreshCwIcon,
  AlertTriangleIcon,
  InfoIcon,
  TestTubeIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ZapIcon,
  XIcon,
  SlidersIcon,
  DollarSignIcon,
  PercentIcon,
  TimerIcon,
} from "lucide-react";
import { CheckCircleIcon } from '@heroicons/react/24/outline';

import { useCapital } from "../../../../hooks/useCapital"; // 새로운 훅 사용

// 🔥 개선된 훅 사용
import { useTradingSettings } from "../../hooks/useTradingSettings";
import { usePortfolioStore } from "../../../../stores/portfolioStore";
import { usePortfolioConfig } from "../../../../config/portfolioConfig";
import { TRADING_DEFAULTS } from "../../constants/tradingDefaults";

// 컴포넌트 import (기존 유지)
import NumberInput from "../common/NumberInput";
import PortfolioAllocation from "./PortfolioAllocation";
import TradingConditions from "./TradingConditions";
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

  const { config, setInitialCapital } = usePortfolioConfig();

  // 🔥 중앙화된 자본금 관리 사용
  const {
    capital,
    updateCapital,
    formatCapital,
    isLoading: capitalLoading,
    error: capitalError,
  } = useCapital();

  const [capitalInput, setCapitalInput] = useState("");
  const [capitalDirty, setCapitalDirty] = useState(false);

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
      id: "conditions",
      label: "매매 조건",
      icon: ZapIcon,
      description: "매매 조건 설정"
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

  // 🔥 FIXED: 매수/매도 조건 객체 메모이제이션
  const buyConditions = useMemo(() => {
    return settings.tradingConditions?.buyConditions || {};
  }, [settings.tradingConditions?.buyConditions]);

  const sellConditions = useMemo(() => {
    return settings.tradingConditions?.sellConditions || {};
  }, [settings.tradingConditions?.sellConditions]);


  // 🔥 자본금 저장 핸들러 (간소화됨)
  const handleCapitalSave = useCallback(async () => {
    if (!capitalDirty || !capitalInput) return;

    const amount = parseInt(capitalInput.replace(/[^0-9]/g, ""), 10);
    if (isNaN(amount) || amount <= 0) {
      setErrors({ capital: "유효한 자본금을 입력하세요." });
      return;
    }

    const success = updateCapital(amount, "trading_settings");
    if (success) {
      setCapitalInput("");
      setCapitalDirty(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      if (window.addLog) {
        window.addLog(`💰 자본금이 ${formatCapital(amount)}원으로 변경되었습니다`, "success");
      }
    } else {
      setErrors({ capital: "자본금 업데이트 실패" });
    }
  }, [capitalInput, capitalDirty, updateCapital, formatCapital]);

  // 🔥 통합된 저장 핸들러
  const handleSave = useCallback(async () => {
    setErrors({});

    try {
      // 1. 자본금 저장
      await handleCapitalSave();

      // 2. 트레이딩 설정 저장
      const result = await saveSettings();

      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        if (window.addLog) {
          window.addLog("✅ 모든 설정이 성공적으로 저장되었습니다", "success");
        }
      } else {
        setErrors({ general: `저장 실패: ${result.error}` });
      }
    } catch (error) {
      console.error("Save failed:", error);
      setErrors({ general: `저장 중 오류: ${error.message}` });
    }
  }, [handleCapitalSave, saveSettings]);

  // 🔥 실제 저장 핸들러 (자본금 입력도 dirty로 반영)
  // const handleSave = useCallback(async () => {
  //   setErrors({});
  //   try {
  //     let capitalChanged = false;
  //     if (capitalDirty && capitalInput) {
  //       const amount = parseInt(capitalInput.replace(/[^0-9]/g, ""), 10);
  //       if (!isNaN(amount) && amount > 0) {
  //         setInitialCapital(amount);
  //         capitalChanged = true;
  //         if (window.addLog) window.addLog(`💰 자본금이 ${amount.toLocaleString()}원으로 변경되었습니다`, "info");
  //       } else {
  //         setErrors({ general: "유효한 자본금을 입력하세요." });
  //         return;
  //       }
  //     }
  //     const result = await saveSettings();
  //     if (result.success) {
  //       setShowSuccess(true);
  //       setTimeout(() => setShowSuccess(false), 3000);
  //       if (window.addLog) {
  //         window.addLog("✅ 트레이딩 설정이 성공적으로 저장되었습니다", "success");
  //       }
  //       setCapitalDirty(false);
  //       // 저장 후 입력란 동기화
  //       if (capitalChanged) {
  //         setCapitalInput("");
  //       }
  //     } else {
  //       setErrors({ general: `저장 실패: ${result.error}` });
  //     }
  //   } catch (error) {
  //     console.error("Save failed:", error);
  //     setErrors({ general: `저장 중 오류: ${error.message}` });
  //   }
  // }, [saveSettings, capitalInput, capitalDirty, setInitialCapital]);

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

  // 🔥 FIXED: 매수 조건 변경 핸들러 - 함수형 업데이트로 무한 렌더링 방지
  // index.jsx의 handleBuyConditionChange에 디버깅 추가
  const handleBuyConditionChange = useCallback((property, value) => {
    console.log("🟢 handleBuyConditionChange 호출:", property, value, typeof value);
    console.log("🔍 현재 settings.tradingConditions:", settings.tradingConditions);

    updateSettings(prevSettings => {
      const newSettings = {
        ...prevSettings,
        tradingConditions: {
          ...prevSettings.tradingConditions,
          buyConditions: {
            ...prevSettings.tradingConditions?.buyConditions,
            [property]: value
          }
        }
      };

      console.log("📝 updateSettings로 전달할 새 설정:", newSettings);
      console.log("🔍 새 buyConditions:", newSettings.tradingConditions.buyConditions);

      return newSettings;
    });
  }, [updateSettings]);

  // 🔥 FIXED: 매도 조건 변경 핸들러 - 함수형 업데이트로 무한 렌더링 방지
  const handleSellConditionChange = useCallback((property, value) => {
    console.log("🔄 매도 조건 변경:", property, value);

    updateSettings(prevSettings => ({
      ...prevSettings,
      tradingConditions: {
        ...prevSettings.tradingConditions,
        sellConditions: {
          ...prevSettings.tradingConditions?.sellConditions,
          [property]: value
        }
      }
    }));
  }, [updateSettings]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 w-full">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <CogIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                트레이딩 설정
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                포트폴리오 할당과 거래 전략을 설정하세요.
                {isDirty && " 변경사항을 적용하려면 저장 버튼을 클릭하세요."}
                {isActive && " 활성 거래 중에는 일부 설정이 다음 거래부터 적용됩니다."}
              </p>
            </div>
            {/* 자본금 입력 필드 */}
            <div className="flex flex-col items-end min-w-[180px] ml-4">
              <label htmlFor="capital-input" className="text-xs text-gray-500 dark:text-gray-400 mb-1">자본금(원)</label>
              <input
                id="capital-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                className="w-36 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-right font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={capitalDirty ? capitalInput : (config?.initialCapital?.toLocaleString() || "")}
                onChange={e => {
                  setCapitalInput(e.target.value.replace(/[^0-9]/g, ""));
                  setCapitalDirty(true);
                }}
                placeholder="예: 3,000,000"
                autoComplete="off"
              />
              <span className="text-xs text-gray-400 mt-1">현재: {config?.initialCapital?.toLocaleString() || "-"}원</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 성공 알림 */}
            {showSuccess && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-lg text-sm">
                <CheckCircleIcon className="w-4 h-4" />
                저장 완료
              </div>
            )}

            {/* 저장 버튼 */}
            {/* 자본금 입력 또는 설정 변경 시 저장 활성화 */}
            <button
              onClick={handleSave}
              disabled={isLoading || !(isDirty || capitalDirty)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${(isDirty || capitalDirty) && !isLoading
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                }`}
            >
              {isLoading ? (
                <RefreshCwIcon className="w-4 h-4 animate-spin" />
              ) : (
                <SaveIcon className="w-4 h-4" />
              )}
              {isLoading ? "저장 중..." : "저장"}
            </button>

            {/* 초기화 버튼 */}
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCwIcon className="w-4 h-4" />
              초기화
            </button>

            {/* 닫기 버튼 */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 에러 메시지 */}
        {errors.general && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
              <p className="text-sm text-red-800 dark:text-red-200">{errors.general}</p>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex h-[calc(90vh-8rem)]">
          {/* Sidebar Tabs */}
          <div className="w-64 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${isActive
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {tab.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === "portfolio" && (
              <PortfolioAllocation
                allocation={settings.allocation}
                onAllocationChange={handleAllocationChange}
                initialCapital={allocationAmounts.total}
                errors={errors}
              />
            )}

            {/* 🔥 FIXED: 메모이제이션된 props 전달 */}
            {activeTab === "conditions" && (
              <TradingConditions
                buyConditions={buyConditions}
                sellConditions={sellConditions}
                onBuyConditionChange={handleBuyConditionChange}
                onSellConditionChange={handleSellConditionChange}
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
      </div>
    </div>
  );
};

export default TradingSettings;
