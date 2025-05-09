import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyDRZFK4nWVtUhQJSc5wwBKGQ-r7T4DyZk0",
  authDomain: "mccoreclient.firebaseapp.com",
  projectId: "mccoreclient",
  storageBucket: "mccoreclient.firebasestorage.app",
  messagingSenderId: "525052562127",
  appId: "1:525052562127:web:53d51dd9a19a06cec245ba",
  measurementId: "G-8698CM8NQG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);
const functions = getFunctions(app);

export { firestore, auth, functions };
