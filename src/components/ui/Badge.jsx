// src/components/ui/Badge.jsx
import { cva } from 'class-variance-authority'
import { cn } from '../../utils/cn'

const badgeVariants = cva(
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
                secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
                outline: "text-foreground",

                // CryptoWise 전용 variants
                success: "border-transparent bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300",
                warning: "border-transparent bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300",
                danger: "border-transparent bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300",
                info: "border-transparent bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300",

                // 시장 상태용
                bullish: "border-transparent bg-green-500 text-white hover:bg-green-600",
                bearish: "border-transparent bg-red-500 text-white hover:bg-red-600",
                neutral: "border-transparent bg-gray-500 text-white hover:bg-gray-600",

                // 리스크 레벨용
                "risk-low": "border-transparent bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
                "risk-medium": "border-transparent bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
                "risk-high": "border-transparent bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            },
            size: {
                default: "px-2.5 py-0.5 text-xs",
                sm: "px-2 py-0.5 text-xs rounded-md",
                lg: "px-3 py-1 text-sm rounded-lg",
                xl: "px-4 py-2 text-base rounded-lg"
            }
        },
        defaultVariants: {
            variant: "default",
            size: "default"
        }
    }
)

export function Badge({ className, variant, size, ...props }) {
    return (
        <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
    )
}

// CryptoWise 전용 Badge 컴포넌트들
export function StatusBadge({ status, ...props }) {
    const getVariant = (status) => {
        switch (status.toLowerCase()) {
            case 'active':
            case 'running':
            case 'completed':
                return 'success'
            case 'paused':
            case 'warning':
                return 'warning'
            case 'error':
            case 'failed':
            case 'stopped':
                return 'danger'
            default:
                return 'info'
        }
    }

    return (
        <Badge variant={getVariant(status)} {...props}>
            {status}
        </Badge>
    )
}

export function RiskBadge({ riskLevel, ...props }) {
    const getRiskVariant = (level) => {
        if (level <= 3) return 'risk-low'
        if (level <= 6) return 'risk-medium'
        return 'risk-high'
    }

    const getRiskLabel = (level) => {
        if (level <= 3) return '안전'
        if (level <= 6) return '보통'
        if (level <= 8) return '위험'
        return '매우 위험'
    }

    return (
        <Badge variant={getRiskVariant(riskLevel)} {...props}>
            {getRiskLabel(riskLevel)} ({riskLevel}/10)
        </Badge>
    )
}

export function SignalBadge({ signal, confidence, ...props }) {
    const getSignalVariant = (signal) => {
        switch (signal.toUpperCase()) {
            case 'BUY':
            case 'STRONG_BUY':
                return 'bullish'
            case 'SELL':
            case 'STRONG_SELL':
                return 'bearish'
            default:
                return 'neutral'
        }
    }

    return (
        <Badge variant={getSignalVariant(signal)} {...props}>
            {signal} {confidence && `(${confidence}%)`}
        </Badge>
    )
}

export function PriceBadge({ change, ...props }) {
    const variant = change >= 0 ? 'bullish' : 'bearish'
    const prefix = change >= 0 ? '+' : ''

    return (
        <Badge variant={variant} {...props}>
            {prefix}{change.toFixed(2)}%
        </Badge>
    )
}

export default Badge
