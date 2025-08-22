import React, { useEffect } from "react";
import { useAnalysisStore } from "../../../stores/analysisStore";
import RSIIndicator from "../indicators/RSIIndicator";
import MACDIndicator from "../indicators/MACDIndicator";
import BollingerIndicator from "../indicators/BollingerIndicator";
import MAIndicator from "../indicators/MAIndicator";
import VolumeIndicator from "../indicators/VolumeIndicator";
import {
    calculateRSI, calculateMACD,
    calculateBollingerBands, calculateMA,
    calculateVolumeOscillator
} from "../../../services/analysis/calculateIndicators";

const TechnicalIndicatorsPanel = ({ market, closes = [], volumes = [] }) => {
    // 분석결과를 store에서 가져옴
    const { coinAnalyses, isLoading, error, fetchIndicators } = useAnalysisStore();

    // 관심 코인 변경・차트데이터 변경시마다 계산 요청
    useEffect(() => {
        if (market && closes.length > 14) {
            // RSI, MACD, Bollinger, MA, Volume 전부 계산
            const rsi = calculateRSI(closes);
            const macd = calculateMACD(closes);
            const bollinger = calculateBollingerBands(closes, 20, 2);
            const ma20 = calculateMA(closes, 20);
            const ma60 = calculateMA(closes, 60);
            const volumeOsc = calculateVolumeOscillator(volumes, 20);
            fetchIndicators(market, closes); // Zustand store에 저장
            // 이 아래는 store 없이 계산값을 바로 쓸 수도 있음(여러 사용자 환경/속도 고려)
        }
    }, [market, closes, volumes, fetchIndicators]);

    // 상태에서 결과 가져오기
    const analysis = coinAnalyses[market];

    // 데이터가 없으면 직접 함수 결과 사용
    const rsi = analysis?.rsi || calculateRSI(closes);
    const macd = analysis?.macd || calculateMACD(closes);
    const bollinger = analysis?.bollinger || calculateBollingerBands(closes);
    const ma20 = calculateMA(closes, 20);
    const ma60 = calculateMA(closes, 60);
    const volumeOsc = calculateVolumeOscillator(volumes, 20);

    if (isLoading[market]) return <div>지표 분석 중...</div>;
    if (error[market]) return <div className="text-red-600">{error[market]}</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <RSIIndicator data={rsi} />
            <MACDIndicator data={macd} />
            <BollingerIndicator data={bollinger} />
            <MAIndicator short={ma20} long={ma60} />
            <VolumeIndicator data={volumeOsc} />
        </div>
    );
};

export default TechnicalIndicatorsPanel;
