// Generates a fresh random 2026 draw and writes draw.json (encrypted).
// Prints NOTHING about who has whom.
//   node scripts/generate-draw.mjs [--force]
import { writeFileSync, existsSync } from "node:fs";
import { PARTICIPANTS } from "../js/participants.js";
import { deriveKey, encryptEntry, toB64 } from "../js/drawcrypto.js";
import { checkDraw } from "./draw-rules.mjs";

const PIN = "2026";
const ITERATIONS = 150000;
const OUT = new URL("../draw.json", import.meta.url);

if (existsSync(OUT) && !process.argv.includes("--force")) {
  console.error("draw.json already exists. Re-run with --force to redraw (this changes everyone's assignment).");
  process.exit(1);
}

const rand = (n) => {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0] % n;
};
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

let assign;
for (let tries = 0; tries < 10000; tries++) {
  const receivers = shuffle(PARTICIPANTS);
  const candidate = Object.fromEntries(PARTICIPANTS.map((g, i) => [g, receivers[i]]));
  if (checkDraw(candidate).length === 0) { assign = candidate; break; }
}
if (!assign) { console.error("Could not find a valid draw."); process.exit(1); }

const salt = toB64(globalThis.crypto.getRandomValues(new Uint8Array(16)));
const entries = [];
for (const giver of PARTICIPANTS) {
  const key = await deriveKey(giver, PIN, salt, ITERATIONS);
  entries.push(await encryptEntry(key, { giver, recipient: assign[giver] }));
}
const draw = { version: 1, year: 2026, kdf: "PBKDF2-SHA256", cipher: "AES-256-GCM", iterations: ITERATIONS, salt, entries: shuffle(entries) };
writeFileSync(OUT, JSON.stringify(draw, null, 2) + "\n");
console.log("draw.json written (assignments are encrypted and were not printed).");
