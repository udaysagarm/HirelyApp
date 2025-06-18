// src/components/NavBar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext"; // Import useAuth
import { Sun, Moon, LogOut } from 'lucide-react'; // Import icons

export default function NavBar({ theme, setTheme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth(); // Get logout function

  // Function to toggle theme
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const navItems = [
    { name: "Home", path: "/user/home" },
    { name: "Profile", path: "/profile" },
    { name: "Post a Job", path: "/post-job" },
    { name: "My Jobs", path: "/my-jobs" },
    { name: "Messages", path: "/messages" },
  ];

  // This function is still used for regular links
  const navLinkClass = (path, danger = false) => {
    const isActive = location.pathname === path;
    return `px-4 py-2 rounded-xl text-sm md:text-base font-medium transition duration-300 ${
      isActive
        ? "bg-blue-700 text-white"
        : danger
        ? "text-red-300 hover:bg-red-100 hover:text-red-700"
        : "text-blue-100 hover:bg-blue-100 hover:text-blue-800"
    }`;
  };

  const handleLogout = () => {
    logout(); // Use context logout
    navigate("/"); // redirect to public home page
  };

  return (
    <nav className="bg-blue-800 text-white px-6 py-4 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 fixed top-0 left-0 right-0 z-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Logo */}
      <Link
        to="/user/home"
        className="text-3xl font-extrabold tracking-wide text-white hover:text-white"
      >
        Hirely
      </Link>

      {/* Search Bar (Placeholder) */}
      <div className="flex-1 w-full max-w-md md:mx-6">
        <input
          type="text"
          placeholder="Search jobs, users, messages..."
          className="w-full px-4 py-2 rounded-full text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-gray-700 dark:text-gray-100 dark:focus:ring-blue-600"
        />
      </div>

      {/* Nav Links */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {navItems.map((item) => (
          <Link key={item.name} to={item.path} className={navLinkClass(item.path)}>
            {item.name}
          </Link>
        ))}

        {/* Settings Dropdown */}
        <div className="relative group">
          <button className="px-4 py-2 rounded-xl text-sm md:text-base font-medium transition duration-300 text-blue-100 hover:bg-blue-100 hover:text-blue-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white">
            Settings ▼
          </button>
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 origin-top-right scale-95 group-hover:scale-100 z-20">
            <Link to="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
              General
            </Link>
            <Link to="/settings/deleted-posts" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700">
              Deleted Posts
            </Link>
            <button
                onClick={toggleTheme}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
            >
                {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} Toggle Theme
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-100 hover:text-red-800 dark:text-red-400 dark:hover:bg-red-800"
            >
              <LogOut className="w-4 h-4 inline-block mr-1" /> Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}