import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "../store";
import {
  PageHeader, Card, StatusBadge, Badge, Btn, Modal,
  Pagination, ConfirmModal, Skeleton,
} from "../components/ui";
import {
  Plus, Eye, Pencil, Trash2, User, MapPin, Building, Package,
  Check, Link2, CheckCircle, TrendingUp, AlertTriangle,
  LayoutList, Table as TableIcon, Search,
} from "lucide-react";
import { Virtuoso } from "react-virtuoso";
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
  { label: "PO Phase", value: "PO Phase" },
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
    hasPermission, settings, pos,
  } = useAppStore();

  const { projects: PROJECTS, requesters: REQUESTERS } = settings;

  const isMRLocked = mrId => pos.some(po => po.mrId === mrId);
  const isItemPOCreated = (item, mr) => {
    const cat = item.category || "General";
    return pos.some(po =>
      po.mrId === mr?.id &&
      (po.workType || po.category || "General") === cat &&
      !["Rejected", "Blocked", "Cancelled"].includes(po.status)
    );
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

  // Fetch on filter change
  useEffect(() => {
    const filterObj = {};
    if (filterProject) filterObj.project = filterProject;
    if (filterRequester) filterObj.requesterName = filterRequester;
    if (filterStatus) filterObj.status = filterStatus;
    const filter = Object.keys(filterObj).length > 0 ? filterObj : null;
    if (activeTab === "requirements") {
      fetchResource("material-requirements", 1, 50, materialRequirements.length > 0, debouncedSearch, filter, false, false, startDate, endDate);
    } else {
      fetchResource("mr-allocations", 1, 1000, true, debouncedSearch, filter, false, false, startDate, endDate);
    }
    if (pos.length === 0) fetchResource("pos", 1, 2000, true);
    if (inventory.length < 500) fetchResource("inventory", 1, 2000, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, activeTab, startDate, endDate, filterProject, filterRequester, filterStatus]);

  const handlePageChange = useCallback(page => {
    if (activeTab === "requirements") {
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
          {[["requirements", "Requisitions (Current)"], ["allocations", "Allocated Stock Registry"]].map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all ${activeTab === tab ? "bg-white dark:bg-gray-700 text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
            >
              {label}
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
            placeholder="Search by ID, Requester, Project..."
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
                    .filter(req => !tableFilter || [req.mrNumber || req.id, req.project, req.requesterName, req.location, req.status].some(f => f?.toLowerCase().includes(tableFilter.toLowerCase())))
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
                          {isMRLocked(req.id) && <Badge text="PO" color="blue" icon={Link2} className="px-1" />}
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
                            <button title="Edit" disabled={isMRLocked(req.id) && role !== "Super Admin"} onClick={() => openEditModal(req)} className={cn("p-1.5 rounded text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors", isMRLocked(req.id) && role !== "Super Admin" && "opacity-30 cursor-not-allowed")}><Pencil className="w-3.5 h-3.5" /></button>
                          )}
                          {hasPermission("DELETE_MATERIAL_REQUIREMENT") && (
                            <button title="Delete" disabled={isMRLocked(req.id) && role !== "Super Admin"} onClick={() => setDeletingId(req.id)} className={cn("p-1.5 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors", isMRLocked(req.id) && role !== "Super Admin" && "opacity-30 cursor-not-allowed")}><Trash2 className="w-3.5 h-3.5" /></button>
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
            {materialRequirementsPagination && materialRequirementsPagination.page < materialRequirementsPagination.pages && !loading && (
              <div className="flex justify-center py-3 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => handlePageChange(materialRequirementsPagination.page + 1)} className="px-4 py-1.5 text-[12px] font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">Load more</button>
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
                <Virtuoso
                  style={{ height: "calc(100vh - 350px)" }}
                  data={materialRequirements || []}
                  context={{ inventory }}
                  endReached={() => {
                    if (materialRequirementsPagination?.page < materialRequirementsPagination?.pages && !loading) {
                      handlePageChange(materialRequirementsPagination.page + 1);
                    }
                  }}
                  itemContent={(_index, req, { inventory: inv }) => (
                    <div className="pb-4">
                      <Card
                        className={cn(
                          "p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all",
                          (req.status === "Store Pending" || req.status === "Quotation Phase") &&
                          "approval-highlight ring-1 ring-primary/20 shadow-lg shadow-primary/5 scale-[1.01]"
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
                              <StatusBadge status={req.status} />
                              {isMRLocked(req.id) && <Badge text="PO Created" color="blue" icon={Link2} className="px-1.5" />}
                              {req.items.some(i => i.status === "In Stock" || i.status === "Partial") && (
                                <Badge text="Stock Available" color="green" icon={Check} className="gap-1 px-1.5" />
                              )}
                              {(req.status === "Store Pending" || req.status === "Quotation Phase") && (
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
                                          fetchResource("material-requirements");
                                          fetchResource("inventory");
                                        }
                                      } catch (err) { toast.error("Allocation failed: " + err.message); }
                                    }}
                                  >
                                    <Check className="w-3.5 h-3.5" /><span>Allocate</span>
                                  </button>
                                )}

                              {hasPermission("EDIT_MATERIAL_REQUIREMENT") && (
                                <button
                                  title={isMRLocked(req.id) && role !== "Super Admin" ? "Locked: Purchase Order exists" : "Edit MR"}
                                  disabled={isMRLocked(req.id) && role !== "Super Admin"}
                                  onClick={e => { e.stopPropagation(); openEditModal(req); }}
                                  className={cn("p-2 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors", isMRLocked(req.id) && role !== "Super Admin" && "opacity-30 cursor-not-allowed")}
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                              )}
                              {hasPermission("DELETE_MATERIAL_REQUIREMENT") && (
                                <button
                                  title={isMRLocked(req.id) && role !== "Super Admin" ? "Locked: Purchase Order exists" : "Delete MR"}
                                  disabled={isMRLocked(req.id) && role !== "Super Admin"}
                                  onClick={e => { e.stopPropagation(); setDeletingId(req.id); }}
                                  className={cn("p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors", isMRLocked(req.id) && role !== "Super Admin" && "opacity-30 cursor-not-allowed")}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Items chips */}
                        <div className="p-4 bg-white dark:bg-gray-900">
                          <div className="flex flex-wrap gap-2">
                            {req.items.map((item, idx) => (
                              <div
                                key={idx}
                                className={cn(
                                  "px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border rounded-lg flex flex-col gap-1",
                                  isItemPOCreated(item, req)
                                    ? "border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20"
                                    : "border-gray-100 dark:border-gray-700"
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <Package className="w-3.5 h-3.5 text-primary" />
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{item.materialName}</span>
                                      {isItemPOCreated(item, req) && (
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
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>
                    </div>
                  )}
                />
              )}

            {!materialRequirements?.length && !loading && (
              <div className="text-center py-12 text-gray-500 text-[13px]">No material requirements found.</div>
            )}
            {loading && materialRequirements.length > 0 && (
              <div className="flex items-center justify-center py-4 text-gray-500 text-xs">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                Loading more requirements...
              </div>
            )}
          </>
        ) : (
          <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-[650px] flex flex-col">
            <div className="flex-1 overflow-x-auto no-scrollbar-lg relative">
              <table className="w-full text-left border-collapse table-fixed min-w-[800px] md:min-w-0">
                <thead className="hidden md:table-header-group sticky top-0 z-10">
                  <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                    {["Engineer / Project", "MR details", "Allocated material", "Qty", "Allocation date"].map(h => (
                      <th key={h} className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap sticky top-0 z-10">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {mrAllocations.length === 0 && !loading && (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-500 italic text-[13px]">No active stock allocations found.</td></tr>
                  )}
                  {mrAllocations.map((alc, idx) => (
                    <tr key={alc.id || idx} className="block md:table-row hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all text-[13px]">
                      <td className="w-full md:w-auto block md:table-cell p-0 md:p-3">
                        <div className="md:hidden p-4 border-b border-gray-100 dark:border-gray-800">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-[10px] font-bold text-gray-400">{formatDateTime(alc.allocationDate)}</p>
                              <h4 className="text-[14px] font-bold text-gray-900 dark:text-white mt-0.5">{alc.itemName}</h4>
                              <p className="text-[11px] font-mono text-gray-400">{alc.sku}</p>
                            </div>
                            <div className="bg-primary/10 dark:bg-primary/20 px-3 py-1 rounded-lg text-center">
                              <p className="text-[14px] font-black text-primary">{alc.allocatedQty}</p>
                              <p className="text-[9px] font-bold text-primary/80">Allocated</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-[12px] mt-4 pt-3 border-t border-gray-50 dark:border-gray-800">
                            <div><p className="text-[9px] font-bold text-gray-400">Engineer</p><p className="font-medium text-gray-700 dark:text-gray-300">{alc.engineerName || "N/A"}</p></div>
                            <div><p className="text-[9px] font-bold text-gray-400">Project</p><p className="font-medium text-gray-700 dark:text-gray-300 truncate">{alc.projectName || "N/A"}</p></div>
                          </div>
                          <div className="mt-2 flex items-center gap-1">
                            <p className="text-[10px] text-gray-400 font-bold tracking-widest">Mr id:</p>
                            <p className="text-[11px] font-mono font-bold text-primary">{alc.mrNumber || alc.mrId}</p>
                          </div>
                        </div>
                        <div className="hidden md:flex flex-col min-w-0">
                          <span className="block truncate font-bold text-[#1A1A2E] dark:text-white text-[12px]">{alc.engineerName || "N/A"}</span>
                          <span className="block truncate text-[11px] text-[#6B7280] dark:text-gray-400 italic">{alc.projectName || "N/A"}</span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5"><span className="block truncate font-mono text-[11px] text-[#6B7280]">{alc.mrNumber || alc.mrId}</span></td>
                      <td className="hidden md:table-cell px-3 py-2.5">
                        <div className="flex flex-col min-w-0">
                          <span className="block truncate text-[13px] font-medium text-gray-700 dark:text-gray-300">{alc.itemName}</span>
                          <span className="block truncate text-[10px] text-gray-400 font-mono tracking-tight">{alc.sku}</span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 dark:bg-primary/20 text-primary rounded font-bold text-[12px] min-w-[30px] justify-center">{alc.allocatedQty}</span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-[#6B7280] dark:text-gray-500 whitespace-nowrap">{formatDateTime(alc.allocationDate)}</td>
                    </tr>
                  ))}
                  {loading && mrAllocations.length > 0 && (
                    <tr><td colSpan={5} className="py-4 text-center"><div className="flex items-center justify-center text-gray-500 text-xs"><div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />Loading more...</div></td></tr>
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
