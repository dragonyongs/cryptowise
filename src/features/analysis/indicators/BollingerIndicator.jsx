import React from "react";
const BollingerIndicator = ({ data }) => {
    if (!data) return <div>볼린저밴드 데이터 없음</div>;
    let desc = data.position === "lower" ? "하단 근처(반등 가능성↑)"
        : data.position === "upper" ? "상단 근처(경계)" : "중앙부";
    let color = data.position === "lower" ? "bg-blue-50 text-blue-700"
        : data.position === "upper" ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-700";
    return (
        <div className={`p-4 rounded border shadow-sm text-center ${color}`}>
            <h4 className="font-semibold mb-2">Bollinger Band</h4>
            <div>위:{data.upper.toFixed(2)}, 중:{data.middle.toFixed(2)}, 아래:{data.lower.toFixed(2)}</div>
            <div className="mt-2 font-bold">{desc}</div>
        </div>
    );
};
export default BollingerIndicator;
