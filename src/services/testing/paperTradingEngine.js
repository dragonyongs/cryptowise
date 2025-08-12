// src/services/testing/paperTradingEngine.js
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../lib/supabase";

export class PaperTradingEngine {
    /**
     * 시그널 실행 → 모의 체결
     * @param {Object}   signal     – { symbol, type: "BUY"|"SELL", price, timestamp, reason }
     * @param {Object}   portfolio  – { krw: number, coins: { [symbol]: { quantity, avgPrice, currentPrice } } }
     * @param {Object}   coinConfig – 사용자별 코인별 설정
     * @returns {Object} trade      – 체결 결과
     */
    async executeSignal(signal, portfolio, coinConfig) {
        if (!this.validateSignal(signal, coinConfig)) {
            return { executed: false, reason: "Config validation failed" };
        }

        const positionSize = this.calculatePositionSize(signal, portfolio, coinConfig);
        if (positionSize <= 0) {
            return { executed: false, reason: "Invalid position size" };
        }

        const trade = {
            id: uuidv4(),
            symbol: signal.symbol,
            action: signal.type,
            quantity: positionSize,
            price: signal.price,
            totalAmount: positionSize * signal.price,
            timestamp: signal.timestamp,
            executed: true,
            reason: signal.reason,
            profitRate: 0,        // 나중에 업데이트
            equityAfter: 0,       // 나중에 업데이트
        };

        this.updatePortfolio(portfolio, trade);

        // Supabase에 로깅 (비동기 - 실패해도 시뮬레이션은 계속)
        this.savePaperTrade(trade).catch(console.error);

        return trade;
    }

    /* ------------------------------ 내부 로직 ------------------------------ */

    validateSignal(signal, cfg) {
        if (!cfg.isActive) return false;
        if (signal.type === "BUY"  && !cfg.buyEnabled)  return false;
        if (signal.type === "SELL" && !cfg.sellEnabled) return false;
        return true;
    }

    calculatePositionSize(signal, portfolio, cfg) {
        if (signal.type === "BUY") {
            const maxAmount = cfg.maxPositionSize ?? Infinity;
            const budget    = (portfolio.krw * cfg.buyPercentage) / 100;
            return Math.min(budget, maxAmount) / signal.price;
        }

        // SELL
        const holding = portfolio.coins[signal.symbol]?.quantity ?? 0;
        return (holding * cfg.sellPercentage) / 100;
    }

    updatePortfolio(portfolio, trade) {
        if (trade.action === "BUY") {
            portfolio.krw -= trade.totalAmount;

            const pos = portfolio.coins[trade.symbol] ?? { quantity: 0, avgPrice: 0 };
            const newQty   = pos.quantity + trade.quantity;
            const newCost  = pos.quantity * pos.avgPrice + trade.totalAmount;

            portfolio.coins[trade.symbol] = {
                quantity: newQty,
                avgPrice: newCost / newQty,
                currentPrice: trade.price,
            };
        } else {
            // SELL
            portfolio.krw += trade.totalAmount;

            const pos = portfolio.coins[trade.symbol];
            if (pos) {
                pos.quantity = Math.max(pos.quantity - trade.quantity, 0);
                pos.currentPrice = trade.price;

                // 포지션이 소멸되면 정리
                if (pos.quantity === 0) delete portfolio.coins[trade.symbol];
            }
        }

        // 손익 및 잔고 기반 지표 갱신
        const equity =
            portfolio.krw +
            Object.values(portfolio.coins).reduce(
                (sum, c) => sum + c.quantity * c.currentPrice,
                0,
        );

        trade.equityAfter = equity;
        trade.profitRate = ((equity - 10_000_000) / 10_000_000) * 100; // 초기 KRW 1,000만원 기준
    }

    async savePaperTrade(trade) {
        await supabase.from("papertrades").insert({
            id: trade.id,
            symbol: trade.symbol,
            action: trade.action,
            quantity: trade.quantity,
            price: trade.price,
            totalamount: trade.totalAmount,
            executed: trade.executed,
            reason: trade.reason,
            executedat: trade.timestamp,
        });
    }
}

export const paperTradingEngine = new PaperTradingEngine();
