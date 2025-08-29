// src/utils/storageCleanup.js
export const cleanupLegacyStorage = () => {
  try {
    console.log("🧹 Legacy 스토리지 정리 시작");

    // 기존 포트폴리오 설정들 정리
    const keysToCheck = ["cryptowise_config", "cryptowise_trading_settings"];

    keysToCheck.forEach((key) => {
      const stored = localStorage.getItem(key);
      if (stored) {
        console.log(`🧹 Legacy 설정 정리: ${key}`);
        localStorage.removeItem(key);
      }
    });

    // portfolio-store에서 config 부분만 정리
    const portfolioStore = localStorage.getItem("portfolio-store");
    if (portfolioStore) {
      try {
        const parsed = JSON.parse(portfolioStore);
        if (parsed.state && parsed.state.config) {
          delete parsed.state.config;
          localStorage.setItem("portfolio-store", JSON.stringify(parsed));
          console.log("🧹 Portfolio Store config 정리 완료");
        }
      } catch (e) {
        console.warn("Portfolio Store 정리 중 오류:", e);
      }
    }

    console.log("✅ Legacy 설정 정리 완료");
    return true;
  } catch (error) {
    console.error("❌ Storage 정리 실패:", error);
    return false;
  }
};

// 🔥 개발용 디버깅 함수들
export const debugStorage = () => {
  if (process.env.NODE_ENV !== "development") return;

  console.group("🔍 Storage 상태 디버깅");

  const keys = [
    "cryptowise_capital_store",
    "portfolio-store",
    "cryptowise_trading_settings",
    "cryptowise_config",
  ];

  keys.forEach((key) => {
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        console.log(`📦 ${key}:`, parsed);
      } catch (e) {
        console.log(`📦 ${key} (raw):`, stored);
      }
    } else {
      console.log(`📦 ${key}: 없음`);
    }
  });

  console.groupEnd();
};

// 필요시 브라우저 콘솔에서 호출 가능
if (process.env.NODE_ENV === "development") {
  window.cleanupLegacyStorage = cleanupLegacyStorage;
  window.debugStorage = debugStorage;
}
