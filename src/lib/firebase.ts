import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signOut as firebaseSignOut,
} from "firebase/auth";

/** Web config is public by design — it ships in every client bundle. */
const firebaseConfig = {
  apiKey: "AIzaSyAaqFVLRVsq88oKGYtj4SRLok6o5PVM_B8",
  authDomain: "lebiscuit-2dbe9.firebaseapp.com",
  databaseURL: "https://lebiscuit-2dbe9.firebaseio.com",
  projectId: "lebiscuit-2dbe9",
  storageBucket: "lebiscuit-2dbe9.firebasestorage.app",
  messagingSenderId: "124767243679",
  appId: "1:124767243679:web:0600ef42b96f5da04281aa",
  measurementId: "G-60XXQQJCWR",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

/**
 * `passkeyLogin` returns a Firebase **custom token**, which only authenticates
 * against Firebase. VTEX needs the **ID token** that comes out of that sign in,
 * so the exchange here is not optional.
 */
export async function exchangeCustomTokenForIdToken(customToken: string) {
  const credential = await signInWithCustomToken(auth, customToken);
  return credential.user.getIdToken();
}

/**
 * Firebase keeps its own session in IndexedDB, independent of the VTEX cookie.
 * Without this, signing out leaves `auth.currentUser` behind and the next
 * visitor on the device inherits a live Firebase identity.
 */
export const signOutFirebase = () =>
  firebaseSignOut(auth).catch(() => undefined);
