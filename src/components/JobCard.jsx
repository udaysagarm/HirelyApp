// src/components/JobCard.jsx
import React from 'react';
import { Star, ThumbsUp, XCircle } from 'lucide-react'; // Import XCircle for Cancel
import { Link } from 'react-router-dom';

const JobCard = ({ job, onInterestClick, onCancelJob }) => { // Added onCancelJob prop
  const DEFAULT_AVATAR_URL = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  const interestedCount = parseInt(job.interested_count || 0, 10);
  const isInterested = job.is_interested_by_current_user === true; 
  const isJobFilled = job.status === 'filled';
  const isAssignedToMe = job.job_type === 'assigned_to_me'; // From backend my-jobs endpoint
  // job.has_any_assignment comes from backend on GET /api/jobs (public view) or my-jobs (posted view)
  const hasAnyAssignment = job.has_any_assignment === true; 

  // Helper to determine the status text and color
  const getStatusDisplay = () => {
    let statusText = "";
    let statusColorClass = "";

    if (isJobFilled) {
      statusText = "FILLED";
      statusColorClass = "text-red-600";
    } else if (isAssignedToMe) { // Specific for jobs assigned to the current user
      statusText = "ASSIGNED TO ME"; // Distinct text for jobs assigned to the current user
      statusColorClass = "text-blue-600"; // Blue for assigned to me
    } else if (hasAnyAssignment) { // If not filled or assigned to ME, but has other assignments
      statusText = "STILL HIRING"; // Job is open, but someone else is assigned
      statusColorClass = "text-purple-600";
    } else {
      statusText = "OPEN"; // Job is open, and no one is assigned
      statusColorClass = "text-green-600";
    }
    
    return { statusText, statusColorClass };
  };

  const { statusText, statusColorClass } = getStatusDisplay();

  // Handle click for Interest/Uninterest button (only for non-assigned jobs)
  const handleInterestButtonClick = () => {
    if (isInterested) { // If currently interested, it's an uninterest action
      const confirmUninterest = window.confirm(
        "Are you sure you want to uninterest from this job?"
      );
      if (!confirmUninterest) {
        return; // User cancelled
      }
    }
    onInterestClick(job.id, isInterested);
  };

  // Handle click for Cancel Job button (only for assigned jobs)
  const handleCancelJobClick = () => {
    // Confirmation is handled in MyJobs.jsx's handleCancelJob
    onCancelJob(job.id, job.title); // Pass job ID and title for confirmation message
  };


  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300 relative">
      <div className="flex items-center mb-3">
        <img
          src={job.posted_by_avatar || DEFAULT_AVATAR_URL}
          alt={job.posted_by_name || "User"}
          className="w-10 h-10 rounded-full mr-3 border border-gray-200 dark:border-gray-600 object-cover"
        />
        <div>
          <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400">
            {job.title}
          </h3>
          <Link to={`/user/${job.posted_by_user_id}`} className="text-sm text-blue-600 dark:text-blue-300 hover:underline">
            Posted by {job.posted_by_name}
          </Link>
        </div>
      </div>
      <p className="text-gray-700 dark:text-gray-300 mb-3">{job.description}</p>

      {job.rating > 0 && (
        <div className="flex items-center mb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`w-5 h-5 ${i <= parseFloat(job.rating) ? "text-yellow-400 fill-current" : "text-gray-300 dark:text-gray-600"}`}
            />
          ))}
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">({parseFloat(job.rating).toFixed(1)} / 5)</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <p><strong>Pay:</strong> {job.pay} ({job.pay_type})</p>
        <p><strong>Category:</strong> {job.category}</p>
        <p><strong>Location:</strong> {job.location}</p>
        <p><strong>Hours:</strong> {job.total_hours ? `${job.total_hours} hrs` : 'N/A'}</p>
        {job.posted_by_email && <p><strong>Email:</strong> {job.posted_by_email}</p>}
        {job.posted_by_phone && <p><strong>Phone:</strong> {job.posted_by_phone}</p>}
      </div>
      {job.images && job.images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {job.images.map((img, index) => (
            <img
              key={index}
              src={typeof img === 'string' ? img : URL.createObjectURL(img)}
              alt={`Job Image ${index + 1}`}
              className="w-20 h-20 object-cover rounded-md shadow-sm"
            />
          ))}
        </div>
      )}
      {(job.start_time || job.end_time) && (
        <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          {job.start_time && `Starts: ${new Date(job.start_time).toLocaleString()} `}
          {job.end_time && `Ends: ${new Date(job.end_time).toLocaleString()}`}
        </p>
      )}
      
      {/* Job Status Tag/Label */}
      <p className="mt-2 text-sm font-semibold">
        Status: <span className={statusColorClass}>{statusText}</span>
        {isJobFilled && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 text-xs font-bold">
                JOB FILLED
            </span>
        )}
      </p>

      {/* NEW: Display Assigned Details if job is assigned_to_me */}
      {isAssignedToMe && ( // Only show if job is assigned to current user
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
          <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Your Assignment Details:</h4>
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
            <strong>Location:</strong> {job.assigned_location}
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
            <strong>Instructions:</strong> {job.assigned_details}
          </p>
          {job.assigned_image_urls && job.assigned_image_urls.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {job.assigned_image_urls.map((imgUrl, idx) => (
                <img
                  key={idx}
                  src={imgUrl}
                  alt={`Assigned Ref ${idx + 1}`}
                  className="w-20 h-20 object-cover rounded-md shadow-sm"
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Button: Conditional based on assignment status for current user */}
      <div className="absolute bottom-4 right-4">
        {isAssignedToMe ? ( // If the job is assigned to the current user, show "Cancel Job"
          <button
            id={`cancel-job-btn-${job.id}`}
            name={`cancel-job-btn-${job.id}`}
            onClick={handleCancelJobClick} // Call the new handler
            className="flex items-center gap-2 px-4 py-2 rounded-full transition shadow-md bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
            aria-label={`Cancel job ${job.title}`}
          >
            <XCircle className="w-4 h-4 text-white" /> Cancel Job
          </button>
        ) : ( // Otherwise, show "Interested" / "Uninterested" button (for non-assigned jobs)
          <button
            id={`interest-btn-${job.id}`}
            name={`interest-btn-${job.id}`}
            onClick={handleInterestButtonClick} // Call the original handler
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition shadow-md ${
              isInterested
                ? "bg-red-600 text-white hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
                : "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            }`}
            aria-label={isInterested ? `Uninterested in ${job.title}` : `Interested in ${job.title}`}
          >
            <ThumbsUp className={`w-4 h-4 ${isInterested ? "text-white" : "text-white"}`} />
            {isInterested ? "Uninterested" : "Interested"} ({interestedCount})
          </button>
        )}
      </div>
    </div>
  );
};

export default JobCard;