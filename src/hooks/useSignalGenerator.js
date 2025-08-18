// src/hooks/useSignalGenerator.js - 신호 생성 전용 훅
import { useCallback, useRef } from "react";

export const useSignalGenerator = (
  tradingSettings,
  marketCondition,
  marketSentiment,
  addLog,
  updateStats,
  testMode
) => {
  const priceHistory = useRef(new Map());
  const volumeHistory = useRef(new Map());
  const lastSignalTime = useRef(new Map());
  const newsCache = useRef(new Map());

  const NEWS_CACHE_DURATION = 600000; // 10분

  const calculateRealTimeRSI = useCallback((symbol, currentPrice) => {
    if (!priceHistory.current.has(symbol)) {
      priceHistory.current.set(symbol, []);
    }

    const prices = priceHistory.current.get(symbol);
    prices.push(currentPrice);
    if (prices.length > 50) {
      prices.shift();
    }

    if (prices.length < 14) {
      const recentPrices = prices.slice(-5);
      if (recentPrices.length < 2) return 50;
      const avgChange =
        recentPrices.reduce((sum, price, idx) => {
          if (idx === 0) return sum;
          return sum + (price - recentPrices[idx - 1]) / recentPrices[idx - 1];
        }, 0) /
        (recentPrices.length - 1);
      return Math.max(20, Math.min(80, 50 + avgChange * 1000));
    }

    return calculateRSI(prices);
  }, []);

  const calculateRSI = useCallback((prices, period = 14) => {
    if (prices.length < period + 1) return 50;
    const gains = [];
    const losses = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }

    const avgGain =
      gains.slice(-period).reduce((a, b) => a + b, 0) / period || 0;
    const avgLoss =
      losses.slice(-period).reduce((a, b) => a + b, 0) / period || 0;
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - 100 / (1 + rs);
  }, []);

  const fetchNewsForSymbol = useCallback(async (symbol) => {
    try {
      const coinSymbol = symbol.replace("KRW-", "").toUpperCase();
      const cacheKey = coinSymbol;
      const now = Date.now();
      const cached = newsCache.current.get(cacheKey);

      if (cached && now - cached.timestamp < NEWS_CACHE_DURATION) {
        return cached.data;
      }

      // Mock news score for now
      const mockNewsScore = Math.random() * 4 + 3;
      const newsData = {
        score: mockNewsScore,
        sentiment:
          mockNewsScore > 6
            ? "positive"
            : mockNewsScore < 4
              ? "negative"
              : "neutral",
        strength: "moderate",
        cached: false,
        mock: true,
      };

      newsCache.current.set(cacheKey, {
        data: newsData,
        timestamp: now,
      });

      return newsData;
    } catch (error) {
      return {
        score: 5.0,
        sentiment: "neutral",
        strength: "neutral",
        cached: false,
        error: error.message,
      };
    }
  }, []);

  const generateTradingSignal = useCallback(
    async (marketData) => {
      try {
        const symbol = marketData.code.replace("KRW-", "");
        const price = marketData.trade_price;
        const changePercent = (marketData.signed_change_rate || 0) * 100;

        updateStats((prev) => ({
          ...prev,
          signalsEvaluated: prev.signalsEvaluated + 1,
        }));

        // 시장 조건 체크
        if (!marketCondition || !marketCondition.isBuyableMarket) {
          addLog(
            `🚫 ${symbol}: 시장 조건 부적절 (점수: ${marketCondition?.overallBuyScore || "N/A"})`,
            "debug"
          );
          return null;
        }

        // 거래 간격 체크
        const lastSignal = lastSignalTime.current.get(symbol) || 0;
        const now = Date.now();
        if (now - lastSignal < 120000) {
          // 2분 간격
          return null;
        }

        const rsi = calculateRealTimeRSI(symbol, price);
        const newsData = await fetchNewsForSymbol(symbol);

        // 감정 분석 보너스 계산
        let sentimentBonus = 0;
        let sentimentReason = "";
        if (marketSentiment) {
          if (
            marketSentiment.contrarian?.buySignal &&
            changePercent <= tradingSettings.buyThreshold
          ) {
            sentimentBonus = 1.5;
            sentimentReason = "극공포 역순환 보너스";
          } else if (
            marketSentiment.contrarian?.sellSignal &&
            changePercent >= tradingSettings.sellThreshold
          ) {
            sentimentBonus = -0.5;
            sentimentReason = "극탐욕 신호 약화";
          }
          sentimentBonus *= marketSentiment.sentimentMultiplier || 1;
        }

        // 매수 조건 체크
        const buyConditions = [
          changePercent <= tradingSettings.buyThreshold,
          rsi <= tradingSettings.rsiOversold,
          newsData.score >= 5.0,
          marketData.trade_volume >
            (volumeHistory.current.get(symbol) || 0) * 1.1,
        ];

        const satisfiedConditions = buyConditions.filter(Boolean).length;
        const requiredConditions = tradingSettings.requireMultipleSignals
          ? 3
          : 2;

        if (satisfiedConditions < requiredConditions) {
          addLog(
            `📊 ${symbol}: 매수 조건 부족 (${satisfiedConditions}/${requiredConditions})`,
            "debug"
          );
          updateStats((prev) => ({
            ...prev,
            signalsRejected: prev.signalsRejected + 1,
          }));
          return null;
        }

        // 기술적 점수 계산
        let techScore = 5.0;
        if (changePercent <= -3.0 && rsi <= 30) techScore = 9.0;
        else if (changePercent <= -2.0 && rsi <= 35) techScore = 8.0;
        else if (changePercent <= -1.5 && rsi <= 40) techScore = 7.0;
        else if (changePercent <= -1.0) techScore = 6.0;
        else if (rsi <= 35) techScore = 6.5;

        const marketScore = marketCondition.overallBuyScore / 10;
        const compositeScore =
          techScore * 0.5 +
          newsData.score * 0.2 +
          marketScore * 0.3 +
          sentimentBonus;

        if (compositeScore < tradingSettings.minScore) {
          addLog(
            `📊 ${symbol}: 점수 부족 (${compositeScore.toFixed(2)} < ${tradingSettings.minScore}) ${sentimentReason ? `[${sentimentReason}]` : ""}`,
            "debug"
          );
          updateStats((prev) => ({
            ...prev,
            signalsRejected: prev.signalsRejected + 1,
          }));
          return null;
        }

        let signalType = "BUY";
        if (
          changePercent >= tradingSettings.sellThreshold ||
          rsi >= tradingSettings.rsiOverbought
        ) {
          signalType = "SELL";
        }

        lastSignalTime.current.set(symbol, now);
        volumeHistory.current.set(symbol, marketData.trade_volume);

        const signal = {
          symbol,
          type: signalType,
          price,
          totalScore: Number(compositeScore.toFixed(2)),
          confidence:
            compositeScore >= 7.5
              ? "high"
              : compositeScore >= 6.5
                ? "medium"
                : "low",
          reason: `${symbol} ${signalType} - 기술:${techScore.toFixed(1)}, 시장:${marketScore.toFixed(1)}, 뉴스:${newsData.score.toFixed(1)}${sentimentBonus !== 0 ? `, 감정:+${sentimentBonus.toFixed(1)}` : ""}`,
          timestamp: new Date(),
          changePercent: Number(changePercent.toFixed(2)),
          technicalAnalysis: { rsi, techScore },
          newsAnalysis: newsData,
          marketAnalysis: marketCondition.buyability,
          sentimentAnalysis: marketSentiment
            ? {
                fearGreedIndex: marketSentiment.fearGreedIndex,
                phase: marketSentiment.sentimentPhase,
                bonus: sentimentBonus,
                reason: sentimentReason,
              }
            : null,
          satisfiedConditions,
          testMode: testMode,
        };

        addLog(
          `🎯 ${symbol} ${signalType} 신호! 점수=${compositeScore.toFixed(1)} (조건:${satisfiedConditions}/${requiredConditions})${sentimentReason ? ` [${sentimentReason}]` : ""}`,
          signalType === "BUY" ? "success" : "warning"
        );

        updateStats((prev) => ({
          ...prev,
          signalsGenerated: prev.signalsGenerated + 1,
          conditionsMet: prev.conditionsMet + 1,
        }));

        return signal;
      } catch (error) {
        addLog(
          `❌ ${marketData.code} 신호 생성 실패: ${error.message}`,
          "error"
        );
        return null;
      }
    },
    [
      tradingSettings,
      marketCondition,
      marketSentiment,
      testMode,
      addLog,
      updateStats,
      calculateRealTimeRSI,
      fetchNewsForSymbol,
    ]
  );

  return {
    generateTradingSignal,
    volumeHistory,
  };
};
