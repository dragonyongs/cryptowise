// src/components/layout/MainContent.jsx
import { useWatchlist } from '@/hooks/useWatchlist'
import TabContentManager from './TabContentManager'
import UserSummarySection from './UserSummarySection'

export default function MainContent({ activeTab, user, profile, onLoginClick }) {
    const { watchlist } = useWatchlist()

    return (
        <main className="max-w-7xl mx-auto p-4 md:p-8">
            {/* 사용자 요약 정보 */}
            {user && profile && (
                <UserSummarySection
                    profile={profile}
                    watchlist={watchlist}
                />
            )}

            {/* 탭별 콘텐츠 */}
            <TabContentManager
                activeTab={activeTab}
                user={user}
                profile={profile}
                watchlist={watchlist}
                onLoginClick={onLoginClick}
            />
        </main>
    )
}
