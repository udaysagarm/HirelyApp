// src/pages/UserPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, MessageCircle, Flag, ThumbsUp } from 'lucide-react';
import { useLoading } from '../context/LoadingContext';
import { useAuth } from '../context/AuthContext';

const DEFAULT_AVATAR_URL = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const UserPage = () => {
  const { userId } = useParams(); // This param is the numerical user ID
  const [userProfile, setUserProfile] = useState(null);
  const [apiError, setApiError] = useState("");
  const { showLoading, hideLoading } = useLoading();
  const { currentUser, isLoggedIn, token } = useAuth();

  const [showRateModal, setShowRateModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [ratingForm, setRatingForm] = useState({ rating: 0, comment: '' });
  const [reportForm, setReportForm] = useState({ reason: '', details: '' });
  const [formErrors, setFormErrors] = useState({});

  // Function to fetch user profile (including rating data from backend)
  const fetchUserProfile = async () => {
    if (!userId) {
      setApiError("No user ID provided in URL.");
      return;
    }
    setApiError("");
    showLoading(`Loading user profile...`);
    try {
      const response = await fetch(`/api/users/id/${userId}`, {
        headers: {
            ...(isLoggedIn && token && { 'Authorization': `Bearer ${token}` })
        }
      });
      const data = await response.json();

      if (response.ok) {
        setUserProfile(data);
        // Set rating form for pre-filling
        setRatingForm({ rating: data.my_rating || 0, comment: '' }); 
      } else {
        if (response.status === 404) {
            setApiError("User not found.");
        } else {
            setApiError(data.message || "Failed to load user profile.");
        }
      }
    } catch (error) {
      console.error("Network error fetching user profile:", error);
      setApiError("Network error. Could not load user profile.");
    } finally {
      hideLoading();
    }
  };

  // Handle Rating Submission
  const handleRateSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    if (ratingForm.rating === 0) {
      setFormErrors({ rating: "Please select a rating." });
      return;
    }

    showLoading("Submitting rating...");
    try {
      const response = await fetch(`/api/users/${userProfile.id}/rate`, { // Backend endpoint to rate user
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: ratingForm.rating, comment: ratingForm.comment }),
      });
      const data = await response.json();

      if (response.ok) {
        console.log("Rating submitted successfully:", data);
        alert("Thank you for your rating!");
        setShowRateModal(false);
        fetchUserProfile(); // Refresh profile to show new rating
      } else {
        setFormErrors({ general: data.message || "Failed to submit rating." });
      }
    } catch (error) {
      console.error("Network error submitting rating:", error);
      setFormErrors({ general: "Network error. Could not submit rating." });
    } finally {
      hideLoading();
    }
  };

  // Handle Report Submission
  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setFormErrors({});
    if (!reportForm.reason.trim()) {
      setFormErrors({ reason: "Please provide a reason for the report." });
      return;
    }

    showLoading("Submitting report...");
    try {
      const response = await fetch(`/api/users/${userProfile.id}/report`, { // Backend endpoint to report user
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reportForm.reason, details: reportForm.details }),
      });
      const data = await response.json();

      if (response.ok) {
        console.log("Report submitted successfully:", data);
        alert("Thank you. Your report has been submitted for review.");
        setShowReportModal(false);
      } else {
        setFormErrors({ general: data.message || "Failed to submit report." });
      }
    } catch (error) {
      console.error("Network error submitting report:", error);
      setFormErrors({ general: "Network error. Could not submit report." });
    } finally {
      hideLoading();
    }
  };


  useEffect(() => {
    fetchUserProfile();
  }, [userId, token, isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl font-semibold">Please log in to view user profiles.</p>
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

  if (!userProfile) {
    return <div className="pt-24 min-h-screen flex items-center justify-center text-gray-500">Loading user profile...</div>;
  }

  const isMyProfile = currentUser && userProfile.id === currentUser.id;

  return (
    <div className="pt-24 min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={userProfile.avatar_url || DEFAULT_AVATAR_URL}
            alt={userProfile.name}
            className="w-20 h-20 rounded-full object-cover border-2 border-blue-500 dark:border-blue-400"
          />
          <div>
            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-400">{userProfile.name}</h2>
            <p className="text-gray-600 dark:text-gray-300">{userProfile.email}</p>
          </div>
        </div>

        {/* Display Rating */}
        <div className="flex items-center mb-4">
            {(userProfile.average_rating === null || userProfile.average_rating === 0) ? (
                <span className="text-sm text-gray-500 dark:text-gray-400">No ratings yet.</span>
            ) : (
                <>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                            key={i}
                            className={`w-6 h-6 ${i <= parseFloat(userProfile.average_rating) ? "text-yellow-400 fill-current" : "text-gray-300 dark:text-gray-600"}`}
                        />
                    ))}
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        ({parseFloat(userProfile.average_rating).toFixed(1)} / 5) from {userProfile.total_ratings_count || 0} ratings
                    </span>
                </>
            )}
        </div>

        <p className="text-gray-700 dark:text-gray-300 mb-4">
          <strong>Location:</strong> {userProfile.location}
        </p>

        {userProfile.phone && (
            <p className="text-gray-700 dark:text-gray-300 mb-4">
            <strong>Phone:</strong> {userProfile.phone}
            </p>
        )}

        {/* Action Buttons (Message, Rate, Report) */}
        <div className="mt-6 flex space-x-4">
            {!isMyProfile && ( // Cannot message/rate/report self
                <>
                    <Link to={`/messages?participantId=${userProfile.id}`} className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5" /> Message
                    </Link>
                    <button
                        onClick={() => setShowRateModal(true)}
                        className="bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors duration-200 flex items-center gap-2"
                    >
                        <ThumbsUp className="w-5 h-5" /> Rate User
                    </button>
                    <button
                        onClick={() => setShowReportModal(true)}
                        className="bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors duration-200 flex items-center gap-2"
                    >
                        <Flag className="w-5 h-5" /> Report User
                    </button>
                </>
            )}
        </div>
      </div>

      {/* Rate User Modal */}
      {showRateModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-lg text-gray-900 dark:text-gray-100">
            <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-4">Rate {userProfile.name}</h3>
            {formErrors.general && <p className="text-red-600 mb-4">{formErrors.general}</p>}
            
            <form onSubmit={handleRateSubmit} className="space-y-4">
              <div>
                <label htmlFor="rating" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rating (1-5 Stars)</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-8 h-8 cursor-pointer ${ratingForm.rating >= star ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`}
                      onClick={() => setRatingForm(prev => ({ ...prev, rating: star }))}
                    />
                  ))}
                </div>
                {formErrors.rating && <p className="text-red-500 text-xs mt-1">{formErrors.rating}</p>}
              </div>
              <div>
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Comment (Optional)</label>
                <textarea
                  id="comment"
                  value={ratingForm.comment}
                  onChange={(e) => setRatingForm(prev => ({ ...prev, comment: e.target.value }))}
                  className="input w-full min-h-[80px] dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  placeholder="Share your experience..."
                ></textarea>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button type="button" onClick={() => setShowRateModal(false)} className="bg-gray-300 text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700">Submit Rating</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Report User Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-lg text-gray-900 dark:text-gray-100">
            <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-4">Report {userProfile.name}</h3>
            {formErrors.general && <p className="text-red-600 mb-4">{formErrors.general}</p>}
            
            <form onSubmit={handleReportSubmit} className="space-y-4">
              <div>
                <label htmlFor="reportReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Report</label>
                <input
                  id="reportReason"
                  type="text"
                  value={reportForm.reason}
                  onChange={(e) => setReportForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  placeholder="e.g., Inappropriate behavior, no-show, fake job"
                  required
                />
                {formErrors.reason && <p className="text-red-500 text-xs mt-1">{formErrors.reason}</p>}
              </div>
              <div>
                <label htmlFor="reportDetails" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Detailed Description (Optional)</label>
                <textarea
                  id="reportDetails"
                  value={reportForm.details}
                  onChange={(e) => setReportForm(prev => ({ ...prev, details: e.target.value }))}
                  className="input w-full min-h-[80px] dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                  placeholder="Provide more details about the incident..."
                ></textarea>
              </div>
              <div className="flex justify-end space-x-4 mt-6">
                <button type="button" onClick={() => setShowReportModal(false)} className="bg-gray-300 text-gray-800 px-5 py-2 rounded-lg hover:bg-gray-400 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-700">Cancel</button>
                <button type="submit" className="bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700">Submit Report</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPage;