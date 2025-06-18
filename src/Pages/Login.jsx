// src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLoading } from "../context/LoadingContext";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();
  const { login } = useAuth();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!form.email || !form.password) {
        setApiError("Please enter both email and password.");
        return;
    }

    showLoading("Logging in...");

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Login successful:", data);
        login(data.user, data.token);
        navigate("/user/home");
      } else {
        console.error("Login failed:", data.message || "Unknown error");
        setApiError(data.message || "Login failed. Please try again.");
      }
    } catch (error) {
      console.error("Network or server error during login:", error);
      setApiError("Network error. Please try again later.");
    } finally {
      hideLoading();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-6 transition-colors duration-300">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md w-full max-w-md text-gray-900 dark:text-gray-100 transition-colors duration-300"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-800 dark:text-blue-400">
          Login to Hirely
        </h2>

        {/* Email Field */}
        <div className="mb-4">
          <label htmlFor="loginEmail" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input
            id="loginEmail" // Added id
            name="email"
            type="email"
            placeholder="Email"
            onChange={handleChange}
            required
            className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
        </div>

        {/* Password Field */}
        <div className="mb-4">
          <label htmlFor="loginPassword" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <input
            id="loginPassword" // Added id
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            onChange={handleChange}
            required
            className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
        </div>

        {/* Show Password Checkbox */}
        <div className="mb-4 flex items-center">
          <input
            id="showLoginPassword" // Added id
            type="checkbox"
            className="mr-2 leading-tight"
            onChange={() => setShowPassword(!showPassword)}
          />
          <label htmlFor="showLoginPassword" className="text-sm text-gray-700 dark:text-gray-300">
            Show Password
          </label>
        </div>

        {apiError && (
          <p className="text-red-600 text-sm mb-4 text-center">{apiError}</p>
        )}

        <button
          type="submit"
          className="w-full bg-blue-800 text-white py-2 rounded hover:bg-blue-900 transition duration-200"
        >
          Login
        </button>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
          Don’t have an account?{" "}
          <Link
            to="/register"
            className="text-blue-700 dark:text-blue-400 hover:underline font-medium"
          >
            Create one instead
          </Link>
        </p>
      </form>
    </div>
  );
}