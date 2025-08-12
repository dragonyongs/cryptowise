// 숫자 포맷팅
export const formatNumber = {
  // 가격 포맷팅 (KRW)
  price(value, minimumFractionDigits = 0) {
    if (value === null || value === undefined) return '0'
    
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits,
      maximumFractionDigits: 8
    }).format(value)
  },

  // 일반 숫자 포맷팅
  number: (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '0'
    return Number(num).toLocaleString('ko-KR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    })
  },

  // 퍼센트 포맷팅
  percent: (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '0.00%'
    return `${Number(num).toFixed(decimals)}%`
  },

  // 압축된 숫자 (K, M, B)
  compact(value) {
    if (value === null || value === undefined) return '0'
    
    const formatter = new Intl.NumberFormat('ko-KR', {
      notation: 'compact',
      compactDisplay: 'short'
    })
    
    return formatter.format(value)
  },

  // 암호화폐 수량 포맷팅
  crypto: (num, decimals = 8) => {
    if (num === null || num === undefined || isNaN(num)) return '0'
    return Number(num).toFixed(decimals)
  }
}

// 날짜 포맷팅
export const formatDate = {
  // 상대적 시간 (몇 분 전, 몇 시간 전)
  relative(date) {
    const now = new Date()
    const target = new Date(date)
    const diffInMs = now - target
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 1) return '방금 전'
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`
    if (diffInHours < 24) return `${diffInHours}시간 전`
    if (diffInDays < 7) return `${diffInDays}일 전`
    
    return this.short(date)
  },

  // 짧은 날짜 (MM/DD)
  short(date) {
    return new Intl.DateTimeFormat('ko-KR', {
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(date))
  },

  // 긴 날짜 (YYYY.MM.DD)
  long(date) {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(new Date(date))
  },

  // 날짜와 시간 (YYYY.MM.DD HH:mm)
  dateTime(date) {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(date))
  },

  // 시간만 (HH:mm)
  time(date) {
    return new Intl.DateTimeFormat('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date(date))
  }
}

// 텍스트 포맷팅
export const formatText = {
  // 코인 심볼 정리 (KRW-BTC -> BTC)
  symbol(symbol) {
    if (!symbol) return ''
    return symbol.replace('KRW-', '').toUpperCase()
  },

  // 긴 텍스트 줄임 (ellipsis)
  ellipsis(text, maxLength = 50) {
    if (!text) return ''
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  },

  // 첫 글자 대문자
  capitalize(text) {
    if (!text) return ''
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
  },

  // 카멜케이스를 띄어쓰기로 변환
  camelToSpace(text) {
    return text.replace(/([A-Z])/g, ' $1').trim()
  }
}

// 색상 유틸리티
export const formatColor = {
  // 수익률에 따른 색상
  profitRate(value) {
    if (value > 0) return 'text-green-600'
    if (value < 0) return 'text-red-600'
    return 'text-gray-600'
  },

  // 신호 타입에 따른 색상
  signalType(type) {
    switch (type?.toLowerCase()) {
      case 'buy': return 'text-blue-600'
      case 'sell': return 'text-red-600'
      case 'hold': return 'text-yellow-600'
      default: return 'text-gray-600'
    }
  },

  // 신뢰도에 따른 색상
  confidence(value) {
    if (value >= 0.8) return 'text-green-600'
    if (value >= 0.6) return 'text-yellow-600'
    if (value >= 0.4) return 'text-orange-600'
    return 'text-red-600'
  }
}

// 검증 유틸리티
export const validate = {
  // 이메일 검증
  email(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // 숫자 검증
  number(value, min = null, max = null) {
    const num = parseFloat(value)
    if (isNaN(num)) return false
    if (min !== null && num < min) return false
    if (max !== null && num > max) return false
    return true
  },

  // 퍼센트 검증
  percent(value) {
    return this.number(value, 0, 100)
  },

  // 가격 검증
  price(value) {
    return this.number(value, 0)
  }
}

// 데이터 변환 유틸리티
export const transform = {
  // 배열을 객체로 변환 (키 기준)
  arrayToObject(array, keyField) {
    return array.reduce((obj, item) => {
      obj[item[keyField]] = item
      return obj
    }, {})
  },

  // 객체를 배열로 변환
  objectToArray(obj) {
    return Object.keys(obj).map(key => ({ key, ...obj[key] }))
  },

  // 차트 데이터 변환
  toChartData(data, xField, yField) {
    return data.map(item => ({
      x: item[xField],
      y: item[yField]
    }))
  }
}

// USD를 KRW로 변환 (대략 1,300배)
const USD_TO_KRW_RATE = 1300

export const formatPrice = (price, currency = 'KRW') => {
  if (!price || isNaN(price)) return '₩0'
  
  // USD 가격을 KRW로 변환
  const krwPrice = price * USD_TO_KRW_RATE
  
  // 가격에 따른 소수점 처리
  let formattedPrice
  if (krwPrice >= 1000) {
    // 1000원 이상은 소수점 없이
    formattedPrice = Math.round(krwPrice).toLocaleString('ko-KR')
  } else if (krwPrice >= 1) {
    // 1원~1000원은 소수점 2자리
    formattedPrice = krwPrice.toLocaleString('ko-KR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  } else {
    // 1원 미만은 소수점 4자리
    formattedPrice = krwPrice.toLocaleString('ko-KR', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    })
  }
  
  return `₩${formattedPrice}`
}

export const formatPercentage = (num, decimals = 2) => {
  if (!num || isNaN(num)) return '0.00%'
  
  return `${Number(num).toFixed(decimals)}%`
}