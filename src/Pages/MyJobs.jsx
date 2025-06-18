// src/pages/MyJobs.jsx
import { useEffect, useState } from "react";
import JobCard from "../components/JobCard";
import { ThumbsUp, Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useLoading } from "../context/LoadingContext";
import { Link, useSearchParams } from "react-router-dom";

export default function MyJobs() {
  const { currentUser, token, isLoggedIn } = useAuth();
  const { showLoading, hideLoading } = useLoading();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allMyJobs, setAllMyJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState(searchParams.get('filter') || "active");
  const [apiError, setApiError] = useState("");

  const filterOptions = [
    { name: "Active Jobs", key: "active" },
    { name: "Past Jobs", key: "past" },
    { name: "Posted Jobs", key: "posted" },
  ];

  const fetchMyJobs = async () => {
    if (!isLoggedIn || !currentUser?.id || !token) {
      setApiError("Please log in to view your jobs.");
      return;
    }
    setApiError("");
    showLoading("Loading your jobs...");
    try {
      const response = await fetch(`/api/users/${currentUser.id}/my-jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        setAllMyJobs(data);
        console.log("MyJobs fetched successfully:", data);
      } else {
        setApiError(data.message || "Failed to load your jobs.");
      }
    } catch (error) {
      console.error("Network error fetching my jobs:", error);
      setApiError("Network error. Could not load your jobs.");
    } finally {
      hideLoading();
    }
  };

  useEffect(() => {
    fetchMyJobs();
  }, [currentUser?.id, token, isLoggedIn]);

  useEffect(() => {
    const now = new Date();
    let jobsToDisplay = [];

    const currentFilter = searchParams.get('filter') || "active";
    setSelectedFilter(currentFilter);

    if (currentFilter === "posted") {
      jobsToDisplay = allMyJobs.filter(job => job.job_type === 'posted');
    } else if (currentFilter === "active") {
      jobsToDisplay = allMyJobs.filter(job => 
        job.job_type === 'assigned_to_me' && 
        new Date(job.end_time) >= now && 
        job.status !== 'filled' && 
        job.application_status === 'assigned'
      );
    } else if (currentFilter === "past") {
      jobsToDisplay = allMyJobs.filter(job => 
        job.job_type === 'assigned_to_me' && 
        (new Date(job.end_time) < now || job.status === 'filled')
      );
    }
    
    jobsToDisplay.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    setFilteredJobs(jobsToDisplay);
  }, [searchParams, allMyJobs]);

  const handleFilterChange = (key) => {
    setSearchParams({ filter: key });
  };

  const handleInterestClick = async (jobId, isAlreadyInterested) => {
    if (!isLoggedIn) {
      setApiError("Please log in to express or remove interest in a job.");
      return;
    }

    showLoading(isAlreadyInterested ? "Removing interest..." : "Recording interest...");
    setApiError("");
    try {
      const method = isAlreadyInterested ? 'DELETE' : 'POST';
      const response = await fetch(`/api/jobs/${jobId}/interest`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();

      if (response.ok) {
        console.log("Interest action successful:", data.message);
        // Update allMyJobs to trigger re-filter
        setAllMyJobs(prevJobs => prevJobs.map(job =>
          job.id === jobId
            ? { ...job, interested_count: data.interestedCount, is_interested_by_current_user: data.isInterestedByCurrentUser }
            : job
        ));
      } else {
        console.error("Failed to record/remove interest:", data.message || "Unknown error");
        setApiError(data.message || `Failed to ${isAlreadyInterested ? 'remove' : 'record'} interest. Please try again.`);
      }
    } catch (error) {
      console.error("Network error recording/removing interest:", error);
      setApiError("Network error. Could not perform interest action.");
    } finally {
      hideLoading();
    }
  };

  // NEW: handleCancelJob function for assigned users
  const handleCancelJob = async (jobId, jobTitle) => {
    if (!isLoggedIn || !currentUser?.id || !token) {
        setApiError("You must be logged in to cancel an assigned job.");
        return;
    }
    const confirmCancellation = window.confirm(
        `Are you sure you want to cancel your assignment for "${jobTitle}"? This cannot be undone easily.`
    );
    if (!confirmCancellation) {
        return;
    }

    showLoading("Cancelling job assignment...");
    setApiError("");
    try {
        const response = await fetch(`/api/jobs/${jobId}/assign/${currentUser.id}`, { // DELETE endpoint
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            },
        });
        const data = await response.json();

        if (response.ok) {
            console.log("Job assignment cancelled successfully:", data.message);
            // Remove the job from the assigned_to_me list (or update its status)
            setAllMyJobs(prevJobs => prevJobs.filter(job => 
                !(job.id === jobId && job.job_type === 'assigned_to_me')
            ));
            alert(`You have successfully cancelled your assignment for "${jobTitle}".`);
            // You might want to navigate to another filter if the list becomes empty
            if (filteredJobs.length === 1 && filteredJobs[0].id === jobId) {
              setSearchParams({ filter: 'posted' }); // Go to posted jobs if current becomes empty
            }
        } else {
            console.error("Failed to cancel job assignment:", data.message || "Unknown error");
            setApiError(data.message || "Failed to cancel job assignment. Please try again.");
        }
    } catch (error) {
        console.error("Network error cancelling job assignment:", error);
        setApiError("Network error. Could not cancel job assignment.");
    } finally {
        hideLoading();
    }
  };


  if (!isLoggedIn) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl font-semibold">Please log in to view your jobs.</p>
        <Link to="/login" className="ml-4 text-blue-600 hover:underline">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h2 className="text-3xl font-bold text-blue-800 dark:text-blue-400 mb-6 text-center">My Jobs</h2>

        {apiError && <p className="text-red-500 text-sm mb-4 text-center">{apiError}</p>}

        {/* Mini Menu */}
        <div className="flex justify-center mb-6 space-x-4">
          {filterOptions.map(option => (
            <button
              key={option.key}
              onClick={() => handleFilterChange(option.key)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${
                selectedFilter === option.key
                  ? "bg-blue-600 text-white shadow-md dark:bg-blue-700"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {option.name}
            </button>
          ))}
        </div>

        {/* Display filtered jobs */}
        {filteredJobs.length === 0 && !apiError ? (
          <p className="text-gray-500 dark:text-gray-400 text-center">No {selectedFilter.toLowerCase()} jobs found.</p>
        ) : (
          <div className="space-y-6">
            {filteredJobs.map(job => (
              <div key={job.id} className="relative group">
                {job.job_type === "posted" ? ( 
                  <Link to={`/job-details/${job.id}`} className="absolute inset-0 z-10 block" aria-label={`View details for ${job.title}`}>
                  </Link>
                ) : null}
                <JobCard 
                  job={job} 
                  onInterestClick={handleInterestClick} 
                  onCancelJob={handleCancelJob} // Pass the new prop
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}