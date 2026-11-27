// Sanity-checks the rule checker itself with made-up draws (no real pairs).
import { PARTICIPANTS, LAST_YEAR } from "../js/participants.js";
import { checkDraw } from "./draw-rules.mjs";
import { findParticipant } from "../js/participants.js";

let ok = true;
const expect = (cond, label) => { if (!cond) { ok = false; console.log("FAIL - " + label); } };
const rotate = (k) => Object.fromEntries(PARTICIPANTS.map((g, i) => [g, PARTICIPANTS[(i + k) % PARTICIPANTS.length]]));

expect(checkDraw(rotate(0)).length > 0, "self-assignment should be rejected");
expect(checkDraw({ ...LAST_YEAR }).length > 0, "repeating 2025 should be rejected");
const dup = rotate(1); dup[PARTICIPANTS[0]] = dup[PARTICIPANTS[1]];
expect(checkDraw(dup).length > 0, "duplicate receiver should be rejected");
expect(findParticipant("  eVAN ", " young  ") === "Evan Young", "names should match case/space-insensitively");
expect(findParticipant("Evan", "Smith") === null, "unknown names should not match");
console.log(ok ? "PASS: rule checker tests" : "FAIL");
process.exit(ok ? 0 : 1);
