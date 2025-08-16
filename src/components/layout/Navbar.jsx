import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "../../stores/authStore";
import {
  HomeIcon,
  CogIcon,
  ChartBarIcon,
  PlayIcon,
  BriefcaseIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  CpuChipIcon,
  ChevronDownIcon,
  Cog6ToothIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

export default function Navbar() {
  const location = useLocation();
  const { user, signOut } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navigation = [
    {
      name: "대시보드",
      href: "/",
      icon: HomeIcon,
      badge: null,
      description: "전체 현황 보기",
    },
    {
      name: "전략 빌더",
      href: "/strategy",
      icon: CogIcon,
      badge: "NEW",
      description: "투자 전략 설정",
    },
    {
      name: "코인 분석",
      href: "/analysis",
      icon: ChartBarIcon,
      badge: null,
      description: "AI 다차원 분석",
    },
    {
      name: "백테스팅",
      href: "/backtesting",
      icon: AdjustmentsHorizontalIcon,
      badge: null,
      description: "전략 성과 검증",
    },
    {
      name: "자동매매",
      href: "/trading",
      icon: PlayIcon,
      badge: "3",
      description: "실시간 자동 거래",
    },
    {
      name: "페이퍼 트레이딩",
      href: "/papertrading",
      icon: PlayIcon,
      badge: "0",
      description: "테스트 자동 거래",
    },
    {
      name: "포트폴리오",
      href: "/portfolio",
      icon: BriefcaseIcon,
      badge: null,
      description: "자산 현황 관리",
    },
  ];

  return (
    <div className="fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-xl border-r border-crypto-neutral-200">
      <div className="flex flex-col h-full">
        {/* 로고 영역 */}
        <div className="flex items-center h-16 px-6 bg-gradient-to-r from-crypto-primary-600 to-crypto-primary-700">
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center cursor-pointer"
            onClick={() => (window.location.href = "/")}
          >
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <CpuChipIcon className="w-6 h-6 text-white" />
            </div>
            <div className="ml-3">
              <div className="text-white font-bold text-lg">CryptoWise</div>
              <div className="text-white/80 text-xs">AI Trading System</div>
            </div>
          </motion.div>
        </div>

        {/* 네비게이션 메뉴 */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <motion.div
                key={item.name}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  to={item.href}
                  className={`group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-crypto-primary-500 text-white shadow-lg shadow-crypto-primary-500/25"
                      : "text-crypto-neutral-700 hover:bg-crypto-neutral-100 hover:text-crypto-primary-600"
                  }`}
                  title={item.description}
                >
                  <div className="flex items-center">
                    <item.icon
                      className={`mr-3 h-5 w-5 transition-colors ${
                        isActive
                          ? "text-white"
                          : "text-crypto-neutral-500 group-hover:text-crypto-primary-500"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>

                  {item.badge && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        item.badge === "NEW"
                          ? "bg-crypto-success-100 text-crypto-success-700"
                          : isActive
                            ? "bg-white/20 text-white"
                            : "bg-crypto-danger-100 text-crypto-danger-700"
                      }`}
                    >
                      {item.badge}
                    </motion.span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        {/* 하단 사용자 정보 */}
        <div className="p-4 border-t border-crypto-neutral-200">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center p-3 rounded-xl hover:bg-crypto-neutral-100 transition-colors group focus:outline-none focus:ring-2 focus:ring-crypto-primary-500"
            >
              <img
                className="h-10 w-10 rounded-full ring-2 ring-crypto-primary-100 object-cover"
                src={user?.image || "https://via.placeholder.com/40?text=U"}
                alt={user?.name}
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/40?text=U";
                }}
              />
              <div className="ml-3 flex-1 text-left">
                <div className="text-sm font-semibold text-crypto-neutral-900 truncate">
                  {user?.name || "사용자"}
                </div>
                <div className="text-xs text-crypto-neutral-500 flex items-center">
                  <span className="w-2 h-2 bg-crypto-success-500 rounded-full mr-1 animate-pulse"></span>
                  {user?.tier || "Premium"} 플랜
                </div>
              </div>
              <ChevronDownIcon
                className={`h-4 w-4 text-crypto-neutral-400 transition-transform duration-200 ${
                  showUserMenu ? "rotate-180" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-crypto-neutral-200 rounded-xl shadow-lg overflow-hidden z-50"
                >
                  <div className="py-2">
                    <Link
                      to="/profile"
                      className="flex items-center px-4 py-3 text-sm text-crypto-neutral-700 hover:bg-crypto-neutral-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <UserIcon className="w-4 h-4 mr-3" />
                      프로필 설정
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center px-4 py-3 text-sm text-crypto-neutral-700 hover:bg-crypto-neutral-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Cog6ToothIcon className="w-4 h-4 mr-3" />
                      환경 설정
                    </Link>
                    <Link
                      to="/notifications"
                      className="flex items-center px-4 py-3 text-sm text-crypto-neutral-700 hover:bg-crypto-neutral-50 transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <BellIcon className="w-4 h-4 mr-3" />
                      알림 설정
                    </Link>
                    <div className="border-t border-crypto-neutral-200 my-2"></div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut();
                      }}
                      className="w-full flex items-center px-4 py-3 text-sm text-crypto-danger-600 hover:bg-crypto-danger-50 transition-colors"
                    >
                      <ArrowRightOnRectangleIcon className="w-4 h-4 mr-3" />
                      로그아웃
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
