class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();

    // 5분마다 만료된 캐시 정리
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  set(key, value, ttlSeconds = 300) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlSeconds * 1000);
  }

  get(key) {
    if (this.ttl.get(key) < Date.now()) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  cleanup() {
    const now = Date.now();
    for (const [key, expiry] of this.ttl.entries()) {
      if (expiry < now) {
        this.cache.delete(key);
        this.ttl.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  size() {
    return this.cache.size;
  }
}

export const cache = new MemoryCache();
