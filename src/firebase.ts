import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); // Use the firestoreDatabaseId from the config
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Connection test removed to conserve Firestore daily read quota
export { signInWithPopup, onAuthStateChanged, signOut };

