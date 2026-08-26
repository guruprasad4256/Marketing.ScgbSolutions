import React, { useState } from "react";
import axios from "axios";
import Header from "@/components/Header";

const SITES = ['Kyamme', 'Manhours On Hire', 'Tasked', 'Founders Counsel', 'Curated for founders'];

// Fallback logic matching your server configuration
const RAW_URL = import.meta.env.VITE_API_URL || 'https://api.scgbsolutions.com';
const SERVER_URL = RAW_URL.replace(/\/+$/, '');
const endpoint = SERVER_URL.endsWith('/api') ? '/testimonials' : '/api/testimonials';
const uploadEndpoint = SERVER_URL.endsWith('/api') ? '/upload' : '/api/upload';

const TestimonialForm = () => {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [selectedSites, setSelectedSites] = useState(["Manhours On Hire"]);
  
  const [imagePreview, setImagePreview] = useState(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle image upload to Cloudinary using your server route
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show temporary local preview
    setImagePreview(URL.createObjectURL(file));

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(`${SERVER_URL}${uploadEndpoint}`, formData);
      setImageUrl(res.data.url);
      alert("Client photo uploaded successfully!");
    } catch (err) {
      console.error("Upload failed", err);
      alert("Failed to upload image to Cloudinary.");
    } finally {
      setIsUploading(false);
    }
  };

  const toggleSite = (site) => {
    setSelectedSites((prev) =>
      prev.includes(site) ? prev.filter((s) => s !== site) : [...prev, site]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !title.trim() || !role.trim() || !text.trim()) {
      return alert("Please fill out all required fields.");
    }
    if (selectedSites.length === 0) {
      return alert("Please select at least one website to publish this testimonial to.");
    }

    const payload = {
      name: name.trim(),
      title: title.trim(),
      role: role.trim(),
      text: text.trim(),
      rating: rating,
      image: imageUrl || "https://res.cloudinary.com/dqjvtgezs/image/upload/v1781162362/moh-dashboard-images/w5uzcqdywjttz3nw6vpw.webp", // Populated from Cloudinary upload
      targetWebsites: selectedSites,
    };

    try {
      setIsSubmitting(true);
      await axios.post(`${SERVER_URL}${endpoint}`, payload);
      alert("Testimonial added successfully!");
      
      // Reset form states completely
      setName("");
      setTitle("");
      setRole("");
      setText("");
      setRating(5);
      setImageUrl("");
      setImagePreview(null);
      setSelectedSites(["Manhours On Hire"]);
    } catch (error) {
      console.error("Error creating testimonial", error);
      alert("Error saving testimonial: " + (error.response?.data?.error || error.message));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 w-full flex flex-col">
      {/* Integrated Sticky Header */}
      <Header />

      {/* Responsive Form Wrapper Outer Container */}
      <div className="w-full flex-1 px-4 sm:px-6 lg:px-8 py-8 md:py-14 flex items-center justify-center">
        <div className="w-full max-w-2xl p-6 sm:p-8 bg-white border border-slate-200 rounded-[1.5rem] sm:rounded-[2.5rem] shadow-xl font-[Poppins]">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">
            Add Client Testimonial
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mb-6 sm:mb-8">
            Fill out the details below to push a new customer experience live.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 text-left">
            {/* Row 1: Client Name & Avatar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:grid-cols-1 md:gap-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder=""
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1A4484] font-medium text-sm transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center gap-3">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="preview"
                      className="w-11 h-11 rounded-full object-cover shrink-0 border border-slate-200"
                    />
                  ) : (
                    <img
                      src="https://res.cloudinary.com/dqjvtgezs/image/upload/v1781162362/moh-dashboard-images/w5uzcqdywjttz3nw6vpw.webp"
                      alt="preview"
                      className="w-11 h-11 rounded-full object-cover shrink-0 border border-slate-200 shrink-0"
                    />
                  )}
                  <div className="relative flex-1 h-[46px]">
                    <input
                      type="file"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
                      accept="image/*"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors px-2 text-center truncate">
                      {isUploading ? "Uploading..." : imageUrl ? "Change Photo" : "Upload Photo"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Title Hook & Role/Company */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:grid-cols-1 md:gap-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Review Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder=""
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1A4484] font-medium text-sm transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Designation / Role *
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder=""
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1A4484] font-medium text-sm transition-all"
                  required
                />
              </div>
            </div>

            {/* Rating Selection */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Star Rating
              </label>
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:ring-2 focus:ring-[#1A4484] font-bold text-sm transition-all"
              >
                {[5, 4, 3, 2, 1].map((num) => (
                  <option key={num} value={num}>
                    {num} Stars {"★".repeat(num)}
                  </option>
                ))}
              </select>
            </div>

            {/* Testimonial Text Body */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Testimonial Content *
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder=""
                rows={5}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-[#1A4484] text-sm resize-none transition-all text-slate-700 leading-relaxed"
                required
              />
            </div>

            {/* Multi-tenant Selection Grid */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
                Display On Websites:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                {SITES.map((site) => (
                  <label key={site} className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedSites.includes(site)}
                      onChange={() => toggleSite(site)}
                      className="w-4 h-4 rounded border-slate-300 text-[#1A4484] focus:ring-[#1A4484]"
                    />
                    <span className={`text-xs font-bold transition-colors ${selectedSites.includes(site) ? "text-[#1A4484]" : "text-slate-500"}`}>
                      {site}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="w-full py-4 bg-[#1A4484] hover:bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Saving to Database..." : "Save Testimonial"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TestimonialForm;