// src/features/trading/components/LogsTab.jsx - useTradingLogger 훅 통합 완전 버전
import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  SearchIcon,
  XIcon,
  AlertTriangleIcon,
  InfoIcon,
  CheckCircleIcon,
  XCircleIcon,
  FilterIcon,
  RefreshCwIcon,
  DownloadIcon,
  TrashIcon,
  SortAscIcon,
  CalendarIcon,
  ClockIcon,
  EyeIcon
} from "lucide-react";
import { useTradingLogger } from "../hooks/useTradingLogger"; // 🔥 훅 import

const LogsTab = ({
  initialSearchTerm = "",
  onSearchChange,
  onClearLogs
}) => {
  // 🔥 useTradingLogger 훅 사용
  const {
    logs,
    logStats, // ✅ 훅에서 계산된 logStats 사용
    addLog,
    exportLogs: exportLogsFromHook,
    getFilteredLogs,
    resetStats
  } = useTradingLogger();

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [typeFilter, setTypeFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("time");
  const [showDetails, setShowDetails] = useState({});

  // ✅ 로그 타입별 아이콘 (안전한 접근)
  const getLogIcon = (type) => {
    if (!type || typeof type !== 'string') return InfoIcon;
    switch (type.toLowerCase()) {
      case "error":
        return XCircleIcon;
      case "success":
        return CheckCircleIcon;
      case "warning":
        return AlertTriangleIcon;
      default:
        return InfoIcon;
    }
  };

  // ✅ 로그 타입별 색상 (안전한 접근)
  const getLogColor = (type) => {
    if (!type || typeof type !== 'string') {
      return "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400";
    }
    switch (type.toLowerCase()) {
      case "error":
        return "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400";
      case "success":
        return "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400";
    }
  };

  // ✅ 로그 타입별 배지 색상 (안전한 접근)
  const getBadgeColor = (type) => {
    if (!type || typeof type !== 'string') {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
    switch (type.toLowerCase()) {
      case "error":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "success":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "warning":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    }
  };

  // ✅ 필터링된 로그 (useTradingLogger의 getFilteredLogs 사용)
  const filteredLogs = useMemo(() => {
    if (!Array.isArray(logs)) return [];

    // 🔥 안전한 날짜 파싱 함수
    const parseDateSafe = (val) => {
      try {
        if (val instanceof Date) return val;
        if (typeof val === 'string' || typeof val === 'number') {
          const date = new Date(val);
          return isNaN(date.getTime()) ? null : date;
        }
        return null;
      } catch {
        return null;
      }
    };

    return logs.filter(log => {
      // 1. 기본 유효성 검사
      if (!log || typeof log !== 'object') return false;

      // 2. 타입 필터링 (type 우선, 없으면 level 사용)
      const logType = (log.type || log.level || '').toLowerCase();
      if (typeFilter !== 'all' && logType !== typeFilter.toLowerCase()) {
        return false;
      }

      // 3. 검색어 필터링 (메시지와 타입 모두 검색)
      const message = String(log.message || '').toLowerCase();
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const matchMessage = message.includes(searchLower);
        const matchType = logType.includes(searchLower);
        if (!matchMessage && !matchType) return false;
      }

      // 4. 시간 필터링 (안전한 날짜 처리)
      if (timeFilter !== 'all') {
        const logDate = parseDateSafe(log.timestamp);
        if (!logDate) return false; // 날짜 파싱 실패시 제외

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

        switch (timeFilter) {
          case 'today':
            if (logDate < today) return false;
            break;
          case 'hour':
            if ((now - logDate) > 3600000) return false; // 1시간 = 3600000ms
            break;
          case '10min':
            if ((now - logDate) > 600000) return false; // 10분 = 600000ms
            break;
          case 'week':
            if (logDate < weekAgo) return false;
            break;
          default:
            break;
        }
      }

      return true; // 모든 필터 통과
    }).sort((a, b) => {
      // 5. 정렬 (안전한 정렬 처리)
      try {
        const dateA = parseDateSafe(a.timestamp) || new Date(0);
        const dateB = parseDateSafe(b.timestamp) || new Date(0);
        const typeA = String(a.type || a.level || '');
        const typeB = String(b.type || b.level || '');
        const messageA = String(a.message || '');
        const messageB = String(b.message || '');
        switch (sortBy) {
          case 'time':

            return dateB - dateA; // 최신순
          case 'type':

            return typeA.localeCompare(typeB);
          case 'message':

            return messageA.localeCompare(messageB);
          default:
            return 0;
        }
      } catch (error) {
        console.warn('정렬 오류:', error);
        return 0;
      }
    });
  }, [logs, searchTerm, typeFilter, timeFilter, sortBy]);

  // ✅ 검색어 클리어
  const clearSearch = useCallback(() => {
    setSearchTerm("");
    if (onSearchChange) {
      onSearchChange("");
    }
  }, [onSearchChange]);

  // ✅ 검색어 변경 핸들러
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
    if (onSearchChange) {
      onSearchChange(value);
    }
  }, [onSearchChange]);

  // ✅ 로그 세부사항 토글
  const toggleLogDetails = useCallback((logId) => {
    setShowDetails(prev => ({
      ...prev,
      [logId]: !prev[logId]
    }));
  }, []);

  // ✅ 전체 로그 삭제 (훅의 resetStats 사용)
  const clearAllLogs = useCallback(() => {
    if (window.confirm('모든 로그를 삭제하시겠습니까?')) {
      resetStats(); // 🔥 훅의 resetStats 사용
      if (onClearLogs) {
        onClearLogs();
      }
    }
  }, [onClearLogs, resetStats]);

  // ✅ 로그 내보내기 (훅의 exportLogs 사용)
  const handleExportLogs = useCallback(() => {
    try {
      exportLogsFromHook('json'); // 🔥 훅의 exportLogs 사용
      addLog('로그 내보내기 완료', 'success');
    } catch (error) {
      console.error('로그 내보내기 실패:', error);
      addLog('로그 내보내기 실패: ' + error.message, 'error');
    }
  }, [exportLogsFromHook, addLog]);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            시스템 로그
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            시스템 이벤트와 오류 로그를 확인하세요
          </p>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportLogs}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <DownloadIcon className="w-4 h-4" />
            내보내기
          </button>
          <button
            onClick={clearAllLogs}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/30"
          >
            <TrashIcon className="w-4 h-4" />
            전체 삭제
          </button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">전체</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{logStats.total}</p>
            </div>
            <InfoIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">오류</p>
              <p className="text-2xl font-bold text-red-600">{logStats.errors}</p>
            </div>
            <XCircleIcon className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">경고</p>
              <p className="text-2xl font-bold text-yellow-600">{logStats.warnings}</p>
            </div>
            <AlertTriangleIcon className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">성공</p>
              <p className="text-2xl font-bold text-green-600">{logStats.success}</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">10분</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{logStats.recent.last10min}</p>
            </div>
            <ClockIcon className="w-8 h-8 text-gray-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">오늘</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{logStats.recent.today}</p>
            </div>
            <CalendarIcon className="w-8 h-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border dark:border-gray-700">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* 검색 */}
          <div className="flex-1">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="로그 메시지 검색..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 필터들 */}
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">모든 타입</option>
              <option value="error">오류</option>
              <option value="warning">경고</option>
              <option value="success">성공</option>
              <option value="info">정보</option>
              <option value="debug">디버그</option>
            </select>

            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="all">전체 기간</option>
              <option value="10min">최근 10분</option>
              <option value="hour">최근 1시간</option>
              <option value="today">오늘</option>
              <option value="week">이번 주</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="time">시간순</option>
              <option value="type">타입순</option>
              <option value="message">메시지순</option>
            </select>
          </div>
        </div>
      </div>

      {/* 로그 목록 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 overflow-hidden">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <InfoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              로그가 없습니다
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? "다른 검색어를 시도해보세요" : "필터 조건을 변경해보세요"}
            </p>
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="mt-3 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                검색어 지우기
              </button>
            )}
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            {filteredLogs.map((log) => {
              const LogIcon = getLogIcon(log.type);
              const isExpanded = showDetails[log.id];

              return (
                <div
                  key={log.id}
                  className={`border-l-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${getLogColor(log.type).includes('red') ? 'border-l-red-500' :
                    getLogColor(log.type).includes('green') ? 'border-l-green-500' :
                      getLogColor(log.type).includes('yellow') ? 'border-l-yellow-500' :
                        'border-l-blue-500'
                    }`}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <LogIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${getLogColor(log.type).includes('red') ? 'text-red-500' :
                          getLogColor(log.type).includes('green') ? 'text-green-500' :
                            getLogColor(log.type).includes('yellow') ? 'text-yellow-500' :
                              'text-blue-500'
                          }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(log.type)}`}>
                              {log.type || 'info'}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : '시간 없음'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white break-words">
                            {log.message || '메시지가 없습니다'}
                          </p>
                          {isExpanded && log.metadata && (
                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
                              <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-300">
                                {typeof log.metadata === 'object'
                                  ? JSON.stringify(log.metadata, null, 2)
                                  : log.metadata
                                }
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                      {log.metadata && (
                        <button
                          onClick={() => toggleLogDetails(log.id)}
                          className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogsTab;
