import { describe, expect, it, vi, afterEach } from "vitest";
import {
  applyEvent,
  initialSession,
  submitDraft,
  suggestTeam,
  type EventData,
  type Report,
  type Match,
} from "./model";
import { mergeReports, parseReports, reportCsv } from "./transfer";
import { eventReports, overlappingReports, scoutRankings, summarizeTeams } from "./analytics";
import { calculateOpr } from "./opr";
import { fetchEvent, normalizeMatches } from "./tba";
import { fetchNexus, formatCountdown } from "./nexus";
const report = (overrides: Partial<Report> = {}): Report => ({
  id: "one",
  mode: "objective",
  scoutId: "a",
  scoutName: "Scout A",
  eventKey: "2026joh",
  matchId: "2026joh_qm1",
  team: 955,
  submittedAt: 100,
  values: { autoFuel: 10, teleopFuel: 20, climb: "L2", defense: "Good" },
  ...overrides,
});
const match = (id: string, teams: number[], redScore: number, blueScore: number): Match => ({
  id,
  number: 1,
  teams,
  redScore,
  blueScore,
});
const event: EventData = {
  key: "2026joh",
  name: "Johnson",
  updatedAt: 100,
  matches: [match("2026joh_qm1", [1, 2, 3, 4, 5, 6], 30, 60)],
  teams: [],
  webcasts: [],
  officialOprs: {},
  warnings: [],
};
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("report transfer", () => {
  it("round-trips backups without overwriting IDs or changing the pending queue", () => {
    const session = { ...initialSession(), reports: [report()], outbox: ["one"] };
    const parsed = parseReports(JSON.parse(JSON.stringify({ reports: session.reports })), "demo");
    expect(mergeReports(session, parsed).reports).toHaveLength(1);
    const merged = mergeReports(session, [report({ id: "two", scoutId: "b" })]);
    expect(merged.reports).toHaveLength(2);
    expect(merged.outbox).toEqual(["one"]);
  });
  it("rejects conflicting IDs and invalid values before importing anything", () => {
    const session = { ...initialSession(), reports: [report()] };
    expect(() =>
      mergeReports(session, [report({ id: "two" }), report({ values: { autoFuel: 999 } })]),
    ).toThrow("Conflicting report ID");
    expect(session.reports).toHaveLength(1);
    expect(() => parseReports({ reports: [{ ...report(), values: { nested: {} } }] }, "demo")).toThrow();
  });
  it("imports V2 objective, subjective, and nested pit data while skipping queue placeholders", () => {
    const backup = {
      matches: {
        "2026joh_qm1": {
          participants: {
            queued: { teamNumber: 955 },
            uid: {
              teamNumber: "955",
              submittedAt: 100,
              scoutName: "A",
              autonomous: { fuel: 12 },
              teleop: { fuel: 30, climbLevel: "L2", defenseScore: "3" },
            },
          },
        },
      },
      subjectiveMatches: {
        qm2: {
          participants: {
            uid: {
              teamNumber: 749,
              submittedAt: 200,
              robotPerformance: { autonomousEffectiveness: "Excellent" },
            },
          },
        },
      },
      pitScouting: {
        "2026-04-01": {
          "955": { uid: { teamNumber: 955, submittedAt: 300, auto1: { "estimated-fuel": "20" } } },
        },
      },
    };
    const imported = parseReports(backup, "2026joh");
    expect(imported.map((report) => report.mode)).toEqual(["objective", "subjective", "pit"]);
    expect(imported[0].values.autoFuel).toBe(12);
    expect(imported[0].values.climb).toBe("L2");
    expect(imported[2].values["auto1.estimated-fuel"]).toBe("20");
    expect(parseReports(backup, "2026joh").map((report) => report.id)).toEqual(
      imported.map((report) => report.id),
    );
  });
  it("quotes commas, quotes, and newlines in CSV exports", () => {
    const csv = reportCsv([report({ scoutName: 'A, "B"\nC' })]);
    expect(csv).toContain('"A, ""B""\nC"');
    expect(csv).toContain("Values JSON");
  });
});
describe("scouting statistics", () => {
  it("averages observers within each match before averaging matches", () => {
    const reports = [
      report(),
      report({ id: "two", values: { autoFuel: 20, teleopFuel: 40 } }),
      report({ id: "three", matchId: "2026joh_qm2", values: { autoFuel: 30, teleopFuel: 60 } }),
    ];
    const stats = summarizeTeams(reports)[0];
    expect(stats.matches).toBe(2);
    expect(stats.auto).toBe(22.5);
    expect(stats.teleop).toBe(45);
    expect(overlappingReports(reports).size).toBe(1);
  });
  it("filters events and keeps two scouts with identical display names separate", () => {
    const reports = [report(), report({ id: "two", scoutId: "b", eventKey: "demo" })];
    expect(eventReports(reports, "2026joh")).toHaveLength(1);
    expect(scoutRankings(reports)).toHaveLength(2);
    expect(summarizeTeams([report({ mode: "pit" })])[0].matches).toBe(0);
  });
  it("retains a report timestamp when the same saved draft is retried", () => {
    const session = {
      ...initialSession(),
      name: "A",
      draft: { id: "one", mode: "objective" as const, matchId: "qm1", team: 955, values: {} },
    };
    const saved = submitDraft(session, 100);
    expect(submitDraft({ ...saved, draft: session.draft }, 200).reports[0].submittedAt).toBe(100);
  });
});
describe("event cache and ratings", () => {
  it("does not assign scouts to incomplete playoff alliances", () => {
    expect(suggestTeam(initialSession(), match("f1", [1, 2, 3], -1, -1), "objective")).toBeNull();
  });
  it("accepts documented Nexus snapshots and handles millisecond queue times", async () => {
    vi.stubEnv("VITE_NEXUS_API_KEY", "test-key");
    const snapshot = {
      eventKey: "demo1234",
      dataAsOfTime: 1716591216610,
      nowQueuing: "Practice 4",
      matches: [
        {
          label: "Practice 4",
          status: "Now queuing",
          redTeams: ["955"],
          blueTeams: ["749"],
          times: { estimatedQueueTime: 1716591742580 },
        },
      ],
    };
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => snapshot });
    vi.stubGlobal("fetch", fetch);
    expect(await fetchNexus("demo1234", new AbortController().signal)).toEqual(snapshot);
    expect(fetch.mock.calls[0][0]).toBe("https://frc.nexus/api/v1/event/demo1234");
    expect(formatCountdown(1716591742580, 1716591682580)).toBe("1m 0s");
  });
  it("preserves the previous schedule and active draft when changing events", () => {
    const session = {
      ...initialSession(),
      preferredMatchId: "demo-qm1",
      draft: { id: "d", mode: "pit" as const, team: 955, matchId: null, eventKey: "demo", values: {} },
    };
    const next = applyEvent(session, event);
    expect(next.events.demo.matches).toEqual(session.schedule);
    expect(next.draft?.eventKey).toBe("demo");
    expect(next.preferredMatchId).toBeUndefined();
    const back = applyEvent(next, next.events.demo);
    expect(back.schedule).toEqual(session.schedule);
  });
  it("keeps manually added matches during a refresh of the same event", () => {
    const manual = { id: "2026joh_qm99", number: 99, teams: [1, 2, 3, 4, 5, 6], manual: true };
    const session = { ...initialSession(), eventKey: event.key, schedule: [...event.matches, manual] };
    expect(applyEvent(session, event).schedule).toHaveLength(2);
  });
  it("calculates a finite equal split for a singular early schedule, adjusting for absent robots", () => {
    const matches = [match("m", [1, 2, 3, 4, 5, 6], 30, 60), match("unplayed", [1, 2, 3, 4, 5, 6], -1, -1)];
    const rows = calculateOpr(matches, {});
    expect(rows.find((row) => row.team === 1)!.opr).toBeCloseTo(10, 3);
    expect(rows.find((row) => row.team === 4)!.opr).toBeCloseTo(20, 3);
    const absent = calculateOpr(matches, { m: [1] });
    expect(absent.find((row) => row.team === 1)!.opr).toBeCloseTo(0);
    expect(absent.find((row) => row.team === 2)!.opr).toBeCloseTo(15, 3);
  });
  it("sorts qualifications numerically and gives playoff matches distinct labels", () => {
    const raw = (key: string, number: number, level: string) => ({
      key,
      match_number: number,
      set_number: 1,
      comp_level: level,
      time: null,
      predicted_time: null,
      actual_time: null,
      alliances: {
        red: { team_keys: ["frc1", "frc2", "frc3"], score: -1 },
        blue: { team_keys: ["frc4", "frc5", "frc6"], score: -1 },
      },
    });
    const matches = normalizeMatches([raw("f1m2", 2, "f"), raw("qm10", 10, "qm"), raw("qm2", 2, "qm")]);
    expect(matches.map((match) => match.id)).toEqual(["qm2", "qm10", "f1m2"]);
    expect(matches[2].label).toBe("Final 1 · 2");
  });
  it("reports a failed TBA request without producing a replacement cache", async () => {
    vi.stubEnv("VITE_TBA_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(fetchEvent("2026joh", new AbortController().signal)).rejects.toThrow(
      "Cached data is unchanged",
    );
  });
});
