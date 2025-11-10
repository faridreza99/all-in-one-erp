import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign,
  Calendar,
  Eye,
  XCircle,
  AlertCircle,
  Search,
} from "lucide-react";
import SectorLayout from "../components/SectorLayout";
import BackButton from "../components/BackButton";
import { API } from "../App";
import { toast } from "sonner";

const SalesPage = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Filtering & pagination
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // all | active | cancelled
  const [paymentFilter, setPaymentFilter] = useState("all"); // all | paid | partially_paid | unpaid
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedQuery(query.trim().toLowerCase()),
      250,
    );
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/sales`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      // sort recent first (created_at desc). Fallback to id desc if needed.
      const sorted = [...response.data].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (bTime !== aTime) return bTime - aTime;
        return (b.id || 0) - (a.id || 0);
      });
      setSales(sorted);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to fetch sales");
    } finally {
      setLoading(false);
    }
  };

  const viewInvoice = (saleId) => {
    navigate(`/${user.business_type}/invoice/${saleId}`);
  };

  const handleCancelClick = (sale) => {
    if (sale.status === "cancelled") {
      toast.error("Sale is already cancelled");
      return;
    }
    if (sale.amount_paid > 0) {
      toast.error(
        "Cannot cancel sale with payments. Please process a return instead.",
      );
      return;
    }
    setSelectedSale(sale);
    setShowCancelModal(true);
  };

  const confirmCancelSale = async () => {
    if (!selectedSale) return;
    setIsCancelling(true);
    try {
      await axios.patch(
        `${API}/sales/${selectedSale.id}/cancel`,
        { reason: cancellationReason || null },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      toast.success("Sale cancelled successfully! Stock has been restored.");
      setShowCancelModal(false);
      setSelectedSale(null);
      setCancellationReason("");
      await fetchSales();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to cancel sale");
    } finally {
      setIsCancelling(false);
    }
  };

  // ---- Filtering + Pagination Memos ----
  const filteredSales = useMemo(() => {
    let list = sales;

    if (statusFilter !== "all") {
      list = list.filter((s) =>
        statusFilter === "active"
          ? s.status !== "cancelled"
          : s.status === "cancelled",
      );
    }

    if (paymentFilter !== "all") {
      list = list.filter(
        (s) => (s.payment_status || "").toLowerCase() === paymentFilter,
      );
    }

    if (debouncedQuery) {
      list = list.filter((s) => {
        const saleNum = (s.sale_number || "").toString().toLowerCase();
        const customer = (s.customer_name || "walk-in").toLowerCase();
        const pay = (s.payment_status || "").toLowerCase();
        const total =
          typeof s.total === "number"
            ? s.total.toFixed(2)
            : String(s.total || "");
        return (
          saleNum.includes(debouncedQuery) ||
          customer.includes(debouncedQuery) ||
          pay.includes(debouncedQuery) ||
          total.includes(debouncedQuery)
        );
      });
    }

    // already saved as recent-first; keep order
    return list;
  }, [sales, statusFilter, paymentFilter, debouncedQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / pageSize));

  // keep page in range if filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, statusFilter, paymentFilter, pageSize]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredSales.slice(start, start + pageSize);
  }, [filteredSales, page, pageSize]);

  const totalRevenue = useMemo(
    () => sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0),
    [sales],
  );

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <BackButton className="mb-4" />
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Sales History</h1>
          <p className="text-slate-400">View and manage all transactions</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Revenue</p>
                <p
                  className="text-3xl font-bold text-white"
                  data-testid="total-revenue"
                >
                  ${totalRevenue.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Calendar className="w-7 h-7 text-blue-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Transactions</p>
                <p
                  className="text-3xl font-bold text-white"
                  data-testid="total-transactions"
                >
                  {sales.length}
                </p>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Average Sale</p>
                <p className="text-3xl font-bold text-white">
                  {sales.length > 0
                    ? `$${(totalRevenue / sales.length).toFixed(2)}`
                    : "$0.00"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                placeholder="Search sale #, customer, payment status, amount…"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
            >
              <option value="all">All Payments</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="unpaid">Unpaid / Due</option>
            </select>

            <div className="flex items-center justify-between gap-3">
              <label className="text-slate-300 text-sm whitespace-nowrap">
                Rows per page
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="flex-1 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Sales Table */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Sales</h2>
            <div className="text-slate-400 text-sm">
              Showing{" "}
              <span className="text-white font-semibold">
                {filteredSales.length === 0 ? 0 : (page - 1) * pageSize + 1}
              </span>
              –
              <span className="text-white font-semibold">
                {Math.min(page * pageSize, filteredSales.length)}
              </span>{" "}
              of{" "}
              <span className="text-white font-semibold">
                {filteredSales.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400">
              Loading sales…
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-300">No sales match your filters.</p>
              <button
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                  setPaymentFilter("all");
                }}
                className="mt-3 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Subtotal</th>
                    <th>Discount</th>
                    <th>Tax</th>
                    <th>Total</th>
                    <th>Payment Status</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((sale) => {
                    const isCancelled = sale.status === "cancelled";
                    const canCancel =
                      !isCancelled && (sale.amount_paid || 0) === 0;

                    return (
                      <tr
                        key={sale.id}
                        data-testid={`sale-row-${sale.id}`}
                        className={isCancelled ? "opacity-60" : ""}
                      >
                        <td className="font-semibold text-blue-400">
                          {sale.sale_number}
                        </td>
                        <td className="text-slate-300">
                          {sale.customer_name || "Walk-in"}
                        </td>
                        <td className="text-slate-300">
                          {sale.items?.length ?? 0}
                        </td>
                        <td className="text-slate-300">
                          ${Number(sale.subtotal || 0).toFixed(2)}
                        </td>
                        <td className="text-orange-400">
                          -${Number(sale.discount || 0).toFixed(2)}
                        </td>
                        <td className="text-slate-300">
                          ${Number(sale.tax || 0).toFixed(2)}
                        </td>
                        <td className="text-green-400 font-bold">
                          ${Number(sale.total || 0).toFixed(2)}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              sale.payment_status === "paid"
                                ? "badge-success"
                                : sale.payment_status === "partially_paid"
                                  ? "badge-warning"
                                  : "badge-danger"
                            }`}
                          >
                            {(sale.payment_status || "unpaid")
                              .replace("_", " ")
                              .toUpperCase()}
                          </span>
                        </td>
                        <td>
                          {isCancelled ? (
                            <span className="badge badge-danger">
                              CANCELLED
                            </span>
                          ) : (
                            <span className="badge badge-success">ACTIVE</span>
                          )}
                        </td>
                        <td className="text-slate-400 text-sm">
                          {sale.created_at
                            ? new Date(sale.created_at).toLocaleDateString()
                            : "-"}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewInvoice(sale.id)}
                              className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                              title="View Invoice"
                            >
                              <Eye className="w-4 h-4 text-blue-400" />
                            </button>
                            {canCancel && (
                              <button
                                onClick={() => handleCancelClick(sale)}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                                title="Cancel Sale"
                              >
                                <XCircle className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="flex items-center justify-between mt-6">
                <div className="text-slate-400 text-sm">
                  Page <span className="text-white font-semibold">{page}</span>{" "}
                  of{" "}
                  <span className="text-white font-semibold">{totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white"
                  >
                    « First
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white"
                  >
                    ‹ Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white"
                  >
                    Next ›
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white"
                  >
                    Last »
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && selectedSale && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Cancel Sale</h3>
              </div>

              <p className="text-slate-300 mb-4">
                Are you sure you want to cancel sale{" "}
                <span className="text-blue-400 font-bold">
                  {selectedSale.sale_number}
                </span>
                ?
              </p>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <p className="text-yellow-300 text-sm">
                  <strong>Important:</strong> This action will restore stock for
                  all items in this sale and cannot be undone.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-slate-300 font-semibold mb-2">
                  Cancellation Reason
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:outline-none transition-all resize-none"
                  rows="3"
                  placeholder="Enter reason for cancellation..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setSelectedSale(null);
                    setCancellationReason("");
                  }}
                  disabled={isCancelling}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all"
                >
                  Keep Sale
                </button>
                <button
                  onClick={confirmCancelSale}
                  disabled={isCancelling}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                >
                  {isCancelling ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      Cancel Sale
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </SectorLayout>
  );
};

export default SalesPage;
