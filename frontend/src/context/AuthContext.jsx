import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('erp_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('erp_token') || null);
  const [loading, setLoading] = useState(true);

  // Sync / verify authenticated state on mount
  useEffect(() => {
    const verifyAuth = async () => {
      const storedToken = localStorage.getItem('erp_token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        const freshUser = response?.data?.user || response?.user;
        if (freshUser) {
          setUser(freshUser);
          localStorage.setItem('erp_user', JSON.stringify(freshUser));
        }
      } catch (err) {
        console.warn('Session verification failed:', err.message);
        localStorage.removeItem('erp_token');
        localStorage.removeItem('erp_user');
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
  }, []);

  const login = async (email, password, role = 'Teacher', rememberMe = false) => {
    const response = await api.post('/auth/login', {
      email,
      password,
      role,
      rememberMe
    });

    const authToken = response.token || response.data?.token;
    const authUser = response.user || response.data?.user;

    if (authToken && authUser) {
      localStorage.setItem('erp_token', authToken);
      localStorage.setItem('erp_user', JSON.stringify(authUser));
      setToken(authToken);
      setUser(authUser);
    }
    return response;
  };

  const register = async (teacherData) => {
    // Teacher sign up automatically forces teacher role
    const response = await api.post('/auth/register', {
      ...teacherData,
      role: 'Teacher'
    });

    const authToken = response.token || response.data?.token;
    const authUser = response.user || response.data?.user;

    if (authToken && authUser) {
      localStorage.setItem('erp_token', authToken);
      localStorage.setItem('erp_user', JSON.stringify(authUser));
      setToken(authToken);
      setUser(authUser);
    }
    return response;
  };

  const loginWithGoogle = async (googleToken) => {
    const response = await api.post('/auth/google', {
      token: googleToken
    });

    const authToken = response.token || response.data?.token;
    const authUser = response.user || response.data?.user;

    if (authToken && authUser) {
      localStorage.setItem('erp_token', authToken);
      localStorage.setItem('erp_user', JSON.stringify(authUser));
      setToken(authToken);
      setUser(authUser);
    }
    return response;
  };

  const startGoogleAuth = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiUrl}/auth/google`;
  };

  const handleOAuthSuccess = async (authToken) => {
    localStorage.setItem('erp_token', authToken);
    setToken(authToken);

    try {
      const response = await api.get('/auth/me');
      const freshUser = response?.data?.user || response?.user;
      if (freshUser) {
        setUser(freshUser);
        localStorage.setItem('erp_user', JSON.stringify(freshUser));
        return freshUser;
      }
    } catch (err) {
      console.error('Failed to fetch user profile after OAuth:', err);
    }
    return null;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignore network errors on logout
    }
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  };

  const role = user?.role ? user.role.toLowerCase() : null;
  const teacherProfile = user?.teacherProfile || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        teacherProfile,
        loading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        loginWithGoogle,
        startGoogleAuth,
        handleOAuthSuccess,
        logout,
        setUser
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

export default AuthContext;
