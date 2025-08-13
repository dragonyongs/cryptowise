// src/components/layout/TabContentManager.jsx
import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TrendingUp, User } from 'lucide-react'

// Feature 컴포넌트들
import DashboardMain from '@/features/dashboard/DashboardMain'
import PersonalizedDashboard from '@/features/dashboard/PersonalizedDashboard'
import BacktestRunner from '@/features/testing/BacktestRunner'
import NewsSection from '@/features/news/NewsSection'
import TodayRecommendations from '@/features/analysis/TodayRecommendations'
import CoinControls from '@/features/settings/CoinControls'
import CoinSearch from '@/components/CoinSearch'
import PricingTier from '@/components/PricingTier'

export default function TabContentManager({
    activeTab,
    user,
    profile,
    watchlist,
    onLoginClick,
    onUpgradeClick
}) {
    return (
        <div className="space-y-8">
            {activeTab === 'dashboard' && (
                <section>
                    {user && profile ? (
                        <PersonalizedDashboard />
                    ) : (
                        <PublicDashboard onLoginClick={onLoginClick} />
                    )}
                </section>
            )}

            {activeTab === 'search' && (
                <section>
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-2xl font-bold">코인 검색 & 추가</h2>
                            {user && (
                                <div className="text-sm text-gray-500">
                                    {watchlist.length}/{profile?.watchlist_limit || 5} 사용 중
                                </div>
                            )}
                        </div>
                        <CoinSearch requireLogin={!user} onLoginClick={onLoginClick} />
                    </div>
                </section>
            )}

            {activeTab === 'recommendations' && (
                <section>
                    <TodayRecommendations
                        userProfile={profile}
                        requireLogin={!user}
                        onLoginClick={onLoginClick}
                    />
                </section>
            )}

            {activeTab === 'news' && (
                <section>
                    <NewsSection
                        watchlist={user ? watchlist : []}
                        requireLogin={!user}
                        onLoginClick={onLoginClick}
                    />
                </section>
            )}

            {activeTab === 'controls' && (
                <section>
                    {user ? (
                        <CoinControls
                            coins={watchlist}
                            onConfigUpdate={(symbol, config) => {
                                console.log(`${symbol} 설정 업데이트:`, config)
                            }}
                        />
                    ) : (
                        <LoginRequiredPlaceholder onLoginClick={onLoginClick} />
                    )}
                </section>
            )}

            {activeTab === 'backtest' && (
                <section>
                    {user ? (
                        <BacktestRunner watchlist={watchlist} profile={profile} />
                    ) : (
                        <LoginRequiredPlaceholder onLoginClick={onLoginClick} />
                    )}
                </section>
            )}

            {activeTab === 'upgrade' && user && (
                <section>
                    <div className="space-y-6">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold mb-2">더 많은 코인을 추적하세요</h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                프로 플랜으로 업그레이드하여 투자 기회를 확대하세요
                            </p>
                        </div>
                        <PricingTier
                            currentPlan={profile?.plan_type}
                            onUpgrade={onUpgradeClick}
                        />
                    </div>
                </section>
            )}
        </div>
    )
}

// 공개 대시보드 컴포넌트
function PublicDashboard({ onLoginClick }) {
    return (
        <div className="space-y-6">
            <DashboardMain />

            <Card className="border-2 border-dashed border-blue-200 dark:border-blue-800">
                <CardContent className="p-8 text-center">
                    <TrendingUp className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">개인 맞춤 분석을 받아보세요</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        로그인하면 나만의 포트폴리오 추적과 AI 추천을 받을 수 있습니다
                    </p>
                    <Button onClick={onLoginClick} className="bg-blue-600 hover:bg-blue-700">
                        무료로 시작하기
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

// 로그인 필요 플레이스홀더
function LoginRequiredPlaceholder({ onLoginClick }) {
    return (
        <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700">
            <CardContent className="p-12 text-center">
                <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">로그인이 필요합니다</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    이 기능을 사용하려면 먼저 로그인해주세요
                </p>
                <Button onClick={onLoginClick} variant="outline">
                    로그인하기
                </Button>
            </CardContent>
        </Card>
    )
}
