// src/components/features/testing/components/OverviewTab.jsx
import React, { useMemo, useEffect } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { usePortfolioStore } from "../../../stores/portfolioStore"; // ✅ 포트폴리오 스토어 추가
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  PieChartIcon,
  ActivityIcon,
  WifiIcon,
  WifiOffIcon,
  ShieldCheckIcon,
  ClockIcon,
  BarChart3Icon,
  AlertCircleIcon,
  CheckCircleIcon,
  InfoIcon,
  CoinsIcon,
  StarIcon,
  TargetIcon,
  ZapIcon,
  LineChartIcon,
} from "lucide-react";

const OverviewTab = ({
  portfolio,
  portfolioStats, // ✅ PaperTrading에서 전달받은 스토어 데이터 
  isActive,
  connectionStatus,
  performance,
  lastSignal,
  totalValue,
  monitoringStats
}) => {
  // ✅ 포트폴리오 스토어 사용 (백업용)
  const {
    calculatedPortfolio,
    portfolioStats: storePortfolioStats,
    updatePortfolio
  } = usePortfolioStore();

  // ✅ 포트폴리오 변경시 스토어 업데이트 (PaperTrading에서 이미 했지만 안전장치)
  useEffect(() => {
    if (portfolio && !portfolioStats) {
      console.log("🔄 OverviewTab - 스토어 업데이트 (백업)");
      updatePortfolio(portfolio, totalValue);
    }
  }, [portfolio, totalValue, portfolioStats, updatePortfolio]);

  // ✅ 스토어 데이터 사용 (props 우선, 없으면 스토어에서 직접)
  const currentPortfolioData = useMemo(() => {
    // PaperTrading에서 전달받은 portfolioStats 우선 사용
    if (portfolioStats) {
      console.log("✅ OverviewTab - PaperTrading에서 전달받은 portfolioStats 사용");
      return {
        totalValue: portfolioStats.totalValue || 1840000,
        totalInvestment: portfolioStats.totalInvestment || 0,
        currentValue: portfolioStats.currentValue || 0,
        totalProfit: portfolioStats.totalProfit || 0,
        profitPercent: portfolioStats.profitPercent || 0,
        portfolioProfitPercent: portfolioStats.portfolioProfitPercent || 0,
        coins: calculatedPortfolio?.coins || [],
        cashValue: calculatedPortfolio?.cash?.value || portfolioStats.cashValue || 1840000,
      };
    }

    // 백업: 스토어에서 직접 사용
    if (storePortfolioStats && calculatedPortfolio) {
      console.log("✅ OverviewTab - 스토어에서 직접 데이터 사용");
      return {
        totalValue: storePortfolioStats.totalValue || 1840000,
        totalInvestment: storePortfolioStats.totalInvestment || 0,
        currentValue: storePortfolioStats.currentValue || 0,
        totalProfit: storePortfolioStats.totalProfit || 0,
        profitPercent: storePortfolioStats.profitPercent || 0,
        portfolioProfitPercent: storePortfolioStats.portfolioProfitPercent || 0,
        coins: calculatedPortfolio.coins || [],
        cashValue: calculatedPortfolio.cash?.value || 1840000,
      };
    }

    // 최종 폴백: 기본값
    console.warn("⚠️ OverviewTab - 스토어 데이터가 없어 기본값 사용");
    return {
      totalValue: 1840000,
      totalInvestment: 0,
      currentValue: 0,
      totalProfit: 0,
      profitPercent: 0,
      portfolioProfitPercent: 0,
      coins: [],
      cashValue: 1840000,
    };
  }, [portfolioStats, storePortfolioStats, calculatedPortfolio]);

  // 디버깅 로그 (기존 유지하되 간소화)
  useEffect(() => {
    console.log("🔍 OverviewTab 렌더링:", {
      portfolio: portfolio ? "exists" : "null",
      portfolioStats: portfolioStats ? "from PaperTrading" : "none",
      storeData: storePortfolioStats ? "exists" : "none",
      totalValue: currentPortfolioData.totalValue,
      coinsCount: currentPortfolioData.coins.length,
    });
  }, [portfolio, portfolioStats, storePortfolioStats, currentPortfolioData]);

  const winRate = performance?.winRate || 0;

  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
      case 'active':
        return {
          icon: WifiIcon,
          text: '연결됨',
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          dotColor: 'bg-emerald-500'
        };
      case 'connecting':
        return {
          icon: WifiIcon,
          text: '연결 중',
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          dotColor: 'bg-amber-500 animate-pulse'
        };
      default:
        return {
          icon: WifiOffIcon,
          text: '연결 안됨',
          color: 'text-slate-400',
          bgColor: 'bg-slate-50',
          dotColor: 'bg-slate-400'
        };
    }
  };

  const connectionInfo = getConnectionStatus();
  const ConnectionIcon = connectionInfo.icon;

  return (
    <div className="space-y-6">
      {/* 🎯 상단 제목 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <BarChart3Icon className="w-6 h-6 mr-2 text-blue-600" />
            실시간 포트폴리오 현황 및 성과 분석
          </h2>
          <p className="text-slate-600 mt-1">
            현재 포트폴리오의 실시간 현황과 투자 성과를 확인하세요
          </p>
        </div>
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${connectionInfo.bgColor} ${connectionInfo.color}`}>
          <div className={`w-2 h-2 rounded-full ${connectionInfo.dotColor}`}></div>
          <ConnectionIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{connectionInfo.text}</span>
        </div>
      </div>

      {/* 🎯 주요 지표 카드들 - ✅ 스토어 데이터 사용 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 총 자산 카드 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">총 자산</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(currentPortfolioData.totalValue)}
              </p>
              <p className="text-sm text-slate-500 mt-1">초기: ₩1,840,000</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSignIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* 투자 평가액 카드 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">투자 평가액</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(currentPortfolioData.currentValue)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                원금: {formatCurrency(currentPortfolioData.totalInvestment)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <PieChartIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* 총 수익금 카드 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">총 수익금</p>
              <p className={`text-2xl font-bold ${currentPortfolioData.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                {currentPortfolioData.totalProfit >= 0 ? '+' : ''}
                {formatCurrency(currentPortfolioData.totalProfit)}
              </p>
              <div className={`text-sm mt-1 ${currentPortfolioData.portfolioProfitPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                {currentPortfolioData.portfolioProfitPercent >= 0 ? '+' : ''}
                {formatPercent(currentPortfolioData.portfolioProfitPercent)}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${currentPortfolioData.totalProfit >= 0 ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
              {currentPortfolioData.totalProfit >= 0 ? (
                <TrendingUpIcon className="w-6 h-6 text-emerald-600" />
              ) : (
                <TrendingDownIcon className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 실시간 상태 및 성과 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 연결 상태 카드 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">시스템 상태</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${connectionInfo.bgColor} ${connectionInfo.color}`}>
              {connectionInfo.text}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">거래 상태</span>
              <span className={`font-medium ${isActive ? 'text-emerald-600' : 'text-slate-500'}`}>
                {isActive ? '활성' : '비활성'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">승률</span>
              <span className="font-medium text-slate-900">
                {winRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">최근 신호</span>
              <span className="text-sm text-slate-500">
                {lastSignal ?
                  `${lastSignal.symbol} ${lastSignal.type}` :
                  '신호 대기 중...'
                }
              </span>
            </div>
          </div>
        </div>

        {/* 포트폴리오 성과 카드 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">투자 성과</h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">투자 수익률</span>
              <span className={`font-semibold ${currentPortfolioData.profitPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                {currentPortfolioData.profitPercent >= 0 ? '+' : ''}
                {formatPercent(currentPortfolioData.profitPercent)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">전체 수익률</span>
              <span className={`font-semibold ${currentPortfolioData.portfolioProfitPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                {currentPortfolioData.portfolioProfitPercent >= 0 ? '+' : ''}
                {formatPercent(currentPortfolioData.portfolioProfitPercent)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">보유 종목</span>
              <span className="font-medium text-slate-900">
                {currentPortfolioData.coins.length}개
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 보유 코인 상세 테이블 - ✅ 스토어 데이터 사용 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center">
            <CoinsIcon className="w-5 h-5 mr-2 text-slate-600" />
            보유 코인 현황
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600">종목</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">수량</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">평균단가</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">현재가치</th>
                <th className="text-right py-3 px-4 font-medium text-slate-600">수익률</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {currentPortfolioData.coins.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center">
                      <CoinsIcon className="w-12 h-12 text-slate-300 mb-4" />
                      <p className="text-lg font-medium">보유 중인 코인이 없습니다</p>
                      <p className="text-sm">거래를 시작하면 포트폴리오가 표시됩니다</p>
                    </div>
                  </td>
                </tr>
              ) : (
                currentPortfolioData.coins.map((coin, index) => (
                  <tr key={coin.symbol} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-700">
                            {coin.symbol.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {coin.symbol.toUpperCase()}
                          </div>
                          {coin.tier && (
                            <div className="text-xs text-slate-500">
                              {coin.tier}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-slate-900">
                      {coin.quantity.toFixed(8)}
                    </td>
                    <td className="py-4 px-4 text-right text-slate-900">
                      {formatCurrency(coin.avgPrice)}
                    </td>
                    <td className="py-4 px-4 text-right font-medium text-slate-900">
                      {formatCurrency(coin.value)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className={`font-semibold ${coin.profitPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                        {coin.profitPercent >= 0 ? (
                          <div className="flex items-center justify-end">
                            <TrendingUpIcon className="w-4 h-4 mr-1" />
                            +{coin.profitPercent.toFixed(2)}%
                          </div>
                        ) : (
                          <div className="flex items-center justify-end">
                            <TrendingDownIcon className="w-4 h-4 mr-1" />
                            {coin.profitPercent.toFixed(2)}%
                          </div>
                        )}
                      </div>
                      <div className={`text-sm ${coin.profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                        {coin.profit >= 0 ? '+' : ''}{formatCurrency(coin.profit)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🎯 실시간 모니터링 상태 */}
      {isActive && (
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-3 h-3 bg-emerald-400 rounded-full animate-ping"></div>
              </div>
              <div>
                <h4 className="text-lg font-semibold text-emerald-800">
                  실시간 모니터링 중
                </h4>
                <p className="text-emerald-600 text-sm">
                  선택된 코인들의 시장 상황을 실시간으로 분석하고 있습니다
                </p>
              </div>
            </div>

            {monitoringStats && (
              <div className="text-right">
                <div className="text-emerald-700 font-medium">
                  {monitoringStats.signalsToday || 0}개 신호 생성
                </div>
                <div className="text-emerald-600 text-sm">
                  {monitoringStats.lastUpdateTime || new Date().toLocaleTimeString()} 업데이트
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🎯 차트 영역 (향후 구현) */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 border-dashed">
        <div className="text-center py-12 text-slate-500">
          <LineChartIcon className="w-12 h-12 mx-auto mb-4 text-slate-300" />
          <h4 className="text-lg font-medium mb-2">차트 구현 예정</h4>
          <p className="text-sm">포트폴리오 성과 차트와 코인별 상세 분석이 추가될 예정입니다</p>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
