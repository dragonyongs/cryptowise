import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../stores/authStore"; // 기존 auth store 사용
import {
  ChartBarIcon,
  CpuChipIcon,
  ShieldCheckIcon,
  LightBulbIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
  PlayIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, signIn, loading: authLoading } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);
  const [marketData, setMarketData] = useState({
    btc: 67234.12,
    eth: 3456.78,
    trend: "+2.3%",
  });

  // 이미 로그인된 경우 자동 리다이렉트
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // 실시간 데이터 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData((prev) => ({
        btc: prev.btc + (Math.random() - 0.5) * 100,
        eth: prev.eth + (Math.random() - 0.5) * 50,
        trend:
          Math.random() > 0.5
            ? "+" + (Math.random() * 5).toFixed(1) + "%"
            : "-" + (Math.random() * 2).toFixed(1) + "%",
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // 기능 자동 전환
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // 로그인 처리 함수
  const handleSignIn = async () => {
    try {
      setLoading(true);

      // 테스트용: useAuthStore의 signIn이 있으면 사용, 없으면 시뮬레이션
      if (signIn && typeof signIn === "function") {
        await signIn();
      } else {
        // 테스트용 로그인 시뮬레이션
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // 시뮬레이션 후 직접 리다이렉트
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("로그인 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: "다차원 분석",
      description: "기술적 지표, 펀더멘탈, 감정 분석을 통한 종합적 투자 판단",
      icon: LightBulbIcon,
      stats: "95% 정확도",
    },
    {
      title: "개별 전략",
      description: "코인별로 단타/스윙/장기보유 전략을 다르게 설정",
      icon: CpuChipIcon,
      stats: "127개 코인",
    },
    {
      title: "백테스팅",
      description: "과거 데이터로 전략을 검증하고 최적화",
      icon: ChartBarIcon,
      stats: "3년간 데이터",
    },
    {
      title: "리스크 관리",
      description: "안전성을 최우선으로 하는 투자 시스템",
      icon: ShieldCheckIcon,
      stats: "0.1% 최대손실",
    },
  ];

  const benefits = [
    "실시간 AI 분석",
    "24/7 자동 모니터링",
    "리스크 관리 시스템",
    "백테스팅 지원",
    "모바일 알림",
    "전문가 지원",
  ];

  const isLoading = loading || authLoading;

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      {/* 미묘한 배경 패턴 */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 25% 25%, #4f46e5 0%, transparent 50%),
                                         radial-gradient(circle at 75% 75%, #06b6d4 0%, transparent 50%)`,
          }}
        ></div>
      </div>

      {/* 네비게이션 */}
      <nav className="relative z-50 px-6 py-4 bg-white/80 backdrop-blur-sm border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
              <CpuChipIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">CryptoWise</span>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Features
            </a>
            <a
              href="#"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Pricing
            </a>
            <a
              href="#"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              About
            </a>
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {isLoading ? "로그인 중..." : "Sign In"}
            </button>
          </div>
        </div>
      </nav>

      <div className="relative">
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* 좌측 콘텐츠 */}
            <div>
              {/* 배지 */}
              <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-8">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>AI-Powered Investment Platform</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Smart Crypto
                <span className="text-blue-600 block">Investment</span>
                <span className="text-2xl font-normal text-gray-600 block mt-4">
                  차세대 AI 투자 시스템
                </span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                단순한 자동매매를 넘어선 지능형 투자 플랫폼입니다. 다차원
                분석으로 최적의 투자 타이밍을 정확하게 예측합니다.
              </p>

              {/* 주요 지표 */}
              <div className="grid grid-cols-3 gap-6 mb-10">
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold text-gray-900">95%</div>
                  <div className="text-sm text-gray-500 font-medium">
                    분석 정확도
                  </div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold text-gray-900">24/7</div>
                  <div className="text-sm text-gray-500 font-medium">
                    실시간 모니터링
                  </div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-3xl font-bold text-gray-900">3초</div>
                  <div className="text-sm text-gray-500 font-medium">
                    매매 실행
                  </div>
                </div>
              </div>

              {/* CTA 버튼들 */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <button
                  onClick={handleSignIn}
                  disabled={isLoading}
                  className="flex items-center justify-center space-x-3 bg-slate-900 text-white py-4 px-8 rounded-xl font-semibold hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      <span>Google로 시작하기</span>
                    </>
                  )}
                </button>

                <button className="flex items-center justify-center space-x-2 border border-gray-300 text-gray-700 py-4 px-8 rounded-xl font-semibold hover:bg-gray-50 transition-all">
                  <PlayIcon className="w-5 h-5" />
                  <span>데모 보기</span>
                </button>
              </div>

              {/* 이점 목록 */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-gray-600">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 우측 대시보드 미리보기 */}
            <div className="relative">
              {/* 메인 대시보드 카드 */}
              <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                {/* 헤더 */}
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">
                      실시간 포트폴리오
                    </h3>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-gray-500">Live</span>
                    </div>
                  </div>
                </div>

                {/* 콘텐츠 */}
                <div className="p-6">
                  {/* 시장 데이터 */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-sm text-gray-500 mb-1">BTC/USD</div>
                      <div className="text-lg font-bold text-gray-900">
                        ${marketData.btc.toLocaleString()}
                      </div>
                      <div
                        className={`text-sm font-medium ${marketData.trend.startsWith("+")
                          ? "text-green-600"
                          : "text-red-500"
                          }`}
                      >
                        {marketData.trend}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="text-sm text-gray-500 mb-1">ETH/USD</div>
                      <div className="text-lg font-bold text-gray-900">
                        ${marketData.eth.toLocaleString()}
                      </div>
                      <div className="text-sm font-medium text-blue-600">
                        +1.8%
                      </div>
                    </div>
                  </div>

                  {/* 기능 탭 */}
                  <div className="flex space-x-1 mb-4 bg-gray-100 rounded-lg p-1">
                    {features.map((feature, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveFeature(index)}
                        className={`flex-1 py-2 px-3 rounded-md text-xs font-medium transition-all ${activeFeature === index
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        {feature.title}
                      </button>
                    ))}
                  </div>

                  {/* 활성 기능 */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                        {React.createElement(features[activeFeature].icon, {
                          className: "w-5 h-5 text-white",
                        })}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {features[activeFeature].title}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {features[activeFeature].description}
                        </p>
                        <div className="inline-flex items-center space-x-1 bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                          <span>{features[activeFeature].stats}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 성과 지표 */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-lg font-bold text-green-600">
                          +23.5%
                        </div>
                        <div className="text-xs text-gray-500">평균 수익률</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-blue-600">
                          127
                        </div>
                        <div className="text-xs text-gray-500">분석 코인</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold text-purple-600">
                          98.2%
                        </div>
                        <div className="text-xs text-gray-500">가동률</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 플로팅 알림 카드 */}
              <div className="absolute -bottom-4 -left-4 bg-white rounded-xl shadow-lg border border-gray-200 p-4 animate-pulse">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <ArrowRightIcon className="w-4 h-4 text-green-600 rotate-45" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-900">
                      매수 신호
                    </div>
                    <div className="text-xs text-gray-500">SOL/USD</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 신뢰성 지표 */}
        <div className="bg-white border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-16">
            <div className="text-center mb-8">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
                Trusted by thousands of investors
              </h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <CurrencyDollarIcon className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                <div className="text-sm font-medium text-gray-900">
                  안전한 투자
                </div>
                <div className="text-xs text-gray-500 mt-1">보장된 보안</div>
              </div>
              <div className="text-center">
                <ShieldCheckIcon className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                <div className="text-sm font-medium text-gray-900">
                  보안 인증
                </div>
                <div className="text-xs text-gray-500 mt-1">은행급 보안</div>
              </div>
              <div className="text-center">
                <ChartBarIcon className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                <div className="text-sm font-medium text-gray-900">
                  실시간 분석
                </div>
                <div className="text-xs text-gray-500 mt-1">즉시 반영</div>
              </div>
              <div className="text-center">
                <LightBulbIcon className="w-8 h-8 mx-auto mb-3 text-gray-400" />
                <div className="text-sm font-medium text-gray-900">
                  지속적 수익
                </div>
                <div className="text-xs text-gray-500 mt-1">안정적 성과</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
