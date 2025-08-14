import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    HomeIcon,
    CogIcon,
    ChartBarIcon,
    PlayIcon,
    BriefcaseIcon
} from '@heroicons/react/24/outline';

export default function MobileNavbar() {
    const location = useLocation();

    const navigation = [
        {
            name: '홈',
            href: '/',
            icon: HomeIcon,
            badge: null
        },
        {
            name: '전략',
            href: '/strategy',
            icon: CogIcon,
            badge: 'NEW'
        },
        {
            name: '분석',
            href: '/analysis',
            icon: ChartBarIcon,
            badge: null
        },
        {
            name: '매매',
            href: '/trading',
            icon: PlayIcon,
            badge: '3'
        },
        {
            name: '자산',
            href: '/portfolio',
            icon: BriefcaseIcon,
            badge: null
        },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-crypto-neutral-200 shadow-lg">
            <div className="grid grid-cols-5 h-16">
                {navigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            className="flex flex-col items-center justify-center relative group"
                        >
                            {/* 활성 탭 인디케이터 */}
                            {isActive && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-crypto-primary-500 rounded-full"
                                    initial={false}
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}

                            <motion.div
                                whileTap={{ scale: 0.9 }}
                                className={`p-2 rounded-lg transition-all duration-200 ${isActive ? 'bg-crypto-primary-50' : 'group-active:bg-crypto-neutral-100'
                                    }`}
                            >
                                {/* 아이콘과 배지 영역 */}
                                <div className="relative">
                                    <item.icon className={`h-6 w-6 transition-colors duration-200 ${isActive
                                            ? 'text-crypto-primary-600'
                                            : 'text-crypto-neutral-400 group-active:text-crypto-primary-500'
                                        }`} />

                                    {/* 배지 */}
                                    {item.badge && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center"
                                        >
                                            <span className={`text-[10px] font-bold px-1 rounded-full ${item.badge === 'NEW'
                                                    ? 'bg-crypto-success-500 text-white'
                                                    : 'bg-crypto-danger-500 text-white'
                                                }`}>
                                                {item.badge}
                                            </span>
                                        </motion.div>
                                    )}
                                </div>

                                {/* 라벨 */}
                                <span className={`text-xs mt-1 font-medium transition-colors duration-200 ${isActive
                                        ? 'text-crypto-primary-600'
                                        : 'text-crypto-neutral-500 group-active:text-crypto-primary-500'
                                    }`}>
                                    {item.name}
                                </span>
                            </motion.div>

                            {/* 터치 피드백 효과 */}
                            <motion.div
                                className="absolute inset-0 bg-crypto-primary-500 rounded-lg opacity-0"
                                whileTap={{ opacity: 0.1 }}
                                transition={{ duration: 0.1 }}
                            />
                        </Link>
                    );
                })}
            </div>

            {/* 하단 safe area 대응 (iOS) */}
            <div className="h-0 pb-safe-bottom"></div>
        </div>
    );
}
