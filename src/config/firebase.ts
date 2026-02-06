import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAmdYvcY8nqg7yOAJBSVBEoI_yyirCI-3U",
    authDomain: "yaya-35423.firebaseapp.com",
    projectId: "yaya-35423",
    storageBucket: "yaya-35423.firebasestorage.app",
    messagingSenderId: "145777521769",
    appId: "1:145777521769:web:b7f5a49979fa361fc81ef8",
    measurementId: "G-M5B4J9K834"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Analytics is optional and may not work in all environments
let analytics = null;
isSupported().then(supported => {
    if (supported) {
        analytics = getAnalytics(app);
    }
});

export { app, db, auth, analytics };
