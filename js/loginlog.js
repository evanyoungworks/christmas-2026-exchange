// Records every login attempt to Firestore `loginLog`. Never blocks or breaks login.
import { writeLoginLog } from "./store.js";

const clip = (v, n = 300) => (v == null ? null : String(v).slice(0, n));
const num = (v) => (typeof v === "number" && isFinite(v) ? v : null);

async function fetchJson(url, ms = 3000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// Approximate location from the visitor's IP (free, no-key APIs).
export async function lookupGeo() {
  try {
    const d = await fetchJson("https://ipwho.is/");
    if (d && d.success !== false && d.ip) {
      return {
        source: "ipwho.is", ip: clip(d.ip, 64), city: clip(d.city, 100), region: clip(d.region, 100),
        country: clip(d.country, 100), countryCode: clip(d.country_code, 8), postal: clip(d.postal, 20),
        lat: num(d.latitude), lon: num(d.longitude),
        isp: clip(d.connection && d.connection.isp, 150), org: clip(d.connection && d.connection.org, 150),
        asn: num(d.connection && d.connection.asn), ipTimezone: clip(d.timezone && d.timezone.id, 64),
      };
    }
  } catch { /* try fallback */ }
  try {
    const d = await fetchJson("https://ipapi.co/json/");
    if (d && !d.error && d.ip) {
      return {
        source: "ipapi.co", ip: clip(d.ip, 64), city: clip(d.city, 100), region: clip(d.region, 100),
        country: clip(d.country_name, 100), countryCode: clip(d.country_code, 8), postal: clip(d.postal, 20),
        lat: num(d.latitude), lon: num(d.longitude), isp: clip(d.org, 150), org: clip(d.org, 150),
        asn: null, ipTimezone: clip(d.timezone, 64),
      };
    }
  } catch { /* give up */ }
  return null;
}

export function parseDevice(ua = navigator.userAgent) {
  const uaData = navigator.userAgentData;
  let os = "Unknown";
  if (/iPhone|iPod/.test(ua)) os = "iOS";
  else if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) os = "iPadOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/CrOS/.test(ua)) os = "ChromeOS";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/.test(ua)) os = "macOS";
  else if (/Linux/.test(ua)) os = "Linux";
  const osVer = (ua.match(/(?:iPhone OS|CPU OS|Android|Windows NT|Mac OS X) ([\d._]+)/) || [])[1];

  let browser = "Unknown", ver = "";
  const tests = [
    ["Edge", /Edg(?:e|A|iOS)?\/([\d.]+)/], ["Samsung Internet", /SamsungBrowser\/([\d.]+)/],
    ["Opera", /(?:OPR|OPiOS)\/([\d.]+)/], ["Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/],
    ["Chrome", /(?:Chrome|CriOS)\/([\d.]+)/], ["Safari", /Version\/([\d.]+).*Safari/],
  ];
  for (const [name, re] of tests) { const m = ua.match(re); if (m) { browser = name; ver = m[1]; break; } }
  if (/FBAN|FBAV/.test(ua)) browser = "Facebook in-app";
  else if (/Instagram/.test(ua)) browser = "Instagram in-app";

  let type = "desktop";
  if (os === "iPadOS" || /Tablet|iPad/.test(ua) || (os === "Android" && !/Mobile/.test(ua))) type = "tablet";
  else if (/Mobi|iPhone|Android/.test(ua) || (uaData && uaData.mobile)) type = "mobile";

  return {
    type, os, osVersion: clip(osVer && osVer.replace(/_/g, "."), 30), browser, browserVersion: clip(ver, 30),
    model: clip((ua.match(/Android [\d.]+; ([^;)]+?)(?: Build|\))/) || [])[1], 80),
  };
}

// Fire-and-forget. Callers must not await this before letting the user in.
export function logLoginAttempt({ firstName, lastName, matchedParticipant, success, failureReason, pinEntered }) {
  (async () => {
    try {
      const geo = await lookupGeo();
      const entry = {
        firstName: clip(firstName, 100) ?? "",
        lastName: clip(lastName, 100) ?? "",
        matchedParticipant: matchedParticipant || null,
        success: !!success,
        failureReason: success ? null : clip(failureReason, 100),
        clientTime: new Date().toISOString(),
        ip: geo ? geo.ip : null,
        geo,
        userAgent: clip(navigator.userAgent, 500),
        device: parseDevice(),
        platform: clip((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform, 60),
        screen: { width: screen.width, height: screen.height, viewportWidth: innerWidth, viewportHeight: innerHeight, pixelRatio: devicePixelRatio || 1 },
        language: clip(navigator.language, 40),
        languages: (navigator.languages || []).slice(0, 5).map((l) => clip(l, 40)),
        timezone: clip(Intl.DateTimeFormat().resolvedOptions().timeZone, 64),
        referrer: clip(document.referrer, 500),
        pageUrl: clip(location.href, 500),
      };
      if (!success) entry.pinEntered = clip(pinEntered, 50) ?? "";
      await writeLoginLog(entry);
    } catch (e) {
      console.warn("login log failed", e);
    }
  })();
}
