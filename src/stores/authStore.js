import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      loading: false,

      // 구글 로그인 시뮬레이션
      signIn: async () => {
        set({ loading: true });

        // 실제로는 NextAuth Google Provider 연동
        try {
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
        localStorage.clear();
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
    }),
    {
      name: "cryptowise-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
    }
  )
);
