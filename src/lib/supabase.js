import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 데이터베이스 헬퍼 함수들
export const db = {
  // 시장 데이터 관련
  async getMarketSnapshot(symbol) {
    const { data, error } = await supabase
      .from("market_snapshots")
      .select("*")
      .eq("symbol", symbol)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;
    return data;
  },

  // 신호 로그 관련
  async saveSignalLog(signalData) {
    const { data, error } = await supabase
      .from("signal_logs")
      .insert(signalData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 백테스트 세션 관련
  async createBacktestSession(sessionData) {
    const { data, error } = await supabase
      .from("backtest_sessions")
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateBacktestSession(sessionId, updateData) {
    const { data, error } = await supabase
      .from("backtest_sessions")
      .update(updateData)
      .eq("id", sessionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // 사용자 코인 설정 관련
  async getUserCoinConfigs(userId) {
    const { data, error } = await supabase
      .from("user_coin_configs")
      .select("*")
      .eq("user_id", userId);

    if (error) throw error;
    return data;
  },

  async saveUserCoinConfig(configData) {
    const { data, error } = await supabase
      .from("user_coin_configs")
      .upsert(configData)
      .select();

    if (error) throw error;
    return data;
  },
};

// Firebase JWT를 Supabase에 전달하는 함수
export const syncFirebaseToSupabase = async (firebaseUser) => {
  if (!firebaseUser) {
    await supabase.auth.signOut();
    return null;
  }

  try {
    // Firebase JWT 토큰 가져오기
    const idToken = await firebaseUser.getIdToken();

    // Supabase에 Firebase JWT로 로그인
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "firebase",
      token: idToken,
    });

    if (error) {
      console.error("Supabase 연동 오류:", error);
      return null;
    }

    // 사용자 프로필 동기화
    await syncUserProfile(firebaseUser);

    return data;
  } catch (error) {
    console.error("Firebase-Supabase 동기화 오류:", error);
    return null;
  }
};

// 사용자 프로필 동기화
const syncUserProfile = async (firebaseUser) => {
  const userProfile = {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    display_name: firebaseUser.displayName,
    photo_url: firebaseUser.photoURL,
    provider: "google",
    last_login: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("users").upsert(userProfile, {
    onConflict: "id",
    ignoreDuplicates: false,
  });

  if (error) {
    console.error("사용자 프로필 동기화 오류:", error);
  }
};

// 사용자 트레이딩 설정 초기화
export const initializeUserTradingConfig = async (userId) => {
  const defaultCoins = ["BTC", "ETH", "XRP", "ADA"];

  const tradingConfigs = defaultCoins.map((symbol) => ({
    user_id: userId,
    symbol,
    trading_mode: "both",
    buy_percentage: 30.0,
    profit_target: 8.0,
    stop_loss: -8.0,
    risk_level: 5,
    is_active: true,
  }));

  const { error } = await supabase
    .from("user_coin_configs")
    .upsert(tradingConfigs, { onConflict: "user_id,symbol" });

  if (error) {
    console.error("트레이딩 설정 초기화 오류:", error);
  }
};

export default supabase;
