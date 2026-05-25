// Firebase configurations from environment variables or sandbox fallbacks
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyC-PgL1KU3gN4ioKSsFTUP849YYazGM0_k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "symbolic-seeker-84jp1.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "symbolic-seeker-84jp1",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "symbolic-seeker-84jp1.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "650925107890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:650925107890:web:d7599764efea87680637ab",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || "ai-studio-ee547f30-1dd6-433a-b04c-737af7e99c3d"
};

export default firebaseConfig;
