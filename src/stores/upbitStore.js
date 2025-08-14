import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUpbitStore = create(
  persist(
    (set, get) => ({
      // 상태
      isConnected: false,
      hasValidKeys: false,
      connectionStatus: "disconnected", // disconnected, connecting, connected, error
      apiKeys: null,
      accounts: [],
      permissions: [],
      lastValidated: null,
      error: null,

      // API 키 저장 및 검증
      saveApiKeys: async (accessKey, secretKey) => {
        set({ connectionStatus: "connecting", error: null });

        try {
          // 실제로는 백엔드 API로 키 검증 및 암호화 저장
          const validation = await validateUpbitKeys(accessKey, secretKey);

          if (validation.success) {
            set({
              isConnected: true,
              hasValidKeys: true,
              connectionStatus: "connected",
              apiKeys: {
                accessKey: accessKey.substring(0, 8) + "...", // 보안을 위해 일부만 저장
                secretKey: "***",
              },
              permissions: validation.permissions,
              accounts: validation.accounts,
              lastValidated: new Date().toISOString(),
            });

            return {
              success: true,
              message: "업비트 API 연결이 완료되었습니다",
            };
          } else {
            throw new Error(validation.error);
          }
        } catch (error) {
          set({
            connectionStatus: "error",
            error: error.message,
            isConnected: false,
            hasValidKeys: false,
          });

          return { success: false, error: error.message };
        }
      },

      // 연결 해제
      disconnect: () => {
        set({
          isConnected: false,
          hasValidKeys: false,
          connectionStatus: "disconnected",
          apiKeys: null,
          accounts: [],
          permissions: [],
          error: null,
        });
      },

      // 계정 정보 새로고침
      refreshAccounts: async () => {
        if (!get().hasValidKeys) return;

        try {
          // 실제로는 업비트 API를 통해 계정 정보 조회
          const accounts = await fetchUpbitAccounts();
          set({ accounts });
          return accounts;
        } catch (error) {
          set({ error: error.message });
          throw error;
        }
      },

      // 연결 상태 확인
      checkConnection: async () => {
        if (!get().hasValidKeys) return false;

        try {
          // 간단한 API 호출로 연결 상태 확인
          await fetchUpbitAccounts();
          set({ connectionStatus: "connected", error: null });
          return true;
        } catch (error) {
          set({
            connectionStatus: "error",
            error: error.message,
            isConnected: false,
          });
          return false;
        }
      },

      // 에러 초기화
      clearError: () => set({ error: null }),
    }),
    {
      name: "cryptowise-upbit-store",
      partialize: (state) => ({
        isConnected: state.isConnected,
        hasValidKeys: state.hasValidKeys,
        connectionStatus: state.connectionStatus,
        apiKeys: state.apiKeys,
        permissions: state.permissions,
        lastValidated: state.lastValidated,
      }),
      version: 1,
    }
  )
);

// ✅ 업비트 API 키 검증 함수
async function validateUpbitKeys(accessKey, secretKey) {
  // 실제로는 백엔드 API를 통해 검증
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // 시뮬레이션: 90% 확률로 성공
  if (Math.random() > 0.1) {
    return {
      success: true,
      permissions: ["accounts", "orders"],
      accounts: [
        { currency: "KRW", balance: "1250000" },
        { currency: "BTC", balance: "0.12000000" },
        { currency: "ETH", balance: "2.10000000" },
      ],
    };
  } else {
    return {
      success: false,
      error: "유효하지 않은 API 키입니다",
    };
  }
}

// ✅ 업비트 계정 정보 조회
async function fetchUpbitAccounts() {
  // 실제로는 업비트 API 호출
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return [
    { currency: "KRW", balance: "1250000", locked: "0" },
    { currency: "BTC", balance: "0.12000000", locked: "0" },
    { currency: "ETH", balance: "2.10000000", locked: "0" },
    { currency: "ADA", balance: "15000.00000000", locked: "0" },
  ];
}
