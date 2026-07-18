var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useState, useCallback, useEffect, useMemo } from "react";
import { useAppStore } from "../store";
import {
  PageHeader,
  Card,
  StatusBadge,
  Btn,
  Modal,
  Field,
  SField,
  Pagination,
  ConfirmModal,
  Skeleton,
  SearchSelect
} from "../components/ui";
import { FilterRow, SearchFilter, SelectFilter, DateRangePicker } from "../components/ui/Filters";
import { Plus, Search, AlertTriangle, Eye, Pencil, Trash2, Package, ChevronDown, ChevronUp, Users, Building2, ClipboardList, CheckCircle2, Send, ThumbsUp, ThumbsDown, XCircle, Clock } from "lucide-react";
import { genId, todayStr, scrollToError, formatDateTime } from "../utils";
import { cn } from "../lib/utils";
import toast from "react-hot-toast";
const MaterialPlanning = /* @__PURE__ */ __name(() => {
  const {
    plans,
    plansPagination,
    fetchResource,
    addPlan,
    updatePlan,
    deletePlan,
    submitPlan,
    approvePlan,
    rejectPlan,
    role,
    user,
    inventory,
    mrAllocations,
    planRevisions,
    createPlanRevision,
    reviewPlanRevision,
    loading,
    actionLoading,
    hasPermission,
    settings,
    users,
    fetchUsers
  } = useAppStore();
  const isAdmin = ["Super Admin", "Director", "Project Manager", "admin", "AGM", "Head"].includes(role || "");
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  const { projects: PROJECTS, workTypes: WORK_TYPES, requesters: REQUESTERS } = settings;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const filter = {};
    if (statusFilter) filter.status = statusFilter;
    if (projectFilter) filter.project = projectFilter;
    fetchResource(
      "planning",
      1,
      50,
      false,
      debouncedSearch,
      Object.keys(filter).length > 0 ? filter : null,
      false,
      false,
      dateRange.startDate,
      dateRange.endDate
    );
    fetchResource("inventory", 1, 100, true);
    fetchResource("mr-allocations", 1, 2e3, true);
    fetchResource("plan-revisions", 1, 500, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, projectFilter, dateRange]);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToError();
    }
  }, [errors]);
  const [deletingId, setDeletingId] = useState(null);
  const [customProject, setCustomProject] = useState("");
  const [revisionModal, setRevisionModal] = useState(false);
  const [revisionItem, setRevisionItem] = useState(null);
  const [revisionQty, setRevisionQty] = useState(1);
  const [revisionReason, setRevisionReason] = useState("");
  const [rejectingRevisionId, setRejectingRevisionId] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [activeTab, setActiveTab] = useState("plans");
  const [engineerTabFilter, setEngineerTabFilter] = useState("");
  const [projectTabFilter, setProjectTabFilter] = useState("");
  const [gmAgmTabFilter, setGmAgmTabFilter] = useState("");
  const [tabDateRange, setTabDateRange] = useState({ startDate: "", endDate: "" });
  const [tabSharedProjectFilter, setTabSharedProjectFilter] = useState("");
  const [tabSharedEngineerFilter, setTabSharedEngineerFilter] = useState("");
  const [expandedEngineers, setExpandedEngineers] = useState(/* @__PURE__ */ new Set());
  const [selectedProjectDetail, setSelectedProjectDetail] = useState(null);
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [editPlanFields, setEditPlanFields] = useState({ engineer: "", gmAgm: "" });
  const [rejectModal, setRejectModal] = useState(null); // plan object being rejected
  const [rejectReason, setRejectReason] = useState("");

  const isGM = hasPermission("APPROVE_MATERIAL_PLAN") || ["Super Admin", "Director", "admin", "GM"].includes(role || "");
  const canReject = hasPermission("REJECT_MATERIAL_PLAN") || ["Super Admin", "Director", "admin", "GM"].includes(role || "");
  const isAGM = hasPermission("CREATE_MATERIAL_PLAN") || ["AGM", "Head", "Project Manager", "Super Admin", "Director", "admin"].includes(role || "");

  const handleSubmitForApproval = async (plan) => {
    try {
      await submitPlan(plan.id);
      toast.success(`Plan ${plan.id} submitted for GM approval`);
    } catch (e) {
      toast.error(e?.message || "Failed to submit plan");
    }
  };

  const handleApprovePlan = async (plan) => {
    try {
      await approvePlan(plan.id);
      toast.success(`Plan ${plan.id} approved`);
    } catch (e) {
      toast.error(e?.message || "Failed to approve plan");
    }
  };

  const handleRejectPlan = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) { toast.error("Please enter a rejection reason"); return; }
    try {
      await rejectPlan(rejectModal.id, rejectReason.trim());
      toast.success(`Plan ${rejectModal.id} rejected`);
      setRejectModal(null);
      setRejectReason("");
    } catch (e) {
      toast.error(e?.message || "Failed to reject plan");
    }
  };
  const validateForm = /* @__PURE__ */ __name((data) => {
    const newErrors = {};
    if (!data.project) newErrors.project = "Project is required";
    if (data.project === "Other" && !customProject) newErrors.customProject = "Project name is required";
    if (!data.items || (data.items?.length || 0) === 0) newErrors.items = "At least one item is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, "validateForm");
  const canEdit = ["Super Admin", "Director", "Project Manager"].includes(role || "");
  useEffect(() => {
    if (activeTab !== "plans") {
      fetchResource("planning", 1, 2e3, true, "", null, false);
    }
  }, [activeTab, fetchResource]);
  const filteredPlansForTabs = useMemo(() => {
    return plans.filter((plan) => {
      if (tabDateRange?.startDate) {
        if (new Date(plan.date) < new Date(tabDateRange.startDate)) return false;
      }
      if (tabDateRange?.endDate) {
        if (new Date(plan.date) > /* @__PURE__ */ new Date(tabDateRange.endDate + "T23:59:59")) return false;
      }
      if (tabSharedProjectFilter && plan.project !== tabSharedProjectFilter) return false;
      if (tabSharedEngineerFilter && plan.engineer !== tabSharedEngineerFilter) return false;
      return true;
    });
  }, [plans, tabDateRange, tabSharedProjectFilter, tabSharedEngineerFilter]);
  const engineerSummary = useMemo(() => {
    const map = {};
    filteredPlansForTabs.forEach((plan) => {
      const eng = plan.engineer || "Unassigned";
      if (!map[eng]) map[eng] = { name: eng, projects: [], planCount: 0, totalRequired: 0, totalAllotted: 0, totalPending: 0, mrCount: 0, materials: {} };
      if (plan.project && !map[eng].projects.includes(plan.project)) map[eng].projects.push(plan.project);
      map[eng].planCount++;
      (plan.items || []).forEach((item) => {
        const allotted = mrAllocations.filter((a) => a.sku === item.sku && a.engineerName?.trim().toLowerCase() === eng.trim().toLowerCase() && a.projectName?.trim().toLowerCase() === (plan.project || "").trim().toLowerCase()).reduce((s, a) => s + (a.allocatedQty || 0), 0);
        const req = Number(item.required) || 0;
        const pending = Math.max(0, req - allotted);
        map[eng].totalRequired += req;
        map[eng].totalAllotted += allotted;
        map[eng].totalPending += pending;
        const matKey = item.sku || item.itemName || "unknown";
        const matName = item.itemName || item.materialName || item.name || item.sku || "Unknown";
        if (!map[eng].materials[matKey]) {
          map[eng].materials[matKey] = { name: matName, sku: item.sku || "", unit: item.unit || "", required: 0, allotted: 0, pending: 0 };
        }
        map[eng].materials[matKey].required += req;
        map[eng].materials[matKey].allotted += allotted;
        map[eng].materials[matKey].pending += pending;
      });
    });
    mrAllocations.forEach((mr) => {
      const eng = mr.engineerName || "Unassigned";
      if (map[eng]) map[eng].mrCount++;
    });
    return Object.values(map).sort((a, b) => b.planCount - a.planCount);
  }, [filteredPlansForTabs, mrAllocations]);
  const projectSummary = useMemo(() => {
    const map = {};
    filteredPlansForTabs.forEach((plan) => {
      const proj = plan.project || "Unassigned";
      if (!map[proj]) map[proj] = { name: proj, engineers: [], plans: [], planCount: 0, mrCount: 0, totalRequired: 0, totalAllotted: 0, totalPending: 0 };
      if (plan.engineer && !map[proj].engineers.includes(plan.engineer)) map[proj].engineers.push(plan.engineer);
      map[proj].planCount++;
      map[proj].plans.push(plan);
      (plan.items || []).forEach((item) => {
        const allotted = mrAllocations.filter((a) => a.sku === item.sku && a.projectName?.trim().toLowerCase() === proj.trim().toLowerCase()).reduce((s, a) => s + (a.allocatedQty || 0), 0);
        map[proj].totalRequired += Number(item.required) || 0;
        map[proj].totalAllotted += allotted;
        map[proj].totalPending += Math.max(0, (Number(item.required) || 0) - allotted);
      });
    });
    mrAllocations.forEach((mr) => {
      const proj = mr.projectName || "Unassigned";
      if (map[proj]) map[proj].mrCount++;
    });
    return Object.values(map).sort((a, b) => b.planCount - a.planCount);
  }, [filteredPlansForTabs, mrAllocations]);
  const gmAgmSummary = useMemo(() => {
    const map = {};
    filteredPlansForTabs.forEach((plan) => {
      const gm = plan.gmAgm || "Unassigned";
      if (!map[gm]) map[gm] = { name: gm, projects: [], totalPlans: 0, projectPlans: {} };
      const proj = plan.project || "Unassigned";
      if (!map[gm].projects.includes(proj)) map[gm].projects.push(proj);
      map[gm].totalPlans++;
      if (!map[gm].projectPlans[proj]) map[gm].projectPlans[proj] = [];
      map[gm].projectPlans[proj].push(plan);
    });
    return Object.values(map).sort((a, b) => b.totalPlans - a.totalPlans);
  }, [filteredPlansForTabs]);
  const [newPlan, setNewPlan] = useState({
    project: "",
    milestone: "",
    workType: "",
    location: "",
    items: []
  });
  const [searchItem, setSearchItem] = useState("");
  useEffect(() => {
    if (!modal) return;
    const delayDebounceFn = setTimeout(() => {
      if (searchItem) {
        fetchResource("inventory", 1, 100, true, searchItem);
      } else {
        fetchResource("inventory", 1, 200, true);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchItem, fetchResource, modal]);
  const handlePageChange = useCallback((page) => {
    fetchResource("planning", page);
  }, [fetchResource]);
  const handleCreate = /* @__PURE__ */ __name(async () => {
    if (!validateForm(newPlan)) {
      return;
    }
    const finalProject = newPlan.project === "Other" ? customProject : newPlan.project;
    if (isEditing) {
      try {
        const wasApproved = newPlan.status === "Approved";
        await updatePlan(newPlan.id, { ...newPlan, project: finalProject });
        setModal(false);
        setNewPlan({ project: "", milestone: "", workType: "", location: "", items: [] });
        setCustomProject("");
        setIsEditing(false);
        setErrors({});
        toast.success(wasApproved ? "Plan edited — sent back to GM for re-approval" : "Plan updated successfully");
      } catch (error) {
        toast.error(`Failed to update material plan: ${error.message}`);
      }
      return;
    }
    const maxIdNum = plans.reduce((max, p) => {
      const parts = p.id.split("-");
      const num = parseInt(parts[parts.length - 1] || "0");
      return num > max ? num : max;
    }, 0);
    const plan = {
      id: genId("MP", maxIdNum),
      project: finalProject,
      milestone: newPlan.milestone,
      workType: newPlan.workType,
      location: newPlan.location || "",
      date: (/* @__PURE__ */ new Date()).toISOString(),
      status: "Draft",
      items: newPlan.items,
      gmAgm: user?.name || ""
    };
    try {
      await addPlan(plan);
      setModal(false);
      setNewPlan({ project: "", milestone: "", workType: "", location: "", items: [] });
      setCustomProject("");
      setErrors({});
      toast.success("Plan created successfully");
    } catch (error) {
      toast.error(`Failed to create material plan: ${error.message}`);
    }
  }, "handleCreate");
  const addItem = /* @__PURE__ */ __name((invItem) => {
    const reusable = inventory.filter(
      (i) => i.sku === invItem.sku && ["Good", "Needs Repair"].includes(i.condition)
    ).reduce((sum, i) => sum + i.liveStock, 0);
    const item = {
      sku: invItem.sku,
      itemName: invItem.itemName,
      required: 1,
      unit: invItem.unit,
      available: invItem.liveStock,
      reusable,
      shortage: Math.max(0, 1 - invItem.liveStock),
      priority: "Medium",
      delivery: todayStr(),
      activity: ""
    };
    setNewPlan({ ...newPlan, items: [...newPlan.items || [], item] });
    setSearchItem("");
  }, "addItem");
  const updateItem = /* @__PURE__ */ __name((idx, field, value) => {
    const items = [...newPlan.items || []];
    items[idx] = { ...items[idx], [field]: value };
    if (field === "required") {
      items[idx].shortage = Math.max(
        0,
        Number(value) - (items[idx].available || 0) - (items[idx].reusable || 0)
      );
    }
    setNewPlan({ ...newPlan, items });
  }, "updateItem");
  const addAdditionalItem = /* @__PURE__ */ __name((inv) => {
    setAdditionalItems([
      ...additionalItems,
      {
        sku: inv.sku || "",
        itemName: inv.itemName || inv.materialName || inv.name || "",
        required: 1,
        unit: inv.unit || "NOS",
        available: inv.liveStock || 0,
        reusable: 0,
        shortage: Math.max(0, 1 - (inv.liveStock || 0)),
        priority: "Medium",
        delivery: todayStr(),
        activity: ""
      }
    ]);
    setSearchAdditionalItem("");
  }, "addAdditionalItem");
  const updateAdditionalItem = /* @__PURE__ */ __name((idx, field, value) => {
    const items = [...additionalItems];
    items[idx] = { ...items[idx], [field]: value };
    if (field === "required") {
      items[idx].shortage = Math.max(
        0,
        Number(value) - (items[idx].available || 0) - (items[idx].reusable || 0)
      );
    }
    setAdditionalItems(items);
  }, "updateAdditionalItem");
  const handleAddAdditionalItems = /* @__PURE__ */ __name(async () => {
    if (!addingToPlan) return;
    const validItems = additionalItems.filter((i) => i.itemName || i.materialName || i.name);
    if (validItems.length === 0) {
      toast.error("Please add at least one valid item");
      return;
    }
    const updatedPlan = { ...addingToPlan };
    const mergedItems = [...updatedPlan.items || []];
    for (const newItem of validItems) {
      const existingIdx = mergedItems.findIndex(
        (i) => i.sku && newItem.sku && i.sku === newItem.sku || i.itemName && newItem.itemName && i.itemName === newItem.itemName || i.materialName && newItem.materialName && i.materialName === newItem.materialName || i.name && newItem.name && i.name === newItem.name
      );
      if (existingIdx >= 0) {
        mergedItems[existingIdx] = {
          ...mergedItems[existingIdx],
          required: Number(mergedItems[existingIdx].required || 0) + Number(newItem.required || 0)
        };
        mergedItems[existingIdx].shortage = Math.max(0, Number(mergedItems[existingIdx].required) - (mergedItems[existingIdx].available || 0) - (mergedItems[existingIdx].reusable || 0));
      } else {
        newItem.shortage = Math.max(0, Number(newItem.required) - (newItem.available || 0) - (newItem.reusable || 0));
        mergedItems.push(newItem);
      }
    }
    updatedPlan.items = mergedItems;
    updatedPlan.addOns = [
      ...updatedPlan.addOns || [],
      {
        date: (/* @__PURE__ */ new Date()).toISOString(),
        items: validItems.map((i) => ({ ...i }))
      }
    ];
    try {
      await updatePlan(updatedPlan.id, updatedPlan);
      toast.success("Materials added successfully!");
      setAddingToPlan(null);
      setAdditionalItems([]);
    } catch (error) {
      toast.error(`Failed to add materials: ${error.message}`);
    }
  }, "handleAddAdditionalItems");
  const handleConfirmDelete = /* @__PURE__ */ __name(async () => {
    if (!deletingId) return;
    try {
      await deletePlan(deletingId);
      toast.success("Plan deleted successfully");
      setDeletingId(null);
    } catch (error) {
      console.error("Failed to delete material plan:", error);
    }
  }, "handleConfirmDelete");
  return <div className="space-y-6">
      <PageHeader
    title="Material Planning"
    sub="Plan materials for upcoming project milestones"
    actions={hasPermission("CREATE_MATERIAL_PLAN") && <Btn
      label="New Plan"
      icon={Plus}
      onClick={() => {
        setNewPlan({ project: "", milestone: "", workType: "", location: "", items: [] });
        setCustomProject("");
        setErrors({});
        setIsEditing(false);
        setModal(true);
      }}
    />}
  />

      {
    /* ── Tab Navigation ── */
  }
      <div className="flex gap-1 bg-gray-100/80 dark:bg-gray-800/60 p-1 rounded-xl w-fit border border-gray-200/60 dark:border-gray-700/40">
        {[
    { id: "plans", label: "Plans" },
    { id: "engineers", label: "Engineers" },
    { id: "projects", label: "Projects" },
    { id: "gmAgm", label: "GM / AGM" }
  ].map((tab) => <button
    key={tab.id}
    onClick={() => {
      setActiveTab(tab.id);
      setTabDateRange({ startDate: "", endDate: "" });
      setTabSharedProjectFilter("");
      setTabSharedEngineerFilter("");
    }}
    className={cn(
      "px-4 py-1.5 text-[13px] font-bold rounded-lg transition-all",
      activeTab === tab.id ? "bg-white dark:bg-gray-900 text-primary shadow-sm border border-gray-200/80 dark:border-gray-700" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
    )}
  >
            {tab.label}
          </button>)}
      </div>

      {activeTab === "plans" && isGM && plans.filter(p => p.status === "Pending Approval").length > 0 && <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/15 border border-amber-200 dark:border-amber-700/40 rounded-xl">
          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-[13px] font-semibold text-amber-700 dark:text-amber-400">
            {plans.filter(p => p.status === "Pending Approval").length} material plan{plans.filter(p => p.status === "Pending Approval").length !== 1 ? "s" : ""} awaiting your approval
          </p>
          <button
    onClick={() => setStatusFilter("Pending Approval")}
    className="ml-auto text-[12px] font-bold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
  >
            Review Now
          </button>
        </div>}

      {activeTab === "plans" && <>
      <FilterRow>
        <SearchFilter
    value={search}
    onChange={setSearch}
    placeholder="Search by Plan ID, Project, or Milestone..."
  />
        <DateRangePicker
    value={dateRange}
    onChange={setDateRange}
  />
        <SelectFilter
    value={projectFilter}
    onChange={setProjectFilter}
    options={PROJECTS || []}
    placeholder="All Projects"
  />
        <SelectFilter
    value={statusFilter}
    onChange={setStatusFilter}
    options={["Draft", "Open", "Pending Approval", "Approved", "Rejected", "PO Raised", "Fulfilled"]}
    placeholder="All Status"
  />
      </FilterRow>

      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-[180px]">ID</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Project</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Item in No</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {loading && plans.length === 0 ? [...Array(5)].map((_, i) => <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20 ml-auto" /></td>
                </tr>) : plans.map((plan) => <tr key={plan.id} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors group">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setSelectedPlan(plan); setViewModal(true); }}
                      className="text-[13px] font-medium text-gray-900 dark:text-gray-200 hover:underline text-left leading-tight"
                    >
                      {plan.id}
                    </button>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-[12px] text-gray-600 dark:text-gray-400">{formatDateTime(plan.date)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white">{plan.project || "—"}</p>
                    {(plan.workType || plan.milestone) && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{[plan.workType, plan.milestone].filter(Boolean).join(" · ")}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[13px] font-bold text-gray-900 dark:text-white">{plan.items.length}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge status={plan.status} />
                      {plan.status === "Pending Approval" && plan.submittedBy && <span className="text-[10px] text-amber-600 dark:text-amber-400">by {plan.submittedBy}</span>}
                      {plan.status === "Approved" && plan.approvedBy && <span className="text-[10px] text-emerald-600 dark:text-emerald-400">by {plan.approvedBy}</span>}
                      {plan.status === "Rejected" && plan.rejectedBy && <span className="text-[10px] text-red-500 dark:text-red-400" title={plan.rejectionReason || ""}>by {plan.rejectedBy}{plan.rejectionReason ? ` · "${plan.rejectionReason.slice(0, 30)}${plan.rejectionReason.length > 30 ? "…" : ""}"` : ""}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 justify-end flex-wrap">
                      <button 
                        onClick={() => { setSelectedPlan(plan); setViewModal(true); }} 
                        className="p-1.5 text-gray-500 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all" 
                        title="View"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      
                      {hasPermission("EDIT_MATERIAL_PLAN") && ["Draft", "Open", "Approved", "Rejected", "Pending Approval"].includes(plan.status) && (
                        <button 
                          onClick={() => {
                            const isStandardProject = PROJECTS.some((p) => p === plan.project || p?.value === plan.project);
                            setNewPlan({ ...plan, project: isStandardProject ? plan.project : "Other" });
                            setCustomProject(isStandardProject ? "" : plan.project);
                            setIsEditing(true);
                            setModal(true);
                          }} 
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all" 
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}

                      
                      {hasPermission("DELETE_MATERIAL_PLAN") && ["Draft", "Open"].includes(plan.status) && (
                        <button 
                          onClick={() => setDeletingId(plan.id)} 
                          className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all" 
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>)}
            </tbody>
          </table>
        </div>
        {(!plans || plans.length === 0) && !loading && <div className="text-center py-12 text-gray-500 text-[13px]">No material plans created yet.</div>}
      </div>

      {plansPagination && <Pagination data={plansPagination} onPageChange={handlePageChange} />}
      </>}

      {
    /* ── Engineers Tab ── */
  }
      {activeTab === "engineers" && <div className="space-y-4">
          <FilterRow>
            <SearchFilter value={engineerTabFilter} onChange={setEngineerTabFilter} placeholder="Search engineer..." />
            <DateRangePicker value={tabDateRange} onChange={setTabDateRange} />
            <SelectFilter value={tabSharedProjectFilter} onChange={setTabSharedProjectFilter} options={PROJECTS || []} placeholder="All Projects" />
            <SelectFilter value={tabSharedEngineerFilter} onChange={setTabSharedEngineerFilter} options={REQUESTERS || []} placeholder="All Engineers" />
          </FilterRow>
          <div className="space-y-3">
            {engineerSummary.filter((e) => !engineerTabFilter.trim() || e.name.toLowerCase().includes(engineerTabFilter.trim().toLowerCase())).map((eng) => {
    const isExpanded = expandedEngineers.has(eng.name);
    const toggleExpand = /* @__PURE__ */ __name(() => setExpandedEngineers((prev) => {
      const next = new Set(prev);
      next.has(eng.name) ? next.delete(eng.name) : next.add(eng.name);
      return next;
    }), "toggleExpand");
    const materialList = Object.values(eng.materials).sort((a, b) => b.required - a.required);
    return <Card key={eng.name} className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  {
      /* Header row */
    }
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-[14px] shrink-0">
                          {eng.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">{eng.name}</h3>
                          <p className="text-[12px] text-gray-500 dark:text-gray-400">{eng.planCount} plan{eng.planCount !== 1 ? "s" : ""} · {eng.projects.length} project{eng.projects.length !== 1 ? "s" : ""} · {materialList.length} material{materialList.length !== 1 ? "s" : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-5 flex-wrap">
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">MRs</p>
                          <p className="text-[16px] font-black text-blue-500 dark:text-blue-400">{eng.mrCount}</p>
                        </div>
                        <button
      onClick={toggleExpand}
      className="flex items-center gap-1 text-[11px] font-bold text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 transition-all hover:border-primary/40"
    >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {isExpanded ? "Hide" : "Materials"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {
      /* Projects row */
    }
                  <div className="px-4 py-3 flex items-center gap-3 flex-wrap border-b border-gray-100 dark:border-gray-800">
                    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">Projects</p>
                    <div className="flex flex-wrap gap-2">
                      {eng.projects.length > 0 ? eng.projects.map((proj) => <button
      key={proj}
      onClick={() => {
        setProjectTabFilter(proj);
        setActiveTab("projects");
      }}
      className="text-[11px] font-bold px-2.5 py-1 bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary hover:text-white rounded-full transition-all"
    >
                          {proj}
                        </button>) : <span className="text-[12px] text-gray-400">—</span>}
                    </div>
                  </div>

                  {
      /* Material breakdown (expanded) */
    }
                  {isExpanded && <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                          <tr>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Material</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Required</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Allotted</th>
                            <th className="px-4 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Pending</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                          {materialList.map((mat, idx) => <tr key={idx} className="hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-md bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                                    <Package className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                                  </div>
                                  <div>
                                    <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{mat.name}</p>
                                    {mat.sku && <p className="text-[10px] text-gray-400 dark:text-gray-500">{mat.sku}</p>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-[13px] font-bold text-right text-gray-700 dark:text-gray-300">
                                {mat.required} <span className="text-[11px] font-normal text-gray-400">{mat.unit}</span>
                              </td>
                              <td className="px-4 py-2.5 text-[13px] font-bold text-right text-emerald-600 dark:text-emerald-400">
                                {mat.allotted > 0 ? <>{mat.allotted} <span className="text-[11px] font-normal text-gray-400">{mat.unit}</span></> : <span className="text-gray-300 dark:text-gray-600">—</span>}
                              </td>
                              <td className="px-4 py-2.5 text-[13px] font-bold text-right">
                                {mat.pending > 0 ? <span className="text-red-500 dark:text-red-400">{mat.pending} <span className="text-[11px] font-normal">{mat.unit}</span></span> : <span className="text-emerald-600 dark:text-emerald-400">✓ Done</span>}
                              </td>
                            </tr>)}
                          {materialList.length === 0 && <tr><td colSpan={4} className="px-4 py-4 text-center text-[12px] text-gray-400">No materials found.</td></tr>}
                        </tbody>
                      </table>
                    </div>}
                </Card>;
  })}
            {engineerSummary.filter((e) => !engineerTabFilter.trim() || e.name.toLowerCase().includes(engineerTabFilter.trim().toLowerCase())).length === 0 && <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-[13px]">No engineers found.</div>}
          </div>
        </div>}

      {
    /* ── Projects Tab ── */
  }
      {activeTab === "projects" && <div className="space-y-4">
          <FilterRow>
            <SearchFilter value={projectTabFilter} onChange={setProjectTabFilter} placeholder="Search project..." />
            <DateRangePicker value={tabDateRange} onChange={setTabDateRange} />
            <SelectFilter value={tabSharedProjectFilter} onChange={setTabSharedProjectFilter} options={PROJECTS || []} placeholder="All Projects" />
            <SelectFilter value={tabSharedEngineerFilter} onChange={setTabSharedEngineerFilter} options={REQUESTERS || []} placeholder="All Engineers" />
          </FilterRow>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectSummary.filter((p) => !projectTabFilter.trim() || p.name.toLowerCase().includes(projectTabFilter.trim().toLowerCase())).map((proj) => {
    const gmAgms = [...new Set(proj.plans.map((p) => p.gmAgm).filter(Boolean))];
    return <div
      key={proj.name}
      onClick={() => setSelectedProjectDetail(proj)}
      className="group cursor-pointer bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200"
    >
                    {
      /* Card Header */
    }
                    <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-800/60 dark:to-gray-800/30 border-b border-gray-100 dark:border-gray-800">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center shrink-0 shadow-sm">
                            <Building2 className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-[13px] font-bold text-gray-900 dark:text-white truncate leading-tight">{proj.name}</h3>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                              {gmAgms.length > 0 ? gmAgms.slice(0, 2).join(", ") : "No AGM assigned"}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 w-6 h-6 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-primary group-hover:bg-primary/5 transition-all">
                          <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-primary -rotate-90 transition-all" />
                        </div>
                      </div>
                    </div>

                    {
      /* Stats Row */
    }
                    <div className="grid grid-cols-3 divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800">
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[16px] font-black text-primary">{proj.planCount}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Plans</p>
                      </div>
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[16px] font-black text-blue-500">{proj.mrCount}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">MRs</p>
                      </div>
                      <div className="px-3 py-2.5 text-center">
                        <p className="text-[16px] font-black text-emerald-500">{proj.engineers.length}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Engineers</p>
                      </div>
                    </div>

                    {
      /* Engineers Preview */
    }
                    <div className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {proj.engineers.slice(0, 3).map((eng) => <span key={eng} className="text-[11px] font-medium px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full">
                            {eng}
                          </span>)}
                        {proj.engineers.length > 3 && <span className="text-[11px] font-medium px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full">
                            +{proj.engineers.length - 3} more
                          </span>}
                        {proj.engineers.length === 0 && <span className="text-[11px] text-gray-400">No engineers assigned</span>}
                      </div>
                    </div>
                  </div>;
  })}
            {projectSummary.filter((p) => !projectTabFilter.trim() || p.name.toLowerCase().includes(projectTabFilter.trim().toLowerCase())).length === 0 && <div className="col-span-3 text-center py-12 text-gray-500 dark:text-gray-400 text-[13px]">No projects found.</div>}
          </div>
        </div>}

      {
    /* ── Project Detail Modal ── */
  }
      {selectedProjectDetail && <Modal
    title={selectedProjectDetail.name}
    wide
    onClose={() => {
      setSelectedProjectDetail(null);
      setEditingPlanId(null);
    }}
    footer={<div className="flex justify-end w-full">
              <Btn label="Close" outline onClick={() => {
      setSelectedProjectDetail(null);
      setEditingPlanId(null);
    }} />
            </div>}
  >
          <div className="space-y-5">
            {
    /* Stats */
  }
            <div className="grid grid-cols-3 gap-3">
              {[
    { icon: ClipboardList, label: "Material Plans", value: selectedProjectDetail.planCount, color: "text-primary", bg: "bg-orange-50 dark:bg-orange-900/20" },
    { icon: Package, label: "Material Reqs", value: selectedProjectDetail.mrCount, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20" },
    { icon: Users, label: "Engineers", value: selectedProjectDetail.engineers.length, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-900/20" }
  ].map((stat) => <div key={stat.label} className={`rounded-xl p-3 flex items-center gap-3 ${stat.bg}`}>
                  <stat.icon className={`w-5 h-5 ${stat.color} shrink-0`} />
                  <div>
                    <p className={`text-[18px] font-black ${stat.color}`}>{stat.value}</p>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</p>
                  </div>
                </div>)}
            </div>

            {
    /* Engineers & AGM Row */
  }
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> Engineers
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedProjectDetail.engineers.length > 0 ? selectedProjectDetail.engineers.map((eng) => <button
    key={eng}
    onClick={() => {
      setEngineerTabFilter(eng);
      setActiveTab("engineers");
      setSelectedProjectDetail(null);
    }}
    className="text-[11px] font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400 hover:bg-blue-500 hover:text-white rounded-full transition-all"
  >
                      {eng}
                    </button>) : <span className="text-[12px] text-gray-400">No engineers assigned</span>}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Building2 className="w-3 h-3" /> GM / AGM
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set(selectedProjectDetail.plans.map((p) => p.gmAgm).filter(Boolean))].length > 0 ? [...new Set(selectedProjectDetail.plans.map((p) => p.gmAgm).filter(Boolean))].map((gm) => <span key={gm} className="text-[11px] font-bold px-2.5 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full">
                        {gm}
                      </span>) : <span className="text-[12px] text-gray-400">No AGM assigned</span>}
                </div>
              </div>
            </div>

            {
    /* Material Plans Table */
  }
            <div>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <ClipboardList className="w-3 h-3" /> Material Plans
                {canEdit && <span className="ml-1 normal-case font-normal text-gray-400 dark:text-gray-500">(click edit to change assignments)</span>}
              </p>
              <div className="space-y-2">
                {selectedProjectDetail.plans.map((plan) => <div key={plan.id} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                    {
    /* Plan header row */
  }
                    <div className="flex items-center justify-between px-3 py-2.5 bg-gray-50/60 dark:bg-gray-800/40">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
    onClick={() => {
      setSelectedPlan(plan);
      setViewModal(true);
    }}
    className="text-[12px] font-bold text-gray-700 dark:text-gray-200 hover:text-primary transition-colors"
  >
                          {plan.id}
                        </button>
                        <StatusBadge status={plan.status} />
                        {plan.workType && <span className="text-[11px] text-gray-400">· {plan.workType}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400 shrink-0">{formatDateTime(plan.date)}</span>
                        {canEdit && editingPlanId !== plan.id && <button
    onClick={() => {
      setEditingPlanId(plan.id);
      setEditPlanFields({ engineer: plan.engineer || "", gmAgm: plan.gmAgm || "" });
    }}
    className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-primary transition-all"
    title="Edit Assignments"
  >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>}
                      </div>
                    </div>

                    {
    /* Assignments row - view or edit */
  }
                    {editingPlanId === plan.id ? <div className="px-3 py-3 bg-white dark:bg-gray-900 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">Engineer</label>
                            <select
    value={editPlanFields.engineer}
    onChange={(e) => setEditPlanFields((f) => ({ ...f, engineer: e.target.value }))}
    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-[12px] text-gray-900 dark:text-white focus:outline-none focus:border-primary"
  >
                              <option value="">— Select Engineer —</option>
                              {REQUESTERS.map((r) => {
    const val = typeof r === "string" ? r : r.value || r.label;
    const lbl = typeof r === "string" ? r : r.label || r.value;
    return <option key={val} value={val}>{lbl}</option>;
  })}
                            </select>
                          </div>
                          <div>
                            <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 block mb-1">GM / AGM</label>
                            <input
    type="text"
    value={editPlanFields.gmAgm}
    onChange={(e) => setEditPlanFields((f) => ({ ...f, gmAgm: e.target.value }))}
    placeholder="GM / AGM name"
    className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-[12px] text-gray-900 dark:text-white focus:outline-none focus:border-primary"
  />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button
    onClick={() => setEditingPlanId(null)}
    className="text-[11px] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
  >
                            Cancel
                          </button>
                          <button
    onClick={async () => {
      try {
        await updatePlan(plan.id, { ...plan, engineer: editPlanFields.engineer, gmAgm: editPlanFields.gmAgm });
        setEditingPlanId(null);
        setSelectedProjectDetail((prev) => ({
          ...prev,
          plans: prev.plans.map((p) => p.id === plan.id ? { ...p, engineer: editPlanFields.engineer, gmAgm: editPlanFields.gmAgm } : p),
          engineers: [...new Set(prev.plans.map((p) => p.id === plan.id ? editPlanFields.engineer : p.engineer).filter(Boolean))]
        }));
        toast.success("Assignments updated successfully");
      } catch (e) {
        toast.error(e?.message || "Failed to update assignments");
      }
    }}
    disabled={actionLoading}
    className="text-[11px] px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all flex items-center gap-1.5 disabled:opacity-60"
  >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Save
                          </button>
                        </div>
                      </div> : <div className="px-3 py-2 bg-white dark:bg-gray-900 flex flex-wrap gap-4">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span className="text-[12px] text-gray-600 dark:text-gray-400">{plan.engineer || <em className="text-gray-300 dark:text-gray-600">No engineer</em>}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3 h-3 text-gray-400" />
                          <span className="text-[12px] text-gray-600 dark:text-gray-400">{plan.gmAgm || <em className="text-gray-300 dark:text-gray-600">No AGM</em>}</span>
                        </div>
                        {plan.location && <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-gray-400">📍</span>
                            <span className="text-[12px] text-gray-600 dark:text-gray-400">{plan.location}</span>
                          </div>}
                      </div>}
                  </div>)}
              </div>
            </div>
          </div>
        </Modal>}

      {
    /* ── GM/AGM Tab ── */
  }
      {activeTab === "gmAgm" && <div className="space-y-4">
          <FilterRow>
            <SearchFilter value={gmAgmTabFilter} onChange={setGmAgmTabFilter} placeholder="Search GM / AGM..." />
            <DateRangePicker value={tabDateRange} onChange={setTabDateRange} />
            <SelectFilter value={tabSharedProjectFilter} onChange={setTabSharedProjectFilter} options={PROJECTS || []} placeholder="All Projects" />
            <SelectFilter value={tabSharedEngineerFilter} onChange={setTabSharedEngineerFilter} options={REQUESTERS || []} placeholder="All Engineers" />
          </FilterRow>
          <div className="space-y-3">
            {gmAgmSummary.filter((g) => !gmAgmTabFilter.trim() || g.name.toLowerCase().includes(gmAgmTabFilter.trim().toLowerCase())).map((gm) => <Card key={gm.name} className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-black text-[14px] shrink-0">
                        {gm.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-[14px] font-bold text-gray-900 dark:text-white">{gm.name}</h3>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400">{gm.projects.length} project{gm.projects.length !== 1 ? "s" : ""} · {gm.totalPlans} plan{gm.totalPlans !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-5">
                    {gm.projects.map((proj) => <div key={proj}>
                        <div className="flex items-center justify-between mb-2">
                          <button
    onClick={() => {
      setProjectTabFilter(proj);
      setActiveTab("projects");
    }}
    className="text-[13px] font-bold text-gray-900 dark:text-white hover:text-primary dark:hover:text-primary transition-colors"
  >
                            {proj}
                          </button>
                          <span className="text-[11px] text-gray-400 dark:text-gray-500">{gm.projectPlans[proj].length} plan{gm.projectPlans[proj].length !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="space-y-1 pl-3 border-l-2 border-gray-100 dark:border-gray-800">
                          {gm.projectPlans[proj].map((plan) => <div
    key={plan.id}
    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
    onClick={() => {
      setSelectedPlan(plan);
      setViewModal(true);
    }}
  >
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[12px] font-bold text-gray-700 dark:text-gray-200">{plan.id}</span>
                                <StatusBadge status={plan.status} />
                                {plan.engineer && <button
    onClick={(e) => {
      e.stopPropagation();
      setEngineerTabFilter(plan.engineer);
      setActiveTab("engineers");
    }}
    className="text-[11px] text-blue-500 dark:text-blue-400 hover:underline"
  >
                                    {plan.engineer}
                                  </button>}
                              </div>
                              <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0">{formatDateTime(plan.date)}</span>
                            </div>)}
                        </div>
                      </div>)}
                  </div>
                </Card>)}
            {gmAgmSummary.filter((g) => !gmAgmTabFilter.trim() || g.name.toLowerCase().includes(gmAgmTabFilter.trim().toLowerCase())).length === 0 && <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-[13px]">No GM / AGM data found.</div>}
          </div>
        </div>}



      {viewModal && selectedPlan && <Modal
    title={`Material Plan Details - ${selectedPlan.id}`}
    wide
    onClose={() => setViewModal(false)}
    footer={<div className="flex justify-end gap-2 w-full">
              {isAGM && ["Draft", "Open", "Rejected"].includes(selectedPlan.status) && (
                <Btn
                  icon={Send}
                  color="primary"
                  onClick={() => {
                    handleSubmitForApproval(selectedPlan);
                    setViewModal(false);
                  }}
                  label="Submit"
                />
              )}
              {isGM && ["Pending Approval", "Rejected"].includes(selectedPlan.status) && (
                <Btn
                  icon={ThumbsUp}
                  color="primary"
                  onClick={() => {
                    handleApprovePlan(selectedPlan);
                    setViewModal(false);
                  }}
                  label="Approve"
                />
              )}
              {canReject && ["Pending Approval", "Approved"].includes(selectedPlan.status) && (
                <Btn
                  icon={ThumbsDown}
                  color="red"
                  onClick={() => {
                    setRejectModal(selectedPlan);
                    setRejectReason("");
                    setViewModal(false);
                  }}
                  label="Reject"
                />
              )}
              <Btn label="Close" outline onClick={() => setViewModal(false)} />
            </div>}
  >
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div>
                <p className="text-[11px] font-bold text-gray-500 ">Project</p>
                <p className="text-[13px] font-medium text-gray-900 dark:text-white">{selectedPlan.project || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 ">Date</p>
                <p className="text-[13px] font-medium text-gray-900 dark:text-white">{formatDateTime(selectedPlan.date)}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 ">Location</p>
                <p className="text-[13px] font-medium text-gray-900 dark:text-white">{selectedPlan.location || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 ">Engineer</p>
                <p className="text-[13px] font-medium text-gray-900 dark:text-white">{selectedPlan.engineer || "-"}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-500 ">GM / AGM</p>
                <p className="text-[13px] font-medium text-gray-900 dark:text-white">{selectedPlan.gmAgm || "-"}</p>
              </div>
            </div>

            <div className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[560px]">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">Item</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider text-right">Total Qty</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider text-right">Allocated</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider text-right">Pending</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {selectedPlan.items.map((item, idx) => {
    const allocated = mrAllocations.filter(
      (a) => a.sku === item.sku && a.projectName?.trim().toLowerCase() === selectedPlan.project?.trim().toLowerCase() && a.engineerName?.trim().toLowerCase() === selectedPlan.engineer?.trim().toLowerCase()
    ).reduce((sum, a) => sum + (a.allocatedQty || 0), 0);
    const pending = Math.max(0, item.required - allocated);
    const hasPendingRevision = planRevisions.some(
      (r) => r.planId === selectedPlan.id && r.planItemSku === item.sku && r.status === "pending"
    );
    return <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                                <Package className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                              </div>
                              <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{item.itemName || item.materialName || item.name || item.sku || "Unknown"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[13px] text-right text-gray-900 dark:text-gray-300 font-medium">
                            {item.required} {item.unit}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-right font-bold text-emerald-600 dark:text-emerald-400">
                            {allocated > 0 ? `${allocated} ${item.unit}` : "\u2014"}
                          </td>
                          <td className="px-4 py-3 text-[13px] text-right">
                            <span className={`font-bold ${pending > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                              {pending > 0 ? `${pending} ${item.unit}` : "\u2014"}
                            </span>
                          </td>
                        </tr>;
  })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6">
                <h3 className="text-[14px] font-bold text-[#1A1A2E] dark:text-white mb-4 flex items-center gap-2">
                  Edit History
                  <span className="bg-[#F97316] text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {selectedPlan.editHistory?.length || 0}
                  </span>
                </h3>
                {(!selectedPlan.editHistory || selectedPlan.editHistory.length === 0) ? (
                  <p className="text-[12px] text-gray-400 dark:text-gray-500 italic">No edits yet.</p>
                ) : (
                  <div className="space-y-6">
                    {selectedPlan.editHistory.map((edit, idx) => {
                      const prevItems = edit.previousItems || [];
                      const afterItems = idx < selectedPlan.editHistory.length - 1
                        ? selectedPlan.editHistory[idx + 1].previousItems || []
                        : selectedPlan.items || [];
                      const itemKey = (i) => i.sku || i.itemName || i.materialName || i.name || "";
                      const itemLabel = (i) => i.itemName || i.materialName || i.name || i.sku || "Unknown";
                      const added = afterItems.filter(a => !prevItems.some(p => itemKey(p) === itemKey(a)));
                      const removed = prevItems.filter(p => !afterItems.some(a => itemKey(a) === itemKey(p)));
                      const changed = prevItems.filter(p => {
                        const match = afterItems.find(a => itemKey(a) === itemKey(p));
                        return match && Number(match.required) !== Number(p.required);
                      }).map(p => {
                        const match = afterItems.find(a => itemKey(a) === itemKey(p));
                        return { ...p, newRequired: match.required, unit: match.unit || p.unit };
                      });
                      const hasChanges = added.length > 0 || removed.length > 0 || changed.length > 0;
                      return <div key={idx} className="space-y-2">
                        <div className="flex justify-between items-center px-1">
                          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Edited on {formatDateTime(edit.date)}</p>
                          {edit.editedBy && <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">by {edit.editedBy}</p>}
                        </div>
                        <div className="bg-gray-100 dark:bg-[#1a222c] rounded-xl overflow-hidden p-1.5 space-y-1.5 shadow-sm">
                          {!hasChanges && <p className="text-[12px] text-gray-400 italic px-3 py-2">No item changes recorded.</p>}
                          {added.map((item, i) => (
                            <div key={`add-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white dark:bg-[#131b24] rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-wider uppercase">+ ADDED</span>
                                <span className="text-[13px] font-semibold text-gray-900 dark:text-white ml-2">{itemLabel(item)}</span>
                              </div>
                              <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">{item.required} {item.unit}</span>
                            </div>
                          ))}
                          {removed.map((item, i) => (
                            <div key={`rem-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white dark:bg-[#1f161a] rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-red-500 tracking-wider uppercase">- REMOVED</span>
                                <span className="text-[13px] font-semibold text-gray-900 dark:text-white ml-2">{itemLabel(item)}</span>
                              </div>
                              <span className="text-[13px] font-bold text-red-500 shrink-0 line-through">{item.required} {item.unit}</span>
                            </div>
                          ))}
                          {changed.map((item, i) => (
                            <div key={`chg-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white dark:bg-[#1d1f18] rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-amber-600 dark:text-amber-500 tracking-wider uppercase">~ CHANGED</span>
                                <span className="text-[13px] font-semibold text-gray-900 dark:text-white ml-2">{itemLabel(item)}</span>
                              </div>
                              <span className="text-[13px] font-bold text-amber-600 dark:text-amber-500 shrink-0">
                                <span className="line-through text-gray-400 dark:text-gray-600 mr-1.5">{item.required}</span>
                                → {item.newRequired} {item.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>;
                    })}
                  </div>
                )}
              </div>

          </div>
        </Modal>}

      {modal && <Modal
    title={isEditing ? "Edit Material Plan" : "Create Material Plan"}
    wide
    onClose={() => {
      setModal(false);
      setErrors({});
      setNewPlan({ project: "", milestone: "", workType: "", location: "", items: [] });
      setCustomProject("");
      setIsEditing(false);
    }}
    footer={<div className="flex justify-end gap-2 w-full">
              <Btn label="Cancel" outline onClick={() => {
      setModal(false);
      setErrors({});
    }} />
              <Btn
      label={isEditing ? "Update Plan" : "Create Plan"}
      onClick={handleCreate}
      loading={actionLoading}
    />
            </div>}
  >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <SField
    label="Project"
    value={newPlan.project}
    onChange={(e) => setNewPlan({ ...newPlan, project: e.target.value })}
    options={[...PROJECTS, { label: "Other", value: "Other" }]}
    required
    error={errors.project}
  />
            {newPlan.project === "Other" && <Field
    label="Custom Project Name"
    value={customProject}
    onChange={(e) => setCustomProject(e.target.value)}
    placeholder="Enter project name"
    required
    error={errors.customProject}
  />}
            <Field
    label="Location"
    value={newPlan.location}
    onChange={(e) => setNewPlan({ ...newPlan, location: e.target.value })}
    placeholder="e.g. Site A, Block 3"
  />
          </div>

          <div className="mb-6">
            <h3 className="text-[13px] font-bold text-[#1A1A2E] dark:text-white mb-3">
              Plan Items
            </h3>

            {errors.items && <p className="text-[11px] text-red-500 mb-2">{errors.items}</p>}

            <div className="mb-4">
              <SearchSelect
    label="Material Description *"
    options={inventory.map((i) => ({
      value: i.sku,
      label: i.itemName || i.materialName || i.name || i.sku || "Unknown",
      subLabel: `${i.sku} | Category: ${i.category || "N/A"}`
    }))}
    value=""
    onChange={(sku) => {
      const item = inventory.find((i) => i.sku === sku);
      if (item) addItem(item);
    }}
    placeholder="Search Material..."
  />
            </div>

            {newPlan.items && (newPlan.items?.length || 0) > 0 && <table className="w-full text-left border-collapse mb-4">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-[#E8ECF0] dark:border-gray-700">
                    <th className="px-2 py-2 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 ">
                      Item
                    </th>
                    <th className="px-2 py-2 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 w-24">
                      Qty
                    </th>
                    <th className="px-2 py-2 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 w-10 text-center">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8ECF0] dark:divide-gray-700">
                  {newPlan.items.map((item, idx) => <tr key={idx}>
                      <td className="px-2 py-2 text-[13px] dark:text-gray-300">
                        {item.itemName || item.materialName || item.name || item.sku || "Unknown"}
                        {item.reusable > 0 && <div className="text-[11px] text-blue-500 dark:text-blue-400 flex items-center gap-1 mt-1">
                            <AlertTriangle className="w-3 h-3" />{" "}
                            {item.reusable} reusable in stock
                          </div>}
                      </td>
                      <td className="px-2 py-2">
                        <input
    type="number"
    value={item.required}
    onChange={(e) => updateItem(idx, "required", Number(e.target.value))}
    className="w-full px-2 py-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded text-[13px] text-gray-900 dark:text-white"
  />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
    type="button"
    onClick={() => {
      const newItems = [...newPlan.items];
      newItems.splice(idx, 1);
      setNewPlan({ ...newPlan, items: newItems });
    }}
    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
  >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>)}
                </tbody>
              </table>}
          </div>

        </Modal>}

      {deletingId && <ConfirmModal
    title="Delete Material Plan"
    message="Are you sure you want to delete this material plan? This action cannot be undone."
    onConfirm={handleConfirmDelete}
    onCancel={() => setDeletingId(null)}
    loading={actionLoading}
  />}

      {rejectModal && <Modal
    title={`Reject Plan — ${rejectModal.id}`}
    onClose={() => { setRejectModal(null); setRejectReason(""); }}
    footer={<div className="flex gap-3 justify-end w-full">
              <Btn label="Cancel" outline onClick={() => { setRejectModal(null); setRejectReason(""); }} />
              <Btn label="Reject Plan" color="red" icon={XCircle} onClick={handleRejectPlan} disabled={!rejectReason.trim() || actionLoading} />
            </div>}
  >
          <div className="space-y-3">
            <p className="text-[13px] text-gray-600 dark:text-gray-400">
              You are rejecting <span className="font-bold text-gray-900 dark:text-white">{rejectModal.id}</span> — {rejectModal.project}.
              The AGM will be notified and can revise and resubmit the plan.
            </p>
            <div>
              <label className="text-[12px] font-bold text-gray-700 dark:text-gray-300 block mb-1.5">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
    value={rejectReason}
    onChange={(e) => setRejectReason(e.target.value)}
    placeholder="Explain why this plan is being rejected..."
    rows={3}
    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-[13px] text-gray-900 dark:text-white focus:outline-none focus:border-primary resize-none"
  />
            </div>
          </div>
        </Modal>}

      {
    /* ── Revision Request Modal (engineer) ──────────────────────── */
  }
      {revisionModal && revisionItem && <Modal
    title="Request Additional Material"
    onClose={() => setRevisionModal(false)}
  >
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl px-4 py-3">
              <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">{revisionItem.itemName}</p>
              <p className="text-[11px] text-orange-500 dark:text-amber-500 mt-0.5">
                Current plan qty: <span className="font-bold">{revisionItem.currentAllocated} {revisionItem.unit}</span>
              </p>
              {selectedPlan?.gmAgm && <p className="text-[11px] text-orange-500 dark:text-amber-500 mt-0.5">
                  Request will be sent to: <span className="font-bold">{selectedPlan.gmAgm}</span>
                </p>}
            </div>
            <Field
    label="Extra Qty Needed"
    type="number"
    value={revisionQty}
    onChange={(e) => setRevisionQty(Math.max(1, Number(e.target.value)))}
    required
  />
            <div>
              <label className="text-[12px] font-bold text-gray-600 dark:text-gray-400 block mb-1">Reason <span className="text-red-500">*</span></label>
              <textarea
    value={revisionReason}
    onChange={(e) => setRevisionReason(e.target.value)}
    rows={3}
    placeholder="Explain why additional quantity is needed..."
    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-[13px] text-gray-900 dark:text-white focus:outline-none focus:border-primary resize-none"
  />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Btn label="Cancel" outline onClick={() => setRevisionModal(false)} />
              <Btn
    label="Submit Request"
    loading={actionLoading}
    onClick={async () => {
      if (!revisionReason.trim()) {
        toast.error("Please provide a reason.");
        return;
      }
      try {
        await createPlanRevision({
          planId: revisionItem.planId,
          planItemSku: revisionItem.sku,
          itemName: revisionItem.itemName,
          unit: revisionItem.unit,
          project: revisionItem.project,
          currentAllocatedQty: revisionItem.currentAllocated,
          requestedExtraQty: revisionQty,
          reason: revisionReason.trim()
        });
        toast.success("Revision request submitted.");
        setRevisionModal(false);
      } catch (e) {
        toast.error(e?.message || "Failed to submit revision.");
      }
    }}
  />
            </div>
          </div>
        </Modal>}

      {
    /* ── Reject Note Modal (admin) ───────────────────────────────── */
  }
      {rejectingRevisionId && <Modal
    title="Reject Revision Request"
    onClose={() => {
      setRejectingRevisionId(null);
      setRejectNote("");
    }}
  >
          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-bold text-gray-600 dark:text-gray-400 block mb-1">Rejection Reason</label>
              <textarea
    value={rejectNote}
    onChange={(e) => setRejectNote(e.target.value)}
    rows={3}
    placeholder="Explain why the request was rejected (optional)..."
    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-[13px] text-gray-900 dark:text-white focus:outline-none focus:border-primary resize-none"
  />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Btn label="Cancel" outline onClick={() => {
    setRejectingRevisionId(null);
    setRejectNote("");
  }} />
              <Btn
    label="Confirm Reject"
    color="red"
    loading={actionLoading}
    onClick={async () => {
      try {
        await reviewPlanRevision(rejectingRevisionId, { status: "rejected", reviewNote: rejectNote });
        toast.success("Revision request rejected.");
        setRejectingRevisionId(null);
        setRejectNote("");
      } catch (e) {
        toast.error(e?.message || "Failed to reject.");
      }
    }}
  />
            </div>
          </div>
        </Modal>}

      {
    /* ── Admin: Revision Requests Panel ────────────────────────── */
  }
      {activeTab === "plans" && isAdmin && planRevisions.filter((r) => r.status === "pending").length > 0 && <div className="mt-8">
          <h2 className="text-[14px] font-bold text-[#1A1A2E] dark:text-white mb-3 flex items-center gap-2">
            Material Addition Requests
            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {planRevisions.filter((r) => r.status === "pending").length}
            </span>
          </h2>
          <div className="space-y-2">
            {planRevisions.filter((r) => r.status === "pending").map((rev) => <div key={rev.id} className="flex items-start justify-between gap-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{rev.itemName}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                    <span className="font-semibold text-gray-700 dark:text-gray-300">{rev.engineerName}</span>
                    {rev.project && <> · {rev.project}</>}
                    {rev.gmAgm && <> · to <span className="font-semibold text-gray-700 dark:text-gray-300">{rev.gmAgm}</span></>}
                    {" \xB7 "}Requesting <span className="font-bold text-primary">+{rev.requestedExtraQty} {rev.unit}</span>
                    {" "}(current plan qty: {rev.currentAllocatedQty} {rev.unit})
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 italic">"{rev.reason}"</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Btn
    label="Approve"
    small
    loading={actionLoading}
    onClick={async () => {
      try {
        await reviewPlanRevision(rev.id, { status: "approved" });
        toast.success(`Revision approved \u2014 +${rev.requestedExtraQty} ${rev.unit} added to plan.`);
      } catch (e) {
        toast.error(e?.message || "Failed to approve.");
      }
    }}
  />
                  <Btn
    label="Reject"
    small
    outline
    color="red"
    onClick={() => {
      setRejectingRevisionId(rev.id);
      setRejectNote("");
    }}
  />
                </div>
              </div>)}
          </div>
        </div>}
    </div>;
}, "MaterialPlanning");
export {
  MaterialPlanning
};
