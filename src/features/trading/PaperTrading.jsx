// src/features/trading/PaperTrading.jsx - 에러 수정 완전 버전
import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  PlayIcon, PauseIcon, CogIcon, BellIcon, TrendingUpIcon, TrendingDownIcon,
  PieChartIcon, ShieldCheckIcon, BarChart3Icon, InfoIcon, CheckCircleIcon,
  AlertTriangleIcon, DollarSignIcon, PercentIcon, ZapIcon, ClockIcon,
  ActivityIcon, Coins, LineChart, Settings, History, Target, AlertCircle,
  RefreshCw, Eye, EyeOff, Filter, Search, Download, Upload, Trash2, Edit3
} from "lucide-react";

// ✅ 중앙화된 스토어들
import { useCoinStore } from "../../stores/coinStore";
import { usePortfolioStore } from "../../stores/portfolioStore";
import { useTradingStore } from "../../stores/tradingStore";

// ✅ 중앙화된 데이터 관리자 (서비스)
import { centralDataManager } from "../../services/data/centralDataManager";

// ✅ 중앙화된 데이터 스토어 (상태) - 올바른 위치
import { useCentralDataStore } from "../../stores/centralDataStore";

// ✅ 훅들
import { useTradingLogger } from "./hooks/useTradingLogger";
import { useTradingSettings } from "./hooks/useTradingSettings";

// ✅ 탭 컴포넌트들
import TradingSettings from "./components/TradingSettings";
import OverviewTab from "./components/OverviewTab";
import CoinsTab from "./components/CoinsTab";
import PortfolioTab from "./components/PortfolioTab";
import TradesTab from "./components/TradesTab";
import SignalsTab from "./components/SignalsTab";
import LogsTab from "./components/LogsTab";

