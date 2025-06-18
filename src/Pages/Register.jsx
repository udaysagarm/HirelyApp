// src/pages/Register.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLoading } from "../context/LoadingContext"; // Import useLoading hook

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    location: "",
    preferredDistance: "",
    role: "job_seeker",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState("");
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      if (!/^\d*$/.test(value)) return;
    }
    if (name === "preferredDistance") {
      if (value !== "" && !/^\d+$/.test(value)) return;
    }

    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    if (form.password !== form.confirm) {
      setApiError("Passwords do not match!");
      return;
    }

    if (!form.name || !form.email || !form.password || !form.location) {
        setApiError("Please fill all required fields.");
        return;
    }
    if (form.preferredDistance !== "" && (isNaN(parseInt(form.preferredDistance, 10)) || parseInt(form.preferredDistance, 10) < 0)) {
        setApiError("Preferred distance must be a non-negative number.");
        return;
    }

    showLoading("Registering...");

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || null,
          location: form.location,
          preferredDistance: form.preferredDistance ? parseInt(form.preferredDistance, 10) : null,
          role: form.role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Registration successful:", data);
        navigate("/login");
      } else {
        console.error("Registration failed:", data.message || "Unknown error");
        setApiError(data.message || "Registration failed. Please try again.");
      }
    } catch (error) {
      console.error("Network or server error during registration:", error);
      setApiError("Network error. Please try again later.");
    } finally {
      hideLoading();
    }
  };

  const confirmFilled = form.confirm.length > 0;
  const passwordsMatch = form.password === form.confirm;

  const isFormValid =
    form.name &&
    form.email &&
    form.password &&
    form.confirm &&
    passwordsMatch &&
    form.location;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-6 transition-colors duration-300">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-md w-full max-w-md text-gray-900 dark:text-gray-100 transition-colors duration-300"
      >
        <h2 className="text-2xl font-bold mb-6 text-center text-blue-800 dark:text-blue-400">
          Register for Hirely
        </h2>

        {/* Name Field */}
        <div className="mb-4">
          <label htmlFor="name" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Full Name</label>
          <input
            id="name" // Added id
            name="name"
            type="text"
            placeholder="Full Name"
            onChange={handleChange}
            value={form.name}
            required
            className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
        </div>

        {/* Email Field */}
        <div className="mb-4">
          <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input
            id="email" // Added id
            name="email"
            type="email"
            placeholder="Email"
            onChange={handleChange}
            value={form.email}
            required
            className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
        </div>

        {/* Phone Field */}
        <div className="mb-4">
          <label htmlFor="phone" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Phone (Optional)</label>
          <input
            id="phone" // Added id
            name="phone"
            type="tel"
            placeholder="Phone (Optional)"
            onChange={handleChange}
            value={form.phone}
            className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
        </div>

        {/* Location Field */}
        <div className="mb-4">
          <label htmlFor="location" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Your Location (e.g., City, State)</label>
          <input
            id="location" // Added id
            name="location"
            type="text"
            placeholder="Your Location (e.g., City, State)"
            onChange={handleChange}
            value={form.location}
            required
            className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
        </div>

        {/* Preferred Distance Field */}
        <div className="mb-4">
          <label htmlFor="preferredDistance" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Job Distance (miles)</label>
          <input
            id="preferredDistance" // Added id
            name="preferredDistance"
            type="number"
            placeholder="Preferred Job Distance (miles)"
            onChange={handleChange}
            value={form.preferredDistance}
            className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
        </div>

        {/* Password Field */}
        <div className="mb-4">
          <label htmlFor="password" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
          <input
            id="password" // Added id
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            onChange={handleChange}
            value={form.password}
            required
            className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
        </div>

        {/* Confirm Password Field */}
        <div className="mb-2">
          <label htmlFor="confirm" className="sr-only">Confirm Password</label> {/* Hidden label for accessibility */}
          <input
            id="confirm" // Added id
            name="confirm"
            type={showPassword ? "text" : "password"}
            placeholder="Confirm Password"
            onChange={handleChange}
            value={form.confirm}
            required
            className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
          {confirmFilled && !passwordsMatch && (
            <p className="text-red-600 text-sm mt-1">
              ❌ Passwords do not match
            </p>
          )}
          {confirmFilled && passwordsMatch && (
            <p className="text-green-600 text-sm mt-1">
              ✅ Passwords match
            </p>
          )}
        </div>

        {/* Show Passwords Checkbox */}
        <div className="mb-4 flex items-center">
          <input
            id="showPasswords" // Added id
            type="checkbox"
            className="mr-2 leading-tight"
            checked={showPassword}
            onChange={() => setShowPassword(!showPassword)}
          />
          <label htmlFor="showPasswords" className="text-sm text-gray-700 dark:text-gray-300">
            Show Passwords
          </label>
        </div>

        {apiError && (
          <p className="text-red-600 text-sm mb-4 text-center">{apiError}</p>
        )}

        <button
          type="submit"
          disabled={!isFormValid}
          className={`w-full py-2 rounded font-semibold transition duration-200 ${
            isFormValid
              ? "bg-blue-800 text-white hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-800"
              : "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
          }`}
        >
          Register
        </button>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-300">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-700 dark:text-blue-400 hover:underline font-medium"
          >
            Login instead
          </Link>
        </p>
      </form>
    </div>
  );
}