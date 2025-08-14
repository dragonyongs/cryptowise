import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import {
    ChartBarIcon,
    CpuChipIcon,
    ShieldCheckIcon,
    LightBulbIcon,
    CurrencyDollarIcon
} from '@heroicons/react/24/outline';

export default function LandingPage() {
    const { signIn, loading } = useAuthStore();
    const [activeFeature, setActiveFeature] = useState(0);

    const features = [
        {
            title: '다차원 분석',
            description: '기술적 지표 + 펀더멘탈 + 감정 분석을 통한 종합적 투자 판단',
            icon: LightBulbIcon,
            color: 'from-blue-500 to-purple-600'
        },
        {
            title: '개별 전략 설정',
            description: '코인별로 단타/스윙/장기보유 전략을 다르게 설정',
            icon: CpuChipIcon,
            color: 'from-green-500 to-blue-500'
        },
        {
            title: '스마트 백테스팅',
            description: '과거 데이터로 전략을 검증하고 최적화',
            icon: ChartBarIcon,
            color: 'from-purple-500 to-pink-500'
        },
        {
            title: '리스크 관리',
            description: '안전성을 최우선으로 하는 투자 시스템',
            icon: ShieldCheckIcon,
            color: 'from-orange-500 to-red-500'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-crypto-primary-900 via-crypto-primary-800 to-crypto-primary-600 overflow-hidden">
            {/* 배경 애니메이션 */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-10 -left-10 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse-slow"></div>
                <div className="absolute top-1/2 -right-10 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>
            </div>

            <div className="relative flex flex-col justify-center min-h-screen px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto w-full">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        {/* 좌측 콘텐츠 */}
                        <div className="text-center lg:text-left">
                            <motion.div
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                            >
                                <div className="flex justify-center lg:justify-start mb-6">
                                    <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                                        <CpuChipIcon className="w-10 h-10 text-white" />
                                    </div>
                                </div>

                                <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                                    CryptoWise
                                    <span className="block text-2xl lg:text-3xl font-normal text-white/80 mt-2">
                                        차세대 AI 투자 시스템
                                    </span>
                                </h1>

                                <p className="text-xl text-white/80 mb-8 leading-relaxed">
                                    단순한 자동매매를 넘어선 <strong>지능형 투자 플랫폼</strong><br />
                                    다차원 분석으로 최적의 투자 타이밍을 찾아드립니다
                                </p>

                                {/* 주요 수치 */}
                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-white">95%</div>
                                        <div className="text-sm text-white/60">분석 정확도</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-white">24/7</div>
                                        <div className="text-sm text-white/60">실시간 모니터링</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-white">3초</div>
                                        <div className="text-sm text-white/60">매매 실행 속도</div>
                                    </div>
                                </div>

                                {/* 로그인 버튼 */}
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={signIn}
                                    disabled={loading}
                                    className="w-full lg:w-auto bg-white text-crypto-primary-700 font-semibold py-4 px-8 rounded-2xl hover:bg-white/90 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-3 min-w-[280px]"
                                >
                                    {loading ? (
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-crypto-primary-700" />
                                    ) : (
                                        <>
                                            <svg className="w-6 h-6" viewBox="0 0 24 24">
                                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                            </svg>
                                            <span>Google로 시작하기</span>
                                            <LightBulbIcon className="w-5 h-5" />
                                        </>
                                    )}
                                </motion.button>

                                <p className="text-center lg:text-left text-white/60 text-sm mt-4">
                                    무료로 시작하고 프리미엄으로 업그레이드하세요
                                </p>
                            </motion.div>
                        </div>

                        {/* 우측 기능 소개 */}
                        <div className="hidden lg:block">
                            <motion.div
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                            >
                                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                                    {/* 기능 탭 */}
                                    <div className="flex space-x-1 mb-6">
                                        {features.map((feature, index) => (
                                            <button
                                                key={index}
                                                onClick={() => setActiveFeature(index)}
                                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${activeFeature === index
                                                    ? 'bg-white/20 text-white'
                                                    : 'text-white/60 hover:text-white/80'
                                                    }`}
                                            >
                                                {feature.title}
                                            </button>
                                        ))}
                                    </div>

                                    {/* 활성 기능 내용 */}
                                    <motion.div
                                        key={activeFeature}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className={`w-16 h-16 bg-gradient-to-r ${features[activeFeature].color} rounded-2xl flex items-center justify-center mb-4`}>
                                            icon
                                        </div>

                                        <h3 className="text-xl font-semibold text-white mb-3">
                                            {features[activeFeature].title}
                                        </h3>

                                        <p className="text-white/80 leading-relaxed">
                                            {features[activeFeature].description}
                                        </p>
                                    </motion.div>

                                    {/* 실시간 지표 데모 */}
                                    <div className="mt-6 pt-6 border-t border-white/20">
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <motion.div
                                                    animate={{ scale: [1, 1.1, 1] }}
                                                    transition={{ duration: 2, repeat: Infinity }}
                                                    className="text-2xl font-bold text-green-400"
                                                >
                                                    +23.5%
                                                </motion.div>
                                                <div className="text-xs text-white/60">평균 수익률</div>
                                            </div>
                                            <div>
                                                <motion.div
                                                    animate={{ rotate: [0, 360] }}
                                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                                    className="w-8 h-8 mx-auto mb-1"
                                                >
                                                    <CpuChipIcon className="w-full h-full text-blue-400" />
                                                </motion.div>
                                                <div className="text-xs text-white/60">AI 분석 중</div>
                                            </div>
                                            <div>
                                                <div className="text-2xl font-bold text-yellow-400">127</div>
                                                <div className="text-xs text-white/60">분석 코인</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>

                    {/* 하단 신뢰성 지표 */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="mt-16 text-center"
                    >
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                            <div className="text-white/80">
                                <CurrencyDollarIcon className="w-8 h-8 mx-auto mb-2" />
                                <div className="text-sm">안전한 투자</div>
                            </div>
                            <div className="text-white/80">
                                <ShieldCheckIcon className="w-8 h-8 mx-auto mb-2" />
                                <div className="text-sm">보안 인증</div>
                            </div>
                            <div className="text-white/80">
                                <ChartBarIcon className="w-8 h-8 mx-auto mb-2" />
                                <div className="text-sm">실시간 분석</div>
                            </div>
                            <div className="text-white/80">
                                <LightBulbIcon className="w-8 h-8 mx-auto mb-2" />
                                <div className="text-sm">지속적 수익</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
