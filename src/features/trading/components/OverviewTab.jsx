// src/components/features/testing/components/OverviewTab.jsx - PortfolioTab과 동일한 계산
import React, { useMemo, useEffect } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
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
  isActive,
  connectionStatus,
  performance,
  lastSignal,
  totalValue
}) => {

  // 🔧 디버깅을 위한 로그 (PortfolioTab과 동일)
  useEffect(() => {
    console.log("🔍 OverviewTab 렌더링:", {
      portfolio: portfolio ? "exists" : "null",
      totalValue,
      coinsType: typeof portfolio?.coins,
      coinsKeys: portfolio?.coins ? Object.keys(portfolio.coins) : [],
      positionsLength: portfolio?.positions ? portfolio.positions.length : 0,
    });
  }, [portfolio, totalValue]);

  useEffect(() => {
    if (portfolio?.coins) {
      console.log("🔍 OverviewTab - 원본 portfolio.coins 구조:", portfolio.coins);
      Object.entries(portfolio.coins).forEach(([symbol, coin]) => {
        console.log(`🔍 OverviewTab [${symbol}] coin 데이터:`, {
          quantity: coin?.quantity,
          avgPrice: coin?.avgPrice,
          currentPrice: coin?.currentPrice || coin?.price,
          totalProfit: coin?.totalProfit,
          profitRate: coin?.profitRate,
          value: coin?.value,
        });
      });
    }
  }, [portfolio]);

  // ✅ PortfolioTab과 완전히 동일한 포트폴리오 데이터 추출 로직
  const portfolioData = useMemo(() => {
    if (!portfolio) {
      console.warn("⚠️ OverviewTab - Portfolio가 null입니다");
      return {
        coins: [],
        cash: { symbol: "KRW", value: 1840000, percentage: 100 },
        totalValue: 1840000
      };
    }

    const safePortfolio = portfolio;
    let coinsObj = {};

    // ✅ 여러 가지 데이터 소스에서 coins 정보 추출 (PortfolioTab과 동일)
    if (safePortfolio.coins && typeof safePortfolio.coins === 'object') {
      coinsObj = safePortfolio.coins;
      console.log("🔄 OverviewTab - coins Object 직접 사용:", Object.keys(coinsObj).length);
    } else if (safePortfolio.positions && Array.isArray(safePortfolio.positions)) {
      coinsObj = safePortfolio.positions.reduce((acc, pos) => {
        if (pos && pos.symbol) {
          acc[pos.symbol] = {
            symbol: pos.symbol,
            quantity: pos.quantity || 0,
            avgPrice: pos.avgPrice || 0,
            currentPrice: pos.currentPrice || pos.price || 0,
            price: pos.currentPrice || pos.price || 0,
            value: pos.currentValue || (pos.quantity * pos.currentPrice) || 0,
            profitRate: pos.profitRate || 0,
            totalProfit: pos.totalProfit || 0,
            tier: pos.tier || 'TIER3',
          };
        }
        return acc;
      }, {});
      console.log("🔄 OverviewTab - positions 배열을 coins Object로 변환:", Object.keys(coinsObj).length);
    } else {
      console.warn("⚠️ OverviewTab - coins 데이터를 찾을 수 없음");
    }

    // ✅ PortfolioTab과 완전히 동일한 coins 처리 로직
    const coins = Object.entries(coinsObj).map(([symbol, coin]) => {
      const quantity = Number(coin?.quantity) || 0;
      const avgPrice = Number(coin?.avgPrice) || 0;
      let currentPrice = Number(coin?.currentPrice || coin?.price) || 0;

      // 🎯 우선순위 1: paperTradingEngine에서 이미 업데이트된 가격 확인
      const engineUpdatedPrice = coin?.currentPrice;
      const isEngineUpdated = coin?.lastUpdated && coin?.isUpdated;

      if (isEngineUpdated && engineUpdatedPrice && engineUpdatedPrice !== avgPrice) {
        currentPrice = engineUpdatedPrice;
        console.log(`✅ OverviewTab [${symbol}] 엔진 업데이트된 가격 사용: ${currentPrice.toLocaleString()}`);
      }
      // 🎯 우선순위 2: centralDataManager에서 실시간 조회
      else if (window.centralDataManager) {
        const realTimePrice = window.centralDataManager.getLatestPrice(`KRW-${symbol}`);
        if (realTimePrice && realTimePrice.trade_price) {
          currentPrice = realTimePrice.trade_price;
          console.log(`📡 OverviewTab [${symbol}] 중앙매니저에서 실시간 가격 적용: ${currentPrice.toLocaleString()}`);
        }
      }

      // 🎯 우선순위 3: 백업 시뮬레이션 (조건 강화)
      if (Math.abs(currentPrice - avgPrice) < 1 && avgPrice > 0) {
        const variation = (Math.random() - 0.5) * 0.06; // ±3% 변동
        currentPrice = avgPrice * (1 + variation);
        console.log(`🎲 OverviewTab [${symbol}] 백업 시뮬레이션 강제 적용: ${avgPrice.toLocaleString()} → ${currentPrice.toLocaleString()} (${(variation * 100).toFixed(2)}% 변동)`);
      }

      // 🎯 PortfolioTab과 동일한 수익 계산 로직
      let profit = 0;
      let profitPercent = 0;

      if (quantity > 0 && avgPrice > 0 && currentPrice > 0) {
        // 🔧 수정: totalProfit이 0이 아닌 경우만 기존 값 사용
        if (coin?.totalProfit && Math.abs(coin.totalProfit) > 0.01) {
          profit = Number(coin.totalProfit);
          console.log(`💰 OverviewTab [${symbol}] 엔진에서 계산된 수익 사용: ${profit.toFixed(0)}`);
        } else {
          // 직접 계산
          profit = (currentPrice - avgPrice) * quantity;
          console.log(`🔄 OverviewTab [${symbol}] 수익 직접 계산: (${currentPrice.toLocaleString()} - ${avgPrice.toLocaleString()}) × ${quantity.toFixed(8)} = ${profit.toFixed(0)}`);
        }

        profitPercent = ((currentPrice - avgPrice) / avgPrice) * 100;
      }

      const value = Math.round(quantity * currentPrice);
      const currentTotal = totalValue || safePortfolio.totalValue || 1840000;
      const percentage = currentTotal > 0 ? (value / currentTotal) * 100 : 0;

      // 🔍 상세 디버깅 로그 (PortfolioTab과 동일)
      console.log(`💰 OverviewTab [${symbol}] 최종 수익 계산:`, {
        수량: quantity.toFixed(8),
        평균단가: avgPrice.toLocaleString(),
        현재가: currentPrice.toLocaleString(),
        가격차이: (currentPrice - avgPrice).toLocaleString(),
        수익금액: profit.toFixed(0) + '원',
        수익률: profitPercent.toFixed(2) + '%',
        평가금액: value.toLocaleString() + '원',
        가격변동있음: Math.abs(currentPrice - avgPrice) > 1 ? '✅' : '❌'
      });

      return {
        symbol,
        quantity,
        avgPrice,
        currentPrice,
        value,
        percentage: Math.max(0, percentage),
        profit: Math.round(profit),
        profitPercent: Number(profitPercent.toFixed(2)),
        tier: coin?.tier || 'TIER3',
      };
    });

    const cashValue = safePortfolio.cashValue || safePortfolio.krw || 0;
    const safeTotalValue = totalValue || safePortfolio.totalValue ||
      (cashValue + coins.reduce((sum, coin) => sum + coin.value, 0));

    const cashData = {
      symbol: "KRW",
      value: cashValue,
      percentage: safeTotalValue > 0 ? (cashValue / safeTotalValue) * 100 : 100,
    };

    console.log("✅ OverviewTab 최종 포트폴리오 데이터:", {
      coinsCount: coins.length,
      totalValue: safeTotalValue,
      cashValue,
      coinsValue: coins.reduce((sum, coin) => sum + coin.value, 0),
    });

    return { coins, cash: cashData, totalValue: safeTotalValue };
  }, [portfolio, totalValue]);

  // ✅ PortfolioTab과 완전히 동일한 포트폴리오 통계 계산
  const portfolioStats = useMemo(() => {
    const coins = portfolioData.coins;

    // 투자 원금 (평균단가 × 수량)
    const totalInvestment = coins.reduce((sum, coin) =>
      sum + (coin.quantity * coin.avgPrice), 0
    );

    // 현재 평가액 (현재가 × 수량)  
    const currentValue = coins.reduce((sum, coin) =>
      sum + coin.value, 0
    );

    // 총 수익금
    const totalProfit = coins.reduce((sum, coin) =>
      sum + coin.profit, 0
    );

    // 수익률 (수익금 / 투자원금)
    const profitPercent = totalInvestment > 0 ?
      (totalProfit / totalInvestment) * 100 : 0;

    // 전체 포트폴리오 수익률 (현금 포함) - PortfolioTab과 동일
    const portfolioProfitPercent = ((portfolioData.totalValue - 1840000) / 1840000) * 100;

    console.log("📊 OverviewTab 포트폴리오 통계:", {
      투자원금: totalInvestment.toLocaleString(),
      현재평가액: currentValue.toLocaleString(),
      수익금: totalProfit.toFixed(0),
      투자수익률: profitPercent.toFixed(2) + '%',
      전체수익률: portfolioProfitPercent.toFixed(2) + '%'
    });

    return {
      totalInvestment,
      currentValue,
      totalProfit,
      profitPercent,
      portfolioProfitPercent
    };
  }, [portfolioData]);

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
      {/* 🎯 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <BarChart3Icon className="w-6 h-6 mr-2 text-blue-600" />
            대시보드 개요
          </h2>
          <p className="text-slate-500 text-sm mt-1">실시간 포트폴리오 현황 및 성과 분석</p>
        </div>

        {isActive && (
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-600 font-medium">실시간 업데이트</span>
          </div>
        )}
      </div>

      {/* 🎯 주요 지표 카드들 - PortfolioTab과 동일한 계산값 사용 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 총 자산 카드 */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <DollarSignIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(portfolioData.totalValue)}
              </p>
              <p className="text-xs text-slate-500">초기: ₩1,840,000</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">현재 잔고</span>
              <span className="text-sm font-medium">{formatCurrency(portfolioData.cash.value)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">총 수익률</span>
              <span className={`text-sm font-bold flex items-center ${portfolioStats.portfolioProfitPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                {portfolioStats.portfolioProfitPercent >= 0 ? (
                  <TrendingUpIcon className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDownIcon className="w-4 h-4 mr-1" />
                )}
                {formatPercent(portfolioStats.portfolioProfitPercent)}
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
                {formatCurrency(portfolioStats.currentValue)}
              </p>
              <p className="text-xs text-slate-500">투자 평가액</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">투자 원금</span>
              <span className="text-sm font-medium">{formatCurrency(portfolioStats.totalInvestment)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">투자 수익률</span>
              <span className={`text-sm font-bold ${portfolioStats.profitPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                {formatPercent(portfolioStats.profitPercent)}
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
              <p className={`text-2xl font-bold ${portfolioStats.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                {portfolioStats.totalProfit >= 0 ? '+' : ''}{formatCurrency(portfolioStats.totalProfit)}
              </p>
              <p className="text-xs text-slate-500">총 수익금</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">보유 종목</span>
              <span className="text-sm font-medium">{portfolioData.coins.length}개</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">평균 수익</span>
              <span className="text-sm font-medium">
                {portfolioData.coins.length > 0 ?
                  formatCurrency(portfolioStats.totalProfit / portfolioData.coins.length) :
                  formatCurrency(0)
                }
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
                <div className={`w-2 h-2 rounded-full ${connectionInfo.dotColor}`}></div>
                <p className={`text-lg font-semibold ${connectionInfo.color}`}>
                  {connectionInfo.text}
                </p>
              </div>
              <p className="text-xs text-slate-500">승률: {winRate.toFixed(1)}%</p>
            </div>
          </div>

          <div className="space-y-2">
            {lastSignal ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">최신 신호</span>
                  <span className="text-sm font-medium">{lastSignal.symbol} {lastSignal.type}</span>
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
              <span>보유 종목: {portfolioData.coins.length}개</span>
              <span>총 평가액: {formatCurrency(portfolioStats.currentValue)}</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left py-3 px-6 text-sm font-semibold text-slate-700">종목</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">수량</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">평균단가</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">현재가치</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">수익률</th>
              </tr>
            </thead>
            <tbody>
              {portfolioData.coins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <InfoIcon className="w-12 h-12 text-slate-300" />
                      <div>
                        <p className="text-slate-500 font-medium">보유 중인 코인이 없습니다</p>
                        <p className="text-slate-400 text-sm mt-1">거래를 시작하면 포트폴리오가 표시됩니다</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                portfolioData.coins.map((coin, index) => (
                  <tr key={coin.symbol} className={`hover:bg-slate-50 transition-colors ${index !== portfolioData.coins.length - 1 ? 'border-b border-slate-100' : ''
                    }`}>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-sm">
                            {coin.symbol.charAt(0)}
                          </span>
                        </div>
                        <span className="font-semibold text-slate-900">{coin.symbol.toUpperCase()}</span>
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
                      <span className={`text-sm font-bold flex items-center justify-end ${coin.profitPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
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
      {portfolioData.coins.length > 0 && (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatPercent(portfolioStats.portfolioProfitPercent)}
              </div>
              <div className="text-sm text-slate-600">전체 포트폴리오 수익률</div>
              <div className="text-xs text-slate-500 mt-1">
                (초기자본 {formatCurrency(1840000)} 대비)
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatPercent(portfolioStats.profitPercent)}
              </div>
              <div className="text-sm text-slate-600">투자 종목 수익률</div>
              <div className="text-xs text-slate-500 mt-1">
                (투자원금 대비 코인 수익률)
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {formatPercent(portfolioData.cash.percentage)}
              </div>
              <div className="text-sm text-slate-600">현금 보유 비중</div>
              <div className="text-xs text-slate-500 mt-1">
                ({formatCurrency(portfolioData.cash.value)})
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OverviewTab;
