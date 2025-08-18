import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCoinStore } from "../stores/coinStore";
import TechnicalIndicatorsPanel from "../components/features/analysis/TechnicalIndicatorsPanel";
import { newsService } from "../services/news/newsService";
import {
  ArrowLeftIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  NewspaperIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BoltIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

export default function CoinAnalysis() {
  const navigate = useNavigate();
  const { selectedCoins, getSelectedCoin } = useCoinStore();
  const [selectedCoin, setSelectedCoin] = useState("");
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ✅ 가격과 거래량 데이터 분리
  const [closes, setCloses] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [candleData, setCandleData] = useState([]);

  // ✅ 안전한 뉴스 데이터 상태 관리
  const [newsData, setNewsData] = useState({
    score: 5.0,
    sentiment: "neutral",
    strength: "neutral",
    recentTrend: "neutral",
    articles: [], // ✅ 기본값 빈 배열
    articlesCount: 0,
    cached: false,
    loading: false,
  });
  const [newsLoading, setNewsLoading] = useState(false);

  // ✅ 안전한 뉴스 데이터 fetch 함수
  const fetchNewsData = async (symbol) => {
    if (!symbol) return;

    try {
      setNewsLoading(true);
      const coinSymbol = symbol.replace("KRW-", "");

      console.log(`🔄 ${coinSymbol} 뉴스 데이터 요청`);
      const newsAnalysis = await newsService.getNewsScore(coinSymbol);

      console.log("📊 뉴스 분석 결과:", newsAnalysis);

      // ✅ 안전한 데이터 설정 (항상 articles 배열 보장)
      setNewsData({
        score: newsAnalysis?.score || 5.0,
        sentiment: newsAnalysis?.sentiment || "neutral",
        strength: newsAnalysis?.strength || "neutral",
        recentTrend: newsAnalysis?.recentTrend || "neutral",
        articles: Array.isArray(newsAnalysis?.articles) ? newsAnalysis.articles : [],
        articlesCount: newsAnalysis?.articlesCount || 0,
        cached: newsAnalysis?.cached || false,
        error: newsAnalysis?.error || null,
        fetchTime: newsAnalysis?.fetchTime || new Date().toISOString(),
        loading: false,
      });

    } catch (error) {
      console.error("뉴스 데이터 로드 실패:", error);
      // ✅ 에러 시에도 안전한 구조 유지
      setNewsData({
        score: 5.0,
        sentiment: "neutral",
        strength: "neutral",
        recentTrend: "neutral",
        articles: [], // ✅ 빈 배열 보장
        articlesCount: 0,
        cached: false,
        error: error.message || "뉴스 로드 실패",
        loading: false,
      });
    } finally {
      setNewsLoading(false);
    }
  };

  // ✅ 뉴스 감정 아이콘 함수 (안전한 처리)
  const getNewsIcon = (strength) => {
    switch (strength) {
      case "very_positive": return "🚀";
      case "positive": return "📈";
      case "slightly_positive": return "📊";
      case "negative": return "📉";
      case "very_negative": return "💥";
      case "slightly_negative": return "⚠️";
      default: return "📰";
    }
  };

  // ✅ 뉴스 점수 색상 함수
  const getNewsScoreColor = (score) => {
    if (score >= 7) return "text-green-600";
    if (score >= 6) return "text-blue-600";
    if (score <= 3) return "text-red-600";
    if (score <= 4) return "text-orange-600";
    return "text-gray-600";
  };

  // 선택된 코인이 없으면 첫 번째 자동 선택
  useEffect(() => {
    if (selectedCoins.length > 0 && !selectedCoin) {
      setSelectedCoin(selectedCoins[0].market);
    }
  }, [selectedCoins, selectedCoin]);

  // ✅ 완전한 캔들스틱 데이터 fetch 함수
  const fetchPriceData = async (market) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `https://api.upbit.com/v1/candles/days?market=${market}&count=100`
      );

      if (!res.ok) {
        throw new Error(`API 호출 실패: ${res.status}`);
      }

      const data = await res.json();

      if (!data || data.length === 0) {
        throw new Error("데이터가 없습니다");
      }

      // ✅ 시간순 정렬 (과거 -> 최신)
      const sortedData = data.reverse();

      // ✅ 모든 필요한 데이터 추출
      const closePrices = sortedData.map((candle) => candle.trade_price);
      const volumeData = sortedData.map((candle) => candle.candle_acc_trade_volume);

      setCloses(closePrices);
      setVolumes(volumeData);
      setCandleData(sortedData);

      // 기존 코인 기본 데이터
      const coinData = getSelectedCoin(market);
      if (coinData) {
        setAnalysisData({
          ...coinData,
          chartData: {
            closes: closePrices,
            volumes: volumeData,
            timestamps: sortedData.map((candle) => candle.candle_date_time_kst),
          },
        });
      }
    } catch (err) {
      console.error("데이터 로드 실패:", err);
      setError(err.message);
      setAnalysisData(null);
      setCloses([]);
      setVolumes([]);
      setCandleData([]);
    } finally {
      setLoading(false);
    }
  };

  // 코인 선택 시 데이터 및 뉴스 동시 fetch
  useEffect(() => {
    if (selectedCoin) {
      fetchPriceData(selectedCoin);
      fetchNewsData(selectedCoin);
    }
  }, [selectedCoin, getSelectedCoin]);

  // ✅ 수동 새로고침 함수
  const handleRefresh = () => {
    if (selectedCoin) {
      fetchPriceData(selectedCoin);
      fetchNewsData(selectedCoin);
    }
  };

  // 선택된 코인이 없을 때 UI
  if (selectedCoins.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <MagnifyingGlassIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            분석할 코인을 선택하세요
          </h3>
          <p className="text-gray-500 mb-6">
            관심 코인을 추가하면 AI 기반 분석을 시작할 수 있습니다
          </p>
          <Link
            to="/coins"
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            코인 추가하기
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate("/dashboard")}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 rounded-md"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <h1 className="text-xl font-semibold text-gray-900">코인 분석</h1>
            </div>

            <button
              onClick={handleRefresh}
              disabled={loading || newsLoading}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${(loading || newsLoading) ? 'animate-spin' : ''}`} />
              새로고침
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* 코인 선택 및 기본 정보 */}
          <div className="lg:col-span-2">
            {/* 코인 선택 */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">분석할 코인 선택</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {selectedCoins.map((coin) => (
                  <button
                    key={coin.market}
                    onClick={() => setSelectedCoin(coin.market)}
                    className={`p-3 rounded-lg border-2 transition-all ${selectedCoin === coin.market
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                  >
                    <div className="font-medium">{coin.symbol}</div>
                    <div className="text-sm opacity-75">{coin.korean_name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 로딩 상태 */}
            {loading && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600">{selectedCoin}의 기술적 지표를 분석하고 있습니다</p>
              </div>
            )}

            {/* 에러 상태 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                  <h3 className="text-red-800 font-medium">데이터 로드 실패</h3>
                </div>
                <p className="text-red-700 mt-2">{error}</p>
                <p className="text-red-600 text-sm mt-1">{selectedCoin}의 데이터를 불러올 수 없습니다</p>
              </div>
            )}

            {/* 기술적 지표 패널 */}
            {!loading && !error && closes.length > 0 && (
              <TechnicalIndicatorsPanel
                closes={closes}
                volumes={volumes}
                candleData={candleData}
                symbol={selectedCoin}
              />
            )}
          </div>

          {/* 뉴스 분석 사이드바 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <NewspaperIcon className="h-5 w-5 mr-2" />
                  뉴스 분석
                </h3>
                {newsLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                )}
              </div>

              {/* ✅ 뉴스 점수 표시 (안전한 접근) */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">감정 점수</span>
                  <span className={`text-2xl ${getNewsScoreColor(newsData.score)}`}>
                    {getNewsIcon(newsData.strength)}
                  </span>
                </div>

                <div className="flex items-baseline mb-2">
                  <span className={`text-3xl font-bold ${getNewsScoreColor(newsData.score)}`}>
                    {newsData.score.toFixed(1)}
                  </span>
                  <span className="text-gray-500 ml-1">/10</span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-500 ${newsData.score >= 7 ? 'bg-green-500' :
                      newsData.score >= 6 ? 'bg-blue-500' :
                        newsData.score <= 3 ? 'bg-red-500' :
                          newsData.score <= 4 ? 'bg-orange-500' : 'bg-gray-500'
                      }`}
                    style={{ width: `${(newsData.score / 10) * 100}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>매우 부정적</span>
                  <span>중립</span>
                  <span>매우 긍정적</span>
                </div>
              </div>

              {/* 뉴스 메타 정보 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold text-gray-900">
                    {newsData.articlesCount}
                  </div>
                  <div className="text-xs text-gray-500">관련 뉴스</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-semibold capitalize text-gray-900">
                    {newsData.recentTrend}
                  </div>
                  <div className="text-xs text-gray-500">최근 트렌드</div>
                </div>
              </div>

              {/* 상태 표시 */}
              <div className="mb-4">
                <div className="flex items-center text-sm text-gray-500">
                  {newsData.cached ? (
                    <>
                      <ClockIcon className="h-4 w-4 mr-1" />
                      캐시된 데이터
                    </>
                  ) : (
                    <>
                      <BoltIcon className="h-4 w-4 mr-1" />
                      실시간 데이터
                    </>
                  )}
                </div>
                {newsData.fetchTime && (
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(newsData.fetchTime).toLocaleString("ko-KR")}
                  </div>
                )}
              </div>

              {/* ✅ 뉴스 기사 목록 (안전한 렌더링) */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">최근 뉴스</h4>
                {newsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : newsData.error ? (
                  <div className="text-red-500 text-sm p-3 bg-red-50 rounded-lg">
                    {newsData.error}
                  </div>
                ) : newsData.articles && newsData.articles.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {newsData.articles.slice(0, 5).map((article, index) => (
                      <div key={index} className="border-l-2 border-gray-200 pl-3">
                        <h5 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                          {article.title}
                        </h5>
                        {article.publishedAt && (
                          <div className="text-xs text-gray-500">
                            {new Date(article.publishedAt).toLocaleDateString("ko-KR")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm text-center p-4 bg-gray-50 rounded-lg">
                    관련 뉴스를 찾을 수 없습니다
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
