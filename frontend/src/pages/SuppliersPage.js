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
} from "lucide-react";
import { toast } from "sonner";
import BackButton from "../components/BackButton";
import SectorLayout from "../components/SectorLayout";

// --- BD phone helpers ---
const onlyDigits = (s = "") => (s || "").replace(/\D/g, "");

const toLocalFromAny = (phone = "") => {
  // return local significant number WITHOUT 0/country code, e.g., "17XXXXXXXX"
  let d = onlyDigits(phone);
  if (d.startsWith("880")) d = d.slice(3); // strip country code
  if (d.startsWith("0")) d = d.slice(1); // strip trunk 0
  return d;
};

// Acceptable BD mobile ranges: 013–019 (1[3-9]) and 10 digits incl leading 0 -> 11 with 0
const isValidBDLocal = (local) => /^1[3-9]\d{8}$/.test(local); // "1XXXXXXXXX"
const isValidBDAny = (input) => {
  const d = onlyDigits(input);
  if (d.startsWith("880")) return /^8801[3-9]\d{8}$/.test(d);
  if (d.startsWith("01")) return /^01[3-9]\d{8}$/.test(d);
  return /^1[3-9]\d{8}$/.test(d);
};

// Build E.164 +8801XXXXXXXXX from local "1XXXXXXXXX" or any form
const toE164BD = (input) => {
  let local = toLocalFromAny(input);
  if (!isValidBDLocal(local)) return null;
  return `+880${local}`;
};

const SuppliersPage = ({ user, onLogout }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  // keep formData for other fields, but handle phone with its own local/validation states
  const [formData, setFormData] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
  });

  const [bdPhoneLocal, setBdPhoneLocal] = useState(""); // "1XXXXXXXXX"
  const [phoneError, setPhoneError] = useState("");

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/suppliers`,
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

    // Validate & normalize phone
    const localDigits = onlyDigits(bdPhoneLocal);
    if (!isValidBDLocal(localDigits)) {
      setPhoneError("Enter a valid Bangladeshi mobile (e.g., 17XXXXXXXXX)");
      toast.error("Invalid Bangladeshi phone number");
      return;
    }
    const e164 = toE164BD(localDigits); // -> +8801XXXXXXXXX
    if (!e164) {
      setPhoneError("Enter a valid Bangladeshi mobile (e.g., 17XXXXXXXXX)");
      toast.error("Invalid Bangladeshi phone number");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const url = editingSupplier
        ? `${process.env.REACT_APP_BACKEND_URL}/api/suppliers/${editingSupplier.supplier_id}`
        : `${process.env.REACT_APP_BACKEND_URL}/api/suppliers`;

      const method = editingSupplier ? "PUT" : "POST";

      const payload = {
        ...formData,
        phone: e164, // always send normalized E.164
      };

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
    // derive local from existing stored value
    setBdPhoneLocal(toLocalFromAny(supplier.phone || ""));
    setPhoneError("");
    setShowForm(true);
  };

  const handleDelete = async (supplierId) => {
    if (!window.confirm("Are you sure you want to delete this supplier?"))
      return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/suppliers/${supplierId}`,
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
  };

  const onPhoneLocalChange = (v) => {
    // keep only digits; user types e.g., 17XXXXXXXXX or 1XXXXXXXXX
    const digits = onlyDigits(v);
    // cap at 10 (1 + 9) to prevent overflow typing
    const trimmed = digits.slice(0, 10);
    setBdPhoneLocal(trimmed);
    // live-validate
    if (trimmed === "") {
      setPhoneError("");
    } else if (!isValidBDLocal(trimmed)) {
      setPhoneError("Format: 1XXXXXXXXX (e.g., 1700000000)");
    } else {
      setPhoneError("");
    }
  };

  const filteredSuppliers = suppliers.filter((supplier) => {
    const q = searchTerm.toLowerCase();
    return (
      supplier.name?.toLowerCase().includes(q) ||
      supplier.contact_person?.toLowerCase().includes(q) ||
      supplier.phone?.includes(searchTerm)
    );
  });

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
                resetForm();
              } else {
                // opening a blank form
                resetForm();
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
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-purple-400" />
              {editingSupplier ? "Edit Supplier" : "New Supplier"}
            </h2>
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

              {/* --- Bangladeshi Phone Input with Flag and +880 prefix --- */}
              <div className="md:col-span-1">
                <label className="block text-gray-300 mb-2 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-400" />
                  Phone (Bangladesh) <span className="text-red-400">*</span>
                </label>
                <div className="flex items-stretch gap-0 rounded-lg overflow-hidden border border-gray-600 bg-gray-700/50 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent transition-all">
                  {/* Flag */}
                  <span className="px-3 py-3 bg-gray-700/60 flex items-center justify-center select-none">
                    <span role="img" aria-label="Bangladesh">
                      🇧🇩
                    </span>
                  </span>
                  {/* +880 prefix */}
                  <span className="px-3 py-3 bg-gray-700/60 text-gray-300 select-none">
                    +880
                  </span>
                  {/* Local part input */}
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

        <div className="bg-gradient-to-br from-gray-800/50 to-purple-900/30 backdrop-blur-lg border border-gray-700/50 rounded-xl p-6 shadow-2xl">
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search suppliers by name, contact, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-2">No suppliers found</p>
              <p className="text-gray-500">
                Add your first supplier to get started!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.supplier_id}
                  className="bg-gradient-to-br from-gray-700/50 to-purple-800/30 border border-gray-600/50 rounded-lg p-6 hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-1 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-purple-400" />
                        {supplier.name}
                      </h3>
                      <div className="space-y-2 mt-3">
                        <p className="text-gray-300 flex items-center gap-2">
                          <User className="w-4 h-4 text-purple-400" />
                          <span className="text-sm">
                            {supplier.contact_person}
                          </span>
                        </p>
                        <p className="text-gray-300 flex items-center gap-2">
                          <Phone className="w-4 h-4 text-purple-400" />
                          <span className="text-sm">{supplier.phone}</span>
                        </p>
                        {supplier.email && (
                          <p className="text-gray-300 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-purple-400" />
                            <span className="text-sm">{supplier.email}</span>
                          </p>
                        )}
                        {supplier.address && (
                          <p className="text-gray-300 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-purple-400" />
                            <span className="text-sm">{supplier.address}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-600/50">
                    <button
                      onClick={() => handleEdit(supplier)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(supplier.supplier_id)}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectorLayout>
  );
};

export default SuppliersPage;
