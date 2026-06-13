import { useConvex } from "convex/react";
import { useEffect, useState } from "react";

/** True while the Convex websocket is connected; drives the reconnect Banner. */
export function useConnected(): boolean {
  const convex = useConvex();
  const [connected, setConnected] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setConnected(convex.connectionState().isWebSocketConnected);
    }, 2000);
    return () => clearInterval(id);
  }, [convex]);
  return connected;
}
