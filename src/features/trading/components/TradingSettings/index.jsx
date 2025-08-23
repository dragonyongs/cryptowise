// src/features/trading/components/TradingSettings/index.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
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

// 🔥 기존 TradingSettings_v1.jsx의 유틸 함수들 그대로 복사
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

// 🔥 기존 NumberInput 컴포넌트 그대로 복사
const NumberInput = React.memo(
  ({
    label,
    value,
    onChange,
    min,
    max,
    step = 0.1,
    unit = "%",
    placeholder,
    icon: Icon = null,
    disabled = false,
  }) => {
    const [localValue, setLocalValue] = useState(value);
    const timeoutRef = useRef();

    const handleChange = useCallback(
      (e) => {
        const newValue = parseFloat(e.target.value) || 0;
        setLocalValue(newValue);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          onChange(newValue);
        }, 300);
      },
      [onChange]
    );

    useEffect(() => {
      setLocalValue(value);
    }, [value]);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          <div className="flex items-center space-x-2">
            {Icon && <Icon size={16} />}
            <span>{label}</span>
          </div>
        </label>
        <div className="relative">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={localValue}
            placeholder={placeholder}
            disabled={disabled}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          {unit && (
            <span className="absolute inset-y-0 right-3 flex items-center text-gray-500 text-sm">
              {unit}
            </span>
          )}
        </div>
      </div>
    );
  }
);

// 🔥 간단한 Tabs 컴포넌트
const Tabs = ({ children }) => {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div>
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        {React.Children.map(children, (child, index) => (
          <button
            key={index}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              index === activeTab
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
            onClick={() => setActiveTab(index)}
          >
            {child.props.label}
          </button>
        ))}
      </div>

      <div>
        {React.Children.map(children, (child, index) => (
          <div key={index} className={index === activeTab ? "block" : "hidden"}>
            {child.props.children}
          </div>
        ))}
      </div>
    </div>
  );
};

const Tab = ({ children }) => children;

