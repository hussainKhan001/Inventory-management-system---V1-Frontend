import React, { useState, useEffect, useMemo, memo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShoppingCart, FileText, CheckCircle2, Clock, XCircle,
  ChevronDown, RefreshCw, Eye, Truck, CreditCard, Shield,
  IndianRupee, Activity, CheckCircle, AlertCircle,
} from "lucide-react";
import { useAppStore } from "../store";
import { api } from "../services/api";
import { fmtCur, formatDate, formatDateTime } from "../utils";
import { cn } from "../lib/utils";
import { GRNDetailModal } from "../components/GRNDetailModal";
import { ImageViewer } from "../components/ImageViewer";
import { POViewModal } from "./po/POViewModal";
import { SearchFilter, SelectFilter, DateRangePicker, FilterRow } from "../components/ui/Filters";
import { Virtuoso } from "react-virtuoso";

const LIFECYCLE = [
  { key: "po",           label: "PO Created",   Icon: ShoppingCart },
  { key: "grn",          label: "GRN Received", Icon: Truck },
  { key: "invoice",      label: "Invoice",      Icon: FileText },
  { key: "verification", label: "Verified",     Icon: Shield },
  { key: "l1",           label: "L1 Approval",  Icon: CheckCircle },
  { key: "l2",           label: "L2 Approval",  Icon: CheckCircle },
  { key: "payment",      label: "Payment",      Icon: CreditCard },
];

const PILL_CFG = {
  "Material Pending":     "bg-gray-100 text-gray-500 dark:bg-gray-800/80 dark:text-gray-400",
  "Invoice Pending":      "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  "Verification Pending": "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Awaiting L1":          "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "Awaiting L2":          "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  "Ready for Payment":    "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Partially Paid":       "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  "Completed":            "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  "Rejected":             "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  verified:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  uploaded:   "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pending:    "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  waiting:    "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
  approved:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected:   "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  skipped:    "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500",
  paid:       "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  partial_paid:"bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  received:   "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const BORDER_COLOR = {
  "Material Pending":     "border-l-gray-300 dark:border-l-gray-600",
  "Invoice Pending":      "border-l-amber-400",
  "Verification Pending": "border-l-blue-400",
  "Awaiting L1":          "border-l-orange-400",
  "Awaiting L2":          "border-l-purple-400",
  "Ready for Payment":    "border-l-emerald-400",
  "Partially Paid":       "border-l-cyan-400",
  "Completed":            "border-l-green-500",
  "Rejected":             "border-l-red-500",
};

