// src/hooks/useResilientWebSocket.js - 완전 수정 버전

import { useState, useEffect, useCallback } from "react";

/**
 * 싱글톤 WebSocket 훅 (업비트 등 실시간 피드에 적합)
 * - 같은 탭 내 여러 컴포넌트가 훅을 호출해도 단일 연결 유지
 * - 자동 재연결(지수형 backoff + 랜덤 jitter)
 * - heartbeat(연결 유지 체크)
 * - 메시지 브로드캐스트(로컬 리스너 집합)
 * - 스케줄 모드 지원으로 불필요한 연결 방지
 */

const GlobalWS = {
  ws: null,
  status: "disconnected",
  reconnectAttempts: 0,
  reconnectTimeout: null,
  connectionTimeout: null,
  heartbeatInterval: null,
  manuallyClosing: false,
  connectingLock: false,
  listeners: new Set(),
  forceDisabled: false, // ✅ 추가: 강제 비활성화 플래그
};

export const useResilientWebSocket = (url, options = {}) => {
  const {
    autoReconnect = true,
    maxReconnectAttempts = 10,
    reconnectInterval = 3000,
    maxReconnectInterval = 30000,
    onConnect,
    onDisconnect,
    onMessage,
    heartbeatMs = 30000,
  } = options;

  const [connectionStatus, setConnectionStatus] = useState(GlobalWS.status);
  const [reconnectAttempts, setReconnectAttempts] = useState(
    GlobalWS.reconnectAttempts
  );

  const setStatus = useCallback((s) => {
    GlobalWS.status = s;
    setConnectionStatus(s);
  }, []);

  const cleanupTimeouts = useCallback(() => {
    if (GlobalWS.reconnectTimeout) {
      clearTimeout(GlobalWS.reconnectTimeout);
      GlobalWS.reconnectTimeout = null;
    }

    if (GlobalWS.connectionTimeout) {
      clearTimeout(GlobalWS.connectionTimeout);
      GlobalWS.connectionTimeout = null;
    }
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (GlobalWS.heartbeatInterval) {
      clearInterval(GlobalWS.heartbeatInterval);
      GlobalWS.heartbeatInterval = null;
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    stopHeartbeat();

    GlobalWS.heartbeatInterval = setInterval(() => {
      const ready = GlobalWS.ws?.readyState;

      if (ready === WebSocket.OPEN) {
        // 연결 상태 양호
      } else if (ready === WebSocket.CLOSED && !GlobalWS.forceDisabled) {
        // 연결이 끊겼고 강제 비활성화가 아닌 경우
        console.warn("[WS] heartbeat 연결 끊김 감지");
      }
    }, heartbeatMs);
  }, [heartbeatMs, stopHeartbeat]);

  const addListener = useCallback((fn) => {
    if (typeof fn !== "function") return () => {};

    GlobalWS.listeners.add(fn);
    return () => GlobalWS.listeners.delete(fn);
  }, []);

  const broadcastMessage = useCallback((data) => {
    // ✅ 강제 비활성화 상태에서는 메시지 브로드캐스트 중단
    if (GlobalWS.forceDisabled) return;

    for (const fn of GlobalWS.listeners) {
      try {
        fn(data);
      } catch (err) {
        console.error("[WS] listener error", err);
      }
    }
  }, []);

  const connect = useCallback(() => {
    // ✅ 강제 비활성화 상태에서는 연결 시도 중단
    if (GlobalWS.forceDisabled) {
      console.log("[WS] 강제 비활성화 상태로 연결 시도 중단");
      return;
    }

    // 이미 연결 중이거나 연결됨
    if (
      GlobalWS.ws?.readyState === WebSocket.OPEN ||
      GlobalWS.ws?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    if (GlobalWS.connectingLock) {
      return;
    }

    GlobalWS.connectingLock = true;
    cleanupTimeouts();

    try {
      // 기존 소켓 정리
      if (GlobalWS.ws) {
        try {
          GlobalWS.ws.onopen = null;
          GlobalWS.ws.onmessage = null;
          GlobalWS.ws.onclose = null;
          GlobalWS.ws.onerror = null;

          if (
            GlobalWS.ws.readyState === WebSocket.OPEN ||
            GlobalWS.ws.readyState === WebSocket.CONNECTING
          ) {
            GlobalWS.ws.close(1000, "recreate");
          }
        } catch (e) {
          // 무시
        }
      }

      setStatus("connecting");
      GlobalWS.manuallyClosing = false;
      GlobalWS.ws = new WebSocket(url);
      GlobalWS.ws.binaryType = "arraybuffer";

      // 연결 타임아웃 (10초)
      GlobalWS.connectionTimeout = setTimeout(() => {
        if (GlobalWS.ws?.readyState === WebSocket.CONNECTING) {
          console.error("[WS] 연결 시간 초과");
          setStatus("error");

          try {
            GlobalWS.ws.close(4000, "connection_timeout");
          } catch (e) {
            // 무시
          }
        }
      }, 10000);

      GlobalWS.ws.onopen = () => {
        cleanupTimeouts();
        startHeartbeat();
        GlobalWS.reconnectAttempts = 0;
        setReconnectAttempts(0);
        setStatus("connected");
        GlobalWS.connectingLock = false;

        try {
          onConnect?.();
        } catch (e) {
          console.error("[WS] onConnect error", e);
        }
      };

      GlobalWS.ws.onmessage = async (event) => {
        // ✅ 강제 비활성화 상태에서는 메시지 처리 중단
        if (GlobalWS.forceDisabled) return;

        try {
          let data;

          if (event.data instanceof ArrayBuffer) {
            const dec = new TextDecoder("utf-8");
            data = JSON.parse(dec.decode(event.data));
          } else if (event.data instanceof Blob) {
            const ab = await event.data.arrayBuffer();
            const dec = new TextDecoder("utf-8");
            data = JSON.parse(dec.decode(ab));
          } else if (typeof event.data === "string") {
            data = JSON.parse(event.data);
          } else {
            console.warn("[WS] 알 수 없는 메시지 타입");
            return;
          }

          try {
            onMessage?.(data);
          } catch (e) {
            console.error("[WS] onMessage callback error", e);
          }

          broadcastMessage(data);
        } catch (err) {
          console.error("[WS] 메시지 파싱 오류", err);
        }
      };

      GlobalWS.ws.onerror = (err) => {
        console.error("[WS] socket error", err);
      };

      GlobalWS.ws.onclose = (event) => {
        cleanupTimeouts();
        stopHeartbeat();
        setStatus("disconnected");
        GlobalWS.connectingLock = false;

        try {
          onDisconnect?.(event);
        } catch (e) {
          console.error("[WS] onDisconnect error", e);
        }

        // ✅ 강제 비활성화 또는 수동 종료 시 재연결 안함
        if (GlobalWS.manuallyClosing || GlobalWS.forceDisabled) {
          return;
        }

        // 자동 재연결
        if (
          autoReconnect &&
          GlobalWS.reconnectAttempts < maxReconnectAttempts
        ) {
          const delay = Math.min(
            reconnectInterval * Math.pow(1.5, GlobalWS.reconnectAttempts) +
              Math.random() * 1000,
            maxReconnectInterval
          );

          GlobalWS.reconnectAttempts += 1;
          setReconnectAttempts(GlobalWS.reconnectAttempts);

          GlobalWS.reconnectTimeout = setTimeout(() => {
            if (GlobalWS.manuallyClosing || GlobalWS.forceDisabled) return;
            connect();
          }, delay);
        } else if (GlobalWS.reconnectAttempts >= maxReconnectAttempts) {
          console.error("[WS] 최대 재연결 횟수 초과");
          setStatus("error");
        }
      };
    } catch (error) {
      console.error("[WS] connect failed", error);
      cleanupTimeouts();
      setStatus("error");
      GlobalWS.connectingLock = false;
    }
  }, [
    url,
    autoReconnect,
    maxReconnectAttempts,
    reconnectInterval,
    maxReconnectInterval,
    onConnect,
    onDisconnect,
    onMessage,
    cleanupTimeouts,
    startHeartbeat,
    stopHeartbeat,
    broadcastMessage,
    setStatus,
  ]);

  // 메시지 전송
  const sendMessage = useCallback((payload) => {
    // ✅ 강제 비활성화 상태에서는 메시지 전송 중단
    if (GlobalWS.forceDisabled) {
      console.warn("[WS] sendMessage: 강제 비활성화 상태");
      return false;
    }

    if (!GlobalWS.ws) {
      console.warn("[WS] sendMessage: no socket");
      return false;
    }

    if (GlobalWS.ws.readyState !== WebSocket.OPEN) {
      console.warn("[WS] sendMessage: socket not open");
      return false;
    }

    try {
      const msg =
        typeof payload === "string" ? payload : JSON.stringify(payload);
      GlobalWS.ws.send(msg);
      return true;
    } catch (err) {
      console.error("[WS] sendMessage failed", err);
      return false;
    }
  }, []);

  // ✅ 강제 비활성화 함수 (스케줄 모드용)
  const forceDisable = useCallback(() => {
    console.log("[WS] 강제 비활성화 시작");
    GlobalWS.forceDisabled = true;

    cleanupTimeouts();
    stopHeartbeat();
    GlobalWS.manuallyClosing = true;
    GlobalWS.listeners.clear();

    try {
      if (GlobalWS.ws) {
        if (
          GlobalWS.ws.readyState === WebSocket.OPEN ||
          GlobalWS.ws.readyState === WebSocket.CONNECTING
        ) {
          GlobalWS.ws.close(1000, "force_disabled");
        }
      }
    } catch (e) {
      console.warn("[WS] forceDisable close error", e);
    } finally {
      GlobalWS.ws = null;
      GlobalWS.connectingLock = false;
      setStatus("disconnected");
      GlobalWS.reconnectAttempts = 0;
      setReconnectAttempts(0);
    }
  }, [cleanupTimeouts, stopHeartbeat, setStatus]);

  // ✅ 강제 비활성화 해제 함수
  const enableReconnect = useCallback(() => {
    console.log("[WS] 강제 비활성화 해제");
    GlobalWS.forceDisabled = false;
    GlobalWS.manuallyClosing = false;
  }, []);

  const disconnect = useCallback(() => {
    cleanupTimeouts();
    stopHeartbeat();
    GlobalWS.manuallyClosing = true;
    GlobalWS.listeners.clear();

    try {
      if (GlobalWS.ws) {
        if (
          GlobalWS.ws.readyState === WebSocket.OPEN ||
          GlobalWS.ws.readyState === WebSocket.CONNECTING
        ) {
          GlobalWS.ws.close(1000, "manual_disconnect");
        }
      }
    } catch (e) {
      console.warn("[WS] disconnect close error", e);
    } finally {
      GlobalWS.ws = null;
      GlobalWS.connectingLock = false;
      setStatus("disconnected");
      GlobalWS.reconnectAttempts = 0;
      setReconnectAttempts(0);
    }
  }, [cleanupTimeouts, stopHeartbeat, setStatus]);

  const reconnect = useCallback(() => {
    cleanupTimeouts();
    stopHeartbeat();
    GlobalWS.manuallyClosing = false;
    GlobalWS.forceDisabled = false; // ✅ 재연결 시 강제 비활성화 해제

    if (
      GlobalWS.ws &&
      (GlobalWS.ws.readyState === WebSocket.OPEN ||
        GlobalWS.ws.readyState === WebSocket.CONNECTING)
    ) {
      try {
        GlobalWS.ws.close(1012, "force_reconnect");
      } catch (e) {
        // 무시
      }
    }

    GlobalWS.ws = null;
    GlobalWS.reconnectAttempts = 0;
    setReconnectAttempts(0);
    setStatus("connecting");

    setTimeout(() => connect(), 300);
  }, [cleanupTimeouts, stopHeartbeat, connect, setStatus]);

  useEffect(() => {
    // ✅ 강제 비활성화 상태가 아닐 때만 연결 시도
    if (
      !GlobalWS.forceDisabled &&
      (!GlobalWS.ws || GlobalWS.ws.readyState === WebSocket.CLOSED)
    ) {
      connect();
    } else {
      setStatus(
        GlobalWS.ws?.readyState === WebSocket.OPEN ? "connected" : "connecting"
      );
      setReconnectAttempts(GlobalWS.reconnectAttempts);
    }

    return () => {
      // 훅 언마운트 시 리스너만 제거(전역 연결 유지)
    };
  }, [connect]);

  return {
    connectionStatus,
    reconnectAttempts,
    reconnect,
    disconnect,
    forceDisable, // ✅ 추가
    enableReconnect, // ✅ 추가
    isConnected: connectionStatus === "connected" && !GlobalWS.forceDisabled,
    sendMessage,
    addListener,
  };
};
