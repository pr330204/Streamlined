
"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { UsernameDialog } from '@/components/username-dialog';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, updateDoc, increment, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import type { User } from '@/lib/types';
import { initializeFCM } from '@/lib/firebase-messaging';

interface UserContextType {
  user: User | null;
  setUser: (name: string) => void;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const UserContext = createContext<UserContextType | null>(null);

function getUserId(): string {
    let userId = localStorage.getItem('userId');
    if (!userId) {
        userId = uuidv4();
        localStorage.setItem('userId', userId);
    }
    return userId;
}

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    const userId = getUserId();
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data() as Omit<User, 'id'>;
      const userWithId = { id: userId, ...userData };
      setUserState(userWithId);
      initializeFCM(userWithId); // Initialize FCM and save token
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Coin increment effect
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const userRef = doc(db, "users", user.id);
      await updateDoc(userRef, {
        coins: increment(1)
      });
      // Optimistically update local state
      setUserState(prevUser => prevUser ? { ...prevUser, coins: (prevUser.coins ?? 0) + 1 } : null);
    }, 300000); // 5 minutes in milliseconds

    return () => clearInterval(interval);
  }, [user]);

  const setUser = async (name: string) => {
    setError(null);
    setLoading(true);
    const userId = getUserId();
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("name", "==", name));

    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            setError("Username already exists. Please choose another one.");
            setLoading(false);
            return;
        }

        const newUser: User = { id: userId, name, coins: 0 };
        await setDoc(doc(db, "users", userId), { name: newUser.name, coins: newUser.coins }, { merge: true });
        setUserState(newUser);
        initializeFCM(newUser); // Initialize FCM and save token for new user
    } catch(err) {
        console.error("Error saving user to Firestore: ", err);
        setError("An error occurred. Please try again.");
    } finally {
        setLoading(false);
    }
  };

  const logout = async () => {
    const userId = localStorage.getItem('userId');
    if (userId) {
        try {
            // Optional: You might want to remove the FCM token from the user doc on logout
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { fcmToken: "" });
            // Or delete the user doc entirely if that's the desired behavior
            // await deleteDoc(doc(db, "users", userId));
        } catch (err) {
            console.error("Error updating user on logout: ", err);
        } finally {
            localStorage.removeItem('userId');
            setUserState(null);
        }
    }
  };

  if (loading && !user) {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-foreground">
            <p>Loading...</p>
        </div>
    );
  }

  return (
    <UserContext.Provider value={{ user, setUser, logout, loading, error }}>
      {!user ? <UsernameDialog /> : children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
