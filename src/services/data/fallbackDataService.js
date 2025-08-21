// src/services/data/fallbackDataService.js
import { centralDataManager } from "./centralDataManager";

class FallbackDataService {
  constructor() {
    this.isWebSocketMode = true;
    this.pollingInterval = null;
  }

  // 🎯 웹소켓 실패시 폴링 모드로 전환
  async handleWebSocketFailure() {
    console.log("🔄 웹소켓 → 폴링 모드 전환");
    this.isWebSocketMode = false;

    // 중앙 데이터 매니저의 업데이트 간격 단축
    centralDataManager.updateSchedule.prices = 15000; // 15초로 단축

    // 추가 폴링 로직 (필요시)
    this.startEmergencyPolling();
  }

  startEmergencyPolling() {
    if (this.pollingInterval) return;

    this.pollingInterval = setInterval(async () => {
      try {
        // 최소한의 핵심 데이터만 업데이트
        await centralDataManager.updateSelectedCoinsData();
      } catch (error) {
        console.error("Emergency polling 실패:", error);
      }
    }, 20000); // 20초마다
  }
}

export const fallbackDataService = new FallbackDataService();
