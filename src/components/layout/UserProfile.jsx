// src/components/layout/UserProfile.jsx
import { User } from 'lucide-react'

export default function UserProfile({ profile }) {
    if (!profile) return null

    const getExperienceLabel = (experience) => {
        switch (experience) {
            case 'beginner': return '초보'
            case 'expert': return '전문가'
            case 'intermediate':
            default: return '중급자'
        }
    }

    const getPlanLabel = (planType) => {
        return (planType || 'FREE').toUpperCase()
    }

    const getPlanColor = (planType) => {
        switch (planType) {
            case 'pro': return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
            case 'premium': return 'bg-gold-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
            case 'free':
            default: return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
        }
    }

    return (
        <div className="flex items-center space-x-2 text-sm">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">
                {getExperienceLabel(profile.investment_experience)}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getPlanColor(profile.plan_type)}`}>
                {getPlanLabel(profile.plan_type)}
            </span>
        </div>
    )
}
