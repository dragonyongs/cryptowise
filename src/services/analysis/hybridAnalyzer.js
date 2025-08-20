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

  // 🎯 핵심 개선: 3단계 처리 (기술적 분석 즉시 표시)
  async analyzeCoins(coinList, userCallback) {
    const results = new Map();

    try {
      // Phase 1: 기술적 분석 즉시 계산 및 표시 (에러 없음)
      this.log("Phase 1: 기술적 분석 즉시 표시");
      for (const coin of coinList) {
        try {
          const technical = this.calculateTechnicalScore(coin);
          results.set(coin.symbol, {
            symbol: coin.symbol,
            technical,
            news: {
              score: 5.0,
              status: "loading",
              articles: [],
              error: null,
            },
            combined: technical,
            ready: false, // 뉴스 로딩 중
          });

          this.log(`${coin.symbol} 기술적 분석 완료: ${technical}`, "debug");
        } catch (error) {
          // 기술적 분석 실패해도 기본값으로 처리
          this.log(
            `${coin.symbol} 기술적 분석 실패, 기본값 사용: ${error.message}`,
            "warn"
          );
          results.set(coin.symbol, {
            symbol: coin.symbol,
            technical: 5.0, // 기본값
            news: {
              score: 5.0,
              status: "loading",
              articles: [],
              error: null,
            },
            combined: 5.0,
            ready: false,
          });
        }
      }

      // ✅ 기술적 분석 결과 즉시 UI에 반영
      userCallback({
        type: "technical_ready",
        results: Object.fromEntries(results),
        message: "기술적 지표 분석 완료",
      });

      // Phase 2: 캐시된 뉴스 확인
      this.log("Phase 2: 캐시된 뉴스 확인");
      let needsLoading = [];

      for (const coin of coinList) {
        try {
          const cached = this.newsCache.getCachedNews(coin.symbol);
          const current = results.get(coin.symbol);

          if (cached && cached.status === "loaded") {
            current.news = cached;
            current.combined = this.combineScores(
              current.technical,
              cached.score
            );
            current.ready = true; // 캐시된 뉴스로 완료
            results.set(coin.symbol, current);
            this.log(`${coin.symbol} 캐시된 뉴스 사용`, "debug");
          } else {
            needsLoading.push(coin.symbol);
            this.log(`${coin.symbol} 뉴스 로딩 필요`, "debug");
          }
        } catch (error) {
          this.log(`${coin.symbol} 캐시 확인 실패: ${error.message}`, "warn");
          needsLoading.push(coin.symbol);
        }
      }

      userCallback({
        type: "news_cache_ready",
        results: Object.fromEntries(results),
        cached: coinList.length - needsLoading.length,
        loading: needsLoading.length,
      });

      // Phase 3: 새 뉴스 로딩 (백그라운드에서 실행)
      if (needsLoading.length > 0) {
        this.log(
          `Phase 3: 신규 뉴스 백그라운드 로딩 (${needsLoading.length}개)`
        );

        // ✅ 비동기로 뉴스 로딩 (UI 블로킹 안함)
        this.loadNewsInBackground(needsLoading, results, userCallback);
      } else {
        userCallback({
          type: "analysis_complete",
          results: Object.fromEntries(results),
          message: "모든 분석 완료 (캐시 사용)",
        });
      }
    } catch (error) {
      this.log(`분석 중 치명적 오류: ${error.message}`, "error");
      userCallback({
        type: "analysis_error",
        error: error.message,
        results: Object.fromEntries(results),
      });
    }
  }

  // 🎯 새로운 메소드: 백그라운드 뉴스 로딩
  async loadNewsInBackground(needsLoading, results, userCallback) {
    try {
      await this.newsCache.loadNewsForCoins(needsLoading, (progress) => {
        if (
          progress.type === "progress" ||
          progress.type === "loading_progress"
        ) {
          // 로딩 진행 중 - 완료된 뉴스들 업데이트
          needsLoading.forEach((symbol) => {
            try {
              const latest = this.newsCache.getCachedNews(symbol);
              const current = results.get(symbol);

              if (latest && latest.status === "loaded" && current) {
                current.news = latest;
                current.combined = this.combineScores(
                  current.technical,
                  latest.score
                );
                current.ready = true;
                results.set(symbol, current);
                this.log(`${symbol} 뉴스 로딩 완료: ${latest.score}`, "debug");
              }
            } catch (error) {
              this.log(
                `${symbol} 뉴스 업데이트 실패: ${error.message}`,
                "warn"
              );
            }
          });

          userCallback({
            type: "news_loading_progress",
            progress: progress,
            results: Object.fromEntries(results),
          });
        } else if (progress.type === "complete") {
          this.log("모든 뉴스 로딩 완료");
          userCallback({
            type: "analysis_complete",
            results: Object.fromEntries(results),
            message: "모든 분석 완료",
          });
        }
      });
    } catch (error) {
      this.log(`백그라운드 뉴스 로딩 실패: ${error.message}`, "error");

      // ✅ 뉴스 로딩 실패해도 기술적 분석 결과는 유지
      needsLoading.forEach((symbol) => {
        const current = results.get(symbol);
        if (current) {
          current.news = {
            score: 5.0,
            status: "failed",
            articles: [],
            error: "뉴스 로딩 실패",
          };
          current.ready = true; // 기술적 분석만으로도 완료 처리
          results.set(symbol, current);
        }
      });

      userCallback({
        type: "analysis_complete",
        results: Object.fromEntries(results),
        message: "기술적 분석 완료 (뉴스 로딩 실패)",
      });
    }
  }

  // 🎯 개선된 기술적 분석 점수 계산 (에러 처리 강화)
  calculateTechnicalScore(coinData) {
    try {
      let score = 5.0;

      // RSI 분석 (안전한 타입 체크)
      if (typeof coinData.rsi === "number" && !isNaN(coinData.rsi)) {
        if (coinData.rsi < 30) {
          score += 2.0; // 과매도
        } else if (coinData.rsi < 45) {
          score += 1.0; // 매수 신호
        } else if (coinData.rsi > 70) {
          score -= 2.0; // 과매수
        }
      }

      // MACD 분석 (안전한 타입 체크)
      if (typeof coinData.macd === "number" && !isNaN(coinData.macd)) {
        if (coinData.macd > 0) {
          score += 1.5; // 상승 모멘텀
        } else {
          score -= 1.5; // 하락 모멘텀
        }
      }

      // 거래량 분석 (안전한 계산)
      if (
        typeof coinData.volume === "number" &&
        typeof coinData.avgVolume === "number" &&
        coinData.avgVolume > 0
      ) {
        const volumeRatio = coinData.volume / coinData.avgVolume;
        if (!isNaN(volumeRatio) && volumeRatio > 1.5) {
          score += 1.0; // 높은 거래량
        }
      }

      // 점수 범위 제한 및 소수점 처리
      const finalScore = Math.max(0, Math.min(10, score));
      return Number(finalScore.toFixed(1));
    } catch (error) {
      this.log(`기술적 분석 계산 오류: ${error.message}`, "error");
      return 5.0; // 안전한 기본값
    }
  }

  // 기술적 분석과 뉴스 점수 결합 (6:4 비율)
  combineScores(technical, news) {
    try {
      const technicalScore = typeof technical === "number" ? technical : 5.0;
      const newsScore = typeof news === "number" ? news : 5.0;

      const combined = technicalScore * 0.6 + newsScore * 0.4;
      return Number(combined.toFixed(1));
    } catch (error) {
      this.log(`점수 결합 오류: ${error.message}`, "error");
      return 5.0;
    }
  }

  // 분석 결과를 거래 신호로 변환
  convertAnalysisToSignal(analysisResult, marketData = null) {
    try {
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
        type: action,
        action,
        confidence,
        technical,
        newsScore: news.score,
        totalScore: combined,
        combined,
        reason: this.generateSignalReason(analysisResult),
        timestamp: Date.now(),
        price: marketData?.trade_price || marketData?.price || 0,
      };
    } catch (error) {
      this.log(`신호 변환 오류: ${error.message}`, "error");
      return {
        symbol: analysisResult.symbol || "UNKNOWN",
        type: "HOLD",
        action: "HOLD",
        confidence: 0.3,
        totalScore: 5.0,
        combined: 5.0,
        reason: "신호 변환 오류",
        timestamp: Date.now(),
      };
    }
  }

  generateSignalReason(result) {
    try {
      const reasons = [];

      if (result.technical >= 7.0) reasons.push("기술적 지표 강세");
      if (result.technical <= 3.0) reasons.push("기술적 지표 약세");
      if (result.news.score >= 7.0) reasons.push("긍정적 뉴스");
      if (result.news.score <= 3.0) reasons.push("부정적 뉴스");
      if (result.combined >= 8.0) reasons.push("종합적 매수 신호");
      if (result.combined <= 3.0) reasons.push("종합적 매도 신호");

      return reasons.join(", ") || "중립적 시장 상황";
    } catch (error) {
      return "분석 중";
    }
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
