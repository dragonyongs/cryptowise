// src/features/trading/hooks/useConnectionManager.js - 수정된 버전

import { useState, useCallback, useRef } from "react";
import { upbitWebSocketService } from "../../../services/upbit/upbitWebSocket.js";
import { centralDataManager } from "../../../services/data/centralDataManager.js";

export const useConnectionManager = (addLog, updateStats) => {
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const centralDataSubscription = useRef(null);
  const subscriptionIdRef = useRef(null);

  const handleCentralDataUpdate = useCallback(
    (data) => {
      try {
        if (data.prices) {
          const dataMap = new Map();
          Object.entries(data.prices).forEach(([symbol, priceEntry]) => {
            if (priceEntry && priceEntry.data) {
              dataMap.set(symbol, priceEntry.data);
            }
          });

          updateStats((prev) => ({
            ...prev,
            dataReceived: prev.dataReceived + dataMap.size,
            lastActivity: new Date().toLocaleTimeString(),
          }));

          setConnectionStatus("connected");
          addLog(`📊 실시간 데이터 수신: ${dataMap.size}개 코인`, "debug");
          return dataMap;
        }
      } catch (error) {
        addLog(`중앙 데이터 처리 실패: ${error.message}`, "error");
        setConnectionStatus("error");
      }
    },
    [addLog, updateStats]
  );

  const cleanup = useCallback(() => {
    if (subscriptionIdRef.current) {
      upbitWebSocketService.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;
    }

    if (centralDataSubscription.current) {
      centralDataSubscription.current();
      centralDataSubscription.current = null;
    }

    setConnectionStatus("disconnected");
    addLog("🔌 연결 매니저 정리 완료", "info");
  }, [addLog]);

  const initializeConnection = useCallback(
    async (coinSymbols) => {
      try {
        addLog(`🔗 연결 초기화: ${coinSymbols.length}개 코인`, "info");

        // ✅ 중앙 데이터 매니저가 이미 초기화되어 있다고 가정
        // 데이터 구독 시작
        centralDataSubscription.current = centralDataManager.subscribe(
          "paperTrading",
          (data) => {
            return handleCentralDataUpdate(data);
          },
          ["prices", "markets"]
        );

        // 감시 코인들을 중앙 매니저에 추가
        for (const symbol of coinSymbols) {
          centralDataManager.addWatchedSymbol(symbol);
        }

        setConnectionStatus("connected");
        addLog(
          `✅ 연결 초기화 완료: ${coinSymbols.length}개 코인 구독`,
          "success"
        );

        return true;
      } catch (error) {
        addLog(`❌ 연결 초기화 실패: ${error.message}`, "error");
        setConnectionStatus("error");
        return false;
      }
    },
    [addLog, handleCentralDataUpdate]
  );

  return {
    connectionStatus,
    handleCentralDataUpdate,
    cleanup,
    initializeConnection,
    centralDataSubscription,
    subscriptionIdRef,
  };
};
