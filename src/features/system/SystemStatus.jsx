// features/system/SystemStatus.jsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore } from '../../stores/systemStore';
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    SignalIcon,
    ArrowPathIcon,
    WifiIcon,
    ServerIcon
} from '@heroicons/react/24/outline';

export default function SystemStatus() {
    const {
        systemHealth,
        isConnected,
        checkSystemHealth,
        isCheckingHealth,
        lastHealthCheck,
        setConnectionStatus,
        notifications,
        removeNotification,
        apiLimits
    } = useSystemStore();

    const [showDetails, setShowDetails] = useState(false);

    // ✅ 컴포넌트 마운트 시 초기 설정
    useEffect(() => {
        // 초기 시스템 체크
        checkSystemHealth();

        // 네트워크 상태 감지
        const handleOnline = () => setConnectionStatus(true);
        const handleOffline = () => setConnectionStatus(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // 주기적 헬스체크 (3분마다)
        const healthInterval = setInterval(() => {
            if (!isCheckingHealth) {
                checkSystemHealth();
            }
        }, 3 * 60 * 1000);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(healthInterval);
        };
    }, []);

    // ✅ 종합 상태 판단
    const getOverallStatus = () => {
        if (!isConnected) {
            return {
                level: 'error',
                color: 'red',
                icon: XCircleIcon,
                message: '네트워크 연결 없음',
                description: '인터넷 연결을 확인해주세요'
            };
        }

        const hasError = Object.values(systemHealth).some(status => status === 'error');
        const hasWarning = Object.values(systemHealth).some(status => status === 'warning');
        const hasChecking = Object.values(systemHealth).some(status => status === 'checking');

        if (hasError) {
            return {
                level: 'error',
                color: 'red',
                icon: XCircleIcon,
                message: '시스템 오류 발생',
                description: '일부 기능이 작동하지 않을 수 있습니다'
            };
        }

        if (hasWarning) {
            return {
                level: 'warning',
                color: 'yellow',
                icon: ExclamationTriangleIcon,
                message: '주의 필요',
                description: '일부 기능이 제한될 수 있습니다'
            };
        }

        if (hasChecking || isCheckingHealth) {
            return {
                level: 'checking',
                color: 'blue',
                icon: ArrowPathIcon,
                message: '상태 확인 중',
                description: '시스템 상태를 확인하고 있습니다'
            };
        }

        return {
            level: 'success',
            color: 'green',
            icon: CheckCircleIcon,
            message: '모든 시스템 정상',
            description: '모든 기능이 정상적으로 작동 중입니다'
        };
    };

    const status = getOverallStatus();
    const StatusIcon = status.icon;

    // ✅ API 사용률 계산
    const getApiUsagePercentage = () => {
        const total = Object.values(apiLimits).reduce((sum, limit) => sum + limit.used, 0);
        const maxTotal = Object.values(apiLimits).reduce((sum, limit) => sum + limit.limit, 0);
        return Math.round((total / maxTotal) * 100);
    };

    return (
        <>
            {/* ✅ 메인 시스템 상태 표시 */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative bg-white border-l-4 border-${status.color}-500 shadow-sm rounded-r-lg p-4`}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                        <StatusIcon
                            className={`w-6 h-6 text-${status.color}-500 ${isCheckingHealth ? 'animate-spin' : ''}`}
                        />
                        <div>
                            <h3 className={`text-sm font-semibold text-${status.color}-800`}>
                                {status.message}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">
                                {status.description}
                            </p>
                            {lastHealthCheck && (
                                <p className="text-xs text-gray-400 mt-1">
                                    마지막 확인: {new Date(lastHealthCheck).toLocaleTimeString('ko-KR')}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        {/* API 사용률 표시 */}
                        <div className="text-xs text-gray-500">
                            API: {getApiUsagePercentage()}%
                        </div>

                        {/* 세부 정보 토글 */}
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            {showDetails ? '숨기기' : '상세'}
                        </button>

                        {/* 새로고침 버튼 */}
                        <button
                            onClick={checkSystemHealth}
                            disabled={isCheckingHealth}
                            className={`p-1 rounded-full hover:bg-${status.color}-50 disabled:opacity-50 transition-colors`}
                        >
                            <ArrowPathIcon
                                className={`w-4 h-4 text-${status.color}-500 ${isCheckingHealth ? 'animate-spin' : ''}`}
                            />
                        </button>
                    </div>
                </div>

                {/* ✅ 세부 상태 정보 */}
                <AnimatePresence>
                    {showDetails && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 pt-4 border-t border-gray-100"
                        >
                            <div className="grid grid-cols-3 gap-4 text-xs">
                                <div className="text-center">
                                    <ServerIcon className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                                    <div className={`font-medium ${systemHealth.api === 'healthy' ? 'text-green-600' :
                                        systemHealth.api === 'warning' ? 'text-yellow-600' :
                                            systemHealth.api === 'error' ? 'text-red-600' : 'text-gray-600'
                                        }`}>
                                        API
                                    </div>
                                    <div className="text-gray-500">{systemHealth.api}</div>
                                </div>

                                <div className="text-center">
                                    <WifiIcon className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                                    <div className={`font-medium ${systemHealth.trading === 'healthy' ? 'text-green-600' :
                                        systemHealth.trading === 'warning' ? 'text-yellow-600' :
                                            systemHealth.trading === 'error' ? 'text-red-600' : 'text-gray-600'
                                        }`}>
                                        거래
                                    </div>
                                    <div className="text-gray-500">{systemHealth.trading}</div>
                                </div>

                                <div className="text-center">
                                    <SignalIcon className="w-4 h-4 mx-auto mb-1 text-gray-400" />
                                    <div className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                                        네트워크
                                    </div>
                                    <div className="text-gray-500">{isConnected ? '연결됨' : '끊어짐'}</div>
                                </div>
                            </div>

                            {/* API 사용량 상세 */}
                            <div className="mt-4 pt-3 border-t border-gray-50">
                                <div className="text-xs font-medium text-gray-700 mb-2">API 사용량</div>
                                <div className="space-y-2">
                                    {Object.entries(apiLimits).map(([service, limit]) => (
                                        <div key={service} className="flex justify-between items-center">
                                            <span className="text-xs text-gray-600 capitalize">{service}</span>
                                            <div className="flex items-center space-x-2">
                                                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full transition-all duration-300 ${limit.used / limit.limit > 0.8 ? 'bg-red-500' :
                                                            limit.used / limit.limit > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                                                            }`}
                                                        style={{ width: `${Math.min((limit.used / limit.limit) * 100, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {limit.used}/{limit.limit}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            {/* ✅ 알림 토스트 */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
                <AnimatePresence>
                    {notifications.slice(0, 3).map(notification => (
                        <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 300 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 300 }}
                            className={`bg-white border-l-4 ${notification.type === 'error' ? 'border-red-500' :
                                notification.type === 'warning' ? 'border-yellow-500' :
                                    notification.type === 'success' ? 'border-green-500' : 'border-blue-500'
                                } shadow-lg rounded-r-lg p-3 min-w-80 max-w-sm`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <h4 className={`text-sm font-semibold ${notification.type === 'error' ? 'text-red-800' :
                                        notification.type === 'warning' ? 'text-yellow-800' :
                                            notification.type === 'success' ? 'text-green-800' : 'text-blue-800'
                                        }`}>
                                        {notification.title}
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {notification.message}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeNotification(notification.id)}
                                    className="ml-2 text-gray-400 hover:text-gray-600"
                                >
                                    <XCircleIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </>
    );
}
