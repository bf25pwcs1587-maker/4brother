import React, { createContext, useContext, useState, useEffect } from 'react';
import { Brother } from '../types/index.ts';
import { api, tokenStorage } from '../lib/api.ts';

interface AuthContextType {
  user: Brother | null;
  token: string | null;
  isLoading: boolean;
  familyMembers: Brother[];
  error: string | null;
  login: (emailOrKey: string, passcode: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: { email?: string; avatar_url?: string | null; phone_number?: string; full_name?: string }) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Brother | null>(tokenStorage.getUser());
  const [token, setToken] = useState<string | null>(tokenStorage.get());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [familyMembers, setFamilyMembers] = useState<Brother[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = async () => {
    try {
      const members = await api.auth.getFamilyMembers();
      setFamilyMembers(members);
    } catch (err: any) {
      console.error('Failed to load family members:', err);
    }
  };

  const refreshUser = async () => {
    const currentToken = tokenStorage.get();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.auth.getMe();
      setUser(res.user);
      tokenStorage.setUser(res.user);
    } catch (err) {
      tokenStorage.remove();
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    refreshUser();
  }, []);

  const login = async (emailOrKey: string, passcode: string) => {
    setError(null);
    try {
      const res = await api.auth.login(emailOrKey, passcode);
      setUser(res.user);
      setToken(res.token);
      await fetchMembers();
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } finally {
      setUser(null);
      setToken(null);
    }
  };

  const updateProfile = async (data: { email?: string; avatar_url?: string | null; phone_number?: string; full_name?: string }) => {
    setError(null);
    try {
      const res = await api.auth.updateProfile(data);
      setUser(res.user);
      tokenStorage.setUser(res.user);
      await fetchMembers();
    } catch (err: any) {
      setError(err.message || 'Profile update failed');
      throw err;
    }
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        familyMembers,
        error,
        login,
        logout,
        refreshUser,
        updateProfile,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
