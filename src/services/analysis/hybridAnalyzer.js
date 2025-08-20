// src/services/analysis/hybridAnalyzer.js
import { centralNewsCache } from "../news/centralNewsCache.js";

export class HybridAnalyzer {
  constructor() {
    this.newsCache = centralNewsCache;
    this.technicalCache = new Map();
    this.debugMode = process.env.NODE_ENV === "development";
  }

  log(message, level = "info") {
    if (!this.debugMode && level === "debug") return;
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp} [하이브리드분석] ${message}`);
  }

  // 관심코인/상위코인 변경 감지 및 업데이트
  async updateWatchedCoins(watchlist, topCoins) {
    try {
      const updateResult = await this.newsCache.updateWatchedCoins(
        watchlist,
        topCoins
      );
      this.log(`뉴스 캐시 업데이트: ${updateResult.updated}개 신규`);
      return updateResult;
    } catch (error) {
      this.log(`관심코인 업데이트 실패: ${error.message}`, "error");
      return { updated: 0, total: 0, newCoins: [] };
    }
  }

  // 메인 분석 함수 (3단계 처리)
  async analyzeCoins(coinList, userCallback) {
    const results = new Map();

    try {
      // Phase 1: 기술적 분석 (즉시 실행)
      this.log("Phase 1: 기술적 분석 시작");
      for (const coin of coinList) {
        const technical = this.calculateTechnicalScore(coin);
        results.set(coin.symbol, {
          symbol: coin.symbol,
          technical,
          news: { score: 5.0, status: "loading" },
          combined: technical,
          ready: true,
        });
      }

      userCallback({
        type: "technical_ready",
        results: Object.fromEntries(results),
      });

      // Phase 2: 캐시된 뉴스 확인
      this.log("Phase 2: 캐시된 뉴스 확인");
      let needsLoading = [];

      for (const coin of coinList) {
        const cached = this.newsCache.getCachedNews(coin.symbol);
        const current = results.get(coin.symbol);

        if (cached.status === "loaded") {
          current.news = cached;
          current.combined = this.combineScores(
            current.technical,
            cached.score
          );
          results.set(coin.symbol, current);
        } else {
          needsLoading.push(coin.symbol);
        }
      }

      userCallback({
        type: "news_cache_ready",
        results: Object.fromEntries(results),
        cached: coinList.length - needsLoading.length,
        loading: needsLoading.length,
      });

      // Phase 3: 새 뉴스 로딩 (필요한 경우만)
      if (needsLoading.length > 0) {
        this.log(`Phase 3: 신규 뉴스 로딩 (${needsLoading.length}개)`);

        await this.newsCache.loadNewsForCoins(needsLoading, (progress) => {
          if (
            progress.type === "loading_progress" ||
            progress.type === "progress"
          ) {
            // 진행 중인 뉴스들 업데이트
            needsLoading.forEach((symbol) => {
              const latest = this.newsCache.getCachedNews(symbol);
              if (latest.status === "loaded") {
                const current = results.get(symbol);
                if (current) {
                  current.news = latest;
                  current.combined = this.combineScores(
                    current.technical,
                    latest.score
                  );
                  results.set(symbol, current);
                }
              }
            });

            userCallback({
              type: "news_loading_progress",
              progress: progress,
              results: Object.fromEntries(results),
            });
          } else if (progress.type === "complete") {
            userCallback({
              type: "analysis_complete",
              results: Object.fromEntries(results),
            });
          }
        });
      } else {
        userCallback({
          type: "analysis_complete",
          results: Object.fromEntries(results),
        });
      }
    } catch (error) {
      this.log(`분석 중 오류: ${error.message}`, "error");
      userCallback({
        type: "analysis_error",
        error: error.message,
        results: Object.fromEntries(results),
      });
    }
  }

  // 기술적 분석 점수 계산
  calculateTechnicalScore(coinData) {
    try {
      let score = 5.0;

      // RSI 분석
      if (coinData.rsi < 30) {
        score += 2.0; // 과매도
      } else if (coinData.rsi < 45) {
        score += 1.0; // 매수 신호
      } else if (coinData.rsi > 70) {
        score -= 2.0; // 과매수
      }

      // MACD 분석
      if (coinData.macd > 0) {
        score += 1.5; // 상승 모멘텀
      } else {
        score -= 1.5; // 하락 모멘텀
      }

      // 거래량 분석
      const volumeRatio =
        coinData.volume / (coinData.avgVolume || coinData.volume);
      if (volumeRatio > 1.5) {
        score += 1.0; // 높은 거래량
      }

      return Math.max(0, Math.min(10, Number(score.toFixed(1))));
    } catch (error) {
      this.log(`기술적 분석 오류: ${error.message}`, "error");
      return 5.0;
    }
  }

  // 기술적 분석과 뉴스 점수 결합 (6:4 비율)
  combineScores(technical, news) {
    return Number((technical * 0.6 + news * 0.4).toFixed(1));
  }

  // 분석 결과를 거래 신호로 변환
  convertAnalysisToSignal(analysisResult, marketData = null) {
    const { symbol, technical, news, combined } = analysisResult;

    let action = "HOLD";
    let confidence = 0;

    // 하이브리드 점수 기반 시그널 생성
    if (combined >= 8.0 && technical >= 7.0 && news.score >= 6.0) {
      action = "BUY";
      confidence = Math.min(0.9, (combined - 8.0) / 2.0 + 0.7);
    } else if (combined <= 3.0 || (technical <= 3.0 && news.score <= 4.0)) {
      action = "SELL";
      confidence = Math.min(0.9, (5.0 - combined) / 2.0 + 0.6);
    }

    return {
      symbol,
      type: action, // 기존 코드와의 호환성을 위해 'type' 사용
      action,
      confidence,
      technical,
      newsScore: news.score,
      totalScore: combined, // 기존 코드 호환성
      combined,
      reason: this.generateSignalReason(analysisResult),
      timestamp: Date.now(),
      price: marketData?.trade_price || marketData?.price || 0,
    };
  }

  generateSignalReason(result) {
    const reasons = [];

    if (result.technical >= 7.0) reasons.push("기술적 지표 강세");
    if (result.technical <= 3.0) reasons.push("기술적 지표 약세");
    if (result.news.score >= 7.0) reasons.push("긍정적 뉴스");
    if (result.news.score <= 3.0) reasons.push("부정적 뉴스");
    if (result.combined >= 8.0) reasons.push("종합적 매수 신호");
    if (result.combined <= 3.0) reasons.push("종합적 매도 신호");

    return reasons.join(", ") || "중립적 시장 상황";
  }

  // 단일 코인에 대한 빠른 분석
  async quickAnalyzeCoin(symbol, marketData = null) {
    try {
      // 기술적 분석
      const coinData = {
        symbol,
        rsi: marketData?.rsi || 50,
        macd: marketData?.macd || 0,
        volume: marketData?.volume || 0,
        avgVolume: marketData?.avgVolume || marketData?.volume,
        price: marketData?.trade_price || marketData?.price,
      };

      const technical = this.calculateTechnicalScore(coinData);

      // 뉴스 점수 조회 (캐시에서)
      const news = this.newsCache.getCachedNews(symbol);

      // 결합 점수 계산
      const combined = this.combineScores(technical, news.score);

      const analysisResult = {
        symbol,
        technical,
        news,
        combined,
        ready: true,
      };

      return this.convertAnalysisToSignal(analysisResult, marketData);
    } catch (error) {
      this.log(`빠른 분석 실패 (${symbol}): ${error.message}`, "error");
      return {
        symbol,
        type: "HOLD",
        action: "HOLD",
        confidence: 0.3,
        totalScore: 5.0,
        combined: 5.0,
        reason: "분석 오류",
        timestamp: Date.now(),
      };
    }
  }
}

export const hybridAnalyzer = new HybridAnalyzer();
export default HybridAnalyzer;
