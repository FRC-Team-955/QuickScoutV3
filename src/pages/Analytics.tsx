import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Metric from "@/components/Metric";
import Todo from "@/components/Todo";
import { eventReports, overlapKey, overlappingReports, summarizeTeams } from "@/lib/analytics";
import { download, reportCsv } from "@/lib/transfer";
import { matchFields } from "@/lib/fields";
import { pitFields } from "@/lib/pit-fields";
import type { Session } from "@/lib/model";
import type { ChangeSession } from "@/lib/use-session";

const tooltip = { background: "#17212d", border: "1px solid #334155", borderRadius: 12, color: "#f1f5f9" };
const number = (value: number) => value.toFixed(1);
function fieldLabel(key: string, labels: Record<string, string>) {
  const auto = key.match(/^(?:auto_(\d+)_|auto(\d+)\.)(.+)$/);
  if (auto) return `Auto ${auto[1] ?? auto[2]} · ${labels[auto[3]] ?? auto[3]}`;
  return labels[key] ?? labels[key.split(".").at(-1)!] ?? key.replace(/[._]/g, " ");
}
export default function Analytics({
  session,
  change,
  saving,
  initialTeam = "",
}: {
  session: Session;
  change: ChangeSession;
  saving: boolean;
  initialTeam?: string;
}) {
  const [view, setView] = useState(initialTeam ? "team" : "all");
  const [team, setTeam] = useState(initialTeam);
  const [scout, setScout] = useState("");
  const [eventKey, setEventKey] = useState(session.eventKey);
  const [sort, setSort] = useState("newest");
  const [json, setJson] = useState(false);
  const [remove, setRemove] = useState("");
  const events = [
    ...new Set([session.eventKey, ...session.reports.map((report) => report.eventKey ?? "demo")]),
  ];
  const selected = eventReports(session.reports, eventKey).filter(
    (report) =>
      (!team.trim() || String(report.team) === team.trim()) &&
      (!scout.trim() || report.scoutName.toLowerCase().includes(scout.trim().toLowerCase())),
  );
  const reports = selected
    .filter((report) =>
      view === "pit" ? report.mode === "pit" : view === "subjective" ? report.mode === "subjective" : true,
    )
    .sort((a, b) =>
      sort === "oldest"
        ? a.submittedAt - b.submittedAt
        : sort === "team"
          ? a.team - b.team
          : sort === "fuel"
            ? Number(b.values.autoFuel ?? 0) +
              Number(b.values.teleopFuel ?? 0) -
              Number(a.values.autoFuel ?? 0) -
              Number(a.values.teleopFuel ?? 0)
            : b.submittedAt - a.submittedAt,
    );
  const stats = summarizeTeams(selected);
  const chartData = stats.filter((team) => team.matches);
  const overlaps = overlappingReports(selected);
  const objective = selected
    .filter((report) => report.mode === "objective")
    .sort((a, b) => a.submittedAt - b.submittedAt);
  const trend = objective.map((report, index) => ({
    observation: index + 1,
    auto: Number(report.values.autoFuel ?? 0),
    teleop: Number(report.values.teleopFuel ?? 0),
    team: report.team,
  }));
  const bins = new Map<number, number>();
  objective.forEach((report) => {
    const bucket =
      Math.floor((Number(report.values.autoFuel ?? 0) + Number(report.values.teleopFuel ?? 0)) / 25) * 25;
    bins.set(bucket, (bins.get(bucket) ?? 0) + 1);
  });
  const distribution = [...bins]
    .sort(([a], [b]) => a - b)
    .map(([start, reports]) => ({ fuel: `${start}–${start + 24}`, reports }));
  const average = (key: "total" | "climbRate" | "defense") =>
    chartData.length ? chartData.reduce((sum, item) => sum + item[key], 0) / chartData.length : 0;
  const labels = Object.fromEntries(
    [...matchFields.objective, ...matchFields.subjective, ...pitFields].map((field) => [
      field.key,
      field.label,
    ]),
  );
  return (
    <div className="space-y-5">
      <div className="page-heading">
        <div>
          <p className="eyebrow">From observations to decisions</p>
          <h2>{team ? `Team ${team}` : "Scouting analytics"}</h2>
          <p>Saved and imported reports · fuel counts are separate from game points.</p>
        </div>
        <Button
          variant="outline"
          disabled={!reports.length}
          onClick={() => download(`quickscout-${eventKey}.csv`, reportCsv(reports), "text/csv;charset=utf-8")}
        >
          Export filtered CSV
        </Button>
      </div>
      <div className="view-tabs">
        {Object.entries({
          all: "All reports",
          team: "Team search",
          scout: "Scout search",
          bubble: "Bubble chart",
          pit: "Pit scouting",
          subjective: "Subjective",
        }).map(([key, label]) => (
          <button key={key} aria-pressed={view === key} onClick={() => setView(key)}>
            {label}
          </button>
        ))}
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
        <label>
          Team
          <Input placeholder="All teams" value={team} onChange={(event) => setTeam(event.target.value)} />
        </label>
        <label>
          Scout
          <Input placeholder="All scouts" value={scout} onChange={(event) => setScout(event.target.value)} />
        </label>
        <label>
          Sort
          <select className="field" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="team">Team number</option>
            <option value="fuel">Most observed fuel</option>
          </select>
        </label>
      </div>
      <div className="metrics-grid">
        <Metric
          label="Reports"
          value={reports.length}
          hint={`${selected.filter((report) => report.mode === "objective").length} objective · ${selected.filter((report) => report.mode === "subjective").length} subjective · ${selected.filter((report) => report.mode === "pit").length} pit`}
        />
        <Metric
          label="Average fuel"
          value={number(average("total"))}
          hint="Per team, matches weighted equally"
        />
        <Metric label="Climb success" value={`${average("climbRate").toFixed(0)}%`} />
        <Metric label="Defense rating" value={number(average("defense"))} hint="0–4 scale" />
      </div>
      {!!overlaps.size && (
        <div className="notice">
          {overlaps.size} team/match pairs have multiple observers. Reports are retained; charts average those
          observers before averaging matches.
        </div>
      )}
      {view !== "pit" && view !== "subjective" && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                {view === "bubble"
                  ? "Fuel vs. climb consistency"
                  : team || scout
                    ? "Fuel over observations"
                    : "Average fuel by team"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length ? (
                <div className="chart-height">
                  <ResponsiveContainer width="100%" height="100%">
                    {view === "bubble" ? (
                      <ScatterChart margin={{ right: 20, bottom: 20 }}>
                        <CartesianGrid stroke="#2a3544" />
                        <XAxis type="number" dataKey="total" name="Average fuel" />
                        <YAxis
                          type="number"
                          dataKey="climbRate"
                          name="Climb success"
                          unit="%"
                          domain={[0, 100]}
                        />
                        <ZAxis dataKey="reports" name="Reports" range={[60, 400]} />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          content={({ active, payload }) => {
                            const row = payload?.[0]?.payload;
                            return active && row ? (
                              <div className="chart-tooltip">
                                <strong>Team {row.team}</strong>
                                <p>Average fuel: {number(row.total)}</p>
                                <p>Climb success: {row.climbRate.toFixed(0)}%</p>
                                <p>{row.reports} reports</p>
                              </div>
                            ) : null;
                          }}
                        />
                        <Scatter name="Teams" data={chartData} fill="#fb7185" />
                      </ScatterChart>
                    ) : team || scout ? (
                      <LineChart data={trend}>
                        <CartesianGrid stroke="#2a3544" vertical={false} />
                        <XAxis dataKey="observation" />
                        <YAxis />
                        <Tooltip contentStyle={tooltip} />
                        <Legend />
                        <Line dataKey="auto" name="Auto fuel" stroke="#38bdf8" strokeWidth={2} />
                        <Line dataKey="teleop" name="Teleop fuel" stroke="#fb7185" strokeWidth={2} />
                      </LineChart>
                    ) : (
                      <BarChart data={chartData}>
                        <CartesianGrid stroke="#2a3544" vertical={false} />
                        <XAxis dataKey="team" />
                        <YAxis />
                        <Tooltip contentStyle={tooltip} />
                        <Legend />
                        <Bar
                          dataKey="auto"
                          name="Auto fuel"
                          stackId="fuel"
                          fill="#38bdf8"
                          radius={[0, 0, 4, 4]}
                        />
                        <Bar
                          dataKey="teleop"
                          name="Teleop fuel"
                          stackId="fuel"
                          fill="#fb7185"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="empty">Save or import objective reports to populate this chart.</p>
              )}
            </CardContent>
          </Card>
          {!!objective.length && (view === "team" || view === "scout") && (
            <Card>
              <CardHeader>
                <CardTitle>Fuel distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Each objective report contributes one observation.
                </p>
                <div className="chart-height">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distribution}>
                      <CartesianGrid stroke="#2a3544" vertical={false} />
                      <XAxis dataKey="fuel" />
                      <YAxis allowDecimals={false} />
                      <Tooltip contentStyle={tooltip} />
                      <Bar dataKey="reports" name="Reports" fill="#fb7185" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Team breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Team</th>
                      <th>Matches</th>
                      <th>Auto fuel</th>
                      <th>Teleop fuel</th>
                      <th>Total fuel</th>
                      <th>Climb</th>
                      <th>Defense</th>
                      <th>Tipped</th>
                      <th>Dead</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((row) => (
                      <tr key={row.team}>
                        <td>
                          <button
                            className="text-primary font-semibold"
                            onClick={() => {
                              setTeam(String(row.team));
                              setView("team");
                            }}
                          >
                            {row.team}
                          </button>
                        </td>
                        <td>{row.matches}</td>
                        <td>{row.matches ? number(row.auto) : "—"}</td>
                        <td>{row.matches ? number(row.teleop) : "—"}</td>
                        <td>
                          <b>{row.matches ? number(row.total) : "—"}</b>
                        </td>
                        <td>{row.matches ? `${row.climbRate.toFixed(0)}%` : "—"}</td>
                        <td>{row.matches ? number(row.defense) : "—"}</td>
                        <td>{row.matches ? `${row.tippedRate.toFixed(0)}%` : "—"}</td>
                        <td>{row.matches ? `${row.deadRate.toFixed(0)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            {view === "pit"
              ? "Pit interviews"
              : view === "subjective"
                ? "Subjective observations"
                : "Individual reports"}
          </CardTitle>
          <Button variant="ghost" onClick={() => setJson(!json)}>
            {json ? "Readable view" : "View JSON"}
          </Button>
        </CardHeader>
        <CardContent>
          {json ? (
            <pre className="json-view">{JSON.stringify(reports, null, 2)}</pre>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <details key={report.id} className="report">
                  <summary>
                    <b>Team {report.team}</b>
                    <span>
                      {" "}
                      · {report.mode} · {report.scoutName}
                    </span>
                    <small>
                      {report.matchId ?? "Pit interview"} ·{" "}
                      {report.submittedAt ? new Date(report.submittedAt).toLocaleString() : "Unknown time"}
                    </small>
                  </summary>
                  <div className="flex flex-wrap gap-2 my-3">
                    <span className="pill">{report.eventKey ?? "demo"}</span>
                    <span className="pill">
                      {session.outbox.includes(report.id) ? "Pending upload" : "Imported / local copy"}
                    </span>
                    {overlaps.has(overlapKey(report)) && (
                      <span className="pill text-amber-300">Overlapping coverage</span>
                    )}
                  </div>
                  <dl className="report-values">
                    {Object.entries(report.values).map(([key, value]) => (
                      <div key={key}>
                        <dt>{fieldLabel(key, labels)}</dt>
                        <dd>{String(value) || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                  <Button
                    variant="outline"
                    className="mt-4"
                    disabled={saving}
                    onClick={() => {
                      if (remove === report.id)
                        void change((current) => ({
                          ...current,
                          reports: current.reports.filter((item) => item.id !== report.id),
                          outbox: current.outbox.filter((id) => id !== report.id),
                        })).then((saved) => {
                          if (saved) setRemove("");
                        });
                      else setRemove(report.id);
                    }}
                  >
                    {remove === report.id ? "Confirm remove local copy" : "Remove local copy"}
                  </Button>
                </details>
              ))}
            </div>
          )}
          {!reports.length && <p className="empty">No reports match these filters.</p>}
        </CardContent>
      </Card>
      <Todo title="Shared analytics">
        Read event reports from Firebase; synchronize edits and deletion permissions.
      </Todo>
    </div>
  );
}
