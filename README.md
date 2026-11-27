# 🎄 Christmas 2026 Family Gift Exchange

A tiny, mobile-friendly Secret Santa site for the family.

**Live site:** https://evanyoungworks.github.io/christmas-2026-exchange/

Everyone logs in with their **first name, last name, and PIN `2026`**. They see:

1. **Who they're buying for**, plus that person's wishlist.
2. **Their own wishlist**, where they can add, edit, or delete ideas (an Amazon wish list link, a link to a specific item, or just a description, with optional notes, price, and size).

Nobody can see anyone else's draw, and nobody sees who drew them.

## ✅ Shared wishlists (Firebase) — already set up

Wishlists are stored in the Firebase project **`christmas-2026-exchange`** (Firestore, `nam5`). `config.js` is filled in and the rules are deployed. To change the rules later: edit `firestore.rules` and run `npx firebase-tools deploy --only firestore:rules`.

<details><summary>How it was set up (for reference / a fresh project)</summary>


1. Go to <https://console.firebase.google.com> and sign in with any Google account.
2. Click **Create a project**, name it something like `christmas-2026-exchange`, and turn **off** Google Analytics. Click **Create project**.
3. In the left menu open **Build → Firestore Database → Create database**. Pick any location, choose **Start in production mode**, and click **Create**.
4. Open the **Rules** tab, delete what's there, paste in everything from [`firestore.rules`](firestore.rules), and click **Publish**.
5. Click the ⚙️ gear (top left) → **Project settings** → under *Your apps* click the **`</>`** (Web) icon. Give it any nickname, leave Hosting unchecked, and click **Register app**. Copy the `firebaseConfig = { ... }` block it shows you.
6. On GitHub, open [`config.js`](config.js), click the ✏️ pencil, and replace `export const firebaseConfig = null;` with:
   ```js
   export const firebaseConfig = {
     apiKey: "...",
     authDomain: "...",
     projectId: "...",
     storageBucket: "...",
     messagingSenderId: "...",
     appId: "...",
   };
   ```
   (paste your own values), then click **Commit changes**. The site updates in about a minute.

</details>

The Firebase web config is meant to be public, so it's fine to commit; the rules in `firestore.rules` only allow the six family wishlists to be read and written.

## How the draw is kept secret

- The 2026 draw was generated randomly by `scripts/generate-draw.mjs` and was **never printed** anywhere.
- Rules: everyone gives once and receives once, nobody draws themselves, and nobody gets the same person as in 2025.
- `draw.json` holds six unlabeled, encrypted entries. Each person's entry is encrypted (AES-GCM) with a key derived from their name + PIN, so the repo never shows pairs in plain text. The site decrypts only the entry for the person logging in.
- Honest caveat: since everyone shares the same PIN, a determined techie could decrypt someone else's entry by typing in their name. This is a friendly family exchange, not a bank. 😉

## Checking the draw (prints only PASS/FAIL)

```bash
npm test          # checks the rules without revealing any pairs
```

To redraw (changes everyone's assignment): `node scripts/generate-draw.mjs --force`, then `npm test`, commit, and push.

## Files

| File | What it is |
| --- | --- |
| `index.html`, `styles.css`, `js/app.js` | The site |
| `config.js` | Your Firebase web config (the only thing you edit) |
| `js/participants.js` | Names and the 2025 draw |
| `js/drawcrypto.js` | Encrypt/decrypt helpers used by the site and scripts |
| `js/store.js` | Wishlist storage (Firestore) |
| `draw.json` | The encrypted 2026 draw |
| `firestore.rules` | Database security rules to paste into Firebase |
| `scripts/` | Draw generator and PASS/FAIL checks |
