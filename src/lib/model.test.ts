import { describe, expect, it } from "vitest";
import { summarizeTeams } from "./analytics";
import { initialSession, suggestTeam, submitDraft, type Session } from "./model";

const session = (): Session => ({
  ...initialSession(),
  schemaVersion: 1,
  scoutId: "scout-a",
  name: "Arin",
  offline: true,
  lastSync: null,
  schedule: [{ id: "qm1", number: 1, teams: [955, 749, 997, 2471, 1540, 2046] }],
  draft: {
    id: "report-1",
    mode: "objective",
    matchId: "qm1",
    team: 955,
    values: { autoFuel: 5, teleopFuel: 10 },
  },
  reports: [],
  outbox: [],
});

describe("local reports", () => {
  it("queues a stable report ID and clears the draft without claiming a server sync", () => {
    const saved = submitDraft(session(), 100);
    expect(saved.reports[0].id).toBe("report-1");
    expect(saved.outbox).toEqual(["report-1"]);
    expect(saved.draft).toBeNull();
    expect(saved.lastSync).toBeNull();
  });
  it("does not add a duplicate upload when the same draft is submitted again", () => {
    const original = session();
    const saved = submitDraft(original);
    const retried = submitDraft({ ...saved, draft: original.draft });
    expect(retried.reports).toHaveLength(1);
    expect(retried.outbox).toEqual(["report-1"]);
  });
  it("avoids locally covered teams, separately for each mode", () => {
    const current = session();
    const team = suggestTeam(current, current.schedule[0], "objective")!;
    const saved = submitDraft({ ...current, draft: { ...current.draft!, team } });
    expect(suggestTeam(saved, current.schedule[0], "objective")).not.toBe(team);
    expect(suggestTeam(saved, current.schedule[0], "subjective")).toBe(team);
  });
  it("calculates fuel averages using objective reports only", () => {
    const saved = submitDraft(session());
    expect(summarizeTeams([...saved.reports, { ...saved.reports[0], id: "pit-1", mode: "pit" }])).toEqual([
      expect.objectContaining({ team: 955, reports: 1, matches: 1, auto: 5, teleop: 10 }),
    ]);
  });
});
