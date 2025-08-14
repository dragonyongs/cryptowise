import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BellIcon,
    InformationCircleIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';

export default function NotificationCenter({ notifications = [] }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [visibleNotifications, setVisibleNotifications] = useState(notifications);

    const getNotificationIcon = (type) => {
        const icons = {
            info: InformationCircleIcon,
            warning: ExclamationTriangleIcon,
            success: CheckCircleIcon,
            signalalert: BellIcon
        };
        return icons[type] || InformationCircleIcon;
    };

    const getNotificationColor = (priority) => {
        const colors = {
            urgent: 'crypto-danger',
            high: 'crypto-warning',
            medium: 'crypto-primary',
            low: 'crypto-neutral'
        };
        return colors[priority] || 'crypto-neutral';
    };

    const removeNotification = (id) => {
        setVisibleNotifications(prev => prev.filter(notif => notif.id !== id));
    };

    const mockNotifications = [
        {
            id: 1,
            type: 'signalalert',
            title: 'BTC 매수 신호',
            message: 'RSI 지표가 과매도 구간에서 반등 신호를 보이고 있습니다',
            priority: 'high',
            timestamp: '5분 전'
        },
        {
            id: 2,
            type: 'warning',
            title: 'ETH 주의 필요',
            message: '거래량이 평소보다 30% 감소했습니다',
            priority: 'medium',
            timestamp: '15분 전'
        },
        {
            id: 3,
            type: 'success',
            title: '백테스팅 완료',
            message: '스윙 전략 백테스트 결과: +18.5% 수익률',
            priority: 'medium',
            timestamp: '1시간 전'
        }
    ];

    const displayNotifications = visibleNotifications.length > 0 ? visibleNotifications : mockNotifications;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <BellIcon className="w-5 h-5 text-crypto-neutral-700" />
                    <h3 className="text-lg font-semibold text-crypto-neutral-900">
                        알림센터
                    </h3>
                    {displayNotifications.length > 0 && (
                        <span className="bg-crypto-primary-500 text-white text-xs px-2 py-1 rounded-full">
                            {displayNotifications.length}
                        </span>
                    )}
                </div>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-sm text-crypto-primary-600 hover:text-crypto-primary-700 transition-colors"
                >
                    {isExpanded ? '접기' : '전체보기'}
                </button>
            </div>

            <div className="space-y-3">
                <AnimatePresence>
                    {displayNotifications
                        .slice(0, isExpanded ? displayNotifications.length : 3)
                        .map((notification, index) => {
                            const NotificationIcon = getNotificationIcon(notification.type);
                            const colorClass = getNotificationColor(notification.priority);

                            return (
                                <motion.div
                                    key={notification.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`relative p-4 border-l-4 border-${colorClass}-500 bg-${colorClass}-50 rounded-r-lg`}
                                >
                                    <button
                                        onClick={() => removeNotification(notification.id)}
                                        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>

                                    <div className="flex items-start space-x-3 pr-6">
                                        <NotificationIcon className={`w-5 h-5 text-${colorClass}-600 mt-0.5`} />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <h4 className={`font-semibold text-${colorClass}-900 text-sm`}>
                                                    {notification.title}
                                                </h4>
                                                {notification.priority === 'urgent' && (
                                                    <span className="animate-pulse">🔴</span>
                                                )}
                                            </div>

                                            <p className={`text-sm text-${colorClass}-700 leading-relaxed`}>
                                                {notification.message}
                                            </p>

                                            <span className="text-xs text-gray-500 mt-2 block">
                                                {notification.timestamp}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })
                    }
                </AnimatePresence>
            </div>

            {displayNotifications.length === 0 && (
                <div className="text-center py-8">
                    <BellIcon className="w-12 h-12 text-crypto-neutral-400 mx-auto mb-3" />
                    <p className="text-crypto-neutral-500">새로운 알림이 없습니다</p>
                </div>
            )}
        </motion.div>
    );
}
