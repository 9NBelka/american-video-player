import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; // Импортируем getAuth для аутентификации

const firebaseConfig = {
  apiKey: 'AIzaSyDDNQg46t_eyi5vaaGf97kQPHI0qz2D8j4',
  authDomain: 'k-syndicate.firebaseapp.com',
  projectId: 'k-syndicate',
  storageBucket: 'k-syndicate.firebasestorage.app',
  messagingSenderId: '348161030150',
  appId: '1:348161030150:web:2d544e1a390004883bab87',
  measurementId: 'G-B1HF4BS8KP',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // Инициализируем объект аутентификации

export { db, auth }; // Экспортируем и db, и auth