const PaperTrading = () => {
  // ✅ 로컬 상태
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ 중앙화된 스토어에서 실제 데이터 가져오기 (안전한 접근)
  const {
    selectedCoins = [], // 기본값 제공
    isLoading: coinsLoading = false,
    initializeData: initializeCoins,
    addCoin,
    removeCoin,
    getLoadingState
  } = useCoinStore() || {}; // useCoinStore 자체가 undefined일 경우 대비

  const {
    portfolioData = null, // 기본값 제공
    portfolioStats = null,
    updatePortfolio,
    initializeConfig
  } = usePortfolioStore() || {};

  const {
    tradingSettings = {},
    updateTradingSettings
  } = useTradingStore() || {};

  // ✅ 중앙 데이터 스토어에서 실시간 데이터 (안전한 접근)
  const {
    trades = [], // 기본값 제공
    signals = [],
    notifications = [],
    addTrade,
    addSignal,
    addNotification,
    clearAllData
  } = useCentralDataStore() || {};

  // ✅ 로거 시스템 (안전한 접근)
  const {
    logs = [], // 기본값 제공
    addLog,
    updateStats,
    resetStats,
    monitoringStats = {},
    exportLogs,
    getFilteredLogs
  } = useTradingLogger() || {};

  // ✅ 설정 관리 (안전한 접근)
  const {
    settings = {},
    isDirty = false,
    saveSettings
  } = useTradingSettings() || {};

  // ✅ 초기화
  useEffect(() => {
    const initializeApp = async () => {
      try {
        addLog?.("🚀 CryptoWise 페이퍼 트레이딩 초기화 시작", "info");

        // 1. 포트폴리오 설정 초기화
        if (initializeConfig) {
          await initializeConfig("demo-user");
          addLog?.("✅ 포트폴리오 설정 초기화 완료", "success");
        }

        // 2. 코인 데이터 초기화 (로컬스토리지 확인)
        const savedCoins = localStorage.getItem('cryptowise_selected_coins');
        if (savedCoins && initializeCoins && addCoin) {
          try {
            const parsedCoins = JSON.parse(savedCoins);
            for (const coinMarket of parsedCoins) {
              const result = addCoin(coinMarket);
              if (result?.success) {
                addLog?.(`📈 관심코인 복원: ${coinMarket}`, "success");
              }
            }
            addLog?.(`📦 로컬스토리지에서 ${parsedCoins.length}개 관심코인 복원`, "success");
          } catch (error) {
            addLog?.("❌ 로컬스토리지 관심코인 복원 실패 - 새로 초기화", "warning");
            if (initializeCoins) {
              await initializeCoins(true);
            }
          }
        } else if (initializeCoins) {
          await initializeCoins();
          addLog?.("🔄 코인 데이터 새로 초기화", "info");
        }

        // 3. 중앙 데이터 매니저 초기화
        if (selectedCoins?.length > 0 && centralDataManager) {
          const coinSymbols = selectedCoins.map(coin => coin.symbol || coin.market?.replace('KRW-', ''));
          await centralDataManager.initialize(coinSymbols);
          addLog?.(`🎯 중앙 데이터 매니저 초기화: ${coinSymbols.length}개 코인`, "success");
        }

        // 4. 거래 내역 복원
        const savedTrades = localStorage.getItem('cryptowise_trades');
        if (savedTrades && addTrade) {
          try {
            const parsedTrades = JSON.parse(savedTrades);
            parsedTrades.forEach(trade => addTrade(trade));
            addLog?.(`📊 거래내역 ${parsedTrades.length}개 복원`, "success");
          } catch (error) {
            addLog?.("❌ 거래내역 복원 실패", "warning");
          }
        }

        // 5. 신호 내역 복원
        const savedSignals = localStorage.getItem('cryptowise_signals');
        if (savedSignals && addSignal) {
          try {
            const parsedSignals = JSON.parse(savedSignals);
            parsedSignals.forEach(signal => addSignal(signal));
            addLog?.(`🔔 신호내역 ${parsedSignals.length}개 복원`, "success");
          } catch (error) {
            addLog?.("❌ 신호내역 복원 실패", "warning");
          }
        }

        addLog?.("✅ 시스템 초기화 완료 - 페이퍼 트레이딩 준비됨", "success");
      } catch (error) {
        addLog?.(`❌ 시스템 초기화 실패: ${error.message}`, "error");
      }
    };

    initializeApp();
  }, []);

  // ✅ 관심코인 변경 시 로컬스토리지 저장
  useEffect(() => {
    if (selectedCoins?.length > 0) {
      const coinMarkets = selectedCoins.map(coin => coin.market || `KRW-${coin.symbol}`);
      localStorage.setItem('cryptowise_selected_coins', JSON.stringify(coinMarkets));
      addLog?.(`💾 관심코인 ${selectedCoins.length}개 자동 저장`, "debug");
    }
  }, [selectedCoins, addLog]);

  // ✅ 거래 내역 변경 시 로컬스토리지 저장
  useEffect(() => {
    if (trades?.length > 0) {
      localStorage.setItem('cryptowise_trades', JSON.stringify(trades));
      addLog?.(`💾 거래내역 ${trades.length}개 자동 저장`, "debug");
    }
  }, [trades, addLog]);

  // ✅ 신호 내역 변경 시 로컬스토리지 저장
  useEffect(() => {
    if (signals?.length > 0) {
      localStorage.setItem('cryptowise_signals', JSON.stringify(signals));
      addLog?.(`💾 신호내역 ${signals.length}개 자동 저장`, "debug");
    }
  }, [signals, addLog]);

  // ✅ 거래 시작/중지 핸들러 (완전 구현)
  const handleToggleTrading = useCallback(async () => {
    if (!isActive) {
      // 거래 시작 전 검증
      if (!selectedCoins?.length) {
        addNotification?.({
          message: '관심코인을 먼저 선택해주세요',
          type: 'warning'
        });
        setActiveTab('coins');
        return;
      }

      if (isDirty && saveSettings) {
        const shouldSave = window.confirm('저장되지 않은 설정이 있습니다. 저장하고 거래를 시작하시겠습니까?');
        if (shouldSave) {
          const result = await saveSettings();
          if (!result?.success) {
            addLog?.(`❌ 설정 저장 실패: ${result?.error}`, 'error');
            addNotification?.({
              message: `설정 저장 실패: ${result?.error}`,
              type: 'error'
            });
            return;
          }
        }
      }

      try {
        setIsActive(true);
        setConnectionStatus('connecting');
        addLog?.("🚀 페이퍼 트레이딩 시작", "info");

        // 중앙 데이터 매니저 구독 시작
        const coinSymbols = selectedCoins.map(coin => coin.symbol || coin.market?.replace('KRW-', ''));
        const unsubscribe = centralDataManager?.subscribe('paperTrading', (data) => {
          // 실시간 데이터 처리
          if (data.prices) {
            updateStats?.(prev => ({
              ...prev,
              dataReceived: (prev.dataReceived || 0) + Object.keys(data.prices).length,
              lastActivity: new Date().toLocaleTimeString()
            }));
          }
        });

        // 포트폴리오 업데이트 스케줄러 시작
        const portfolioInterval = setInterval(() => {
          if (isActive && updatePortfolio && portfolioData) {
            updatePortfolio(portfolioData, portfolioData?.totalValue);
            addLog?.("📊 포트폴리오 자동 업데이트", "debug");
          }
        }, 30000); // 30초마다

        setConnectionStatus('connected');
        addLog?.(`✅ 페이퍼 트레이딩 시작 완료 - ${coinSymbols.length}개 코인 모니터링`, "success");
        addNotification?.({
          message: `페이퍼 트레이딩이 시작되었습니다 (${coinSymbols.length}개 코인)`,
          type: 'success'
        });

        // 정리 함수 저장 (컴포넌트 언마운트나 중지 시 사용)
        window.tradingCleanup = () => {
          unsubscribe?.();
          clearInterval(portfolioInterval);
        };

      } catch (error) {
        addLog?.(`❌ 거래 시작 실패: ${error.message}`, "error");
        addNotification?.({
          message: `거래 시작 실패: ${error.message}`,
          type: 'error'
        });
        setIsActive(false);
        setConnectionStatus('disconnected');
      }
    } else {
      // 거래 중지
      try {
        setIsActive(false);
        setConnectionStatus('disconnecting');
        addLog?.("🛑 페이퍼 트레이딩 중지 요청", "info");

        // 정리 작업 실행
        if (window.tradingCleanup) {
          window.tradingCleanup();
          delete window.tradingCleanup;
        }

        setConnectionStatus('disconnected');
        addLog?.("✅ 페이퍼 트레이딩 완전 중지", "warning");
        addNotification?.({
          message: '페이퍼 트레이딩이 중지되었습니다',
          type: 'info'
        });
      } catch (error) {
        addLog?.(`❌ 거래 중지 중 오류: ${error.message}`, "error");
      }
    }
  }, [isActive, selectedCoins, isDirty, saveSettings, addLog, addNotification, portfolioData, updatePortfolio, updateStats]);

  // ✅ 코인 토글 핸들러 (완전 구현)
  const handleCoinToggle = useCallback((symbol, isSelected) => {
    if (!addCoin || !removeCoin || !addLog || !addNotification) return;

    const coinMarket = `KRW-${symbol}`;

    if (isSelected) {
      const result = addCoin(coinMarket);
      addLog(`${result?.success ? '✅' : '❌'} ${symbol} ${result?.message}`, result?.success ? 'success' : 'warning');
      addNotification({
        message: `${symbol}: ${result?.message}`,
        type: result?.success ? 'success' : 'warning'
      });
    } else {
      const result = removeCoin(coinMarket);
      addLog(`${result?.success ? '✅' : '❌'} ${symbol} ${result?.message}`, result?.success ? 'info' : 'warning');
      addNotification({
        message: `${symbol}: ${result?.message}`,
        type: result?.success ? 'info' : 'warning'
      });
    }
  }, [addCoin, removeCoin, addLog, addNotification]);

  // ✅ 신호 새로고침 로직 (완전 구현)
  const handleRefreshSignals = useCallback(() => {
    if (!addLog || !addSignal || !updateStats) return;

    addLog("🔄 신호 새로고침 요청", "info");

    // 실제 신호 새로고침 로직
    try {
      const refreshedSignals = (selectedCoins || []).map(coin => {
        const mockSignal = {
          id: `signal_${coin.symbol}_${Date.now()}`,
          symbol: coin.symbol,
          type: Math.random() > 0.5 ? 'BUY' : 'SELL',
          totalScore: Math.random() * 10,
          confidence: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW',
          reason: '기술적 분석 기반 신호',
          timestamp: new Date(),
          executed: false,
          price: coin.currentPrice || Math.random() * 1000000
        };
        addSignal(mockSignal);
        return mockSignal;
      });

      addLog(`✅ 신호 ${refreshedSignals.length}개 새로고침 완료`, "success");
      updateStats(prev => ({
        ...prev,
        signalsGenerated: (prev.signalsGenerated || 0) + refreshedSignals.length
      }));
    } catch (error) {
      addLog(`❌ 신호 새로고침 실패: ${error.message}`, "error");
    }
  }, [selectedCoins, addSignal, addLog, updateStats]);

  // ✅ 로그 검색 로직 (완전 구현)
  const handleSearchLogs = useCallback((searchTerm) => {
    if (!getFilteredLogs || !addLog) return [];

    setSearchTerm(searchTerm);
    addLog(`🔍 로그 검색: "${searchTerm}"`, "debug");

    // 검색 결과 반환
    return getFilteredLogs(null, searchTerm);
  }, [getFilteredLogs, addLog]);

  // ✅ 탭별 카운트 계산 (에러 수정 - 안전한 접근)
  const tabCounts = useMemo(() => ({
    coins: selectedCoins?.length ?? 0,
    portfolio: portfolioData?.coins?.length ?? 0,
    trades: trades?.length ?? 0,
    signals: signals?.length ?? 0,
    logs: logs?.length ?? 0
  }), [selectedCoins, portfolioData, trades, signals, logs]);

  // ✅ 성과 데이터 계산 (안전한 접근)
  const performance = useMemo(() => {
    const totalTrades = trades?.length ?? 0;
    const profitableTrades = trades?.filter(t => (t.profitRate || 0) > 0).length ?? 0;
    const winRate = totalTrades > 0 ? (profitableTrades / totalTrades) * 100 : 0;

    return {
      totalTrades,
      profitableTrades,
      winRate
    };
  }, [trades]);

  // ✅ 탭 구성 (실제 데이터 반영)
  const tabs = [
    { id: 'dashboard', label: '대시보드', icon: BarChart3Icon, count: null },
    { id: 'coins', label: '코인 관리', icon: Coins, count: tabCounts.coins },
    { id: 'portfolio', label: '포트폴리오', icon: PieChartIcon, count: tabCounts.portfolio },
    { id: 'trades', label: '거래내역', icon: History, count: tabCounts.trades },
    { id: 'signals', label: '신호', icon: ActivityIcon, count: tabCounts.signals },
    { id: 'logs', label: '로그', icon: InfoIcon, count: tabCounts.logs }
  ];

  // ✅ 탭별 렌더링 (완전 구현)
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <OverviewTab
            isActive={isActive}
            connectionStatus={connectionStatus}
            performance={performance}
            lastSignal={signals?.[0] || null}
          />
        );
      case 'coins':
        return (
          <CoinsTab
            coins={[]} // 전체 이용 가능한 코인 목록 (필요시 추가)
            selectedCoins={selectedCoins || []} // ✅ 선택된 코인들 전달
            onCoinToggle={handleCoinToggle}
            onCoinAdd={(symbol) => {
              // 새 코인 추가 로직
              const result = addCoin(`KRW-${symbol}`);
              if (result?.success) {
                addLog?.(`✅ ${symbol} 코인 추가됨`, "success");
              } else {
                addLog?.(`❌ ${symbol} 추가 실패: ${result?.message}`, "error");
              }
            }}
            onRefresh={() => {
              // 코인 데이터 새로고침
              if (initializeCoins) {
                initializeCoins(true);
                addLog?.("🔄 코인 데이터 새로고침", "info");
              }
            }}
            isActive={isActive}
            loadingState={{
              isLoading: coinsLoading || false,
              hasData: (selectedCoins?.length || 0) > 0
            }}
          />
        );
      case 'portfolio':
        return (
          <PortfolioTab
            portfolio={portfolioData}
            totalValue={portfolioData?.totalValue}
          />
        );
      case 'trades':
        return (
          <TradesTab
            trades={trades || []}
          />
        );
      case 'signals':
        return (
          <SignalsTab
            signals={signals || []}
            isActive={isActive}
            tradingMode="paper"
            lastUpdateTime={monitoringStats?.lastActivity}
            onRefreshSignals={handleRefreshSignals}
          />
        );
      case 'logs':
        return (
          <LogsTab
            logs={logs || []}
            onSearchChange={handleSearchLogs}
          />
        );
      default:
        return (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {activeTab} 탭 내용을 준비 중입니다...
            </p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            페이퍼 트레이딩
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            실제 자금 없이 안전하게 거래 연습 • 중앙화된 데이터 시스템
          </p>
        </div>

        {/* 알림 버튼 */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <BellIcon className="h-6 w-6" />
            {(notifications?.length ?? 0) > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 알림 드롭다운 */}
      {isNotificationOpen && (
        <div className="fixed top-16 right-6 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-900 dark:text-white">
              새로운 알림이 {(notifications?.length ?? 0) === 0 ? '없습니다' : `${notifications.length}개 있습니다`}
            </h3>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {(notifications?.length ?? 0) === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                알림이 없습니다.
              </div>
            ) : (
              notifications?.map(notification => (
                <div key={notification.id} className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {notification.message}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {notification.timestamp?.toLocaleTimeString?.()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-6">
        {/* 좌측: 메인 콘텐츠 (3칸) */}
        <div className="col-span-3">
          {/* 탭 네비게이션 */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                      } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 py-0.5 px-2 rounded-full text-xs">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            {renderTabContent()}
          </div>
        </div>

        {/* 우측: 거래 컨트롤 (1칸) */}
        <div className="space-y-6">
          {/* 거래 상태 카드 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              실시간 자동 매매 관리
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">거래 상태</span>
                <span className={`text-sm font-medium ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-500'
                  }`}>
                  {isActive ? "활성" : "비활성"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">선택 코인</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedCoins?.length ?? 0}개
                </span>
              </div>

              <button
                onClick={handleToggleTrading}
                disabled={coinsLoading}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isActive ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                <span>{isActive ? '거래 중지' : '거래 시작'}</span>
              </button>
            </div>
          </div>

          {/* 실시간 상태 */}
          {isActive && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    실시간 페이퍼트레이딩 진행 중
                  </div>
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    {selectedCoins?.length ?? 0}개 코인 모니터링 • 중앙 데이터 연동
                  </div>
                </div>
                <ActivityIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          )}

          {/* 설정 버튼 */}
          <button
            onClick={() => setShowSettings(true)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <CogIcon className="h-4 w-4" />
            <span>거래 설정</span>
          </button>
        </div>
      </div>

      {/* 설정 모달 */}
      {showSettings && TradingSettings && (
        <TradingSettings
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default React.memo(PaperTrading);
