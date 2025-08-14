import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useBacktestStore = create(
  persist(
    (set, get) => ({
      // 상태
      backtestResults: null,
      isLoading: false,
      error: null,
      backtestHistory: [],

      // 백테스팅 실행
      runBacktest: async (config) => {
        set({ isLoading: true, error: null });

        try {
          // 실제로는 백엔드 API 호출
          // const results = await fetchBacktestResults(config);

          // 현재는 시뮬레이션
          await new Promise((resolve) => setTimeout(resolve, 3000));

          const results = await simulateBacktest(config);

          set({
            backtestResults: results,
            isLoading: false,
            backtestHistory: [
              {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                config,
                results,
              },
              ...get().backtestHistory,
            ].slice(0, 10), // 최대 10개 이력 보관
          });

          return results;
        } catch (error) {
          set({
            error: error.message || "백테스팅 실행 중 오류가 발생했습니다",
            isLoading: false,
          });
          throw error;
        }
      },

      // 결과 초기화
      clearResults: () => {
        set({ backtestResults: null, error: null });
      },

      // 에러 초기화
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "cryptowise-backtest-store",
      partialize: (state) => ({
        backtestHistory: state.backtestHistory,
      }),
      version: 1,
    }
  )
);

// ✅ 백테스팅 시뮬레이션 함수
async function simulateBacktest(config) {
  const { coins, startDate, endDate, initialAmount, strategy } = config;

  // 기간 계산
  const start = new Date(startDate);
  const end = new Date(endDate);
  const monthsCount =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  // 코인별 성과 시뮬레이션
  const coinPerformance = coins.map((coin) => {
    const baseReturn = coin.analysis?.score
      ? (coin.analysis.score - 5) * 5
      : Math.random() * 20 - 10;
    const volatility = Math.random() * 15 + 5;

    return {
      symbol: coin.symbol,
      market: coin.market,
      return: baseReturn + (Math.random() - 0.5) * volatility,
      weight: 1 / coins.length,
    };
  });

  // 포트폴리오 전체 수익률 계산
  const totalReturn = coinPerformance.reduce(
    (sum, coin) => sum + coin.return * coin.weight,
    0
  );

  // 성과 지표 계산
  const winRate = Math.min(95, Math.max(45, 60 + totalReturn * 2));
  const maxDrawdown = Math.min(-5, -Math.abs(totalReturn) * 0.4);
  const sharpeRatio = Math.max(0.5, Math.min(3.0, 1.0 + totalReturn * 0.05));

  // 차트 데이터 생성
  const chartData = [];
  let currentValue = initialAmount;

  for (let i = 0; i <= monthsCount; i++) {
    const date = new Date(start);
    date.setMonth(date.getMonth() + i);

    const monthlyReturn =
      totalReturn / monthsCount + (Math.random() - 0.5) * 10;
    currentValue *= 1 + monthlyReturn / 100;

    // 벤치마크 (시장 평균 수익률 가정)
    const benchmarkReturn = 0.8; // 월 0.8% 가정
    const benchmarkValue =
      initialAmount * Math.pow(1 + benchmarkReturn / 100, i);

    chartData.push({
      date: date.toISOString().slice(0, 7),
      value: Math.round(currentValue),
      benchmark: Math.round(benchmarkValue),
    });
  }

  // 거래 내역 시뮬레이션
  const trades = [];
  const tradeCount = Math.round(monthsCount * coins.length * 0.8);

  for (let i = 0; i < Math.min(tradeCount, 20); i++) {
    const coin = coins[Math.floor(Math.random() * coins.length)];
    const tradeDate = new Date(start);
    tradeDate.setDate(
      tradeDate.getDate() +
        (Math.random() * (end - start)) / (24 * 60 * 60 * 1000)
    );

    const isProfit = Math.random() < winRate / 100;
    const action = Math.random() > 0.5 ? "BUY" : "SELL";
    const price = coin.current_price * (1 + (Math.random() - 0.5) * 0.2);
    const quantity = (initialAmount * 0.1) / price;

    trades.push({
      date: tradeDate.toISOString().slice(0, 10),
      symbol: coin.symbol,
      action,
      price: Math.round(price),
      quantity: parseFloat(quantity.toFixed(8)),
      total: Math.round(price * quantity),
      profit:
        action === "SELL"
          ? Math.round(price * quantity * (isProfit ? 0.1 : -0.05))
          : null,
      reason: getTradeReason(coin, action),
    });
  }

  return {
    performance: {
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      annualizedReturn: parseFloat(
        ((totalReturn * 12) / monthsCount).toFixed(2)
      ),
      winRate: parseFloat(winRate.toFixed(1)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      totalTrades: tradeCount,
      profitFactor: parseFloat((2.0 + totalReturn * 0.05).toFixed(2)),
    },
    portfolio: {
      initialAmount,
      finalAmount: Math.round(currentValue),
      bestMonth: { month: "2024-03", return: 15.2 },
      worstMonth: { month: "2024-05", return: -8.1 },
    },
    chartData,
    trades: trades.sort((a, b) => new Date(b.date) - new Date(a.date)),
    coinPerformance,
    config,
  };
}

// 거래 이유 생성
function getTradeReason(coin, action) {
  const reasons = {
    BUY: [
      "RSI 과매도 + MACD 골든크로스",
      "지지선 반등 + 거래량 증가",
      "AI 분석 점수 상승",
      "볼린저밴드 하단 터치",
      "시장 모멘텀 전환 신호",
    ],
    SELL: [
      "목표 수익률 달성",
      "저항선 도달",
      "RSI 과매수 신호",
      "손절 라인 터치",
      "시장 리스크 증가",
    ],
  };

  const reasonList = reasons[action] || reasons.BUY;
  return reasonList[Math.floor(Math.random() * reasonList.length)];
}
