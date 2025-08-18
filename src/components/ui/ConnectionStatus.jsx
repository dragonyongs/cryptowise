// src/components/ui/ConnectionStatus.jsx

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
          text: `업비트 연결 끊어짐 ${reconnectAttempts > 0 ? `(${reconnectAttempts}회 시도)` : ""
            }`,
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
    <div className={`p-2 rounded ${config.bgColor} flex items-center gap-2`}>
      <span>{config.icon}</span>
      <span className={`text-${config.color}-700`}>{config.text}</span>
      {connectionStatus !== "connected" && onReconnect ? (
        <button
          className="ml-auto px-2 py-1 border rounded text-sm"
          onClick={onReconnect}
        >
          재연결
        </button>
      ) : null}
      {lastError ? (
        <span className="ml-2 text-xs text-red-500">{String(lastError)}</span>
      ) : null}
    </div>
  );
};

export default ConnectionStatus;
