import { useState } from "react";
import { Input } from "@/components/ui/input";
import MatchCard from "@/components/MatchCard";
import { played } from "@/lib/tba";
import type { Session } from "@/lib/model";
export default function Matches({ session }: { session: Session }) {
  const [level, setLevel] = useState("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const matches = session.schedule.filter(
    (match) =>
      (level === "all" || (match.level ?? "qm") === level) &&
      (status === "all" || played(match) === (status === "played")) &&
      (!query ||
        match.id.toLowerCase().includes(query.toLowerCase()) ||
        match.label?.toLowerCase().includes(query.toLowerCase()) ||
        match.teams.some((team) => String(team).includes(query))),
  );
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <p className="eyebrow">The field, in order</p>
          <h2>Match schedule</h2>
          <p>Alliances, results, and your team's matches.</p>
        </div>
        <span className="pill">{matches.length} matches</span>
      </div>
      <div className="filter-bar">
        <label>
          Search
          <Input
            placeholder="Team or match"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Round
          <select className="field" value={level} onChange={(event) => setLevel(event.target.value)}>
            {Object.entries({
              all: "All rounds",
              qm: "Qualifications",
              ef: "Eighthfinals",
              qf: "Quarterfinals",
              sf: "Semifinals",
              f: "Finals",
            }).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select className="field" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All matches</option>
            <option value="played">Played</option>
            <option value="upcoming">Upcoming</option>
          </select>
        </label>
      </div>
      <div className="match-grid">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} homeTeam={session.homeTeam} />
        ))}
      </div>
      {!matches.length && <p className="empty">No matches match these filters.</p>}
    </div>
  );
}
