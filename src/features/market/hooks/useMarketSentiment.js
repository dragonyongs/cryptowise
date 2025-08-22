// src/hooks/useMarketSentiment.js - 시장 감정 분석 전용 훅
import { useState, useCallback, useEffect } from "react";
import sentimentAnalysisService from "../../../services/market/sentimentAnalysis.js";

export const useMarketSentiment = (addLog, isActive) => {
  const [marketSentiment, setMarketSentiment] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  const fetchMarketSentiment = useCallback(async () => {
    setSentimentLoading(true);
    try {
      const sentiment = await sentimentAnalysisService.analyzeSentiment();
      setMarketSentiment(sentiment);
      addLog(
        `📊 시장감정: ${sentiment.sentimentPhase.replace("_", " ").toUpperCase()} (${sentiment.fearGreedIndex}/100)`,
        "sentiment"
      );

      if (sentiment.recommendation) {
        addLog(
          `💡 추천: ${sentiment.recommendation.action} - ${sentiment.recommendation.reason}`,
          "sentiment"
        );
      }
    } catch (error) {
      console.error("Market sentiment fetch failed:", error);
      addLog("❌ 시장 감정분석 실패", "error");
    } finally {
      setSentimentLoading(false);
    }
  }, [addLog]);

  // 30분마다 감정지수 자동 업데이트
  useEffect(() => {
    if (isActive) {
      const sentimentInterval = setInterval(
        fetchMarketSentiment,
        30 * 60 * 1000
      );
      return () => clearInterval(sentimentInterval);
    }
  }, [isActive, fetchMarketSentiment]);

  return {
    marketSentiment,
    sentimentLoading,
    fetchMarketSentiment,
  };
};
