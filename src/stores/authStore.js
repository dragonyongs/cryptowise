// src/stores/authStore.js
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      loading: false,

      // 구글 로그인 시뮬레이션 (실서비스는 NextAuth 연동)
      signIn: async () => {
        set({ loading: true });
        try {
          // API/OAuth 대기 시뮬레이션
          await new Promise((resolve) => setTimeout(resolve, 2000));
          set({
            user: {
              id: "user_advanced_001",
              name: "김크립토",
              email: "crypto.investor@gmail.com",
              image:
                "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
              tier: "premium", // free, premium, pro
              joinedAt: new Date().toISOString(),
              preferences: {
                riskLevel: "moderate", // conservative, moderate, aggressive
                tradingStyle: "swing", // scalp, swing, longterm
                notifications: true,
                theme: "light",
              },
            },
            loading: false,
          });
        } catch (error) {
          set({ loading: false });
          throw error;
        }
      },

      signOut: () => {
        set({ user: null });
        try {
          localStorage.clear();
        } catch {
          // noop
        }
      },

      updatePreferences: (preferences) => {
        const user = get().user;
        if (user) {
          set({
            user: {
              ...user,
              preferences: { ...user.preferences, ...preferences },
            },
          });
        }
      },

      // 파생 상태(선택): 함수 형태로 제공해 최신 상태 참조
      isAuthenticated: () => !!get().user,

      // 유틸(선택)
      reset: () => set({ user: null, loading: false }),
    }),
    {
      name: "cryptowise-auth",
      storage: createJSONStorage(() => localStorage),
      // user만 저장해 민감도/크기 최소화
      partialize: (state) => ({ user: state.user }),
      version: 1,
      migrate: (persistedState, version) => {
        // 버전업 시 마이그레이션 훅 (현재는 패스)
        return persistedState;
      },
    }
  )
);
