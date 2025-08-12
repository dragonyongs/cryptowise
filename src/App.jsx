import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import DashboardMain from '@/features/dashboard/DashboardMain'
import BacktestRunner from '@/features/testing/BacktestRunner'

export default function App() {
  const [dark, setDark] = useState(false)
  const toggle = () => {
    setDark(!dark)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className={dark ? 'dark' : ''}>
      {/* ---------- Layout ---------- */}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">

        {/* HEADER */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold">CryptoWise</span>
            </div>

            <nav className="flex space-x-4">
              <a href="#dashboard" className="hover:underline">대시보드</a>
              <a href="#backtest" className="hover:underline">백테스트</a>
              <Button variant="secondary" onClick={toggle}>
                {dark ? '☀️ 라이트' : '🌙 다크'}
              </Button>
            </nav>
          </div>
        </header>

        {/* MAIN */}
        <main className="max-w-7xl mx-auto p-8 space-y-12">

          {/* Dashboard Section */}
          <section id="dashboard">
            <h2 className="text-2xl font-semibold mb-4">실시간 시세</h2>
            <DashboardMain />
          </section>

          {/* Backtest Section */}
          <section id="backtest">
            <h2 className="text-2xl font-semibold mb-4">전략 백테스트</h2>
            <BacktestRunner />
          </section>

        </main>
      </div>
    </div>
  )
}
