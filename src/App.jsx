import React, { Suspense, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "./stores/authStore";
import { useSystemStore } from "./stores/systemStore";

// Layout Components
import Layout from "./components/layout/Layout";
import LoadingSpinner from "./components/ui/LoadingSpinner";

// Pages - Lazy Loading
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const StrategyBuilder = React.lazy(() => import("./pages/StrategyBuilder"));
const CoinAnalysis = React.lazy(() => import("./pages/CoinAnalysis"));
const Backtesting = React.lazy(() => import("./pages/Backtesting"));
const AutoTrading = React.lazy(() => import("./pages/AutoTrading"));
const Portfolio = React.lazy(() => import("./pages/Portfolio"));
const Profile = React.lazy(() => import("./pages/Profile"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Notifications = React.lazy(() => import("./pages/Notifications"));
const CoinManagement = React.lazy(() => import("./pages/CoinManagement"));
const PaperTrading = React.lazy(
  () => import("./features/trading/PaperTrading")
);

// ✅ 수정된 애니메이션 설정
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.3,
      ease: "easeIn",
    },
  },
};

// ✅ 개선된 페이지 래퍼 컴포넌트
function PageWrapper({ children, className = "" }) {
  return (
    <motion.div
      key={children.type.name} // 각 페이지별 고유 키
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      className={`w-full min-h-screen dark:bg-gray-900 ${className}`}
    >
      {children}
    </motion.div>
  );
}

function App() {
  const { user, loading: authLoading } = useAuthStore();
  const { checkSystemHealth } = useSystemStore();

  useEffect(() => {
    // 앱 초기화 시 시스템 상태 체크
    checkSystemHealth();
  }, [checkSystemHealth]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-crypto-neutral-50 flex items-center justify-center">
        <LoadingSpinner message="시스템 초기화 중..." size="large" />
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Suspense
          fallback={
            <div className="min-h-screen bg-crypto-neutral-50 flex items-center justify-center">
              <LoadingSpinner message="페이지 로딩 중..." />
            </div>
          }
        >
          <AnimatePresence mode="wait" initial={false}>
            <Routes>
              <Route
                path="/"
                element={
                  user ? (
                    <PageWrapper>
                      <Dashboard />
                    </PageWrapper>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.6 }}
                    >
                      <LandingPage />
                    </motion.div>
                  )
                }
              />

              {/* ✅ 인증된 사용자 라우트들 */}
              {user && (
                <>
                  <Route
                    path="/strategy"
                    element={
                      <PageWrapper>
                        <StrategyBuilder />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/analysis"
                    element={
                      <PageWrapper>
                        <CoinAnalysis />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/backtesting"
                    element={
                      <PageWrapper>
                        <Backtesting />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/trading"
                    element={
                      <PageWrapper>
                        <AutoTrading />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/portfolio"
                    element={
                      <PageWrapper>
                        <Portfolio />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/profile"
                    element={
                      <PageWrapper>
                        <Profile />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <PageWrapper>
                        <Settings />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/notifications"
                    element={
                      <PageWrapper>
                        <Notifications />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/coins"
                    element={
                      <PageWrapper>
                        <CoinManagement />
                      </PageWrapper>
                    }
                  />
                  <Route
                    path="/papertrading"
                    element={
                      <PageWrapper>
                        <PaperTrading />
                      </PageWrapper>
                    }
                  />
                </>
              )}

              {/* 404 처리 */}
              <Route
                path="*"
                element={
                  user ? (
                    <PageWrapper>
                      <div className="min-h-screen bg-crypto-neutral-50 flex items-center justify-center">
                        <div className="text-center">
                          <h2 className="text-2xl font-bold text-crypto-neutral-800 mb-4">
                            페이지를 찾을 수 없습니다
                          </h2>
                          <button
                            onClick={() => (window.location.href = "/")}
                            className="bg-crypto-primary-500 text-white px-6 py-3 rounded-lg hover:bg-crypto-primary-600 transition-colors"
                          >
                            대시보드로 돌아가기
                          </button>
                        </div>
                      </div>
                    </PageWrapper>
                  ) : (
                    <Navigate to="/" replace />
                  )
                }
              />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </Layout>
    </Router>
  );
}

export default App;
