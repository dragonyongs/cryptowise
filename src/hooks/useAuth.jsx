// src/hooks/useAuth.jsx - 로딩 상태 개선 버전
import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { createLogData } from '@/utils/network';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 추가 비즈니스 로직 처리 (비동기이지만 로딩 상태에 영향 안주도록)
  const handleUserOnboarding = async (authUser) => {
    if (!authUser) return

    // 백그라운드에서 실행
    setTimeout(async () => {
      try {
        console.log('🚀 백그라운드 사용자 온보딩 시작:', authUser.email)

        // 사용자 첫 로그인 여부 확인
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('user_id, created_at')
          .eq('user_id', authUser.id)
          .single()

        const isNewUser = !profile

        if (isNewUser) {
          console.log('🎉 신규 사용자:', authUser.email)
          await logUserActivity(authUser, 'first_login', 'auth', authUser.id)
        } else {
          console.log('👋 기존 사용자:', authUser.email)
          await logUserActivity(authUser, 'login', 'auth', authUser.id)
        }

      } catch (error) {
        console.error('백그라운드 온보딩 실패:', error)
      }
    }, 100)
  }

  // 사용자 활동 로그 기록
  const logUserActivity = async (user, activity, resourceType = null, resourceId = null, changes = null) => {
    try {
      const logData = await createLogData(user.id, activity, resourceType, resourceId, changes);

      await supabase
        .from('user_activity_logs')
        .insert(logData);

      console.log(`📊 활동 로그 기록: ${activity}`);
    } catch (error) {
      console.error('활동 로그 기록 실패:', error);
    }
  };

  useEffect(() => {
    console.log('🔄 useAuth 초기화 시작')

    // 초기 세션 확인
    const getSession = async () => {
      try {
        console.log('🔍 초기 세션 확인 중...')

        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('세션 확인 중 오류:', error)
          throw error
        }

        if (session?.user) {
          console.log('✅ 기존 세션 발견:', session.user.email)
          setUser(session.user)

          // 백그라운드에서 처리 (로딩 상태 영향 없음)
          handleUserOnboarding(session.user)
        } else {
          console.log('❌ 기존 세션 없음')
          setUser(null)
        }

      } catch (error) {
        console.error('세션 확인 실패:', error)
        setUser(null)
      } finally {
        console.log('✅ 초기 로딩 완료')
        setLoading(false) // 반드시 실행되도록
      }
    }

    getSession()

    // 인증 상태 변경 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth 상태 변경:', event, session?.user?.email || 'no user')

        try {
          if (session?.user) {
            setUser(session.user)

            // 로그인 시에만 백그라운드 처리
            if (event === 'SIGNED_IN') {
              handleUserOnboarding(session.user)
            }
          } else {
            setUser(null)
          }
        } catch (error) {
          console.error('Auth 상태 변경 처리 실패:', error)
        } finally {
          // Auth 상태 변경 후에는 즉시 로딩 완료
          console.log('✅ Auth 상태 변경 로딩 완료')
          setLoading(false)
        }
      }
    )

    return () => {
      console.log('🧹 useAuth 정리')
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    try {
      console.log('👋 로그아웃 시도')

      if (user) {
        // 백그라운드에서 로그 기록
        setTimeout(() => logUserActivity(user, 'logout', 'auth', user.id), 0)
      }

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      console.log('✅ 로그아웃 완료')
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }

  const value = {
    user,
    loading,
    supabase,
    signOut,
    handleUserOnboarding,
    logUserActivity
  }

  console.log('🎯 useAuth 현재 상태:', {
    user: user?.email || 'none',
    loading
  })

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
