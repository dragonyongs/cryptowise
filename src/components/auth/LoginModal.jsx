// src/components/auth/LoginModal.jsx
import { useState } from 'react'
import { TrendingUp, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { useAuth } from '@/hooks/useAuth'

export default function LoginModal({ onClose, onSuccess }) {
    const [loading, setLoading] = useState(false)
    const { supabase } = useAuth()

    const handleGoogleLogin = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin
                }
            })

            if (error) {
                console.error('Google 로그인 에러:', error)
            } else {
                onSuccess()
            }
        } catch (error) {
            console.error('로그인 실패:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="h-5 w-5" />
                </button>

                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <TrendingUp className="h-12 w-12 text-blue-600" />
                    </div>
                    <CardTitle className="text-2xl">CryptoWise에 오신 것을 환영합니다</CardTitle>
                    <p className="text-gray-600 mt-2">개인 맞춤형 암호화폐 투자 플랫폼</p>
                </CardHeader>

                <CardContent className="space-y-4">
                    <Button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-2"
                    >
                        <span>🔗</span>
                        <span>{loading ? '로그인 중...' : 'Google로 시작하기'}</span>
                    </Button>

                    <div className="text-center text-sm text-gray-500">
                        무료로 시작 • 5개 코인 추적 가능
                    </div>

                    <div className="text-center">
                        <button
                            onClick={onClose}
                            className="text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                            둘러보기 계속하기
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
