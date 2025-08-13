// src/hooks/useSignalGeneration.js - 실시간 신호 생성 훅
import { useState, useEffect, useCallback, useRef } from "react";
import { useWatchlist } from "./useWatchlist";
import { cachedPriceService } from "../services/data/cachedPriceService";

export function useSignalGeneration(options = {}) {
  const {
    enableSignals = true,
    signalInterval = 30000, // 30초마다 신호 체크
    maxSignals = 20,
    confidenceThreshold = 60,
  } = options;

  const [signals, setSignals] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState(null);

  const { watchlist } = useWatchlist();
  const intervalRef = useRef(null);
  const priceHistoryRef = useRef(new Map()); // 가격 히스토리 저장

  // ✅ 기술적 지표 계산 함수들
  const calculateRSI = useCallback((prices, period = 14) => {
    if (prices.length < period + 1) return 50;

    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
      const difference = prices[i] - prices[i - 1];
      gains.push(difference > 0 ? difference : 0);
      losses.push(difference < 0 ? -difference : 0);
    }

    const avgGain =
      gains.slice(-period).reduce((sum, gain) => sum + gain, 0) / period;
    const avgLoss =
      losses.slice(-period).reduce((sum, loss) => sum + loss, 0) / period;

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }, []);

  const calculateMovingAverage = useCallback((prices, period) => {
    if (prices.length < period) return null;
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }, []);

  const calculateBollingerBands = useCallback(
    (prices, period = 20, multiplier = 2) => {
      if (prices.length < period) return null;

      const sma = calculateMovingAverage(prices.slice(-period), period);
      const variance =
        prices.slice(-period).reduce((sum, price) => {
          return sum + Math.pow(price - sma, 2);
        }, 0) / period;

      const stdDev = Math.sqrt(variance);

      return {
        upper: sma + stdDev * multiplier,
        middle: sma,
        lower: sma - stdDev * multiplier,
      };
    },
    [calculateMovingAverage]
  );

  // ✅ 가격 히스토리 업데이트
  const updatePriceHistory = useCallback((coinId, currentPrice) => {
    if (!currentPrice) return;

    const history = priceHistoryRef.current.get(coinId) || [];
    const newHistory = [...history, currentPrice].slice(-50); // 최근 50개 가격만 유지
    priceHistoryRef.current.set(coinId, newHistory);
  }, []);

  // ✅ 신호 생성 로직
  const generateSignalForCoin = useCallback(
    (coin) => {
      const priceHistory = priceHistoryRef.current.get(coin.coin_id) || [];

      if (priceHistory.length < 20) return null; // 충분한 데이터가 없으면 신호 생성 안함

      const currentPrice = coin.current_price;
      const rsi = calculateRSI(priceHistory);
      const ma20 = calculateMovingAverage(priceHistory, 20);
      const ma50 = calculateMovingAverage(priceHistory, 50);
      const bollinger = calculateBollingerBands(priceHistory);

      let signalType = null;
      let confidence = 0;
      let reasons = [];

      // 🟢 매수 신호 조건들
      if (rsi < 30) {
        confidence += 25;
        reasons.push("RSI 과매도 구간");
      }

      if (ma20 && ma50 && ma20 > ma50) {
        confidence += 20;
        reasons.push("단기 상승 추세");
      }

      if (bollinger && currentPrice < bollinger.lower) {
        confidence += 25;
        reasons.push("볼린저 밴드 하단 터치");
      }

      if (
        coin.volume_24h &&
        coin.volume_24h > (coin.volume_average || 0) * 1.5
      ) {
        confidence += 15;
        reasons.push("거래량 급증");
      }

      if (coin.sentiment_score && coin.sentiment_score > 0.7) {
        confidence += 15;
        reasons.push("뉴스 호재");
      }

      // 🔴 매도 신호 조건들
      if (rsi > 70) {
        confidence += 25;
        reasons.push("RSI 과매수 구간");
        signalType = "SELL";
      }

      if (bollinger && currentPrice > bollinger.upper) {
        confidence += 25;
        reasons.push("볼린저 밴드 상단 터치");
        signalType = "SELL";
      }

      if (ma20 && ma50 && ma20 < ma50 && signalType !== "SELL") {
        confidence -= 20;
        reasons.push("단기 하락 추세");
      }

      // 최종 신호 결정
      if (!signalType && confidence >= confidenceThreshold) {
        signalType = "BUY";
      }

      if (signalType && confidence >= confidenceThreshold) {
        return {
          id: Date.now() + Math.random(),
          coinId: coin.coin_id,
          symbol: coin.symbol,
          name: coin.name || coin.coin_name,
          korean_name: coin.korean_name,
          type: signalType,
          price: currentPrice,
          confidence: Math.min(Math.round(confidence), 95),
          reasons: reasons.join(" + "),
          rsi: Math.round(rsi),
          ma20,
          ma50,
          bollinger,
          timestamp: new Date(),
          isActive: true,
        };
      }

      return null;
    },
    [
      calculateRSI,
      calculateMovingAverage,
      calculateBollingerBands,
      confidenceThreshold,
    ]
  );

  // ✅ 전체 신호 분석 실행
  const analyzeSignals = useCallback(async () => {
    if (!enableSignals || watchlist.length === 0 || isGenerating) return;

    setIsGenerating(true);
    console.log("🔍 신호 분석 시작:", watchlist.length, "개 코인");

    try {
      // 1. 최신 가격 데이터 가져오기
      const coinIds = watchlist.map((coin) => coin.coin_id);
      const cachedPrices = cachedPriceService.getCachedPrices(coinIds);

      // 2. 각 코인별 가격 히스토리 업데이트
      watchlist.forEach((coin) => {
        const cachedPrice = cachedPrices.get(coin.coin_id);
        const currentPrice = cachedPrice?.current_price || coin.current_price;

        if (currentPrice) {
          updatePriceHistory(coin.coin_id, currentPrice);
        }
      });

      // 3. 신호 생성
      const newSignals = [];

      for (const coin of watchlist) {
        const cachedPrice = cachedPrices.get(coin.coin_id);
        const enrichedCoin = {
          ...coin,
          current_price: cachedPrice?.current_price || coin.current_price,
          volume_24h: cachedPrice?.volume_24h || coin.volume_24h,
          sentiment_score: cachedPrice?.sentiment || coin.sentiment_score,
        };

        const signal = generateSignalForCoin(enrichedCoin);
        if (signal) {
          newSignals.push(signal);
        }
      }

      // 4. 신호 업데이트 (중복 제거 및 최신 순 정렬)
      setSignals((prevSignals) => {
        const allSignals = [...newSignals, ...prevSignals];

        // 같은 코인의 중복 신호 제거 (최신 것만 유지)
        const uniqueSignals = allSignals.reduce((acc, signal) => {
          const existingIndex = acc.findIndex(
            (s) => s.coinId === signal.coinId && s.type === signal.type
          );

          if (existingIndex >= 0) {
            // 더 최신 신호면 교체
            if (signal.timestamp > acc[existingIndex].timestamp) {
              acc[existingIndex] = signal;
            }
          } else {
            acc.push(signal);
          }

          return acc;
        }, []);

        return uniqueSignals
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, maxSignals);
      });

      setLastAnalysis(new Date());
      console.log("✅ 신호 분석 완료:", newSignals.length, "개 신호 생성");
    } catch (error) {
      console.error("❌ 신호 분석 실패:", error);
    } finally {
      setIsGenerating(false);
    }
  }, [
    enableSignals,
    watchlist,
    isGenerating,
    updatePriceHistory,
    generateSignalForCoin,
    maxSignals,
  ]);

  // ✅ 신호 제거
  const removeSignal = useCallback((signalId) => {
    setSignals((prev) => prev.filter((signal) => signal.id !== signalId));
  }, []);

  // ✅ 모든 신호 클리어
  const clearAllSignals = useCallback(() => {
    setSignals([]);
  }, []);

  // ✅ 신호 비활성화
  const dismissSignal = useCallback((signalId) => {
    setSignals((prev) =>
      prev.map((signal) =>
        signal.id === signalId ? { ...signal, isActive: false } : signal
      )
    );
  }, []);

  // ✅ 자동 신호 분석 시작/중지
  // useEffect(() => {
  //   if (enableSignals && watchlist.length > 0) {
  //     // 즉시 한 번 실행
  //     analyzeSignals();

  //     // 주기적 실행 설정
  //     intervalRef.current = setInterval(analyzeSignals, signalInterval);

  //     console.log(`🚀 신호 분석 시작: ${signalInterval / 1000}초마다 실행`);
  //   } else {
  //     if (intervalRef.current) {
  //       clearInterval(intervalRef.current);
  //       intervalRef.current = null;
  //       console.log("⏸️ 신호 분석 중지");
  //     }
  //   }

  //   return () => {
  //     if (intervalRef.current) {
  //       clearInterval(intervalRef.current);
  //     }
  //   };
  // }, [enableSignals, watchlist.length, signalInterval, analyzeSignals]);

  // ✅ 신호 통계
  const signalStats = {
    totalSignals: signals.length,
    buySignals: signals.filter((s) => s.type === "BUY" && s.isActive).length,
    sellSignals: signals.filter((s) => s.type === "SELL" && s.isActive).length,
    avgConfidence:
      signals.length > 0
        ? Math.round(
            signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
          )
        : 0,
    lastAnalysis,
    isGenerating,
  };

  return {
    // 상태
    signals: signals.filter((s) => s.isActive),
    allSignals: signals,
    signalStats,
    isGenerating,
    lastAnalysis,

    // 액션
    analyzeSignals,
    removeSignal,
    clearAllSignals,
    dismissSignal,

    // 설정
    enableSignals,
    signalInterval,
  };
}
