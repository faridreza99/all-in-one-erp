import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Search, Package, DollarSign, Calendar, Hash, Building2, Trash2, X, ChevronDown, ChevronUp, Upload, FileText, CheckCircle, Clock, AlertCircle, Shield } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { API } from '../App';
import BackButton from '../components/BackButton';
import SectorLayout from '../components/SectorLayout';

const PurchasesPage = ({ user, onLogout }) => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPurchase, setExpandedPurchase] = useState(null);
  const [showReceiptUpload, setShowReceiptUpload] = useState(null);
  const [showWarrantyForm, setShowWarrantyForm] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedReceiptFile, setSelectedReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [applyingStock, setApplyingStock] = useState(null);
  const [supplierWarranties, setSupplierWarranties] = useState({});
  const [formData, setFormData] = useState({
    supplier_id: '',
    items: [],
    payment_status: 'pending'
  });
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    product_name: '',
    quantity: 1,
    price: 0,
    has_warranty: false,
    warranty_months: '',
    warranty_serial: ''
  });
  const [newPurchaseReceipt, setNewPurchaseReceipt] = useState(null);
  const [newPurchaseReceiptPreview, setNewPurchaseReceiptPreview] = useState(null);
  const [warrantyForm, setWarrantyForm] = useState({
    purchase_item_id: '',
    product_id: '',
    product_name: '',
    serial_number: '',
    warranty_terms: '',
    coverage_details: '',
    warranty_period_months: 12
  });

  useEffect(() => {
    fetchPurchases();
    fetchSuppliers();
    fetchProducts();
  }, []);

  const fetchPurchases = async () => {
    try {
      const response = await axios.get(`${API}/purchases`, { withCredentials: true });
      setPurchases(response.data || []);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      toast.error('Failed to load purchases');
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API}/suppliers`, { withCredentials: true });
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`, { withCredentials: true });
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    }
  };

  const fetchSupplierWarranties = async (purchaseId) => {
    try {
      const response = await axios.get(`${API}/purchases/${purchaseId}/supplier-warranties`, { withCredentials: true });
      setSupplierWarranties(prev => ({
        ...prev,
        [purchaseId]: response.data.warranties || []
      }));
    } catch (error) {
      console.error('Error fetching supplier warranties:', error);
    }
  };

  const addItemToPurchase = () => {
    if (!currentItem.product_name || currentItem.quantity <= 0 || currentItem.price <= 0) {
      toast.error('Please fill in product name, quantity and price');
      return;
    }

    if (currentItem.has_warranty && (!currentItem.warranty_months || !currentItem.warranty_serial)) {
      toast.error('Please fill in warranty details');
      return;
    }

    const newItem = {
      product_id: currentItem.product_id || null,
      product_name: currentItem.product_name,
      quantity: parseInt(currentItem.quantity),
      price: parseFloat(currentItem.price),
      has_warranty: currentItem.has_warranty,
      warranty_months: currentItem.has_warranty ? parseInt(currentItem.warranty_months) : null,
      warranty_serial: currentItem.has_warranty ? currentItem.warranty_serial : null
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem]
    });

    setCurrentItem({
      product_id: '',
      product_name: '',
      quantity: 1,
      price: 0,
      has_warranty: false,
      warranty_months: '',
      warranty_serial: ''
    });

    toast.success('Item added to purchase');
  };

  const removeItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: updatedItems });
    toast.success('Item removed');
  };

  const calculateTotal = () => {
    return formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.supplier_id || formData.items.length === 0) {
      toast.error('Please select a supplier and add at least one item');
      return;
    }

    const total = calculateTotal();

    try {
      const submitData = new FormData();
      submitData.append('supplier_id', formData.supplier_id);
      submitData.append('items', JSON.stringify(formData.items));
      submitData.append('total_amount', total);
      submitData.append('payment_status', formData.payment_status);
      
      if (newPurchaseReceipt) {
        submitData.append('receipt', newPurchaseReceipt);
      }

      await axios.post(`${API}/purchases`, submitData, { 
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Purchase created successfully!');
      setShowForm(false);
      setFormData({
        supplier_id: '',
        items: [],
        payment_status: 'pending'
      });
      setCurrentItem({
        product_id: '',
        product_name: '',
        quantity: 1,
        price: 0,
        has_warranty: false,
        warranty_months: '',
        warranty_serial: ''
      });
      setNewPurchaseReceipt(null);
      setNewPurchaseReceiptPreview(null);
      fetchPurchases();
    } catch (error) {
      console.error('Error creating purchase:', error);
      toast.error(error.response?.data?.detail || 'Failed to create purchase');
    }
  };

  const filteredPurchases = purchases.filter(purchase => {
    const supplier = suppliers.find(s => s.id === purchase.supplier_id);
    return (
      purchase.purchase_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || 'Unknown';
  };

  const handleFileSelection = (file) => {
    if (!file) return;

    setSelectedReceiptFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptPreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setReceiptPreview('pdf');
    } else {
      setReceiptPreview(null);
    }
  };

  const handleReceiptUpload = async (purchaseId) => {
    if (!selectedReceiptFile) {
      toast.error('Please select a file');
      return;
    }

    setUploadingReceipt(true);
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('file', selectedReceiptFile);

    try {
      await axios.post(`${API}/purchases/${purchaseId}/receipts`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      toast.success('Receipt uploaded successfully!');
      setShowReceiptUpload(null);
      setSelectedReceiptFile(null);
      setReceiptPreview(null);
      setUploadProgress(0);
      fetchPurchases();
    } catch (error) {
      console.error('Error uploading receipt:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleWarrantySubmit = async (e, purchaseId) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API}/purchases/${purchaseId}/supplier-warranties`, warrantyForm, {
        withCredentials: true
      });
      toast.success('Supplier warranty created successfully!');
      setShowWarrantyForm(null);
      setWarrantyForm({
        purchase_item_id: '',
        product_id: '',
        product_name: '',
        serial_number: '',
        warranty_terms: '',
        coverage_details: '',
        warranty_period_months: 12
      });
      fetchPurchases();
      fetchSupplierWarranties(purchaseId);
    } catch (error) {
      console.error('Error creating warranty:', error);
      toast.error(error.response?.data?.detail || 'Failed to create warranty');
    }
  };

  const handleApplyStock = async (purchaseId) => {
    if (applyingStock === purchaseId) return;

    const purchase = purchases.find(p => p.id === purchaseId);
    if (purchase?.stock_status === 'applied') {
      toast.info('Stock already applied for this purchase');
      return;
    }

    setApplyingStock(purchaseId);
    try {
      const response = await axios.post(`${API}/purchases/${purchaseId}/apply-stock`, {}, {
        withCredentials: true
      });
      toast.success(response.data.message || 'Stock applied successfully!');
      fetchPurchases();
    } catch (error) {
      console.error('Error applying stock:', error);
      toast.error(error.response?.data?.detail || 'Failed to apply stock');
    } finally {
      setApplyingStock(null);
    }
  };

  const togglePurchaseExpand = (purchaseId) => {
    const newExpanded = expandedPurchase === purchaseId ? null : purchaseId;
    setExpandedPurchase(newExpanded);
    if (newExpanded && !supplierWarranties[purchaseId]) {
      fetchSupplierWarranties(purchaseId);
    }
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <BackButton />
      
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <ShoppingCart className="w-10 h-10 text-blue-400" />
              Purchases Management
            </h1>
            <p className="text-gray-400">Track and manage inventory purchases</p>
          </div>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setFormData({
                supplier_id: '',
                items: [],
                payment_status: 'pending'
              });
              setCurrentItem({
                product_id: '',
                product_name: '',
                quantity: 1,
                price: 0,
                has_warranty: false,
                warranty_months: '',
                warranty_serial: ''
              });
              setNewPurchaseReceipt(null);
              setNewPurchaseReceiptPreview(null);
            }}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            {showForm ? 'Cancel' : 'New Purchase'}
          </button>
        </div>

        {showForm && (
          <div className="bg-gradient-to-br from-gray-800/50 to-blue-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-8 mb-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-blue-400" />
              New Purchase Order
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-gray-300 mb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    Supplier <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} - {supplier.contact_person}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 mb-2">Payment Status</label>
                  <select
                    value={formData.payment_status}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value })}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-600/50 pt-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5 text-blue-400" />
                  Add Items
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-gray-300 mb-2">Product Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={currentItem.product_name}
                      onChange={(e) => setCurrentItem({ ...currentItem, product_name: e.target.value })}
                      placeholder="Enter product name"
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Quantity <span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Unit Price <span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      value={currentItem.price}
                      onChange={(e) => setCurrentItem({ ...currentItem, price: e.target.value })}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentItem.has_warranty}
                      onChange={(e) => {
                        setCurrentItem({
                          ...currentItem,
                          has_warranty: e.target.checked,
                          warranty_months: e.target.checked ? currentItem.warranty_months : '',
                          warranty_serial: e.target.checked ? currentItem.warranty_serial : ''
                        });
                      }}
                      className="w-5 h-5 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-800"
                    />
                    <span className="text-gray-300 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-orange-400" />
                      This item has warranty
                    </span>
                  </label>
                </div>

                {currentItem.has_warranty && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 bg-orange-600/10 border border-orange-500/30 rounded-lg">
                    <div>
                      <label className="block text-gray-300 mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-orange-400" />
                        Warranty Duration (Months) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        value={currentItem.warranty_months}
                        onChange={(e) => setCurrentItem({ ...currentItem, warranty_months: e.target.value })}
                        placeholder="e.g., 12"
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-2 flex items-center gap-2">
                        <Hash className="w-4 h-4 text-orange-400" />
                        Warranty Serial Number <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={currentItem.warranty_serial}
                        onChange={(e) => setCurrentItem({ ...currentItem, warranty_serial: e.target.value })}
                        placeholder="Enter warranty serial number"
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={addItemToPurchase}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {formData.items.length > 0 && (
                <div className="border-t border-gray-600/50 pt-6">
                  <h3 className="text-xl font-bold text-white mb-4">Purchase Items</h3>
                  <div className="space-y-2 mb-4">
                    {formData.items.map((item, index) => (
                      <div key={index} className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-white font-semibold">{item.product_name}</p>
                          <p className="text-gray-400 text-sm">
                            Quantity: {item.quantity} × ${item.price.toFixed(2)} = ${(item.quantity * item.price).toFixed(2)}
                          </p>
                          {item.has_warranty && (
                            <p className="text-orange-400 text-sm flex items-center gap-1 mt-1">
                              <Shield className="w-3 h-3" />
                              Warranty: {item.warranty_months} months | Serial: {item.warranty_serial}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-white flex items-center justify-between">
                      <span>Total Amount:</span>
                      <span className="text-yellow-400">${calculateTotal().toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-600/50 pt-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  Receipt Upload (Optional)
                </h3>
                <div className="p-4 bg-purple-600/10 border border-purple-500/30 rounded-lg">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 10 * 1024 * 1024) {
                          toast.error('File size must be less than 10MB');
                          return;
                        }
                        setNewPurchaseReceipt(file);
                        if (file.type.startsWith('image/')) {
                          const reader = new FileReader();
                          reader.onloadend = () => setNewPurchaseReceiptPreview(reader.result);
                          reader.readAsDataURL(file);
                        } else {
                          setNewPurchaseReceiptPreview('pdf');
                        }
                      }
                    }}
                    className="hidden"
                    id="receipt-upload-input"
                  />
                  <label
                    htmlFor="receipt-upload-input"
                    className="flex items-center justify-center gap-2 p-6 border-2 border-dashed border-purple-500/50 rounded-lg cursor-pointer hover:border-purple-400 transition-all"
                  >
                    <Upload className="w-6 h-6 text-purple-400" />
                    <span className="text-gray-300">
                      {newPurchaseReceipt ? newPurchaseReceipt.name : 'Click to upload receipt (JPG, PNG, WEBP, PDF - Max 10MB)'}
                    </span>
                  </label>
                  {newPurchaseReceiptPreview && (
                    <div className="mt-4 relative">
                      {newPurchaseReceiptPreview === 'pdf' ? (
                        <div className="flex items-center gap-2 p-3 bg-gray-700/50 rounded-lg">
                          <FileText className="w-8 h-8 text-red-400" />
                          <span className="text-white">{newPurchaseReceipt?.name}</span>
                        </div>
                      ) : (
                        <img
                          src={newPurchaseReceiptPreview}
                          alt="Receipt preview"
                          className="max-h-48 rounded-lg mx-auto"
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setNewPurchaseReceipt(null);
                          setNewPurchaseReceiptPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                disabled={formData.items.length === 0}
              >
                Create Purchase Order
              </button>
            </form>
          </div>
        )}

        <div className="bg-gradient-to-br from-gray-800/50 to-blue-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-6 shadow-2xl">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search purchases by number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {filteredPurchases.length === 0 ? (
            <div className="text-center py-16">
              <ShoppingCart className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No purchases found</p>
              <p className="text-gray-500">Create your first purchase order to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-600/50">
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold w-10"></th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-blue-400" />
                        PO Number
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-400" />
                        Supplier
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Items</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-blue-400" />
                        Total
                      </div>
                    </th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Payment</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Stock</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-400" />
                        Date
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.map((purchase) => (
                    <React.Fragment key={purchase.id}>
                      <tr className="border-b border-gray-700/50 hover:bg-gray-700/20 transition-all">
                        <td className="py-4 px-4">
                          <button
                            onClick={() => togglePurchaseExpand(purchase.id)}
                            className="text-gray-400 hover:text-white transition-all"
                          >
                            {expandedPurchase === purchase.id ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-white font-mono font-semibold">{purchase.purchase_number}</span>
                        </td>
                        <td className="py-4 px-4 text-gray-300">{purchase.supplier_name || getSupplierName(purchase.supplier_id)}</td>
                        <td className="py-4 px-4 text-gray-400">{purchase.items?.length || 0} items</td>
                        <td className="py-4 px-4">
                          <span className="text-yellow-400 font-bold">${purchase.total_amount?.toFixed(2) || '0.00'}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            purchase.payment_status === 'paid' ? 'bg-green-600/30 text-green-400' :
                            purchase.payment_status === 'partial' ? 'bg-yellow-600/30 text-yellow-400' :
                            'bg-red-600/30 text-red-400'
                          }`}>
                            {purchase.payment_status?.toUpperCase() || 'PENDING'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                            purchase.stock_status === 'applied' ? 'bg-green-600/30 text-green-400' :
                            purchase.stock_status === 'queued' ? 'bg-blue-600/30 text-blue-400' :
                            'bg-gray-600/30 text-gray-400'
                          }`}>
                            {purchase.stock_status === 'applied' ? <CheckCircle className="w-3 h-3" /> :
                             purchase.stock_status === 'queued' ? <Clock className="w-3 h-3" /> :
                             <AlertCircle className="w-3 h-3" />}
                            {purchase.stock_status?.toUpperCase() || 'PENDING'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-gray-400">
                          {new Date(purchase.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                      {expandedPurchase === purchase.id && (
                        <tr>
                          <td colSpan="8" className="bg-gray-800/50 border-b border-gray-700/50">
                            <div className="p-6">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-blue-400" />
                                    Purchase Items
                                  </h3>
                                  <div className="space-y-2">
                                    {purchase.items?.map((item, idx) => (
                                      <div key={idx} className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-3">
                                        <p className="text-white font-semibold">
                                          {item.product_name || `Product #${item.product_id || idx + 1}`}
                                        </p>
                                        <p className="text-gray-400 text-sm">
                                          Qty: {item.quantity} × ${item.price?.toFixed(2)} = ${((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-white mb-4">Actions</h3>
                                  <div className="space-y-3">
                                    <button
                                      onClick={() => handleApplyStock(purchase.id)}
                                      disabled={purchase.stock_status === 'applied' || applyingStock === purchase.id}
                                      className={`w-full px-4 py-3 rounded-lg transition-all flex items-center gap-2 justify-center ${
                                        purchase.stock_status === 'applied'
                                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                          : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                                      }`}
                                    >
                                      {applyingStock === purchase.id ? (
                                        <>
                                          <Clock className="w-4 h-4 animate-spin" />
                                          Applying...
                                        </>
                                      ) : purchase.stock_status === 'applied' ? (
                                        <>
                                          <CheckCircle className="w-4 h-4" />
                                          Stock Applied
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4" />
                                          Apply Stock to Inventory
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  {purchase.receipt_files && purchase.receipt_files.length > 0 && (
                                    <div className="mt-4">
                                      <h4 className="text-sm font-bold text-gray-300 mb-2">Uploaded Receipts:</h4>
                                      <div className="space-y-1">
                                        {purchase.receipt_files.map((file, idx) => (
                                          <a
                                            key={idx}
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-all hover:underline"
                                          >
                                            <FileText className="w-3 h-3" />
                                            <span>{file.filename}</span>
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Supplier Warranties Section */}
                              {supplierWarranties[purchase.id] && supplierWarranties[purchase.id].length > 0 && (
                                <div className="mt-6 border-t border-gray-700/50 pt-6">
                                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-orange-400" />
                                    Supplier Warranties ({supplierWarranties[purchase.id].length})
                                  </h3>
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                    {supplierWarranties[purchase.id].map((warranty, idx) => (
                                      <div key={idx} className="bg-gradient-to-br from-orange-900/20 to-red-900/20 border border-orange-700/50 rounded-lg p-4">
                                        <div className="flex items-start justify-between mb-3">
                                          <div>
                                            <p className="text-white font-bold">{warranty.product_name}</p>
                                            <p className="text-xs text-gray-400 font-mono">{warranty.warranty_code}</p>
                                          </div>
                                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                            warranty.current_status === 'active' ? 'bg-green-600/30 text-green-400' :
                                            warranty.current_status === 'expired' ? 'bg-red-600/30 text-red-400' :
                                            warranty.current_status === 'claimed' ? 'bg-yellow-600/30 text-yellow-400' :
                                            'bg-gray-600/30 text-gray-400'
                                          }`}>
                                            {warranty.current_status?.toUpperCase()}
                                          </span>
                                        </div>
                                        
                                        {warranty.serial_number && (
                                          <p className="text-sm text-gray-300 mb-2">
                                            <span className="text-gray-500">Serial:</span> {warranty.serial_number}
                                          </p>
                                        )}
                                        
                                        {warranty.warranty_terms && (
                                          <p className="text-sm text-gray-300 mb-2">
                                            <span className="text-gray-500">Terms:</span> {warranty.warranty_terms}
                                          </p>
                                        )}
                                        
                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-2">
                                          <div>
                                            <span className="text-gray-500">Period:</span> {warranty.warranty_period_months} months
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Supplier:</span> {warranty.supplier_name}
                                          </div>
                                        </div>
                                        
                                        <div className="text-xs text-gray-400 space-y-1">
                                          <div>
                                            <span className="text-gray-500">Start:</span> {new Date(warranty.coverage_start_date).toLocaleDateString()}
                                          </div>
                                          <div>
                                            <span className="text-gray-500">Expires:</span> {new Date(warranty.coverage_expiry_date).toLocaleDateString()}
                                          </div>
                                        </div>
                                        
                                        {warranty.coverage_details && (
                                          <p className="text-xs text-gray-400 mt-2 italic">
                                            {warranty.coverage_details}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Receipt Upload Modal */}
        {showReceiptUpload && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Upload className="w-6 h-6 text-purple-400" />
                  Upload Receipt
                </h2>
                <button
                  onClick={() => {
                    setShowReceiptUpload(null);
                    setSelectedReceiptFile(null);
                    setReceiptPreview(null);
                    setUploadProgress(0);
                  }}
                  className="text-gray-400 hover:text-white transition-all"
                  disabled={uploadingReceipt}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 mb-2">Select Receipt File</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelection(e.target.files[0]);
                      }
                    }}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    disabled={uploadingReceipt}
                  />
                  <p className="text-xs text-gray-400 mt-2">Supported: JPG, PNG, GIF, WEBP, PDF (Max 10MB)</p>
                </div>

                {receiptPreview && (
                  <div className="bg-gray-700/30 border border-gray-600/50 rounded-lg p-4">
                    <p className="text-sm text-gray-300 mb-2">Preview:</p>
                    {receiptPreview === 'pdf' ? (
                      <div className="flex items-center gap-2 text-gray-300">
                        <FileText className="w-8 h-8 text-red-400" />
                        <span className="text-sm">{selectedReceiptFile?.name}</span>
                      </div>
                    ) : (
                      <img 
                        src={receiptPreview} 
                        alt="Receipt preview" 
                        className="w-full h-48 object-contain rounded-lg bg-gray-800"
                      />
                    )}
                  </div>
                )}

                {uploadingReceipt && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-purple-400">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>Uploading...</span>
                      </div>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                {selectedReceiptFile && !uploadingReceipt && (
                  <button
                    onClick={() => handleReceiptUpload(showReceiptUpload)}
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Receipt
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Warranty Form Modal */}
        {showWarrantyForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-8 max-w-2xl w-full shadow-2xl my-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Shield className="w-6 h-6 text-orange-400" />
                  Add Supplier Warranty
                </h2>
                <button
                  onClick={() => {
                    setShowWarrantyForm(null);
                    setWarrantyForm({
                      purchase_item_id: '',
                      product_id: '',
                      product_name: '',
                      serial_number: '',
                      warranty_terms: '',
                      coverage_details: '',
                      warranty_period_months: 12
                    });
                  }}
                  className="text-gray-400 hover:text-white transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={(e) => handleWarrantySubmit(e, showWarrantyForm)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-2">
                      Select Product <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={warrantyForm.product_id}
                      onChange={(e) => {
                        const purchase = purchases.find(p => p.id === showWarrantyForm);
                        const item = purchase?.items?.find(i => i.product_id === e.target.value);
                        setWarrantyForm({
                          ...warrantyForm,
                          product_id: e.target.value,
                          product_name: item?.product_name || '',
                          purchase_item_id: `${showWarrantyForm}_${e.target.value}`
                        });
                      }}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      required
                    >
                      <option value="">Choose Product</option>
                      {purchases.find(p => p.id === showWarrantyForm)?.items?.map((item, idx) => (
                        <option key={idx} value={item.product_id}>
                          {item.product_name} (Qty: {item.quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">Serial Number</label>
                    <input
                      type="text"
                      value={warrantyForm.serial_number}
                      onChange={(e) => setWarrantyForm({ ...warrantyForm, serial_number: e.target.value })}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="Enter serial number"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">
                      Warranty Period (months) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      value={warrantyForm.warranty_period_months}
                      onChange={(e) => setWarrantyForm({ ...warrantyForm, warranty_period_months: parseInt(e.target.value) })}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-2">
                      Warranty Terms <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={warrantyForm.warranty_terms}
                      onChange={(e) => setWarrantyForm({ ...warrantyForm, warranty_terms: e.target.value })}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                      placeholder="e.g., Replace/Refund"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 mb-2">Coverage Details</label>
                  <textarea
                    value={warrantyForm.coverage_details}
                    onChange={(e) => setWarrantyForm({ ...warrantyForm, coverage_details: e.target.value })}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    rows="3"
                    placeholder="Describe what's covered by this warranty"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white py-3 rounded-lg hover:from-orange-700 hover:to-red-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                >
                  Create Supplier Warranty
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </SectorLayout>
  );
};

export default PurchasesPage;
