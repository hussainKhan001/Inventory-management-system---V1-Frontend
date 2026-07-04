var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React, { useState, useEffect } from "react";
import { useAppStore } from "../store";
import {
  PageHeader,
  Card,
  StatusBadge,
  Btn,
  Modal,
  Skeleton,
  Checkbox
} from "../components/ui";
import { SearchFilter, DateRangePicker, SelectFilter, FilterRow } from "../components/ui/Filters";
import {
  FileText,
  Eye,
  CheckCircle,
  XCircle,
  Building2,
  Package,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Pencil,
  Trash2,
  LayoutList,
  Table as TableIcon,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatDate, fmt, safeStr, isNewItem } from "../utils";
import { toast } from "react-hot-toast";
import { cn } from "../lib/utils";
import { Virtuoso } from "react-virtuoso";
import { DatePicker } from "../components/ui/DatePicker";
import { api } from "../services/api";
const Quotations = /* @__PURE__ */ __name(() => {
  const {
    quotations,
    quotationsPagination,
    fetchResource,
    updateQuotation,
    deleteQuotation,
    updateMaterialRequirement,
    materialRequirements,
    pos,
    suppliers,
    addNotification,
    loading,
    actionLoading,
    role,
    hasPermission,
    settings
  } = useAppStore();
  const { categories: CATEGORIES = [] } = settings;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [viewMode, setViewMode] = useState("card");
  const [tableFilter, setTableFilter] = useState("");
  const supplierOptions = React.useMemo(() => {
    const uniqueSuppliers = Array.from(new Set(suppliers.map((s) => s.companyName).filter(Boolean)));
    return uniqueSuppliers.sort();
  }, [suppliers]);
  const statusOptions = React.useMemo(() => [
    { label: "Pending", value: "Pending" },
    { label: "Approved", value: "Approved" },
    { label: "Rejected", value: "Rejected" }
  ], []);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const filterObj = {};
    if (filterCategory) filterObj.category = filterCategory;
    if (filterSupplier) filterObj.supplierName = filterSupplier;
    if (filterStatus) filterObj.status = filterStatus;
    const finalFilter = Object.keys(filterObj).length > 0 ? filterObj : null;
    fetchResource("quotations", 1, 1e3, true, debouncedSearch, finalFilter, false, false, startDate, endDate);
    fetchResource("material-requirements", 1, 1e3, true);
    fetchResource("pos", 1, 1e3, true);
    if (suppliers.length === 0) fetchResource("suppliers", 1, 1e3, true);
    // Run migration once per session to link legacy POs to their source quotations
    // (backend broadcasts DATA_UPDATED after migration — WS handler will refresh with correct search params)
    if (!sessionStorage.getItem("po-quotation-migration-v2-done")) {
      api.post("pos/migrate-quotation-links", {}).then(() => {
        sessionStorage.setItem("po-quotation-migration-v2-done", "1");
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, startDate, endDate, filterCategory, filterSupplier, filterStatus]);
  const [viewModal, setViewModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [activeMrId, setActiveMrId] = useState(null);
  const [selectedApprovedItems, setSelectedApprovedItems] = useState([]);
  useEffect(() => {
    if (selectedQuotation) {
      const approved = (selectedQuotation.items || []).filter((item) => item.approved).map((item) => item.materialName);
      if (approved.length === 0 && selectedQuotation.status === "Approved") {
        setSelectedApprovedItems(selectedQuotation.items.map((item) => item.materialName));
      } else {
        setSelectedApprovedItems(approved);
      }
    } else {
      setSelectedApprovedItems([]);
    }
  }, [selectedQuotation]);
  const hasLinkedPO = /* @__PURE__ */ __name((quote) => {
    // Primary check: quotation has been directly linked to a PO by the backend
    if (quote.linkedPoId) {
      const linkedPo = pos.find(p => p.id === quote.linkedPoId);
      // Linked PO may not be in paginated store yet — treat as locked if ID exists
      if (!linkedPo) return true;
      return !["Rejected", "Cancelled", "Blocked"].includes(linkedPo.status);
    }
    // Fallback for legacy quotations without linkedPoId: check by supplier+mrId+category
    const quoteSupplierLower = (quote.supplierName || "").toLowerCase();
    return pos.some((po) => {
      if (po.mrId !== quote.mrId) return false;
      if (["Rejected", "Cancelled", "Blocked"].includes(po.status)) return false;
      if (po.quotationId) return po.quotationId === quote.id;
      if (quote.category && po.workType && po.workType !== quote.category) return false;
      const poSupplier = suppliers.find(s => s.id === po.supplier || s._id === po.supplier);
      const poSupplierLower = (poSupplier?.companyName || poSupplier?.name || po.supplier || "").toLowerCase();
      if (poSupplierLower !== quoteSupplierLower) return false;
      // If another quotation is already specifically linked to this PO, don't lock this one via fallback
      const alreadyClaimed = quotations.some(q => q.id !== quote.id && q.linkedPoId === po.id);
      if (alreadyClaimed) return false;
      return true;
    });
  }, "hasLinkedPO");
  const handleStatusUpdate = /* @__PURE__ */ __name(async (id, status, approvedItems) => {
    try {
      const quote = quotations.find((q) => q.id === id);
      if (!quote) return;
      if (status === "Rejected" && hasLinkedPO(quote)) {
        toast.error("Cannot reject: A Purchase Order is already linked to this quotation.");
        return;
      }
      let itemsToApprove = approvedItems;
      if (status === "Approved" && !itemsToApprove) {
        itemsToApprove = quote.items.map((item) => item.materialName);
      }
      const updatedItems = quote.items.map((item) => ({
        ...item,
        approved: status === "Approved" ? (itemsToApprove || []).includes(item.materialName) : false
      }));
      await updateQuotation(id, {
        status,
        items: updatedItems
      });
      if (status === "Approved") {
        toast.success(`Quotation approved and linked to MR ${quote.mrId}`);
      } else {
        toast.success(`Quotation ${status.toLowerCase()} successfully`);
      }
      if (viewModal) setViewModal(false);
    } catch (error) {
      toast.error(error.message || "Failed to update status");
    }
  }, "handleStatusUpdate");
  const groupedQuotations = React.useMemo(() => {
    return quotations.reduce((acc, q) => {
      const mr = materialRequirements.find((m) => m.id === q.mrId);
      if (hasPermission("APPROVE_MR_AGM")) {
        const eligibleMR = !mr || ["Approved by Store", "Approved by AGM", "Closed", "Approved", "Quotation Phase", "PO Created"].includes(mr.status);
        if (!eligibleMR && q.status !== "Rejected") {
          return acc;
        }
      }
      if (filterCategory && q.category !== filterCategory) {
        return acc;
      }
      if (filterSupplier && q.supplierName !== filterSupplier) {
        return acc;
      }
      if (filterStatus && q.status !== filterStatus) {
        return acc;
      }
      const key = q.category ? `${q.mrId}|${q.category}` : q.mrId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(q);
      return acc;
    }, {});
  }, [quotations, materialRequirements, hasPermission, filterCategory, filterSupplier, filterStatus]);
  const flatQuotations = React.useMemo(() => {
    return Object.entries(groupedQuotations).flatMap(([key, mrQuotations]) => {
      const [mrId, category] = key.split("|");
      const mr = materialRequirements.find((m) => m.id === mrId);
      return mrQuotations.map((q) => ({ ...q, _mr: mr, _mrId: mrId, _category: category || "" }));
    });
  }, [groupedQuotations, materialRequirements]);
  const getMrDetails = /* @__PURE__ */ __name((mrId) => {
    return materialRequirements.find((m) => m.id === mrId);
  }, "getMrDetails");
  if (loading && quotations.length === 0) {
    return <Skeleton className="h-screen" />;
  }
  return <div className="space-y-6">
      <PageHeader
    title="Quotation Comparison"
    subtitle="Manage and compare supplier quotations separately for each category"
  />

      <div className="mb-6">
        <FilterRow
    showClear={!!(search || startDate || endDate || filterCategory || filterSupplier || filterStatus)}
    onClearAll={() => {
      setSearch("");
      setStartDate("");
      setEndDate("");
      setFilterCategory("");
      setFilterSupplier("");
      setFilterStatus("");
    }}
  >
          <SearchFilter
    value={search}
    onChange={setSearch}
    placeholder="Search by MR ID, Category or Supplier Name..."
    className="flex-1 min-w-[240px]"
  />
          <DateRangePicker
    value={{ start: startDate, end: endDate }}
    onChange={(v) => {
      setStartDate(v.start);
      setEndDate(v.end);
    }}
  />

          <SelectFilter
    value={filterCategory}
    onChange={setFilterCategory}
    options={CATEGORIES}
    placeholder="All Categories"
  />
          <SelectFilter
    value={filterSupplier}
    onChange={setFilterSupplier}
    options={supplierOptions}
    placeholder="All Suppliers"
  />
          <SelectFilter
    value={filterStatus}
    onChange={setFilterStatus}
    options={statusOptions}
    placeholder="All Statuses"
  />
          <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg shrink-0">
            <button onClick={() => setViewMode("card")} className={cn("p-1.5 rounded-md transition-all", viewMode === "card" ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-gray-400 hover:text-gray-600")} title="Card view">
              <LayoutList className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode("table")} className={cn("p-1.5 rounded-md transition-all", viewMode === "table" ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-gray-400 hover:text-gray-600")} title="Table view">
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </FilterRow>
      </div>

      <div className="flex-1 min-h-[500px]">
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">MR No.</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {flatQuotations
                  .filter(q => !tableFilter || [q._mrId, q._mr?.project, q._category, q.supplierName, q.status].some(f => f?.toLowerCase().includes(tableFilter.toLowerCase())))
                  .map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">{formatDate(q.createdAt || "")}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-900 dark:text-white whitespace-nowrap">{safeStr(q._mrId)}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-[150px] truncate">{safeStr(q._mr?.project)}</td>
                    <td className="px-4 py-3 text-xs text-orange-600 dark:text-orange-400 font-medium whitespace-nowrap">{safeStr(q._category)}</td>
                    <td className="px-4 py-3 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">{safeStr(q.supplierName)}</td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900 dark:text-white text-right whitespace-nowrap">{fmt(q.totalAmount)}</td>
                    <td className="px-4 py-3"><StatusBadge status={q.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {hasPermission("VIEW_QUOTATION_DETAILS") && (
                          <button onClick={() => { setSelectedQuotation(q); setViewModal(true); }} className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors" title="View Details">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {q.status !== "Approved" && hasPermission("APPROVE_QUOTATION") && (
                          <button onClick={() => handleStatusUpdate(q.id, "Approved")} className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 transition-colors" title="Approve">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {q.status === "Approved" && hasPermission("REJECT_QUOTATION") && !hasLinkedPO(q) && (
                          <button onClick={() => handleStatusUpdate(q.id, "Rejected")} className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors" title="Reject">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {flatQuotations.length === 0 && !loading && (
              <div className="text-center py-16 text-gray-400">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-bold tracking-widest text-sm">No quotations to compare</p>
              </div>
            )}
          </div>
        ) : (
          <>
        <Virtuoso
    style={{ height: "calc(100vh - 250px)" }}
    data={Object.entries(groupedQuotations)}
    increaseViewportBy={300}
    itemContent={(_index, [key, mrQuotations]) => {
      const [mrId, category] = key.split("|");
      const mr = getMrDetails(mrId);
      const isExpanded = activeMrId === key;
      const bestPrice = Math.min(...mrQuotations.map((q) => q.totalAmount || 0));
      return <div key={key} className="pb-4">
                <div className={cn(
        "bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all",
        mrQuotations.some((q) => q.status === "Pending") && "approval-highlight ring-1 ring-orange-500/10"
      )}>
                  {
        /* MR Header Section */
      }
                  <div
        className="p-4 sm:p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        onClick={() => setActiveMrId(isExpanded ? null : key)}
      >
                    <div className="flex items-center gap-4 sm:gap-6">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 dark:bg-orange-900/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                        <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                           {mrQuotations.some((q) => isNewItem(q.createdAt)) && <span className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest bg-orange-600 text-white animate-pulse">
                                NEW
                             </span>}
                           <h3 className="text-sm sm:text-lg font-black text-gray-900 dark:text-white truncate">
                             MR: {safeStr(mrId)} {category && <span className="text-orange-500 ml-1">({category})</span>}
                           </h3>
                           {mr?.status === "Approved" && <StatusBadge status="Approved" />}
                           {mrQuotations.some((q) => q.status === "Pending") && <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 animate-bounce ml-1">
                               <AlertTriangle className="w-3 h-3" />
                               Pending Review
                             </span>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 overflow-hidden">
                          <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 tracking-widest truncate">{safeStr(mr?.project) || "Unknown project"}</p>
                          <span className="w-1 h-1 bg-gray-300 rounded-full shrink-0" />
                          <p className="text-[10px] sm:text-[11px] font-bold text-orange-500 tracking-widest shrink-0">{mrQuotations.length} Received</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-0 border-gray-50 dark:border-gray-800 pt-3 sm:pt-0">
                      <div className="text-left sm:text-right">
                        <p className="text-[9px] sm:text-[10px] tracking-widest font-black text-gray-400 leading-none">Lowest quote {category ? `(${category})` : ""}</p>
                        <p className="text-sm sm:text-base font-black text-green-500 mt-1">₹ {fmt(bestPrice)}</p>
                      </div>
                      <div className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors">
                        {isExpanded ? <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" /> : <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {
        /* Expansion List of Quotations */
      }
                  <AnimatePresence>
                    {isExpanded && <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
        className="overflow-hidden"
      >
                        <div className="px-4 md:px-6 pb-6 pt-2 bg-gray-50/80 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mt-4">
                            {mrQuotations.map((q, idx) => <motion.div
        key={q.id}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, delay: idx * 0.05 }}
        className={`group relative overflow-hidden p-5 rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${q.status === "Approved" ? "bg-green-50/50 dark:bg-green-900/20 border-green-500/50 shadow-lg shadow-green-500/10" : "bg-white dark:bg-[#1E293B] border-gray-200 dark:border-gray-700 shadow-md"}`}
      >
                                {
        /* Decorative element for approved */
      }
                                {q.status === "Approved" && <div className="absolute top-0 right-0 w-20 h-20 -mr-10 -mt-10 bg-green-500 rotate-45 flex items-end justify-center pb-1 z-10">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  </div>}

                                <div className="flex justify-between items-start mb-5 relative z-10">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
                                      <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-gray-900 dark:text-white leading-tight truncate max-w-[120px] sm:max-w-[140px]">{q.supplierName}</p>
                                      <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-0.5">{safeStr(q.id).split("-").pop()}</p>
                                    </div>
                                  </div>
                                  <StatusBadge status={q.status} />
                                </div>
                                
                                <div className="space-y-3 mb-6 bg-gray-50/80 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50 relative z-10">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-400 tracking-widest">Total amount</span>
                                    <span className={`text-sm font-black ${q.totalAmount === bestPrice ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}`}>₹ {fmt(q.totalAmount)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-400 tracking-widest">Delivery date</span>
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{formatDate(q.deliveryDate || "")}</span>
                                  </div>
                                </div>

                                 <div className="flex gap-2 relative z-10">
                                    {hasLinkedPO(q) && <div className="absolute -top-12 left-0 right-0 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg flex items-center gap-2 z-20">
                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                        <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400">Locked: PO Created</span>
                                      </div>}
                                    {hasPermission("VIEW_QUOTATION_DETAILS") && <button
        onClick={(e) => {
          e.stopPropagation();
          setSelectedQuotation(q);
          setViewModal(true);
        }}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-[11px] font-black transition-all tracking-widest shadow-sm active:scale-95"
      >
                                        <Eye className="w-4 h-4" />
                                        Details
                                      </button>}
                                    {q.status !== "Approved" && hasPermission("APPROVE_QUOTATION") && <button
        onClick={(e) => {
          e.stopPropagation();
          handleStatusUpdate(q.id, "Approved");
        }}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[11px] font-black transition-all tracking-widest shadow-lg shadow-orange-500/20 active:scale-95"
      >
                                        <CheckCircle className="w-4 h-4" />
                                        Approve
                                      </button>}
                                    {q.status === "Approved" && hasPermission("REJECT_QUOTATION") && !hasLinkedPO(q) && <button
        onClick={(e) => {
          e.stopPropagation();
          handleStatusUpdate(q.id, "Rejected");
        }}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-black transition-all tracking-widest shadow-lg shadow-red-500/20 active:scale-95"
      >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                      </button>}
                                 </div>
                              </motion.div>)}
                          </div>
                        </div>
                      </motion.div>}
                  </AnimatePresence>
                </div>
              </div>;
    }}
  />

        {Object.keys(groupedQuotations).length === 0 && !loading && <div className="text-center py-20 bg-white dark:bg-[#1E293B] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <FileText className="w-10 h-10" />
            </div>
            <p className="text-gray-400 font-bold tracking-widest text-sm">No quotations to compare</p>
          </div>}
          </>
        )}
      </div>

      {viewModal && selectedQuotation && (() => {
    const mr = getMrDetails(selectedQuotation.mrId);
    return <Modal
      title={`Quotation \u2014 ${selectedQuotation.id}`}
      wide
      onClose={() => setViewModal(false)}
      footer={<div className="flex flex-wrap items-center gap-2.5 w-full">
              {
        /* Secondary / destructive — left side */
      }
              <div className="flex items-center gap-2 flex-wrap">
                {hasPermission("EDIT_QUOTATION") && <button
        onClick={() => {
          if (hasLinkedPO(selectedQuotation)) {
            toast.error("Cannot edit: A Purchase Order is already linked to this quotation.");
            return;
          }
          setEditModal(true);
        }}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-700/60 text-blue-500 dark:text-blue-400 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
      >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>}
                {hasPermission("DELETE_QUOTATION") && <button
        onClick={() => {
          if (hasLinkedPO(selectedQuotation)) {
            toast.error("Cannot delete: A Purchase Order is already linked to this quotation.");
            return;
          }
          setDeleteConfirm(selectedQuotation.id);
          setViewModal(false);
        }}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 dark:border-red-700/60 text-red-500 dark:text-red-400 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
      >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>}
              </div>

              {
        /* Primary — right side */
      }
              <div className="flex items-center gap-2 ml-auto flex-wrap">
                {selectedQuotation.status !== "Rejected" && hasPermission("REJECT_QUOTATION") && !hasLinkedPO(selectedQuotation) && <button
        onClick={() => handleStatusUpdate(selectedQuotation.id, "Rejected")}
        className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 dark:border-red-700/60 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
      >
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>}
                {hasPermission("APPROVE_QUOTATION") && <button
        onClick={() => {
          if (selectedApprovedItems.length === 0) {
            toast.error("Please select at least one item to approve.");
            return;
          }
          handleStatusUpdate(selectedQuotation.id, "Approved", selectedApprovedItems);
        }}
        disabled={hasLinkedPO(selectedQuotation)}
        className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:hover:bg-green-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-green-500/25"
      >
                    <CheckCircle className="w-3.5 h-3.5" /> {selectedQuotation.status === "Approved" ? "Update Approvals" : "Approve Quotation"}
                  </button>}
                <button
        onClick={() => setViewModal(false)}
        className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
      >
                  Close
                </button>
              </div>
            </div>}
    >
          {
      /* Negative margins to stretch hero to modal edges */
    }
          <div className="-mx-3 sm:-mx-6 -mt-3 sm:-mt-6">

              {
      /* ── Hero Strip ── */
    }
              <div className="bg-gradient-to-br from-white via-gray-50 to-white dark:from-[#0F172A] dark:via-[#1A2744] dark:to-[#0F172A] border-b border-gray-100 dark:border-transparent px-5 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                {
      /* Supplier Avatar */
    }
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Building2 className="w-7 h-7 text-orange-500 dark:text-orange-400" />
                </div>

                {
      /* Supplier Info */
    }
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-orange-600 dark:text-orange-400/80 tracking-[0.2em] mb-1">Supplier Quotation</p>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white truncate leading-tight">{safeStr(selectedQuotation.supplierName)}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">{selectedQuotation.id}</span>
                    {selectedQuotation.date && <span className="text-[11px] text-gray-500">· {formatDate(selectedQuotation.date)}</span>}
                    {selectedQuotation.category && <span className="text-[10px] font-bold text-orange-600 dark:text-orange-300/80 bg-orange-100 dark:bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-400/20">
                        {selectedQuotation.category}
                      </span>}
                  </div>
                </div>

                {
      /* Status + Grand Total */
    }
                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 flex-shrink-0">
                  <StatusBadge status={selectedQuotation.status} />
                  <div className="text-right">
                    <p className="text-[9px] text-gray-500 tracking-widest font-bold">Total Quote</p>
                    <p className="text-2xl font-black text-green-600 dark:text-green-400 leading-none mt-0.5">
                      ₹ {fmt(selectedQuotation.totalAmount || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {
      /* ── Body ── */
    }
              <div className="px-5 sm:px-8 pt-6 pb-2 space-y-6">

                {
      /* Linked MR Banner */
    }
                {mr && <div className="flex items-center gap-3 p-3.5 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/40 rounded-xl">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-orange-500 tracking-[0.15em] ">Linked Material Requirement</p>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5 truncate">
                        {mr.id} · {safeStr(mr.project)}
                        {mr.requesterName && <span className="text-gray-400 font-normal"> · {mr.requesterName}</span>}
                      </p>
                    </div>
                    {mr.location && <span className="text-[10px] text-gray-400 font-medium hidden sm:block flex-shrink-0">{mr.location}</span>}
                  </div>}

                {
      /* Meta Info: 4-cell grid */
    }
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                  {[
      { label: "GST Number", value: safeStr(selectedQuotation.gstNumber) || "\u2014", mono: true },
      { label: "Delivery Date", value: formatDate(selectedQuotation.deliveryDate || ""), orange: true },
      { label: "Contact Person", value: safeStr(selectedQuotation.ownerName) || "\u2014" },
      { label: "Mobile", value: safeStr(selectedQuotation.mobile) || "\u2014" }
    ].map(({ label, value, mono, orange }) => <div key={label} className="bg-white dark:bg-[#1E293B] px-4 py-3.5">
                      <p className="text-[9px] font-black text-gray-400 tracking-[0.12em] mb-1.5">{label}</p>
                      <p className={cn(
      "text-[13px] font-bold truncate",
      mono && "font-mono text-[12px]",
      orange ? "text-orange-500" : "text-gray-800 dark:text-gray-100"
    )}>{value}</p>
                    </div>)}
                </div>

                {
      /* ── Quoted Items Table ── */
    }
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-black text-gray-400 tracking-[0.15em] ">Quoted Items</span>
                    <span className="ml-1 text-[10px] font-bold text-gray-300 dark:text-gray-600">
                      ({selectedQuotation.items.length})
                    </span>
                  </div>

                  <div className="border border-gray-100 dark:border-gray-700/60 rounded-xl overflow-hidden shadow-sm">
                    {
      /* Table — desktop */
    }
                    <div className="hidden sm:block">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700/60">
                            <th className="px-5 py-3 text-center text-[9px] font-black text-gray-400 tracking-[0.15em] w-16">Approve</th>
                            <th className="px-5 py-3 text-[9px] font-black text-gray-400 tracking-[0.15em] ">Description</th>
                            <th className="px-4 py-3 text-center text-[9px] font-black text-gray-400 tracking-[0.15em] w-20">Required</th>
                            <th className="px-4 py-3 text-center text-[9px] font-black text-gray-400 tracking-[0.15em] w-20">Offered</th>
                            <th className="px-4 py-3 text-right text-[9px] font-black text-gray-400 tracking-[0.15em] ">Rate</th>
                            <th className="px-4 py-3 text-right text-[9px] font-black text-gray-400 tracking-[0.15em] ">GST</th>
                            <th className="px-5 py-3 text-right text-[9px] font-black text-gray-400 tracking-[0.15em] ">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40 bg-white dark:bg-gray-900/30">
                          {selectedQuotation.items.map((item, idx) => {
      const mrItem = mr?.items?.find((m) => m.materialName === item.materialName);
      const reqQty = item.mrQty !== void 0 ? item.mrQty : mrItem?.qty !== void 0 ? mrItem.qty : item.qty;
      const reqUnit = item.mrUnit || mrItem?.unit || item.unit;
      const base = item.qty * item.rate;
      const gstAmt = item.gstType === "Exclusive" ? base * (item.gstPct || 0) / 100 : 0;
      const total = base + gstAmt;
      return <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                                <td className="px-4 py-4 text-center">
                                  <Checkbox
        checked={selectedApprovedItems.includes(item.materialName)}
        disabled={!hasPermission("APPROVE_QUOTATION") || hasLinkedPO(selectedQuotation)}
        onChange={(e) => {
          if (e.target.checked) {
            setSelectedApprovedItems([...selectedApprovedItems, item.materialName]);
          } else {
            setSelectedApprovedItems(selectedApprovedItems.filter((name) => name !== item.materialName));
          }
        }}
      />
                                </td>
                                <td className="px-5 py-4">
                                  <p className="text-[13px] font-bold text-gray-900 dark:text-white">{safeStr(item.materialName)}</p>
                                  {item.sku && <p className="text-[9px] font-bold text-gray-400 tracking-widest mt-0.5 ">{safeStr(item.sku)}</p>}
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <span className="text-sm font-black text-gray-800 dark:text-gray-100">{reqQty}</span>
                                  <span className="text-[9px] block font-bold text-gray-400 mt-0.5">{safeStr(reqUnit)}</span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <span className="text-sm font-black text-orange-500">{item.qty}</span>
                                  <span className="text-[9px] block font-bold text-orange-400 mt-0.5">{safeStr(item.unit)}</span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400">₹ {fmt(item.rate)}</span>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <span className="text-[12px] font-bold text-orange-500">{item.gstPct}%</span>
                                  <span className="text-[9px] text-gray-400 ml-1">({item.gstType === "Exclusive" ? "E" : "I"})</span>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <span className="text-sm font-black text-gray-900 dark:text-white">₹ {fmt(total)}</span>
                                </td>
                              </tr>;
    })}
                        </tbody>

                        {
      /* Charges + Grand Total footer */
    }
                        <tfoot className="border-t-2 border-gray-100 dark:border-gray-700">
                          {selectedQuotation.freightAmount ? <tr className="bg-gray-50/40 dark:bg-gray-800/20">
                              <td colSpan={6} className="px-5 py-2.5 text-right">
                                <span className="text-[10px] font-bold text-gray-500">Freight Charges</span>
                                <span className="text-[9px] text-orange-400 ml-1.5">({selectedQuotation.freightGstPct}% GST · {selectedQuotation.freightGstType})</span>
                              </td>
                              <td className="px-5 py-2.5 text-right text-xs font-bold text-gray-600 dark:text-gray-400">+ ₹ {fmt(selectedQuotation.freightAmount)}</td>
                            </tr> : null}
                          {selectedQuotation.loadingAmount ? <tr className="bg-gray-50/40 dark:bg-gray-800/20">
                              <td colSpan={6} className="px-5 py-2.5 text-right">
                                <span className="text-[10px] font-bold text-gray-500">Loading Charges</span>
                                <span className="text-[9px] text-orange-400 ml-1.5">({selectedQuotation.loadingGstPct}% GST · {selectedQuotation.loadingGstType})</span>
                              </td>
                              <td className="px-5 py-2.5 text-right text-xs font-bold text-gray-600 dark:text-gray-400">+ ₹ {fmt(selectedQuotation.loadingAmount)}</td>
                            </tr> : null}
                          {selectedQuotation.unloadingAmount ? <tr className="bg-gray-50/40 dark:bg-gray-800/20">
                              <td colSpan={6} className="px-5 py-2.5 text-right">
                                <span className="text-[10px] font-bold text-gray-500">Unloading Charges</span>
                                <span className="text-[9px] text-orange-400 ml-1.5">({selectedQuotation.unloadingGstPct}% GST · {selectedQuotation.unloadingGstType})</span>
                              </td>
                              <td className="px-5 py-2.5 text-right text-xs font-bold text-gray-600 dark:text-gray-400">+ ₹ {fmt(selectedQuotation.unloadingAmount)}</td>
                            </tr> : null}
                          <tr className="bg-green-50 dark:bg-green-950/30">
                            <td colSpan={6} className="px-5 py-3.5 text-right">
                              <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-[0.15em] ">Grand Total</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="text-base font-black text-green-600 dark:text-green-400">₹ {fmt(selectedQuotation.totalAmount || 0)}</span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {
      /* Mobile cards */
    }
                    <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-700/40">
                      {selectedQuotation.items.map((item, idx) => {
      const mrItem = mr?.items?.find((m) => m.materialName === item.materialName);
      const reqQty = item.mrQty !== void 0 ? item.mrQty : mrItem?.qty !== void 0 ? mrItem.qty : item.qty;
      const reqUnit = item.mrUnit || mrItem?.unit || item.unit;
      const base = item.qty * item.rate;
      const gstAmt = item.gstType === "Exclusive" ? base * (item.gstPct || 0) / 100 : 0;
      const total = base + gstAmt;
      return <div key={idx} className="p-4 bg-white dark:bg-gray-900/30">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <Checkbox
        checked={selectedApprovedItems.includes(item.materialName)}
        disabled={!hasPermission("APPROVE_QUOTATION") || hasLinkedPO(selectedQuotation)}
        onChange={(e) => {
          if (e.target.checked) {
            setSelectedApprovedItems([...selectedApprovedItems, item.materialName]);
          } else {
            setSelectedApprovedItems(selectedApprovedItems.filter((name) => name !== item.materialName));
          }
        }}
      />
                                <div>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">{safeStr(item.materialName)}</p>
                                  {item.sku && <p className="text-[9px] font-bold text-gray-400 tracking-widest mt-0.5 ">{safeStr(item.sku)}</p>}
                                </div>
                              </div>
                              <p className="text-sm font-black text-gray-900 dark:text-white">₹ {fmt(total)}</p>
                            </div>
                            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/40 pl-7">
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 tracking-widest">Required</p>
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-0.5">{reqQty} <span className="text-[9px] font-normal text-gray-500">{reqUnit}</span></p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 tracking-widest">Offered</p>
                                <p className="text-xs font-bold text-orange-500 mt-0.5">{item.qty} <span className="text-[9px] font-normal text-orange-300">{item.unit}</span></p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 tracking-widest">Rate</p>
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-0.5">₹ {fmt(item.rate)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-bold text-gray-400 tracking-widest">GST</p>
                                <p className="text-xs font-bold text-orange-500 mt-0.5">{item.gstPct}%</p>
                              </div>
                            </div>
                          </div>;
    })}
                      {
      /* Mobile grand total */
    }
                      <div className="flex justify-between items-center px-4 py-3.5 bg-green-50 dark:bg-green-950/30">
                        <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-widest ">Grand Total</span>
                        <span className="text-sm font-black text-green-600 dark:text-green-400">₹ {fmt(selectedQuotation.totalAmount || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {
      /* ── Original MR Specification ── */
    }
                {mr && mr.items?.length > 0 && <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[10px] font-black text-gray-400 tracking-[0.15em] ">Original MR Specification</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {mr.items.map((mItem, idx) => <div key={idx} className="flex items-center justify-between gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/50">
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-gray-800 dark:text-gray-200 truncate">{safeStr(mItem.materialName)}</p>
                            <p className="text-[9px] font-bold text-gray-400 tracking-widest mt-0.5 ">Needed: {safeStr(mItem.qty)} {safeStr(mItem.unit)}</p>
                          </div>
                          <span className="flex-shrink-0 text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-2.5 py-1.5 rounded-lg border border-red-100 dark:border-red-800/40">
                            Purchase: {safeStr(mItem.remainingQty !== void 0 ? mItem.remainingQty : mItem.qty)} {safeStr(mItem.unit)}
                          </span>
                        </div>)}
                    </div>
                  </div>}

                {
      /* ── Remarks ── */
    }
                {selectedQuotation.remarks && <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/40">
                    <p className="text-[9px] font-black text-orange-500 dark:text-amber-400 tracking-[0.15em] mb-1.5">Remarks</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">"{selectedQuotation.remarks}"</p>
                  </div>}
              </div>

            </div>
          </Modal>;
  })()}

      {
    /* Edit Modal */
  }
      {editModal && selectedQuotation && <Modal
    title="Edit Quotation"
    onClose={() => setEditModal(false)}
    className="max-w-5xl"
    footer={<div className="flex justify-end gap-3 w-full">
              <Btn label="Cancel" variant="secondary" outline onClick={() => setEditModal(false)} disabled={actionLoading} className="px-6 rounded-xl" />
              <Btn label="Save Changes" onClick={() => {
      const form = document.getElementById("edit-quotation-form");
      if (form) form.requestSubmit();
    }} loading={actionLoading} disabled={actionLoading} className="px-8 rounded-xl shadow-lg shadow-orange-500/20" />
            </div>}
  >
          <QuotationForm
    initialData={selectedQuotation}
    mrData={materialRequirements.find((m) => m.id === selectedQuotation.mrId)}
    onClose={() => setEditModal(false)}
    onSave={async (data) => {
      const updatedData = { ...data, status: "Pending" };
      const result = await updateQuotation(selectedQuotation.id, updatedData);
      const mr = materialRequirements.find((m) => m.id === selectedQuotation.mrId);
      if (mr?.approvedQuotationId === selectedQuotation.id) {
        try {
          await updateMaterialRequirement(mr.id, {
            approvedQuotationId: "",
            approvedSupplier: ""
          });
        } catch (err) {
          console.error("Failed to clear MR link during quote edit:", err);
        }
      }
      setSelectedQuotation(result);
      addNotification({
        message: `Quotation for ${selectedQuotation.supplierName} (MR: ${selectedQuotation.mrId}) has been edited and requires re-approval.`,
        severity: "info",
        path: "quotations"
      });
      setEditModal(false);
      toast.success("Quotation updated and sent for re-approval");
    }}
  />
        </Modal>}

      {
    /* Delete Confirmation */
  }
      {deleteConfirm && <ConfirmModal
    title="Delete Quotation"
    message="Are you sure you want to delete this quotation? This action cannot be undone."
    onConfirm={async () => {
      await deleteQuotation(deleteConfirm);
      setDeleteConfirm(null);
    }}
    onCancel={() => setDeleteConfirm(null)}
  />}
    </div>;
}, "Quotations");
const QuotationForm = /* @__PURE__ */ __name(({ initialData, mrData: initialMrData, onClose, onSave }) => {
  const [formData, setFormData] = useState(() => {
    return {
      ...initialData,
      items: initialData.items?.map((i) => {
        const mrItem = initialMrData?.items?.find((m) => m.materialName?.trim().toLowerCase() === i.materialName?.trim().toLowerCase());
        const fallbackQty = mrItem ? mrItem.remainingQty !== void 0 ? mrItem.remainingQty : mrItem.qty : i.qty;
        return {
          ...i,
          mrQty: i.mrQty !== void 0 ? i.mrQty : fallbackQty,
          mrUnit: i.mrUnit || mrItem?.unit || i.unit
        };
      })
    };
  });
  const [loading, setLoading] = useState(false);
  const [mrData, setMrData] = useState(initialMrData);
  const [showSupplierResults, setShowSupplierResults] = useState(false);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  React.useEffect(() => {
    if (!mrData && initialData.mrId) {
      api.get(`public/mr/${initialData.mrId}`).then((res) => {
        if (res.success) setMrData(res.data);
      }).catch(console.error);
    }
  }, [initialData.mrId, mrData]);
  const handleSupplierSearch = /* @__PURE__ */ __name(async (val) => {
    setFormData({ ...formData, supplierName: val });
    if (val.length > 1) {
      try {
        const res = await api.get("public/suppliers", { search: val });
        if (res.success) {
          setFilteredSuppliers(res.data);
          setShowSupplierResults(true);
        }
      } catch (err) {
        console.error("Supplier search failed", err);
      }
    } else {
      setShowSupplierResults(false);
    }
  }, "handleSupplierSearch");
  const selectSupplier = /* @__PURE__ */ __name((s) => {
    setFormData({
      ...formData,
      supplierName: s.companyName || s.name,
      supplierId: s.id || s._id,
      ownerName: s.ownerName || s.contact,
      mobile: s.mobile || s.phone,
      gstNumber: s.gstNumber || s.gst
    });
    setShowSupplierResults(false);
  }, "selectSupplier");
  const calculateChargeTotal = /* @__PURE__ */ __name((amount, gstPct, gstType) => {
    if (!amount) return 0;
    if (gstType === "Exclusive") {
      return amount + amount * gstPct / 100;
    }
    return amount;
  }, "calculateChargeTotal");
  const handleItemChange = /* @__PURE__ */ __name((idx, field, value) => {
    const newItems = [...formData.items || []];
    newItems[idx] = { ...newItems[idx], [field]: value };
    const itemsTotal = newItems.reduce((sum, item) => {
      const base = item.qty * item.rate;
      const gst = item.gstType === "Exclusive" ? base * (item.gstPct || 0) / 100 : 0;
      return sum + (item.gstType === "Exclusive" ? base + gst : base);
    }, 0);
    const freightTotal = calculateChargeTotal(formData.freightAmount || 0, formData.freightGstPct || 0, formData.freightGstType || "Exclusive");
    const loadingTotal = calculateChargeTotal(formData.loadingAmount || 0, formData.loadingGstPct || 0, formData.loadingGstType || "Exclusive");
    const unloadingTotal = calculateChargeTotal(formData.unloadingAmount || 0, formData.unloadingGstPct || 0, formData.unloadingGstType || "Exclusive");
    setFormData({ ...formData, items: newItems, totalAmount: itemsTotal + freightTotal + loadingTotal + unloadingTotal });
  }, "handleItemChange");
  const handleChargeChange = /* @__PURE__ */ __name((field, value) => {
    const newFormData = { ...formData, [field]: value };
    const itemsTotal = (newFormData.items || []).reduce((sum, item) => {
      const base = item.qty * item.rate;
      const gst = item.gstType === "Exclusive" ? base * (item.gstPct || 0) / 100 : 0;
      return sum + (item.gstType === "Exclusive" ? base + gst : base);
    }, 0);
    const freightTotal = calculateChargeTotal(newFormData.freightAmount || 0, newFormData.freightGstPct || 0, newFormData.freightGstType || "Exclusive");
    const loadingTotal = calculateChargeTotal(newFormData.loadingAmount || 0, newFormData.loadingGstPct || 0, newFormData.loadingGstType || "Exclusive");
    const unloadingTotal = calculateChargeTotal(newFormData.unloadingAmount || 0, newFormData.unloadingGstPct || 0, newFormData.unloadingGstType || "Exclusive");
    setFormData({ ...newFormData, totalAmount: itemsTotal + freightTotal + loadingTotal + unloadingTotal });
  }, "handleChargeChange");
  const handleSubmit = /* @__PURE__ */ __name(async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, "handleSubmit");
  return <div className="-mx-6 -my-6 bg-gray-50/50 dark:bg-[#020617] p-6 sm:p-8 overflow-y-auto max-h-[85vh]">
      <form id="edit-quotation-form" onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
        
        {
    /* Requirement overview */
  }
        <Card className="p-6 sm:p-10 border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-[#0f172a]">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
              <h3 className="text-xs font-bold text-gray-900 dark:text-white tracking-widest">Requirement overview</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 tracking-widest px-1">Project Name</label>
                <div className="h-12 flex items-center px-4 bg-gray-50/50 dark:bg-gray-400/5 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-300">
                  {mrData?.project || "N/A"}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 tracking-widest px-1">Delivery Location</label>
                <div className="h-12 flex items-center px-4 bg-gray-50/50 dark:bg-gray-400/5 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-300">
                  {mrData?.location || "N/A"}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 tracking-widest px-1">Target Delivery Date</label>
                <div className="h-12 flex items-center px-4 bg-gray-50/50 dark:bg-gray-400/5 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-300">
                  {mrData?.requirementDate || "ASAP"}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {
    /* Supplier details */
  }
        <Card className="p-6 sm:p-10 overflow-visible border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-[#0f172a]">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
              <h3 className="text-xs font-bold text-gray-900 dark:text-white tracking-widest">Supplier details</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="relative lg:col-span-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 tracking-widest px-1">Search Company / Firm Name *</label>
                  <input
    type="text"
    value={formData.supplierName || ""}
    onChange={(e) => handleSupplierSearch(e.target.value)}
    onFocus={() => (formData.supplierName || "").length > 1 && setShowSupplierResults(true)}
    placeholder="Type to search your registered name..."
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 transition-all font-semibold h-12"
    required
    autoComplete="off"
  />
                  <AnimatePresence>
                    {showSupplierResults && filteredSuppliers.length > 0 && <motion.div
    initial={{ opacity: 0, y: -10, scale: 0.98 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -10, scale: 0.98 }}
    className="absolute z-50 w-full mt-2 bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-gray-700 rounded-2xl shadow-2xl max-h-80 overflow-y-auto backdrop-blur-xl"
  >
                        {filteredSuppliers.map((s) => <button
    key={s.id || s._id}
    type="button"
    onClick={() => selectSupplier(s)}
    className="w-full text-left px-5 py-4 hover:bg-orange-50/50 dark:hover:bg-orange-500/5 border-b border-gray-50 dark:border-gray-700 last:border-0 transition-all flex items-center gap-4 group"
  >
                            <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg group-hover:bg-orange-100 dark:group-hover:bg-orange-500/20 transition-colors">
                              <Building2 className="w-5 h-5 text-orange-500" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{s.companyName || s.name}</p>
                              <p className="text-[10px] text-gray-400 font-semibold tracking-widest mt-0.5">{s.ownerName || s.contact} &bull; {s.mobile || s.phone}</p>
                            </div>
                          </button>)}
                      </motion.div>}
                  </AnimatePresence>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-12 mt-0">
                  <DatePicker
    label="Expected Delivery Date *"
    value={formData.deliveryDate ? formData.deliveryDate.split("T")[0] : ""}
    onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
    required
    className="w-full"
  />
                </div>
              </div>
            </div>
            
            <AnimatePresence>
              {(formData.ownerName || formData.mobile || formData.gstNumber) && <motion.div
    initial={{ opacity: 0, scale: 0.98 }}
    animate={{ opacity: 1, scale: 1 }}
    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 bg-gray-50/30 dark:bg-gray-500/5 p-8 rounded-3xl border border-gray-100 dark:border-gray-800"
  >
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 tracking-widest px-1">Contact person</label>
                    <div className="h-12 flex items-center px-4 bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white">
                      {formData.ownerName || "---"}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 tracking-widest px-1">Mobile number</label>
                    <div className="h-12 flex items-center px-4 bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white">
                      {formData.mobile || "---"}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 tracking-widest px-1">Gst number</label>
                    <div className="h-12 flex items-center px-4 bg-white/50 dark:bg-black/20 border border-gray-100 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-900 dark:text-white font-mono tracking-wider">
                      {formData.gstNumber || "---"}
                    </div>
                  </div>
                </motion.div>}
            </AnimatePresence>
          </div>
        </Card>

        {
    /* Item Pricing */
  }
        <Card className="overflow-visible border-gray-100 dark:border-gray-800 shadow-sm bg-white dark:bg-[#0f172a]">
          <div className="p-6 sm:p-8 bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 rounded-t-2xl">
            <h3 className="text-[13px] font-bold text-gray-900 dark:text-white tracking-wider">Price quotation (per item)</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-gray-800 text-[10px] font-bold text-gray-400 tracking-widest border-b border-gray-100 dark:border-gray-800">
                  <th className="px-6 py-5 w-1/4">Item details</th>
                  <th className="px-4 py-3 text-center w-24">Required</th>
                  <th className="px-4 py-3 text-center w-32">Offer Qty</th>
                  <th className="px-4 py-3 text-center w-40">Rate (₹)</th>
                  <th className="px-4 py-3 text-center">Gst details</th>
                  <th className="px-6 py-5 text-right w-40">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {formData.items?.map((item, idx) => {
    const reqQty = item.mrQty;
    const reqUnit = item.mrUnit || "NOS";
    const base = item.qty * item.rate;
    const gst = item.gstType === "Exclusive" ? base * (item.gstPct || 0) / 100 : 0;
    const total = item.gstType === "Exclusive" ? base + gst : base;
    return <tr key={idx} className="transition-all group hover:bg-gray-50/20 dark:hover:bg-gray-800/10">
                      <td className="px-6 py-6">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight mb-1">{item.materialName}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded font-medium tracking-wider">Category</span>
                          <span className="text-[10px] text-gray-400 font-mono">{item.category || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-6 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-gray-900 dark:text-white text-base">{reqQty}</span>
                          <span className="text-[10px] font-medium text-gray-400 tracking-widest">{reqUnit || "NOS"}</span>
                        </div>
                      </td>
                      <td className="px-2 py-6">
                        <div className="flex flex-col items-center gap-1.5 w-full max-w-[90px] mx-auto">
                          <input
      type="number"
      required
      placeholder="Qty"
      value={item.qty === 0 ? "" : item.qty}
      onChange={(e) => handleItemChange(idx, "qty", parseFloat(e.target.value) || 0)}
      className="w-full text-center bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-md h-9 text-[13px] font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 transition-all px-1"
    />
                          <input
      type="text"
      required
      placeholder="Unit"
      value={item.unit || ""}
      onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
      className="w-full text-center bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-md h-7 text-[10px] font-bold text-gray-700 dark:text-gray-300 uppercase focus:outline-none focus:border-orange-500 transition-all px-1"
    />
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="w-full max-w-[120px] mx-auto">
                          <input
      type="number"
      required
      placeholder="0.00"
      value={item.rate === 0 ? "" : item.rate}
      onChange={(e) => handleItemChange(idx, "rate", parseFloat(e.target.value) || 0)}
      className="w-full text-center bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg h-10 text-[14px] font-semibold text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 transition-all px-2"
    />
                        </div>
                      </td>
                      <td className="px-4 py-6">
                        <div className="flex items-center gap-2 justify-center min-w-[220px]">
                          <select
      value={item.gstPct}
      onChange={(e) => handleItemChange(idx, "gstPct", parseInt(e.target.value) || 0)}
      className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] font-medium text-gray-900 dark:text-gray-100 px-3 py-2 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
    >
                            <option value={0}>0% GST</option>
                            <option value={5}>5% GST</option>
                            <option value={12}>12% GST</option>
                            <option value={18}>18% GST</option>
                            <option value={28}>28% GST</option>
                          </select>
                          <select
      value={item.gstType}
      onChange={(e) => handleItemChange(idx, "gstType", e.target.value)}
      className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] font-semibold text-gray-900 dark:text-gray-100 px-3 py-2 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
    >
                            <option value="Exclusive">Exclusive</option>
                            <option value="Inclusive">Inclusive</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <p className="text-[10px] font-medium text-gray-400 tracking-widest mb-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Line total</p>
                        <span className="text-base font-bold text-gray-900 dark:text-white">
                          ₹ {fmt(total)}
                        </span>
                      </td>
                    </tr>;
  })}
              </tbody>
            </table>
          </div>

          <div className="bg-[#1a2332] dark:bg-[#1a2332] p-6 sm:px-8 border-t border-gray-100 dark:border-gray-800/50 space-y-3 rounded-b-2xl">
            <div className="flex justify-between items-center text-[13px] font-medium text-gray-500 dark:text-gray-400">
              <span>Items Subtotal:</span>
              <span className="font-bold text-gray-700 dark:text-gray-300">
                ₹ {fmt(formData.items?.reduce((sum, item) => {
    const base = item.qty * item.rate;
    const gst = item.gstType === "Exclusive" ? base * (item.gstPct || 0) / 100 : 0;
    return sum + (item.gstType === "Exclusive" ? base + gst : base);
  }, 0))}
              </span>
            </div>
            
            {(formData.freightAmount || 0) > 0 && <div className="flex justify-between items-center text-[13px] font-medium text-gray-500 dark:text-gray-400">
                <span>Freight Charges ({formData.freightGstPct || 0}% GST {formData.freightGstType}):</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  ₹ {fmt(calculateChargeTotal(formData.freightAmount || 0, formData.freightGstPct || 0, formData.freightGstType || "Exclusive"))}
                </span>
              </div>}
            
            {(formData.loadingAmount || 0) > 0 && <div className="flex justify-between items-center text-[13px] font-medium text-gray-500 dark:text-gray-400">
                <span>Loading Charges ({formData.loadingGstPct || 0}% GST {formData.loadingGstType}):</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  ₹ {fmt(calculateChargeTotal(formData.loadingAmount || 0, formData.loadingGstPct || 0, formData.loadingGstType || "Exclusive"))}
                </span>
              </div>}

            {(formData.unloadingAmount || 0) > 0 && <div className="flex justify-between items-center text-[13px] font-medium text-gray-500 dark:text-gray-400">
                <span>Unloading Charges ({formData.unloadingGstPct || 0}% GST {formData.unloadingGstType}):</span>
                <span className="font-bold text-gray-700 dark:text-gray-300">
                  ₹ {fmt(calculateChargeTotal(formData.unloadingAmount || 0, formData.unloadingGstPct || 0, formData.unloadingGstType || "Exclusive"))}
                </span>
              </div>}

            <div className="h-px bg-gray-200 dark:bg-gray-800/80 my-4" />

            <div className="flex justify-between items-center mt-2">
              <p className="font-bold text-gray-900 dark:text-white tracking-wide text-sm">Estimated Grand Total</p>
              <span className="text-3xl font-black text-orange-500 tracking-tight">₹ {fmt(formData.totalAmount)}</span>
            </div>
          </div>
        </Card>

        {
    /* Other Charges */
  }
        <Card className="p-6 sm:p-8 bg-gray-50/30 dark:bg-[#1E293B] border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="mb-6 flex items-center gap-4">
            <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-white tracking-widest">Other Charges</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {
    /* Freight */
  }
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-400 tracking-widest">Freight Charges (₹)</label>
              <input
    type="number"
    placeholder="0.00"
    value={formData.freightAmount || ""}
    onChange={(e) => handleChargeChange("freightAmount", parseFloat(e.target.value) || 0)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 px-4 h-12 outline-none focus:border-orange-500 transition-all box-border"
  />
              <div className="grid grid-cols-2 gap-3">
                <select
    value={formData.freightGstPct || 0}
    onChange={(e) => handleChargeChange("freightGstPct", parseInt(e.target.value) || 0)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] font-bold text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                  <option value={0}>0% GST</option>
                  <option value={5}>5% GST</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST</option>
                  <option value={28}>28% GST</option>
                </select>
                <select
    value={formData.freightGstType || "Exclusive"}
    onChange={(e) => handleChargeChange("freightGstType", e.target.value)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[12px] font-bold text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                  <option value="Exclusive">Exclusive</option>
                  <option value="Inclusive">Inclusive</option>
                </select>
              </div>
            </div>

            {
    /* Loading */
  }
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-400 tracking-widest">Loading Charges (₹)</label>
              <input
    type="number"
    placeholder="0.00"
    value={formData.loadingAmount || ""}
    onChange={(e) => handleChargeChange("loadingAmount", parseFloat(e.target.value) || 0)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 px-4 h-12 outline-none focus:border-orange-500 transition-all box-border"
  />
              <div className="grid grid-cols-2 gap-3">
                <select
    value={formData.loadingGstPct || 0}
    onChange={(e) => handleChargeChange("loadingGstPct", parseInt(e.target.value) || 0)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] font-bold text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                  <option value={0}>0% GST</option>
                  <option value={5}>5% GST</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST</option>
                  <option value={28}>28% GST</option>
                </select>
                <select
    value={formData.loadingGstType || "Exclusive"}
    onChange={(e) => handleChargeChange("loadingGstType", e.target.value)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[12px] font-bold text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                  <option value="Exclusive">Exclusive</option>
                  <option value="Inclusive">Inclusive</option>
                </select>
              </div>
            </div>

            {
    /* Unloading */
  }
            <div className="space-y-3">
              <label className="text-[11px] font-bold text-gray-400 tracking-widest">Unloading Charges (₹)</label>
              <input
    type="number"
    placeholder="0.00"
    value={formData.unloadingAmount || ""}
    onChange={(e) => handleChargeChange("unloadingAmount", parseFloat(e.target.value) || 0)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-900 dark:text-gray-100 px-4 h-12 outline-none focus:border-orange-500 transition-all box-border"
  />
              <div className="grid grid-cols-2 gap-3">
                <select
    value={formData.unloadingGstPct || 0}
    onChange={(e) => handleChargeChange("unloadingGstPct", parseInt(e.target.value) || 0)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] font-bold text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                  <option value={0}>0% GST</option>
                  <option value={5}>5% GST</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST</option>
                  <option value={28}>28% GST</option>
                </select>
                <select
    value={formData.unloadingGstType || "Exclusive"}
    onChange={(e) => handleChargeChange("unloadingGstType", e.target.value)}
    className="w-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl text-[12px] font-bold text-gray-900 dark:text-gray-100 px-3 h-11 outline-none focus:border-orange-500 transition-all cursor-pointer box-border"
  >
                  <option value="Exclusive">Exclusive</option>
                  <option value="Inclusive">Inclusive</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {
    /* Remarks */
  }
        <Card className="p-6 sm:p-8 bg-white dark:bg-[#0f172a] border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
              <h3 className="text-xs font-bold text-gray-900 dark:text-white tracking-widest">Remarks</h3>
            </div>
            <textarea
    value={formData.remarks || ""}
    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
    className="w-full bg-gray-50/50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
    rows={3}
    placeholder="Any additional remarks..."
  />
          </div>
        </Card>

      </form>
    </div>;
}, "QuotationForm");
const ConfirmModal = /* @__PURE__ */ __name(({ title, message, onConfirm, onCancel, loading }) => <Modal title={title} onClose={onCancel}>
    <div className="space-y-6">
      <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl flex items-start gap-4">
        <AlertTriangle className="w-6 h-6 shrink-0 mt-1" />
        <p className="text-sm font-medium leading-relaxed">{message}</p>
      </div>
      <div className="flex gap-3 justify-end">
        <Btn label="Cancel" outline onClick={onCancel} />
        <Btn label="Delete Permanently" color="red" onClick={onConfirm} loading={loading} />
      </div>
    </div>
  </Modal>, "ConfirmModal");
const Field = /* @__PURE__ */ __name(({ label, value, onChange, placeholder, type = "text", required = false, small = false, icon: Icon }) => <div className={`space-y-1 ${small ? "mb-0" : "mb-4"}`}>
    {label && <label className={`block font-black text-gray-500 tracking-widest ${small ? "text-[10px]" : "text-[11px] ml-1"}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>}
    <div className="relative">
      {Icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon className="w-4 h-4" />
        </div>}
      <input
  type={type}
  value={value}
  onChange={onChange}
  placeholder={placeholder}
  required={required}
  className={cn(
    "w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl transition-all focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold outline-none",
    small ? "px-3 py-1.5 text-xs" : "px-4 py-3 text-sm",
    Icon && "pl-10"
  )}
/>
    </div>
  </div>, "Field");
export {
  Quotations
};
