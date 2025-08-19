import React from "react";

const VolumeIndicator = ({ data }) => {
    // 데이터 안전성 체크
    if (!data || typeof data !== 'object') {
        return (
            <div className="p-4 rounded border shadow-sm text-center bg-gray-50">
                <h4 className="font-semibold mb-2">거래량</h4>
                <div className="text-gray-500">거래량 데이터 없음</div>
            </div>
        );
    }

    // 기본값 설정 및 안전한 접근
    const latestVolume = data.latestVolume || 0;
    const avgVolume = data.avg || 0;
    const latestRatio = data.latestRatio || 0;

    // 거래량 비율에 따른 색상 및 메시지 결정
    let color = latestRatio > 1.2
        ? "text-green-600 bg-green-50"
        : latestRatio < 0.8
            ? "text-red-600 bg-red-50"
            : "text-gray-600 bg-gray-50";

    let msg = latestRatio > 1.5
        ? "거래량 급증"
        : latestRatio > 1.2
            ? "거래량 증가"
            : latestRatio < 0.8
                ? "거래량 감소"
                : "정상 범위";

    return (
        <div className={`p-4 rounded border shadow-sm text-center ${color}`}>
            <h4 className="font-semibold mb-2">거래량</h4>
            <div className="font-bold">{msg}</div>
            <div className="text-xs text-gray-500 mt-2">
                {latestVolume.toLocaleString()} / 평균 {avgVolume.toLocaleString()}
            </div>
            {/* 디버깅용 - 개발 중에만 사용 */}
            {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-blue-500 mt-1">
                    비율: {latestRatio.toFixed(2)}
                </div>
            )}
        </div>
    );
};

export default VolumeIndicator;
