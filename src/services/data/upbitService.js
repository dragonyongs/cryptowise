// src/services/data/upbitWebSocket.js
class UpbitRealTimeService {
    constructor() {
        this.ws = null;
        this.subscribers = new Map();
    }

    connect() {
        this.ws = new WebSocket('wss://api.upbit.com/websocket/v1');
        
        this.ws.onopen = () => {
            this.ws.send(JSON.stringify([
                { ticket: 'cryptowise' },
                { type: 'ticker', codes: this.getTopKoreanCoins() },
                { type: 'orderbook', codes: this.getTopKoreanCoins() }
            ]));
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.broadcastToSubscribers(data);
        };
    }

    getTopKoreanCoins() {
        return ['KRW-BTC', 'KRW-ETH', 'KRW-ADA', 'KRW-DOT', 'KRW-LINK', 'KRW-XRP', 'KRW-LTC', 'KRW-BCH', 'KRW-SOL', 'KRW-AVAX'];
    }
}
