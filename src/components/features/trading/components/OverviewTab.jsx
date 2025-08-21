// src/components/features/testing/components/OverviewTab.jsx - 모던 디자인

import React from "react";
import { formatCurrency, formatPercent } from "../../../../utils/formatters";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  DollarSignIcon,
  PieChartIcon,
  ActivityIcon,
  WifiIcon,
  WifiOffIcon,
  ShieldCheckIcon,
  ClockIcon
} from "lucide-react";

const OverviewTab = ({
  portfolio,
  isActive,
  connectionStatus,
  performance,
  lastSignal
}) => {
  // 안전한 데이터 처리
  const safePortfolio = portfolio || {};
  const safePerformance = performance || safePortfolio.performance || {};
  const totalValue = safePortfolio.totalValue || 1840000;
  const krwBalance = safePortfolio.krw || 0;
  const totalReturn = safePerformance.totalReturn || 0;
  const winRate = safePerformance.winRate || 0;

  const getConnectionStatus = () => {
    switch (connectionStatus) {
      case 'connected':
      case 'active':
        return { icon: WifiIcon, text: '연결됨', color: 'text-emerald-600' };
      case 'connecting':
        return { icon: WifiIcon, text: '연결 중', color: 'text-amber-600' };
      default:
        return { icon: WifiOffIcon, text: '연결 안됨', color: 'text-slate-400' };
    }
  };

  const connectionInfo = getConnectionStatus();
  const ConnectionIcon = connectionInfo.icon;

  return (
    <div className="space-y-6">
      {/* 상단 주요 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">총 자산</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(totalValue)}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                (초기자본: ₩1,840,000)
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSignIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">현재 잔고</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(krwBalance)}
              </p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <PieChartIcon className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">총 수익률</p>
              <p className={`text-2xl font-bold ${totalReturn >= 0 ? "text-emerald-600" : "text-red-600"
                }`}>
                {formatPercent(totalReturn)}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${totalReturn >= 0 ? "bg-emerald-100" : "bg-red-100"
              }`}>
              {totalReturn >= 0 ? (
                <TrendingUpIcon className="w-6 h-6 text-emerald-600" />
              ) : (
                <TrendingDownIcon className="w-6 h-6 text-red-600" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 포트폴리오 현황 */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
          <PieChartIcon className="w-5 h-5 mr-2" />
          포트폴리오 현황
        </h3>

        {safePortfolio.coins && Object.keys(safePortfolio.coins).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 text-slate-600">종목</th>
                  <th className="text-right py-2 text-slate-600">수량</th>
                  <th className="text-right py-2 text-slate-600">평균단가</th>
                  <th className="text-right py-2 text-slate-600">현재가치</th>
                  <th className="text-right py-2 text-slate-600">수익률</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(safePortfolio.coins).map(([symbol, coin]) => {
                  const profitRate = coin.profitRate || 0;
                  return (
                    <tr key={symbol} className="border-b border-slate-100">
                      <td className="py-3">
                        <div className="flex items-center">
                          <span className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-semibold mr-2">
                            {symbol.charAt(0)}
                          </span>
                          {symbol}
                        </div>
                      </td>
                      <td className="py-3 text-right">{(coin.quantity || 0).toFixed(8)}</td>
                      <td className="py-3 text-right">{formatCurrency(coin.avgPrice || 0)}</td>
                      <td className="py-3 text-right">{formatCurrency(coin.currentValue || 0)}</td>
                      <td className={`py-3 text-right font-medium ${profitRate >= 0 ? "text-emerald-600" : "text-red-600"
                        }`}>
                        {formatPercent(profitRate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PieChartIcon className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">보유 중인 코인이 없습니다</p>
            <p className="text-sm text-slate-400 mt-1">거래를 시작하면 포트폴리오가 표시됩니다</p>
          </div>
        )}
      </div>

      {/* 시스템 상태 및 최신 신호 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 시스템 상태 */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <ShieldCheckIcon className="w-5 h-5 mr-2" />
            시스템 상태
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">연결 상태</span>
              <div className="flex items-center space-x-2">
                <ConnectionIcon className={`w-4 h-4 ${connectionInfo.color}`} />
                <span className={`text-sm font-medium ${connectionInfo.color}`}>
                  {connectionInfo.text}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">거래 상태</span>
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${isActive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
                }`}>
                {isActive ? '활성' : '비활성'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">승률</span>
              <span className="text-sm font-medium">{winRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* 최신 신호 */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center">
            <ActivityIcon className="w-5 h-5 mr-2" />
            최신 신호
          </h3>
          {lastSignal ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">종목</span>
                <span className="font-medium">{lastSignal.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">신호</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${lastSignal.type === 'BUY'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-red-100 text-red-800'
                  }`}>
                  {lastSignal.type}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">사유</span>
                <span className="text-sm text-right max-w-32 truncate">
                  {lastSignal.reason}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">가격</span>
                <span className="font-medium">{formatCurrency(lastSignal.price)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">시간</span>
                <div className="flex items-center space-x-1">
                  <ClockIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm">
                    {new Date(lastSignal.timestamp || lastSignal.generatedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <ActivityIcon className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">신호를 기다리는 중...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
