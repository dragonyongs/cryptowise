import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeftIcon,
    BellIcon,
    EnvelopeIcon,
    DevicePhoneMobileIcon,
    SpeakerWaveIcon,
    ChartBarIcon,
    Cog6ToothIcon,
    ArrowTrendingUpIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    CheckIcon,
    ClockIcon,
    TrashIcon
} from '@heroicons/react/24/outline';

export default function Notifications() {
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [notificationSettings, setNotificationSettings] = useState({
        enabled: true,
        channels: {
            email: true,
            push: true,
            sound: true
        },
        alerts: {
            priceChange: { enabled: true, threshold: 5.0, priority: 'medium' },
            volumeSpike: { enabled: true, threshold: 200.0, priority: 'low' },
            technicalSignal: { enabled: true, priority: 'high' },
            portfolioMilestone: { enabled: true, priority: 'medium' },
            marketNews: { enabled: false, priority: 'low' },
            systemUpdate: { enabled: true, priority: 'low' }
        },
        schedule: {
            dailyReport: { enabled: true, time: '09:00' },
            weeklyReport: { enabled: true, day: 'sunday', time: '10:00' }
        },
        quietHours: {
            enabled: true,
            start: '22:00',
            end: '07:00'
        }
    });

    const [recentNotifications] = useState([
        {
            id: 1,
            type: 'priceChange',
            title: 'BTC 가격 변동 알림',
            message: 'BTC가 5% 이상 상승했습니다 (₩65,420,000)',
            timestamp: '10분 전',
            read: false,
            priority: 'high'
        },
        {
            id: 2,
            type: 'technicalSignal',
            title: 'ETH 매수 신호',
            message: 'ETH에서 MACD 골든크로스가 발생했습니다',
            timestamp: '1시간 전',
            read: false,
            priority: 'medium'
        },
        {
            id: 3,
            type: 'dailyReport',
            title: '일일 포트폴리오 리포트',
            message: '오늘의 총 수익률: +2.3% (₩458,000)',
            timestamp: '어제',
            read: true,
            priority: 'low'
        }
    ]);

    const alertTypes = [
        {
            key: 'priceChange',
            label: '가격 변동',
            description: '지정한 비율 이상 가격이 변동했을 때',
            icon: ChartBarIcon,
            hasThreshold: true,
            thresholdLabel: '변동률 (%)'
        },
        {
            key: 'volumeSpike',
            label: '거래량 급증',
            description: '평균 거래량 대비 크게 증가했을 때',
            icon: ArrowTrendingUpIcon,
            hasThreshold: true,
            thresholdLabel: '배수 (%)'
        },
        {
            key: 'technicalSignal',
            label: '기술적 신호',
            description: '매수/매도 신호가 발생했을 때',
            icon: ChartBarIcon,
            hasThreshold: false
        },
        {
            key: 'portfolioMilestone',
            label: '포트폴리오 이정표',
            description: '목표 수익률 달성이나 손실 한계 도달',
            icon: ArrowTrendingUpIcon,
            hasThreshold: false
        },
        {
            key: 'marketNews',
            label: '시장 뉴스',
            description: '중요한 암호화폐 뉴스 발생',
            icon: InformationCircleIcon,
            hasThreshold: false
        },
        {
            key: 'systemUpdate',
            label: '시스템 업데이트',
            description: '새로운 기능이나 중요 공지사항',
            icon: Cog6ToothIcon,
            hasThreshold: false
        }
    ];

    const priorityColors = {
        high: 'text-crypto-danger-600 bg-crypto-danger-50',
        medium: 'text-crypto-warning-600 bg-crypto-warning-50',
        low: 'text-crypto-neutral-600 bg-crypto-neutral-50'
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('알림 설정 저장 실패:', error);
        } finally {
            setSaving(false);
        }
    };

    const updateAlertSetting = (key, field, value) => {
        setNotificationSettings(prev => ({
            ...prev,
            alerts: {
                ...prev.alerts,
                [key]: {
                    ...prev.alerts[key],
                    [field]: value
                }
            }
        }));
    };

    const toggleChannel = (channel) => {
        setNotificationSettings(prev => ({
            ...prev,
            channels: {
                ...prev.channels,
                [channel]: !prev.channels[channel]
            }
        }));
    };

    return (
        <div className="min-h-screen bg-crypto-neutral-50">
            {/* 헤더 */}
            <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span>대시보드</span>
                    </button>

                    <h1 className="text-lg font-semibold text-crypto-neutral-900">
                        알림 설정
                    </h1>

                    <div className="flex items-center space-x-2">
                        {saved && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center space-x-1 text-crypto-success-600"
                            >
                                <CheckIcon className="w-4 h-4" />
                                <span className="text-sm">저장됨</span>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
                {/* 전체 알림 설정 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                            <BellIcon className="w-6 h-6 text-crypto-primary-600" />
                            <div>
                                <h2 className="text-lg font-semibold text-crypto-neutral-900">
                                    알림 설정
                                </h2>
                                <p className="text-sm text-crypto-neutral-600">
                                    중요한 투자 신호와 업데이트를 놓치지 마세요
                                </p>
                            </div>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notificationSettings.enabled}
                                onChange={(e) => setNotificationSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-crypto-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crypto-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crypto-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crypto-primary-600"></div>
                        </label>
                    </div>

                    {/* 알림 채널 */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className={`p-4 rounded-lg border-2 transition-colors ${notificationSettings.channels.email
                            ? 'border-crypto-primary-500 bg-crypto-primary-50'
                            : 'border-crypto-neutral-200'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <EnvelopeIcon className="w-6 h-6 text-crypto-primary-600" />
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.channels.email}
                                        onChange={() => toggleChannel('email')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-crypto-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crypto-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[2px] after:bg-white after:border-crypto-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-crypto-primary-600"></div>
                                </label>
                            </div>
                            <div className="font-medium text-crypto-neutral-900">이메일</div>
                            <div className="text-xs text-crypto-neutral-600">상세 리포트</div>
                        </div>

                        <div className={`p-4 rounded-lg border-2 transition-colors ${notificationSettings.channels.push
                            ? 'border-crypto-primary-500 bg-crypto-primary-50'
                            : 'border-crypto-neutral-200'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <DevicePhoneMobileIcon className="w-6 h-6 text-crypto-primary-600" />
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.channels.push}
                                        onChange={() => toggleChannel('push')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-crypto-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crypto-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[2px] after:bg-white after:border-crypto-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-crypto-primary-600"></div>
                                </label>
                            </div>
                            <div className="font-medium text-crypto-neutral-900">푸시</div>
                            <div className="text-xs text-crypto-neutral-600">즉시 알림</div>
                        </div>

                        <div className={`p-4 rounded-lg border-2 transition-colors ${notificationSettings.channels.sound
                            ? 'border-crypto-primary-500 bg-crypto-primary-50'
                            : 'border-crypto-neutral-200'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <SpeakerWaveIcon className="w-6 h-6 text-crypto-primary-600" />
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notificationSettings.channels.sound}
                                        onChange={() => toggleChannel('sound')}
                                        className="sr-only peer"
                                    />
                                    <div className="w-9 h-5 bg-crypto-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crypto-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[2px] after:bg-white after:border-crypto-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-crypto-primary-600"></div>
                                </label>
                            </div>
                            <div className="font-medium text-crypto-neutral-900">사운드</div>
                            <div className="text-xs text-crypto-neutral-600">오디오 알림</div>
                        </div>
                    </div>
                </motion.div>

                {/* 알림 유형별 설정 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                >
                    <h2 className="text-lg font-semibold text-crypto-neutral-900 mb-6">
                        알림 유형별 설정
                    </h2>

                    <div className="space-y-4">
                        {alertTypes.map((alert) => {
                            const settings = notificationSettings.alerts[alert.key];
                            const IconComponent = alert.icon;

                            return (
                                <div key={alert.key} className="p-4 border border-crypto-neutral-200 rounded-lg">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-3 flex-1">
                                            <IconComponent className="w-5 h-5 text-crypto-primary-600 mt-0.5" />
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <span className="font-medium text-crypto-neutral-900">
                                                        {alert.label}
                                                    </span>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[settings?.priority || 'medium']
                                                        }`}>
                                                        {settings?.priority === 'high' ? '높음' :
                                                            settings?.priority === 'medium' ? '보통' : '낮음'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-crypto-neutral-600 mb-3">
                                                    {alert.description}
                                                </p>

                                                {alert.hasThreshold && (
                                                    <div className="flex items-center space-x-4">
                                                        <div className="flex items-center space-x-2">
                                                            <label className="text-sm text-crypto-neutral-700">
                                                                {alert.thresholdLabel}:
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={settings?.threshold || 0}
                                                                onChange={(e) => updateAlertSetting(alert.key, 'threshold', parseFloat(e.target.value))}
                                                                className="w-20 px-2 py-1 border border-crypto-neutral-300 rounded text-sm"
                                                            />
                                                        </div>

                                                        <select
                                                            value={settings?.priority || 'medium'}
                                                            onChange={(e) => updateAlertSetting(alert.key, 'priority', e.target.value)}
                                                            className="px-3 py-1 border border-crypto-neutral-300 rounded text-sm"
                                                        >
                                                            <option value="low">낮음</option>
                                                            <option value="medium">보통</option>
                                                            <option value="high">높음</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings?.enabled || false}
                                                onChange={(e) => updateAlertSetting(alert.key, 'enabled', e.target.checked)}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-crypto-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crypto-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crypto-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crypto-primary-600"></div>
                                        </label>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>

                {/* 방해 금지 시간 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                >
                    <h2 className="text-lg font-semibold text-crypto-neutral-900 mb-6 flex items-center">
                        <ClockIcon className="w-5 h-5 mr-2" />
                        방해 금지 시간
                    </h2>

                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="font-medium text-crypto-neutral-900">방해 금지 모드</div>
                            <div className="text-sm text-crypto-neutral-600">
                                지정한 시간대에는 긴급하지 않은 알림을 받지 않습니다
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={notificationSettings.quietHours.enabled}
                                onChange={(e) => setNotificationSettings(prev => ({
                                    ...prev,
                                    quietHours: { ...prev.quietHours, enabled: e.target.checked }
                                }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-crypto-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crypto-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crypto-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crypto-primary-600"></div>
                        </label>
                    </div>

                    {notificationSettings.quietHours.enabled && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                    시작 시간
                                </label>
                                <input
                                    type="time"
                                    value={notificationSettings.quietHours.start}
                                    onChange={(e) => setNotificationSettings(prev => ({
                                        ...prev,
                                        quietHours: { ...prev.quietHours, start: e.target.value }
                                    }))}
                                    className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                    종료 시간
                                </label>
                                <input
                                    type="time"
                                    value={notificationSettings.quietHours.end}
                                    onChange={(e) => setNotificationSettings(prev => ({
                                        ...prev,
                                        quietHours: { ...prev.quietHours, end: e.target.value }
                                    }))}
                                    className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg"
                                />
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* 최근 알림 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                >
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-crypto-neutral-900">
                            최근 알림
                        </h2>
                        <button className="text-sm text-crypto-primary-600 hover:text-crypto-primary-700 transition-colors">
                            모두 읽음으로 표시
                        </button>
                    </div>

                    <div className="space-y-3">
                        {recentNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 rounded-lg border ${notification.read
                                    ? 'border-crypto-neutral-200 bg-crypto-neutral-50'
                                    : 'border-crypto-primary-200 bg-crypto-primary-50'
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className={`font-medium ${notification.read ? 'text-crypto-neutral-700' : 'text-crypto-neutral-900'
                                                }`}>
                                                {notification.title}
                                            </span>
                                            {!notification.read && (
                                                <span className="w-2 h-2 bg-crypto-primary-500 rounded-full"></span>
                                            )}
                                        </div>
                                        <p className="text-sm text-crypto-neutral-600 mb-2">
                                            {notification.message}
                                        </p>
                                        <span className="text-xs text-crypto-neutral-500">
                                            {notification.timestamp}
                                        </span>
                                    </div>
                                    <button className="text-crypto-neutral-400 hover:text-crypto-neutral-600 transition-colors">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* 저장 버튼 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-end"
                >
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-crypto-primary-500 text-white px-8 py-3 rounded-xl hover:bg-crypto-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>저장 중...</span>
                            </>
                        ) : (
                            <>
                                <CheckIcon className="w-5 h-5" />
                                <span>알림 설정 저장</span>
                            </>
                        )}
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
