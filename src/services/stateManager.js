// services/stateManager.js
class StateManager {
  constructor() {
    this.storageKey = "cryptowise_trading_state";
  }

  // 상태 저장
  async saveState(userId, state) {
    try {
      const stateData = {
        userId,
        portfolio: state.portfolio,
        activePositions: state.activePositions,
        timestamp: Date.now(),
        version: "1.0",
      };

      // 로컬 스토리지에 저장
      localStorage.setItem(this.storageKey, JSON.stringify(stateData));

      // Supabase에도 백업 저장
      await supabase.from("trading_states").upsert({
        user_id: userId,
        state_data: stateData,
        updated_at: new Date(),
      });

      console.log("💾 트레이딩 상태 저장 완료");
    } catch (error) {
      console.error("❌ 상태 저장 실패:", error);
    }
  }

  // 상태 복구
  async restoreState(userId) {
    try {
      // 먼저 로컬 스토리지에서 확인
      const localState = localStorage.getItem(this.storageKey);
      if (localState) {
        const parsed = JSON.parse(localState);
        if (
          parsed.userId === userId &&
          Date.now() - parsed.timestamp < 86400000
        ) {
          // 24시간 이내
          console.log("📱 로컬 상태 복구 완료");
          return parsed;
        }
      }

      // Supabase에서 복구
      const { data } = await supabase
        .from("trading_states")
        .select("state_data")
        .eq("user_id", userId)
        .single();

      if (data?.state_data) {
        console.log("☁️ 클라우드 상태 복구 완료");
        return data.state_data;
      }

      return null;
    } catch (error) {
      console.error("❌ 상태 복구 실패:", error);
      return null;
    }
  }
}

export const stateManager = new StateManager();

// 초기에는 데이터베이스 처리를 하지 않고 로컬 상태관리로 진행하며 이후 전환에 용이하도록 구조 설계 필요
