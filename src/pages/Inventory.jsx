var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from "react";
import { useAppStore } from "../store";
import {
  PageHeader,
  Card,
  StatusBadge,
  Btn,
  Modal,
  SField,
  Field,
  Skeleton,
  ConfirmModal,
  Tr,
  Td
} from "../components/ui";
import { Plus, Eye, Pencil, Trash2, Package, Download } from "lucide-react";
import { scrollToError, safeStr } from "../utils";
import toast from "react-hot-toast";
import { cn } from "../lib/utils";
import * as XLSX from "xlsx";
const InventoryRow = memo(
  ({
    item,
    catalogueMap,
    role,
    hasPermission,
    onView,
    onEdit,
    onDelete,
    filterStore
  }) => {
    const cat = catalogueMap[item.sku];
    const isLow = cat && item.liveStock <= cat.minStock;
    return <>
        {
      /* Desktop View Cells */
    }
        <Td className="hidden md:table-cell px-4 py-3 text-center">
          <div className="w-10 h-10 mx-auto rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
            {cat?.imageUrl ? <img
      src={cat.imageUrl}
      alt={item.itemName}
      className="w-full h-full object-cover"
      referrerPolicy="no-referrer"
    /> : <Package className="w-5 h-5 text-gray-300" />}
          </div>
        </Td>
        <Td className="hidden md:table-cell px-3 py-2.5 overflow-hidden">
          <span className="block truncate text-[13px] font-mono text-gray-500 dark:text-gray-400" title={safeStr(item.sku)}>{safeStr(item.sku)}</span>
        </Td>
        <Td className="hidden md:table-cell px-3 py-2.5 overflow-hidden">
          <span className="flex items-center gap-2 truncate text-[13px] font-medium text-gray-900 dark:text-white" title={safeStr(item.itemName)}>
            {safeStr(item.itemName) || <span className="text-gray-400 italic">Unnamed Item</span>}
          </span>
        </Td>
        <Td className="hidden md:table-cell px-3 py-2.5 overflow-hidden">
          <span className="block truncate text-[13px] text-gray-500 dark:text-gray-400" title={`${safeStr(item.category)} / ${safeStr(item.subCategory)}`}>{safeStr(item.category)} / {safeStr(item.subCategory)}</span>
        </Td>
        <Td className="hidden md:table-cell px-4 py-3 text-right">
          <div className="flex flex-col items-end">
            <span className="text-[13px] font-bold text-emerald-500" title="Available Free Stock">
              {item.availableQty || item.liveStock || 0}
            </span>
            <div className="flex gap-2">
              <span className="text-[10px] text-amber-500 font-bold" title="Allocated / Reserved">
                ALC: {item.allocatedQty || 0}
              </span>
              <span className="text-[10px] text-blue-500 font-bold" title="Physically Issued">
                ISU: {item.issuedQty || 0}
              </span>
            </div>
            <span className="text-[9px] text-gray-400 font-medium mt-0.5">
              Total: {item.totalQty || item.liveStock || 0} {item.unit}
            </span>
          </div>
        </Td>
        <Td className="hidden md:table-cell px-3 py-2.5">
          {filterStore ? (
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-[15px] font-black text-indigo-500 leading-none">
                {Number(item.locationStock?.[filterStore] || 0)}
              </span>
              <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wide">{item.unit}</span>
            </div>
          ) : (() => {
            const entries = Object.entries(item.locationStock || {}).filter(([, qty]) => Number(qty) > 0);
            // Fall back to lastProject when no godown/store data
            if (entries.length === 0) {
              if (item.lastProject) {
                return (
                  <div className="flex flex-col gap-1">
                    {item.lastProject.split(", ").map((proj) => (
                      <div key={proj} className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex-1 leading-none" title={proj}>{proj}</span>
                        <span className="text-[10px] font-black text-orange-500 shrink-0 tabular-nums">{item.liveStock || 0}</span>
                      </div>
                    ))}
                  </div>
                );
              }
              return <span className="text-[11px] text-gray-300 dark:text-gray-700">—</span>;
            }
            return (
              <div className="flex flex-col gap-1">
                {entries.map(([store, qty]) => (
                  <div key={store} className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate flex-1 leading-none" title={store}>{store}</span>
                    <span className="text-[10px] font-black text-indigo-500 shrink-0 tabular-nums">{Number(qty)}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </Td>
        <Td className="hidden md:table-cell px-4 py-3 text-center">
          <StatusBadge status={item.condition} />
        </Td>
        <Td className="hidden md:table-cell px-4 py-3">
          <div className="flex items-center justify-end gap-1.5">
            <button
      title="View Details"
      onClick={() => onView(item)}
      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
    >
              <Eye className="w-4 h-4" />
            </button>
            
            {hasPermission("EDIT_INVENTORY") && <button
      title="Edit Item"
      onClick={() => onEdit(item)}
      className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
    >
                <Pencil className="w-4 h-4" />
              </button>}
            
            {hasPermission("DELETE_INVENTORY") && <button
      title={(item.allocatedQty || 0) > 0 || (item.issuedQty || 0) > 0 ? "Locked: Transaction history exists" : "Delete Item"}
      disabled={(item.allocatedQty || 0) > 0 || (item.issuedQty || 0) > 0}
      onClick={() => onDelete(item.sku)}
      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
    >
                <Trash2 className="w-4 h-4" />
              </button>}
          </div>
        </Td>

        {
      /* Mobile View Cell */
    }
        <Td colSpan={7} className="md:hidden p-0 border-none">
          <div className="p-4 space-y-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800 shrink-0">
                {cat?.imageUrl ? <img
      src={cat.imageUrl}
      alt={item.itemName}
      className="w-full h-full object-cover"
      referrerPolicy="no-referrer"
    /> : <Package className="w-8 h-8 text-gray-300 m-auto mt-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-[14px] font-bold text-gray-900 dark:text-white truncate">
                    {safeStr(item.itemName)}
                  </h4>
                  <span className={cn(
      "text-[12px] font-black shrink-0",
      item.liveStock === 0 ? "text-red-500" : item.liveStock < 10 ? "text-amber-500" : "text-emerald-500"
    )}>
                    {safeStr(item.liveStock)} {safeStr(item.unit)}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-gray-400 mt-0.5">{safeStr(item.sku)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={item.condition} />
                </div>
              </div>
            </div>
            {Object.entries(item.locationStock || {}).filter(([, qty]) => Number(qty) > 0).length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {Object.entries(item.locationStock || {}).filter(([, qty]) => Number(qty) > 0).map(([store, qty]) => (
                  <span key={store} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800">
                    <span className="text-[9px] text-gray-500 dark:text-gray-400">{store}:</span>
                    <span className="text-[9px] font-bold text-indigo-500">{Number(qty)}</span>
                  </span>
                ))}
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                {safeStr(item.category)}
              </p>
              <div className="flex items-center gap-2">
                <button
      title="View Details"
      onClick={() => onView(item)}
      className="p-2 rounded-lg text-blue-500 bg-blue-50 dark:bg-blue-900/10 transition-colors"
    >
                  <Eye className="w-4 h-4" />
                </button>
                
                {hasPermission("EDIT_INVENTORY") && <button
      title="Edit Item"
      onClick={() => onEdit(item)}
      className="p-2 rounded-lg text-orange-500 bg-amber-50 dark:bg-amber-900/10 transition-colors"
    >
                    <Pencil className="w-4 h-4" />
                  </button>}
                
                {hasPermission("DELETE_INVENTORY") && <button
      title="Delete Item"
      onClick={() => onDelete(item.sku)}
      className="p-2 rounded-lg text-red-500 bg-rose-50 dark:bg-rose-900/10 transition-colors"
    >
                    <Trash2 className="w-4 h-4" />
                  </button>}
              </div>
            </div>
          </div>
        </Td>
      </>;
  }
);
InventoryRow.displayName = "InventoryRow";
const INITIAL_ITEM = {
  sku: "",
  itemName: "",
  category: "",
  subCategory: "",
  unit: "Nos",
  condition: "New",
  openingStock: 0,
  liveStock: 0,
  sourceSite: "",
  lastProject: ""
};
import { SearchFilter, SelectFilter, FilterRow } from "../components/ui/Filters";
const SearchControls = memo(({
  search,
  setSearch,
  filterProject,
  setFilterProject,
  filterCategory,
  setFilterCategory,
  filterStore,
  setFilterStore
}) => {
  const { settings } = useAppStore();
  const { projects: PROJECTS, categories: CATEGORIES, stores: STORES } = settings;
  const showClear = !!(search || filterProject || filterCategory || filterStore);
  return <FilterRow showClear={showClear} onClearAll={() => {
    setSearch("");
    setFilterProject("");
    setFilterCategory("");
    setFilterStore("");
  }}>
      <SearchFilter
    value={search}
    onChange={setSearch}
    placeholder="Search by SKU, Name, Category..."
    className="lg:flex-[2]"
  />
      <SelectFilter
    value={filterProject}
    onChange={setFilterProject}
    options={PROJECTS}
    placeholder="All Projects"
  />
      <SelectFilter
    value={filterCategory}
    onChange={setFilterCategory}
    options={CATEGORIES}
    placeholder="All Categories"
  />
      <SelectFilter
    value={filterStore}
    onChange={setFilterStore}
    options={STORES || []}
    placeholder="All Godowns"
  />
    </FilterRow>;
});
import { TableVirtuoso } from "react-virtuoso";
const Inventory = /* @__PURE__ */ __name(() => {
  const {
    inventory,
    inventoryPagination,
    stats,
    fetchResource,
    updateInventory,
    catalogue,
    role,
    addWriteOff,
    addInventory,
    deleteInventory,
    loading,
    actionLoading,
    setActionLoading,
    hasPermission,
    settings,
    api
  } = useAppStore();
  const { projects: PROJECTS, categories: CATEGORIES, units: UNITS, stores: STORES } = settings;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);
  const catalogueMap = useMemo(() => {
    const map = {};
    catalogue.forEach((item) => {
      if (item.sku) map[item.sku] = item;
    });
    return map;
  }, [catalogue]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [viewModal, setViewModal] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSkuManuallyEdited, setIsSkuManuallyEdited] = useState(false);
  const [filterProject, setFilterProject] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStore, setFilterStore] = useState("");
  const [newItem, setNewItem] = useState(INITIAL_ITEM);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (isEditing || isSkuManuallyEdited) return;
    const category = newItem.category?.trim() || "";
    const itemName = newItem.itemName?.trim() || "";
    if (!category || !itemName) return;
    const catCode = category.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase();
    const itmCode = itemName.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase();
    if (!catCode || !itmCode) return;
    const prefix = `${catCode}/${itmCode}/`;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get("inventory/next-sku", { prefix });
        if (res.success) {
          setNewItem((prev) => ({ ...prev, sku: res.data }));
        }
      } catch {
        let maxNum = 0;
        for (const item of [...inventory, ...catalogue]) {
          if (item.sku && item.sku.toUpperCase().startsWith(prefix)) {
            const n = parseInt(item.sku.split("/").pop() || "0", 10);
            if (!isNaN(n)) maxNum = Math.max(maxNum, n);
          }
        }
        setNewItem((prev) => ({ ...prev, sku: `${prefix}${String(maxNum + 1).padStart(4, "0")}` }));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [newItem.category, newItem.itemName, isEditing, isSkuManuallyEdited]);
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToError();
    }
  }, [errors]);
  const [page, setPage] = useState(1);
  const observerRef = useRef(null);
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterProject, filterCategory, filterStore]);
  useEffect(() => {
    const isInitialLoad = inventory.length === 0;
    const filter = {};
    if (filterProject) filter.lastProject = filterProject;
    if (filterCategory) filter.category = filterCategory;
    fetchResource("inventory", page, 50, !isInitialLoad || page > 1, debouncedSearch, Object.keys(filter).length > 0 ? filter : null, page > 1);
    fetchResource("catalogue", 1, 1e3);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterProject, filterCategory, page]);
  const filteredInventory = useMemo(() => {
    // Deduplicate by SKU — merge quantities from duplicate MongoDB documents
    const skuMap = new Map();
    inventory.forEach((item) => {
      if (!item.sku) return;
      if (!skuMap.has(item.sku)) {
        skuMap.set(item.sku, {
          ...item,
          locationStock: { ...(item.locationStock || {}) },
        });
      } else {
        const ex = skuMap.get(item.sku);
        ex.liveStock     = (ex.liveStock     || 0) + (item.liveStock     || 0);
        ex.availableQty  = (ex.availableQty  || 0) + (item.availableQty  || 0);
        ex.allocatedQty  = (ex.allocatedQty  || 0) + (item.allocatedQty  || 0);
        ex.issuedQty     = (ex.issuedQty     || 0) + (item.issuedQty     || 0);
        ex.totalQty      = (ex.totalQty      || 0) + (item.totalQty      || 0);
        ex.openingStock  = (ex.openingStock  || 0) + (item.openingStock  || 0);
        Object.entries(item.locationStock || {}).forEach(([loc, qty]) => {
          ex.locationStock[loc] = (ex.locationStock[loc] || 0) + Number(qty);
        });
        // Collect all projects this SKU appeared in
        if (item.lastProject) {
          const existing = ex.lastProject || "";
          if (!existing.split(", ").includes(item.lastProject)) {
            ex.lastProject = existing ? `${existing}, ${item.lastProject}` : item.lastProject;
          }
        }
      }
    });

    let result = Array.from(skuMap.values());

    if (filterStore) {
      result = result.filter((item) => Number(item.locationStock?.[filterStore] || 0) > 0);
    }

    return result;
  }, [inventory, filterStore]);

  const loadMore = useCallback(() => {
    if (inventoryPagination && page < inventoryPagination.pages && !loading && !actionLoading) {
      setPage((prev) => prev + 1);
    }
  }, [inventoryPagination, page, loading, actionLoading]);
  const validateForm = /* @__PURE__ */ __name((data) => {
    const newErrors = {};
    if (!data.sku) newErrors.sku = "SKU is required";
    if (!data.itemName) newErrors.itemName = "Item name is required";
    if (!data.category) newErrors.category = "Category is required";
    if (!data.subCategory) newErrors.subCategory = "Sub-category is required";
    if (!data.unit) newErrors.unit = "Unit is required";
    if (!data.condition) newErrors.condition = "Condition is required";
    if (data.openingStock < 0) newErrors.openingStock = "Cannot be negative";
    if (data.liveStock < 0) newErrors.liveStock = "Cannot be negative";
    if (!data.sourceSite) newErrors.sourceSite = "Store / Godown is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, "validateForm");
  const handleAddInventory = /* @__PURE__ */ __name(async () => {
    if (!validateForm(newItem)) {
      toast.error("Please fix the errors in the form");
      return;
    }
    try {
      const allocatedQty = newItem.allocatedQty || 0;
      const issuedQty = newItem.issuedQty || 0;
      const liveStock = newItem.liveStock || 0;
      const payload = {
        ...newItem,
        availableQty: Math.max(0, liveStock - allocatedQty),
        totalQty: liveStock + issuedQty,
        condition: newItem.condition.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        ...(!isEditing && newItem.sourceSite && liveStock > 0
          ? { locationStock: { [newItem.sourceSite]: liveStock } }
          : {})
      };
      if (isEditing) {
        await updateInventory(newItem.sku, payload);
        toast.success("Item updated successfully");
      } else {
        await addInventory(payload);
        toast.success("Item added to inventory");
      }
      setShowAddModal(false);
      setNewItem(INITIAL_ITEM);
      setIsEditing(false);
      setIsSkuManuallyEdited(false);
      setErrors({});
    } catch (error) {
      toast.error(
        `Failed to ${isEditing ? "update" : "add"} item: ${error.message}`
      );
    }
  }, "handleAddInventory");
  const onView = useCallback((item) => {
    setViewModal(item);
  }, []);
  const onEdit = useCallback((item) => {
    setNewItem(item);
    setIsEditing(true);
    setShowAddModal(true);
  }, []);
  const onDelete = useCallback((sku) => {
    setDeleteConfirm(sku);
  }, []);
  const confirmDelete = /* @__PURE__ */ __name(async () => {
    if (!deleteConfirm) return;
    try {
      await deleteInventory(deleteConfirm);
      setDeleteConfirm(null);
    } catch (error) {
      toast.error(`Failed to delete item: ${error.message}`);
    }
  }, "confirmDelete");
  const exportToExcel = /* @__PURE__ */ __name(() => {
    try {
      const dataToExport = inventory.map((item) => ({
        SKU: item.sku,
        "Item Name": item.itemName,
        Category: item.category,
        "Sub Category": item.subCategory,
        "Live Stock": item.liveStock,
        Unit: item.unit,
        Condition: item.condition,
        "Last Project": item.lastProject || "N/A"
      }));
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventory");
      XLSX.writeFile(wb, `Inventory_Report_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.xlsx`);
      toast.success("Inventory exported successfully");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export inventory");
    }
  }, "exportToExcel");
  return <div className="flex flex-col gap-6 min-h-screen">
      <PageHeader
    title="Inventory Management"
    subtitle="Real-time stock tracking and asset tagging"
    actions={<div className="flex items-center gap-3">
            <Btn
      label="Export Excel"
      icon={Download}
      outline
      onClick={exportToExcel}
    />
            {hasPermission("CREATE_INVENTORY") && <Btn
      label="Add Item"
      icon={Plus}
      onClick={() => {
        setIsEditing(false);
        setNewItem(INITIAL_ITEM);
        setIsSkuManuallyEdited(false);
        setShowAddModal(true);
      }}
    />}
          </div>}
  />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Unique SKUs
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {inventoryPagination?.total || 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-bold tracking-tight">Varieties in catalog</p>
        </Card>
        <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Total Stock Units
          </p>
          <p className="text-2xl font-bold text-emerald-500 mt-1">
            {stats.inStock?.toLocaleString() || 0}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-bold tracking-tight">Physical items count</p>
        </Card>
        <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Out of Stock
          </p>
          <p className="text-2xl font-bold text-red-500 mt-1">
            {stats.outOfStock}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-bold tracking-tight">Zero availability</p>
        </Card>
        <Card className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Categories
          </p>
          <p className="text-2xl font-bold text-indigo-500 mt-1">
            {stats.categoriesCount}
          </p>
          <p className="text-[10px] text-gray-400 mt-1 font-bold tracking-tight">Departmental mix</p>
        </Card>
      </div>

      <div className="mb-6">
        <SearchControls
    search={search}
    setSearch={setSearch}
    filterProject={filterProject}
    setFilterProject={setFilterProject}
    filterCategory={filterCategory}
    setFilterCategory={setFilterCategory}
    filterStore={filterStore}
    setFilterStore={setFilterStore}
  />
      </div>

      <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-1">
        <TableVirtuoso
    style={{ height: "calc(100vh - 280px)", minHeight: "500px" }}
    data={filteredInventory}
    endReached={loadMore}
    increaseViewportBy={300}
    fixedHeaderContent={() => {
      const headerClass = "px-3 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider sticky top-0 z-10 sticky-th whitespace-nowrap overflow-hidden";
      return <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-[#E8ECF0] dark:border-gray-800">
                <th className={cn(headerClass, "md:hidden")}>
                  Inventory details
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-14 text-center")}>
                  Photo
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-[130px]")}>
                  SKU
                </th>
                <th className={cn(headerClass, "hidden md:table-cell")}>
                  Item name
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-[140px]")}>
                  Category
                </th>
                <th className={cn(headerClass, "hidden md:table-cell text-right w-[150px]")}>
                  Stock (Avail | Alc | Isu)
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-[180px]")}>
                  {filterStore ? filterStore : "Godown Stock"}
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-[100px] text-center")}>
                  Condition
                </th>
                <th className={cn(headerClass, "hidden md:table-cell text-right w-[110px]")}>
                  Actions
                </th>
              </tr>;
    }}
    itemContent={(_index, item) => <InventoryRow
      item={item}
      catalogueMap={catalogueMap}
      role={role}
      hasPermission={hasPermission}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      filterStore={filterStore}
    />}
    components={{
      Table: /* @__PURE__ */ __name((props) => <table {...props} className="w-full text-left border-collapse table-fixed min-w-[900px]" />, "Table"),
      TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} className="divide-y divide-gray-200 dark:divide-gray-800" />),
      TableRow: /* @__PURE__ */ __name((props) => {
        return <Tr {...props} className={cn("cursor-pointer", props.className)} />;
      }, "TableRow")
    }}
  />
        
        {loading && inventory.length === 0 && <div className="p-8 space-y-4">
             {[...Array(5)].map((_, i) => <div key={i} className="flex gap-4">
                  <Skeleton className="h-10 w-10 shrink-0" />
                  <Skeleton className="h-10 flex-1" />
                  <Skeleton className="h-10 w-24" />
                </div>)}
          </div>}
        
        {!loading && filteredInventory.length === 0 && <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {filterStore ? `No items with stock at "${filterStore}"` : "No items found"}
          </div>}
      </Card>

      {
    /* Infinite Scroll Indicator for Bottom */
  }
      {loading && inventory.length > 0 && <div className="flex items-center justify-center py-2 text-gray-500 text-xs">
          <div className="w-3 h-3 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin mr-2" />
          Loading more items...
        </div>}

      {viewModal && <Modal
    title="Inventory Item Details"
    onClose={() => setViewModal(null)}
    footer={<div className="flex justify-end w-full">
              <Btn label="Close" outline onClick={() => setViewModal(null)} />
            </div>}
  >
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold text-gray-500 tracking-wider">SKU</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{safeStr(viewModal.sku)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 tracking-wider">Item Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{safeStr(viewModal.itemName)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 tracking-wider">Category</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{safeStr(viewModal.category)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 tracking-wider">Sub-Category</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{safeStr(viewModal.subCategory)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 tracking-wider">Live Stock</p>
                <p className="text-sm font-bold text-emerald-500">{safeStr(viewModal.liveStock)} {safeStr(viewModal.unit)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 tracking-wider">Condition</p>
                <StatusBadge status={viewModal.condition} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 tracking-wider">Project</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{safeStr(viewModal.sourceSite)}</p>
              </div>
            </div>
            {catalogue.find((c) => c.sku === viewModal.sku)?.imageUrl && <div className="mt-4">
                <p className="text-[11px] font-bold text-gray-500 tracking-wider mb-2">Reference Photo</p>
                <div className="aspect-video rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                  <img
    src={catalogue.find((c) => c.sku === viewModal.sku).imageUrl}
    alt={viewModal.itemName}
    className="w-full h-full object-cover"
    referrerPolicy="no-referrer"
  />
                </div>
              </div>}
          </div>
        </Modal>}

      {showAddModal && <Modal
    title={isEditing ? "Edit Inventory Item" : "Add New Inventory Item"}
    onClose={() => {
      setShowAddModal(false);
      setNewItem(INITIAL_ITEM);
      setIsEditing(false);
      setIsSkuManuallyEdited(false);
      setErrors({});
    }}
    footer={<div className="flex justify-end gap-3 w-full">
              <Btn
      label="Cancel"
      outline
      onClick={() => {
        setShowAddModal(false);
        setNewItem(INITIAL_ITEM);
        setIsEditing(false);
        setIsSkuManuallyEdited(false);
        setErrors({});
      }}
    />
              <Btn
      label={isEditing ? "Update Item" : "Add Item to Inventory"}
      onClick={handleAddInventory}
      loading={actionLoading}
    />
            </div>}
  >
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
    label="SKU (Auto-generated)"
    value={newItem.sku}
    onChange={(e) => {
      const sku = e.target.value;
      setIsSkuManuallyEdited(true);
      const catItem = catalogue.find((c) => c.sku === sku);
      if (catItem) {
        setNewItem({
          ...newItem,
          sku,
          itemName: catItem.itemName,
          category: catItem.category,
          unit: catItem.uom,
          subCategory: catItem.brand
        });
      } else {
        setNewItem({ ...newItem, sku });
      }
    }}
    placeholder="e.g. ELE/CAB/0001"
    required
    disabled={isEditing}
    error={errors.sku}
  />
                <Field
    label="Item Name"
    value={newItem.itemName}
    onChange={(e) => setNewItem((prev) => ({ ...prev, itemName: e.target.value }))}
    placeholder="e.g. Copper Cable 10mm"
    required
    error={errors.itemName}
  />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SField
    label="Category"
    value={newItem.category}
    onChange={(e) => setNewItem((prev) => ({ ...prev, category: e.target.value }))}
    options={CATEGORIES}
    required
    error={errors.category}
  />
                <Field
    label="Sub-Category"
    value={newItem.subCategory}
    onChange={(e) => setNewItem((prev) => ({ ...prev, subCategory: e.target.value }))}
    placeholder="e.g. Cables"
    required
    error={errors.subCategory}
  />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SField
    label="Unit"
    value={newItem.unit}
    onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
    options={UNITS}
    required
    error={errors.unit}
  />
              <SField
    label="Condition"
    value={newItem.condition}
    onChange={(e) => setNewItem({ ...newItem, condition: e.target.value })}
    options={["New", "Good", "Needs Repair", "Damaged", "Old"]}
    required
    error={errors.condition}
  />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-50/30 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800">
              <Field
    label="Opening Stock"
    type="number"
    value={newItem.openingStock}
    onChange={(e) => {
      const val = parseInt(e.target.value) || 0;
      setNewItem({ ...newItem, openingStock: val, liveStock: val });
    }}
    required
    error={errors.openingStock}
  />
              <Field
    label="Live Stock"
    type="number"
    value={newItem.liveStock}
    onChange={(e) => setNewItem({
      ...newItem,
      liveStock: parseInt(e.target.value) || 0
    })}
    required
    error={errors.liveStock}
  />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <SField
    label="Store / Godown *"
    value={newItem.sourceSite}
    onChange={(e) => setNewItem({ ...newItem, sourceSite: e.target.value })}
    options={STORES || []}
    required
    error={errors.sourceSite}
  />
            </div>

          </div>
        </Modal>}

      {deleteConfirm && <ConfirmModal
    title="Delete Inventory Item"
    message={`Are you sure you want to delete ${deleteConfirm}? This action cannot be undone.`}
    onConfirm={confirmDelete}
    onCancel={() => setDeleteConfirm(null)}
    loading={actionLoading}
  />}
    </div>;
}, "Inventory");
var stdin_default = Inventory;
export {
  Inventory,
  stdin_default as default
};
