import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MatchCard from "@/components/MatchCard";
import { buildStreamUrl, played } from "@/lib/tba";
import { fetchNexus, formatCountdown } from "@/lib/nexus";
import type { Session } from "@/lib/model";
import type { ChangeSession } from "@/lib/use-session";

export default function PitDisplay({
  session,
  change,
  network,
}: {
  session: Session;
  change: ChangeSession;
  network: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  const [stream, setStream] = useState(false);
  const [webcastIndex, setWebcastIndex] = useState(0);
  const [nexusKey, setNexusKey] = useState(
    session.nexusKeys[session.eventKey] ?? (session.eventKey === "demo" ? "2026joh" : session.eventKey),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    controller.current?.abort();
    setLoading(false);
    setStream(false);
    return () => controller.current?.abort();
  }, [session.offline, network, session.eventKey]);
  useEffect(() => {
    controller.current?.abort();
    setLoading(false);
    setError("");
  }, [nexusKey]);
  const cached = session.nexus[nexusKey];
  const queue = cached?.matches.find(
    (match) =>
      [...(match.redTeams ?? []), ...(match.blueTeams ?? [])].some(
        (team) => String(team).replace(/^frc/, "") === String(session.homeTeam),
      ) && !/played|complete/i.test(match.status ?? ""),
  );
  const webcast = session.events[session.eventKey]?.webcasts[webcastIndex];
  const streamUrl = buildStreamUrl(webcast);
  const upcomingIndex = session.schedule.findIndex((match) => !played(match));
  const nextIndex = upcomingIndex < 0 ? session.schedule.length - 1 : upcomingIndex;
  const nearby = session.schedule.slice(Math.max(0, nextIndex - 2), nextIndex + 3);
  const nextHome = session.schedule.find((match) => match.teams.includes(session.homeTeam) && !played(match));
  async function refreshNexus() {
    if (session.offline || !network || loading) return;
    const request = new AbortController();
    controller.current = request;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => request.abort(), 10000);
    try {
      const status = await fetchNexus(nexusKey, request.signal);
      if (!request.signal.aborted)
        await change((current) => ({ ...current, nexus: { ...current.nexus, [nexusKey]: status } }));
    } catch (error) {
      if (controller.current === request)
        setError(
          request.signal.aborted
            ? "Queue refresh stopped."
            : String(error instanceof Error ? error.message : error),
        );
    } finally {
      clearTimeout(timer);
      if (controller.current === request) setLoading(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="pit-display-header">
        <div>
          <p className="eyebrow">Pit monitor · Team {session.homeTeam}</p>
          <h2>{new Date(now).toLocaleTimeString()}</h2>
        </div>
        <span className="pill">{session.eventKey}</span>
      </div>
      <div className="pit-display-grid">
        <div className="space-y-3">
          <h3>Near the next unplayed match</h3>
          {nearby.map((match) => (
            <MatchCard key={match.id} match={match} homeTeam={session.homeTeam} />
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Event webcast</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stream && streamUrl && network && !session.offline ? (
              <iframe
                className="stream-frame"
                src={streamUrl}
                title="Event livestream"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="stream-placeholder">
                <span>LIVE</span>
                <h3>
                  {session.offline
                    ? "Streams paused"
                    : webcast
                      ? "Event stream ready"
                      : "No webcast in cache"}
                </h3>
                <p>Scouting stays usable without loading video.</p>
              </div>
            )}
            {!!session.events[session.eventKey]?.webcasts.length && (
              <label>
                Webcast
                <select
                  className="field mt-2"
                  value={webcastIndex}
                  onChange={(event) => {
                    setWebcastIndex(Number(event.target.value));
                    setStream(false);
                  }}
                >
                  {session.events[session.eventKey].webcasts.map((webcast, index) => (
                    <option key={index} value={index}>
                      {webcast.type} · {webcast.channel}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <Button
              variant="outline"
              disabled={!streamUrl || session.offline || !network}
              onClick={() => setStream(!stream)}
            >
              {stream ? "Stop stream" : "Load stream"}
            </Button>
            <p className="text-sm text-muted-foreground">
              Next match for Team {session.homeTeam}:{" "}
              <b>{nextHome?.label ?? (nextHome ? `Qual ${nextHome.number}` : "No upcoming match cached")}</b>
            </p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Nexus queue information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Live queue data from{" "}
            <a className="underline" href="https://frc.nexus" target="_blank" rel="noreferrer">
              Nexus
            </a>
            . Ended events are unavailable.
          </p>
          <div className="filter-bar">
            <label>
              Nexus event key
              <Input
                value={nexusKey}
                onChange={(event) => setNexusKey(event.target.value.trim())}
                onBlur={() =>
                  void change((current) => ({
                    ...current,
                    nexusKeys: { ...current.nexusKeys, [current.eventKey]: nexusKey },
                  }))
                }
              />
            </label>
            <Button
              disabled={session.offline || !network || loading || !/^[a-zA-Z0-9_-]{3,64}$/.test(nexusKey)}
              onClick={() => void refreshNexus()}
            >
              {loading ? "Loading queue…" : "Refresh queue"}
            </Button>
          </div>
          {error && (
            <p role="alert" className="text-amber-300">
              {error}
            </p>
          )}
          {cached ? (
            <div className="queue-announcement">
              <p>
                Now queuing: <b>{cached.nowQueuing ?? "Unavailable"}</b>
              </p>
              <h3>
                {queue
                  ? `${queue.label} · ${queue.status ?? "Upcoming"}`
                  : `No upcoming queue entry for Team ${session.homeTeam}`}
              </h3>
              {queue?.times?.estimatedQueueTime && (
                <p>
                  {formatCountdown(queue.times.estimatedQueueTime, now)} ·{" "}
                  {queue.redTeams?.some(
                    (team) => String(team).replace(/^frc/, "") === String(session.homeTeam),
                  )
                    ? "Red"
                    : "Blue"}{" "}
                  bumpers
                </p>
              )}
              <small>
                Cached snapshot ·{" "}
                {cached.dataAsOfTime
                  ? new Date(
                      cached.dataAsOfTime < 10000000000 ? cached.dataAsOfTime * 1000 : cached.dataAsOfTime,
                    ).toLocaleString()
                  : "Timestamp unavailable"}
                . Refresh to confirm current status.
              </small>
            </div>
          ) : (
            <p className="empty">Refresh Nexus to load queue status. No background requests run.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
