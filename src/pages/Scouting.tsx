import { useEffect, useState } from "react";
import { ArrowRight, Check, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ReportForm, { type ValueUpdate } from "@/components/ReportForm";
import Todo from "@/components/Todo";
import { suggestTeam, submitDraft, type Mode, type Session } from "@/lib/model";
import { matchLabel, played } from "@/lib/tba";
import { languages } from "@/lib/translations";
import type { ChangeSession } from "@/lib/use-session";

export default function Scouting({
  session,
  change,
  saving,
  pit = false,
  user,
}: {
  session: Session;
  change: ChangeSession;
  saving: boolean;
  pit?: boolean;
  user: string;
}) {
  const [mode, setMode] = useState<Mode>("objective");
  const [matchId, setMatchId] = useState(
    session.preferredMatchId ??
      session.schedule.find((match) => !played(match))?.id ??
      session.schedule[0]?.id ??
      "",
  );
  const [team, setTeam] = useState("");
  const [override, setOverride] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [values, setValues] = useState(session.draft?.values ?? {});
  const draft = session.draft;
  useEffect(() => {
    setValues(draft?.values ?? {});
    setCancel(false);
  }, [draft?.id]);
  useEffect(() => {
    if (session.preferredMatchId) setMatchId(session.preferredMatchId);
  }, [session.preferredMatchId]);
  useEffect(() => {
    if (!session.schedule.some((match) => match.id === matchId))
      setMatchId(session.schedule[0]?.id ?? "");
    setOverride("");
  }, [session.eventKey, session.schedule, matchId]);

  function update(key: string, value: ValueUpdate) {
    setValues((current) => ({
      ...current,
      [key]: typeof value === "function" ? value(current[key] ?? "") : value,
    }));
    void change((current) =>
      current.draft?.id === draft?.id && current.draft
        ? {
            ...current,
            draft: {
              ...current.draft,
              values: {
                ...current.draft.values,
                [key]:
                  typeof value === "function"
                    ? value(current.draft.values[key] ?? "")
                    : value,
              },
            },
          }
        : current,
    );
  }
  function ready(selectedTeam = team) {
    setSubmitted(false);
    void change((current) => {
      if (current.draft) return current;
      const match = current.schedule.find((match) => match.id === matchId);
      const assigned = pit
        ? Number(selectedTeam)
        : override
          ? Number(override)
          : match
            ? suggestTeam(current, match, mode)
            : null;
      if (
        !current.name.trim() ||
        !assigned ||
        !Number.isInteger(assigned) ||
        assigned < 1
      )
        throw new Error("A scout name and valid team are required.");
      if (!pit && (!match || !match.teams.includes(assigned)))
        throw new Error("Choose a team from this match.");
      return {
        ...current,
        draft: {
          id: crypto.randomUUID(),
          mode: pit ? "pit" : mode,
          eventKey: current.eventKey,
          matchId: pit ? null : matchId,
          team: assigned,
          ownerUid: user,
          values: {},
        },
      };
    });
  }

  if (draft)
    return (
      <div className="space-y-5">
        <div className="scout-banner">
          <div>
            <p className="eyebrow">
              {draft.mode} ·{" "}
              {draft.matchId
                ? matchLabel(
                    session.schedule.find(
                      (match) => match.id === draft.matchId,
                    ) ?? {
                      id: draft.matchId,
                      number: 0,
                      teams: [],
                      label: draft.matchId,
                    },
                  )
                : "Pit interview"}
            </p>
            <h2>
              Scout Team <span>{draft.team}</span>
            </h2>
          </div>
          <span className="save-badge">
            <ShieldCheck size={16} />
            {saving ? "Saving…" : "Draft saved locally"}
          </span>
        </div>
        {(draft.eventKey ?? "demo") !== session.eventKey && (
          <p className="notice">
            This draft belongs to {draft.eventKey ?? "demo"}. Its event stays
            attached when saved.
          </p>
        )}
        <Card>
          <CardContent className="pt-6">
            {draft.mode === "pit" && (
              <label className="block mb-6 max-w-xs">
                Language
                <select
                  className="field mt-2"
                  value={session.language}
                  onChange={(event) => {
                    const language = event.target.value;
                    void change((current) => ({ ...current, language }));
                  }}
                >
                  {Object.entries(languages).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <ReportForm
              draft={{ ...draft, values }}
              update={update}
              language={session.language}
            />
            <div className="form-actions">
              <Button
                size="lg"
                disabled={saving}
                onClick={() => {
                  void change((current) => {
                    if (current.draft?.id !== draft.id)
                      throw new Error("This draft is no longer active.");
                    return submitDraft({
                      ...current,
                      draft: { ...current.draft, values },
                    });
                  }).then((saved) => {
                    if (saved) setSubmitted(true);
                  });
                }}
              >
                <Check />
                Save report for upload
              </Button>
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => {
                  if (cancel)
                    void change((current) =>
                      current.draft?.id === draft.id
                        ? { ...current, draft: null }
                        : current,
                    );
                  else setCancel(true);
                }}
              >
                <X />
                {cancel ? "Confirm discard draft" : "Discard draft"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );

  const match = session.schedule.find((match) => match.id === matchId);
  const suggested = match ? suggestTeam(session, match, mode) : null;
  const teams =
    session.events[session.eventKey]?.teams ??
    [...new Set(session.schedule.flatMap((match) => match.teams))].map(
      (number) => ({
        number,
        name: `Team ${number}`,
      }),
    );
  const scouted = new Set(
    session.reports
      .filter(
        (report) =>
          report.mode === "pit" &&
          (report.eventKey ?? "demo") === session.eventKey,
      )
      .map((report) => report.team),
  );
  return (
    <div className="space-y-5">
      {submitted && (
        <div role="status" className="notice">
          <Check size={18} />
          Report saved locally. Waiting for upload.
        </div>
      )}
      <div className="page-heading">
        <div>
          <h2>{pit ? "Pit scouting" : "Match scouting"}</h2>
          <p>
            {pit
              ? "Record capabilities and autos before the match."
              : "Choose a match and scouting mode."}
          </p>
        </div>
        <span className="pill">
          {session.offline ? "Offline collection" : "Local queue preview"}
        </span>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {pit ? "Start an interview" : "Your next assignment"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          
          {pit ? (
            <label className="block space-y-2 max-w-xs">
              Team number
              <Input
                type="number"
                min={1}
                value={team}
                onChange={(event) => setTeam(event.target.value)}
              />
            </label>
          ) : (
            <>
              <div className="segmented">
                {(["objective", "subjective"] as const).map((item) => (
                  <button
                    key={item}
                    aria-pressed={mode === item}
                    onClick={() => {
                      setMode(item);
                      setOverride("");
                    }}
                  >
                    {item === "objective"
                      ? "Objective · counts"
                      : "Subjective · observations"}
                  </button>
                ))}
              </div>
              <label className="block space-y-2 max-w-md">
                Match
                <select
                  className="field"
                  value={matchId}
                  onChange={(event) => setMatchId(event.target.value)}
                >
                  {session.schedule.map((match) => (
                    <option key={match.id} value={match.id}>
                      {matchLabel(match)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="assignment">
                <span>Suggested team</span>
                <strong>
                  {override
                    ? `Team ${override}`
                    : suggested
                      ? `Team ${suggested}`
                      : "No uncovered team"}
                </strong>
                <div className="alliance-line">
                  {match?.teams.map((number, index) => (
                    <span
                      key={`${index}-${number}`}
                      className={index < 3 ? "red-team" : "blue-team"}
                    >
                      {number}
                    </span>
                  ))}
                </div>
                <p>
                  Balanced using your scout ID and local coverage. Shared claims
                  are pending.
                </p>
              </div>
              <details className="text-sm text-muted-foreground">
                <summary>Manual fallback</summary>
                <label className="block mt-3">
                  Team for this match
                  <select
                    className="field mt-2"
                    value={override}
                    onChange={(event) => setOverride(event.target.value)}
                  >
                    <option value="">Use suggested team</option>
                    {match?.teams.map((number) => (
                      <option key={number}>{number}</option>
                    ))}
                  </select>
                </label>
              </details>
            </>
          )}
          <Button
            size="lg"
            disabled={
              saving ||
              (pit
                ? !/^\d+$/.test(team) || Number(team) < 1
                : !suggested && !override)
            }
            onClick={() => ready()}
          >
            {pit ? "Start pit scouting" : "Ready · claim team"}
            <ArrowRight />
          </Button>
        </CardContent>
      </Card>
      {pit ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Still to interview{" "}
              <span className="text-muted-foreground">
                {teams.length - scouted.size > 0
                  ? teams.filter((team) => !scouted.has(team.number)).length
                  : 0}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="team-grid">
              {teams
                .filter((team) => !scouted.has(team.number))
                .map((team) => (
                  <button
                    key={team.number}
                    disabled={saving || !session.name.trim()}
                    onClick={() => ready(String(team.number))}
                  >
                    <strong>{team.number}</strong>
                    <span>{team.name}</span>
                  </button>
                ))}
            </div>
            {!teams.length && (
              <p className="empty">
                Load an event in Lead desk to get its team list.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Todo title="Shared Ready queue">
          Server claims, lead overrides, and assignment delivery.
        </Todo>
      )}
    </div>
  );
}
