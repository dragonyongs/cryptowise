// src/hooks/useCoinAnalysis.js
import { useState, useEffect } from "react";
import { hybridSignalGenerator } from "../services/analysis/hybridSignalGenerator";

export const useCoinAnalysis = (symbol) => {
  const [data, setData] = useState({
    basic: null,
    technical: null,
    news: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    const loadAnalysis = async () => {
      try {
        // 1단계: 기본 데이터 (모의 데이터)
        const basic = {
          symbol,
          price: Math.random() * 50000 + 30000,
          changePercent: (Math.random() - 0.5) * 10,
          volume: Math.random() * 1000000,
        };
        if (mounted) setData((prev) => ({ ...prev, basic }));

        // 2단계: 기술적 분석 (모의 데이터)
        const technical = {
          rsi: Math.random() * 100,
          totalScore: Math.random() * 10,
          signalStrength: "moderate",
        };
        if (mounted) setData((prev) => ({ ...prev, technical }));

        // 3단계: 뉴스 분석 (캐시에서 즉시 가져오기)
        const news = hybridSignalGenerator.newsPreloader.getNewsScore(symbol);
        if (mounted) setData((prev) => ({ ...prev, news, loading: false }));
      } catch (error) {
        console.error("분석 실패:", error);
        if (mounted) setData((prev) => ({ ...prev, loading: false }));
      }
    };

    loadAnalysis();
    return () => {
      mounted = false;
    };
  }, [symbol]);

  return data;
};
