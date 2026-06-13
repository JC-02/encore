import { useEffect, useState } from "react";
import { getSessionId } from "../lib/session";

/** The persisted anonymous session id; null until loaded from storage. */
export function useSessionId(): string | null {
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    getSessionId().then((id) => mounted && setSessionId(id));
    return () => {
      mounted = false;
    };
  }, []);
  return sessionId;
}
