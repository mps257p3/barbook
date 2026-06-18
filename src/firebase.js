import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCJoYH_adR6ExriM6-Vq4o-Aathh1TxRTU",
  authDomain: "on-the-rocks-2ef88.firebaseapp.com",
  projectId: "on-the-rocks-2ef88",
  storageBucket: "on-the-rocks-2ef88.firebasestorage.app",
  messagingSenderId: "262719751691",
  appId: "1:262719751691:web:c8ae9bba551880d1dae90e"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err) {
    if (err.code === "auth/popup-blocked") {
      return signInWithRedirect(auth, googleProvider);
    }
    throw err;
  }
};

export { getRedirectResult };
export const signOutUser = () => signOut(auth);
