import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// 데이터베이스 헬퍼 함수들
export const db = {
  // 시장 데이터 관련
  async getMarketSnapshot(symbol) {
    const { data, error } = await supabase
      .from('market_snapshots')
      .select('*')
      .eq('symbol', symbol)
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()
    
    if (error) throw error
    return data
  },

  // 신호 로그 관련
  async saveSignalLog(signalData) {
    const { data, error } = await supabase
      .from('signal_logs')
      .insert(signalData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 백테스트 세션 관련
  async createBacktestSession(sessionData) {
    const { data, error } = await supabase
      .from('backtest_sessions')
      .insert(sessionData)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  async updateBacktestSession(sessionId, updateData) {
    const { data, error } = await supabase
      .from('backtest_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // 사용자 코인 설정 관련
  async getUserCoinConfigs(userId) {
    const { data, error } = await supabase
      .from('user_coin_configs')
      .select('*')
      .eq('user_id', userId)
    
    if (error) throw error
    return data
  },

  async saveUserCoinConfig(configData) {
    const { data, error } = await supabase
      .from('user_coin_configs')
      .upsert(configData)
      .select()
    
    if (error) throw error
    return data
  }
}

export default supabase
