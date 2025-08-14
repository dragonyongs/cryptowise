import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    CogIcon,
    ChartBarIcon,
    ClockIcon,
    PlayIcon,
    PlusIcon
} from '@heroicons/react/24/outline';

export default function StrategyCards() {
    const actionCards = [
        {
            title: '전략 설정',
            description: '나만의 투자 전략을 설계하세요',
            icon: CogIcon,
            link: '/strategy',
            color: 'crypto-primary',
            status: '새로 만들기'
        },
        {
            title: '코인 분석',
            description: 'AI 기반 다차원 분석 결과를 확인하세요',
            icon: ChartBarIcon,
            link: '/analysis',
            color: 'crypto-success',
            status: '실시간 분석'
        },
        {
            title: '백테스팅',
            description: '과거 데이터로 전략 성과를 검증하세요',
            icon: ClockIcon,
            link: '/backtesting',
            color: 'crypto-warning',
            status: '성과 검증'
        },
        {
            title: '자동매매',
            description: '검증된 전략으로 자동매매를 실행하세요',
            icon: PlayIcon,
            link: '/trading',
            color: 'crypto-danger',
            status: '실전 투자'
        }
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
        >
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-crypto-neutral-900">
                    투자 워크플로우
                </h2>
                <span className="text-sm text-crypto-neutral-500">
                    단계별 가이드
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {actionCards.map((card, index) => (
                    <motion.div
                        key={card.title}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <Link
                            to={card.link}
                            className="block p-4 border border-crypto-neutral-200 rounded-lg hover:shadow-lg transition-all duration-200 group"
                        >
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className={`w-12 h-12 bg-${card.color}-50 rounded-lg flex items-center justify-center group-hover:bg-${card.color}-100 transition-colors`}>
                                    <card.icon className={`w-6 h-6 text-${card.color}-600`} />
                                </div>

                                <div className="space-y-1">
                                    <h3 className="font-semibold text-crypto-neutral-900 group-hover:text-crypto-primary-600 transition-colors">
                                        {card.title}
                                    </h3>
                                    <p className="text-xs text-crypto-neutral-600 leading-relaxed">
                                        {card.description}
                                    </p>
                                </div>

                                <span className={`text-xs px-2 py-1 rounded-full bg-${card.color}-50 text-${card.color}-700`}>
                                    {card.status}
                                </span>
                            </div>
                        </Link>
                    </motion.div>
                ))}
            </div>

            {/* 진행률 표시 */}
            <div className="mt-6 pt-6 border-t border-crypto-neutral-200">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-crypto-neutral-700">워크플로우 진행률</span>
                    <span className="text-sm text-crypto-neutral-600">2/4 단계 완료</span>
                </div>
                <div className="w-full bg-crypto-neutral-200 rounded-full h-2">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '50%' }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="bg-crypto-primary-500 h-2 rounded-full"
                    />
                </div>
            </div>
        </motion.div>
    );
}
