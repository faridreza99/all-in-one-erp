import React, { useState, useEffect } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  User,
  Plus,
  Search,
  Edit2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Swal from "sweetalert2";
import BackButton from "../components/BackButton";
import SectorLayout from "../components/SectorLayout";
import { API } from "../App";

/* ---------------------- BD phone helpers ---------------------- */
const onlyDigits = (s = "") => (s || "").replace(/\D/g, "");

const toLocalFromAny = (phone = "") => {
  // return local significant number WITHOUT 0/country code, e.g., "17XXXXXXXXX"
  let d = onlyDigits(phone);
  if (d.startsWith("880")) d = d.slice(3); // strip country code
  if (d.startsWith("0")) d = d.slice(1); // strip trunk 0
  return d;
};

const isValidBDLocal = (local) => /^1[3-9]\d{8}$/.test(local); // 013–019 ranges
const toE164BD = (input) => {
  const local = isValidBDLocal(onlyDigits(input))
    ? onlyDigits(input)
    : toLocalFromAny(input);
  if (!isValidBDLocal(local)) return null;
  return `+880${local}`;
};
/* -------------------------------------------------------------- */

const SuppliersPage = ({ user, onLogout }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // form state
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });
  const [bdPhoneLocal, setBdPhoneLocal] = useState(""); // "1XXXXXXXXX"
  const [phoneError, setPhoneError] = useState("");

  // bulk modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkResults, setBulkResults] = useState([]); // [{row, status, message}]
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API}/suppliers`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) {
        const data = await response.json();
        setSuppliers(data);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Failed to load suppliers");
    }
  };

  const resetForm = () => {
    setEditingSupplier(null);
    setFormData({
      name: "",
      contact_person: "",
      phone: "",
      email: "",
      address: "",
    });
    setBdPhoneLocal("");
    setPhoneError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.contact_person) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate & normalize phone to +8801XXXXXXXXX
    if (!isValidBDLocal(onlyDigits(bdPhoneLocal))) {
      setPhoneError("Enter a valid Bangladeshi mobile (e.g., 1700000000)");
      toast.error("Invalid Bangladeshi phone number");
      return;
    }
    const e164 = toE164BD(bdPhoneLocal);
    if (!e164) {
      setPhoneError("Enter a valid Bangladeshi mobile (e.g., 1700000000)");
      toast.error("Invalid Bangladeshi phone number");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = editingSupplier
        ? `${API}/suppliers/${editingSupplier.id}`
        : `${API}/suppliers`;

      const method = editingSupplier ? "PUT" : "POST";
      const payload = { ...formData, phone: e164 };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(
          editingSupplier
            ? "Supplier updated successfully!"
            : "Supplier created successfully!",
        );
        setShowForm(false);
        resetForm();
        fetchSuppliers();
      } else {
        const error = await response.json().catch(() => ({}));
        toast.error(error.detail || "Failed to save supplier");
      }
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error("Failed to save supplier");
    }
  };

  const handleEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person,
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
    });
    setBdPhoneLocal(toLocalFromAny(supplier.phone || ""));
    setPhoneError("");
    setShowForm(true);
    // Scroll to form for convenience
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const handleDelete = async (supplierId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${API}/suppliers/${supplierId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.ok) {
          toast.success("Supplier deleted successfully!");
          fetchSuppliers();
        } else {
          toast.error("Failed to delete supplier");
        }
      } catch (error) {
        console.error("Error deleting supplier:", error);
        toast.error("Failed to delete supplier");
      }
    }
  };

  const onPhoneLocalChange = (v) => {
    const digits = onlyDigits(v).slice(0, 10); // 10 digits after +880
    setBdPhoneLocal(digits);
    if (digits && !isValidBDLocal(digits)) {
      setPhoneError("Format: 1XXXXXXXXX (accepted prefixes 13–19)");
    } else {
      setPhoneError("");
    }
  };

  /* ---------------------- Filtering + Pagination ---------------------- */
  const filteredSuppliers = suppliers.filter((supplier) => {
    const q = searchTerm.toLowerCase();
    return (
      supplier.name?.toLowerCase().includes(q) ||
      supplier.contact_person?.toLowerCase().includes(q) ||
      supplier.phone?.includes(searchTerm) ||
      supplier.email?.toLowerCase().includes(q)
    );
  });

  const total = filteredSuppliers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pageItems = filteredSuppliers.slice(startIndex, endIndex);

  const gotoPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  /* ---------------------- Bulk Import ---------------------- */
  const parseCSV = (text) => {
    // Simple CSV parser (handles commas inside quotes)
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return { headers: [], rows: [] };

    const splitSmart = (line) => {
      const out = [];
      let cur = "";
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          // toggle quotes (handle double escapes "")
          if (inQ && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQ = !inQ;
          }
        } else if (ch === "," && !inQ) {
          out.push(cur);
          cur = "";
        } else {
          cur += ch;
        }
      }
      out.push(cur);
      return out.map((s) => s.trim());
    };

    const headers = splitSmart(lines[0]).map((h) => h.toLowerCase());
    const rows = lines.slice(1).map((line) => {
      const cols = splitSmart(line);
      const row = {};
      headers.forEach((h, i) => (row[h] = cols[i] ?? ""));
      return row;
    });
    return { headers, rows };
  };

  const handleBulkFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = null;
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      toast.error("Please upload a .csv file");
      return;
    }
    const text = await file.text();
    setBulkText(text);
  };

  const runBulkImport = async () => {
    const { headers, rows } = parseCSV(bulkText);
    const needed = ["name", "contact_person", "phone", "email", "address"];
    const hasAll = needed.every((h) => headers.includes(h));
    if (!hasAll) {
      toast.error(
        "CSV must include headers: name, contact_person, phone, email, address",
      );
      return;
    }
    if (rows.length === 0) {
      toast.error("No data rows found");
      return;
    }

    const token = localStorage.getItem("token");
    setBulkLoading(true);
    setBulkResults([]);

    const tasks = rows.map((r, idx) => {
      const e164 = toE164BD(r.phone);
      if (!e164) {
        return Promise.resolve({
          index: idx,
          status: "rejected",
          message: `Invalid BD phone: ${r.phone}`,
        });
      }

      const payload = {
        name: r.name?.trim(),
        contact_person: r.contact_person?.trim(),
        phone: e164,
        email: r.email?.trim() || "",
        address: r.address?.trim() || "",
      };

      if (!payload.name || !payload.contact_person) {
        return Promise.resolve({
          index: idx,
          status: "rejected",
          message: "Missing required fields (name/contact_person)",
        });
      }

      return fetch(`${API}/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return {
              index: idx,
              status: "rejected",
              message: err.detail || `HTTP ${res.status}`,
            };
          }
          return { index: idx, status: "fulfilled", message: "Created" };
        })
        .catch((e) => ({
          index: idx,
          status: "rejected",
          message: e.message || "Network error",
        }));
    });

    const results = await Promise.all(tasks);
    setBulkResults(results);
    setBulkLoading(false);

    const ok = results.filter((r) => r.status === "fulfilled").length;
    const bad = results.length - ok;
    if (ok) toast.success(`Imported ${ok} supplier(s)`);
    if (bad) toast.error(`Failed ${bad} row(s)`);

    if (ok) {
      fetchSuppliers();
    }
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <BackButton />

      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Building2 className="w-10 h-10 text-purple-400" />
              Suppliers Management
            </h1>
            <p className="text-gray-400">Manage your supplier information</p>
          </div>
          <button
            onClick={() => {
              const next = !showForm;
              setShowForm(next);
              if (!next) {
                // closing
              } else {
                // opening a clean form
                resetForm();
                setTimeout(
                  () => window.scrollTo({ top: 0, behavior: "smooth" }),
                  0,
                );
              }
            }}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            {showForm ? "Cancel" : "Add Supplier"}
          </button>
        </div>

        {showForm && (
          <div className="bg-gradient-to-br from-gray-800/50 to-purple-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-8 mb-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Building2 className="w-6 h-6 text-purple-400" />
                {editingSupplier ? "Edit Supplier" : "New Supplier"}
              </h2>

              {/* Bulk add button */}
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2"
                title="Bulk Add Suppliers"
              >
                <Upload className="w-4 h-4" />
                Bulk Add Suppliers
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div>
                <label className="block text-gray-300 mb-2 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  Supplier Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter supplier name"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4 text-purple-400" />
                  Contact Person <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.contact_person}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_person: e.target.value })
                  }
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter contact person name"
                  required
                />
              </div>

              {/* BD Phone Input with Flag and +880 prefix */}
              <div className="md:col-span-1">
                <label className="block text-gray-300 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-400" />
                  Phone (Bangladesh) <span className="text-red-400">*</span>
                </label>
                <div className="flex items-stretch gap-0 rounded-lg overflow-hidden border border-gray-600 bg-gray-700/50 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent transition-all">
                  <span className="px-3 py-3 bg-gray-700/60 flex items-center justify-center select-none">
                    <span role="img" aria-label="Bangladesh">
                      🇧🇩
                    </span>
                  </span>
                  <span className="px-3 py-3 bg-gray-700/60 text-gray-300 select-none">
                    +880
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="\d*"
                    value={bdPhoneLocal}
                    onChange={(e) => onPhoneLocalChange(e.target.value)}
                    onBlur={() => {
                      if (
                        bdPhoneLocal &&
                        !isValidBDLocal(onlyDigits(bdPhoneLocal))
                      ) {
                        setPhoneError("Format: 1XXXXXXXXX (e.g., 1700000000)");
                      }
                    }}
                    placeholder="1XXXXXXXXX"
                    className="flex-1 bg-transparent px-3 py-3 text-white outline-none"
                    required
                  />
                </div>
                {phoneError && (
                  <p className="text-red-400 text-sm mt-1">{phoneError}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Accepted: 013–019 prefixes, 10 digits after +880
                </p>
              </div>

              <div>
                <label className="block text-gray-300 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-400" />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter email address"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-300 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter full address"
                  rows="3"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
                >
                  {editingSupplier ? "Update Supplier" : "Create Supplier"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ---------- TABLE LIST with Pagination ---------- */}
        <div className="bg-gradient-to-br from-gray-800/50 to-purple-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="relative md:w-1/2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search suppliers by name, contact, phone, or email..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm">Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-gray-700/50 border border-gray-600 text-white rounded-lg px-3 py-2"
              >
                {[5, 10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="text-left">Supplier</th>
                  <th className="text-left">Contact Person</th>
                  <th className="text-left">Phone</th>
                  <th className="text-left">Email</th>
                  <th className="text-left">Address</th>
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-400 py-10">
                      No suppliers found.
                    </td>
                  </tr>
                ) : (
                  pageItems.map((s) => (
                    <tr key={s.id}>
                      <td className="font-semibold text-white">{s.name}</td>
                      <td className="text-gray-300">{s.contact_person}</td>
                      <td className="text-gray-300">{s.phone}</td>
                      <td className="text-gray-300">{s.email || "-"}</td>
                      <td className="text-gray-300">{s.address || "-"}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(s)}
                            className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center gap-2"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-2"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls */}
          <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-3">
            <p className="text-gray-400 text-sm">
              Showing{" "}
              <span className="text-white">
                {total === 0 ? 0 : startIndex + 1}
              </span>
              –<span className="text-white">{Math.min(endIndex, total)}</span>{" "}
              of <span className="text-white">{total}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => gotoPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white disabled:opacity-50"
              >
                Prev
              </button>
              {/* Simple page numbers (show up to 7 around current) */}
              {Array.from({ length: totalPages })
                .map((_, i) => i + 1)
                .filter(
                  (p) =>
                    Math.abs(p - currentPage) <= 3 ||
                    p === 1 ||
                    p === totalPages,
                )
                .reduce((acc, p, idx, arr) => {
                  if (idx === 0) return [p];
                  const prev = arr[idx - 1];
                  if (p - prev > 1) acc.push("…");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, idx) =>
                  typeof p === "string" ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 text-gray-400"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => gotoPage(p)}
                      className={`px-3 py-2 rounded-lg border ${
                        p === currentPage
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "bg-gray-700/50 border-gray-600 text-white hover:bg-gray-700"
                      }`}
                    >
                      {p}
                    </button>
                  ),
                )}
              <button
                onClick={() => gotoPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 rounded-lg bg-gray-700/50 border border-gray-600 text-white disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
        {/* -------------------------------------------------- */}
      </div>

      {/* ------------------------ Bulk Modal ------------------------ */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">
                Bulk Add Suppliers (CSV)
              </h3>
              <button
                onClick={() => {
                  setShowBulkModal(false);
                  setBulkText("");
                  setBulkResults([]);
                }}
                className="w-9 h-9 rounded-lg bg-red-500/20 hover:bg-red-500/30 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-red-400" />
              </button>
            </div>

            <p className="text-slate-400 text-sm mb-3">
              Required headers:{" "}
              <code className="text-slate-300">
                name, contact_person, phone, email, address
              </code>
            </p>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-slate-300 text-sm mb-2 block">
                  Paste CSV here
                </label>
                <textarea
                  rows={10}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`name,contact_person,phone,email,address
Acme Ltd,Rahim Uddin,01700000000,sales@acme.com,Dhaka
Tech BD,Mina Akter,+8801812345678,,Chattogram`}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white"
                />
              </div>
              <div className="w-full md:w-56">
                <label className="text-slate-300 text-sm mb-2 block">
                  Or upload .csv
                </label>
                <label className="cursor-pointer block">
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={handleBulkFile}
                  />
                  <div className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white hover:bg-slate-700 transition flex items-center justify-center gap-2">
                    <Upload className="w-5 h-5" />
                    Choose CSV
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={runBulkImport}
                disabled={bulkLoading || !bulkText.trim()}
                className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              >
                {bulkLoading ? "Importing…" : "Start Import"}
              </button>
              <button
                onClick={() => {
                  setBulkText("");
                  setBulkResults([]);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white"
              >
                Clear
              </button>
            </div>

            {/* Results */}
            {bulkResults.length > 0 && (
              <div className="mt-6">
                <h4 className="text-white font-semibold mb-2">Results</h4>
                <div className="max-h-64 overflow-auto border border-slate-700 rounded-lg">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left">Row</th>
                        <th className="text-left">Status</th>
                        <th className="text-left">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResults.map((r, i) => (
                        <tr key={i}>
                          <td className="text-slate-300">
                            {r.index + 2 /* + header row */}
                          </td>
                          <td
                            className={
                              r.status === "fulfilled"
                                ? "text-green-400"
                                : "text-red-400"
                            }
                          >
                            {r.status}
                          </td>
                          <td className="text-slate-300">{r.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ------------------------------------------------------------ */}
    </SectorLayout>
  );
};

export default SuppliersPage;
