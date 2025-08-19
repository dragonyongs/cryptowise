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

  // 안전한 뉴스 데이터 상태 관리
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
      initializeData(true); // 🎯 명시적으로 forceInit=true 전달
    }
  }, [availableCoins.length, initializeData]);

  // 안전한 뉴스 데이터 fetch 함수
  const fetchNewsData = async (symbol) => {
    if (!symbol) return;
    try {
      setNewsLoading(true);
      const coinSymbol = symbol.replace("KRW-", "");
      console.log(`🔄 ${coinSymbol} 뉴스 데이터 요청`);
      const newsAnalysis = await newsService.getNewsScore(coinSymbol);
      console.log("📊 뉴스 분석 결과:", newsAnalysis);

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
      // 제거된 코인이 현재 선택된 코인이면 첫 번째 코인으로 변경
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
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeftIcon className="w-5 h-5 mr-2" />
              뒤로가기
            </button>
            <h1 className="text-2xl font-bold text-gray-900">코인 분석</h1>
            <div></div>
          </div>

          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                관심 코인을 추가해주세요
              </h2>
              <p className="text-gray-600 mb-6">
                관심 코인을 추가하면 AI 기반 분석을 시작할 수 있습니다
              </p>

              {/* 플랜 정보 */}
              <div className="mb-6">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPlanBadgeColor(userPlan)}`}>
                  {userPlan.toUpperCase()} 플랜: 최대 {maxCoins}개 코인
                </span>
              </div>

              <button
                onClick={() => setShowCoinSelector(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 mr-2" />
                코인 추가하기
              </button>
            </div>
          </div>
        </div>

        {/* 코인 선택 모달 */}
        {showCoinSelector && (
          <CoinSelectorModal
            isOpen={showCoinSelector}
            onClose={() => {
              setShowCoinSelector(false);
              setSearchQuery("");
            }}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            availableCoins={getSearchedCoins()}
            selectedCoins={selectedCoins}
            onAddCoin={handleAddCoin}
            maxCoins={maxCoins}
            remainingSlots={getRemainingSlots()}
            isLoading={isLoading}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            뒤로가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">코인 분석</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              title="새로고침"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCoinSelector(true)}
              className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              코인 추가
            </button>
          </div>
        </div>

        {/* 관심 코인 선택 섹션 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">관심 코인 선택</h2>
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getPlanBadgeColor(userPlan)}`}>
                {userPlan.toUpperCase()}
              </span>
              <span className="text-sm text-gray-600">
                {selectedCoins.length}/{maxCoins}개
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {selectedCoins.map((coin) => (
              <div
                key={coin.market}
                className={`relative group cursor-pointer p-3 border-2 rounded-lg transition-all ${selectedCoin === coin.market
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
                  }`}
                onClick={() => setSelectedCoin(coin.market)}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveCoin(coin.market);
                  }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  title="제거"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>

                <div className="text-center">
                  <div className="font-medium text-gray-900 text-sm">
                    {coin.korean_name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {coin.symbol}
                  </div>
                  <div className={`text-xs mt-1 ${coin.change_rate >= 0 ? "text-red-600" : "text-blue-600"
                    }`}>
                    {coin.change_rate >= 0 ? "+" : ""}{coin.change_rate?.toFixed(2)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">
                {selectedCoins.find(c => c.market === selectedCoin)?.korean_name || selectedCoin}의 기술적 지표를 분석하고 있습니다
              </span>
            </div>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-800 font-medium">{error}</span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              {selectedCoins.find(c => c.market === selectedCoin)?.korean_name || selectedCoin}의 데이터를 불러올 수 없습니다
            </p>
          </div>
        )}

        {/* 기술적 지표 패널 */}
        {selectedCoin && !loading && !error && (
          <TechnicalIndicatorsPanel
            selectedCoin={selectedCoin}
            analysisData={analysisData}
            closes={closes}
            volumes={volumes}
            candleData={candleData}
            newsData={newsData}
            newsLoading={newsLoading}
            getNewsIcon={getNewsIcon}
            getNewsScoreColor={getNewsScoreColor}
          />
        )}
      </div>

      {/* 코인 선택 모달 */}
      {showCoinSelector && (
        <CoinSelectorModal
          isOpen={showCoinSelector}
          onClose={() => {
            setShowCoinSelector(false);
            setSearchQuery("");
          }}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          availableCoins={getSearchedCoins()}
          selectedCoins={selectedCoins}
          onAddCoin={handleAddCoin}
          maxCoins={maxCoins}
          remainingSlots={getRemainingSlots()}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}

// 코인 선택 모달 컴포넌트
const CoinSelectorModal = ({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  availableCoins,
  selectedCoins,
  onAddCoin,
  maxCoins,
  remainingSlots,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] flex flex-col">
        {/* 모달 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">코인 추가</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              남은 슬롯: {remainingSlots}개 / {maxCoins}개
            </span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* 검색 섹션 */}
        <div className="p-6 border-b">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="코인명 또는 심볼 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 코인 목록 */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">코인 목록을 불러오는 중...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {availableCoins.map((coin) => {
                const isSelected = selectedCoins.some(c => c.market === coin.market);
                const canAdd = !isSelected && remainingSlots > 0;

                return (
                  <button
                    key={coin.market}
                    onClick={() => canAdd && onAddCoin(coin.market)}
                    disabled={!canAdd}
                    className={`p-4 border rounded-lg text-left transition-all ${isSelected
                      ? "border-green-500 bg-green-50 text-green-800"
                      : canAdd
                        ? "border-gray-200 hover:border-blue-500 hover:bg-blue-50"
                        : "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{coin.korean_name}</div>
                        <div className="text-sm text-gray-500">{coin.symbol}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {coin.current_price?.toLocaleString()}원
                        </div>
                        <div className={`text-xs ${coin.change_rate >= 0 ? "text-red-600" : "text-blue-600"
                          }`}>
                          {coin.change_rate >= 0 ? "+" : ""}{coin.change_rate?.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="mt-2 text-xs text-green-600 flex items-center">
                        <CheckCircleIcon className="w-4 h-4 mr-1" />
                        이미 추가됨
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {!isLoading && availableCoins.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              검색 결과가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
