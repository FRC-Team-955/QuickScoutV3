// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgz7UxQDWfnUziFLysof6FPNijTFJ42XQ",
  authDomain: "quickscoutv3.firebaseapp.com",
  projectId: "quickscoutv3",
  storageBucket: "quickscoutv3.firebasestorage.app",
  messagingSenderId: "633493860611",
  appId: "1:633493860611:web:d8d881ee8de45073747936"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
