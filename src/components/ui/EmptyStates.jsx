// src/components/ui/EmptyStates.jsx
import React from 'react';
import { Coins, RefreshCw, AlertCircle, Star } from 'lucide-react';

export const EmptyCoinsState = ({
    onRetry,
    isLoading,
    message = "코인 데이터가 없습니다"
}) => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Coins className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {message}
        </h3>
        <p className="text-gray-500 text-center mb-6 max-w-sm">
            아직 코인 데이터를 불러오지 못했습니다.
            네트워크 연결을 확인하고 다시 시도해주세요.
        </p>
        <button
            onClick={onRetry}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? '불러오는 중...' : '다시 시도'}
        </button>
    </div>
);

export const LoadingCoinsState = ({ progress }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
            코인 데이터 로딩 중
        </h3>
        <div className="w-64 bg-gray-200 rounded-full h-2 mb-4">
            <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
            />
        </div>
        <p className="text-gray-500 text-sm">
            {progress}% 완료
        </p>
    </div>
);

export const ErrorCoinsState = ({ error, onRetry }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
            데이터 로딩 실패
        </h3>
        <p className="text-gray-500 text-center mb-6 max-w-sm">
            {error || '코인 데이터를 불러오는데 실패했습니다.'}
        </p>
        <button
            onClick={onRetry}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 시도
        </button>
    </div>
);

export const EmptySelectedCoinsState = ({ onBrowseCoins }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
            <Star className="w-8 h-8 text-yellow-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
            선택된 코인이 없습니다
        </h3>
        <p className="text-gray-500 text-center mb-6 max-w-sm">
            관심 있는 코인을 선택하여 포트폴리오를 구성해보세요.
        </p>
        <button
            onClick={onBrowseCoins}
            className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
        >
            <Coins className="w-4 h-4 mr-2" />
            코인 둘러보기
        </button>
    </div>
);
