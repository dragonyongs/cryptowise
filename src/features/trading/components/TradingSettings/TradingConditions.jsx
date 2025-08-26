// src/features/trading/components/TradingSettings/TradingConditions.jsx - 완전 수정 버전
import React, { useCallback, memo } from "react";
import { TrendingDownIcon, TrendingUpIcon, AlertTriangleIcon } from "lucide-react";
import NumberInput from "../common/NumberInput";
import ValidationMessage from "../common/ValidationMessage";

const TradingConditions = memo(({
    buyConditions,
    sellConditions,
    onBuyConditionChange,
    onSellConditionChange,
    errors = {},
    className = ""
}) => {

    // 🔥 FIXED: 핸들러들을 메모이제이션
    // TradingConditions.jsx의 handleBuyChange에 디버깅 추가
    const handleBuyChange = useCallback((field, value) => {
        console.log("🔵 handleBuyChange 호출:", field, value, typeof value);

        if (onBuyConditionChange) {
            onBuyConditionChange(field, value);
        }
    }, [onBuyConditionChange]);


    const handleSellChange = useCallback((field, value) => {
        if (onSellConditionChange) {
            onSellConditionChange(field, value);
        }
    }, [onSellConditionChange]);

    return (
        <div className={`space-y-6 ${className}`}>
            {/* 매수 조건 섹션 */}
            <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                        <TrendingDownIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-green-800 dark:text-green-200">💰 매수 조건</h3>
                        <p className="text-sm text-green-600 dark:text-green-400">
                            하락률과 기술적 지표를 기준으로 매수 시점을 결정합니다
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <NumberInput
                        label="가격 하락률 매수"
                        value={buyConditions.priceDropThreshold ?? -3}
                        onChange={(value) => handleBuyChange('priceDropThreshold', value)}
                        min={-20}
                        max={0}
                        step={0.5}
                        unit="%"
                        placeholder="-3"
                        description="이 비율 이하로 떨어지면 매수 신호 발생"
                        error={errors?.priceDropThreshold}
                        className="transition-all duration-200"
                    />

                    <NumberInput
                        label="RSI 과매도 기준"
                        value={buyConditions.rsiOversold ?? 30}
                        onChange={(value) => handleBuyChange('rsiOversold', value)}
                        min={10}
                        max={50}
                        step={1}
                        placeholder="30"
                        description="RSI가 이 값 이하일 때 과매도로 판단"
                        error={errors?.rsiOversold}
                        className="transition-all duration-200"
                    />

                    <NumberInput
                        label="최소 신호 점수"
                        value={buyConditions.minBuyScore ?? 7.0}
                        onChange={(value) => handleBuyChange('minBuyScore', value)}
                        min={3.0}
                        max={10.0}
                        step={0.1}
                        placeholder="7.0"
                        description="이 점수 이상일 때만 매수 실행"
                        error={errors?.minBuyScore}
                        className="transition-all duration-200"
                    />

                    <NumberInput
                        label="거래량 임계값"
                        value={buyConditions.volumeThreshold ?? 1.2}
                        onChange={(value) => handleBuyChange('volumeThreshold', value)}
                        min={0.5}
                        max={3.0}
                        step={0.1}
                        unit="배"
                        placeholder="1.2"
                        description="평균 거래량 대비 최소 비율"
                        error={errors?.volumeThreshold}
                        className="transition-all duration-200"
                    />
                </div>
            </div>

            {/* 매도 조건 섹션 */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-red-100 dark:bg-red-800 rounded-lg">
                        <TrendingUpIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-red-800 dark:text-red-200">🎯 매도 조건</h3>
                        <p className="text-sm text-red-600 dark:text-red-400">
                            수익 실현과 손실 제한을 위한 매도 기준을 설정합니다
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <NumberInput
                        label="1차 수익실현"
                        value={sellConditions.profitTarget1 ?? 3}
                        onChange={(value) => handleSellChange('profitTarget1', value)}
                        min={1}
                        max={10}
                        step={0.5}
                        unit="%"
                        placeholder="3"
                        description="30% 물량을 매도하여 수익을 확보"
                        error={errors?.profitTarget1}
                        className="transition-all duration-200"
                    />

                    <NumberInput
                        label="2차 수익실현"
                        value={sellConditions.profitTarget2 ?? 5}
                        onChange={(value) => handleSellChange('profitTarget2', value)}
                        min={2}
                        max={15}
                        step={0.5}
                        unit="%"
                        placeholder="5"
                        description="50% 물량을 매도하여 추가 수익 확보"
                        error={errors?.profitTarget2}
                        className="transition-all duration-200"
                    />

                    <NumberInput
                        label="최종 수익목표"
                        value={sellConditions.profitTarget3 ?? 8}
                        onChange={(value) => handleSellChange('profitTarget3', value)}
                        min={5}
                        max={25}
                        step={0.5}
                        unit="%"
                        placeholder="8"
                        description="전량 매도하여 수익을 완전 실현"
                        error={errors?.profitTarget3}
                        className="transition-all duration-200"
                    />

                    <NumberInput
                        label="손절매 기준"
                        value={sellConditions.stopLoss ?? -6}
                        onChange={(value) => handleSellChange('stopLoss', value)}
                        min={-20}
                        max={0}
                        step={0.5}
                        unit="%"
                        placeholder="-6"
                        description="이 손실률에 도달하면 전량 매도"
                        error={errors?.stopLoss}
                        className="transition-all duration-200"
                    />

                    <NumberInput
                        label="RSI 과매수"
                        value={sellConditions.rsiOverbought ?? 70}
                        onChange={(value) => handleSellChange('rsiOverbought', value)}
                        min={60}
                        max={90}
                        step={1}
                        placeholder="70"
                        description="RSI가 이 값 이상일 때 과매수로 판단"
                        error={errors?.rsiOverbought}
                        className="transition-all duration-200"
                    />

                    <NumberInput
                        label="시간 기반 청산"
                        value={sellConditions.timeBasedExit ?? 7}
                        onChange={(value) => handleSellChange('timeBasedExit', value)}
                        min={1}
                        max={30}
                        step={1}
                        unit="일"
                        placeholder="7"
                        description="이 기간 후에는 수익과 상관없이 매도 고려"
                        error={errors?.timeBasedExit}
                        className="transition-all duration-200"
                    />
                </div>
            </div>

            {/* 검증 메시지들 */}
            {errors?.general && (
                <ValidationMessage
                    message={errors.general}
                    type="error"
                />
            )}

            {/* 설정 미리보기 */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">📋 현재 설정 요약</h4>
                <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                    <div>
                        💰 매수: 가격 {buyConditions.priceDropThreshold ?? -3}% 하락, RSI {buyConditions.rsiOversold ?? 30} 이하, 신호점수 {buyConditions.minBuyScore ?? 7.0}점 이상
                    </div>
                    <div>
                        🎯 매도: {sellConditions.profitTarget1 ?? 3}% → {sellConditions.profitTarget2 ?? 5}% → {sellConditions.profitTarget3 ?? 8}% 단계적 수익실현, {sellConditions.stopLoss ?? -6}% 손절
                    </div>
                </div>
            </div>
        </div>
    );
});

TradingConditions.displayName = 'TradingConditions';

export default TradingConditions;
