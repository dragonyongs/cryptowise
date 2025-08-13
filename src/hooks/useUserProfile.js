// src/hooks/useUserProfile.js
import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { createLogData } from "@/utils/network";

export function useUserProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, supabase } = useAuth();

  // 사용자 프로필 불러오기
  const loadProfile = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError) {
        if (profileError.code === "PGRST116") {
          // 프로필이 없으면 생성 (트리거가 users는 이미 생성함)
          await createDefaultProfile();
          return;
        }
        throw profileError;
      }

      setProfile(data);
      console.log("👤 프로필 로드 완료:", data.investment_experience);
    } catch (err) {
      console.error("프로필 로드 실패:", err);
      setError(err.message);

      // Fallback 처리
      setProfile({
        user_id: user.id,
        plan_type: "free",
        watchlist_limit: 5,
        risk_tolerance: 5,
        investment_experience: "beginner",
        preferred_holding_period: "medium",
        onboarding_completed: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // 기본 프로필 생성
  const createDefaultProfile = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .insert({
          user_id: user.id,
          plan_type: "free",
          watchlist_limit: 5,
          risk_tolerance: 5,
          investment_experience: "beginner",
          preferred_holding_period: "medium",
          onboarding_completed: false,
          language: "ko",
          timezone: "Asia/Seoul",
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      console.log("✅ 기본 프로필 생성 완료");

      // 프로필 생성시 추가 초기화 작업
      await initializeProfileRelatedData(user.id);
    } catch (err) {
      console.error("기본 프로필 생성 실패:", err);
      setError(err.message);
    }
  };

  // 프로필 관련 데이터 초기화
  const initializeProfileRelatedData = async (userId) => {
    try {
      // 기본 관심 코인 목록 추가
      const defaultCoins = ["bitcoin", "ethereum", "binancecoin"];

      for (const coinId of defaultCoins) {
        await supabase.from("user_watchlist").insert({
          user_id: userId,
          coin_id: coinId,
          created_at: new Date().toISOString(),
        });
      }

      console.log("📈 기본 관심 코인 목록 생성 완료");
    } catch (error) {
      console.error("프로필 관련 데이터 초기화 실패:", error);
    }
  };

  // 프로필 업데이트 (일반용)
  const updateProfile = async (updates) => {
    if (!user) return false;

    try {
      setError(null);
      const { data, error } = await supabase
        .from("user_profiles")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile((prev) => ({ ...prev, ...data }));
      console.log("✅ 프로필 업데이트 성공");
      return true;
    } catch (err) {
      console.error("프로필 업데이트 실패:", err);
      setError(err.message);
      return false;
    }
  };

  // 온보딩 완료용 프로필 업데이트 (새로 추가)
  const updateUserProfile = async (profileData) => {
    if (!user) return false;

    try {
      setError(null);

      const updateData = {
        ...profileData,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          ...updateData,
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      console.log("✅ 온보딩 프로필 업데이트 성공:", data);

      // 온보딩 완료시 추가 작업
      await handleOnboardingCompletion(data);

      return true;
    } catch (err) {
      console.error("온보딩 프로필 저장 실패:", err);
      setError(err.message);
      return false;
    }
  };

  const handleOnboardingCompletion = async (profile) => {
    try {
      // 1. 온보딩 완료 이벤트 로그 - 간단해짐
      const logData = await createLogData(
        profile.user_id,
        "onboarding_completed",
        "user_profile",
        profile.user_id,
        {
          investment_experience: profile.investment_experience,
          interests: profile.interests || [],
          risk_tolerance: profile.risk_tolerance,
        }
      );

      await supabase.from("user_activity_logs").insert(logData);

      // 2. 투자 성향에 따른 맞춤 설정
      await applyPersonalizedSettings(profile);

      console.log("🎉 온보딩 완료 후속 작업 완료");
    } catch (error) {
      console.error("온보딩 완료 후속 작업 실패:", error);
    }
  };

  // 개인화 설정 적용
  const applyPersonalizedSettings = async (profile) => {
    try {
      // 투자 경험에 따른 알림 설정 조정
      const alertSettings = {
        beginner: { price_change_threshold: 5 },
        intermediate: { price_change_threshold: 10 },
        expert: { price_change_threshold: 15 },
      };

      const threshold =
        alertSettings[profile.investment_experience]?.price_change_threshold ||
        10;

      await supabase
        .from("user_notification_settings")
        .update({
          price_change_threshold: threshold,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", profile.user_id);

      console.log(`⚙️ ${profile.investment_experience} 사용자 맞춤 설정 적용`);
    } catch (error) {
      console.error("개인화 설정 적용 실패:", error);
    }
  };

  // 구독 플랜 업그레이드
  const upgradePlan = async (planName) => {
    try {
      const { data: targetPlan } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("name", planName)
        .single();

      if (!targetPlan) {
        throw new Error(`플랜 '${planName}'을 찾을 수 없습니다`);
      }

      const success = await updateProfile({
        plan_type: planName,
        watchlist_limit: targetPlan.max_watchlist,
        subscription_plan_id: targetPlan.id,
        subscription_started_at: new Date().toISOString(),
      });

      if (success) {
        console.log(`✅ ${planName} 플랜으로 업그레이드 완료`);
        return true;
      }
      return false;
    } catch (err) {
      console.error("플랜 업그레이드 실패:", err);
      setError(err.message);
      return false;
    }
  };

  // 투자 성향 기반 코인 필터링 (트레이딩 로직)
  const getRecommendedCoins = (allCoins) => {
    if (!profile || !allCoins) return [];

    const { risk_tolerance, investment_experience } = profile;

    return allCoins
      .filter((coin) => {
        // 초보자 + 저위험 → 시총 상위 10위 안정 코인만
        if (investment_experience === "beginner" && risk_tolerance <= 3) {
          return coin.market_cap_rank <= 10;
        }

        // 경험자 + 고위험 → 시총 100위까지 허용
        if (investment_experience === "expert" && risk_tolerance >= 7) {
          return coin.market_cap_rank <= 100;
        }

        // 중급자 → 시총 50위까지
        return coin.market_cap_rank <= 50;
      })
      .sort((a, b) => {
        // 위험 성향에 따른 정렬
        if (risk_tolerance <= 3) {
          // 저위험: 시총 순으로 정렬 (안전한 순서)
          return a.market_cap_rank - b.market_cap_rank;
        } else {
          // 고위험: 24시간 변동률 순으로 정렬 (기회 순서)
          return (
            Math.abs(b.price_change_percentage_24h) -
            Math.abs(a.price_change_percentage_24h)
          );
        }
      });
  };

  // 투자 신호 생성 (개인화된 매수/매도 추천)
  const getPersonalizedSignal = (coin, sentiment, technicalData) => {
    if (!profile) return null;

    const { risk_tolerance, preferred_holding_period } = profile;

    // 위험 성향별 매수 신호 임계값 조정
    const rsiThreshold =
      risk_tolerance >= 7 ? 40 : risk_tolerance <= 3 ? 25 : 30;
    const sentimentThreshold =
      risk_tolerance >= 7 ? 0.2 : risk_tolerance <= 3 ? 0.5 : 0.3;

    // 보유 기간별 신호 강도 조정
    const signalMultiplier =
      preferred_holding_period === "long"
        ? 0.8
        : preferred_holding_period === "short"
          ? 1.2
          : 1.0;

    if (technicalData?.rsi < rsiThreshold && sentiment > sentimentThreshold) {
      const confidence = Math.min(
        0.95,
        (sentimentThreshold - sentiment + 0.3) * signalMultiplier
      );

      return {
        action: risk_tolerance >= 7 ? "aggressive_buy" : "safe_buy",
        confidence,
        reason: `${risk_tolerance >= 7 ? "적극적" : "안전한"} 매수 신호 (RSI: ${technicalData.rsi}, 감성: ${(sentiment * 100).toFixed(0)}%)`,
        expectedReturn: risk_tolerance >= 7 ? "15-25%" : "8-15%",
      };
    }

    return null;
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  // 실시간 프로필 변경 구독
  useEffect(() => {
    if (!user || !supabase) return;

    const subscription = supabase
      .channel("user_profiles_changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "user_profiles",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("👤 프로필 실시간 업데이트:", payload.new);
          setProfile((prev) => ({ ...prev, ...payload.new }));
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, supabase]);

  return {
    profile,
    loading,
    error,
    updateProfile, // 일반 프로필 업데이트
    updateUserProfile, // 온보딩 완료용 업데이트
    loadProfile,
    upgradePlan,
    getRecommendedCoins,
    getPersonalizedSignal,
  };
}
