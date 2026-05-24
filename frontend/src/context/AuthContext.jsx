import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { clearLocalCache } from '../services/db';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load persisted session on application startup
    const storedToken = localStorage.getItem('tripsync_token');
    const storedUser = localStorage.getItem('tripsync_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: jwtToken, user: userData } = response.data;
      
      localStorage.setItem('tripsync_token', jwtToken);
      localStorage.setItem('tripsync_user', JSON.stringify(userData));
      
      setToken(jwtToken);
      setUser(userData);
      return userData;
    } catch (error) {
      if (!error.response) {
        throw 'Unable to connect to server. Please check your connection.';
      }
      throw error.response?.data?.message || 'Login failed. Please check your credentials.';
    }
  };

  const register = async (email, password, name, avatarUrl) => {
    try {
      const response = await api.post('/auth/register', { email, password, name, avatarUrl });
      const { token: jwtToken, user: userData } = response.data;
      
      localStorage.setItem('tripsync_token', jwtToken);
      localStorage.setItem('tripsync_user', JSON.stringify(userData));
      
      setToken(jwtToken);
      setUser(userData);
      return userData;
    } catch (error) {
      if (!error.response) {
        throw 'Unable to connect to server. Please check your connection.';
      }
      throw error.response?.data?.message || 'Registration failed. Try a different email.';
    }
  };

  const logout = async () => {
    localStorage.removeItem('tripsync_token');
    localStorage.removeItem('tripsync_user');
    setToken(null);
    setUser(null);
    await clearLocalCache(); // Clear local IndexedDB cache for security!
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
