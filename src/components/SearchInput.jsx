// src/components/SearchInput.jsx
import { useState } from 'react'
import { Search, X } from 'lucide-react'

export default function SearchInput({
    value,
    onChange,
    placeholder = "코인을 검색하세요...",
    disabled = false,
    className = ""
}) {
    const [isFocused, setIsFocused] = useState(false)

    const handleClear = () => {
        onChange('')
    }

    return (
        <div className={`relative ${className}`}>
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <Search className={`h-5 w-5 transition-colors ${isFocused ? 'text-blue-500' : 'text-gray-400'
                    }`} />
            </div>

            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={disabled}
                className={`
                    w-full pl-12 pr-12 py-4 text-lg
                    border-2 rounded-xl transition-all duration-200
                    bg-white dark:bg-gray-800 
                    text-gray-900 dark:text-gray-100
                    placeholder-gray-500 dark:placeholder-gray-400
                    disabled:bg-gray-100 dark:disabled:bg-gray-700
                    disabled:cursor-not-allowed disabled:opacity-50
                    ${isFocused
                        ? 'border-blue-500 ring-2 ring-blue-500/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }
                    hover:border-gray-300 dark:hover:border-gray-600
                `}
                autoComplete="off"
                spellCheck="false"
            />

            {value && !disabled && (
                <button
                    onClick={handleClear}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 
                    text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 
                    transition-colors p-1 rounded-full 
                    hover:bg-gray-100 dark:hover:bg-gray-700"
                    type="button"
                >
                    <X className="h-5 w-5" />
                </button>
            )}
        </div>
    )
}
