import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useSystemStore } from '../../stores/systemStore';
import Navbar from './Navbar';
import MobileNavbar from './MobileNavbar';
import SystemStatus from '../../features/system/SystemStatus';

export default function Layout({ children }) {
    const { user } = useAuthStore();
    const { systemHealth, isConnected } = useSystemStore();

    return (
        <div className="min-h-screen bg-crypto-neutral-50">

            {user && (
                <>
                    {/* 데스크탑 네비게이션 */}
                    <div className="hidden lg:block">
                        <Navbar />
                    </div>
                    {/* 모바일 네비게이션 */}
                    <div className="block lg:hidden">
                        <MobileNavbar />
                    </div>
                </>
            )}

            {/* 메인 콘텐츠 영역 */}
            <main className={`transition-all duration-300 ${user ? 'lg:ml-64 pb-16 lg:pb-0' : ''
                }`}>
                {/* 시스템 상태 알림 */}
                <SystemStatus health={systemHealth} connected={isConnected} />
                <div className="min-h-screen">
                    {children}
                </div>
            </main>
        </div>
    );
}
