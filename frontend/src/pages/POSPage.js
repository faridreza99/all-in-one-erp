import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Plus, Minus, Trash2, ShoppingCart, X } from 'lucide-react';
import Layout from '../components/Layout';
import { API } from '../App';
import { toast } from 'sonner';

const POSPage = ({ user, onLogout }) => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data.filter(p => p.stock > 0));
    } catch (error) {
      toast.error('Failed to fetch products');
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ));
      } else {
        toast.error('Not enough stock');
      }
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateQuantity = (productId, change) => {
    const product = products.find(p => p.id === productId);
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + change;
        if (newQty <= 0) return null;
        if (newQty > product.stock) {
          toast.error('Not enough stock');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const calculateTotal = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    return subtotal - discount + tax;
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    try {
      const saleData = {
        items: cart,
        customer_name: customerName || null,
        payment_method: paymentMethod,
        discount: discount,
        tax: tax
      };

      const response = await axios.post(`${API}/sales`, saleData);
      toast.success(`Sale completed! Invoice: ${response.data.sale_number}`);
      
      // Reset
      setCart([]);
      setCustomerName('');
      setDiscount(0);
      setTax(0);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Checkout failed');
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = calculateTotal();

  return (
    <Layout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Point of Sale</h1>
          <p className="text-slate-400">Fast checkout and billing</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Grid */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6">
              <h2 className="text-xl font-bold text-white mb-4">Products</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
                {products.map((product) => (
                  <motion.div
                    key={product.id}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => addToCart(product)}
                    className="glass-card p-4 cursor-pointer hover:border-blue-400"
                    data-testid={`pos-product-${product.id}`}
                  >
                    <h3 className="font-semibold text-white mb-1">{product.name}</h3>
                    <p className="text-slate-400 text-sm mb-2">{product.category}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-green-400 font-bold">${product.price}</span>
                      <span className="text-xs text-slate-400">Stock: {product.stock}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Cart */}
          <div>
            <div className="glass-card p-6 sticky top-6">
              <div className="flex items-center gap-2 mb-6">
                <ShoppingCart className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold text-white">Cart ({cart.length})</h2>
              </div>

              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.product_id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg" data-testid={`cart-item-${item.product_id}`}>
                    <div className="flex-1">
                      <p className="font-semibold text-white text-sm">{item.name}</p>
                      <p className="text-slate-400 text-xs">${item.price} each</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product_id, -1)}
                        className="w-6 h-6 flex items-center justify-center bg-blue-500/20 hover:bg-blue-500/30 rounded"
                        data-testid="decrease-quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-white font-semibold w-8 text-center">{item.quantity}</span>
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
              </div>

              <div className="space-y-3 mb-6">
                <input
                  data-testid="customer-name-input"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer Name (Optional)"
                  className="w-full"
                />
                <select
                  data-testid="payment-method-select"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="mobile">Mobile Payment</option>
                </select>
              </div>

              <div className="space-y-2 mb-6 pb-6 border-b border-slate-700">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span data-testid="subtotal">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Discount:</span>
                  <input
                    data-testid="discount-input"
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-20 text-right"
                  />
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Tax:</span>
                  <input
                    data-testid="tax-input"
                    type="number"
                    value={tax}
                    onChange={(e) => setTax(Number(e.target.value))}
                    className="w-20 text-right"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-bold text-white">Total:</span>
                <span className="text-3xl font-bold text-green-400" data-testid="total">
                  ${total.toFixed(2)}
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
      </motion.div>
    </Layout>
  );
};

export default POSPage;