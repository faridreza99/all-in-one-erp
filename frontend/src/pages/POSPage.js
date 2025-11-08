import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Minus, X, ShoppingCart } from "lucide-react";
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
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paidAmount, setPaidAmount] = useState("");
  const [reference, setReference] = useState("");
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchBranches();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data.filter((p) => p.stock > 0));
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

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.product_id === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(
          cart.map((item) =>
            item.product_id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        );
      } else {
        toast.error("Not enough stock");
      }
    } else {
      setCart([
        ...cart,
        {
          product_id: product.id,
          name: product.name,
          price: product.price,
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
    setCart(
      cart
        .map((item) => {
          if (item.product_id === productId) {
            const newQty = item.quantity + change;
            if (newQty <= 0) return null;
            if (newQty > product.stock) {
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
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const totalAmount = calculateTotal();
    const paidAmountValue = paidAmount ? parseFloat(paidAmount) : totalAmount;

    if (paidAmountValue > totalAmount) {
      toast.error("Paid amount cannot exceed total amount");
      return;
    }
    if (paidAmountValue < totalAmount && !customerName) {
      toast.error("Customer name is required for partial payments");
      return;
    }

    try {
      const saleData = {
        items: cart,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        customer_address: customerAddress || null,
        payment_method: paymentMethod,
        discount: discount,
        tax: tax,
        paid_amount: paidAmountValue,
        reference: reference || null,
        branch_id: branchId || null,
      };

      const response = await axios.post(`${API}/sales`, saleData);
      toast.success("Sale completed! Redirecting to invoice...");

      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerAddress("");
      setPaidAmount("");
      setDiscount(0);
      setTax(0);

      setTimeout(() => {
        navigate(`/${user.business_type}/invoice/${response.data.id}`);
      }, 1000);
    } catch (error) {
      toast.error(formatErrorMessage(error, "Checkout failed"));
    }
  };

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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Point of Sale</h1>
          <p className="text-slate-400">Fast checkout and billing</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Table */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-4">Products</h2>

              <div className="max-h-[600px] overflow-y-auto scrollbar-hide rounded-xl border border-slate-700/40">
                <table className="w-full text-left">
                  <thead className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur border-b border-slate-700/60">
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
                        data-testid={`pos-product-${product.id}`}
                      >
                        <td className="px-4 py-3 text-white">{product.name}</td>
                        <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                          {product.category}
                        </td>
                        <td className="px-4 py-3 text-green-400 font-semibold">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-md bg-slate-700/40 px-2 py-0.5 text-xs text-slate-300">
                            {product.stock}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3"
                          onClick={(e) => {
                            e.stopPropagation(); // keep row click from firing twice
                            addToCart(product);
                          }}
                        >
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
                          className="px-4 py-8 text-center text-slate-400"
                          colSpan={5}
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

          {/* Cart */}
          <div>
            <div className="glass-card p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <ShoppingCart className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">
                  Cart ({cart.length})
                </h2>
              </div>

              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto scrollbar-hide">
                {cart.map((item) => (
                  <div
                    key={item.product_id}
                    className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                    data-testid={`cart-item-${item.product_id}`}
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
                        data-testid="decrease-quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-white font-semibold w-8 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product_id, 1)}
                        className="w-6 h-6 flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/30 rounded"
                        data-testid="increase-quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="w-6 h-6 flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 rounded ml-2"
                        data-testid="remove-from-cart"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="text-slate-400 text-sm text-center py-6">
                    Your cart is empty.
                  </div>
                )}
              </div>

              <div className="space-y-3 mb-6">
                <div className="border-b border-slate-700 pb-3">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">
                    Customer Details
                  </h3>
                  <div className="space-y-2">
                    <input
                      data-testid="customer-name-input"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Customer Name "
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      data-testid="customer-phone-input"
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Phone Number "
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      data-testid="customer-address-input"
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Address "
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      data-testid="reference-input"
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Reference (Optional)"
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <select
                  data-testid="payment-method-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile Payment</option>
                </select>
                <select
                  data-testid="branch-select"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select Branch (Optional)</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} - {branch.branch_code}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 mb-6 pb-6 border-b border-slate-700">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span data-testid="subtotal">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Discount:</span>
                  <input
                    data-testid="discount-input"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-20 text-right bg-transparent border-b border-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Tax:</span>
                  <input
                    data-testid="tax-input"
                    type="number"
                    value={tax}
                    onChange={(e) => setTax(Number(e.target.value))}
                    className="w-20 text-right bg-transparent border-b border-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <label className="block text-sm font-medium text-blue-300 mb-2">
                  💰 Paid Amount (Partial Payment)
                </label>
                <input
                  data-testid="paid-amount-input"
                  type="number"
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={`Enter amount (Max: ${formatCurrency(total)})`}
                  className="w-full text-lg bg-transparent border-b border-slate-600 focus:border-blue-500 focus:outline-none"
                  min="0"
                  max={total}
                />
                <p className="text-xs text-slate-400 mt-2">
                  Leave empty for full payment. Enter partial amount to create
                  customer due.
                </p>
                {paidAmount && parseFloat(paidAmount) < total && (
                  <div className="mt-3 p-2 bg-orange-500/20 border border-orange-500/30 rounded text-orange-300 text-sm">
                    <strong>Due Amount:</strong>{" "}
                    {formatCurrency(total - parseFloat(paidAmount || 0))}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-bold text-white">Total:</span>
                <span
                  className="text-3xl font-bold text-green-400"
                  data-testid="total"
                >
                  {formatCurrency(total)}
                </span>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="checkout-button"
              >
                Complete Sale
              </button>
            </div>
          </div>
        </div>

        <Footer />
      </motion.div>
    </SectorLayout>
  );
};

export default POSPage;
