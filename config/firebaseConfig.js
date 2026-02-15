// ═══════════════════════════════════════════════════════════════
// FIREBASE CONFIGURATION (EXPO SAFE)
// Authentication + Firestore
// ═══════════════════════════════════════════════════════════════

import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ═══════════════════════════════════════════════════════════════
// Firebase Project Configuration
// Firebase Console → Project Settings → Your Apps
// ═══════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyAbUc1y3rh_cU2zn-JOmwoWVKZFOMc4xRk",
  authDomain: "loaneligibilitycreditscoring.firebaseapp.com",
  projectId: "loaneligibilitycreditscoring",
  storageBucket: "loaneligibilitycreditscoring.firebasestorage.app",
  messagingSenderId: "910946341679",
  appId: "1:910946341679:web:ef9c87923199c468a307da",
};

// ═══════════════════════════════════════════════════════════════
// Prevent Firebase duplicate initialization (VERY IMPORTANT)
// ═══════════════════════════════════════════════════════════════
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApp();

// Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);

console.log("✅ Firebase initialized successfully (Expo)");

export { app, auth, db };

