import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { FileText, Plus, Edit2, Trash2 } from 'lucide-react';
import SectorLayout from '../../components/SectorLayout';
import { API } from '../../App';
import { toast } from 'sonner';
import Footer from '../../components/Footer';

const JobFilesPage = ({ user, onLogout }) => {
  const [jobs, setJobs] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [formData, setFormData] = useState({
    job_number: '',
    shipment_id: '',
    client_name: '',
    importer_name: '',
    exporter_name: '',
    port_of_loading: '',
    port_of_discharge: '',
    commodity: '',
    hs_code: '',
    duty_amount: '',
    vat_amount: '',
    other_charges: ''
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await axios.get(`${API}/cnf/jobs`);
      setJobs(response.data);
    } catch (error) {
      toast.error('Failed to fetch job files');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingJob) {
        await axios.put(`${API}/cnf/jobs/${editingJob.id}`, formData);
        toast.success('Job file updated successfully');
      } else {
        await axios.post(`${API}/cnf/jobs`, formData);
        toast.success('Job file created successfully');
      }
      setShowModal(false);
      resetForm();
      fetchJobs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save job file');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this job file?')) {
      try {
        await axios.delete(`${API}/cnf/jobs/${id}`);
        toast.success('Job file deleted successfully');
        fetchJobs();
      } catch (error) {
        toast.error('Failed to delete job file');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      job_number: '',
      shipment_id: '',
      client_name: '',
      importer_name: '',
      exporter_name: '',
      port_of_loading: '',
      port_of_discharge: '',
      commodity: '',
      hs_code: '',
      duty_amount: '',
      vat_amount: '',
      other_charges: ''
    });
    setEditingJob(null);
  };

  const getStatusColor = (status) => {
    const colors = {
      created: 'bg-gray-500/20 text-gray-400',
      in_progress: 'bg-blue-500/20 text-blue-400',
      documentation: 'bg-purple-500/20 text-purple-400',
      clearance: 'bg-orange-500/20 text-orange-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <div className="min-h-screen gradient-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Job Files
              </h1>
              <p className="text-gray-400">Manage clearance job files</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Job File
            </button>
          </div>

          <div className="grid gap-4">
            {jobs.map((job) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-purple-500 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{job.job_number}</h3>
                      <p className="text-gray-400">{job.client_name}</p>
                      <div className={`inline-block px-3 py-1 rounded-full text-sm mt-2 ${getStatusColor(job.status)}`}>
                        {job.status?.replace('_', ' ').toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingJob(job);
                        setFormData({
                          job_number: job.job_number,
                          shipment_id: job.shipment_id,
                          client_name: job.client_name,
                          importer_name: job.importer_name,
                          exporter_name: job.exporter_name,
                          port_of_loading: job.port_of_loading,
                          port_of_discharge: job.port_of_discharge,
                          commodity: job.commodity,
                          hs_code: job.hs_code || '',
                          duty_amount: job.duty_amount,
                          vat_amount: job.vat_amount,
                          other_charges: job.other_charges
                        });
                        setShowModal(true);
                      }}
                      className="p-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(job.id)}
                      className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Importer</p>
                    <p className="text-white font-semibold">{job.importer_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Commodity</p>
                    <p className="text-white font-semibold">{job.commodity}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Duty Amount</p>
                    <p className="text-white font-semibold">৳{job.duty_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">VAT Amount</p>
                    <p className="text-white font-semibold">৳{job.vat_amount.toLocaleString()}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-2xl font-bold text-white mb-6">
                  {editingJob ? 'Edit Job File' : 'Add New Job File'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Job Number *</label>
                      <input
                        type="text"
                        required
                        value={formData.job_number}
                        onChange={(e) => setFormData({ ...formData, job_number: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Shipment ID *</label>
                      <input
                        type="text"
                        required
                        value={formData.shipment_id}
                        onChange={(e) => setFormData({ ...formData, shipment_id: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Client Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.client_name}
                        onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Importer Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.importer_name}
                        onChange={(e) => setFormData({ ...formData, importer_name: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Exporter Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.exporter_name}
                        onChange={(e) => setFormData({ ...formData, exporter_name: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Port of Loading *</label>
                      <input
                        type="text"
                        required
                        value={formData.port_of_loading}
                        onChange={(e) => setFormData({ ...formData, port_of_loading: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Port of Discharge *</label>
                      <input
                        type="text"
                        required
                        value={formData.port_of_discharge}
                        onChange={(e) => setFormData({ ...formData, port_of_discharge: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Commodity *</label>
                      <input
                        type="text"
                        required
                        value={formData.commodity}
                        onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">HS Code</label>
                      <input
                        type="text"
                        value={formData.hs_code}
                        onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Duty Amount *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.duty_amount}
                        onChange={(e) => setFormData({ ...formData, duty_amount: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">VAT Amount *</label>
                      <input
                        type="number"
                        required
                        step="0.01"
                        value={formData.vat_amount}
                        onChange={(e) => setFormData({ ...formData, vat_amount: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Other Charges</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.other_charges}
                        onChange={(e) => setFormData({ ...formData, other_charges: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 justify-end mt-6">
                    <button
                      type="button"
                      onClick={() => { setShowModal(false); resetForm(); }}
                      className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all"
                    >
                      {editingJob ? 'Update' : 'Create'} Job File
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </div>
        <Footer />
      </div>
    </SectorLayout>
  );
};

export default JobFilesPage;
