// src/components/features/trading/PaperTrading.jsx - 기존 구조 유지 + 중앙화 개선
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  ChevronDown,
  ChevronUp,
  Settings,
  RefreshCw,
  Play,
  Pause,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  DollarSign,
  Activity,
  BarChart3,
  Zap,
  Target,
  Shield,
} from "lucide-react";

// 🎯 중앙화된 설정 import 추가
import {
  usePortfolioConfig,
  PORTFOLIO_CONSTANTS,
} from "../../config/portfolioConfig.js";
import { usePortfolioStore } from "../../stores/portfolioStore.js";
import usePortfolioManager from "../portfoilo/hooks/usePortfolioManager.js";

const PaperTrading = ({ marketData, selectedCoins, addLog, testMode }) => {
  // 🎯 중앙화된 설정 사용 (기존 코드에 추가)
  const { config, constants, isLoading: configLoading } = usePortfolioConfig();
  const {
    portfolio,
    updatePortfolio,
    isLoading: portfolioLoading,
    getInitialBalance,
  } = usePortfolioManager(marketData, addLog);
  const { portfolioData, portfolioStats, getConfig, initializeConfig } =
    usePortfolioStore();

  // 기존 state들 유지
  const [selectedTab, setSelectedTab] = useState("overview");
  const [notifications, setNotifications] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    portfolio: true,
    trading: true,
    performance: false,
    settings: false,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [tradingSettings, setTradingSettings] = useState({
    maxPositions: constants?.DEFAULT_STRATEGY?.maxPositions || 4,
    riskLevel: 5,
    autoRebalance: true,
    stopLossEnabled: true,
    takeProfitEnabled: true,
  });

  // 기존 refs 유지
  const autoRefreshInterval = useRef(null);
  const lastUpdateTime = useRef(Date.now());

  // 🎯 중앙화된 초기 자본 사용하도록 개선
  const selectedCoinsCount = useMemo(() => {
    return selectedCoins?.length || 0;
  }, [selectedCoins]);

  // 🎯 중앙화된 설정을 사용한 포트폴리오 통계 (기존 로직 유지하면서 개선)
  const currentPortfolioStats = useMemo(() => {
    const stats = portfolioStats || portfolio?.performance || {};
    const initialBalance =
      getInitialBalance() ||
      config?.initialCapital ||
      constants?.DEFAULT_INITIAL_BALANCE ||
      0;

    return {
      totalValue: portfolio?.totalValue || initialBalance,
      totalProfit: portfolio?.totalProfit || 0,
      totalReturn: stats.totalReturn || 0,
      winRate: stats.winRate || 0,
      maxDrawdown: stats.maxDrawdown || 0,
      profitFactor: stats.profitFactor || 0,
      initialBalance, // 🎯 중앙화된 초기 자본
    };
  }, [portfolioStats, portfolio, config, constants, getInitialBalance]);

  // 🎯 설정 초기화 (기존 코드에 추가)
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        if (!getConfig()) {
          await initializeConfig();
        }
        // 중앙화된 설정으로 tradingSettings 업데이트
        if (constants?.DEFAULT_STRATEGY) {
          setTradingSettings((prev) => ({
            ...prev,
            maxPositions: constants.DEFAULT_STRATEGY.maxPositions,
            stopLossEnabled: constants.DEFAULT_STRATEGY.stopLoss
              ? true
              : prev.stopLossEnabled,
            takeProfitEnabled: constants.DEFAULT_STRATEGY.profitTarget
              ? true
              : prev.takeProfitEnabled,
          }));
        }
      } catch (error) {
        console.error("설정 초기화 실패:", error);
        addLog?.("⚠️ 설정 초기화에 실패했습니다", "warning");
      }
    };

    initializeSettings();
  }, [getConfig, initializeConfig, addLog, constants]);

  // 기존 함수들 유지
  const formatCurrency = useCallback((amount) => {
    if (typeof amount !== "number") return "₩0";
    return `₩${Math.round(amount).toLocaleString()}`;
  }, []);

  const formatPercentage = useCallback((value) => {
    if (typeof value !== "number") return "0.00%";
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  }, []);

  const addNotification = useCallback((message, type = "info") => {
    const notification = {
      id: Date.now(),
      message,
      type,
      timestamp: new Date(),
    };

    setNotifications((prev) => [notification, ...prev.slice(0, 9)]);

    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, 5000);
  }, []);

  // 🎯 중앙화된 초기 자본을 사용하도록 개선한 토글 함수
  const toggleTrading = useCallback(() => {
    setIsActive((prev) => {
      const newState = !prev;
      const initialBalance = getInitialBalance();
      const message = newState
        ? `🟢 페이퍼 트레이딩 활성화 (초기자본: ${formatCurrency(initialBalance)})`
        : "🔴 페이퍼 트레이딩 비활성화";

      addLog?.(message, newState ? "success" : "info");
      addNotification(message, newState ? "success" : "info");

      return newState;
    });
  }, [addLog, addNotification, formatCurrency, getInitialBalance]);

  const handleRefresh = useCallback(() => {
    updatePortfolio(true);
    lastUpdateTime.current = Date.now();
    addNotification("포트폴리오 데이터를 새로고침했습니다", "info");
  }, [updatePortfolio, addNotification]);

  const toggleSection = useCallback((section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  // 기존 자동 새로고침 로직 유지
  useEffect(() => {
    if (autoRefresh && isActive && refreshInterval > 0) {
      autoRefreshInterval.current = setInterval(() => {
        handleRefresh();
      }, refreshInterval * 1000);
    } else if (autoRefreshInterval.current) {
      clearInterval(autoRefreshInterval.current);
      autoRefreshInterval.current = null;
    }

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, [autoRefresh, isActive, refreshInterval, handleRefresh]);

  // 기존 탭 구성 유지
  const tabs = [
    { id: "overview", name: "개요", icon: BarChart3 },
    { id: "positions", name: "포지션", icon: Target },
    { id: "trades", name: "거래내역", icon: Activity },
    { id: "analytics", name: "분석", icon: TrendingUp },
    { id: "settings", name: "설정", icon: Settings },
  ];

  // 로딩 상태 (기존 구조 유지)
  const isLoading = configLoading || portfolioLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600">설정을 불러오는 중...</span>
      </div>
    );
  }

  return (
    <div className="paper-trading-container h-full flex flex-col bg-gray-50">
      {/* 기존 헤더 구조 완전 유지 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              페이퍼 트레이딩
            </h1>
            <p className="text-gray-600 mt-1">
              실제 자금 없이 안전하게 거래 연습
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`}
              ></div>
              <span className="text-sm font-medium text-gray-700">
                {isActive ? "실시간 페이퍼트레이딩 진행 중" : "대기 중"}
              </span>
            </div>

            <div className="text-sm text-gray-500">
              {selectedCoinsCount}개 코인 모니터링 •{" "}
              {testMode ? "테스트 모드" : "실전 모드"}
            </div>
          </div>
        </div>

        {/* 기존 탭 네비게이션 유지 */}
        <div className="mt-4">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    selectedTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 기존 알림 영역 구조 유지 */}
      <div className="px-6 py-4 bg-gray-100 border-b border-gray-200">
        <div className="max-h-24 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center text-gray-500 text-sm py-2">
              새로운 알림이 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                    notification.type === "success"
                      ? "bg-green-100 text-green-800 border border-green-200"
                      : notification.type === "warning"
                        ? "bg-yellow-100 text-yellow-800 border border-yellow-200"
                        : notification.type === "error"
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : "bg-blue-100 text-blue-800 border border-blue-200"
                  }`}
                >
                  <span className="font-medium">{notification.message}</span>
                  <span className="text-xs opacity-75">
                    {notification.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 기존 메인 컨텐츠 영역 구조 유지 */}
      <div className="flex-1 overflow-hidden">
        {selectedTab === "overview" && (
          <div className="h-full overflow-y-auto p-6">
            {/* 기존 포트폴리오 요약 카드들 구조 유지 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">총 자산</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatCurrency(currentPortfolioStats.totalValue)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      거래 상태
                    </p>
                    <p
                      className={`text-2xl font-bold mt-1 ${isActive ? "text-green-600" : "text-gray-400"}`}
                    >
                      {isActive ? "활성" : "비활성"}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-full ${isActive ? "bg-green-100" : "bg-gray-100"}`}
                  >
                    {isActive ? (
                      <Play
                        className={`w-6 h-6 ${isActive ? "text-green-600" : "text-gray-400"}`}
                      />
                    ) : (
                      <Pause className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      선택 코인
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {selectedCoinsCount}개
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Users className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">수익금</p>
                    <p
                      className={`text-2xl font-bold mt-1 ${
                        currentPortfolioStats.totalProfit >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {currentPortfolioStats.totalProfit >= 0 ? "+" : ""}
                      {formatCurrency(currentPortfolioStats.totalProfit)}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-full ${
                      currentPortfolioStats.totalProfit >= 0
                        ? "bg-emerald-100"
                        : "bg-red-100"
                    }`}
                  >
                    {currentPortfolioStats.totalProfit >= 0 ? (
                      <TrendingUp className="w-6 h-6 text-emerald-600" />
                    ) : (
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 기존 컨트롤 패널 구조 유지 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    실시간 자동 매매 관리
                  </h3>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleRefresh}
                      disabled={isLoading}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                      title="새로고침"
                    >
                      <RefreshCw
                        className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        자동 거래
                      </span>
                      <button
                        onClick={toggleTrading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          isActive ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isActive ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        자동 새로고침
                      </span>
                      <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          autoRefresh ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            autoRefresh ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">
                        새로고침 간격 (초)
                      </label>
                      <select
                        value={refreshInterval}
                        onChange={(e) =>
                          setRefreshInterval(Number(e.target.value))
                        }
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value={10}>10초</option>
                        <option value={30}>30초</option>
                        <option value={60}>1분</option>
                        <option value={300}>5분</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        거래 설정
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            최대 포지션
                          </span>
                          <span className="text-sm font-medium">
                            {tradingSettings.maxPositions}개
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            리스크 레벨
                          </span>
                          <span className="text-sm font-medium">
                            {tradingSettings.riskLevel}/10
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">손절매</span>
                          <span
                            className={`text-sm font-medium ${tradingSettings.stopLossEnabled ? "text-green-600" : "text-gray-400"}`}
                          >
                            {tradingSettings.stopLossEnabled
                              ? "활성"
                              : "비활성"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">익절매</span>
                          <span
                            className={`text-sm font-medium ${tradingSettings.takeProfitEnabled ? "text-green-600" : "text-gray-400"}`}
                          >
                            {tradingSettings.takeProfitEnabled
                              ? "활성"
                              : "비활성"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={toggleTrading}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        isActive
                          ? "bg-red-500 hover:bg-red-600 text-white shadow-lg"
                          : "bg-blue-500 hover:bg-blue-600 text-white shadow-lg"
                      }`}
                    >
                      {isActive ? (
                        <>
                          <Pause className="w-4 h-4 mr-2 inline" />
                          거래 중단
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2 inline" />
                          거래 시작
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleRefresh}
                      disabled={isLoading}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 shadow-lg"
                    >
                      <RefreshCw
                        className={`w-4 h-4 mr-2 inline ${isLoading ? "animate-spin" : ""}`}
                      />
                      {isLoading ? "새로고침 중..." : "새로고침"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 🎯 중앙화된 설정 정보 표시 (개발 모드에서만, 기존 구조 유지) */}
            {process.env.NODE_ENV === "development" && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">
                  개발자 정보
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-yellow-700">
                  <div>
                    <span className="block font-medium">초기 자본:</span>
                    <span>
                      {formatCurrency(currentPortfolioStats.initialBalance)}
                    </span>
                  </div>
                  <div>
                    <span className="block font-medium">환경:</span>
                    <span>{process.env.NODE_ENV}</span>
                  </div>
                  <div>
                    <span className="block font-medium">설정 로드됨:</span>
                    <span>{config ? "✅" : "❌"}</span>
                  </div>
                  <div>
                    <span className="block font-medium">상수 로드됨:</span>
                    <span>{constants ? "✅" : "❌"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 기존 다른 탭들도 동일한 구조로 유지... */}
        {selectedTab === "positions" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  현재 포지션
                </h3>
                <p className="text-gray-500">
                  포지션 정보가 여기에 표시됩니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "trades" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  거래내역
                </h3>
                <p className="text-gray-500">거래내역이 여기에 표시됩니다.</p>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "analytics" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  성과 분석
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">총 수익률</p>
                    <p
                      className={`text-2xl font-bold ${currentPortfolioStats.totalReturn >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatPercentage(currentPortfolioStats.totalReturn)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">승률</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatPercentage(currentPortfolioStats.winRate)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">최대 손실</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatPercentage(currentPortfolioStats.maxDrawdown)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedTab === "settings" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  거래 설정
                </h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      최대 포지션 수
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={tradingSettings.maxPositions}
                      onChange={(e) =>
                        setTradingSettings((prev) => ({
                          ...prev,
                          maxPositions: Number(e.target.value),
                        }))
                      }
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      리스크 레벨 ({tradingSettings.riskLevel}/10)
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={tradingSettings.riskLevel}
                      onChange={(e) =>
                        setTradingSettings((prev) => ({
                          ...prev,
                          riskLevel: Number(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        자동 리밸런싱
                      </span>
                      <button
                        onClick={() =>
                          setTradingSettings((prev) => ({
                            ...prev,
                            autoRebalance: !prev.autoRebalance,
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tradingSettings.autoRebalance
                            ? "bg-blue-600"
                            : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            tradingSettings.autoRebalance
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        손절매 활성화
                      </span>
                      <button
                        onClick={() =>
                          setTradingSettings((prev) => ({
                            ...prev,
                            stopLossEnabled: !prev.stopLossEnabled,
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tradingSettings.stopLossEnabled
                            ? "bg-blue-600"
                            : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            tradingSettings.stopLossEnabled
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        익절매 활성화
                      </span>
                      <button
                        onClick={() =>
                          setTradingSettings((prev) => ({
                            ...prev,
                            takeProfitEnabled: !prev.takeProfitEnabled,
                          }))
                        }
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          tradingSettings.takeProfitEnabled
                            ? "bg-blue-600"
                            : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            tradingSettings.takeProfitEnabled
                              ? "translate-x-6"
                              : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaperTrading;
