export type Mode = "objective" | "subjective" | "pit";
export type Match = { id: string; number: number; teams: number[] };
export type Draft = {
  id: string;
  mode: Mode;
  matchId: string | null;
  team: number;
  values: Record<string, string | number>;
};
export type Report = Draft & { scoutId: string; scoutName: string; submittedAt: number };
export type Session = {
  schemaVersion: 1;
  scoutId: string;
  name: string;
  offline: boolean;
  lastSync: number | null;
  schedule: Match[];
  draft: Draft | null;
  reports: Report[];
  outbox: string[];
};

export const initialSession = (): Session => ({
  schemaVersion: 1,
  scoutId: crypto.randomUUID(),
  name: "",
  offline: false,
  lastSync: null,
  schedule: [
    { id: "demo-qm1", number: 1, teams: [955, 749, 997, 2471, 1540, 2046] },
    { id: "demo-qm2", number: 2, teams: [1540, 955, 2046, 997, 2471, 749] },
    { id: "demo-qm3", number: 3, teams: [997, 2046, 749, 955, 1540, 2471] },
  ],
  draft: null,
  reports: [],
  outbox: [],
});

// Local suggestion only. Exclusive claims belong on the server.
export function suggestTeam(session: Session, match: Match, mode: Mode): number | null {
  const observed = new Set(session.reports
    .filter(report => report.matchId === match.id && report.mode === mode)
    .map(report => report.team));
  const offset = Array.from(session.scoutId + match.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const ordered = match.teams.map((_, index) => match.teams[(index + offset) % match.teams.length]);
  return ordered.find(team => !observed.has(team)) ?? null;
}

export function submitDraft(session: Session, now = Date.now()): Session {
  if (!session.draft || !session.name.trim()) throw new Error("A scout name and draft are required.");
  const report = { ...session.draft, scoutId: session.scoutId, scoutName: session.name.trim(), submittedAt: now };
  return {
    ...session,
    draft: null,
    reports: [...session.reports.filter(item => item.id !== report.id), report],
    outbox: [...new Set([...session.outbox, report.id])],
  };
}

export function teamStats(reports: Report[]) {
  const teams = [...new Set(reports.filter(report => report.mode === "objective").map(report => report.team))];
  return teams.map(team => {
    const entries = reports.filter(report => report.mode === "objective" && report.team === team);
    const average = (field: string) => entries.reduce((sum, report) => sum + Number(report.values[field] || 0), 0) / entries.length;
    return { team, reports: entries.length, auto: average("autoFuel"), teleop: average("teleopFuel") };
  }).sort((a, b) => b.auto + b.teleop - a.auto - a.teleop);
}
