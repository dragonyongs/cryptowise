// src/components/CoinImage.jsx - 스마트 이미지 로더
import { useState, useEffect } from 'react'
import { coinImageManager } from '../utils/imageUtils'

export default function CoinImage({
    coin,
    size = 48,
    className = "",
    showStatus = false
}) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0)
    const [imageUrls, setImageUrls] = useState([])
    const [loading, setLoading] = useState(true)
    const [hasError, setHasError] = useState(false)

    useEffect(() => {
        const urls = coinImageManager.generateImageUrls(coin)
        setImageUrls(urls)
        setCurrentImageIndex(0)
        setLoading(true)
        setHasError(false)
    }, [coin])

    const handleImageError = async () => {
        if (currentImageIndex < imageUrls.length - 1) {
            setCurrentImageIndex(prev => prev + 1)
        } else {
            setHasError(true)
            setLoading(false)
        }
    }

    const handleImageLoad = () => {
        setLoading(false)
        setHasError(false)
    }

    const currentImageUrl = imageUrls[currentImageIndex]

    return (
        <div className={`relative ${className}`} style={{ width: size, height: size }}>
            {currentImageUrl && !hasError ? (
                <img
                    src={currentImageUrl}
                    alt={coin.name || coin.symbol}
                    className={`w-full h-full rounded-full object-cover transition-opacity duration-200 ${loading ? 'opacity-0' : 'opacity-100'
                        }`}
                    onError={handleImageError}
                    onLoad={handleImageLoad}
                />
            ) : (
                // 최종 SVG 플레이스홀더
                <div
                    className="w-full h-full rounded-full flex items-center justify-center text-white font-bold"
                    style={{
                        background: coinImageManager.getColorBySymbol(coin.symbol).bg,
                        fontSize: `${size * 0.3}px`
                    }}
                >
                    {coin.symbol.slice(0, 3).toUpperCase()}
                </div>
            )}

            {/* 로딩 표시 */}
            {loading && (
                <div className="absolute inset-0 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            )}

            {/* 상태 표시 */}
            {showStatus && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800">
                    {coin.upbit_supported ? (
                        <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">🇰🇷</span>
                        </div>
                    ) : coin.isInWatchlist ? (
                        <div className="w-full h-full bg-green-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    )
}
