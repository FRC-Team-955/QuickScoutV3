import { useState } from "react";
import { Check, CloudDownload, Upload, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Todo from "@/components/Todo";
import { eventReports } from "@/lib/analytics";
import { matchLabel } from "@/lib/tba";
import { mergeReports, parseReports } from "@/lib/transfer";
import { applyEvent, type Session } from "@/lib/model";
import type { ChangeSession } from "@/lib/use-session";
import type { EventSource } from "@/lib/use-event";

export default function Lead({
  session,
  change,
  source,
  network,
  saving,
}: {
  session: Session;
  change: ChangeSession;
  source: EventSource;
  network: boolean;
  saving: boolean;
}) {
  const [eventKey, setEventKey] = useState(session.eventKey === "demo" ? "2026joh" : session.eventKey);
  const [teams, setTeams] = useState("955, 749, 997, 2471, 1540, 2046");
  const [matchNumber, setMatchNumber] = useState("4");
  const [message, setMessage] = useState("");
  const numbers = teams
    .split(/[,\s]+/)
    .filter(Boolean)
    .map(Number);
  const valid =
    /^\d+$/.test(matchNumber) &&
    Number(matchNumber) > 0 &&
    numbers.length === 6 &&
    numbers.every((number) => Number.isInteger(number) && number > 0) &&
    new Set(numbers).size === 6;
  const reports = eventReports(session.reports, session.eventKey);
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error("Choose a JSON file smaller than 8 MB.");
      const reports = parseReports(JSON.parse(await file.text()), session.eventKey);
      const saved = await change((current) => mergeReports(current, reports));
      if (saved)
        setMessage(
          `Processed ${reports.length} reports. Existing IDs were kept; imported reports are not added to the upload queue.`,
        );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h2>Lead desk</h2>
          <p>Event setup, local queue, coverage, and data transfer.</p>
        </div>
        <span className="pill">Local controls · permissions TODO</span>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <CloudDownload size={19} />
              Event data
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2">
              TBA event key
              <Input
                value={eventKey}
                placeholder="2026joh"
                onChange={(event) => setEventKey(event.target.value.toLowerCase().trim())}
              />
            </label>
            <Button
              disabled={
                source.loading || saving || session.offline || !network || !/^\d{4}[a-z0-9]+$/.test(eventKey)
              }
              onClick={() => void source.refresh(eventKey)}
            >
              {source.loading ? "Loading event…" : "Load event from TBA"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Matches, teams, results, stream information, and official OPR are cached on this device.
            </p>
            {source.error && (
              <p className="text-amber-300" role="alert">
                {source.error}
              </p>
            )}
            <label className="block space-y-2">
              Use cached event
              <select
                className="field"
                value={session.eventKey}
                onChange={(event) => {
                  const key = event.target.value;
                  void change((current) =>
                    current.events[key] ? applyEvent(current, current.events[key]) : current,
                  );
                }}
              >
                {[...new Set([session.eventKey, ...Object.keys(session.events)])].map((key) => (
                  <option key={key} value={key}>
                    {session.events[key]?.name ?? key}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-2">
              Your team
              <Input
                type="number"
                min={1}
                defaultValue={session.homeTeam}
                onBlur={(event) => {
                  const homeTeam = Number(event.target.value);
                  if (Number.isInteger(homeTeam) && homeTeam > 0)
                    void change((current) => ({ ...current, homeTeam }));
                }}
              />
            </label>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <Radio size={19} />
              Collection mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={`mode-panel ${session.offline ? "offline" : ""}`}>
              <span className="status-dot" />
              <strong>{session.offline ? "Offline collection" : "Online collection"}</strong>
              <p>
                {session.offline
                  ? "Save locally. API refreshes and streams stay paused."
                  : "API refreshes available. Firebase upload remains TODO."}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => void change((current) => ({ ...current, offline: !current.offline }))}
            >
              {session.offline ? "Return to online collection" : "Switch to offline collection"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Prototype changes apply to this device. Use the same choice on other scouts' devices until
              event-wide delivery is implemented.
            </p>
            <Todo title="Event-wide offline switch">
              Publish the lead's decision and apply it when each scout reconnects.
            </Todo>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Local match queue & coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block max-w-md space-y-2">
            Default Ready match
            <select
              className="field"
              value={session.preferredMatchId ?? ""}
              onChange={(event) => {
                const preferredMatchId = event.target.value || undefined;
                void change((current) => ({ ...current, preferredMatchId }));
              }}
            >
              <option value="">First upcoming match</option>
              {session.schedule.map((match) => (
                <option key={match.id} value={match.id}>
                  {matchLabel(match)}
                </option>
              ))}
            </select>
          </label>
          <div className="queue-list">
            {session.schedule.map((match) => (
              <div
                key={match.id}
                className={`queue-row ${session.preferredMatchId === match.id ? "selected" : ""}`}
              >
                <strong>{matchLabel(match)}</strong>
                <div className="coverage-teams">
                  {match.teams.map((team, index) => {
                    const entries = reports.filter(
                      (report) => report.matchId === match.id && report.team === team,
                    );
                    return (
                      <span key={`${index}-${team}`} className={index < 3 ? "red-team" : "blue-team"}>
                        {team}
                        <small>
                          {entries.some((report) => report.mode === "objective") ? <Check size={12} /> : "–"}{" "}
                          O ·{" "}
                          {entries.some((report) => report.mode === "subjective") ? <Check size={12} /> : "–"}{" "}
                          S
                        </small>
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <details className="report">
            <summary>Add a match manually</summary>
            <div className="form-grid mt-4">
              <label>
                Match number
                <Input
                  aria-label="Match number"
                  value={matchNumber}
                  onChange={(event) => setMatchNumber(event.target.value)}
                />
              </label>
              <label>
                Red 1–3, Blue 1–3
                <Input
                  aria-label="Six teams"
                  value={teams}
                  onChange={(event) => setTeams(event.target.value)}
                />
              </label>
            </div>
            <Button
              className="mt-4"
              disabled={
                saving ||
                !valid ||
                session.schedule.some(
                  (match) => (match.level ?? "qm") === "qm" && match.number === Number(matchNumber),
                )
              }
              onClick={() =>
                void change((current) =>
                  current.schedule.some(
                    (match) => (match.level ?? "qm") === "qm" && match.number === Number(matchNumber),
                  )
                    ? current
                    : {
                        ...current,
                        schedule: [
                          ...current.schedule,
                          {
                            id: `${current.eventKey}_qm${matchNumber}`,
                            number: Number(matchNumber),
                            teams: numbers,
                            level: "qm",
                            manual: true,
                          },
                        ].sort((a, b) => a.number - b.number),
                      },
                )
              }
            >
              Add match locally
            </Button>
          </details>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            <Upload size={19} />
            Import scouting reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Accepts V3 JSON backups and V2 Firebase JSON exports. V2 records without an event key use the
            currently selected event.
          </p>
          <Input
            type="file"
            accept="application/json,.json"
            aria-label="Import JSON reports"
            disabled={saving}
            onChange={(event) => {
              void importFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Scout status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="report flex flex-wrap justify-between gap-3">
            <strong>{session.name || "Unnamed scout"} · this device</strong>
            <span>
              {session.draft ? `Scouting ${session.draft.team}` : "Available"} · {session.outbox.length}{" "}
              pending · never synced
            </span>
          </div>
        </CardContent>
      </Card>
      <Todo title="Shared queue & scout roster">
        Publish schedules, reserve team slots, deliver assignments, and show every scout's last contact and
        sync.
      </Todo>
      <Todo title="QR / nearby transfer">
        Send and receive report batches without internet; preserve stable report IDs.
      </Todo>
    </div>
  );
}
