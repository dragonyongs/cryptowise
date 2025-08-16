import { calculateAllIndicators } from "../../components/features/analysis/utils/calculateIndicators";

class UpbitWebSocketService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;

    // 실시간 가격 및 볼륨 히스토리 (기술적 지표 계산용)
    this.priceHistory = new Map();
    this.volumeHistory = new Map();
    this.maxHistoryLength = 100;
  }

  connect(symbols = ["KRW-BTC", "KRW-ETH", "KRW-XRP"]) {
    try {
      this.ws = new WebSocket("wss://api.upbit.com/websocket/v1");

      this.ws.onopen = () => {
        console.log("🚀 업비트 웹소켓 연결됨");
        this.reconnectAttempts = 0;

        const request = [
          { ticket: "cryptowise" },
          {
            type: "ticker",
            codes: symbols,
            isOnlySnapshot: false,
            isOnlyRealtime: true,
          },
        ];

        this.ws.send(JSON.stringify(request));
      };

      this.ws.onmessage = async (event) => {
        try {
          const arrayBuffer = await event.data.arrayBuffer();
          const textDecoder = new TextDecoder("utf-8");
          const data = JSON.parse(textDecoder.decode(arrayBuffer));

          this.broadcastToSubscribers(this.transformMarketData(data));
        } catch (error) {
          console.error("데이터 파싱 오류:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("❌ 업비트 웹소켓 연결 종료");
        this.handleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("업비트 웹소켓 오류:", error);
      };
    } catch (error) {
      console.error("웹소켓 연결 실패:", error);
    }
  }

  transformMarketData(upbitData) {
    const symbol = upbitData.code?.replace("KRW-", "") || "UNKNOWN";
    const price = upbitData.trade_price || 0;
    const volume = upbitData.trade_volume || 0;

    // 가격 및 볼륨 히스토리 업데이트
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
      this.volumeHistory.set(symbol, []);
    }

    const prices = this.priceHistory.get(symbol);
    const volumes = this.volumeHistory.get(symbol);

    prices.push(price);
    volumes.push(volume);

    // 최대 길이 유지
    if (prices.length > this.maxHistoryLength) {
      prices.shift();
      volumes.shift();
    }

    // 기술적 지표 계산 (충분한 데이터가 있을 때만)
    let indicators = {
      rsi: { latest: 50 },
      macd: { macd: 0, signal: 0, histogram: 0, cross: "neutral" },
      bb: {
        upper: price * 1.02,
        middle: price,
        lower: price * 0.98,
        position: "middle",
      },
      ma: {
        short: { current: price },
        long: { current: price },
      },
      volume: { latestRatio: 1 },
    };

    if (prices.length >= 26) {
      // MACD를 위한 최소 데이터
      indicators = calculateAllIndicators(prices, volumes);
    }

    return {
      symbol,
      price,
      volume24h: upbitData.acc_trade_volume_24h || 0,
      changePercent: (upbitData.signed_change_rate || 0) * 100,
      timestamp: new Date(upbitData.trade_timestamp || Date.now()),

      // 계산된 기술적 지표
      rsi: indicators.rsi.latest || 50,
      macd: {
        line: indicators.macd.macd || 0,
        signal: indicators.macd.signal || 0,
        histogram: indicators.macd.histogram || 0,
        cross: indicators.macd.cross || "neutral",
      },
      bollinger: {
        upper: indicators.bb.upper || price * 1.02,
        middle: indicators.bb.middle || price,
        lower: indicators.bb.lower || price * 0.98,
        position: indicators.bb.position || "middle",
      },
      ma20: indicators.ma.short.current || price,
      ma60: indicators.ma.long.current || price,
      volumeRatio: indicators.volume.latestRatio || 1,
    };
  }

  broadcastToSubscribers(data) {
    this.subscribers.forEach((callback, id) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`구독자 ${id} 콜백 오류:`, error);
      }
    });
  }

  subscribe(id, callback) {
    this.subscribers.set(id, callback);
    return () => this.unsubscribe(id);
  }

  unsubscribe(id) {
    this.subscribers.delete(id);
  }

  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.pow(2, this.reconnectAttempts) * 1000;

      console.log(
        `${delay / 1000}초 후 재연결 시도... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect();
      }, delay);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.subscribers.clear();
  }
}

export const upbitWebSocketService = new UpbitWebSocketService();
