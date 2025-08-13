// src/components/PricingTier.jsx
import { useState } from 'react'
import { Check, Star, Zap, Crown } from 'lucide-react'
import { useUserProfile } from '../hooks/useUserProfile'
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card'
import { Button } from './ui/Button'

export default function PricingTier({ currentPlan, onUpgrade }) {
    const [loading, setLoading] = useState(null)
    const { profile } = useUserProfile()

    const plans = [
        {
            id: 'free',
            name: 'Free',
            price: 0,
            period: '영구 무료',
            icon: Star,
            color: 'text-gray-600',
            bgColor: 'bg-gray-100',
            features: [
                '최대 5개 코인 추적',
                '기본 뉴스 감성 분석',
                '일간 시장 데이터',
                '기본 기술 지표 (RSI, MACD)',
                '커뮤니티 지원'
            ],
            limits: {
                watchlist: 5,
                newsAnalysis: 'basic',
                alerts: 0,
                historicalData: '7일',
                apiCalls: 100
            },
            recommended: false,
            description: '암호화폐 투자 시작하기'
        },
        {
            id: 'pro',
            name: 'Pro',
            price: 9900,
            period: '월',
            icon: Zap,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            features: [
                '최대 20개 코인 추적',
                '고급 뉴스 감성 분석',
                '실시간 가격 알림 (10개)',
                '30일 히스토리 데이터',
                '백테스팅 기능',
                '모든 기술 지표',
                '우선 고객 지원'
            ],
            limits: {
                watchlist: 20,
                newsAnalysis: 'advanced',
                alerts: 10,
                historicalData: '30일',
                apiCalls: 1000
            },
            recommended: true,
            description: '진지한 투자자를 위한 선택'
        },
        {
            id: 'premium',
            name: 'Premium',
            price: 19900,
            period: '월',
            icon: Crown,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
            features: [
                '무제한 코인 추적',
                'AI 기반 투자 추천',
                '무제한 가격 알림',
                '1년 히스토리 데이터',
                '전문가 분석 리포트',
                '맞춤형 투자 전략',
                '1:1 전담 상담',
                'API 접근 권한'
            ],
            limits: {
                watchlist: 999,
                newsAnalysis: 'ai_powered',
                alerts: 'unlimited',
                historicalData: '1년',
                apiCalls: 10000
            },
            recommended: false,
            description: '전문 투자자 & 기관용'
        }
    ]

    const handleUpgrade = async (planId) => {
        if (planId === currentPlan) return

        setLoading(planId)

        try {
            if (onUpgrade) {
                const success = await onUpgrade(planId)
                if (success) {
                    alert(`${planId.toUpperCase()} 플랜으로 업그레이드 완료!`)
                } else {
                    alert('업그레이드에 실패했습니다. 다시 시도해주세요.')
                }
            }
        } catch (error) {
            console.error('업그레이드 실패:', error)
            alert('업그레이드 중 오류가 발생했습니다.')
        } finally {
            setLoading(null)
        }
    }

    const formatPrice = (price) => {
        return new Intl.NumberFormat('ko-KR').format(price)
    }

    return (
        <div className="space-y-8">
            {/* 헤더 */}
            <div className="text-center">
                <h2 className="text-3xl font-bold mb-4">투자 수익을 극대화하세요</h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    CryptoWise의 강력한 기능으로 더 많은 코인을 추적하고, AI 추천을 받아 연 15-25% 수익을 목표로 하세요.
                </p>
            </div>

            {/* 플랜 카드들 */}
            <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                {plans.map(plan => {
                    const Icon = plan.icon
                    const isCurrentPlan = currentPlan === plan.id
                    const canUpgrade = plan.id !== 'free'

                    return (
                        <Card
                            key={plan.id}
                            className={`relative transition-all hover:shadow-lg ${plan.recommended ? 'ring-2 ring-blue-500 scale-105' : ''
                                } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}
                        >
                            {plan.recommended && (
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                        추천
                                    </span>
                                </div>
                            )}

                            {isCurrentPlan && (
                                <div className="absolute -top-3 right-4">
                                    <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                                        현재 플랜
                                    </span>
                                </div>
                            )}

                            <CardHeader className="text-center pb-4">
                                <div className={`mx-auto w-12 h-12 rounded-full ${plan.bgColor} flex items-center justify-center mb-4`}>
                                    <Icon className={`h-6 w-6 ${plan.color}`} />
                                </div>

                                <CardTitle className="text-xl">{plan.name}</CardTitle>
                                <div className="text-sm text-gray-500">{plan.description}</div>

                                <div className="mt-4">
                                    {plan.price === 0 ? (
                                        <div className="text-3xl font-bold">무료</div>
                                    ) : (
                                        <div className="flex items-baseline justify-center">
                                            <span className="text-3xl font-bold">₩{formatPrice(plan.price)}</span>
                                            <span className="text-gray-500 ml-1">/{plan.period}</span>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                {/* 주요 한계 정보 */}
                                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                                    <div className="grid grid-cols-2 gap-2 text-center">
                                        <div>
                                            <div className="font-medium text-lg">{plan.limits.watchlist}</div>
                                            <div className="text-gray-500">추적 코인</div>
                                        </div>
                                        <div>
                                            <div className="font-medium text-lg">{plan.limits.alerts === 'unlimited' ? '∞' : plan.limits.alerts}</div>
                                            <div className="text-gray-500">알림</div>
                                        </div>
                                    </div>
                                </div>

                                {/* 기능 목록 */}
                                <ul className="space-y-2">
                                    {plan.features.map((feature, index) => (
                                        <li key={index} className="flex items-start space-x-2">
                                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {/* 액션 버튼 */}
                                <div className="pt-4">
                                    {isCurrentPlan ? (
                                        <Button
                                            className="w-full"
                                            variant="outline"
                                            disabled
                                        >
                                            현재 사용 중
                                        </Button>
                                    ) : canUpgrade ? (
                                        <Button
                                            onClick={() => handleUpgrade(plan.id)}
                                            className={`w-full ${plan.recommended
                                                    ? 'bg-blue-600 hover:bg-blue-700'
                                                    : plan.id === 'premium'
                                                        ? 'bg-purple-600 hover:bg-purple-700'
                                                        : ''
                                                }`}
                                            disabled={loading === plan.id}
                                        >
                                            {loading === plan.id ? (
                                                <div className="flex items-center space-x-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    <span>업그레이드 중...</span>
                                                </div>
                                            ) : (
                                                `${plan.name}으로 업그레이드`
                                            )}
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full"
                                            variant="outline"
                                        >
                                            현재 플랜
                                        </Button>
                                    )}
                                </div>

                                {/* 예상 수익률 */}
                                {plan.id !== 'free' && (
                                    <div className="text-center text-sm text-gray-500 pt-2">
                                        💡 예상 연 수익률: {plan.id === 'pro' ? '15-20%' : '20-25%+'}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* 하단 정보 */}
            <div className="text-center text-sm text-gray-500 max-w-2xl mx-auto">
                <p>
                    • 모든 플랜은 언제든 취소 가능합니다 <br />
                    • 업그레이드 시 즉시 적용되며, 30일 환불 보장 <br />
                    • 결제는 한국 신용카드, 계좌이체 지원
                </p>
            </div>
        </div>
    )
}
