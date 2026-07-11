import React, { useState, useCallback, useEffect } from "react";
import { useAppStore } from "../store";
import {
  PageHeader, Card, StatusBadge, Badge, Btn, Modal,
  Pagination, ConfirmModal, Skeleton,
} from "../components/ui";
import {
  Plus, Eye, Pencil, Trash2, User, MapPin, Building, Package,
  Check, Link2, CheckCircle, TrendingUp, AlertTriangle, FileText,
  LayoutList, Table as TableIcon, Search,
} from "lucide-react";
import { formatDateTime, safeStr, isNewItem } from "../utils";
import { toast } from "react-hot-toast";
import { cn } from "../lib/utils";
import { SearchFilter, DateRangePicker, SelectFilter, FilterRow } from "../components/ui/Filters";
import { MRFormModal } from "./mr/MRFormModal";
import { MRDetailModal } from "./mr/MRDetailModal";

const STATUS_OPTIONS = [
  { label: "Store Pending", value: "Store Pending" },
  { label: "Approved by Store", value: "Approved by Store" },
  { label: "Quotation Phase", value: "Quotation Phase" },
  { label: "PO Created", value: "PO Created" },
  { label: "Partially Inwarded", value: "Partially Inwarded" },
  { label: "Inwarded", value: "Inwarded" },
  { label: "Cancelled", value: "Cancelled" },
];

