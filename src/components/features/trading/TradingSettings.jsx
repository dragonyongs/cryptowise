// src/components/features/testing/TradingSettings.jsx
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
  NewspaperIcon,
  BarChart3Icon,
  SaveIcon,
  RefreshCwIcon,
  CheckIcon,
  AlertTriangleIcon,
  InfoIcon,
  TestTubeIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ZapIcon,
  DollarSignIcon,
  PercentIcon,
  TimerIcon,
} from "lucide-react";

// ✅ 정규화 함수 - 비율 유지하면서 100% 강제
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

// ✅ 슬라이더 연동 조정 함수
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

// ✅ 개선된 슬라이더 컴포넌트
const SliderInput = React.memo(
  ({
    label,
    value,
    onChange,
    min = 0,
    max = 1,
    step = 0.01,
    unit = "%",
    className = "",
    disabled = false,
  }) => {
    const [localValue, setLocalValue] = useState((value * 100).toFixed(1));

    useEffect(() => {
      setLocalValue((value * 100).toFixed(1));
    }, [value]);

    const handleSliderChange = useCallback(
      (e) => {
        const newValue = parseFloat(e.target.value) / 100;
        onChange(newValue);
      },
      [onChange]
    );

    const handleInputChange = useCallback((e) => {
      const inputValue = e.target.value;
      setLocalValue(inputValue);
    }, []);

    const handleInputBlur = useCallback(() => {
      const numValue = parseFloat(localValue);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
        onChange(numValue / 100);
      } else {
        setLocalValue((value * 100).toFixed(1));
      }
    }, [localValue, onChange, value]);

    const handleInputKeyPress = useCallback(
      (e) => {
        if (e.key === "Enter") {
          handleInputBlur();
        }
      },
      [handleInputBlur]
    );

    return (
      <div className={`space-y-3 ${className}`}>
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={localValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyPress={handleInputKeyPress}
              className="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              min="0"
              max="100"
              step="0.1"
              disabled={disabled}
            />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {unit}
            </span>
          </div>
        </div>
        <div className="relative">
          <input
            type="range"
            min={min * 100}
            max={max * 100}
            step={step * 100}
            value={value * 100}
            onChange={handleSliderChange}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    );
  }
);

