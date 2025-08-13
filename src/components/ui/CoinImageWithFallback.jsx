// src/components/ui/CoinImageWithFallback.jsx - 강화된 이미지 컴포넌트
import { useState, useEffect } from 'react'
import { coinImageManager } from '../../utils/imageUtils'

export function CoinImageWithFallback({
    coin,
    size = 32,
    className = '',
    alt,
    onError,
    priority = false
}) {
    const [currentSrc, setCurrentSrc] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        let isMounted = true

        const loadImage = async () => {
            if (!coin) return

            setIsLoading(true)
            setHasError(false)

            try {
                // 캐시된 이미지 URL 또는 폴백 이미지 로드
                const imageUrl = await coinImageManager.loadImageWithFallback(coin)

                if (isMounted) {
                    setCurrentSrc(imageUrl)
                    setIsLoading(false)
                }
            } catch (error) {
                console.error('이미지 로드 실패:', error)
                if (isMounted) {
                    setHasError(true)
                    setIsLoading(false)
                    // 최종 폴백으로 플레이스홀더 생성
                    setCurrentSrc(coinImageManager.generatePlaceholder(coin))
                }
            }
        }

        loadImage()

        return () => {
            isMounted = false
        }
    }, [coin?.symbol, coin?.id])

    const handleImageError = (e) => {
        setHasError(true)
        setIsLoading(false)
        onError?.(e)

        // 최종 폴백 이미지 설정
        if (coin) {
            setCurrentSrc(coinImageManager.generatePlaceholder(coin))
        }
    }

    const handleImageLoad = () => {
        setIsLoading(false)
        setHasError(false)
    }

    if (isLoading) {
        return (
            <div
                className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-full ${className}`}
                style={{ width: size, height: size }}
            >
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
            </div>
        )
    }

    return (
        <img
            src={currentSrc}
            alt={alt || coin?.display_name || coin?.name || coin?.symbol || 'Coin'}
            className={`object-cover ${className}`}
            style={{ width: size, height: size }}
            onError={handleImageError}
            onLoad={handleImageLoad}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
        />
    )
}
