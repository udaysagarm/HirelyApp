// src/pages/JobDetailsPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { Star, MessageCircle, XCircle, Undo2, Flag, Trash2 } from 'lucide-react'; // Import Trash2 for delete

const DEFAULT_AVATAR_URL = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const JobDetailsPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { currentUser, token, isLoggedIn } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  const [job, setJob] = useState(null);
  const [interestedUsers, setInterestedUsers] = useState([]);
  const [apiError, setApiError] = useState("");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserToAssign, setSelectedUserToAssign] = useState(null);

  // State for assignment form details (sent to job_applications)
  const [assignmentDetails, setAssignmentDetails] = useState({
    location: '',
    details: '',
    imageUrls: [], // For images provided at assignment time (if different from job's private images)
  });
  const [assignmentErrors, setAssignmentErrors] = useState({});
  const [assignmentPreviewUrls, setAssignmentPreviewUrls] = useState([]);


  // Function to fetch job details
  const fetchJobDetails = async () => {
    if (!isLoggedIn || !token || !currentUser) {
      setApiError("Please log in to view job details.");
      hideLoading();
      return;
    }
    setApiError("");
    showLoading("Loading job details...");
    try {
      const response = await fetch(`/api/jobs/${jobId}`, { // Corrected: Fetch single job here
        headers: { 'Authorization': `Bearer ${token}` } // Send token to get private_details if poster
      });
      const data = await response.json();

      if (response.ok) {
        setJob(data);
        // Pre-fill assignment modal location from job's public location initially
        setAssignmentDetails(prev => ({ ...prev, location: data.location || '' }));
      } else {
        if (response.status === 404) {
            setApiError("Job not found.");
        } else {
            setApiError(data.message || "Failed to load job details.");
        }
      }
    } catch (error) {
      console.error("Network error fetching job details:", error);
      setApiError("Network error. Could not load job details.");
    } finally {
      hideLoading();
    }
  };

  // Function to fetch interested users for this job
  const fetchInterestedUsers = async () => {
    if (!isLoggedIn || !token || !currentUser || !jobId) {
      return;
    }
    showLoading("Loading interested users...");
    setApiError("");
    try {
      const response = await fetch(`/api/jobs/${jobId}/interested-users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (response.ok) {
        setInterestedUsers(data);
      } else {
        if (response.status === 403) {
            setApiError("You are not authorized to view interested users for this job.");
        } else {
            setApiError(data.message || "Failed to load interested users.");
        }
      }
    } catch (error) {
      console.error("Network error fetching interested users:", error);
      setApiError("Network error. Could not load interested users.");
    } finally {
      hideLoading();
    }
  };

  // Function to mark job as filled
  const handleMarkFilled = async () => {
    if (!isLoggedIn || !token || !currentUser || !job || job.posted_by_user_id !== currentUser.id) {
        setApiError("You are not authorized to mark this job as filled.");
        return;
    }
    if (job.status === 'filled') {
        setApiError("This job is already marked as filled.");
        return;
    }

    showLoading("Marking job as filled...");
    setApiError("");
    try {
      const response = await fetch(`/api/jobs/${job.id}/mark-filled`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();

      if (response.ok) {
        console.log("Job marked as filled successfully:", data);
        setJob(prevJob => ({ ...prevJob, status: data.job.status })); // Update job status in state
      } else {
        setApiError(data.message || "Failed to mark job as filled.");
      }
    } catch (error) {
      console.error("Network error marking job as filled:", error);
      setApiError("Network error. Could not mark job as filled.");
    } finally {
      hideLoading();
    }
  };

  // Function to undo mark as filled
  const handleUndoMarkFilled = async () => {
    if (!isLoggedIn || !token || !currentUser || !job || job.posted_by_user_id !== currentUser.id) {
      setApiError("You are not authorized to undo marking this job as filled.");
      return;
    }
    if (job.status !== 'filled') {
        setApiError("This job is not currently marked as filled.");
        return;
    }

    showLoading("Undoing 'filled' status...");
    setApiError("");
    try {
      const response = await fetch(`/api/jobs/${job.id}/undo-filled`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
      });
      const data = await response.json();

      if (response.ok) {
        console.log("Undo 'filled' successful:", data);
        setJob(prevJob => ({ ...prevJob, status: data.job.status })); // Update job status (should be 'open' or 'assigned')
      } else {
        setApiError(data.message || "Failed to undo 'filled' status.");
      }
    } catch (error) {
      console.error("Network error undoing 'filled' status:", error);
      setApiError("Network error. Could not undo 'filled' status.");
    } finally {
      hideLoading();
    }
  };


  // Handler to open assignment modal
  const openAssignModal = (user) => {
    setSelectedUserToAssign(user);
    setAssignmentDetails({
      location: job.location || '',
      details: job.private_details || '',
      imageUrls: job.private_image_urls || [],
    });
    setAssignmentPreviewUrls(job.private_image_urls || []);
    setAssignmentErrors({});
    setShowAssignModal(true);
  };

  // Handle image upload for assignment details (for new images added at assignment time)
  const handleAssignmentImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const urls = files.map(file => URL.createObjectURL(file));
    setAssignmentDetails(prev => ({ ...prev, imageUrls: [...prev.imageUrls, ...files] }));
    setAssignmentPreviewUrls(prev => [...prev, ...urls]);
  };

  const removeAssignmentImage = (index) => {
    const newImages = assignmentDetails.imageUrls.filter((_, i) => i !== index);
    const newPreviews = assignmentPreviewUrls.filter((_, i) => i !== index);
    setAssignmentDetails(prev => ({ ...prev, imageUrls: newImages }));
    setAssignmentPreviewUrls(newPreviews);
  };

  const validateAssignmentForm = () => {
    const newErrors = {};
    if (!assignmentDetails.location.trim()) newErrors.location = "Exact location is required.";
    if (!assignmentDetails.details.trim()) newErrors.details = "Additional details are required.";
    setAssignmentErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle job assignment submission
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setAssignmentErrors({});

    if (!validateAssignmentForm()) return;
    if (!selectedUserToAssign) {
        setAssignmentErrors(prev => ({ ...prev, general: "No user selected for assignment." }));
        return;
    }

    showLoading(`Assigning job to ${selectedUserToAssign.name}...`);
    try {
        const response = await fetch(`/api/jobs/${job.id}/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                assigned_user_id: selectedUserToAssign.id,
                assigned_location: assignmentDetails.location,
                assigned_details: assignmentDetails.details,
                assigned_image_urls: assignmentDetails.imageUrls.map(file => URL.createObjectURL(file))
            }),
        });
        const data = await response.json();

        if (response.ok) {
            console.log("Job assigned successfully:", data);
            setInterestedUsers(prevUsers => prevUsers.map(user => 
                user.id === selectedUserToAssign.id
                    ? { ...user, application_status: 'assigned' }
                    : user
            ));
            setShowAssignModal(false);
            fetchInterestedUsers(); 
        } else {
            console.error("Failed to assign job:", data.message || "Unknown error");
            setAssignmentErrors(prev => ({ ...prev, general: data.message || "Failed to assign job. Please try again." }));
        }
    } catch (error) {
        console.error("Network error assigning job:", error);
        setAssignmentErrors(prev => ({ ...prev, general: "Network error. Could not assign job." }));
    } finally {
        hideLoading();
    }
  };

  // Handle unassign job
  const handleUnassign = async (assignedUserId, assignedUserName) => {
    if (!isLoggedIn || !token || !currentUser || !job || job.posted_by_user_id !== currentUser.id) {
        setApiError("You are not authorized to unassign this job.");
        return;
    }
    if (!window.confirm(`Are you sure you want to unassign ${assignedUserName} from this job?`)) {
        return;
    }

    showLoading(`Unassigning ${assignedUserName}...`);
    setApiError("");
    try {
      const response = await fetch(`/api/jobs/${job.id}/assign/${assignedUserId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok) {
        console.log("Job unassigned successfully:", data);
        setInterestedUsers(prevUsers => prevUsers.map(user =>
            user.id === assignedUserId
                ? { ...user, application_status: null }
                : user
        ));
        fetchInterestedUsers(); 
      } else {
        setApiError(data.message || "Failed to unassign job.");
      }
    } catch (error) {
      console.error("Network error unassigning job:", error);
      setApiError("Network error. Could not unassign job.");
    } finally {
      hideLoading();
    }
  };

  // NEW: Handle Delete Job
  const handleDeleteJob = async () => {
    if (!isLoggedIn || !token || !currentUser || !job || job.posted_by_user_id !== currentUser.id) {
        setApiError("You are not authorized to delete this job.");
        return;
    }
    if (!window.confirm(`Are you sure you want to delete "${job.title}"? This will move it to your deleted posts.`)) {
        return;
    }

    showLoading(`Deleting "${job.title}"...`);
    setApiError("");
    try {
      const response = await fetch(`/api/jobs/${job.id}`, { // Call the DELETE endpoint
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();

      if (response.ok) {
        console.log("Job deleted successfully:", data);
        alert(`Job "${job.title}" has been moved to deleted posts.`);
        navigate('/my-jobs?filter=posted'); // Navigate back to posted jobs
      } else {
        setApiError(data.message || "Failed to delete job.");
      }
    } catch (error) {
      console.error("Network error deleting job:", error);
      setApiError("Network error. Could not delete job.");
    } finally {
      hideLoading();
    }
  };


  useEffect(() => {
    fetchJobDetails();
    fetchInterestedUsers();
  }, [jobId, token, isLoggedIn, currentUser]);

  if (!isLoggedIn) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl font-semibold">Please log in to view job details.</p>
        <Link to="/login" className="ml-4 text-blue-600 hover:underline">Go to Login</Link>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-red-600">
        {apiError}
        {apiError.includes("not found") && <Link to="/user/home" className="ml-4 text-blue-600 hover:underline">Go Home</Link>}
      </div>
    );
  }

  if (!job) {
    return <div className="pt-24 min-h-screen flex items-center justify-center text-gray-500">Loading job details...</div>;
  }

  const isPoster = currentUser && job.posted_by_user_id === currentUser.id;
  const isJobFilled = job.status === 'filled';
  const hasAnyAssignment = interestedUsers.some(user => user.application_status === 'assigned');

  // Helper to determine the status text for JobDetailsPage
  const getStatusDisplay = () => {
    let statusText = "";
    let statusColorClass = "";

    if (isJobFilled) {
      statusText = "FILLED";
      statusColorClass = "text-red-500";
    } else if (hasAnyAssignment) {
      statusText = "OPEN (ASSIGNED)";
      statusColorClass = "text-purple-500";
    } else {
      statusText = "OPEN";
      statusColorClass = "text-green-600";
    }
    return { statusText, statusColorClass };
  };
  const { statusText, statusColorClass } = getStatusDisplay();

  return (
    <div className="pt-24 min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-xl shadow-md mt-6 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-3xl font-bold text-blue-800 dark:text-blue-400">{job.title}</h2>
            {isPoster && !isJobFilled && (
                <button
                    onClick={handleDeleteJob}
                    className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors duration-200 flex items-center gap-1"
                >
                    <Trash2 className="w-5 h-5" /> Delete Job
                </button>
            )}
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-4">{job.description}</p>
        
        {/* Private Details for Poster */}
        {isPoster && job.private_details && (
            <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Your Private Job Notes:</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{job.private_details}</p>
                {job.private_image_urls && job.private_image_urls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {job.private_image_urls.map((imgUrl, idx) => (
                            <img key={idx} src={imgUrl} alt={`Private Ref ${idx + 1}`} className="w-20 h-20 object-cover rounded-md shadow-sm" />
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* Assigned Details for Worker */}
        {!isPoster && job.assigned_details_for_user && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
                <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Your Assignment Details:</h4>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
                    <strong>Location:</strong> {job.assigned_location_for_user}
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-200 mb-2">
                    <strong>Instructions:</strong> {job.assigned_details_for_user}
                </p>
                {job.assigned_image_urls_for_user && job.assigned_image_urls_for_user.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {job.assigned_image_urls_for_user.map((imgUrl, idx) => (
                            <img key={idx} src={imgUrl} alt={`Assigned Ref ${idx + 1}`} className="w-20 h-20 object-cover rounded-md shadow-sm" />
                        ))}
                    </div>
                )}
            </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
            <p><strong>Pay:</strong> {job.pay} ({job.pay_type})</p>
            <p><strong>Category:</strong> {job.category}</p>
            <p><strong>Location:</strong> {job.location}</p>
            <p><strong>Hours:</strong> {job.total_hours} hrs</p>
            <p><strong>Starts:</strong> {new Date(job.start_time).toLocaleString()}</p>
            <p><strong>Ends:</strong> {new Date(job.end_time).toLocaleString()}</p>
            <p><strong>Status:</strong> <span className={`font-semibold ${statusColorClass}`}>{statusText}</span></p>
        </div>

        {/* Mark as Filled Button / Undo Mark as Filled Button */}
        {isPoster && !isJobFilled && ( // Show "Mark as Filled" if not filled
            <button
                onClick={handleMarkFilled}
                className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200"
            >
                Mark as Requirement Filled
            </button>
        )}
        {isPoster && isJobFilled && ( // Show "Undo Mark as Filled" if filled
            <button
                onClick={handleUndoMarkFilled}
                className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center gap-2"
            >
                <Undo2 className="w-5 h-5" /> Undo Mark as Filled
            </button>
        )}
        {isJobFilled && isPoster && (
            <p className="mt-4 text-red-600 dark:text-red-400 font-semibold">This job is marked as FILLED.</p>
        )}
        {hasAnyAssignment && isPoster && !isJobFilled && ( // Show assigned message only if not filled
            <p className="mt-4 text-purple-600 dark:text-purple-400 font-semibold">This job has active assignments.</p>
        )}


        {/* Interested Users Section (only for poster) */}
        {isPoster && (
          <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-4">Users Interested ({interestedUsers.length})</h3>
            {interestedUsers.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No users have expressed interest yet.</p>
            ) : (
              <div className="space-y-4">
                {interestedUsers.map(user => (
                  <div key={user.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-sm">
                    <div className="flex items-center gap-4">
                      <img
                        src={user.avatar_url || DEFAULT_AVATAR_URL}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-blue-300 dark:border-blue-500"
                      />
                      <div>
                        <Link to={`/user/${user.id}`} className="text-lg font-semibold text-blue-700 dark:text-blue-300 hover:underline">
                          {user.name}
                        </Link>
                        {/* Display Rating for interested user */}
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            {(user.average_rating === null || user.average_rating === 0) ? (
                                <span>No ratings</span>
                            ) : (
                                <>
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <Star
                                            key={i}
                                            className={`w-4 h-4 ${i <= parseFloat(user.average_rating) ? "text-yellow-400 fill-current" : "text-gray-300 dark:text-gray-600"}`}
                                        />
                                    ))}
                                    <span className="ml-1">({parseFloat(user.average_rating).toFixed(1)})</span>
                                    {user.total_ratings_count > 0 && <span className="ml-1">({user.total_ratings_count})</span>}
                                </>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link to={`/messages?participantId=${user.id}`} className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition" title="Message User">
                            <MessageCircle className="w-5 h-5" />
                        </Link>
                        {/* Assign Button / Assigned Status / Unassign Button */}
                        {user.application_status === 'assigned' ? (
                            <button
                                onClick={() => handleUnassign(user.id, user.name)}
                                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                            >
                                Unassign
                            </button>
                        ) : (
                            !isJobFilled && (
                                <button
                                    onClick={() => openAssignModal(user)}
                                    className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                                >
                                    Assign
                                </button>
                            )
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && selectedUserToAssign && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-lg text-gray-900 dark:text-gray-100">
            <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-4">Assign Job to {selectedUserToAssign.name}</h3>
            {assignmentErrors.general && <p className="text-red-600 mb-4">{assignmentErrors.general}</p>}
            
            <form onSubmit={handleAssignSubmit} className="space-y-4">
              {/* Location */}
              <div>
                <label htmlFor="assignLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Exact Location / Address</label>
                <input
                  id="assignLocation"
                  type="text"
                  name="location"
                  value={assignmentDetails.location}
                  onChange={(e) => setAssignmentDetails(prev => ({ ...prev, location: e.target.value }))}
                  className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  required
                />
                {assignmentErrors.location && <p className="text-red-500 text-xs">{assignmentErrors.location}</p>}
              </div>

              {/* Details */}
              <div>
                <label htmlFor="assignDetails" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Additional Details</label>
                <textarea
                  id="assignDetails"
                  name="details"
                  value={assignmentDetails.details}
                  onChange={(e) => setAssignmentDetails(prev => ({ ...prev, details: e.target.value }))}
                  className="input w-full min-h-[100px] dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  placeholder="Provide any specific instructions, meeting points, tools needed, etc."
                  required
                ></textarea>
                {assignmentErrors.details && <p className="text-red-500 text-xs">{assignmentErrors.details}</p>}
              </div>

              {/* Image Upload */}
              <div>
                <label htmlFor="assignImages" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload Reference Images (Optional)</label>
                <input
                  id="assignImages"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleAssignmentImageUpload}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                             file:mr-4 file:py-2 file:px-4
                             file:rounded-full file:border-0
                             file:text-sm file:font-semibold
                             file:bg-blue-50 file:text-blue-700
                             hover:file:bg-blue-100"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {assignmentPreviewUrls.map((url, idx) => (
                    <div key={idx} className="relative group w-20 h-20">
                      <img src={url} alt="preview" className="w-full h-full object-cover rounded-md" />
                      <button
                        type="button"
                        onClick={() => removeAssignmentImage(idx)}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs p-1"
                        title="Remove image"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="bg-gray-300 text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700"
                >
                  Assign Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDetailsPage;