import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Save,
  X,
  Building2,
  DollarSign,
  Package,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import BackButton from "../components/BackButton";
import SectorLayout from "../components/SectorLayout";
import { toast } from "sonner";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

function ProductBranchAssignmentPage({ user, onLogout }) {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [branchAssignments, setBranchAssignments] = useState([]);
  const [applySameToAll, setApplySameToAll] = useState(false);

  // Track edits to avoid unnecessary saves
  const [isDirty, setIsDirty] = useState(false);

  // Prevent state updates on unmounted component during async
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      try {
        await Promise.all([
          fetchBranches(),
          fetchProducts(),
          fetchAssignments(),
        ]);
      } catch (e) {
        // handled per-call
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const authHeader = () => {
    const token = localStorage.getItem("token");
    return { Authorization: `Bearer ${token}` };
  };

  const fetchBranches = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/branches`, {
        headers: authHeader(),
      });
      if (mountedRef.current) setBranches(res.data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
      toast.error(error?.response?.data?.detail || "Could not load branches");
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/products`, {
        headers: authHeader(),
      });
      if (mountedRef.current) setProducts(res.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error(error?.response?.data?.detail || "Could not load products");
    }
  };

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/product-branches`, {
        headers: authHeader(),
      });
      if (mountedRef.current) setAssignments(res.data || []);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      toast.error(
        error?.response?.data?.detail || "Could not load assignments",
      );
    }
  };

  const totalStockForProduct = useMemo(() => {
    const map = new Map();
    const userRole = user?.role;
    const userBranchId = user?.branch_id;
    
    // Filter assignments based on user role
    const filteredAssignments = (userRole === 'tenant_admin' || userRole === 'super_admin' || userRole === 'head_office')
      ? assignments // Admins see all
      : assignments.filter(a => a.branch_id === userBranchId); // Branch users see only their branch
    
    for (const a of filteredAssignments) {
      const key = a.product_id;
      map.set(key, (map.get(key) || 0) + (Number(a?.stock_quantity) || 0));
    }
    return (productId) => map.get(productId) || 0;
  }, [assignments, user]);

  const handleProductSelect = (product) => {
    setSelectedProduct(product);

    const productAssignments = assignments.filter(
      (a) => a.product_id === product.id,
    );

    // Filter branches based on user role
    const userRole = user?.role;
    const userBranchId = user?.branch_id;
    const filteredBranches = (userRole === 'tenant_admin' || userRole === 'super_admin' || userRole === 'head_office')
      ? branches // Admins see all branches
      : branches.filter(b => b.id === userBranchId); // Branch users see only their branch

    const initialAssignments = filteredBranches.map((branch) => {
      const existing = productAssignments.find(
        (a) => a.branch_id === branch.id,
      );
      return {
        branch_id: branch.id,
        branch_name: branch.name,
        assigned: !!existing,
        assignment_id: existing?.id || null,

        stock_quantity: existing?.stock_quantity ?? "",
        purchase_price:
          existing?.purchase_price ?? product?.purchase_price ?? "",
        sale_price: existing?.sale_price ?? product?.price ?? "",
        reorder_level: existing?.reorder_level ?? "",
      };
    });

    setBranchAssignments(initialAssignments);
    setShowForm(true);
    setApplySameToAll(false);
    setIsDirty(false);
  };

  const handleBranchToggle = (branchId) => {
    setBranchAssignments((prev) => {
      setIsDirty(true);
      return prev.map((ba) =>
        ba.branch_id === branchId ? { ...ba, assigned: !ba.assigned } : ba,
      );
    });
  };

  // Keep empty string in inputs (not 0). Convert to number only on submit.
  const handleBranchDataChange = (branchId, field, value) => {
    // Guard against negative or scientific notation in number inputs in some browsers
    const sanitized =
      value === "" ? "" : value.toString().replace(/[eE\+\-]/g, "");

    setBranchAssignments((prev) => {
      setIsDirty(true);
      const updated = prev.map((ba) =>
        ba.branch_id === branchId ? { ...ba, [field]: sanitized } : ba,
      );

      if (applySameToAll) {
        const master = updated.find((ba) => ba.branch_id === branchId);
        if (master) {
          return updated.map((ba) => ({
            ...ba,
            stock_quantity: master.stock_quantity,
            purchase_price: master.purchase_price,
            sale_price: master.sale_price,
            reorder_level: master.reorder_level,
          }));
        }
      }
      return updated;
    });
  };

  const toNumberOrZero = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  };

  const handleSubmit = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      const headers = { headers: authHeader() };

      // Batch operations sequentially; could be parallelized by Promise.allSettled if backend supports
      for (const ba of branchAssignments) {
        // Skip untouched inactives
        if (!ba.assigned && !ba.assignment_id) continue;

        if (ba.assigned && !ba.assignment_id) {
          await axios.post(
            `${API_URL}/api/product-branches`,
            {
              product_id: selectedProduct.id,
              branch_id: ba.branch_id,
              stock_quantity: toNumberOrZero(ba.stock_quantity),
              purchase_price: toNumberOrZero(ba.purchase_price),
              sale_price: toNumberOrZero(ba.sale_price),
              reorder_level: toNumberOrZero(ba.reorder_level),
            },
            headers,
          );
        } else if (ba.assigned && ba.assignment_id) {
          await axios.put(
            `${API_URL}/api/product-branches/${ba.assignment_id}`,
            {
              stock_quantity: toNumberOrZero(ba.stock_quantity),
              purchase_price: toNumberOrZero(ba.purchase_price),
              sale_price: toNumberOrZero(ba.sale_price),
              reorder_level: toNumberOrZero(ba.reorder_level),
            },
            headers,
          );
        } else if (!ba.assigned && ba.assignment_id) {
          await axios.delete(
            `${API_URL}/api/product-branches/${ba.assignment_id}`,
            headers,
          );
        }
      }

      toast.success("Product assignments updated successfully!");
      setShowForm(false);
      setApplySameToAll(false);
      setIsDirty(false);
      await fetchAssignments();
    } catch (error) {
      console.error("Error saving assignments:", error);
      toast.error(error?.response?.data?.detail || "Error saving assignments");
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const assignedCount = useMemo(
    () => branchAssignments.filter((b) => b.assigned).length,
    [branchAssignments],
  );

  const allAssigned = useMemo(
    () =>
      branchAssignments.length > 0 &&
      assignedCount === branchAssignments.length,
    [assignedCount, branchAssignments.length],
  );

  const toggleAllAssigned = (value) => {
    setBranchAssignments((prev) => {
      setIsDirty(true);
      return prev.map((ba) => ({ ...ba, assigned: value }));
    });
  };

  const numberInputProps = {
    min: "0",
    inputMode: "decimal",
    onWheel: (e) => e.currentTarget.blur(), // prevent accidental scroll changes
    onKeyDown: (e) => {
      // prevent typing scientific notation or +/- on numeric inputs
      if (["e", "E", "+", "-"].includes(e.key)) e.preventDefault();
    },
  };

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <BackButton className="mb-4" />

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
              <Package className="w-10 h-10 text-blue-400" />
              Product-Branch Assignment
            </h1>
            <p className="text-slate-400">
              Assign products to branches and manage stock levels
            </p>
          </div>

          {showForm && (
            <button
              onClick={() => {
                setShowForm(false);
                setApplySameToAll(false);
                setIsDirty(false);
              }}
              className="bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2"
            >
              <X className="w-5 h-5" />
              Back to Products
            </button>
          )}
        </div>

        {!showForm ? (
          <div className="glass-card p-6">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-300">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-3 px-4 text-slate-300">
                        Product Name
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300">
                        SKU
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300">
                        Branches Assigned
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300">
                        Total Stock
                      </th>
                      <th className="text-left py-3 px-4 text-slate-300">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => {
                      const productAssignments = assignments.filter(
                        (a) => a.product_id === product.id,
                      );
                      const total = totalStockForProduct(product.id);
                      return (
                        <tr
                          key={product.id}
                          className="border-b border-slate-800"
                        >
                          <td className="py-3 px-4 font-semibold text-white">
                            {product.name}
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-mono text-sm">
                            {product.sku || "N/A"}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm font-semibold border border-blue-500/30">
                              {productAssignments.length} / {branches.length}{" "}
                              branches
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-green-400">
                            {total} units
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => handleProductSelect(product)}
                              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                            >
                              Manage Branches
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card p-8">
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-3 flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-blue-400" />
                    {selectedProduct?.name}
                  </h2>
                  <p className="text-slate-300 text-lg">
                    Select branches and set stock/pricing for each branch
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">
                    Active in{" "}
                    <span className="text-white font-semibold">
                      {assignedCount}
                    </span>{" "}
                    of{" "}
                    <span className="text-white font-semibold">
                      {branchAssignments.length}
                    </span>{" "}
                    branches
                  </span>
                </div>
              </div>

              {/* Apply Same Details + Assign All */}
              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applySameToAll}
                      onChange={(e) => setApplySameToAll(e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-purple-500 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 cursor-pointer"
                    />
                    <span className="text-white font-semibold text-lg">
                      📋 Apply same details to all branches
                    </span>
                  </label>
                  <p className="text-slate-400 text-sm mt-2 ml-8">
                    Enter values in any row to mirror them across all rows when
                    enabled.
                  </p>
                </div>

                <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold text-lg">
                      Bulk Activation
                    </span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleAllAssigned(true)}
                        className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                      >
                        Assign All
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAllAssigned(false)}
                        className="px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-sm"
                      >
                        Unassign All
                      </button>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">
                    Quickly enable/disable this product for every branch.
                  </p>
                </div>
              </div>
            </div>

            {/* Table Layout */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">
                      Active
                    </th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">
                      Branch
                    </th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">
                      Stock
                    </th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">
                      Purchase
                    </th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">
                      Sale
                    </th>
                    <th className="text-left py-4 px-4 text-slate-300 font-semibold">
                      Reorder
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {branchAssignments.map((ba) => {
                    const disabled = !ba.assigned;
                    const rowActiveClass = ba.assigned ? "bg-slate-800/40" : "";
                    return (
                      <tr
                        key={ba.branch_id}
                        className={`border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors ${rowActiveClass}`}
                      >
                        {/* Active Checkbox */}
                        <td className="py-4 px-4">
                          <input
                            type="checkbox"
                            checked={!!ba.assigned}
                            onChange={() => handleBranchToggle(ba.branch_id)}
                            className="w-5 h-5 rounded border-2 border-blue-500 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Branch Name */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-400" />
                            <span className="font-semibold text-white text-lg">
                              {ba.branch_name}
                            </span>
                          </div>
                        </td>

                        {/* Stock */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-green-400" />
                            <input
                              type="number"
                              value={ba.assignment_id ? (ba.stock_quantity ?? "") : (ba.stock_quantity || "")}
                              onChange={(e) =>
                                handleBranchDataChange(
                                  ba.branch_id,
                                  "stock_quantity",
                                  e.target.value,
                                )
                              }
                              disabled={disabled}
                              placeholder={!ba.assignment_id ? "0" : ""}
                              className={`w-32 px-3 py-2 rounded-lg bg-slate-700 border ${
                                !disabled
                                  ? "border-slate-600 text-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                                  : "border-slate-800 text-slate-600 cursor-not-allowed"
                              } focus:outline-none transition-all`}
                              {...numberInputProps}
                            />
                          </div>
                        </td>

                        {/* Purchase Price */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-yellow-400" />
                            <input
                              type="number"
                              value={ba.assignment_id ? (ba.purchase_price ?? "") : (ba.purchase_price || "")}
                              onChange={(e) =>
                                handleBranchDataChange(
                                  ba.branch_id,
                                  "purchase_price",
                                  e.target.value,
                                )
                              }
                              disabled={disabled}
                              placeholder={!ba.assignment_id ? "0" : ""}
                              className={`w-32 px-3 py-2 rounded-lg bg-slate-700 border ${
                                !disabled
                                  ? "border-slate-600 text-white focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/20"
                                  : "border-slate-800 text-slate-600 cursor-not-allowed"
                              } focus:outline-none transition-all`}
                              step="0.01"
                              {...numberInputProps}
                            />
                          </div>
                        </td>

                        {/* Sale Price */}
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-blue-400" />
                            <input
                              type="number"
                              value={ba.assignment_id ? (ba.sale_price ?? "") : (ba.sale_price || "")}
                              onChange={(e) =>
                                handleBranchDataChange(
                                  ba.branch_id,
                                  "sale_price",
                                  e.target.value,
                                )
                              }
                              disabled={disabled}
                              placeholder={!ba.assignment_id ? "0" : ""}
                              className={`w-32 px-3 py-2 rounded-lg bg-slate-700 border ${
                                !disabled
                                  ? "border-slate-600 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                  : "border-slate-800 text-slate-600 cursor-not-allowed"
                              } focus:outline-none transition-all`}
                              step="0.01"
                              {...numberInputProps}
                            />
                          </div>
                        </td>

                        {/* Reorder Level */}
                        <td className="py-4 px-4">
                          <input
                            type="number"
                            value={
                              ba.reorder_level === 0
                                ? 0
                                : (ba.reorder_level ?? "")
                            }
                            onChange={(e) =>
                              handleBranchDataChange(
                                ba.branch_id,
                                "reorder_level",
                                e.target.value,
                              )
                            }
                            disabled={disabled}
                            className={`w-32 px-3 py-2 rounded-lg bg-slate-700 border ${
                              !disabled
                                ? "border-slate-600 text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
                                : "border-slate-800 text-slate-600 cursor-not-allowed"
                            } focus:outline-none transition-all`}
                            {...numberInputProps}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4">
              <button
                onClick={handleSubmit}
                disabled={saving || !isDirty}
                className={`flex-1 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2 ${
                  saving || !isDirty
                    ? "bg-green-700/60 cursor-not-allowed"
                    : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                }`}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {saving ? "Saving..." : "Save Assignments"}
              </button>

              <button
                onClick={() => {
                  setShowForm(false);
                  setApplySameToAll(false);
                  setIsDirty(false);
                }}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 disabled:opacity-60 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <X className="w-5 h-5" />
                Cancel
              </button>
            </div>

            {/* Unsaved changes hint */}
            {isDirty && !saving && (
              <p className="mt-3 text-sm text-amber-300">
                You have unsaved changes. Click{" "}
                <span className="font-semibold">Save Assignments</span>.
              </p>
            )}
          </div>
        )}
      </motion.div>
    </SectorLayout>
  );
}

export default ProductBranchAssignmentPage;
