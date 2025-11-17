import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Search } from "lucide-react";
import Swal from "sweetalert2";
import SectorLayout from "../components/SectorLayout";
import BackButton from "../components/BackButton";
import { API } from "../App";
import { toast } from "sonner";
import { formatErrorMessage } from "../utils/errorHandler";

// Helper function to format API error messages
const formatErrorMessageLocal = (error) => {
  if (!error.response?.data) return "Operation failed";

  const data = error.response.data;

  // Handle FastAPI validation errors (array of objects)
  if (Array.isArray(data.detail)) {
    return data.detail.map((err) => err.msg || JSON.stringify(err)).join(", ");
  }

  // Handle simple string detail
  if (typeof data.detail === "string") {
    return data.detail;
  }

  // Handle object detail
  if (typeof data.detail === "object" && data.detail.msg) {
    return data.detail.msg;
  }

  return "Operation failed";
};

const ProductsPage = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState("products");

  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "",
    category_id: "",
    price: "",
    stock: "",
    description: "",
    supplier_name: "",
    generic_name: "",
    brand: "",
    brand_id: "",
    batch_number: "",
    expiry_date: "",
    imei: "",
    warranty_months: "",
    branch_id: "",
  });

  const [categories, setCategories] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [categoryFormData, setCategoryFormData] = useState({
    name: "",
    description: "",
  });

  const [brands, setBrands] = useState([]);
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [brandFormData, setBrandFormData] = useState({
    name: "",
    description: "",
  });

  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    fetchProducts();
    fetchBranches();
    fetchCategories();
    fetchBrands();
    fetchSuppliers();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API}/products`);
      setProducts(response.data);
    } catch (error) {
      toast.error("Failed to fetch products");
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await axios.get(`${API}/branches`);
      // Filter only active branches
      const activeBranches = response.data.filter((branch) => branch.is_active);
      setBranches(activeBranches);
    } catch (error) {
      toast.error("Failed to fetch branches");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Find selected category and brand names for backwards compatibility
      const selectedCategory = categories.find(
        (c) => c.id === formData.category_id,
      );
      const selectedBrand = brands.find((b) => b.id === formData.brand_id);

      // Build submitData with properly converted numeric fields
      const submitData = {
        name: formData.name,
        sku: formData.sku,
        category: selectedCategory ? selectedCategory.name : formData.category,
        description: formData.description,
        supplier_name: formData.supplier_name,
        generic_name: formData.generic_name,
        brand: selectedBrand ? selectedBrand.name : formData.brand,
        batch_number: formData.batch_number,
        expiry_date: formData.expiry_date,
        imei: formData.imei,
        branch_id: formData.branch_id,
        // Convert numeric fields from strings to numbers
        price:
          formData.price !== "" && formData.price !== null
            ? parseFloat(formData.price)
            : 0,
        stock:
          formData.stock !== "" && formData.stock !== null
            ? parseInt(formData.stock, 10)
            : 0,
      };

      // Add category_id and brand_id if they have values (keep as strings - they are UUIDs)
      if (formData.category_id !== "" && formData.category_id !== null) {
        submitData.category_id = formData.category_id;
      }
      if (formData.brand_id !== "" && formData.brand_id !== null) {
        submitData.brand_id = formData.brand_id;
      }

      // Only add warranty_months if it has a value (including 0)
      if (
        formData.warranty_months !== "" &&
        formData.warranty_months !== null &&
        formData.warranty_months !== undefined
      ) {
        submitData.warranty_months = parseInt(formData.warranty_months, 10);
      }

      if (editingProduct) {
        await axios.put(`${API}/products/${editingProduct.id}`, submitData);
        toast.success("Product updated successfully");
      } else {
        await axios.post(`${API}/products`, submitData);
        toast.success("Product created successfully");
      }
      setShowModal(false);
      resetForm();
      fetchProducts();
    } catch (error) {
      toast.error(formatErrorMessageLocal(error));
    }
  };

  const handleDelete = async (id) => {
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
        await axios.delete(`${API}/products/${id}`);
        toast.success("Product deleted successfully");
        fetchProducts();
      } catch (error) {
        toast.error("Failed to delete product");
      }
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || "",
      sku: product.sku || "",
      category: product.category || "",
      category_id: product.category_id || "",
      price:
        product.price !== null && product.price !== undefined
          ? product.price
          : "",
      stock:
        product.stock !== null && product.stock !== undefined
          ? product.stock
          : "",
      description: product.description || "",
      supplier_name: product.supplier_name || "",
      generic_name: product.generic_name || "",
      brand: product.brand || "",
      brand_id: product.brand_id || "",
      batch_number: product.batch_number || "",
      expiry_date: product.expiry_date || "",
      imei: product.imei || "",
      warranty_months:
        product.warranty_months !== null &&
        product.warranty_months !== undefined
          ? product.warranty_months
          : "",
      branch_id: product.branch_id || "",
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      sku: "",
      category: "",
      category_id: "",
      price: "",
      stock: "",
      description: "",
      supplier_name: "",
      generic_name: "",
      brand: "",
      brand_id: "",
      batch_number: "",
      expiry_date: "",
      imei: "",
      warranty_months: "",
      branch_id: "",
    });
    setEditingProduct(null);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBranch = !branchFilter || p.branch_id === branchFilter;
    return matchesSearch && matchesBranch;
  });

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`);
      setCategories(response.data);
    } catch (error) {
      toast.error("Failed to fetch categories");
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.patch(
          `${API}/categories/${editingCategory.id}`,
          categoryFormData,
        );
        toast.success("Category updated successfully");
      } else {
        await axios.post(`${API}/categories`, categoryFormData);
        toast.success("Category created successfully");
      }
      setShowCategoryModal(false);
      resetCategoryForm();
      fetchCategories();
    } catch (error) {
      toast.error(formatErrorMessageLocal(error));
    }
  };

  const handleCategoryDelete = async (id) => {
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
        await axios.delete(`${API}/categories/${id}`);
        toast.success("Category deleted successfully");
        fetchCategories();
      } catch (error) {
        toast.error("Failed to delete category");
      }
    }
  };

  const handleCategoryEdit = (category) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description || "",
    });
    setShowCategoryModal(true);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ name: "", description: "" });
    setEditingCategory(null);
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(categorySearchTerm.toLowerCase()),
  );

  const fetchBrands = async () => {
    try {
      const response = await axios.get(`${API}/brands`);
      setBrands(response.data);
    } catch (error) {
      toast.error("Failed to fetch brands");
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API}/suppliers`);
      setSuppliers(response.data);
    } catch (error) {
      toast.error("Failed to fetch suppliers");
    }
  };

  const handleBrandSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBrand) {
        await axios.patch(`${API}/brands/${editingBrand.id}`, brandFormData);
        toast.success("Brand updated successfully");
      } else {
        await axios.post(`${API}/brands`, brandFormData);
        toast.success("Brand created successfully");
      }
      setShowBrandModal(false);
      resetBrandForm();
      fetchBrands();
    } catch (error) {
      toast.error(formatErrorMessageLocal(error));
    }
  };

  const handleBrandDelete = async (id) => {
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
        await axios.delete(`${API}/brands/${id}`);
        toast.success("Brand deleted successfully");
        fetchBrands();
      } catch (error) {
        toast.error("Failed to delete brand");
      }
    }
  };

  const handleBrandEdit = (brand) => {
    setEditingBrand(brand);
    setBrandFormData({
      name: brand.name,
      description: brand.description || "",
    });
    setShowBrandModal(true);
  };

  const resetBrandForm = () => {
    setBrandFormData({ name: "", description: "" });
    setEditingBrand(null);
  };

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(brandSearchTerm.toLowerCase()),
  );

  return (
    <SectorLayout user={user} onLogout={onLogout}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <BackButton className="mb-4" />
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Products Management
            </h1>
            <p className="text-slate-400">
              Manage your inventory, categories, and brands
            </p>
          </div>
          <button
            onClick={() => {
              if (activeTab === "products") {
                resetForm();
                setShowModal(true);
              } else if (activeTab === "categories") {
                resetCategoryForm();
                setShowCategoryModal(true);
              } else if (activeTab === "brands") {
                resetBrandForm();
                setShowBrandModal(true);
              }
            }}
            className="btn-primary flex items-center gap-2"
            data-testid="add-product-button"
          >
            <Plus className="w-5 h-5" />
            {activeTab === "products" && "Add Product"}
            {activeTab === "categories" && "Add Category"}
            {activeTab === "brands" && "Add Brand"}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="glass-card p-2 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("products")}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "products"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "categories"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setActiveTab("brands")}
              className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-all ${
                activeTab === "brands"
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              Brands
            </button>
          </div>
        </div>

        {/* Products Tab */}
        {activeTab === "products" && (
          <>
            {/* Search and Filter */}
            <div className="glass-card p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    data-testid="product-search-input"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search products..."
                    className="w-full pl-11 pr-4 py-3 rounded-xl"
                  />
                </div>
                <div>
                  <select
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">All Branches</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Products Table */}
            <div className="glass-card p-6">
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>SKU</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Warranty</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        data-testid={`product-row-${product.id}`}
                      >
                        <td className="font-semibold text-white">
                          {product.name}
                        </td>
                        <td className="text-slate-300">{product.sku || "-"}</td>
                        <td>
                          <span className="badge badge-info">
                            {product.category}
                          </span>
                        </td>
                        <td className="text-green-400 font-semibold">
                          ৳{product.price}
                        </td>
                        <td>
                          <span
                            className={`badge ${product.stock < 10 ? "badge-warning" : "badge-success"}`}
                          >
                            {product.stock}
                          </span>
                        </td>
                        <td>
                          {product.warranty_months > 0 ? (
                            <span className="badge badge-info">
                              {product.warranty_months} months
                            </span>
                          ) : (
                            <span className="text-slate-500 text-sm">No warranty</span>
                          )}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                              data-testid="edit-product-button"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                              data-testid="delete-product-button"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Categories Tab */}
        {activeTab === "categories" && (
          <>
            {/* Search */}
            <div className="glass-card p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={categorySearchTerm}
                  onChange={(e) => setCategorySearchTerm(e.target.value)}
                  placeholder="Search categories..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl"
                />
              </div>
            </div>

            {/* Categories Table */}
            <div className="glass-card p-6">
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCategories.map((category) => (
                      <tr key={category.id}>
                        <td className="font-semibold text-white">
                          {category.name}
                        </td>
                        <td className="text-slate-300">
                          {category.description || "-"}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCategoryEdit(category)}
                              className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleCategoryDelete(category.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Brands Tab */}
        {activeTab === "brands" && (
          <>
            {/* Search */}
            <div className="glass-card p-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={brandSearchTerm}
                  onChange={(e) => setBrandSearchTerm(e.target.value)}
                  placeholder="Search brands..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl"
                />
              </div>
            </div>

            {/* Brands Table */}
            <div className="glass-card p-6">
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBrands.map((brand) => (
                      <tr key={brand.id}>
                        <td className="font-semibold text-white">
                          {brand.name}
                        </td>
                        <td className="text-slate-300">
                          {brand.description || "-"}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleBrandEdit(brand)}
                              className="p-2 hover:bg-blue-500/20 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleBrandDelete(brand.id)}
                              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </h2>

              {/* Branch Selection - Below Title */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Branch <span className="text-red-400">*</span>
                </label>
                <select
                  value={formData.branch_id}
                  onChange={(e) =>
                    setFormData({ ...formData, branch_id: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  required
                >
                  <option value="">Select a branch...</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}{" "}
                      {branch.branch_code ? `(${branch.branch_code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Product Name
                    </label>
                    <input
                      data-testid="product-name-input"
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      SKU
                    </label>
                    <input
                      data-testid="product-sku-input"
                      type="text"
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData({ ...formData, sku: e.target.value })
                      }
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Category
                    </label>
                    <select
                      data-testid="product-category-input"
                      value={formData.category_id}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          category_id: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      required
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Price
                    </label>
                    <input
                      data-testid="product-price-input"
                      type="number"
                      min={0}
                      step="0.01"
                      value={
                        formData.price === "" || formData.price === null
                          ? ""
                          : formData.price
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || v === null) {
                          setFormData({ ...formData, price: "" });
                        } else {
                          const n = Math.max(0, Number(v));
                          setFormData({
                            ...formData,
                            price: Number.isNaN(n) ? "" : n,
                          });
                        }
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp" || e.key === "ArrowDown")
                          e.preventDefault();
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Stock
                    </label>
                    <input
                      data-testid="product-stock-input"
                      type="number"
                      min={0}
                      step={1}
                      value={
                        formData.stock === "" || formData.stock === null
                          ? ""
                          : formData.stock
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        // allow empty during typing, otherwise keep integers >= 0
                        if (v === "" || v === null) {
                          setFormData({ ...formData, stock: "" });
                        } else {
                          const n = Math.max(0, Math.floor(Number(v)));
                          setFormData({
                            ...formData,
                            stock: Number.isNaN(n) ? "" : n,
                          });
                        }
                      }}
                      onWheel={(e) => e.currentTarget.blur()} // stop scroll wheel changing value
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp" || e.key === "ArrowDown")
                          e.preventDefault(); // stop arrow increments
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Brand
                    </label>
                    <select
                      value={formData.brand_id}
                      onChange={(e) =>
                        setFormData({ ...formData, brand_id: e.target.value })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select Brand</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Supplier Name
                    </label>
                    <select
                      value={formData.supplier_name}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          supplier_name: e.target.value,
                        })
                      }
                      className="w-full px-4 py-3 rounded-xl bg-slate-800 text-white border border-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">Select Supplier</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.name}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Warranty (Months)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={
                        formData.warranty_months === "" || formData.warranty_months === null
                          ? ""
                          : formData.warranty_months
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "" || v === null) {
                          setFormData({ ...formData, warranty_months: "" });
                        } else {
                          const n = Math.max(0, Math.floor(Number(v)));
                          setFormData({
                            ...formData,
                            warranty_months: Number.isNaN(n) ? "" : n,
                          });
                        }
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      onKeyDown={(e) => {
                        if (e.key === "ArrowUp" || e.key === "ArrowDown")
                          e.preventDefault();
                      }}
                      placeholder="0 = No warranty"
                      className="w-full"
                    />
                    <p className="text-xs text-slate-400 mt-1">
                      Leave 0 or empty for no warranty
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full"
                    rows="3"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="btn-primary flex-1"
                    data-testid="submit-product-button"
                  >
                    {editingProduct ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="btn-secondary flex-1"
                    data-testid="cancel-product-button"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add/Edit Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingCategory ? "Edit Category" : "Add New Category"}
              </h2>

              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={categoryFormData.name}
                    onChange={(e) =>
                      setCategoryFormData({
                        ...categoryFormData,
                        name: e.target.value,
                      })
                    }
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={categoryFormData.description}
                    onChange={(e) =>
                      setCategoryFormData({
                        ...categoryFormData,
                        description: e.target.value,
                      })
                    }
                    className="w-full"
                    rows="3"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    {editingCategory ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCategoryModal(false);
                      resetCategoryForm();
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Add/Edit Brand Modal */}
        {showBrandModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 w-full max-w-md"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingBrand ? "Edit Brand" : "Add New Brand"}
              </h2>

              <form onSubmit={handleBrandSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={brandFormData.name}
                    onChange={(e) =>
                      setBrandFormData({
                        ...brandFormData,
                        name: e.target.value,
                      })
                    }
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={brandFormData.description}
                    onChange={(e) =>
                      setBrandFormData({
                        ...brandFormData,
                        description: e.target.value,
                      })
                    }
                    className="w-full"
                    rows="3"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="btn-primary flex-1">
                    {editingBrand ? "Update" : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBrandModal(false);
                      resetBrandForm();
                    }}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </motion.div>
    </SectorLayout>
  );
};

export default ProductsPage;
