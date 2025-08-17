// src/services/analysis/hybridSignalGenerator.js
import { newsPreloader } from "../news/newsPreloader.js";
import { technicalAnalysis } from "./technicalAnalysis";

class HybridSignalGenerator {
  constructor() {
    this.newsPreloader = newsPreloader;
    // 앱 시작 시 뉴스 프리로더 시작
    this.newsPreloader.startPreloading();

    // 앱 종료 시 정리
    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        this.newsPreloader.stopPreloading();
      });
    }
  }

  async generateSignal(marketData, technicalAnalysis) {
    try {
      const symbol = marketData.code?.replace("KRW-", "") || marketData.symbol;
      const price = marketData.trade_price || marketData.price;
      const changePercent =
        (marketData.signed_change_rate || marketData.change_rate || 0) * 100;

      // 1단계: 캐시에서 뉴스 점수 즉시 가져오기
      const newsAnalysis = this.newsPreloader.getNewsScore(symbol);

      // 2단계: 복합 점수 계산
      const compositeScore = this.calculateCompositeScore(
        technicalAnalysis,
        newsAnalysis,
        changePercent
      );

      // 3단계: 신호 생성
      return this.generateTradingSignal(
        symbol,
        price,
        changePercent,
        compositeScore,
        technicalAnalysis,
        newsAnalysis
      );
    } catch (error) {
      console.error(`신호 생성 오류 (${marketData.code}):`, error);
      return null;
    }
  }

  calculateCompositeScore(technicalAnalysis, newsAnalysis, changePercent) {
    const weights = {
      technical: 0.65, // 기술적 분석 비중 높임
      news: 0.25, // 뉴스 비중
      momentum: 0.1, // 가격 모멘텀
    };

    // 기술적 점수
    const techScore = technicalAnalysis.totalScore || 5.0;

    // 뉴스 점수
    const newsScore = newsAnalysis.score;

    // 모멘텀 점수 (큰 변동일수록 높은 점수)
    const momentumScore = 5.0 + Math.min(Math.abs(changePercent) * 0.5, 5.0);

    // 가중평균 계산
    const baseScore =
      techScore * weights.technical +
      newsScore * weights.news +
      momentumScore * weights.momentum;

    // 뉴스 강도에 따른 보정
    let multiplier = 1.0;
    if (newsAnalysis.strength === "very_positive" && techScore >= 7.0) {
      multiplier = 1.2;
    } else if (newsAnalysis.strength === "very_negative") {
      multiplier = 0.8;
    } else if (newsAnalysis.strength === "positive") {
      multiplier = 1.1;
    } else if (newsAnalysis.strength === "negative") {
      multiplier = 0.9;
    }

    return Math.min(baseScore * multiplier, 10.0);
  }

  generateTradingSignal(
    symbol,
    price,
    changePercent,
    compositeScore,
    techAnalysis,
    newsAnalysis
  ) {
    let signalType = "HOLD";
    let confidence = "medium";
    let reasoning = [];

    // 매수 신호 조건
    if (compositeScore >= 7.5 && changePercent <= -1.5) {
      signalType = "BUY";
      confidence = compositeScore >= 8.5 ? "high" : "medium";

      reasoning.push(`기술점수 ${techAnalysis.totalScore?.toFixed(1)}`);
      reasoning.push(
        `뉴스점수 ${newsAnalysis.score.toFixed(1)}(${newsAnalysis.strength})`
      );
      reasoning.push(`변동률 ${changePercent.toFixed(2)}%`);
    }
    // 매도 신호 조건
    else if (
      compositeScore <= 3.5 ||
      (changePercent >= 2.0 && compositeScore <= 5.0)
    ) {
      signalType = "SELL";
      confidence = compositeScore <= 2.5 ? "high" : "medium";

      reasoning.push(`기술점수 ${techAnalysis.totalScore?.toFixed(1)}`);
      if (newsAnalysis.strength.includes("negative")) {
        reasoning.push(`부정뉴스 ${newsAnalysis.score.toFixed(1)}`);
      }
      reasoning.push(`변동률 ${changePercent.toFixed(2)}%`);
    }

    // 신호가 없으면 null 반환
    if (signalType === "HOLD") {
      return null;
    }

    return {
      symbol,
      type: signalType,
      price,
      compositeScore,
      confidence,
      reason: `${symbol} ${signalType} - ${reasoning.join(", ")} (복합:${compositeScore.toFixed(1)})`,
      timestamp: new Date(),
      changePercent,
      technicalAnalysis,
      newsAnalysis,
      ready: true, // 모든 데이터 준비 완료
    };
  }

  // 캐시 상태 확인
  getNewsStatus() {
    return this.newsPreloader.getCacheStatus();
  }
}

export const hybridSignalGenerator = new HybridSignalGenerator();
