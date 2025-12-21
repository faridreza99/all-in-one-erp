import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Receipt,
  CheckCircle,
  Clock,
  AlertCircle,
  Printer,
  Download,
  Plus,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import QRCode from "qrcode";
import SectorLayout from "../components/SectorLayout";
import BackButton from "../components/BackButton";
import Footer from "../components/Footer";
import { API } from "../App";
import { formatErrorMessage } from "../utils/errorHandler";
import { formatCurrency } from "../utils/formatters";

// Simple QR Code component using qrcode library
const QRCodeDisplay = ({ value, size = 80 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      QRCode.toCanvas(
        canvasRef.current,
        value,
        {
          width: size,
          margin: 1,
          errorCorrectionLevel: "M",
        },
        (error) => {
          if (error) console.error("QR Code generation error:", error);
        },
      );
    }
  }, [value, size]);

  return <canvas ref={canvasRef} />;
};

const human = (v, fb = "—") =>
  typeof v === "string" && v.trim().length ? v : fb;

const InvoicePage = ({ user, onLogout }) => {
  const { saleId } = useParams();
  const invoiceRef = useRef(null);

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  const [branding, setBranding] = useState({
    website_name: "Business",
    logo_url: null,
    background_image_url: null,
  });

  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/settings`, { withCredentials: true });
        const d = r?.data ?? {};
        setBranding({
          website_name: human(d.website_name, "Business"),
          logo_url: d.logo_url ?? null,
          background_image_url: d.background_image_url ?? null,
        });
      } catch {
        /* keep defaults */
      }
    })();
    fetchInvoice();
  }, [saleId]);

  const fetchInvoice = async () => {
    try {
      const { data } = await axios.get(`${API}/sales/${saleId}/invoice`, {
        withCredentials: true,
      });
      setInvoice(data);
    } catch (err) {
      toast.error(formatErrorMessage(err));
    }
    setLoading(false);
  };

  const getPaymentBadge = (status) => {
    const map = {
      paid: {
        text: "Paid",
        icon: CheckCircle,
        color: "text-green-600",
        bg: "bg-green-500/20",
      },
      partially_paid: {
        text: "Partially Paid",
        icon: Clock,
        color: "text-yellow-600",
        bg: "bg-yellow-500/20",
      },
      unpaid: {
        text: "Unpaid",
        icon: AlertCircle,
        color: "text-red-600",
        bg: "bg-red-500/20",
      },
    };
    const b = map[status] || map.unpaid;
    const Icon = b.icon;
    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full gap-1 text-sm ${b.bg} ${b.color}`}
      >
        <Icon size={16} /> {b.text}
      </span>
    );
  };

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    if (!invoiceRef.current) return;
    setGeneratingPDF(true);
    setIsExportingPDF(true);
    try {
      await new Promise((r) => setTimeout(r, 0));
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        windowWidth: invoiceRef.current.scrollWidth,
      });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 5;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;
      pdf.addImage(img, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(img, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }
      pdf.save(`Invoice-${invoice?.sale?.invoice_no || saleId}.pdf`);
    } catch {
      toast.error("Failed to generate PDF");
    } finally {
      setIsExportingPDF(false);
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <SectorLayout user={user} onLogout={onLogout}>
        <div className="flex items-center justify-center min-h-[60vh] text-gray-400">
          Loading invoice...
        </div>
      </SectorLayout>
    );
  }

  const { sale = {}, payments = [], warranties = [] } = invoice ?? {};
  const items = Array.isArray(sale.items) ? sale.items : [];
  const subtotal = items.reduce(
    (s, it) => s + Number(it?.price ?? 0) * Number(it?.quantity ?? 0),
    0,
  );
  const discount = Number(sale.discount ?? 0);
  const tax = Number(sale.tax ?? 0);
  const total = subtotal - discount + tax;
  const amountPaid = Number(sale.amount_paid ?? 0);
  const balance = Math.max(total - amountPaid, 0);

  // Create warranty lookup map by product_id
  const warrantyMap = {};
  warranties.forEach((w) => {
    if (w.product_id && w.warranty_token) {
      warrantyMap[w.product_id] = w;
    }
  });

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      {/* PRINT-ONLY overrides to remove blank band and watermark */}
      <style>{`
        @page { size: A4; margin: 8mm; }
        @media print {
          body { background:#fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          /* Hide the entire app chrome */
          body * { visibility: hidden !important; }
          #print-root, #print-root * { visibility: visible !important; }
          #print-root { position: absolute !important; inset: 0 !important; width: auto !important; margin: 0 !important; }

          /* Tighten layout */
          .invoice-sheet { padding: 12mm 10mm !important; box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          .invoice-accent { margin-bottom: 8px !important; height: 3px !important; }
          .invoice-header  { margin-bottom: 8px !important; }
          .invoice-watermark { display: none !important; } /* remove background image on paper */
          .avoid-break, .avoid-break * { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}</style>

      {/* actions (screen only) */}
      <div className="no-print flex items-center justify-between mt-4 mb-6">
        <BackButton />
        <div className="flex gap-3">
          <button
            onClick={handlePrint}
            className="btn-primary flex items-center gap-2"
          >
            <Printer size={18} />
            Print
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPDF}
            className="btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            <Download size={18} />
            {generatingPDF ? "Generating..." : "Download PDF"}
          </button>
        </div>
      </div>

      {/* === PRINT ROOT START === */}
      <div id="print-root">
        <div
          ref={invoiceRef}
          className="invoice-sheet relative mx-auto max-w-[900px] bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 p-10 overflow-hidden avoid-break"
        >
          {branding.background_image_url && (
            <div
              className="invoice-watermark pointer-events-none absolute inset-0 opacity-[0.06]"
              style={{
                backgroundImage: `url(${branding.background_image_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
          )}

          <div className="invoice-accent relative h-1.5 w-full rounded-t-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-indigo-500 mb-6" />

          {/* header */}
          <div className="invoice-header relative flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex items-center gap-4">
              {branding.logo_url ? (
                <img
                  src={branding.logo_url}
                  alt="logo"
                  crossOrigin="anonymous"
                  className="w-16 h-16 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600" />
              )}
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight">
                  {branding.website_name}
                </h1>
                <p className="text-sm text-slate-500">Powered by MaxTech BD</p>
              </div>
            </div>

            <div className="text-right space-y-1.5">
              {!isExportingPDF && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                  <Receipt size={16} />
                  <span className="text-sm font-semibold">INVOICE</span>
                </div>
              )}
              <p className="text-sm">
                <span className="text-slate-500">Invoice No:</span>{" "}
                <span className="font-semibold">{human(sale.invoice_no)}</span>
              </p>
              <p className="text-sm">
                <span className="text-slate-500">Sale No:</span>{" "}
                <span className="font-semibold">{human(sale.sale_number)}</span>
              </p>
              <p className="text-sm">
                <span className="text-slate-500">Date:</span>{" "}
                <span className="font-semibold">
                  {sale.created_at
                    ? new Date(sale.created_at).toLocaleDateString()
                    : "—"}
                </span>
              </p>
              {!isExportingPDF && (
                <div className="pt-1">
                  {getPaymentBadge(sale.payment_status)}
                </div>
              )}
            </div>
          </div>

          {/* bill to / payment */}
          <div className="relative mt-4 grid sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 bg-slate-50">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500">BILL TO</p>
              <p className="text-base font-semibold">
                {human(sale.customer_name, "Walk-in Customer")}
              </p>
              {human(sale.customer_phone, "") && (
                <p className="text-sm text-slate-600">
                  Phone: {sale.customer_phone}
                </p>
              )}
            </div>
            <div className="space-y-1 sm:text-right">
              <p className="text-xs font-semibold text-slate-500">PAYMENT</p>
              {human(sale.payment_method, "") && (
                <p className="text-sm text-slate-600 capitalize">
                  Method: {sale.payment_method}
                </p>
              )}
              {human(sale.payment_status, "") && (
                <p className="text-sm text-slate-600 capitalize">
                  Status: {sale.payment_status}
                </p>
              )}
            </div>
          </div>

          {/* items */}
          <div className="relative mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600">
                  <th className="px-4 py-2 text-left  font-semibold">
                    Product
                  </th>
                  <th className="px-4 py-2 text-right font-semibold">Price</th>
                  <th className="px-4 py-2 text-right font-semibold">Qty</th>
                  <th className="px-4 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
                {items.map((it, i) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">
                        {human(it.product_name) || human(it.name) || "Product"}
                      </p>
                      {human(it.product_sku, "") && (
                        <p className="text-xs text-slate-500">
                          SKU: {it.product_sku}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {formatCurrency(Number(it.price || 0))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {Number(it.quantity || 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCurrency(
                        Number(it.price || 0) * Number(it.quantity || 0),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* totals */}
          <div className="relative mt-6 grid md:grid-cols-2 gap-6">
            <div className="text-xs text-slate-500">
              <p className="mb-1 font-semibold">Notes</p>
              <p>Thank you for your business.</p>
            </div>
            <div className="md:ml-auto">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Discount:</span>
                    <span className="text-green-600">
                      -{formatCurrency(discount)}
                    </span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax:</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-extrabold pt-2 border-t border-slate-200">
                  <span>Total:</span>
                  <span className="text-slate-900">
                    {formatCurrency(total)}
                  </span>
                </div>
                <div className="flex justify-between text-base text-green-700">
                  <span>Paid:</span>
                  <span>{formatCurrency(amountPaid)}</span>
                </div>
                {balance > 0 && (
                  <div className="flex justify-between text-base text-red-600 font-semibold">
                    <span>Balance Due:</span>
                    <span>{formatCurrency(balance)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* payments */}
          {payments.length > 0 && (
            <div className="relative px-0 mt-8">
              <h3 className="text-base font-semibold text-slate-800 mb-3">
                Payment History
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-100 text-slate-600">
                      <th className="px-4 py-2 text-left  font-semibold">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left  font-semibold">
                        Method
                      </th>
                      <th className="px-4 py-2 text-left  font-semibold">
                        Reference
                      </th>
                      <th className="px-4 py-2 text-right font-semibold">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="[&>tr:nth-child(even)]:bg-slate-50">
                    {payments.map((p) => (
                      <tr
                        key={p.id || `${p.received_at}-${p.amount}`}
                        className="border-t border-slate-200"
                      >
                        <td className="px-4 py-3">
                          {p.received_at
                            ? new Date(p.received_at).toLocaleDateString()
                            : "—"}
                        </td>
                        <td className="px-4 py-3 capitalize">
                          {human(p.method)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {human(p.reference)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-700">
                          {formatCurrency(Number(p.amount || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* warranty qr codes */}
          {warranties.length > 0 && (
            <div className="relative px-0 mt-8">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center justify-center gap-2">
                <Shield size={20} className="text-blue-600" />
                Product Warranties
              </h3>
              <div className="grid grid-cols-1 gap-6">
                {warranties.map((warranty, idx) => {
                  const warrantyUrl = `${window.location.origin}/w/${warranty.warranty_token}`;
                  const expiryDate = warranty.warranty_expiry_date
                    ? new Date(
                        warranty.warranty_expiry_date,
                      ).toLocaleDateString()
                    : "N/A";

                  return (
                    <div
                      key={warranty.warranty_id || idx}
                      className="rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-slate-50 p-6"
                    >
                      <div className="flex flex-col items-center text-center">
                        <p className="font-bold text-slate-900 text-base mb-2">
                          {warranty.product_name || "Product"}
                        </p>

                        <div className="bg-white p-4 rounded-xl border-2 border-slate-300 shadow-lg mb-4">
                          <QRCodeDisplay value={warrantyUrl} size={180} />
                        </div>

                        <div className="space-y-1 mb-3">
                          {/* <p className="text-sm font-semibold text-blue-700">
                            Warranty: {warranty.warranty_months || 0} months
                          </p> */}
                          <p className="text-sm text-slate-600">
                            Valid until: {expiryDate}
                          </p>
                        </div>

                        <a
                          href={warrantyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 font-semibold hover:underline inline-flex items-center gap-1"
                        >
                          Scan QR or click to access warranty portal →
                        </a>

                        <p className="text-xs text-slate-500 mt-4 max-w-md">
                          📱 Scan this QR code with your phone camera to access
                          warranty information and file claims online
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warranty & Return Policy Terms */}
          {sale.include_warranty_terms && sale.warranty_terms && (
            <div className="relative px-0 mt-8">
              <h3 className="text-base font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Shield size={18} className="text-amber-600" />
                Warranty & Return Policy
              </h3>
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4">
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                  {sale.warranty_terms}
                </p>
              </div>
            </div>
          )}

          <div className="relative mt-6 text-center text-xs text-slate-500">
            © {new Date().getFullYear()} {branding.website_name} —
            Computer-generated invoice.
          </div>
        </div>
      </div>
      {/* === PRINT ROOT END === */}

      <Footer />
    </SectorLayout>
  );
};

export default InvoicePage;
