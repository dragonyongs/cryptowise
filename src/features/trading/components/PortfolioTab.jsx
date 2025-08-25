// src/components/features/testing/components/PortfolioTab.jsx - 변수명 중복 해결

import React, { useMemo, useEffect, useState } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { usePortfolioStore } from "../../../stores/portfolioStore";
import { PORTFOLIO_CONFIG } from "../../../config/portfolioConfig";
import { PieChartIcon, TrendingUpIcon, TrendingDownIcon, DollarSignIcon, CoinsIcon } from "lucide-react";

const PortfolioTab = ({ portfolio, totalValue }) => {
  // 🔥 동적 초기 자본 상태 관리
  const [initialCapital, setInitialCapital] = useState(0);

  // 🔥 변수명 충돌 방지: portfolioStats -> portfolioStatsFromStore
  const portfolioStatsFromStore = usePortfolioStore((state) => state.portfolioStats);

  // 🔥 초기 자본 로드 및 업데이트 감지
  useEffect(() => {
    const updateInitialCapital = () => {
      // 1. 포트폴리오 스토어에서 가져오기
      const storeInitialCapital = portfolioStatsFromStore?.initialCapital;
      if (storeInitialCapital && storeInitialCapital > 0) {
        setInitialCapital(storeInitialCapital);
        console.log("📊 포트폴리오 스토어에서 초기 자본:", storeInitialCapital.toLocaleString());
        return;
      }

      // 2. 설정에서 가져오기
      const configInitialCapital = PORTFOLIO_CONFIG.getCurrentPortfolioValue();
      if (configInitialCapital > 0) {
        setInitialCapital(configInitialCapital);
        console.log("⚙️ 설정에서 초기 자본:", configInitialCapital.toLocaleString());
        return;
      }

      // 3. 현재 총액을 초기 자본으로 설정 (최초 1회)
      const currentTotal = totalValue || portfolio?.totalValue;
      if (currentTotal && currentTotal > 0 && initialCapital === 0) {
        setInitialCapital(currentTotal);
        PORTFOLIO_CONFIG.setInitialCapital(currentTotal); // 저장
        console.log("🎯 현재 총액을 초기 자본으로 설정:", currentTotal.toLocaleString());
        return;
      }

      console.log("⏳ 초기 자본 로딩 중...");
    };

    updateInitialCapital();

    // 포트폴리오 업데이트 이벤트 리스너
    const handlePortfolioUpdate = () => {
      updateInitialCapital();
    };

    const handleCapitalUpdate = (event) => {
      const newAmount = event.detail?.amount;
      if (newAmount && newAmount > 0) {
        setInitialCapital(newAmount);
      }
    };

    window.addEventListener('portfolio-updated', handlePortfolioUpdate);
    window.addEventListener('portfolio-capital-updated', handleCapitalUpdate);

    return () => {
      window.removeEventListener('portfolio-updated', handlePortfolioUpdate);
      window.removeEventListener('portfolio-capital-updated', handleCapitalUpdate);
    };
  }, [portfolio, totalValue, portfolioStatsFromStore, initialCapital]);

  // 🔧 디버깅을 위한 로그
  useEffect(() => {
    console.log("🔍 PortfolioTab 렌더링:", {
      portfolio: portfolio ? "exists" : "null",
      totalValue,
      initialCapital: initialCapital.toLocaleString(),
      coinsType: typeof portfolio?.coins,
      coinsKeys: portfolio?.coins ? Object.keys(portfolio.coins) : [],
      positionsLength: portfolio?.positions ? portfolio.positions.length : 0,
    });
  }, [portfolio, totalValue, initialCapital]);

  // ✅ 안전한 포트폴리오 데이터 추출
  const portfolioData = useMemo(() => {
    if (!portfolio) {
      console.warn("⚠️ Portfolio가 null입니다 - 초기자본으로 초기화");
      const fallbackCash = initialCapital > 0 ? initialCapital : 3000000; // 기본값

      return {
        coins: [],
        cash: { symbol: "KRW", value: fallbackCash, percentage: 100 },
        totalValue: fallbackCash  // ✅ 초기자본 사용
      };
    }

    const safePortfolio = portfolio;
    let coinsObj = {};

    // coins 정보 추출 로직
    if (safePortfolio.coins && typeof safePortfolio.coins === 'object') {
      coinsObj = safePortfolio.coins;
      console.log("🔄 coins Object 직접 사용:", Object.keys(coinsObj).length);
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
      console.log("🔄 positions 배열을 coins Object로 변환:", Object.keys(coinsObj).length);
    } else {
      console.warn("⚠️ coins 데이터를 찾을 수 없음");
    }

    // coins 배열 처리
    const coins = Object.entries(coinsObj).map(([symbol, coin]) => {
      const quantity = Number(coin?.quantity) || 0;
      const avgPrice = Number(coin?.avgPrice) || 0;
      let currentPrice = Number(coin?.currentPrice || coin?.price) || 0;

      // 가격 업데이트 로직
      const engineUpdatedPrice = coin?.currentPrice;
      const isEngineUpdated = coin?.lastUpdated && coin?.isUpdated;

      if (isEngineUpdated && engineUpdatedPrice && engineUpdatedPrice !== avgPrice) {
        currentPrice = engineUpdatedPrice;
        console.log(`✅ [${symbol}] 엔진 업데이트된 가격 사용: ${currentPrice.toLocaleString()}`);
      } else if (window.centralDataManager) {
        const realTimePrice = window.centralDataManager.getLatestPrice(`KRW-${symbol}`);
        if (realTimePrice && realTimePrice.trade_price) {
          currentPrice = realTimePrice.trade_price;
          console.log(`📡 [${symbol}] 중앙매니저에서 실시간 가격 적용: ${currentPrice.toLocaleString()}`);
        }
      }

      if (Math.abs(currentPrice - avgPrice) < 1 && avgPrice > 0) {
        const variation = (Math.random() - 0.5) * 0.06;
        currentPrice = avgPrice * (1 + variation);
        console.log(`🎲 [${symbol}] 백업 시뮬레이션 강제 적용: ${avgPrice.toLocaleString()} → ${currentPrice.toLocaleString()} (${(variation * 100).toFixed(2)}% 변동)`);
      }

      // 수익 계산
      let profit = 0;
      let profitPercent = 0;
      if (quantity > 0 && avgPrice > 0 && currentPrice > 0) {
        if (coin?.totalProfit && Math.abs(coin.totalProfit) > 0.01) {
          profit = Number(coin.totalProfit);
          console.log(`💰 [${symbol}] 엔진에서 계산된 수익 사용: ${profit.toFixed(0)}`);
        } else {
          profit = (currentPrice - avgPrice) * quantity;
          console.log(`🔄 [${symbol}] 수익 직접 계산: ${profit.toFixed(0)}`);
        }
        profitPercent = ((currentPrice - avgPrice) / avgPrice) * 100;
      }

      const value = Math.round(quantity * currentPrice);
      const currentTotal = totalValue || safePortfolio.totalValue || 0;
      const percentage = currentTotal > 0 ? (value / currentTotal) * 100 : 0;

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

    let cashValue = safePortfolio.cashValue || safePortfolio.krw || 0;
    const coinsValue = coins.reduce((sum, coin) => sum + coin.value, 0);
    let safeTotalValue = totalValue || safePortfolio.totalValue || (cashValue + coinsValue);

    // 🔥 총액이 여전히 0이면 초기자본 사용 (최초 시작 시)
    if (safeTotalValue === 0 && initialCapital > 0) {
      safeTotalValue = initialCapital;
      cashValue = initialCapital; // 현금도 초기자본으로 설정
      console.log("🎯 포트폴리오 총액이 0이므로 초기자본으로 설정:", initialCapital.toLocaleString());
    }

    const cashData = {
      symbol: "KRW",
      value: cashValue,
      percentage: safeTotalValue > 0 ? (cashValue / safeTotalValue) * 100 : 100,
    };

    return { coins, cash: cashData, totalValue: safeTotalValue };
  }, [portfolio, totalValue, initialCapital]);

  // 🔥 변수명 충돌 방지: portfolioStats -> portfolioStatsComputed
  const portfolioStatsComputed = useMemo(() => {
    const coins = portfolioData.coins;

    const totalInvestment = coins.reduce((sum, coin) => sum + (coin.quantity * coin.avgPrice), 0);
    const currentValue = coins.reduce((sum, coin) => sum + coin.value, 0);
    const totalProfit = coins.reduce((sum, coin) => sum + coin.profit, 0);
    const profitPercent = totalInvestment > 0 ? (totalProfit / totalInvestment) * 100 : 0;

    // 🔥 동적 초기 자본 사용
    const portfolioProfitPercent = initialCapital > 0
      ? ((portfolioData.totalValue - initialCapital) / initialCapital) * 100
      : 0;

    console.log("📊 포트폴리오 통계 (동적 초기 자본 적용):", {
      투자원금: totalInvestment.toLocaleString(),
      현재평가액: currentValue.toLocaleString(),
      수익금: totalProfit.toFixed(0),
      투자수익률: profitPercent.toFixed(2) + '%',
      전체수익률: portfolioProfitPercent.toFixed(2) + '%',
      초기자본: initialCapital.toLocaleString(),
      현재총액: portfolioData.totalValue.toLocaleString(),
    });

    return {
      totalInvestment,
      currentValue,
      totalProfit,
      profitPercent,
      portfolioProfitPercent,
      initialCapital,
    };
  }, [portfolioData, initialCapital]);

  return (
    <div className="space-y-6">
      {/* 상단 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mb-2">
            <DollarSignIcon className="w-4 h-4" />
            <span className="text-sm font-medium">총 자산</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(portfolioData.totalValue)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {initialCapital > 0 ? (
              <>초기: {formatCurrency(initialCapital)}</>
            ) : (
              <>초기 자본 로딩 중...</>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mb-2">
            <CoinsIcon className="w-4 h-4" />
            <span className="text-sm font-medium">투자 금액</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(portfolioData.coins.reduce((sum, coin) => sum + coin.value, 0))}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            원금: {formatCurrency(portfolioStatsComputed.totalInvestment)}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 mb-2">
            {portfolioStatsComputed.portfolioProfitPercent >= 0 ? (
              <TrendingUpIcon className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDownIcon className="w-4 h-4 text-red-600" />
            )}
            <span className="text-sm font-medium">전체 수익률</span>
          </div>
          <div className={`text-2xl font-bold ${portfolioStatsComputed.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercent(portfolioStatsComputed.portfolioProfitPercent)}
          </div>
          <div className={`text-xs mt-1 ${portfolioStatsComputed.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {portfolioStatsComputed.totalProfit >= 0 ? '+' : ''}{formatCurrency(portfolioStatsComputed.totalProfit)}
          </div>
        </div>
      </div>

      {/* 포트폴리오 테이블 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <PieChartIcon className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              포트폴리오 구성
            </h3>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">자산</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">보유량</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">평균단가</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">현재가</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">평가금액</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">수익률</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">비중</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* 현금 행 */}
              <tr>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-green-600 dark:text-green-300">₩</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">현금 (KRW)</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">-</td>
                <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">-</td>
                <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">-</td>
                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                  {formatCurrency(portfolioData.cash.value)}
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">-</td>
                <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                  {portfolioData.cash.percentage.toFixed(1)}%
                </td>
              </tr>

              {/* 코인 행들 */}
              {portfolioData.coins.length > 0 ? (
                portfolioData.coins.map((coin) => (
                  <tr key={coin.symbol} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-300">
                            {coin.symbol.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {coin.symbol.toUpperCase()}
                          </div>
                          {coin.tier && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {coin.tier}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                      {coin.quantity.toFixed(8)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                      {formatCurrency(coin.avgPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-900 dark:text-white">
                      {formatCurrency(coin.currentPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(coin.value)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className={`text-sm font-medium ${coin.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {coin.profitPercent >= 0 ? '+' : ''}{coin.profitPercent.toFixed(2)}%
                      </div>
                      <div className={`text-xs ${coin.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({coin.profit >= 0 ? '+' : ''}{formatCurrency(coin.profit)})
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-gray-400">
                      {coin.percentage.toFixed(1)}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    거래를 시작하면 포트폴리오가 표시됩니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 차트 섹션 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          차트 구현 예정
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          포트폴리오 분포를 시각적으로 표시할 예정입니다
        </p>
      </div>
    </div>
  );
};

export default PortfolioTab;
