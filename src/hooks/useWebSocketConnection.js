// ✅ 수정된 useWebSocketConnection.js
import { useState, useCallback } from "react";
import { useResilientWebSocket } from "./useResilientWebSocket";

export const useWebSocketConnection = (
  onMessageHandler,
  addLog,
  tradingMode,
  getTargetMarkets
) => {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");

  // ✅ 먼저 useResilientWebSocket 호출
  const { isConnected, reconnect, disconnect, sendMessage } =
    useResilientWebSocket("wss://api.upbit.com/websocket/v1", {
      onMessage: onMessageHandler,
      onConnect: () => {
        setConnectionStatus("connected");
        addLog("📡 WebSocket 연결됨", "success");
        setTimeout(() => sendSubscription(), 200); // ✅ 여기서 호출
      },
      onDisconnect: () => {
        setConnectionStatus("disconnected");
        addLog("🔌 연결 끊어짐", "warning");
      },
      autoReconnect: true,
      maxReconnectAttempts: 10,
      reconnectInterval: 3000,
      maxReconnectInterval: 30000,
    });

  // ✅ sendMessage 정의 후에 sendSubscription 정의
  const sendSubscription = useCallback(() => {
    const markets = getTargetMarkets();
    if (markets.length === 0) return false;

    const msg = JSON.stringify([
      { ticket: `cryptowise-${Date.now()}` },
      { type: "ticker", codes: markets },
    ]);

    const sent = sendMessage(msg); // ✅ 이제 정의된 후 사용
    if (sent) {
      addLog(`📡 구독: ${markets.length}개 코인 (${tradingMode})`, "info");
    } else {
      addLog(`⚠️ WebSocket 연결 대기 중`, "warning");
    }
    return sent;
  }, [getTargetMarkets, addLog, tradingMode, sendMessage]); // ✅ sendMessage 의존성 추가

  return {
    isConnected,
    connectionStatus,
    sendSubscription,
    reconnect,
    disconnect,
    sendMessage,
  };
};
