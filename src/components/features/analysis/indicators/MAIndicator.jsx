import React from "react";
const MAIndicator = ({ short, long }) => {
    let signal = short.current > long.current ? "골든크로스(상승)" :
        short.current < long.current ? "데드크로스(하락)" : "중립";
    let color = signal.includes("상승") ? "text-green-600" : signal.includes("하락") ? "text-red-600" : "text-gray-600";
    return (
        <div className="bg-white p-4 rounded border shadow-sm text-center">
            <h4 className="font-semibold mb-2">이동평균선</h4>
            <div className={color}>{signal}</div>
            <div className="text-xs text-gray-500">
                20일: {short.current.toFixed(2)} / 60일: {long.current.toFixed(2)}
            </div>
        </div>
    );
};
export default MAIndicator;
