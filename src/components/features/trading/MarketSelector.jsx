// src/components/features/testing/MarketSelector.jsx - 향후 추가용

import React from "react";
import { CoinsIcon } from "lucide-react";

const MarketSelector = ({
    selectedMarket,
    availableMarkets,
    onMarketChange,
    disabled
}) => {
    const marketInfo = {
        KRW: { name: "원화", icon: "₩", color: "bg-blue-100 text-blue-800" },
        BTC: { name: "비트코인", icon: "₿", color: "bg-orange-100 text-orange-800" },
        USDT: { name: "테더", icon: "$", color: "bg-green-100 text-green-800" },
    };

    return (
        <div className="flex items-center space-x-2">
            <CoinsIcon className="w-5 h-5 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">거래 시장:</span>

            <div className="flex space-x-1">
                {availableMarkets.map(market => {
                    const info = marketInfo[market];
                    const isSelected = market === selectedMarket;

                    return (
                        <button
                            key={market}
                            onClick={() => onMarketChange(market)}
                            disabled={disabled}
                            className={`
                px-3 py-1 rounded-lg text-sm font-medium transition-colors
                ${isSelected
                                    ? info.color
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
                        >
                            <span className="mr-1">{info.icon}</span>
                            {info.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MarketSelector;
