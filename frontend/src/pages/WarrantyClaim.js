import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '../App';
import { AlertTriangle, Upload, X, CheckCircle, FileImage } from 'lucide-react';
import { toast } from 'sonner';

const WarrantyClaim = () => {
  const { warranty_id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_phone: '',
    customer_email: '',
    reported_issue: '',
    preferred_action: 'replacement',
    images: []
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (formData.images.length + files.length > 5) {
      toast.error('Maximum 5 images allowed');
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file, index) => {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const response = await axios.post(
          `${API}/upload-image`,
          formDataUpload,
          {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: true
          }
        );
        return response.data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData({
        ...formData,
        images: [...formData.images, ...uploadedUrls]
      });
      toast.success(`${uploadedUrls.length} image(s) uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.warning('Using placeholder for demonstration. In production, images would be uploaded securely.');
      const placeholders = files.map((_, index) => 
        `https://via.placeholder.com/400x300?text=Claim+Evidence+${formData.images.length + index + 1}`
      );
      setFormData({
        ...formData,
        images: [...formData.images, ...placeholders]
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.customer_name || !formData.customer_phone) {
      toast.error('Please provide your name and phone number');
      return;
    }

    if (!formData.reported_issue || formData.reported_issue.length < 10) {
      toast.error('Please describe the issue in detail (minimum 10 characters)');
      return;
    }

    if (formData.images.length === 0) {
      toast.warning('It is recommended to upload at least one image as evidence');
    }

    setSubmitting(true);
    try {
      const response = await axios.post(
        `${API}/warranty/${warranty_id}/claim`,
        {
          customer_name: formData.customer_name,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email || null,
          reported_issue: formData.reported_issue,
          images: formData.images,
          preferred_action: formData.preferred_action
        },
        { withCredentials: true }
      );

      toast.success('Claim registered successfully!');
      navigate(`/warranty/claim-success`, {
        state: { claimResponse: response.data }
      });
    } catch (error) {
      console.error('Claim submission error:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 mb-6 border border-white/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-600 to-red-600">
              <AlertTriangle className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Register Warranty Claim</h1>
              <p className="text-gray-300">Submit your warranty claim with evidence</p>
            </div>
          </div>

          <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
            <p className="text-blue-200 text-sm">
              <strong>Important:</strong> Please provide accurate information and clear photos of the issue.
              Our team will review your claim within 24 hours.
            </p>
          </div>
        </div>

        {/* Claim Form */}
        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 md:p-8 border border-white/20">
          {/* Contact Information */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Contact Information</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-300 mb-2">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleInputChange}
                  required
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+880 1XX XXX XXXX"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-2">Email (Optional)</label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleInputChange}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
          </div>

          {/* Issue Description */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Issue Description</h2>
            <div>
              <label className="block text-gray-300 mb-2">
                Describe the Problem <span className="text-red-400">*</span>
              </label>
              <textarea
                name="reported_issue"
                value={formData.reported_issue}
                onChange={handleInputChange}
                required
                rows={5}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Please describe the issue in detail: What happened? When did it occur? Any error messages or unusual behavior?"
              />
              <p className="text-gray-400 text-sm mt-2">
                {formData.reported_issue.length}/500 characters (minimum 10)
              </p>
            </div>
          </div>

          {/* Preferred Action */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Preferred Resolution</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="preferred_action"
                  value="replacement"
                  checked={formData.preferred_action === 'replacement'}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="bg-white/10 border-2 border-white/20 peer-checked:border-blue-500 peer-checked:bg-blue-500/20 rounded-lg p-4 transition-all">
                  <p className="text-white font-semibold mb-1">Product Replacement</p>
                  <p className="text-gray-400 text-sm">Get a new unit of the same product</p>
                </div>
              </label>

              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="preferred_action"
                  value="refund"
                  checked={formData.preferred_action === 'refund'}
                  onChange={handleInputChange}
                  className="sr-only peer"
                />
                <div className="bg-white/10 border-2 border-white/20 peer-checked:border-blue-500 peer-checked:bg-blue-500/20 rounded-lg p-4 transition-all">
                  <p className="text-white font-semibold mb-1">Refund</p>
                  <p className="text-gray-400 text-sm">Receive a cash refund for the product</p>
                </div>
              </label>
            </div>
          </div>

          {/* Image Upload */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Evidence Photos</h2>
            <p className="text-gray-300 mb-4">Upload clear photos showing the issue (max 5 images)</p>

            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-white mb-2">Click to upload images</p>
                <p className="text-gray-400 text-sm">PNG, JPG up to 10MB each</p>
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading || formData.images.length >= 5}
              />
            </label>

            {uploading && (
              <div className="mt-4 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <p className="text-gray-300 mt-2">Uploading images...</p>
              </div>
            )}

            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                {formData.images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Evidence ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 bg-white/10 border border-white/20 text-white px-6 py-4 rounded-lg font-semibold hover:bg-white/20 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-4 rounded-lg font-semibold hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Submit Claim
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WarrantyClaim;
