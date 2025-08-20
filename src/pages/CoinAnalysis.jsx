import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCoinStore } from "../stores/coinStore";
import TechnicalIndicatorsPanel from "../components/features/analysis/TechnicalIndicatorsPanel";
import { newsService } from "../services/news/newsService";
import { hybridAnalyzer } from "../services/analysis/hybridAnalyzer";
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
  XMarkIcon,
} from "@heroicons/react/24/outline";

export default function CoinAnalysis() {
  const navigate = useNavigate();
  const {
    selectedCoins,
    availableCoins,
    getSelectedCoin,
    addCoin,
    removeCoin,
    maxCoins,
    getRemainingSlots,
    userPlan,
    isLoading,
    initializeData,
    refreshData,
    getFilteredCoins,
    setFilterOptions,
    filterOptions,
  } = useCoinStore();

  const [selectedCoin, setSelectedCoin] = useState("");
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCoinSelector, setShowCoinSelector] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 가격과 거래량 데이터 분리
  const [closes, setCloses] = useState([]);
  const [volumes, setVolumes] = useState([]);
  const [candleData, setCandleData] = useState([]);

  // 🎯 개선된 분석 상태 관리
  const [analysisResults, setAnalysisResults] = useState({});
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // 안전한 뉴스 데이터 상태 관리 (개별 코인용)
  const [newsData, setNewsData] = useState({
    score: 5.0,
    sentiment: "neutral",
    strength: "neutral",
    recentTrend: "neutral",
    articles: [],
    articlesCount: 0,
    cached: false,
    loading: false,
  });
  const [newsLoading, setNewsLoading] = useState(false);

  // 코인 데이터 초기화
  useEffect(() => {
    if (availableCoins.length === 0) {
      initializeData(true);
    }
  }, [availableCoins.length, initializeData]);

  // 🎯 핵심: 하이브리드 분석 실행 (기술적 지표 즉시 표시)
  const performHybridAnalysis = async (coins) => {
    if (!coins || coins.length === 0) return;

    try {
      setAnalysisLoading(true);
      setAnalysisError(null);

      console.log('🚀 하이브리드 분석 시작:', coins.map(c => c.symbol));

      await hybridAnalyzer.analyzeCoins(coins, (update) => {
        console.log('📊 분석 업데이트:', update);

        switch (update.type) {
          case 'technical_ready':
            // ✅ 기술적 지표 즉시 표시
            setAnalysisResults(prev => ({
              ...prev,
              ...update.results
            }));
            console.log('✅ 기술적 분석 완료');
            break;

          case 'news_cache_ready':
            // ✅ 캐시된 뉴스 포함 업데이트
            setAnalysisResults(prev => ({
              ...prev,
              ...update.results
            }));
            console.log(`📰 캐시된 뉴스: ${update.cached}개, 로딩 중: ${update.loading}개`);
            break;

          case 'news_loading_progress':
            // ✅ 뉴스 로딩 진행 중 업데이트
            setAnalysisResults(prev => ({
              ...prev,
              ...update.results
            }));
            break;

          case 'analysis_complete':
            // ✅ 모든 분석 완료
            setAnalysisResults(prev => ({
              ...prev,
              ...update.results
            }));
            setAnalysisLoading(false);
            console.log('🎉 모든 분석 완료');
            break;

          case 'analysis_error':
            console.error('❌ 분석 오류:', update.error);
            setAnalysisError(update.error);
            setAnalysisResults(prev => ({
              ...prev,
              ...update.results
            }));
            setAnalysisLoading(false);
            break;
        }
      });

    } catch (error) {
      console.error('하이브리드 분석 실패:', error);
      setAnalysisError(error.message);
      setAnalysisLoading(false);
    }
  };

  // 선택된 코인들에 대한 하이브리드 분석 실행
  useEffect(() => {
    if (selectedCoins.length > 0) {
      performHybridAnalysis(selectedCoins);
    }
  }, [selectedCoins]);

  // 안전한 뉴스 데이터 fetch 함수 (개별 코인용)
  const fetchNewsData = async (symbol) => {
    if (!symbol) return;

    try {
      setNewsLoading(true);
      const coinSymbol = symbol.replace("KRW-", "");
      console.log(`🔄 ${coinSymbol} 개별 뉴스 데이터 요청`);

      const newsAnalysis = await newsService.getNewsScore(coinSymbol);
      console.log("📊 개별 뉴스 분석 결과:", newsAnalysis);

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
      console.error("개별 뉴스 데이터 로드 실패:", error);
      setNewsData({
        score: 5.0,
        sentiment: "neutral",
        strength: "neutral",
        recentTrend: "neutral",
        articles: [],
        articlesCount: 0,
        cached: false,
        error: error.message || "뉴스 로드 실패",
        loading: false,
      });
    } finally {
      setNewsLoading(false);
    }
  };

  // 뉴스 감정 아이콘 함수
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

  // 뉴스 점수 색상 함수
  const getNewsScoreColor = (score) => {
    if (score >= 7) return "text-green-600";
    if (score >= 6) return "text-blue-600";
    if (score <= 3) return "text-red-600";
    if (score <= 4) return "text-orange-600";
    return "text-gray-600";
  };

  // 🎯 분석 점수 색상 함수
  const getScoreColor = (score) => {
    if (score >= 8) return "text-green-600 font-bold";
    if (score >= 7) return "text-green-500";
    if (score >= 6) return "text-blue-600";
    if (score <= 3) return "text-red-600 font-bold";
    if (score <= 4) return "text-red-500";
    return "text-gray-600";
  };

  // 선택된 코인이 없으면 첫 번째 자동 선택
  useEffect(() => {
    if (selectedCoins.length > 0 && !selectedCoin) {
      setSelectedCoin(selectedCoins[0].market);
    }
  }, [selectedCoins, selectedCoin]);

  // 완전한 캔들스틱 데이터 fetch 함수
  const fetchPriceData = async (market) => {
    try {
      setLoading(true);
      setError(null);

      // ✅ 직접 업비트 API 대신 프록시 사용
      const proxyUrl = `/api/upbit-proxy?market=${market}&count=100&endpoint=candles/days`;
      const res = await fetch(proxyUrl);

      if (!res.ok) {
        throw new Error(`프록시 API 호출 실패: ${res.status}`);
      }

      const data = await res.json();
      if (!data || data.length === 0) {
        throw new Error("데이터가 없습니다");
      }

      // 시간순 정렬 (과거 -> 최신)
      const sortedData = data.reverse();

      // 모든 필요한 데이터 추출
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

  // 수동 새로고침 함수
  const handleRefresh = () => {
    if (selectedCoin) {
      fetchPriceData(selectedCoin);
      fetchNewsData(selectedCoin);
    }
    // 하이브리드 분석도 새로고침
    if (selectedCoins.length > 0) {
      performHybridAnalysis(selectedCoins);
    }
  };

  // 코인 추가 핸들러
  const handleAddCoin = (market) => {
    const result = addCoin(market);
    if (result.success) {
      setShowCoinSelector(false);
      setSearchQuery("");
    } else {
      alert(result.message);
    }
  };

  // 코인 제거 핸들러
  const handleRemoveCoin = (market) => {
    const result = removeCoin(market);
    if (result.success) {
      if (selectedCoin === market && selectedCoins.length > 1) {
        const remainingCoins = selectedCoins.filter(c => c.market !== market);
        if (remainingCoins.length > 0) {
          setSelectedCoin(remainingCoins[0].market);
        }
      }
    }
  };

  // 검색된 코인 필터링
  const getSearchedCoins = () => {
    if (!searchQuery) return getFilteredCoins();
    return getFilteredCoins().filter(coin =>
      coin.korean_name.includes(searchQuery) ||
      coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coin.english_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // 플랜별 배지 색상
  const getPlanBadgeColor = (plan) => {
    switch (plan) {
      case "free": return "bg-gray-100 text-gray-800";
      case "premium": return "bg-blue-100 text-blue-800";
      case "enterprise": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // 선택된 코인이 없을 때 UI
  if (selectedCoins.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* 헤더 */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => navigate(-1)}
                  className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  뒤로가기
                </button>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  코인 분석
                </h1>
              </div>

              {/* 플랜 정보 */}
              <div className="flex items-center space-x-4">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlanBadgeColor(userPlan)}`}>
                  {userPlan.toUpperCase()}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedCoins.length}/{maxCoins}개
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 빈 상태 */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="mx-auto h-24 w-24 text-gray-400 dark:text-gray-500 mb-6">
              <ChartBarIcon />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              분석할 코인을 선택해주세요
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              관심 코인을 추가하면 AI 기반 분석을 시작할 수 있습니다
            </p>

            <button
              onClick={() => setShowCoinSelector(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              코인 추가
            </button>
          </div>
        </div>

        {/* 코인 선택 모달 */}
        {showCoinSelector && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold">코인 선택</h3>
                <button
                  onClick={() => setShowCoinSelector(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4">
                <div className="relative mb-4">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="코인 검색..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="max-h-64 overflow-y-auto">
                  {getSearchedCoins().map((coin) => (
                    <div
                      key={coin.market}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                      onClick={() => handleAddCoin(coin.market)}
                    >
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {coin.korean_name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {coin.symbol}
                        </div>
                      </div>
                      <PlusIcon className="h-5 w-5 text-blue-600" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 메인 분석 UI
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                뒤로가기
              </button>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                코인 분석
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPlanBadgeColor(userPlan)}`}>
                {userPlan.toUpperCase()}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {selectedCoins.length}/{maxCoins}개
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 사이드바 - 코인 목록 */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  관심 코인
                </h2>
                <button
                  onClick={() => setShowCoinSelector(true)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>

              {/* 🎯 하이브리드 분석 결과 표시 */}
              <div className="space-y-3">
                {selectedCoins.map((coin) => {
                  const analysis = analysisResults[coin.symbol];
                  const isSelected = selectedCoin === coin.market;

                  return (
                    <div
                      key={coin.market}
                      onClick={() => setSelectedCoin(coin.market)}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white text-sm">
                              {coin.korean_name}
                            </h3>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveCoin(coin.market);
                              }}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            {coin.symbol}
                          </div>

                          {/* ✅ 분석 결과 표시 */}
                          {analysis ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">기술적:</span>
                                <span className={getScoreColor(analysis.technical)}>
                                  {analysis.technical}
                                </span>
                              </div>

                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-500">뉴스:</span>
                                {analysis.news.status === 'loading' ? (
                                  <span className="text-yellow-600">로딩중...</span>
                                ) : analysis.news.status === 'failed' ? (
                                  <span className="text-red-500">실패</span>
                                ) : (
                                  <span className={getScoreColor(analysis.news.score)}>
                                    {analysis.news.score}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-xs font-medium">
                                <span className="text-gray-700 dark:text-gray-300">종합:</span>
                                <span className={getScoreColor(analysis.combined)}>
                                  {analysis.combined}/10
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">
                              {analysisLoading ? '분석 중...' : '분석 대기'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {analysisError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800 dark:text-red-200">
                      {analysisError}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-3">
            {error ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <div className="text-center">
                  <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    데이터 로드 실패
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {selectedCoins.find(c => c.market === selectedCoin)?.korean_name || selectedCoin}의 데이터를 불러올 수 없습니다
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                    오류: {error}
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-2" />
                    다시 시도
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* 기술적 지표 패널 */}
                {analysisData && closes.length > 0 && (
                  <TechnicalIndicatorsPanel
                    closes={closes}
                    volumes={volumes}
                    candleData={candleData}
                    coinData={analysisData}
                    loading={loading}
                  />
                )}

                {/* 뉴스 분석 섹션 */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <NewspaperIcon className="h-6 w-6 text-gray-400 mr-3" />
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        뉴스 분석
                      </h2>
                    </div>

                    {newsLoading && (
                      <div className="flex items-center text-sm text-gray-500">
                        <ClockIcon className="h-4 w-4 mr-1 animate-pulse" />
                        로딩 중...
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          뉴스 점수
                        </span>
                        <span className={`text-lg font-bold ${getNewsScoreColor(newsData.score)}`}>
                          {newsData.score}/10
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          감정 분석
                        </span>
                        <div className="flex items-center">
                          <span className="mr-2">{getNewsIcon(newsData.strength)}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                            {newsData.sentiment}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          기사 수
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {newsData.articlesCount}개
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        최근 뉴스
                      </h4>

                      {newsData.articles.length > 0 ? (
                        <div className="space-y-2">
                          {newsData.articles.slice(0, 3).map((article, index) => (
                            <div
                              key={index}
                              className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2"
                            >
                              • {article.title}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {newsLoading ? "뉴스를 불러오는 중..." : "최근 뉴스가 없습니다"}
                        </div>
                      )}

                      {newsData.error && (
                        <div className="text-xs text-red-500">
                          오류: {newsData.error}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 종합 분석 결과 */}
                {analysisResults[selectedCoins.find(c => c.market === selectedCoin)?.symbol] && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center mb-6">
                      <BoltIcon className="h-6 w-6 text-yellow-500 mr-3" />
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        종합 분석
                      </h2>
                    </div>

                    {(() => {
                      const analysis = analysisResults[selectedCoins.find(c => c.market === selectedCoin)?.symbol];

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold mb-2">
                              <span className={getScoreColor(analysis.technical)}>
                                {analysis.technical}
                              </span>
                              <span className="text-gray-400 text-lg">/10</span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              기술적 분석
                            </div>
                          </div>

                          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="text-2xl font-bold mb-2">
                              {analysis.news.status === 'loading' ? (
                                <span className="text-yellow-600">로딩중</span>
                              ) : analysis.news.status === 'failed' ? (
                                <span className="text-red-500">실패</span>
                              ) : (
                                <>
                                  <span className={getScoreColor(analysis.news.score)}>
                                    {analysis.news.score}
                                  </span>
                                  <span className="text-gray-400 text-lg">/10</span>
                                </>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              뉴스 분석
                            </div>
                          </div>

                          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <div className="text-3xl font-bold mb-2">
                              <span className={getScoreColor(analysis.combined)}>
                                {analysis.combined}
                              </span>
                              <span className="text-gray-400 text-lg">/10</span>
                            </div>
                            <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                              종합 점수
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 코인 선택 모달 */}
      {showCoinSelector && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">코인 선택</h3>
              <button
                onClick={() => setShowCoinSelector(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="relative mb-4">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="코인 검색..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="max-h-64 overflow-y-auto">
                {getSearchedCoins().map((coin) => (
                  <div
                    key={coin.market}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
                    onClick={() => handleAddCoin(coin.market)}
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {coin.korean_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {coin.symbol}
                      </div>
                    </div>
                    <PlusIcon className="h-5 w-5 text-blue-600" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
