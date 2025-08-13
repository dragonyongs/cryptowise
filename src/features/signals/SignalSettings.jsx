// src/features/signals/SignalSettings.jsx - 신호 설정
import { useState } from 'react'
import { Settings, Zap, Clock, Target, Bell } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function SignalSettings({
    onSettingsChange,
    initialSettings = {}
}) {
    const [settings, setSettings] = useState({
        enableSignals: true,
        signalInterval: 30, // 초
        confidenceThreshold: 65,
        maxSignals: 20,
        enableBuySignals: true,
        enableSellSignals: true,
        enablePushNotifications: false,
        autoHideSignals: true,
        rsiOversold: 30,
        rsiOverbought: 70,
        volumeThreshold: 1.5,
        ...initialSettings
    })

    const updateSetting = (key, value) => {
        const newSettings = { ...settings, [key]: value }
        setSettings(newSettings)
        onSettingsChange?.(newSettings)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                    <Settings className="h-5 w-5" />
                    <span>신호 설정</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 기본 설정 */}
                <div className="space-y-3">
                    <h4 className="font-medium flex items-center space-x-2">
                        <Zap className="h-4 w-4" />
                        <span>기본 설정</span>
                    </h4>

                    <div className="flex items-center justify-between">
                        <label className="text-sm">신호 알림 활성화</label>
                        <input
                            type="checkbox"
                            checked={settings.enableSignals}
                            onChange={(e) => updateSetting('enableSignals', e.target.checked)}
                            className="rounded"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm flex items-center space-x-2">
                            <Clock className="h-4 w-4" />
                            <span>분석 주기: {settings.signalInterval}초</span>
                        </label>
                        <input
                            type="range"
                            min="10"
                            max="300"
                            step="10"
                            value={settings.signalInterval}
                            onChange={(e) => updateSetting('signalInterval', parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm flex items-center space-x-2">
                            <Target className="h-4 w-4" />
                            <span>최소 신뢰도: {settings.confidenceThreshold}%</span>
                        </label>
                        <input
                            type="range"
                            min="50"
                            max="90"
                            step="5"
                            value={settings.confidenceThreshold}
                            onChange={(e) => updateSetting('confidenceThreshold', parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>
                </div>

                {/* 신호 유형 */}
                <div className="space-y-3">
                    <h4 className="font-medium">신호 유형</h4>

                    <div className="flex items-center justify-between">
                        <label className="text-sm text-green-600">매수 신호</label>
                        <input
                            type="checkbox"
                            checked={settings.enableBuySignals}
                            onChange={(e) => updateSetting('enableBuySignals', e.target.checked)}
                            className="rounded"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-sm text-red-600">매도 신호</label>
                        <input
                            type="checkbox"
                            checked={settings.enableSellSignals}
                            onChange={(e) => updateSetting('enableSellSignals', e.target.checked)}
                            className="rounded"
                        />
                    </div>
                </div>

                {/* 기술적 지표 설정 */}
                <div className="space-y-3">
                    <h4 className="font-medium">기술적 지표</h4>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-xs">RSI 과매도</label>
                            <input
                                type="number"
                                min="10"
                                max="40"
                                value={settings.rsiOversold}
                                onChange={(e) => updateSetting('rsiOversold', parseInt(e.target.value))}
                                className="w-full p-1 text-sm border rounded"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs">RSI 과매수</label>
                            <input
                                type="number"
                                min="60"
                                max="90"
                                value={settings.rsiOverbought}
                                onChange={(e) => updateSetting('rsiOverbought', parseInt(e.target.value))}
                                className="w-full p-1 text-sm border rounded"
                            />
                        </div>
                    </div>
                </div>

                {/* 알림 설정 */}
                <div className="space-y-3">
                    <h4 className="font-medium flex items-center space-x-2">
                        <Bell className="h-4 w-4" />
                        <span>알림 설정</span>
                    </h4>

                    <div className="flex items-center justify-between">
                        <label className="text-sm">푸시 알림</label>
                        <input
                            type="checkbox"
                            checked={settings.enablePushNotifications}
                            onChange={(e) => updateSetting('enablePushNotifications', e.target.checked)}
                            className="rounded"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="text-sm">자동 숨김</label>
                        <input
                            type="checkbox"
                            checked={settings.autoHideSignals}
                            onChange={(e) => updateSetting('autoHideSignals', e.target.checked)}
                            className="rounded"
                        />
                    </div>
                </div>

                {/* 저장 버튼 */}
                <Button
                    onClick={() => onSettingsChange?.(settings)}
                    className="w-full"
                >
                    설정 저장
                </Button>
            </CardContent>
        </Card>
    )
}
