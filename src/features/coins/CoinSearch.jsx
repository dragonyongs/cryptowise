// src/components/features/coins/CoinSearch.jsx
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
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-crypto-neutral-400" />
                    <input
                        type="text"
                        placeholder="코인 이름, 심볼, 마켓코드로 검색... (예: 비트코인, BTC, KRW-BTC)"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-10 py-3 border border-crypto-neutral-300 rounded-xl 
                     focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent 
                     transition-all duration-200"
                    />
                    {searchTerm && (
                        <button
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 
                       text-crypto-neutral-400 hover:text-crypto-neutral-600 transition-colors"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>

                <div className="flex space-x-2">
                    {showFilters && (
                        <button
                            onClick={() => onFiltersChange({
                                ...filters,
                                showFilterPanel: !filters.showFilterPanel
                            })}
                            className={`inline-flex items-center px-4 py-3 border rounded-xl transition-colors space-x-2
                ${filters.showFilterPanel
                                    ? 'border-crypto-primary-500 bg-crypto-primary-50 text-crypto-primary-700'
                                    : 'border-crypto-neutral-300 text-crypto-neutral-700 hover:bg-crypto-neutral-50'
                                }
                ${hasActiveFilters() ? 'ring-2 ring-crypto-primary-200' : ''}
              `}
                        >
                            <FunnelIcon className="w-5 h-5" />
                            <span>필터</span>
                            {hasActiveFilters() && (
                                <span className="ml-1 px-2 py-1 bg-crypto-primary-500 text-white text-xs rounded-full">
                                    적용됨
                                </span>
                            )}
                        </button>
                    )}

                    {hasActiveFilters() && (
                        <button
                            onClick={clearAllFilters}
                            className="px-3 py-3 text-crypto-neutral-500 hover:text-crypto-neutral-700 
                       transition-colors text-sm"
                            title="모든 필터 초기화"
                        >
                            초기화
                        </button>
                    )}
                </div>
            </div>

            {/* 검색 결과 요약 */}
            {searchTerm && (
                <div className="flex items-center justify-between text-sm">
                    <div className="text-crypto-neutral-600">
                        '<span className="font-medium text-crypto-neutral-900">{searchTerm}</span>' 검색 결과
                        {searchResults !== null && (
                            <span className="ml-2 font-medium text-crypto-primary-600">
                                {searchResults}개 찾음
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* 고급 필터 패널 */}
            {showFilters && filters.showFilterPanel && (
                <div className="bg-white border border-crypto-neutral-200 rounded-xl p-6 shadow-sm 
                      relative z-10"> {/* z-index 추가 */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-crypto-neutral-900">상세 필터</h3>
                        <button
                            onClick={() => onFiltersChange({ ...filters, showFilterPanel: false })}
                            className="p-1 text-crypto-neutral-400 hover:text-crypto-neutral-600 transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* 최소 가격 */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                최소 가격 (원)
                            </label>
                            <input
                                type="number"
                                placeholder="예: 1000"
                                value={filters.minPrice || ''}
                                onChange={(e) => onFiltersChange({ ...filters, minPrice: e.target.value })}
                                className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg 
                         focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent
                         transition-all duration-200"
                            />
                        </div>

                        {/* 최대 가격 */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                최대 가격 (원)
                            </label>
                            <input
                                type="number"
                                placeholder="예: 100000000"
                                value={filters.maxPrice || ''}
                                onChange={(e) => onFiltersChange({ ...filters, maxPrice: e.target.value })}
                                className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg 
                         focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent
                         transition-all duration-200"
                            />
                        </div>

                        {/* 24시간 변화율 */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                24시간 변화율
                            </label>
                            <select
                                value={filters.changeFilter || 'all'}
                                onChange={(e) => onFiltersChange({ ...filters, changeFilter: e.target.value })}
                                className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg 
                         focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent
                         transition-all duration-200 bg-white relative z-20" // z-index 추가
                            >
                                <option value="all">전체</option>
                                <option value="positive">상승만 (0% 이상)</option>
                                <option value="negative">하락만 (0% 미만)</option>
                                <option value="neutral">보합 (±0.1% 이내)</option>
                                <option value="strong_up">강세 (+5% 이상)</option>
                                <option value="strong_down">약세 (-5% 이하)</option>
                            </select>
                        </div>

                        {/* AI 분석 점수 */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                AI 분석 점수
                            </label>
                            <select
                                value={filters.scoreFilter || 'all'}
                                onChange={(e) => onFiltersChange({ ...filters, scoreFilter: e.target.value })}
                                className="w-full px-3 py-2 border border-crypto-neutral-300 rounded-lg 
                         focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent
                         transition-all duration-200 bg-white relative z-20" // z-index 추가
                            >
                                <option value="all">전체</option>
                                <option value="excellent">우수 (8.0점 이상)</option>
                                <option value="good">양호 (6.0-8.0점)</option>
                                <option value="fair">보통 (4.0-6.0점)</option>
                                <option value="poor">미흡 (4.0점 미만)</option>
                                <option value="analyzing">분석 중</option>
                            </select>
                        </div>
                    </div>

                    {/* 빠른 필터 버튼 */}
                    <div className="mt-4 pt-4 border-t border-crypto-neutral-200">
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => onFiltersChange({ ...filters, changeFilter: 'positive' })}
                                className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm 
                         hover:bg-green-200 transition-colors"
                            >
                                상승 종목만
                            </button>
                            <button
                                onClick={() => onFiltersChange({ ...filters, scoreFilter: 'excellent' })}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm 
                         hover:bg-blue-200 transition-colors"
                            >
                                AI 추천 종목
                            </button>
                            <button
                                onClick={() => onFiltersChange({
                                    ...filters,
                                    minPrice: '1000',
                                    maxPrice: '10000'
                                })}
                                className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm 
                         hover:bg-purple-200 transition-colors"
                            >
                                소액 투자 (1천-1만원)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CoinSearch;
