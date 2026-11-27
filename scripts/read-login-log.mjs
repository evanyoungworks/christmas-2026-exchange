// Prints the login audit log (Firestore `loginLog`), newest first.
// Uses YOUR Firebase CLI login (run `npx firebase-tools login` once) via the
// official Firebase MCP server's firestore_query_collection tool. No keys needed.
//
//   node scripts/read-login-log.mjs            # last 50 entries, table view
//   node scripts/read-login-log.mjs --limit 200
//   node scripts/read-login-log.mjs --json     # full raw entries (includes doc ids)
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const limit = Number(args[args.indexOf("--limit") + 1]) || 50;
const asJson = args.includes("--json");
const PROJECT = "christmas-2026-exchange";
const repoDir = fileURLToPath(new URL("..", import.meta.url));

const mcp = spawn("npx", ["-y", "firebase-tools@latest", "mcp", "--dir", repoDir, "--only", "firestore"], {
  stdio: ["pipe", "pipe", "inherit"],
  env: { ...process.env, GCLOUD_PROJECT: PROJECT },
});
let buf = "";
const waiting = new Map();
mcp.stdout.on("data", (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim();
    buf = buf.slice(i + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id != null && waiting.has(msg.id)) { waiting.get(msg.id)(msg); waiting.delete(msg.id); }
    } catch { /* ignore non-JSON */ }
  }
});
let nextId = 1;
const rpc = (method, params) => new Promise((resolve, reject) => {
  const id = nextId++;
  const t = setTimeout(() => reject(new Error(`timeout waiting for ${method}`)), 120000);
  waiting.set(id, (m) => { clearTimeout(t); m.error ? reject(new Error(m.error.message)) : resolve(m.result); });
  mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
});

try {
  await rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "read-login-log", version: "1" } });
  mcp.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
  await rpc("tools/call", { name: "firebase_update_environment", arguments: { active_project: PROJECT } }).catch(() => {});
  const res = await rpc("tools/call", {
    name: "firestore_query_collection",
    arguments: { collection_path: "loginLog", filters: [], order: { orderBy: "clientTime", orderByDirection: "DESCENDING" }, limit },
  });
  const text = (res.content || []).map((c) => c.text || "").join("");
  if (res.isError) throw new Error(text);
  const docs = res.structuredContent && res.structuredContent.documents;
  if (!Array.isArray(docs)) throw new Error("Unexpected response: " + text.slice(0, 500));
  if (asJson) {
    console.log(JSON.stringify(docs, null, 2));
  } else if (!docs.length) {
    console.log("No login attempts logged yet.");
  } else {
    const rows = docs.map((d) => {
      const g = d.geo || {};
      const dev = d.device || {};
      return {
        time: d.clientTime,
        name: `${d.firstName} ${d.lastName}`.trim(),
        ok: d.success ? "✔" : "✘",
        reason: d.failureReason || "",
        pin: d.success ? "" : d.pinEntered ?? "",
        ip: d.ip || "",
        where: [g.city, g.region, g.countryCode || g.country].filter(Boolean).join(", "),
        isp: g.isp || "",
        device: [dev.type, dev.os, dev.browser].filter(Boolean).join(" / "),
      };
    });
    console.table(rows);
    console.log(`${docs.length} entr${docs.length === 1 ? "y" : "ies"} (newest first). Use --json for full details.`);
  }
} catch (e) {
  console.error("Could not read the log:", e.message);
  console.error("If you're not logged in, run: npx firebase-tools login");
  process.exitCode = 1;
} finally {
  mcp.kill();
}
