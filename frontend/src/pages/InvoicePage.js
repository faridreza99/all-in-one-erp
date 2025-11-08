import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Receipt, 
  Calendar, 
  User, 
  Phone, 
  CreditCard, 
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Printer,
  Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import SectorLayout from '../components/SectorLayout';
import BackButton from '../components/BackButton';
import { API } from '../App';
import { toast } from 'sonner';
import { formatErrorMessage } from '../utils/errorHandler';
import { formatCurrency } from '../utils/formatters';
import Footer from '../components/Footer';

const InvoicePage = ({ user, onLogout }) => {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const invoiceRef = useRef(null);

  useEffect(() => {
    fetchInvoice();
  }, [saleId]);

  const fetchInvoice = async () => {
    try {
      const response = await axios.get(`${API}/sales/${saleId}/invoice`);
      setInvoice(response.data);
      setLoading(false);
    } catch (error) {
      toast.error(formatErrorMessage(error));
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (amount > invoice.sale.balance_due) {
      toast.error(`Payment amount cannot exceed balance due (${formatCurrency(invoice.sale.balance_due)})`);
      return;
    }

    setProcessingPayment(true);
    try {
      await axios.post(`${API}/sales/${saleId}/payments`, {
        amount,
        method: paymentMethod,
        reference: reference || undefined
      });
      
      toast.success('Payment added successfully!');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setReference('');
      fetchInvoice(); // Refresh invoice data
    } catch (error) {
      toast.error(formatErrorMessage(error));
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    
    setGeneratingPDF(true);
    try {
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Invoice-${invoice.sale.invoice_no}.pdf`);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      paid: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle, label: 'Paid' },
      partially_paid: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock, label: 'Partially Paid' },
      unpaid: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle, label: 'Unpaid' }
    };
    const badge = badges[status] || badges.unpaid;
    const Icon = badge.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${badge.bg}`}>
        <Icon size={16} className={badge.text} />
        <span className={`text-sm font-medium ${badge.text}`}>{badge.label}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <SectorLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading invoice...</p>
          </div>
        </div>
      </SectorLayout>
    );
  }

  if (!invoice) {
    return (
      <SectorLayout user={user} onLogout={onLogout}>
        <div className="p-6">
          <BackButton />
          <div className="text-center mt-8">
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <p className="text-gray-400">Invoice not found</p>
          </div>
        </div>
      </SectorLayout>
    );
  }

  const { sale, payments, customer } = invoice;

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <div className="space-y-6 pb-24">
        <div className="flex items-center justify-between">
          <BackButton />
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              <Printer size={18} />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPDF}
              disabled={generatingPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
            >
              <Download size={18} />
              <span>{generatingPDF ? 'Generating...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

        <div ref={invoiceRef}>
          {/* Sticky Unpaid Banner */}
        {sale.payment_status !== 'paid' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-6 z-20 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-400" size={24} />
                <div>
                  <h3 className="font-semibold text-red-300">Outstanding Balance</h3>
                  <p className="text-sm text-gray-300">
                    {formatCurrency(sale.balance_due)} remaining of {formatCurrency(sale.total)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                <Plus size={18} />
                <span>Add Payment</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Invoice Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl p-6 backdrop-blur-sm"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                {sale.invoice_no}
              </h1>
              <p className="text-gray-400 text-sm">Sale Number: {sale.sale_number}</p>
            </div>
            {getPaymentStatusBadge(sale.payment_status)}
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Calendar className="text-blue-400" size={20} />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Date</p>
                <p className="font-medium">{new Date(sale.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {sale.customer_name && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <User className="text-green-400" size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Customer</p>
                  <p className="font-medium">{sale.customer_name}</p>
                </div>
              </div>
            )}

            {sale.customer_phone && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Phone className="text-purple-400" size={20} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Phone</p>
                  <p className="font-medium">{sale.customer_phone}</p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Items List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden backdrop-blur-sm"
        >
          <div className="p-6 border-b border-gray-700/50">
            <h2 className="text-xl font-semibold">Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800/50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Product</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Price</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Qty</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {sale.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium">{item.product_name || item.name || 'Unknown Product'}</p>
                        {item.product_sku && (
                          <p className="text-sm text-gray-400">SKU: {item.product_sku}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">{formatCurrency(item.price)}</td>
                    <td className="px-6 py-4 text-right">{item.quantity}</td>
                    <td className="px-6 py-4 text-right font-medium">{formatCurrency(item.price * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-6 border-t border-gray-700/50 bg-gray-800/30">
            <div className="space-y-2 max-w-md ml-auto">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0))}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Discount:</span>
                  <span className="text-green-400">-{formatCurrency(sale.discount)}</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div className="flex justify-between text-gray-400">
                  <span>Tax:</span>
                  <span>{formatCurrency(sale.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold pt-2 border-t border-gray-700/50">
                <span>Total:</span>
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {formatCurrency(sale.total)}
                </span>
              </div>
              <div className="flex justify-between text-lg text-green-400">
                <span>Paid:</span>
                <span>{formatCurrency(sale.amount_paid)}</span>
              </div>
              {sale.balance_due > 0 && (
                <div className="flex justify-between text-lg text-red-400 font-semibold">
                  <span>Balance Due:</span>
                  <span>{formatCurrency(sale.balance_due)}</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Payment History */}
        {payments && payments.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden backdrop-blur-sm"
          >
            <div className="p-6 border-b border-gray-700/50">
              <h2 className="text-xl font-semibold">Payment History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-800/50">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Method</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-300">Reference</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-300">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">{new Date(payment.received_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 capitalize">{payment.method}</td>
                      <td className="px-6 py-4 text-gray-400">{payment.reference || '-'}</td>
                      <td className="px-6 py-4 text-right font-medium text-green-400">
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
        </div>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-2xl font-bold mb-6">Add Payment</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Amount <span className="text-red-400">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={`Max: ${formatCurrency(sale.balance_due)}`}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(sale.balance_due.toString())}
                      className="w-full px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-600/30 transition-all text-sm font-medium"
                    >
                      Mark Full Paid ({formatCurrency(sale.balance_due)})
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bkash">bKash</option>
                    <option value="nagad">Nagad</option>
                    <option value="rocket">Rocket</option>
                    <option value="bank">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Reference 
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="Transaction ID or note"
                    className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={processingPayment}
                  className="flex-1 px-4 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddPayment}
                  disabled={processingPayment}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
                >
                  {processingPayment ? 'Processing...' : 'Add Payment'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
      <Footer />
    </SectorLayout>
  );
};

export default InvoicePage;
