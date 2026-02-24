import { useState, useCallback, useRef, useEffect } from "react";
import RFB from "@novnc/novnc";

export type DesktopConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export function useDesktop(instanceId: number, enabled: boolean) {
  const [connectionState, setConnectionState] =
    useState<DesktopConnectionState>("disconnected");
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFB | null>(null);
  const [connectTrigger, setConnectTrigger] = useState(0);

  const connect = useCallback(() => {
    // Disconnect any existing session
    if (rfbRef.current) {
      try { rfbRef.current.disconnect(); } catch { /* ignore */ }
      rfbRef.current = null;
    }

    const container = containerRef.current;
    if (!container || !enabled) {
      setConnectionState("disconnected");
      return;
    }

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${proto}//${window.location.host}/api/v1/instances/${instanceId}/desktop/websockify`;

    setConnectionState("connecting");

    try {
      const rfb = new RFB(container, wsUrl);
      rfb.scaleViewport = true;
      rfb.resizeSession = false;
      rfb.background = "rgb(17, 24, 39)"; // gray-900

      rfb.addEventListener("connect", () => {
        setConnectionState("connected");
      });

      rfb.addEventListener("disconnect", (ev: Event) => {
        const detail = (ev as CustomEvent).detail;
        rfbRef.current = null;
        if (detail?.clean) {
          setConnectionState("disconnected");
        } else {
          setConnectionState("error");
        }
      });

      rfbRef.current = rfb;
    } catch {
      setConnectionState("error");
    }
  }, [instanceId, enabled]);

  // Connect when enabled changes or reconnect is triggered
  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      if (rfbRef.current) {
        try { rfbRef.current.disconnect(); } catch { /* ignore */ }
        rfbRef.current = null;
      }
      setConnectionState("disconnected");
    }

    return () => {
      if (rfbRef.current) {
        try { rfbRef.current.disconnect(); } catch { /* ignore */ }
        rfbRef.current = null;
      }
    };
  }, [enabled, connect, connectTrigger]);

  const reconnect = useCallback(() => {
    setConnectTrigger((n) => n + 1);
  }, []);

  const sendCtrlAltDel = useCallback(() => {
    rfbRef.current?.sendCtrlAltDel();
  }, []);

  return {
    connectionState,
    containerRef,
    reconnect,
    sendCtrlAltDel,
  };
}
