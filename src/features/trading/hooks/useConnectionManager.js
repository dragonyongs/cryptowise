// src/features/trading/hooks/useConnectionManager.js
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
  }, []);

  const initializeConnection = useCallback(
    async (coinSymbols) => {
      try {
        await centralDataManager.initialize(coinSymbols);

        centralDataSubscription.current = centralDataManager.subscribe(
          "paperTrading",
          (data) => {
            return handleCentralDataUpdate(data);
          },
          ["prices", "markets"]
        );

        return true;
      } catch (error) {
        addLog(`연결 초기화 실패: ${error.message}`, "error");
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
