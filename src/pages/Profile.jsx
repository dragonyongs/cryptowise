import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import {
    ArrowLeftIcon,
    UserIcon,
    CameraIcon,
    GlobeAltIcon,
    ClockIcon,
    ChartBarIcon,
    CheckIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function Profile() {
    const navigate = useNavigate();
    const { user, updateProfile } = useAuthStore();
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [profileData, setProfileData] = useState({
        displayName: user?.name || '',
        email: user?.email || '',
        bio: '',
        avatarUrl: user?.image || '',
        country: 'KR',
        language: 'ko',
        timezone: 'Asia/Seoul',
        riskTolerance: 5,
        investmentExperience: 'beginner',
        preferredHoldingPeriod: 'medium'
    });

    const countries = [
        { code: 'KR', name: '대한민국', flag: '🇰🇷' },
        { code: 'US', name: '미국', flag: '🇺🇸' },
        { code: 'JP', name: '일본', flag: '🇯🇵' },
        { code: 'CN', name: '중국', flag: '🇨🇳' },
        { code: 'GB', name: '영국', flag: '🇬🇧' }
    ];

    const experienceLevels = [
        { value: 'beginner', label: '초보자', description: '암호화폐 투자 경험이 6개월 미만' },
        { value: 'intermediate', label: '중급자', description: '6개월 ~ 2년 경험' },
        { value: 'advanced', label: '고급자', description: '2년 이상의 풍부한 경험' }
    ];

    const holdingPeriods = [
        { value: 'short', label: '단기 (1일 ~ 1주)', icon: '⚡' },
        { value: 'medium', label: '중기 (1주 ~ 3개월)', icon: '📈' },
        { value: 'long', label: '장기 (3개월 이상)', icon: '💎' }
    ];

    const handleSave = async () => {
        setSaving(true);
        try {
            // 실제로는 API 호출
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 프로필 업데이트
            await updateProfile(profileData);

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('프로필 업데이트 실패:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setProfileData(prev => ({
                    ...prev,
                    avatarUrl: e.target.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="min-h-screen bg-crypto-neutral-50">
            {/* 헤더 */}
            <div className="bg-white border-b border-crypto-neutral-200 px-4 py-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center space-x-2 text-crypto-neutral-600 hover:text-crypto-neutral-900 transition-colors"
                    >
                        <ArrowLeftIcon className="w-5 h-5" />
                        <span>대시보드</span>
                    </button>

                    <h1 className="text-lg font-semibold text-crypto-neutral-900">
                        프로필 설정
                    </h1>

                    <div className="flex items-center space-x-2">
                        {saved && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center space-x-1 text-crypto-success-600"
                            >
                                <CheckIcon className="w-4 h-4" />
                                <span className="text-sm">저장됨</span>
                            </motion.div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
                {/* 프로필 사진 섹션 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                >
                    <h2 className="text-lg font-semibold text-crypto-neutral-900 mb-6 flex items-center">
                        <UserIcon className="w-5 h-5 mr-2" />
                        기본 정보
                    </h2>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
                        <div className="relative group">
                            <div className="w-24 h-24 bg-crypto-neutral-100 rounded-full overflow-hidden ring-4 ring-crypto-primary-100">
                                {profileData.avatarUrl ? (
                                    <img
                                        src={profileData.avatarUrl}
                                        alt="프로필"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <UserIcon className="w-8 h-8 text-crypto-neutral-400" />
                                    </div>
                                )}
                            </div>

                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                <CameraIcon className="w-6 h-6 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="sr-only"
                                />
                            </label>
                        </div>

                        <div className="flex-1 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                    표시 이름
                                </label>
                                <input
                                    type="text"
                                    value={profileData.displayName}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, displayName: e.target.value }))}
                                    className="w-full px-4 py-3 border border-crypto-neutral-300 rounded-xl focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                    이메일
                                </label>
                                <input
                                    type="email"
                                    value={profileData.email}
                                    disabled
                                    className="w-full px-4 py-3 border border-crypto-neutral-300 rounded-xl bg-crypto-neutral-50 text-crypto-neutral-500"
                                />
                                <p className="text-xs text-crypto-neutral-500 mt-1">
                                    이메일은 변경할 수 없습니다
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                            자기소개
                        </label>
                        <textarea
                            value={profileData.bio}
                            onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="자신을 간단히 소개해주세요"
                            rows={3}
                            className="w-full px-4 py-3 border border-crypto-neutral-300 rounded-xl focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent resize-none"
                        />
                    </div>
                </motion.div>

                {/* 지역 및 언어 설정 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                >
                    <h2 className="text-lg font-semibold text-crypto-neutral-900 mb-6 flex items-center">
                        <GlobeAltIcon className="w-5 h-5 mr-2" />
                        지역 및 언어
                    </h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-3">
                                국가/지역
                            </label>
                            <div className="space-y-2">
                                {countries.map((country) => (
                                    <label
                                        key={country.code}
                                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${profileData.country === country.code
                                                ? 'border-crypto-primary-500 bg-crypto-primary-50'
                                                : 'border-crypto-neutral-200 hover:border-crypto-neutral-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="country"
                                            value={country.code}
                                            checked={profileData.country === country.code}
                                            onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value }))}
                                            className="sr-only"
                                        />
                                        <span className="text-xl mr-3">{country.flag}</span>
                                        <span className="font-medium text-crypto-neutral-900">
                                            {country.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-3">
                                시간대
                            </label>
                            <div className="flex items-center space-x-2 p-3 bg-crypto-neutral-50 rounded-lg">
                                <ClockIcon className="w-5 h-5 text-crypto-neutral-500" />
                                <span className="font-medium text-crypto-neutral-900">
                                    {new Date().toLocaleString('ko-KR', {
                                        timeZone: profileData.timezone,
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <select
                                value={profileData.timezone}
                                onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                                className="w-full mt-2 px-4 py-3 border border-crypto-neutral-300 rounded-xl focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent"
                            >
                                <option value="Asia/Seoul">서울 (UTC+9)</option>
                                <option value="America/New_York">뉴욕 (UTC-5)</option>
                                <option value="Europe/London">런던 (UTC+0)</option>
                                <option value="Asia/Tokyo">도쿄 (UTC+9)</option>
                            </select>
                        </div>
                    </div>
                </motion.div>

                {/* 투자 성향 설정 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                >
                    <h2 className="text-lg font-semibold text-crypto-neutral-900 mb-6 flex items-center">
                        <ChartBarIcon className="w-5 h-5 mr-2" />
                        투자 성향
                    </h2>

                    <div className="space-y-6">
                        {/* 리스크 허용도 */}
                        <div>
                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-4">
                                리스크 허용도: {profileData.riskTolerance}/10
                            </label>
                            <div className="relative">
                                <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    value={profileData.riskTolerance}
                                    onChange={(e) => setProfileData(prev => ({ ...prev, riskTolerance: parseInt(e.target.value) }))}
                                    className="w-full h-2 bg-crypto-neutral-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-crypto-neutral-500 mt-2">
                                    <span>보수적 (1)</span>
                                    <span>균형잡힌 (5)</span>
                                    <span>공격적 (10)</span>
                                </div>
                            </div>
                        </div>

                        {/* 투자 경험 */}
                        <div>
                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-3">
                                투자 경험
                            </label>
                            <div className="space-y-3">
                                {experienceLevels.map((level) => (
                                    <label
                                        key={level.value}
                                        className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-colors ${profileData.investmentExperience === level.value
                                                ? 'border-crypto-primary-500 bg-crypto-primary-50'
                                                : 'border-crypto-neutral-200 hover:border-crypto-neutral-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="experience"
                                            value={level.value}
                                            checked={profileData.investmentExperience === level.value}
                                            onChange={(e) => setProfileData(prev => ({ ...prev, investmentExperience: e.target.value }))}
                                            className="sr-only"
                                        />
                                        <div>
                                            <div className="font-medium text-crypto-neutral-900 mb-1">
                                                {level.label}
                                            </div>
                                            <div className="text-sm text-crypto-neutral-600">
                                                {level.description}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 선호 보유 기간 */}
                        <div>
                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-3">
                                선호 보유 기간
                            </label>
                            <div className="grid md:grid-cols-3 gap-3">
                                {holdingPeriods.map((period) => (
                                    <label
                                        key={period.value}
                                        className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${profileData.preferredHoldingPeriod === period.value
                                                ? 'border-crypto-primary-500 bg-crypto-primary-50'
                                                : 'border-crypto-neutral-200 hover:border-crypto-neutral-300'
                                            }`}
                                    >
                                        <input
                                            type="radio"
                                            name="holdingPeriod"
                                            value={period.value}
                                            checked={profileData.preferredHoldingPeriod === period.value}
                                            onChange={(e) => setProfileData(prev => ({ ...prev, preferredHoldingPeriod: e.target.value }))}
                                            className="sr-only"
                                        />
                                        <span className="text-2xl mb-2">{period.icon}</span>
                                        <span className="font-medium text-crypto-neutral-900 text-center">
                                            {period.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* 저장 버튼 */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="flex justify-end"
                >
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-crypto-primary-500 text-white px-8 py-3 rounded-xl hover:bg-crypto-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>저장 중...</span>
                            </>
                        ) : (
                            <>
                                <CheckIcon className="w-5 h-5" />
                                <span>프로필 저장</span>
                            </>
                        )}
                    </button>
                </motion.div>
            </div>
        </div>
    );
}
