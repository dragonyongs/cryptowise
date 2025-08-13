import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';
import {
    syncFirebaseToSupabase,
    initializeUserTradingConfig,
    supabase
} from '../lib/supabase';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth는 AuthProvider 내에서 사용되어야 합니다');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [supabaseSession, setSupabaseSession] = useState(null);

    // Google 로그인
    const signInWithGoogle = async () => {
        try {
            setLoading(true);
            const result = await signInWithPopup(auth, googleProvider);

            // Supabase와 동기화
            await syncFirebaseToSupabase(result.user);

            // 신규 사용자인 경우 트레이딩 설정 초기화
            await initializeUserTradingConfig(result.user.uid);

            return { success: true, user: result.user };
        } catch (error) {
            console.error('Google 로그인 오류:', error);
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    // 로그아웃
    const signOut = async () => {
        try {
            setLoading(true);
            await firebaseSignOut(auth);
            await supabase.auth.signOut();
            setUser(null);
            setSupabaseSession(null);
        } catch (error) {
            console.error('로그아웃 오류:', error);
        } finally {
            setLoading(false);
        }
    };

    // 사용자 트레이딩 데이터 가져오기
    const getUserTradingData = async () => {
        if (!user) return null;

        try {
            const { data: configs, error } = await supabase
                .from('user_coin_configs')
                .select('*')
                .eq('user_id', user.uid)
                .eq('is_active', true);

            if (error) throw error;
            return configs;
        } catch (error) {
            console.error('트레이딩 데이터 조회 오류:', error);
            return null;
        }
    };

    // Firebase Auth 상태 변화 감지
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);
                // Supabase 세션 동기화
                await syncFirebaseToSupabase(firebaseUser);
            } else {
                setUser(null);
                setSupabaseSession(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Supabase 세션 감지
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSupabaseSession(session);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSupabaseSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const value = {
        user,
        supabaseSession,
        loading,
        signInWithGoogle,
        signOut,
        getUserTradingData,
        isAuthenticated: !!user,
        isSupabaseConnected: !!supabaseSession
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
