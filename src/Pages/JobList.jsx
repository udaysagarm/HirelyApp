// src/pages/JobList.jsx
import { useState, useEffect } from "react";
import JobCard from "../components/JobCard";
import { useLoading } from "../context/LoadingContext";
import { useAuth } from "../context/AuthContext";

export default function JobList() {
  const [jobs, setJobs] = useState([]);
  const [apiError, setApiError] = useState("");
  const { showLoading, hideLoading } = useLoading();
  const { token, isLoggedIn, currentUser } = useAuth();

  const [filters, setFilters] = useState({
    category: '',
    location: '',
    minPay: '',
    maxPay: '',
    keywords: ''
  });

  const fetchJobs = async () => {
    setApiError("");
    showLoading("Loading jobs...");
    try {
      const queryString = new URLSearchParams(filters).toString();
      const response = await fetch(`/api/jobs?${queryString}`, {
        headers: {
            ...(isLoggedIn && token && { 'Authorization': `Bearer ${token}` })
        }
      });
      const data = await response.json();

      if (response.ok) {
        setJobs(data);
        console.log("Jobs fetched successfully:", data);
        data.forEach(job => console.log(`Job ${job.id}: is_interested_by_current_user = ${job.is_interested_by_current_user}, type: ${typeof job.is_interested_by_current_user}`));
      } else {
        console.error("Failed to fetch jobs:", data.message || "Unknown error");
        setApiError(data.message || "Failed to load jobs. Please try again.");
      }
    } catch (error) {
      console.error("Network error fetching jobs:", error);
      setApiError("Network error. Could not load jobs.");
    } finally {
      hideLoading();
    }
  };

  const handleInterestClick = async (jobId, isCurrentlyInterested) => {
    if (!isLoggedIn) {
      setApiError("Please log in to express or remove interest in a job.");
      return;
    }

    console.log(`handleInterestClick called for Job ID: ${jobId}`);
    console.log(`isCurrentlyInterested (passed from JobCard): ${isCurrentlyInterested}`);

    showLoading(isCurrentlyInterested ? "Removing interest..." : "Recording interest...");
    setApiError("");

    try {
      const method = isCurrentlyInterested ? 'DELETE' : 'POST';
      console.log(`Attempting to send ${method} request for job ${jobId}`);

      const response = await fetch(`/api/jobs/${jobId}/interest`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();

      console.log(`Backend response for ${method} on job ${jobId}:`, data);

      if (response.ok) {
        console.log("Interest action successful:", data.message);
        setJobs(prevJobs => prevJobs.map(job =>
          job.id === jobId
            ? {
                ...job,
                interested_count: data.interestedCount,
                is_interested_by_current_user: data.isInterestedByCurrentUser
              }
            : job
        ));
      } else {
        console.error("Failed to record/remove interest:", data.message || "Unknown error");
        setApiError(data.message || `Failed to ${isCurrentlyInterested ? 'remove' : 'record'} interest. Please try again.`);
      }
    } catch (error) {
      console.error("Network error recording/removing interest:", error);
      setApiError("Network error. Could not perform interest action.");
    } finally {
      hideLoading();
    }
  };


  useEffect(() => {
    fetchJobs();
  }, [filters, isLoggedIn, token, currentUser]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-blue-800 dark:text-blue-400">Available Jobs</h1>
      {apiError && <p className="text-red-500 text-sm mb-4 text-center">{apiError}</p>}
      {jobs.length === 0 && !apiError ? (
        <p className="text-gray-500 dark:text-gray-400">No jobs posted yet.</p>
      ) : (
        <div className="space-y-6">
          {jobs.map((job) => <JobCard key={job.id} job={job} onInterestClick={handleInterestClick} />)}
        </div>
      )}
    </div>
  );
}