// src/services/upbit/upbitWebSocket.js - 완전 간소화 버전

class UpbitWebSocketService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.connectionState = "disconnected";
    this.currentSymbols = [];
    this.isTestMode = false;
    this.reconnectTimeout = null;

    // 간단한 통계
    this.stats = {
      messagesReceived: 0,
      lastDataTime: 0,
      subscriberCount: 0,
    };
  }

  setTestMode(isTestMode = false) {
    this.isTestMode = isTestMode;
    return this;
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `[${this.isTestMode ? "TEST" : "LIVE"}WS] ${timestamp} ${message}`
    );
  }

  // 🎯 핵심: 매우 간단한 연결
  async connect(symbols = ["KRW-BTC", "KRW-ETH"]) {
    if (this.connectionState === "connecting") {
      this.log("이미 연결 중...");
      return;
    }

    this.log(`🔌 웹소켓 연결 시도... (${symbols.length}개 코인)`);
    this.connectionState = "connecting";
    this.currentSymbols = symbols;

    try {
      // 기존 연결 정리
      this.cleanup();

      // 새 연결
      this.ws = new WebSocket("wss://api.upbit.com/websocket/v1");
      this.ws.binaryType = "arraybuffer";

      this.ws.onopen = () => {
        this.log("✅ 웹소켓 연결 성공");
        this.connectionState = "connected";
        this.sendSubscription(symbols);
      };

      this.ws.onmessage = (event) => {
        this.stats.messagesReceived++;
        this.stats.lastDataTime = Date.now();
        this.handleMessage(event);
      };

      this.ws.onclose = (event) => {
        this.connectionState = "disconnected";
        this.log(`❌ 연결 종료 (${event.code})`);
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        this.log(`❌ 웹소켓 오류: ${error}`);
        this.connectionState = "error";
      };
    } catch (error) {
      this.log(`❌ 연결 실패: ${error.message}`);
      this.connectionState = "error";
    }
  }

  // 🎯 간단한 구독 요청
  sendSubscription(symbols) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log("❌ 구독 실패: 웹소켓이 준비되지 않음");
      return;
    }

    try {
      const message = [
        { ticket: "cryptowise_simple" },
        {
          type: "ticker",
          codes: symbols,
          isOnlyRealtime: true,
        },
      ];

      this.ws.send(JSON.stringify(message));
      this.log(`📡 구독 완료: ${symbols.length}개 코인`);
    } catch (error) {
      this.log(`❌ 구독 실패: ${error.message}`);
    }
  }

  // 🎯 간단한 메시지 처리
  handleMessage(event) {
    try {
      let data = event.data;

      // ArrayBuffer → JSON 변환
      if (data instanceof ArrayBuffer) {
        const decoder = new TextDecoder("utf-8");
        const textData = decoder.decode(data);
        data = JSON.parse(textData);
      } else if (typeof data === "string") {
        data = JSON.parse(data);
      }

      // 티커 데이터 처리
      if (data && data.code && data.trade_price) {
        const symbol = data.code.replace("KRW-", "");

        // 간단한 데이터 변환
        const transformedData = {
          symbol,
          code: data.code,
          trade_price: data.trade_price,
          signed_change_rate: data.signed_change_rate,
          acc_trade_price_24h: data.acc_trade_price_24h,
          timestamp: new Date(),
          // 추가 필드들
          price: data.trade_price,
          changePercent: (data.signed_change_rate || 0) * 100,
          volume24h: data.acc_trade_price_24h || 0,
        };

        // 구독자들에게 전송
        this.broadcast(transformedData);

        // 간단한 로그 (100개마다)
        if (this.stats.messagesReceived % 100 === 0) {
          this.log(
            `📊 데이터 처리: ${this.stats.messagesReceived}개 (최근: ${symbol})`
          );
        }
      }
    } catch (error) {
      this.log(`❌ 메시지 처리 실패: ${error.message}`);
    }
  }

  // 🎯 구독자에게 브로드캐스트
  broadcast(data) {
    for (const [id, callback] of this.subscribers) {
      try {
        callback(data);
      } catch (error) {
        this.log(`❌ 구독자 ${id} 오류: ${error.message}`);
        this.subscribers.delete(id); // 에러 발생한 구독자 제거
      }
    }
    this.stats.subscriberCount = this.subscribers.size;
  }

  // 🎯 재연결 (간소화)
  scheduleReconnect() {
    if (this.reconnectTimeout) return;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.connectionState !== "connected") {
        this.connect(this.currentSymbols);
      }
    }, 5000); // 5초 후 재연결
  }

  // 🎯 리소스 정리
  cleanup() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch (error) {
        // 무시
      }
      this.ws = null;
    }
  }

  // 🎯 구독 관리 (기존 인터페이스 유지)
  subscribe(id, callback) {
    if (typeof callback !== "function") {
      this.log(`❌ 유효하지 않은 콜백: ${id}`);
      return () => {};
    }

    this.subscribers.set(id, callback);
    this.stats.subscriberCount = this.subscribers.size;
    this.log(`➕ 구독자 추가: ${id} (총 ${this.stats.subscriberCount}개)`);

    return () => this.unsubscribe(id);
  }

  unsubscribe(id) {
    const removed = this.subscribers.delete(id);
    this.stats.subscriberCount = this.subscribers.size;
    if (removed) {
      this.log(`➖ 구독자 제거: ${id} (총 ${this.stats.subscriberCount}개)`);
    }
  }

  // 🎯 연결 상태 확인 (기존 인터페이스 유지)
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  disconnect() {
    this.log("🔌 웹소켓 연결 해제");
    this.connectionState = "disconnected";
    this.cleanup();
    this.subscribers.clear();
    this.stats.subscriberCount = 0;
    this.currentSymbols = [];
  }

  // 🎯 통계 조회 (기존 인터페이스 유지)
  getStats() {
    return {
      isConnected: this.isConnected(),
      connectionState: this.connectionState,
      subscriberCount: this.subscribers.size,
      messagesReceived: this.stats.messagesReceived,
      lastDataTime: this.stats.lastDataTime
        ? new Date(this.stats.lastDataTime)
        : null,
      mode: this.isTestMode ? "TEST" : "LIVE",
      currentSymbols: this.currentSymbols.length,
    };
  }

  // 🎯 헬스 체크 (기존 인터페이스 유지)
  healthCheck() {
    const stats = this.getStats();
    const now = Date.now();
    return {
      healthy: stats.isConnected && now - this.stats.lastDataTime < 120000,
      ...stats,
      lastDataAge: this.stats.lastDataTime
        ? now - this.stats.lastDataTime
        : null,
    };
  }
}

// 싱글톤 익스포트 (기존과 동일)
export const upbitWebSocketService = new UpbitWebSocketService();
export default upbitWebSocketService;
