// src/services/upbit/upbitPortfolioService.js
class UpbitPortfolioService {
  // 🎯 실제 업비트 계좌 잔고 조회
  async getRealPortfolioBalance(apiKey, secretKey) {
    try {
      const accounts = await this.getUpbitAccounts(apiKey, secretKey);
      const krwAccount = accounts.find((acc) => acc.currency === "KRW");
      return {
        totalKRW: parseFloat(krwAccount?.balance || 0),
        availableKRW: parseFloat(krwAccount?.balance || 0),
        coins: accounts.filter((acc) => acc.currency !== "KRW"),
      };
    } catch (error) {
      console.error("업비트 포트폴리오 조회 실패:", error);
      return null;
    }
  }
}

// 🎯 포트폴리오 설정 통합 관리
export const portfolioConfigManager = {
  // 개발 단계: 하드코딩된 값 사용
  development: () => PORTFOLIO_CONFIG.getInitialCapital(),

  // 테스트 단계: 커스텀 값 사용
  testing: (amount) => amount || 5000000,

  // 실전 단계: 업비트 API 사용
  production: async (apiCredentials) => {
    const realBalance = await upbitPortfolioService.getRealPortfolioBalance(
      apiCredentials.accessKey,
      apiCredentials.secretKey
    );
    return realBalance?.totalKRW || PORTFOLIO_CONFIG.INITIAL_CAPITAL;
  },
};
