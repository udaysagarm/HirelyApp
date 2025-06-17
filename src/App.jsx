// src/App.jsx
import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import UserHome from "./pages/UserHome";
import Profile from "./pages/Profile";
import PostJob from "./pages/PostJob";
import MyJobs from "./pages/MyJobs";
import Messages from "./pages/Messages";
import Settings from "./pages/Settings"; // Import Settings
import UserPage from "./pages/UserPage";
import JobDetailsPage from "./pages/JobDetailsPage";
import DeletedPosts from "./pages/DeletedPosts"; // NEW: Import DeletedPosts
import NavBar from "./components/NavBar";
import { LoadingProvider } from "./context/LoadingContext";
import { AuthProvider } from "./context/AuthContext";

// Layout with NavBar for private/authenticated pages
function PrivateLayout({ theme, setTheme }) {
  return (
    <>
      <NavBar theme={theme} />
      <div className="pt-24 min-h-[calc(100vh-6rem)] bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <Outlet />
      </div>
    </>
  );
}

function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  return (
    <LoadingProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Pages - Accessible without login */}
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />

            {/* Private Pages - Accessible with NavBar and requiring login state */}
            <Route element={<PrivateLayout theme={theme} setTheme={setTheme} />}>
              <Route path="/user/home" element={<UserHome />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/post-job" element={<PostJob />} />
              <Route path="/my-jobs" element={<MyJobs />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/settings" element={<Settings theme={theme} setTheme={setTheme} />} />
              <Route path="/user/:userId" element={<UserPage />} />
              <Route path="/job-details/:jobId" element={<JobDetailsPage />} />
              <Route path="/settings/deleted-posts" element={<DeletedPosts />} /> {/* NEW ROUTE */}
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LoadingProvider>
  );
}

export default App;
