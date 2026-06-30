import React, { useState, useMemo } from "react";
import { X, Download, Ban, RotateCcw, AlertTriangle } from "lucide-react";
import { Modal, Btn, StatusBadge } from "../../components/ui";
import { DatePicker } from "../../components/ui/DatePicker";
import { useAppStore } from "../../store";
import { fmtCur, formatDateTime, safeStr } from "../../utils";
import { cn } from "../../lib/utils";
import toast from "react-hot-toast";
import {
  calcChargeTotal, normalizeTimelineGST, normalizeTimelineType,
  computeTimelineDates, formatPrettyDate,
} from "./poUtils";

function ApprovalStamp({ status, label }) {
  if (status === "Approved") {
    return (
      <div className="flex flex-col items-center">
        <div className="text-emerald-500 font-black text-[14px] border-2 border-emerald-500 px-2 py-0.5 rounded rotate-[-5deg] tracking-tighter opacity-80 mb-1">Approved</div>
        <span className="text-[7px] text-emerald-500/60 tracking-widest font-bold">Digitally signed</span>
      </div>
    );
  }
  if (status === "rejected") {
    return (
      <div className="flex flex-col items-center">
        <div className="text-rose-500 font-black text-[14px] border-2 border-rose-500 px-2 py-0.5 rounded rotate-[-5deg] tracking-tighter opacity-80 mb-1">Rejected</div>
        <span className="text-[7px] text-rose-500/60 tracking-widest font-bold">Declined</span>
      </div>
    );
  }
  return <span className="italic text-gray-300 dark:text-gray-700">Pending Authorization</span>;
}


