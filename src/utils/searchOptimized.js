// src/utils/searchOptimized.js
class KoreanSearchEngine {
  constructor() {
    this.searchIndex = new Map();
    this.reverseIndex = new Map();
    this.tokenizer = this.createTokenizer();
    this.initialized = false;
  }

  // 토크나이저 - 다양한 검색 패턴 지원
  createTokenizer() {
    const synonyms = new Map([
      ["비트코인", ["bitcoin", "btc", "비트", "bit"]],
      ["이더리움", ["ethereum", "eth", "이더", "ether"]],
      ["리플", ["ripple", "xrp"]],
      ["폴카닷", ["polkadot", "dot"]],
      ["체인링크", ["chainlink", "link"]],
      // ... 핵심 코인들만 유지
    ]);

    // 패턴 매칭 추가
    const patterns = new Map([
      [/코인$/, ""], // "비트코인" → "비트"
      [/^(\w+)토큰$/, "$1"], // "체인링크토큰" → "체인링크"
      [/클래식$/, "classic"], // "이더리움클래식" → "ethereum classic"
    ]);

    return { synonyms, patterns };
  }

  // 업비트 데이터로 동적 색인 생성
  buildSearchIndex(upbitMarkets, coinGeckoData) {
    this.searchIndex.clear();
    this.reverseIndex.clear();

    // 1. 업비트 한글명 우선 처리
    upbitMarkets.forEach((market, symbol) => {
      const koreanName = market.korean_name?.toLowerCase();
      if (koreanName) {
        this.addToIndex(symbol, koreanName, "korean", 1000);
        this.addToIndex(symbol, symbol.toLowerCase(), "symbol", 900);
      }
    });

    // 2. CoinGecko 영문명 보완
    coinGeckoData.forEach((coin) => {
      const symbol = coin.symbol.toUpperCase();
      this.addToIndex(coin.id, coin.name.toLowerCase(), "english", 800);
      this.addToIndex(coin.id, symbol.toLowerCase(), "symbol", 850);

      // 기존 한글명이 없으면 동의어 사전에서 찾기
      if (!this.hasKoreanName(symbol)) {
        this.addSynonyms(coin.id, symbol);
      }
    });

    this.initialized = true;
  }

  addToIndex(coinId, term, type, score) {
    if (!this.searchIndex.has(term)) {
      this.searchIndex.set(term, new Map());
    }
    this.searchIndex.get(term).set(coinId, { type, score });

    // 역방향 인덱스
    if (!this.reverseIndex.has(coinId)) {
      this.reverseIndex.set(coinId, []);
    }
    this.reverseIndex.get(coinId).push({ term, type, score });
  }

  // 고급 검색 로직
  search(query, limit = 30) {
    if (!this.initialized || !query.trim()) return [];

    const normalizedQuery = query.toLowerCase().trim();
    const searchTerms = this.normalizeSearchTerm(normalizedQuery);
    const results = new Map();

    searchTerms.forEach((term) => {
      // 정확 매치
      if (this.searchIndex.has(term)) {
        this.searchIndex.get(term).forEach((data, coinId) => {
          this.addResult(
            results,
            coinId,
            data.score + 200,
            `exact_${data.type}`
          );
        });
      }

      // 부분 매치
      this.searchIndex.forEach((coinMap, indexedTerm) => {
        if (indexedTerm.includes(term) && indexedTerm !== term) {
          coinMap.forEach((data, coinId) => {
            this.addResult(results, coinId, data.score, `partial_${data.type}`);
          });
        }
      });

      // 퍼지 매치 (편집 거리 활용)
      this.fuzzySearch(term, results);
    });

    return this.rankResults(results, limit);
  }

  normalizeSearchTerm(term) {
    const terms = [term];

    // 동의어 확장
    this.tokenizer.synonyms.forEach((synonyms, korean) => {
      if (korean.includes(term) || term.includes(korean)) {
        terms.push(...synonyms);
      }
    });

    // 패턴 매칭
    this.tokenizer.patterns.forEach((replacement, pattern) => {
      const match = term.match(pattern);
      if (match) {
        terms.push(term.replace(pattern, replacement));
      }
    });

    return [...new Set(terms)];
  }

  addResult(results, coinId, score, matchType) {
    if (!results.has(coinId)) {
      results.set(coinId, { coinId, totalScore: 0, matches: [] });
    }
    const result = results.get(coinId);
    result.totalScore += score;
    result.matches.push(matchType);
  }

  rankResults(results, limit) {
    return Array.from(results.values())
      .sort((a, b) => {
        // 한글 매치 우선
        const aHasKorean = a.matches.some((m) => m.includes("korean"));
        const bHasKorean = b.matches.some((m) => m.includes("korean"));
        if (aHasKorean && !bHasKorean) return -1;
        if (bHasKorean && !aHasKorean) return 1;

        // 점수 순
        if (a.totalScore !== b.totalScore) return b.totalScore - a.totalScore;

        // 업비트 지원 우선 (별도 로직 필요)
        return 0;
      })
      .slice(0, limit);
  }

  fuzzySearch(term, results) {
    // 레벤슈타인 거리 기반 퍼지 매치
    if (term.length < 3) return; // 짧은 검색어는 퍼지 검색 제외

    this.searchIndex.forEach((coinMap, indexedTerm) => {
      const distance = this.levenshteinDistance(term, indexedTerm);
      const maxDistance = Math.floor(term.length / 3); // 33% 오차 허용

      if (distance <= maxDistance && distance > 0) {
        coinMap.forEach((data, coinId) => {
          const fuzzyScore = data.score - distance * 50; // 거리만큼 점수 차감
          this.addResult(results, coinId, fuzzyScore, `fuzzy_${data.type}`);
        });
      }
    });
  }

  levenshteinDistance(a, b) {
    const matrix = Array(b.length + 1)
      .fill(null)
      .map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[b.length][a.length];
  }
}

export default KoreanSearchEngine;
