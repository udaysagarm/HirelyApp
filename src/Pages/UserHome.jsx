// src/pages/UserHome.jsx

import JobList from "../pages/JobList"; // Correct path if JobList is in pages

export default function UserHome() {
  return (
    <div className="pt-24 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <JobList />
    </div>
  );
}