// 🔥 메인 TradingSettings 컴포넌트
const TradingSettings = ({
  environment = "paper",
  initialCapital = 1840000,
  isActive = false,
  onSave,
  onClose,
  className = "",
}) => {
  // 🔥 기존 TradingSettings_v1.jsx의 state 그대로 복사
  const [allocations, setAllocations] = useState({
    cash: 0.4,
    t1: 0.42,
    t2: 0.15,
    t3: 0.03,
  });

  const [activeIndicators, setActiveIndicators] = useState(["RSI", "MACD"]);
  const [hasChanges, setHasChanges] = useState(false);

  // 🔥 기존 핸들러 함수들 그대로 복사
  const handleAllocationChange = useCallback(
    (key, value) => {
      const normalizedValue = Math.max(0, Math.min(1, value / 100));
      const newAllocations = adjustOtherAllocations(
        key,
        normalizedValue,
        allocations
      );
      setAllocations(newAllocations);
      setHasChanges(true);
    },
    [allocations]
  );

  const handleSave = useCallback(() => {
    const settings = {
      allocations,
      activeIndicators,
      environment,
      initialCapital,
      lastSaved: new Date().toISOString(),
    };

    if (onSave) {
      onSave(settings);
    }

    setHasChanges(false);
    console.log("Settings saved:", settings);
  }, [allocations, activeIndicators, environment, initialCapital, onSave]);

  const handleReset = useCallback(() => {
    setAllocations({
      cash: 0.4,
      t1: 0.42,
      t2: 0.15,
      t3: 0.03,
    });
    setHasChanges(false);
  }, []);

  // 🔥 기존 계산 로직 그대로 복사
  const portfolioValues = useMemo(() => {
    return {
      cash: Math.round(allocations.cash * initialCapital),
      t1: Math.round(allocations.t1 * initialCapital),
      t2: Math.round(allocations.t2 * initialCapital),
      t3: Math.round(allocations.t3 * initialCapital),
    };
  }, [allocations, initialCapital]);

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-4xl mx-auto ${className}`}
    >
      {/* 🔥 기존 헤더 그대로 복사 */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <CogIcon className="w-6 h-6 text-blue-500" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              거래 설정
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              포트폴리오 할당과 거래 전략을 설정하세요
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-sm">
            {environment === "paper" ? (
              <TestTubeIcon className="w-4 h-4 text-blue-500" />
            ) : (
              <SparklesIcon className="w-4 h-4 text-green-500" />
            )}
            <span>
              현재 환경:{" "}
              {environment === "paper" ? "페이퍼 트레이딩" : "실거래"}
            </span>
            <span className="text-gray-400">|</span>
            <span>적용될 금액: {initialCapital.toLocaleString()}원</span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
            >
              <XIcon className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-8 max-h-96 overflow-y-auto">
        {/* 🔥 기존 변경사항 알림 그대로 복사 */}
        {hasChanges && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
            <div className="flex items-start">
              <AlertTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  설정 변경 사항이 있습니다
                </h3>
                <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                  변경사항을 적용하려면 저장 버튼을 클릭하세요.
                  {isActive &&
                    " 활성 거래 중에는 일부 설정이 다음 거래부터 적용됩니다."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🔥 기존 활성 지표 정보 그대로 복사 */}
        {activeIndicators.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
            <div className="flex items-center space-x-2">
              <InfoIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm text-blue-800 dark:text-blue-200">
                여러 지표가 동시에 신호를 줄 때만 거래
              </span>
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <span className="text-sm text-blue-700 dark:text-blue-300">
                현재 활성화된 기술적 지표:
              </span>
              {activeIndicators.map((indicator) => (
                <span
                  key={indicator}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200"
                >
                  {indicator}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 🔥 탭으로 분리된 섹션들 */}
        <Tabs>
          <Tab label="포트폴리오 할당">
            {/* 🔥 기존 TradingSettings_v1.jsx의 포트폴리오 섹션 그대로 복사 */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <PieChartIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  포트폴리오 할당
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <NumberInput
                  label="현금 (40%)"
                  value={allocations.cash * 100}
                  onChange={(value) => handleAllocationChange("cash", value)}
                  min={0}
                  max={80}
                  step={0.1}
                  unit="%"
                  icon={DollarSignIcon}
                />
                <NumberInput
                  label="1티어 (안정) (42%)"
                  value={allocations.t1 * 100}
                  onChange={(value) => handleAllocationChange("t1", value)}
                  min={0}
                  max={80}
                  step={0.1}
                  unit="%"
                  icon={ShieldCheckIcon}
                />
                <NumberInput
                  label="2티어 (균형) (15%)"
                  value={allocations.t2 * 100}
                  onChange={(value) => handleAllocationChange("t2", value)}
                  min={0}
                  max={80}
                  step={0.1}
                  unit="%"
                  icon={BarChart3Icon}
                />
                <NumberInput
                  label="3티어 (성장) (3%)"
                  value={allocations.t3 * 100}
                  onChange={(value) => handleAllocationChange("t3", value)}
                  min={0}
                  max={80}
                  step={0.1}
                  unit="%"
                  icon={TrendingUpIcon}
                />
              </div>

              {/* 🔥 기존 할당 요약 그대로 복사 */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400">현금</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {portfolioValues.cash.toLocaleString()}원
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      T1 (안정)
                    </p>
                    <p className="font-semibold text-blue-600 dark:text-blue-400">
                      {portfolioValues.t1.toLocaleString()}원
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      T2 (균형)
                    </p>
                    <p className="font-semibold text-yellow-600 dark:text-yellow-400">
                      {portfolioValues.t2.toLocaleString()}원
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-600 dark:text-gray-400">
                      T3 (성장)
                    </p>
                    <p className="font-semibold text-red-600 dark:text-red-400">
                      {portfolioValues.t3.toLocaleString()}원
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Tab>

          <Tab label="기술적 지표">
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <BarChart3Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  기술적 지표 설정
                </h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  현재 활성화된 지표: RSI, MACD
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  기술적 지표 세부 설정은 향후 추가될 예정입니다.
                </p>
              </div>
            </div>
          </Tab>

          <Tab label="리스크 관리">
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <ShieldCheckIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  리스크 관리
                </h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  리스크 관리 설정은 향후 추가될 예정입니다.
                </p>
              </div>
            </div>
          </Tab>

          <Tab label="고급 설정">
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <SlidersIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  고급 설정
                </h3>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  고급 설정은 향후 추가될 예정입니다.
                </p>
              </div>
            </div>
          </Tab>
        </Tabs>
      </div>

      {/* 🔥 기존 하단 버튼들 그대로 복사 */}
      <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-gray-800 rounded-b-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          최종 수정: 12개 구석
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <RefreshCwIcon className="w-4 h-4 mr-2 inline" />
            초기화
          </button>

          <button
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-4 py-2 rounded-md transition-colors focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              hasChanges
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
            }`}
          >
            <SaveIcon className="w-4 h-4 mr-2 inline" />
            설정 저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradingSettings;
