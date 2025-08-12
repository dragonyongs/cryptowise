import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase, db } from '../lib/supabase'

export const useUserStore = create(
  persist(
    (set, get) => ({
      // 상태
      user: null,
      profile: null,
      preferences: null,
      coinConfigs: {},
      subscription: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 인증 관련 액션
      async signIn(email, password) {
        try {
          set({ isLoading: true, error: null })

          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
          })

          if (error) throw error

          await get().loadUserData(data.user.id)
          set({ user: data.user, isAuthenticated: true, isLoading: false })

          return data
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      async signUp(email, password, userData = {}) {
        try {
          set({ isLoading: true, error: null })

          const { data, error } = await supabase.auth.signUp({
            email,
            password
          })

          if (error) throw error

          // 사용자 프로필 생성
          if (data.user) {
            await get().createUserProfile(data.user.id, {
              email,
              display_name: userData.displayName || email.split('@')[0],
              ...userData
            })
          }

          set({ user: data.user, isAuthenticated: true, isLoading: false })
          return data
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      async signOut() {
        try {
          const { error } = await supabase.auth.signOut()
          if (error) throw error

          set({
            user: null,
            profile: null,
            preferences: null,
            coinConfigs: {},
            subscription: null,
            isAuthenticated: false
          })
        } catch (error) {
          set({ error: error.message })
          throw error
        }
      },

      async signInWithGoogle() {
        try {
          set({ isLoading: true, error: null })

          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/auth/callback`
            }
          })

          if (error) throw error
          return data
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      // 사용자 데이터 관련 액션
      async loadUserData(userId) {
        try {
          set({ isLoading: true })

          // 프로필 로드
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', userId)
            .single()

          // 설정 로드
          const { data: preferences } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single()

          // 코인 설정 로드
          const coinConfigs = await db.getUserCoinConfigs(userId)

          // 구독 정보 로드
          const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select('*, subscription_plans(*)')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single()

          set({
            profile,
            preferences,
            coinConfigs: coinConfigs.reduce((acc, config) => {
              acc[config.symbol] = config
              return acc
            }, {}),
            subscription,
            isLoading: false
          })
        } catch (error) {
          set({ error: error.message, isLoading: false })
        }
      },

      async createUserProfile(userId, profileData) {
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .insert({
              user_id: userId,
              ...profileData
            })

          if (error) throw error

          set({ profile: data[0] })
          return data
        } catch (error) {
          set({ error: error.message })
          throw error
        }
      },

      async updateProfile(profileData) {
        try {
          const { user } = get()
          if (!user) throw new Error('사용자가 인증되지 않았습니다')

          const { data, error } = await supabase
            .from('user_profiles')
            .update(profileData)
            .eq('user_id', user.id)
            .select()
            .single()

          if (error) throw error

          set({ profile: data })
          return data
        } catch (error) {
          set({ error: error.message })
          throw error
        }
      },

      async updatePreferences(preferencesData) {
        try {
          const { user } = get()
          if (!user) throw new Error('사용자가 인증되지 않았습니다')

          const { data, error } = await supabase
            .from('user_preferences')
            .upsert({
              user_id: user.id,
              ...preferencesData
            })
            .select()
            .single()

          if (error) throw error

          set({ preferences: data })
          return data
        } catch (error) {
          set({ error: error.message })
          throw error
        }
      },

      // 코인 설정 관련 액션
      async updateCoinConfig(symbol, configData) {
        try {
          const { user } = get()
          if (!user) throw new Error('사용자가 인증되지 않았습니다')

          const fullConfig = {
            user_id: user.id,
            symbol,
            ...configData,
            updated_at: new Date().toISOString()
          }

          const savedConfig = await db.saveUserCoinConfig(fullConfig)

          set(state => ({
            coinConfigs: {
              ...state.coinConfigs,
              [symbol]: savedConfig[0]
            }
          }))

          return savedConfig
        } catch (error) {
          set({ error: error.message })
          throw error
        }
      },

      async deleteCoinConfig(symbol) {
        try {
          const { user } = get()
          if (!user) throw new Error('사용자가 인증되지 않았습니다')

          const { error } = await supabase
            .from('user_coin_configs')
            .delete()
            .eq('user_id', user.id)
            .eq('symbol', symbol)

          if (error) throw error

          set(state => {
            const { [symbol]: removed, ...remainingConfigs } = state.coinConfigs
            return { coinConfigs: remainingConfigs }
          })
        } catch (error) {
          set({ error: error.message })
          throw error
        }
      },

      // 세션 복원
      async restoreSession() {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          
          if (session?.user) {
            await get().loadUserData(session.user.id)
            set({ 
              user: session.user, 
              isAuthenticated: true 
            })
          }
        } catch (error) {
          console.error('세션 복원 실패:', error)
        }
      },

      clearError() {
        set({ error: null })
      }
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({
        user: state.user,
        profile: state.profile,
        preferences: state.preferences,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// 인증 상태 변경 리스너
supabase.auth.onAuthStateChange((event, session) => {
  const store = useUserStore.getState()
  
  if (event === 'SIGNED_IN' && session?.user) {
    store.loadUserData(session.user.id)
    useUserStore.setState({ 
      user: session.user, 
      isAuthenticated: true 
    })
  } else if (event === 'SIGNED_OUT') {
    useUserStore.setState({
      user: null,
      profile: null,
      preferences: null,
      coinConfigs: {},
      subscription: null,
      isAuthenticated: false
    })
  }
})
