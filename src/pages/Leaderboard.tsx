import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Metric from "@/components/Metric";
import { eventReports, scoutRankings } from "@/lib/analytics";
import type { Session } from "@/lib/model";
export default function Leaderboard({ session }: { session: Session }) {
  const [eventKey, setEventKey] = useState(session.eventKey);
  const reports = eventReports(session.reports, eventKey);
  const rows = scoutRankings(reports);
  const events = [
    ...new Set([session.eventKey, ...session.reports.map((report) => report.eventKey ?? "demo")]),
  ];
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <h2>Scout leaderboard</h2>
          <p>Counts saved and imported reports. Pending reports count here too.</p>
        </div>
      </div>
      <div className="filter-bar">
        <label>
          Event
          <select className="field" value={eventKey} onChange={(event) => setEventKey(event.target.value)}>
            <option value="all">All events</option>
            {events.map((key) => (
              <option key={key}>{key}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="metrics-grid">
        <Metric label="Scouts" value={rows.length} />
        <Metric label="Reports" value={reports.length} />
        <Metric label="Leading scout" value={rows[0]?.name ?? "—"} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Contributions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Scout</th>
                  <th>Objective</th>
                  <th>Subjective</th>
                  <th>Pit</th>
                  <th>Total</th>
                  <th>Last report</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>
                      <span className={index < 3 ? "rank-medal" : ""}>{index + 1}</span>
                    </td>
                    <td>
                      <b>{row.name}</b>
                    </td>
                    <td>{row.objective}</td>
                    <td>{row.subjective}</td>
                    <td>{row.pit}</td>
                    <td>
                      <b>{row.total}</b>
                    </td>
                    <td>{row.last ? new Date(row.last).toLocaleString() : "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!rows.length && <p className="empty">Save or import reports to populate the leaderboard.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