// ✅ 메인 컴포넌트
const TradingSettings = () => {
  // 상태 관리
  const [allocations, setAllocations] = useState({
    cash: 0.3,
    t1: 0.4,
    t2: 0.2,
    t3: 0.1,
  });

  const [tradingSettings, setTradingSettings] = useState({
    buyThreshold: 0.65,
    sellThreshold: 0.35,
    maxPositions: 5,
    stopLoss: 0.08,
    takeProfit: 0.15,
    riskPerTrade: 0.02,
  });

  const [isExpanded, setIsExpanded] = useState({
    allocation: true,
    trading: true,
    risk: false,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // ✅ 개선된 할당 조정 함수
  const handleAllocationChange = useCallback((key, newValue) => {
    setAllocations((prev) => {
      const adjusted = adjustOtherAllocations(key, newValue, prev);
      const normalized = normalizeAllocations(adjusted);
      return normalized;
    });
  }, []);

  // ✅ 거래 설정 변경 함수
  const handleTradingSettingChange = useCallback((key, value) => {
    setTradingSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // ✅ 실시간 미리보기 계산
  const preview = useMemo(() => {
    const totalAmount = 1840000; // 총 금액
    return {
      cashPercent: Math.round(allocations.cash * 100),
      cashAmount: Math.round(allocations.cash * totalAmount),
      tier1Percent: Math.round(allocations.t1 * 100),
      tier1Amount: Math.round(allocations.t1 * totalAmount),
      tier2Percent: Math.round(allocations.t2 * 100),
      tier2Amount: Math.round(allocations.t2 * totalAmount),
      tier3Percent: Math.round(allocations.t3 * 100),
      tier3Amount: Math.round(allocations.t3 * totalAmount),
    };
  }, [allocations]);

  // ✅ 설정 저장 함수 (디바운싱 적용)
  const saveSettingsDebounced = useCallback(
    (() => {
      let timeoutId;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          setIsSaving(true);
          try {
            // 실제 저장 로직
            const settings = {
              allocations,
              tradingSettings,
              timestamp: new Date().toISOString(),
            };

            localStorage.setItem(
              "cryptowise-trading-settings",
              JSON.stringify(settings)
            );
            setLastSaved(new Date());

            // API 저장 시뮬레이션
            await new Promise((resolve) => setTimeout(resolve, 500));
          } catch (error) {
            console.error("설정 저장 오류:", error);
          } finally {
            setIsSaving(false);
          }
        }, 1000);
      };
    })(),
    [allocations, tradingSettings]
  );

  // 설정 변경 시 자동 저장
  useEffect(() => {
    saveSettingsDebounced();
  }, [allocations, tradingSettings, saveSettingsDebounced]);

  // ✅ 초기 설정 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cryptowise-trading-settings");
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        if (parsedSettings.allocations) {
          setAllocations(parsedSettings.allocations);
        }
        if (parsedSettings.tradingSettings) {
          setTradingSettings(parsedSettings.tradingSettings);
        }
      }
    } catch (error) {
      console.error("설정 로드 오류:", error);
    }
  }, []);

  // ✅ 섹션 토글
  const toggleSection = useCallback((section) => {
    setIsExpanded((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // ✅ 프리셋 적용
  const applyPreset = useCallback((presetName) => {
    const presets = {
      conservative: {
        cash: 0.5,
        t1: 0.3,
        t2: 0.15,
        t3: 0.05,
      },
      balanced: {
        cash: 0.3,
        t1: 0.4,
        t2: 0.2,
        t3: 0.1,
      },
      aggressive: {
        cash: 0.1,
        t1: 0.5,
        t2: 0.3,
        t3: 0.1,
      },
    };

    if (presets[presetName]) {
      setAllocations(presets[presetName]);
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <CogIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                거래 설정
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                포트폴리오 할당과 거래 전략을 설정하세요
              </p>
            </div>
          </div>

          {/* 저장 상태 */}
          <div className="flex items-center space-x-2">
            {isSaving ? (
              <div className="flex items-center space-x-2 text-blue-600">
                <RefreshCwIcon className="w-4 h-4 animate-spin" />
                <span className="text-sm">저장 중...</span>
              </div>
            ) : lastSaved ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckIcon className="w-4 h-4" />
                <span className="text-sm">
                  {lastSaved.toLocaleTimeString("ko-KR")} 저장됨
                </span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* 자산 할당 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 rounded-t-xl"
          onClick={() => toggleSection("allocation")}
        >
          <div className="flex items-center space-x-3">
            <PieChartIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              포트폴리오 할당
            </h3>
          </div>
          {isExpanded.allocation ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {isExpanded.allocation && (
          <div className="px-6 pb-6 space-y-6">
            {/* 프리셋 버튼 */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => applyPreset("conservative")}
                className="px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
              >
                보수적 (50/30/15/5)
              </button>
              <button
                onClick={() => applyPreset("balanced")}
                className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
              >
                균형 (30/40/20/10)
              </button>
              <button
                onClick={() => applyPreset("aggressive")}
                className="px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              >
                공격적 (10/50/30/10)
              </button>
            </div>

            {/* 할당 슬라이더들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SliderInput
                label="현금 보유 비율"
                value={allocations.cash}
                onChange={(value) => handleAllocationChange("cash", value)}
              />
              <SliderInput
                label="TIER 1 (주력 코인)"
                value={allocations.t1}
                onChange={(value) => handleAllocationChange("t1", value)}
              />
              <SliderInput
                label="TIER 2 (보조 코인)"
                value={allocations.t2}
                onChange={(value) => handleAllocationChange("t2", value)}
              />
              <SliderInput
                label="TIER 3 (실험 코인)"
                value={allocations.t3}
                onChange={(value) => handleAllocationChange("t3", value)}
              />
            </div>

            {/* 미리보기 */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                할당 미리보기 (총 184만원 기준)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    현금
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">
                    {preview.cashPercent}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    ₩{(preview.cashAmount / 10000).toFixed(0)}만
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    TIER1
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">
                    {preview.tier1Percent}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    ₩{(preview.tier1Amount / 10000).toFixed(0)}만
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    TIER2
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">
                    {preview.tier2Percent}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    ₩{(preview.tier2Amount / 10000).toFixed(0)}만
                  </div>
                </div>

                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    TIER3
                  </div>
                  <div className="text-sm text-purple-600 dark:text-purple-400">
                    {preview.tier3Percent}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    ₩{(preview.tier3Amount / 10000).toFixed(0)}만
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 거래 설정 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
          onClick={() => toggleSection("trading")}
        >
          <div className="flex items-center space-x-3">
            <BarChart3Icon className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              거래 전략 설정
            </h3>
          </div>
          {isExpanded.trading ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {isExpanded.trading && (
          <div className="px-6 pb-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SliderInput
                label="매수 신호 임계값"
                value={tradingSettings.buyThreshold}
                onChange={(value) =>
                  handleTradingSettingChange("buyThreshold", value)
                }
              />
              <SliderInput
                label="매도 신호 임계값"
                value={tradingSettings.sellThreshold}
                onChange={(value) =>
                  handleTradingSettingChange("sellThreshold", value)
                }
              />
              <SliderInput
                label="손절매 비율"
                value={tradingSettings.stopLoss}
                onChange={(value) =>
                  handleTradingSettingChange("stopLoss", value)
                }
              />
              <SliderInput
                label="익절 비율"
                value={tradingSettings.takeProfit}
                onChange={(value) =>
                  handleTradingSettingChange("takeProfit", value)
                }
              />
            </div>

            {/* 추가 설정 */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start space-x-2">
                <AlertTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                    주의사항
                  </h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    설정 변경 시 기존 거래 전략에 즉시 반영됩니다. 백테스팅을
                    통해 검증 후 적용하는 것을 권장합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 리스크 관리 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
        <div
          className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
          onClick={() => toggleSection("risk")}
        >
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              리스크 관리
            </h3>
          </div>
          {isExpanded.risk ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {isExpanded.risk && (
          <div className="px-6 pb-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  최대 동시 포지션 수
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={tradingSettings.maxPositions}
                  onChange={(e) =>
                    handleTradingSettingChange(
                      "maxPositions",
                      parseInt(e.target.value)
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <SliderInput
                label="거래당 리스크 비율"
                value={tradingSettings.riskPerTrade}
                onChange={(value) =>
                  handleTradingSettingChange("riskPerTrade", value)
                }
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingSettings;
