import type { Mode } from "./model";
export type Field = {
  key: string;
  label: string;
  section: string;
  type: string;
  options?: string[];
  placeholder?: string;
};
const text = (key: string, label: string, section: string): Field => ({ key, label, section, type: "text" });
const choice = (key: string, label: string, section: string, options: string[]): Field => ({
  key,
  label,
  section,
  type: "select",
  options,
});
// V2's match prompts, kept separately from rendering and persistence.
export const matchFields: Record<Exclude<Mode, "pit">, Field[]> = {
  objective: [
    text("teamNumberNotes", "Team / station notes", "Setup"),
    { key: "autoFuel", label: "Autonomous fuel", section: "Autonomous", type: "count" },
    choice("autoClimb", "Auto climb", "Autonomous", ["No", "Yes"]),
    text("autonomousNotes", "Autonomous notes", "Autonomous"),
    { key: "teleopFuel", label: "Teleop fuel", section: "Teleop", type: "count" },
    choice("climb", "Teleop climb", "Teleop", ["None", "L1", "L2", "L3"]),
    text("teleopNotes", "Teleop notes", "Teleop"),
    choice("defense", "Defense rating", "Teleop", ["None", "Poor", "Fair", "Good", "Excellent"]),
    choice("shootingOnMove", "Shooting on the move", "Reliability", ["No", "Yes"]),
    choice("tipped", "Robot tipped", "Reliability", ["No", "Yes"]),
    choice("dead", "Robot stopped working", "Reliability", ["No", "Yes"]),
    text("endGameNotes", "Endgame notes", "Reliability"),
    { key: "notes", label: "Additional notes", section: "Reliability", type: "textarea" },
  ],
  subjective: [
    text("autonomousEffectiveness", "Autonomous effectiveness", "Performance"),
    text("canQuicklyScore", "Estimated fuel per cycle", "Performance"),
    text("estimatedBPS", "Estimated balls per second", "Performance"),
    text("canClimb", "Climb capability", "Performance"),
    text("climbTime", "Estimated climb time", "Performance"),
    choice("climbLevel", "Climb level", "Performance", ["None", "L1", "L2", "L3"]),
    text("teamFocus", "Scoring, passing, defense, or a mix?", "Team dynamics"),
    text("driverSynchronization", "Driver synchronization", "Team dynamics"),
    text("performanceUnderPressure", "Performance under pressure", "Team dynamics"),
    text("defensiveStrategy", "Defensive strategy", "Tactics"),
    text("blockingEffectiveness", "Blocking effectiveness", "Tactics"),
    text("defensiveSkill", "Defense experience", "Tactics"),
    text("allyCooperation", "Alliance cooperation", "Tactics"),
    text("robotReliability", "Robot reliability", "Observations"),
    text("robotPenalties", "Penalties", "Observations"),
    text("autoFuel", "Estimated auto fuel", "Observations"),
    text("autoClimb", "Auto climb observations", "Observations"),
    text("teleopPassing", "Passing capability", "Observations"),
    text("gameSense", "Game sense", "Observations"),
    text("strengths", "Strengths", "Observations"),
    text("weaknesses", "Weaknesses", "Observations"),
    { key: "notes", label: "Additional notes", section: "Observations", type: "textarea" },
  ],
};
