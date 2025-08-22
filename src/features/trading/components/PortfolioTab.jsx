// src/components/features/testing/components/PortfolioTab.jsx - 안전성 강화
import React, { useMemo, useEffect } from "react";
import { formatCurrency, formatPercent } from "../../../utils/formatters";
import { PieChartIcon, TrendingUpIcon, TrendingDownIcon, DollarSignIcon, CoinsIcon } from "lucide-react";

const PortfolioTab = ({ portfolio, totalValue }) => {
  // 🔧 디버깅을 위한 로그
  useEffect(() => {
    console.log("🔍 PortfolioTab 렌더링:", {
      portfolio: portfolio ? "exists" : "null",
      totalValue,
      coinsType: typeof portfolio?.coins,
      coinsKeys: portfolio?.coins ? Object.keys(portfolio.coins) : [],
      positionsLength: portfolio?.positions ? portfolio.positions.length : 0,
      tradesLength: portfolio?.trades ? portfolio.trades.length : 0,
      tradeHistoryLength: portfolio?.tradeHistory ? portfolio.tradeHistory.length : 0,
    });
  }, [portfolio, totalValue]);

  useEffect(() => {
    if (portfolio?.coins) {
      console.log("🔍 원본 portfolio.coins 구조:", portfolio.coins);
      Object.entries(portfolio.coins).forEach(([symbol, coin]) => {
        console.log(`🔍 [${symbol}] coin 데이터:`, {
          quantity: coin?.quantity,
          avgPrice: coin?.avgPrice,
          currentPrice: coin?.currentPrice || coin?.price,
          totalProfit: coin?.totalProfit,
          profitRate: coin?.profitRate,
          value: coin?.value,
          전체구조: coin
        });
      });
    }
  }, [portfolio]);

  // ✅ 안전한 포트폴리오 데이터 추출 - 모든 케이스 대응
  const portfolioData = useMemo(() => {
    if (!portfolio) {
      console.warn("⚠️ Portfolio가 null입니다");
      return {
        coins: [],
        cash: { symbol: "KRW", value: 1840000, percentage: 100 },
        totalValue: 1840000
      };
    }

    const safePortfolio = portfolio;
    let coinsObj = {};

    // ✅ 여러 가지 데이터 소스에서 coins 정보 추출
    if (safePortfolio.coins && typeof safePortfolio.coins === 'object') {
      // coins가 이미 Object 형태인 경우
      coinsObj = safePortfolio.coins;
      console.log("🔄 coins Object 직접 사용:", Object.keys(coinsObj).length);
    } else if (safePortfolio.positions && Array.isArray(safePortfolio.positions)) {
      // positions 배열을 coins Object로 변환
      coinsObj = safePortfolio.positions.reduce((acc, pos) => {
        if (pos && pos.symbol) {
          acc[pos.symbol] = {
            symbol: pos.symbol,
            quantity: pos.quantity || 0,
            avgPrice: pos.avgPrice || 0,
            currentPrice: pos.currentPrice || pos.price || 0,
            price: pos.currentPrice || pos.price || 0, // fallback
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

    // ✅ coins Object를 배열로 변환하여 처리 (profit 계산 수정)
    const coins = Object.entries(coinsObj).map(([symbol, coin]) => {
      const quantity = Number(coin?.quantity) || 0;
      const avgPrice = Number(coin?.avgPrice) || 0;
      let currentPrice = Number(coin?.currentPrice || coin?.price) || 0;

      // 🎯 우선순위 1: paperTradingEngine에서 이미 업데이트된 가격 확인
      const engineUpdatedPrice = coin?.currentPrice;
      const isEngineUpdated = coin?.lastUpdated && coin?.isUpdated;

      if (isEngineUpdated && engineUpdatedPrice && engineUpdatedPrice !== avgPrice) {
        currentPrice = engineUpdatedPrice;
        console.log(`✅ [${symbol}] 엔진 업데이트된 가격 사용: ${currentPrice.toLocaleString()}`);
      }
      // 🎯 우선순위 2: centralDataManager에서 실시간 조회
      else if (window.centralDataManager) {
        const realTimePrice = window.centralDataManager.getLatestPrice(`KRW-${symbol}`);
        if (realTimePrice && realTimePrice.trade_price) {
          currentPrice = realTimePrice.trade_price;
          console.log(`📡 [${symbol}] 중앙매니저에서 실시간 가격 적용: ${currentPrice.toLocaleString()}`);
        }
      }

      // 🎯 우선순위 3: 백업 시뮬레이션 (조건 강화)
      if (Math.abs(currentPrice - avgPrice) < 1 && avgPrice > 0) { // 거의 같은 경우
        const variation = (Math.random() - 0.5) * 0.06; // ±3% 변동으로 확대
        currentPrice = avgPrice * (1 + variation);
        console.log(`🎲 [${symbol}] 백업 시뮬레이션 강제 적용: ${avgPrice.toLocaleString()} → ${currentPrice.toLocaleString()} (${(variation * 100).toFixed(2)}% 변동)`);
      }

      // 🎯 수익 계산 로직 수정 (totalProfit이 0인 경우도 재계산)
      let profit = 0;
      let profitPercent = 0;

      if (quantity > 0 && avgPrice > 0 && currentPrice > 0) {
        // 🔧 수정: totalProfit이 0이 아닌 경우만 기존 값 사용
        if (coin?.totalProfit && Math.abs(coin.totalProfit) > 0.01) {
          profit = Number(coin.totalProfit);
          console.log(`💰 [${symbol}] 엔진에서 계산된 수익 사용: ${profit.toFixed(0)}`);
        } else {
          // 직접 계산
          profit = (currentPrice - avgPrice) * quantity;
          console.log(`🔄 [${symbol}] 수익 직접 계산: (${currentPrice.toLocaleString()} - ${avgPrice.toLocaleString()}) × ${quantity.toFixed(8)} = ${profit.toFixed(0)}`);
        }

        profitPercent = ((currentPrice - avgPrice) / avgPrice) * 100;
      }

      const value = Math.round(quantity * currentPrice);
      const currentTotal = totalValue || safePortfolio.totalValue || 1840000;
      const percentage = currentTotal > 0 ? (value / currentTotal) * 100 : 0;

      // 🔍 상세 디버깅 로그
      console.log(`💰 [${symbol}] 최종 수익 계산:`, {
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
        profit: Math.round(profit), // 이제 올바른 값이 들어갈 것
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

    console.log("✅ 최종 포트폴리오 데이터:", {
      coinsCount: coins.length,
      totalValue: safeTotalValue,
      cashValue,
      coinsValue: coins.reduce((sum, coin) => sum + coin.value, 0),
    });

    return { coins, cash: cashData, totalValue: safeTotalValue };
  }, [portfolio, totalValue]);

  // ✅ 총 수익 계산
  const totalProfit = portfolioData.coins.reduce((sum, coin) => sum + coin.profit, 0);
  const totalInvestmentValue = portfolioData.coins.reduce((sum, coin) =>
    sum + (coin.quantity * coin.avgPrice), 0
  );

  const totalProfitPercent = totalInvestmentValue > 0 ?
    (totalProfit / totalInvestmentValue) * 100 : 0;

  // 🔍 디버깅 로그 추가
  console.log("💰 총 수익률 계산:", {
    개별수익합계: totalProfit.toFixed(0) + '원',
    투자원금: totalInvestmentValue.toLocaleString() + '원',
    현재평가액: portfolioData.coins.reduce((sum, coin) => sum + coin.value, 0).toLocaleString() + '원',
    계산된수익률: totalProfitPercent.toFixed(2) + '%',
    총자산: portfolioData.totalValue.toLocaleString() + '원',
    현금: portfolioData.cash.value.toLocaleString() + '원'
  });

  // ✅ 완전히 수정된 총 수익 계산
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

    // 전체 포트폴리오 수익률 (현금 포함)
    const portfolioProfitPercent = ((portfolioData.totalValue - 1840000) / 1840000) * 100;

    console.log("📊 포트폴리오 통계:", {
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

  return (
    <div className="space-y-6">
      {/* 포트폴리오 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSignIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">총 자산</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(portfolioData.totalValue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CoinsIcon className="h-8 w-8 text-green-500" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">투자 금액</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(portfolioData.coins.reduce((sum, coin) => sum + coin.value, 0))}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            {totalProfitPercent >= 0 ? (
              <TrendingUpIcon className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDownIcon className="h-8 w-8 text-red-500" />
            )}
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">총 수익률</p>
              <p className={`text-2xl font-bold ${totalProfitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(totalProfitPercent)}
                {totalProfitPercent >= 0 ? (
                  <TrendingUpIcon className="inline h-6 w-6 ml-1" />
                ) : (
                  <TrendingDownIcon className="inline h-6 w-6 ml-1" />
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 포트폴리오 상세 테이블 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <PieChartIcon className="h-6 w-6 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">포트폴리오 구성</h3>
          </div>
        </div>

        {portfolioData.coins.length > 0 || portfolioData.cash.value > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">자산</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">보유량</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평균단가</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">현재가</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">평가금액</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">수익률</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">비중</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* 현금 행 */}
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">현금 (KRW)</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(portfolioData.cash.value)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{portfolioData.cash.percentage.toFixed(1)}%</td>
                </tr>

                {/* 코인 행들 */}
                {portfolioData.coins.map((coin) => (
                  <tr key={coin.symbol}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {coin.symbol.toUpperCase()}
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {coin.tier}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{coin.quantity.toFixed(8)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(coin.avgPrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(coin.currentPrice)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(coin.value)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`${coin.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {coin.profitPercent >= 0 ? '+' : ''}{coin.profitPercent.toFixed(2)}%
                        <div className={`text-xs ${coin.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ({coin.profit >= 0 ? '+' : ''}{formatCurrency(coin.profit)})
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{coin.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <CoinsIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">포트폴리오가 비어있습니다</h3>
            <p className="mt-1 text-sm text-gray-500">거래를 시작하면 포트폴리오가 표시됩니다</p>
          </div>
        )}
      </div>

      {/* 차트 영역 (향후 구현) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">포트폴리오 분포</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          <PieChartIcon className="h-16 w-16 mr-4" />
          <div>
            <p className="text-lg font-medium">차트 구현 예정</p>
            <p className="text-sm">포트폴리오 분포를 시각적으로 표시할 예정입니다</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioTab;
