import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  initializeFirestore,
  onSnapshot,
  orderBy,
  persistentLocalCache,
  persistentMultipleTabManager,
  query,
  setDoc,
  type Firestore
} from "firebase/firestore";
import { DEFAULT_MEDICATIONS, type AuthUser, type DoseLog, type Medication } from "../types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    !String(firebaseConfig.apiKey).includes("your-firebase")
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
  void getRedirectResult(auth).catch(() => undefined);
}

const LOCAL_MEDS_KEY = "peace_local_medications_v1";
const LOCAL_LOGS_KEY = "peace_local_logs_v1";
const LOCAL_MOCK_USER_KEY = "peace_mock_user_v1";

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function subscribeAuth(callback: (user: AuthUser | null) => void): () => void {
  if (auth) {
    try {
      localStorage.removeItem(LOCAL_MOCK_USER_KEY);
    } catch {
      // Ignore
    }
    return onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        callback(null);
      } else {
        callback({
          uid: fbUser.uid,
          displayName: fbUser.displayName,
          email: fbUser.email,
          photoURL: fbUser.photoURL
        });
      }
    });
  }

  callback(readLocal<AuthUser | null>(LOCAL_MOCK_USER_KEY, null));
  return () => {};
}

export async function signInWithGoogle(): Promise<AuthUser | null> {
  if (auth) {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    try {
      const cred = await signInWithPopup(auth, provider);
      return {
        uid: cred.user.uid,
        displayName: cred.user.displayName,
        email: cred.user.email,
        photoURL: cred.user.photoURL
      };
    } catch (err: unknown) {
      const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
      if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
        await signInWithRedirect(auth, provider);
        return null;
      }
      throw err;
    }
  }

  const mockUser: AuthUser = {
    uid: "local-demo-user",
    displayName: "Peace Local",
    email: "local@gmail.com",
    photoURL: null,
    isMock: true
  };
  writeLocal(LOCAL_MOCK_USER_KEY, mockUser);
  return mockUser;
}

export async function signOutUser(): Promise<void> {
  if (auth) {
    await signOut(auth);
    return;
  }
  localStorage.removeItem(LOCAL_MOCK_USER_KEY);
}

export function subscribeMedications(
  uid: string | null,
  onData: (meds: Medication[]) => void
): () => void {
  if (db && uid) {
    const ref = collection(db, "users", uid, "medications");
    const q = query(ref, orderBy("order", "asc"));
    return onSnapshot(q, async (snap) => {
      if (snap.empty) {
        await Promise.all(
          DEFAULT_MEDICATIONS.map((med) => setDoc(doc(db!, "users", uid, "medications", med.id), med))
        );
        onData(DEFAULT_MEDICATIONS);
        return;
      }
      const list = snap.docs.map((d) => ({ ...(d.data() as Medication), id: d.id }));
      list.sort((a, b) => a.order - b.order);
      onData(list);
    });
  }

  const localMeds = readLocal<Medication[]>(LOCAL_MEDS_KEY, DEFAULT_MEDICATIONS);
  if (!localStorage.getItem(LOCAL_MEDS_KEY)) {
    writeLocal(LOCAL_MEDS_KEY, DEFAULT_MEDICATIONS);
  }
  onData(localMeds);
  return () => {};
}

export function subscribeLogs(uid: string | null, onData: (logs: DoseLog[]) => void): () => void {
  if (db && uid) {
    const ref = collection(db, "users", uid, "logs");
    const q = query(ref, orderBy("timestamp", "desc"));
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as DoseLog), id: d.id }));
      onData(list);
    });
  }

  const localLogs = readLocal<DoseLog[]>(LOCAL_LOGS_KEY, []);
  onData(localLogs.sort((a, b) => b.timestamp - a.timestamp));
  return () => {};
}

export async function saveMedication(uid: string | null, medication: Medication): Promise<void> {
  if (db && uid) {
    await setDoc(doc(db, "users", uid, "medications", medication.id), medication);
    return;
  }
  const current = readLocal<Medication[]>(LOCAL_MEDS_KEY, DEFAULT_MEDICATIONS);
  const updated = current.some((m) => m.id === medication.id)
    ? current.map((m) => (m.id === medication.id ? medication : m))
    : [...current, medication];
  writeLocal(LOCAL_MEDS_KEY, updated);
}

export async function saveDoseLog(uid: string | null, log: DoseLog): Promise<void> {
  if (db && uid) {
    await setDoc(doc(db, "users", uid, "logs", log.id), log);
    return;
  }
  const current = readLocal<DoseLog[]>(LOCAL_LOGS_KEY, []);
  const updated = current.some((l) => l.id === log.id)
    ? current.map((l) => (l.id === log.id ? log : l))
    : [log, ...current];
  writeLocal(LOCAL_LOGS_KEY, updated);
}

export async function deleteDoseLog(uid: string | null, logId: string): Promise<void> {
  if (db && uid) {
    await deleteDoc(doc(db, "users", uid, "logs", logId));
    return;
  }
  const current = readLocal<DoseLog[]>(LOCAL_LOGS_KEY, []);
  writeLocal(
    LOCAL_LOGS_KEY,
    current.filter((l) => l.id !== logId)
  );
}

