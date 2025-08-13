// src/components/auth/OnboardingFlow.jsx - 모던 미니멀 버전
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { TrendingUp, ArrowRight, Check } from 'lucide-react'

export default function OnboardingFlow({ onComplete, onSkip, user }) {
    const [step, setStep] = useState(1)
    const [formData, setFormData] = useState({
        investment_experience: '',
        interests: [],
        risk_tolerance: 5
    })

    const handleComplete = () => {
        if (!formData.investment_experience) {
            alert('투자 경험을 선택해주세요')
            return
        }
        onComplete(formData)
    }

    const handleNext = () => {
        if (step === 1 && !formData.investment_experience) {
            alert('투자 경험을 선택해주세요')
            return
        }
        setStep(step + 1)
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-white dark:bg-gray-900">
            <div className="w-full max-w-xl">
                <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
                    <CardHeader className="text-center space-y-4 pb-6">
                        {/* 로고 - 심플하게 */}
                        <div className="mx-auto w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-white" />
                        </div>

                        <div className="space-y-2">
                            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                                안녕하세요, {user?.email?.split('@')[0]}님
                            </CardTitle>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                맞춤 서비스 제공을 위해 몇 가지 질문에 답해주세요
                            </p>
                        </div>

                        {/* 진행률 - 미니멀 */}
                        <div className="flex items-center justify-center space-x-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full transition-colors ${i <= step ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                        }`} />
                                    {i < 3 && <div className="w-8 h-px bg-gray-300 dark:bg-gray-600 mx-2" />}
                                </div>
                            ))}
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="text-center space-y-1">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        투자 경험을 알려주세요
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        맞춤 분석을 위해 필요합니다
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {[
                                        {
                                            value: 'beginner',
                                            title: '초보자',
                                            desc: '1년 미만'
                                        },
                                        {
                                            value: 'intermediate',
                                            title: '중급자',
                                            desc: '1-3년'
                                        },
                                        {
                                            value: 'expert',
                                            title: '전문가',
                                            desc: '3년 이상'
                                        }
                                    ].map(level => (
                                        <button
                                            key={level.value}
                                            onClick={() => setFormData({ ...formData, investment_experience: level.value })}
                                            className={`w-full p-4 text-left rounded-lg border transition-all ${formData.investment_experience === level.value
                                                ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-500'
                                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <div className={`font-medium ${formData.investment_experience === level.value
                                                        ? 'text-blue-900 dark:text-blue-100'
                                                        : 'text-gray-900 dark:text-gray-100'
                                                        }`}>
                                                        {level.title}
                                                    </div>
                                                    <div className={`text-sm ${formData.investment_experience === level.value
                                                        ? 'text-blue-700 dark:text-blue-300'
                                                        : 'text-gray-500 dark:text-gray-400'
                                                        }`}>
                                                        투자 경험 {level.desc}
                                                    </div>
                                                </div>
                                                {formData.investment_experience === level.value && (
                                                    <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <div className="text-center space-y-1">
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                        관심 분야를 선택하세요
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        복수 선택 가능
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: 'technical_analysis', title: '기술적 분석' },
                                        { value: 'news', title: '뉴스·시장동향' },
                                        { value: 'defi', title: 'DeFi' },
                                        { value: 'nft', title: 'NFT·메타버스' }
                                    ].map(interest => {
                                        const isSelected = formData.interests.includes(interest.value)
                                        return (
                                            <button
                                                key={interest.value}
                                                onClick={() => {
                                                    const newInterests = isSelected
                                                        ? formData.interests.filter(i => i !== interest.value)
                                                        : [...formData.interests, interest.value]
                                                    setFormData({ ...formData, interests: newInterests })
                                                }}
                                                className={`p-4 text-center rounded-lg border transition-all ${isSelected
                                                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:border-blue-500'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                                    }`}
                                            >
                                                <div className={`font-medium text-sm ${isSelected
                                                    ? 'text-blue-900 dark:text-blue-100'
                                                    : 'text-gray-900 dark:text-gray-100'
                                                    }`}>
                                                    {interest.title}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="text-center space-y-6">
                                <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        설정이 완료되었습니다
                                    </h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        이제 맞춤형 암호화폐 분석을 받아보실 수 있습니다
                                    </p>
                                </div>

                                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                                    <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 mb-3">
                                        무료 플랜 포함 기능
                                    </h4>
                                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                        <li>• 최대 5개 코인 추적</li>
                                        <li>• 기본 기술적 분석</li>
                                        <li>• 실시간 가격 알림</li>
                                        <li>• 개인 맞춤 추천</li>
                                    </ul>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-between pt-4">
                            <Button
                                variant="ghost"
                                onClick={onSkip}
                                className="text-gray-500 dark:text-gray-400"
                            >
                                건너뛰기
                            </Button>

                            {step < 3 ? (
                                <Button
                                    onClick={handleNext}
                                    disabled={step === 1 && !formData.investment_experience}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    계속
                                    <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleComplete}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    시작하기
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
