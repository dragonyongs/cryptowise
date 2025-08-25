// src/components/features/testing/components/OverviewTab.jsx
import React, { useMemo, useEffect } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { usePortfolioStore } from "../../../stores/portfolioStore";

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
  isActive,
  connectionStatus,
  performance,
  lastSignal,
}) => {
  // ✅ Store에서 직접 데이터 가져오기
  const { portfolioData, portfolioStats } = usePortfolioStore();

  // ✅ Store 데이터 안전성 체크
  const safePortfolioData = useMemo(() => {
    return (
      portfolioData || {
        coins: [],
        cash: { symbol: "KRW", value: 0, percentage: 100 },
        totalValue: 0,
      }
    );
  }, [portfolioData]);

  const safePortfolioStats = useMemo(() => {
    return (
      portfolioStats || {
        totalInvestment: 0,
        currentValue: 0,
        totalProfit: 0,
        profitPercent: 0,
        portfolioProfitPercent: 0,
        initialCapital: 0,
      }
    );
  }, [portfolioStats]);

  // ✅ Store 상태 디버깅 (개발 모드)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("🔍 OverviewTab Store 연결:", {
        hasPortfolioData: !!portfolioData,
        hasPortfolioStats: !!portfolioStats,
        totalValue: safePortfolioData.totalValue,
        coinsCount: safePortfolioData.coins?.length || 0,
        storeData: { portfolioData, portfolioStats },
      });
    }
  }, [portfolioData, portfolioStats, safePortfolioData]);

  const winRate = performance?.winRate || 0;

  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case "connected":
      case "active":
        return {
          icon: WifiIcon,
          text: "연결됨",
          color: "text-emerald-600",
          bgColor: "bg-emerald-50",
          dotColor: "bg-emerald-500",
        };
      case "connecting":
        return {
          icon: WifiIcon,
          text: "연결 중",
          color: "text-amber-600",
          bgColor: "bg-amber-50",
          dotColor: "bg-amber-500 animate-pulse",
        };
      default:
        return {
          icon: WifiOffIcon,
          text: "연결 안됨",
          color: "text-slate-400",
          bgColor: "bg-slate-50",
          dotColor: "bg-slate-400",
        };
    }
  };

  const connectionInfo = getConnectionStatus();
  const ConnectionIcon = connectionInfo.icon;

  return (
    <div className="space-y-6">
      {/* 🎯 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <BarChart3Icon className="w-6 h-6 mr-2 text-blue-600" />
            대시보드 개요
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            실시간 포트폴리오 현황 및 성과 분석
          </p>
        </div>

        {isActive && (
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-600 font-medium">실시간 업데이트</span>
          </div>
        )}
      </div>

      {/* 🎯 주요 지표 카드들 - Store 데이터 직접 사용 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 총 자산 카드 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSignIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(safePortfolioData.totalValue)}
              </p>
              <p className="text-xs text-slate-500">
                초기:{" "}
                {formatCurrency(safePortfolioStats.initialCapital || 1840000)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">현재 잔고</span>
              <span className="text-sm font-medium">
                {formatCurrency(safePortfolioStats.currentValue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">총 수익률</span>
              <span
                className={`text-sm font-bold flex items-center ${safePortfolioStats.totalProfit >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                  }`}
              >
                {safePortfolioStats.totalProfit >= 0 ? (
                  <TrendingUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDownIcon className="w-4 h-4 mr-1" />
                )}
                {formatCurrency(safePortfolioStats.totalProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* 투자 성과 카드 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CoinsIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(safePortfolioStats.currentValue)}
              </p>
              <p className="text-xs text-slate-500">투자 평가액</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">투자 원금</span>
              <span className="text-sm font-medium">
                {formatCurrency(safePortfolioStats.totalInvestment)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">투자 수익률</span>
              <span
                className={`text-sm font-bold ${safePortfolioStats.profitPercent >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                  }`}
              >
                {formatPercent(safePortfolioStats.profitPercent)}
              </span>
            </div>
          </div>
        </div>

        {/* 수익금 카드 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ZapIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <p
                className={`text-2xl font-bold ${safePortfolioStats.totalProfit >= 0
                    ? "text-emerald-600"
                    : "text-red-600"
                  }`}
              >
                {safePortfolioStats.totalProfit >= 0 ? "+" : ""}
                {formatCurrency(safePortfolioStats.totalProfit)}
              </p>
              <p className="text-xs text-slate-500">총 수익금</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">보유 종목</span>
              <span className="text-sm font-medium">
                {safePortfolioData.coins.length}개
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">평균 수익</span>
              <span className="text-sm font-medium">
                {safePortfolioData.coins.length > 0
                  ? formatCurrency(
                    safePortfolioStats.totalProfit /
                    safePortfolioData.coins.length
                  )
                  : formatCurrency(0)}
              </span>
            </div>
          </div>
        </div>

        {/* 연결 상태 및 신호 카드 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className={`p-3 rounded-lg ${connectionInfo.bgColor}`}>
              <ConnectionIcon className={`w-6 h-6 ${connectionInfo.color}`} />
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${connectionInfo.dotColor}`}
                ></div>
                <p className={`text-lg font-semibold ${connectionInfo.color}`}>
                  {connectionInfo.text}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                승률: {winRate.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {lastSignal ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">최신 신호</span>
                  <span className="text-sm font-medium">
                    {lastSignal.symbol} {lastSignal.type}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">신호 점수</span>
                  <span className="text-sm font-bold text-blue-600">
                    {(lastSignal.totalScore || 0).toFixed(1)}점
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center py-2">
                <ClockIcon className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                <p className="text-sm text-slate-500">신호 대기 중...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🎯 포트폴리오 보유 현황 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center">
              <PieChartIcon className="w-5 h-5 mr-2 text-slate-600" />
              포트폴리오 보유 현황
            </h3>
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <span>보유 종목: {safePortfolioData.coins.length}개</span>
              <span>
                총 평가액: {formatCurrency(safePortfolioStats.currentValue)}
              </span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-semibold text-slate-700">
                  종목
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  수량
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  평균단가
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  현재가치
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">
                  수익률
                </th>
              </tr>
            </thead>
            <tbody>
              {safePortfolioData.coins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <InfoIcon className="w-12 h-12 text-slate-300" />
                      <div>
                        <p className="text-slate-500 font-medium">
                          보유 중인 코인이 없습니다
                        </p>
                        <p className="text-slate-400 text-sm mt-1">
                          거래를 시작하면 포트폴리오가 표시됩니다
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                safePortfolioData.coins.map((coin, index) => (
                  <tr
                    key={coin.symbol}
                    className={`hover:bg-slate-50 transition-colors ${index !== safePortfolioData.coins.length - 1
                        ? "border-b border-slate-100"
                        : ""
                      }`}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-sm">
                            {coin.symbol.charAt(0)}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-900">
                          {coin.symbol.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-mono">
                      {coin.quantity.toFixed(8)}
                    </td>
                    <td className="py-4 px-4 text-right text-sm">
                      {formatCurrency(coin.avgPrice)}
                    </td>
                    <td className="py-4 px-4 text-right text-sm font-semibold">
                      {formatCurrency(coin.value)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span
                        className={`text-sm font-bold flex items-center justify-end ${coin.profitPercent >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                          }`}
                      >
                        {coin.profitPercent >= 0 ? (
                          <TrendingUpIcon className="w-4 h-4 mr-1" />
                        ) : (
                          <TrendingDownIcon className="w-4 h-4 mr-1" />
                        )}
                        {formatPercent(coin.profitPercent)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🎯 추가 상태 정보 */}
      {safePortfolioData.coins.length > 0 && (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatPercent(safePortfolioStats.portfolioProfitPercent)}
              </div>
              <div className="text-sm text-slate-600">
                전체 포트폴리오 수익률
              </div>
              <div className="text-xs text-slate-500 mt-1">
                (초기자본{" "}
                {formatCurrency(safePortfolioStats.initialCapital || 1840000)}{" "}
                대비)
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatPercent(safePortfolioStats.profitPercent)}
              </div>
              <div className="text-sm text-slate-600">투자 종목 수익률</div>
              <div className="text-xs text-slate-500 mt-1">
                (투자원금 대비 코인 수익률)
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatPercent(safePortfolioData.cash.percentage)}
              </div>
              <div className="text-sm text-slate-600">현금 보유 비중</div>
              <div className="text-xs text-slate-500 mt-1">
                ({formatCurrency(safePortfolioData.cash.value)})
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewTab;
