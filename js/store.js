// Wishlist storage (Firebase Firestore). One document per person: wishlists/{personId}.
import { firebaseConfig } from "../config.js";
import { personId } from "./participants.js";

const FB = "https://www.gstatic.com/firebasejs/10.12.2";
let db, fs;

export const isConfigured = () => !!(firebaseConfig && firebaseConfig.projectId);

async function init() {
  if (db) return;
  const { initializeApp } = await import(`${FB}/firebase-app.js`);
  fs = await import(`${FB}/firebase-firestore.js`);
  db = fs.getFirestore(initializeApp(firebaseConfig));
}

// Calls cb(items) now and whenever the list changes. Returns an unsubscribe fn.
export async function watchList(name, cb, onError) {
  await init();
  return fs.onSnapshot(
    fs.doc(db, "wishlists", personId(name)),
    (snap) => cb((snap.exists() && snap.data().items) || []),
    onError
  );
}

export async function saveList(name, items) {
  await init();
  await fs.setDoc(fs.doc(db, "wishlists", personId(name)), {
    name,
    items,
    updatedAt: fs.serverTimestamp(),
  });
}
