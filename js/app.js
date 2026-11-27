import { findParticipant } from "./participants.js";
import { findAssignment } from "./drawcrypto.js";
import { isConfigured, watchList, saveList } from "./store.js";

const $ = (id) => document.getElementById(id);
const SESSION_KEY = "xmas2026-session";
const TYPES = { "item": "🎁 Item", "amazon-list": "🛒 Amazon list", "idea": "💡 Idea" };

let me = null;        // canonical name
let myItems = [];
let editingId = null;
let draw = null;
const unsubs = [];

async function loadDraw() {
  if (!draw) draw = await (await fetch("draw.json", { cache: "no-cache" })).json();
  return draw;
}

function show(view) {
  $("login-view").hidden = view !== "login";
  $("home-view").hidden = view !== "home";
  $("logout").hidden = view !== "home";
}

async function login(first, last, pin, remember = true) {
  const name = findParticipant(first, last);
  if (!name) throw new Error("Hmm, we couldn't find that name in this year's exchange. Check the spelling?");
  const recipient = await findAssignment(await loadDraw(), name, pin);
  if (!recipient) throw new Error("That PIN doesn't look right. Try again!");
  if (remember) localStorage.setItem(SESSION_KEY, JSON.stringify({ name, pin: String(pin).trim() }));
  me = name;
  renderHome(recipient);
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  unsubs.splice(0).forEach((u) => u && u());
  me = null; myItems = []; editingId = null;
  $("login-form").reset();
  $("item-form").hidden = true;
  show("login");
}

function renderHome(recipient) {
  $("me-first").textContent = me.split(" ")[0];
  $("recipient").textContent = recipient;
  $("recipient-first").textContent = recipient.split(" ")[0];
  show("home");

  if (!isConfigured()) {
    $("setup-banner").hidden = false;
    $("add-btn").disabled = true;
    renderItems($("their-list"), [], false, "Wishlists aren't open yet. Check back soon!");
    renderItems($("my-list"), [], true, "Wishlists aren't open yet.");
    return;
  }
  $("setup-banner").hidden = true;
  const onErr = (el) => (e) => {
    console.error(e);
    el.innerHTML = "";
    el.append(li("empty error", "Couldn't load this list. Please refresh and try again."));
  };
  renderItems($("their-list"), null, false);
  renderItems($("my-list"), null, true);
  watchList(recipient, (items) => renderItems($("their-list"), items, false,
    `${recipient.split(" ")[0]} hasn't added anything yet. Check back later! 🎄`), onErr($("their-list")))
    .then((u) => unsubs.push(u)).catch(onErr($("their-list")));
  watchList(me, (items) => { myItems = items; renderItems($("my-list"), items, true,
    "Your list is empty. Add a few ideas so your Secret Santa knows what you'd love!"); }, onErr($("my-list")))
    .then((u) => unsubs.push(u)).catch(onErr($("my-list")));
}

function li(cls, text) {
  const el = document.createElement("li");
  el.className = cls;
  el.textContent = text;
  return el;
}

function safeUrl(u) {
  try {
    const url = new URL(u);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch { return null; }
}

function renderItems(ul, items, mine, emptyText = "") {
  ul.innerHTML = "";
  if (items === null) { ul.append(li("empty", "Loading…")); return; }
  if (!items.length) { ul.append(li("empty", emptyText)); return; }
  for (const it of items) {
    const row = document.createElement("li");
    row.className = "item";
    const head = document.createElement("div");
    head.className = "item-head";
    const badge = document.createElement("span");
    badge.className = `badge ${it.type}`;
    badge.textContent = TYPES[it.type] || TYPES.item;
    const title = document.createElement("strong");
    title.textContent = it.title;
    head.append(badge, title);
    row.append(head);

    const url = it.link && safeUrl(it.link);
    if (url) {
      const a = document.createElement("a");
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
      a.className = "item-link";
      a.textContent = it.type === "amazon-list" ? "Open wish list ↗" : "View item ↗";
      row.append(a);
    }
    const meta = [it.price && `Price: ${it.price}`, it.size && `Size: ${it.size}`].filter(Boolean).join(" · ");
    if (meta) { const m = document.createElement("p"); m.className = "meta"; m.textContent = meta; row.append(m); }
    if (it.notes) { const n = document.createElement("p"); n.className = "notes"; n.textContent = it.notes; row.append(n); }

    if (mine) {
      const actions = document.createElement("div");
      actions.className = "row end";
      const edit = document.createElement("button");
      edit.className = "btn small-btn"; edit.textContent = "Edit";
      edit.onclick = () => openForm(it);
      const del = document.createElement("button");
      del.className = "btn small-btn danger"; del.textContent = "Delete";
      del.onclick = async () => {
        if (!confirm(`Remove "${it.title}" from your list?`)) return;
        await persist(myItems.filter((x) => x.id !== it.id));
      };
      actions.append(edit, del);
      row.append(actions);
    }
    ul.append(row);
  }
}

function openForm(item = null) {
  const f = $("item-form");
  f.reset();
  $("item-error").textContent = "";
  editingId = item ? item.id : null;
  if (item) {
    f.elements.type.value = item.type || "item";
    for (const k of ["title", "link", "notes", "price", "size"]) f.elements[k].value = item[k] || "";
  }
  $("save-btn").textContent = item ? "Save changes" : "Add to my list";
  f.hidden = false;
  f.elements.title.focus();
  f.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function persist(items) {
  try {
    await saveList(me, items);
    return true;
  } catch (e) {
    console.error(e);
    alert("Sorry, that didn't save. Check your connection and try again.");
    return false;
  }
}

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("login-error").textContent = "";
  $("login-btn").disabled = true;
  $("login-btn").textContent = "Checking the list twice…";
  try {
    await login($("first").value, $("last").value, $("pin").value);
  } catch (err) {
    $("login-error").textContent = err.message;
  } finally {
    $("login-btn").disabled = false;
    $("login-btn").textContent = "Open my gift tag 🎁";
  }
});

$("logout").onclick = logout;
$("add-btn").onclick = () => openForm();
$("cancel-btn").onclick = () => { $("item-form").hidden = true; editingId = null; };

$("item-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  const link = f.elements.link.value.trim();
  if (link && !safeUrl(link)) { $("item-error").textContent = "Links need to start with https://"; return; }
  if (f.elements.type.value === "amazon-list" && !link) { $("item-error").textContent = "Paste your Amazon wish list link."; return; }
  const item = {
    id: editingId || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    type: f.elements.type.value,
    title: f.elements.title.value.trim(),
    link,
    notes: f.elements.notes.value.trim(),
    price: f.elements.price.value.trim(),
    size: f.elements.size.value.trim(),
  };
  if (!item.title) { $("item-error").textContent = "Give it a title."; return; }
  const items = editingId ? myItems.map((x) => (x.id === editingId ? item : x)) : [...myItems, item];
  $("save-btn").disabled = true;
  if (await persist(items)) { f.hidden = true; editingId = null; }
  $("save-btn").disabled = false;
});

// Auto-fill title when choosing Amazon list
document.querySelectorAll('input[name="type"]').forEach((r) =>
  r.addEventListener("change", () => {
    const t = $("item-form").elements.title;
    if (r.checked && r.value === "amazon-list" && !t.value) t.value = "My Amazon wish list";
  })
);

// Restore session
(async () => {
  const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  if (saved) {
    try { await login(saved.name, "", saved.pin, false); return; } catch { localStorage.removeItem(SESSION_KEY); }
  }
  show("login");
})();
