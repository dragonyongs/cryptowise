// src/features/coins/CoinSearch.jsx - 투자지수 필터 반영 버전

import React from 'react';
import { MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

const CoinSearch = ({
    searchTerm,
    onSearchChange,
    filters = {},
    onFiltersChange,
    showFilters = false,
    searchResults = null
}) => {
    const clearSearch = () => {
        onSearchChange('');
    };

    const clearAllFilters = () => {
        onFiltersChange({
            minPrice: '',
            maxPrice: '',
            changeFilter: 'all',
            scoreFilter: 'all',
            showFilterPanel: false
        });
    };

    const hasActiveFilters = () => {
        return filters.minPrice ||
            filters.maxPrice ||
            (filters.changeFilter && filters.changeFilter !== 'all') ||
            (filters.scoreFilter && filters.scoreFilter !== 'all');
    };

    return (
        <div className="space-y-4">
            {/* 검색 입력 */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="코인명, 심볼로 검색..."
                    value={searchTerm}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm && (
                    <button
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* 필터 토글 버튼 */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => onFiltersChange({ ...filters, showFilterPanel: !filters.showFilterPanel })}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${filters.showFilterPanel || hasActiveFilters()
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <FunnelIcon className="h-4 w-4" />
                    <span>필터</span>
                    {hasActiveFilters() && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                            활성화
                        </span>
                    )}
                </button>

                {hasActiveFilters() && (
                    <button
                        onClick={clearAllFilters}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        필터 초기화
                    </button>
                )}
            </div>

            {/* 필터 패널 */}
            {filters.showFilterPanel && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                    {/* 가격 범위 필터 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            가격 범위
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <input
                                type="number"
                                placeholder="최소 가격"
                                value={filters.minPrice || ''}
                                onChange={(e) => onFiltersChange({ ...filters, minPrice: e.target.value })}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <input
                                type="number"
                                placeholder="최대 가격"
                                value={filters.maxPrice || ''}
                                onChange={(e) => onFiltersChange({ ...filters, maxPrice: e.target.value })}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    {/* 변동률 필터 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            24시간 변동률
                        </label>
                        <select
                            value={filters.changeFilter || 'all'}
                            onChange={(e) => onFiltersChange({ ...filters, changeFilter: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">전체</option>
                            <option value="strong_up">강한 상승 (+5% 이상)</option>
                            <option value="positive">상승 (+0.1% 이상)</option>
                            <option value="neutral">보합 (-0.1% ~ +0.1%)</option>
                            <option value="negative">하락 (-0.1% 이하)</option>
                            <option value="strong_down">강한 하락 (-5% 이하)</option>
                        </select>
                    </div>

                    {/* ✅ 투자지수 필터 (기존 AI 분석점수 대체) */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            투자 지수
                        </label>
                        <select
                            value={filters.scoreFilter || 'all'}
                            onChange={(e) => onFiltersChange({ ...filters, scoreFilter: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="all">전체</option>
                            <option value="excellent">매우 우수 (80-100점)</option>
                            <option value="good">우수 (60-79점)</option>
                            <option value="fair">보통 (40-59점)</option>
                            <option value="poor">주의 (0-39점)</option>
                            <option value="analyzing">분석 중</option>
                        </select>
                    </div>
                </div>
            )}

            {/* 검색 결과 요약 */}
            {searchResults && (
                <div className="text-sm text-gray-600">
                    검색 결과: {searchResults}개
                </div>
            )}
        </div>
    );
};

export default CoinSearch;
