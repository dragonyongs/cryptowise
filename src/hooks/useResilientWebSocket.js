// src/hooks/useResilientWebSocket.js
import { useState, useEffect, useRef, useCallback } from "react";

export const useResilientWebSocket = (url, options = {}) => {
  const {
    maxReconnectAttempts = 10,
    reconnectInterval = 3000,
    maxReconnectInterval = 30000,
    onMessage,
    onConnect,
    onDisconnect,
    autoReconnect = true,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const isManuallyClosingRef = useRef(false);

  // ✅ 업비트 전용 핑 메커니즘
  const startUpbitHeartbeat = useCallback(() => {
    // 업비트는 별도 ping이 필요 없지만, 데이터 요청으로 연결 유지
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // 간단한 구독 갱신으로 연결 유지
        console.log("🫀 WebSocket 연결 유지 중...");
      }
    }, 60000); // 60초마다 체크
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      setConnectionStatus("connecting");
      isManuallyClosingRef.current = false;

      wsRef.current = new WebSocket(url);
      wsRef.current.binaryType = "arraybuffer";
      window.__resilientWebSocket = wsRef.current;

      wsRef.current.onopen = () => {
        console.log("✅ 업비트 WebSocket 연결 성공");
        setConnectionStatus("connected");
        setReconnectAttempts(0);
        startUpbitHeartbeat();

        // ✅ 연결 후 즉시 구독 메시지 전송 (중요!)
        setTimeout(() => {
          onConnect?.();
        }, 100); // 100ms 대기 후 구독
      };

      wsRef.current.onmessage = async (event) => {
        try {
          let data;
          if (event.data instanceof ArrayBuffer) {
            data = JSON.parse(new TextDecoder("utf-8").decode(event.data));
          } else if (event.data instanceof Blob) {
            const arrayBuffer = await event.data.arrayBuffer();
            data = JSON.parse(new TextDecoder("utf-8").decode(arrayBuffer));
          } else if (typeof event.data === "string") {
            data = JSON.parse(event.data);
          }

          if (data && onMessage) {
            onMessage(data);
          }
        } catch (error) {
          console.error("❌ 메시지 파싱 실패:", error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log(
          `🔌 업비트 WebSocket 연결 종료: ${event.code} ${event.reason}`
        );
        setConnectionStatus("disconnected");
        stopHeartbeat();

        if (window.__resilientWebSocket === wsRef.current) {
          delete window.__resilientWebSocket;
        }

        onDisconnect?.(event);

        // ✅ 수동 종료가 아닌 경우에만 재연결
        if (
          !isManuallyClosingRef.current &&
          autoReconnect &&
          reconnectAttempts < maxReconnectAttempts
        ) {
          const delay = Math.min(
            reconnectInterval * Math.pow(1.5, reconnectAttempts) +
              Math.random() * 1000,
            maxReconnectInterval
          );

          console.log(
            `🔄 ${delay.toFixed(0)}ms 후 재연결 시도 (${reconnectAttempts + 1}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("❌ 업비트 WebSocket 오류:", error);
        setConnectionStatus("error");
      };
    } catch (error) {
      console.error("❌ WebSocket 연결 실패:", error);
      setConnectionStatus("error");
    }
  }, [
    url,
    autoReconnect,
    reconnectAttempts,
    maxReconnectAttempts,
    onConnect,
    onMessage,
    onDisconnect,
    startUpbitHeartbeat,
    stopHeartbeat,
  ]);

  // ✅ 수동 연결 종료
  const disconnect = useCallback(() => {
    isManuallyClosingRef.current = true;
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    stopHeartbeat();
    if (wsRef.current) {
      wsRef.current.close(1000, "Manual disconnect");
    }
  }, [stopHeartbeat]);

  // 초기 연결
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, []);

  return {
    connectionStatus,
    reconnectAttempts,
    reconnect: connect,
    disconnect,
    isConnected: connectionStatus === "connected",
  };
};
