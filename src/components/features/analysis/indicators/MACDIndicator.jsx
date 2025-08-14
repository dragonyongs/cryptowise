import React from "react";
const MACDIndicator = ({ data }) => {
    if (!data) return <div>MACD 데이터 없음</div>;
    let color = data.cross === "bullish" ? "text-green-600 bg-green-50" :
        data.cross === "bearish" ? "text-red-600 bg-red-50" : "text-gray-600 bg-gray-50";
    return (
        <div className="bg-white p-4 rounded border shadow-sm text-center">
            <h4 className="font-semibold mb-2">MACD</h4>
            <div>
                <span className={`px-2 py-1 rounded ${color}`}>
                    {data.cross === "bullish" ? "상승 모멘텀" : data.cross === "bearish" ? "하락 모멘텀" : "중립"}
                </span>
            </div>
            <div className="text-xs text-gray-500 mt-2">
                MACD: {data.macd.toFixed(2)} / Signal: {data.signal.toFixed(2)} / Histogram: {data.histogram.toFixed(2)}
            </div>
        </div>
    );
};
export default MACDIndicator;
