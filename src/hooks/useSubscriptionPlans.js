// src/hooks/useSubscriptionPlans.js
import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export function useSubscriptionPlans() {
  const [plans, setPlans] = useState([])
  const [currentPlan, setCurrentPlan] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user, supabase } = useAuth()

  const loadPlans = async () => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    
    if (!error) {
      setPlans(data || [])
    }
  }

  const loadCurrentPlan = async () => {
    if (!user) return
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        *,
        subscription_plans(*)
      `)
      .eq('user_id', user.id)
      .single()
    
    if (!error && data) {
      setCurrentPlan(data.subscription_plans)
    }
  }

  useEffect(() => {
    loadPlans()
    loadCurrentPlan()
    setLoading(false)
  }, [user])

  const upgradePlan = async (planName) => {
    const targetPlan = plans.find(p => p.name === planName)
    if (!targetPlan) return false

    const { error } = await supabase
      .from('user_profiles')
      .update({
        plan_type: planName,
        watchlist_limit: targetPlan.max_watchlist,
        subscription_plan_id: targetPlan.id,
        subscription_started_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
    
    if (!error) {
      loadCurrentPlan()
      return true
    }
    return false
  }

  return { 
    plans, 
    currentPlan, 
    loading, 
    upgradePlan 
  }
}
