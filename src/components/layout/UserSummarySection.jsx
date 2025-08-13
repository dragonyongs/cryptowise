// src/components/layout/UserSummarySection.jsx
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import SignalAlerts from '@/features/signals/SignalAlerts'

export default function UserSummarySection({ profile, watchlist, onUpgradeClick }) {
    return (
        <div className="mb-6 space-y-4">
            <SignalAlerts />

            <Card>
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div>
                                <h3 className="font-semibold">포트폴리오 현황</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {watchlist.length}/{profile?.watchlist_limit || 5} 코인 추적 중
                                </p>
                            </div>
                        </div>

                        {profile?.plan_type === 'free' && watchlist.length >= 3 && (
                            <Button
                                onClick={onUpgradeClick}
                                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                            >
                                업그레이드 →
                            </Button>
                        )}
                    </div>

                    {/* 진행률 바 */}
                    <div className="mt-3">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{
                                    width: `${Math.min(100, (watchlist.length / (profile?.watchlist_limit || 5)) * 100)}%`
                                }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
