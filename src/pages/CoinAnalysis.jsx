import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useCoinStore } from "../stores/coinStore";
import TechnicalIndicatorsPanel from "../components/features/analysis/TechnicalIndicatorsPanel";
import { newsService } from "../services/news/newsService"; // 추가

import {
  ArrowLeftIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  NewspaperIcon, // 추가
  GlobeAltIcon, // 추가
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

  const [newsData, setNewsData] = useState(null); // 추가
  const [newsLoading, setNewsLoading] = useState(false); // 추가

  // ✅ 뉴스 데이터 fetch 함수 추가
  const fetchNewsData = async (symbol) => {
    try {
      setNewsLoading(true);
      const coinSymbol = symbol.replace("KRW-", "");
      const newsAnalysis = await newsService.getNewsScore(coinSymbol);
      setNewsData(newsAnalysis);
    } catch (error) {
      console.error("뉴스 데이터 로드 실패:", error);
      setNewsData(null);
    } finally {
      setNewsLoading(false);
    }
  };

  // 코인 선택 시 뉴스 데이터도 함께 fetch
  useEffect(() => {
    if (selectedCoin) {
      fetchPriceData(selectedCoin);
      fetchNewsData(selectedCoin); // 추가
    }
  }, [selectedCoin, getSelectedCoin]);

  // ✅ 뉴스 감정 아이콘 함수
  const getNewsIcon = (strength) => {
    switch (strength) {
      case "very_positive":
        return "🚀";
      case "positive":
        return "📈";
      case "negative":
        return "📉";
      case "very_negative":
        return "💥";
      default:
        return "📰";
    }
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
      const volumeData = sortedData.map(
        (candle) => candle.candle_acc_trade_volume
      );

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

  // 코인 선택 시 데이터 fetch
  useEffect(() => {
    if (selectedCoin) {
      fetchPriceData(selectedCoin);
    }
  }, [selectedCoin, getSelectedCoin]);

  // ✅ 수동 새로고침 함수
  const handleRefresh = () => {
    if (selectedCoin) {
      fetchPriceData(selectedCoin);
      fetchNewsData(selectedCoin); // 추가
    }
  };

  // 선택된 코인이 없을 때 UI
  if (selectedCoins.length === 0) {
    return (
      <div className="min-h-screen bg-crypto-neutral-50">
        {/* 헤더 */}
        <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>대시보드</span>
            </button>
            <h1 className="text-lg font-semibold text-crypto-neutral-900">
              코인 분석
            </h1>
            <div className="w-20"></div>
          </div>
        </div>

        {/* 코인 추가 안내 */}
        <div className="flex items-center justify-center min-h-screen bg-crypto-neutral-50 -mt-16">
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-crypto-neutral-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ChartBarIcon className="w-10 h-10 text-crypto-neutral-400" />
            </div>
            <h2 className="text-2xl font-bold text-crypto-neutral-900 mb-4">
              분석할 코인을 선택해주세요
            </h2>
            <p className="text-crypto-neutral-600 mb-8">
              관심 코인을 추가하면 AI 기반 분석을 시작할 수 있습니다
            </p>
            <Link
              to="/coins"
              className="inline-flex items-center space-x-2 bg-crypto-primary-500 text-white px-6 py-3 rounded-xl hover:bg-crypto-primary-600 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>코인 추가하기</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 로딩 중 UI
  if (loading) {
    return (
      <div className="min-h-screen bg-crypto-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4"
          >
            <ChartBarIcon className="w-full h-full text-crypto-primary-500" />
          </motion.div>
          <h2 className="text-xl font-semibold text-crypto-neutral-800 mb-2">
            차트 데이터 로딩 중...
          </h2>
          <p className="text-crypto-neutral-600">
            {selectedCoin}의 기술적 지표를 분석하고 있습니다
          </p>
        </div>
      </div>
    );
  }

  // ✅ 에러 상태 UI
  if (error) {
    return (
      <div className="min-h-screen bg-crypto-neutral-50 flex items-center justify-center">
        <div className="text-center p-8">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            데이터 로드 실패
          </h2>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={handleRefresh}
            className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // ✅ 데이터 없음 상태
  if (closes.length === 0 || !analysisData) {
    return (
      <div className="min-h-screen bg-crypto-neutral-50 flex items-center justify-center">
        <div className="text-center p-8">
          <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            차트 데이터가 없습니다
          </h2>
          <p className="text-gray-600 mb-6">
            {selectedCoin}의 데이터를 불러올 수 없습니다
          </p>
          <button
            onClick={handleRefresh}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }

  // UI 렌더링
  return (
    <div className="min-h-screen bg-crypto-neutral-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span>대시보드</span>
          </button>
          <h1 className="text-lg font-semibold text-crypto-neutral-900">
            코인 분석
          </h1>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              className="p-2 text-crypto-neutral-500 hover:text-crypto-neutral-700 transition-colors"
              title="새로고침"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            <Link
              to="/coins"
              className="bg-crypto-primary-500 text-white px-4 py-2 rounded-lg hover:bg-crypto-primary-600 transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>코인 추가</span>
            </Link>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="text-sm text-green-600">실시간</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* 좌측: 관심 코인 목록 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-4">
              <div className="flex items-center space-x-2 mb-4">
                <MagnifyingGlassIcon className="w-5 h-5 text-crypto-neutral-500" />
                <h2 className="font-semibold text-crypto-neutral-900">
                  관심 코인 ({selectedCoins.length})
                </h2>
              </div>
              <div className="space-y-2">
                {selectedCoins.map((coin) => (
                  <motion.button
                    key={coin.market}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedCoin(coin.market)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedCoin === coin.market
                        ? "bg-crypto-primary-50 border border-crypto-primary-200"
                        : "bg-crypto-neutral-50 hover:bg-crypto-neutral-100"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-crypto-neutral-900">
                          {coin.symbol}
                        </div>
                        <div className="text-sm text-crypto-neutral-600">
                          {coin.korean_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-crypto-neutral-900">
                          {coin.analysis?.score || 0}/10
                        </div>
                        <div
                          className={`text-xs flex items-center ${
                            coin.change_rate >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {coin.change_rate >= 0 ? (
                            <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                          ) : (
                            <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                          )}
                          {Math.abs(coin.change_rate).toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>

          {/* 우측: 상세 분석 */}
          <div className="lg:col-span-3 space-y-6">
            {/* ✅ 코인 기본 정보 카드 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-crypto-primary-100 rounded-full flex items-center justify-center">
                    <span className="font-bold text-crypto-primary-700">
                      {analysisData.symbol ||
                        analysisData.market?.replace("KRW-", "")}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-crypto-neutral-900">
                      {analysisData.korean_name}
                    </h2>
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl font-bold text-crypto-neutral-900">
                        ₩{analysisData.current_price?.toLocaleString() || "-"}
                      </span>
                      <span
                        className={`flex items-center text-sm ${
                          analysisData.change_rate >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {analysisData.change_rate >= 0 ? (
                          <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                        ) : (
                          <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                        )}
                        {Math.abs(analysisData.change_rate || 0).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-crypto-neutral-500">
                    데이터 포인트: {closes.length}개
                  </div>
                  <div className="text-sm text-crypto-neutral-500">
                    마지막 업데이트: {new Date().toLocaleTimeString("ko-KR")}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ✅ 기술적 지표 패널 - 올바른 props 전달 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-crypto-neutral-900 flex items-center">
                  <ChartBarIcon className="w-5 h-5 mr-2 text-crypto-primary-500" />
                  기술적 지표 분석
                </h3>
                <div className="flex items-center space-x-2 text-sm text-crypto-neutral-500">
                  <ClockIcon className="w-4 h-4" />
                  <span>실시간 분석</span>
                </div>
              </div>

              <TechnicalIndicatorsPanel
                market={selectedCoin}
                closes={closes}
                volumes={volumes}
              />
            </motion.div>

            {/* ✅ 뉴스 분석 섹션 추가 */}
            {selectedCoin && !loading && !error && (
              <div className="space-y-6">
                {/* 기존 기술적 지표 패널... */}

                {/* 뉴스 분석 패널 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <NewspaperIcon className="h-6 w-6 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        뉴스 감정 분석
                      </h3>
                    </div>
                    <button
                      onClick={() => fetchNewsData(selectedCoin)}
                      disabled={newsLoading}
                      className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <ArrowPathIcon
                        className={`h-5 w-5 ${newsLoading ? "animate-spin" : ""}`}
                      />
                    </button>
                  </div>

                  {newsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-gray-600 dark:text-gray-400">
                          뉴스 분석 중...
                        </span>
                      </div>
                    </div>
                  ) : newsData ? (
                    <div className="space-y-4">
                      {/* 메인 점수 */}
                      <div className="text-center">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <span className="text-3xl">
                            {getNewsIcon(newsData.strength)}
                          </span>
                          <span className="text-3xl font-bold text-gray-900 dark:text-white">
                            {newsData.score.toFixed(1)}/10
                          </span>
                        </div>
                        <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                          <span
                            className={`px-3 py-1 rounded-full text-white ${
                              newsData.strength === "very_positive"
                                ? "bg-green-500"
                                : newsData.strength === "positive"
                                  ? "bg-blue-500"
                                  : newsData.strength === "negative"
                                    ? "bg-orange-500"
                                    : newsData.strength === "very_negative"
                                      ? "bg-red-500"
                                      : "bg-gray-500"
                            }`}
                          >
                            {newsData.strength.replace("_", " ").toUpperCase()}
                          </span>
                          <span>트렌드: {newsData.recentTrend}</span>
                          <span>{newsData.total}개 뉴스</span>
                        </div>
                      </div>

                      {/* 감정 분포 */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {newsData.positive}
                          </div>
                          <div className="text-sm text-green-600">긍정</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-2xl font-bold text-gray-600">
                            {newsData.neutral}
                          </div>
                          <div className="text-sm text-gray-600">중립</div>
                        </div>
                        <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">
                            {newsData.negative}
                          </div>
                          <div className="text-sm text-red-600">부정</div>
                        </div>
                      </div>

                      {/* 최근 뉴스 */}
                      {newsData.articles && newsData.articles.length > 0 && (
                        <div className="border-t pt-4">
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                            최근 뉴스
                          </h4>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {newsData.articles
                              .slice(0, 5)
                              .map((article, index) => (
                                <div
                                  key={index}
                                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                >
                                  <div className="flex items-start space-x-2">
                                    <span className="text-sm">
                                      {article.sentiment === "positive"
                                        ? "📈"
                                        : article.sentiment === "negative"
                                          ? "📉"
                                          : "📰"}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                        {article.title}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {new Date(
                                          article.pubDate
                                        ).toLocaleDateString("ko-KR")}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      뉴스 데이터를 불러올 수 없습니다
                    </div>
                  )}
                </motion.div>

                {/* 기존 TechnicalIndicatorsPanel... */}
              </div>
            )}

            {/* ✅ 액션 버튼 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={() =>
                  navigate("/backtesting", {
                    state: {
                      selectedCoin,
                      analysisData,
                      chartData: { closes, volumes },
                    },
                  })
                }
                className="flex-1 bg-crypto-primary-500 text-white py-3 px-6 rounded-xl hover:bg-crypto-primary-600 transition-colors flex items-center justify-center space-x-2"
              >
                <ChartBarIcon className="w-5 h-5" />
                <span>백테스팅하기</span>
              </button>
              <button
                onClick={() =>
                  navigate("/trading", {
                    state: {
                      selectedCoin,
                      analysisData,
                      chartData: { closes, volumes },
                    },
                  })
                }
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <BoltIcon className="w-5 h-5" />
                <span>자동매매 시작</span>
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
