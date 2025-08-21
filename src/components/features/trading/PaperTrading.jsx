// src/components/features/testing/PaperTrading.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import TradingSettings from "./TradingSettings";

// 분리된 컴포넌트들 import
import CoinsTab from "./components/CoinsTab";
import OverviewTab from "./components/OverviewTab";
import PortfolioTab from "./components/PortfolioTab";
import TradesTab from "./components/TradesTab";
import SignalsTab from "./components/SignalsTab";
import LogsTab from "./components/LogsTab";
import TradingControls from "./components/TradingControls";

import {
  PlayIcon,
  PauseIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  BarChart3Icon,
  SettingsIcon,
  TestTubeIcon,
  ActivityIcon,
  PieChartIcon,
  ZapIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  MonitorIcon,
  ChevronUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  CoinsIcon,
  TargetIcon,
  LineChartIcon,
  XIcon,
  WifiIcon,
  WifiOffIcon,
  SearchIcon,
  PlusIcon,
  MinusIcon,
  StarIcon,
  FilterIcon,
  SortAscIcon,
} from "lucide-react";

const PaperTrading = () => {
  // ===== 기존 상태 관리 복원 =====
  const [portfolio, setPortfolio] = useState({
    krw: 1840000,
    coins: {},
    totalValue: 1840000,
    performance: {
      totalReturn: 0,
      todayPnL: 0,
      winRate: 0,
      totalTrades: 0,
    },
  });

  const [isActive, setIsActive] = useState(false);
  const [selectedCoins, setSelectedCoins] = useState(["BTC", "ETH"]);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [logs, setLogs] = useState([]);
  const [trades, setTrades] = useState([]);
  const [signals, setSignals] = useState([]);
  const [lastSignal, setLastSignal] = useState(null);

  const [settings, setSettings] = useState({
    initialCapital: 1840000,
    riskLevel: 5,
    maxPositionSize: 300000,
    stopLoss: -8,
    takeProfit: 15,
    autoTrade: true,
    notifications: true,
  });

  const [tradingMode, setTradingMode] = useState("watchlist");
  const [watchlistCoins, setWatchlistCoins] = useState([
    { symbol: "BTC", name: "Bitcoin", price: 45000000 },
    { symbol: "ETH", name: "Ethereum", price: 3200000 },
    { symbol: "XRP", name: "Ripple", price: 650 },
  ]);

  // 탭 관리
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // ===== 거래 로직 함수들 =====
  const addLog = useCallback((message, type = "info") => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date(),
      message,
      type,
    };
    setLogs((prev) => [newLog, ...prev].slice(0, 100));
  }, []);

  const handleStartTrading = useCallback(() => {
    if (selectedCoins.length === 0) {
      alert("거래할 코인을 먼저 선택해주세요.");
      return;
    }

    setIsActive(true);
    setConnectionStatus("connected");
    addLog(
      `페이퍼 트레이딩 시작 - 선택된 코인: ${selectedCoins.join(", ")}`,
      "success"
    );

    // 실제 연결 시뮬레이션
    setTimeout(() => {
      setConnectionStatus("active");
      addLog("실시간 데이터 연결 완료", "success");
    }, 1000);
  }, [selectedCoins, addLog]);

  const handleStopTrading = useCallback(() => {
    setIsActive(false);
    setConnectionStatus("disconnected");
    addLog("페이퍼 트레이딩 중지", "warning");
  }, [addLog]);

  const handleResetPortfolio = useCallback(() => {
    if (isActive) {
      alert("거래 중에는 포트폴리오를 초기화할 수 없습니다.");
      return;
    }

    if (
      window.confirm(
        "포트폴리오를 초기화하시겠습니까? 모든 거래 내역이 삭제됩니다."
      )
    ) {
      setPortfolio({
        krw: settings.initialCapital,
        coins: {},
        totalValue: settings.initialCapital,
        performance: {
          totalReturn: 0,
          todayPnL: 0,
          winRate: 0,
          totalTrades: 0,
        },
      });
      setTrades([]);
      setSignals([]);
      setLogs([]);
      addLog("포트폴리오 초기화 완료", "info");
    }
  }, [isActive, settings.initialCapital, addLog]);

  // 성과 계산
  const performance = useMemo(() => {
    const totalValue = portfolio.totalValue;
    const initialCapital = settings.initialCapital;
    const totalReturn = ((totalValue - initialCapital) / initialCapital) * 100;

    const winTrades = trades.filter((trade) => trade.profitRate > 0).length;
    const winRate = trades.length > 0 ? (winTrades / trades.length) * 100 : 0;

    return {
      totalReturn,
      winRate,
      totalTrades: trades.length,
      todayPnL: 0, // 실제로는 오늘 거래만 계산
    };
  }, [portfolio.totalValue, settings.initialCapital, trades]);

  // 탭 목록
  const tabs = [
    { id: "overview", label: "개요", icon: MonitorIcon },
    { id: "coins", label: "코인 관리", icon: CoinsIcon },
    { id: "portfolio", label: "포트폴리오", icon: PieChartIcon },
    { id: "trades", label: "거래 내역", icon: ActivityIcon },
    { id: "signals", label: "신호 분석", icon: ZapIcon },
    { id: "logs", label: "로그", icon: LineChartIcon },
  ];

  // 콘텐츠 렌더링
  const renderContent = () => {
    switch (activeTab) {
      case "coins":
        return (
          <CoinsTab
            selectedCoins={selectedCoins}
            onCoinsChange={setSelectedCoins}
            watchlistCoins={watchlistCoins}
            tradingMode={tradingMode}
            setTradingMode={setTradingMode}
            isActive={isActive}
          />
        );
      case "overview":
        return (
          <OverviewTab
            portfolio={portfolio}
            isActive={isActive}
            connectionStatus={connectionStatus}
            performance={performance}
            lastSignal={lastSignal}
          />
        );
      case "portfolio":
        return (
          <PortfolioTab
            portfolio={portfolio}
            totalValue={portfolio.totalValue}
          />
        );
      case "trades":
        return <TradesTab trades={trades} />;
      case "signals":
        return <SignalsTab signals={signals} isActive={isActive} />;
      case "logs":
        return (
          <LogsTab
            logs={logs}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <TestTubeIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  페이퍼 트레이딩
                </h1>
                <p className="text-gray-600">
                  실제 자금 없이 안전하게 거래 연습
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <SettingsIcon className="h-5 w-5" />
            </button>
          </div>

          {/* 거래 컨트롤 */}
          <TradingControls
            isActive={isActive}
            connectionStatus={connectionStatus}
            onStart={handleStartTrading}
            onStop={handleStopTrading}
            onReset={handleResetPortfolio}
            settings={settings}
            onSettingsChange={setSettings}
            portfolio={portfolio}
            performance={performance}
          />
        </div>

        {/* 설정 패널 */}
        {showSettings && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <TradingSettings
              settings={settings}
              onSettingsChange={setSettings}
              onClose={() => setShowSettings(false)}
            />
          </div>
        )}

        {/* 탭 네비게이션 */}
        <div className="bg-white rounded-lg shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? "border-blue-500 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="h-4 w-4" />
                      <span>{tab.label}</span>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="p-6">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default PaperTrading;
