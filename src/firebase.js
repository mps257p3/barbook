import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signOut, signInAnonymously, linkWithPopup, linkWithRedirect, signInWithCredential } from "firebase/auth";
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

// Login anônimo — garante que qualquer pessoa (mesmo sem logar no Google)
// consiga ler o Firestore (Biblioteca Inicial). Sem isto, usuários que nunca
// logam veem 0 receitas (as regras exigem autenticação para qualquer leitura).
export const signInAnonymouslyIfNeeded = () => signInAnonymously(auth);

export const signInWithGoogle = async () => {
  // Se já está numa sessão anônima, faz o UPGRADE dela para Google (linkWithPopup)
  // em vez de logar do zero — preserva o mesmo uid, e com ele favoritos/comanda/
  // bar já feitos anonimamente (o app sincroniza esses dados em users/{uid}).
  if (auth.currentUser?.isAnonymous) {
    try {
      return await linkWithPopup(auth.currentUser, googleProvider);
    } catch (err) {
      if (err.code === "auth/credential-already-in-use") {
        // a conta Google já tem histórico próprio (login anterior noutro
        // aparelho) — troca para essa conta existente; os dados desta sessão
        // anônima ficam órfãos (comportamento padrão do Firebase Auth)
        const cred = GoogleAuthProvider.credentialFromError(err);
        if (cred) return await signInWithCredential(auth, cred);
      }
      if (err.code === "auth/popup-blocked") {
        return linkWithRedirect(auth.currentUser, googleProvider);
      }
      throw err;
    }
  }
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
