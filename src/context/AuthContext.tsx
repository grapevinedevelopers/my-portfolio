// src/context/AuthContext.tsx
'use client';

import type { User } from 'firebase/auth';
import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase'; // Import your Firebase auth instance

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authInitialized: boolean; // Add state to track if auth object is available
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authInitialized: false, // Default to false
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    // Check if the auth object was initialized successfully
    if (auth) {
      console.log("AuthContext: Firebase Auth object available, initializing listener.");
      setAuthInitialized(true);
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        if (currentUser) {
            console.log("AuthContext: User signed IN:", currentUser.uid, currentUser.email);
        } else {
             console.log("AuthContext: User signed OUT.");
        }
        setUser(currentUser);
        setLoading(false);
      }, (error) => { // Add error handling for the listener itself
          console.error("AuthContext: Error in onAuthStateChanged listener:", error);
          setUser(null); // Ensure user is null on error
          setLoading(false);
          setAuthInitialized(false); // Consider auth failed if listener errors
      });

      // Cleanup subscription on unmount
      return () => {
          console.log("AuthContext: Cleaning up auth state listener.");
          unsubscribe();
      }
    } else {
       // Auth object failed to initialize (likely missing config or network issue during init)
       console.error("AuthContext: Firebase Auth object is NOT available. Authentication features will be disabled.");
       setLoading(false); // Stop loading, but auth won't work
       setAuthInitialized(false);
       // No need to unsubscribe as listener was never attached
    }
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <AuthContext.Provider value={{ user, loading, authInitialized }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
