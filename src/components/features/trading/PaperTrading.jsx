// src/components/features/testing/PaperTrading.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { usePaperTrading } from "../../../hooks/usePaperTrading";
import { useWebSocketConnection } from "../../../hooks/useWebSocketConnection";
import { paperTradingEngine } from "../../../services/testing/paperTradingEngine";
import { signalGenerator } from "../../../services/analysis/signalGenerator";

// 컴포넌트 imports
import CoinsTab from "./components/CoinsTab";
import OverviewTab from "./components/OverviewTab";
import PortfolioTab from "./components/PortfolioTab";
import TradesTab from "./components/TradesTab";
import SignalsTab from "./components/SignalsTab";
import LogsTab from "./components/LogsTab";
import TradingControls from "./components/TradingControls";

import {
  TestTubeIcon,
  MonitorIcon,
  CoinsIcon,
  PieChartIcon,
  ActivityIcon,
  ZapIcon,
  LineChartIcon,
} from "lucide-react";

const PaperTrading = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedCoins, setSelectedCoins] = useState(["BTC", "ETH", "XRP"]);
  const [settings, setSettings] = useState({
    autoTrade: false,
    riskLevel: 5,
    maxPositions: 5,
    stopLoss: -8,
    takeProfit: 15,
  });

  // 실제 페이퍼트레이딩 훅 사용
  const {
    portfolio,
    isActive,
    setIsActive,
    trades,
    signals,
    logs,
    performance,
    resetPortfolio,
  } = usePaperTrading("user-123"); // 실제 유저 ID

  // WebSocket 연결 상태
  const { connectionStatus, isConnected } = useWebSocketConnection();

  // 실제 신호 처리
  useEffect(() => {
    if (!isActive || !isConnected) return;

    const handleMarketData = async (marketData) => {
      try {
        // 실제 신호 생성
        const generatedSignals = await signalGenerator.generateSignals(
          marketData,
          selectedCoins
        );

        for (const signal of generatedSignals) {
          if (signal.confidence >= 0.7) {
            // 실제 거래 실행
            const result = await paperTradingEngine.executeSignal(
              signal,
              portfolio,
              settings
            );

            if (result.executed) {
              console.log("Trade executed:", result);
            }
          }
        }
      } catch (error) {
        console.error("Signal processing error:", error);
      }
    };

    // WebSocket 이벤트 리스너 등록
    if (window.upbitWebSocket) {
      window.upbitWebSocket.addEventListener("message", handleMarketData);
      return () => {
        window.upbitWebSocket.removeEventListener("message", handleMarketData);
      };
    }
  }, [isActive, isConnected, selectedCoins, portfolio, settings]);

  // 거래 시작
  const handleStartTrading = useCallback(async () => {
    if (selectedCoins.length === 0) {
      alert("거래할 코인을 먼저 선택하세요.");
      return;
    }

    try {
      await setIsActive(true);
      console.log("Paper trading started with coins:", selectedCoins);
    } catch (error) {
      console.error("Failed to start trading:", error);
      alert("거래 시작에 실패했습니다.");
    }
  }, [selectedCoins, setIsActive]);

  // 거래 중지
  const handleStopTrading = useCallback(async () => {
    try {
      await setIsActive(false);
      console.log("Paper trading stopped");
    } catch (error) {
      console.error("Failed to stop trading:", error);
    }
  }, [setIsActive]);

  // 포트폴리오 초기화
  const handleReset = useCallback(async () => {
    if (isActive) {
      alert("거래 중에는 초기화할 수 없습니다. 먼저 거래를 중지하세요.");
      return;
    }

    if (
      confirm(
        "정말로 포트폴리오를 초기화하시겠습니까? 모든 데이터가 삭제됩니다."
      )
    ) {
      await resetPortfolio();
    }
  }, [isActive, resetPortfolio]);

  // 탭 구성
  const tabs = [
    { id: "overview", label: "개요", icon: MonitorIcon },
    { id: "coins", label: "코인 관리", icon: CoinsIcon },
    { id: "portfolio", label: "포트폴리오", icon: PieChartIcon },
    { id: "trades", label: "거래 내역", icon: ActivityIcon },
    { id: "signals", label: "신호 분석", icon: ZapIcon },
    { id: "logs", label: "로그", icon: LineChartIcon },
  ];

  // 총 포트폴리오 가치 계산
  const totalPortfolioValue = useMemo(() => {
    if (!portfolio) return 1840000;

    const coinValue = Object.values(portfolio.coins || {}).reduce(
      (sum, coin) => {
        return sum + coin.quantity * coin.currentPrice;
      },
      0
    );

    return (portfolio.krw || 1840000) + coinValue;
  }, [portfolio]);

  // 탭 콘텐츠 렌더링
  const renderContent = () => {
    const commonProps = {
      portfolio,
      totalValue: totalPortfolioValue,
      isActive,
      connectionStatus,
    };

    switch (activeTab) {
      case "coins":
        return (
          <CoinsTab
            selectedCoins={selectedCoins}
            onCoinsChange={setSelectedCoins}
            isActive={isActive}
          />
        );
      case "overview":
        return <OverviewTab {...commonProps} />;
      case "portfolio":
        return <PortfolioTab {...commonProps} />;
      case "trades":
        return <TradesTab trades={trades || []} />;
      case "signals":
        return <SignalsTab signals={signals || []} isActive={isActive} />;
      case "logs":
        return <LogsTab logs={logs || []} />;
      default:
        return <div>탭을 선택하세요.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <TestTubeIcon className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  페이퍼 트레이딩
                </h1>
                <p className="text-gray-600">
                  실제 자금 없이 안전하게 거래 연습
                </p>
              </div>
            </div>

            <TradingControls
              isActive={isActive}
              connectionStatus={connectionStatus}
              onStart={handleStartTrading}
              onStop={handleStopTrading}
              onReset={handleReset}
              settings={settings}
              onSettingsChange={setSettings}
              portfolio={portfolio}
              totalValue={totalPortfolioValue}
              performance={performance}
            />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                      ${
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">{renderContent()}</div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PaperTrading);
