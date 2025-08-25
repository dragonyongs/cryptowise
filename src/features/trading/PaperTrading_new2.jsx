// src/components/features/trading/PaperTrading.jsx - 중앙화 데이터 연동 완전 버전

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldIcon,
  PlayIcon,
  PauseIcon,
  ChartBarIcon,
  CogIcon,
  BellIcon,
  DollarSignIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CoinsIcon,
  RefreshCwIcon,
  BarChart3Icon,
  ActivityIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PieChartIcon,
  SettingsIcon,
  FileTextIcon,
  TrendingUpIcon as AnalysisIcon
} from 'lucide-react';

// 🎯 중앙화된 스토어 임포트 
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useTradingStore } from '../../stores/tradingStore';
import { useCoinStore } from '../../stores/coinStore';

// 🎯 서비스 및 훅
import { paperTradingEngine } from '../../services/testing/paperTradingEngine';
import { usePaperTrading } from '../trading/hooks/usePaperTrading';
import { formatCurrency, formatPercent } from '../../utils/formatters';

const PaperTrading = () => {
  // 🎯 UI 상태 (기존 유지)
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [showNotifications, setShowNotifications] = useState(false);

  // 🎯 중앙화된 데이터 (하드코딩 제거)
  const portfolio = usePortfolioStore((state) => state.portfolio);
  const trades = usePortfolioStore((state) => state.recentTrades);
  const isActive = useTradingStore((state) => state.isActive);
  const tradingSettings = useTradingStore((state) => state.settings);
  const selectedCoins = useCoinStore((state) => state.selectedCoins);

  // 🎯 페이퍼 트레이딩 훅 (실제 데이터 연결)
  const {
    isLoading,
    error,
    startTrading,
    stopTrading,
    resetPortfolio
  } = usePaperTrading();

  // 🎯 실시간 포트폴리오 통계 (중앙화된 데이터 기반)
  const currentPortfolioStats = useMemo(() => {
    const totalValue = portfolio?.totalValue || (tradingSettings?.initialCapital || 1840000);
    const totalProfit = portfolio?.totalProfit || 0;
    const profitPercent = totalValue > 0 ? (totalProfit / (totalValue - totalProfit)) * 100 : 0;
    const availableKRW = portfolio?.availableKRW || totalValue;

    return {
      totalValue,
      totalProfit,
      profitPercent,
      availableKRW,
      winRate: portfolio?.winRate || 0,
      totalTrades: trades?.length || 0
    };
  }, [portfolio, trades, tradingSettings]);

  // 🎯 선택된 코인 수 (중앙화된 데이터 기반)
  const selectedCoinsCount = useMemo(() => {
    return selectedCoins?.length || 0;
  }, [selectedCoins]);

  // 🎯 전략 요약 (중앙화된 설정 기반)
  const summary = useMemo(() => {
    const minBuyScore = tradingSettings?.minBuyScore || 8.0;
    const profitTarget1 = tradingSettings?.profitTarget || 8;
    const stopLoss = tradingSettings?.stopLoss || -6;
    const maxCoinsToTrade = tradingSettings?.maxPositions || 4;

    const allocation = tradingSettings?.allocation || {
      cash: 40,
      t1: 55,
      t2: 30,
      t3: 15
    };

    // 전략 레이블 동적 계산
    let strategyLabel = '균형';
    if (minBuyScore >= 8.5) strategyLabel = '초보수적';
    else if (minBuyScore >= 7.5) strategyLabel = '보수적';
    else if (minBuyScore >= 6.5) strategyLabel = '균형';
    else strategyLabel = '적극적';

    return {
      strategyLabel,
      totalRules: Object.keys(tradingSettings || {}).length,
      allocation,
      minBuyScore: minBuyScore.toFixed(1),
      profitTarget1,
      stopLoss,
      maxCoinsToTrade,
      testMode: tradingSettings?.testMode || false
    };
  }, [tradingSettings]);

  // 🎯 실시간 업데이트 (기존 유지)
  useEffect(() => {
    const handleConfigUpdate = () => setLastUpdate(Date.now());
    const handlePortfolioUpdate = () => setLastUpdate(Date.now());

    window.addEventListener('trading-config-updated', handleConfigUpdate);
    window.addEventListener('portfolio-updated', handlePortfolioUpdate);

    return () => {
      window.removeEventListener('trading-config-updated', handleConfigUpdate);
      window.removeEventListener('portfolio-updated', handlePortfolioUpdate);
    };
  }, []);

  // 🎯 거래 제어 핸들러 (기존 유지)
  const handleToggleTrading = useCallback(() => {
    if (isActive) {
      stopTrading();
      setNotifications(prev => [...prev, {
        id: Date.now(),
        message: '페이퍼 트레이딩이 중지되었습니다',
        timestamp: new Date(),
        type: 'warning'
      }]);
    } else {
      startTrading();
      setNotifications(prev => [...prev, {
        id: Date.now(),
        message: '페이퍼 트레이딩이 시작되었습니다',
        timestamp: new Date(),
        type: 'success'
      }]);
    }
  }, [isActive, startTrading, stopTrading]);

  const handleResetPortfolio = useCallback(() => {
    if (window.confirm('정말로 포트폴리오를 초기화하시겠습니까?')) {
      resetPortfolio();
      setNotifications(prev => [...prev, {
        id: Date.now(),
        message: '포트폴리오가 초기화되었습니다',
        timestamp: new Date(),
        type: 'info'
      }]);
    }
  }, [resetPortfolio]);

  const testMode = summary.testMode;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 🎯 헤더 (기존 유지) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">페이퍼 트레이딩</h1>
              <p className="text-slate-600">실제 자금 없이 안전하게 거래 연습</p>
            </div>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                <CogIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative"
              >
                <BellIcon className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 🎯 탭 네비게이션 (기존 복원) */}
        <div className="bg-white rounded-xl border border-slate-200 p-1">
          <nav className="flex space-x-1">
            {[
              { id: 'dashboard', label: '대시보드', icon: BarChart3Icon },
              { id: 'trades', label: '거래 내역', icon: ActivityIcon },
              { id: 'analysis', label: '분석', icon: AnalysisIcon },
              { id: 'portfolio', label: '포트폴리오', icon: PieChartIcon },
              { id: 'logs', label: '로그', icon: FileTextIcon },
              { id: 'settings', label: '설정', icon: SettingsIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* 🎯 알림 패널 (기존 유지) */}
        {showNotifications && notifications.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-slate-900">알림</h3>
              <button
                onClick={() => setNotifications([])}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                모두 지우기
              </button>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {notifications.slice(0, 5).map((notification) => (
                <div key={notification.id} className="flex items-center justify-between text-sm p-2 rounded border">
                  <div className="flex items-center space-x-2">
                    {notification.type === 'success' && <CheckCircleIcon className="w-4 h-4 text-green-600" />}
                    {notification.type === 'warning' && <AlertCircleIcon className="w-4 h-4 text-amber-600" />}
                    {notification.type === 'error' && <XCircleIcon className="w-4 h-4 text-red-600" />}
                    <span className="text-slate-700">{notification.message}</span>
                  </div>
                  <span className="text-slate-400 text-xs">
                    {notification.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🎯 메인 콘텐츠 (탭별 렌더링) */}
        {activeTab === 'dashboard' && (
          <>
            {/* 현재 상태 카드들 - 중앙화된 데이터 사용 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-center space-x-3 mb-2">
                  <DollarSignIcon className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-slate-600">총 자산</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {formatCurrency(currentPortfolioStats.totalValue)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  사용 가능: {formatCurrency(currentPortfolioStats.availableKRW)}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-center space-x-3 mb-2">
                  <PlayIcon className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-slate-600">거래 상태</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {isActive ? "활성" : "비활성"}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {isLoading && "로딩 중..."}
                  {error && "오류 발생"}
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-center space-x-3 mb-2">
                  <CoinsIcon className="w-5 h-5 text-purple-600" />
                  <span className="text-sm font-medium text-slate-600">선택 코인</span>
                </div>
                <div className="text-2xl font-bold text-slate-900">
                  {selectedCoinsCount}개
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  총 거래: {currentPortfolioStats.totalTrades}회
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="flex items-center space-x-3 mb-2">
                  <TrendingUpIcon className="w-5 h-5 text-emerald-600" />
                  <span className="text-sm font-medium text-slate-600">수익금</span>
                </div>
                <div className={`text-2xl font-bold ${currentPortfolioStats.totalProfit >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}>
                  {currentPortfolioStats.totalProfit >= 0 ? "+" : ""}
                  {formatCurrency(currentPortfolioStats.totalProfit)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  수익률: {formatPercent(currentPortfolioStats.profitPercent)}
                  • 승률: {formatPercent(currentPortfolioStats.winRate)}
                </div>
              </div>
            </div>

            {/* 전략 요약 카드 - 중앙화된 설정 사용 */}
            <div className="bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <ShieldIcon className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-700">현재 전략 요약</div>
                    <div className="text-xs text-slate-500">거래 시작 전 적용된 설정과 주요 조건</div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${summary.strategyLabel === "초보수적" ? "bg-red-100 text-red-700" :
                    summary.strategyLabel === "보수적" ? "bg-amber-100 text-amber-700" :
                      summary.strategyLabel === "균형" ? "bg-sky-100 text-sky-700" :
                        summary.strategyLabel === "적극적" ? "bg-emerald-100 text-emerald-700" :
                          "bg-slate-100 text-slate-600"
                    }`}>
                    {summary.strategyLabel}
                  </span>
                  {summary.totalRules > 0 && (
                    <span className="px-2 py-1 bg-white rounded-full text-xs text-slate-600 border">
                      {summary.totalRules}개 규칙
                    </span>
                  )}
                </div>
              </div>

              {/* 자산 배분 - 중앙화된 설정 기반 */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border border-slate-100 text-center">
                  <div className="text-xs text-slate-500 mb-1">현금</div>
                  <div className="text-lg font-bold text-slate-900">{summary.allocation.cash}%</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100 text-center">
                  <div className="text-xs text-slate-500 mb-1">T1 (안전)</div>
                  <div className="text-lg font-bold text-blue-600">{summary.allocation.t1}%</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100 text-center">
                  <div className="text-xs text-slate-500 mb-1">T2 (균형)</div>
                  <div className="text-lg font-bold text-green-600">{summary.allocation.t2}%</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100 text-center">
                  <div className="text-xs text-slate-500 mb-1">T3 (공격)</div>
                  <div className="text-lg font-bold text-orange-600">{summary.allocation.t3}%</div>
                </div>
              </div>

              {/* 주요 설정 - 중앙화된 설정 기반 */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">최소 매수 점수</div>
                  <div className="font-semibold text-slate-700">{summary.minBuyScore}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">수익 목표</div>
                  <div className="font-semibold text-green-600">{summary.profitTarget1}%</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">손절라인</div>
                  <div className="font-semibold text-red-600">{summary.stopLoss}%</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-100">
                  <div className="text-xs text-slate-400 mb-1">최대 동시 거래</div>
                  <div className="font-semibold text-slate-700">{summary.maxCoinsToTrade}개</div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {testMode ? "🧪 테스트 모드로 실행됩니다" : "💎 실전 모드 설정"}
                </div>
                <div className="text-xs text-slate-400">
                  마지막 설정 업데이트: {new Date(lastUpdate).toLocaleString()}
                </div>
              </div>
            </div>

            {/* 거래 제어 버튼 */}
            <div className="bg-white rounded-xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">실시간 자동 매매 관리</h3>
                  <p className="text-slate-600 text-sm">
                    {isActive ? "실시간 페이퍼트레이딩 진행 중" : "대기 중"}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleResetPortfolio}
                    className="flex items-center space-x-2 px-4 py-2 text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg transition-colors"
                    disabled={isActive}
                  >
                    <RefreshCwIcon className="w-4 h-4" />
                    <span>초기화</span>
                  </button>
                  <button
                    onClick={handleToggleTrading}
                    disabled={isLoading}
                    className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${isActive
                      ? "bg-red-100 text-red-700 hover:bg-red-200"
                      : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                      } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isActive ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                    <span>{isActive ? "중지" : "시작"}</span>
                  </button>
                </div>
              </div>

              {isActive && (
                <div className="flex items-center space-x-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>{selectedCoinsCount}개 코인 모니터링</span>
                  </div>
                  <span>•</span>
                  <span>{testMode ? "테스트 모드" : "실전 모드"}</span>
                </div>
              )}
            </div>
          </>
        )}

        {/* 🎯 기존 탭들 복원 */}
        {activeTab === 'trades' && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">거래 내역</h3>
            {trades && trades.length > 0 ? (
              <div className="space-y-2">
                {trades.slice(0, 20).map((trade, index) => (
                  <div key={trade.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${trade.side === 'buy' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                      <span className="font-medium">{trade.symbol}</span>
                      <span className="text-sm text-slate-600">
                        {trade.side === 'buy' ? '매수' : '매도'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(trade.amount)}</div>
                      <div className="text-xs text-slate-500">
                        {new Date(trade.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <ActivityIcon className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p>아직 거래 내역이 없습니다</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">대시보드 개요</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {formatCurrency(currentPortfolioStats.totalValue)}
                </div>
                <div className="text-sm text-slate-600">총 자산가치</div>
                <div className="text-xs text-slate-500 mt-1">
                  초기 투자금: {formatCurrency(tradingSettings?.initialCapital || 1840000)}
                </div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl font-bold text-slate-900 mb-1">
                  {currentPortfolioStats.totalTrades}
                </div>
                <div className="text-sm text-slate-600">총 거래 수</div>
                <div className="text-xs text-slate-500 mt-1">
                  승률: {formatPercent(currentPortfolioStats.winRate)}
                </div>
              </div>

              <div className="text-center p-4 border rounded-lg">
                <div className={`text-3xl font-bold mb-1 ${currentPortfolioStats.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {formatPercent(currentPortfolioStats.profitPercent)}
                </div>
                <div className="text-sm text-slate-600">총 수익률</div>
                <div className="text-xs text-slate-500 mt-1">
                  {formatCurrency(currentPortfolioStats.totalProfit)}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">성과 분석</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {formatPercent(currentPortfolioStats.winRate)}
                </div>
                <div className="text-sm text-slate-600">승률</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className={`text-2xl font-bold mb-1 ${currentPortfolioStats.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                  {formatPercent(currentPortfolioStats.profitPercent)}
                </div>
                <div className="text-sm text-slate-600">총 수익률</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-slate-900 mb-1">
                  {currentPortfolioStats.totalTrades}
                </div>
                <div className="text-sm text-slate-600">총 거래 수</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">시스템 로그</h3>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-sm text-slate-600">
                실시간 시스템 로그가 여기에 표시됩니다...
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">설정</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">테스트 모드</div>
                  <div className="text-sm text-slate-600">실제 거래 없이 시뮬레이션만 진행</div>
                </div>
                <div className={`w-12 h-6 rounded-full ${testMode ? 'bg-blue-500' : 'bg-slate-300'} transition-colors`}>
                  <div className={`w-5 h-5 bg-white rounded-full mt-0.5 transition-transform ${testMode ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
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
