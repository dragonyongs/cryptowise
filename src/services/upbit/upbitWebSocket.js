// src/services/upbit/upbitWebSocket.js - 데이터 수신 문제 해결 버전

class UpbitWebSocketService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.isTestMode = false;
    this.connectionState = "disconnected";
    this.pingInterval = null;
    this.reconnectTimeout = null;
    this.currentSymbols = [];

    // ✅ 핵심 통계만
    this.stats = {
      messagesReceived: 0,
      lastDataTime: 0,
      reconnectCount: 0,
      subscriberCount: 0,
    };

    this.debugMode = process.env.NODE_ENV === "development";
  }

  setTestMode(isTestMode = false) {
    this.isTestMode = isTestMode;
    console.log(`🔄 웹소켓 ${isTestMode ? "테스트" : "실전"} 모드`);
    return this;
  }

  log(message) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(
      `[${this.isTestMode ? "TEST" : "LIVE"}WS] ${timestamp} ${message}`
    );
  }

  // ✅ 핵심: 매우 단순하고 안정적인 연결
  async connect(symbols = ["KRW-BTC", "KRW-ETH"]) {
    if (this.connectionState === "connecting") {
      this.log("이미 연결 중...");
      return;
    }

    this.log(`🔌 웹소켓 연결 시도... (${symbols.length}개 코인)`);
    this.connectionState = "connecting";
    this.currentSymbols = symbols;

    try {
      // 기존 정리
      this.cleanup();

      // ✅ 새 연결
      this.ws = new WebSocket("wss://api.upbit.com/websocket/v1");
      this.ws.binaryType = "arraybuffer"; // 중요!

      // ✅ 연결 성공 - 즉시 구독
      this.ws.onopen = () => {
        this.log("✅ 웹소켓 연결 성공");
        this.connectionState = "connected";
        this.reconnectAttempts = 0;

        // 즉시 구독 요청 (가장 중요!)
        this.sendSubscription(symbols);

        // 30초마다 PING (업비트 120초 타임아웃 방지)
        this.startPing();
      };

      // ✅ 메시지 수신 - 강화된 처리
      this.ws.onmessage = (event) => {
        this.stats.messagesReceived++;
        this.stats.lastDataTime = Date.now();

        // 즉시 로그로 확인
        console.log(`🔥 [DEBUG] 메시지 수신: ${this.stats.messagesReceived}개`);

        this.handleMessage(event);
      };

      // ✅ 연결 종료 - 자동 재연결
      this.ws.onclose = (event) => {
        this.connectionState = "disconnected";
        this.stopPing();
        this.log(`❌ 연결 종료 (${event.code}) - 재연결 중...`);
        this.scheduleReconnect(symbols);
      };

      // ✅ 에러 - 자동 재연결
      this.ws.onerror = (error) => {
        this.log(`❌ 웹소켓 오류:`, error);
        this.scheduleReconnect(symbols);
      };
    } catch (error) {
      this.log(`❌ 연결 실패: ${error.message}`);
      this.connectionState = "error";
      this.scheduleReconnect(symbols);
    }
  }

  // ✅ 구독 요청 (단순화)
  sendSubscription(symbols) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.log("❌ 구독 실패: 웹소켓이 준비되지 않음");
      return;
    }

    try {
      const message = [
        { ticket: `cryptowise_${Date.now()}` },
        {
          type: "ticker",
          codes: symbols,
          isOnlySnapshot: false,
          isOnlyRealtime: true,
        },
      ];

      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
      this.log(`📡 구독 완료: ${symbols.length}개 코인`);
      this.log(`📤 구독 메시지: ${messageStr.substring(0, 200)}...`);
    } catch (error) {
      this.log(`❌ 구독 실패: ${error.message}`);
    }
  }

  // ✅ 메시지 처리 (완전 강화)
  handleMessage(event) {
    try {
      let data = event.data;

      console.log(
        `🔍 [DEBUG] 원본 데이터 타입:`,
        typeof data,
        data instanceof ArrayBuffer
      );

      // PONG 문자열 처리
      if (typeof data === "string") {
        if (data === "PONG" || data.includes("UP")) {
          this.log("📡 PONG 수신");
          return;
        }

        try {
          data = JSON.parse(data);
        } catch (e) {
          this.log(`❌ 문자열 JSON 파싱 실패: ${data.substring(0, 100)}`);
          return;
        }
      }

      // ArrayBuffer → JSON 변환
      if (data instanceof ArrayBuffer) {
        try {
          const decoder = new TextDecoder("utf-8");
          const textData = decoder.decode(data);
          console.log(
            `🔍 [DEBUG] 디코딩된 텍스트:`,
            textData.substring(0, 200)
          );

          data = JSON.parse(textData);
          console.log(`🔍 [DEBUG] 파싱된 데이터:`, data);
        } catch (e) {
          this.log(`❌ ArrayBuffer 처리 실패: ${e.message}`);
          return;
        }
      }

      // 티커 데이터 처리
      if (data && data.code && data.trade_price) {
        const symbol = data.code.replace("KRW-", "");
        const price = data.trade_price;

        console.log(
          `🎯 [DEBUG] 티커 처리: ${symbol} = ₩${price?.toLocaleString()}`
        );

        // 간단하고 안정적인 데이터 변환
        const transformedData = {
          symbol,
          code: data.code,
          price,
          trade_price: price,
          changePercent: (data.signed_change_rate || 0) * 100,
          volume24h: data.acc_trade_price_24h || 0,
          timestamp: new Date(),

          // 기본 기술적 지표
          rsi: 50,
          macd: { line: 0, signal: 0, histogram: 0 },
          bollinger: {
            upper: price * 1.02,
            middle: price,
            lower: price * 0.98,
          },
          ma20: price,
          volumeRatio: 1,

          // 메타데이터
          dataSource: "upbit_websocket",
          receivedAt: Date.now(),
          mode: this.isTestMode ? "TEST" : "LIVE",
        };

        console.log(`📤 [DEBUG] 브로드캐스트 데이터:`, transformedData);

        // 구독자들에게 전송
        this.broadcast(transformedData);

        // 로그 (10개마다)
        if (this.stats.messagesReceived % 10 === 0) {
          this.log(
            `📊 데이터 처리: ${this.stats.messagesReceived}개 (최근: ${symbol} ₩${price?.toLocaleString()})`
          );
        }
      } else {
        this.log(
          `⚠️ 예상치 못한 데이터 구조:`,
          JSON.stringify(data).substring(0, 200)
        );
      }
    } catch (error) {
      this.log(`❌ 메시지 처리 실패: ${error.message}`);
      console.error("메시지 처리 에러:", error, event.data);
    }
  }

  // ✅ 구독자에게 브로드캐스트 (강화)
  broadcast(data) {
    console.log(
      `📢 [DEBUG] 브로드캐스트 시작: ${this.subscribers.size}개 구독자`
    );

    if (this.subscribers.size === 0) {
      console.log(`⚠️ [DEBUG] 구독자가 없음`);
      return;
    }

    let successCount = 0;
    let errorCount = 0;

    for (const [id, callback] of this.subscribers) {
      try {
        console.log(`📤 [DEBUG] 구독자 ${id}에게 데이터 전송`);
        callback(data);
        successCount++;
      } catch (error) {
        this.log(`❌ 구독자 ${id} 오류: ${error.message}`);
        console.error("구독자 콜백 에러:", error);
        errorCount++;
        // 에러 발생한 구독자 제거
        this.subscribers.delete(id);
      }
    }

    console.log(
      `📊 [DEBUG] 브로드캐스트 완료: 성공 ${successCount}, 실패 ${errorCount}`
    );

    // 구독자 수 업데이트
    this.stats.subscriberCount = this.subscribers.size;
  }

  // ✅ PING 시작 (30초마다)
  startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send("PING");
          this.log("📡 PING 전송");
        } catch (error) {
          this.log("❌ PING 실패");
          this.forceReconnect();
        }
      }
    }, 30000); // 30초
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  // ✅ 재연결 스케줄 (안정화)
  scheduleReconnect(symbols) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log(`❌ 최대 재연결 시도 초과`);
      this.connectionState = "error";
      return;
    }

    this.reconnectAttempts++;
    this.stats.reconnectCount++;

    const delay = Math.min(this.reconnectAttempts * 2000, 10000); // 2초 → 10초
    this.log(
      `🔄 ${delay / 1000}초 후 재연결 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      if (this.connectionState !== "connected") {
        this.connect(symbols || this.currentSymbols);
      }
    }, delay);
  }

  // ✅ 강제 재연결
  forceReconnect() {
    this.log("🔄 강제 재연결 시작...");
    this.cleanup();
    setTimeout(() => {
      this.connect(this.currentSymbols);
    }, 1000);
  }

  // ✅ 리소스 정리 (안정화)
  cleanup() {
    this.stopPing();

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

  // ✅ 구독 관리 (강화)
  subscribe(id, callback) {
    if (typeof callback !== "function") {
      this.log(`❌ 유효하지 않은 콜백: ${id}`);
      return () => {};
    }

    this.subscribers.set(id, callback);
    this.stats.subscriberCount = this.subscribers.size;
    this.log(`➕ 구독자 추가: ${id} (총 ${this.stats.subscriberCount}개)`);

    console.log(`🔍 [DEBUG] 구독자 목록:`, Array.from(this.subscribers.keys()));

    return () => this.unsubscribe(id);
  }

  unsubscribe(id) {
    const removed = this.subscribers.delete(id);
    this.stats.subscriberCount = this.subscribers.size;

    if (removed) {
      this.log(`➖ 구독자 제거: ${id} (총 ${this.stats.subscriberCount}개)`);
    }
  }

  // ✅ 연결 상태 확인
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // ✅ 연결 해제 (안정화)
  disconnect() {
    this.log("🔌 웹소켓 연결 해제");
    this.connectionState = "disconnected";
    this.reconnectAttempts = this.maxReconnectAttempts; // 재연결 방지

    this.cleanup();
    this.subscribers.clear();
    this.stats.subscriberCount = 0;
    this.currentSymbols = [];
  }

  // ✅ 통계 조회 (개선)
  getStats() {
    return {
      isConnected: this.isConnected(),
      connectionState: this.connectionState,
      subscriberCount: this.subscribers.size,
      messagesReceived: this.stats.messagesReceived,
      reconnectCount: this.stats.reconnectCount,
      reconnectAttempts: this.reconnectAttempts,
      lastDataTime: this.stats.lastDataTime
        ? new Date(this.stats.lastDataTime)
        : null,
      mode: this.isTestMode ? "TEST" : "LIVE",
      currentSymbols: this.currentSymbols.length,
    };
  }

  // ✅ 헬스 체크
  healthCheck() {
    const stats = this.getStats();
    const now = Date.now();

    return {
      healthy: stats.isConnected && now - this.stats.lastDataTime < 120000, // 2분
      ...stats,
      lastDataAge: this.stats.lastDataTime
        ? now - this.stats.lastDataTime
        : null,
    };
  }

  // ✅ 디버그 정보
  getDebugInfo() {
    return {
      subscribers: Array.from(this.subscribers.keys()),
      subscriberCount: this.subscribers.size,
      wsReadyState: this.ws?.readyState,
      connectionState: this.connectionState,
      currentSymbols: this.currentSymbols,
      stats: this.stats,
      isConnected: this.isConnected(),
    };
  }
}

// 싱글톤 익스포트
export const upbitWebSocketService = new UpbitWebSocketService();
export default upbitWebSocketService;