const KPI_ICON_CLS = {
  blue:    "bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400",
  indigo:  "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400",
  amber:   "bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400",
  orange:  "bg-orange-50 dark:bg-orange-500/10 text-orange-500 dark:text-orange-400",
  purple:  "bg-purple-50 dark:bg-purple-500/10 text-purple-500 dark:text-purple-400",
  violet:  "bg-violet-50 dark:bg-violet-500/10 text-violet-500 dark:text-violet-400",
  emerald: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
  green:   "bg-green-50 dark:bg-green-500/10 text-green-500 dark:text-green-400",
  red:     "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400",
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function cap(s) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

function extractArr(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

function computeRow(po, grns, account, supplierMap) {
  const sup = supplierMap instanceof Map ? supplierMap.get(po.supplier) : supplierMap?.find?.(s => s.id === po.supplier);
  const supplierName = sup?.companyName || sup?.name || po.companyName || po.supplier || "—";

  const hasGRN = grns.length > 0;
  const shipmentCount = grns.reduce((s, g) => s + 1 + (g.receipts?.length || 0), 0);

  const receivedQty = grns.reduce((s, g) => {
    const root = (g.items || []).reduce((a, i) => a + (i.received || 0), 0);
    const extra = (g.receipts || []).reduce((a, r) =>
      a + (r.items || []).reduce((b, i) => b + (i.received || 0), 0), 0);
    return s + root + extra;
  }, 0);
  const orderedQty = (po.items || []).reduce((s, i) => s + (i.qty || 0), 0);

  const invoice = account?.invoice || po.invoice || null;
  // Also check GRN shipments — invoice is stored per-shipment (invoiceNo / invoiceAmount on root or receipts)
  const hasInvoiceInGRN = grns.some(g =>
    !!(g.invoiceNo || g.invoiceAmount || g.challan) ||
    (g.receipts || []).some(r => !!(r.invoiceNo || r.invoiceAmount || r.challan))
  );
  const invoiceUploaded = !!(invoice?.number || invoice?.screenshotUrl || invoice?.amount) || hasInvoiceInGRN;

  // Verification: check PO-level field (set by AccountsPage Maker action), GRN-level fields, or GRN payment status
  const VERIFIED_STATUSES = ["bill_verified", "payment_pending", "payment_initiated", "paid", "partial_paid"];
  const verifiedBy = account?.billVerifiedBy || account?.verifiedBy || po?.verifiedBy
    || grns.find(g => g.verifiedBy)?.verifiedBy
    || grns.find(g => (g.receipts || []).some(r => r.verifiedBy))?.receipts?.find(r => r.verifiedBy)?.verifiedBy
    || null;
  const verifiedAt = account?.billVerifiedAt || account?.verifiedAt || po?.verifiedAt || null;
  const billRejected = !!(account?.billRejectedBy || po?.billRejectedBy);

  // Use combined totalPaid early so alreadyPaid can reference it
  const totalPaid = account?.totalPaid || po.totalPaid || 0;
  const poTotalValue = account?.poTotalValue || po.totalValue || 0;

  const grnVerificationDone = grns.some(g =>
    g.verifiedBy || VERIFIED_STATUSES.includes(g.paymentStatus) ||
    (g.receipts || []).some(r => r.verifiedBy || VERIFIED_STATUSES.includes(r.paymentStatus))
  );
  const alreadyPaid = totalPaid > 0 || !!(account?.paymentHistory?.length) || !!(po?.paymentHistory?.length);
  const verificationStatus = billRejected ? "rejected"
    : (verifiedBy || grnVerificationDone || alreadyPaid) ? "verified"
    : invoiceUploaded ? "pending"
    : "waiting";

  const payApprovals = account?.paymentApprovals || po.paymentApprovals || [];
  const l1 = payApprovals.find(a => String(a.level) === "1") || null;
  const l2 = payApprovals.find(a => String(a.level) === "2") || null;
  const hasL2 = payApprovals.length >= 2 || !!l2 || alreadyPaid;

  // If payment was already made, L1 (and L2 if present) must have been approved
  const l1Status = l1?.status
    || (alreadyPaid ? "approved" : verificationStatus === "verified" ? "pending" : "waiting");
  const l2Status = hasL2 ? (l2?.status || (alreadyPaid ? "approved" : l1Status === "approved" ? "pending" : "waiting")) : "skipped";
  const outstanding = Math.max(0, poTotalValue - totalPaid);
  const acctStatus = account?.accountStatus || po.accountStatus;

  const paymentStatus = acctStatus === "paid" ? "paid"
    : (totalPaid > 0 && outstanding <= 0) ? "paid"
    : acctStatus === "partial_paid" ? "partial_paid"
    : totalPaid > 0 ? "partial_paid"
    : acctStatus === "payment_pending" || acctStatus === "bill_verify" ? "pending"
    : "waiting";

  let overallStatus;
  if (billRejected)                          overallStatus = "Rejected";
  else if (paymentStatus === "paid" || acctStatus === "paid" || (totalPaid > 0 && outstanding <= 0))
                                             overallStatus = "Completed";
  else if (paymentStatus === "partial_paid") overallStatus = "Partially Paid";
  else if (!hasGRN)                          overallStatus = "Material Pending";
  else if (!invoiceUploaded)                 overallStatus = "Invoice Pending";
  else if (verificationStatus !== "verified")overallStatus = "Verification Pending";
  else if (l1Status === "rejected")          overallStatus = "Rejected";
  else if (l1Status !== "approved")          overallStatus = "Awaiting L1";
  else if (hasL2 && l2Status === "rejected") overallStatus = "Rejected";
  else if (hasL2 && l2Status !== "approved") overallStatus = "Awaiting L2";
  else                                       overallStatus = "Ready for Payment";

  return {
    id: po.id, po, grns, account, supplierName,
    project: po.project || "—", poDate: po.date,
    hasGRN, shipmentCount, receivedQty, orderedQty,
    invoice, invoiceUploaded,
    verifiedBy, verifiedAt, verificationStatus,
    l1, l2, l1Status, l2Status, hasL2,
    totalPaid, poTotalValue, outstanding,
    paymentStatus, overallStatus,
  };
}

function getStageStatus(row, key) {
  switch (key) {
    case "po":           return "completed";
    case "grn":          return row.hasGRN ? "completed" : "pending";
    case "invoice":      return row.invoiceUploaded ? "completed" : row.hasGRN ? "current" : "pending";
    case "verification": return row.verificationStatus === "verified" ? "completed"
                              : row.verificationStatus === "rejected" ? "rejected"
                              : row.invoiceUploaded ? "current" : "pending";
    case "l1":           return row.l1Status === "approved" ? "completed"
                              : row.l1Status === "rejected" ? "rejected"
                              : row.verificationStatus === "verified" ? "current" : "pending";
    case "l2":           return !row.hasL2 ? "skipped"
                              : row.l2Status === "approved" ? "completed"
                              : row.l2Status === "rejected" ? "rejected"
                              : row.l1Status === "approved" ? "current" : "pending";
    case "payment":      return row.paymentStatus === "paid" ? "completed"
                              : row.paymentStatus === "partial_paid" ? "in-progress"
                              : row.overallStatus === "Ready for Payment" ? "current" : "pending";
    default: return "pending";
  }
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

const Pill = memo(({ status, label }) => (
  <span className={cn(
    "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap",
    PILL_CFG[status] || "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
  )}>
    {label || cap(status)}
  </span>
));

const TimelineBar = memo(({ row }) => (
  <div className="flex items-start overflow-x-auto pb-1 pt-1">
    {LIFECYCLE.map((stage, idx) => {
      const st = getStageStatus(row, stage.key);
      if (st === "skipped") {
        return idx < LIFECYCLE.length - 1
          ? <div key={stage.key} className="w-4 h-0.5 self-start mt-4 bg-gray-200 dark:bg-gray-700 shrink-0" />
          : null;
      }
      const { Icon } = stage;
      const done = st === "completed";
      const cur  = st === "current" || st === "in-progress";
      const rej  = st === "rejected";
      return (
        <React.Fragment key={stage.key}>
          <div className="flex flex-col items-center gap-1.5 shrink-0 min-w-[56px]">
            <div className={cn(
              "w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-300",
              done && "bg-emerald-500 border-emerald-400 text-white shadow-sm shadow-emerald-500/30",
              cur  && "bg-orange-500 border-orange-400 text-white shadow-sm shadow-orange-500/30",
              rej  && "bg-red-500 border-red-400 text-white",
              !done && !cur && !rej && "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600",
            )}>
              {rej ? <XCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
            </div>
            <span className={cn(
              "text-[9px] font-bold text-center leading-tight px-1",
              done && "text-emerald-600 dark:text-emerald-400",
              cur  && "text-orange-600 dark:text-orange-400",
              rej  && "text-red-500 dark:text-red-400",
              !done && !cur && !rej && "text-gray-300 dark:text-gray-600",
            )}>
              {stage.label}
            </span>
          </div>
          {idx < LIFECYCLE.length - 1 && (
            <div className={cn(
              "flex-1 h-0.5 self-start mt-4 min-w-3 mx-1 transition-colors",
              done ? "bg-emerald-400 dark:bg-emerald-600" : "bg-gray-200 dark:bg-gray-700"
            )} />
          )}
        </React.Fragment>
      );
    })}
  </div>
));

const DRow = memo(({ label, value, bold, red, badge }) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-[11px] text-gray-400 shrink-0">{label}</span>
    {badge
      ? <Pill status={value} label={cap(value)} />
      : <span className={cn(
          "text-[11px] font-semibold text-right",
          bold && "text-gray-800 dark:text-white",
          red  && "text-red-500 dark:text-red-400",
          !bold && !red && "text-gray-600 dark:text-gray-300"
        )}>{value || "—"}</span>
    }
  </div>
));

const ExpandedContent = memo(({ row, onViewPO, onViewGRN }) => {
  const { po, grns, account } = row;
  const inv = account?.invoice || po.invoice;
  const payments = account?.paymentHistory || po.paymentHistory || [];
  const [viewerImages, setViewerImages] = useState(null);

  // Collect invoice images (challanPhotos + personPhotos) and challan/invoiceNo from all GRN shipments
  const invoiceImages = [];
  let grnInvoiceData = { number: null, amount: 0 };
  grns.forEach(g => {
    if (!grnInvoiceData.number && (g.invoiceNo || g.challan))
      grnInvoiceData = { number: g.invoiceNo || g.challan, amount: g.invoiceAmount || 0 };
    [...(g.challanPhotos || []), ...(g.personPhotos || [])].filter(Boolean).forEach(u => invoiceImages.push(u));
    (g.receipts || []).forEach(r => {
      if (!grnInvoiceData.number && (r.invoiceNo || r.challan))
        grnInvoiceData = { number: r.invoiceNo || r.challan, amount: r.invoiceAmount || 0 };
      [...(r.challanPhotos || []), ...(r.personPhotos || [])].filter(Boolean).forEach(u => invoiceImages.push(u));
    });
  });

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="overflow-hidden"
    >
      <div className="px-4 pb-5 pt-3 bg-gray-50/60 dark:bg-[#0F172A]/40 border-t border-gray-100 dark:border-gray-700/50">

        {/* Timeline */}
        <p className="text-[10px] font-black text-gray-400 tracking-widest mb-2 uppercase">Lifecycle Timeline</p>
        <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/50 px-4 py-3 mb-4">
          <TimelineBar row={row} />
        </div>

        {/* Three-column detail panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* GRN */}
          <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-50/80 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50">
              <div className="flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">GRN / Shipments</span>
              </div>
              {grns.length > 0 && (
                <button onClick={() => onViewGRN(grns[0], grns)}
                  className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors">
                  <Eye className="w-3 h-3" /> View GRN
                </button>
              )}
            </div>
            <div className="p-3 space-y-2">
              {!row.hasGRN ? (
                <p className="text-[12px] text-gray-400 italic text-center py-2">No GRN created yet</p>
              ) : (
                <>
                  {grns.map(g => (
                    <div key={g.id} className="space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{g.id}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(g.date)}</span>
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {1 + (g.receipts?.length || 0)} shipment{1 + (g.receipts?.length || 0) > 1 ? "s" : ""} · Challan: {g.challan || "—"}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700/50 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-400">Ordered</p>
                      <p className="text-[13px] font-bold text-gray-700 dark:text-gray-200">{row.orderedQty}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Received</p>
                      <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">{row.receivedQty}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Invoice & Verification */}
          <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50/80 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Invoice &amp; Verification</span>
            </div>
            <div className="p-3 space-y-1.5">
              {inv ? (
                <>
                  <DRow label="Invoice No."  value={inv.number} />
                  <DRow label="Date"         value={formatDate(inv.date)} />
                  <DRow label="Amount"       value={fmtCur(inv.amount || 0)} />
                  <DRow label="GST"          value={fmtCur(inv.gst || 0)} />
                  <DRow label="Grand Total"  value={fmtCur(inv.grandTotal || inv.amount || 0)} bold />
                </>
              ) : grnInvoiceData.number ? (
                <>
                  <DRow label="Invoice / Challan" value={grnInvoiceData.number} />
                  {grnInvoiceData.amount > 0 && <DRow label="Amount" value={fmtCur(grnInvoiceData.amount)} bold />}
                </>
              ) : invoiceImages.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic text-center py-1">No invoice uploaded</p>
              ) : null}

              {/* Invoice / challan images from GRN */}
              {invoiceImages.length > 0 && (
                <div className="flex gap-2 flex-wrap pt-1">
                  {invoiceImages.map((img, i) => (
                    <div key={i}
                      onClick={() => setViewerImages({ images: invoiceImages, index: i, title: "Invoice / Challan" })}
                      className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 cursor-zoom-in hover:border-orange-400 dark:hover:border-orange-500 transition-colors shadow-sm">
                      <img src={img} alt={`Invoice ${i + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-1.5 border-t border-gray-100 dark:border-gray-700/50 space-y-1.5">
                <DRow label="Verify Status" value={row.verificationStatus} badge />
                {row.verifiedBy && <DRow label="Verified By" value={row.verifiedBy} />}
                {row.verifiedAt && <DRow label="Verified At" value={formatDateTime(row.verifiedAt)} />}
              </div>
            </div>
          </div>

          {/* Approval & Payment */}
          <div className="bg-white dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-2 bg-gray-50/80 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700/50">
              <CreditCard className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Approval &amp; Payment</span>
            </div>
            <div className="p-3 space-y-1.5">
              <DRow label="L1 Approval" value={row.l1Status} badge />
              {row.l1?.approvedBy && <DRow label="L1 By" value={`${row.l1.approvedBy}${row.l1.approvedAt ? " · " + formatDate(row.l1.approvedAt) : ""}`} />}
              {row.hasL2 && <DRow label="L2 Approval" value={row.l2Status} badge />}
              {row.l2?.approvedBy && <DRow label="L2 By" value={`${row.l2.approvedBy}${row.l2.approvedAt ? " · " + formatDate(row.l2.approvedAt) : ""}`} />}
              <div className="pt-1.5 border-t border-gray-100 dark:border-gray-700/50 space-y-1.5">
                <DRow label="PO Value"    value={fmtCur(row.poTotalValue)} />
                <DRow label="Total Paid"  value={fmtCur(row.totalPaid)} bold />
                <DRow label="Outstanding" value={fmtCur(row.outstanding)} red={row.outstanding > 0} />
              </div>
              {payments.length > 0 && (
                <div className="pt-1.5 border-t border-gray-100 dark:border-gray-700/50">
                  <p className="text-[10px] font-black text-gray-400 mb-1 uppercase tracking-wide">Payment History</p>
                  {payments.slice(0, 3).map((p, i) => (
                    <div key={i} className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                      <span>#{p.installmentNo || i + 1} · {p.mode || "—"}</span>
                      <span className="font-semibold">{fmtCur(p.amountPaid || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <button onClick={() => onViewPO(po)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 transition-colors">
            <Eye className="w-3.5 h-3.5" /> View PO
          </button>
          {grns.length > 0 && (
            <button onClick={() => onViewGRN(grns[0], grns)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 border border-orange-100 dark:border-orange-800/50 transition-colors">
              <Truck className="w-3.5 h-3.5" /> View GRN
            </button>
          )}
        </div>
      </div>

      {/* Image lightbox */}
      {viewerImages && (
        <ImageViewer
          images={viewerImages.images}
          index={viewerImages.index}
          title={viewerImages.title}
          onClose={() => setViewerImages(null)}
        />
      )}
    </motion.div>
  );
});

const TrackerRow = memo(({ row, expanded, onToggle, onViewPO, onViewGRN }) => (
  <div className={cn(
    "border border-gray-100 dark:border-gray-700/50 rounded-xl overflow-hidden border-l-4 transition-shadow",
    BORDER_COLOR[row.overallStatus] || "border-l-gray-300",
    expanded ? "shadow-md dark:shadow-gray-900/40" : "shadow-sm hover:shadow-md",
    "bg-white dark:bg-gray-800/60"
  )}>
    <button onClick={onToggle} className="w-full text-left px-4 py-3 flex items-center gap-3">
      <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </motion.div>

      {/* PO */}
      <div className="w-32 shrink-0">
        <div className="text-[13px] font-black text-gray-800 dark:text-white">{row.po.id}</div>
        <div className="text-[10px] text-gray-400">{formatDate(row.poDate)}</div>
      </div>

      {/* Vendor / Project */}
      <div className="flex-1 min-w-0 hidden sm:block">
        <div className="text-[12px] font-semibold text-gray-700 dark:text-gray-200 truncate">{row.supplierName}</div>
        <div className="text-[10px] text-gray-400 truncate">{row.project}</div>
      </div>

      {/* Amount */}
      <div className="w-[100px] shrink-0 hidden xl:block text-right">
        <div className="text-[12px] font-black text-gray-800 dark:text-white tabular-nums">{fmtCur(row.poTotalValue)}</div>
        {row.outstanding > 0 && row.totalPaid > 0 && (
          <div className="text-[10px] text-orange-500 tabular-nums">{fmtCur(row.outstanding)} due</div>
        )}
        {row.totalPaid > 0 && row.outstanding <= 0 && (
          <div className="text-[10px] text-emerald-500 tabular-nums">Fully paid</div>
        )}
      </div>

      {/* GRN */}
      <div className="w-24 shrink-0 hidden md:block text-center">
        {row.hasGRN ? (
          <>
            <Pill status="received" label={`${row.grns.length} GRN${row.grns.length > 1 ? "s" : ""}`} />
            <div className="text-[10px] text-gray-400 mt-0.5">{row.shipmentCount} shipment{row.shipmentCount !== 1 ? "s" : ""}</div>
          </>
        ) : (
          <Pill status="waiting" label="No GRN" />
        )}
      </div>

      {/* Invoice */}
      <div className="w-20 shrink-0 hidden lg:block text-center">
        <Pill status={row.invoiceUploaded ? "uploaded" : "waiting"} label={row.invoiceUploaded ? "Uploaded" : "Pending"} />
      </div>

      {/* Verification */}
      <div className="w-24 shrink-0 hidden lg:block text-center">
        <Pill status={row.verificationStatus} label={cap(row.verificationStatus)} />
      </div>

      {/* L1 */}
      <div className="w-20 shrink-0 hidden xl:block text-center">
        <Pill status={row.l1Status} label={cap(row.l1Status)} />
      </div>

      {/* L2 */}
      <div className="w-20 shrink-0 hidden xl:block text-center">
        {row.hasL2
          ? <Pill status={row.l2Status} label={cap(row.l2Status)} />
          : <span className="text-[12px] text-gray-300 dark:text-gray-600">—</span>}
      </div>

      {/* Payment */}
      <div className="w-24 shrink-0 hidden md:block text-center">
        <Pill status={row.paymentStatus} label={cap(row.paymentStatus)} />
        {row.totalPaid > 0 ? (
          <div className="text-[10px] text-emerald-500 mt-0.5 font-mono tabular-nums">{fmtCur(row.totalPaid)}</div>
        ) : row.poTotalValue > 0 ? (
          <div className="text-[10px] text-gray-400 mt-0.5 font-mono tabular-nums">{fmtCur(row.poTotalValue)}</div>
        ) : null}
      </div>

      {/* Overall */}
      <div className="w-36 shrink-0 text-right">
        <Pill status={row.overallStatus} label={row.overallStatus} />
      </div>
    </button>

    <AnimatePresence>
      {expanded && (
        <ExpandedContent row={row} onViewPO={onViewPO} onViewGRN={onViewGRN} />
      )}
    </AnimatePresence>
  </div>
));

function KPICard({ label, value, sub, Icon, color, active, onClick }) {
  return (
    <button onClick={onClick} className={cn(
      "bg-white dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 flex items-center gap-3.5 text-left transition-all duration-200 hover:shadow-md w-full",
      active && "ring-2 ring-primary ring-offset-1 dark:ring-offset-gray-900"
    )}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", KPI_ICON_CLS[color] || KPI_ICON_CLS.blue)}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide truncate mb-0.5">{label}</p>
        <p className="text-[20px] font-black text-gray-900 dark:text-white tabular-nums leading-none">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{sub}</p>}
      </div>
    </button>
  );
}

/* ── Column header label row ─────────────────────────────────────────────── */
const COL_HEADERS = ["", "PO Number", "Vendor / Project", "Amount", "GRN", "Invoice", "Verification", "L1", "L2", "Payment", "Overall Status"];

/* ── Main component ──────────────────────────────────────────────────────── */
const TRACKER_CACHE_KEY = "tracker_cache_v1";
const TRACKER_CACHE_TTL = 8 * 60 * 1000; // 8 minutes

export function ProcurementTracker({ seedPos = [], seedGrns = [] }) {
  const { suppliers, settings } = useAppStore();

  // Seed from cache or from AccountsPage props for instant display
  const getInitial = (field, seed) => {
    if (seed?.length) return seed;
    try {
      const c = JSON.parse(localStorage.getItem(TRACKER_CACHE_KEY) || "null");
      if (c && Date.now() - c.ts < TRACKER_CACHE_TTL) return c[field] || [];
    } catch {}
    return [];
  };

  const [rawPos,      setRawPos]      = useState(() => getInitial("pos", seedPos));
  const [rawGrns,     setRawGrns]     = useState(() => getInitial("grns", seedGrns));
  const [rawAccounts, setRawAccounts] = useState([]);
  const [loading,     setLoading]     = useState(() => !getInitial("pos", seedPos).length);
  const [silentRefresh, setSilentRefresh] = useState(false);
  const [error,       setError]       = useState(null);
  const [refreshKey,  setRefreshKey]  = useState(0);

  const [search,         setSearch]         = useState("");
  const [filterCompany,  setFilterCompany]  = useState("");
  const [filterProject,  setFilterProject]  = useState("");
  const [filterVendor,   setFilterVendor]   = useState("");
  const [filterStatus,   setFilterStatus]   = useState("");
  const [startDate,      setStartDate]      = useState("");
  const [endDate,        setEndDate]        = useState("");
  const [expandedId,     setExpandedId]     = useState(null);
  const [viewPO,         setViewPO]         = useState(null);
  const [viewGRN,        setViewGRN]        = useState(null);

  // Sync seed props into state when AccountsPage refreshes its data
  useEffect(() => { if (seedPos?.length) setRawPos(seedPos); }, [seedPos]);
  useEffect(() => { if (seedGrns?.length) setRawGrns(seedGrns); }, [seedGrns]);

  useEffect(() => {
    let cancelled = false;
    const hasCache = rawPos.length > 0;
    if (!hasCache) setLoading(true); else setSilentRefresh(true);
    setError(null);

    Promise.all([
      api.get("pos?limit=500"),
      api.get("grn?limit=500&slim=1"),   // excludes photo arrays — ~70% smaller payload
    ]).then(([pr, gr]) => {
      if (cancelled) return;
      const pos = extractArr(pr);
      const grns = extractArr(gr);
      setRawPos(pos);
      setRawGrns(grns);
      // Save to cache for next visit
      try {
        localStorage.setItem(TRACKER_CACHE_KEY, JSON.stringify({ pos, grns, accounts: [], ts: Date.now() }));
      } catch {}
    }).catch(e => {
      if (!cancelled) setError(e?.message || "Failed to load data");
    }).finally(() => {
      if (!cancelled) { setLoading(false); setSilentRefresh(false); }
    });
    return () => { cancelled = true; };
  }, [refreshKey]);

  const grnsByPO = useMemo(() =>
    rawGrns.reduce((m, g) => {
      if (g.poId) { if (!m[g.poId]) m[g.poId] = []; m[g.poId].push(g); }
      return m;
    }, {}), [rawGrns]);

  const accountByPO = useMemo(() =>
    rawAccounts.reduce((m, a) => { if (a.poId) m[a.poId] = a; return m; }, {}),
  [rawAccounts]);

  const supplierMap = useMemo(() => {
    const m = new Map();
    for (const s of suppliers) {
      if (s.id) m.set(s.id, s);
      if (s._id) m.set(s._id, s);
    }
    return m;
  }, [suppliers]);

  const allRows = useMemo(() =>
    rawPos
      .filter(po => po.status !== "Draft" && po.status !== "Cancelled")
      .map(po => computeRow(po, grnsByPO[po.id] || [], accountByPO[po.id] || null, supplierMap)),
  [rawPos, grnsByPO, accountByPO, supplierMap]);

  const kpis = useMemo(() => {
    const r = allRows;
    const outstandingAmt = r.reduce((s, x) => s + x.outstanding, 0);
    const outstandingCount = r.filter(x => x.outstanding > 0).length;
    return [
      { label: "Total POs",         value: r.length,                                                              sub: "purchase orders",         Icon: ShoppingCart, color: "blue" },
      { label: "Shipments",         value: r.reduce((s, x) => s + x.shipmentCount, 0),                           sub: "across all POs",          Icon: Truck,        color: "indigo" },
      { label: "Invoice Pending",   value: r.filter(x => x.hasGRN && !x.invoiceUploaded).length,                 sub: "awaiting invoice upload",  Icon: FileText,     color: "amber",   filter: "Invoice Pending" },
      { label: "Pending Verify",    value: r.filter(x => x.overallStatus === "Verification Pending").length,      sub: "bills to verify",          Icon: Shield,       color: "orange",  filter: "Verification Pending" },
      { label: "Awaiting L1",       value: r.filter(x => x.overallStatus === "Awaiting L1").length,              sub: "L1 approval pending",      Icon: CheckCircle,  color: "purple",  filter: "Awaiting L1" },
      { label: "Awaiting L2",       value: r.filter(x => x.overallStatus === "Awaiting L2").length,              sub: "L2 approval pending",      Icon: CheckCircle,  color: "violet",  filter: "Awaiting L2" },
      { label: "Ready for Payment", value: r.filter(x => x.overallStatus === "Ready for Payment").length,         sub: "approved & ready",         Icon: CreditCard,   color: "emerald", filter: "Ready for Payment" },
      { label: "Completed",         value: r.filter(x => x.overallStatus === "Completed").length,                 sub: "fully processed",          Icon: CheckCircle2, color: "green",   filter: "Completed" },
      { label: "Outstanding",       value: outstandingCount,                                                      sub: fmtCur(outstandingAmt),     Icon: IndianRupee,  color: "red" },
    ];
  }, [allRows]);

  const companyOptions = useMemo(() => {
    const fromSettings = (settings?.companies || []).map(c => c.name).filter(Boolean);
    const fromPOs = rawPos.map(p => p.companyName).filter(Boolean);
    return [...new Set([...fromSettings, ...fromPOs])].sort().map(name => ({ label: name, value: name }));
  }, [settings?.companies, rawPos]);

  const projectOptions = useMemo(() => {
    const set = new Set(allRows.map(r => r.project).filter(p => p && p !== "—"));
    return [...set].sort().map(v => ({ value: v, label: v }));
  }, [allRows]);

  const vendorOptions = useMemo(() => {
    const set = new Set(allRows.map(r => r.supplierName).filter(s => s && s !== "—"));
    return [...set].sort().map(v => ({ value: v, label: v }));
  }, [allRows]);

  const statusOptions = [
    "Material Pending","Invoice Pending","Verification Pending",
    "Awaiting L1","Awaiting L2","Ready for Payment",
    "Partially Paid","Completed","Rejected",
  ].map(s => ({ value: s, label: s }));

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    return allRows.filter(row => {
      if (q) {
        const hit = row.po.id?.toLowerCase().includes(q)
          || row.supplierName.toLowerCase().includes(q)
          || row.project.toLowerCase().includes(q)
          || row.grns.some(g => g.id?.toLowerCase().includes(q) || g.challan?.toLowerCase().includes(q))
          || row.invoice?.number?.toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (filterCompany && row.po.companyName !== filterCompany) return false;
      if (filterProject && row.project !== filterProject) return false;
      if (filterVendor  && row.supplierName !== filterVendor) return false;
      if (filterStatus  && row.overallStatus !== filterStatus) return false;
      if (startDate && row.poDate && row.poDate < startDate) return false;
      if (endDate   && row.poDate && row.poDate > endDate)   return false;
      return true;
    });
  }, [allRows, search, filterCompany, filterProject, filterVendor, filterStatus, startDate, endDate]);


  const hasFilters = !!(search || filterCompany || filterProject || filterVendor || filterStatus || startDate || endDate);
  const clearAll   = useCallback(() => {
    setSearch(""); setFilterCompany(""); setFilterProject(""); setFilterVendor("");
    setFilterStatus(""); setStartDate(""); setEndDate("");
  }, []);

  const toggleRow = useCallback(id => setExpandedId(prev => prev === id ? null : id), []);

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-[1600px] mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white shadow-sm shadow-orange-500/30 shrink-0">
              <Activity style={{ width: 18, height: 18 }} />
            </div>
            Procurement Tracker
          </h1>
          <p className="text-[13px] text-gray-400 mt-0.5 ml-[42px]">
            Track the complete Procure-to-Pay lifecycle from Purchase Order to Payment
          </p>
        </div>
        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading || silentRefresh}
          className="inline-flex items-center gap-2 px-3 py-2 text-[12px] font-semibold rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 shrink-0 self-start"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", (loading || silentRefresh) && "animate-spin")} />
          {silentRefresh ? "Syncing…" : "Refresh"}
        </button>
      </div>

      {/* KPI Cards — Row 1: 5 cards, Row 2: 4 cards (both fill full width at desktop) */}
      {(() => {
        const renderCard = (k, i) => (
          <KPICard
            key={i}
            label={k.label}
            value={k.value}
            sub={k.sub}
            Icon={k.Icon}
            color={k.color}
            active={filterStatus === k.filter}
            onClick={() => k.filter && setFilterStatus(prev => prev === k.filter ? "" : k.filter)}
          />
        );
        if (loading) return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-[76px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[76px] bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
            </div>
          </div>
        );
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {kpis.slice(0, 5).map(renderCard)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {kpis.slice(5).map((k, i) => renderCard(k, i + 5))}
            </div>
          </div>
        );
      })()}

      {/* Filter bar */}
      <FilterRow showClear={hasFilters} onClearAll={clearAll}>
        <SearchFilter
          value={search}
          onChange={setSearch}
          placeholder="Search by PO ID, vendor name..."
          className="flex-1 min-w-[200px]"
        />
        <DateRangePicker
          value={{ start: startDate, end: endDate }}
          onChange={({ start, end }) => { setStartDate(start || ""); setEndDate(end || ""); }}
        />
        <SelectFilter placeholder="All Companies" value={filterCompany} onChange={setFilterCompany} options={companyOptions} searchable />
        <SelectFilter placeholder="All Projects"  value={filterProject} onChange={setFilterProject} options={projectOptions} searchable />
        <SelectFilter placeholder="All Vendors"   value={filterVendor}  onChange={setFilterVendor}  options={vendorOptions} searchable />
        <SelectFilter placeholder="Status"        value={filterStatus}  onChange={setFilterStatus}  options={statusOptions} />
        {hasFilters && (
          <button onClick={clearAll}
            className="text-[11px] font-semibold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors whitespace-nowrap">
            Clear all
          </button>
        )}
      </FilterRow>

      {/* Record count + hint */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-gray-500 dark:text-gray-400">
          {loading ? "Loading…" : `${filteredRows.length} record${filteredRows.length !== 1 ? "s" : ""}`}
          {!loading && filteredRows.length !== allRows.length && ` (filtered from ${allRows.length})`}
          {silentRefresh && <span className="ml-2 text-[11px] text-orange-400 font-normal">syncing…</span>}
        </p>
        <p className="text-[11px] text-gray-400 hidden sm:block">Click a row to expand details</p>
      </div>

      {/* Column labels — desktop only */}
      <div className="hidden xl:grid px-4 gap-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider"
        style={{ gridTemplateColumns: "16px 128px 1fr 100px 96px 80px 96px 80px 80px 96px 144px" }}>
        {COL_HEADERS.map(h => <span key={h}>{h}</span>)}
      </div>

      {/* Rows — virtualized for smooth scrolling with large datasets */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-400 opacity-60" />
          <p className="font-semibold text-red-500">{error}</p>
          <button onClick={() => setRefreshKey(k => k + 1)}
            className="mt-3 text-[13px] text-gray-400 hover:text-gray-600 underline">
            Try again
          </button>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">No records match your filters</p>
          <p className="text-[13px] mt-1">Try adjusting search or filter criteria</p>
          {hasFilters && (
            <button onClick={clearAll} className="mt-3 text-[13px] text-primary hover:underline">Clear filters</button>
          )}
        </div>
      ) : (
        <Virtuoso
          style={{ height: "calc(100vh - 480px)", minHeight: "400px" }}
          data={filteredRows}
          overscan={400}
          itemContent={(_, row) => (
            <div className="pb-2">
              <TrackerRow
                row={row}
                expanded={expandedId === row.id}
                onToggle={() => toggleRow(row.id)}
                onViewPO={() => setViewPO(row.po)}
                onViewGRN={(grn, grns) => setViewGRN({ grn, grns })}
              />
            </div>
          )}
        />
      )}

      {/* Modals */}
      {viewPO && <POViewModal po={viewPO} onClose={() => setViewPO(null)} />}
      {viewGRN && (
        <GRNDetailModal grn={viewGRN.grn} grns={viewGRN.grns} onClose={() => setViewGRN(null)} />
      )}
    </div>
  );
}
