import { Users, Trophy, Target, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Metric from "@/components/Metric";
import MatchCard from "@/components/MatchCard";
import { eventReports, summarizeTeams } from "@/lib/analytics";
import { played } from "@/lib/tba";
import type { Session } from "@/lib/model";

export default function Dashboard({
  session,
  navigate,
}: {
  session: Session;
  navigate: (page: string) => void;
}) {
  const reports = eventReports(session.reports, session.eventKey);
  const stats = summarizeTeams(reports);
  const event = session.events[session.eventKey];
  const matches = session.schedule;
  const completed = matches.filter(played);
  const totalTeams = event?.teams.length || new Set(matches.flatMap((match) => match.teams)).size;
  const upcoming = matches.filter((match) => !played(match)).slice(0, 6);
  const allianceAverage = (side: "red" | "blue") =>
    completed.length
      ? completed.reduce((sum, match) => sum + (side === "red" ? match.redScore! : match.blueScore!), 0) /
        completed.length
      : 0;
  const breakdownAverage = (side: "red" | "blue", field: string) => {
    const values = completed
      .map((match) => (side === "red" ? match.redBreakdown : match.blueBreakdown)?.[field])
      .filter((value): value is number => typeof value === "number");
    return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : "—";
  };
  return (
    <div className="space-y-6">
      <div className="overview-hero">
        <div>
          <p className="eyebrow">Event overview · {session.eventKey}</p>
          <h2>A clearer view of the field.</h2>
          <p>Scouting coverage, team performance, and the next matches.</p>
        </div>
        <Button size="lg" onClick={() => navigate("scouting")}>
          Start scouting →
        </Button>
      </div>
      <div className="metrics-grid">
        <Metric
          label="Teams observed"
          value={`${stats.length} / ${totalTeams}`}
          hint="On this device"
          icon={<Users size={17} />}
        />
        <Metric
          label="Matches played"
          value={`${completed.length} / ${matches.length}`}
          hint="From cached TBA results"
          icon={<Trophy size={17} />}
        />
        <Metric
          label="Pit coverage"
          value={`${new Set(reports.filter((report) => report.mode === "pit").map((report) => report.team)).size} / ${totalTeams}`}
          hint="Robots interviewed"
          icon={<Target size={17} />}
        />
        <Metric
          label="Reports saved"
          value={reports.length}
          hint={`${session.outbox.length} pending upload`}
          icon={<Layers size={17} />}
        />
      </div>
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>
              Top teams <span className="text-muted-foreground text-sm">by observed fuel</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {stats
                .filter((team) => team.matches)
                .slice(0, 4)
                .map((team, index) => (
                  <button
                    key={team.team}
                    className="team-summary"
                    onClick={() => navigate(`analytics:${team.team}`)}
                  >
                    <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>Team {team.team}</h3>
                      <p>
                        {event?.teams.find((info) => info.number === team.team)?.name ??
                          `${team.matches} matches observed`}
                      </p>
                    </div>
                    <div className="team-summary-stats">
                      <strong>
                        {team.total.toFixed(1)}
                        <small>Avg fuel</small>
                      </strong>
                      <strong>
                        {team.climbRate.toFixed(0)}%<small>Climb rate</small>
                      </strong>
                    </div>
                  </button>
                ))}
            </div>
            {!stats.some((team) => team.matches) && (
              <p className="empty">Save or import objective reports to see the strongest teams.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alliance comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Average final score · {completed.length} played matches
            </p>
            <div className="alliance-totals">
              <strong className="red-team">
                {allianceAverage("red").toFixed(1)}
                <small>Red</small>
              </strong>
              <strong className="blue-team">
                {allianceAverage("blue").toFixed(1)}
                <small>Blue</small>
              </strong>
            </div>
            <div className="comparison-bar">
              <span
                style={{
                  width: `${(allianceAverage("red") / (allianceAverage("red") + allianceAverage("blue") || 1)) * 100}%`,
                }}
              />
            </div>
            <p className="text-sm">
              Average combined match score:{" "}
              <b>{(allianceAverage("red") + allianceAverage("blue")).toFixed(1)}</b>
            </p>
            <div className="space-y-3 text-xs">
              {Object.entries({
                autoPoints: "Auto points",
                teleopPoints: "Teleop points",
                endGamePoints: "Endgame points",
              }).map(([key, label]) => (
                <div className="flex justify-between gap-2" key={key}>
                  <span className="text-muted-foreground">{label}</span>
                  <span>
                    <b className="red-team">{breakdownAverage("red", key)}</b> /{" "}
                    <b className="blue-team">{breakdownAverage("blue", key)}</b>
                  </span>
                </div>
              ))}
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Win rate</span>
                <span>
                  <b className="red-team">
                    {completed.length
                      ? Math.round(
                          (completed.filter((match) => match.redScore! > match.blueScore!).length /
                            completed.length) *
                            100,
                        )
                      : 0}
                    %
                  </b>{" "}
                  /{" "}
                  <b className="blue-team">
                    {completed.length
                      ? Math.round(
                          (completed.filter((match) => match.blueScore! > match.redScore!).length /
                            completed.length) *
                            100,
                        )
                      : 0}
                    %
                  </b>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="flex justify-between items-center">
        <h3>Coming up next</h3>
        <Button variant="ghost" onClick={() => navigate("matches")}>
          Full schedule →
        </Button>
      </div>
      <div className="match-grid">
        {upcoming.map((match) => (
          <MatchCard key={match.id} match={match} homeTeam={session.homeTeam} />
        ))}
      </div>
      {!upcoming.length && (
        <p className="empty">No upcoming matches in the cache. Refresh the event in Lead desk.</p>
      )}
    </div>
  );
}
