import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 조건부 클래스명을 결합하고 TailwindCSS 클래스 충돌을 해결하는 유틸리티 함수
 * @param {...*} inputs - 클래스명, 조건부 객체, 배열 등
 * @returns {string} 병합된 클래스명 문자열
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// 기본 내보내기로도 제공
export default cn
