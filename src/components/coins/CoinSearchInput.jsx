// src/components/coins/CoinSearchInput.jsx - 간단한 버전
import React from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

const CoinSearchInput = ({
    searchValue,
    onSearchChange,
    onClear,
    placeholder = "코인 검색...",
    className = ""
}) => {
    return (
        <div className={`relative ${className}`}>
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
                type="text"
                placeholder={placeholder}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape' && searchValue) {
                        onClear();
                    }
                }}
            />
            {searchValue && (
                <button
                    onClick={onClear}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title="검색 초기화"
                >
                    <XMarkIcon className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};

export default React.memo(CoinSearchInput);
