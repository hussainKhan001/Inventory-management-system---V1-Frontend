import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../../store";
import {
  Modal, Btn, StatusBadge, Badge, ConfirmModal, SField, Card,
} from "../../components/ui";
import {
  Check, Link2, RefreshCw, CheckCircle, AlertTriangle,
  User, Calendar, Building, MapPin, Activity, ShieldAlert,
  Package, Trash2, Search, RotateCcw,
} from "lucide-react";
import { safeStr, formatDateTime, formatDate } from "../../utils";
import { toast } from "react-hot-toast";
import { cn } from "../../lib/utils";

export function MRDetailModal({ requirement, onClose, onRequirementUpdate }) {
  const {
    inventory, catalogue, pos, quotations, api, fetchResource,
    updateMaterialRequirement, hasPermission, role, actionLoading, settings,
  } = useAppStore();

  const { units: UNITS } = settings;

  const [req, setReq] = useState(null);
  const [showQuotationDropdown, setShowQuotationDropdown] = useState(false);
  const [linkingIdx, setLinkingIdx] = useState(null);
  const [linkSearch, setLinkSearch] = useState("");
  const [linkResults, setLinkResults] = useState([]);
  const [searchingLink, setSearchingLink] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [revisingId, setRevisingId] = useState(null);

  // Sync local state when requirement prop changes
  useEffect(() => {
    if (requirement) setReq(JSON.parse(JSON.stringify(requirement)));
  }, [requirement]);

  // Close quotation dropdown on outside click
  useEffect(() => {
    if (!showQuotationDropdown) return;
    const handler = e => {
      if (!e.target.closest(".quotation-dropdown-container")) setShowQuotationDropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showQuotationDropdown]);

  // Debounced link search
  useEffect(() => {
    if (linkingIdx === null) { setLinkResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingLink(true);
      try {
        const res = await api.get("inventory", { search: linkSearch.trim(), limit: 50 });
        if (res.success) setLinkResults(res.data);
      } catch {} finally { setSearchingLink(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [linkSearch, linkingIdx, api]);

  // Auto-link unlinked items when modal opens
  useEffect(() => {
    if (!requirement) return;
    fetchResource("inventory", 1, 2000, true);
    const hasUnlinked = requirement.items.some(i => !i.sku || i.sku === "N/A");
    if (!hasUnlinked) return;
    let changed = false;
    const newItems = requirement.items.map(item => {
      if (!item.sku || item.sku === "N/A") {
        const match = inventory.find(i => i.itemName.toLowerCase().trim() === item.materialName.toLowerCase().trim());
        if (match) {
          changed = true;
          return {
            ...item, sku: match.sku, materialName: match.itemName, unit: match.unit,
            availableInStock: match.liveStock,
            remainingQty: Math.max(0, (item.qty || 0) - (match.liveStock || 0)),
            status: (match.liveStock || 0) >= (item.qty || 0) ? "In Stock" : "Needs Purchase",
          };
        }
      }
      return item;
    });
    if (changed) {
      setReq(prev => prev ? { ...prev, items: newItems } : null);
      toast.success("Found matching linked items in inventory", { id: "auto-link" });
    }
  }, [requirement?.id, fetchResource]);

  const isMRLocked = mrId => pos.some(po => po.mrId === mrId);

  const isItemPOCreated = (item) => {
    return pos.some(po =>
      po.mrId === req?.id &&
      !["Rejected", "Blocked", "Cancelled"].includes(po.status) &&
      po.items?.some(poItem => 
        (poItem.sku && item.sku && poItem.sku !== "N/A" && poItem.sku === item.sku) ||
        (poItem.itemName && item.materialName && poItem.itemName === item.materialName)
      )
    );
  };

  const allItemsMapped = req
    ? req.items?.length > 0 && req.items.every(i => i.sku && i.sku !== "N/A" && i.sku !== "")
    : true;

  const categoryOptions = useMemo(() => Array.from(new Set([
    ...inventory.map(i => i.category),
    ...catalogue.map(c => c.category),
    "Hardware", "Sanitary", "Stationery", "Plumbing", "Electrical", "Safety", "Tools",
  ].filter(Boolean))).sort(), [inventory, catalogue]);

  const handleRecheck = async () => {
    if (!req) return;
    try {
      toast.loading("Rechecking inventory...", { id: "recheck" });
      let latestInventory = inventory;
      try {
        const invRes = await api.get("inventory", { limit: 2000 });
        if (invRes.success) { latestInventory = invRes.data; }
      } catch {}
      const checkedItems = await Promise.all(req.items.map(async item => {
        let matches = latestInventory.filter(i =>
          (item.sku && item.sku !== "N/A" && i.sku?.toLowerCase().trim() === item.sku?.toLowerCase().trim()) ||
          i.itemName?.toLowerCase().replace(/\s+/g, "").trim() === item.materialName.toLowerCase().replace(/\s+/g, "").trim()
        );
        matches.sort((a, b) => {
          const aOk = item.sku && item.sku !== "N/A" && a.sku === item.sku;
          const bOk = item.sku && item.sku !== "N/A" && b.sku === item.sku;
          return aOk === bOk ? (b.liveStock || 0) - (a.liveStock || 0) : aOk ? -1 : 1;
        });
        let invItem = matches[0];
        if (!invItem) {
          try {
            if (item.sku && item.sku !== "N/A") {
              const r = await api.get("inventory", { filter: JSON.stringify({ sku: item.sku }), limit: 1 });
              if (r.success && r.data?.length > 0) invItem = r.data[0];
            }
            if (!invItem) {
              const r = await api.get("inventory", { search: item.materialName.trim(), limit: 20 });
              if (r.success && r.data?.length > 0) {
                const hits = r.data.filter(i =>
                  (item.sku && item.sku !== "N/A" && i.sku?.toLowerCase().trim() === item.sku?.toLowerCase().trim()) ||
                  i.itemName?.toLowerCase().replace(/\s+/g, "").trim() === item.materialName.toLowerCase().replace(/\s+/g, "").trim()
                );
                invItem = hits.length > 0
                  ? hits.find(i => item.sku && i.sku === item.sku) || hits.find(i => i.liveStock > 0) || hits[0]
                  : r.data[0]?.itemName?.toLowerCase().includes(item.materialName.toLowerCase()) ? r.data[0] : undefined;
              }
            }
          } catch {}
        }
        const available = invItem?.liveStock || 0;
        const alreadyProcessed = (item.allocatedQty || 0) + (item.issuedQty || 0);
        const net = Math.max(0, (item.qty || 0) - alreadyProcessed);
        let status = item.status || "Needs Purchase";
        let availableInStock = 0, remainingQty = net;
        if (net <= 0) {
          if (status !== "Issued" && status !== "Allocated") status = "Allocated";
          availableInStock = item.qty || 0; remainingQty = 0;
        } else if (available >= net) {
          status = "In Stock"; availableInStock = net; remainingQty = 0;
        } else if (available > 0) {
          status = "Partial"; availableInStock = available; remainingQty = net - available;
        } else {
          status = "Needs Purchase"; availableInStock = 0; remainingQty = net;
        }
        return { ...item, sku: invItem?.sku || item.sku || "N/A", availableInStock, remainingQty, status };
      }));
      const allInStock = checkedItems.length > 0 && checkedItems.every(i => i.status === "In Stock");
      const updated = await updateMaterialRequirement(req.id, {
        ...req, items: checkedItems, status: allInStock ? "Approved by Store" : req.status,
      });
      if (updated?.status === "Approved by Store" && req.status === "Store Pending") {
        toast.success("All items found in stock! Requirement approved by Store.", { id: "recheck", duration: 5000 });
        onClose();
      } else {
        toast.success("Inventory levels updated", { id: "recheck" });
        setReq(updated);
        onRequirementUpdate?.(updated);
      }
    } catch (e) { toast.error("Recheck failed: " + e.message, { id: "recheck" }); }
  };

  if (!req) return null;

  return (
    <>
      <Modal
        title={`Requirement Details - ${req.id}`}
        ultraWide
        onClose={onClose}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 w-full">
            {/* Left: primary actions */}
            <div className="flex flex-wrap items-center gap-2">
              {hasPermission("SAVE_MR_ITEM") && (
                <button
                  disabled={isMRLocked(req.id) || !allItemsMapped}
                  onClick={async () => {
                    try {
                      toast.loading("Saving changes...", { id: "save-mr" });
                      const allInStock = req.items.length > 0 && req.items.every(i => i.status === "In Stock");
                      await updateMaterialRequirement(req.id, {
                        ...req, status: allInStock ? "Approved by Store" : "Store Pending",
                      });
                      toast.success("Requirement saved successfully", { id: "save-mr" });
                      onClose();
                    } catch (e) { toast.error(e?.message || "Save failed", { id: "save-mr" }); }
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 text-white rounded-xl text-xs font-black transition-all tracking-wider shadow-lg shadow-primary/20 dark:shadow-none disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Save & close
                </button>
              )}
              {hasPermission("GET_QUOTATION_LINK") && (
                <div className="relative quotation-dropdown-container">
                  <button
                    disabled={!allItemsMapped || req.quotationLinkActive === false}
                    onClick={() => setShowQuotationDropdown(v => !v)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all tracking-wider disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer border",
                      showQuotationDropdown
                        ? "bg-primary text-white border-primary"
                        : "bg-primary/5 hover:bg-primary hover:text-white dark:bg-primary/10 dark:hover:bg-primary text-primary border-primary/20"
                    )}
                    title={req.quotationLinkActive === false ? "Link is deactivated by AGM" : ""}
                  >
                    <Link2 className="w-4 h-4" />
                    Get quotation link
                  </button>
                  {allItemsMapped && req.quotationLinkActive !== false && showQuotationDropdown && (
                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl p-2 block transition-all z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <p className="text-[10px] font-bold text-gray-400 px-3 py-1 tracking-wider">Select Category</p>
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}${window.location.pathname}#public-quotation?mrId=${req.id}`;
                          navigator.clipboard.writeText(url);
                          toast.success("All items link copied!");
                          setShowQuotationDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-[12px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <span>All Categories</span>
                        {(() => {
                          const count = quotations.filter(q => q.mrId === req.id).length;
                          return count > 0 ? (
                            <span className="text-[10px] font-black px-1.5 py-0.5 bg-primary/10 text-primary rounded-md">{count}</span>
                          ) : null;
                        })()}
                      </button>
                      {Array.from(new Set(req.items.map(i => i.category).filter(Boolean))).map(cat => {
                        const count = quotations.filter(q => q.mrId === req.id && q.category === cat).length;
                        return (
                          <button
                            key={cat}
                            onClick={() => {
                              const url = `${window.location.origin}${window.location.pathname}#public-quotation?mrId=${req.id}&category=${encodeURIComponent(String(cat))}`;
                              navigator.clipboard.writeText(url);
                              toast.success(`${cat} link copied!`);
                              setShowQuotationDropdown(false);
                            }}
                            className="w-full text-left px-3 py-2 text-[12px] font-semibold text-gray-700 dark:text-gray-300 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors cursor-pointer flex items-center justify-between"
                          >
                            <span>{cat}</span>
                            {count > 0 && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 bg-primary/10 text-primary rounded-md">{count}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {req.status === "Store Pending" && !isMRLocked(req.id) && (
                <button
                  disabled={!allItemsMapped}
                  onClick={handleRecheck}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 hover:bg-blue-600 hover:text-white dark:bg-blue-500/10 dark:hover:bg-blue-600 text-blue-500 dark:text-blue-400 rounded-xl text-xs font-black transition-all tracking-wider border border-blue-200/50 dark:border-blue-800/30 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${actionLoading ? "animate-spin" : ""}`} />
                  Recheck
                </button>
              )}
            </div>

            {/* Right: status actions + Cancel */}
            <div className="flex flex-wrap items-center gap-2">
              {(() => {
                const itemsWithStock = req.items.map(item => {
                  const inv = inventory.find(i => i.sku === item.sku);
                  const liveStock = inv?.liveStock || 0;
                  return { ...item, liveStock, isAvailable: liveStock >= item.qty };
                });
                const allInStock = itemsWithStock.every(i => i.isAvailable);
                const hasFinalQuotation = req.approvals?.length > 0 || req.approvedQuotationId || req.approvedSupplier;
                const someAllocated = req.items.some(i => (i.availableInStock || 0) > 0);
                const hasPurchaseItems = itemsWithStock.some(i => ["Needs Purchase", "Purchase Required", "Partial"].includes(i.status));
                const canApprove = allInStock || hasFinalQuotation || someAllocated || hasPurchaseItems;
                if (
                  ["Store Pending", "Allocated", "Partially Allocated"].includes(req.status) &&
                  (hasPermission("APPROVE_MR_STORE") || hasPermission("MANAGE_INVENTORY"))
                ) {
                  return (
                    <button
                      onClick={async () => {
                        if (!canApprove || !allItemsMapped) {
                          toast.error("Inventory check failed. Please ensure items are mapped and either in stock, linked, or marked for purchase.");
                          return;
                        }
                        try {
                          await updateMaterialRequirement(req.id, { ...req, status: "Approved by Store" });
                          toast.success("Requirement approved by Store.");
                          onClose();
                        } catch (e) { toast.error("Failed to approve: " + e.message); }
                      }}
                      disabled={!canApprove || !allItemsMapped}
                      title={!canApprove ? "Inventory unavailable: Please allocate stock, link inventory, or mark for purchase before approving." : "Approve by store"}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all tracking-wider border shrink-0 cursor-pointer ${canApprove && allItemsMapped ? "bg-emerald-500/10 hover:bg-emerald-600 hover:text-white dark:bg-emerald-500/10 dark:hover:bg-emerald-600 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 dark:border-emerald-800/40" : "bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 cursor-not-allowed"}`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve by store
                    </button>
                  );
                }
                return null;
              })()}
              {["Approved by Store", "Quotation Phase", "Approved by AGM"].includes(req.status) &&
                !isMRLocked(req.id) &&
                (hasPermission("REVISE_MR") || hasPermission("MANAGE_INVENTORY")) && (
                <button
                  onClick={() => setRevisingId(req.id)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500 hover:text-white dark:bg-amber-500/10 dark:hover:bg-amber-500 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-black transition-all tracking-wider border border-amber-400/25 dark:border-amber-500/30 shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  Revise
                </button>
              )}
              {req.status !== "Rejected" && hasPermission("REJECT_MR") && (
                <Btn
                  label="Reject Requirement"
                  color="red"
                  outline
                  onClick={() => setRejectingId(req.id)}
                  loading={actionLoading}
                  disabled={!allItemsMapped}
                  className="rounded-xl bg-rose-500/10 hover:bg-rose-600 hover:text-white text-red-500 dark:text-rose-400 border border-rose-500/25 dark:border-rose-500/30 transition-all duration-200 font-black tracking-wider text-xs px-4 py-2.5 cursor-pointer shrink-0"
                />
              )}
              <Btn label="Cancel" outline onClick={onClose} className="rounded-xl font-black text-xs px-5 py-2.5 cursor-pointer shrink-0" />
            </div>
          </div>
        }
      >
        {/* Lock banner */}
        {isMRLocked(req.id) && (
          <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 dark:border-amber-500/30 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-[13px] font-bold text-amber-900 dark:text-amber-400">Locked for Editing</p>
              <p className="text-[11px] text-amber-700 dark:text-amber-500">This requirement has an associated Purchase Order and cannot be modified.</p>
            </div>
          </div>
        )}
        {/* Not mapped banner */}
        {!allItemsMapped && (
          <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold text-red-500">Inventory Mapping Required</p>
              <p className="text-[11px] text-red-500/80 mt-0.5">Some items are not linked to inventory stock SKU. All action buttons are disabled until you map each item.</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50/25 dark:bg-[#0F172A]/40 border border-gray-150/60 dark:border-gray-800/80 rounded-2xl">
            {[
              { icon: User, label: "Requester", value: safeStr(req.requesterName || req.requester || req.createdBy) || "N/A" },
              { icon: Calendar, label: "Request Date", value: formatDateTime(req.date) },
              { icon: Calendar, label: "Required Date", value: formatDate(req.requirementDate || req.requiredDate || "") },
              { icon: Building, label: "Project", value: safeStr(req.project || req.projectName) || "N/A" },
              { icon: MapPin, label: "Location", value: safeStr(req.location || req.site || req.address) || "N/A" },
              { icon: Activity, label: "Work Type", value: safeStr(req.workType) || "N/A" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none">{label}</p>
                  <p className="text-[13px] font-black text-gray-800 dark:text-white truncate mt-1">{value}</p>
                </div>
              </div>
            ))}

            {/* Quotation link card */}
            <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <Link2 className="w-5 h-5" />
              </div>
              <div className="overflow-hidden flex-1 flex flex-col justify-center">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none mb-1">Quotation Link</p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-0.5 rounded-full border leading-none",
                    req.quotationLinkActive !== false
                      ? "bg-green-50/80 dark:bg-green-950/20 text-green-600 dark:text-green-400 border-green-200/50 dark:border-green-800/30"
                      : "bg-red-50/80 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200/50 dark:border-red-800/30"
                  )}>
                    {req.quotationLinkActive !== false ? "Active" : "Deactivated"}
                  </span>
                  {hasPermission("TOGGLE_QUOTATION_LINK") && (
                    <button
                      onClick={async () => {
                        try {
                          const nextState = req.quotationLinkActive === false;
                          await updateMaterialRequirement(req.id, { quotationLinkActive: nextState });
                          setReq(r => ({ ...r, quotationLinkActive: nextState }));
                          toast.success(`Quotation link ${nextState ? "activated" : "deactivated"} successfully`);
                        } catch (err) { toast.error(err.message || "Failed to update link status"); }
                      }}
                      className="text-[9px] font-extrabold text-[#F97316] hover:text-[#ea580c] hover:underline transition-all tracking-wider shrink-0 cursor-pointer"
                    >
                      {req.quotationLinkActive !== false ? "Deactivate" : "Activate"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Status card */}
            <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
              <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none">Status</p>
                <div className="mt-1"><StatusBadge status={req.status} /></div>
              </div>
            </div>
          </div>

          {/* Approved quotations */}
          {req.approvals?.length ? (
            <div className="mt-4 p-4 bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded-2xl">
              <h5 className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 tracking-widest mb-3">Approved Supplier Quotations</h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {req.approvals.map((app, idx) => (
                  <div key={idx} className="bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-850/40 p-3 rounded-xl shadow-xs flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest leading-none mb-1">{app.category || "All Items"}</p>
                      <p className="text-xs font-black text-gray-800 dark:text-white truncate">{app.supplierName}</p>
                      <p className="text-[9px] text-gray-400 font-mono mt-0.5">{app.quotationId}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (req.approvedSupplier || req.approvedQuotationId) ? (
            <div className="mt-4 p-4 bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-100/50 dark:border-emerald-900/30 rounded-2xl flex flex-wrap gap-6">
              {req.approvedSupplier && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest leading-none mb-1">Approved Supplier</p>
                    <p className="text-xs font-black text-gray-800 dark:text-white">{safeStr(req.approvedSupplier)}</p>
                  </div>
                </div>
              )}
              {req.approvedQuotationId && (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 tracking-widest leading-none mb-1">Approved Quotation ID</p>
                    <p className="text-xs font-black text-gray-800 dark:text-white font-mono">{safeStr(req.approvedQuotationId)}</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Items table */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-bold text-gray-500 tracking-wider px-2">Requested items</h4>

            {/* Desktop table */}
            <div className="hidden md:block border border-gray-150/60 dark:border-gray-800/80 rounded-2xl overflow-x-auto shadow-xs bg-gray-50/25 dark:bg-[#0F172A]/40 min-h-[360px] pb-28">
              <table className="w-full min-w-max text-left border-collapse table-auto">
                <thead className="bg-gray-50/10 dark:bg-[#0F172A]/40 backdrop-blur-md">
                  <tr>
                    {["Material name", "Category", "Condition", "Qty", "In stock", "Allocate", "Purchase", "Status", "Actions"].map(h => (
                      <th key={h} className="px-4 py-3.5 text-[10px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap border-b border-gray-100 dark:border-gray-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/80 bg-transparent">
                  {req.items.map((item, idx) => (
                    <tr key={idx} className={cn("transition-all duration-200", isItemPOCreated(item) && "bg-emerald-50/40 dark:bg-emerald-950/15")}>
                      {/* Material name + link */}
                      <td className="px-4 py-4 align-top">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 mt-1 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center border border-orange-100/50 dark:border-orange-900/10 shrink-0">
                            <Package className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div className="flex-1">
                            <input
                              disabled={isMRLocked(req.id)}
                              className="text-[13px] font-bold text-gray-900 dark:text-white block bg-white/40 dark:bg-[#0F172A]/30 border border-gray-200/50 dark:border-gray-800/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 h-[40px] w-full outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-inner"
                              value={item.materialName}
                              onChange={e => {
                                const items = [...req.items];
                                items[idx].materialName = e.target.value;
                                setReq({ ...req, items });
                              }}
                              placeholder="Edit material name..."
                            />
                            <div className="flex items-center gap-2 mt-2">
                              {item.sku && item.sku !== "N/A" ? (
                                <div className="flex items-center gap-1 px-2.5 py-0.5 bg-green-50/80 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded-lg border border-green-200/50 dark:border-green-800/30 shadow-xs shrink-0">
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span className="text-[10px] font-black tracking-tight">{safeStr(item.sku)}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 px-2.5 py-0.5 bg-red-50/80 dark:bg-red-950/20 text-red-500 dark:text-red-400 rounded-lg border border-red-200/50 dark:border-red-800/30 shadow-xs shrink-0">
                                  <span className="text-[9px] font-extrabold tracking-widest italic">Not Linked</span>
                                </div>
                              )}
                              {isItemPOCreated(item) && (
                                <div className="flex items-center gap-1 px-2.5 py-0.5 bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200/50 dark:border-emerald-800/40 shadow-xs shrink-0">
                                  <CheckCircle className="w-3 h-3 shrink-0" />
                                  <span className="text-[9px] font-black tracking-widest">PO Created</span>
                                </div>
                              )}
                              <button
                                disabled={isMRLocked(req.id)}
                                onClick={() => { setLinkSearch(item.materialName); setLinkingIdx(idx); }}
                                className="text-[9px] text-primary hover:text-white bg-primary/10 hover:bg-primary border border-primary/25 rounded-lg px-2.5 py-1 font-bold flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer"
                              >
                                <Link2 className="w-3 h-3" />
                                Manual Link
                              </button>
                              <button
                                disabled={isMRLocked(req.id)}
                                onClick={() => {
                                  const searchTerm = item.materialName.toLowerCase().trim();
                                  const match = inventory.find(i =>
                                    i.itemName.toLowerCase().trim() === searchTerm ||
                                    i.sku.toLowerCase().trim() === searchTerm ||
                                    (i.itemName.toLowerCase().includes(searchTerm) && searchTerm.length > 3)
                                  );
                                  if (match) {
                                    const items = [...req.items];
                                    const available = match.liveStock || 0;
                                    const requested = items[idx].qty || 0;
                                    const status = available >= requested ? "In Stock" : available > 0 ? "Partial" : "Needs Purchase";
                                    items[idx] = {
                                      ...items[idx], sku: match.sku, materialName: match.itemName,
                                      category: match.category || items[idx].category, unit: match.unit,
                                      availableInStock: available, remainingQty: Math.max(0, requested - available), status,
                                    };
                                    setReq({ ...req, items });
                                    toast.success(`Auto-linked to ${match.sku}`);
                                  } else { toast.error("No exact match. Use manual link."); }
                                }}
                                className="text-[9px] text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-primary bg-white/40 dark:bg-[#0F172A]/30 border border-gray-200/50 dark:border-gray-800/80 hover:border-primary/25 rounded-lg px-2.5 py-1 font-bold flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xs shrink-0 cursor-pointer"
                              >
                                Auto Match
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>
                      {/* Category */}
                      <td className="px-2 py-4 align-top text-center">
                        <SField
                          disabled={isMRLocked(req.id)}
                          options={categoryOptions.map(cat => ({ value: cat, label: cat }))}
                          value={item.category || ""}
                          onChange={e => { const items = [...req.items]; items[idx].category = e.target.value; setReq({ ...req, items }); }}
                          placeholder="Select Category"
                          className="min-w-[130px] w-full mb-0"
                        />
                      </td>
                      {/* Condition */}
                      <td className="px-2 py-4 align-top text-center">
                        <SField
                          disabled={isMRLocked(req.id)}
                          options={["New", "Old"]}
                          value={item.condition || "New"}
                          onChange={e => { const items = [...req.items]; items[idx].condition = e.target.value; setReq({ ...req, items }); }}
                          className="w-full mb-0"
                        />
                      </td>
                      {/* Qty + Unit */}
                      <td className="px-2 py-4 align-top">
                        <div className="flex flex-col gap-1.5 w-full max-w-[100px] mx-auto">
                          <input
                            disabled={isMRLocked(req.id)}
                            type="number"
                            className="text-[13px] font-bold text-center bg-white/40 dark:bg-[#0F172A]/30 border border-gray-200/50 dark:border-gray-800/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 h-[40px] outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-inner w-full"
                            value={item.qty}
                            min={1}
                            onChange={e => {
                              const items = [...req.items];
                              const qty = Math.max(1, Number(e.target.value));
                              const inv = inventory.find(i => i.sku === item.sku);
                              let status = item.status, availableInStock = item.availableInStock || 0;
                              if (inv) {
                                const avail = inv.liveStock || 0;
                                status = avail >= qty ? "In Stock" : avail > 0 ? "Partial" : "Needs Purchase";
                                availableInStock = Math.min(qty, avail);
                              }
                              items[idx] = { ...items[idx], qty, status, availableInStock, remainingQty: Math.max(0, qty - availableInStock) };
                              setReq({ ...req, items });
                            }}
                          />
                          <SField
                            disabled={isMRLocked(req.id)}
                            options={UNITS.map(u => ({ value: u, label: u }))}
                            value={item.unit || ""}
                            onChange={e => { const items = [...req.items]; items[idx].unit = e.target.value; setReq({ ...req, items }); }}
                            placeholder="Unit"
                            className="w-full mb-0"
                          />
                        </div>
                      </td>
                      {/* In stock */}
                      <td className="px-2 py-4 align-top text-center">
                        <div className="inline-flex items-center px-3 py-1 bg-blue-500/5 text-blue-500 dark:text-blue-400 rounded-xl border border-blue-500/20 dark:border-blue-500/30 shadow-xs font-bold text-xs h-9 min-w-[50px] justify-center">
                          {(inventory.find(i => i.sku === item.sku)?.liveStock) || 0}
                        </div>
                      </td>
                      {/* Allocate */}
                      <td className="px-2 py-4 align-top text-center">
                        {hasPermission("ALLOCATE_MR") && !isMRLocked(req.id) ? (
                          <input
                            type="number"
                            className="w-20 text-center text-[13px] font-bold bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl px-3 py-1.5 shadow-inner text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all h-9"
                            value={item.availableInStock || 0}
                            min={0}
                            max={item.qty}
                            onChange={e => {
                              const items = [...req.items];
                              const val = Math.max(0, Math.min(Number(e.target.value), item.qty || 0));
                              const status = val >= item.qty ? "In Stock" : val > 0 ? "Partial" : "Needs Purchase";
                              items[idx] = { ...items[idx], availableInStock: val, remainingQty: Math.max(0, (item.qty || 0) - val), status };
                              setReq({ ...req, items });
                            }}
                          />
                        ) : (
                          <div className="inline-flex items-center px-3 py-1 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30 shadow-xs font-bold text-xs h-9 min-w-[50px] justify-center">
                            {item.availableInStock || 0}
                          </div>
                        )}
                      </td>
                      {/* Purchase */}
                      <td className="px-2 py-4 align-top text-center">
                        {hasPermission("EDIT_MR_PURCHASE") && !isMRLocked(req.id) ? (
                          <input
                            type="number"
                            className="w-20 text-center text-[13px] font-bold bg-rose-500/5 border border-rose-500/20 dark:border-rose-500/30 rounded-xl px-3 py-1.5 shadow-inner text-red-500 dark:text-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all h-9"
                            value={item.remainingQty || 0}
                            min={0}
                            max={item.qty}
                            onChange={e => {
                              const items = [...req.items];
                              const val = Math.max(0, Math.min(Number(e.target.value), item.qty || 0));
                              const allocated = Math.max(0, (item.qty || 0) - val);
                              const status = allocated >= item.qty ? "In Stock" : allocated > 0 ? "Partial" : "Needs Purchase";
                              items[idx] = { ...items[idx], remainingQty: val, availableInStock: allocated, status };
                              setReq({ ...req, items });
                            }}
                          />
                        ) : (
                          <div className="inline-flex items-center px-3 py-1 bg-rose-500/5 text-red-500 dark:text-rose-400 rounded-xl border border-rose-500/20 dark:border-rose-500/30 shadow-xs font-bold text-xs h-9 min-w-[50px] justify-center">
                            {item.remainingQty || 0}
                          </div>
                        )}
                      </td>
                      {/* Status */}
                      <td className="px-2 py-4 align-top text-center">
                        <StatusBadge status={item.status || "Check Required"} />
                      </td>
                      {/* Save action */}
                      <td className="px-2 py-4 align-top text-center">
                        {hasPermission("SAVE_MR_ITEM") && (
                          <button
                            disabled={isMRLocked(req.id)}
                            onClick={async () => {
                              try {
                                const items = [...req.items];
                                items.forEach(it => {
                                  const inv = inventory.find(i => i.sku === it.sku);
                                  const live = inv?.liveStock || 0;
                                  if (!hasPermission("ALLOCATE_MR")) it.availableInStock = Math.min(it.qty || 0, live);
                                  if (!hasPermission("EDIT_MR_PURCHASE")) it.remainingQty = Math.max(0, (it.qty || 0) - (it.availableInStock || 0));
                                  const alloc = it.availableInStock || 0;
                                  it.status = alloc >= it.qty ? "In Stock" : alloc > 0 ? "Partial" : "Needs Purchase";
                                });
                                const allInStock = items.length > 0 && items.every(i => i.status === "In Stock");
                                await updateMaterialRequirement(req.id, { ...req, items, status: allInStock ? "Approved by Store" : "Store Pending" });
                                toast.success("Requirement updated & saved");
                              } catch (e) { toast.error(e?.message || "Update failed"); }
                            }}
                            className="p-2.5 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-500/20 dark:border-emerald-500/30 transition-all flex items-center justify-center gap-1 shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
                            title={isMRLocked(req.id) ? "Locked: Purchase Order exists" : "Save changes to this item"}
                          >
                            <Check className="w-4 h-4 shrink-0" />
                            <span className="text-[10px] font-bold">Save</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {req.items.map((item, idx) => (
                <Card key={idx} className={cn("p-4 space-y-3 shadow-sm", isItemPOCreated(item) ? "bg-emerald-50/30 dark:bg-emerald-950/10 border border-emerald-200/60 dark:border-emerald-800/40" : "bg-gray-50/25 dark:bg-[#0F172A]/40 border border-gray-150/60 dark:border-gray-800/80")}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1 mr-2">
                      <input
                        className="text-sm font-bold text-gray-900 dark:text-white block bg-white/40 dark:bg-[#0F172A]/30 border border-gray-200/50 dark:border-gray-800/80 focus:ring-1 focus:ring-primary rounded px-2 py-1 w-full"
                        value={item.materialName}
                        onChange={e => { const items = [...req.items]; items[idx].materialName = e.target.value; setReq({ ...req, items }); }}
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => { setLinkSearch(item.materialName); setLinkingIdx(idx); }}
                          className="text-[10px] text-primary hover:bg-primary/5 px-2 py-1 rounded border border-primary/20 font-bold flex items-center gap-1 transition-colors"
                        >
                          <Link2 className="w-3 h-3" />
                          {item.sku && item.sku !== "N/A" ? item.sku : "Link To Inventory"}
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <StatusBadge status={item.status} />
                      {isItemPOCreated(item) && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                          <CheckCircle className="w-3 h-3 shrink-0" />
                          <span className="text-[9px] font-black tracking-widest">PO Created</span>
                        </div>
                      )}
                      <button
                        onClick={() => { const items = [...req.items]; items.splice(idx, 1); setReq({ ...req, items }); }}
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
                          onChange={e => { const items = [...req.items]; items[idx].qty = Math.max(1, Number(e.target.value)); setReq({ ...req, items }); }}
                        />
                        <SField
                          options={UNITS.map(u => ({ value: u, label: u }))}
                          value={item.unit || ""}
                          onChange={e => { const items = [...req.items]; items[idx].unit = e.target.value; setReq({ ...req, items }); }}
                          placeholder="Unit"
                          className="w-full mb-0"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <span className="text-[9px] font-bold text-gray-400 tracking-widest leading-none block">Inv Stock</span>
                        <span className="text-xs font-bold text-blue-500 block mt-1 bg-blue-500/5 border border-blue-500/20 dark:border-blue-500/30 rounded py-0.5">
                          {(inventory.find(i => i.sku === item.sku)?.liveStock) || 0}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] font-bold text-gray-400 tracking-widest leading-none block">Allocate</span>
                        {hasPermission("ALLOCATE_MR") && !isMRLocked(req.id) ? (
                          <input
                            type="number"
                            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded px-1.5 py-0.5 w-full mt-1 outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                            value={item.availableInStock || 0}
                            max={item.qty}
                            min={0}
                            onChange={e => {
                              const items = [...req.items];
                              const val = Math.max(0, Math.min(Number(e.target.value), item.qty || 0));
                              const status = val >= item.qty ? "In Stock" : val > 0 ? "Partial" : "Needs Purchase";
                              items[idx] = { ...items[idx], availableInStock: val, remainingQty: Math.max(0, (item.qty || 0) - val), status };
                              setReq({ ...req, items });
                            }}
                          />
                        ) : (
                          <span className="text-xs font-bold text-emerald-500 block mt-1 bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded py-0.5">
                            {item.availableInStock || 0}
                          </span>
                        )}
                      </div>
                      <div className="text-center">
                        <span className="text-[9px] font-bold text-gray-400 tracking-widest leading-none block">Purchase</span>
                        {hasPermission("EDIT_MR_PURCHASE") && !isMRLocked(req.id) ? (
                          <input
                            type="number"
                            className="text-xs font-bold text-red-500 dark:text-rose-400 bg-rose-500/5 border border-rose-500/20 dark:border-rose-500/30 rounded px-1.5 py-0.5 w-full mt-1 outline-none focus:ring-1 focus:ring-rose-500 text-center"
                            value={item.remainingQty || 0}
                            max={item.qty}
                            min={0}
                            onChange={e => {
                              const items = [...req.items];
                              const val = Math.max(0, Math.min(Number(e.target.value), item.qty || 0));
                              const allocated = Math.max(0, (item.qty || 0) - val);
                              const status = allocated >= item.qty ? "In Stock" : allocated > 0 ? "Partial" : "Needs Purchase";
                              items[idx] = { ...items[idx], remainingQty: val, availableInStock: allocated, status };
                              setReq({ ...req, items });
                            }}
                          />
                        ) : (
                          <span className="text-xs font-bold text-primary block mt-1 bg-red-500/5 border border-red-500/20 dark:border-red-500/30 rounded py-0.5">
                            {item.remainingQty || 0}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {hasPermission("SAVE_MR_ITEM") && (
                    <button
                      onClick={async () => {
                        try {
                          const items = [...req.items];
                          items.forEach(it => {
                            const inv = inventory.find(i => i.sku === it.sku);
                            const live = inv?.liveStock || 0;
                            if (!hasPermission("ALLOCATE_MR")) it.availableInStock = Math.min(it.qty || 0, live);
                            if (!hasPermission("EDIT_MR_PURCHASE")) it.remainingQty = Math.max(0, (it.qty || 0) - (it.availableInStock || 0));
                            const alloc = it.availableInStock || 0;
                            it.status = alloc >= it.qty ? "In Stock" : alloc > 0 ? "Partial" : "Needs Purchase";
                          });
                          const allInStock = items.length > 0 && items.every(i => i.status === "In Stock");
                          await updateMaterialRequirement(req.id, { ...req, items, status: allInStock ? "Approved by Store" : "Store Pending" });
                          toast.success("Saved");
                        } catch (e) { toast.error("Failed"); }
                      }}
                      className="w-full py-2 bg-emerald-500/10 hover:bg-emerald-600 hover:text-white text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-emerald-500/20 dark:border-emerald-500/30"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save item changes
                    </button>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Link to inventory modal */}
      {linkingIdx !== null && (
        <Modal title="Link to Inventory Item" onClose={() => setLinkingIdx(null)}>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                placeholder="Search inventory by Name, SKU, or Category..."
                value={linkSearch}
                onChange={e => setLinkSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-900 dark:text-white rounded-xl text-[14px] focus:ring-2 focus:ring-primary/20 transition-all font-medium"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {searchingLink ? (
                <div className="text-center py-12">
                  <RefreshCw className="w-8 h-8 text-primary/20 animate-spin mx-auto mb-2" />
                  <p className="text-[13px] text-gray-400 font-medium">Searching inventory...</p>
                </div>
              ) : linkResults.length > 0 ? (
                linkResults.map((invItem, i) => (
                  <button
                    key={`${invItem.sku || ""}-${invItem._id || i}`}
                    onClick={() => {
                      const items = [...req.items];
                      const available = invItem.liveStock || 0;
                      const requested = items[linkingIdx].qty || 0;
                      const status = available >= requested ? "In Stock" : available > 0 ? "Partial" : "Needs Purchase";
                      items[linkingIdx] = {
                        ...items[linkingIdx],
                        sku: invItem.sku,
                        materialName: invItem.itemName,
                        unit: invItem.unit,
                        availableInStock: available,
                        remainingQty: Math.max(0, requested - available),
                        status,
                      };
                      setReq({ ...req, items });
                      setLinkingIdx(null);
                      toast.success(`Linked to ${invItem.itemName}`);
                    }}
                    className="w-full text-left p-3 hover:bg-primary/5 dark:hover:bg-primary/10 rounded-xl transition-all border border-transparent hover:border-primary/20 group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-[13px] font-bold text-gray-900 dark:text-white group-hover:text-primary transition-colors">{invItem.itemName}</p>
                        <p className="text-[11px] text-gray-500 font-mono tracking-tighter">{invItem.sku} • {invItem.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[12px] font-black text-green-600 dark:text-green-400">{invItem.liveStock} {invItem.unit}</p>
                        <p className="text-[9px] text-gray-400 font-bold tracking-widest">Available</p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-12">
                  <Package className="w-10 h-10 text-gray-200 dark:text-gray-800 mx-auto mb-3" />
                  <p className="text-[14px] text-gray-500 dark:text-gray-400 font-medium">
                    {linkSearch ? "No matching items found in inventory." : "Start typing to search inventory..."}
                  </p>
                  {linkSearch && <p className="text-[11px] text-gray-400 mt-1 italic">Try searching by SKU or a different keyword.</p>}
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Revise confirmation */}
      {revisingId && (
        <ConfirmModal
          title="Revise Requirement"
          message={`This will send ${revisingId} back to Store Pending so items can be edited or updated. Continue?`}
          onConfirm={async () => {
            try {
              const updated = await updateMaterialRequirement(revisingId, { status: "Store Pending" });
              toast.success("MR sent back for revision.");
              setRevisingId(null);
              setReq(updated);
              onRequirementUpdate?.(updated);
            } catch (e) { toast.error("Failed to revise: " + e.message); }
          }}
          onCancel={() => setRevisingId(null)}
          loading={actionLoading}
          confirmLabel="Send for Revision"
          confirmColor="amber"
        />
      )}

      {/* Reject confirmation */}
      {rejectingId && (
        <ConfirmModal
          title="Reject Requirement"
          message={`Are you sure you want to reject requirement ${rejectingId}?`}
          onConfirm={async () => {
            try {
              await updateMaterialRequirement(rejectingId, { status: "Rejected" });
              toast.success("Requirement rejected");
              setRejectingId(null);
              onClose();
            } catch (e) { toast.error("Failed to reject: " + e.message); }
          }}
          onCancel={() => setRejectingId(null)}
          loading={actionLoading}
          confirmLabel="Reject"
          confirmColor="red"
        />
      )}
    </>
  );
}
