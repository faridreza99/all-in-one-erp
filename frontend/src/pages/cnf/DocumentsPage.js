import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { File, Plus, Edit2, Trash2 } from 'lucide-react';
import SectorLayout from '../../components/SectorLayout';
import { API } from '../../App';
import { toast } from 'sonner';
import { formatDate } from '../../utils/formatters';
import Footer from '../../components/Footer';

const DocumentsPage = ({ user, onLogout }) => {
  const [documents, setDocuments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    shipment_id: '',
    job_file_id: '',
    document_type: '',
    document_number: '',
    issue_date: '',
    expiry_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await axios.get(`${API}/cnf/documents`);
      setDocuments(response.data);
    } catch (error) {
      toast.error('Failed to fetch documents');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/cnf/documents`, formData);
      toast.success('Document added successfully');
      setShowModal(false);
      resetForm();
      fetchDocuments();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add document');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      try {
        await axios.delete(`${API}/cnf/documents/${id}`);
        toast.success('Document deleted successfully');
        fetchDocuments();
      } catch (error) {
        toast.error('Failed to delete document');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      shipment_id: '',
      job_file_id: '',
      document_type: '',
      document_number: '',
      issue_date: '',
      expiry_date: '',
      notes: ''
    });
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <div className="min-h-screen gradient-bg">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Documents
              </h1>
              <p className="text-gray-400">Manage shipping & customs documents</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
            >
              <Plus className="w-5 h-5" />
              Add Document
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600">
                      <File className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{doc.document_type}</h3>
                      <p className="text-sm text-gray-400">{doc.document_number}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div>
                    <p className="text-gray-400">Issue Date</p>
                    <p className="text-white">{formatDate(doc.issue_date)}</p>
                  </div>
                  {doc.expiry_date && (
                    <div>
                      <p className="text-gray-400">Expiry Date</p>
                      <p className="text-white">{formatDate(doc.expiry_date)}</p>
                    </div>
                  )}
                  {doc.notes && (
                    <div>
                      <p className="text-gray-400">Notes</p>
                      <p className="text-white text-xs">{doc.notes}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {showModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-800 rounded-xl p-6 max-w-2xl w-full"
              >
                <h2 className="text-2xl font-bold text-white mb-6">Add Document</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-gray-300 mb-2">Shipment ID *</label>
                      <input
                        type="text"
                        required
                        value={formData.shipment_id}
                        onChange={(e) => setFormData({ ...formData, shipment_id: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Job File ID *</label>
                      <input
                        type="text"
                        required
                        value={formData.job_file_id}
                        onChange={(e) => setFormData({ ...formData, job_file_id: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Document Type *</label>
                      <select
                        required
                        value={formData.document_type}
                        onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      >
                        <option value="">Select Type</option>
                        <option value="Bill of Lading">Bill of Lading</option>
                        <option value="Customs Declaration">Customs Declaration</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Packing List">Packing List</option>
                        <option value="Certificate of Origin">Certificate of Origin</option>
                        <option value="Import License">Import License</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Document Number *</label>
                      <input
                        type="text"
                        required
                        value={formData.document_number}
                        onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Issue Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.issue_date}
                        onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2">Expiry Date</label>
                      <input
                        type="date"
                        value={formData.expiry_date}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows="3"
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
                    />
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
                      className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
                    >
                      Add Document
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

export default DocumentsPage;
