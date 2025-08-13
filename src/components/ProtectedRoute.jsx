// /src/components/ProtectedRoute.jsx

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireAuth = true }) => {
    const { user, loading, isSupabaseConnected } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
                <p className="ml-4 text-lg">로딩 중...</p>
            </div>
        );
    }

    if (requireAuth && !user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAuth && !isSupabaseConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-pulse bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                        <p>서비스 연결 중...</p>
                        <p className="text-sm">잠시만 기다려주세요.</p>
                    </div>
                </div>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;
