// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAfKq3_PeV4lwEzSG9nV6AlH8fA3IaJ6Ew",
  authDomain: "malvin-df21d.firebaseapp.com",
  projectId: "malvin-df21d",
  storageBucket: "malvin-df21d.firebasestorage.app",
  messagingSenderId: "581592622100",
  appId: "1:581592622100:web:9471d95a5e758424a53301"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();