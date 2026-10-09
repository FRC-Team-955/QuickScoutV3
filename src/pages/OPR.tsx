import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Metric from "@/components/Metric";
import { calculateOpr } from "@/lib/opr";
import { matchLabel, played } from "@/lib/tba";
import type { Session } from "@/lib/model";
import type { ChangeSession } from "@/lib/use-session";
export default function OPR({ session, change }: { session: Session; change: ChangeSession }) {
  const [level, setLevel] = useState("qm");
  const matches = session.schedule.filter((match) => level === "all" || (match.level ?? "qm") === level);
  const rows = useMemo(() => calculateOpr(matches, session.absent), [matches, session.absent]);
  const official = session.events[session.eventKey]?.officialOprs ?? {};
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Alliance results → team estimates</p>
          <h2>Offensive power rating</h2>
          <p>Estimated contribution to the alliance score. Early schedules produce uncertain estimates.</p>
        </div>
      </div>
      <div className="filter-bar">
        <label>
          Calculation scope
          <select className="field" value={level} onChange={(event) => setLevel(event.target.value)}>
            <option value="qm">Qualifications</option>
            <option value="all">All rounds</option>
            <option value="sf">Semifinals</option>
            <option value="f">Finals</option>
          </select>
        </label>
      </div>
      <div className="metrics-grid">
        <Metric label="Scored matches" value={matches.filter(played).length} />
        <Metric label="Teams in calculation" value={rows.length} />
        <Metric
          label="Absent observations"
          value={matches.reduce((sum, match) => sum + (session.absent[match.id]?.length ?? 0), 0)}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>OPR rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Team</th>
                  <th>Local estimate</th>
                  <th>TBA OPR · event</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.team}>
                    <td>{index + 1}</td>
                    <td>
                      <b>{row.team}</b>
                    </td>
                    <td>{row.opr.toFixed(2)}</td>
                    <td>{official[`frc${row.team}`]?.toFixed(2) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p className="empty">Load played TBA matches to calculate OPR.</p>}
          <p className="text-xs text-muted-foreground mt-4">
            Local calculation uses V2's least-squares model with a small stabilizing term. Absence marks
            affect only this device.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Who actually played?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Mark absent robots to exclude them from the local calculation.
          </p>
          {matches.filter(played).map((match) => (
            <details className="report" key={match.id}>
              <summary>
                {matchLabel(match)} · {match.redScore} – {match.blueScore}
              </summary>
              <div className="flex flex-wrap gap-4 mt-3">
                {match.teams.map((team) => (
                  <label key={team} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={session.absent[match.id]?.includes(team) ?? false}
                      onChange={() =>
                        void change((current) => {
                          const absent = current.absent[match.id] ?? [];
                          return {
                            ...current,
                            absent: {
                              ...current.absent,
                              [match.id]: absent.includes(team)
                                ? absent.filter((number) => number !== team)
                                : [...absent, team],
                            },
                          };
                        })
                      }
                    />
                    {team} absent
                  </label>
                ))}
              </div>
            </details>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
