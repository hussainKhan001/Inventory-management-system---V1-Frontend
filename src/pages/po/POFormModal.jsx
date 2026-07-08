import React, { useState, useEffect, useMemo } from "react";
import { Search, X, Plus, Link2, AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import { Btn, Field, SField } from "../../components/ui";
import { DatePicker } from "../../components/ui/DatePicker";
import { useAppStore } from "../../store";
import { api } from "../../services/api";
import { fmtCur, safeStr, todayStr } from "../../utils";
import { cn } from "../../lib/utils";
import toast from "react-hot-toast";
import {
  calcChargeTotal, normalizeTimelineGST, normalizeTimelineType, formatPrettyDate,
} from "./poUtils";

const CONDITION_OPTIONS = ["New", "Good", "Needs Repair", "Damaged", "Old"];
const GST_PCT_OPTIONS = [0, 5, 12, 18, 28];
const GST_TYPE_OPTIONS = ["Exclusive", "Inclusive"];
const VENDOR_COLORS = ["text-orange-600", "text-blue-500", "text-emerald-600"];

// Always recalculate from qty × rate so stale/corrupted stored totalWithGST never displays.
function calcItemTotal(item) {
  const qty = Number(item.qty) || 0;
  const rate = Number(item.rate) || 0;
  const gstPct = Number(item.gstPct) || 0;
  const isInclusive = (item.gstType || "Exclusive") === "Inclusive";
  return isInclusive ? qty * rate : qty * rate * (1 + gstPct / 100);
}

// Shared class for all inline table inputs/selects — solid bg so text is always visible
const CELL_INPUT = "w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-[13px] bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20";

function isPOLocked(po) {
  return !!(po?.paymentTimelines?.some((pt) => (pt.paid || 0) > 0) || po?.accountStatus === "Processed");
}

function ChargeBlock({ label, amountKey, gstPctKey, gstTypeKey, po, onChange, gstOptions = GST_PCT_OPTIONS }) {
  return (
    <div className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 space-y-3">
      <Field
        label={`${label} (₹)`}
        type="number"
        value={po[amountKey] ?? ""}
        onChange={(e) => onChange({ [amountKey]: Number(e.target.value) || 0 })}
        placeholder="0"
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">GST %</label>
          <select value={po[gstPctKey] ?? 18} onChange={(e) => onChange({ [gstPctKey]: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-900 dark:text-white">
            {gstOptions.map((v) => <option key={v} value={v}>{v}%</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">GST Type</label>
          <select value={po[gstTypeKey] || "Exclusive"} onChange={(e) => onChange({ [gstTypeKey]: e.target.value })}
            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] text-gray-900 dark:text-white">
            {GST_TYPE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

export function POFormModal({
  po, isEditing, errors, autoLinking,
  onClose, onSubmit, onChange, onMrChange,
  addItem, updateItem, removeItem, linkToInventory, quickAddToInventory,
  companyOptions, mrOptions, vendorOptions, COMPANIES, CATEGORIES, UNITS,
}) {
  const { suppliers, actionLoading, fetchResource, gstRates } = useAppStore();
  const gstOptions = gstRates.length ? gstRates.map((r) => r.rate) : [0, 5, 12, 18, 28];

  // Silently force-refresh inventory when form opens, bypassing the 10-second store cache.
  // Needed because PurchaseOrders' initial fetch may have been skipped or stale.
  useEffect(() => {
    fetchResource("inventory", 1, 1000, true, "", null, false, false, "", "", true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [searchItem, setSearchItem] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [linkingIndex, setLinkingIndex] = useState(null);
  const [linkingSearch, setLinkingSearch] = useState("");
  const [linkingResults, setLinkingResults] = useState([]);
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(null);
  const [quickAddData, setQuickAddData] = useState({ category: "", unit: "" });

  // Live search for top "Search inventory to add items..." bar
  useEffect(() => {
    if (!searchItem.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get("inventory", { search: searchItem.trim(), limit: 20 });
        setSearchResults(res?.data || []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchItem]);

  // Live search for "Link inventory item" popup
  useEffect(() => {
    if (linkingIndex === null) { setLinkingResults([]); return; }
    setLinkingLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get("inventory", { search: linkingSearch.trim(), limit: 20 });
        setLinkingResults(res?.data || []);
      } catch { setLinkingResults([]); }
      finally { setLinkingLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [linkingSearch, linkingIndex]);

  const set = (partial) => onChange({ ...po, ...partial });

  // When editing, stored mrId is plain ("MR-001") but option values are pipe-separated ("MR-001|Civil|Q-012").
  // Find the matching option value so the SField can display correctly.
  const mrFieldValue = useMemo(() => {
    if (!po.mrId) return "";
    if (po.mrId.includes("|")) return po.mrId;
    const match = mrOptions.find((opt) => opt.value.startsWith(po.mrId + "|"));
    return match ? match.value : po.mrId;
  }, [po.mrId, mrOptions]);

  const grandTotal =
    (po.items?.reduce((s, it) => s + calcItemTotal(it), 0) || 0) +
    calcChargeTotal(po.freightAmount || 0, po.freightGstPct || 0, po.freightGstType || "Exclusive") +
    calcChargeTotal(po.loadingAmount || 0, po.loadingGstPct || 0, po.loadingGstType || "Exclusive") +
    calcChargeTotal(po.unloadingAmount || 0, po.unloadingGstPct || 0, po.unloadingGstType || "Exclusive");



  const updateTimeline = (idx, partial) => {
    const pts = [...(po.paymentTimelines || [])];
    pts[idx] = { ...pts[idx], ...partial };
    set({ paymentTimelines: pts });
  };

  return (
    <div className="-m-4 sm:-m-6 flex flex-col">
      {/* ── Sticky page header ─────────────────────────────────────── */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 sm:px-6 py-3 bg-white dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <button
          type="button"
          onClick={onClose}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 dark:text-white leading-tight">
            {isEditing ? "Edit Purchase Order" : "Create Purchase Order"}
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {isEditing ? "Update PO details and save changes" : "Fill in all details to raise a new PO"}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Btn label="Cancel" outline onClick={onClose} />
          <Btn label={isEditing ? "Update PO" : "Create PO"} onClick={onSubmit} loading={actionLoading} />
        </div>
      </div>

      {/* ── Form content ───────────────────────────────────────────── */}
      <div className="flex-1 px-4 sm:px-6 py-6 pb-24 sm:pb-8">
        {isEditing && isPOLocked(po) && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-[13px] font-bold text-amber-900 dark:text-amber-400">Warning: Active Payments</p>
            <p className="text-[11px] text-amber-700 dark:text-amber-500">This PO has processed payments. Modifications will reset approval status and require re-approval.</p>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Company + Vendor header grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-gray-200 dark:border-gray-800 rounded-xl overflow-visible shadow-sm">
          {/* Left: Company */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800 lg:border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-t-xl lg:rounded-tr-none lg:rounded-l-xl">
            <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2 font-bold text-[10px] text-gray-500 flex items-center gap-2">
              <div className="w-1 h-3 bg-[#1A365D] rounded-full" /> Company details
            </div>
            {[
              { label: "Company Name", content: (
                <SField className="mb-0 border-none px-0 shadow-none ring-0 focus-within:ring-0"
                  value={po.companyName}
                  onChange={(e) => {
                    const c = COMPANIES?.find((c) => c.name === e.target.value);
                    if (c) set({ companyName: c.name, companyGst: c.gstin, companyAddress: c.address });
                  }}
                  options={companyOptions} />
              )},
              { label: "Company GSTIN", content: (
                <input className="w-full bg-transparent outline-none text-[12px] font-mono text-gray-600 dark:text-gray-400 px-0"
                  value={po.companyGst || ""} onChange={(e) => set({ companyGst: e.target.value })} placeholder="Enter GSTIN" />
              )},
              { label: "Company Address", content: (
                <textarea className="w-full bg-transparent outline-none text-[12px] text-gray-600 dark:text-gray-400 px-0 resize-none min-h-[60px]"
                  value={po.companyAddress || ""} onChange={(e) => set({ companyAddress: e.target.value })} />
              )},
              { label: "Internal MR No.", content: (
                <SField className="mb-0 border-none px-0 shadow-none ring-0 focus-within:ring-0"
                  value={mrFieldValue}
                  onChange={(e) => onMrChange ? onMrChange(e.target.value) : set({ mrId: e.target.value })}
                  options={mrOptions}
                  placeholder={autoLinking ? "Loading..." : "Select..."}
                  error={errors.mrId}
                  disabled={autoLinking}
                />
              )},
              { label: "Site/Location", content: (
                <input className="w-full bg-transparent outline-none text-[13px] font-bold text-gray-700 dark:text-gray-300"
                  value={po.location || ""} onChange={(e) => set({ location: e.target.value })} placeholder="Enter Site/Location" />
              )},
              { label: "Date of Issue", content: (
                <span className="text-[13px] font-bold text-orange-600 dark:text-orange-400">{formatPrettyDate(po.date)}</span>
              )},
            ].map(({ label, content }) => (
              <div key={label} className="grid grid-cols-12 items-center min-h-[48px]">
                <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">{label}</div>
                <div className="col-span-8 px-3 py-1">{content}</div>
              </div>
            ))}
          </div>

          {/* Right: Vendor */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900 rounded-b-xl lg:rounded-bl-none lg:rounded-r-xl">
            <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2 font-bold text-[10px] text-gray-500 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2"><div className="w-1 h-3 bg-orange-500 rounded-full" /> Vendor details</div>
              <button
                onClick={() => {
                  if (!po.supplier) { toast.error("Please select a vendor first"); return; }
                  const s = suppliers.find((su) => su.id === po.supplier || su._id === po.supplier);
                  if (s) {
                    set({
                      panNo: s.panNumber || "NA", gstNo: s.gstNumber || s.gst || "NA",
                      vendorContact: s.mobile || "NA", vendorEmail: s.email || "NA", vendorAddress: s.address || "NA",
                      vendorBankDetails: {
                        accountHolder: s.accountHolderName || s.ownerName || "NA",
                        bankName: s.bankName || "NA", accountNo: s.accountNumber || "NA",
                        branchIFSC: `${s.branch || ""}, ${s.ifscCode || ""}`.replace(/^,\s*/, "").replace(/,\s*$/, "") || "NA",
                      },
                    });
                    toast.success("Vendor details refreshed from master");
                  } else { toast.error("Vendor not found"); }
                }}
                className="text-[9px] text-blue-500 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded"
              >
                <RefreshCw className="w-2.5 h-2.5" /> Refresh from Master
              </button>
            </div>
            {[
              { label: "Vendor Name", content: (
                <SField className="mb-0 border-none px-0 shadow-none ring-0 focus-within:ring-0"
                  value={po.supplier}
                  onChange={(e) => {
                    const s = suppliers.find((su) => su.id === e.target.value || su._id === e.target.value);
                    if (s) {
                      set({ supplier: e.target.value, panNo: s.panNumber || "NA", gstNo: s.gstNumber || "NA",
                        vendorContact: s.mobile || "NA", vendorEmail: s.email || "NA", vendorAddress: s.address || "NA",
                        vendorBankDetails: {
                          accountHolder: s.accountHolderName || "NA", bankName: s.bankName || "NA",
                          accountNo: s.accountNumber || "NA",
                          branchIFSC: `${s.branch || ""}, ${s.ifscCode || ""}`.replace(/^,\s*/, "").replace(/,\s*$/, "") || "NA",
                        },
                      });
                    } else { set({ supplier: e.target.value }); }
                  }}
                  options={vendorOptions} />
              )},
              { label: "GST No.", content: (
                <input className="w-full bg-transparent outline-none text-[13px] font-bold text-gray-700 dark:text-gray-300"
                  value={po.gstNo || ""} onChange={(e) => set({ gstNo: e.target.value })} placeholder="Enter GSTIN" />
              )},
              { label: "Vendor Address", content: (
                <textarea className="w-full bg-transparent outline-none text-[12px] font-medium text-gray-600 dark:text-gray-400 leading-tight resize-none h-12"
                  value={po.vendorAddress || ""} onChange={(e) => set({ vendorAddress: e.target.value })} />
              )},
              { label: "PAN No.", content: (
                <input className="w-full bg-transparent outline-none text-[13px] font-bold text-gray-700 dark:text-gray-300"
                  value={po.panNo || ""} onChange={(e) => set({ panNo: e.target.value })} placeholder="Enter PAN" />
              )},
              { label: "Contact No.", content: (
                <input className="w-full bg-transparent outline-none text-[13px] font-bold text-gray-700 dark:text-gray-300"
                  value={po.vendorContact || ""} onChange={(e) => set({ vendorContact: e.target.value })} />
              )},
              { label: "Vendor Email", content: (
                <input className="w-full bg-transparent outline-none text-[13px] font-bold text-blue-500 dark:text-blue-400"
                  value={po.vendorEmail || ""} onChange={(e) => set({ vendorEmail: e.target.value })} />
              )},
            ].map(({ label, content }) => (
              <div key={label} className="grid grid-cols-12 items-center min-h-[48px]">
                <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">{label}</div>
                <div className="col-span-8 px-3 py-1">{content}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Line Items */}
        <div>
          <h3 className="text-[13px] font-bold text-gray-900 dark:text-white mb-3">Line Items</h3>
          {errors.items && <p className="text-[11px] text-red-500 mb-2">{errors.items}</p>}

          {/* Item search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search inventory to add items..."
              value={searchItem}
              onChange={(e) => setSearchItem(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-[13px] focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />
            {searchItem && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchLoading
                  ? <p className="px-4 py-3 text-[12px] text-gray-400">Searching...</p>
                  : searchResults.map((i, idx) => (
                    <div key={idx} onClick={() => { addItem(i); setSearchItem(""); }} className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-[13px] text-gray-900 dark:text-white">
                      {i.itemName} ({i.sku}) — Stock: {i.liveStock}
                    </div>
                  ))
                }
                <div onClick={() => { addItem({ itemName: searchItem, sku: "N/A" }); setSearchItem(""); }}
                  className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-[13px] text-orange-600 font-bold border-t border-gray-100 dark:border-gray-800">
                  + Add "{searchItem}" as manual item
                </div>
              </div>
            )}
          </div>

          {po.items?.length > 0 && (
            <>
              {/* ── Mobile: Cards (< md) ─────────────────────────────────── */}
              <div className="md:hidden space-y-3">
                {po.items.map((item, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm relative">
                    {/* Header row */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="min-w-0 flex-1 pr-2">
                        <h4 className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">{safeStr(item.itemName)}</h4>
                        <p className={cn("text-[11px] font-mono mt-0.5", item.sku === "N/A" ? "text-red-500 font-bold" : "text-gray-400")}>
                          {item.sku === "N/A" ? "⚠️ NOT LINKED" : safeStr(item.sku)}
                        </p>
                        <div className="flex gap-3 mt-1">
                          {item.currentStock !== undefined && (
                            <span className="text-[10px] text-gray-400">Stock: <strong className="text-gray-600 dark:text-gray-300">{item.currentStock}</strong></span>
                          )}
                          {item.unit && <span className="text-[10px] text-gray-400">Unit: <strong className="text-gray-600 dark:text-gray-300">{item.unit}</strong></span>}
                          {item.requirementQty > 0 && <span className="text-[10px] text-gray-400">Req: <strong className="text-gray-600 dark:text-gray-300">{item.requirementQty}</strong></span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setLinkingIndex(idx)} className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors">
                          <Link2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => removeItem(idx)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Link popup (mobile) */}
                    {linkingIndex === idx && (
                      <div className="mb-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-gray-500">Link inventory item</span>
                          <button onClick={() => setLinkingIndex(null)}><X className="w-3.5 h-3.5 text-gray-400" /></button>
                        </div>
                        <div className="relative mb-2">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          <input autoFocus type="text" placeholder="Search inventory..." value={linkingSearch}
                            onChange={(e) => setLinkingSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-[12px] focus:outline-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1">
                          {linkingLoading
                            ? <p className="py-4 text-center text-[11px] text-gray-400">Searching...</p>
                            : linkingResults.length === 0
                              ? <p className="py-4 text-center text-[11px] text-gray-400">{linkingSearch ? "No items found" : "Type to search inventory"}</p>
                              : linkingResults.map((i, iidx) => (
                                <div key={iidx} onClick={() => { linkToInventory(idx, i); setLinkingIndex(null); setLinkingSearch(""); }}
                                  className="px-3 py-2 hover:bg-orange-50 dark:hover:bg-orange-900/10 cursor-pointer text-[12px] rounded-lg border border-transparent hover:border-orange-100 transition-all">
                                  <div className="font-bold text-gray-900 dark:text-white">{safeStr(i.itemName)}</div>
                                  <div className="flex items-center justify-between mt-0.5">
                                    <span className="text-[10px] text-gray-500 font-mono">{safeStr(i.sku)}</span>
                                    <span className="text-[10px] font-bold text-orange-600">Stock: {safeStr(i.liveStock)}</span>
                                  </div>
                                </div>
                              ))
                          }
                        </div>
                      </div>
                    )}

                    {/* Quick Add (mobile) */}
                    {item.sku === "N/A" && showQuickAdd !== idx && (
                      <button onClick={() => { setShowQuickAdd(idx); setQuickAddData({ category: "", unit: "" }); }}
                        className="text-[10px] text-orange-600 hover:underline font-bold flex items-center gap-0.5 mb-3">
                        <Plus className="w-2.5 h-2.5" /> Quick Add to Inventory
                      </button>
                    )}
                    {showQuickAdd === idx && (
                      <div className="mb-3 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">Quick add item</span>
                          <button onClick={() => setShowQuickAdd(null)}><X className="w-3 h-3 text-gray-400" /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <SField label="Category" className="mb-0" value={quickAddData.category}
                            onChange={(e) => setQuickAddData({ ...quickAddData, category: e.target.value })}
                            options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
                          <SField label="Unit" className="mb-0" value={quickAddData.unit}
                            onChange={(e) => setQuickAddData({ ...quickAddData, unit: e.target.value })}
                            options={UNITS.map((u) => ({ label: u, value: u }))} />
                        </div>
                        <Btn label="Add to Inventory" small className="w-full" onClick={() => quickAddToInventory(idx, quickAddData)} loading={actionLoading} />
                      </div>
                    )}

                    {/* Inputs: 2-col grid */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-semibold mb-1">Condition</label>
                        <select value={item.condition || "New"} onChange={(e) => updateItem(idx, "condition", e.target.value)}
                          className={CELL_INPUT}>
                          {CONDITION_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-semibold mb-1">Order Qty</label>
                        <input type="number" value={item.qty ?? 0} onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                          className={cn(CELL_INPUT, "text-center")} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-semibold mb-1">Rate (₹)</label>
                        <input type="number" value={item.rate ?? 0} onChange={(e) => updateItem(idx, "rate", Number(e.target.value))}
                          className={CELL_INPUT} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-semibold mb-1">GST %</label>
                        <select value={item.gstPct} onChange={(e) => updateItem(idx, "gstPct", Number(e.target.value))}
                          className={CELL_INPUT}>
                          {gstOptions.map((v) => <option key={v} value={v}>{v}%</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="block text-[10px] text-gray-500 dark:text-gray-400 font-semibold mb-1">GST Type</label>
                      <select value={item.gstType || "Exclusive"} onChange={(e) => updateItem(idx, "gstType", e.target.value)}
                        className={cn(CELL_INPUT, "font-semibold")}>
                        {GST_TYPE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>

                    {/* Total */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-[12px] font-bold text-gray-500">Total (Incl. GST)</span>
                      <span className="text-[15px] font-black text-orange-600 dark:text-orange-400">{fmtCur(calcItemTotal(item))}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* ── Desktop: Table (≥ md) — 7 columns instead of 11 ──────── */}
              <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse" style={{ minWidth: 640 }}>
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-[35%]">Item</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-[13%]">Condition</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-[10%]">Order Qty</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-[10%]">Rate (₹)</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-[16%]">GST % / Type</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-[12%] text-right">Total</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {po.items.map((item, idx) => (
                      <tr key={idx} className="group hover:bg-gray-50/60 dark:hover:bg-gray-800/30 transition-colors">
                        {/* Item cell — name, SKU, stock/unit/req info, link button */}
                        <td className="px-3 py-3 relative">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold text-gray-900 dark:text-white leading-tight" title={safeStr(item.itemName)}>
                                {safeStr(item.itemName)}
                              </p>
                              <p className={cn("text-[10px] font-mono mt-0.5", item.sku === "N/A" ? "text-red-500 font-bold" : "text-gray-400")}>
                                {item.sku === "N/A" ? "⚠️ NOT LINKED" : safeStr(item.sku)}
                              </p>
                              {/* Stock · Unit · Req pill row */}
                              <div className="flex flex-wrap gap-2 mt-1">
                                {item.currentStock !== undefined && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                    Stock: {item.currentStock} {item.unit}
                                  </span>
                                )}
                                {item.requirementQty > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-500">
                                    Req: {item.requirementQty}
                                  </span>
                                )}
                              </div>
                              {/* Quick Add */}
                              {item.sku === "N/A" && showQuickAdd !== idx && (
                                <button onClick={() => { setShowQuickAdd(idx); setQuickAddData({ category: "", unit: "" }); }}
                                  className="mt-1 text-[10px] text-orange-600 hover:underline font-bold flex items-center gap-0.5">
                                  <Plus className="w-2.5 h-2.5" /> Quick Add
                                </button>
                              )}
                              {showQuickAdd === idx && (
                                <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-xl shadow-sm relative z-50 w-[320px]">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-bold text-orange-700 dark:text-orange-400">Quick add item</span>
                                    <button onClick={() => setShowQuickAdd(null)}><X className="w-3 h-3 text-gray-400" /></button>
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <SField label="Category" className="mb-0 flex-1" value={quickAddData.category}
                                      onChange={(e) => setQuickAddData({ ...quickAddData, category: e.target.value })}
                                      options={CATEGORIES.map((c) => ({ label: c, value: c }))} />
                                    <SField label="Unit" className="mb-0 flex-1" value={quickAddData.unit}
                                      onChange={(e) => setQuickAddData({ ...quickAddData, unit: e.target.value })}
                                      options={UNITS.map((u) => ({ label: u, value: u }))} />
                                    <Btn label="Add" small className="h-[38px]" onClick={() => quickAddToInventory(idx, quickAddData)} loading={actionLoading} />
                                  </div>
                                </div>
                              )}
                            </div>
                            <button onClick={() => setLinkingIndex(idx)}
                              className="p-1.5 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Link to inventory">
                              <Link2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Link popup (desktop) */}
                          {linkingIndex === idx && (
                            <div className="absolute z-30 left-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-gray-500">Link inventory item</span>
                                <button onClick={() => setLinkingIndex(null)}><X className="w-3 h-3 text-gray-400" /></button>
                              </div>
                              <div className="relative mb-2">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input autoFocus type="text" placeholder="Search inventory..." value={linkingSearch}
                                  onChange={(e) => setLinkingSearch(e.target.value)}
                                  className="w-full pl-9 pr-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-[12px] focus:outline-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white" />
                              </div>
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {linkingLoading
                                  ? <p className="py-4 text-center text-[11px] text-gray-400">Searching...</p>
                                  : linkingResults.length === 0
                                    ? <p className="py-4 text-center text-[11px] text-gray-400">{linkingSearch ? "No items found" : "Type to search inventory"}</p>
                                    : linkingResults.map((i, iidx) => (
                                      <div key={iidx} onClick={() => { linkToInventory(idx, i); setLinkingIndex(null); setLinkingSearch(""); }}
                                        className="px-3 py-2 hover:bg-orange-50 dark:hover:bg-orange-900/10 cursor-pointer text-[12px] rounded-lg border border-transparent hover:border-orange-100 transition-all">
                                        <div className="font-bold text-gray-900 dark:text-white truncate">{safeStr(i.itemName)}</div>
                                        <div className="flex items-center justify-between mt-0.5">
                                          <span className="text-[10px] text-gray-500 font-mono">{safeStr(i.sku)}</span>
                                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 rounded">Stock: {safeStr(i.liveStock)}</span>
                                        </div>
                                      </div>
                                    ))
                                }
                              </div>
                            </div>
                          )}
                        </td>

                        {/* Condition */}
                        <td className="px-3 py-3">
                          <select value={item.condition || "New"} onChange={(e) => updateItem(idx, "condition", e.target.value)}
                            className={CELL_INPUT}>
                            {CONDITION_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </td>

                        {/* Order Qty */}
                        <td className="px-3 py-3">
                          <input type="number" value={item.qty ?? 0} onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                            className={cn(CELL_INPUT, "text-center")} />
                        </td>

                        {/* Rate */}
                        <td className="px-3 py-3">
                          <input type="number" value={item.rate ?? 0} onChange={(e) => updateItem(idx, "rate", Number(e.target.value))}
                            className={CELL_INPUT} />
                        </td>

                        {/* GST % + GST Type in one cell */}
                        <td className="px-3 py-3">
                          <div className="flex gap-1.5">
                            <select value={item.gstPct} onChange={(e) => updateItem(idx, "gstPct", Number(e.target.value))}
                              className={cn(CELL_INPUT, "w-[58px] shrink-0")}>
                              {gstOptions.map((v) => <option key={v} value={v}>{v}%</option>)}
                            </select>
                            <select value={item.gstType || "Exclusive"} onChange={(e) => updateItem(idx, "gstType", e.target.value)}
                              className={cn(CELL_INPUT, "flex-1 min-w-0 font-semibold")}>
                              {GST_TYPE_OPTIONS.map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                          </div>
                        </td>

                        {/* Total */}
                        <td className="px-3 py-3 text-right">
                          <span className="text-[13px] font-bold text-gray-900 dark:text-white">{fmtCur(calcItemTotal(item))}</span>
                        </td>

                        {/* Remove */}
                        <td className="py-3 pr-2">
                          <button onClick={() => removeItem(idx)}
                            className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded">
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40">
                    <tr>
                      <td colSpan={5} className="px-3 py-2.5 text-right text-[10px] font-bold text-gray-400 tracking-widest uppercase">Items Subtotal (Incl. GST)</td>
                      <td className="px-3 py-2.5 text-right text-[13px] font-bold text-gray-700 dark:text-gray-300">
                        {fmtCur(po.items?.reduce((s, it) => s + (it.totalWithGST || 0), 0) || 0)}
                      </td>
                      <td />
                    </tr>
                    {[
                      ["Freight", po.freightAmount, po.freightGstPct, po.freightGstType],
                      ["Loading", po.loadingAmount, po.loadingGstPct, po.loadingGstType],
                      ["Unloading", po.unloadingAmount, po.unloadingGstPct, po.unloadingGstType],
                    ].filter(([, amt]) => (amt || 0) > 0).map(([name, amt, pct, type]) => (
                      <tr key={name}>
                        <td colSpan={5} className="px-3 py-1.5 text-right text-[10px] font-bold text-gray-400">
                          {name} Charges ({pct || 18}% GST · {type || "Exclusive"})
                        </td>
                        <td className="px-3 py-1.5 text-right text-[12px] font-bold text-gray-600 dark:text-gray-400">
                          {fmtCur(calcChargeTotal(amt || 0, pct || 0, type || "Exclusive"))}
                        </td>
                        <td />
                      </tr>
                    ))}
                    <tr className="border-t border-gray-200 dark:border-gray-700">
                      <td colSpan={5} className="px-3 py-3 text-right text-[11px] font-black text-gray-600 dark:text-gray-300 tracking-widest uppercase">Grand Total (Incl. GST + Charges)</td>
                      <td className="px-3 py-3 text-right text-[16px] font-black text-orange-600 dark:text-orange-400">{fmtCur(grandTotal)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}

          <div className="mb-4">
            <Field label="Justification / Remarks" value={po.justification} onChange={(e) => set({ justification: e.target.value })} error={errors.justification} />
          </div>
        </div>

        {/* Other Charges */}
        <div className="p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-5 bg-orange-500 rounded-full" />
            <h4 className="text-[11px] font-black text-gray-400 tracking-widest">Other Charges</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ChargeBlock label="Freight Charges" amountKey="freightAmount" gstPctKey="freightGstPct" gstTypeKey="freightGstType" po={po} onChange={set} gstOptions={gstOptions} />
            <ChargeBlock label="Loading Charges" amountKey="loadingAmount" gstPctKey="loadingGstPct" gstTypeKey="loadingGstType" po={po} onChange={set} gstOptions={gstOptions} />
            <ChargeBlock label="Unloading Charges" amountKey="unloadingAmount" gstPctKey="unloadingGstPct" gstTypeKey="unloadingGstType" po={po} onChange={set} gstOptions={gstOptions} />
          </div>
        </div>

        {/* Delivery + Bank details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50/50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
          <div className="space-y-4">
            <h4 className="text-[11px] font-black text-gray-400">Delivery details</h4>
            <Field label="Delivery Location" value={po.deliveryDetails?.location || ""}
              onChange={(e) => set({ deliveryDetails: { ...po.deliveryDetails, location: e.target.value } })} />
            <Field label="Receiver Name" value={po.deliveryDetails?.contactPerson || ""}
              onChange={(e) => set({ deliveryDetails: { ...po.deliveryDetails, contactPerson: e.target.value } })} />
            <Field label="Receiver Contact" value={po.deliveryDetails?.contactPhone || ""}
              onChange={(e) => set({ deliveryDetails: { ...po.deliveryDetails, contactPhone: e.target.value } })}
              placeholder="Site contact number" />
            <Field label="Delivery Date / Period" value={po.deliveryDetails?.deliveryDate || ""}
              onChange={(e) => set({ deliveryDetails: { ...po.deliveryDetails, deliveryDate: e.target.value } })}
              placeholder="e.g. Within 7 days" />
          </div>
          <div className="space-y-4">
            <h4 className="text-[11px] font-black text-gray-400">Vendor bank details</h4>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Bank Name" value={po.vendorBankDetails?.bankName || ""}
                onChange={(e) => set({ vendorBankDetails: { ...po.vendorBankDetails, bankName: e.target.value } })} />
              <Field label="A/C No." value={po.vendorBankDetails?.accountNo || ""}
                onChange={(e) => set({ vendorBankDetails: { ...po.vendorBankDetails, accountNo: e.target.value } })} />
            </div>
            <Field label="Branch & IFSC" value={po.vendorBankDetails?.branchIFSC || ""}
              onChange={(e) => set({ vendorBankDetails: { ...po.vendorBankDetails, branchIFSC: e.target.value } })} />
          </div>
        </div>

        {/* Payment Timelines */}
        <div className="border border-[#1A365D] rounded-lg overflow-visible">
          <div className="bg-[#1A365D] h-8 flex items-center justify-between px-4">
            <p className="text-white font-black text-[10px] tracking-widest">Payment Timelines</p>
            <button type="button"
              onClick={() => set({ paymentTimelines: [...(po.paymentTimelines || []), { date: todayStr(), type: "Milestone", mode: "Bank Transfer", amount: 0, gstPct: 18, gstType: "Exclusive", ifPayable: 0 }] })}
              className="text-white text-[9px] border border-white/40 px-2.5 py-0.5 rounded hover:bg-white/10 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-[#1A365D]/10 dark:bg-[#1A365D]/30 text-[9px] font-black text-gray-500 tracking-wide">
                  {["Date", "Type", "Mode", "Amount", "GST %", "GST Type", "GST Amt", "If Payable", ""].map((h) => (
                    <th key={h} className="p-2 text-left border-r border-[#1A365D]/30 last:border-none">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(po.paymentTimelines || []).map((pt, idx) => {
                  const norm = normalizeTimelineGST(pt);
                  const gstAmt = Math.max(0, (pt.ifPayable || 0) - (pt.amount || 0));
                  return (
                    <tr key={idx} className="border-t border-[#1A365D]/20 hover:bg-[#1A365D]/5">
                      <td className="p-1.5 border-r border-[#1A365D]/20">
                        <DatePicker small value={pt.date || ""} onChange={(e) => updateTimeline(idx, { date: e.target.value })} />
                      </td>
                      <td className="p-1.5 border-r border-[#1A365D]/20">
                        <input className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-xs"
                          value={normalizeTimelineType(pt.type)} onChange={(e) => updateTimeline(idx, { type: e.target.value })} />
                      </td>
                      <td className="p-1.5 border-r border-[#1A365D]/20">
                        <input className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-xs"
                          value={pt.mode || ""} onChange={(e) => updateTimeline(idx, { mode: e.target.value })} />
                      </td>
                      <td className="p-1.5 border-r border-[#1A365D]/20">
                        <input type="text" className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-xs text-right"
                          value={pt.amount ?? ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0;
                            const payable = norm.gstType === "Exclusive" && norm.gstPct > 0 ? val + val * norm.gstPct / 100 : val;
                            updateTimeline(idx, { amount: e.target.value.replace(/[^0-9.]/g, ""), ifPayable: parseFloat(payable.toFixed(2)) });
                          }} />
                      </td>
                      <td className="p-1.5 border-r border-[#1A365D]/20">
                        <input type="number" min="0" max="100" className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-xs text-center"
                          value={norm.gstPct} onFocus={(e) => e.target.select()}
                          onChange={(e) => {
                            const pct = parseFloat(e.target.value) || 0;
                            const amt = parseFloat(String(pt.amount)) || 0;
                            const payable = norm.gstType === "Exclusive" && pct > 0 ? amt + amt * pct / 100 : amt;
                            updateTimeline(idx, { gstPct: pct, ifPayable: parseFloat(payable.toFixed(2)) });
                          }} />
                      </td>
                      <td className="p-1.5 border-r border-[#1A365D]/20 text-center text-[11px] font-medium text-gray-700 dark:text-gray-300">{norm.gstType}</td>
                      <td className="p-1.5 border-r border-[#1A365D]/20 text-right text-[11px] font-bold text-emerald-600 dark:text-emerald-400 min-w-[70px]">
                        {gstAmt > 0 ? fmtCur(gstAmt) : <span className="text-gray-400 font-normal">—</span>}
                      </td>
                      <td className="p-1.5 border-r border-[#1A365D]/20">
                        <input type="text" className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-xs text-right font-bold"
                          value={pt.ifPayable ?? ""}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value.replace(/[^0-9.]/g, "")) || 0;
                            const amt = norm.gstType === "Exclusive" && norm.gstPct > 0 ? val / (1 + norm.gstPct / 100) : val;
                            updateTimeline(idx, { ifPayable: e.target.value.replace(/[^0-9.]/g, ""), amount: parseFloat(amt.toFixed(2)) });
                          }} />
                      </td>
                      <td className="p-1.5 text-center">
                        <button type="button" onClick={() => set({ paymentTimelines: (po.paymentTimelines || []).filter((_, i) => i !== idx) })}
                          className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                          <X className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[#1A365D] text-white">
                  <td colSpan={8} className="p-2 text-right text-[10px] font-black tracking-wide">Grand Total</td>
                  <td className="p-2 text-right text-[13px] font-black pr-3">{fmtCur(grandTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">Remarks / Notes</label>
          <textarea className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] h-20 text-gray-900 dark:text-white"
            value={po.remark || ""} onChange={(e) => set({ remark: e.target.value })}
            placeholder="Additional terms or messages..." />
        </div>

        {/* Price Comparison */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-orange-500 rounded-full" />
              <h4 className="text-[14px] font-black text-gray-900 dark:text-white">Quotation comparison</h4>
            </div>
          </div>
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm">
            <table className="w-full text-left border-collapse bg-white dark:bg-gray-900">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3 text-[11px] font-bold w-12 border-r border-gray-200 dark:border-gray-700">S.no</th>
                  <th className="px-4 py-3 text-[11px] font-bold border-r border-gray-200 dark:border-gray-700 min-w-[200px]">Description</th>
                  <th className="px-4 py-3 text-[11px] font-bold border-r border-gray-200 dark:border-gray-700 w-16 text-center">Uqc</th>
                  {(po.priceComparison?.vendors || []).map((v, vIdx) => (
                    <th key={vIdx} className="px-1 py-3 border-r border-gray-200 dark:border-gray-700 w-40 min-w-[120px] bg-gray-50/50 dark:bg-gray-800/30">
                      <div className="w-full p-2 text-[12px] font-bold text-center text-gray-900 dark:text-white truncate">{v.name || `Vendor ${vIdx + 1}`}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {(po.priceComparison?.items || []).map((it, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-2.5 text-[12px] border-r border-gray-200 dark:border-gray-700 text-center font-medium">{idx + 1}</td>
                    <td className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-700 text-[12px] font-medium text-gray-900 dark:text-white">{it.materialName}</td>
                    <td className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-700 text-center text-[12px] text-gray-500">{it.unit}</td>
                    {(it.rates || []).map((rate, rIdx) => (
                      <td key={rIdx} className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-700 text-center">
                        <div className="flex flex-col items-center">
                          <span className={cn("text-[12px] font-bold", VENDOR_COLORS[rIdx % VENDOR_COLORS.length])}>{rate ? fmtCur(rate) : "—"}</span>
                          {it.gstPcts?.[rIdx] > 0 && <span className="text-[9px] text-gray-400">+{it.gstPcts[rIdx]}% GST</span>}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-gray-50/50 dark:bg-gray-800/30">
                  <td className="border-r border-gray-200 dark:border-gray-700" />
                  <td className="px-4 py-2.5 text-[11px] font-black text-gray-500 border-r border-gray-200 dark:border-gray-700">Gst % / status</td>
                  <td className="border-r border-gray-200 dark:border-gray-700" />
                  {(po.priceComparison?.vendors || []).map((v, vIdx) => (
                    <td key={vIdx} className="px-4 py-2.5 border-r border-gray-200 dark:border-gray-700 text-center text-[11px] font-bold text-gray-500">{v.gstType || "Inclusive"}</td>
                  ))}
                </tr>
                <tr className="bg-orange-50/30 dark:bg-orange-400/5">
                  <td className="border-r border-gray-200 dark:border-gray-700" />
                  <td className="px-4 py-3 text-[12px] font-black text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700">Grand total</td>
                  <td className="border-r border-gray-200 dark:border-gray-700" />
                  {(po.priceComparison?.vendors || []).map((v, vIdx) => {
                    const total = (po.priceComparison?.items || []).reduce((sum, it) => {
                      const rate = it.rates?.[vIdx] || 0;
                      const qty = it.qty || 1;
                      const gstPct = it.gstPcts?.[vIdx] || 0;
                      return sum + ((v.gstType || "Inclusive") === "Inclusive" ? rate * qty : rate * qty * (1 + gstPct / 100));
                    }, 0);
                    return (
                      <td key={vIdx} className="px-4 py-3 text-[14px] text-center font-black border-r border-gray-200 dark:border-gray-700">
                        <span className={VENDOR_COLORS[vIdx % VENDOR_COLORS.length]}>{fmtCur(total)}</span>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <label className="block text-[11px] font-bold text-gray-400 mb-1.5">Comparison remarks</label>
            <input type="text" className="w-full px-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              placeholder="Type remarks here..."
              value={po.priceComparison?.remarks || ""}
              onChange={(e) => set({ priceComparison: { ...po.priceComparison, remarks: e.target.value } })} />
          </div>
        </div>
      </div>
      </div>

      {/* ── Mobile sticky footer ───────────────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex gap-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
        <Btn label="Cancel" outline onClick={onClose} className="flex-1" />
        <Btn label={isEditing ? "Update PO" : "Create PO"} onClick={onSubmit} loading={actionLoading} className="flex-1" />
      </div>
    </div>
  );
}
