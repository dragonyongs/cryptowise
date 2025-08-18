// src/components/ui/ConnectionStatus.jsx - 수정된 버전
export const ConnectionStatus = ({
  status,           // ✅ connectionStatus → status로 변경
  onReconnect,
  reconnectAttempts = 0,
  lastError
}) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case "connected":
        return { color: "green", icon: "🟢", text: "업비트 연결됨", bgColor: "bg-green-50" };
      case "connecting":
        return { color: "yellow", icon: "🟡", text: `연결 중... ${reconnectAttempts > 0 ? `(${reconnectAttempts}회째)` : ""}`, bgColor: "bg-yellow-50" };
      case "disconnected":
        return { color: "red", icon: "🔴", text: `업비트 연결 끊어짐 ${reconnectAttempts > 0 ? `(${reconnectAttempts}회 시도)` : ""}`, bgColor: "bg-red-50" };
      case "error":
        return { color: "red", icon: "❌", text: "연결 오류", bgColor: "bg-red-50" };
      // ✅ null/undefined 처리 추가
      case null:
      case undefined:
      case "unknown":
      default:
        return { color: "gray", icon: "⚪", text: "알 수 없음", bgColor: "bg-gray-50" };
    }
  };

  const config = getStatusConfig(status); // ✅ status 사용

  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-md ${config.bgColor}`}>
      <span className="text-sm">{config.icon}</span>
      <span className={`text-${config.color}-700 text-sm font-medium`}>
        {config.text}
      </span>
      {status === "disconnected" && onReconnect && (
        <button
          onClick={onReconnect}
          className="ml-2 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded"
        >
          재시도
        </button>
      )}
      {lastError && (
        <span className="text-red-600 text-xs ml-2">
          오류: {lastError}
        </span>
      )}
    </div>
  );
};
