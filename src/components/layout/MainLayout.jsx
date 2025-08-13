// src/components/layout/MainLayout.jsx
import { useState } from 'react'
import Header from './Header'
import MainContent from './MainContent'
import { useTheme } from '@/contexts/ThemeContext'

export default function MainLayout({ user, profile, onLoginClick }) {
    const [activeTab, setActiveTab] = useState('dashboard')
    const { dark } = useTheme()

    return (
        <div className={dark ? 'dark' : ''}>
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
                <Header
                    user={user}
                    profile={profile}
                    onLoginClick={onLoginClick}
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                />

                <MainContent
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    user={user}
                    profile={profile}
                    onLoginClick={onLoginClick}
                />
            </div>
        </div>
    )
}
