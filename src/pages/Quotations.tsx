import React, { useState, useEffect } from "react";
import { useAppStore } from "../store";
import { 
  PageHeader, 
  Card, 
  StatusBadge, 
  Btn, 
  Modal, 
  Pagination,
  Skeleton,
  DateField,
  Checkbox
} from "../components/ui";
import { SearchFilter, DateRangePicker, SelectFilter, FilterRow } from "../components/ui/Filters";
import { 
  FileText, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Building2, 
  Calendar, 
  TrendingUp,
  Package,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  Search,
  AlertTriangle,
  Edit2,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Quotation, MaterialRequirement } from "../types";
import { formatDateTime, formatDate, fmt, safeStr, isNewItem } from "../utils";
import { toast } from "react-hot-toast";
import { cn } from "../lib/utils";
import { Virtuoso } from "react-virtuoso";

export const Quotations = () => {
  const { 
    quotations, 
    quotationsPagination, 
    fetchResource, 
    updateQuotation,
    deleteQuotation,
    updateMaterialRequirement,
    materialRequirements,
    pos,
    addNotification,
    loading,
    role,
    hasPermission,
    settings
  } = useAppStore();
  
  const { projects: PROJECTS = [], categories: CATEGORIES = [] } = settings;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [filterProject, setFilterProject] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const supplierOptions = React.useMemo(() => {
    const uniqueSuppliers = Array.from(new Set(quotations.map(q => q.supplierName).filter(Boolean)));
    return uniqueSuppliers.sort();
  }, [quotations]);

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
    const filterObj: any = {};
    if (filterCategory) filterObj.category = filterCategory;
    if (filterSupplier) filterObj.supplierName = filterSupplier;
    if (filterStatus) filterObj.status = filterStatus;
    const finalFilter = Object.keys(filterObj).length > 0 ? filterObj : null;

    fetchResource("quotations", 1, 1000, true, debouncedSearch, finalFilter, false, false, startDate, endDate);
    fetchResource("material-requirements", 1, 1000, true);
    fetchResource("pos", 1, 1000, true);
  }, [fetchResource, debouncedSearch, startDate, endDate, filterCategory, filterSupplier, filterStatus]);

  const [viewModal, setViewModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [activeMrId, setActiveMrId] = useState<string | null>(null);

  const [selectedApprovedItems, setSelectedApprovedItems] = useState<string[]>([]);

  useEffect(() => {
    if (selectedQuotation) {
      const approved = (selectedQuotation.items || []).filter(item => item.approved).map(item => item.materialName);
      if (approved.length === 0 && selectedQuotation.status === 'Approved') {
        // Fallback for legacy approved quotations: auto-check all items
        setSelectedApprovedItems(selectedQuotation.items.map(item => item.materialName));
      } else {
        setSelectedApprovedItems(approved);
      }
    } else {
      setSelectedApprovedItems([]);
    }
  }, [selectedQuotation]);

  const isQuoteLocked = (quote: Quotation) => {
    const mr = materialRequirements.find(m => m.id === quote.mrId);
    if (!mr) return false;
    
    // Check if this specific quotation is in the approvals list
    if (mr.approvals?.some(a => a.quotationId === quote.id)) return true;
    
    // Legacy support
    return mr.approvedQuotationId === quote.id;
  };

  const hasLinkedPO = (quote: Quotation) => {
    return pos.some(po => 
      po.mrId === quote.mrId && 
      (po.supplier === quote.supplierName || po.supplier === quote.supplierId) &&
      po.status !== 'rejected' &&
      // If we have category info in PO, check it too (future proofing)
      (!quote.category || (po as any).category === quote.category)
    );
  };

  const handleStatusUpdate = async (id: string, status: 'Approved' | 'Rejected', approvedItems?: string[]) => {
    try {
      const quote = quotations.find(q => q.id === id);
      if (!quote) return;

      let itemsToApprove = approvedItems;
      if (status === 'Approved' && !itemsToApprove) {
        // Fallback to all items if not specified (e.g. clicked Approve directly from card list)
        itemsToApprove = quote.items.map(item => item.materialName);
      }

      const updatedItems = quote.items.map(item => ({
        ...item,
        approved: status === 'Approved' ? (itemsToApprove || []).includes(item.materialName) : false
      }));

      await updateQuotation(id, { 
        status, 
        items: updatedItems 
      });
      
      if (status === 'Approved') {
        toast.success(`Quotation approved and linked to MR ${quote.mrId}`);
      } else {
        toast.success(`Quotation ${status.toLowerCase()} successfully`);
      }
      
      if (viewModal) setViewModal(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  };

  // Group quotations by MR ID and Category for comparison
  const groupedQuotations = React.useMemo(() => {
    return quotations.reduce((acc, q) => {
      const mr = materialRequirements.find(m => m.id === q.mrId);
      
      // Role-based visibility for quotations
      if (hasPermission('APPROVE_MR_AGM')) {
        // AGM only sees quotations for MRs that have passed Store Incharge stage
        if (mr && !["Approved by Store", "Approved by AGM", "Closed", "Approved", "Quotation Phase"].includes(mr.status)) {
          return acc;
        }
      }

      // Filter by Project
      if (filterProject && mr && mr.project !== filterProject) {
        return acc;
      }

      // Filter by Category
      if (filterCategory && q.category !== filterCategory) {
        return acc;
      }

      // Filter by Supplier
      if (filterSupplier && q.supplierName !== filterSupplier) {
        return acc;
      }

      // Filter by Status
      if (filterStatus && q.status !== filterStatus) {
        return acc;
      }

      const key = q.category ? `${q.mrId}|${q.category}` : q.mrId;
      if (!acc[key]) acc[key] = [];
      acc[key].push(q);
      return acc;
    }, {} as Record<string, Quotation[]>);
  }, [quotations, materialRequirements, hasPermission, filterProject, filterCategory, filterSupplier, filterStatus]);

  const getMrDetails = (mrId: string) => {
    return materialRequirements.find(m => m.id === mrId);
  };

  if (loading && quotations.length === 0) {
    return <Skeleton className="h-screen" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Quotation Comparison" 
        subtitle="Manage and compare supplier quotations separately for each category" 
      />

      <div className="mb-6">
        <FilterRow
          showClear={!!(search || startDate || endDate || filterProject || filterCategory || filterSupplier || filterStatus)}
          onClearAll={() => {
            setSearch("");
            setStartDate("");
            setEndDate("");
            setFilterProject("");
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
        </FilterRow>
      </div>

      <div className="flex-1 min-h-[500px]">
        <Virtuoso
          style={{ height: 'calc(100vh - 250px)' }}
          data={Object.entries(groupedQuotations) as [string, Quotation[]][]}
          increaseViewportBy={300}
          itemContent={(_index, [key, mrQuotations]) => {
            const [mrId, category] = key.split('|');
            const mr = getMrDetails(mrId);
            const isExpanded = activeMrId === key;
            const bestPrice = Math.min(...mrQuotations.map(q => q.totalAmount || 0));

            return (
              <div key={key} className="pb-4">
                <div className={cn(
                  "bg-white dark:bg-[#1E293B] border border-gray-100 dark:border-gray-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all",
                  mrQuotations.some(q => q.status === 'Pending') && "approval-highlight ring-1 ring-orange-500/10"
                )}>
                  {/* MR Header Section */}
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
                           {mrQuotations.some(q => isNewItem(q.createdAt)) && (
                             <span className="px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest bg-orange-600 text-white animate-pulse">
                                NEW
                             </span>
                           )}
                           <h3 className="text-sm sm:text-lg font-black text-gray-900 dark:text-white truncate">
                             MR: {safeStr(mrId)} {category && <span className="text-orange-500 ml-1">({category})</span>}
                           </h3>
                           {mr?.status === 'Approved' && <StatusBadge status="Approved" />}
                           {mrQuotations.some(q => q.status === 'Pending') && (
                             <span className="flex items-center gap-1 text-[10px] font-bold text-orange-600 animate-bounce ml-1">
                               <AlertTriangle className="w-3 h-3" />
                               Pending Review
                             </span>
                           )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 overflow-hidden">
                          <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 tracking-widest truncate">{safeStr(mr?.project) || "Unknown project"}</p>
                          <span className="w-1 h-1 bg-gray-300 rounded-full shrink-0"></span>
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

                  {/* Expansion List of Quotations */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 md:px-6 pb-6 pt-2 bg-gray-50/80 dark:bg-gray-900/40 border-t border-gray-100 dark:border-gray-800">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mt-4">
                            {mrQuotations.map((q, idx) => (
                              <motion.div 
                                key={q.id}
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                                className={`group relative overflow-hidden p-5 rounded-2xl border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
                                  q.status === 'Approved' 
                                    ? 'bg-green-50/50 dark:bg-green-900/20 border-green-500/50 shadow-lg shadow-green-500/10' 
                                    : 'bg-white dark:bg-[#1E293B] border-gray-200 dark:border-gray-700 shadow-md'
                                }`}
                              >
                                {/* Decorative element for approved */}
                                {q.status === 'Approved' && (
                                  <div className="absolute top-0 right-0 w-20 h-20 -mr-10 -mt-10 bg-green-500 rotate-45 flex items-end justify-center pb-1 z-10">
                                    <CheckCircle className="w-4 h-4 text-white" />
                                  </div>
                                )}

                                <div className="flex justify-between items-start mb-5 relative z-10">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm">
                                      <Building2 className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-black text-gray-900 dark:text-white leading-tight truncate max-w-[120px] sm:max-w-[140px]">{q.supplierName}</p>
                                      <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-0.5">{safeStr(q.id).split('-').pop()}</p>
                                    </div>
                                  </div>
                                  <StatusBadge status={q.status} />
                                </div>
                                
                                <div className="space-y-3 mb-6 bg-gray-50/80 dark:bg-gray-950/40 p-4 rounded-xl border border-gray-100 dark:border-gray-800/50 relative z-10">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-400 tracking-widest">Total amount</span>
                                    <span className={`text-sm font-black ${q.totalAmount === bestPrice ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}>₹ {fmt(q.totalAmount)}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-400 tracking-widest">Delivery date</span>
                                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{formatDate(q.deliveryDate || "")}</span>
                                  </div>
                                </div>

                                 <div className="flex gap-2 relative z-10">
                                    {isQuoteLocked(q) && (
                                      <div className="absolute -top-12 left-0 right-0 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg flex items-center gap-2 z-20">
                                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                                        <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400">Locked: Approved for MR</span>
                                      </div>
                                    )}
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedQuotation(q);
                                        setViewModal(true);
                                      }}
                                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-[11px] font-black transition-all tracking-widest shadow-sm active:scale-95"
                                    >
                                      <Eye className="w-4 h-4" />
                                      Details
                                    </button>
                                    {q.status !== 'Approved' && hasPermission("APPROVE_QUOTATION") && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusUpdate(q.id, 'Approved');
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-[11px] font-black transition-all tracking-widest shadow-lg shadow-orange-500/20 active:scale-95"
                                      >
                                        <CheckCircle className="w-4 h-4" />
                                        Approve
                                      </button>
                                    )}
                                    {q.status === 'Approved' && hasPermission("APPROVE_QUOTATION") && (
                                      <button 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStatusUpdate(q.id, 'Rejected');
                                        }}
                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-black transition-all tracking-widest shadow-lg shadow-red-500/20 active:scale-95"
                                      >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                      </button>
                                    )}
                                 </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          }}
        />

        {Object.keys(groupedQuotations).length === 0 && !loading && (
          <div className="text-center py-20 bg-white dark:bg-[#1E293B] rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <FileText className="w-10 h-10" />
            </div>
            <p className="text-gray-400 font-bold tracking-widest text-sm">No quotations to compare</p>
          </div>
        )}
      </div>

      {viewModal && selectedQuotation && (() => {
        const mr = getMrDetails(selectedQuotation.mrId);
        return (
          <Modal
            title={`Quotation — ${selectedQuotation.id}`}
            wide
            onClose={() => setViewModal(false)}
          >
            {/* Negative margins to stretch hero to modal edges */}
            <div className="-mx-3 sm:-mx-6 -mt-3 sm:-mt-6">

              {/* ── Hero Strip ── */}
              <div className="bg-gradient-to-br from-white via-gray-50 to-white dark:from-[#0F172A] dark:via-[#1A2744] dark:to-[#0F172A] border-b border-gray-100 dark:border-transparent px-5 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                {/* Supplier Avatar */}
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
                  <Building2 className="w-7 h-7 text-orange-500 dark:text-orange-400" />
                </div>

                {/* Supplier Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-black text-orange-600 dark:text-orange-400/80 tracking-[0.2em] uppercase mb-1">Supplier Quotation</p>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white truncate leading-tight">{safeStr(selectedQuotation.supplierName)}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">{selectedQuotation.id}</span>
                    {selectedQuotation.date && (
                      <span className="text-[11px] text-gray-500">· {formatDate(selectedQuotation.date)}</span>
                    )}
                    {selectedQuotation.category && (
                      <span className="text-[10px] font-bold text-orange-600 dark:text-orange-300/80 bg-orange-100 dark:bg-orange-400/10 px-2 py-0.5 rounded-full border border-orange-200 dark:border-orange-400/20">
                        {selectedQuotation.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status + Grand Total */}
                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 flex-shrink-0">
                  <StatusBadge status={selectedQuotation.status} />
                  <div className="text-right">
                    <p className="text-[9px] text-gray-500 tracking-widest uppercase font-bold">Total Quote</p>
                    <p className="text-2xl font-black text-green-600 dark:text-green-400 leading-none mt-0.5">
                      ₹ {fmt(selectedQuotation.totalAmount || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── Body ── */}
              <div className="px-5 sm:px-8 pt-6 pb-2 space-y-6">

                {/* Linked MR Banner */}
                {mr && (
                  <div className="flex items-center gap-3 p-3.5 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800/40 rounded-xl">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-orange-500 tracking-[0.15em] uppercase">Linked Material Requirement</p>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mt-0.5 truncate">
                        {mr.id} · {safeStr(mr.project)}
                        {mr.requesterName && <span className="text-gray-400 font-normal"> · {mr.requesterName}</span>}
                      </p>
                    </div>
                    {mr.location && (
                      <span className="text-[10px] text-gray-400 font-medium hidden sm:block flex-shrink-0">{mr.location}</span>
                    )}
                  </div>
                )}

                {/* Meta Info: 4-cell grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                  {[
                    { label: 'GST Number', value: safeStr(selectedQuotation.gstNumber) || '—', mono: true },
                    { label: 'Delivery Date', value: formatDate(selectedQuotation.deliveryDate || ''), orange: true },
                    { label: 'Contact Person', value: safeStr(selectedQuotation.ownerName) || '—' },
                    { label: 'Mobile', value: safeStr(selectedQuotation.mobile) || '—' },
                  ].map(({ label, value, mono, orange }) => (
                    <div key={label} className="bg-white dark:bg-[#1E293B] px-4 py-3.5">
                      <p className="text-[9px] font-black text-gray-400 tracking-[0.12em] uppercase mb-1.5">{label}</p>
                      <p className={cn(
                        "text-[13px] font-bold truncate",
                        mono && "font-mono text-[12px]",
                        orange ? "text-orange-500" : "text-gray-800 dark:text-gray-100"
                      )}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* ── Quoted Items Table ── */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-[10px] font-black text-gray-400 tracking-[0.15em] uppercase">Quoted Items</span>
                    <span className="ml-1 text-[10px] font-bold text-gray-300 dark:text-gray-600">
                      ({selectedQuotation.items.length})
                    </span>
                  </div>

                  <div className="border border-gray-100 dark:border-gray-700/60 rounded-xl overflow-hidden shadow-sm">
                    {/* Table — desktop */}
                    <div className="hidden sm:block">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-700/60">
                            <th className="px-5 py-3 text-center text-[9px] font-black text-gray-400 tracking-[0.15em] uppercase w-16">Approve</th>
                            <th className="px-5 py-3 text-[9px] font-black text-gray-400 tracking-[0.15em] uppercase">Description</th>
                            <th className="px-4 py-3 text-center text-[9px] font-black text-gray-400 tracking-[0.15em] uppercase w-16">Qty</th>
                            <th className="px-4 py-3 text-right text-[9px] font-black text-gray-400 tracking-[0.15em] uppercase">Rate</th>
                            <th className="px-4 py-3 text-right text-[9px] font-black text-gray-400 tracking-[0.15em] uppercase">GST</th>
                            <th className="px-5 py-3 text-right text-[9px] font-black text-gray-400 tracking-[0.15em] uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700/40 bg-white dark:bg-gray-900/30">
                          {selectedQuotation.items.map((item, idx) => {
                            const base = item.qty * item.rate;
                            const gstAmt = item.gstType === "Exclusive" ? (base * (item.gstPct || 0) / 100) : 0;
                            const total = base + gstAmt;
                            return (
                              <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                                <td className="px-4 py-4 text-center">
                                  <Checkbox
                                    checked={selectedApprovedItems.includes(item.materialName)}
                                    disabled={!hasPermission("APPROVE_QUOTATION") || hasLinkedPO(selectedQuotation)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedApprovedItems([...selectedApprovedItems, item.materialName]);
                                      } else {
                                        setSelectedApprovedItems(selectedApprovedItems.filter(name => name !== item.materialName));
                                      }
                                    }}
                                  />
                                </td>
                                <td className="px-5 py-4">
                                  <p className="text-[13px] font-bold text-gray-900 dark:text-white">{safeStr(item.materialName)}</p>
                                  <p className="text-[9px] font-bold text-gray-400 tracking-widest mt-0.5 uppercase">{safeStr(item.unit)}</p>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <span className="text-sm font-black text-gray-800 dark:text-gray-100">{item.qty}</span>
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
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Charges + Grand Total footer */}
                        <tfoot className="border-t-2 border-gray-100 dark:border-gray-700">
                          {selectedQuotation.freightAmount ? (
                            <tr className="bg-gray-50/40 dark:bg-gray-800/20">
                              <td colSpan={5} className="px-5 py-2.5 text-right">
                                <span className="text-[10px] font-bold text-gray-500">Freight Charges</span>
                                <span className="text-[9px] text-orange-400 ml-1.5">({selectedQuotation.freightGstPct}% GST · {selectedQuotation.freightGstType})</span>
                              </td>
                              <td className="px-5 py-2.5 text-right text-xs font-bold text-gray-600 dark:text-gray-400">+ ₹ {fmt(selectedQuotation.freightAmount)}</td>
                            </tr>
                          ) : null}
                          {selectedQuotation.loadingAmount ? (
                            <tr className="bg-gray-50/40 dark:bg-gray-800/20">
                              <td colSpan={5} className="px-5 py-2.5 text-right">
                                <span className="text-[10px] font-bold text-gray-500">Loading Charges</span>
                                <span className="text-[9px] text-orange-400 ml-1.5">({selectedQuotation.loadingGstPct}% GST · {selectedQuotation.loadingGstType})</span>
                              </td>
                              <td className="px-5 py-2.5 text-right text-xs font-bold text-gray-600 dark:text-gray-400">+ ₹ {fmt(selectedQuotation.loadingAmount)}</td>
                            </tr>
                          ) : null}
                          {selectedQuotation.unloadingAmount ? (
                            <tr className="bg-gray-50/40 dark:bg-gray-800/20">
                              <td colSpan={5} className="px-5 py-2.5 text-right">
                                <span className="text-[10px] font-bold text-gray-500">Unloading Charges</span>
                                <span className="text-[9px] text-orange-400 ml-1.5">({selectedQuotation.unloadingGstPct}% GST · {selectedQuotation.unloadingGstType})</span>
                              </td>
                              <td className="px-5 py-2.5 text-right text-xs font-bold text-gray-600 dark:text-gray-400">+ ₹ {fmt(selectedQuotation.unloadingAmount)}</td>
                            </tr>
                          ) : null}
                          <tr className="bg-green-50 dark:bg-green-950/30">
                            <td colSpan={5} className="px-5 py-3.5 text-right">
                              <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-[0.15em] uppercase">Grand Total</span>
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              <span className="text-base font-black text-green-600 dark:text-green-400">₹ {fmt(selectedQuotation.totalAmount || 0)}</span>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-700/40">
                      {selectedQuotation.items.map((item, idx) => {
                        const base = item.qty * item.rate;
                        const gstAmt = item.gstType === "Exclusive" ? (base * (item.gstPct || 0) / 100) : 0;
                        const total = base + gstAmt;
                        return (
                          <div key={idx} className="p-4 bg-white dark:bg-gray-900/30">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={selectedApprovedItems.includes(item.materialName)}
                                  disabled={!hasPermission("APPROVE_QUOTATION") || hasLinkedPO(selectedQuotation)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedApprovedItems([...selectedApprovedItems, item.materialName]);
                                    } else {
                                      setSelectedApprovedItems(selectedApprovedItems.filter(name => name !== item.materialName));
                                    }
                                  }}
                                />
                                <div>
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">{safeStr(item.materialName)}</p>
                                  <p className="text-[9px] font-bold text-gray-400 tracking-widest mt-0.5 uppercase">{safeStr(item.unit)}</p>
                                </div>
                              </div>
                              <p className="text-sm font-black text-gray-900 dark:text-white">₹ {fmt(total)}</p>
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-50 dark:border-gray-700/40 pl-7">
                              <div>
                                <p className="text-[9px] font-bold text-gray-400 tracking-widest">Qty</p>
                                <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-0.5">{item.qty}</p>
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
                          </div>
                        );
                      })}
                      {/* Mobile grand total */}
                      <div className="flex justify-between items-center px-4 py-3.5 bg-green-50 dark:bg-green-950/30">
                        <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-widest uppercase">Grand Total</span>
                        <span className="text-sm font-black text-green-600 dark:text-green-400">₹ {fmt(selectedQuotation.totalAmount || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Original MR Specification ── */}
                {mr && mr.items?.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-[10px] font-black text-gray-400 tracking-[0.15em] uppercase">Original MR Specification</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {mr.items.map((mItem: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between gap-3 p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-700/50">
                          <div className="min-w-0">
                            <p className="text-[13px] font-bold text-gray-800 dark:text-gray-200 truncate">{safeStr(mItem.materialName)}</p>
                            <p className="text-[9px] font-bold text-gray-400 tracking-widest mt-0.5 uppercase">Needed: {safeStr(mItem.qty)} {safeStr(mItem.unit)}</p>
                          </div>
                          <span className="flex-shrink-0 text-[10px] font-black text-red-500 bg-red-50 dark:bg-red-900/20 px-2.5 py-1.5 rounded-lg border border-red-100 dark:border-red-800/40">
                            Purchase: {safeStr(mItem.remainingQty !== undefined ? mItem.remainingQty : mItem.qty)} {safeStr(mItem.unit)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Remarks ── */}
                {selectedQuotation.remarks && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-800/40">
                    <p className="text-[9px] font-black text-amber-600 dark:text-amber-400 tracking-[0.15em] uppercase mb-1.5">Remarks</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">"{selectedQuotation.remarks}"</p>
                  </div>
                )}
              </div>

              {/* ── Footer Actions ── */}
              <div className="px-5 sm:px-8 pt-4 pb-5 border-t border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/20 flex flex-wrap items-center gap-2.5 rounded-b-2xl">
                {/* Secondary / destructive — left side */}
                <div className="flex items-center gap-2 flex-wrap">
                  {hasPermission("EDIT_QUOTATION") && (
                    <button
                      onClick={() => {
                        if (hasLinkedPO(selectedQuotation)) {
                          toast.error("Cannot edit: A Purchase Order is already linked to this quotation.");
                          return;
                        }
                        setEditModal(true);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-700/60 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {hasPermission("DELETE_QUOTATION") && (
                    <button
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
                    </button>
                  )}
                </div>

                {/* Primary — right side */}
                <div className="flex items-center gap-2 ml-auto flex-wrap">
                  {selectedQuotation.status !== 'Rejected' && hasPermission("APPROVE_QUOTATION") && (
                    <button
                      onClick={() => handleStatusUpdate(selectedQuotation.id, 'Rejected')}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 dark:border-red-700/60 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  )}
                  {hasPermission("APPROVE_QUOTATION") && (
                    <button
                      onClick={() => {
                        if (selectedApprovedItems.length === 0) {
                          toast.error("Please select at least one item to approve.");
                          return;
                        }
                        handleStatusUpdate(selectedQuotation.id, 'Approved', selectedApprovedItems);
                      }}
                      disabled={hasLinkedPO(selectedQuotation)}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:hover:bg-green-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-green-500/25"
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> {selectedQuotation.status === 'Approved' ? 'Update Approvals' : 'Approve Quotation'}
                    </button>
                  )}
                  <button
                    onClick={() => setViewModal(false)}
                    className="px-5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </Modal>
        );
      })()}

      {/* Edit Modal */}
      {editModal && selectedQuotation && (
        <Modal 
          title="Edit Quotation" 
          onClose={() => setEditModal(false)}
          className="max-w-3xl"
        >
          <QuotationForm 
            initialData={selectedQuotation} 
            onClose={() => setEditModal(false)}
            onSave={async (data) => {
              const updatedData = { ...data, status: 'Pending' as const };
              const result = await updateQuotation(selectedQuotation.id, updatedData);
              
              // If it was the approved one, clear it from MR to require re-linking after new approval
              const mr = materialRequirements.find(m => m.id === selectedQuotation.mrId);
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

              // Reflect changes in local selection from the actual server response
              setSelectedQuotation(result);
              
              // Notification for re-approval
              addNotification({
                message: `Quotation for ${selectedQuotation.supplierName} (MR: ${selectedQuotation.mrId}) has been edited and requires re-approval.`,
                severity: 'info',
                path: 'quotations'
              });

              setEditModal(false);
              toast.success("Quotation updated and sent for re-approval");
            }}
          />
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <ConfirmModal
          title="Delete Quotation"
          message="Are you sure you want to delete this quotation? This action cannot be undone."
          onConfirm={async () => {
            await deleteQuotation(deleteConfirm);
            setDeleteConfirm(null);
          }}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

interface QuotationFormProps {
  initialData: Quotation;
  onClose: () => void;
  onSave: (data: Partial<Quotation>) => Promise<void>;
}

const QuotationForm = ({ initialData, onClose, onSave }: QuotationFormProps) => {
  const [formData, setFormData] = useState<Partial<Quotation>>({ ...initialData });
  const [loading, setLoading] = useState(false);

  const calculateChargeTotal = (amount: number, gstPct: number, gstType: string) => {
    if (!amount) return 0;
    if (gstType === "Exclusive") {
      return amount + (amount * gstPct / 100);
    }
    return amount;
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const newItems = [...(formData.items || [])];
    newItems[idx] = { ...newItems[idx], [field]: value };
    
    // Recalculate total if needed
    const itemsTotal = newItems.reduce((sum, item) => {
      const base = item.qty * item.rate;
      const gst = item.gstType === "Exclusive" ? (base * (item.gstPct || 0) / 100) : 0;
      return sum + (item.gstType === "Exclusive" ? base + gst : base);
    }, 0);

    const freightTotal = calculateChargeTotal(formData.freightAmount || 0, formData.freightGstPct || 0, formData.freightGstType || "Exclusive");
    const loadingTotal = calculateChargeTotal(formData.loadingAmount || 0, formData.loadingGstPct || 0, formData.loadingGstType || "Exclusive");
    const unloadingTotal = calculateChargeTotal(formData.unloadingAmount || 0, formData.unloadingGstPct || 0, formData.unloadingGstType || "Exclusive");

    setFormData({ ...formData, items: newItems, totalAmount: itemsTotal + freightTotal + loadingTotal + unloadingTotal });
  };

  const handleChargeChange = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    
    const itemsTotal = (newFormData.items || []).reduce((sum, item) => {
      const base = item.qty * item.rate;
      const gst = item.gstType === "Exclusive" ? (base * (item.gstPct || 0) / 100) : 0;
      return sum + (item.gstType === "Exclusive" ? base + gst : base);
    }, 0);

    const freightTotal = calculateChargeTotal(newFormData.freightAmount || 0, newFormData.freightGstPct || 0, newFormData.freightGstType || "Exclusive");
    const loadingTotal = calculateChargeTotal(newFormData.loadingAmount || 0, newFormData.loadingGstPct || 0, newFormData.loadingGstType || "Exclusive");
    const unloadingTotal = calculateChargeTotal(newFormData.unloadingAmount || 0, newFormData.unloadingGstPct || 0, newFormData.unloadingGstType || "Exclusive");

    setFormData({ ...newFormData, totalAmount: itemsTotal + freightTotal + loadingTotal + unloadingTotal });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase ml-1">Supplier Name</label>
          <input
            type="text"
            value={formData.supplierName || ""}
            onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 transition-all font-bold"
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase ml-1">Delivery Date</label>
          <input
            type="date"
            value={formData.deliveryDate ? formData.deliveryDate.split('T')[0] : ""}
            onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
            className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 transition-all font-bold"
          />
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[11px] font-black text-gray-400 tracking-widest uppercase">Items</h4>
        <div className="space-y-3">
          {formData.items?.map((item, idx) => (
            <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl space-y-3 border border-gray-100 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-900 dark:text-white">{item.materialName}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Field
                  label="Rate"
                  type="number"
                  value={item.rate}
                  onChange={(e: any) => handleItemChange(idx, 'rate', Number(e.target.value))}
                  small
                />
                <Field
                  label="GST %"
                  type="number"
                  value={item.gstPct}
                  onChange={(e: any) => handleItemChange(idx, 'gstPct', Number(e.target.value))}
                  small
                />
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">GST Type</label>
                  <select
                    value={item.gstType}
                    onChange={(e) => handleItemChange(idx, 'gstType', e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs"
                  >
                    <option value="Exclusive">Exclusive</option>
                    <option value="Inclusive">Inclusive</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-[11px] font-black text-gray-400 tracking-widest uppercase">Other Charges</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
            <Field label="Freight" type="number" value={formData.freightAmount || ""} onChange={(e: any) => handleChargeChange('freightAmount', Number(e.target.value))} small />
            <div className="grid grid-cols-2 gap-2">
              <Field label="GST %" type="number" value={formData.freightGstPct || ""} onChange={(e: any) => handleChargeChange('freightGstPct', Number(e.target.value))} small />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">GST Type</label>
                <select value={formData.freightGstType || "Exclusive"} onChange={(e) => handleChargeChange('freightGstType', e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs">
                  <option value="Exclusive">Exclusive</option>
                  <option value="Inclusive">Inclusive</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
            <Field label="Loading" type="number" value={formData.loadingAmount || ""} onChange={(e: any) => handleChargeChange('loadingAmount', Number(e.target.value))} small />
            <div className="grid grid-cols-2 gap-2">
              <Field label="GST %" type="number" value={formData.loadingGstPct || ""} onChange={(e: any) => handleChargeChange('loadingGstPct', Number(e.target.value))} small />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">GST Type</label>
                <select value={formData.loadingGstType || "Exclusive"} onChange={(e) => handleChargeChange('loadingGstType', e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs">
                  <option value="Exclusive">Exclusive</option>
                  <option value="Inclusive">Inclusive</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
            <Field label="Unloading" type="number" value={formData.unloadingAmount || ""} onChange={(e: any) => handleChargeChange('unloadingAmount', Number(e.target.value))} small />
            <div className="grid grid-cols-2 gap-2">
              <Field label="GST %" type="number" value={formData.unloadingGstPct || ""} onChange={(e: any) => handleChargeChange('unloadingGstPct', Number(e.target.value))} small />
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">GST Type</label>
                <select value={formData.unloadingGstType || "Exclusive"} onChange={(e) => handleChargeChange('unloadingGstType', e.target.value)} className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-xs">
                  <option value="Exclusive">Exclusive</option>
                  <option value="Inclusive">Inclusive</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-black text-gray-400 tracking-widest uppercase ml-1">Remarks</label>
        <textarea
          value={formData.remarks || ""}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
          rows={3}
        />
      </div>

      <div className="flex justify-between items-center bg-orange-50 dark:bg-orange-950/20 p-4 rounded-xl">
        <span className="text-sm font-black text-orange-900 dark:text-orange-400 uppercase tracking-widest">Total Amount</span>
        <span className="text-xl font-black text-orange-600 dark:text-orange-300">₹ {fmt(formData.totalAmount)}</span>
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
        <Btn label="Cancel" outline onClick={onClose} />
        <Btn label="Save Changes" type="submit" loading={loading} />
      </div>
    </form>
  );
};

const ConfirmModal = ({ title, message, onConfirm, onCancel, loading }: any) => (
  <Modal title={title} onClose={onCancel}>
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
  </Modal>
);

const Field = ({ label, value, onChange, placeholder, type = "text", required = false, small = false, icon: Icon }: any) => (
  <div className={`space-y-1 ${small ? "mb-0" : "mb-4"}`}>
    {label && (
      <label className={`block font-black text-gray-500 uppercase tracking-widest ${small ? "text-[10px]" : "text-[11px] ml-1"}`}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon className="w-4 h-4" />
        </div>
      )}
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
  </div>
);

