// Decrypts draw.json in memory and checks the rules. Prints only PASS/FAIL.
//   node scripts/verify-draw.mjs
import { readFileSync } from "node:fs";
import { PARTICIPANTS } from "../js/participants.js";
import { findAssignment } from "../js/drawcrypto.js";
import { checkDraw } from "./draw-rules.mjs";

const PIN = "2026";
try {
  const draw = JSON.parse(readFileSync(new URL("../draw.json", import.meta.url), "utf8"));
  const assign = {};
  for (const p of PARTICIPANTS) {
    const r = await findAssignment(draw, p, PIN);
    if (r) assign[p] = r;
  }
  const problems = checkDraw(assign);
  // Wrong PIN must not unlock anything.
  if (await findAssignment(draw, PARTICIPANTS[0], "0000")) problems.push("wrong PIN unlocked an assignment");
  if (draw.entries.length !== PARTICIPANTS.length) problems.push("unexpected number of entries");
  if (problems.length) {
    console.log("FAIL");
    problems.forEach((p) => console.log(" - " + p));
    process.exit(1);
  }
  console.log("PASS: everyone gives once and receives once, nobody has themselves, nobody repeats 2025.");
} catch (e) {
  console.log("FAIL - " + e.message);
  process.exit(1);
}
