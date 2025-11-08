import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
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
  Download,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import SectorLayout from "../components/SectorLayout";
import BackButton from "../components/BackButton";
import { API } from "../App";
import { toast } from "sonner";
import { formatErrorMessage } from "../utils/errorHandler";
import { formatCurrency } from "../utils/formatters";
import Footer from "../components/Footer";

const InvoicePage = ({ user, onLogout }) => {
  const { saleId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const invoiceRef = useRef(null);

  // Branding
  const [branding, setBranding] = useState({
    name: "Smart Business ERP",
    tagline: "Powered by MaxTech BD",
    logo: null,
    address: "",
    phone: "",
    email: "",
    website: "",
  });

  useEffect(() => {
    fetchInvoice();
  }, [saleId]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axios.get(`${API}/settings`, {
          withCredentials: true,
        });
        const raw = data?.data ?? data ?? {};
        const pick = (keys, fallback = "") =>
          keys.reduce((acc, k) => acc ?? raw[k], undefined) ?? fallback;

        const name = pick(
          ["app_name", "site_name", "name"],
          "Smart Business ERP",
        );
        const tagline = pick(["tagline", "sub_title"], "Powered by MaxTech BD");

        const rawLogo = pick(
          ["app_logo", "logo", "logo_url", "brand_logo"],
          null,
        );
        const logo = rawLogo
          ? /^https?:\/\//i.test(rawLogo)
            ? rawLogo
            : `${API}${rawLogo.startsWith("/") ? "" : "/"}${rawLogo}`
          : null;

        const address = pick(["address", "company_address"]);
        const phone = pick(["phone", "company_phone", "contact_phone"]);
        const email = pick(["email", "company_email", "contact_email"]);
        const website = pick(["website", "site_url"]);

        if (mounted) {
          setBranding({ name, tagline, logo, address, phone, email, website });
        }
      } catch {
        // keep defaults silently
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchInvoice = async () => {
    try {
      const response = await axios.get(`${API}/sales/${saleId}/invoice`, {
        withCredentials: true,
      });
      setInvoice(response.data);
      setLoading(false);
    } catch (error) {
      toast.error(formatErrorMessage(error));
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }
    const amount = parseFloat(paymentAmount);
    if (amount > invoice.sale.balance_due) {
      toast.error(
        `Payment amount cannot exceed balance due (${formatCurrency(invoice.sale.balance_due)})`,
      );
      return;
    }

    setProcessingPayment(true);
    try {
      await axios.post(
        `${API}/sales/${saleId}/payments`,
        {
          amount,
          method: paymentMethod,
          reference: reference || undefined,
        },
        { withCredentials: true },
      );

      toast.success("Payment added successfully!");
      setShowPaymentModal(false);
      setPaymentAmount("");
      setReference("");
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
      // Ensure fonts/images loaded
      await document.fonts?.ready;

      const node = invoiceRef.current;

      const canvas = await html2canvas(node, {
        scale: 2, // crisp text
        useCORS: true, // allow cross-origin logo render
        allowTaint: true,
        backgroundColor: "#ffffff",
        windowWidth: node.scrollWidth,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pageWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const margin = 8; // small margin
      const imgWidth = pageWidth - margin * 2;

      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      // First page
      let position = margin;
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      // Additional pages
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      const fileName = `Invoice-${invoice?.sale?.invoice_no || saleId}.pdf`;
      pdf.save(fileName);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      paid: {
        bg: "bg-green-500/20",
        text: "text-green-600",
        icon: CheckCircle,
        label: "Paid",
      },
      partially_paid: {
        bg: "bg-yellow-500/20",
        text: "text-yellow-600",
        icon: Clock,
        label: "Partially Paid",
      },
      unpaid: {
        bg: "bg-red-500/20",
        text: "text-red-600",
        icon: AlertCircle,
        label: "Unpaid",
      },
    };
    const badge = badges[status] || badges.unpaid;
    const Icon = badge.icon;
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${badge.bg}`}
      >
        <Icon size={16} className={badge.text} />
        <span className={`text-sm font-medium ${badge.text}`}>
          {badge.label}
        </span>
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

  const { sale, payments } = invoice;

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      {/* Print styles injected locally for this page */}
      <style>{`
        @page { size: A4; margin: 10mm; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          nav, header, footer, .no-print, [data-testid="sidebar-toggle"] { display: none !important; }
          .invoice-sheet { box-shadow: none !important; border: none !important; }
          .sticky { position: static !important; }
        }
      `}</style>

      <div className="space-y-6 pb-24">
        <div className="flex items-center justify-between no-print">
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
              <span>{generatingPDF ? "Generating..." : "Download PDF"}</span>
            </button>
          </div>
        </div>

        <div
          ref={invoiceRef}
          className="invoice-sheet mx-auto max-w-[900px] bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 print:bg-white"
        >
          {/* Top edge accent */}
          <div className="h-1.5 w-full bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 rounded-t-2xl" />

          {/* Header */}
          <div className="p-8 pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex items-center gap-4">
                {branding.logo ? (
                  <img
                    src={branding.logo}
                    alt={branding.name}
                    crossOrigin="anonymous"
                    className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600" />
                )}
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    {branding.name}
                  </h1>
                  {branding.tagline && (
                    <p className="text-sm text-slate-500">{branding.tagline}</p>
                  )}
                  {(branding.address ||
                    branding.phone ||
                    branding.email ||
                    branding.website) && (
                    <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                      {branding.address && <p>{branding.address}</p>}
                      <p className="flex flex-wrap gap-x-3 gap-y-1">
                        {branding.phone && <span>Phone: {branding.phone}</span>}
                        {branding.email && <span>Email: {branding.email}</span>}
                        {branding.website && (
                          <span>Web: {branding.website}</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <Receipt size={16} />
                  <span className="text-sm font-semibold">INVOICE</span>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <p>
                    <span className="text-slate-500">Invoice No:</span>{" "}
                    <span className="font-semibold">{sale.invoice_no}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Sale No:</span>{" "}
                    <span className="font-semibold">{sale.sale_number}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Date:</span>{" "}
                    <span className="font-semibold">
                      {new Date(sale.created_at).toLocaleDateString()}
                    </span>
                  </p>
                  <div className="pt-1">
                    {getPaymentStatusBadge(sale.payment_status)}
                  </div>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="mt-6 grid sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 bg-slate-50">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500">BILL TO</p>
                <p className="text-base font-semibold">
                  {sale.customer_name || "Walk-in Customer"}
                </p>
                {sale.customer_phone && (
                  <p className="text-sm text-slate-600">
                    Phone: {sale.customer_phone}
                  </p>
                )}
              </div>
              <div className="space-y-1 sm:text-right">
                <p className="text-xs font-semibold text-slate-500">PAYMENT</p>
                <p className="text-sm text-slate-600 capitalize">
                  Method: {sale.payment_method || "—"}
                </p>
                <p className="text-sm text-slate-600">
                  Status:{" "}
                  <span className="font-semibold capitalize">
                    {sale.payment_status.replace("_", " ")}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="px-8">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-4 py-2 text-left font-semibold text-slate-600">
                      Product
                    </th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-600">
                      Price
                    </th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-600">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-right font-semibold text-slate-600">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
                  {sale.items.map((item, idx) => (
                    <tr key={idx} className="border-t border-slate-200">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {item.product_name || item.name || "Unknown Product"}
                        </p>
                        {item.product_sku && (
                          <p className="text-xs text-slate-500">
                            SKU: {item.product_sku}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div className="text-xs text-slate-500">
                <p className="mb-1 font-semibold">Notes</p>
                <p>Thank you for your business.</p>
              </div>
              <div className="md:ml-auto">
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>
                      {formatCurrency(
                        sale.items.reduce(
                          (sum, i) => sum + i.price * i.quantity,
                          0,
                        ),
                      )}
                    </span>
                  </div>
                  {sale.discount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Discount:</span>
                      <span className="text-green-600">
                        -{formatCurrency(sale.discount)}
                      </span>
                    </div>
                  )}
                  {sale.tax > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tax:</span>
                      <span>{formatCurrency(sale.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-extrabold pt-2 border-t border-slate-200">
                    <span>Total:</span>
                    <span className="text-slate-900">
                      {formatCurrency(sale.total)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base text-green-700">
                    <span>Paid:</span>
                    <span>{formatCurrency(sale.amount_paid)}</span>
                  </div>
                  {sale.balance_due > 0 && (
                    <div className="flex justify-between text-base text-red-600 font-semibold">
                      <span>Balance Due:</span>
                      <span>{formatCurrency(sale.balance_due)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {payments && payments.length > 0 && (
            <div className="px-8 mt-8 pb-8">
              <h3 className="text-base font-semibold text-slate-800 mb-3">
                Payment History
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">
                        Method
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-slate-600">
                        Reference
                      </th>
                      <th className="px-4 py-2 text-right font-semibold text-slate-600">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
                    {payments.map((payment) => (
                      <tr
                        key={payment.id}
                        className="border-t border-slate-200"
                      >
                        <td className="px-4 py-3">
                          {new Date(payment.received_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {payment.method}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {payment.reference || "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">
                          {formatCurrency(payment.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer strip */}
          <div className="px-8 pb-8">
            <div className="mt-4 text-center text-xs text-slate-500">
              <p>{branding.name} — This is a computer generated invoice.</p>
            </div>
          </div>
        </div>

        {/* Sticky Unpaid Banner (screen only) */}
        {sale.payment_status !== "paid" && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky bottom-6 no-print z-20 bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-xl p-4 backdrop-blur-sm shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-500" size={24} />
                <div>
                  <h3 className="font-semibold text-red-600">
                    Outstanding Balance
                  </h3>
                  <p className="text-sm text-slate-700">
                    {formatCurrency(sale.balance_due)} remaining of{" "}
                    {formatCurrency(sale.total)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                <Plus size={18} />
                <span>Add Payment</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md text-white"
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
                      onClick={() =>
                        setPaymentAmount(sale.balance_due.toString())
                      }
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
                  {processingPayment ? "Processing..." : "Add Payment"}
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
