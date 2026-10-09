import { useEffect, useRef, useState } from "react";
import { changeSession } from "./storage";
import type { Session } from "./model";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const writes = useRef(0);

  useEffect(() => {
    changeSession(current => current).then(setSession).catch(error => setError(String(error)));
  }, []);

  async function change(update: (current: Session) => Session) {
    writes.current++;
    setSaving(true);
    try {
      setSession(await changeSession(update));
      setError("");
      return true;
    } catch (error) {
      setError(`Not saved: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      writes.current--;
      setSaving(writes.current > 0);
    }
  }

  return { session, change, error, saving };
}

export type ChangeSession = ReturnType<typeof useSession>["change"];
