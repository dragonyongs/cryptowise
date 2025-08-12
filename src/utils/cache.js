// src/utils/cache.js
class MemoryCache {
  constructor() {
    this.cache = new Map();  // 데이터 저장용 Map
    this.ttl = new Map();   // 만료 시간 저장용 Map
  }

  /**
   * 캐시에 값을 설정합니다.
   * @param {string} key - 캐시 키
   * @param {any} value - 저장할 값
   * @param {number} ttlSeconds - 만료 시간 (초 단위, 기본 300초 = 5분)
   */
  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlSeconds * 1000);
  }

  /**
   * 캐시에서 값을 가져옵니다. 만료된 경우 삭제하고 null 반환.
   * @param {string} key - 캐시 키
   * @returns {any|null} 캐시된 값 또는 null
   */
  get(key) {
    if (this.ttl.has(key) && this.ttl.get(key) > Date.now()) {
      return this.cache.get(key);
    }
    // 만료된 경우 삭제
    this.cache.delete(key);
    this.ttl.delete(key);
    return null;
  }

  /**
   * 특정 키의 캐시를 삭제합니다.
   * @param {string} key - 캐시 키
   */
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  /**
   * 모든 캐시를 초기화합니다.
   */
  clear() {
    this.cache.clear();
    this.ttl.clear();
  }
}

export const cache = new MemoryCache();
