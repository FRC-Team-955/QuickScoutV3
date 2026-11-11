import type { Report, Session } from "./model";

// Keep local records absent from the response; pending local edits take priority.
export function mergeDownloadedReports(session: Session, downloaded: Report[]): Session {
  const pending = new Set(session.outbox);
  const reports = new Map(session.reports.map((report) => [report.id, report]));
  for (const report of downloaded) {
    if (!pending.has(report.id)) reports.set(report.id, report);
  }
  return { ...session, reports: [...reports.values()] };
}

// A timed-out write may still reach Firebase. Keep it queued for an identical retry.
export async function withTimeout<T>(request: Promise<T>, milliseconds = 12000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Firebase did not respond. Reports remain saved locally; retry when connected.")), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
