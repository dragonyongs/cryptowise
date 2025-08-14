import React from "react";
const VolumeIndicator = ({ data }) => {
    if (!data) return <div>거래량 데이터 없음</div>;
    let color = data.latestRatio > 1.2 ? "text-green-600 bg-green-50"
        : data.latestRatio < 0.8 ? "text-red-600 bg-red-50" : "text-gray-600 bg-gray-50";
    let msg = data.latestRatio > 1.5 ? "거래량 급증"
        : data.latestRatio > 1.2 ? "거래량 증가"
            : data.latestRatio < 0.8 ? "거래량 감소"
                : "정상 범위";
    return (
        <div className={`p-4 rounded border shadow-sm text-center ${color}`}>
            <h4 className="font-semibold mb-2">거래량</h4>
            <div className="font-bold">{msg}</div>
            <div className="text-xs text-gray-500 mt-2">
                {data.latestVolume.toLocaleString()} / 평균 {data.avg.toLocaleString()}
            </div>
        </div>
    );
};
export default VolumeIndicator;
