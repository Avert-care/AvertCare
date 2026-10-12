"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "../lib/firebase";

export interface ClinicianUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  isDemo?: boolean;
}

interface AuthContextType {
  user: ClinicianUser | null;
  loading: boolean;
  token: string | null;
  loginDemo: (email?: string) => void;
  getFreshToken: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const STORAGE_KEY = "avertcare_clinician_session";

const TOKEN_STORAGE_KEY = "avertcare_token";

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  token: null,
  loginDemo: () => {},
  getFreshToken: async () => "dev-clinician-token",
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ClinicianUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  // Check saved persistent session on initial mount
  useEffect(() => {
    let initialUser: ClinicianUser | null = null;
    let initialToken: string | null = null;

    try {
      const savedUser = localStorage.getItem(STORAGE_KEY);
      if (savedUser) {
        initialUser = JSON.parse(savedUser);
        setUser(initialUser);
      }
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (savedToken) {
        initialToken = savedToken;
        setToken(savedToken);
      } else if (initialUser) {
        setToken("dev-clinician-token");
      }
    } catch {
      // Ignore localStorage errors
    }

    // Listen to Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const jwt = await fbUser.getIdToken();
          setToken(jwt);
          const clinicianUser: ClinicianUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName || "Dr. Clinician",
            isDemo: false,
          };
          setUser(clinicianUser);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(clinicianUser));
          localStorage.setItem(TOKEN_STORAGE_KEY, jwt);
        } catch {
          // If token fetch fails, keep current session
        }
      } else {
        // Only clear if no saved persistent session
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) {
          setUser(null);
          setToken(null);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getFreshToken = useCallback(async (): Promise<string> => {
    try {
      let fbUser: User | null = auth.currentUser;
      if (!fbUser) {
        // If Firebase is initializing on cold load, wait briefly for authStateReady
        await Promise.race([
          auth.authStateReady(),
          new Promise((resolve) => setTimeout(resolve, 800)),
        ]);
        fbUser = auth.currentUser;
      }

      if (fbUser) {
        const freshJwt = await fbUser.getIdToken(false);
        setToken(freshJwt);
        if (typeof window !== "undefined") {
          localStorage.setItem(TOKEN_STORAGE_KEY, freshJwt);
        }
        return freshJwt;
      }
    } catch (err) {
      console.warn("Silent token refresh error, falling back to cached token", err);
    }

    // 2. Check localStorage saved token
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (cached) return cached;
    }

    // 3. Check memory token or persistent session
    if (token) return token;
    return "dev-clinician-token";
  }, [token]);

  const loginDemo = useCallback((email: string = "doctor@avertcare.local") => {
    const demoUser: ClinicianUser = {
      uid: "clinician-persisted-session",
      email,
      displayName: "Dr. Clinician (Persistent Session)",
      isDemo: true,
    };
    setUser(demoUser);
    setToken("dev-clinician-token");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demoUser));
      localStorage.setItem(TOKEN_STORAGE_KEY, "dev-clinician-token");
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch {
      // Ignore
    }
    try {
      await firebaseSignOut(auth);
    } catch {
      // Ignore
    }
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, token, loginDemo, getFreshToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
