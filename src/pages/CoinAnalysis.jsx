import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useCoinStore } from '../stores/coinStore'; // ✅ 추가
import {
    ArrowLeftIcon,
    MagnifyingGlassIcon,
    ChartBarIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
    BoltIcon,
    PlusIcon
} from '@heroicons/react/24/outline';

export default function CoinAnalysis() {
    const navigate = useNavigate();
    const [selectedCoin, setSelectedCoin] = useState('');
    const [analysisData, setAnalysisData] = useState(null);
    const [loading, setLoading] = useState(false);

    // ✅ 중앙 상태 사용
    const { selectedCoins, getSelectedCoin } = useCoinStore();

    // 선택된 코인이 없으면 첫 번째 코인을 기본으로 설정
    useEffect(() => {
        if (selectedCoins.length > 0 && !selectedCoin) {
            setSelectedCoin(selectedCoins[0].market);
        }
    }, [selectedCoins, selectedCoin]);

    // 선택된 코인의 상세 분석 데이터 로드
    useEffect(() => {
        if (selectedCoin) {
            setLoading(true);
            // 시뮬레이션
            setTimeout(() => {
                const coinData = getSelectedCoin(selectedCoin);
                if (coinData) {
                    setAnalysisData({
                        ...coinData,
                        detailed_analysis: {
                            technical: {
                                indicators: {
                                    rsi: { value: 42, signal: 'neutral', description: 'RSI 42 - 중립 구간, 추가 하락 여력 있음' },
                                    macd: { signal: 'bullish', description: 'MACD 골든크로스 형성, 상승 모멘텀 시작' },
                                    bollinger: { position: 'lower', description: '볼린저밴드 하단 근처, 반등 가능성' },
                                    volume: { ratio: 1.8, description: '거래량 80% 증가, 관심도 상승' }
                                },
                                support: coinData.current_price * 0.97,
                                resistance: coinData.current_price * 1.04
                            },
                            signals: [
                                {
                                    type: coinData.analysis.recommendation === 'STRONG_BUY' || coinData.analysis.recommendation === 'BUY' ? 'BUY' : 'HOLD',
                                    strength: coinData.analysis.recommendation === 'STRONG_BUY' ? 'strong' : 'medium',
                                    indicator: 'MACD',
                                    description: 'MACD 골든크로스와 히스토그램 상승',
                                    timestamp: '10분 전'
                                }
                            ]
                        }
                    });
                }
                setLoading(false);
            }, 1000);
        }
    }, [selectedCoin, getSelectedCoin]);

    // 선택된 코인이 없는 경우
    if (selectedCoins.length === 0) {
        return (
            <div className="min-h-screen bg-crypto-neutral-50">
                {/* 헤더 */}
                <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate('/')}
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
                        AI 분석 중...
                    </h2>
                    <p className="text-crypto-neutral-600">
                        다차원 분석을 통해 최적의 투자 신호를 찾고 있습니다
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-crypto-neutral-50">
            {/* 헤더 */}
            <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span>대시보드</span>
                    </button>

                    <h1 className="text-lg font-semibold text-crypto-neutral-900">
                        코인 분석
                    </h1>

                    <div className="flex items-center space-x-3">
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
                    {/* 좌측: 코인 목록 */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-4">
                            <div className="flex items-center space-x-2 mb-4">
                                <MagnifyingGlassIcon className="w-5 h-5 text-crypto-neutral-500" />
                                <h2 className="font-semibold text-crypto-neutral-900">관심 코인 ({selectedCoins.length})</h2>
                            </div>

                            <div className="space-y-2">
                                {selectedCoins.map((coin) => (
                                    <motion.button
                                        key={coin.market}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={() => setSelectedCoin(coin.market)}
                                        className={`w-full p-3 rounded-lg text-left transition-colors ${selectedCoin === coin.market
                                                ? 'bg-crypto-primary-50 border border-crypto-primary-200'
                                                : 'bg-crypto-neutral-50 hover:bg-crypto-neutral-100'
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
                                                    {coin.analysis.score}/10
                                                </div>
                                                <div className={`text-xs flex items-center ${coin.change_rate >= 0 ? 'text-green-600' : 'text-red-600'
                                                    }`}>
                                                    {coin.change_rate >= 0 ? (
                                                        <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                                                    ) : (
                                                        <ArrowTrendingDownIcon className="w-3 h-3 mr-1" />
                                                    )}
                                                    {Math.abs(coin.change_rate)}%
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
                        {analysisData && (
                            <>
                                {/* 종합 분석 결과 */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-crypto-primary-100 rounded-full flex items-center justify-center">
                                                <span className="font-bold text-crypto-primary-700">
                                                    {analysisData.symbol}
                                                </span>
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-semibold text-crypto-neutral-900">
                                                    {analysisData.korean_name}
                                                </h2>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-2xl font-bold text-crypto-neutral-900">
                                                        ₩{analysisData.current_price.toLocaleString()}
                                                    </span>
                                                    <span className={`flex items-center text-sm ${analysisData.change_rate >= 0 ? 'text-green-600' : 'text-red-600'
                                                        }`}>
                                                        {analysisData.change_rate >= 0 ? (
                                                            <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
                                                        ) : (
                                                            <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
                                                        )}
                                                        {Math.abs(analysisData.change_rate)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <div className={`inline-flex items-center px-4 py-2 rounded-full border ${analysisData.analysis.recommendation === 'STRONG_BUY'
                                                    ? 'text-green-600 bg-green-50 border-green-200'
                                                    : analysisData.analysis.recommendation === 'BUY'
                                                        ? 'text-blue-600 bg-blue-50 border-blue-200'
                                                        : 'text-yellow-600 bg-yellow-50 border-yellow-200'
                                                }`}>
                                                <BoltIcon className="w-4 h-4 mr-2" />
                                                <span className="font-semibold">
                                                    {analysisData.analysis.recommendation === 'STRONG_BUY' ? '강력 매수' :
                                                        analysisData.analysis.recommendation === 'BUY' ? '매수' : '보유'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 점수 지표 */}
                                    <div className="grid md:grid-cols-4 gap-4">
                                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                                            <div className="text-2xl font-bold text-blue-600">
                                                {analysisData.analysis.score}
                                            </div>
                                            <div className="text-sm text-blue-700">종합 점수</div>
                                        </div>
                                        <div className="text-center p-4 bg-green-50 rounded-lg">
                                            <div className="text-2xl font-bold text-green-600">
                                                {analysisData.analysis.technical_score}
                                            </div>
                                            <div className="text-sm text-green-700">기술적 분석</div>
                                        </div>
                                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                                            <div className="text-2xl font-bold text-purple-600">
                                                {analysisData.analysis.fundamental_score}
                                            </div>
                                            <div className="text-sm text-purple-700">펀더멘탈</div>
                                        </div>
                                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                                            <div className="text-2xl font-bold text-orange-600">
                                                {analysisData.analysis.sentiment_score}
                                            </div>
                                            <div className="text-sm text-orange-700">시장 심리</div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* 기술적 분석 상세 */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                                >
                                    <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                                        기술적 지표 분석
                                    </h3>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        {Object.entries(analysisData.detailed_analysis.technical.indicators).map(([key, indicator]) => (
                                            <div key={key} className="p-4 bg-crypto-neutral-50 rounded-lg">
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-medium text-crypto-neutral-900 uppercase">
                                                        {key}
                                                    </h4>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${indicator.signal === 'bullish' || indicator.signal === 'buy'
                                                            ? 'bg-green-100 text-green-700'
                                                            : indicator.signal === 'bearish' || indicator.signal === 'sell'
                                                                ? 'bg-red-100 text-red-700'
                                                                : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {indicator.signal}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-crypto-neutral-700">
                                                    {indicator.description}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-6 grid md:grid-cols-2 gap-4">
                                        <div className="p-4 bg-green-50 rounded-lg">
                                            <h4 className="font-medium text-green-900 mb-2">지지선</h4>
                                            <div className="text-xl font-bold text-green-600">
                                                ₩{Math.round(analysisData.detailed_analysis.technical.support).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="p-4 bg-red-50 rounded-lg">
                                            <h4 className="font-medium text-red-900 mb-2">저항선</h4>
                                            <div className="text-xl font-bold text-red-600">
                                                ₩{Math.round(analysisData.detailed_analysis.technical.resistance).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* 실시간 신호 */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                                >
                                    <div className="flex items-center space-x-2 mb-4">
                                        <BoltIcon className="w-5 h-5 text-yellow-500" />
                                        <h3 className="text-lg font-semibold text-crypto-neutral-900">
                                            실시간 매매 신호
                                        </h3>
                                    </div>

                                    <div className="space-y-3">
                                        {analysisData.detailed_analysis.signals.map((signal, index) => (
                                            <motion.div
                                                key={index}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                className={`p-4 rounded-lg border-l-4 ${signal.type === 'BUY'
                                                        ? 'bg-green-50 border-green-400'
                                                        : 'bg-red-50 border-red-400'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center space-x-3">
                                                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${signal.type === 'BUY'
                                                                ? 'bg-green-100 text-green-700'
                                                                : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {signal.type === 'BUY' ? '매수' : '매도'}
                                                        </div>
                                                        <div className={`px-2 py-1 rounded text-xs ${signal.strength === 'strong'
                                                                ? 'bg-crypto-primary-100 text-crypto-primary-700'
                                                                : 'bg-crypto-neutral-100 text-crypto-neutral-700'
                                                            }`}>
                                                            {signal.strength === 'strong' ? '강함' : '보통'}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-sm text-crypto-neutral-500">
                                                        <ClockIcon className="w-4 h-4" />
                                                        <span>{signal.timestamp}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-2">
                                                    <div className="font-medium text-crypto-neutral-900">
                                                        {signal.indicator}
                                                    </div>
                                                    <div className="text-sm text-crypto-neutral-700 mt-1">
                                                        {signal.description}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.div>

                                {/* 액션 버튼 */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={() => navigate('/backtesting', {
                                            state: { selectedCoins: [selectedCoin], analysisData }
                                        })}
                                        className="flex-1 bg-crypto-primary-500 text-white py-3 px-6 rounded-xl hover:bg-crypto-primary-600 transition-colors flex items-center justify-center space-x-2"
                                    >
                                        <ChartBarIcon className="w-5 h-5" />
                                        <span>백테스팅하기</span>
                                    </button>
                                    <button
                                        onClick={() => navigate('/trading', {
                                            state: { selectedCoins: [selectedCoin], analysisData }
                                        })}
                                        className="flex-1 bg-green-600 text-white py-3 px-6 rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                                    >
                                        <BoltIcon className="w-5 h-5" />
                                        <span>자동매매 시작</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
