var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useState, useCallback, useEffect, useRef } from "react";
import { useAppStore } from "../store";
import {
  PageHeader,
  StatusBadge,
  Btn,
  Modal,
  Field,
  SField,
  ImageUpload,
  Skeleton
} from "../components/ui";
import { Plus, Search, Image as ImageIcon, Check, Pencil, Trash2, LayoutList, Table as TableIcon } from "lucide-react";
import { ConfirmModal } from "../components/ui";
import { cn } from "../lib/utils";
import { scrollToError, safeStr } from "../utils";
const Catalogue = /* @__PURE__ */ __name(() => {
  const {
    catalogue,
    cataloguePagination,
    fetchResource,
    addCatalogue,
    updateCatalogue,
    deleteCatalogue,
    inventory,
    role,
    uploadImage,
    loading,
    actionLoading,
    hasPermission,
    settings
  } = useAppStore();
  const { categories: CATEGORIES } = settings;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);
  const [filterCategory, setFilterCategory] = useState("");
  const [viewMode, setViewMode] = useState("card");
  const [tableFilter, setTableFilter] = useState("");
  const [page, setPage] = useState(1);
  const observerRef = useRef(null);
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterCategory]);
  useEffect(() => {
    const isInitialLoad = catalogue.length === 0;
    const filter = filterCategory ? { category: filterCategory } : null;
    fetchResource("catalogue", page, 50, !isInitialLoad || page > 1, debouncedSearch, filter, page > 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterCategory, page]);
  useEffect(() => {
    const observer = (() => {
      try {
        return new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && cataloguePagination && page < cataloguePagination.pages && !loading) {
              setPage((prev) => prev + 1);
            }
          },
          { threshold: 1 }
        );
      } catch (e) {
        console.warn("IntersectionObserver not supported", e);
        return null;
      }
    })();
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => observer.disconnect();
  }, [cataloguePagination, page, loading]);
  const [modal, setModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [deletingSku, setDeletingSku] = useState(null);
  const [newEntry, setNewEntry] = useState({
    sku: "",
    itemName: "",
    brand: "",
    description: "",
    category: "",
    uom: "",
    location: "",
    minStock: 0,
    imageUrl: "",
    status: "Draft"
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToError();
    }
  }, [errors]);
  const validateForm = /* @__PURE__ */ __name((data) => {
    const newErrors = {};
    if (!data.sku) newErrors.sku = "SKU is required";
    if (!data.itemName) newErrors.itemName = "Item name is required";
    if (!data.brand) newErrors.brand = "Brand is required";
    if (!data.category) newErrors.category = "Category is required";
    if (!data.uom) newErrors.uom = "UOM is required";
    if (!data.location) newErrors.location = "Location is required";
    if (data.minStock < 0) newErrors.minStock = "Cannot be negative";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, "validateForm");
  const handlePageChange = useCallback((page2) => {
    const filter = filterCategory ? { category: filterCategory } : null;
    fetchResource("catalogue", page2, 50, false, search, filter);
  }, [fetchResource, search, filterCategory]);
  const handleSelectItem = /* @__PURE__ */ __name((sku) => {
    const item = inventory.find((i) => i.sku === sku);
    if (item) {
      setNewEntry({
        ...newEntry,
        sku: item.sku,
        itemName: item.itemName,
        category: item.category,
        uom: item.unit
      });
    }
  }, "handleSelectItem");
  const handleCreate = /* @__PURE__ */ __name(async () => {
    if (!validateForm(newEntry)) {
      return;
    }
    const entry = {
      sku: newEntry.sku,
      itemName: newEntry.itemName,
      brand: newEntry.brand,
      description: newEntry.description,
      category: newEntry.category,
      uom: newEntry.uom,
      location: newEntry.location,
      minStock: Number(newEntry.minStock),
      imageUrl: newEntry.imageUrl || "",
      status: isEditing ? newEntry.status : "Draft"
    };
    try {
      if (isEditing) {
        await updateCatalogue(entry.sku, entry);
        if (selectedEntry && selectedEntry.sku === entry.sku) {
          setSelectedEntry(entry);
        }
      } else {
        await addCatalogue(entry);
      }
      setModal(false);
      setIsEditing(false);
      setErrors({});
      setNewEntry({
        sku: "",
        itemName: "",
        brand: "",
        description: "",
        category: "",
        uom: "",
        location: "",
        minStock: 0,
        imageUrl: "",
        status: "Draft"
      });
    } catch (error) {
      alert(`Failed to save catalogue entry: ${error.message}`);
    }
  }, "handleCreate");
  const handleApprove = /* @__PURE__ */ __name(async (sku) => {
    await updateCatalogue(sku, { status: "Approved" });
  }, "handleApprove");
  const [uploading, setUploading] = useState(false);
  const handleImageUpload = /* @__PURE__ */ __name(async (file) => {
    setUploading(true);
    try {
      const { url } = await uploadImage(file);
      setNewEntry((prev) => ({ ...prev, imageUrl: url }));
    } catch (error) {
      alert(`Failed to upload image: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }, "handleImageUpload");
  const handleConfirmDelete = /* @__PURE__ */ __name(async () => {
    if (!deletingSku) return;
    try {
      await deleteCatalogue(deletingSku);
      setDeletingSku(null);
    } catch (error) {
      console.error("Failed to delete catalogue entry:", error);
    }
  }, "handleConfirmDelete");
  return <div className="space-y-6">
      <div className="space-y-6">
        <PageHeader
    title="Product Catalogue"
    sub="Detailed product specifications and images"
    actions={hasPermission("CREATE_CATALOGUE") && <Btn label="Add Entry" icon={Plus} onClick={() => {
      setIsEditing(false);
      setNewEntry({
        sku: "",
        itemName: "",
        brand: "",
        description: "",
        category: "",
        uom: "",
        location: "",
        minStock: 0,
        imageUrl: "",
        status: "Draft"
      });
      setModal(true);
    }} />}
  />

        <div className="flex justify-end mb-2">
          <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button onClick={() => setViewMode("card")} className={cn("p-1.5 rounded-md transition-all", viewMode === "card" ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-gray-400 hover:text-gray-600")} title="Card view">
              <LayoutList className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("table")} className={cn("p-1.5 rounded-md transition-all", viewMode === "table" ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-gray-400 hover:text-gray-600")} title="Table view">
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
    type="text"
    placeholder="Search by SKU, Name, Brand, Category..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
  />
          </div>
          <select
    value={filterCategory}
    onChange={(e) => setFilterCategory(e.target.value)}
    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
  >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {viewMode === "table" ? (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input type="text" placeholder="Quick filter..." value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" />
              </div>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Brand</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">UOM</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Live Stock</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Min Stock</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  {(hasPermission("EDIT_CATALOGUE") || hasPermission("DELETE_CATALOGUE")) && (
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {loading && catalogue.length === 0 ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(8)].map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" /></td>
                      ))}
                    </tr>
                  ))
                ) : catalogue
                  .filter(cat => !tableFilter || [cat.sku, cat.itemName, cat.category, cat.brand].some(f => f?.toLowerCase().includes(tableFilter.toLowerCase())))
                  .map((cat) => {
                  const inv = inventory.find((i) => i.sku === cat.sku);
                  return (
                    <tr key={cat.sku} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer" onClick={() => setSelectedEntry(cat)}>
                      <td className="px-4 py-3 text-xs font-mono text-orange-600 dark:text-orange-400 whitespace-nowrap">{safeStr(cat.sku)}</td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white max-w-[180px] truncate">{safeStr(cat.itemName)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{safeStr(cat.category)}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{safeStr(cat.brand)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{safeStr(cat.uom)}</td>
                      <td className={`px-4 py-3 text-xs font-bold text-right whitespace-nowrap ${inv && inv.liveStock <= cat.minStock ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {inv ? inv.liveStock : 0}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 text-right whitespace-nowrap">{cat.minStock ?? 0}</td>
                      <td className="px-4 py-3"><StatusBadge status={cat.status} /></td>
                      {(hasPermission("EDIT_CATALOGUE") || hasPermission("DELETE_CATALOGUE")) && (
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {hasPermission("EDIT_CATALOGUE") && (
                              <button onClick={() => { setNewEntry(cat); setIsEditing(true); setModal(true); }} className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 hover:bg-amber-100 dark:hover:bg-amber-900/20 text-orange-500 dark:text-amber-400 transition-colors" title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {hasPermission("DELETE_CATALOGUE") && (
                              <button onClick={() => setDeletingSku(cat.sku)} className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 text-red-500 dark:text-rose-400 transition-colors" title="Delete">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            {catalogue.length === 0 && !loading && (
              <div className="text-center py-16 text-gray-400">
                <p className="font-bold tracking-widest text-sm">No items found</p>
              </div>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
          {loading && catalogue.length === 0 ? [...Array(10)].map((_, i) => <div key={i} className="bg-white dark:bg-gray-900 border border-[#E8ECF0] dark:border-gray-800 rounded-2xl overflow-hidden p-5 space-y-4">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>) : catalogue.map((cat, idx) => {
    const inv = inventory.find((i) => i.sku === cat.sku);
    return <div
      key={`${cat.sku}-${idx}`}
      className="group cursor-pointer flex flex-col bg-white dark:bg-gray-900 border border-[#E8ECF0] dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:hover:shadow-none transition-all duration-500"
      onClick={() => setSelectedEntry(cat)}
    >
                {
      /* Image Container */
    }
                <div
      className="aspect-[4/3] bg-[#F9FAFB] dark:bg-gray-800/50 relative overflow-hidden flex items-center justify-center"
      onClick={(e) => {
        if (cat.imageUrl) {
          e.stopPropagation();
          setPreviewImage(cat.imageUrl);
        }
      }}
    >
                  {cat.imageUrl ? <img
      src={cat.imageUrl}
      alt={cat.itemName}
      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
      referrerPolicy="no-referrer"
    /> : <div className="flex flex-col items-center gap-2 opacity-20 dark:opacity-40">
                      <ImageIcon className="w-8 h-8 text-[#1A1A2E] dark:text-white" />
                    </div>}
                  
                  {
      /* Status Overlay */
    }
                  <div className="absolute top-3 right-3">
                    <StatusBadge status={cat.status} />
                  </div>

                  {
      /* Quick View Icon */
    }
                  <div className="absolute inset-0 bg-[#1A1A2E]/0 group-hover:bg-[#1A1A2E]/5 transition-all duration-500 flex items-center justify-center">
                    <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-500 shadow-sm">
                      <Search className="w-4 h-4 text-[#1A1A2E] dark:text-white" />
                    </div>
                  </div>
                </div>

                {
      /* Content */
    }
                <div className="p-5 flex-1 flex flex-col">
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-[#F97316]">
                        {safeStr(cat.category)}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                        {safeStr(cat.sku)}
                      </span>
                    </div>
                    <h3 className="text-[15px] font-bold text-[#1A1A2E] dark:text-white leading-snug group-hover:text-[#F97316] transition-colors line-clamp-1">
                      {safeStr(cat.itemName)}
                    </h3>
                  </div>

                  <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-5 flex-1 line-clamp-2 font-normal leading-relaxed">
                    {safeStr(cat.description) || "Standard inventory item maintained with precise specifications."}
                  </p>

                  {
      /* Stats Footer */
    }
                  <div className="pt-4 border-t border-gray-50 dark:border-gray-800 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mb-0.5">Live stock</p>
                      <p className={`text-[13px] font-bold ${inv && inv.liveStock <= cat.minStock ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {inv ? safeStr(inv.liveStock) : 0} <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium ml-0.5">{safeStr(cat.uom)}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 mb-0.5">Brand</p>
                      <p className="text-[12px] font-bold text-[#1A1A2E] dark:text-white truncate max-w-[90px]">{safeStr(cat.brand)}</p>
                    </div>
                  </div>

                  {
      /* Admin Actions */
    }
                  {(hasPermission("EDIT_CATALOGUE") || hasPermission("DELETE_CATALOGUE")) && <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 lg:translate-y-1 lg:group-hover:translate-y-0" onClick={(e) => e.stopPropagation()}>
                      {hasPermission("EDIT_CATALOGUE") && <button
      title="Edit Product"
      onClick={() => {
        setNewEntry(cat);
        setIsEditing(true);
        setModal(true);
      }}
      className="flex-1 flex items-center justify-center py-2 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-orange-500 dark:text-amber-400 font-bold text-[13px] border border-amber-100 dark:border-amber-900/30 transition-all hover:bg-amber-100 dark:hover:bg-orange-900/20"
    >
                          <Pencil className="w-4 h-4 mr-1.5" />
                          <span>Edit</span>
                        </button>}
                      {hasPermission("DELETE_CATALOGUE") && <button
      title="Delete Product"
      onClick={() => setDeletingSku(cat.sku)}
      className="p-2 rounded-xl bg-rose-50 dark:bg-rose-900/10 text-red-500 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30 transition-all hover:bg-rose-100 dark:hover:bg-red-900/20"
    >
                          <Trash2 className="w-4 h-4" />
                        </button>}
                    </div>}
                </div>
              </div>;
  })}
        </div>
        )}

        {
    /* Infinite Scroll Sentinel */
  }
        <div ref={observerRef} className="h-10 flex items-center justify-center mt-8">
          {loading && page > 1 && <div className="flex items-center gap-2 text-gray-500 text-xs">
              <div className="w-4 h-4 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
              Loading more...
            </div>}
        </div>
      </div>

      {previewImage && <Modal
    title="Image Preview"
    onClose={() => setPreviewImage(null)}
    footer={<div className="flex justify-center w-full">
              <Btn label="Close" outline onClick={() => setPreviewImage(null)} />
            </div>}
  >
          <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden">
            <img
    src={previewImage}
    alt="Preview"
    className="max-w-full max-h-[70vh] object-contain shadow-2xl"
    referrerPolicy="no-referrer"
  />
          </div>
        </Modal>}

      {selectedEntry && <Modal
    title="Product Details"
    onClose={() => setSelectedEntry(null)}
    wide
    footer={<div className="flex items-center justify-between w-full">
              <div className="flex gap-3">
                {hasPermission("EDIT_CATALOGUE") && <Btn
      icon={Pencil}
      outline
      onClick={() => {
        setNewEntry(selectedEntry);
        setIsEditing(true);
        setModal(true);
      }}
      label="Edit"
    />}
                {hasPermission("DELETE_CATALOGUE") && <Btn
      icon={Trash2}
      outline
      color="red"
      onClick={async () => {
        if (confirm("Are you sure you want to delete this catalogue entry?")) {
          try {
            await deleteCatalogue(selectedEntry.sku);
            setSelectedEntry(null);
          } catch (error) {
            alert(`Failed to delete catalogue entry: ${error.message}`);
          }
        }
      }}
      label="Delete"
    />}
              </div>
              <div className="flex items-center gap-3">
                {hasPermission("EDIT_CATALOGUE") && selectedEntry.status === "Draft" && <Btn
      label="Approve Product"
      icon={Check}
      color="green"
      onClick={async () => {
        await handleApprove(selectedEntry.sku);
        setSelectedEntry((prev) => prev ? { ...prev, status: "Approved" } : null);
      }}
      loading={actionLoading}
    />}
                <Btn label="Close" outline onClick={() => setSelectedEntry(null)} />
              </div>
            </div>}
  >
          {(() => {
    const inv = inventory.find((i) => i.sku === selectedEntry.sku);
    return <div className="space-y-8">

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                  {
      /* Left Column: Image Showcase */
    }
                  <div className="space-y-6">
                    <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-[#E8ECF0] dark:border-gray-800 overflow-hidden aspect-square flex items-center justify-center shadow-sm">
                      {selectedEntry.imageUrl ? <img
      src={selectedEntry.imageUrl}
      alt={selectedEntry.itemName}
      className="w-full h-full object-cover"
      referrerPolicy="no-referrer"
    /> : <div className="flex flex-col items-center gap-4">
                          <ImageIcon className="w-12 h-12 text-gray-200 dark:text-gray-700" />
                          <span className="text-gray-400 dark:text-gray-500 text-sm font-medium">No image</span>
                        </div>}
                      <div className="absolute top-4 left-4">
                        <StatusBadge status={selectedEntry.status} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-[#E8ECF0] dark:border-gray-700 text-center">
                        <p className="text-[9px] font-bold text-[#9CA3AF] dark:text-gray-500 mb-1">Uom</p>
                        <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">{safeStr(selectedEntry.uom)}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-[#E8ECF0] dark:border-gray-700 text-center">
                        <p className="text-[9px] font-bold text-[#9CA3AF] dark:text-gray-500 mb-1">Location</p>
                        <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">{safeStr(selectedEntry.location)}</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-[#E8ECF0] dark:border-gray-700 text-center">
                        <p className="text-[9px] font-bold text-[#9CA3AF] dark:text-gray-500 mb-1">Min stock</p>
                        <p className="text-sm font-bold text-[#1A1A2E] dark:text-white">{safeStr(selectedEntry.minStock)}</p>
                      </div>
                    </div>
                  </div>

                  {
      /* Right Column: Product Narrative & Specs */
    }
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="px-2 py-0.5 rounded bg-[#1A1A2E] dark:bg-gray-700 text-white text-[9px] font-bold">
                          {safeStr(selectedEntry.sku)}
                        </span>
                        <span className="text-[10px] font-bold text-[#F97316]">
                          {safeStr(selectedEntry.category)}
                        </span>
                      </div>
                      
                      <h2 className="text-3xl font-bold text-[#1A1A2E] dark:text-white leading-tight mb-4">
                        {safeStr(selectedEntry.itemName)}
                      </h2>
                      
                      <div className="space-y-2">
                        <h3 className="text-[10px] font-bold text-[#9CA3AF] dark:text-gray-500">Description</h3>
                        <p className="text-sm text-[#4B5563] dark:text-gray-400 leading-relaxed">
                          {safeStr(selectedEntry.description) || "Detailed product information is maintained in our central catalogue for operational efficiency."}
                        </p>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-[#1A1A2E] dark:bg-gray-800 text-white relative overflow-hidden">
                      <div className="relative z-10">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-2">Live inventory</p>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-4xl font-bold ${inv && inv.liveStock <= selectedEntry.minStock ? "text-[#FCA5A5]" : "text-[#34D399]"}`}>
                            {inv ? safeStr(inv.liveStock) : 0}
                          </span>
                          <span className="text-sm text-gray-400 dark:text-gray-500">{safeStr(selectedEntry.uom)}</span>
                        </div>
                        
                        {inv && inv.liveStock <= selectedEntry.minStock && <div className="mt-3 inline-block bg-[#EF4444] text-white text-[9px] font-black px-3 py-1 rounded-full">
                            Low stock alert
                          </div>}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 pt-6 border-t border-[#E8ECF0] dark:border-gray-800">
                      <div>
                        <p className="text-[10px] font-bold text-[#9CA3AF] dark:text-gray-500 mb-1">Brand</p>
                        <p className="text-lg font-bold text-[#1A1A2E] dark:text-white">{safeStr(selectedEntry.brand)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-[#9CA3AF] dark:text-gray-500 mb-1">Storage zone</p>
                        <p className="text-lg font-bold text-[#1A1A2E] dark:text-white">{safeStr(selectedEntry.location)}</p>
                      </div>
                    </div>

                  </div>
                </div>
              </div>;
  })()}
        </Modal>}

      {modal && <Modal
    title={isEditing ? "Edit Catalogue Entry" : "Add Catalogue Entry"}
    onClose={() => {
      setModal(false);
      setErrors({});
      setNewEntry({
        sku: "",
        itemName: "",
        brand: "",
        description: "",
        category: "",
        uom: "",
        location: "",
        minStock: 0,
        imageUrl: "",
        status: "Draft"
      });
      setIsEditing(false);
    }}
    footer={<div className="flex justify-end gap-2 w-full">
              <Btn label="Cancel" outline onClick={() => {
      setModal(false);
      setErrors({});
    }} />
              <Btn
      label={isEditing ? "Update" : "Save as Draft"}
      onClick={handleCreate}
    />
            </div>}
  >
          <div className="space-y-4">
            {!isEditing && <SField
    label="Select Item (Inventory Search)"
    value={newEntry.sku}
    onChange={(e) => handleSelectItem(e.target.value)}
    options={inventory.filter((i) => !catalogue.find((c) => c.sku === i.sku)).map((i) => ({ value: i.sku, label: `${i.itemName} (${i.sku})` }))}
    required
    error={errors.sku}
  />}
            
            <div className="grid grid-cols-2 gap-4">
              <Field
    label="Item Name"
    value={newEntry.itemName}
    disabled
    required
    error={errors.itemName}
  />
              <Field
    label="SKU Code"
    value={newEntry.sku}
    disabled
    required
    error={errors.sku}
  />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field
    label="Category"
    value={newEntry.category}
    disabled
    required
    error={errors.category}
  />
              <Field
    label="UOM (Unit of Measure)"
    value={newEntry.uom}
    disabled
    required
    error={errors.uom}
  />
            </div>

            <Field
    label="Brand / Manufacturer"
    value={newEntry.brand}
    onChange={(e) => setNewEntry((prev) => ({ ...prev, brand: e.target.value }))}
    required
    error={errors.brand}
  />

            <div className="mb-4">
              <label className="block text-[11px] font-bold text-[#6B7280] dark:text-gray-400 mb-1">
                Description (Size, weight, etc.)
              </label>
              <textarea
    value={newEntry.description}
    onChange={(e) => setNewEntry((prev) => ({ ...prev, description: e.target.value }))}
    className={cn(
      "w-full px-3 py-2 border border-[#E8ECF0] dark:border-gray-700 bg-white dark:bg-gray-900 rounded-lg text-[13px] text-gray-900 dark:text-white focus:outline-none focus:border-[#F97316]",
      errors.description && "border-red-500"
    )}
    rows={3}
    placeholder="Enter details like size, weight, etc."
  />
              {errors.description && <p className="text-[11px] text-red-500 mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
    label="Storage Location"
    value={newEntry.location}
    onChange={(e) => setNewEntry((prev) => ({ ...prev, location: e.target.value }))}
    required
    error={errors.location}
  />
              <Field
    label="Min Stock Level"
    type="number"
    value={newEntry.minStock}
    onChange={(e) => setNewEntry((prev) => ({ ...prev, minStock: e.target.value }))}
    required
    error={errors.minStock}
  />
            </div>

            <ImageUpload
    label="Product Photo"
    id="product-photo"
    small
    value={newEntry.imageUrl}
    onChange={handleImageUpload}
    onRemove={() => setNewEntry((prev) => ({ ...prev, imageUrl: "" }))}
    loading={uploading}
  />

          </div>
        </Modal>}

      {deletingSku && <ConfirmModal
    title="Delete Catalogue Entry"
    message={`Are you sure you want to delete ${deletingSku}? This will remove it from the catalogue.`}
    onConfirm={handleConfirmDelete}
    onCancel={() => setDeletingSku(null)}
    loading={actionLoading}
  />}
    </div>;
}, "Catalogue");
export {
  Catalogue
};
