import { PARTICIPANTS, LAST_YEAR } from "../js/participants.js";

// Returns a list of rule violations (empty = valid). Never includes names.
export function checkDraw(assign) {
  const problems = [];
  const givers = Object.keys(assign);
  const receivers = Object.values(assign);
  if (givers.length !== PARTICIPANTS.length || !PARTICIPANTS.every((p) => p in assign))
    problems.push("not every participant is a giver exactly once");
  if (new Set(receivers).size !== receivers.length || !PARTICIPANTS.every((p) => receivers.includes(p)))
    problems.push("not every participant is a receiver exactly once");
  if (givers.some((g) => assign[g] === g)) problems.push("someone drew themselves");
  if (givers.some((g) => LAST_YEAR[g] && assign[g] === LAST_YEAR[g]))
    problems.push("someone drew their 2025 person");
  return problems;
}
