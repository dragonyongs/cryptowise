import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../lib/supabase'

export const usePortfolioStore = create(
  persist(
    (set, get) => ({
      // 상태
      balance: {
        krw: 10000000, // 초기 자본 1천만원
        totalValue: 10000000,
        totalReturn: 0,
        dailyPnL: 0
      },
      holdings: {}, // { symbol: { quantity, avgPrice, currentPrice, value, profitRate } }
      transactions: [],
      isLoading: false,
      error: null,
      lastUpdated: null,

      // 액션
      async updateBalance(newBalance) {
        set(state => ({
          balance: { ...state.balance, ...newBalance },
          lastUpdated: new Date().toISOString()
        }))
      },

      async updateHolding(symbol, holdingData) {
        set(state => ({
          holdings: {
            ...state.holdings,
            [symbol]: {
              ...state.holdings[symbol],
              ...holdingData
            }
          },
          lastUpdated: new Date().toISOString()
        }))
      },

      async addTransaction(transaction) {
        const newTransaction = {
          id: Date.now(),
          timestamp: new Date().toISOString(),
          ...transaction
        }

        set(state => ({
          transactions: [newTransaction, ...state.transactions],
          lastUpdated: new Date().toISOString()
        }))

        return newTransaction
      },

      async executeTrade(tradeData) {
        const { symbol, action, quantity, price } = tradeData
        
        try {
          set({ isLoading: true, error: null })

          const state = get()
          const totalAmount = quantity * price
          const commission = totalAmount * 0.0005 // 0.05% 수수료

          if (action === 'BUY') {
            // 매수 로직
            if (state.balance.krw < totalAmount + commission) {
              throw new Error('잔액이 부족합니다')
            }

            const currentHolding = state.holdings[symbol] || { quantity: 0, avgPrice: 0 }
            const newQuantity = currentHolding.quantity + quantity
            const newAvgPrice = newQuantity > 0 
              ? ((currentHolding.quantity * currentHolding.avgPrice) + totalAmount) / newQuantity
              : price

            // 잔액 업데이트
            await get().updateBalance({
              krw: state.balance.krw - totalAmount - commission
            })

            // 보유량 업데이트
            await get().updateHolding(symbol, {
              quantity: newQuantity,
              avgPrice: newAvgPrice,
              currentPrice: price
            })

          } else if (action === 'SELL') {
            // 매도 로직
            const currentHolding = state.holdings[symbol]
            if (!currentHolding || currentHolding.quantity < quantity) {
              throw new Error('보유량이 부족합니다')
            }

            const newQuantity = currentHolding.quantity - quantity
            
            // 잔액 업데이트
            await get().updateBalance({
              krw: state.balance.krw + totalAmount - commission
            })

            // 보유량 업데이트
            if (newQuantity === 0) {
              const { [symbol]: removed, ...remainingHoldings } = state.holdings
              set({ holdings: remainingHoldings })
            } else {
              await get().updateHolding(symbol, {
                quantity: newQuantity
              })
            }
          }

          // 거래 기록 추가
          await get().addTransaction({
            symbol,
            action,
            quantity,
            price,
            totalAmount,
            commission,
            status: 'completed'
          })

          set({ isLoading: false })
        } catch (error) {
          set({ error: error.message, isLoading: false })
          throw error
        }
      },

      async calculatePortfolioValue(currentPrices) {
        const state = get()
        let totalCryptoValue = 0

        const updatedHoldings = {}
        for (const [symbol, holding] of Object.entries(state.holdings)) {
          const currentPrice = currentPrices[symbol] || holding.currentPrice
          const value = holding.quantity * currentPrice
          const profitRate = ((currentPrice - holding.avgPrice) / holding.avgPrice) * 100

          updatedHoldings[symbol] = {
            ...holding,
            currentPrice,
            value,
            profitRate
          }

          totalCryptoValue += value
        }

        const totalValue = state.balance.krw + totalCryptoValue
        const totalReturn = ((totalValue - 10000000) / 10000000) * 100

        set({
          holdings: updatedHoldings,
          balance: {
            ...state.balance,
            totalValue,
            totalReturn
          },
          lastUpdated: new Date().toISOString()
        })

        return { totalValue, totalReturn, totalCryptoValue }
      },

      // 포트폴리오 스냅샷 저장
      async saveSnapshot(userId) {
        const state = get()
        
        try {
          const snapshotData = {
            user_id: userId,
            total_krw: state.balance.krw,
            total_crypto_value: Object.values(state.holdings).reduce((sum, h) => sum + h.value, 0),
            total_portfolio_value: state.balance.totalValue,
            holdings: state.holdings,
            total_return_rate: state.balance.totalReturn,
            daily_pnl: state.balance.dailyPnL,
            created_at: new Date().toISOString()
          }

          const { data, error } = await supabase
            .from('portfolio_snapshots')
            .insert(snapshotData)

          if (error) throw error
          return data
        } catch (error) {
          set({ error: error.message })
          throw error
        }
      },

      clearError() {
        set({ error: null })
      },

      reset() {
        set({
          balance: {
            krw: 10000000,
            totalValue: 10000000,
            totalReturn: 0,
            dailyPnL: 0
          },
          holdings: {},
          transactions: [],
          error: null,
          lastUpdated: null
        })
      }
    }),
    {
      name: 'portfolio-storage',
      partialize: (state) => ({
        balance: state.balance,
        holdings: state.holdings,
        transactions: state.transactions.slice(0, 100) // 최근 100개만 저장
      })
    }
  )
)
