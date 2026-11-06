// Firebase: đăng nhập Google (chỉ quyền cơ bản, không cần quyền Drive) + Firestore.
// Các giá trị dưới đây là cấu hình công khai của app web (không phải bí mật);
// việc chặn người lạ do Firestore Security Rules đảm nhiệm.
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDTW6vXaLwNuDqPoNRBAbiumaJJdUVGvyA',
  authDomain: 'slothful-chilling.firebaseapp.com',
  projectId: 'slothful-chilling',
  storageBucket: 'slothful-chilling.firebasestorage.app',
  messagingSenderId: '443022889877',
  appId: '1:443022889877:web:f5baf9db37548c8a33dc9c',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Cache bền trong IndexedDB: chương đã đọc đọc lại được ngay, và đọc được cả khi mất mạng
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

const toAppUser = (u: User): AppUser => ({
  uid: u.uid,
  displayName: u.displayName,
  email: u.email,
  photoURL: u.photoURL,
});

// Gọi lại mỗi khi trạng thái đăng nhập đổi. Firebase giữ phiên rất lâu (có refresh token),
// nên không bị đăng xuất sau vài ngày như kiểu token Drive trước đây.
export const watchUser = (cb: (user: AppUser | null) => void) =>
  onAuthStateChanged(auth, (u) => cb(u ? toAppUser(u) : null));

export const signInWithGoogle = async (): Promise<AppUser> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return toAppUser(cred.user);
};

export const signOutUser = () => signOut(auth);
