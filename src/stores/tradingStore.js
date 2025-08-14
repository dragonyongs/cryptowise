import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useTradingStore = create(
  persist(
    (set, get) => ({
      // 상태
      tradingSession: null,
      tradingStatus: "stopped", // stopped, running, paused
      positions: [],
      recentTrades: [],
      realTimeUpdates: [],
      alerts: [],
      isLoading: false,
      error: null,

      // 자동매매 시작
      startTrading: async (config) => {
        const state = get();

        if (state.isLoading) return;

        set({ isLoading: true, error: null });

        try {
          // 실제로는 백엔드 API 호출
          await new Promise((resolve) => setTimeout(resolve, 2000));

          const session = await initializeTradingSession(config);

          set({
            tradingSession: session,
            tradingStatus: "running",
            positions: session.initialPositions || [],
            isLoading: false,
          });

          // 실시간 업데이트 시작
          startRealTimeUpdates();
        } catch (error) {
          set({
            error: error.message || "자동매매 시작 중 오류가 발생했습니다",
            isLoading: false,
          });
        }
      },

      // 자동매매 일시중지
      pauseTrading: () => {
        set({ tradingStatus: "paused" });
        stopRealTimeUpdates();
      },

      // 자동매매 중지
      stopTrading: () => {
        set({
          tradingStatus: "stopped",
          realTimeUpdates: [],
        });
        stopRealTimeUpdates();
      },

      // 포지션 업데이트
      updatePositions: async () => {
        const session = get().tradingSession;
        if (!session) return;

        try {
          // 실제로는 현재 코인 가격으로 포지션 업데이트
          const updatedPositions = await updatePositionValues(get().positions);
          set({ positions: updatedPositions });
        } catch (error) {
          console.error("포지션 업데이트 실패:", error);
        }
      },

      // 거래 추가
      addTrade: (trade) => {
        set((state) => ({
          recentTrades: [
            {
              id: Date.now(),
              timestamp: new Date().toISOString(),
              ...trade,
            },
            ...state.recentTrades,
          ].slice(0, 50), // 최대 50개 거래 보관
        }));
      },

      // 실시간 업데이트 추가
      addRealTimeUpdate: (message) => {
        set((state) => ({
          realTimeUpdates: [
            {
              id: Date.now(),
              message,
              timestamp: new Date().toLocaleTimeString("ko-KR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              }),
            },
            ...state.realTimeUpdates.slice(0, 9), // 최대 10개 업데이트
          ],
        }));
      },

      // 알림 추가
      addAlert: (alert) => {
        set((state) => ({
          alerts: [
            {
              id: Date.now(),
              timestamp: new Date().toLocaleString("ko-KR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
              ...alert,
            },
            ...state.alerts,
          ].slice(0, 10), // 최대 10개 알림
        }));
      },

      // 에러 초기화
      clearError: () => set({ error: null }),

      // 세션 초기화
      clearSession: () => {
        set({
          tradingSession: null,
          tradingStatus: "stopped",
          positions: [],
          recentTrades: [],
          realTimeUpdates: [],
          alerts: [],
          error: null,
        });
      },
    }),
    {
      name: "cryptowise-trading-store",
      partialize: (state) => ({
        tradingSession: state.tradingSession,
        positions: state.positions,
        recentTrades: state.recentTrades,
        alerts: state.alerts,
      }),
      version: 1,
    }
  )
);

// ✅ 자동매매 세션 초기화
async function initializeTradingSession(config) {
  const { coins, strategy, initialAmount, backtestResults } = config;

  // 초기 포지션 생성 (균등 분할)
  const cashReserve = initialAmount * 0.2; // 20%는 현금 보유
  const investmentAmount = initialAmount - cashReserve;
  const amountPerCoin = investmentAmount / coins.length;

  const initialPositions = coins.map((coin) => {
    const quantity = amountPerCoin / coin.current_price;

    return {
      symbol: coin.symbol,
      market: coin.market,
      name: coin.korean_name,
      quantity: parseFloat(quantity.toFixed(8)),
      avgPrice: coin.current_price,
      currentPrice: coin.current_price,
      value: amountPerCoin,
      unrealizedPnL: 0,
      pnlPercent: 0,
      allocation: (amountPerCoin / initialAmount) * 100,
    };
  });

  return {
    sessionId: `session_${Date.now()}`,
    startDate: new Date().toISOString(),
    strategy,
    initialAmount,
    cashBalance: cashReserve,
    coins,
    backtestResults,
    initialPositions,
    performance: {
      totalReturn: 0,
      dailyReturn: 0,
      winRate: 0,
      totalTrades: 0,
    },
  };
}

// ✅ 포지션 가치 업데이트
async function updatePositionValues(positions) {
  // 실제로는 현재 시장 가격으로 업데이트
  return positions.map((position) => {
    // 시뮬레이션: ±2% 가격 변동
    const priceChange = (Math.random() - 0.5) * 0.04;
    const newPrice = position.currentPrice * (1 + priceChange);
    const newValue = position.quantity * newPrice;
    const unrealizedPnL = newValue - position.quantity * position.avgPrice;
    const pnlPercent =
      (unrealizedPnL / (position.quantity * position.avgPrice)) * 100;

    return {
      ...position,
      currentPrice: newPrice,
      value: newValue,
      unrealizedPnL,
      pnlPercent,
    };
  });
}

// ✅ 실시간 업데이트 관리
let updateInterval;

function startRealTimeUpdates() {
  const store = useTradingStore.getState();

  updateInterval = setInterval(() => {
    const updates = [
      "시장 가격 모니터링 중...",
      "AI 분석 신호 확인 중...",
      "포트폴리오 리밸런싱 검토...",
      "거래량 변화 분석...",
      "리스크 레벨 체크...",
      "수익 실현 기회 탐색...",
      "손실 제한선 모니터링...",
    ];

    const randomUpdate = updates[Math.floor(Math.random() * updates.length)];
    store.addRealTimeUpdate(randomUpdate);

    // 가끔 알림도 추가
    if (Math.random() < 0.1) {
      const alerts = [
        { message: "포트폴리오 일일 목표 수익률 달성", level: "success" },
        { message: "시장 변동성 증가 감지", level: "warning" },
        { message: "BTC 매수 신호 감지", level: "success" },
        { message: "리밸런싱 권장", level: "warning" },
      ];

      const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];
      store.addAlert(randomAlert);
    }
  }, 3000);
}

function stopRealTimeUpdates() {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

// ✅ 브라우저 종료 시 정리
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    stopRealTimeUpdates();
  });
}
