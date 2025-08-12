// src/pages/Login.jsx

import { signIn, getSession } from 'next-auth/react'
import { useState } from 'react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    // 이메일/패스워드 로그인
    const handleCredentialsLogin = async (e) => {
        e.preventDefault()

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false
        })

        if (result?.error) {
            alert('로그인 실패')
        } else {
            window.location.href = '/dashboard'
        }
    }

    // Google 로그인
    const handleGoogleLogin = () => {
        signIn('google', { callbackUrl: '/dashboard' })
    }

    return (
        <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
            <h1 className="text-2xl font-bold mb-6">CryptoWise 로그인</h1>

            {/* 이메일/패스워드 로그인 폼 */}
            <form onSubmit={handleCredentialsLogin} className="mb-6">
                <div className="mb-4">
                    <input
                        type="email"
                        placeholder="이메일"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 border rounded-md"
                        required
                    />
                </div>
                <div className="mb-4">
                    <input
                        type="password"
                        placeholder="패스워드"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 border rounded-md"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white p-3 rounded-md hover:bg-blue-700"
                >
                    로그인
                </button>
            </form>

            {/* 구분선 */}
            <div className="flex items-center mb-6">
                <hr className="flex-1" />
                <span className="px-4 text-gray-500">또는</span>
                <hr className="flex-1" />
            </div>

            {/* Google 로그인 버튼 */}
            <button
                onClick={handleGoogleLogin}
                className="w-full bg-red-600 text-white p-3 rounded-md hover:bg-red-700 flex items-center justify-center"
            >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    {/* Google 아이콘 */}
                </svg>
                Google로 로그인
            </button>
        </div>
    )
}
