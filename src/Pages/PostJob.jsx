// src/pages/PostJob.jsx
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useLoading } from "../context/LoadingContext";
import { Link } from "react-router-dom";
import { XCircle } from 'lucide-react'; // Import XCircle for removing image previews

export default function PostJob() {
  const { currentUser, isLoggedIn, token } = useAuth();
  const { showLoading, hideLoading } = useLoading();

  const PAY_TYPES = ["hourly", "flat", "negotiable"];

  // Expanded Categories list
  const categories = [
    "IT Support", "Software Development", "Web Design", "Mobile App Development",
    "Caregiving", "Senior Care", "Childcare",
    "Pet Care", "Dog Walking", "Pet Sitting",
    "Food Services", "Catering", "Cooking", "Meal Prep",
    "Delivery", "Grocery Delivery", "Package Delivery",
    "Tutoring", "Academic Tutoring", "Music Lessons", "Language Lessons",
    "Cleaning", "House Cleaning", "Office Cleaning", "Deep Cleaning",
    "Repair", "Home Repair", "Appliance Repair", "Auto Repair",
    "Yard Work", "Lawn Mowing", "Gardening", "Landscaping",
    "Security", "Event Security", "Personal Security",
    "Event Help", "Event Setup", "Event Staffing",
    "Driving", "Personal Driver", "Delivery Driver",
    "Customer Service", "Virtual Assistant", "Administrative",
    "Sales", "Marketing", "Content Creation", "Writing", "Graphic Design",
    "Photography", "Video Editing", "Translation", "Research",
    "Manual Labor", "Moving Help", "Assembly",
    "Art & Crafts", "Sewing & Alterations", "Personal Shopping",
    "Miscellaneous" // General category
  ];


  const [form, setForm] = useState({
    title: "",
    description: "",
    pay: "",
    pay_type: PAY_TYPES[0],
    category: "",
    startTime: "",
    endTime: "",
    totalHours: "",
    location: currentUser?.location || "",
    postedBy: currentUser?.name || "",
    email: currentUser?.email || "",
    phone: currentUser?.phone || "",
    images: [], // For public job images
    privateDetails: "", // For private notes
    privateImageUrls: [], // For private images
  });

  const [hoursCalculated, setHoursCalculated] = useState(0);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [previewUrls, setPreviewUrls] = useState([]); // For public job images previews
  const [privatePreviewUrls, setPrivatePreviewUrls] = useState([]); // For private images previews


  // Effect to update form if currentUser changes
  useEffect(() => {
    if (currentUser) {
      setForm(prev => ({
        ...prev,
        location: currentUser.location || '',
        postedBy: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
      }));
    }
  }, [currentUser]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    // Recalculate duration always for reference
    if (name === "startTime" || name === "endTime") {
      const start = new Date(name === "startTime" ? value : form.startTime);
      const end = new Date(name === "endTime" ? value : form.endTime);
      const diff = (end - start) / (1000 * 60 * 60); // Difference in hours
      setHoursCalculated(diff > 0 ? diff.toFixed(2) : 0);
    }
  };

  // For PUBLIC job images
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const urls = files.map(file => URL.createObjectURL(file));
    setForm(prev => ({ ...prev, images: [...prev.images, ...files] }));
    setPreviewUrls(prev => [...prev, ...urls]);
  };

  const removeImage = (index) => {
    const newImages = form.images.filter((_, i) => i !== index);
    const newPreviews = previewUrls.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, images: newImages }));
    setPreviewUrls(newPreviews);
  };

  // For PRIVATE job images
  const handlePrivateImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const urls = files.map(file => URL.createObjectURL(file));
    setForm(prev => ({ ...prev, privateImageUrls: [...prev.privateImageUrls, ...files] }));
    setPrivatePreviewUrls(prev => [...prev, ...urls]);
  };

  const removePrivateImage = (index) => {
    const newImages = form.privateImageUrls.filter((_, i) => i !== index);
    const newPreviews = privatePreviewUrls.filter((_, i) => i !== index);
    setForm(prev => ({ ...prev, privateImageUrls: newImages }));
    setPrivatePreviewUrls(newPreviews);
  };


  const validate = () => {
    const newErrors = {};
    if (!form.title) newErrors.title = "Job Title is required";
    if (!form.description) newErrors.description = "Job Description is required";
    if (!form.pay || isNaN(form.pay) || parseFloat(form.pay) <= 0) newErrors.pay = "Valid Pay is required (must be a positive number)";
    if (!form.pay_type) newErrors.pay_type = "Pay Type is required";
    if (!form.category) newErrors.category = "Category is required";
    if (!form.startTime) newErrors.startTime = "Start Time is required";
    if (!form.endTime) newErrors.endTime = "End Time is required";
    if (!form.location) newErrors.location = "Location is required";
    if (!form.totalHours || isNaN(form.totalHours) || parseFloat(form.totalHours) <= 0) newErrors.totalHours = "Total hours must be a positive number.";

    if (form.startTime && form.endTime) {
        if (new Date(form.startTime) >= new Date(form.endTime)) {
            newErrors.time = "End time must be after start time.";
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    if (!isLoggedIn) {
      setApiError("You must be logged in to post a job.");
      return;
    }

    if (!validate()) return;

    showLoading("Posting job...");

    try {
        const response = await fetch('/api/jobs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                title: form.title,
                description: form.description,
                pay: parseFloat(form.pay),
                pay_type: form.pay_type,
                category: form.category,
                startTime: form.startTime,
                endTime: form.endTime,
                totalHours: parseFloat(form.totalHours),
                location: form.location,
                images: form.images.map(file => URL.createObjectURL(file)), // Public images
                private_details: form.privateDetails || null, // Private notes
                private_image_urls: form.privateImageUrls.map(file => URL.createObjectURL(file)) || null, // Private images
            }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log("Job posted successfully:", data);
            setForm({
                title: "", description: "", pay: "", pay_type: PAY_TYPES[0], category: "",
                startTime: "", endTime: "", totalHours: "", location: currentUser?.location || "",
                postedBy: currentUser?.name || "", email: currentUser?.email || "",
                phone: currentUser?.phone || "", 
                images: [], privateDetails: "", privateImageUrls: []
            });
            setHoursCalculated(0);
            setPreviewUrls([]);
            setPrivatePreviewUrls([]);
        } else {
            console.error("Failed to post job:", data.message || "Unknown error");
            setApiError(data.message || "Failed to post job. Please try again.");
        }
    } catch (error) {
        console.error("Network or server error during posting job:", error);
        setApiError("Network error. Please try again later.");
    } finally {
        hideLoading();
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl font-semibold">Please log in to post a job.</p>
        <Link to="/login" className="ml-4 text-blue-600 hover:underline">Go to Login</Link>
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mt-6 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={currentUser?.avatar || "https://cdn-icons-png.flaticon.com/512/149/149071.png"}
            alt="avatar"
            className="w-14 h-14 rounded-full border border-gray-300 dark:border-gray-600"
          />
          <div>
            <h2 className="text-xl font-bold text-blue-800 dark:text-blue-400">Post a New Job</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Posted by {currentUser?.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {apiError && (
            <p className="text-red-600 text-sm mb-4 text-center">{apiError}</p>
          )}
          
          {/* Job Title Field */}
          <div>
            <label htmlFor="jobTitle" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Job Title</label>
            <input 
              id="jobTitle"
              name="title" 
              type="text" 
              placeholder="Job Title (e.g., Dog Walker, IT Support)"
              onChange={handleChange} 
              value={form.title} 
              required
              className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" 
            />
            {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}
          </div>

          {/* Job Description Field */}
          <div>
            <label htmlFor="jobDescription" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Job Description</label>
            <textarea
              id="jobDescription"
              name="description"
              value={form.description}
              onChange={handleChange}
              className="input w-full min-h-[100px] rounded-md resize-y border border-gray-300 dark:border-gray-600 p-3 shadow-sm dark:bg-gray-700 dark:text-gray-100"
              placeholder="Describe the job in detail, what needs to be done, special requirements, etc."
              required
            />
            {errors.description && <p className="text-red-500 text-sm">{errors.description}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pay Amount Field */}
            <div>
              <label htmlFor="payAmount" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Pay Amount</label>
              <input 
                id="payAmount"
                name="pay" 
                type="number" 
                value={form.pay} 
                onChange={handleChange} 
                className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" 
                required
              />
              {errors.pay && <p className="text-red-500 text-sm">{errors.pay}</p>}
            </div>

            {/* Pay Type Field */}
            <div>
              <label htmlFor="payType" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Pay Type</label>
              <select 
                id="payType"
                name="pay_type" 
                value={form.pay_type} 
                onChange={handleChange} 
                className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                required
              >
                {PAY_TYPES.map(type => <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>)}
              </select>
              {errors.pay_type && <p className="text-red-500 text-sm">{errors.pay_type}</p>}
            </div>

            {/* Category Field */}
            <div>
              <label htmlFor="category" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
              <select 
                id="category"
                name="category" 
                value={form.category} 
                onChange={handleChange} 
                className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                required
              >
                <option value="">Select a category</option>
                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              {errors.category && <p className="text-red-500 text-sm">{errors.category}</p>}
            </div>

            {/* Start Time Field */}
            <div>
              <label htmlFor="startTime" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Start Time</label>
              <input 
                id="startTime"
                name="startTime" 
                type="datetime-local" 
                value={form.startTime} 
                onChange={handleChange} 
                className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                required
              />
              {errors.startTime && <p className="text-red-500 text-sm">{errors.startTime}</p>}
            </div>

            {/* End Time Field */}
            <div>
              <label htmlFor="endTime" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">End Time</label>
              <input 
                id="endTime"
                name="endTime" 
                type="datetime-local" 
                value={form.endTime} 
                onChange={handleChange} 
                className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
                required
              />
              {errors.endTime && <p className="text-red-500 text-sm">{errors.endTime}</p>}
              {errors.time && <p className="text-red-500 text-sm">{errors.time}</p>}
            </div>

            {/* Total Hours Field (Manual Input) */}
            <div>
              <label htmlFor="totalHours" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Total Hours (Estimated)</label>
              <input 
                id="totalHours"
                name="totalHours"
                type="number" 
                value={form.totalHours} 
                onChange={handleChange} 
                className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" 
                placeholder={`e.g., ${hoursCalculated} for duration`}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Duration: {hoursCalculated} hours. Adjust as needed for actual work hours.</p>
              {errors.totalHours && <p className="text-red-500 text-sm">{errors.totalHours}</p>}
            </div>

            {/* Location Field */}
            <div>
              <label htmlFor="location" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
              <input 
                id="location"
                name="location" 
                value={form.location} 
                onChange={handleChange} 
                className="input w-full dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600" 
                required
              />
              {errors.location && <p className="text-red-500 text-sm">{errors.location}</p>}
            </div>
          </div>

          {/* Posted By / Email / Phone Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="postedBy" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Posted By</label>
              <input id="postedBy" value={form.postedBy} readOnly className="input w-full bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 cursor-not-allowed" />
            </div>
            <div>
              <label htmlFor="postedEmail" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input id="postedEmail" value={form.email} readOnly className="input w-full bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 cursor-not-allowed" />
            </div>
            <div>
              <label htmlFor="postedPhone" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Phone</label>
              <input id="postedPhone" value={form.phone} readOnly className="input w-full bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 cursor-not-allowed" />
            </div>
          </div>

          {/* Public Images Field */}
          <div className="mt-4">
            <label htmlFor="jobImages" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Upload Public Job Images (Visible to all)</label>
            <label 
              htmlFor="jobImages"
              className="inline-flex items-center justify-center gap-2 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow-md text-sm transition dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              📷 Add Public Images
              <input
                id="jobImages"
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            <div className="flex flex-wrap gap-4 mt-4">
              {previewUrls.map((url, idx) => (
                <div key={idx} className="relative group w-40 h-40">
                  <img src={url} alt="preview" className="w-full h-full object-cover rounded-md" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs p-1"
                    title="Remove image"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* NEW: Private Details Section */}
          <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-xl font-bold text-blue-800 dark:text-blue-400 mb-3">Private Details (Shared only upon assignment)</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              This information will **not** be publicly visible. It will only be shared with users you explicitly assign to this job.
            </p>

            {/* Private Details Textarea */}
            <div className="mb-4">
              <label htmlFor="privateDetails" className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Private Notes / Exact Instructions</label>
              <textarea
                id="privateDetails"
                name="privateDetails"
                value={form.privateDetails}
                onChange={handleChange}
                className="input w-full min-h-[80px] rounded-md resize-y border border-gray-300 dark:border-gray-600 p-3 shadow-sm dark:bg-gray-700 dark:text-gray-100"
                placeholder="e.g., Exact address, specific entry codes, sensitive instructions. This section won't be visible to others until assigned."
              />
              {errors.privateDetails && <p className="text-red-500 text-sm">{errors.privateDetails}</p>}
            </div>

            {/* Private Images Upload */}
            <div>
              <label htmlFor="privateJobImages" className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Upload Private Reference Images (Optional)</label>
              <input
                id="privateJobImages"
                type="file"
                multiple
                accept="image/*"
                onChange={handlePrivateImageUpload}
                className="block w-full text-sm text-gray-500 dark:text-gray-400
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-full file:border-0
                           file:text-sm file:font-semibold
                           file:bg-blue-50 file:text-blue-700
                           hover:file:bg-blue-100"
              />
              <div className="flex flex-wrap gap-4 mt-4">
                {privatePreviewUrls.map((url, idx) => (
                  <div key={idx} className="relative group w-20 h-20">
                    <img src={url} alt="private preview" className="w-full h-full object-cover rounded-md" />
                    <button
                      type="button"
                      onClick={() => removePrivateImage(idx)}
                      className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full text-xs p-1"
                      title="Remove private image"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 text-right">
            <button type="submit" className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 transition dark:bg-blue-600 dark:hover:bg-blue-700">
              Post Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}