// src/components/features/analysis/state/analysisStore.js - 수정 버전
import { create } from "zustand";

export const useAnalysisStore = create((set, get) => ({
  coinAnalyses: {},
  isLoading: {},
  error: {},

  fetchIndicators: async (market, prices, volumes = []) => {
    set((state) => ({
      isLoading: { ...state.isLoading, [market]: true },
      error: { ...state.error, [market]: null },
    }));

    try {
      const { calculateAllIndicators } = await import(
        "../utils/calculateIndicators.js"
      );
      const { rsi, macd, bb, ma, volume } = calculateAllIndicators(
        prices,
        volumes
      );

      // 신호 및 점수 계산
      const signals = [];
      if (rsi.latest < 30) signals.push("매수유력(RSI)");
      if (rsi.latest > 70) signals.push("과매수경고");
      if (macd.cross === "bullish") signals.push("MACD: 상승추세");
      if (bb.position === "upper") signals.push("볼린저 상단 근접");

      // 점수 계산 개선 (0-10 범위로 정규화)
      let totalScore = 5; // 기본 중립 점수

      // RSI 기반 점수 (-2 ~ +2)
      if (rsi.latest <= 20) totalScore += 2;
      else if (rsi.latest <= 30) totalScore += 1.5;
      else if (rsi.latest >= 80) totalScore -= 2;
      else if (rsi.latest >= 70) totalScore -= 1.5;

      // MACD 기반 점수 (-1.5 ~ +1.5)
      if (macd.cross === "bullish") totalScore += 1.5;
      else if (macd.cross === "bearish") totalScore -= 1.5;

      // 볼린저밴드 기반 점수 (-1 ~ +1)
      if (bb.position === "lower") totalScore += 1;
      else if (bb.position === "upper") totalScore -= 1;

      // 0-10 범위로 제한
      totalScore = Math.max(0, Math.min(10, totalScore));

      const recommendation =
        totalScore >= 8
          ? "STRONG_BUY"
          : totalScore >= 6.5
            ? "BUY"
            : totalScore >= 4.5
              ? "HOLD"
              : totalScore >= 2.5
                ? "WEAK_SELL"
                : "SELL";

      // 분석 결과 저장
      const analysisResult = {
        rsi,
        macd,
        bb,
        ma,
        volume,
        totalScore: parseFloat(totalScore.toFixed(1)),
        signals,
        recommendation,
        last_analyzed: new Date().toISOString(),
      };

      set((state) => ({
        coinAnalyses: {
          ...state.coinAnalyses,
          [market]: analysisResult,
        },
        isLoading: { ...state.isLoading, [market]: false },
      }));

      // ✅ coinStore에 분석 결과 즉시 동기화
      try {
        const { useCoinStore } = await import(
          "../../../../stores/coinStore.js"
        );
        const updateAnalysisResult =
          useCoinStore.getState().updateAnalysisResult;

        if (updateAnalysisResult) {
          updateAnalysisResult(market, {
            score: totalScore,
            recommendation: recommendation,
            technical_score: rsi.latest,
            fundamental_score: Math.random() * 10, // 임시값 - 추후 실제 계산 로직 대체
            sentiment_score: Math.random() * 10, // 임시값 - 추후 실제 계산 로직 대체
            signals: signals,
            last_analyzed: new Date().toISOString(),
          });

          console.log(`✅ ${market} 분석 결과 coinStore 동기화 완료`);
        }
      } catch (syncError) {
        console.error("coinStore 동기화 실패:", syncError);
      }
    } catch (err) {
      console.error("지표 계산 실패:", err);
      set((state) => ({
        error: { ...state.error, [market]: err.message },
        isLoading: { ...state.isLoading, [market]: false },
      }));
    }
  },

  clearAnalysis: (market) =>
    set((state) => ({
      coinAnalyses: { ...state.coinAnalyses, [market]: undefined },
      error: { ...state.error, [market]: null },
      isLoading: { ...state.isLoading, [market]: false },
    })),
}));
