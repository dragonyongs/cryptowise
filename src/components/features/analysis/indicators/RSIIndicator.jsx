// src/components/features/analysis/indicators/RSIIndicator.jsx
import React from "react";

const RSIIndicator = ({ data }) => {
    if (!data) return <div>RSI 데이터 없음</div>;

    return (
        <div className="bg-white border rounded p-4 shadow-sm">
            <h4 className="font-semibold mb-2">RSI (상대강도지수)</h4>
            <p className="text-lg font-bold">{data.latest.toFixed(2)}</p>
            <p className="text-sm text-gray-500">70 이상 과매수, 30 이하는 과매도</p>
        </div>
    );
};

export default RSIIndicator;
