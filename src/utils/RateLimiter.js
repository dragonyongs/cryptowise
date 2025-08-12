// src/utils/RateLimiter.js
export default class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    this.requests = []
  }

  async execute(apiCall) {
    const now = Date.now()
    
    // 윈도우 시간 밖의 요청 제거
    this.requests = this.requests.filter(time => now - time < this.windowMs)
    
    // 최대 요청 수 초과시 대기
    if (this.requests.length >= this.maxRequests) {
      const waitTime = this.windowMs - (now - this.requests[0])
      console.log(`⏳ Rate limit 대기: ${waitTime}ms`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    this.requests.push(now)
    return await apiCall()
  }

  async wait() {
    return this.execute(() => Promise.resolve())
  }
}
