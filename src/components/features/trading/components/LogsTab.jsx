// src/components/features/testing/components/LogsTab.jsx
import React from "react";
import {
  SearchIcon,
  XIcon,
  AlertTriangleIcon,
  InfoIcon,
  CheckCircleIcon,
} from "lucide-react";

const LogsTab = ({ logs, searchTerm, onSearchChange }) => {
  const getLogIcon = (type) => {
    switch (type) {
      case "error":
        return AlertTriangleIcon;
      case "success":
        return CheckCircleIcon;
      case "warning":
        return AlertTriangleIcon;
      default:
        return InfoIcon;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case "error":
        return "text-red-600 bg-red-50 border-red-200";
      case "success":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const clearSearch = () => {
    onSearchChange("");
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="로그 검색..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Logs List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">시스템 로그</h3>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {logs.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {logs.map((log) => {
                const Icon = getLogIcon(log.type);
                const colorClass = getLogColor(log.type);

                return (
                  <div key={log.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className={`p-1 rounded ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-medium uppercase tracking-wide ${
                              log.type === "error"
                                ? "text-red-600"
                                : log.type === "success"
                                  ? "text-green-600"
                                  : log.type === "warning"
                                    ? "text-yellow-600"
                                    : "text-blue-600"
                            }`}
                          >
                            {log.type}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{log.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <InfoIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{searchTerm ? "검색 결과가 없습니다." : "로그가 없습니다."}</p>
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  검색 조건 초기화
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(LogsTab);
