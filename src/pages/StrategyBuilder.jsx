import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeftIcon,
    ChevronRightIcon,
    CheckCircleIcon,
    CogIcon,
    ChartBarIcon,
    BoltIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

export default function StrategyBuilder() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [strategyData, setStrategyData] = useState({
        name: '',
        description: '',
        riskLevel: 5, // 1-10
        tradingStyle: 'swing', // scalp, swing, long
        targetCoins: [],
        filters: {
            safety: {
                minMarketCap: 1000000000000,
                minExchangeCount: 3,
                maxLaunchYear: 2020,
                excludeStablecoins: true
            },
            technical: {
                rsi: { enabled: true, oversold: 30, overbought: 70 },
                macd: { enabled: true, signal: 'bullish' },
                bollinger: { enabled: true, position: 'lower' },
                volume: { enabled: true, threshold: 1.5 }
            },
            sentiment: {
                newsWeight: 30,
                socialWeight: 20,
                institutionalWeight: 50
            }
        },
        coinConfigs: {
            // BTC: { mode: 'buy_only', allocation: 30, stopLoss: -8, takeProfit: 15 }
        }
    });

    const steps = [
        { id: 1, name: '기본 설정', icon: CogIcon },
        { id: 2, name: '필터 설정', icon: BoltIcon },
        { id: 3, name: '개별 코인 설정', icon: ChartBarIcon },
        { id: 4, name: '검토 및 저장', icon: CheckCircleIcon }
    ];

    const tradingStyles = [
        {
            id: 'scalp',
            name: '단타 (스캘핑)',
            description: '짧은 시간 내 작은 수익을 노리는 전략',
            duration: '분~시간 단위',
            riskLevel: 'high',
            frequency: '매우 높음',
            icon: '⚡'
        },
        {
            id: 'swing',
            name: '스윙 트레이딩',
            description: '중기 추세를 따라가는 균형잡힌 전략',
            duration: '일~주 단위',
            riskLevel: 'medium',
            frequency: '보통',
            icon: '📈'
        },
        {
            id: 'long',
            name: '장기 보유',
            description: '펀더멘탈이 좋은 코인을 장기간 보유',
            duration: '월~년 단위',
            riskLevel: 'low',
            frequency: '낮음',
            icon: '💎'
        }
    ];

    const mockCoins = [
        { symbol: 'BTC', name: '비트코인', rank: 1, score: 9.2 },
        { symbol: 'ETH', name: '이더리움', rank: 2, score: 8.8 },
        { symbol: 'ADA', name: '에이다', rank: 8, score: 7.5 },
        { symbol: 'DOT', name: '폴카닷', rank: 12, score: 7.2 },
        { symbol: 'LINK', name: '체인링크', rank: 15, score: 7.8 }
    ];

    const handleNext = () => {
        if (currentStep < steps.length) {
            setCurrentStep(currentStep + 1);
        } else {
            // 전략 저장 후 분석 페이지로
            navigate('/analysis', { state: { strategyData } });
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        } else {
            navigate('/');
        }
    };

    const updateCoinConfig = (symbol, config) => {
        setStrategyData(prev => ({
            ...prev,
            coinConfigs: {
                ...prev.coinConfigs,
                [symbol]: { ...prev.coinConfigs[symbol], ...config }
            }
        }));
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                                <InformationCircleIcon className="w-5 h-5 mr-2" />
                                전략 개요
                            </h3>
                            <p className="text-blue-800 text-sm leading-relaxed">
                                각 코인별로 다른 매매 전략을 설정할 수 있습니다.
                                시장 상황과 코인의 특성에 맞춰 단타, 스윙, 장기보유 전략을 조합하여 사용하세요.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                    전략 이름
                                </label>
                                <input
                                    type="text"
                                    value={strategyData.name}
                                    onChange={(e) => setStrategyData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="예: 보수적 스윙 전략"
                                    className="w-full px-4 py-3 border border-crypto-neutral-300 rounded-xl focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                    전략 설명
                                </label>
                                <textarea
                                    value={strategyData.description}
                                    onChange={(e) => setStrategyData(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="전략의 목적과 특징을 간단히 설명해주세요"
                                    rows={3}
                                    className="w-full px-4 py-3 border border-crypto-neutral-300 rounded-xl focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-crypto-neutral-700 mb-4">
                                    리스크 레벨: {strategyData.riskLevel}/10
                                </label>
                                <div className="relative">
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={strategyData.riskLevel}
                                        onChange={(e) => setStrategyData(prev => ({ ...prev, riskLevel: parseInt(e.target.value) }))}
                                        className="w-full h-2 bg-crypto-neutral-200 rounded-lg appearance-none cursor-pointer slider"
                                    />
                                    <div className="flex justify-between text-xs text-crypto-neutral-500 mt-2">
                                        <span>보수적</span>
                                        <span>균형</span>
                                        <span>공격적</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );

            case 2:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <div className="bg-white border border-crypto-neutral-200 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                                안전성 필터
                            </h3>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                        최소 시가총액 (조원)
                                    </label>
                                    <input
                                        type="number"
                                        value={strategyData.filters.safety.minMarketCap / 1000000000000}
                                        onChange={(e) => setStrategyData(prev => ({
                                            ...prev,
                                            filters: {
                                                ...prev.filters,
                                                safety: {
                                                    ...prev.filters.safety,
                                                    minMarketCap: e.target.value * 1000000000000
                                                }
                                            }
                                        }))}
                                        className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                        최소 거래소 수
                                    </label>
                                    <input
                                        type="number"
                                        value={strategyData.filters.safety.minExchangeCount}
                                        onChange={(e) => setStrategyData(prev => ({
                                            ...prev,
                                            filters: {
                                                ...prev.filters,
                                                safety: {
                                                    ...prev.filters.safety,
                                                    minExchangeCount: parseInt(e.target.value)
                                                }
                                            }
                                        }))}
                                        className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-crypto-neutral-200 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">
                                기술적 지표 설정
                            </h3>

                            <div className="space-y-4">
                                {Object.entries(strategyData.filters.technical).map(([key, config]) => (
                                    <div key={key} className="flex items-center justify-between p-4 bg-crypto-neutral-50 rounded-lg">
                                        <div>
                                            <h4 className="font-medium text-crypto-neutral-900 capitalize">
                                                {key === 'rsi' ? 'RSI' : key === 'macd' ? 'MACD' : key}
                                            </h4>
                                            <p className="text-sm text-crypto-neutral-600">
                                                {key === 'rsi' && `과매도: ${config.oversold}, 과매수: ${config.overbought}`}
                                                {key === 'volume' && `최소 거래량 배수: ${config.threshold}x`}
                                            </p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={config.enabled}
                                                onChange={(e) => setStrategyData(prev => ({
                                                    ...prev,
                                                    filters: {
                                                        ...prev.filters,
                                                        technical: {
                                                            ...prev.filters.technical,
                                                            [key]: { ...config, enabled: e.target.checked }
                                                        }
                                                    }
                                                }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-crypto-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crypto-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crypto-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crypto-primary-600"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                );

            case 3:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                            <div className="flex items-start space-x-3">
                                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                                <div>
                                    <h3 className="font-medium text-amber-900">개별 코인 전략 설정</h3>
                                    <p className="text-sm text-amber-800 mt-1">
                                        각 코인의 특성에 맞춰 서로 다른 매매 전략을 적용할 수 있습니다.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {mockCoins.map((coin) => (
                                <motion.div
                                    key={coin.symbol}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white border border-crypto-neutral-200 rounded-xl p-6"
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-crypto-primary-100 rounded-full flex items-center justify-center">
                                                <span className="font-bold text-crypto-primary-700 text-sm">
                                                    {coin.symbol.slice(0, 2)}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-crypto-neutral-900">
                                                    {coin.name} ({coin.symbol})
                                                </h3>
                                                <p className="text-sm text-crypto-neutral-600">
                                                    랭킹 #{coin.rank} • 점수: {coin.score}/10
                                                </p>
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${coin.score >= 8
                                                    ? 'bg-crypto-success-100 text-crypto-success-700'
                                                    : coin.score >= 7
                                                        ? 'bg-crypto-warning-100 text-crypto-warning-700'
                                                        : 'bg-crypto-neutral-100 text-crypto-neutral-700'
                                                }`}>
                                                {coin.score >= 8 ? '강력 추천' : coin.score >= 7 ? '추천' : '보통'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                                매매 모드
                                            </label>
                                            <select
                                                value={strategyData.coinConfigs[coin.symbol]?.mode || 'both'}
                                                onChange={(e) => updateCoinConfig(coin.symbol, { mode: e.target.value })}
                                                className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg text-sm"
                                            >
                                                <option value="both">매수+매도</option>
                                                <option value="buy_only">매수만</option>
                                                <option value="sell_only">매도만</option>
                                                <option value="hold">보유만</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                                포트폴리오 비중 (%)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="50"
                                                value={strategyData.coinConfigs[coin.symbol]?.allocation || 20}
                                                onChange={(e) => updateCoinConfig(coin.symbol, { allocation: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                                매매 스타일
                                            </label>
                                            <select
                                                value={strategyData.coinConfigs[coin.symbol]?.style || 'swing'}
                                                onChange={(e) => updateCoinConfig(coin.symbol, { style: e.target.value })}
                                                className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg text-sm"
                                            >
                                                <option value="scalp">단타</option>
                                                <option value="swing">스윙</option>
                                                <option value="long">장기</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                                손절 라인 (%)
                                            </label>
                                            <input
                                                type="number"
                                                min="-50"
                                                max="-1"
                                                value={strategyData.coinConfigs[coin.symbol]?.stopLoss || -8}
                                                onChange={(e) => updateCoinConfig(coin.symbol, { stopLoss: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg text-sm"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                                익절 목표 (%)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                max="100"
                                                value={strategyData.coinConfigs[coin.symbol]?.takeProfit || 15}
                                                onChange={(e) => updateCoinConfig(coin.symbol, { takeProfit: parseInt(e.target.value) })}
                                                className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg text-sm"
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                );

            case 4:
                return (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6"
                    >
                        <div className="bg-crypto-success-50 border border-crypto-success-200 rounded-xl p-6">
                            <div className="flex items-center space-x-3">
                                <CheckCircleIcon className="w-6 h-6 text-crypto-success-600" />
                                <div>
                                    <h3 className="font-semibold text-crypto-success-900">전략 설정 완료</h3>
                                    <p className="text-crypto-success-800 text-sm">
                                        설정한 전략을 검토하고 저장하세요.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-crypto-neutral-200 rounded-xl p-6">
                            <h3 className="text-lg font-semibold text-crypto-neutral-900 mb-4">전략 요약</h3>

                            <div className="space-y-4">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-sm text-crypto-neutral-600">전략 이름</span>
                                        <p className="font-medium text-crypto-neutral-900">{strategyData.name || '이름 없음'}</p>
                                    </div>
                                    <div>
                                        <span className="text-sm text-crypto-neutral-600">리스크 레벨</span>
                                        <p className="font-medium text-crypto-neutral-900">{strategyData.riskLevel}/10</p>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-sm text-crypto-neutral-600">설정된 코인 수</span>
                                    <p className="font-medium text-crypto-neutral-900">
                                        {Object.keys(strategyData.coinConfigs).length}개 코인
                                    </p>
                                </div>

                                <div>
                                    <span className="text-sm text-crypto-neutral-600">활성화된 기술적 지표</span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {Object.entries(strategyData.filters.technical)
                                            .filter(([, config]) => config.enabled)
                                            .map(([name]) => (
                                                <span
                                                    key={name}
                                                    className="px-2 py-1 bg-crypto-primary-100 text-crypto-primary-700 rounded-full text-xs font-medium"
                                                >
                                                    {name.toUpperCase()}
                                                </span>
                                            ))
                                        }
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                            <h4 className="font-medium text-blue-900 mb-2">다음 단계</h4>
                            <p className="text-sm text-blue-800">
                                전략을 저장하면 코인 분석 페이지로 이동하여 실시간 분석 결과를 확인할 수 있습니다.
                            </p>
                        </div>
                    </motion.div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-crypto-neutral-50">
            {/* 헤더 */}
            <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={handlePrevious}
                        className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span>이전</span>
                    </button>

                    <h1 className="text-lg font-semibold text-crypto-neutral-900">
                        전략 빌더
                    </h1>

                    <div className="text-sm text-crypto-neutral-500">
                        {currentStep}/{steps.length}
                    </div>
                </div>
            </div>

            {/* 진행 단계 */}
            <div className="bg-white px-4 py-4 border-b border-crypto-neutral-200">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => (
                            <React.Fragment key={step.id}>
                                <div className="flex items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${currentStep >= step.id
                                            ? 'bg-crypto-primary-500 text-white'
                                            : 'bg-crypto-neutral-200 text-crypto-neutral-600'
                                        }`}>
                                        {currentStep > step.id ? (
                                            <CheckCircleIcon className="w-5 h-5" />
                                        ) : (
                                            <step.icon className="w-5 h-5" />
                                        )}
                                    </div>
                                    <span className={`ml-2 text-sm font-medium hidden sm:block ${currentStep >= step.id ? 'text-crypto-primary-600' : 'text-crypto-neutral-500'
                                        }`}>
                                        {step.name}
                                    </span>
                                </div>
                                {index < steps.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-4 transition-colors ${currentStep > step.id ? 'bg-crypto-primary-500' : 'bg-crypto-neutral-200'
                                        }`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            </div>

            {/* 콘텐츠 */}
            <div className="p-4 md:p-6">
                <div className="max-w-4xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            {renderStepContent()}
                        </motion.div>
                    </AnimatePresence>

                    {/* 하단 버튼 */}
                    <div className="flex justify-between mt-8">
                        <button
                            onClick={handlePrevious}
                            className="px-6 py-3 text-crypto-neutral-600 border border-crypto-neutral-300 rounded-xl hover:bg-crypto-neutral-50 transition-colors"
                        >
                            이전
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={currentStep === 1 && !strategyData.name}
                            className="px-6 py-3 bg-crypto-primary-500 text-white rounded-xl hover:bg-crypto-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                        >
                            <span>{currentStep === steps.length ? '전략 저장하기' : '다음'}</span>
                            <ChevronRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
