// src/utils/imageUtils.js - 강화된 이미지 처리
export class CoinImageManager {
  constructor() {
    this.imageCache = new Map();
    this.fallbackCache = new Map();
    this.cdnSources = [
      "coingecko",
      "coinmarketcap",
      "cryptocompare",
      "local",
      "placeholder",
    ];
  }

  // ✅ 다양한 소스에서 이미지 URL 생성 (데이터베이스 우선)
  generateImageUrls(coin) {
    const symbol = coin.symbol?.toLowerCase() || "";
    const id = coin.id || coin.coingecko_id || symbol;
    const cacheKey = `${symbol}-${id}`;

    // 캐시된 URL 확인
    if (this.imageCache.has(cacheKey)) {
      return this.imageCache.get(cacheKey);
    }

    const urls = [
      // 1. 데이터베이스에 저장된 이미지 URL (최우선)
      coin.image_url,
      coin.image,

      // 2. CoinGecko CDN (안정적)
      coin.coingecko_id
        ? `https://assets.coingecko.com/coins/images/${coin.coingecko_id}/large/${symbol}.png`
        : null,
      coin.coingecko_id
        ? `https://assets.coingecko.com/coins/images/${coin.coingecko_id}/small/${symbol}.png`
        : null,

      // 3. CoinMarketCap (백업)
      coin.cmc_id
        ? `https://s2.coinmarketcap.com/static/img/coins/64x64/${coin.cmc_id}.png`
        : null,

      // 4. CryptoCompare (백업)
      `https://www.cryptocompare.com/media/37746251/${symbol}.png`,

      // 5. 로컬 아이콘들
      `/icons/crypto/${symbol}.png`,
      `/icons/crypto/${symbol}.svg`,
      `/crypto-icons/${symbol}.png`,
      `/crypto-icons/${symbol}.svg`,

      // 6. 동적 플레이스홀더 (최종)
      this.generatePlaceholder(coin),
    ].filter(Boolean);

    this.imageCache.set(cacheKey, urls);
    return urls;
  }

  // ✅ SVG 플레이스홀더 생성 (향상된 버전)
  generatePlaceholder(coin) {
    const symbol = coin.symbol?.toUpperCase() || "COIN";
    const colors = this.getColorBySymbol(symbol);
    const displayText = symbol.length <= 4 ? symbol : symbol.slice(0, 3);

    return `data:image/svg+xml,${encodeURIComponent(`
            <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${colors.bg};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${colors.bgDark};stop-opacity:1" />
                    </linearGradient>
                </defs>
                <circle cx="24" cy="24" r="24" fill="url(#grad)"/>
                <text x="24" y="28" text-anchor="middle" fill="${colors.text}" 
                      font-family="Arial, sans-serif" font-size="12" font-weight="bold">
                    ${displayText}
                </text>
                <circle cx="24" cy="24" r="23" fill="none" stroke="${colors.border}" stroke-width="1" opacity="0.3"/>
            </svg>
        `)}`;
  }

  // ✅ 심볼 기반 색상 생성 (향상된 버전)
  getColorBySymbol(symbol) {
    // 유명한 코인들의 브랜드 컬러
    const brandColors = {
      BTC: {
        bg: "#F7931A",
        bgDark: "#E8851F",
        text: "#FFFFFF",
        border: "#D4751A",
      },
      ETH: {
        bg: "#627EEA",
        bgDark: "#4A6BDB",
        text: "#FFFFFF",
        border: "#3A5BCB",
      },
      XRP: {
        bg: "#23292F",
        bgDark: "#1A1F24",
        text: "#FFFFFF",
        border: "#0E1419",
      },
      ADA: {
        bg: "#0033AD",
        bgDark: "#002A94",
        text: "#FFFFFF",
        border: "#002184",
      },
      SOL: {
        bg: "#9945FF",
        bgDark: "#8A3FE6",
        text: "#FFFFFF",
        border: "#7B39D6",
      },
      DOGE: {
        bg: "#C2A633",
        bgDark: "#B39829",
        text: "#FFFFFF",
        border: "#A48A20",
      },
    };

    if (brandColors[symbol]) {
      return brandColors[symbol];
    }

    // 해시 기반 색상 생성
    const hash = symbol.split("").reduce((a, b) => a + b.charCodeAt(0), 0);
    const hue = hash % 360;
    const saturation = 60 + (hash % 20); // 60-80%
    const lightness = 45 + (hash % 15); // 45-60%

    const bgHsl = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    const bgDarkHsl = `hsl(${hue}, ${saturation}%, ${lightness - 10}%)`;
    const borderHsl = `hsl(${hue}, ${saturation}%, ${lightness - 20}%)`;

    return {
      bg: bgHsl,
      bgDark: bgDarkHsl,
      text: lightness > 50 ? "#000000" : "#FFFFFF",
      border: borderHsl,
    };
  }

  // ✅ 이미지 로드 검증 및 폴백
  async loadImageWithFallback(coin) {
    const urls = this.generateImageUrls(coin);
    const cacheKey = `validated-${coin.symbol || "unknown"}`;

    // 이미 검증된 URL이 있으면 반환
    if (this.fallbackCache.has(cacheKey)) {
      return this.fallbackCache.get(cacheKey);
    }

    // 순차적으로 URL 검증
    for (const url of urls) {
      if (await this.validateImageUrl(url)) {
        this.fallbackCache.set(cacheKey, url);
        return url;
      }
    }

    // 모든 URL이 실패하면 플레이스홀더 반환
    const placeholder = this.generatePlaceholder(coin);
    this.fallbackCache.set(cacheKey, placeholder);
    return placeholder;
  }

  // ✅ 이미지 URL 검증 (타임아웃 개선)
  async validateImageUrl(url) {
    if (!url || url.startsWith("data:")) return true; // SVG 플레이스홀더는 항상 유효

    return new Promise((resolve) => {
      const img = new Image();
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          img.onload = img.onerror = null;
        }
      };

      img.onload = () => {
        cleanup();
        resolve(true);
      };

      img.onerror = () => {
        cleanup();
        resolve(false);
      };

      // 2초 타임아웃 (더 빠르게)
      setTimeout(() => {
        cleanup();
        resolve(false);
      }, 2000);

      img.src = url;
    });
  }

  // ✅ 캐시 클리어 (메모리 관리)
  clearCache() {
    this.imageCache.clear();
    this.fallbackCache.clear();
  }

  // ✅ 캐시 상태 확인
  getCacheStatus() {
    return {
      imageCache: this.imageCache.size,
      fallbackCache: this.fallbackCache.size,
      totalMemory: (this.imageCache.size + this.fallbackCache.size) * 100, // 대략적 추정
    };
  }
}

export const coinImageManager = new CoinImageManager();
