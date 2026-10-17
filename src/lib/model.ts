import type { NexusStatus } from "./nexus";
export type Mode = "objective" | "subjective" | "pit";
export type Match = {
  id: string;
  number: number;
  teams: number[];
  redTeams?: number[];
  blueTeams?: number[];
  label?: string;
  level?: string;
  setNumber?: number;
  time?: number | null;
  actualTime?: number | null;
  redScore?: number;
  blueScore?: number;
  redBreakdown?: Record<string, unknown>;
  blueBreakdown?: Record<string, unknown>;
  manual?: boolean;
};
export type EventData = {
  key: string;
  name: string;
  updatedAt: number;
  matches: Match[];
  teams: { number: number; name: string }[];
  webcasts: { type: string; channel: string; file?: string }[];
  officialOprs: Record<string, number>;
  warnings: string[];
};
export type Draft = {
  id: string;
  mode: Mode;
  matchId: string | null;
  team: number;
  values: Record<string, string | number>;
  eventKey?: string;
  ownerUid: string;
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
  eventKey: string;
  homeTeam: number;
  events: Record<string, EventData>;
  absent: Record<string, number[]>;
  language: string;
  nexus: Record<string, NexusStatus>;
  nexusKeys: Record<string, string>;
  preferredMatchId?: string;
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
  eventKey: "demo",
  homeTeam: 955,
  events: {},
  absent: {},
  language: "en",
  nexus: {},
  nexusKeys: {},
});

// Local suggestion only. Exclusive claims belong on the server.
export function suggestTeam(session: Session, match: Match, mode: Mode): number | null {
  if (match.teams.length !== 6 || match.teams.some((team) => !Number.isInteger(team) || team < 1))
    return null;
  const observed = new Set(
    session.reports
      .filter(
        (report) =>
          report.matchId === match.id &&
          report.mode === mode &&
          (report.eventKey ?? "demo") === session.eventKey,
      )
      .map((report) => report.team),
  );
  const offset = Array.from(session.scoutId + match.id).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const ordered = match.teams.map((_, index) => match.teams[(index + offset) % match.teams.length]);
  return ordered.find((team) => !observed.has(team)) ?? null;
}

export function submitDraft(session: Session, now = Date.now()): Session {
  if (!session.draft || !session.name.trim()) throw new Error("A scout name and draft are required.");
  const report = session.reports.find((report) => report.id === session.draft!.id) ?? {
    ...session.draft,
    scoutId: session.scoutId,
    scoutName: session.name.trim(),
    submittedAt: now,
  };
  return {
    ...session,
    draft: null,
    reports: [...session.reports.filter((item) => item.id !== report.id), report],
    outbox: [...new Set([...session.outbox, report.id])],
  };
}

export function applyEvent(session: Session, event: EventData): Session {
  const previous = session.events[session.eventKey] ?? {
    key: session.eventKey,
    name: session.eventKey === "demo" ? "Demo event" : session.eventKey,
    updatedAt: 0,
    matches: [],
    teams: [],
    webcasts: [],
    officialOprs: {},
    warnings: [],
  };
  const manual =
    session.eventKey === event.key
      ? session.schedule.filter(
          (match) => match.manual && !event.matches.some((item) => item.id === match.id),
        )
      : [];
  const next = { ...event, matches: [...event.matches, ...manual] };
  return {
    ...session,
    eventKey: event.key,
    schedule: next.matches,
    preferredMatchId: next.matches.some((match) => match.id === session.preferredMatchId)
      ? session.preferredMatchId
      : undefined,
    events: {
      ...session.events,
      [session.eventKey]: { ...previous, matches: session.schedule },
      [event.key]: next,
    },
  };
}
