// API 호출 최적화를 위한 스케줄러
export class DataScheduler {
  static CACHE_DURATION = 24 * 60 * 60 * 1000; // 24시간
  static DAILY_UPDATE_TIME = 9; // 오전 9시

  // 캐시된 데이터 확인
  static getCachedData(key) {
    const cached = localStorage.getItem(`cache_${key}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > this.CACHE_DURATION) {
      localStorage.removeItem(`cache_${key}`);
      return null;
    }

    return data;
  }

  // 데이터 캐시 저장
  static setCachedData(key, data) {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`cache_${key}`, JSON.stringify(cacheData));
  }

  // 다음 업데이트 시간 계산
  static getNextUpdateTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(this.DAILY_UPDATE_TIME, 0, 0, 0);

    return tomorrow;
  }

  // 수동 새로고침 제한 (1분에 1회)
  static canRefresh() {
    const lastRefresh = localStorage.getItem("last_manual_refresh");
    if (!lastRefresh) return true;

    return Date.now() - parseInt(lastRefresh) > 60000; // 1분
  }

  static setLastRefresh() {
    localStorage.setItem("last_manual_refresh", Date.now().toString());
  }
}
