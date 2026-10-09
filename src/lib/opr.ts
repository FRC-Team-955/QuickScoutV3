import type { Match } from "./model";
import { played } from "./tba";
// V2's least-squares approach. A tiny diagonal stabilizes incomplete schedules.
export function calculateOpr(matches: Match[], absent: Record<string, number[]>) {
  const scored = matches.filter(played);
  const teams = [...new Set(scored.flatMap((match) => match.teams))].sort((a, b) => a - b);
  const index = new Map(teams.map((team, i) => [team, i]));
  const n = teams.length;
  const matrix = Array.from({ length: n }, () => Array(n + 1).fill(0) as number[]);
  for (const match of scored) {
    for (const side of [0, 1]) {
      const active = match.teams
        .slice(side * 3, side * 3 + 3)
        .filter((team) => !absent[match.id]?.includes(team));
      const score = side ? match.blueScore! : match.redScore!;
      for (const team of active) {
        const row = index.get(team)!;
        matrix[row][n] += score;
        for (const other of active) matrix[row][index.get(other)!]++;
      }
    }
  }
  matrix.forEach((row, i) => {
    row[i] += 0.000001;
  });
  for (let column = 0; column < n; column++) {
    let pivot = column;
    for (let row = column + 1; row < n; row++)
      if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    for (let row = 0; row < n; row++) {
      if (row === column) continue;
      const factor = matrix[row][column] / matrix[column][column];
      for (let k = column; k <= n; k++) matrix[row][k] -= factor * matrix[column][k];
    }
  }
  return teams.map((team, i) => ({ team, opr: matrix[i][n] / matrix[i][i] })).sort((a, b) => b.opr - a.opr);
}
