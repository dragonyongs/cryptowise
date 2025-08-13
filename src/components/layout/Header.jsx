// src/components/layout/Header.jsx
import { TrendingUp, User } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/contexts/ThemeContext'
import Navigation from './Navigation'
import UserProfile from './UserProfile'

export default function Header({ user, profile, onLoginClick, activeTab, setActiveTab }) {
    const { signOut } = useAuth()
    const { dark, toggle } = useTheme()

    return (
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
                {/* Logo */}
                <div className="flex items-center space-x-2">
                    <TrendingUp className="h-8 w-8 text-blue-600" />
                    <span className="text-xl font-bold">CryptoWise</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">v2.0</span>
                </div>

                <Navigation
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    user={user}
                />

                {/* User Controls */}
                <div className="flex items-center space-x-3">
                    {user ? (
                        <>
                            <UserProfile profile={profile} />
                            <Button variant="outline" onClick={signOut}>
                                로그아웃
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" onClick={onLoginClick}>
                            로그인
                        </Button>
                    )}

                    <Button variant="secondary" onClick={toggle}>
                        {dark ? '☀️' : '🌙'}
                    </Button>
                </div>
            </div>
        </header>
    )
}
