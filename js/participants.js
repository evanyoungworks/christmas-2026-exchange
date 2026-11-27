// Everyone in the Christmas 2026 exchange.
export const PARTICIPANTS = [
  "Michelle Young",
  "Doug Young",
  "Eric Young",
  "Beth Young",
  "Evan Young",
  "Anna Toner",
];

// 2025 draw (giver -> receiver). Used only to make sure nobody repeats.
export const LAST_YEAR = {
  "Michelle Young": "Beth Young",
  "Doug Young": "Anna Toner",
  "Eric Young": "Doug Young",
  "Beth Young": "Evan Young",
  "Evan Young": "Eric Young",
  "Anna Toner": "Michelle Young",
};

// "  eVan   young " -> "evan young"
export function normalizeName(first, last = "") {
  return `${first} ${last}`.trim().replace(/\s+/g, " ").toLowerCase();
}

// Returns the canonical participant name, or null.
export function findParticipant(first, last) {
  const n = normalizeName(first, last);
  return PARTICIPANTS.find((p) => normalizeName(p) === n) || null;
}

// Stable id used as the wishlist document id, e.g. "evan-young".
export function personId(name) {
  return normalizeName(name).replace(/[^a-z0-9]+/g, "-");
}
