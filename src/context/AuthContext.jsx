// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
// import { useLoading } from './LoadingContext'; // Commented out as not directly used here

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // Try to get user from localStorage on initial load
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      const storedToken = localStorage.getItem('token');
      // Basic check: if both exist, parse them.
      if (storedUser && storedToken) {
        return JSON.parse(storedUser);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      return null;
    }
    return null;
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || null;
  });

  // Function to handle login
  const login = (userData, jwtToken) => {
    setCurrentUser(userData);
    setToken(jwtToken);
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('token', jwtToken);
  };

  // Function to handle logout
  const logout = () => {
    setCurrentUser(null);
    setToken(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('theme'); // Also clear theme on logout
  };

  // The value provided to consumers of this context
  const authContextValue = {
    currentUser,
    token,
    isLoggedIn: !!currentUser, // Convenience boolean
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
