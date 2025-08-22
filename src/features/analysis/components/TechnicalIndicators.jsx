// src/components/features/analysis/TechnicalIndicators.jsx
import React, { useEffect, useState } from 'react';
import { useCoinStore } from '../../../stores/coinStore';
import RSIIndicator from '../indicators/RSIIndicator';
import { calculateRSI } from '../../../services/analysis/indicatorCalculations';

const TechnicalIndicators = ({ market }) => {
    const [rsiValues, setRsiValues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // 예: 업비트 차트 데이터 불러오기 함수 (가격 종가 배열)
    const fetchClosePrices = async () => {
        setLoading(true);
        setError(null);

        try {
            // 실제 API 호출로 교체 필요
            const response = await fetch(`https://api.upbit.com/v1/candles/days?market=${market}&count=100`);
            const data = await response.json();
            // 종가 배열 추출 (과거 -> 최신 순)
            const closes = data.map(candle => candle.trade_price).reverse();
            setLoading(false);
            return closes;
        } catch (err) {
            setError('차트 데이터 불러오기 실패');
            setLoading(false);
            return [];
        }
    };

    useEffect(() => {
        if (!market) return;

        (async () => {
            const closes = await fetchClosePrices();
            if (closes.length > 14) {
                const rsi = calculateRSI(closes, 14);
                setRsiValues(rsi);
            }
        })();
    }, [market]);

    if (loading) return <div>기술적 지표 로딩중...</div>;
    if (error) return <div className="text-red-600">{error}</div>;
    if (!market) return <div>코인을 선택하세요.</div>;

    return (
        <div>
            <RSIIndicator rsiValues={rsiValues} />
            {/* 이후 MACD, BollingerBands 등 다른 지표 컴포넌트 추가 가능 */}
        </div>
    );
};

export default TechnicalIndicators;
