import { useEffect, useRef, useState } from "react";
import { fetchEvent } from "./tba";
import { applyEvent, type Session } from "./model";
import type { ChangeSession } from "./use-session";

export function useEvent(session: Session | null, change: ChangeSession, network: boolean) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    request.current?.abort();
    setLoading(false);
    setError("");
    return () => request.current?.abort();
  }, [session?.eventKey, session?.offline, network]);

  async function refresh(key = session?.eventKey) {
    if (!session || !key || session.offline || !network || loading) return false;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const event = await fetchEvent(key, controller.signal);
      if (controller.signal.aborted) return false;
      return await change((current) => {
        if (current.offline || controller.signal.aborted) throw new Error("Refresh stopped before saving.");
        return applyEvent(current, event);
      });
    } catch (error) {
      if (request.current === controller)
        setError(
          controller.signal.aborted
            ? "Refresh stopped. Cached data is still available."
            : String(error instanceof Error ? error.message : error),
        );
      return false;
    } finally {
      clearTimeout(timer);
      if (request.current === controller) setLoading(false);
    }
  }
  return { event: session?.events[session.eventKey], refresh, loading, error };
}
export type EventSource = ReturnType<typeof useEvent>;
