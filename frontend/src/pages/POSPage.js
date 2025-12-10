import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Minus, X, ShoppingCart, Globe, User, Phone, MapPin, Search, Edit2, Check, Clock, Send } from "lucide-react";
import SectorLayout from "../components/SectorLayout";
import BackButton from "../components/BackButton";
import { API } from "../App";
import { toast } from "sonner";
import { formatErrorMessage } from "../utils/errorHandler";
import { formatCurrency } from "../utils/formatters";
import Footer from "../components/Footer";

const POSPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  // =============================
  // Customer Inputs
  // =============================
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("+880");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paidAmount, setPaidAmount] = useState("");
  const [reference, setReference] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const [showCountry, setShowCountry] = useState(false);

  // Customer lookup state
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerSearched, setCustomerSearched] = useState(false);

  // Due request state (for staff users)
  const [requestDuePayment, setRequestDuePayment] = useState(false);
  const [isSubmittingDueRequest, setIsSubmittingDueRequest] = useState(false);
  const [dueRequestNotes, setDueRequestNotes] = useState("");

  useEffect(() => {
    fetchProducts();
    fetchBranches();
  }, []);

  // Auto-set branch for non-admin users
  useEffect(() => {
    const userRole = user?.role;
    const userBranchId = user?.branch_id;
    
    // For branch users (non-admins), auto-set their branch
    if (userBranchId && userRole && 
        !['super_admin', 'tenant_admin', 'head_office'].includes(userRole)) {
      setBranchId(userBranchId);
    }
  }, [user, branches]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      // For branch-based inventory, show all products returned by API
      // (API already filters by branch assignment for branch users)
      // Filter to only show products with stock in at least one branch
      const productsWithStock = response.data.filter((p) => {
        // Check if product has branch_stock data
        if (p.branch_stock && Object.keys(p.branch_stock).length > 0) {
          // Calculate total stock across all branches
          const totalBranchStock = Object.values(p.branch_stock).reduce((sum, stock) => sum + stock, 0);
          // If any branch has stock, include the product
          if (totalBranchStock > 0) {
            return true;
          }
          // If all branch stocks are 0, fall back to legacy stock field
          return p.stock > 0;
        }
        // Fallback to old stock field if branch_stock not available or empty
        return p.stock > 0;
      });
      setProducts(productsWithStock);
    } catch (error) {
      toast.error("Failed to fetch products");
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      setBranches(response.data);
    } catch (error) {
      console.error("Failed to fetch branches:", error);
    }
  };

  const searchCustomerByPhone = useCallback(async (phone) => {
    if (!phone || phone.length < 14 || !phone.startsWith("+8801")) {
      return;
    }

    setIsSearchingCustomer(true);
    setCustomerSearched(true);

    try {
      const response = await axios.get(`${API}/customers`, {
        params: { search: phone }
      });

      const customers = response.data?.data || response.data || [];
      const matchedCustomer = customers.find(c => c.phone === phone);

      if (matchedCustomer) {
        setExistingCustomer(matchedCustomer);
        setCustomerName(matchedCustomer.name || "");
        setCustomerAddress(matchedCustomer.address || "");
        setIsEditingCustomer(false);
      } else {
        setExistingCustomer(null);
        setIsEditingCustomer(true);
      }
    } catch (error) {
      console.error("Customer search failed:", error);
      setExistingCustomer(null);
      setIsEditingCustomer(true);
    } finally {
      setIsSearchingCustomer(false);
    }
  }, []);

  const handlePhoneChange = (e) => {
    let digits = e.target.value.replace(/\D/g, "");

    // Handle various input formats and duplicates
    // Remove leading 880 if present (handles +880, 880)
    while (digits.startsWith("880")) {
      digits = digits.slice(3);
    }
    // If starts with 0, remove the leading 0 (handles 01...)
    if (digits.startsWith("0")) {
      digits = digits.slice(1);
    }
    // Ensure first digit is 1 for mobile numbers (1xxxxxxxxx)
    // Limit to 10 digits
    if (digits.length > 10) {
      digits = digits.slice(0, 10);
    }

    const newPhone = "+880" + digits;
    setCustomerPhone(newPhone);

    // Search when we have a valid Bangladesh mobile number (+8801xxxxxxxxx = 14 chars)
    if (newPhone.length === 14 && newPhone.startsWith("+8801")) {
      searchCustomerByPhone(newPhone);
    } else {
      setExistingCustomer(null);
      setCustomerSearched(false);
    }
  };

  const clearCustomer = () => {
    setCustomerPhone("+880");
    setCustomerName("");
    setCustomerAddress("");
    setExistingCustomer(null);
    setCustomerSearched(false);
    setIsEditingCustomer(false);
  };

  const getBranchStock = (product, effectiveBranchId = null) => {
    const userRole = user?.role;
    
    // For tenant admins and head office, show total stock across all branches
    if (userRole && ['super_admin', 'tenant_admin', 'head_office'].includes(userRole)) {
      // Calculate total stock across all branches
      if (product.branch_stock && Object.keys(product.branch_stock).length > 0) {
        const totalBranchStock = Object.values(product.branch_stock).reduce((sum, stock) => sum + stock, 0);
        // If branch stock exists and has value, use it; otherwise fall back to legacy stock
        return totalBranchStock > 0 ? totalBranchStock : (product.stock || 0);
      }
      // No branch assignments, use legacy stock
      return product.stock || 0;
    }
    
    // For branch users, show stock for specific branch
    const branchToUse = effectiveBranchId || branchId || user?.branch_id;
    if (!branchToUse) {
      // If no branch is set, fall back to legacy stock
      return product.stock || 0;
    }
    
    const branchStock = product.branch_stock?.[branchToUse];
    // If no branch assignment exists, fall back to legacy stock
    return branchStock !== undefined && branchStock !== null ? branchStock : (product.stock || 0);
  };

  const getProductPrice = (product, effectiveBranchId = null) => {
    const branchToUse = effectiveBranchId || branchId || user?.branch_id;
    
    // Check if product has branch-specific sale price
    if (branchToUse && product.branch_sale_prices && product.branch_sale_prices[branchToUse]) {
      return product.branch_sale_prices[branchToUse];
    }
    
    // Fall back to base price
    return product.price || 0;
  };

  const addToCart = (product) => {
    let effectiveBranchId = branchId;
    
    // Auto-detect branch based on product stock availability
    if (!effectiveBranchId && product.branch_stock) {
      const branchStockEntries = Object.entries(product.branch_stock);
      
      // Filter branches with available stock
      const availableBranches = branchStockEntries.filter(([_, stock]) => stock > 0);
      
      if (availableBranches.length === 0) {
        toast.error("Product not available in any branch");
        return;
      }
      
      // Prioritize user's branch if they have one and it has stock
      let selectedBranch = null;
      if (user.branch_id) {
        const userBranchStock = product.branch_stock[user.branch_id];
        if (userBranchStock && userBranchStock > 0) {
          selectedBranch = user.branch_id;
        }
      }
      
      // Otherwise, use first available branch
      if (!selectedBranch) {
        selectedBranch = availableBranches[0][0];
      }
      
      effectiveBranchId = selectedBranch;
      setBranchId(selectedBranch);
      const branchName = branches.find(b => b.id === selectedBranch)?.name || 'selected branch';
      toast.success(`Auto-selected branch: ${branchName}`);
    }
    
    const availableStock = getBranchStock(product, effectiveBranchId);
    
    if (availableStock <= 0) {
      toast.error("Product not available in this branch");
      return;
    }
    
    const existing = cart.find((item) => item.product_id === product.id);
    if (existing) {
      if (existing.quantity < availableStock) {
        setCart(
          cart.map((item) =>
            item.product_id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        );
      } else toast.error("Not enough stock");
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          price: getProductPrice(product, effectiveBranchId),
          quantity: 1,
        },
      ]);
    }
  
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const updateQuantity = (productId, change) => {
    const product = products.find((p) => p.id === productId);
    const availableStock = getBranchStock(product);
    setCart(
      cart
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + change;
            if (newQty <= 0) return null;
            if (newQty > availableStock) {
              toast.error("Not enough stock");
              return item;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean),
    );
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    return subtotal - discount + tax;
  };

  const handleCheckout = async () => {
    if (!customerPhone.startsWith("+8801") || customerPhone.length !== 14) {
      toast.error("Enter a valid Bangladeshi number (+8801XXXXXXXXX)");
      return;
    }

    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const totalAmount = calculateTotal();
    const paidAmountValue = paidAmount ? parseFloat(paidAmount) : totalAmount;

    if (paidAmountValue > totalAmount)
      return toast.error("Paid amount invalid");
    
    // Staff users cannot create partial payment invoices directly
    const staffRole = user?.role === "staff";
    if (staffRole && paidAmountValue < totalAmount) {
      return toast.error("Staff users must request admin approval for due payments");
    }
    
    if (paidAmountValue < totalAmount && !customerName)
      return toast.error("Customer name required for due");

    try {
      const payload = {
        items: cart,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        customer_address: customerAddress || null,
        payment_method: paymentMethod,
        discount,
        tax,
        paid_amount: paidAmountValue,
        reference: reference || null,
        branch_id: branchId || null,
      };

      const response = await axios.post(`${API}/sales`, payload);

      toast.success("Sale completed! Redirecting...");

      setCart([]);
      setCustomerName("");
      setCustomerPhone("+880");
      setCustomerAddress("");
      setPaidAmount("");
      setDiscount(0);
      setTax(0);
      setExistingCustomer(null);
      setCustomerSearched(false);
      setIsEditingCustomer(false);

      setTimeout(() => {
        navigate(`/${user.business_type}/invoice/${response.data.id}`);
      }, 1000);
    } catch (error) {
      toast.error(formatErrorMessage(error, "Checkout failed"));
    }
  };

  // Handle due request submission (for staff)
  const handleDueRequest = async () => {
    if (!customerPhone.startsWith("+8801") || customerPhone.length !== 14) {
      toast.error("Enter a valid Bangladeshi number (+8801XXXXXXXXX)");
      return;
    }

    if (!customerName) {
      toast.error("Customer name is required for due payment request");
      return;
    }

    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const totalAmount = calculateTotal();
    const paidAmountValue = paidAmount ? parseFloat(paidAmount) : 0;
    const dueAmount = totalAmount - paidAmountValue;

    if (dueAmount <= 0) {
      toast.error("No due amount to request");
      return;
    }

    setIsSubmittingDueRequest(true);

    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_id: existingCustomer?.id || null,
        due_amount: dueAmount,
        total_amount: totalAmount,
        paid_amount: paidAmountValue,
        items: cart.map(item => ({
          product_id: item.product_id,
          product_name: item.name,
          quantity: item.quantity,
          price: item.price
        })),
        notes: dueRequestNotes || null,
        branch_id: branchId || null,
      };

      await axios.post(`${API}/due-requests`, payload);

      toast.success("Due payment request sent to admin for approval!");

      // Reset form
      setCart([]);
      setCustomerName("");
      setCustomerPhone("+880");
      setCustomerAddress("");
      setPaidAmount("");
      setDiscount(0);
      setTax(0);
      setExistingCustomer(null);
      setCustomerSearched(false);
      setIsEditingCustomer(false);
      setRequestDuePayment(false);
      setDueRequestNotes("");

    } catch (error) {
      toast.error(formatErrorMessage(error, "Failed to submit due request"));
    } finally {
      setIsSubmittingDueRequest(false);
    }
  };

  // Check if user is staff (non-admin) or tenant admin
  const isStaffUser = user?.role === "staff";
  const isTenantAdmin = user?.role === "tenant_admin" || user?.role === "super_admin";

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const total = calculateTotal();

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <BackButton className="mb-4" />

        <h1 className="text-4xl font-bold text-white mb-2">Point of Sale</h1>
        <p className="text-slate-400 mb-8">Fast checkout and billing</p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Table */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-4">Products</h2>

              <div className="max-h-[600px] overflow-y-auto scrollbar-hide rounded-xl border border-slate-700/40">
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10 bg-slate-900/80 border-b border-slate-700/60">
                    <tr className="text-slate-300 text-sm">
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold hidden md:table-cell">
                        Category
                      </th>
                      <th className="px-4 py-3 font-semibold">Price</th>
                      <th className="px-4 py-3 font-semibold">Stock</th>
                      <th className="px-4 py-3 font-semibold text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="hover:bg-white/5 cursor-pointer"
                        onClick={() => addToCart(product)}
                      >
                        <td className="px-4 py-3 text-white">{product.name}</td>
                        <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                          {product.category}
                        </td>
                        <td className="px-4 py-3 text-green-400 font-semibold">
                          {formatCurrency(getProductPrice(product))}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-slate-700/40 px-2 py-0.5 text-xs text-slate-300">
                            {getBranchStock(product)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="ml-auto flex items-center gap-2 rounded-lg bg-blue-600/90 hover:bg-blue-600 px-3 py-1.5 text-white text-sm transition"
                            aria-label={`Add ${product.name}`}
                          >
                            <Plus className="w-4 h-4" />
                            Add
                          </button>
                        </td>
                      </tr>
                    ))}

                    {products.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center text-slate-400 py-8"
                        >
                          No products available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Cart + Customer */}
          <div>
            <div className="glass-card p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <ShoppingCart className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">
                  Cart ({cart.length})
                </h2>
              </div>

              {/* CART ITEMS */}
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto scrollbar-hide">
                {cart.map((item) => (
                  <div
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                    key={item.product_id}
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">
                        {item.name}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {formatCurrency(item.price)} each
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product_id, -1)}
                        className="w-6 h-6 flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/30 rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-white font-semibold w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product_id, 1)}
                        className="w-6 h-6 flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/30 rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="w-6 h-6 flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 rounded ml-2"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* CUSTOMER DETAILS */}
              <div className="border-b border-slate-700 pb-4 mb-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-300">
                    Customer Info
                  </h3>
                  {customerPhone.length > 4 && (
                    <button
                      onClick={clearCustomer}
                      className="text-xs text-slate-400 hover:text-red-400 transition"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Phone Number Input - Always shown first */}
                <div className="relative">
                  <button
                    onClick={() => setShowCountry(!showCountry)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-slate-600/40 px-2 py-1 rounded-md cursor-pointer"
                  >
                    🇧🇩 <Globe size={14} />
                  </button>

                  <input
                    type="tel"
                    value={customerPhone}
                    placeholder="+8801XXXXXXXXX"
                    onChange={handlePhoneChange}
                    onFocus={() => {
                      if (!customerPhone.startsWith("+880"))
                        setCustomerPhone("+880");
                    }}
                    className="w-full pl-20 pr-10 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                  />

                  {isSearchingCustomer && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                  {!isSearchingCustomer && customerPhone.length === 14 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {existingCustomer ? (
                        <Check className="w-4 h-4 text-green-400" />
                      ) : (
                        <Search className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Existing Customer Display */}
                {existingCustomer && !isEditingCustomer && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-green-400 font-medium">Existing Customer</span>
                      <button
                        onClick={() => setIsEditingCustomer(true)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-400 transition"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-white">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{existingCustomer.name || "N/A"}</span>
                    </div>
                    {existingCustomer.address && (
                      <div className="flex items-center gap-2 text-slate-300 text-sm">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{existingCustomer.address}</span>
                      </div>
                    )}
                    {existingCustomer.total_due > 0 && (
                      <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-green-500/20">
                        <span className="text-slate-400">Previous Due:</span>
                        <span className="text-yellow-400 font-semibold">{formatCurrency(existingCustomer.total_due)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* New Customer / Edit Customer Form */}
                {customerSearched && (!existingCustomer || isEditingCustomer) && (
                  <>
                    {!existingCustomer && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2 text-center">
                        <span className="text-xs text-blue-400">New Customer - Enter Details</span>
                      </div>
                    )}

                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />

                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Address"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    />

                    {isEditingCustomer && existingCustomer && (
                      <button
                        onClick={() => {
                          setCustomerName(existingCustomer.name || "");
                          setCustomerAddress(existingCustomer.address || "");
                          setIsEditingCustomer(false);
                        }}
                        className="w-full text-xs text-slate-400 hover:text-white transition py-1"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </>
                )}

                {/* Show minimal input when phone not fully entered */}
                {!customerSearched && customerPhone.length < 14 && (
                  <p className="text-xs text-slate-500 text-center py-2">
                    Enter phone number to lookup or create customer
                  </p>
                )}

                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Reference (Optional)"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>

              {/* PAYMENT */}
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              >
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="mobile">Mobile Payment</option>
              </select>

              {/* Branch Selection - Conditional rendering based on user role */}
              {user?.role && ['super_admin', 'tenant_admin', 'head_office'].includes(user.role) ? (
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full mt-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Select Branch (Optional)</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} — {branch.branch_code}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full mt-2 px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white">
                  <span className="text-slate-400 text-sm">Branch:</span>
                  <div className="font-medium mt-1">
                    {branchId 
                      ? branches.find(b => b.id === branchId)?.name || 'Loading...'
                      : 'No branch assigned'}
                  </div>
                </div>
              )}

              {/* BILLING */}
              <div className="space-y-2 mb-6 mt-6 pb-6 border-b border-slate-700">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Discount:</span>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-20 text-right bg-transparent border-b border-slate-600"
                  />
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Tax:</span>
                  <input
                    type="number"
                    value={tax}
                    onChange={(e) => setTax(Number(e.target.value))}
                    className="w-20 text-right bg-transparent border-b border-slate-600"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-bold text-white">Total:</span>
                <span className="text-3xl font-bold text-green-400">
                  {formatCurrency(total)}
                </span>
              </div>

              {/* PARTIAL PAYMENT SECTION - Only for Tenant Admins */}
              {isTenantAdmin && (
                <div className="mb-4 p-4 bg-slate-800/50 border border-slate-600 rounded-lg">
                  <label className="text-sm font-semibold text-slate-300 mb-2 block">
                    Payment Amount (Leave empty for full payment)
                  </label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder={`Full Amount: ${formatCurrency(total)}`}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                    min="0"
                    max={total}
                    step="0.01"
                  />
                  {paidAmount && parseFloat(paidAmount) < total && (
                    <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-sm">
                      <div className="flex justify-between">
                        <span>Paying:</span>
                        <span className="font-semibold">{formatCurrency(parseFloat(paidAmount))}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                        <span>Balance Due:</span>
                        <span className="font-semibold">{formatCurrency(total - parseFloat(paidAmount))}</span>
                      </div>
                      <p className="mt-2 text-xs text-yellow-300">
                        ⚠️ Customer name required for partial payment
                      </p>
                    </div>
                  )}
                  {paidAmount && parseFloat(paidAmount) > total && (
                    <p className="mt-2 text-red-400 text-sm">
                      ⚠️ Payment amount cannot exceed total
                    </p>
                  )}
                </div>
              )}

              {/* STAFF DUE REQUEST SECTION - Only for Staff Users */}
              {isStaffUser && (
                <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={requestDuePayment}
                      onChange={(e) => setRequestDuePayment(e.target.checked)}
                      className="w-4 h-4 rounded border-purple-500 text-purple-500 focus:ring-purple-500 bg-slate-700"
                    />
                    <span className="text-purple-300 text-sm font-medium">
                      Request due payment approval from admin
                    </span>
                  </label>
                  {requestDuePayment && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className="text-sm text-slate-300 mb-1 block">
                          Customer Payment Amount
                        </label>
                        <input
                          type="number"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                          placeholder={`Enter amount customer is paying now`}
                          className="w-full px-3 py-2 bg-slate-700 border border-purple-500/30 rounded-lg text-white"
                          min="0"
                          max={total}
                          step="0.01"
                        />
                      </div>
                      {paidAmount && parseFloat(paidAmount) < total && (
                        <div className="p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-sm">
                          <div className="flex justify-between">
                            <span>Customer Paying:</span>
                            <span className="font-semibold">{formatCurrency(parseFloat(paidAmount))}</span>
                          </div>
                          <div className="flex justify-between mt-1">
                            <span>Due Amount (needs approval):</span>
                            <span className="font-semibold">{formatCurrency(total - parseFloat(paidAmount))}</span>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-purple-300">
                        ⚠️ Admin approval required for due payments. Customer name is mandatory.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Due Request Notes - Shows when checkbox is checked */}
              {requestDuePayment && paidAmount && parseFloat(paidAmount) < total && (
                <div className="mb-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-semibold text-purple-300">Due Request Details</span>
                  </div>
                  <textarea
                    value={dueRequestNotes}
                    onChange={(e) => setDueRequestNotes(e.target.value)}
                    placeholder="Add notes for admin (optional)..."
                    className="w-full px-3 py-2 bg-slate-700 border border-purple-500/30 rounded-lg text-white text-sm"
                    rows={2}
                  />
                </div>
              )}

              {/* Action Buttons */}
              {requestDuePayment && paidAmount && parseFloat(paidAmount) < total ? (
                <button
                  onClick={handleDueRequest}
                  disabled={cart.length === 0 || isSubmittingDueRequest}
                  className="w-full py-4 text-lg font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmittingDueRequest ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Request Due Approval
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Complete Sale
                </button>
              )}
            </div>
          </div>
        </div>

        <Footer />
      </motion.div>
    </SectorLayout>
  );
};

export default POSPage;
