// src/features/settings/CoinControls.jsx
import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Toggle, SliderInput, RadioGroup, Input } from '@/components/ui/Form'
import { Badge, StatusBadge } from '@/components/ui/Badge'

// 기본 설정 함수
const getDefaultConfig = () => ({
    isActive: true,
    mode: 'both',
    buyPercentage: 30,
    maxPositionSize: 1000000,
    profitTarget: 8,
    stopLoss: -8,
    priority: 'medium',
    riskLevel: 5
})

// 템플릿 설정
const templates = {
    conservative: {
        isActive: true,
        mode: 'both',
        buyPercentage: 20,
        maxPositionSize: 500000,
        profitTarget: 5,
        stopLoss: -5,
        priority: 'low',
        riskLevel: 3
    },
    aggressive: {
        isActive: true,
        mode: 'both',
        buyPercentage: 50,
        maxPositionSize: 2000000,
        profitTarget: 15,
        stopLoss: -15,
        priority: 'high',
        riskLevel: 8
    },
    balanced: {
        isActive: true,
        mode: 'both',
        buyPercentage: 35,
        maxPositionSize: 1500000,
        profitTarget: 10,
        stopLoss: -10,
        priority: 'medium',
        riskLevel: 5
    }
}

export default function CoinControls({ coins = [], onConfigUpdate }) {
    const [configs, setConfigs] = useState({})
    const [loading, setLoading] = useState(false)

    const updateConfig = (symbol, key, value) => {
        const newConfig = {
            ...(configs[symbol] || getDefaultConfig()),
            [key]: value
        }
        setConfigs(prev => ({ ...prev, [symbol]: newConfig }))

        // 상위 컴포넌트에 변경사항 전달
        if (onConfigUpdate) {
            onConfigUpdate(symbol, newConfig)
        }
    }

    const applyTemplate = async (templateName) => {
        if (!templates[templateName]) {
            console.warn(`템플릿 '${templateName}'을 찾을 수 없습니다.`)
            return
        }

        setLoading(true)

        try {
            const newConfigs = {}
            coins.forEach(coin => {
                newConfigs[coin.symbol] = { ...templates[templateName] }
            })

            setConfigs(newConfigs)

            // 각 코인에 대해 설정 업데이트 알림
            if (onConfigUpdate) {
                coins.forEach(coin => {
                    onConfigUpdate(coin.symbol, newConfigs[coin.symbol])
                })
            }

            console.log(`${templateName} 템플릿이 모든 코인에 적용되었습니다.`)
        } catch (error) {
            console.error('템플릿 적용 중 오류 발생:', error)
        } finally {
            setLoading(false)
        }
    }

    // coins 배열 검증
    if (!Array.isArray(coins)) {
        return (
            <Card className="p-6">
                <div className="text-center text-red-600">
                    <p>⚠️ 코인 데이터가 올바르지 않습니다.</p>
                    <p className="text-sm text-gray-500 mt-2">
                        coins prop은 배열이어야 합니다.
                    </p>
                </div>
            </Card>
        )
    }

    if (coins.length === 0) {
        return (
            <Card className="p-6">
                <div className="text-center text-gray-600">
                    <p>📝 설정할 코인이 없습니다.</p>
                    <p className="text-sm text-gray-500 mt-2">
                        대시보드에서 코인을 추가한 후 설정하세요.
                    </p>
                </div>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            {/* 헤더 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">개별 코인 설정</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {coins.length}개 코인의 매매 설정을 관리하세요.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={() => applyTemplate('conservative')}
                        disabled={loading}
                        size="sm"
                    >
                        🛡️ 보수적
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => applyTemplate('balanced')}
                        disabled={loading}
                        size="sm"
                    >
                        ⚖️ 균형
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => applyTemplate('aggressive')}
                        disabled={loading}
                        size="sm"
                    >
                        ⚡ 공격적
                    </Button>
                </div>
            </div>

            {/* 코인 설정 카드들 */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {coins.map(coin => (
                    <CoinControlCard
                        key={coin.symbol}
                        coin={coin}
                        config={configs[coin.symbol] || getDefaultConfig()}
                        onUpdate={(key, value) => updateConfig(coin.symbol, key, value)}
                    />
                ))}
            </div>

            {/* 상태 표시 */}
            {loading && (
                <div className="text-center py-4">
                    <div className="inline-flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600">템플릿 적용 중...</span>
                    </div>
                </div>
            )}
        </div>
    )
}

function CoinControlCard({ coin, config, onUpdate }) {
    return (
        <Card className="coin-control-card hover:shadow-lg transition-shadow">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center space-x-2">
                            <CardTitle className="text-lg">{coin.symbol}</CardTitle>
                            <StatusBadge status={config.isActive ? 'active' : 'paused'} size="sm" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            {coin.name}
                        </p>
                        {coin.balance !== undefined && (
                            <p className="text-xs text-gray-500">
                                보유: {parseFloat(coin.balance || 0).toFixed(4)} {coin.symbol}
                            </p>
                        )}
                    </div>
                    <Toggle
                        checked={config.isActive}
                        onChange={(checked) => onUpdate('isActive', checked)}
                        size="medium"
                    />
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* 거래 모드 선택 */}
                <div>
                    <label className="text-sm font-medium">거래 모드</label>
                    <RadioGroup
                        value={config.mode}
                        onChange={(value) => onUpdate('mode', value)}
                        options={[
                            { value: 'both', label: '매수+매도', icon: '⚡' },
                            { value: 'buyonly', label: '매수만', icon: '📈' },
                            { value: 'sellonly', label: '매도만', icon: '📉' },
                            { value: 'hold', label: '보유', icon: '💎' }
                        ]}
                        className="mt-2"
                    />
                </div>

                {/* 매수 설정 */}
                {(config.mode === 'both' || config.mode === 'buyonly') && (
                    <div className="space-y-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <h4 className="font-medium text-green-800 dark:text-green-300 flex items-center">
                            📈 매수 설정
                        </h4>

                        <SliderInput
                            label="매수 비율"
                            value={config.buyPercentage}
                            onChange={(value) => onUpdate('buyPercentage', value)}
                            min={1}
                            max={100}
                            step={5}
                            unit="%"
                            tooltip="포트폴리오 대비 매수 비율"
                        />

                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                최대 포지션 (KRW)
                            </label>
                            <Input
                                type="number"
                                value={config.maxPositionSize}
                                onChange={(e) => onUpdate('maxPositionSize', Number(e.target.value) || 0)}
                                placeholder="1,000,000"
                                className="mt-1"
                            />
                        </div>
                    </div>
                )}

                {/* 매도 설정 */}
                {(config.mode === 'both' || config.mode === 'sellonly') && (
                    <div className="space-y-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <h4 className="font-medium text-red-800 dark:text-red-300 flex items-center">
                            📉 매도 설정
                        </h4>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    수익 목표 (%)
                                </label>
                                <Input
                                    type="number"
                                    value={config.profitTarget}
                                    onChange={(e) => onUpdate('profitTarget', Number(e.target.value) || 0)}
                                    placeholder="8"
                                    className="mt-1"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    손절선 (%)
                                </label>
                                <Input
                                    type="number"
                                    value={config.stopLoss}
                                    onChange={(e) => onUpdate('stopLoss', Number(e.target.value) || 0)}
                                    placeholder="-8"
                                    className="mt-1"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

// 유틸리티 함수들 내보내기
export { getDefaultConfig, templates }
