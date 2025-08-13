// src/components/layout/Navigation.jsx
import { NAVIGATION_TABS } from '@/constants/navigation'

export default function Navigation({ activeTab, onTabChange, user }) {
    // 사용자 상태에 따라 탭 라벨 동적 변경
    const getTabLabel = (tab) => {
        if (tab.id === 'dashboard') {
            return user ? '나의 포트폴리오' : '대시보드'
        }
        return tab.label
    }

    return (
        <>
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
                {NAVIGATION_TABS.map(tab => {
                    const Icon = tab.icon
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === tab.id
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            <span>{getTabLabel(tab)}</span>
                        </button>
                    )
                })}
            </nav>

            {/* Mobile Navigation */}
            <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
                <nav className="flex overflow-x-auto">
                    {NAVIGATION_TABS.map(tab => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => onTabChange(tab.id)}
                                className={`flex-shrink-0 flex items-center space-x-2 px-4 py-3 text-sm transition-colors ${activeTab === tab.id
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 dark:text-gray-400'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{getTabLabel(tab)}</span>
                            </button>
                        )
                    })}
                </nav>
            </div>
        </>
    )
}
