var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React, { useState, useCallback, useEffect } from "react";
import { useAppStore } from "../store";
import {
  PageHeader,
  Card,
  StatusBadge,
  Badge,
  Btn,
  Modal,
  SField,
  Pagination,
  ConfirmModal,
  Skeleton,
  Field
} from "../components/ui";
import { Plus, Search, Eye, Pencil, Trash2, User, MapPin, Building, Package, Check, Link2, RefreshCw, CheckCircle, TrendingUp, AlertTriangle, Calendar, Activity, ShieldAlert } from "lucide-react";
import { Virtuoso } from "react-virtuoso";
import { genId, todayStr, scrollToError, formatDateTime, formatDate, safeStr, isNewItem } from "../utils";
import { toast } from "react-hot-toast";
import { cn } from "../lib/utils";
import { SearchFilter, DateRangePicker, SelectFilter, FilterRow } from "../components/ui/Filters";
const MaterialRequirementPage = /* @__PURE__ */ __name(() => {
  const {
    materialRequirements,
    materialRequirementsPagination,
    mrAllocations,
    mrAllocationsPagination,
    fetchResource,
    addMaterialRequirement,
    updateMaterialRequirement,
    deleteMaterialRequirement,
    inventory,
    catalogue,
    role,
    user,
    plans,
    loading,
    actionLoading,
    api,
    hasPermission,
    settings,
    pos
  } = useAppStore();
  const isMRLocked = /* @__PURE__ */ __name((mrId) => {
    return pos.some((po) => po.mrId === mrId);
  }, "isMRLocked");
  const isItemPOCreated = /* @__PURE__ */ __name((item, mr) => {
    if (!mr?.approvals?.length) return false;
    const cat = item.category || "General";
    return mr.approvals.some((a) => (a.category || "General") === cat && a.poCreated === true);
  }, "isItemPOCreated");
  const { projects: PROJECTS, units: UNITS, requesters: REQUESTERS, workTypes: WORK_TYPES } = settings;
  const [activeTab, setActiveTab] = useState("requirements");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterRequester, setFilterRequester] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const statusOptions = React.useMemo(() => [
    { label: "Store Pending", value: "Store Pending" },
    { label: "Approved by Store", value: "Approved by Store" },
    { label: "Quotation Phase", value: "Quotation Phase" },
    { label: "PO Phase", value: "PO Phase" },
    { label: "Partially Inwarded", value: "Partially Inwarded" },
    { label: "Inwarded", value: "Inwarded" },
    { label: "Cancelled", value: "Cancelled" }
  ], []);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const isInitialLoad = materialRequirements.length === 0;
    const filterObj = {};
    if (filterProject) filterObj.project = filterProject;
    if (filterRequester) filterObj.requesterName = filterRequester;
    if (filterStatus) filterObj.status = filterStatus;
    const finalFilter = Object.keys(filterObj).length > 0 ? filterObj : null;
    if (activeTab === "requirements") {
      fetchResource("material-requirements", 1, 50, !isInitialLoad, debouncedSearch, finalFilter, false, false, startDate, endDate);
    } else {
      fetchResource("mr-allocations", 1, 1e3, true, debouncedSearch, finalFilter, false, false, startDate, endDate);
    }
    if (pos.length === 0) {
      fetchResource("pos", 1, 2e3, true);
    }
    if (inventory.length < 500) {
      fetchResource("inventory", 1, 2e3, true);
    }
    if (catalogue.length < 500) {
      fetchResource("catalogue", 1, 2e3, true);
    }
  }, [fetchResource, debouncedSearch, activeTab, startDate, endDate, filterProject, filterRequester, filterStatus]);
  useEffect(() => {
    if (inventory.length === 0) fetchResource("inventory", 1, 2e3, true);
    if (catalogue.length === 0) fetchResource("catalogue", 1, 2e3, true);
    if (plans.length === 0) fetchResource("planning", 1, 500, true);
  }, [fetchResource, inventory.length, catalogue.length, plans.length]);
  const [modal, setModal] = useState(false);
  const [successModal, setSuccessModal] = useState(null);
  const [viewModal, setViewModal] = useState(false);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [showQuotationDropdown, setShowQuotationDropdown] = useState(false);
  useEffect(() => {
    if (!showQuotationDropdown) return;
    const handleOutsideClick = /* @__PURE__ */ __name((e) => {
      const target = e.target;
      if (!target.closest(".quotation-dropdown-container")) {
        setShowQuotationDropdown(false);
      }
    }, "handleOutsideClick");
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showQuotationDropdown]);
  useEffect(() => {
    if (!viewModal) {
      setShowQuotationDropdown(false);
    }
  }, [viewModal]);
  const allItemsMapped = selectedRequirement ? selectedRequirement.items && selectedRequirement.items.length > 0 && selectedRequirement.items.every(
    (i) => i.sku && i.sku !== "N/A" && i.sku !== ""
  ) : true;
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState({});
  const [otherRequester, setOtherRequester] = useState("");
  const [otherProject, setOtherProject] = useState("");
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToError();
    }
  }, [errors]);
  const [deletingId, setDeletingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [linkingIdx, setLinkingIdx] = useState(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState([]);
  const [searchingLink, setSearchingLink] = useState(false);
  useEffect(() => {
    if (linkingIdx === null) {
      setLinkResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingLink(true);
      try {
        const res = await api.get("inventory", { search: linkSearch.trim(), limit: 50 });
        if (res.success) {
          setLinkResults(res.data);
        }
      } catch (e) {
        console.error("Link search failed:", e);
      } finally {
        setSearchingLink(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [linkSearch, linkingIdx, api]);
  const [newRequirement, setNewRequirement] = useState({
    planId: "",
    requesterName: "",
    project: "",
    location: "",
    workType: "",
    requirementDate: todayStr(),
    items: [{ materialName: "", sku: "", qty: 1, unit: "", condition: "New" }]
  });
  const validateForm = /* @__PURE__ */ __name((data) => {
    const newErrors = {};
    if (!data.requesterName) newErrors.requesterName = "Required";
    if (data.requesterName === "Other" && !otherRequester) newErrors.otherRequester = "Required";
    if (!data.project) newErrors.project = "Required";
    if (data.project === "Other" && !otherProject) newErrors.otherProject = "Required";
    if (!data.items || data.items.length === 0) {
      newErrors.items = "At least one item is required";
    } else {
      data.items.forEach((item, idx) => {
        if (!item.materialName) newErrors[`item_${idx}_name`] = "Required";
        if (!item.qty || item.qty <= 0) newErrors[`item_${idx}_qty`] = "Required";
        if (!item.unit) newErrors[`item_${idx}_unit`] = "Required";
        if (planRemainingQty) {
          const rem = getItemRemaining(item);
          if (rem !== null && item.qty > rem.remaining) {
            newErrors[`item_${idx}_qty`] = `Max ${rem.remaining} ${rem.unit} remaining in plan`;
          }
        }
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, "validateForm");
  const handlePageChange = useCallback((page) => {
    if (activeTab === "requirements") {
      fetchResource("material-requirements", page, 50, false, debouncedSearch);
    } else {
      fetchResource("mr-allocations", page, 50, false, debouncedSearch);
    }
  }, [fetchResource, activeTab, debouncedSearch]);
  const isSiteEngineer = role === "Site Engineer";
  const myPlans = React.useMemo(() => {
    if (!isSiteEngineer || !user?.name) return plans;
    return plans.filter((p) => p.engineer && p.engineer.trim().toLowerCase() === user.name.trim().toLowerCase());
  }, [isSiteEngineer, user?.name, plans]);
  const engineerProjects = React.useMemo(() => {
    if (!isSiteEngineer) return null;
    return Array.from(new Set(myPlans.map((p) => p.project).filter(Boolean)));
  }, [isSiteEngineer, myPlans]);
  const engineerPlanItems = React.useMemo(() => {
    if (!isSiteEngineer || !newRequirement.project) return null;
    const projectPlans = myPlans.filter((p) => p.project === newRequirement.project);
    const allItems = projectPlans.flatMap((p) => p.items || []);
    const seen = /* @__PURE__ */ new Set();
    return allItems.filter((item) => {
      const key = (item.itemName || item.materialName || item.sku || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [isSiteEngineer, newRequirement.project, myPlans]);
  const searchOptions = React.useMemo(() => {
    if (isSiteEngineer && engineerPlanItems) {
      return engineerPlanItems.map((item) => ({
        value: item.itemName || item.materialName || item.sku || "",
        label: item.itemName || item.materialName || item.sku || "",
        subLabel: item.unit
      }));
    }
    const options = [
      ...inventory.map((i) => ({ value: i.itemName, label: i.itemName, subLabel: i.category })),
      ...catalogue.map((c) => ({ value: c.itemName, label: c.itemName, subLabel: c.category }))
    ];
    return options.filter((v, i, a) => a.findIndex((t) => t.value === v.value) === i);
  }, [isSiteEngineer, engineerPlanItems, inventory, catalogue]);
  const projects = React.useMemo(() => settings.projects || [], [settings.projects]);
  const workTypes = React.useMemo(() => settings.workTypes || [
    "Plumbing",
    "Sanitary",
    "Hardware",
    "Electrical",
    "Civil",
    "Stationery",
    "Other"
  ], [settings.workTypes]);
  const requesters = React.useMemo(() => settings.requesters || [], [settings.requesters]);
  const units = React.useMemo(() => UNITS, []);
  const categoryOptions = React.useMemo(() => {
    return Array.from(new Set([
      ...inventory.map((i) => i.category),
      ...catalogue.map((c) => c.category),
      "Hardware",
      "Sanitary",
      "Stationery",
      "Plumbing",
      "Electrical",
      "Safety",
      "Tools"
    ].filter(Boolean))).sort();
  }, [inventory, catalogue]);
  const mrOptions = React.useMemo(
    () => (materialRequirements || []).filter((m) => m.status === "Approved" || m.status === "Store Pending" || m.status === "Approved by AGM").map((m) => ({ label: `${m.mrNumber} - ${m.project} (${m.requesterName})`, value: m.id })),
    [materialRequirements]
  );
  const handleCreate = /* @__PURE__ */ __name(async () => {
    if (!validateForm(newRequirement)) return;
    toast.loading("Checking inventory availability...", { id: "check-inv" });
    const checkedItems = await Promise.all(
      (newRequirement.items || []).map(async (item) => {
        let matches = (inventory || []).filter(
          (i) => item.sku && item.sku !== "N/A" && i.sku?.toLowerCase().trim() === item.sku?.toLowerCase().trim() || i.itemName?.toLowerCase().replace(/\s+/g, "").trim() === item.materialName.toLowerCase().replace(/\s+/g, "").trim()
        );
        matches.sort((a, b) => {
          const aSkuMatch = item.sku && item.sku !== "N/A" && a.sku === item.sku;
          const bSkuMatch = item.sku && item.sku !== "N/A" && b.sku === item.sku;
          if (aSkuMatch && !bSkuMatch) return -1;
          if (!aSkuMatch && bSkuMatch) return 1;
          return (b.liveStock || 0) - (a.liveStock || 0);
        });
        let invItem = matches[0];
        const catalogueItem = catalogue.find(
          (c) => item.sku && item.sku !== "N/A" && c.sku?.toLowerCase().trim() === item.sku?.toLowerCase().trim() || c.itemName?.toLowerCase().replace(/\s+/g, "").trim() === item.materialName.toLowerCase().replace(/\s+/g, "").trim()
        );
        if (!invItem) {
          try {
            if (item.sku && item.sku !== "N/A") {
              const skuRes = await api.get("inventory", { filter: JSON.stringify({ sku: item.sku }), limit: 1 });
              if (skuRes.success && skuRes.data && skuRes.data.length > 0) {
                invItem = skuRes.data[0];
              }
            }
            if (!invItem) {
              const res = await api.get("inventory", { search: item.materialName.trim(), limit: 50 });
              if (res.success && res.data && res.data.length > 0) {
                const serverMatches = res.data.filter(
                  (i) => item.sku && item.sku !== "N/A" && i.sku?.toLowerCase().trim() === item.sku?.toLowerCase().trim() || i.itemName?.toLowerCase().replace(/\s+/g, "").trim() === item.materialName.toLowerCase().replace(/\s+/g, "").trim()
                );
                if (serverMatches.length > 0) {
                  const exactSkuMatch = serverMatches.find((i) => item.sku && item.sku !== "N/A" && i.sku === item.sku);
                  invItem = exactSkuMatch || serverMatches.find((i) => i.liveStock > 0) || serverMatches[0];
                } else if (res.data[0].itemName?.toLowerCase().includes(item.materialName.toLowerCase())) {
                  invItem = res.data[0];
                }
              }
            }
          } catch (e) {
          }
        }
        const available = invItem ? invItem.liveStock || 0 : 0;
        const alreadyProcessed = (item.allocatedQty || 0) + (item.issuedQty || 0);
        const requested = item.qty || 0;
        const netRequested = Math.max(0, requested - alreadyProcessed);
        let status = item.status || "Needs Purchase";
        let availableInStock = 0;
        let remainingQty = netRequested;
        if (netRequested <= 0) {
          if (status !== "Issued" && status !== "Allocated") {
            status = "Allocated";
          }
          availableInStock = requested;
          remainingQty = 0;
        } else {
          if (available >= netRequested) {
            status = "In Stock";
            availableInStock = netRequested;
            remainingQty = 0;
          } else if (available > 0) {
            status = "Partial";
            availableInStock = available;
            remainingQty = netRequested - available;
          } else {
            status = "Needs Purchase";
            availableInStock = 0;
            remainingQty = netRequested;
          }
        }
        return {
          ...item,
          sku: invItem?.sku || catalogueItem?.sku || item.sku || "N/A",
          category: item.category || invItem?.category || catalogueItem?.category || "",
          unit: item.unit || invItem?.unit || catalogueItem?.uom || "",
          availableInStock,
          remainingQty,
          status
        };
      })
    );
    toast.dismiss("check-inv");
    const allInStock = checkedItems.length > 0 && checkedItems.every((i) => i.status === "In Stock");
    if (isEditing) {
      try {
        await updateMaterialRequirement(newRequirement.id, {
          ...newRequirement,
          items: checkedItems,
          status: allInStock ? "Approved by Store" : "Store Pending"
        });
        setModal(false);
        resetForm();
      } catch (error) {
        console.error("Update failed:", error);
      }
      return;
    }
    const requirement = {
      id: genId("MR", Date.now() % 1e4),
      planId: newRequirement.planId || void 0,
      requesterName: newRequirement.requesterName === "Other" ? otherRequester : newRequirement.requesterName,
      project: newRequirement.project === "Other" ? otherProject : newRequirement.project,
      location: newRequirement.location || "",
      workType: newRequirement.workType || "",
      requirementDate: newRequirement.requirementDate || todayStr(),
      date: (/* @__PURE__ */ new Date()).toISOString(),
      status: allInStock ? "Approved by Store" : "Store Pending",
      items: checkedItems
    };
    try {
      const result = await addMaterialRequirement(requirement);
      setModal(false);
      setSuccessModal(result?.id || requirement.id);
      resetForm();
    } catch (error) {
      console.error("Creation failed:", error);
    }
  }, "handleCreate");
  const resetForm = /* @__PURE__ */ __name(() => {
    setNewRequirement({
      planId: "",
      requesterName: "",
      project: "",
      location: "",
      workType: "",
      requirementDate: todayStr(),
      items: [{ materialName: "", qty: 1, unit: "", condition: "New", category: "" }]
    });
    setOtherRequester("");
    setOtherProject("");
    setIsEditing(false);
    setErrors({});
  }, "resetForm");
  const availablePlansForForm = React.useMemo(() => {
    // Only Approved plans can have MRs created against them
    const approvedPlans = plans.filter((p) => p.status === "Approved" || p.status === "Open");
    if (isSiteEngineer && user?.name) {
      return approvedPlans.filter((p) => p.engineer && p.engineer.trim().toLowerCase() === user.name.trim().toLowerCase());
    }
    if (newRequirement.project) {
      return approvedPlans.filter((p) => p.project === newRequirement.project);
    }
    return approvedPlans;
  }, [isSiteEngineer, user?.name, plans, newRequirement.project]);
  const planRemainingQty = React.useMemo(() => {
    if (!newRequirement.planId) return null;
    const plan = plans.find((p) => p.id === newRequirement.planId);
    if (!plan) return null;
    const existingMRs = materialRequirements.filter(
      (mr) => mr.planId === newRequirement.planId && (!isEditing || mr.id !== newRequirement.id)
    );
    const result = {};
    (plan.items || []).forEach((item) => {
      const key = (item.sku && item.sku !== "N/A" ? item.sku : item.itemName || item.materialName || "").toLowerCase();
      const usedQty = existingMRs.reduce((sum, mr) => {
        const mi = (mr.items || []).find(
          (i) => item.sku && item.sku !== "N/A" && i.sku === item.sku || (i.materialName || "").toLowerCase().trim() === (item.itemName || item.materialName || "").toLowerCase().trim()
        );
        return sum + (mi?.qty || 0);
      }, 0);
      result[key] = {
        planQty: item.required || 0,
        usedQty,
        remaining: Math.max(0, (item.required || 0) - usedQty),
        unit: item.unit || "",
        name: item.itemName || item.materialName || item.name || item.sku || ""
      };
    });
    return result;
  }, [newRequirement.planId, newRequirement.id, plans, materialRequirements, isEditing]);
  const getItemRemaining = /* @__PURE__ */ __name((item) => {
    if (!planRemainingQty) return null;
    const key = (item.sku && item.sku !== "N/A" ? item.sku : item.materialName || "").toLowerCase();
    return planRemainingQty[key] ?? null;
  }, "getItemRemaining");
  const addItem = /* @__PURE__ */ __name(() => {
    setNewRequirement({
      ...newRequirement,
      items: [...newRequirement.items || [], { materialName: "", qty: 1, unit: "", condition: "New", category: "" }]
    });
  }, "addItem");
  const removeItem = /* @__PURE__ */ __name((idx) => {
    const items = [...newRequirement.items || []];
    items.splice(idx, 1);
    setNewRequirement({ ...newRequirement, items });
  }, "removeItem");
  const updateItem = /* @__PURE__ */ __name((idx, field, value) => {
    const items = [...newRequirement.items || []];
    items[idx] = { ...items[idx], [field]: value };
    setNewRequirement({ ...newRequirement, items });
  }, "updateItem");
  const handleConfirmDelete = /* @__PURE__ */ __name(async () => {
    if (!deletingId) return;
    try {
      await deleteMaterialRequirement(deletingId);
      setDeletingId(null);
    } catch (error) {
      console.error("Delete failed:", error);
    }
  }, "handleConfirmDelete");
  const handleRecheck = /* @__PURE__ */ __name(async (req) => {
    try {
      toast.loading("Rechecking inventory...", { id: "recheck" });
      let latestInventory = inventory;
      try {
        const invRes = await api.get("inventory", { limit: 2e3 });
        if (invRes.success) {
          latestInventory = invRes.data;
          fetchResource("inventory", 1, 2e3, true);
        }
      } catch (e) {
      }
      const checkedItems = await Promise.all(
        req.items.map(async (item) => {
          let matches = latestInventory.filter(
            (i) => item.sku && item.sku !== "N/A" && i.sku?.toLowerCase().trim() === item.sku?.toLowerCase().trim() || i.itemName?.toLowerCase().replace(/\s+/g, "").trim() === item.materialName.toLowerCase().replace(/\s+/g, "").trim()
          );
          matches.sort((a, b) => {
            const aSkuMatch = item.sku && item.sku !== "N/A" && a.sku === item.sku;
            const bSkuMatch = item.sku && item.sku !== "N/A" && b.sku === item.sku;
            if (aSkuMatch && !bSkuMatch) return -1;
            if (!aSkuMatch && bSkuMatch) return 1;
            return (b.liveStock || 0) - (a.liveStock || 0);
          });
          let invItem = matches[0];
          if (!invItem) {
            try {
              if (item.sku && item.sku !== "N/A") {
                const skuRes = await api.get("inventory", { filter: JSON.stringify({ sku: item.sku }), limit: 1 });
                if (skuRes.success && skuRes.data && skuRes.data.length > 0) {
                  invItem = skuRes.data[0];
                }
              }
              if (!invItem) {
                const res = await api.get("inventory", { search: item.materialName.trim(), limit: 20 });
                if (res.success && res.data && res.data.length > 0) {
                  const serverMatches = res.data.filter(
                    (i) => item.sku && item.sku !== "N/A" && i.sku?.toLowerCase().trim() === item.sku?.toLowerCase().trim() || i.itemName?.toLowerCase().replace(/\s+/g, "").trim() === item.materialName.toLowerCase().replace(/\s+/g, "").trim()
                  );
                  if (serverMatches.length > 0) {
                    const exactSkuMatch = serverMatches.find((i) => item.sku && item.sku !== "N/A" && i.sku === item.sku);
                    invItem = exactSkuMatch || serverMatches.find((i) => i.liveStock > 0) || serverMatches[0];
                  } else if (res.data[0].itemName?.toLowerCase().includes(item.materialName.toLowerCase())) {
                    invItem = res.data[0];
                  }
                }
              }
            } catch (e) {
            }
          }
          const available = invItem ? invItem.liveStock || 0 : 0;
          const alreadyProcessed = (item.allocatedQty || 0) + (item.issuedQty || 0);
          const requested = item.qty || 0;
          const netRequested = Math.max(0, requested - alreadyProcessed);
          let status = item.status || "Needs Purchase";
          let availableInStock = 0;
          let remainingQty = netRequested;
          if (netRequested <= 0) {
            if (status !== "Issued" && status !== "Allocated") {
              status = "Allocated";
            }
            availableInStock = requested;
            remainingQty = 0;
          } else {
            if (available >= netRequested) {
              status = "In Stock";
              availableInStock = netRequested;
              remainingQty = 0;
            } else if (available > 0) {
              status = "Partial";
              availableInStock = available;
              remainingQty = netRequested - available;
            } else {
              status = "Needs Purchase";
              availableInStock = 0;
              remainingQty = netRequested;
            }
          }
          return {
            ...item,
            sku: invItem?.sku || item.sku || "N/A",
            availableInStock,
            remainingQty,
            status
          };
        })
      );
      const allInStock = checkedItems.length > 0 && checkedItems.every((i) => i.status === "In Stock");
      const updated = await updateMaterialRequirement(req.id, {
        ...req,
        items: checkedItems,
        status: allInStock ? "Approved by Store" : req.status
      });
      if (updated && updated.status === "Approved by Store" && req.status === "Store Pending") {
        toast.success("All items found in stock! Requirement approved by Store.", { id: "recheck", duration: 5e3 });
        setViewModal(false);
      } else {
        toast.success("Inventory levels updated", { id: "recheck" });
        setSelectedRequirement(updated);
      }
    } catch (e) {
      toast.error("Recheck failed: " + e.message, { id: "recheck" });
    }
  }, "handleRecheck");
  useEffect(() => {
    if (viewModal && selectedRequirement && !isEditing) {
      fetchResource("inventory", 1, 2e3, true);
      const hasUnlinked = selectedRequirement.items.some((i) => !i.sku || i.sku === "N/A");
      if (hasUnlinked) {
        let changed = false;
        const newItems = selectedRequirement.items.map((item) => {
          if (!item.sku || item.sku === "N/A") {
            const searchTerm = item.materialName.toLowerCase().trim();
            const match = inventory.find((i) => i.itemName.toLowerCase().trim() === searchTerm);
            if (match) {
              changed = true;
              return {
                ...item,
                sku: match.sku,
                materialName: match.itemName,
                unit: match.unit,
                availableInStock: match.liveStock,
                remainingQty: Math.max(0, (item.qty || 0) - (match.liveStock || 0)),
                status: (match.liveStock || 0) >= (item.qty || 0) ? "In Stock" : "Needs Purchase"
              };
            }
          }
          return item;
        });
        if (changed) {
          setSelectedRequirement((prev) => prev ? { ...prev, items: newItems } : null);
          toast.success("Found matching linked items in inventory", { id: "auto-link" });
        }
      }
    }
  }, [viewModal, isEditing, fetchResource, inventory, selectedRequirement?.id]);
  return <div className="space-y-6">
      <PageHeader
    title="Material Requirements"
    sub="Manage and track material requests from sites"
    actions={hasPermission("CREATE_MATERIAL_REQUIREMENT") && <Btn
      label="New Requirement"
      icon={Plus}
      onClick={() => {
        resetForm();
        setModal(true);
      }}
    />}
  />

      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
          <button
    onClick={() => setActiveTab("requirements")}
    className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all ${activeTab === "requirements" ? "bg-white dark:bg-gray-700 text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
  >
            Requisitions (Current)
          </button>
          <button
    onClick={() => setActiveTab("allocations")}
    className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all ${activeTab === "allocations" ? "bg-white dark:bg-gray-700 text-primary shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
  >
            Allocated Stock Registry
          </button>
        </div>

        <FilterRow
    showClear={!!(search || startDate || endDate || filterProject || filterRequester || filterStatus)}
    onClearAll={() => {
      setSearch("");
      setStartDate("");
      setEndDate("");
      setFilterProject("");
      setFilterRequester("");
      setFilterStatus("");
    }}
  >
          <SearchFilter
    value={search}
    onChange={setSearch}
    placeholder="Search by ID, Requester, Project, or Material name..."
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
    value={filterRequester}
    onChange={setFilterRequester}
    options={REQUESTERS}
    placeholder="All Requesters"
  />

          <SelectFilter
    value={filterStatus}
    onChange={setFilterStatus}
    options={statusOptions}
    placeholder="All Statuses"
  />
        </FilterRow>
      </div>

      <div className="space-y-4 min-h-[400px]">
        {activeTab === "requirements" ? <>
            {loading && materialRequirements.length === 0 ? [...Array(3)].map((_, i) => <Card key={i} className="p-6">
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
            </Card>) : <Virtuoso
    style={{ height: "calc(100vh - 350px)" }}
    data={materialRequirements || []}
    context={{ inventory }}
    endReached={(index) => {
      if (materialRequirementsPagination && materialRequirementsPagination.page < materialRequirementsPagination.pages && !loading) {
        handlePageChange(materialRequirementsPagination.page + 1);
      }
    }}
    itemContent={(_index, req, { inventory: currentInventory }) => <div className="pb-4">
                <Card
      key={req.id}
      className={cn(
        "p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-all",
        (req.status === "Store Pending" || req.status === "Quotation Phase") && "approval-highlight ring-1 ring-primary/20 shadow-lg shadow-primary/5 scale-[1.01]"
      )}
    >
                  <div className="p-4 border-b border-[#E8ECF0] dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                        {isNewItem(req.createdAt) && <span className="px-1.5 py-0.5 rounded text-[9px] font-black tracking-widest bg-primary text-white animate-pulse">
                            NEW
                          </span>}
                        <h3 className="text-[14px] font-bold text-[#1A1A2E] dark:text-white">
                          {req.id}
                        </h3>
                        <StatusBadge status={req.status} />
                        {isMRLocked(req.id) && <Badge text="PO Created" color="blue" icon={Link2} className="px-1.5" />}
                        {req.items.some((i) => i.status === "In Stock" || i.status === "Partial") && <Badge text="Stock Available" color="green" icon={Check} className="gap-1 px-1.5" />}
                        {(req.status === "Store Pending" || req.status === "Quotation Phase") && <span className="flex items-center gap-1 text-[10px] font-bold text-primary dark:text-primary animate-bounce ml-1">
                            <AlertTriangle className="w-3 h-3" />
                            {req.status === "Quotation Phase" ? "Quotation Finalization Needed" : "Awaiting Review"}
                          </span>}
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
      onClick={() => {
        setSelectedRequirement(JSON.parse(JSON.stringify(req)));
        setViewModal(true);
      }}
      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
    >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
      title="Track Progress"
      onClick={() => {
        window.location.hash = `tracking?id=${req.mrNumber || req.id}`;
      }}
      className="p-2 rounded-lg text-primary hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors"
    >
                          <TrendingUp className="w-4 h-4" />
                        </button>

                        {["Store Pending", "Approved by Store", "Allocated", "Partially Allocated"].includes(req.status) && (hasPermission("ALLOCATE_MR") || hasPermission("MANAGE_INVENTORY")) && req.items.some((i) => {
      const inv = currentInventory.find((invI) => invI.sku === i.sku);
      const inStock = inv ? inv.liveStock || 0 : 0;
      return inStock > 0 && i.sku && i.sku !== "N/A" && i.status !== "Allocated" && i.status !== "Issued";
    }) && <button
      title="Allocate Stock"
      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm shadow-emerald-500/20"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          const allocItems = req.items.filter((i) => {
            const sku = (i.sku || "").toString().trim();
            const status = (i.status || "").toString();
            return sku && sku.toUpperCase() !== "N/A" && sku.toLowerCase() !== "null" && !["Allocated", "Issued"].includes(status);
          }).map((i) => ({
            sku: i.sku.trim(),
            qty: Math.max(0, (i.availableInStock || 0) - (i.allocatedQty || 0))
          }));
          if (allocItems.length === 0) {
            toast.error("No valid unallocated items found. Please ensure items are linked to inventory and not already allocated.");
            return;
          }
          const res = await api.post("material-requirements/allocate", {
            mrId: req.id,
            items: allocItems
          });
          if (res.success) {
            toast.success(`${allocItems.length} items allocated successfully!`);
            fetchResource("material-requirements");
            fetchResource("inventory");
          }
        } catch (e2) {
          toast.error("Allocation failed: " + e2.message);
        }
      }}
    >
                            <Check className="w-3.5 h-3.5" />
                            <span>Allocate</span>
                          </button>}
                        {hasPermission("EDIT_MATERIAL_REQUIREMENT") && <button
      title={isMRLocked(req.id) ? role === "Super Admin" ? "Edit (Super Admin override)" : "Locked: Purchase Order exists" : "Edit MR"}
      disabled={isMRLocked(req.id) && role !== "Super Admin"}
      onClick={(e) => {
        e.stopPropagation();
        setNewRequirement(JSON.parse(JSON.stringify(req)));
        setIsEditing(true);
        setModal(true);
      }}
      className={cn(
        "p-2 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors",
        isMRLocked(req.id) && role !== "Super Admin" && "opacity-30 cursor-not-allowed"
      )}
    >
                            <Pencil className="w-4 h-4" />
                          </button>}
                        {hasPermission("DELETE_MATERIAL_REQUIREMENT") && <button
      title={isMRLocked(req.id) ? role === "Super Admin" ? "Delete (Super Admin override)" : "Locked: Purchase Order exists" : "Delete MR"}
      disabled={isMRLocked(req.id) && role !== "Super Admin"}
      onClick={(e) => {
        e.stopPropagation();
        setDeletingId(req.id);
      }}
      className={cn(
        "p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors",
        isMRLocked(req.id) && role !== "Super Admin" && "opacity-30 cursor-not-allowed"
      )}
    >
                            <Trash2 className="w-4 h-4" />
                          </button>}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-gray-900">
                    <div className="flex flex-wrap gap-2">
                      {req.items.map((item, idx) => <div key={idx} className={cn("px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border rounded-lg flex flex-col gap-1", isItemPOCreated(item, req) ? "border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20" : "border-gray-100 dark:border-gray-700")}>
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-primary" />
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">{item.materialName}</span>
                                {isItemPOCreated(item, req) && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md border border-blue-200 dark:border-blue-700/50 text-[9px] font-black tracking-widest shrink-0">
                                    <CheckCircle className="w-2.5 h-2.5" /> PO
                                  </span>}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                {item.condition && <Badge text={item.condition} color="blue" small />}
                                {item.sku && item.sku !== "N/A" && <span className="text-[10px] text-gray-400 font-mono italic leading-none">{item.sku}</span>}
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 ml-auto">x {item.qty} {item.unit}</span>
                          </div>
                          {(item.status === "In Stock" || item.status === "Partial") && <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-green-50 dark:bg-green-900/10 rounded-md">
                              <Check className="w-2.5 h-2.5 text-green-600 dark:text-green-500" />
                              <span className="text-[9px] font-bold text-green-700 dark:text-green-400 tracking-widest">
                                {(() => {
      const inv = currentInventory.find((i) => i.sku === item.sku);
      const liveStock = inv ? inv.liveStock || 0 : item.availableInStock || 0;
      return liveStock >= (item.qty || 0) ? "Fully In Stock" : `${liveStock} In Stock`;
    })()}
                              </span>
                            </div>}
                        </div>)}
                    </div>
                  </div>
                </Card>
              </div>}
  />}

        {(!materialRequirements || materialRequirements.length === 0) && !loading && <div className="text-center py-12 text-gray-500 text-[13px]">
            No material requirements found.
          </div>}

        {loading && materialRequirements.length > 0 && <div className="flex items-center justify-center py-4 text-gray-500 text-xs">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
            Loading more requirements...
          </div>}
          </> : <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-[650px] flex flex-col">
            <div className="flex-1 overflow-x-auto no-scrollbar-lg relative">
              <table className="w-full text-left border-collapse table-fixed min-w-[800px] md:min-w-0">
                <thead className="hidden md:table-header-group sticky top-0 z-10">
                  <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                    <th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden sticky top-0 z-10 sticky-th">Engineer / Project</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden sticky top-0 z-10 sticky-th w-[130px]">MR details</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden sticky top-0 z-10 sticky-th">Allocated material</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap text-center overflow-hidden sticky top-0 z-10 sticky-th w-[80px]">Qty</th>
                    <th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden sticky top-0 z-10 sticky-th w-[148px]">Allocation date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {mrAllocations.length === 0 && !loading && <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500 italic text-[13px]">
                        No active stock allocations found.
                      </td>
                    </tr>}
                  {mrAllocations.map((alc, idx) => <tr key={alc.id || idx} className="block md:table-row hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all text-[13px]">
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
                             <div>
                               <p className="text-[9px] font-bold text-gray-400">Engineer</p>
                               <p className="font-medium text-gray-700 dark:text-gray-300">{alc.engineerName || "N/A"}</p>
                             </div>
                             <div>
                               <p className="text-[9px] font-bold text-gray-400">Project</p>
                               <p className="font-medium text-gray-700 dark:text-gray-300 truncate">{alc.projectName || "N/A"}</p>
                             </div>
                           </div>
                           <div className="mt-2 flex items-center gap-1">
                             <p className="text-[10px] text-gray-400 font-bold tracking-widest">Mr id:</p>
                             <p className="text-[11px] font-mono font-bold text-primary">{alc.mrNumber || alc.mrId}</p>
                           </div>
                         </div>
                         <div className="hidden md:flex flex-col min-w-0">
                           <span className="block truncate font-bold text-[#1A1A2E] dark:text-white text-[12px]" title={alc.engineerName || "N/A"}>{alc.engineerName || "N/A"}</span>
                           <span className="block truncate text-[11px] text-[#6B7280] dark:text-gray-400 italic" title={alc.projectName || "N/A"}>{alc.projectName || "N/A"}</span>
                         </div>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5 overflow-hidden">
                        <span className="block truncate font-mono text-[11px] text-[#6B7280]" title={alc.mrNumber || alc.mrId}>{alc.mrNumber || alc.mrId}</span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5 overflow-hidden">
                        <div className="flex flex-col min-w-0">
                          <span className="block truncate text-[13px] font-medium text-gray-700 dark:text-gray-300" title={alc.itemName}>{alc.itemName}</span>
                          <span className="block truncate text-[10px] text-gray-400 font-mono tracking-tight" title={alc.sku}>{alc.sku}</span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-center">
                         <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 dark:bg-primary/20 text-primary rounded font-bold text-[12px] min-w-[30px] justify-center">
                           {alc.allocatedQty}
                         </span>
                      </td>
                      <td className="hidden md:table-cell px-3 py-2.5 text-[#6B7280] dark:text-gray-500 whitespace-nowrap overflow-hidden">
                        {formatDateTime(alc.allocationDate)}
                      </td>
                    </tr>)}
                  {loading && mrAllocations.length > 0 && <tr>
                      <td colSpan={5} className="py-4 text-center">
                        <div className="flex items-center justify-center text-gray-500 text-xs">
                          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                          Loading more allocations...
                        </div>
                      </td>
                    </tr>}
                </tbody>
              </table>
            </div>
            {mrAllocationsPagination && mrAllocationsPagination.pages > 1 && <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <Pagination
    data={mrAllocationsPagination}
    onPageChange={(p) => handlePageChange(p)}
  />
              </div>}
          </Card>}
      </div>

      {viewModal && selectedRequirement && <Modal
    title={`Requirement Details - ${selectedRequirement.id}`}
    ultraWide
    onClose={() => setViewModal(false)}
    footer={<div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 w-full">
              {
      /* ── Left: primary actions ───────────────────────────── */
    }
              <div className="flex flex-wrap items-center gap-2">
                {hasPermission("SAVE_MR_ITEM") && <button
      disabled={isMRLocked(selectedRequirement.id) || !allItemsMapped}
      onClick={async () => {
        if (!selectedRequirement) return;
        try {
          toast.loading("Saving changes...", { id: "save-mr" });
          const allInStock = selectedRequirement.items.length > 0 && selectedRequirement.items.every((i) => i.status === "In Stock");
          await updateMaterialRequirement(selectedRequirement.id, {
            ...selectedRequirement,
            status: allInStock ? "Approved by Store" : "Store Pending"
          });
          toast.success("Requirement saved successfully", { id: "save-mr" });
          setViewModal(false);
        } catch (e) {
          toast.error(e?.message || "Save failed", { id: "save-mr" });
        }
      }}
      className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 text-white rounded-xl text-xs font-black transition-all tracking-wider shadow-lg shadow-primary/20 dark:shadow-none disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
    >
                    <Check className="w-4 h-4" />
                    Save & close
                  </button>}
                {hasPermission("GET_QUOTATION_LINK") && <div className="relative quotation-dropdown-container">
                    <button
      disabled={!allItemsMapped || selectedRequirement.quotationLinkActive === false}
      onClick={() => setShowQuotationDropdown(!showQuotationDropdown)}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all tracking-wider disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer border",
        showQuotationDropdown ? "bg-primary text-white border-primary" : "bg-primary/5 hover:bg-primary hover:text-white dark:bg-primary/10 dark:hover:bg-primary text-primary border-primary/20"
      )}
      title={selectedRequirement.quotationLinkActive === false ? "Link is deactivated by AGM" : ""}
    >
                      <Link2 className="w-4 h-4" />
                      Get quotation link
                    </button>
                    {allItemsMapped && selectedRequirement.quotationLinkActive !== false && showQuotationDropdown && <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-2 block transition-all z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                        <p className="text-[10px] font-bold text-gray-400 px-3 py-1 tracking-wider">Select Category</p>
                        <button
      onClick={() => {
        const url = `${window.location.origin}${window.location.pathname}#public-quotation?mrId=${selectedRequirement.id}`;
        navigator.clipboard.writeText(url);
        toast.success("All items link copied!");
        setShowQuotationDropdown(false);
      }}
      className="w-full text-left px-3 py-2 text-[12px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
    >
                          All Categories
                        </button>
                        {Array.from(new Set(selectedRequirement.items.map((i) => i.category).filter(Boolean))).map((cat) => <button
      key={cat}
      onClick={() => {
        const url = `${window.location.origin}${window.location.pathname}#public-quotation?mrId=${selectedRequirement.id}&category=${encodeURIComponent(String(cat))}`;
        navigator.clipboard.writeText(url);
        toast.success(`${cat} link copied!`);
        setShowQuotationDropdown(false);
      }}
      className="w-full text-left px-3 py-2 text-[12px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors cursor-pointer"
    >
                            {cat}
                          </button>)}
                      </div>}
                  </div>}
                {selectedRequirement.status === "Store Pending" && !isMRLocked(selectedRequirement.id) && <button
      disabled={!allItemsMapped}
      onClick={() => handleRecheck(selectedRequirement)}
      className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-600 hover:text-white dark:bg-blue-500/10 dark:hover:bg-blue-600 text-blue-500 dark:text-blue-400 rounded-xl text-xs font-black transition-all tracking-wider border border-blue-200/50 dark:border-blue-800/30 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
    >
                    <RefreshCw className={`w-4 h-4 ${actionLoading ? "animate-spin" : ""}`} />
                    Recheck
                  </button>}
              </div>

              {
      /* ── Right: status actions + Cancel ──────────────────── */
    }
              <div className="flex flex-wrap items-center gap-2">
                {(() => {
      const itemsWithStockStatus = selectedRequirement.items.map((item) => {
        const inv = inventory.find((i) => i.sku === item.sku);
        const liveStock = inv ? inv.liveStock || 0 : 0;
        return { ...item, liveStock, isAvailable: liveStock >= item.qty };
      });
      const allInStock = itemsWithStockStatus.every((i) => i.isAvailable);
      const hasFinalQuotation = selectedRequirement.approvals?.length > 0 || selectedRequirement.approvedQuotationId || selectedRequirement.approvedSupplier;
      const someAllocated = selectedRequirement.items.some((i) => (i.availableInStock || 0) > 0);
      const hasPurchaseItems = itemsWithStockStatus.some((i) => i.status === "Needs Purchase" || i.status === "Purchase Required" || i.status === "Partial");
      const canApprove = allInStock || hasFinalQuotation || someAllocated || hasPurchaseItems;
      if ((selectedRequirement.status === "Store Pending" || selectedRequirement.status === "Allocated" || selectedRequirement.status === "Partially Allocated") && (hasPermission("APPROVE_MR_STORE") || hasPermission("MANAGE_INVENTORY"))) {
        return <button
          onClick={async () => {
            if (!canApprove || !allItemsMapped) {
              toast.error("Inventory check failed. Please ensure items are mapped to inventory and either in stock, linked, or marked for purchase.");
              return;
            }
            try {
              const newStatus = "Approved by Store";
              await updateMaterialRequirement(selectedRequirement.id, { status: newStatus });
              toast.success("Requirement approved by Store.");
              setViewModal(false);
            } catch (e) {
              toast.error("Failed to approve: " + e.message);
            }
          }}
          disabled={!canApprove || !allItemsMapped}
          title={!canApprove ? "Inventory unavailable: Please allocate stock, link inventory, or mark for purchase before approving." : "Approve by store"}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all tracking-wider border shrink-0 cursor-pointer ${canApprove && allItemsMapped ? "bg-emerald-500/10 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 dark:border-emerald-800/40" : "bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-255 dark:border-gray-700 cursor-not-allowed"}`}
        >
                        <CheckCircle className="w-4 h-4" />
                        Approve by store
                      </button>;
      }
      return null;
    })()}
                {selectedRequirement.status !== "Rejected" && hasPermission("REJECT_MR") && <Btn
      label="Reject Requirement"
      color="red"
      outline
      onClick={() => setRejectingId(selectedRequirement.id)}
      loading={actionLoading}
      disabled={!allItemsMapped}
      className="rounded-xl bg-rose-500/10 hover:bg-rose-600 hover:text-white text-red-500 dark:text-rose-450 border border-rose-500/25 dark:border-rose-500/30 transition-all duration-200 font-black tracking-wider text-xs px-4 py-2.5 cursor-pointer shrink-0"
    />}
                <Btn label="Cancel" outline onClick={() => setViewModal(false)} className="rounded-xl font-black text-xs px-5 py-2.5 cursor-pointer shrink-0" />
              </div>
            </div>}
  >
          {isMRLocked(selectedRequirement.id) && <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 dark:border-amber-500/30 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-[13px] font-bold text-amber-900 dark:text-amber-450">Locked for Editing</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-550">This requirement has an associated Purchase Order and cannot be modified.</p>
              </div>
            </div>}
          {!allItemsMapped && <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[13px] font-bold text-red-500 font-sans">Inventory Mapping Required</p>
                <p className="text-[11px] text-red-500/80 font-sans mt-0.5">Some items are not linked to inventory stock SKU. All action buttons (Save & Close, Get Quotation Link, Recheck, Approve by Store, Reject Requirement) are disabled until you map each item.</p>
              </div>
            </div>}
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50/25 dark:bg-[#0F172A]/40 border border-gray-150/60 dark:border-gray-800/80 rounded-2xl">
              <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                  <User className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none">Requester</p>
                  <p className="text-[13px] font-black text-gray-800 dark:text-white truncate mt-1">
                    {safeStr(selectedRequirement.requesterName || selectedRequirement.requester || selectedRequirement.createdBy) || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none">Request Date</p>
                  <p className="text-[13px] font-black text-gray-800 dark:text-white truncate mt-1">
                    {formatDateTime(selectedRequirement.date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none">Required Date</p>
                  <p className="text-[13px] font-black text-gray-800 dark:text-white truncate mt-1">
                    {formatDate(selectedRequirement.requirementDate || selectedRequirement.requiredDate || "")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                  <Building className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none">Project</p>
                  <p className="text-[13px] font-black text-gray-800 dark:text-white truncate mt-1">
                    {safeStr(selectedRequirement.project || selectedRequirement.projectName) || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none">Location</p>
                  <p className="text-[13px] font-black text-gray-800 dark:text-white truncate mt-1">
                    {safeStr(selectedRequirement.location || selectedRequirement.site || selectedRequirement.address) || "N/A"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none">Work Type</p>
                  <p className="text-[13px] font-black text-gray-800 dark:text-white truncate mt-1">
                    {safeStr(selectedRequirement.workType) || "N/A"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                  <Link2 className="w-5 h-5" />
                </div>
                <div className="overflow-hidden flex-1 flex flex-col justify-center">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none mb-1">Quotation Link</p>
                  <div className="flex items-center gap-2">
                    <span className={cn(
    "text-[10px] font-bold px-2 py-0.5 rounded-full border leading-none",
    selectedRequirement.quotationLinkActive !== false ? "bg-green-50/80 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-800/30" : "bg-red-50/80 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/30"
  )}>
                      {selectedRequirement.quotationLinkActive !== false ? "Active" : "Deactivated"}
                    </span>
                    {hasPermission("TOGGLE_QUOTATION_LINK") && <button
    onClick={async () => {
      try {
        const nextState = selectedRequirement.quotationLinkActive === false;
        await updateMaterialRequirement(selectedRequirement.id, {
          quotationLinkActive: nextState
        });
        setSelectedRequirement({
          ...selectedRequirement,
          quotationLinkActive: nextState
        });
        toast.success(`Quotation link ${nextState ? "activated" : "deactivated"} successfully`);
      } catch (err) {
        toast.error(err.message || "Failed to update link status");
      }
    }}
    className="text-[9px] font-extrabold text-[#F97316] hover:text-[#ea580c] hover:underline transition-all tracking-wider shrink-0 cursor-pointer"
  >
                        {selectedRequirement.quotationLinkActive !== false ? "Deactivate" : "Activate"}
                      </button>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={selectedRequirement.status} />
                  </div>
                </div>
              </div>
            </div>

            {selectedRequirement.approvals?.length ? <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl">
                <h5 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-widest mb-3">Approved Supplier Quotations</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {selectedRequirement.approvals.map((app, idx) => <div key={idx} className="bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-850/40 p-3 rounded-xl shadow-xs flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle className="w-4.5 h-4.5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest leading-none mb-1">
                          {app.category || "All Items"}
                        </p>
                        <p className="text-xs font-black text-gray-800 dark:text-white truncate">
                          {app.supplierName}
                        </p>
                        <p className="text-[9px] text-gray-400 font-mono mt-0.5">{app.quotationId}</p>
                      </div>
                    </div>)}
                </div>
              </div> : (selectedRequirement.approvedSupplier || selectedRequirement.approvedQuotationId) && <div className="mt-4 p-4 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl flex flex-wrap gap-6">
                  {selectedRequirement.approvedSupplier && <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest leading-none mb-1">Approved Supplier</p>
                        <p className="text-xs font-black text-gray-800 dark:text-white">{safeStr(selectedRequirement.approvedSupplier)}</p>
                      </div>
                    </div>}
                  {selectedRequirement.approvedQuotationId && <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest leading-none mb-1">Approved Quotation ID</p>
                        <p className="text-xs font-black text-gray-800 dark:text-white font-mono">{safeStr(selectedRequirement.approvedQuotationId)}</p>
                      </div>
                    </div>}
                </div>}

            <div className="space-y-4">
              <h4 className="text-[11px] font-bold text-gray-500 tracking-wider px-2">Requested items</h4>

              {
    /* Desktop view table */
  }
              <div className="hidden md:block border border-gray-150/60 dark:border-gray-800/80 rounded-2xl overflow-x-auto shadow-xs bg-gray-50/25 dark:bg-[#0F172A]/40 min-h-[360px] pb-28">
                <table className="w-full min-w-max text-left border-collapse table-auto">
                  <thead className="bg-gray-50/10 dark:bg-[#0F172A]/40 backdrop-blur-md">
                    <tr>
                      <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap overflow-hidden border-b border-gray-100 dark:border-gray-800">Material name</th>
                      <th className="px-2 py-3.5 text-[10px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap text-center overflow-hidden border-b border-gray-100 dark:border-gray-800 w-[145px]">Category</th>
                      <th className="px-2 py-3.5 text-[10px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap text-center overflow-hidden border-b border-gray-100 dark:border-gray-800 w-[95px]">Condition</th>
                      <th className="px-2 py-3.5 text-[10px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap text-center overflow-hidden border-b border-gray-100 dark:border-gray-800 w-[115px]">Qty</th>
                      <th className="px-2 py-3.5 text-[10px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap text-center overflow-hidden border-b border-gray-100 dark:border-gray-800 w-[80px]">In stock</th>
                      <th className="px-2 py-3.5 text-[10px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap text-center overflow-hidden border-b border-gray-100 dark:border-gray-800 w-[90px]">Allocate</th>
                      <th className="px-2 py-3.5 text-[10px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap text-center overflow-hidden border-b border-gray-100 dark:border-gray-800 w-[90px]">Purchase</th>
                      <th className="px-2 py-3.5 text-[10px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap text-center overflow-hidden border-b border-gray-100 dark:border-gray-800 w-[100px]">Status</th>
                      <th className="px-2 py-3.5 text-[10px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap text-center overflow-hidden border-b border-gray-100 dark:border-gray-800 w-[110px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/80 bg-transparent">
                    {selectedRequirement.items.map((item, idx) => <tr key={idx} className="transition-all duration-200">
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-start gap-3">
                            <div className="w-8.5 h-8.5 mt-[3px] rounded-xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center border border-orange-100/50 dark:border-orange-900/10 shrink-0">
                              <Package className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="flex-1">
                              <input
    disabled={isMRLocked(selectedRequirement.id)}
    className="text-[13px] font-bold text-gray-900 dark:text-white block bg-white/40 dark:bg-[#0F172A]/30 border border-gray-200/50 dark:border-gray-800/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 h-[40px] w-full outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-inner"
    value={item.materialName}
    onChange={(e) => {
      const newItems = [...selectedRequirement.items];
      newItems[idx].materialName = e.target.value;
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
    placeholder="Edit material name..."
  />
                              <div className="flex items-center gap-2 mt-2">
                                {item.sku && item.sku !== "N/A" ? <div className="flex items-center gap-1 px-2.5 py-0.5 bg-green-50/80 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg border border-green-200/50 dark:border-green-800/30 shadow-xs shrink-0">
                                    <Check className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-[10px] font-black tracking-tight">{safeStr(item.sku)}</span>
                                  </div> : <div className="flex items-center gap-1 px-2.5 py-0.5 bg-red-50/80 dark:bg-red-950/20 text-red-500 dark:text-red-400 rounded-lg border border-red-200/50 dark:border-red-800/30 shadow-xs shrink-0">
                                    <span className="text-[9px] font-extrabold tracking-widest italic">Not Linked</span>
                                  </div>}
                                {isItemPOCreated(item, selectedRequirement) && <div className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-50/80 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200/50 dark:border-blue-800/40 shadow-xs shrink-0">
                                    <CheckCircle className="w-3 h-3 shrink-0" />
                                    <span className="text-[9px] font-black tracking-widest">PO Created</span>
                                  </div>}
                                <button
    disabled={isMRLocked(selectedRequirement.id)}
    onClick={() => {
      setLinkSearch(item.materialName);
      setLinkingIdx(idx);
    }}
    className="text-[9px] text-primary hover:text-white bg-primary/10 hover:bg-primary border border-primary/25 rounded-lg px-2.5 py-1 font-bold flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer"
  >
                                  <Link2 className="w-3 h-3" />
                                  Manual Link
                                </button>
                                <button
    disabled={isMRLocked(selectedRequirement.id)}
    onClick={() => {
      const searchTerm = item.materialName.toLowerCase().trim();
      const bestMatch = inventory.find(
        (i) => i.itemName.toLowerCase().trim() === searchTerm || i.sku.toLowerCase().trim() === searchTerm || i.itemName.toLowerCase().includes(searchTerm) && searchTerm.length > 3
      );
      if (bestMatch) {
        const newItems = [...selectedRequirement.items];
        const available = bestMatch.liveStock || 0;
        const requested = newItems[idx].qty || 0;
        let status = "Needs Purchase";
        if (available >= requested) status = "In Stock";
        else if (available > 0) status = "Partial";
        newItems[idx] = {
          ...newItems[idx],
          sku: bestMatch.sku,
          materialName: bestMatch.itemName,
          category: bestMatch.category || newItems[idx].category,
          unit: bestMatch.unit,
          availableInStock: available,
          remainingQty: Math.max(0, requested - available),
          status
        };
        setSelectedRequirement({ ...selectedRequirement, items: newItems });
        toast.success(`Auto-linked to ${bestMatch.sku}`);
      } else {
        toast.error("No exact match. Use manual link.");
      }
    }}
    className="text-[9px] text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary bg-white/40 dark:bg-[#0F172A]/30 border border-gray-200/50 dark:border-gray-800/80 hover:border-primary/25 rounded-lg px-2.5 py-1 font-bold flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer"
  >
                                  Auto Match
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4 align-top text-center">
                          <SField
    disabled={isMRLocked(selectedRequirement.id)}
    options={categoryOptions.map((cat) => ({ value: cat, label: cat }))}
    value={item.category || ""}
    onChange={(e) => {
      const newItems = [...selectedRequirement.items];
      newItems[idx].category = e.target.value;
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
    placeholder="Select Category"
    className="min-w-[130px] w-full mb-0"
  />
                        </td>
                        <td className="px-2 py-4 align-top text-center">
                          <SField
    disabled={isMRLocked(selectedRequirement.id)}
    options={["New", "Old"]}
    value={item.condition || "New"}
    onChange={(e) => {
      const newItems = [...selectedRequirement.items];
      newItems[idx].condition = e.target.value;
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
    className="w-full mb-0"
  />
                        </td>
                        <td className="px-2 py-4 align-top">
                          <div className="flex justify-center">
                            <div className="flex flex-col gap-1.5 w-full max-w-[100px] mx-auto">
                              <input
    disabled={isMRLocked(selectedRequirement.id)}
    type="number"
    className="text-[13px] font-bold text-center bg-white/40 dark:bg-[#0F172A]/30 border border-gray-200/50 dark:border-gray-800/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 h-[40px] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-inner w-full"
    value={item.qty}
    min={1}
    onChange={(e) => {
      const newItems = [...selectedRequirement.items];
      const qty = Math.max(1, Number(e.target.value));
      const inv = inventory.find((i) => i.sku === item.sku);
      let status = item.status;
      let availableInStock = item.availableInStock || 0;
      if (inv) {
        const available = inv.liveStock || 0;
        if (available >= qty) status = "In Stock";
        else if (available > 0) status = "Partial";
        else status = "Needs Purchase";
        availableInStock = Math.min(qty, available);
      }
      newItems[idx] = {
        ...newItems[idx],
        qty,
        status,
        availableInStock,
        remainingQty: Math.max(0, qty - availableInStock)
      };
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
  />
                              <SField
    disabled={isMRLocked(selectedRequirement.id)}
    options={UNITS.map((u) => ({ value: u, label: u }))}
    value={item.unit || ""}
    onChange={(e) => {
      const newItems = [...selectedRequirement.items];
      newItems[idx].unit = e.target.value;
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
    placeholder="Unit"
    className="w-full mb-0"
  />
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4 align-top text-center">
                          <div className="flex justify-center">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/5 text-blue-500 dark:text-blue-400 rounded-xl border border-blue-500/20 dark:border-blue-500/30 shadow-xs shrink-0 font-bold text-xs h-9 min-w-[50px] justify-center">
                              {(() => {
    const inv = inventory.find((i) => i.sku === item.sku);
    return inv ? inv.liveStock || 0 : 0;
  })()}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-4 align-top text-center">
                          <div className="flex justify-center">
                            {hasPermission("ALLOCATE_MR") && !isMRLocked(selectedRequirement.id) ? <input
    type="number"
    className="w-20 text-center text-[13px] font-bold bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl px-3 py-1.5 shadow-inner text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all h-9"
    value={item.availableInStock || 0}
    min={0}
    max={item.qty}
    onChange={(e) => {
      const newItems = [...selectedRequirement.items];
      const val = Math.max(0, Math.min(Number(e.target.value), item.qty || 0));
      const requested = item.qty || 0;
      let status = "Needs Purchase";
      if (val >= requested) status = "In Stock";
      else if (val > 0) status = "Partial";
      newItems[idx] = {
        ...newItems[idx],
        availableInStock: val,
        remainingQty: Math.max(0, requested - val),
        status
      };
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
  /> : <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30 shadow-xs shrink-0 font-bold text-xs h-9 min-w-[50px] justify-center">
                                {item.availableInStock || 0}
                              </div>}
                          </div>
                        </td>
                        <td className="px-2 py-4 align-top text-center">
                          <div className="flex justify-center">
                            {hasPermission("EDIT_MR_PURCHASE") && !isMRLocked(selectedRequirement.id) ? <input
    type="number"
    className="w-20 text-center text-[13px] font-bold bg-rose-500/5 border border-rose-500/20 dark:border-rose-500/30 rounded-xl px-3 py-1.5 shadow-inner text-red-500 dark:text-rose-455 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all h-9"
    value={item.remainingQty || 0}
    min={0}
    max={item.qty}
    onChange={(e) => {
      const newItems = [...selectedRequirement.items];
      const val = Math.max(0, Math.min(Number(e.target.value), item.qty || 0));
      const requested = item.qty || 0;
      const allocated = Math.max(0, requested - val);
      let status = "Needs Purchase";
      if (allocated >= requested) status = "In Stock";
      else if (allocated > 0) status = "Partial";
      newItems[idx] = {
        ...newItems[idx],
        remainingQty: val,
        availableInStock: allocated,
        status
      };
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
  /> : <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/5 text-red-500 dark:text-rose-455 rounded-xl border border-rose-500/20 dark:border-rose-500/30 shadow-xs shrink-0 font-bold text-xs h-9 min-w-[50px] justify-center">
                                {item.remainingQty || 0}
                              </div>}
                          </div>
                        </td>
                        <td className="px-2 py-4 align-top text-center">
                          <div className="flex justify-center">
                            <StatusBadge
    status={item.status || "Check Required"}
  />
                          </div>
                        </td>
                        <td className="px-2 py-4 align-top text-center">
                          <div className="flex justify-center">
                            {hasPermission("SAVE_MR_ITEM") && <button
    disabled={isMRLocked(selectedRequirement.id)}
    onClick={async () => {
      try {
        const currentItems = [...selectedRequirement.items];
        currentItems.forEach((item2) => {
          const inv = inventory.find((i) => i.sku === item2.sku);
          const liveStock = inv ? inv.liveStock || 0 : 0;
          if (!hasPermission("ALLOCATE_MR")) {
            item2.availableInStock = Math.min(item2.qty || 0, liveStock);
          }
          if (!hasPermission("EDIT_MR_PURCHASE")) {
            item2.remainingQty = Math.max(0, (item2.qty || 0) - (item2.availableInStock || 0));
          }
          const allocated = item2.availableInStock || 0;
          if (allocated >= item2.qty) {
            item2.status = "In Stock";
          } else if (allocated > 0) {
            item2.status = "Partial";
          } else {
            item2.status = "Needs Purchase";
          }
        });
        const allInStock = currentItems.length > 0 && currentItems.every((i) => i.status === "In Stock");
        const newStatus = allInStock ? "Approved by Store" : "Store Pending";
        await updateMaterialRequirement(selectedRequirement.id, {
          ...selectedRequirement,
          items: currentItems,
          status: newStatus
        });
        toast.success("Requirement updated & saved");
      } catch (e) {
        toast.error(e?.message || "Update failed");
      }
    }}
    className="p-2.5 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30 transition-all flex items-center justify-center gap-1 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
    title={isMRLocked(selectedRequirement.id) ? "Locked: Purchase Order exists" : "Save changes to this item"}
  >
                                <Check className="w-4 h-4 shrink-0" />
                                <span className="text-[10px] font-bold">Save</span>
                              </button>}
                          </div>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>

              {
    /* Mobile view cards */
  }
              <div className="md:hidden space-y-3">
                {selectedRequirement.items.map((item, idx) => <Card key={idx} className="p-4 space-y-3 bg-gray-50/25 dark:bg-[#0F172A]/40 border border-gray-150/60 dark:border-gray-800/80 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 mr-2">
                        <input
    className="text-sm font-bold text-gray-900 dark:text-white block bg-white/40 dark:bg-[#0F172A]/30 border border-gray-200/50 dark:border-gray-800/80 focus:ring-1 focus:ring-primary rounded px-2 py-1 w-full"
    value={item.materialName}
    onChange={(e) => {
      const newItems = [...selectedRequirement.items];
      newItems[idx].materialName = e.target.value;
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
  />
                        <div className="flex items-center gap-2 mt-2">
                           <button
    onClick={() => {
      setLinkSearch(item.materialName);
      setLinkingIdx(idx);
    }}
    className="text-[10px] text-primary hover:bg-primary/5 px-2 py-1 rounded border border-primary/20 font-bold flex items-center gap-1 transition-colors"
  >
                            <Link2 className="w-3 h-3" />
                            {item.sku && item.sku !== "N/A" ? item.sku : "Link To Inventory"}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <StatusBadge status={item.status} />
                        {isItemPOCreated(item, selectedRequirement) && <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200/60 dark:border-blue-800/40 shrink-0">
                            <CheckCircle className="w-3 h-3 shrink-0" />
                            <span className="text-[9px] font-black tracking-widest">PO Created</span>
                          </div>}
                        <button
    onClick={() => {
      const newItems = [...selectedRequirement.items];
      newItems.splice(idx, 1);
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
    className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
  >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 py-2 border-t border-gray-50 dark:border-gray-800 mt-2">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-gray-400 tracking-widest leading-none">Qty & Unit</span>
                        <div className="flex flex-col gap-1.5">
                           <input
    type="number"
    className="text-[13px] font-bold text-gray-700 dark:text-white bg-white/40 dark:bg-[#0F172A]/30 border border-gray-200/50 dark:border-gray-800/80 rounded-xl px-3 py-2 w-full min-h-[40px] outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary shadow-inner"
    value={item.qty}
    min={1}
    onChange={(e) => {
      const newItems = [...selectedRequirement.items];
      newItems[idx].qty = Math.max(1, Number(e.target.value));
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
  />
                          <SField
    options={UNITS.map((u) => ({ value: u, label: u }))}
    value={item.unit || ""}
    onChange={(e) => {
      const newItems = [...selectedRequirement.items];
      newItems[idx].unit = e.target.value;
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
    placeholder="Unit"
    className="w-full mb-0"
  />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center">
                          <span className="text-[9px] font-bold text-gray-400 tracking-widest leading-none block">Inv Stock</span>
                          <span className="text-xs font-bold text-blue-500 block mt-1 bg-blue-500/5 border border-blue-500/20 dark:border-blue-500/30 rounded py-0.5">
                            {(() => {
    const inv = inventory.find((i) => i.sku === item.sku);
    return inv ? inv.liveStock || 0 : 0;
  })()}
                          </span>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] font-bold text-gray-400 tracking-widest leading-none block">Allocate</span>
                          {hasPermission("ALLOCATE_MR") && !isMRLocked(selectedRequirement.id) ? <input
    type="number"
    className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded px-1.5 py-0.5 w-full mt-1 outline-none focus:ring-1 focus:ring-emerald-500 text-center"
    value={item.availableInStock || 0}
    max={item.qty}
    min={0}
    onChange={(e) => {
      const newItems = [...selectedRequirement.items];
      const val = Math.max(0, Math.min(Number(e.target.value), item.qty || 0));
      const requested = item.qty || 0;
      let status = "Needs Purchase";
      if (val >= requested) status = "In Stock";
      else if (val > 0) status = "Partial";
      newItems[idx] = { ...newItems[idx], availableInStock: val, remainingQty: Math.max(0, requested - val), status };
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
  /> : <span className="text-xs font-bold text-emerald-500 block mt-1 bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded py-0.5">
                              {item.availableInStock || 0}
                            </span>}
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] font-bold text-gray-400 tracking-widest leading-none block">Purchase</span>
                          {hasPermission("EDIT_MR_PURCHASE") && !isMRLocked(selectedRequirement.id) ? <input
    type="number"
    className="text-xs font-bold text-red-500 dark:text-rose-455 bg-rose-500/5 border border-rose-500/20 dark:border-rose-500/30 rounded px-1.5 py-0.5 w-full mt-1 outline-none focus:ring-1 focus:ring-rose-500 text-center"
    value={item.remainingQty || 0}
    max={item.qty}
    min={0}
    onChange={(e) => {
      const newItems = [...selectedRequirement.items];
      const val = Math.max(0, Math.min(Number(e.target.value), item.qty || 0));
      const requested = item.qty || 0;
      const allocated = Math.max(0, requested - val);
      let status = "Needs Purchase";
      if (allocated >= requested) status = "In Stock";
      else if (allocated > 0) status = "Partial";
      newItems[idx] = { ...newItems[idx], remainingQty: val, availableInStock: allocated, status };
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
    }}
  /> : <span className="text-xs font-bold text-primary block mt-1 bg-red-500/5 border border-red-500/20 dark:border-red-500/30 rounded py-0.5">
                               {item.remainingQty || 0}
                            </span>}
                        </div>
                      </div>
                    </div>
                    {hasPermission("SAVE_MR_ITEM") && <button
    onClick={async () => {
      try {
        const currentItems = [...selectedRequirement.items];
        currentItems.forEach((it) => {
          const inv = inventory.find((i) => i.sku === it.sku);
          const liveStock = inv ? inv.liveStock || 0 : 0;
          if (!hasPermission("ALLOCATE_MR")) {
            it.availableInStock = Math.min(it.qty || 0, liveStock);
          }
          if (!hasPermission("EDIT_MR_PURCHASE")) {
            it.remainingQty = Math.max(0, (it.qty || 0) - (it.availableInStock || 0));
          }
          const allocated = it.availableInStock || 0;
          if (allocated >= it.qty) {
            it.status = "In Stock";
          } else if (allocated > 0) {
            it.status = "Partial";
          } else {
            it.status = "Needs Purchase";
          }
        });
        const allInStock = currentItems.length > 0 && currentItems.every((i) => i.status === "In Stock");
        const newStatus = allInStock ? "Approved by Store" : "Store Pending";
        await updateMaterialRequirement(selectedRequirement.id, { ...selectedRequirement, items: currentItems, status: newStatus });
        toast.success("Saved");
      } catch (e) {
        toast.error("Failed");
      }
    }}
    className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-emerald-500/20 dark:border-emerald-500/30"
  >
                        <Check className="w-3.5 h-3.5" />
                        Save item changes
                      </button>}
                  </Card>)}
              </div>
            </div>

          </div>
        </Modal>}

      {modal && <Modal
    title={isEditing ? "Edit Requirement" : "New Material Requirement"}
    onClose={() => setModal(false)}
    extraWide
    footer={<div className="flex justify-end gap-3 w-full">
              <Btn label="Cancel" outline onClick={() => {
      setModal(false);
      resetForm();
    }} />
              <Btn
      label={isEditing ? "Update Requirement" : "Submit Requirement"}
      className="px-8"
      onClick={handleCreate}
      loading={actionLoading}
    />
            </div>}
  >
          <div className="space-y-6">
            {
    /* ── Material Plan Selector ───────────────────────────── */
  }
            <div className="bg-blue-50/60 dark:bg-blue-900/10 border border-blue-200/60 dark:border-blue-700/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Link to Approved Material Plan (Optional)</p>
                {newRequirement.planId && <button onClick={() => setNewRequirement({ ...newRequirement, planId: "", project: "", requesterName: "" })} className="text-[11px] text-gray-400 hover:text-red-500 transition-colors">Clear</button>}
              </div>
              <select
    value={newRequirement.planId || ""}
    onChange={(e) => {
      const planId = e.target.value;
      const plan = plans.find((p) => p.id === planId);
      setNewRequirement({
        ...newRequirement,
        planId,
        project: plan?.project || newRequirement.project || "",
        requesterName: plan?.engineer || newRequirement.requesterName || "",
        location: plan?.location || newRequirement.location || "",
        workType: plan?.workType || newRequirement.workType || "",
        items: plan ? (plan.items || []).map((item) => ({
          materialName: item.itemName || item.materialName || item.name || "",
          sku: item.sku || "",
          qty: 1,
          unit: item.unit || "",
          condition: "New",
          category: item.category || ""
        })) : newRequirement.items
      });
    }}
    className="w-full px-3 py-2 border border-blue-200 dark:border-blue-700/50 bg-white dark:bg-gray-800 rounded-lg text-[13px] text-gray-900 dark:text-white focus:outline-none focus:border-primary"
  >
                <option value="">— Select an approved plan to link (fills fields automatically) —</option>
                {availablePlansForForm.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.project}{p.engineer ? ` \xB7 ${p.engineer}` : ""}</option>)}
              </select>
              {newRequirement.planId && planRemainingQty && <div className="flex flex-wrap gap-2">
                  {Object.values(planRemainingQty).map((mat) => <span key={mat.name} className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${mat.remaining > 0 ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"}`}>
                      {mat.name}: {mat.remaining} {mat.unit} left
                    </span>)}
                </div>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 relative z-[60]">
              <div className="space-y-1">
                <SField
    label="Your Name *"
    value={newRequirement.requesterName}
    onChange={(e) => setNewRequirement({ ...newRequirement, requesterName: e.target.value })}
    options={requesters}
    error={errors.requesterName}
    required
  />
                {newRequirement.requesterName === "Other" && <div className="mt-2 text-xs">
                    <Field
    placeholder="Enter your name"
    value={otherRequester}
    onChange={(e) => setOtherRequester(e.target.value)}
    error={errors.otherRequester}
    required
  />
                  </div>}
              </div>
              <div className="space-y-1">
                <SField
    label="Project *"
    value={newRequirement.project}
    onChange={(e) => setNewRequirement({ ...newRequirement, project: e.target.value, items: [{ materialName: "", sku: "", qty: 1, unit: "", condition: "New" }] })}
    options={isSiteEngineer && engineerProjects ? engineerProjects : projects}
    error={errors.project}
    required
  />
                {isSiteEngineer && engineerProjects && engineerProjects.length === 0 && <p className="text-[11px] text-amber-500 mt-1">No material plans are assigned to you yet.</p>}
                {!isSiteEngineer && newRequirement.project === "Other" && <div className="mt-2 text-xs">
                    <Field
    placeholder="Enter project name"
    value={otherProject}
    onChange={(e) => setOtherProject(e.target.value)}
    error={errors.otherProject}
    required
  />
                  </div>}
              </div>

              <div className="space-y-1">
                <SField
    label="Work Type"
    value={newRequirement.workType}
    onChange={(e) => setNewRequirement({ ...newRequirement, workType: e.target.value })}
    options={workTypes}
    error={errors.workType}
  />
              </div>

              <div className="space-y-1">
                <Field
    label="Requirement Date"
    type="date"
    value={newRequirement.requirementDate}
    onChange={(e) => setNewRequirement({ ...newRequirement, requirementDate: e.target.value })}
    error={errors.requirementDate}
  />
              </div>

              <div className="md:col-span-2">
                <Field
    label="Location"
    placeholder="Specific location or site area (e.g. Tower A, 4th Floor...)"
    value={newRequirement.location}
    onChange={(e) => setNewRequirement({ ...newRequirement, location: e.target.value })}
    error={errors.location}
  />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <h3 className="text-[13px] font-bold text-gray-900 dark:text-white tracking-wider">Material items</h3>
                <Btn label="Add Item" icon={Plus} small outline onClick={addItem} />
              </div>

              {isSiteEngineer && newRequirement.project && engineerPlanItems && <p className="text-[11px] text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
                  Only items from the material plan for <strong>{newRequirement.project}</strong> are available.
                </p>}
              {isSiteEngineer && !newRequirement.project && <p className="text-[11px] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
                  Select a project first to see available plan items.
                </p>}

              {errors.items && <p className="text-[11px] text-red-500">{errors.items}</p>}

              <div className="space-y-4">
                {newRequirement.items?.map((item, idx) => <div key={idx} className="bg-gray-50/30 dark:bg-gray-800/20 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 relative group transition-all hover:border-primary/30 dark:hover:border-primary/20">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-4 items-end">
                      <div className="md:col-span-5">
                        <Field
    label="Material Name *"
    placeholder="Type material name (e.g. Cement...)"
    value={item.materialName || ""}
    className="mb-0"
    onChange={(e) => {
      const val = e.target.value;
      const items = [...newRequirement.items || []];
      const lowerVal = val.toLowerCase().trim();
      const invMatch = inventory.find((i) => (i.itemName || "").toLowerCase().trim() === lowerVal);
      const catMatch = catalogue.find((c) => (c.itemName || "").toLowerCase().trim() === lowerVal);
      items[idx] = {
        ...items[idx],
        materialName: val,
        sku: invMatch?.sku || catMatch?.sku || items[idx].sku || "N/A",
        unit: invMatch?.unit || catMatch?.uom || items[idx].unit,
        category: invMatch?.category || catMatch?.category || items[idx].category || ""
      };
      setNewRequirement({ ...newRequirement, items });
    }}
    error={errors[`item_${idx}_name`]}
  />
                      </div>
                      <div className="grid grid-cols-3 md:col-span-7 gap-4">
                        <div className="col-span-1">
                          <Field
    label="Qty *"
    type="number"
    value={item.qty}
    className="mb-0 text-sm"
    onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
    error={errors[`item_${idx}_qty`]}
  />
                          {(() => {
    const rem = getItemRemaining(item);
    if (!rem) return null;
    const exceeded = item.qty > rem.remaining;
    return <p className={`text-[10px] font-bold mt-0.5 ${exceeded ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                                {exceeded ? `\u26A0 Max ${rem.remaining}` : `\u2713 ${rem.remaining} ${rem.unit} left`}
                              </p>;
  })()}
                        </div>
                        <div className="col-span-1">
                          <SField
    label="Unit *"
    value={item.unit}
    className="mb-0"
    onChange={(e) => updateItem(idx, "unit", e.target.value)}
    options={units}
    error={errors[`item_${idx}_unit`]}
  />
                        </div>
                        <div className="col-span-1">
                          <SField
    label="Condition"
    value={item.condition || "New"}
    className="mb-0"
    onChange={(e) => updateItem(idx, "condition", e.target.value)}
    options={["New", "Old"]}
  />
                        </div>
                      </div>
                    </div>
                    {newRequirement.items.length > 1 && <button
    onClick={() => removeItem(idx)}
    className="absolute -top-2 -right-2 md:top-2 md:right-2 p-1.5 bg-white dark:bg-gray-900 text-gray-400 hover:text-red-500 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm transition-all"
  >
                        <Trash2 className="w-4 h-4" />
                      </button>}
                  </div>)}
              </div>
            </div>

          </div>
        </Modal>}

      {successModal && <Modal
    title="Success"
    onClose={() => setSuccessModal(null)}
    footer={<div className="w-full">
              <Btn label="Close" onClick={() => setSuccessModal(null)} block />
            </div>}
  >
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Requirement Submitted!</h3>
              <p className="text-sm text-gray-500">Your requirement ID is:</p>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg font-mono font-bold text-lg text-primary border border-primary/20">
                {successModal}
              </div>
            </div>
          </div>
        </Modal>}

      {linkingIdx !== null && selectedRequirement && <Modal
    title="Link to Inventory Item"
    onClose={() => setLinkingIdx(null)}
  >
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
    autoFocus
    type="text"
    placeholder="Search inventory by Name, SKU, or Category..."
    value={linkSearch}
    onChange={(e) => setLinkSearch(e.target.value)}
    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 transition-all font-medium"
  />
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {searchingLink ? <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-primary/20 animate-spin mx-auto mb-2" />
                  <p className="text-[13px] text-gray-400 font-medium">Searching inventory...</p>
                </div> : <>
                  {linkResults.length > 0 ? linkResults.map((invItem, idx) => <button
    key={`${invItem.sku || ""}-${invItem._id || idx}`}
    onClick={() => {
      const newItems = [...selectedRequirement.items];
      const available = invItem.liveStock || 0;
      const requested = newItems[linkingIdx].qty || 0;
      let status = "Needs Purchase";
      if (available >= requested) status = "In Stock";
      else if (available > 0) status = "Partial";
      newItems[linkingIdx] = {
        ...newItems[linkingIdx],
        sku: invItem.sku,
        materialName: invItem.itemName,
        // Update name as per inventory for alignment
        unit: invItem.unit,
        availableInStock: available,
        remainingQty: Math.max(0, requested - available),
        status
      };
      setSelectedRequirement({ ...selectedRequirement, items: newItems });
      setLinkingIdx(null);
      toast.success(`Linked to ${invItem.itemName}`);
    }}
    className="w-full text-left p-3 hover:bg-primary/5 dark:hover:bg-primary/10 rounded-xl transition-all border border-transparent hover:border-primary/20 group"
  >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-[13px] font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                              {invItem.itemName}
                            </p>
                            <p className="text-[11px] text-gray-500 font-mono tracking-tighter">
                              {invItem.sku} • {invItem.category}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[12px] font-black text-green-600 dark:text-green-400">
                              {invItem.liveStock} {invItem.unit}
                            </p>
                            <p className="text-[9px] text-gray-400 font-bold tracking-widest">Available</p>
                          </div>
                        </div>
                      </button>) : <div className="text-center py-12">
                      <Package className="w-10 h-10 text-gray-200 dark:text-gray-800 mx-auto mb-3" />
                      <p className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
                        {linkSearch ? "No matching items found in inventory." : "Start typing to search inventory..."}
                      </p>
                      {linkSearch && <p className="text-[11px] text-gray-400 mt-1 italic">
                          Try searching by SKU or a different keyword.
                        </p>}
                    </div>}
                </>}
            </div>
          </div>
        </Modal>}

      {deletingId && <ConfirmModal
    title="Delete Requirement"
    message="Are you sure you want to delete this material requirement? This action cannot be undone."
    onConfirm={handleConfirmDelete}
    onCancel={() => setDeletingId(null)}
    loading={actionLoading}
  />}

      {rejectingId && <ConfirmModal
    title="Reject Requirement"
    message={`Are you sure you want to reject requirement ${rejectingId}?`}
    onConfirm={async () => {
      try {
        await updateMaterialRequirement(rejectingId, { status: "Rejected" });
        toast.success("Requirement rejected");
        setRejectingId(null);
        setViewModal(false);
      } catch (e) {
        toast.error("Failed to reject: " + e.message);
      }
    }}
    onCancel={() => setRejectingId(null)}
    loading={actionLoading}
    confirmLabel="Reject"
    confirmColor="red"
  />}
    </div>;
}, "MaterialRequirementPage");
export {
  MaterialRequirementPage
};
