// ConnectionStatus.jsx 개선
export const ConnectionStatus = ({
  connectionStatus,
  onReconnect,
  reconnectAttempts = 0,
  lastError,
}) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case "connected":
        return {
          color: "green",
          icon: "🟢",
          text: "업비트 연결됨",
          bgColor: "bg-green-50",
        };
      case "connecting":
        return {
          color: "yellow",
          icon: "🟡",
          text: `연결 중... ${reconnectAttempts > 0 ? `(${reconnectAttempts}회째)` : ""}`,
          bgColor: "bg-yellow-50",
        };
      case "disconnected":
        return {
          color: "red",
          icon: "🔴",
          text: `업비트 연결 끊어짐 ${reconnectAttempts > 0 ? `(${reconnectAttempts}회 시도)` : ""}`,
          bgColor: "bg-red-50",
        };
      case "error":
        return {
          color: "red",
          icon: "❌",
          text: "연결 오류",
          bgColor: "bg-red-50",
        };
      default:
        return {
          color: "gray",
          icon: "⚪",
          text: "알 수 없음",
          bgColor: "bg-gray-50",
        };
    }
  };

  const config = getStatusConfig(connectionStatus);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor}`}
    >
      <span>{config.icon}</span>
      <span className={`text-sm font-medium text-${config.color}-700`}>
        {config.text}
      </span>
      {connectionStatus === "disconnected" && (
        <button
          onClick={onReconnect}
          className="ml-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          재연결
        </button>
      )}
    </div>
  );
};
