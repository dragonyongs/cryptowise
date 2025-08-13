// src/components/AppRouter.jsx - 다크모드 완전 지원 버전
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useTheme } from '@/contexts/ThemeContext'

import MainLayout from '@/components/layout/MainLayout'
import LoadingScreen from '@/components/common/LoadingScreen'
import LoginModal from '@/components/auth/LoginModal'
import OnboardingFlow from '@/components/auth/OnboardingFlow'

export default function AppRouter() {
    const [showLoginModal, setShowLoginModal] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)

    const { dark } = useTheme()
    const { user, loading: authLoading } = useAuth()
    const { profile, loading: profileLoading, updateUserProfile } = useUserProfile()

    // 온보딩 완료 상태 체크
    const isOnboardingComplete = (profile) => {
        return profile?.investment_experience && profile?.onboarding_completed === true
    }

    // 로그인 상태 관리
    useEffect(() => {
        if (authLoading || profileLoading) return

        if (user && !isOnboardingComplete(profile)) {
            setShowOnboarding(true)
            setShowLoginModal(false)
        } else if (user && isOnboardingComplete(profile)) {
            setShowOnboarding(false)
            setShowLoginModal(false)
        }
    }, [user, profile, authLoading, profileLoading])

    if (authLoading) {
        return (
            <div className={dark ? 'dark' : ''}>
                <LoadingScreen message="로그인 정보를 확인하고 있습니다..." />
            </div>
        )
    }

    if (profileLoading) {
        return (
            <div className={dark ? 'dark' : ''}>
                <LoadingScreen message="프로필을 불러오는 중..." />
            </div>
        )
    }

    if (showOnboarding) {
        return (
            <div className={dark ? 'dark' : ''}>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
                    <OnboardingFlow
                        onComplete={async (data) => {
                            await updateUserProfile(data)
                            setShowOnboarding(false)
                        }}
                        onSkip={async () => {
                            // 건너뛰기도 기본값으로 프로필 생성
                            await updateUserProfile({
                                investment_experience: 'beginner',
                                interests: [],
                                risk_tolerance: 5
                            })
                            setShowOnboarding(false)
                        }}
                        user={user}
                    />
                </div>
            </div>
        )
    }

    return (
        <div className={dark ? 'dark' : ''}>
            <MainLayout
                user={user}
                profile={profile}
                onLoginClick={() => setShowLoginModal(true)}
            />

            {showLoginModal && (
                <LoginModal
                    onClose={() => setShowLoginModal(false)}
                    onSuccess={() => setShowLoginModal(false)}
                />
            )}
        </div>
    )
}
