// src/components/features/analysis/CoinAnalysis.jsx
import React from "react";
import { useCoinAnalysis } from "../../../hooks/useCoinAnalysis";

export const CoinAnalysis = ({ symbol }) => {
  const { basic, technical, news, loading } = useCoinAnalysis(symbol);

  return (
    <div className="space-y-4">
      {/* 기본 데이터 */}
      {basic ? (
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="font-semibold">{symbol} 기본 정보</h3>
          <p>가격: {basic.price?.toLocaleString()}원</p>
          <p>변동률: {basic.changePercent?.toFixed(2)}%</p>
        </div>
      ) : (
        <div className="p-4 bg-gray-100 rounded-lg">가격 데이터 로딩 중...</div>
      )}

      {/* 기술적 분석 */}
      {technical ? (
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="font-semibold">기술적 분석</h3>
          <p>RSI: {technical.rsi?.toFixed(1)}</p>
          <p>점수: {technical.totalScore?.toFixed(1)}/10</p>
        </div>
      ) : (
        <div className="p-4 bg-gray-100 rounded-lg">기술적 분석 중...</div>
      )}

      {/* 뉴스 분석 */}
      {news ? (
        <div className="p-4 bg-white rounded-lg border">
          <h3 className="font-semibold">뉴스 분석</h3>
          <p>점수: {news.score?.toFixed(1)}/10</p>
          <p>감정: {news.strength}</p>
          {news.cached && (
            <p className="text-xs text-gray-500">캐시됨: {news.lastUpdate}</p>
          )}
        </div>
      ) : loading ? (
        <div className="p-4 bg-gray-100 rounded-lg">
          뉴스 분석 중... (백그라운드 처리)
        </div>
      ) : (
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600">
            뉴스 분석을 건너뛰었습니다. 기본 분석으로 진행합니다.
          </p>
        </div>
      )}
    </div>
  );
};
