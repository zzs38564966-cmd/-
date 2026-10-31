/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider, testFirestoreConnection } from '../lib/firebase';
import {
  getOrCreateUserProfile,
  updateUserOnboarding,
  UserProfileData,
} from '../services/firestoreService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfileData | null;
  loading: boolean;
  isNewUser: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const { profile, isNewUser: isNew } = await getOrCreateUserProfile(user.uid, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
          });
          setUserProfile(profile);
          setIsNewUser(isNew);
        } catch (err) {
          console.error('Failed to load user profile from Firestore:', err);
        }
      } else {
        setUserProfile(null);
        setIsNewUser(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Sign-in failed:', error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async () => {
    if (!currentUser) return;
    try {
      await updateUserOnboarding(currentUser.uid, true);
      setUserProfile((prev) => (prev ? { ...prev, hasCompletedOnboarding: true } : null));
      setIsNewUser(false);
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    }
  };

  const refreshProfile = async () => {
    if (!currentUser) return;
    try {
      const { profile } = await getOrCreateUserProfile(currentUser.uid, {
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
      });
      setUserProfile(profile);
    } catch (err) {
      console.error('Failed to refresh user profile:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        isNewUser,
        loginWithGoogle,
        logout,
        completeOnboarding,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
