// ============================================================
// Firebase Configuration – Lycia's Touch
// Replace the firebaseConfig values below with your own from
// Firebase Console → Project Settings → Your Apps → Web App
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDo5tLj598E4-43TM1gv7qEYNWtPmptCwU",
  authDomain: "lycia-s-touch.firebaseapp.com",
  projectId: "lycia-s-touchlycia-s-touch",
  storageBucket: "lycia-s-touch.firebasestorage.app",
  messagingSenderId: "550526528861",
  appId: "1:550526528861:web:d3c46c493def36e67bccb4",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
