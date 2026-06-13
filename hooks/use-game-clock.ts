import { useEffect, useRef, useState } from "react";

/**
 * Server-aligned clock (spec §7 step 2). Every reactive payload carries
 * `serverNow`; the FIRST time we see a given value we capture the offset
 * between server time and local time, then let `now()` advance with the local
 * clock.
 *
 * Calibration happens in an effect (not in render) so render stays pure.
 * Calibrating on *every* render would also re-freeze `now()`: recomputing
 * `serverNow - Date.now()` each tick makes `now() = Date.now() + offset` cancel
 * back to the (stale) `serverNow`, so the clock would only move when a new
 * payload arrived. Capturing once per new value keeps the countdown smooth.
 */
export function useGameClock(serverNow: number | undefined, tickMs = 250) {
  const offsetRef = useRef(0);

  useEffect(() => {
    if (serverNow !== undefined) {
      offsetRef.current = serverNow - Date.now();
    }
  }, [serverNow]);

  // Re-render on an interval so consumers re-read now() and the UI ticks.
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return {
    /** Current time on the server's clock (ms). */
    now: () => Date.now() + offsetRef.current,
  };
}
