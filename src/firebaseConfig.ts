// Firebase configurations from environment variables or sandbox fallbacks
const isSandbox = (import.meta.env.VITE_FIREBASE_PROJECT_ID || "digital-kamar") === "symbolic-seeker-84jp1";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAw9dkax6UMTpBF-ErxFsjLL9z8q7UNaPw",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "digital-kamar.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "digital-kamar",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "digital-kamar.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "80678990857",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:80678990857:web:c812fb2efb382fc59134d8",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || (isSandbox ? "ai-studio-ee547f30-1dd6-433a-b04c-737af7e99c3d" : "(default)")
};

export default firebaseConfig;
