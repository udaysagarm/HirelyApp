// src/pages/Profile.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useLoading } from "../context/LoadingContext";
import { Star } from 'lucide-react';

const Profile = () => {
  const { currentUser, token, login } = useAuth();
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useLoading();

  const [profile, setProfile] = useState(currentUser || {});
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const DEFAULT_AVATAR_URL = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  const [avatar, setAvatar] = useState(currentUser?.avatar_url || DEFAULT_AVATAR_URL); // Use avatar_url from current user

  useEffect(() => {
    // Fetch latest current user data to get updated ratings
    const fetchCurrentUserProfile = async () => {
      if (!currentUser?.id || !token) return;
      try {
        const response = await fetch(`/api/users/id/${currentUser.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (response.ok) {
          // Update AuthContext with latest user data (including rating info)
          login(data, token); 
          // Set profile state to this latest data for immediate display
          setProfile(data); 
          setAvatar(data.avatar_url || DEFAULT_AVATAR_URL);
        } else {
          console.error("Failed to fetch current user profile for refresh:", data.message);
        }
      } catch (error) {
        console.error("Network error fetching current user profile:", error);
      }
    };

    if (currentUser) {
      // Set initial profile state from AuthContext
      setProfile(currentUser);
      setAvatar(currentUser.avatar_url || DEFAULT_AVATAR_URL);
      // Fetch fresh data on component mount or currentUser change to get latest ratings
      fetchCurrentUserProfile(); 
    }
  }, [currentUser?.id, token, login]); // Re-run if currentUser.id or token changes


  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result);
      };
      reader.readAsDataURL(file);
      console.log("Avatar file selected for upload. Backend endpoint for file upload needed.");
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!profile.name?.trim()) newErrors.name = "Name is required";
    if (!/^[\w.-]+@[\w.-]+\.\w{2,4}$/.test(profile.email)) newErrors.email = "Invalid email";
    if (!profile.phone || !/^\d{10}$/.test(profile.phone)) newErrors.phone = "Phone must be 10 digits";
    if (!profile.location?.trim()) newErrors.location = "Location required";
    if (profile.preferredDistance !== undefined && (isNaN(profile.preferredDistance) || profile.preferredDistance < 0)) {
        newErrors.preferredDistance = "Preferred distance must be a non-negative number.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    setApiError("");
    if (!validateForm()) return;

    showLoading("Saving profile...");

    try {
      const updatePayload = {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        preferredDistance: parseInt(profile.preferredDistance, 10),
        avatar_url: avatar === DEFAULT_AVATAR_URL ? null : avatar,
      };

      const response = await fetch(`/api/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updatePayload),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Profile updated successfully:", data);
        login(data, token); // Update auth context with new user data
        setIsEditing(false);
      } else {
        console.error("Failed to update profile:", data.message || "Unknown error");
        setApiError(data.message || "Failed to update profile. Please try again.");
      }
    } catch (error) {
      console.error("Network error updating profile:", error);
      setApiError("Network error. Please try again later.");
    } finally {
      hideLoading();
    }
  };

  if (!currentUser) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl font-semibold">Please log in to view your profile.</p>
        <Link to="/login" className="ml-4 text-blue-600 hover:underline">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 bg-gray-100 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mt-6 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        {/* Profile Header */}
        <div className="flex items-center gap-6 mb-8">
          <div className="relative">
            <img
              src={avatar}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-blue-300 dark:border-blue-600"
            />
            <label
              htmlFor="avatarUpload"
              className={`absolute bottom-0 right-0 ${!isEditing ? "opacity-50 cursor-not-allowed" : ""} bg-blue-600 text-white px-2 py-1 text-xs rounded-full hover:bg-blue-700`}
            >
              Change
              <input
                id="avatarUpload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
                disabled={!isEditing}
              />
            </label>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-blue-800 dark:text-blue-400">{profile.name}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile.email}</p>
          </div>
          <div className="text-right space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-yellow-400 text-white px-4 py-2 rounded hover:bg-yellow-500"
              >
                Edit
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Save
              </button>
            )}
          </div>
        </div>

        {/* API Error Display */}
        {apiError && (
            <p className="text-red-600 text-sm mb-4 text-center">{apiError}</p>
        )}

        {/* Display Rating (Now functional with currentUser data) */}
        <div className="flex items-center mb-4">
            {(profile.average_rating === null || profile.average_rating === 0) ? (
                <span className="text-sm text-gray-500 dark:text-gray-400">No ratings yet.</span>
            ) : (
                <>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                            key={i}
                            className={`w-6 h-6 ${i <= parseFloat(profile.average_rating) ? "text-yellow-400 fill-current" : "text-gray-300 dark:text-gray-600"}`}
                        />
                    ))}
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        ({parseFloat(profile.average_rating).toFixed(1)} / 5) from {profile.total_ratings_count || 0} ratings
                    </span>
                </>
            )}
        </div>

        {/* Editable Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name Field */}
          <div>
            <label htmlFor="profileName" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Full Name</label>
            <input
              id="profileName"
              name="name"
              value={profile.name || ''}
              onChange={handleChange}
              className="input dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              disabled={!isEditing}
            />
            {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="profileEmail" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Email</label>
            <input
              id="profileEmail"
              name="email"
              value={profile.email || ''}
              onChange={handleChange}
              className="input dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              disabled={!isEditing}
            />
            {errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
          </div>

          {/* Password Field (Note: For security, full password changes should be a separate flow) */}
          <div>
            <label htmlFor="profilePassword" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Password</label>
            <div className="relative">
              <input
                id="profilePassword"
                name="password"
                type={showPassword ? "text" : "password"}
                value={profile.password || ''} // This is just for demonstration
                onChange={handleChange}
                className="input pr-12 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                disabled={!isEditing}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 dark:text-gray-400"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs">{errors.password}</p>}
          </div>

          {/* Phone Number Field */}
          <div>
            <label htmlFor="profilePhone" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Phone Number</label>
            <input
              id="profilePhone"
              name="phone"
              value={profile.phone || ''}
              onChange={handleChange}
              className="input dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              disabled={!isEditing}
            />
            {errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
          </div>

          {/* Location Field */}
          <div>
            <label htmlFor="profileLocation" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Location</label>
            <input
              id="profileLocation"
              name="location"
              value={profile.location || ''}
              onChange={handleChange}
              className="input dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              disabled={!isEditing}
            />
            {errors.location && <p className="text-red-500 text-xs">{errors.location}</p>}
          </div>

          {/* Preferred Distance Field */}
          <div>
            <label htmlFor="profilePreferredDistance" className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Preferred Distance (miles)</label>
            <input
              id="profilePreferredDistance"
              name="preferredDistance"
              type="number"
              value={profile.preferredDistance || ''}
              onChange={handleChange}
              className="input dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
              disabled={!isEditing}
            />
            {errors.preferredDistance && <p className="text-red-500 text-xs">{errors.preferredDistance}</p>}
          </div>
        </div>

        {/* Non-editable Stats (now directly connected to profile state) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="text-center">
            <p className="text-xl font-bold text-blue-800 dark:text-blue-400">{profile.total_hours_worked || 0} hrs</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Total Hours Worked</p>
          </div>

          <div className="text-center">
            <div className="flex justify-center mb-1">
                {(profile.average_rating === null || profile.average_rating === 0) ? (
                    <span className="text-sm text-gray-500 dark:text-gray-400">No ratings yet.</span>
                ) : (
                    <>
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Star
                                key={i}
                                className={`w-6 h-6 ${i <= parseFloat(profile.average_rating) ? "text-yellow-400 fill-current" : "text-gray-300 dark:text-gray-600"}`}
                            />
                        ))}
                    </>
                )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
                Rating: {(parseFloat(profile.average_rating) || 0).toFixed(1)} / 5
                {profile.total_ratings_count > 0 && ` (${profile.total_ratings_count} ratings)`}
            </p>
          </div>

          <div className="text-center">
            <p className="text-xl font-bold text-blue-800 dark:text-blue-400">{profile.total_jobs_worked || 0}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300">Jobs Worked</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;