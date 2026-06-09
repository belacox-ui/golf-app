import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCk445EUjxoHXFaWycczyu05tbaMHgllSU",
  authDomain: "golf-app-7cbd6.firebaseapp.com",
  projectId: "golf-app-7cbd6",
  storageBucket: "golf-app-7cbd6.firebasestorage.app",
  messagingSenderId: "1024451312192",
  appId: "1:1024451312192:web:d2612a2fbcb9bb16e9fda5"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);