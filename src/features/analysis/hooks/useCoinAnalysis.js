// src/hooks/useCoinAnalysis.js - 완전 개선 버전

import { useState, useEffect, useCallback } from "react";
import { newsService } from "../services/news/newsService";

export const useCoinAnalysis = (symbol) => {
  const [data, setData] = useState({
    basic: null,
    technical: null,
    news: null,
    loading: true,
    error: null,
  });

  // ✅ 기본 시장 데이터 모의 생성 (실제로는 API에서)
  const generateBasicData = useCallback((symbol) => {
    const basePrice = Math.random() * 50000 + 30000; // 3만~8만원
    const changePercent = (Math.random() - 0.5) * 10; // -5% ~ +5%

    return {
      symbol,
      price: Math.round(basePrice),
      changePercent: Number(changePercent.toFixed(2)),
      volume24h: Math.round(Math.random() * 1000000000), // 10억 이하
      marketCap: Math.round(basePrice * Math.random() * 1000000),
      lastUpdated: new Date().toISOString(),
    };
  }, []);

  // ✅ 기술적 분석 모의 생성 (실제로는 차트 데이터 기반)
  const generateTechnicalData = useCallback((basicData) => {
    const rsi = Math.random() * 100;
    const macd = Math.random() * 2 - 1; // -1 ~ 1

    // RSI 기반 점수 계산
    let rsiScore = 5;
    if (rsi <= 25)
      rsiScore = 9; // 극도 과매도
    else if (rsi <= 30)
      rsiScore = 8; // 과매도
    else if (rsi >= 75)
      rsiScore = 1; // 극도 과매수
    else if (rsi >= 70) rsiScore = 2; // 과매수

    // 종합 기술적 점수
    const totalScore = (rsiScore + (macd > 0 ? 7 : 3) + 5) / 3; // 평균

    let signalStrength = "weak";
    if (totalScore >= 8) signalStrength = "very_strong";
    else if (totalScore >= 7) signalStrength = "strong";
    else if (totalScore >= 6) signalStrength = "moderate";

    return {
      rsi: Number(rsi.toFixed(2)),
      macd: Number(macd.toFixed(4)),
      rsiScore: Number(rsiScore.toFixed(1)),
      totalScore: Number(totalScore.toFixed(2)),
      signalStrength,
      recommendation:
        totalScore >= 7 ? "매수" : totalScore <= 3 ? "매도" : "보유",
      lastCalculated: new Date().toISOString(),
    };
  }, []);

  // ✅ 뉴스 분석 (최신 newsService 사용)
  const fetchNewsAnalysis = useCallback(async (symbol) => {
    try {
      const newsData = await newsService.getNewsScore(symbol);

      return {
        score: newsData.score,
        sentiment: newsData.strength,
        strength: newsData.strength,
        recentTrend: newsData.recentTrend,
        articles: newsData.articles || [],
        articlesCount: newsData.articlesCount || 0,
        cached: newsData.cached || false,
        lastUpdated: newsData.fetchTime || new Date().toISOString(),
        // 추가 분석
        newsImpact:
          newsData.score >= 7
            ? "긍정적"
            : newsData.score <= 3
              ? "부정적"
              : "중립적",
        reliability:
          newsData.articlesCount >= 3
            ? "높음"
            : newsData.articlesCount >= 1
              ? "보통"
              : "낮음",
      };
    } catch (error) {
      console.error(`뉴스 분석 실패 (${symbol}):`, error);
      return {
        score: 5.0,
        sentiment: "neutral",
        strength: "neutral",
        recentTrend: "neutral",
        articles: [],
        articlesCount: 0,
        cached: false,
        error: error.message,
        newsImpact: "데이터 없음",
        reliability: "없음",
      };
    }
  }, []);

  // ✅ 통합 분석 실행
  const runAnalysis = useCallback(async () => {
    if (!symbol) return;

    try {
      setData((prev) => ({ ...prev, loading: true, error: null }));

      // 1단계: 기본 데이터 생성
      const basic = generateBasicData(symbol);
      setData((prev) => ({ ...prev, basic }));

      // 2단계: 기술적 분석
      const technical = generateTechnicalData(basic);
      setData((prev) => ({ ...prev, technical }));

      // 3단계: 뉴스 분석 (비동기)
      const news = await fetchNewsAnalysis(symbol);
      setData((prev) => ({ ...prev, news, loading: false }));

      console.log(`✅ ${symbol} 분석 완료:`, {
        기본: basic.price.toLocaleString() + "원",
        기술적: `${technical.totalScore}/10 (${technical.signalStrength})`,
        뉴스: `${news.score}/10 (${news.sentiment})`,
      });
    } catch (error) {
      console.error(`${symbol} 분석 실패:`, error);
      setData((prev) => ({
        ...prev,
        loading: false,
        error: error.message,
      }));
    }
  }, [symbol, generateBasicData, generateTechnicalData, fetchNewsAnalysis]);

  // ✅ 심볼 변경 시 자동 분석
  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  // ✅ 수동 새로고침 함수
  const refresh = useCallback(async () => {
    await runAnalysis();
  }, [runAnalysis]);

  // ✅ 종합 점수 계산 (기술적 + 뉴스)
  const getCompositeScore = useCallback(() => {
    if (!data.technical || !data.news) return null;

    const techWeight = 0.6; // 기술적 분석 60%
    const newsWeight = 0.4; // 뉴스 분석 40%

    const composite =
      data.technical.totalScore * techWeight + data.news.score * newsWeight;

    let recommendation = "보유";
    if (composite >= 7.5) recommendation = "강력매수";
    else if (composite >= 6.5) recommendation = "매수";
    else if (composite <= 2.5) recommendation = "강력매도";
    else if (composite <= 3.5) recommendation = "매도";

    return {
      score: Number(composite.toFixed(2)),
      recommendation,
      confidence:
        composite >= 8
          ? "매우높음"
          : composite >= 6
            ? "높음"
            : composite >= 4
              ? "보통"
              : "낮음",
    };
  }, [data.technical, data.news]);

  return {
    // 원본 데이터
    ...data,

    // 계산된 데이터
    composite: getCompositeScore(),

    // 액션 함수
    refresh,

    // 상태 확인
    isLoading: data.loading,
    hasError: !!data.error,
    hasData: !data.loading && data.basic && data.technical && data.news,

    // 요약 정보
    summary:
      data.basic && data.technical && data.news
        ? {
            symbol: data.basic.symbol,
            currentPrice: data.basic.price,
            change: data.basic.changePercent,
            technicalSignal: data.technical.recommendation,
            newsImpact: data.news.newsImpact,
            overallRecommendation:
              getCompositeScore()?.recommendation || "분석중",
          }
        : null,
  };
};

export default useCoinAnalysis;
