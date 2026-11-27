// Shared by the browser and the Node scripts.
// Each giver's assignment is AES-GCM encrypted with a key derived (PBKDF2)
// from their normalized name + PIN, so draw.json never shows pairs in plain text.
import { normalizeName } from "./participants.js";

const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

export const toB64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
export const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function deriveKey(name, pin, saltB64, iterations) {
  const material = await subtle.importKey(
    "raw",
    enc.encode(`${normalizeName(name)}|${String(pin).trim()}`),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return subtle.deriveKey(
    { name: "PBKDF2", salt: fromB64(saltB64), iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptEntry(key, payload) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(payload)));
  return { iv: toB64(iv), ct: toB64(ct) };
}

// Tries every (unlabeled) entry; only the giver's own one decrypts.
export async function findAssignment(draw, name, pin) {
  const key = await deriveKey(name, pin, draw.salt, draw.iterations);
  for (const e of draw.entries) {
    try {
      const pt = await subtle.decrypt({ name: "AES-GCM", iv: fromB64(e.iv) }, key, fromB64(e.ct));
      const data = JSON.parse(dec.decode(pt));
      if (normalizeName(data.giver) === normalizeName(name)) return data.recipient;
    } catch {
      /* not this giver's entry */
    }
  }
  return null;
}
