import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  doc,
  getDoc,
  type Firestore,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const missingVars = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missingVars.length > 0) {
  console.error('[Firebase] Missing env vars:', missingVars.join(', '));
} else {
  console.log('[Firebase] Config loaded. Project:', firebaseConfig.projectId);
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  db = getFirestore(app);
}

async function testFirestoreConnection() {
  try {
    await getDoc(doc(db, '_ping', 'test'));
    console.log('[Firebase] Firestore connection successful');
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.log('[Firebase] Firestore reachable (rules block _ping - expected)');
    } else {
      console.error('[Firebase] Firestore unreachable:', err?.code, err?.message);
    }
  }
}

testFirestoreConnection();

export { app, db };
