import type { Mode, Report, Session } from "./model";
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
function flatten(value: unknown, prefix = ""): Record<string, string | number> {
  const values: Record<string, string | number> = {};
  for (const [key, item] of Object.entries(record(value))) {
    const name = prefix ? `${prefix}.${key}` : key;
    if (typeof item === "string" || typeof item === "number") values[name] = item;
    else if (typeof item === "boolean") values[name] = item ? "Yes" : "No";
    else if (item && typeof item === "object") Object.assign(values, flatten(item, name));
  }
  return values;
}
function validate(report: unknown): Report {
  const r = record(report);
  if (
    typeof r.id !== "string" ||
    !r.id ||
    typeof r.scoutId !== "string" ||
    !r.scoutId ||
    typeof r.scoutName !== "string" ||
    !r.scoutName.trim() ||
    !["objective", "subjective", "pit"].includes(String(r.mode)) ||
    !Number.isInteger(r.team) ||
    Number(r.team) < 1 ||
    typeof r.submittedAt !== "number" ||
    !Number.isFinite(r.submittedAt) ||
    (r.matchId !== null && typeof r.matchId !== "string") ||
    !r.values ||
    typeof r.values !== "object" ||
    Array.isArray(r.values) ||
    (r.eventKey !== undefined && typeof r.eventKey !== "string")
  )
    throw new Error("Invalid report in backup. Nothing was imported.");
  if (
    Object.values(record(r.values)).some(
      (value) => typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value)),
    )
  )
    throw new Error("Unsupported report values. Nothing was imported.");
  return {
    id: r.id,
    scoutId: r.scoutId,
    scoutName: r.scoutName,
    mode: r.mode as Mode,
    team: Number(r.team),
    matchId: r.matchId as string | null,
    eventKey: r.eventKey as string | undefined,
    submittedAt: r.submittedAt,
    values: r.values as Report["values"],
  };
}

// Handles V2's mixed participant maps and dated pit records without its Firebase dependency.
export function parseReports(input: unknown, fallbackEvent: string): Report[] {
  const root = record(input);
  if (Array.isArray(root.reports)) return root.reports.map(validate);
  if (!root.matches && !root.subjectiveMatches && !root.pitScouting)
    throw new Error("Choose a V3 backup or V2 Firebase JSON export.");
  const reports: Report[] = [];
  for (const [collection, mode] of [
    ["matches", "objective"],
    ["subjectiveMatches", "subjective"],
  ] as const) {
    for (const [matchId, match] of Object.entries(record(root[collection]))) {
      for (const [id, entry] of Object.entries(record(record(match).participants ?? match))) {
        const row = record(entry);
        // Queue entries also live here in V2; only completed reports are imported.
        if (!row.teamNumber || !row.submittedAt || (!row.autonomous && !row.robotPerformance && !row.teleop))
          continue;
        const values = flatten(
          Object.fromEntries(
            Object.entries(row).filter(
              ([key]) =>
                !["teamNumber", "scoutName", "userId", "matchId", "submittedAt", "name"].includes(key),
            ),
          ),
        );
        if (mode === "objective") {
          Object.assign(values, {
            autoFuel: Number(record(row.autonomous).fuel ?? record(row.autonomous).score ?? 0),
            teleopFuel: Number(record(row.teleop).fuel ?? record(row.teleop).score ?? 0),
            autoClimb: String(record(row.autonomous).autoClimb ?? ""),
            climb: String(record(row.teleop).climbLevel ?? record(row.endGame).climbLevel ?? "None"),
            defense: String(record(row.teleop).defenseScore ?? ""),
            shootingOnMove: String(row.sotm ?? ""),
            tipped:
              typeof row.robotTipped === "boolean"
                ? row.robotTipped
                  ? "Yes"
                  : "No"
                : String(row.robotTipped ?? ""),
          });
        }
        const eventKey = matchId.match(/^(\d{4}[a-z0-9]+)_(?:qm|ef|qf|sf|f)/)?.[1] ?? fallbackEvent;
        reports.push(
          validate({
            id: `v2:${eventKey}:${collection}:${matchId}:${id}`,
            mode,
            eventKey,
            matchId,
            team: Number(row.teamNumber),
            scoutId: String(row.userId ?? id),
            scoutName: String(row.scoutName ?? "Unknown"),
            submittedAt: Number(row.submittedAt),
            values,
          }),
        );
      }
    }
  }
  for (const [date, dateValue] of Object.entries(record(root.pitScouting))) {
    for (const [team, teamValue] of Object.entries(record(dateValue))) {
      for (const [id, entry] of Object.entries(record(teamValue))) {
        const row = record(entry);
        const values = flatten(
          Object.fromEntries(
            Object.entries(row).filter(
              ([key]) => !["teamNumber", "scoutName", "scoutId", "submittedAt"].includes(key),
            ),
          ),
        );
        reports.push(
          validate({
            id: `v2:${fallbackEvent}:pit:${date}:${team}:${id}`,
            eventKey: fallbackEvent,
            mode: "pit",
            matchId: null,
            team: Number(row.teamNumber ?? team),
            scoutId: String(row.scoutId ?? id),
            scoutName: String(row.scoutName ?? "Unknown"),
            submittedAt: Number(row.submittedAt ?? 0),
            values,
          }),
        );
      }
    }
  }
  return reports;
}
function sameReport(a: Report, b: Report) {
  const canonical = (report: Report) =>
    JSON.stringify(
      Object.fromEntries(
        Object.entries({
          ...report,
          eventKey: report.eventKey ?? "demo",
          values: Object.fromEntries(Object.entries(report.values).sort(([a], [b]) => a.localeCompare(b))),
        }).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
  return canonical(a) === canonical(b);
}
export function mergeReports(session: Session, imported: Report[]): Session {
  const reports = new Map(session.reports.map((report) => [report.id, report]));
  for (const report of imported) {
    const existing = reports.get(report.id);
    if (existing && !sameReport(existing, report))
      throw new Error(`Conflicting report ID: ${report.id}. Nothing was imported.`);
    reports.set(report.id, report);
  }
  return { ...session, reports: [...reports.values()] };
}
export function download(name: string, text: string, type = "application/json") {
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([text], { type }));
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function reportCsv(reports: Report[]) {
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const headers = ["Report ID", "Event", "Mode", "Match", "Team", "Scout", "Submitted at", "Values JSON"];
  const rows = reports.map((report) => [
    report.id,
    report.eventKey ?? "demo",
    report.mode,
    report.matchId,
    report.team,
    report.scoutName,
    new Date(report.submittedAt).toISOString(),
    JSON.stringify(report.values),
  ]);
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\r\n");
}
