// src/pages/DeletedPosts.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { Link } from 'react-router-dom';
import JobCard from '../components/JobCard'; // Assuming JobCard can display deleted jobs


export default function DeletedPosts() {
  const { currentUser, token, isLoggedIn } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const [deletedJobs, setDeletedJobs] = useState([]);
  const [apiError, setApiError] = useState("");

  const fetchDeletedJobs = async () => {
    if (!isLoggedIn || !currentUser?.id || !token) {
      setApiError("Please log in to view deleted posts.");
      return;
    }
    setApiError("");
    showLoading("Loading deleted posts...");
    try {
      const response = await fetch(`/api/users/${currentUser.id}/deleted-jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        setDeletedJobs(data);
        console.log("Deleted jobs fetched:", data);
      } else {
        setApiError(data.message || "Failed to load deleted posts.");
      }
    } catch (error) {
      console.error("Network error fetching deleted posts:", error);
      setApiError("Network error. Could not load deleted posts.");
    } finally {
      hideLoading();
    }
  };

  useEffect(() => {
    fetchDeletedJobs();
  }, [currentUser?.id, token, isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl font-semibold">Please log in to view deleted posts.</p>
        <Link to="/login" className="ml-4 text-blue-600 hover:underline">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-3xl font-bold text-blue-800 dark:text-blue-400 mb-6 text-center">My Deleted Posts</h2>

        {apiError && <p className="text-red-500 text-sm mb-4 text-center">{apiError}</p>}

        {deletedJobs.length === 0 && !apiError ? (
          <p className="text-gray-500 dark:text-gray-400 text-center">You have no deleted posts.</p>
        ) : (
          <div className="space-y-6">
            {deletedJobs.map(job => (
              // Display deleted job. The JobCard will show its 'deleted' status.
              // You might add an "Undo Delete" button here in the future.
              <JobCard key={job.id} job={{ ...job, status: 'deleted', has_any_assignment: false }} /> 
              // Note: For deleted jobs, 'has_any_assignment' is forced false as they are inactive.
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
