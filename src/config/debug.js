// src/config/debug.js
export const DEBUG_CONFIG = {
  development: {
    enabled: true,
    coinStore: {
      logSelectedCoins: true,
      logLoading: false, // 로그 스팸 방지
      logPriceUpdates: false,
      throttleMs: 2000,
    },
    analysisStore: {
      enabled: true,
      logAnalysis: true,
      maxLogs: 10,
      throttleMs: 1000,
    },
    api: {
      logRequests: true,
      logResponses: false,
      logErrors: true,
    },
    performance: {
      enabled: true,
      trackSubscribes: true,
      trackRenders: true,
      trackApi: true,
      autoReport: true,
      reportInterval: 60000, // 1분마다
    },
  },
  production: {
    enabled: false,
    coinStore: { enabled: false },
    analysisStore: { enabled: false },
    api: { logErrors: true }, // 프로덕션에서도 에러는 로그
    performance: { enabled: false },
  },
};

export const getDebugConfig = () => {
  return DEBUG_CONFIG[process.env.NODE_ENV] || DEBUG_CONFIG.production;
};

// URL 파라미터로 디버깅 레벨 제어
export const getDebugLevel = () => {
  if (typeof window === "undefined") return "off";

  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("debug") || "auto";
};

// 디버깅 활성화 여부 판단
export const isDebugEnabled = (category) => {
  const config = getDebugConfig();
  const level = getDebugLevel();

  if (level === "off") return false;
  if (level === "full") return true;

  return config.enabled && config[category]?.enabled !== false;
};

// 로그 헬퍼 함수들
export const debugLog = {
  coin: (...args) => isDebugEnabled("coinStore") && console.log("🪙", ...args),
  analysis: (...args) =>
    isDebugEnabled("analysisStore") && console.log("📊", ...args),
  api: (...args) => isDebugEnabled("api") && console.log("🌐", ...args),
  performance: (...args) =>
    isDebugEnabled("performance") && console.log("⚡", ...args),
  error: (...args) => console.error("❌", ...args), // 에러는 항상 로그
};

// 디버그 콘솔 명령어
if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  window.cryptoDebug = {
    setLevel: (level) => {
      const url = new URL(window.location);
      url.searchParams.set("debug", level);
      window.location.href = url.toString();
    },
    config: () => getDebugConfig(),
    level: () => getDebugLevel(),
    test: () => {
      debugLog.coin("Test coin log");
      debugLog.analysis("Test analysis log");
      debugLog.api("Test API log");
      debugLog.performance("Test performance log");
    },
  };

  console.log("🔧 Debug commands available:");
  console.log('  cryptoDebug.setLevel("off")   - 디버깅 비활성화');
  console.log('  cryptoDebug.setLevel("auto")  - 자동 디버깅');
  console.log('  cryptoDebug.setLevel("full")  - 전체 디버깅');
  console.log("  cryptoDebug.config()          - 설정 확인");
  console.log("  cryptoDebug.test()            - 디버그 로그 테스트");
}