export function POViewModal({ po, onClose, onApproveL1, onApproveL2, onApproveL3, onReject, onCancelApproved, onDownloadPDF, processingId }) {
  const { suppliers, settings, role, hasPermission, updatePO, actionLoading, grns } = useAppStore();
  const [editTimelines, setEditTimelines] = useState(false);
  const [draftTimelines, setDraftTimelines] = useState([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [closingItems, setClosingItems] = useState([]);

  const displayItems = useMemo(() => {
    if (!po || po.status !== "PO Closed") return po?.items || [];
    // Prefer stored closedItems (set when PO was closed)
    if (po.closedItems && po.closedItems.length > 0) return po.closedItems;
    // Fallback: compute from grns store if available
    const receivedBySku = {};
    (grns || []).filter((g) => g.poId === po.id).forEach((g) => {
      (g.items || []).forEach((item) => { receivedBySku[item.sku] = (receivedBySku[item.sku] || 0) + (item.received || 0); });
      (g.receipts || []).forEach((r) => {
        (r.items || []).forEach((item) => { receivedBySku[item.sku] = (receivedBySku[item.sku] || 0) + (item.received || 0); });
      });
    });
    return (po.items || [])
      .map((i) => ({ ...i, qty: receivedBySku[i.sku] || 0, total: (receivedBySku[i.sku] || 0) * i.rate, totalWithGST: (receivedBySku[i.sku] || 0) * i.rate * (1 + (i.gstPct || 18) / 100) }))
      .filter((i) => i.qty > 0);
  }, [po, grns]);

  const displayTotalValue = useMemo(() => {
    if (!po || po.status !== "PO Closed") return po?.totalValue || 0;
    return displayItems.reduce((s, it) => {
      if ((it.gstType || "Exclusive") === "Exclusive") return s + it.qty * it.rate * (1 + (it.gstPct || 18) / 100);
      return s + it.qty * it.rate;
    }, 0);
  }, [po, displayItems]);

  if (!po) return null;

  const supplier = suppliers.find((s) => s.id === po.supplier || s._id === po.supplier);
  const dates = computeTimelineDates(po);

  const filteredPCItems = (po.priceComparison?.items || []).filter((it) => {
    if (!po.workType || po.workType === "General") return true;
    return it.category === po.workType || !it.category;
  });
  const relevantVendorIndices = (po.priceComparison?.vendors || [])
    .map((_, idx) => idx)
    .filter((vIdx) => filteredPCItems.some((it) => (it.rates?.[vIdx] || 0) > 0));
  const hasComparison = filteredPCItems.length > 0 && relevantVendorIndices.length > 0;

  const handleClosePOClick = () => {
    const receivedBySku = {};
    (grns || []).filter((g) => g.poId === po.id).forEach((g) => {
      (g.items || []).forEach((item) => { receivedBySku[item.sku] = (receivedBySku[item.sku] || 0) + (item.received || 0); });
      (g.receipts || []).forEach((r) => {
        (r.items || []).forEach((item) => { receivedBySku[item.sku] = (receivedBySku[item.sku] || 0) + (item.received || 0); });
      });
    });
    const remaining = (po.items || [])
      .map((i) => ({ ...i, remaining: Math.max(0, (i.qty || 0) - (receivedBySku[i.sku] || 0)) }))
      .filter((i) => i.remaining > 0);
    setClosingItems(remaining);
    setShowCloseConfirm(true);
  };

  const handleConfirmClosePO = async () => {
    // Compute the received items to persist on the PO
    const receivedBySku = {};
    (grns || []).filter((g) => g.poId === po.id).forEach((g) => {
      (g.items || []).forEach((item) => { receivedBySku[item.sku] = (receivedBySku[item.sku] || 0) + (item.received || 0); });
      (g.receipts || []).forEach((r) => {
        (r.items || []).forEach((item) => { receivedBySku[item.sku] = (receivedBySku[item.sku] || 0) + (item.received || 0); });
      });
    });
    const closedItems = (po.items || [])
      .map((i) => { const q = receivedBySku[i.sku] || 0; return { ...i, qty: q, total: q * i.rate, totalWithGST: q * i.rate * (1 + (i.gstPct || 18) / 100) }; })
      .filter((i) => i.qty > 0);
    try {
      await updatePO(po.id, { status: "PO Closed", closedItems });
      toast.success("PO closed — remaining items cancelled");
      setShowCloseConfirm(false);
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to close PO");
    }
  };

  const handleReopenPO = async () => {
    try {
      await updatePO(po.id, { status: "GRN Variance" });
      toast.success("PO reopened");
      onClose();
    } catch (err) {
      toast.error(err.message || "Failed to reopen PO");
    }
  };

  const handleSaveTimelines = async () => {
    try {
      await updatePO(po.id, { paymentTimelines: draftTimelines });
      setEditTimelines(false);
      toast.success("Payment timelines updated");
    } catch {
      toast.error("Failed to update timelines");
    }
  };

  const VENDOR_COLORS = ["text-orange-600 dark:text-orange-500", "text-blue-500 dark:text-blue-400", "text-emerald-600 dark:text-emerald-400", "text-purple-600", "text-pink-600"];

  const footerButtons = (
    <div className="flex justify-end gap-3 w-full flex-wrap">
      {po.status === "Pending L1" && hasPermission("APPROVE_PURCHASE_ORDER_L1") && <Btn label="Approve L1" color="green" onClick={() => onApproveL1(po.id)} loading={processingId === `approve-${po.id}`} />}
      {po.status === "Pending L2" && hasPermission("APPROVE_PURCHASE_ORDER_L2") && <Btn label="Approve L2" color="green" onClick={() => onApproveL2(po.id)} loading={processingId === `approve-${po.id}`} />}
      {po.status === "Pending L3" && hasPermission("APPROVE_PURCHASE_ORDER_L3") && <Btn label="Approve L3 (Director)" color="green" onClick={() => onApproveL3(po.id)} loading={processingId === `approve-${po.id}`} />}
      {["Pending L1", "Pending L2", "Pending L3"].includes(po.status || "") && hasPermission("REJECT_PURCHASE_ORDER") && (
        <Btn label="Reject PO" color="red" onClick={() => onReject(po.id)} loading={processingId === `reject-${po.id}`} />
      )}
      {po.status === "Approved" && ["AGM", "Super Admin", "admin", "superadmin"].includes(role) && (
        <Btn label="Cancel PO" color="red" icon={X} onClick={() => onCancelApproved(po.id)} loading={processingId === `cancel-${po.id}`} />
      )}
      {po.status === "GRN Variance" && hasPermission("EDIT_PURCHASE_ORDER") && (
        <Btn label="Close PO" color="red" icon={Ban} onClick={handleClosePOClick} />
      )}
      {po.status === "PO Closed" && hasPermission("EDIT_PURCHASE_ORDER") && (
        <Btn label="Reopen PO" color="green" icon={RotateCcw} onClick={handleReopenPO} loading={actionLoading} />
      )}
      <Btn label="Download PO PDF" icon={Download} onClick={() => onDownloadPDF(po)} className="bg-orange-500 hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-500/20 font-bold" />
      <Btn label="Close" outline onClick={onClose} className="px-8 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800" />
    </div>
  );

  return (
    <Modal title={`Purchase Order Details - ${po.id}`} extraWide onClose={onClose} footer={footerButtons}>
      <div id="printable-po" className="p-1 sm:p-2 bg-white dark:bg-gray-900 text-[#1A365D] dark:text-gray-200 font-sans">

        {/* Cancellation banner */}
        {showCloseConfirm && (
          <div className="no-print mb-5 rounded-xl border border-amber-300 dark:border-amber-700 overflow-hidden">
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/40">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">Cancel remaining items and close this PO?</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">The quantities below have not been received. This cannot be undone.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-t border-amber-200 dark:border-amber-800">
                <thead className="bg-amber-100/60 dark:bg-amber-900/20">
                  <tr>
                    <th className="text-left px-3 py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">Item</th>
                    <th className="text-right px-3 py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">Ordered</th>
                    <th className="text-right px-3 py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">Received</th>
                    <th className="text-right px-3 py-1.5 text-[11px] font-bold text-red-500">Cancelling</th>
                  </tr>
                </thead>
                <tbody>
                  {closingItems.map((item, idx) => (
                    <tr key={idx} className="border-t border-amber-100 dark:border-amber-900/30">
                      <td className="px-3 py-1.5">
                        <div className="text-[12px] font-semibold text-gray-800 dark:text-gray-200">{item.itemName || item.sku}</div>
                        <div className="text-[10px] text-gray-400">{item.sku}</div>
                      </td>
                      <td className="px-3 py-1.5 text-right text-[12px] text-gray-500">{item.qty} {item.unit}</td>
                      <td className="px-3 py-1.5 text-right text-[12px] text-gray-500">{(item.qty || 0) - item.remaining} {item.unit}</td>
                      <td className="px-3 py-1.5 text-right text-[12px] font-bold text-red-500">{item.remaining} {item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 p-3 bg-amber-50/50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-800">
              <Btn label="Go Back" outline small onClick={() => setShowCloseConfirm(false)} />
              <Btn label="Confirm Close PO" color="red" icon={Ban} small loading={actionLoading} onClick={handleConfirmClosePO} />
            </div>
          </div>
        )}

        {po.status === "Cancelled" && (
          <div className="no-print mb-5 p-4 bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 rounded-xl flex items-start gap-3">
            <X className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">Purchase Order Cancelled</p>
              {po.cancelNote && <p className="text-xs text-red-600 mt-1"><span className="font-semibold">Reason: </span>{po.cancelNote}</p>}
              {(po.cancelledBy || po.cancelledAt) && (
                <p className="text-[11px] text-red-500 mt-1 opacity-80">
                  Cancelled{po.cancelledBy ? ` by ${po.cancelledBy}` : ""}{po.cancelledAt ? ` on ${formatDateTime(po.cancelledAt)}` : ""}
                </p>
              )}
              <p className="text-[11px] text-red-500 mt-1 opacity-70">The linked Quotation has been reset to Pending — suppliers may re-submit quotes.</p>
            </div>
          </div>
        )}

        {/* Company & Vendor header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-[#1A365D] mb-6 rounded-lg overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100 dark:divide-gray-800 lg:border-r border-[#1A365D]">
            {[
              ["Company name", po.companyName || "Neoteric Recreational And Hospitality"],
              ["Company gstin", po.companyGst || "23AACCG4573B1Z2", "font-mono text-[11px]"],
              ["Company address", po.companyAddress || "Gwalior MP", "leading-tight"],
              ["Internal mr no.", po.mrId || "—", "text-indigo-600 dark:text-blue-400"],
              ["Site/location", po.project || po.location || "—"],
              ["Date of issue", formatPrettyDate(po.date)],
            ].map(([label, value, extra = ""]) => (
              <div key={label} className="grid grid-cols-12 min-h-[35px]">
                <div className="col-span-4 bg-[#1A365D]/5 dark:bg-[#1A365D]/20 p-2 font-bold text-[9px] text-gray-500 border-r border-[#1A365D] flex items-center capitalize">{label}</div>
                <div className={`col-span-8 p-2 text-[11px] font-bold text-gray-800 dark:text-gray-200 ${extra}`}>{value}</div>
              </div>
            ))}
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {[
              ["Vendor name", supplier ? (supplier.companyName || supplier.name) : (po.supplier || "NA")],
              ["Vendor address", po.vendorAddress || supplier?.address || "NA", "leading-tight"],
              ["Vendor contact", po.vendorContact || supplier?.mobile || "NA"],
              ["Vendor email id", po.vendorEmail || supplier?.email || "NA", "text-blue-500 lowercase"],
              ["Gst no. (Vendor)", po.gstNo || supplier?.gstNumber || "NA", "font-mono"],
              ["Pan no.", po.panNo || supplier?.panNumber || "NA", "font-mono"],
            ].map(([label, value, extra = ""]) => (
              <div key={label} className="grid grid-cols-12 min-h-[35px]">
                <div className="col-span-4 bg-[#1A365D]/5 dark:bg-[#1A365D]/20 p-2 font-bold text-[9px] text-gray-500 border-r border-[#1A365D] flex items-center capitalize">{label}</div>
                <div className={`col-span-8 p-2 text-[11px] font-bold text-gray-800 dark:text-gray-200 ${extra}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Info row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-[#1A365D] rounded-lg overflow-hidden mb-6 bg-white dark:bg-gray-900">
          <div className="p-3 border-b md:border-b-0 md:border-r border-[#1A365D]">
            <p className="text-[10px] text-gray-400 font-bold mb-1">Po issue date</p>
            <p className="text-[13px] font-black text-orange-600">{formatPrettyDate(po.date)}</p>
          </div>
          <div className="p-3 border-b md:border-b-0 md:border-r border-[#1A365D]">
            <p className="text-[10px] text-gray-400 font-bold mb-1">Requirement by</p>
            <p className="text-[13px] font-bold">{po.requirementBy || "NA"}</p>
          </div>
          <div className="p-3 bg-gray-50/50 dark:bg-gray-800/30 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] text-gray-400 font-bold mb-1">Approval status</p>
              <StatusBadge status={po.status} accountStatus={po.accountStatus} />
            </div>
            <p className="text-[14px] font-black text-[#1A365D] dark:text-blue-400 opacity-20 rotate-[-15deg] border-2 border-current px-2 rounded hidden sm:block">Verified</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Order details table */}
          <div>
            <div className="bg-[#1A365D] h-7 flex items-center justify-center">
              <p className="text-white font-black text-[10px] tracking-widest">Order details</p>
            </div>
            <table className="w-full border-collapse border-[#1A365D]">
              <thead>
                <tr className="bg-[#1A365D] text-[10px] font-bold text-white">
                  <th className="border border-[#1A365D] p-1.5 text-center w-12">S.no.</th>
                  <th className="border border-[#1A365D] p-1.5 text-left min-w-[250px]">Name / description</th>
                  <th className="border border-[#1A365D] p-1.5 text-center w-20">Uqc</th>
                  <th className="border border-[#1A365D] p-1.5 text-center w-20">Qty</th>
                  <th className="border border-[#1A365D] p-1.5 text-right w-28">Rate (Rs)</th>
                  <th className="border border-[#1A365D] p-1.5 text-right w-32">Amount (Rs)</th>
                </tr>
              </thead>
              <tbody>
                {displayItems.map((item, idx) => (
                  <tr key={idx} className="text-[11px] hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="border border-[#1A365D] p-1.5 text-center font-bold">{idx + 1}</td>
                    <td className="border border-[#1A365D] p-1.5"><p className="font-bold leading-tight">{safeStr(item.itemName)}</p></td>
                    <td className="border border-[#1A365D] p-1.5 text-center font-bold text-gray-500">{safeStr(item.unit || "NOS")}</td>
                    <td className="border border-[#1A365D] p-1.5 text-center font-black text-gray-800 dark:text-slate-200">{item.qty}</td>
                    <td className="border border-[#1A365D] p-1.5 text-right font-medium text-slate-700 dark:text-slate-300">{fmtCur(item.rate)}</td>
                    <td className="border border-[#1A365D] p-1.5 text-right font-black text-gray-800 dark:text-slate-200">
                      {fmtCur((item.gstType || "Exclusive") === "Inclusive" ? (item.totalWithGST || item.qty * item.rate) : (item.total || item.qty * item.rate))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {[
                  ["Items Subtotal (Rs)", displayItems.reduce((s, it) => s + ((it.gstType || "Exclusive") === "Inclusive" ? (it.totalWithGST || it.qty * it.rate) : (it.total || it.qty * it.rate)), 0)],
                  [`Gst ${displayItems[0]?.gstPct || 18}% (Items)`, displayItems.reduce((s, it) => {
                    if ((it.gstType || "Exclusive") === "Exclusive") return s + it.qty * it.rate * (it.gstPct ?? 18) / 100;
                    return s;
                  }, 0)],
                  [`Freight Charges (${po.freightGstPct ?? 18}% GST · ${po.freightGstType || "Exclusive"})`, calcChargeTotal(po.freightAmount || 0, po.freightGstPct || 0, po.freightGstType || "Exclusive")],
                  [`Loading Charges (${po.loadingGstPct ?? 18}% GST · ${po.loadingGstType || "Exclusive"})`, calcChargeTotal(po.loadingAmount || 0, po.loadingGstPct || 0, po.loadingGstType || "Exclusive")],
                  [`Unloading Charges (${po.unloadingGstPct ?? 18}% GST · ${po.unloadingGstType || "Exclusive"})`, calcChargeTotal(po.unloadingAmount || 0, po.unloadingGstPct || 0, po.unloadingGstType || "Exclusive")],
                ].map(([label, value]) => (
                  <tr key={label} className="bg-white dark:bg-gray-900 border-b border-[#1A365D]">
                    <td colSpan={4} className="border-x border-[#1A365D] p-1.5" />
                    <td className="border border-[#1A365D] p-1.5 text-right text-[10px] font-black bg-gray-50/50 dark:bg-slate-800/40">{label}</td>
                    <td className="border border-[#1A365D] p-1.5 text-right text-[11px] font-black text-slate-800 dark:text-slate-200">{fmtCur(value)}</td>
                  </tr>
                ))}
                <tr className="bg-gray-100 dark:bg-gray-800 font-black">
                  <td colSpan={4} className="border-x border-b border-[#1A365D] p-1.5" />
                  <td className="border border-[#1A365D] p-1.5 text-right text-[11px] font-black bg-[#1A365D] text-white">Grand Total (Rs)</td>
                  <td className="border border-[#1A365D] p-2 text-right text-[14px] bg-[#1A365D] text-white">{fmtCur(displayTotalValue)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Bank + Delivery details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {[
                { title: "Bank details (Vendor)", rows: [
                  ["A/C holder", po.vendorBankDetails?.accountHolder || supplier?.accountHolderName || "—"],
                  ["Bank name", po.vendorBankDetails?.bankName || supplier?.bankName || "—"],
                  ["A/C no.", po.vendorBankDetails?.accountNo || supplier?.accountNumber || "—"],
                  ["Branch & Ifsc", po.vendorBankDetails?.branchIFSC || `${supplier?.branch || ""} & ${supplier?.ifscCode || ""}` || "—"],
                ]},
                { title: "Delivery details", rows: [
                  ["Delivery location", po.deliveryDetails?.location || "—"],
                  ["Delivery date", po.deliveryDetails?.deliveryDate ? formatPrettyDate(po.deliveryDetails.deliveryDate) : "—", "text-orange-600"],
                  ["Receiver name", po.deliveryDetails?.contactPerson || "—"],
                  ["Contact person", po.vendorContact || "—"],
                ]},
              ].map(({ title, rows }) => (
                <div key={title} className="border border-[#1A365D] rounded-lg overflow-hidden">
                  <div className="bg-[#1A365D] h-7 flex items-center justify-center">
                    <p className="text-white font-black text-[10px] tracking-widest">{title}</p>
                  </div>
                  <div className="divide-y divide-[#1A365D]">
                    {rows.map(([label, value, extra = ""]) => (
                      <div key={label} className="grid grid-cols-12 min-h-[30px]">
                        <div className="col-span-4 bg-[#1A365D]/5 dark:bg-[#1A365D]/20 p-2 font-bold text-[9px] text-gray-500 border-r border-[#1A365D] flex items-center capitalize">{label}</div>
                        <div className={`col-span-8 p-2 font-bold text-[11px] ${extra}`}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Payment Timelines */}
            <div className="mt-4 border border-[#1A365D] rounded-lg overflow-hidden">
              <div className="bg-[#1A365D] h-8 flex items-center justify-between px-4">
                <p className="text-white font-black text-[10px] tracking-widest">Payment Timelines</p>
                {!editTimelines ? (
                  <button
                    onClick={() => {
                      setDraftTimelines((po.paymentTimelines || []).map((pt, i) => ({
                        ...pt,
                        type: normalizeTimelineType(pt.type),
                        date: i < 3 ? dates[i] : pt.date,
                      })));
                      setEditTimelines(true);
                    }}
                    className="text-white text-[9px] border border-white/40 px-2.5 py-0.5 rounded hover:bg-white/10 transition-colors"
                  >Edit</button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={handleSaveTimelines} className="text-white text-[9px] bg-green-600/30 border border-green-400/50 px-2.5 py-0.5 rounded hover:bg-green-600/50 transition-colors">Save</button>
                    <button onClick={() => setEditTimelines(false)} className="text-white text-[9px] border border-white/30 px-2.5 py-0.5 rounded hover:bg-white/10 transition-colors">Cancel</button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-[#1A365D]/10 dark:bg-[#1A365D]/30 text-[9px] font-black text-gray-500 tracking-wide">
                      <th className="p-2 text-left border-r border-[#1A365D]/30">Date</th>
                      <th className="p-2 text-left border-r border-[#1A365D]/30">Type</th>
                      <th className="p-2 text-left border-r border-[#1A365D]/30">Mode</th>
                      <th className="p-2 text-right border-r border-[#1A365D]/30">Amount</th>
                      <th className="p-2 text-center border-r border-[#1A365D]/30">GST %</th>
                      <th className="p-2 text-center border-r border-[#1A365D]/30">GST Type</th>
                      <th className="p-2 text-right border-r border-[#1A365D]/30">GST Amt</th>
                      <th className="p-2 text-right">If Payable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(editTimelines ? draftTimelines : (po.paymentTimelines || [])).map((pt, idx) => {
                      const norm = normalizeTimelineGST(pt);
                      const baseAmt = parseFloat(String(pt.amount || 0)) || 0;
                      // Recompute dynamically — don't trust stored ifPayable (may be stale)
                      const computedPayable = norm.gstType === "Exclusive" && norm.gstPct > 0
                        ? parseFloat((baseAmt + baseAmt * norm.gstPct / 100).toFixed(2))
                        : baseAmt;
                      const computedGstAmt = parseFloat((computedPayable - baseAmt).toFixed(2));

                      return (
                      <tr key={idx} className="border-t border-[#1A365D]/20 hover:bg-[#1A365D]/5 transition-colors">
                        {editTimelines ? (
                          <>
                            <td className="p-1.5 border-r border-[#1A365D]/20">
                              <DatePicker small value={pt.date || ""} onChange={(e) => { const ts = [...draftTimelines]; ts[idx] = { ...ts[idx], date: e.target.value }; setDraftTimelines(ts); }} />
                            </td>
                            <td className="p-1.5 border-r border-[#1A365D]/20">
                              <input value={pt.type || ""} onChange={(e) => { const ts = [...draftTimelines]; ts[idx] = { ...ts[idx], type: e.target.value }; setDraftTimelines(ts); }} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-xs" />
                            </td>
                            <td className="p-1.5 border-r border-[#1A365D]/20">
                              <input value={pt.mode || ""} onChange={(e) => { const ts = [...draftTimelines]; ts[idx] = { ...ts[idx], mode: e.target.value }; setDraftTimelines(ts); }} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-xs" />
                            </td>
                            {/* Amount input — recomputes ifPayable on change */}
                            <td className="p-1.5 border-r border-[#1A365D]/20">
                              <input type="text" value={pt.amount ?? ""} onChange={(e) => {
                                const valStr = e.target.value.replace(/[^0-9.]/g, "");
                                const val = parseFloat(valStr) || 0;
                                const ts = [...draftTimelines];
                                const n = normalizeTimelineGST(ts[idx]);
                                const payable = n.gstType === "Exclusive" && n.gstPct > 0 ? val + val * n.gstPct / 100 : val;
                                ts[idx] = { ...ts[idx], amount: valStr, ifPayable: parseFloat(payable.toFixed(2)) };
                                setDraftTimelines(ts);
                              }} className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-xs text-right" />
                            </td>
                            {/* GST % number input — recomputes ifPayable on change */}
                            <td className="p-1.5 border-r border-[#1A365D]/20">
                              <input type="number" min="0" max="100" value={norm.gstPct} onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const pct = parseFloat(e.target.value) || 0;
                                  const ts = [...draftTimelines];
                                  const amt = parseFloat(String(ts[idx].amount)) || 0;
                                  const gstType = ts[idx].gstType || "Exclusive";
                                  const payable = gstType === "Exclusive" && pct > 0 ? amt + amt * pct / 100 : amt;
                                  ts[idx] = { ...ts[idx], gstPct: pct, ifPayable: parseFloat(payable.toFixed(2)) };
                                  setDraftTimelines(ts);
                                }}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-xs text-center font-medium"
                              />
                            </td>
                            {/* GST Type select — recomputes ifPayable on change */}
                            <td className="p-1.5 border-r border-[#1A365D]/20">
                              <select value={norm.gstType}
                                onChange={(e) => {
                                  const gstType = e.target.value;
                                  const ts = [...draftTimelines];
                                  const amt = parseFloat(String(ts[idx].amount)) || 0;
                                  const pct = normalizeTimelineGST(ts[idx]).gstPct;
                                  const payable = gstType === "Exclusive" && pct > 0 ? amt + amt * pct / 100 : amt;
                                  ts[idx] = { ...ts[idx], gstType, ifPayable: parseFloat(payable.toFixed(2)) };
                                  setDraftTimelines(ts);
                                }}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded px-1.5 py-1 text-xs text-center"
                              >
                                <option value="Exclusive">Exclusive</option>
                                <option value="Inclusive">Inclusive</option>
                              </select>
                            </td>
                            {/* GST Amt — computed, read-only in edit mode */}
                            <td className="p-1.5 border-r border-[#1A365D]/20 text-right text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              {(() => { const n = normalizeTimelineGST(pt); const a = parseFloat(String(pt.amount || 0)) || 0; const p = n.gstType === "Exclusive" && n.gstPct > 0 ? a + a * n.gstPct / 100 : a; const g = p - a; return g > 0.01 ? fmtCur(g) : <span className="text-gray-400 font-normal">—</span>; })()}
                            </td>
                            {/* If Payable — computed, shown as read-only */}
                            <td className="p-1.5 text-right font-bold text-[#1A365D] dark:text-blue-400">
                              {(() => { const n = normalizeTimelineGST(pt); const a = parseFloat(String(pt.amount || 0)) || 0; const p = n.gstType === "Exclusive" && n.gstPct > 0 ? a + a * n.gstPct / 100 : a; return p > 0 ? fmtCur(p) : <span className="text-gray-400 font-normal">0.00</span>; })()}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-2 border-r border-[#1A365D]/20">{formatPrettyDate(idx < 3 ? dates[idx] : pt.date)}</td>
                            <td className="p-2 border-r border-[#1A365D]/20 font-medium">{normalizeTimelineType(pt.type)}</td>
                            <td className="p-2 border-r border-[#1A365D]/20">{pt.mode}</td>
                            <td className="p-2 border-r border-[#1A365D]/20 text-right">
                              {baseAmt > 0 ? fmtCur(baseAmt) : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="p-2 border-r border-[#1A365D]/20 text-center font-black text-[#1A365D] dark:text-blue-300">
                              {norm.gstPct}%
                            </td>
                            <td className="p-2 border-r border-[#1A365D]/20 text-center text-[10px] font-medium text-gray-500">
                              {norm.gstType}
                            </td>
                            <td className="p-2 border-r border-[#1A365D]/20 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              {computedGstAmt > 0.01 ? fmtCur(computedGstAmt) : <span className="text-gray-400 font-normal">—</span>}
                            </td>
                            <td className="p-2 text-right font-bold text-[#1A365D] dark:text-blue-400">
                              {computedPayable > 0 ? fmtCur(computedPayable) : <span className="text-gray-400 font-normal">0.00</span>}
                            </td>
                          </>
                        )}
                      </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#1A365D] text-white">
                      <td colSpan={7} className="p-2 text-right text-[10px] font-black tracking-wide">Grand Total</td>
                      <td className="p-2 text-right text-[13px] font-black">{fmtCur(po.totalValue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Approval workflow */}
            <div className="border border-[#1A365D] rounded-lg overflow-hidden mt-6 mb-8 shadow-sm">
              <div className="bg-[#1A365D] h-8 flex items-center justify-center">
                <p className="text-white font-black text-[10px] tracking-widest px-4">Approval workflow & signatures</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#1A365D]">
                {[
                  { title: "PURCHASE COORDINATOR", name: settings?.approvers?.purchaseCoord || "Purchase Coordinator", date: po.date, approval: "Initiated", color: "blue" },
                  { title: "AGM PURCHASE (L1)", name: settings?.approvers?.l1 || "L1 Approver", date: po.approvalL1At, approval: po.approvalL1, status: po.status },
                  { title: "PROJECT HEAD (L2)", name: settings?.approvers?.l2 || "L2 Approver", date: po.approvalL2At, approval: po.approvalL2, status: po.status },
                  { title: "DIRECTOR (L3)", name: settings?.approvers?.l3 || "L3 Approver", date: po.approvalL3At, approval: po.approvalL3, status: po.status },
                ].map((col, i) => (
                  <div key={i} className="flex flex-col text-[9px] divide-y divide-[#1A365D]">
                    <div className="p-2 bg-[#1A365D]/10 dark:bg-[#1A365D]/30 font-black text-center border-b border-[#1A365D]">{col.title}</div>
                    <div className="p-2.5 min-h-[35px] flex items-center bg-white dark:bg-gray-900/50">
                      <span className="text-gray-500 mr-2">NAME:</span><span className="font-bold uppercase">{col.name}</span>
                    </div>
                    <div className="p-2.5 min-h-[35px] flex items-center bg-white dark:bg-gray-900/50">
                      <span className="text-gray-500 mr-2">DATE:</span><span className="font-mono font-bold">{col.date ? formatPrettyDate(col.date) : " "}</span>
                    </div>
                    <div className="p-4 h-16 flex items-center justify-center bg-slate-50/30 dark:bg-slate-900/10 select-none">
                      {i === 0 ? (
                        <div className="flex flex-col items-center">
                          <div className="text-blue-500 font-black text-[12px] border-2 border-blue-500/50 px-2 py-0.5 rounded rotate-[-3deg] tracking-tighter opacity-80 mb-1">Initiated</div>
                          <span className="text-[7px] text-blue-400 tracking-widest font-bold">Digital auth</span>
                        </div>
                      ) : (
                        <ApprovalStamp status={col.approval === "Approved" ? "Approved" : col.status === "rejected" ? "rejected" : "pending"} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-[#1A365D] flex rounded-lg overflow-hidden bg-white dark:bg-gray-900">
              <div className="bg-gray-100 dark:bg-gray-800 p-3 border-r border-[#1A365D] font-black text-[10px] w-28 flex items-center tracking-widest">Office remark:</div>
              <div className="p-3 flex-1 italic text-gray-500 font-medium text-[11px]">{po.remark || "Standard Order Terms Apply ✔"}</div>
            </div>

            {/* Price Comparison */}
            {hasComparison && (
              <div className="mt-8 border border-[#1A365D] rounded-xl overflow-hidden bg-white dark:bg-[#0F172A] shadow-2xl">
                <div className="bg-[#1A365D] h-8 flex items-center justify-center">
                  <p className="text-white font-black text-[12px] tracking-[0.2em]">Quotation / price comparison {po.workType ? `(${po.workType})` : ""}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-[#1E293B] text-slate-500 text-[9px] font-black">
                        <th className="p-2 text-center w-10 border-r border-b border-slate-200 dark:border-[#334155]">SR.</th>
                        <th className="p-2 text-left border-r border-b border-slate-200 dark:border-[#334155] min-w-[200px]">ITEM DESCRIPTION</th>
                        <th className="p-2 text-center w-14 border-r border-b border-slate-200 dark:border-[#334155]">UQC</th>
                        {relevantVendorIndices.map((vIdx) => (
                          <th key={vIdx} className="p-2 text-center border-r border-b border-slate-200 dark:border-[#334155] bg-slate-50 dark:bg-[#334155]/20">
                            <div className="flex flex-col">
                              <span className={cn("truncate text-[10px]", VENDOR_COLORS[vIdx % VENDOR_COLORS.length])}>{po.priceComparison.vendors[vIdx].name || `Vendor ${vIdx + 1}`}</span>
                              {po.priceComparison.vendors[vIdx].gstType && <span className="text-[7px] opacity-40 font-normal">({po.priceComparison.vendors[vIdx].gstType})</span>}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="text-[11px]">
                      {filteredPCItems.map((it, idx) => (
                        <tr key={idx} className="bg-white dark:bg-[#0F172A] hover:bg-slate-50 dark:hover:bg-[#1E293B]/50 transition-colors">
                          <td className="p-2 text-center border-r border-b border-slate-200 dark:border-[#334155] font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-2 border-r border-b border-slate-200 dark:border-[#334155] font-bold text-slate-700 dark:text-gray-300">{it.materialName}</td>
                          <td className="p-2 text-center border-r border-b border-slate-200 dark:border-[#334155] text-slate-400 font-mono">{it.unit || "NOS"}</td>
                          {relevantVendorIndices.map((vIdx) => {
                            const rate = it.rates?.[vIdx] || 0;
                            return (
                              <td key={vIdx} className="p-3 text-center border-r border-b border-slate-200 dark:border-[#334155] bg-slate-50/30 dark:bg-[#1E293B]/20">
                                <div className="flex flex-col items-center">
                                  <span className={cn("font-black text-[13px]", rate > 0 ? VENDOR_COLORS[vIdx % VENDOR_COLORS.length] : "text-slate-300 dark:text-gray-700")}>
                                    {rate > 0 ? rate.toFixed(2) : "—"}
                                  </span>
                                  {rate > 0 && it.gstPcts?.[vIdx] > 0 && <span className="text-[8px] opacity-50 font-medium text-slate-400">+{it.gstPcts[vIdx]}% GST</span>}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr className="bg-slate-50 dark:bg-[#1E293B]/60 text-[9px] font-black text-slate-500">
                        <td colSpan={3} className="p-2 text-right border-r border-b border-slate-200 dark:border-[#334155] px-4">Gst % / status</td>
                        {relevantVendorIndices.map((vIdx) => (
                          <td key={vIdx} className="p-2 text-center border-r border-b border-slate-200 dark:border-[#334155]">
                            {po.priceComparison.vendors[vIdx].gstType || "Inclusive"}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-slate-100 dark:bg-[#1E293B] font-black">
                        <td colSpan={3} className="p-3 text-right border-r border-b border-slate-200 dark:border-[#334155] text-slate-500 text-[11px] px-4">Grand total</td>
                        {relevantVendorIndices.map((vIdx) => {
                          const v = po.priceComparison.vendors[vIdx];
                          const total = filteredPCItems.reduce((sum, it) => {
                            const rate = it.rates?.[vIdx] || 0;
                            const gst = it.gstPcts?.[vIdx] || 0;
                            const qty = it.qty || 1;
                            const price = (v.gstType || "Exclusive") === "Exclusive" ? rate * (1 + gst / 100) : rate;
                            return sum + price * qty;
                          }, 0);
                          return (
                            <td key={vIdx} className="p-3 text-center border-r border-b border-slate-200 dark:border-[#334155] bg-white dark:bg-[#334155]/40">
                              <span className={cn("text-[15px]", VENDOR_COLORS[vIdx % VENDOR_COLORS.length])}>{fmtCur(total)}</span>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex border-t border-slate-200 dark:border-[#334155] bg-white dark:bg-[#0F172A] min-h-[40px]">
                  <div className="bg-slate-50 dark:bg-[#1E293B] p-2 border-r border-slate-200 dark:border-[#334155] font-black text-[10px] w-40 flex items-center justify-center tracking-widest text-slate-500">Comparison remark:</div>
                  <div className="p-3 flex-1 italic text-slate-400 text-[11px] font-medium leading-tight">
                    {po.priceComparison?.remarks || `Price Comparison for ${po.workType || "General"} category.`}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #printable-po, #printable-po * { visibility: visible; }
          #printable-po { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; }
        }
      ` }} />
    </Modal>
  );
}
