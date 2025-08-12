// src/App.jsx
import { useState, useEffect } from 'react'
import { TrendingUp, Newspaper, Filter, Settings, Activity } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

// 기존 컴포넌트
import DashboardMain from '@/features/dashboard/DashboardMain'
import BacktestRunner from '@/features/testing/BacktestRunner'

// 새로 추가할 컴포넌트들
import NewsSection from '@/features/news/NewsSection'
import TodayRecommendations from '@/features/analysis/TodayRecommendations'
import SignalAlerts from '@/features/signals/SignalAlerts'
import CoinControls from '@/features/settings/CoinControls'

export default function App() {
  const [coins, setCoins] = useState([])
  const [dark, setDark] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')

  // 기본 코인 데이터 설정
  useEffect(() => {
    const defaultCoins = [
      { symbol: 'BTC', name: 'Bitcoin', balance: 0 },
      { symbol: 'ETH', name: 'Ethereum', balance: 0 },
      { symbol: 'SOL', name: 'Solana', balance: 0 }
    ]
    setCoins(defaultCoins)
  }, [])

  const toggle = () => {
    setDark(!dark)
    document.documentElement.classList.toggle('dark')
  }

  const handleConfigUpdate = (symbol, config) => {
    console.log(`${symbol} 설정 업데이트:`, config)
    // 여기서 Supabase나 로컬스토리지에 저장
  }

  const tabs = [
    { id: 'dashboard', label: '대시보드', icon: TrendingUp },
    { id: 'recommendations', label: '추천 코인', icon: Filter },
    { id: 'news', label: '뉴스 분석', icon: Newspaper },
    { id: 'controls', label: '코인 설정', icon: Settings },
    { id: 'backtest', label: '백테스팅', icon: Activity }
  ]

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">

        {/* HEADER */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold">CryptoWise</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">v2.0</span>
            </div>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex space-x-1">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === tab.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>

            <Button variant="secondary" onClick={toggle}>
              {dark ? '☀️ 라이트' : '🌙 다크'}
            </Button>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700">
            <nav className="flex overflow-x-auto">
              {tabs.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-shrink-0 flex items-center space-x-2 px-4 py-3 text-sm transition-colors ${activeTab === tab.id
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 dark:text-gray-400'
                      }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="max-w-7xl mx-auto p-4 md:p-8">

          {/* 실시간 신호 알림 (모든 탭에서 표시) */}
          <div className="mb-6">
            <SignalAlerts />
          </div>

          {/* Tab Content */}
          <div className="space-y-8">
            {activeTab === 'dashboard' && (
              <section>
                <DashboardMain />
              </section>
            )}

            {activeTab === 'recommendations' && (
              <section>
                <TodayRecommendations />
              </section>
            )}

            {activeTab === 'news' && (
              <section>
                <NewsSection />
              </section>
            )}

            {activeTab === 'controls' && (
              <section>
                <CoinControls
                  coins={coins}
                  onConfigUpdate={handleConfigUpdate}
                />
              </section>
            )}

            {activeTab === 'backtest' && (
              <section>
                <BacktestRunner />
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
