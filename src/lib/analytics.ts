import type { Report } from "./model";
export const eventReports = (reports: Report[], eventKey: string) =>
  reports.filter((report) => eventKey === "all" || (report.eventKey ?? "demo") === eventKey);
export const isYes = (value: unknown) => /^(yes|true)$/i.test(String(value));
export const climbLevel = (value: unknown) => Number(String(value ?? "").match(/[1-3]/)?.[0] ?? 0);
export function defenseValue(value: unknown) {
  const scores: Record<string, number> = { None: 0, Poor: 1, Fair: 2, Good: 3, Excellent: 4 };
  return scores[String(value)] ?? Number(String(value ?? "").match(/^[0-4]/)?.[0] ?? 0);
}
export function overlapKey(report: Report) {
  return `${report.eventKey ?? "demo"}:${report.mode}:${report.matchId ?? "pit"}:${report.team}`;
}
export function overlappingReports(reports: Report[]) {
  const counts = new Map<string, number>();
  reports
    .filter((report) => report.mode !== "pit")
    .forEach((report) => counts.set(overlapKey(report), (counts.get(overlapKey(report)) ?? 0) + 1));
  return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
}

export function summarizeTeams(reports: Report[]) {
  const objective = reports.filter((report) => report.mode === "objective");
  const teams = [...new Set(reports.map((report) => report.team))];
  return teams
    .map((team) => {
      const entries = objective.filter((report) => report.team === team);
      const groups = new Map<string, Report[]>();
      entries.forEach((report) =>
        groups.set(overlapKey(report), [...(groups.get(overlapKey(report)) ?? []), report]),
      );
      const matches = [...groups.values()];
      // Each match gets equal weight; multiple observers of a match are averaged first.
      const average = (get: (report: Report) => number) =>
        matches.length
          ? matches.reduce(
              (sum, group) => sum + group.reduce((sum, report) => sum + get(report), 0) / group.length,
              0,
            ) / matches.length
          : 0;
      const auto = average((report) => Number(report.values.autoFuel ?? 0));
      const teleop = average((report) => Number(report.values.teleopFuel ?? 0));
      return {
        team,
        auto,
        teleop,
        total: auto + teleop,
        matches: matches.length,
        reports: entries.length,
        climb: average((report) => climbLevel(report.values.climb)),
        climbRate: average((report) => Number(climbLevel(report.values.climb) > 0)) * 100,
        defense: average((report) => defenseValue(report.values.defense)),
        tippedRate: average((report) => Number(isYes(report.values.tipped))) * 100,
        deadRate: average((report) => Number(isYes(report.values.dead))) * 100,
        pit: reports.filter((report) => report.team === team && report.mode === "pit").length,
        subjective: reports.filter((report) => report.team === team && report.mode === "subjective").length,
      };
    })
    .sort((a, b) => b.total - a.total || a.team - b.team);
}
export function scoutRankings(reports: Report[]) {
  const scouts = new Map<
    string,
    { id: string; name: string; objective: number; subjective: number; pit: number; last: number }
  >();
  reports.forEach((report) => {
    const row = scouts.get(report.scoutId) ?? {
      id: report.scoutId,
      name: report.scoutName,
      objective: 0,
      subjective: 0,
      pit: 0,
      last: 0,
    };
    row[report.mode]++;
    if (report.submittedAt >= row.last) {
      row.last = report.submittedAt;
      row.name = report.scoutName;
    }
    scouts.set(report.scoutId, row);
  });
  return [...scouts.values()]
    .map((row) => ({ ...row, total: row.objective + row.subjective + row.pit }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}
