// src/pages/Settings.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Sun, Moon } from 'lucide-react';
import { useAuth } from "../context/AuthContext"; // Import useAuth

export default function Settings({ theme, setTheme }) {
  const navigate = useNavigate();
  const { logout, isLoggedIn } = useAuth(); // Destructure logout function and isLoggedIn

  const [notificationSettings, setNotificationSettings] = useState({
    jobAlerts: true,
    messageNotifications: true,
    ratingReminders: false,
    emailPromotions: true,
  });

  const handleToggleNotification = (setting) => {
    setNotificationSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
    console.log(`Notification setting changed for ${setting}: ${!notificationSettings[setting]}`);
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    console.log(`Theme toggled to: ${newTheme}`);
  };

  const handleLogout = () => {
    logout(); // Call the logout function from AuthContext
    // alert("You have been logged out."); // For demonstration
    navigate("/"); // Redirect to the public home page
  };

  // Optional: Redirect if not logged in
  if (!isLoggedIn) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl font-semibold">Please log in to view settings.</p>
        <Link to="/login" className="ml-4 text-blue-600 hover:underline">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-gray-100 dark:bg-gray-900 pb-10 transition-colors duration-300">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mt-6 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <h2 className="text-3xl font-bold text-blue-800 dark:text-blue-400 mb-6 text-center">Settings</h2>

        <Link
          to="/profile"
          className="flex items-center justify-between p-4 mb-4 bg-blue-50 dark:bg-blue-900 hover:bg-blue-100 dark:hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
        >
          <div className="text-lg font-medium text-blue-700 dark:text-blue-300">My Profile</div>
          <ChevronRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        </Link>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Theme Settings</h3>
          <div className="flex items-center justify-between">
            <span className="text-gray-700 dark:text-gray-300">Dark Mode</span>
            <button
              onClick={handleThemeToggle}
              className="relative flex items-center justify-center w-16 h-8 rounded-full cursor-pointer transition-colors duration-300
                         bg-gray-300 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Toggle dark mode"
            >
              <div
                className={`absolute w-7 h-7 rounded-full bg-white dark:bg-blue-500 shadow-md transform transition-transform duration-300 ease-in-out
                            ${theme === 'dark' ? 'translate-x-4' : '-translate-x-4'}`}
              >
                {theme === 'light' ? (
                  <Sun className="w-full h-full text-yellow-500 p-1" />
                ) : (
                  <Moon className="w-full h-full text-blue-900 p-1" />
                )}
              </div>
            </button>
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Notification Settings</h3>
          <div className="space-y-4">
            {Object.entries(notificationSettings).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <label htmlFor={key} className="text-gray-700 dark:text-gray-300 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </label>
                <label className="switch relative inline-block w-12 h-6">
                  <input
                    type="checkbox"
                    id={key}
                    checked={value}
                    onChange={() => handleToggleNotification(key)}
                    className="sr-only peer"
                  />
                  <span
                    className="slider absolute cursor-pointer top-0 left-0 right-0 bottom-0 bg-gray-300 rounded-full transition duration-300
                                 peer-checked:bg-blue-600 before:absolute before:content-[''] before:h-5 before:w-5 before:left-0.5 before:bottom-0.5 before:bg-white before:rounded-full before:transition before:duration-300
                                 peer-checked:before:translate-x-6"
                  ></span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Other Settings</h3>
          <ul className="space-y-2">
            <li>
              <Link to="/settings/payment-methods" className="text-blue-600 dark:text-blue-400 hover:underline">Manage Payment Methods</Link>
            </li>
            <li>
              <Link to="/settings/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacy Policy</Link>
            </li>
            <li>
              <Link to="/settings/terms" className="text-blue-600 dark:text-blue-400 hover:underline">Terms of Service</Link>
            </li>
          </ul>
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold text-lg hover:bg-red-700 transition duration-300 shadow-md"
        >
          Logout
        </button>
      </div>
    </div>
  );
}