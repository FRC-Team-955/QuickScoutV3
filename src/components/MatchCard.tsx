import type { Match } from "@/lib/model";
import { matchLabel, played } from "@/lib/tba";
export default function MatchCard({ match, homeTeam }: { match: Match; homeTeam: number }) {
  const active = match.teams.includes(homeTeam);
  const alliances = [match.redTeams ?? match.teams.slice(0, 3), match.blueTeams ?? match.teams.slice(3, 6)];
  return (
    <article className={`match-card ${active ? "home-match" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <h3>{matchLabel(match)}</h3>
        <span className="pill">{played(match) ? "Final" : "Upcoming"}</span>
      </div>
      {[0, 1].map((side) => (
        <div key={side} className={`match-alliance ${side ? "blue-team" : "red-team"}`}>
          <span>{side ? "Blue" : "Red"}</span>
          <div>
            {alliances[side].length === 3 && alliances[side].every((team) => team > 0) ? (
              alliances[side].map((team) => (
                <strong key={team} className={team === homeTeam ? "underline underline-offset-4" : ""}>
                  {team}
                </strong>
              ))
            ) : (
              <span>TBD</span>
            )}
          </div>
          <b>
            {((side ? match.blueScore : match.redScore) ?? -1) >= 0
              ? side
                ? match.blueScore
                : match.redScore
              : "—"}
          </b>
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        {match.time
          ? new Date(match.time * 1000).toLocaleString([], {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })
          : "Time unavailable"}
        {active ? ` · Team ${homeTeam}` : ""}
      </p>
    </article>
  );
}
