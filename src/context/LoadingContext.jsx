// src/context/LoadingContext.jsx
import React, { createContext, useContext, useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner'; // Import your new spinner component

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const showLoading = (message = 'Loading...') => {
    setIsLoading(true);
    setLoadingMessage(message);
  };

  const hideLoading = () => {
    setIsLoading(false);
    setLoadingMessage('');
  };

  return (
    <LoadingContext.Provider value={{ isLoading, loadingMessage, showLoading, hideLoading }}>
      {children}
      {isLoading && (
        // Render the loading spinner when isLoading is true
        <LoadingSpinner message={loadingMessage} />
      )}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);