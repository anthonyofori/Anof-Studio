import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from './config';
import { handleFirestoreError, OperationType } from './errorHandling';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        // Sync user profile document
        const userDocRef = doc(db, 'users', user.uid);
        try {
          await setDoc(
            userDocRef,
            {
              userId: user.uid,
              displayName: user.displayName || 'Creator',
              email: user.email || '',
              photoURL: user.photoURL || '',
              createdAt: new Date().toISOString(),
            },
            { merge: true }
          );
        } catch (error) {
          console.warn('Could not sync user profile to Firestore:', error);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error: any) {
      console.error('Sign Out failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
