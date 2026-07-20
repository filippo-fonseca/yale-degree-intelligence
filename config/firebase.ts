"use client";

import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCzGSr5WcXM2hgwMwC5qtnIYo_p6Zekpi8",
  authDomain: "yale-degree-intelligence.firebaseapp.com",
  projectId: "yale-degree-intelligence",
  storageBucket: "yale-degree-intelligence.firebasestorage.app",
  messagingSenderId: "105610316211",
  appId: "1:105610316211:web:93985e9eea666b0fa8a3c6",
  measurementId: "G-3SZLG7BBL4",
};

export const isFirebaseConfigured = true;

const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
