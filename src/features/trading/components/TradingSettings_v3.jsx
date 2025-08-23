import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";

import {
  PORTFOLIO_CONFIG,
  usePortfolioConfig,
} from "../../../config/portfolioConfig";

import {
  ChevronDownIcon,
  ChevronUpIcon,
  CogIcon,
  SaveIcon,
  RefreshCwIcon,
  InfoIcon,
  TestTubeIcon,
  SparklesIcon,
  XIcon,
  SlidersIcon,
} from "lucide-react";

// Common 컴포넌트들 import
import {
  normalizeAllocations,
  adjustOtherAllocations,
} from "./common/utils/portfolioUtils";

// Settings 컴포넌트들 import
import PortfolioAllocationTab from "./settings/PortfolioAllocationTab";
import TradingStrategyTab from "./settings/TradingStrategyTab";
import TechnicalIndicatorsTab from "./settings/TechnicalIndicatorsTab";
import RiskManagementTab from "./settings/RiskManagementTab";

const TradingSettings = () => {
  const {
    config,
    updateConfig,
    resetToDefaults,
    saveConfig,
    isDirty,
    isLoading,
    error,
  } = usePortfolioConfig();

  const [activeTab, setActiveTab] = useState("portfolio");
  const [environment] = useState("페이퍼트레이딩");
  const [isActive] = useState(false);

  // initialCapital을 config에서 가져오도록 수정
  const initialCapital = config.initialCapital || 0;

  // 초기자본 변경 핸들러 추가
  const handleInitialCapitalChange = useCallback(
    (value) => {
      updateConfig({ initialCapital: value });
    },
    [updateConfig]
  );

  // 포트폴리오 할당 변경 핸들러
  const handleAllocationChange = useCallback(
    (key, value) => {
      const newAllocations = adjustOtherAllocations(
        key,
        value,
        config.allocations
      );
      const normalized = normalizeAllocations(newAllocations);
      updateConfig({ allocations: normalized });
    },
    [config.allocations, updateConfig]
  );

  // 거래 전략 변경 핸들러
  const handleStrategyChange = useCallback(
    (key, value) => {
      updateConfig({
        strategy: {
          ...config.strategy,
          [key]: value,
        },
      });
    },
    [config.strategy, updateConfig]
  );

  // 기술적 지표 토글 핸들러
  const handleIndicatorToggle = useCallback(
    (key) => {
      updateConfig({
        indicators: {
          ...config.indicators,
          [key]: {
            ...config.indicators[key],
            enabled: !config.indicators[key].enabled,
          },
        },
      });
    },
    [config.indicators, updateConfig]
  );

  // 리스크 설정 변경 핸들러
  const handleRiskSettingChange = useCallback(
    (key, value) => {
      updateConfig({
        riskManagement: {
          ...config.riskManagement,
          [key]: value,
        },
      });
    },
    [config.riskManagement, updateConfig]
  );

  // 저장 핸들러
  const handleSave = useCallback(async () => {
    try {
      await saveConfig();
      alert("설정이 저장되었습니다.");
    } catch (error) {
      alert("저장 중 오류가 발생했습니다.");
    }
  }, [saveConfig]);

  // 초기화 핸들러
  const handleReset = useCallback(() => {
    if (window.confirm("모든 설정을 기본값으로 초기화하시겠습니까?")) {
      resetToDefaults();
    }
  }, [resetToDefaults]);

  const tabs = [
    { id: "portfolio", name: "포트폴리오", icon: "💼" },
    { id: "strategy", name: "거래전략", icon: "📈" },
    { id: "indicators", name: "기술지표", icon: "📊" },
    { id: "risk", name: "리스크관리", icon: "🛡️" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "portfolio":
        return (
          <PortfolioAllocationTab
            allocations={config.allocations}
            onAllocationChange={handleAllocationChange}
            initialCapital={initialCapital}
          />
        );
      case "strategy":
        return (
          <TradingStrategyTab
            strategy={config.strategy}
            onStrategyChange={handleStrategyChange}
          />
        );
      case "indicators":
        return (
          <TechnicalIndicatorsTab
            indicators={config.indicators}
            onIndicatorToggle={handleIndicatorToggle}
          />
        );
      case "risk":
        return (
          <RiskManagementTab
            riskSettings={config.riskManagement}
            onRiskSettingChange={handleRiskSettingChange}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CogIcon className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">거래 설정</h1>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              현재 환경: {environment}
            </span>
            <span className="text-sm text-gray-500">|</span>
            <span className="text-sm text-gray-500">
              적용될 금액: {initialCapital.toLocaleString()}원
            </span>
          </div>
        </div>

        <p className="text-gray-600">
          포트폴리오 할당과 거래 전략을 설정하세요
        </p>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white rounded-lg shadow-sm border mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* 탭 컨텐츠 */}
        <div className="p-6">{renderTabContent()}</div>
      </div>

      {/* 저장/초기화 버튼 */}
      {isDirty && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <InfoIcon className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">
                설정 변경 사항이 있습니다
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReset}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <RefreshCwIcon className="w-4 h-4 inline mr-1" />
                초기화
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <SaveIcon className="w-4 h-4 inline mr-1" />
                저장
              </button>
            </div>
          </div>
          <p className="text-sm text-yellow-700 mt-2">
            변경사항을 적용하려면 저장 버튼을 클릭하세요.
            {isActive &&
              " 활성 거래 중에는 일부 설정이 다음 거래부터 적용됩니다."}
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <XIcon className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">오류 발생</span>
          </div>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      )}
    </div>
  );
};

export default TradingSettings;