export function MaterialRequirementPage() {
  const {
    materialRequirements, materialRequirementsPagination,
    mrAllocations, mrAllocationsPagination,
    fetchResource, deleteMaterialRequirement,
    inventory, role, loading, actionLoading, api,
    hasPermission, settings, pos, quotations,
  } = useAppStore();

  const { projects: PROJECTS, requesters: REQUESTERS } = settings;

  const isMRLocked = (mrId, status) => status === "PO Created" || pos.some(po => po.mrId === mrId);
  const isItemPOCreated = (item, mr) => {
    return pos.some(po =>
      po.mrId === mr?.id &&
      !["Rejected", "Blocked", "Cancelled"].includes(po.status) &&
      po.items?.some(poItem =>
        (poItem.sku && item.sku && poItem.sku !== "N/A" && poItem.sku === item.sku) ||
        (poItem.itemName && item.materialName && poItem.itemName === item.materialName)
      )
    );
  };
  const getItemLinkedPO = (item, mr) => pos.find(po =>
    po.mrId === mr?.id &&
    !["Rejected", "Blocked", "Cancelled"].includes(po.status) &&
    po.items?.some(poItem =>
      (poItem.sku && item.sku && poItem.sku !== "N/A" && poItem.sku === item.sku) ||
      (poItem.itemName && item.materialName && poItem.itemName === item.materialName)
    )
  );
  const getPOPhase = (po) => {
    if (!po) return { label: "—", color: "gray" };
    if (["GRN Fulfilled", "PO Closed", "Closed"].includes(po.status)) return { label: "GRN Done", color: "emerald" };
    if (po.status === "GRN Variance") return { label: "GRN Variance", color: "yellow" };
    if (po.status === "GRN Pending") return { label: "GRN Pending", color: "amber" };
    if (po.status === "Ready for Payment") return { label: "Ready for Payment", color: "blue" };
    if (po.approvalL3 === "Approved") return { label: "L3 Approved", color: "blue" };
    if (po.approvalL2 === "Approved") return { label: "L2 Approved", color: "blue" };
    if (po.approvalL1 === "Approved") return { label: "L1 Approved", color: "indigo" };
    return { label: po.status || "Pending", color: "gray" };
  };

  // Filters
  const [activeTab, setActiveTab] = useState("requirements");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterRequester, setFilterRequester] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const [viewMode, setViewMode] = useState("card");
  const [tableFilter, setTableFilter] = useState("");
  const [stableMRs, setStableMRs] = useState([]);

  // Modal state
  const [modal, setModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [successModal, setSuccessModal] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  // Keep a stable snapshot of loaded MRs so client-side search survives server overwrites
  useEffect(() => {
    if (!debouncedSearch && materialRequirements.length > 0) {
      setStableMRs(materialRequirements);
    }
  }, [materialRequirements, debouncedSearch]);

  // Fetch on filter change
  useEffect(() => {
    const filterObj = {};
    if (filterProject) filterObj.project = filterProject;
    if (filterRequester) filterObj.requesterName = filterRequester;
    if (filterStatus) filterObj.status = filterStatus;
    const filter = Object.keys(filterObj).length > 0 ? filterObj : null;
    if (activeTab === "requirements" || activeTab === "grn-ready") {
      fetchResource("material-requirements", 1, 50, materialRequirements.length > 0, debouncedSearch, filter, false, false, startDate, endDate);
    } else {
      fetchResource("mr-allocations", 1, 1000, true, debouncedSearch, filter, false, false, startDate, endDate);
    }
    if (pos.length === 0) fetchResource("pos", 1, 2000, true);
    if (inventory.length < 500) fetchResource("inventory", 1, 2000, true);
    if (quotations.length === 0) fetchResource("quotations", 1, 2000, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, activeTab, startDate, endDate, filterProject, filterRequester, filterStatus]);

  const handlePageChange = useCallback(page => {
    if (activeTab === "requirements" || activeTab === "grn-ready") {
      fetchResource("material-requirements", page, 50, false, debouncedSearch);
    } else {
      fetchResource("mr-allocations", page, 50, false, debouncedSearch);
    }
  }, [fetchResource, activeTab, debouncedSearch]);

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMaterialRequirement(deletingId);
      setDeletingId(null);
    } catch {}
  };

  const openEditModal = req => {
    setSelectedRequirement(JSON.parse(JSON.stringify(req)));
    setIsEditing(true);
    setModal(true);
  };

  // GRN Ready: MRs whose linked PO has been GRN-fulfilled but not yet allocated
  const grnFulfilledMrIds = new Set(
    pos.filter(p => ["GRN Fulfilled", "GRN Variance"].includes(p.status) && p.mrId).map(p => p.mrId)
  );
  const grnReadyMRs = materialRequirements.filter(mr =>
    grnFulfilledMrIds.has(mr.id) && !["Closed"].includes(mr.status)
  );

  // Items from approved MRs that don't yet have a PO — shown in Procurement Pending tab
  const procurementPendingItems = React.useMemo(() => {
    const result = [];
    (materialRequirements || [])
      .filter(mr => ["Approved by Store", "Quotation Phase", "PO Created"].includes(mr.status))
      .forEach(mr => {
        const pending = (mr.items || []).filter(item =>
          !isItemPOCreated(item, mr) &&
          !["In Stock", "Allocated", "Issued"].includes(item.status)
        );
        if (pending.length > 0) result.push({ mr, items: pending });
      });
    return result;
  }, [materialRequirements, pos]);

  // Client-side filter: merge server results with stable snapshot so search works even when server returns empty
  const filteredMRs = React.useMemo(() => {
    if (!debouncedSearch.trim()) return materialRequirements || [];
    const term = debouncedSearch.trim().toLowerCase();
    // Merge: server results + stable base (deduplicated by id)
    const pool = [...(materialRequirements || [])];
    stableMRs.forEach(mr => { if (!pool.find(x => x.id === mr.id)) pool.push(mr); });
    return pool.filter(mr =>
      [mr.id, mr.mrNumber, mr.project, mr.requesterName, mr.location].some(f => f?.toLowerCase().includes(term)) ||
      (mr.items || []).some(item =>
        item.materialName?.toLowerCase().includes(term) || item.sku?.toLowerCase().includes(term)
      )
    );
  }, [stableMRs, materialRequirements, debouncedSearch]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Material Requirements"
        sub="Manage and track material requests from sites"
        actions={hasPermission("CREATE_MATERIAL_REQUIREMENT") && (
          <Btn label="New Requirement" icon={Plus} onClick={() => { setIsEditing(false); setSelectedRequirement(null); setModal(true); }} />
        )}
      />

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
          {[
            ["requirements", "Requisitions (Current)", 0],
            ["pending-procurement", "PO Pending", procurementPendingItems.reduce((s, g) => s + g.items.length, 0)],
            ["allocations", "Allocated Stock Registry", 0],
            ["grn-ready", "GRN Ready", grnReadyMRs.length],
          ].map(([tab, label, count]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all flex items-center gap-1.5 ${activeTab === tab ? "bg-white dark:bg-gray-700 text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-black leading-none">{count}</span>
              )}
            </button>
          ))}
        </div>

        <FilterRow
          showClear={!!(search || startDate || endDate || filterProject || filterRequester || filterStatus)}
          onClearAll={() => { setSearch(""); setStartDate(""); setEndDate(""); setFilterProject(""); setFilterRequester(""); setFilterStatus(""); }}
        >
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search by ID, Item Name, Requester, Project..."
            className="flex-1 min-w-[240px]"
          />
          <DateRangePicker
            value={{ start: startDate, end: endDate }}
            onChange={v => { setStartDate(v.start); setEndDate(v.end); }}
          />
          <SelectFilter value={filterProject} onChange={setFilterProject} options={PROJECTS} placeholder="All Projects" />
          <SelectFilter value={filterRequester} onChange={setFilterRequester} options={REQUESTERS} placeholder="All Requesters" />
          <SelectFilter value={filterStatus} onChange={setFilterStatus} options={STATUS_OPTIONS} placeholder="All Statuses" />
          {activeTab === "requirements" && (
            <div className="flex items-center gap-0.5 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg shrink-0">
              <button
                onClick={() => setViewMode("card")}
                className={cn("p-1.5 rounded-md transition-all", viewMode === "card" ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-gray-400 hover:text-gray-600")}
                title="Card view"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={cn("p-1.5 rounded-md transition-all", viewMode === "table" ? "bg-white dark:bg-gray-700 shadow-sm text-primary" : "text-gray-400 hover:text-gray-600")}
                title="Table view"
              >
                <TableIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </FilterRow>
      </div>

      <div className="space-y-4 min-h-[400px]">
        {activeTab === "requirements" && viewMode === "table" ? (
          <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input type="text" placeholder="Quick filter..." value={tableFilter} onChange={(e) => setTableFilter(e.target.value)} className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 dark:bg-gray-800/90 border-b border-gray-100 dark:border-gray-800">
                    {["Date", "MR No.", "Project", "Requester", "Location", "Status", "Items", "Actions"].map(h => (
                      <th key={h} className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {loading && materialRequirements.length === 0 && (
                    [...Array(6)].map((_, i) => (
                      <tr key={i}>
                        {Array(8).fill(0).map((__, j) => (
                          <td key={j} className="px-3 py-3"><Skeleton className="h-4 w-full" /></td>
                        ))}
                      </tr>
                    ))
                  )}
                  {!loading && materialRequirements.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500 italic text-[13px]">No material requirements found.</td></tr>
                  )}
                  {materialRequirements
                    .filter(req => !tableFilter.trim() || [req.mrNumber || req.id, req.project, req.requesterName, req.location, req.status, ...(req.items || []).map(i => i.materialName)].some(f => f?.toLowerCase().includes(tableFilter.trim().toLowerCase())))
                    .map(req => (
                    <tr
                      key={req.id}
                      onClick={() => { setSelectedRequirement(JSON.parse(JSON.stringify(req))); setViewModal(true); }}
                      className={cn(
                        "hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors cursor-pointer text-[13px]",
                        (req.status === "Store Pending" || req.status === "Quotation Phase") && "bg-primary/[0.03]"
                      )}
                    >
                      <td className="px-3 py-2.5 whitespace-nowrap text-[12px] text-gray-500 dark:text-gray-400">{formatDateTime(req.date)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          {isNewItem(req.createdAt) && <span className="px-1 py-0.5 rounded text-[9px] font-black tracking-widest bg-primary text-white">NEW</span>}
                          <span className="font-bold text-primary text-[12px]">{req.mrNumber || req.id}</span>
                          {isMRLocked(req.id, req.status) && <Badge text="PO" color="blue" icon={Link2} className="px-1" />}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 max-w-[140px]">
                        <span className="block truncate font-medium text-gray-800 dark:text-gray-200">{req.project || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{req.requesterName || "—"}</td>
                      <td className="px-3 py-2.5 max-w-[120px]">
                        <span className="block truncate text-gray-500 dark:text-gray-400 text-[12px]">{req.location || "—"}</span>
                      </td>
                      <td className="px-3 py-2.5"><StatusBadge status={req.status} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {(req.items || []).slice(0, 2).map((item, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[11px] text-gray-600 dark:text-gray-400 truncate max-w-[100px]">{item.materialName}</span>
                          ))}
                          {(req.items || []).length > 2 && (
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[11px] font-bold">+{req.items.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <button title="View" onClick={() => { setSelectedRequirement(JSON.parse(JSON.stringify(req))); setViewModal(true); }} className="p-1.5 rounded text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"><Eye className="w-3.5 h-3.5" /></button>
                          <button title="Track" onClick={() => { window.location.hash = `tracking?id=${req.mrNumber || req.id}`; }} className="p-1.5 rounded text-primary hover:bg-primary/10 transition-colors"><TrendingUp className="w-3.5 h-3.5" /></button>
                          {hasPermission("EDIT_MATERIAL_REQUIREMENT") && (
                            <button title="Edit" disabled={isMRLocked(req.id, req.status) && role !== "Super Admin"} onClick={() => openEditModal(req)} className={cn("p-1.5 rounded text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors", isMRLocked(req.id, req.status) && role !== "Super Admin" && "opacity-30 cursor-not-allowed")}><Pencil className="w-3.5 h-3.5" /></button>
                          )}
                          {hasPermission("DELETE_MATERIAL_REQUIREMENT") && (
                            <button title="Delete" disabled={isMRLocked(req.id, req.status) && role !== "Super Admin"} onClick={() => setDeletingId(req.id)} className={cn("p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors", isMRLocked(req.id, req.status) && role !== "Super Admin" && "opacity-30 cursor-not-allowed")}><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {loading && materialRequirements.length > 0 && (
              <div className="flex items-center justify-center py-3 text-gray-500 text-xs border-t border-gray-100 dark:border-gray-800">
                <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />Loading more...
              </div>
            )}
            {materialRequirementsPagination?.pages > 1 && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <Pagination data={materialRequirementsPagination} onPageChange={handlePageChange} />
              </div>
            )}
          </Card>
        ) : activeTab === "requirements" ? (
          <>
            {loading && materialRequirements.length === 0
              ? [...Array(3)].map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-3 w-full">
                      <Skeleton className="h-6 w-1/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))
              : (
                <div className="space-y-2">
                  {filteredMRs.map((req) => {
                    const inv = inventory;
                    const mrPos = pos.filter(po =>
                      (po.mrId === req.id || po.mrId === req.mrNumber) &&
                      !["Rejected", "Blocked", "Cancelled"].includes(po.status)
                    );
                    const mrQuotations = quotations.filter(q =>
                      q.mrId === req.id || q.mrId === req.mrNumber
                    );
                    return (
                    <div key={req.id} className="py-1 px-1">
                      <Card
                        className={cn(
                          "p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all",
                          (!isMRLocked(req.id, req.status) && (req.status === "Store Pending" || req.status === "Quotation Phase")) &&
                          "approval-highlight ring-1 ring-primary/20 shadow-lg shadow-primary/5"
                        )}
                      >
                        {/* Card header */}
                        <div className="p-4 border-b border-[#E8ECF0] dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                              {isNewItem(req.createdAt) && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest bg-primary text-white animate-pulse">NEW</span>
                              )}
                              <h3 className="text-[14px] font-bold text-[#1A1A2E] dark:text-white">{req.id}</h3>
                              {isMRLocked(req.id, req.status) ? (
                                <Badge text="PO Created" color="blue" icon={Link2} className="px-1.5" />
                              ) : (
                                <StatusBadge status={req.status} />
                              )}
                              <span className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black",
                                mrPos.length > 0
                                  ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                              )}>
                                <Link2 className="w-2.5 h-2.5" />
                                {mrPos.length} PO{mrPos.length !== 1 ? "s" : ""}
                              </span>
                              <span className={cn(
                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black",
                                mrQuotations.length > 0
                                  ? "bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                              )}>
                                <FileText className="w-2.5 h-2.5" />
                                {mrQuotations.length} Quote{mrQuotations.length !== 1 ? "s" : ""}
                              </span>
                              {req.items.some(i => i.status === "In Stock" || i.status === "Partial") && (
                                <Badge text="Stock Available" color="green" icon={Check} className="gap-1 px-1.5" />
                              )}
                              {(!isMRLocked(req.id, req.status) && (req.status === "Store Pending" || req.status === "Quotation Phase")) && (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-primary animate-bounce ml-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  {req.status === "Quotation Phase" ? "Quotation Finalization Needed" : "Awaiting Review"}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-[11px] sm:text-[13px] text-[#6B7280] dark:text-gray-400">
                              <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {safeStr(req.requesterName)}</span>
                              <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5" /> {safeStr(req.project)}</span>
                              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {safeStr(req.location)}</span>
                            </div>
                          </div>
                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-gray-700">
                            <div className="flex flex-col items-start sm:items-end">
                              <p className="text-[10px] sm:text-[11px] font-bold text-[#6B7280] dark:text-gray-500 leading-none">Date</p>
                              <p className="text-[12px] sm:text-[13px] font-medium text-[#1A1A2E] dark:text-gray-300 mt-1">{formatDateTime(req.date)}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                title="View Details"
                                onClick={() => { setSelectedRequirement(JSON.parse(JSON.stringify(req))); setViewModal(true); }}
                                className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                title="Track Progress"
                                onClick={() => { window.location.hash = `tracking?id=${req.mrNumber || req.id}`; }}
                                className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                              >
                                <TrendingUp className="w-4 h-4" />
                              </button>

                              {/* Allocate button */}
                              {["Store Pending", "Approved by Store", "Allocated", "Partially Allocated"].includes(req.status) &&
                                (hasPermission("ALLOCATE_MR") || hasPermission("MANAGE_INVENTORY")) &&
                                req.items.some(i => {
                                  const invItem = inv.find(x => x.sku === i.sku);
                                  return invItem && invItem.liveStock > 0 && i.sku && i.sku !== "N/A" && i.status !== "Allocated" && i.status !== "Issued";
                                }) && (
                                  <button
                                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm shadow-emerald-500/20"
                                    onClick={async e => {
                                      e.stopPropagation();
                                      try {
                                        const allocItems = req.items
                                          .filter(i => {
                                            const sku = (i.sku || "").trim();
                                            return sku && sku.toUpperCase() !== "N/A" && !["Allocated", "Issued"].includes(i.status || "");
                                          })
                                          .map(i => ({ sku: i.sku.trim(), qty: Math.max(0, (i.availableInStock || 0) - (i.allocatedQty || 0)) }));
                                        if (!allocItems.length) { toast.error("No valid unallocated items found."); return; }
                                        const res = await api.post("material-requirements/allocate", { mrId: req.id, items: allocItems });
                                        if (res.success) {
                                          toast.success(`${allocItems.length} items allocated!`);
                                        }
                                      } catch (err) { toast.error("Allocation failed: " + err.message); }
                                    }}
                                  >
                                    <Check className="w-3.5 h-3.5" /><span>Allocate</span>
                                  </button>
                                )}

                              {hasPermission("EDIT_MATERIAL_REQUIREMENT") && (
                                <button
                                  title={isMRLocked(req.id, req.status) && role !== "Super Admin" ? "Locked: Purchase Order exists" : "Edit MR"}
                                  disabled={isMRLocked(req.id, req.status) && role !== "Super Admin"}
                                  onClick={e => { e.stopPropagation(); openEditModal(req); }}
                                  className={cn("p-2 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors", isMRLocked(req.id, req.status) && role !== "Super Admin" && "opacity-30 cursor-not-allowed")}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {hasPermission("DELETE_MATERIAL_REQUIREMENT") && (
                                <button
                                  title={isMRLocked(req.id, req.status) && role !== "Super Admin" ? "Locked: Purchase Order exists" : "Delete MR"}
                                  disabled={isMRLocked(req.id, req.status) && role !== "Super Admin"}
                                  onClick={e => { e.stopPropagation(); setDeletingId(req.id); }}
                                  className={cn("p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors", isMRLocked(req.id, req.status) && role !== "Super Admin" && "opacity-30 cursor-not-allowed")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Linked POs strip — always visible */}
                        <div className="px-4 py-2 border-b border-blue-100 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-950/10 flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 shrink-0">Linked POs:</span>
                          {mrPos.length === 0 ? (
                            <span className="text-[10px] text-gray-400 dark:text-gray-600 italic">No POs created yet</span>
                          ) : mrPos.map(po => {
                            const phase = getPOPhase(po);
                            const phaseColor = {
                              emerald: "text-emerald-600 dark:text-emerald-400",
                              amber: "text-amber-600 dark:text-amber-400",
                              yellow: "text-yellow-600 dark:text-yellow-400",
                              blue: "text-blue-600 dark:text-blue-400",
                              indigo: "text-indigo-600 dark:text-indigo-400",
                              gray: "text-gray-500 dark:text-gray-400",
                            }[phase.color] || "text-gray-500";
                            return (
                              <span key={po.id} className="flex items-center gap-1.5 text-[10px] px-2 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono">
                                <span className="font-bold text-primary">{po.id}</span>
                                <span className="text-gray-300 dark:text-gray-600">·</span>
                                <span className={cn("font-bold", phaseColor)}>{phase.label}</span>
                              </span>
                            );
                          })}
                        </div>

                        {/* Items chips */}
                        <div className="p-4 bg-white dark:bg-gray-900">
                          <div className="flex flex-wrap gap-2">
                            {req.items.map((item, idx) => {
                              const linkedPO = getItemLinkedPO(item, req);
                              const poPhase = linkedPO ? getPOPhase(linkedPO) : null;
                              const poPhaseColor = poPhase ? ({
                                emerald: "text-emerald-600 dark:text-emerald-400",
                                amber: "text-amber-600 dark:text-amber-400",
                                blue: "text-blue-600 dark:text-blue-400",
                                indigo: "text-indigo-600 dark:text-indigo-400",
                                gray: "text-gray-500",
                              }[poPhase.color] || "text-gray-500") : "";
                              return (
                              <div
                                key={idx}
                                className={cn(
                                  "px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border rounded-lg flex flex-col gap-1",
                                  linkedPO
                                    ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20"
                                    : item.status === "Needs Purchase"
                                    ? "border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/10"
                                    : "border-gray-100 dark:border-gray-700"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <Package className="w-3.5 h-3.5 text-primary" />
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{item.materialName}</span>
                                      {linkedPO && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-700/50 text-[9px] font-black tracking-widest shrink-0">
                                          <CheckCircle className="w-2.5 h-2.5" /> PO
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      {item.condition && <Badge text={item.condition} color="blue" small />}
                                      {item.sku && item.sku !== "N/A" && (
                                        <span className="text-[10px] text-gray-400 font-mono italic leading-none">{item.sku}</span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 ml-auto">x {item.qty} {item.unit}</span>
                                </div>
                                {/* Item status row */}
                                {linkedPO && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-white/60 dark:bg-gray-700/40 rounded-md">
                                    <span className="text-[9px] font-bold text-gray-400 font-mono">{linkedPO.id}</span>
                                    <span className="text-gray-300 dark:text-gray-600 text-[9px]">·</span>
                                    <span className={cn("text-[9px] font-bold", poPhaseColor)}>{poPhase?.label}</span>
                                  </div>
                                )}
                                {(item.status === "In Stock" || item.status === "Partial") && (
                                  <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/10 rounded-md">
                                    <Check className="w-2.5 h-2.5 text-green-600 dark:text-green-500" />
                                    <span className="text-[9px] font-bold text-green-700 dark:text-green-400 tracking-widest">
                                      {(() => {
                                        const liveStock = inv.find(i => i.sku === item.sku)?.liveStock ?? (item.availableInStock || 0);
                                        return liveStock >= (item.qty || 0) ? "Fully In Stock" : `${liveStock} In Stock`;
                                      })()}
                                    </span>
                                  </div>
                                )}
                                {item.status === "Needs Purchase" && !linkedPO && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/10 rounded-md">
                                    <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 tracking-widest">
                                      {req.status === "Store Pending" ? "STORE PENDING" : "PO PENDING"}
                                    </span>
                                  </div>
                                )}
                                {(item.status === "Allocated" || item.status === "Issued") && (
                                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/10 rounded-md">
                                    <CheckCircle className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-500" />
                                    <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 tracking-widest">{item.status.toUpperCase()}</span>
                                  </div>
                                )}
                              </div>
                              );
                            })}
                          </div>
                        </div>
                      </Card>
                    </div>
                    );
                  })}
                </div>
              )}

            {!filteredMRs.length && !loading && (
              <div className="text-center py-12 text-gray-500 text-[13px]">No material requirements found.</div>
            )}
            {materialRequirementsPagination?.pages > 1 && (
              <div className="py-4 flex justify-end">
                <Pagination data={materialRequirementsPagination} onPageChange={handlePageChange} />
              </div>
            )}
          </>
        ) : activeTab === "pending-procurement" ? (
          <div className="space-y-3">
            {procurementPendingItems.length === 0 && !loading && (
              <div className="text-center py-16">
                <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
                <p className="text-gray-500 text-[14px] font-medium">No pending procurement items</p>
                <p className="text-gray-400 text-[12px] mt-1">All approved MR items have Purchase Orders</p>
              </div>
            )}
            {procurementPendingItems.map(({ mr, items }) => (
              <Card key={mr.id} className="p-0 overflow-hidden border-amber-200 dark:border-amber-800/40">
                <div className="px-4 py-3 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[13px] font-black text-primary font-mono">{mr.mrNumber || mr.id}</span>
                    <StatusBadge status={mr.status} />
                    <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400"><Building className="w-3 h-3" />{mr.project || "—"}</span>
                    <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400"><User className="w-3 h-3" />{mr.requesterName || "—"}</span>
                    <span className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400"><MapPin className="w-3 h-3" />{mr.location || "—"}</span>
                  </div>
                  <span className="shrink-0 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded text-[10px] font-black">{items.length} item{items.length !== 1 ? "s" : ""} pending</span>
                </div>
                <div className="p-4 flex flex-wrap gap-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="px-3 py-2 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-800/40 rounded-lg flex flex-col gap-1 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">{item.materialName}</span>
                        <span className="text-[11px] font-bold text-gray-400 ml-auto shrink-0">x{item.qty} {item.unit}</span>
                      </div>
                      {item.sku && item.sku !== "N/A" && (
                        <span className="text-[10px] text-gray-400 font-mono">{item.sku}</span>
                      )}
                      <span className="text-[9px] font-black tracking-widest text-amber-600 dark:text-amber-400 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded w-fit">PO PENDING</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        ) : activeTab === "grn-ready" ? (
          <div className="space-y-4">
            {grnReadyMRs.length === 0 && !loading && (
              <div className="text-center py-16">
                <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-500 text-[14px] font-medium">No MRs awaiting allocation</p>
                <p className="text-gray-400 text-[12px] mt-1">MRs with GRN-fulfilled purchase orders will appear here</p>
              </div>
            )}
            {loading && grnReadyMRs.length === 0 && (
              [...Array(3)].map((_, i) => (
                <Card key={i} className="p-6">
                  <div className="space-y-3"><Skeleton className="h-5 w-1/4" /><Skeleton className="h-4 w-1/2" /></div>
                </Card>
              ))
            )}
            {grnReadyMRs.map(mr => {
              const linkedPos = pos.filter(p => p.mrId === mr.id && ["GRN Fulfilled", "GRN Variance"].includes(p.status));
              // GRN guarantees stock received — don't gate on liveStock; backend validates
              const allocatableItems = mr.items.filter(i => {
                const sku = (i.sku || "").trim();
                if (!sku || sku.toUpperCase() === "N/A") return false;
                return !["Allocated", "Issued"].includes(i.status || "");
              });
              return (
                <Card key={mr.id} className="overflow-hidden p-0">
                  <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/30 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[13px] font-black text-primary font-mono">{mr.mrNumber || mr.id}</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded text-[9px] font-black tracking-widest">GRN RECEIVED</span>
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-gray-500">
                        <span className="flex items-center gap-1"><Building className="w-3 h-3" />{mr.project || "—"}</span>
                        <span className="flex items-center gap-1"><User className="w-3 h-3" />{mr.requesterName || "—"}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{mr.location || "—"}</span>
                      </div>
                      {linkedPos.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {linkedPos.map(po => (
                            <span key={po.id} className="text-[10px] font-mono px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 rounded text-emerald-600 dark:text-emerald-400">
                              PO: {po.id} · {po.status}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        title="View MR"
                        onClick={() => { setSelectedRequirement(JSON.parse(JSON.stringify(mr))); setViewModal(true); }}
                        className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      ><Eye className="w-4 h-4" /></button>
                      {(hasPermission("ALLOCATE_MR") || hasPermission("MANAGE_INVENTORY")) && allocatableItems.length > 0 && (
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm shadow-emerald-500/20"
                          onClick={async e => {
                            e.stopPropagation();
                            try {
                              const allocItems = allocatableItems
                                .map(i => ({ sku: i.sku.trim(), qty: i.qty || 0 }))
                                .filter(i => i.qty > 0);
                              if (!allocItems.length) { toast.error("No items to allocate."); return; }
                              const res = await api.post("material-requirements/allocate", { mrId: mr.id, items: allocItems });
                              if (res.success) {
                                toast.success(`${allocItems.length} item(s) allocated!`);
                                fetchResource("material-requirements", 1, 50, false);
                              }
                            } catch (err) { toast.error("Allocation failed: " + err.message); }
                          }}
                        >
                          <Check className="w-3.5 h-3.5" /><span>Allocate</span>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex flex-wrap gap-2">
                      {mr.items.map((item, idx) => {
                        const isAllocated = ["Allocated", "Issued"].includes(item.status || "");
                        const noSku = !item.sku || item.sku.toUpperCase() === "N/A";
                        return (
                          <div key={idx} className={cn(
                            "px-3 py-2 rounded-lg border flex flex-col gap-1",
                            isAllocated || noSku
                              ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 opacity-60"
                              : "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20"
                          )}>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{item.materialName}</span>
                              <span className="text-[11px] font-bold text-gray-400 ml-auto">x{item.qty} {item.unit}</span>
                            </div>
                            {item.sku && item.sku !== "N/A" && (
                              <span className="text-[10px] text-gray-400 font-mono">{item.sku}</span>
                            )}
                            <div>
                              {isAllocated ? (
                                <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded">ALLOCATED</span>
                              ) : noSku ? (
                                <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded">NO SKU</span>
                              ) : (
                                <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded">GRN RECEIVED</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col" style={{ height: "calc(100vh - 280px)", minHeight: 500 }}>
            {/* Summary strip */}
            {mrAllocations.length > 0 && (() => {
              const total = mrAllocations.length;
              const fullyIssued = mrAllocations.filter(a => (a.remainingQty || 0) === 0).length;
              const partial = mrAllocations.filter(a => (a.issuedQty || 0) > 0 && (a.remainingQty || 0) > 0).length;
              const pending = mrAllocations.filter(a => (a.issuedQty || 0) === 0).length;
              return (
                <div className="flex items-center gap-6 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 text-[11px] font-bold flex-wrap">
                  <span className="text-gray-500">{total} allocation{total !== 1 ? "s" : ""}</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /><span className="text-amber-600 dark:text-amber-400">Pending: {pending}</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /><span className="text-blue-600 dark:text-blue-400">Partial: {partial}</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /><span className="text-emerald-600 dark:text-emerald-400">Issued: {fullyIssued}</span></span>
                </div>
              );
            })()}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse" style={{ minWidth: 900 }}>
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                    {[
                      ["Engineer / Project", "w-[160px]"],
                      ["MR", "w-[110px]"],
                      ["Material", ""],
                      ["Allocated", "w-[80px] text-center"],
                      ["Issued", "w-[80px] text-center"],
                      ["Remaining", "w-[80px] text-center"],
                      ["Progress", "w-[130px]"],
                      ["Status", "w-[120px]"],
                      ["Date", "w-[130px]"],
                      ["", "w-[40px]"],
                    ].map(([h, cls]) => (
                      <th key={h} className={cn("px-3 py-2.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap", cls)}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                  {mrAllocations.length === 0 && !loading && (
                    <tr><td colSpan={10} className="px-4 py-16 text-center text-gray-400 text-[13px]">No allocations found.</td></tr>
                  )}
                  {mrAllocations.map((alc, idx) => {
                    const allocated = Number(alc.allocatedQty) || 0;
                    const issued    = Number(alc.issuedQty)    || 0;
                    const remaining = Number(alc.remainingQty) || 0;
                    const pct       = allocated > 0 ? Math.round((issued / allocated) * 100) : 0;
                    const st        = alc.status || (remaining === 0 ? "Closed" : issued > 0 ? "Partially Issued" : "Allocated");
                    const stColor   = st === "Closed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : st === "Partially Issued" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
                    return (
                      <tr key={alc.id || idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors text-[12px]">
                        {/* Engineer / Project */}
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-gray-900 dark:text-white truncate max-w-[150px]" title={alc.engineerName}>{alc.engineerName || "—"}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[150px]" title={alc.projectName}>{alc.projectName || "—"}</p>
                        </td>
                        {/* MR */}
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-[11px] text-primary font-bold">{alc.mrNumber || alc.mrId}</span>
                        </td>
                        {/* Material */}
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[200px]" title={alc.itemName}>{alc.itemName}</p>
                          <p className="font-mono text-[10px] text-gray-400">{alc.sku}</p>
                        </td>
                        {/* Allocated */}
                        <td className="px-3 py-2.5 text-center">
                          <span className="font-bold text-gray-700 dark:text-gray-300 tabular-nums">{allocated}</span>
                        </td>
                        {/* Issued */}
                        <td className="px-3 py-2.5 text-center">
                          <span className={cn("font-bold tabular-nums", issued > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-gray-400")}>{issued}</span>
                        </td>
                        {/* Remaining */}
                        <td className="px-3 py-2.5 text-center">
                          <span className={cn("font-bold tabular-nums", remaining > 0 ? "text-amber-600 dark:text-amber-400" : "text-gray-400")}>{remaining}</span>
                        </td>
                        {/* Progress bar */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={cn("h-full rounded-full transition-all", pct === 100 ? "bg-emerald-500" : pct > 0 ? "bg-blue-500" : "bg-amber-400")}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 w-[28px] text-right tabular-nums">{pct}%</span>
                          </div>
                        </td>
                        {/* Status */}
                        <td className="px-3 py-2.5">
                          <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap", stColor)}>{st}</span>
                        </td>
                        {/* Date */}
                        <td className="px-3 py-2.5 text-[11px] text-gray-400 whitespace-nowrap">{formatDateTime(alc.allocationDate)}</td>
                        {/* Actions */}
                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                          <button
                            title="View MR"
                            onClick={() => { window.location.hash = `tracking?id=${alc.mrNumber || alc.mrId}`; }}
                            className="text-cyan-500 hover:text-cyan-400 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {loading && mrAllocations.length > 0 && (
                    <tr><td colSpan={10} className="py-4 text-center text-gray-500 text-xs">Loading...</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {mrAllocationsPagination?.pages > 1 && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <Pagination data={mrAllocationsPagination} onPageChange={handlePageChange} />
              </div>
            )}
          </Card>
        )}
      </div>

      {/* View modal */}
      {viewModal && selectedRequirement && (
        <MRDetailModal
          requirement={selectedRequirement}
          onClose={() => setViewModal(false)}
          onRequirementUpdate={setSelectedRequirement}
        />
      )}

      {/* Form modal */}
      {modal && (
        <MRFormModal
          open={modal}
          isEditing={isEditing}
          initialData={isEditing ? selectedRequirement : null}
          onClose={() => { setModal(false); setIsEditing(false); }}
          onSuccess={id => setSuccessModal(id)}
        />
      )}

      {/* Success modal */}
      {successModal && (
        <Modal
          title="Success"
          onClose={() => setSuccessModal(null)}
          footer={<div className="w-full"><Btn label="Close" onClick={() => setSuccessModal(null)} block /></div>}
        >
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Requirement Submitted!</h3>
              <p className="text-sm text-gray-500">Your requirement ID is:</p>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg font-mono font-bold text-lg text-primary border border-primary/20">{successModal}</div>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      {deletingId && (
        <ConfirmModal
          title="Delete Requirement"
          message="Are you sure you want to delete this material requirement? This action cannot be undone."
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeletingId(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
