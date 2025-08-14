import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSystemStore } from '../../stores/systemStore'; // ✅ 중앙 상태 사용
import {
    CheckCircleIcon,
    ExclamationTriangleIcon,
    XCircleIcon,
    SignalIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function SystemStatus() {
    // ✅ 중앙 상태에서 직접 데이터 가져오기
    const {
        systemHealth,
        isConnected,
        checkSystemHealth,
        isCheckingHealth,
        lastHealthCheck
    } = useSystemStore();

    // ✅ 컴포넌트 마운트 시 시스템 상태 체크
    useEffect(() => {
        // 초기 체크
        if (!lastHealthCheck) {
            checkSystemHealth();
        }

        // 5분마다 자동 체크
        const interval = setInterval(() => {
            checkSystemHealth();
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, [checkSystemHealth, lastHealthCheck]);

    const getStatusInfo = () => {
        if (!isConnected) {
            return {
                color: 'crypto-danger',
                icon: XCircleIcon,
                message: '인터넷 연결을 확인해주세요',
                level: 'error',
                action: '네트워크 상태 확인'
            };
        }

        if (systemHealth.api === 'error' || systemHealth.database === 'error') {
            return {
                color: 'crypto-danger',
                icon: XCircleIcon,
                message: '시스템 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                level: 'error',
                action: '새로고침'
            };
        }

        if (systemHealth.api === 'warning' || systemHealth.trading === 'warning') {
            return {
                color: 'crypto-warning',
                icon: ExclamationTriangleIcon,
                message: '일부 기능이 제한될 수 있습니다',
                level: 'warning',
                action: '상태 확인'
            };
        }

        return {
            color: 'crypto-success',
            icon: CheckCircleIcon,
            message: '모든 시스템이 정상 동작 중입니다',
            level: 'success',
            action: null
        };
    };

    const status = getStatusInfo();
    const StatusIcon = status.icon;

    // ✅ 정상 상태일 때는 표시하지 않음
    if (status.level === 'success') {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -50 }}
                className={`fixed top-0 left-0 right-0 z-50 bg-${status.color}-50 border-b border-${status.color}-200 shadow-lg`}
            >
                <div className="max-w-7xl mx-auto px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <StatusIcon className={`w-5 h-5 text-${status.color}-600`} />
                            <span className={`text-sm font-medium text-${status.color}-800`}>
                                {status.message}
                            </span>

                            {/* ✅ 연결 상태 표시 */}
                            {!isConnected && (
                                <motion.div
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                >
                                    <SignalIcon className={`w-4 h-4 text-${status.color}-600`} />
                                </motion.div>
                            )}

                            {/* ✅ 로딩 상태 표시 */}
                            {isCheckingHealth && (
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                    <ArrowPathIcon className={`w-4 h-4 text-${status.color}-600`} />
                                </motion.div>
                            )}
                        </div>

                        <div className="flex items-center space-x-4">
                            {/* ✅ 액션 버튼 */}
                            {status.action && (
                                <button
                                    onClick={() => {
                                        if (status.action === '새로고침') {
                                            window.location.reload();
                                        } else if (status.action === '상태 확인') {
                                            checkSystemHealth();
                                        }
                                    }}
                                    disabled={isCheckingHealth}
                                    className={`text-sm font-medium text-${status.color}-700 hover:text-${status.color}-900 disabled:opacity-50 transition-colors`}
                                >
                                    {isCheckingHealth ? '확인 중...' : status.action}
                                </button>
                            )}

                            {/* ✅ 마지막 확인 시간 */}
                            <div className="text-xs text-gray-500">
                                마지막 확인: {lastHealthCheck
                                    ? new Date(lastHealthCheck).toLocaleTimeString('ko-KR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })
                                    : '알 수 없음'
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
