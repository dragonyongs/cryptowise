// API 엔드포인트
export const API_ENDPOINTS = {
  UPBIT: {
    BASE_URL: "https://api.upbit.com",
    WEBSOCKET: "wss://api.upbit.com/websocket/v1",
    TICKER: "/v1/ticker",
    CANDLES: "/v1/candles",
    ORDERBOOK: "/v1/orderbook",
    MARKETS: "/v1/market/all",
  },
  COINGECKO: {
    BASE_URL: "https://api.coingecko.com/api/v3",
    COINS: "/coins",
    MARKETS: "/coins/markets",
    PRICES: "/simple/price",
  },
};

// 거래 관련 상수
export const TRADING_CONFIG = {
  DEFAULT_PROFIT_TARGET: 8.0, // 8% 수익 목표
  DEFAULT_STOP_LOSS: -8.0, // -8% 손절선
  DEFAULT_BUY_PERCENTAGE: 30.0, // 30% 매수 비중
  DEFAULT_SELL_PERCENTAGE: 80.0, // 80% 매도 비중
  MIN_TRADE_AMOUNT: 5000, // 최소 거래 금액 (KRW)
  MAX_POSITION_SIZE: 10000000, // 최대 포지션 크기 (KRW)
};

// 기술적 분석 상수
export const TECHNICAL_INDICATORS = {
  RSI: {
    PERIOD: 14,
    OVERSOLD: 30,
    OVERBOUGHT: 70,
  },
  MACD: {
    FAST_PERIOD: 12,
    SLOW_PERIOD: 26,
    SIGNAL_PERIOD: 9,
  },
  BOLLINGER_BANDS: {
    PERIOD: 20,
    STD_DEV: 2,
  },
  MOVING_AVERAGE: {
    SHORT_PERIOD: 5,
    MEDIUM_PERIOD: 20,
    LONG_PERIOD: 60,
  },
};

// 백테스트 상수
export const BACKTEST_CONFIG = {
  INITIAL_BALANCE: 10000000, // 초기 자본 1천만원
  MAX_SYMBOLS: 10, // 최대 동시 보유 코인
  COMMISSION_RATE: 0.0005, // 수수료율 0.05%
  SLIPPAGE_RATE: 0.001, // 슬리피지 0.1%
};

// UI 관련 상수
export const UI_CONFIG = {
  COLORS: {
    PRIMARY: "#3B82F6",
    SUCCESS: "#10B981",
    DANGER: "#EF4444",
    WARNING: "#F59E0B",
    NEUTRAL: "#6B7280",
  },
  BREAKPOINTS: {
    SM: "640px",
    MD: "768px",
    LG: "1024px",
    XL: "1280px",
  },
  CHART: {
    HEIGHT: 400,
    COLORS: ["#3B82F6", "#10B981", "#EF4444", "#F59E0B", "#8B5CF6"],
  },
};

// 데이터 갱신 주기
export const UPDATE_INTERVALS = {
  REAL_TIME: 300000, // 1초 1000
  MARKET_DATA: 300000, // 5초 5000
  SIGNALS: 300000, // 30초 30000
  PORTFOLIO: 300000, // 1분 60000
  NEWS: 300000, // 5분 300000
};

// 캐시 TTL
export const CACHE_TTL = {
  MARKET_DATA: 300, // 5분
  COIN_INFO: 3600, // 1시간
  NEWS: 1800, // 30분
  HISTORICAL_DATA: 7200, // 2시간
};

// 신호 신뢰도 등급
export const SIGNAL_CONFIDENCE = {
  VERY_LOW: 0.2,
  LOW: 0.4,
  MEDIUM: 0.6,
  HIGH: 0.8,
  VERY_HIGH: 0.9,
};

// 리스크 레벨
export const RISK_LEVELS = {
  VERY_LOW: 1,
  LOW: 3,
  MEDIUM: 5,
  HIGH: 7,
  VERY_HIGH: 9,
};

// 알림 타입
export const NOTIFICATION_TYPES = {
  SIGNAL_ALERT: "signal_alert",
  PRICE_ALERT: "price_alert",
  TRADE_EXECUTED: "trade_executed",
  SYSTEM_NOTICE: "system_notice",
  ERROR: "error",
};

// 거래 모드
export const TRADING_MODES = {
  BUY_ONLY: "buyonly",
  SELL_ONLY: "sellonly",
  BOTH: "both",
  HOLD: "hold",
};

// 구독 플랜
export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: "Free",
    maxCoins: 10,
    signalsPerDay: 3,
    backtesting: false,
  },
  BASIC: {
    name: "Basic",
    maxCoins: 50,
    signalsPerDay: 20,
    backtesting: true,
  },
  PREMIUM: {
    name: "Premium",
    maxCoins: -1, // 무제한
    signalsPerDay: -1, // 무제한
    backtesting: true,
    customStrategies: true,
  },
};
