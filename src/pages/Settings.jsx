import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowLeftIcon,
    Cog6ToothIcon,
    PaintBrushIcon,
    ShieldCheckIcon,
    BellIcon,
    GlobeAltIcon,
    ChartBarIcon,
    KeyIcon,
    ExclamationTriangleIcon,
    CheckIcon,
    EyeIcon,
    EyeSlashIcon,
    LinkIcon,
    CheckCircleIcon,
    DocumentArrowDownIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import { useUpbitStore } from '../stores/upbitStore';

export default function Settings() {
    const navigate = useNavigate();

    // ✅ 탭 상태 추가
    const [activeTab, setActiveTab] = useState('general');

    // ✅ 업비트 스토어
    const {
        saveApiKeys,
        isConnected,
        hasValidKeys,
        connectionStatus,
        permissions,
        disconnect,
        error: upbitError,
        clearError
    } = useUpbitStore();

    // ✅ API 폼 상태
    const [apiForm, setApiForm] = useState({
        accessKey: '',
        secretKey: '',
        showKeys: false
    });
    const [submitting, setSubmitting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // ✅ 일반 설정 상태
    const [settings, setSettings] = useState({
        theme: 'light',
        language: 'ko',
        currency: 'KRW',
        priceAlertThreshold: 5.0,
        signalAlertEnabled: true,
        dailyReportEnabled: true,
        soundEnabled: true,
        compactMode: false,
        advancedFeatures: false,
        dataSharing: false,
        autoBackup: true,
        twoFactorEnabled: false,
        sessionTimeout: 24
    });

    // ✅ 탭 구성
    const tabs = [
        {
            id: 'general',
            name: '일반',
            icon: Cog6ToothIcon,
            description: '외관, 알림 설정'
        },
        {
            id: 'security',
            name: '보안',
            icon: ShieldCheckIcon,
            description: '보안, 개인정보'
        },
        {
            id: 'api',
            name: 'API 연동',
            icon: KeyIcon,
            description: '업비트 연결'
        },
        {
            id: 'data',
            name: '데이터',
            icon: ChartBarIcon,
            description: '백업, 관리'
        }
    ];

    // ✅ 테마 옵션
    const themes = [
        { value: 'light', label: '라이트 모드', icon: '☀️' },
        { value: 'dark', label: '다크 모드', icon: '🌙' },
        { value: 'auto', label: '시스템 설정', icon: '🔄' }
    ];

    // ✅ 통화 옵션
    const currencies = [
        { value: 'KRW', label: '원화 (₩)', flag: '🇰🇷' },
        { value: 'USD', label: '달러 ($)', flag: '🇺🇸' },
        { value: 'EUR', label: '유로 (€)', flag: '🇪🇺' },
        { value: 'JPY', label: '엔화 (¥)', flag: '🇯🇵' }
    ];

    // ✅ API 키 저장 핸들러
    const handleSaveApiKeys = async () => {
        if (!apiForm.accessKey || !apiForm.secretKey) {
            alert('Access Key와 Secret Key를 모두 입력해주세요.');
            return;
        }

        setSubmitting(true);
        try {
            const result = await saveApiKeys(apiForm.accessKey, apiForm.secretKey);

            if (result.success) {
                setApiForm({ accessKey: '', secretKey: '', showKeys: false });
                alert('업비트 API 연결이 완료되었습니다!');
            } else {
                alert(result.error);
            }
        } catch (error) {
            alert('API 키 저장 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ✅ 설정 저장 핸들러
    const handleSave = async () => {
        setSaving(true);
        try {
            // 실제로는 백엔드 API로 설정 저장
            await new Promise(resolve => setTimeout(resolve, 1500));
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('설정 저장 실패:', error);
        } finally {
            setSaving(false);
        }
    };

    // ✅ 토글 핸들러
    const handleToggle = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // ✅ 데이터 내보내기
    const handleExportData = () => {
        const data = {
            settings,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cryptowise-settings-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // ✅ 캐시 지우기
    const handleClearCache = () => {
        if (confirm('모든 캐시 데이터가 삭제됩니다. 계속하시겠습니까?')) {
            localStorage.clear();
            sessionStorage.clear();
            alert('캐시가 삭제되었습니다. 페이지를 새로고침합니다.');
            window.location.reload();
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
                        환경 설정
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

            <div className="max-w-6xl mx-auto p-4 md:p-6">
                <div className="grid lg:grid-cols-4 gap-6">
                    {/* ✅ 탭 네비게이션 */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-4">
                            <nav className="space-y-2">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === tab.id
                                            ? 'bg-crypto-primary-50 text-crypto-primary-700 border border-crypto-primary-200'
                                            : 'text-crypto-neutral-700 hover:bg-crypto-neutral-50'
                                            }`}
                                    >
                                        <tab.icon className="w-5 h-5" />
                                        <div>
                                            <div className="font-medium">{tab.name}</div>
                                            <div className="text-xs text-crypto-neutral-500">
                                                {tab.description}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </nav>

                            {/* 업비트 연결 상태 표시 */}
                            <div className="mt-6 pt-4 border-t border-crypto-neutral-200">
                                <div className="flex items-center space-x-2 text-sm">
                                    <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                                        connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                                            connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                                        }`}></div>
                                    <span className="text-crypto-neutral-600">
                                        업비트: {
                                            connectionStatus === 'connected' ? '연결됨' :
                                                connectionStatus === 'connecting' ? '연결 중' :
                                                    connectionStatus === 'error' ? '연결 실패' : '연결 안됨'
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ✅ 탭 콘텐츠 */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* 일반 설정 탭 */}
                        {activeTab === 'general' && (
                            <>
                                {/* 외관 설정 */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                                >
                                    <h2 className="text-lg font-semibold text-crypto-neutral-900 mb-6 flex items-center">
                                        <PaintBrushIcon className="w-5 h-5 mr-2" />
                                        외관 및 표시
                                    </h2>

                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-3">
                                                테마 모드
                                            </label>
                                            <div className="grid grid-cols-3 gap-3">
                                                {themes.map((theme) => (
                                                    <label
                                                        key={theme.value}
                                                        className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${settings.theme === theme.value
                                                            ? 'border-crypto-primary-500 bg-crypto-primary-50'
                                                            : 'border-crypto-neutral-200 hover:border-crypto-neutral-300'
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="theme"
                                                            value={theme.value}
                                                            checked={settings.theme === theme.value}
                                                            onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                                                            className="sr-only"
                                                        />
                                                        <span className="text-2xl mb-2">{theme.icon}</span>
                                                        <span className="font-medium text-crypto-neutral-900 text-sm text-center">
                                                            {theme.label}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-3">
                                                기본 통화
                                            </label>
                                            <div className="grid md:grid-cols-2 gap-3">
                                                {currencies.map((currency) => (
                                                    <label
                                                        key={currency.value}
                                                        className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${settings.currency === currency.value
                                                            ? 'border-crypto-primary-500 bg-crypto-primary-50'
                                                            : 'border-crypto-neutral-200 hover:border-crypto-neutral-300'
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="currency"
                                                            value={currency.value}
                                                            checked={settings.currency === currency.value}
                                                            onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                                                            className="sr-only"
                                                        />
                                                        <span className="text-xl mr-3">{currency.flag}</span>
                                                        <span className="font-medium text-crypto-neutral-900">
                                                            {currency.label}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-crypto-neutral-50 rounded-lg">
                                            <div>
                                                <div className="font-medium text-crypto-neutral-900">압축 모드</div>
                                                <div className="text-sm text-crypto-neutral-600">
                                                    UI 요소를 더 작게 표시하여 더 많은 정보를 화면에 표시합니다
                                                </div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings.compactMode}
                                                    onChange={() => handleToggle('compactMode')}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-crypto-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crypto-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crypto-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crypto-primary-600"></div>
                                            </label>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* 알림 설정 */}
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                                >
                                    <h2 className="text-lg font-semibold text-crypto-neutral-900 mb-6 flex items-center">
                                        <BellIcon className="w-5 h-5 mr-2" />
                                        알림 및 경고
                                    </h2>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-crypto-neutral-700 mb-3">
                                                가격 변동 알림 임계값: {settings.priceAlertThreshold}%
                                            </label>
                                            <input
                                                type="range"
                                                min="1"
                                                max="20"
                                                step="0.5"
                                                value={settings.priceAlertThreshold}
                                                onChange={(e) => setSettings(prev => ({ ...prev, priceAlertThreshold: parseFloat(e.target.value) }))}
                                                className="w-full h-2 bg-crypto-neutral-200 rounded-lg appearance-none cursor-pointer slider"
                                            />
                                            <div className="flex justify-between text-xs text-crypto-neutral-500 mt-2">
                                                <span>1%</span>
                                                <span>10%</span>
                                                <span>20%</span>
                                            </div>
                                        </div>

                                        {[
                                            { key: 'signalAlertEnabled', label: '매매 신호 알림', desc: '매수/매도 신호 발생 시 알림' },
                                            { key: 'dailyReportEnabled', label: '일일 리포트', desc: '매일 포트폴리오 요약 리포트' },
                                            { key: 'soundEnabled', label: '사운드 알림', desc: '알림 발생 시 소리로 알려줍니다' }
                                        ].map((item) => (
                                            <div key={item.key} className="flex items-center justify-between p-4 bg-crypto-neutral-50 rounded-lg">
                                                <div>
                                                    <div className="font-medium text-crypto-neutral-900">{item.label}</div>
                                                    <div className="text-sm text-crypto-neutral-600">{item.desc}</div>
                                                </div>
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={settings[item.key]}
                                                        onChange={() => handleToggle(item.key)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-crypto-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crypto-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crypto-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crypto-primary-600"></div>
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            </>
                        )}

                        {/* 보안 설정 탭 */}
                        {activeTab === 'security' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                            >
                                <h2 className="text-lg font-semibold text-crypto-neutral-900 mb-6 flex items-center">
                                    <ShieldCheckIcon className="w-5 h-5 mr-2" />
                                    보안 및 개인정보
                                </h2>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <div className="flex items-start space-x-3">
                                            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                                            <div>
                                                <div className="font-medium text-yellow-900">2단계 인증 (권장)</div>
                                                <div className="text-sm text-yellow-800">
                                                    계정 보안을 강화하기 위해 2단계 인증을 활성화하세요
                                                </div>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={settings.twoFactorEnabled}
                                                onChange={() => handleToggle('twoFactorEnabled')}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-crypto-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crypto-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crypto-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crypto-primary-600"></div>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-crypto-neutral-700 mb-3">
                                            세션 타임아웃: {settings.sessionTimeout}시간
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="168"
                                            value={settings.sessionTimeout}
                                            onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
                                            className="w-full h-2 bg-crypto-neutral-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <div className="flex justify-between text-xs text-crypto-neutral-500 mt-2">
                                            <span>1시간</span>
                                            <span>24시간</span>
                                            <span>7일</span>
                                        </div>
                                    </div>

                                    {[
                                        { key: 'autoBackup', label: '자동 백업', desc: '설정과 데이터를 자동으로 백업합니다' },
                                        { key: 'dataSharing', label: '분석 데이터 공유', desc: '서비스 개선을 위한 익명화된 데이터 공유' },
                                        { key: 'advancedFeatures', label: '고급 기능', desc: '실험적 기능과 베타 기능을 사용합니다' }
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-4 bg-crypto-neutral-50 rounded-lg">
                                            <div>
                                                <div className="font-medium text-crypto-neutral-900">{item.label}</div>
                                                <div className="text-sm text-crypto-neutral-600">{item.desc}</div>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={settings[item.key]}
                                                    onChange={() => handleToggle(item.key)}
                                                    className="sr-only peer"
                                                />
                                                <div className="w-11 h-6 bg-crypto-neutral-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-crypto-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-crypto-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-crypto-primary-600"></div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* API 연동 탭 */}
                        {activeTab === 'api' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                                UP
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-crypto-neutral-900">
                                                업비트 API 연동
                                            </h3>
                                            <p className="text-sm text-crypto-neutral-600">
                                                실제 자산 조회 및 자동매매를 위해 업비트 API 키를 연결하세요
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' :
                                            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                                                connectionStatus === 'error' ? 'bg-red-500' : 'bg-gray-400'
                                            }`}></div>
                                        <span className={`text-sm font-medium ${connectionStatus === 'connected' ? 'text-green-600' :
                                            connectionStatus === 'connecting' ? 'text-yellow-600' :
                                                connectionStatus === 'error' ? 'text-red-600' : 'text-gray-600'
                                            }`}>
                                            {connectionStatus === 'connected' ? '연결됨' :
                                                connectionStatus === 'connecting' ? '연결 중' :
                                                    connectionStatus === 'error' ? '연결 실패' : '연결 안됨'}
                                        </span>
                                    </div>
                                </div>

                                {!isConnected ? (
                                    <div className="space-y-4">
                                        {/* API 키 발급 안내 */}
                                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                            <h4 className="font-medium text-blue-900 mb-2">API 키 발급 방법</h4>
                                            <ol className="text-sm text-blue-800 space-y-1">
                                                <li>1. 업비트 웹사이트 → 마이페이지 → Open API 관리</li>
                                                <li>2. 'API 키 발급' 클릭</li>
                                                <li>3. <strong>자산조회</strong> 권한 필수 체크 (매매권한은 선택사항)</li>
                                                <li>4. 발급받은 Access Key와 Secret Key를 아래에 입력</li>
                                            </ol>
                                            <a
                                                href="https://upbit.com/mypage/open_api_management"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center mt-3 text-blue-700 hover:text-blue-800 transition-colors"
                                            >
                                                <LinkIcon className="w-4 h-4 mr-1" />
                                                업비트 API 관리 페이지
                                            </a>
                                        </div>

                                        {/* API 키 입력 */}
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                                    Access Key
                                                </label>
                                                <input
                                                    type="text"
                                                    value={apiForm.accessKey}
                                                    onChange={(e) => setApiForm(prev => ({ ...prev, accessKey: e.target.value }))}
                                                    placeholder="업비트에서 발급받은 Access Key를 입력하세요"
                                                    className="w-full px-4 py-3 border border-crypto-neutral-300 rounded-xl focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-crypto-neutral-700 mb-2">
                                                    Secret Key
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={apiForm.showKeys ? "text" : "password"}
                                                        value={apiForm.secretKey}
                                                        onChange={(e) => setApiForm(prev => ({ ...prev, secretKey: e.target.value }))}
                                                        placeholder="업비트에서 발급받은 Secret Key를 입력하세요"
                                                        className="w-full px-4 py-3 border border-crypto-neutral-300 rounded-xl focus:ring-2 focus:ring-crypto-primary-500 focus:border-transparent pr-12"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setApiForm(prev => ({ ...prev, showKeys: !prev.showKeys }))}
                                                        className="absolute right-3 top-3 text-crypto-neutral-500 hover:text-crypto-neutral-700"
                                                    >
                                                        {apiForm.showKeys ? (
                                                            <EyeSlashIcon className="w-5 h-5" />
                                                        ) : (
                                                            <EyeIcon className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 에러 표시 */}
                                        {upbitError && (
                                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                                <div className="flex items-center space-x-3">
                                                    <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                                                    <div>
                                                        <h4 className="font-medium text-red-900">연결 실패</h4>
                                                        <p className="text-sm text-red-800 mt-1">{upbitError}</p>
                                                    </div>
                                                    <button
                                                        onClick={clearError}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* 보안 주의사항 */}
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <div className="flex items-start space-x-3">
                                                <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 mt-0.5" />
                                                <div>
                                                    <h4 className="font-medium text-yellow-900">보안 주의사항</h4>
                                                    <ul className="text-sm text-yellow-800 mt-1 space-y-1">
                                                        <li>• API 키는 AES-256 암호화로 안전하게 저장됩니다</li>
                                                        <li>• <strong>자산조회 권한</strong>만 부여하는 것을 권장합니다</li>
                                                        <li>• 매매권한은 자동매매 사용 시에만 필요합니다</li>
                                                        <li>• API 키는 절대 다른 사람과 공유하지 마세요</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 연결 버튼 */}
                                        <button
                                            onClick={handleSaveApiKeys}
                                            disabled={!apiForm.accessKey || !apiForm.secretKey || submitting}
                                            className="w-full bg-crypto-primary-500 text-white py-3 px-6 rounded-xl hover:bg-crypto-primary-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
                                        >
                                            {submitting ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                    <span>업비트 연결 중...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <KeyIcon className="w-5 h-5" />
                                                    <span>업비트 연결하기</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                ) : (
                                    /* 연결된 상태 */
                                    <div className="space-y-4">
                                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                                <div>
                                                    <h4 className="font-medium text-green-900">업비트 API 연결 완료</h4>
                                                    <p className="text-sm text-green-800">
                                                        실제 자산 조회 및 포트폴리오 관리가 가능합니다
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 권한 정보 */}
                                        <div className="p-4 bg-crypto-neutral-50 rounded-lg">
                                            <h4 className="font-medium text-crypto-neutral-900 mb-3">연결된 권한</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {permissions?.map((permission) => (
                                                    <span
                                                        key={permission}
                                                        className="px-3 py-1 bg-crypto-primary-100 text-crypto-primary-700 rounded-full text-sm font-medium"
                                                    >
                                                        {permission === 'accounts' ? '자산조회' :
                                                            permission === 'orders' ? '주문조회' :
                                                                permission === 'trading' ? '매매권한' : permission}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 빠른 액션 */}
                                        <div className="flex space-x-3">
                                            <button
                                                onClick={() => navigate('/portfolio')}
                                                className="flex-1 bg-crypto-success-600 text-white py-3 px-6 rounded-xl hover:bg-crypto-success-700 transition-colors"
                                            >
                                                포트폴리오 보기
                                            </button>
                                            <button
                                                onClick={disconnect}
                                                className="flex-1 border border-crypto-danger-300 text-crypto-danger-700 py-3 px-6 rounded-xl hover:bg-crypto-danger-50 transition-colors"
                                            >
                                                연결 해제
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* 데이터 관리 탭 */}
                        {activeTab === 'data' && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white rounded-xl shadow-sm border border-crypto-neutral-200 p-6"
                            >
                                <h2 className="text-lg font-semibold text-crypto-neutral-900 mb-6 flex items-center">
                                    <ChartBarIcon className="w-5 h-5 mr-2" />
                                    데이터 관리
                                </h2>

                                <div className="space-y-6">
                                    {/* 데이터 내보내기/가져오기 */}
                                    <div>
                                        <h3 className="font-medium text-crypto-neutral-900 mb-4">백업 및 복원</h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <button
                                                onClick={handleExportData}
                                                className="p-4 border border-crypto-primary-300 text-crypto-primary-700 rounded-lg hover:bg-crypto-primary-50 transition-colors flex items-center space-x-3"
                                            >
                                                <DocumentArrowDownIcon className="w-6 h-6" />
                                                <div>
                                                    <div className="font-medium">데이터 내보내기</div>
                                                    <div className="text-sm text-crypto-neutral-600 mt-1">
                                                        내 설정을 JSON 파일로 다운로드
                                                    </div>
                                                </div>
                                            </button>

                                            <label className="p-4 border border-crypto-success-300 text-crypto-success-700 rounded-lg hover:bg-crypto-success-50 transition-colors flex items-center space-x-3 cursor-pointer">
                                                <input type="file" accept=".json" className="sr-only" />
                                                <DocumentArrowDownIcon className="w-6 h-6 rotate-180" />
                                                <div>
                                                    <div className="font-medium">데이터 가져오기</div>
                                                    <div className="text-sm text-crypto-neutral-600 mt-1">
                                                        백업 파일에서 설정 복원
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>

                                    {/* 캐시 관리 */}
                                    <div>
                                        <h3 className="font-medium text-crypto-neutral-900 mb-4">캐시 관리</h3>
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start space-x-3">
                                                    <TrashIcon className="w-6 h-6 text-yellow-600 mt-0.5" />
                                                    <div>
                                                        <div className="font-medium text-yellow-900">캐시 데이터 삭제</div>
                                                        <div className="text-sm text-yellow-800 mt-1">
                                                            저장된 캐시와 임시 데이터를 모두 삭제합니다.<br />
                                                            이 작업은 되돌릴 수 없습니다.
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={handleClearCache}
                                                    className="bg-crypto-danger-600 text-white px-4 py-2 rounded-lg hover:bg-crypto-danger-700 transition-colors"
                                                >
                                                    캐시 지우기
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 저장소 정보 */}
                                    <div>
                                        <h3 className="font-medium text-crypto-neutral-900 mb-4">저장소 정보</h3>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="p-4 bg-crypto-neutral-50 rounded-lg">
                                                <div className="text-sm text-crypto-neutral-600">로컬 저장소 사용량</div>
                                                <div className="text-xl font-bold text-crypto-neutral-900 mt-1">
                                                    {Math.round(JSON.stringify(localStorage).length / 1024)} KB
                                                </div>
                                            </div>
                                            <div className="p-4 bg-crypto-neutral-50 rounded-lg">
                                                <div className="text-sm text-crypto-neutral-600">마지막 백업</div>
                                                <div className="text-xl font-bold text-crypto-neutral-900 mt-1">
                                                    없음
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ✅ 저장 버튼 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
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
                                        <span>설정 저장</span>
                                    </>
                                )}
                            </button>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>
    );
}
