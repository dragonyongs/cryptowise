import { create } from 'zustand'
import { db } from '../lib/supabase'

export const useTestingStore = create((set, get) => ({
  // 상태
  sessions: [],
  currentSession: null,
  isRunning: false,
  progress: 0,
  results: null,
  error: null,

  // 액션
  async addSession(config) {
    try {
      const sessionData = {
        name: config.name || `백테스트 ${new Date().toLocaleDateString()}`,
        strategy_config: config,
        start_date: config.startDate,
        end_date: config.endDate,
        status: 'RUNNING',
        progress: 0,
        created_at: new Date().toISOString()
      }

      const session = await db.createBacktestSession(sessionData)
      
      set(state => ({
        sessions: [session, ...state.sessions],
        currentSession: session,
        error: null
      }))

      return session.id
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  async updateSession(sessionId, updateData) {
    try {
      const updatedSession = await db.updateBacktestSession(sessionId, updateData)
      
      set(state => ({
        sessions: state.sessions.map(session => 
          session.id === sessionId ? updatedSession : session
        ),
        currentSession: state.currentSession?.id === sessionId 
          ? updatedSession 
          : state.currentSession,
        error: null
      }))

      return updatedSession
    } catch (error) {
      set({ error: error.message })
      throw error
    }
  },

  async loadSessions() {
    try {
      const { data: sessions, error } = await supabase
        .from('backtest_sessions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ sessions, error: null })
    } catch (error) {
      set({ error: error.message })
    }
  },

  setCurrentSession(session) {
    set({ currentSession: session })
  },

  setRunning(isRunning) {
    set({ isRunning })
  },

  setProgress(progress) {
    set({ progress })
  },

  setResults(results) {
    set({ results })
  },

  clearError() {
    set({ error: null })
  },

  reset() {
    set({
      currentSession: null,
      isRunning: false,
      progress: 0,
      results: null,
      error: null
    })
  }
}))
