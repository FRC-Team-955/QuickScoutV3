// Adapted from V2's TBA client. Credentials stay in local configuration.
import type { EventData, Match } from "./model";

type TbaMatch = {
  key: string;
  match_number: number;
  set_number: number;
  comp_level: string;
  time: number | null;
  predicted_time: number | null;
  actual_time: number | null;
  alliances: { red: { team_keys: string[]; score: number }; blue: { team_keys: string[]; score: number } };
  score_breakdown?: { red: Record<string, unknown>; blue: Record<string, unknown> };
};
const levels: Record<string, string> = {
  qm: "Qual",
  ef: "Eighthfinal",
  qf: "Quarterfinal",
  sf: "Semifinal",
  f: "Final",
};
const order = ["qm", "ef", "qf", "sf", "f"];
export const matchLabel = (match: Match) => match.label ?? `Qual ${match.number}`;
export const played = (match: Match) => (match.redScore ?? -1) >= 0 && (match.blueScore ?? -1) >= 0;
export const teamNumber = (key: string) => Number(key.replace(/^frc/, ""));

export function normalizeMatches(matches: TbaMatch[]): Match[] {
  return matches
    .map((match) => ({
      id: match.key,
      number: match.match_number,
      setNumber: match.set_number,
      level: match.comp_level,
      label:
        match.comp_level === "qm"
          ? `Qual ${match.match_number}`
          : `${levels[match.comp_level] ?? match.comp_level} ${match.set_number} · ${match.match_number}`,
      teams: [...match.alliances.red.team_keys, ...match.alliances.blue.team_keys].map(teamNumber),
      redTeams: match.alliances.red.team_keys.map(teamNumber),
      blueTeams: match.alliances.blue.team_keys.map(teamNumber),
      redScore: match.alliances.red.score,
      blueScore: match.alliances.blue.score,
      time: match.predicted_time ?? match.time,
      actualTime: match.actual_time,
      redBreakdown: match.score_breakdown?.red,
      blueBreakdown: match.score_breakdown?.blue,
    }))
    .sort(
      (a, b) =>
        order.indexOf(a.level!) - order.indexOf(b.level!) ||
        a.setNumber! - b.setNumber! ||
        a.number - b.number,
    );
}

export async function fetchEvent(key: string, signal: AbortSignal): Promise<EventData> {
  const apiKey = import.meta.env.VITE_TBA_API_KEY;
  if (!apiKey) throw new Error("Set VITE_TBA_API_KEY in .env.local, then restart the dev server.");
  if (!/^\d{4}[a-z0-9]+$/.test(key)) throw new Error("Use a TBA event key, for example 2026joh.");
  async function get<T>(path: string): Promise<T> {
    const response = await fetch(`https://www.thebluealliance.com/api/v3/event/${key}${path}`, {
      headers: { "X-TBA-Auth-Key": apiKey },
      signal,
    });
    if (!response.ok) throw new Error(`TBA returned ${response.status}. Cached data is unchanged.`);
    return response.json() as Promise<T>;
  }
  const [event, rawMatches, teams, oprs] = await Promise.all([
    get<{ name: string; webcasts?: EventData["webcasts"] }>(""),
    get<TbaMatch[]>("/matches"),
    get<{ team_number: number; nickname?: string }[]>("/teams/simple"),
    get<{ oprs: Record<string, number> }>("/oprs").catch(() => null),
  ]);
  return {
    key,
    name: event.name,
    updatedAt: Date.now(),
    matches: normalizeMatches(rawMatches),
    teams: teams
      .map((team) => ({ number: team.team_number, name: team.nickname ?? `Team ${team.team_number}` }))
      .sort((a, b) => a.number - b.number),
    webcasts: event.webcasts ?? [],
    officialOprs: oprs?.oprs ?? {},
    warnings: oprs ? [] : ["Official OPR is unavailable."],
  };
}

// V2's webcast URL builder, with URL encoding for provider identifiers.
export function buildStreamUrl(webcast?: EventData["webcasts"][number]): string | null {
  if (!webcast) return null;
  if (webcast.type === "youtube")
    return `https://www.youtube.com/embed/${encodeURIComponent(webcast.channel)}`;
  if (webcast.type === "twitch")
    return `https://player.twitch.tv/?channel=${encodeURIComponent(webcast.channel)}&parent=${encodeURIComponent(window.location.hostname)}`;
  if (webcast.type === "livestream")
    return `https://livestream.com/events/${encodeURIComponent(webcast.file ?? webcast.channel)}`;
  return null;
}
