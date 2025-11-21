/**
 * ClickView Enterprise - Authentication Context
 *
 * Provides global authentication state and methods throughout the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/api';

interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  mfaEnabled: boolean;
  emailVerified: boolean;
  isActive: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<LoginResult>;
  register: (email: string, username: string, password: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => Promise<void>;
  verifyMfa: (mfaToken: string, code: string) => Promise<void>;
  refreshToken: () => Promise<void>;
  updateUser: (user: User) => void;
}

interface LoginResult {
  success: boolean;
  requiresMfa?: boolean;
  mfaToken?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'clickview_token';
const REFRESH_TOKEN_KEY = 'clickview_refresh_token';
const USER_KEY = 'clickview_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      const storedUser = localStorage.getItem(USER_KEY);

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Verify token is still valid
          const response = await apiService.getCurrentUser();
          setUser(response.user);
          setPermissions(response.permissions || []);
        } catch (error) {
          // Token is invalid, clear auth
          console.error('Token validation failed:', error);
          clearAuth();
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (!token) return;

    // Refresh token every 20 minutes (tokens expire in 24 hours)
    const interval = setInterval(async () => {
      try {
        await refreshToken();
      } catch (error) {
        console.error('Token refresh failed:', error);
        clearAuth();
      }
    }, 20 * 60 * 1000);

    return () => clearInterval(interval);
  }, [token]);

  const clearAuth = useCallback(() => {
    setUser(null);
    setToken(null);
    setPermissions([]);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const login = useCallback(async (emailOrUsername: string, password: string): Promise<LoginResult> => {
    try {
      const response = await apiService.login(emailOrUsername, password);

      if (response.requiresMfa) {
        return {
          success: true,
          requiresMfa: true,
          mfaToken: response.mfaToken
        };
      }

      // Store auth data
      setToken(response.token);
      setUser(response.user);
      setPermissions(response.permissions || []);

      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));

      return { success: true, requiresMfa: false };
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Login failed');
    }
  }, []);

  const register = useCallback(async (
    email: string,
    username: string,
    password: string,
    firstName?: string,
    lastName?: string
  ) => {
    try {
      const response = await apiService.register(email, username, password, firstName, lastName);

      // Auto-login after registration
      setToken(response.token);
      setUser(response.user);
      setPermissions([]);

      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Registration failed');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiService.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  }, [token, clearAuth]);

  const verifyMfa = useCallback(async (mfaToken: string, code: string) => {
    try {
      const response = await apiService.verifyMfa(mfaToken, code);

      setToken(response.token);
      setUser(response.user);
      setPermissions(response.permissions || []);

      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(REFRESH_TOKEN_KEY, response.refreshToken);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'MFA verification failed');
    }
  }, []);

  const refreshToken = useCallback(async () => {
    const refreshTokenValue = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiService.refreshToken(refreshTokenValue);

      setToken(response.token);
      localStorage.setItem(TOKEN_KEY, response.token);
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Token refresh failed');
    }
  }, []);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
  }, []);

  const value: AuthContextType = {
    user,
    token,
    permissions,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    register,
    logout,
    verifyMfa,
    refreshToken,
    updateUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
