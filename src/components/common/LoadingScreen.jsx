// src/components/common/LoadingScreen.jsx - 다크모드 개선
import { TrendingUp } from 'lucide-react'

export default function LoadingScreen({
    message = "사용자 정보를 불러오는 중...",
    variant = "full"
}) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 transition-colors duration-300">
            <div className="flex flex-col items-center space-y-6 p-8">
                {/* 로고 애니메이션 with 글로우 효과 */}
                <div className="relative">
                    <div className="absolute inset-0 h-16 w-16 bg-blue-600 rounded-full opacity-20 animate-ping"></div>
                    <div className="relative">
                        <TrendingUp className="h-12 w-12 text-blue-600 animate-pulse" />
                        <div className="absolute inset-0 h-12 w-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                </div>

                {/* 로딩 텍스트 - 다크모드 대응 */}
                <div className="text-center space-y-3">
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        CryptoWise
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xs leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* 개선된 로딩 도트 애니메이션 */}
                <div className="flex space-x-2">
                    {[0, 1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full animate-bounce shadow-sm"
                            style={{
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: '1.2s'
                            }}
                        />
                    ))}
                </div>

                {/* 진행률 바 애니메이션 */}
                <div className="w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse"></div>
                </div>

                {/* 힌트 텍스트 */}
                <div className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-sm">
                    <p className="animate-pulse">최고의 암호화폐 분석 경험을 준비하고 있습니다</p>
                </div>
            </div>
        </div>
    )
}

// 특별 상황용 로딩 화면들
export function AuthLoadingScreen() {
    return (
        <LoadingScreen message="안전한 로그인을 진행하고 있습니다..." />
    )
}

export function OnboardingLoadingScreen() {
    return (
        <LoadingScreen message="개인 맞춤 설정을 준비하고 있습니다..." />
    )
}
