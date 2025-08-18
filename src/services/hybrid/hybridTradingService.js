// src/services/hybrid/hybridTradingService.js
class HybridTradingService {
  constructor() {
    this.useWebSocket = false; // 기본적으로 폴링
    this.webSocketTriggers = [
      "major_news_event", // 중대 뉴스
      "high_volatility", // 고변동성 (3% 이상)
      "volume_spike", // 거래량 급증 (2배 이상)
      "user_manual_activation", // 사용자 수동 활성화
    ];
  }

  // ✅ 이벤트 기반 실시간 모드 전환
  async checkForWebSocketTriggers() {
    const marketData = await this.getMarketSnapshot();

    let shouldUseWebSocket = false;
    let trigger = null;

    // 고변동성 체크
    if (marketData.volatility > 3.0) {
      shouldUseWebSocket = true;
      trigger = "high_volatility";
    }

    // 거래량 급증 체크
    if (marketData.volumeSpike > 2.0) {
      shouldUseWebSocket = true;
      trigger = "volume_spike";
    }

    // 중대 뉴스 체크 (간단한 키워드 기반)
    const news = await this.checkMajorNews();
    if (news.isMajor) {
      shouldUseWebSocket = true;
      trigger = "major_news_event";
    }

    if (shouldUseWebSocket && !this.useWebSocket) {
      console.log(`🚀 실시간 모드 활성화: ${trigger}`);
      await this.activateWebSocketMode();

      // 30분 후 자동 해제
      setTimeout(
        () => {
          this.deactivateWebSocketMode();
        },
        30 * 60 * 1000
      );
    }
  }

  async activateWebSocketMode() {
    this.useWebSocket = true;
    // 기존 WebSocket 코드 활성화
  }

  async deactivateWebSocketMode() {
    this.useWebSocket = false;
    console.log("🕐 폴링 모드로 복귀");
    // WebSocket 연결 해제
  }
}
