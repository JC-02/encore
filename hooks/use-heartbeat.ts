import { useMutation } from "convex/react";
import { useEffect } from "react";
import { api } from "../convex/_generated/api";
import { HEARTBEAT_INTERVAL_MS } from "../lib/constants";

/** Presence ping while on the lobby/game screens (spec §5 heartbeat). */
export function useHeartbeat(code: string | undefined, sessionId: string | null) {
  const heartbeat = useMutation(api.lobbies.heartbeat);
  useEffect(() => {
    if (!code || !sessionId) return;
    const send = () => heartbeat({ code, sessionId }).catch(() => {});
    send();
    const id = setInterval(send, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(id);
  }, [code, sessionId, heartbeat]);
}
