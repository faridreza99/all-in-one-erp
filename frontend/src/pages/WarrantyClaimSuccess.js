import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Home, FileText } from 'lucide-react';

const WarrantyClaimSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const claimResponse = location.state?.claimResponse;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/10 backdrop-blur-md rounded-2xl p-8 md:p-12 border border-white/20 text-center">
        {/* Success Icon */}
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-green-600 to-emerald-600 mb-6">
          <CheckCircle className="w-12 h-12 text-white" />
        </div>

        {/* Success Message */}
        <h1 className="text-4xl font-bold text-white mb-4">
          Claim Registered Successfully!
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Your warranty claim has been submitted and our team will review it shortly.
        </p>

        {/* Claim Details */}
        {claimResponse && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 text-left">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-400" />
              Claim Details
            </h2>
            <div className="space-y-3 text-gray-300">
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="font-semibold text-yellow-400 capitalize">
                  {claimResponse.warranty_status?.replace('_', ' ') || 'Claimed'}
                </span>
              </div>
              {claimResponse.claim_event_id && (
                <div className="flex justify-between">
                  <span>Reference ID:</span>
                  <span className="font-mono text-sm">
                    {claimResponse.claim_event_id.slice(0, 12)}...
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-6 mb-8">
          <h3 className="text-white font-semibold mb-3">What Happens Next?</h3>
          <ul className="text-gray-300 space-y-2 text-left">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Our team will inspect your claim within 24 hours</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>We'll contact you via phone if additional information is needed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>You'll receive an update on the resolution within 2-3 business days</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-2)}
            className="bg-white/10 border border-white/20 text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            Back to Warranty
          </button>
        </div>

        {/* Support Contact */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <p className="text-gray-400 text-sm">
            Need immediate assistance?{' '}
            <a href="mailto:support@myerp.com" className="text-blue-400 hover:text-blue-300">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default WarrantyClaimSuccess;
