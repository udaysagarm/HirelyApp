// src/pages/Home.jsx
import { Link } from "react-router-dom";

export default function Home() {
  return (
    // Changed gradient to distinct dark mode background colors
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 transition-colors duration-300">
      <h1 className="text-4xl font-extrabold text-blue-800 dark:text-blue-400 text-center mb-4">
        Welcome to Hirely<br />
        <span className="text-lg font-medium text-gray-600 dark:text-gray-300">
          The Job Marketplace for Every Occasion
        </span>
      </h1>

      <div className="mt-6 flex gap-6">
        <Link to="/register">
          <button className="px-6 py-3 rounded-xl bg-blue-800 text-white font-semibold text-lg shadow-md hover:bg-blue-900 hover:scale-105 hover:shadow-xl transition-transform duration-300 ease-in-out">
            Register
          </button>
        </Link>

        <Link to="/login">
          <button className="px-6 py-3 rounded-xl bg-white text-indigo-600 font-semibold text-lg border border-indigo-400 shadow-md hover:bg-indigo-50 hover:scale-105 hover:shadow-xl transition-transform duration-300 ease-in-out
          dark:bg-gray-700 dark:text-indigo-300 dark:border-indigo-600 dark:hover:bg-gray-600">
            Login
          </button>
        </Link>
      </div>
    </div>
  );
}