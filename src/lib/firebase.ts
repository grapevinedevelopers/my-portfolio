// src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// Read configuration from environment variables
// Ensure these variables are set in your .env.local file for local development
// and in your hosting environment for production.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  // databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // Not typically needed for Firestore
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID // Optional
};

// Validate essential configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("Firebase configuration error: Missing essential environment variables (NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID). Check your .env.local file or hosting environment variables.");
}

// Initialize Firebase App
let app: FirebaseApp | null = null;
let db: any = null; // Use 'any' or a more specific type if available
let auth: any = null; // Use 'any' or 'Auth' from 'firebase/auth'
let storage: any = null; // Use 'any' or 'FirebaseStorage' from 'firebase/storage'

try {
  if (!getApps().length && firebaseConfig.apiKey && firebaseConfig.projectId) { // Check if config is valid before initializing
    app = initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully.");
  } else if (getApps().length > 0) {
    app = getApps()[0]; // Use the already initialized app
    console.log("Firebase already initialized.");
  } else {
     // Log error but don't throw, allows app to run partially if needed
     console.error("Could not initialize Firebase: Invalid or incomplete configuration.");
  }

  // Initialize Firebase services conditionally based on app initialization
  if (app) {
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app); // Initialize storage
    console.log("Firestore, Auth, and Storage services initialized.");
  } else {
    console.warn("Firebase services (Firestore, Auth, Storage) could not be initialized because Firebase app initialization failed.");
  }
} catch (error: any) {
  console.error("Firebase initialization failed:", error);
  console.error("Error Code:", error.code);
  console.error("Error Message:", error.message);
  // Handle initialization error appropriately. app, db, auth, storage will remain null.
}

// Export the instances (they might be null if initialization failed)
export { app, db, auth, storage };
