// src/App.jsx
import { useState } from 'react'
import { TrendingUp } from 'lucide-react'

function App() {
  const [darkMode, setDarkMode] = useState(false)

  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
    document.documentElement.classList.toggle('dark')
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      {/* ✅ dark: 접두어를 className에서 직접 사용 */}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">

        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-blue-600" />
                <h1 className="text-xl font-bold">CryptoWise</h1>
              </div>
              <div className="space-x-2">
                <button
                  onClick={toggleDarkMode}
                  className="btn-secondary"
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
                <button className="btn-primary">
                  시작하기
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* ✅ card 클래스 사용 + dark: 접두어 */}
            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Bitcoin</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">BTC</p>
                </div>
                <span className="badge-blue">보유중</span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>현재가:</span>
                  <span className="font-mono">₩89,500,000</span>
                </div>
                <div className="flex justify-between">
                  <span>24h 변동:</span>
                  <span className="price-up">+3.24%</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="btn-success flex-1">매수</button>
                <button className="btn-danger flex-1">매도</button>
              </div>
            </div>

            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Ethereum</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">ETH</p>
                </div>
                <span className="badge-green">추천</span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>현재가:</span>
                  <span className="font-mono">₩4,250,000</span>
                </div>
                <div className="flex justify-between">
                  <span>24h 변동:</span>
                  <span className="price-down">-1.89%</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <button className="btn-success flex-1">매수</button>
                <button className="btn-danger flex-1">매도</button>
              </div>
            </div>

            <div className="card dark:bg-gray-800 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">포트폴리오</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>총 자산:</span>
                  <span className="font-mono font-semibold">₩12,450,000</span>
                </div>
                <div className="flex justify-between">
                  <span>총 수익률:</span>
                  <span className="price-up">+15.7%</span>
                </div>
                <div className="flex justify-between">
                  <span>오늘 손익:</span>
                  <span className="price-down">-2.3%</span>
                </div>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  )
}

export default App
