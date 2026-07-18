var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useState, useEffect, useMemo, useRef } from "react";
import { useAppStore } from "../store";
import { motion, AnimatePresence } from "motion/react";
import { Virtuoso } from "react-virtuoso";
import {
  CheckCircle,
  Clock,
  ShieldAlert,
  XSquare,
  Info,
  Upload,
  Download,
  Search,
  Eye,
  ChevronDown,
  ChevronUp,
  History,
  AlertCircle,
  FileText,
  CreditCard,
  Package,
  IndianRupee,
  Check,
  RefreshCw,
  Pencil,
  Trash2,
  X
} from "lucide-react";
import { fmtCur, formatDate, calculatePriceComparison } from "../utils";
import { cn } from "../lib/utils";
import { generatePOPDF } from "../utils/pdfGenerator";
import { StatusBadge, PageHeader, Card, ConfirmModal, Modal, Btn } from "../components/ui";
import { SearchFilter, DateRangePicker, SelectFilter, FilterRow } from "../components/ui/Filters";
import { POViewModal } from "./po/POViewModal";
import { GRNDetailModal } from "../components/GRNDetailModal";
import { ImageViewer } from "../components/ImageViewer";
import { api } from "../services/api";
import { toast } from "react-hot-toast";
import emailjs from "@emailjs/browser";
import { DatePicker } from "../components/ui/DatePicker";
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";
emailjs.init(EMAILJS_PUBLIC_KEY);
const AccountsPage = /* @__PURE__ */ __name(() => {
  const { pos, updatePO, user, fetchResource, suppliers, uploadImage, hasPermission, settings } = useAppStore();
  const [filter, setFilter] = useState("All");
  const [selectedPO, setSelectedPO] = useState(null);
  const [previewPO, setPreviewPO] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [realGRN, setRealGRN] = useState(null);
  const [allGrns, setAllGrns] = useState([]);
  const [paymentForm, setPaymentForm] = useState({
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    mode: "NEFT",
    ref: "",
    amountPaid: 0,
    bank: "",
    utr: "",
    chequeNo: "",
    chequeDate: "",
    screenshot: null,
    previewUrl: "",
    remarks: "",
    fromCompany: "",
    toCompany: "",
    vendorBankDetails: null
  });
  const fileInputRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [deleteConfirmPO, setDeleteConfirmPO] = useState(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const [removeConfirmPO, setRemoveConfirmPO] = useState(null);
  const [isRemovingFromAccounts, setIsRemovingFromAccounts] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  useEffect(() => {
    if (!paymentForm.toCompany) return;
    const supplierName = paymentForm.toCompany.toLowerCase();
    const sup = suppliers.find(
      (s) => (s.companyName || "").toLowerCase() === supplierName || (s.name || "").toLowerCase() === supplierName || s.id.toLowerCase() === supplierName
    );
    if (sup) {
      const isBankEmpty = !paymentForm.vendorBankDetails?.accountNo || paymentForm.vendorBankDetails?.accountNo === "NA";
      if (isBankEmpty) {
        setPaymentForm((prev) => ({
          ...prev,
          vendorBankDetails: {
            accountHolder: sup.accountHolderName || sup.ownerName || "",
            bankName: sup.bankName || "",
            accountNo: sup.accountNumber || "",
            branchIFSC: `${sup.branch || ""}, ${sup.ifscCode || ""}`.trim().replace(/^,/, "").trim() || ""
          }
        }));
      }
    }
  }, [paymentForm.toCompany, suppliers]);
  const refresh = /* @__PURE__ */ __name(async () => {
    setIsRefreshing(true);
    const accountsFilter = {
      $or: [
        { accountStatus: { $exists: true, $ne: null } },
        { status: { $in: ["GRN Fulfilled", "GRN Variance", "Ready for Payment", "PO Closed"] } }
      ]
    };
    try {
      const [_, __, grnRes] = await Promise.all([
        fetchResource("pos", 1, 500, false, "", accountsFilter),
        fetchResource("suppliers", 1, 5000, true),
        api.get("grn", { limit: 1000 }).catch(() => ({ success: false })),
      ]);
      if (grnRes?.success && grnRes.data) setAllGrns(grnRes.data);
    } catch (err) {
      console.error(err);
    }
    setIsRefreshing(false);
  }, "refresh");
  useEffect(() => {
    refresh();
  }, [fetchResource]);

  // Returns the latest GRN that has not yet been linked to a payment installment.
  // Needed because a PO can have multiple GRN batches (multiple shipments).
  const getCurrentGRN = /* @__PURE__ */ __name((po, grns) => {
    const poGRNs = (grns || []).filter(g => g.poId === po.id);
    if (!poGRNs.length) return null;
    if (poGRNs.length === 1) return poGRNs[0];
    const sorted = [...poGRNs].sort((a, b) =>
      new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
    );
    const paidGRNIds = new Set((po.paymentHistory || []).map(ph => ph.grnId).filter(Boolean));
    return sorted.find(g => !paidGRNIds.has(g.id)) || sorted[0];
  }, "getCurrentGRN");

  // List view: always show PO Grand Total so user sees the full contract amount.
  // Cycle-specific payable (per GRN batch) is shown inside the drawer.
  const getPayableAmount = /* @__PURE__ */ __name((po) => {
    if ((po.accountStatus || "").toLowerCase() === "paid")
      return po.totalPaid || po.totalValue || 0;
    return po.totalValue || 0;
  }, "getPayableAmount");
  const getSupplierName = /* @__PURE__ */ __name((supplierIdOption) => {
    if (!supplierIdOption) return "Unknown Vendor";
    const s = suppliers.find(
      (sup) => sup.id === supplierIdOption || sup._id === supplierIdOption || (sup.companyName || "").toLowerCase() === supplierIdOption.toLowerCase() || (sup.name || "").toLowerCase() === supplierIdOption.toLowerCase()
    );
    return s?.companyName || supplierIdOption;
  }, "getSupplierName");
  const metrics = useMemo(() => {
    const all = pos || [];
    const pendingPayment = all.filter((p) => (p.accountStatus || "").toLowerCase() === "payment_pending").length;
    const pendingVerify = all.filter((p) => {
      const accStatus = (p.accountStatus || "").toLowerCase();
      const poStatus = (p.status || "").toLowerCase();
      if (accStatus === "bill_verify") return true;
      if (accStatus === "partial_paid" && ["grn fulfilled", "grn variance"].includes(poStatus)) return true;
      return !accStatus && ["grn fulfilled", "grn variance", "ready for payment"].includes(poStatus);
    }).length;
    const paidThisMonth = all.filter((p) => {
      const accStatus = (p.accountStatus || "").toLowerCase();
      if (accStatus !== "paid" || !p.payment?.date) return false;
      const d = new Date(p.payment.date);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalPaidAmount = paidThisMonth.reduce((sum, p) => sum + (p.payment?.amountPaid || 0), 0);
    const partialPaidCount = all.filter((p) => {
      const accStatus = (p.accountStatus || "").toLowerCase();
      const poStatus = (p.status || "").toLowerCase();
      return accStatus === "partial_paid" && poStatus !== "grn fulfilled";
    }).length;
    return {
      pendingPayment,
      pendingVerify,
      paidCount: paidThisMonth.length,
      totalPaidAmount,
      partialPaidCount,
      rejectedCount: all.filter((p) => (p.accountStatus || "").toLowerCase() === "rejected").length
    };
  }, [pos]);
  const vendorOptions = useMemo(
    () => suppliers.map((s) => ({ label: s.companyName || s.name || s.id, value: s.id || s._id })),
    [suppliers]
  );
  const projectOptions = useMemo(
    () => [...new Set((pos || []).map((p) => p.project || p.location).filter(Boolean))].map((v) => ({ label: v, value: v })),
    [pos]
  );
  const filteredPOs = useMemo(() => {
    const all = pos || [];
    return all.filter((p) => {
      const accStatus = (p.accountStatus || "").toLowerCase();
      const poStatus = (p.status || "").toLowerCase();
      let status = accStatus;
      if (!status) {
        if (["grn fulfilled", "grn variance", "ready for payment"].includes(poStatus)) status = "bill_verify";
        else status = "other";
      }
      if (accStatus === "partial_paid") {
        const totalPd = p.totalPaid || p.payment?.amountPaid || 0;
        // Sum value across ALL GRN batches for this PO
        const poGRNs = allGrns.filter(g => g.poId === p.id);
        const gv = poGRNs.reduce((total, grn) =>
          total + grn.items.reduce((s, gi) => {
            const rcv = gi.received ?? gi.qty ?? 0;
            const rate = p.items?.find(pi => (pi.sku && pi.sku === gi.sku) || (pi.materialName || "").toLowerCase() === (gi.itemName || "").toLowerCase())?.rate || gi.rate || 0;
            return s + rcv * rate;
          }, 0)
        , 0);
        status = (gv > totalPd + 1 || poStatus === "grn fulfilled") ? "bill_verify" : "partial_paid";
      }
      if (filter === "All" && !["bill_verify", "payment_pending", "paid", "partial_paid", "rejected"].includes(status)) return false;
      if (filter === "Verify Bills" && status !== "bill_verify") return false;
      if (filter === "Pending Payment" && status !== "payment_pending") return false;
      if (filter === "Paid" && status !== "paid") return false;
      if (filter === "Partial Paid" && status !== "partial_paid") return false;
      if (filter === "Rejected" && status !== "rejected") return false;
      if (search) {
        const q = search.trim().toLowerCase();
        if (!p.id?.toLowerCase().includes(q) && !getSupplierName(p.supplier).toLowerCase().includes(q)) return false;
      }
      if (startDate || endDate) {
        const d = p.createdAt ? new Date(p.createdAt) : null;
        if (!d) return false;
        if (startDate && d < new Date(startDate)) return false;
        if (endDate && d > new Date(endDate + "T23:59:59")) return false;
      }
      if (filterVendor) {
        const sup = suppliers.find((s) => s.id === p.supplier || s._id === p.supplier);
        if ((sup?.id || sup?._id) !== filterVendor && p.supplier !== filterVendor) return false;
      }
      if (filterProject && (p.project || p.location) !== filterProject) return false;
      return true;
    });
  }, [pos, allGrns, filter, search, startDate, endDate, filterVendor, filterProject, suppliers]);
  const handleBillApprove = /* @__PURE__ */ __name(async (poId) => {
    if (!hasPermission("VERIFY_BILL")) {
      toast.error("Unauthorized: Access to verify bills is restricted.");
      return;
    }
    setIsSubmitting(true);
    try {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const po = pos.find((p) => p.id === poId);
      const audit = {
        timestamp,
        action: "bill_approved",
        po_number: poId,
        done_by: user?.name || "System",
        amount: po?.totalValue || 0
      };
      await updatePO(poId, {
        accountStatus: "payment_pending",
        billApprovedBy: user?.name || "Finance Dept",
        billApprovedDate: timestamp,
        auditTrail: [...po?.auditTrail || [], audit]
      });
      toast.success("Bill approved! Moved to pending payment state.");
      setSelectedPO(null);
    } catch (err) {
      toast.error("Failed to approve bill.");
    } finally {
      setIsSubmitting(false);
    }
  }, "handleBillApprove");

  const handleRevokeApproval = /* @__PURE__ */ __name(async (poId) => {
    if (!hasPermission("VERIFY_BILL")) {
      toast.error("Unauthorized: Access to verify bills is restricted.");
      return;
    }
    setIsSubmitting(true);
    try {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const po = pos.find((p) => p.id === poId);
      
      const isRevertingRemaining = po.payment?.isPartial || po.payment?.partialAmount;
      const newStatus = isRevertingRemaining ? "partial_paid" : null;

      const audit = {
        timestamp,
        action: "approval_revised",
        po_number: poId,
        done_by: user?.name || "System",
        amount: po?.totalValue || 0,
        details: { note: "Approval revoked for revision" }
      };
      
      await updatePO(poId, {
        accountStatus: newStatus,
        billApprovedBy: null,
        billApprovedDate: null,
        auditTrail: [...po?.auditTrail || [], audit]
      });
      toast.success("Approval revoked. Bill sent back for verification.");
      setSelectedPO(null);
    } catch (err) {
      toast.error("Failed to revoke approval.");
    } finally {
      setIsSubmitting(false);
    }
  }, "handleRevokeApproval");
  const handleBillReject = /* @__PURE__ */ __name(async (poId) => {
    if (!hasPermission("REJECT_BILL")) {
      toast.error("Unauthorized: Access to reject bills is restricted.");
      return;
    }
    if (!rejectionReason) {
      toast.error("Please provide a rejection reason.");
      return;
    }
    setIsSubmitting(true);
    try {
      const po = pos.find((p) => p.id === poId);
      const audit = {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        action: "bill_rejected",
        po_number: poId,
        done_by: user?.name || "System",
        amount: po?.totalValue || 0,
        details: { reason: rejectionReason }
      };
      await updatePO(poId, {
        accountStatus: "rejected",
        rejectionReason,
        auditTrail: [...po?.auditTrail || [], audit]
      });
      toast.success("Bill has been rejected.");
      setShowRejectForm(false);
      setRejectionReason("");
      setSelectedPO(null);
    } catch (err) {
      toast.error("Failed to reject bill.");
    } finally {
      setIsSubmitting(false);
    }
  }, "handleBillReject");
  const handlePaymentSubmit = /* @__PURE__ */ __name(async (poId) => {
    if (!hasPermission("MAKE_PAYMENT")) {
      toast.error("Unauthorized: Access to process payments is restricted.");
      return;
    }
    const required = ["date", "mode", "ref", "amountPaid", "bank"];
    if (paymentForm.mode === "NEFT" || paymentForm.mode === "RTGS") required.push("utr");
    if (paymentForm.mode === "Cheque") required.push("chequeNo", "chequeDate");
    if (!paymentForm.screenshot && !paymentForm.previewUrl) {
      toast.error("Tally payment screenshot is mandatory.");
      return;
    }
    const fieldLabels = { date: "Payment Date", mode: "Payment Mode", ref: "Voucher Ref (ERP/Tally PV)", amountPaid: "Amount Paid", bank: "Debit Bank Account", utr: "UTR / Reference ID", chequeNo: "Cheque No.", chequeDate: "Cheque Date" };
    const missing = required.filter((f) => !paymentForm[f]);
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.map(f => fieldLabels[f] || f).join(", ")}`);
      return;
    }
    setIsSubmitting(true);
    try {
      const po = pos.find((p) => p.id === poId);
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      let screenshotUrl = paymentForm.previewUrl;
      if (paymentForm.screenshot) {
        try {
          const uploadRes = await uploadImage(paymentForm.screenshot);
          if (uploadRes && uploadRes.url) {
            screenshotUrl = uploadRes.url;
          } else {
            throw new Error("No URL returned from upload");
          }
        } catch (err) {
          console.error("Screenshot upload failed", err);
          toast.error(`Screenshot upload failed: ${err.message || "Unknown error"}. Proceeding with preview as backup.`);
        }
      }
      const { screenshot, previewUrl, ...serializableForm } = paymentForm;
      const paymentData = {
        ...serializableForm,
        paidBy: user?.name || "Amit Sharma",
        screenshotUrl,
        screenshotName: screenshot?.name || "payment_proof.png"
      };
      // Compute cumulative paid and determine if this closes the PO
      const prevTotalPaid = po?.totalPaid || po?.payment?.amountPaid || 0;
      const poGrandTotal = po?.totalValue || 0;
      const remainingPayable = Math.max(0, poGrandTotal - prevTotalPaid);
      // Hard cap: total paid must never exceed PO grand total
      if (paymentData.amountPaid > remainingPayable + 0.01) {
        toast.error(`Amount ₹${paymentData.amountPaid.toLocaleString("en-IN")} exceeds remaining payable ₹${remainingPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}. Please correct the amount.`);
        setIsSubmitting(false);
        return;
      }
      const newTotalPaid = prevTotalPaid + paymentData.amountPaid;
      const isFullyPaid = newTotalPaid >= poGrandTotal - 0.01;
      const newAccountStatus = isFullyPaid ? "paid" : "partial_paid";
      // Build history entry for this installment (link to current unpaid GRN batch)
      const rGrnForPayment = getCurrentGRN(po, allGrns);
      const grnValForPayment = rGrnForPayment ? rGrnForPayment.items.reduce((s, gi) => {
        const rcv = gi.received ?? gi.qty ?? 0;
        const rate = gi.rate || po?.items?.find(pi => (pi.sku && pi.sku === gi.sku) || (pi.materialName || "").toLowerCase() === (gi.itemName || "").toLowerCase())?.rate || 0;
        return s + rcv * rate;
      }, 0) : 0;
      const newEntry = {
        installmentNo: (po?.paymentHistory?.length || 0) + 1,
        grnId: rGrnForPayment?.id || null,
        grnReceivedValue: Math.round(grnValForPayment * 100) / 100,
        amountPaid: paymentData.amountPaid,
        date: paymentData.date,
        timestamp,
        mode: paymentData.mode,
        ref: paymentData.ref || "",
        bank: paymentData.bank || "",
        utr: paymentData.utr || "",
        chequeNo: paymentData.chequeNo || "",
        paidBy: paymentData.paidBy,
        screenshotUrl: paymentData.screenshotUrl || "",
        remarks: paymentData.remarks || "",
      };
      const audit = {
        timestamp,
        action: isFullyPaid ? "payment_submitted" : "partial_payment_submitted",
        po_number: poId,
        done_by: user?.name || "System",
        amount: paymentForm.amountPaid,
        details: { mode: paymentForm.mode, ref: paymentForm.ref, installmentNo: newEntry.installmentNo }
      };
      await updatePO(poId, {
        accountStatus: newAccountStatus,
        paymentHistory: [...(po?.paymentHistory || []), newEntry],
        totalPaid: newTotalPaid,
        payment: { ...paymentData, amountPaid: newTotalPaid, isPartial: !isFullyPaid, partialAmount: prevTotalPaid || paymentData.amountPaid },
        auditTrail: [...(po?.auditTrail || []), audit]
      });
      toast.success(isFullyPaid
        ? "Payment confirmed! PO fully settled."
        : `Installment #${newEntry.installmentNo} recorded. ₹${(po?.totalValue - newTotalPaid).toLocaleString("en-IN", { maximumFractionDigits: 2 })} remaining — will activate on next GRN batch.`);
      setSelectedPO(null);
      setIsEditingPayment(false);
    } catch (err) {
      console.error("Payment submission error", err);
      toast.error("Failed to process payment. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }, "handlePaymentSubmit");
  const handleEditPayment = /* @__PURE__ */ __name(async (e, po) => {
    e.stopPropagation();
    const sup = suppliers.find((s) => s.id === po.supplier || s._id === po.supplier);
    // Use last paymentHistory installment if available, else fall back to legacy po.payment
    const lastInstallment = po.paymentHistory?.length > 0
      ? po.paymentHistory[po.paymentHistory.length - 1]
      : null;
    const src = lastInstallment || po.payment || {};
    const prevTotalPaid = po.totalPaid || po.payment?.amountPaid || 0;
    const remainingBalance = Math.max(0, (po.totalValue || 0) - prevTotalPaid);
    setPaymentForm({
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      mode: src.mode || "NEFT",
      ref: "",
      amountPaid: remainingBalance > 0 ? remainingBalance : po.totalValue,
      bank: src.bank || "",
      utr: src.utr || "",
      chequeNo: src.chequeNo || "",
      chequeDate: src.chequeDate || "",
      screenshot: null,
      previewUrl: src.screenshotUrl || "",
      remarks: src.remarks || "",
      fromCompany: src.fromCompany || po.companyName || "Our Company",
      toCompany: src.toCompany || sup?.companyName || po.supplier || "Unknown Vendor",
      vendorBankDetails: po.vendorBankDetails || (sup ? {
        accountHolder: sup.accountHolderName || sup.ownerName || "",
        bankName: sup.bankName || "",
        accountNo: sup.accountNumber || "",
        branchIFSC: `${sup.branch || ""}, ${sup.ifscCode || ""}`.trim().replace(/^,/, "").trim() || ""
      } : null)
    });
    setShowRejectForm(false);
    setIsEditingPayment(true);
    setRealGRN(null);
    setSelectedPO(po);
    try {
      const grnRes = await api.get("grn", { filter: JSON.stringify({ poId: po.id }), limit: 100 });
      if (grnRes.success && grnRes.data?.length > 0) {
        const sorted = [...grnRes.data].sort((a, b) =>
          new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
        );
        const paidGRNIds = new Set((po.paymentHistory || []).map(ph => ph.grnId).filter(Boolean));
        setRealGRN(sorted.find(g => !paidGRNIds.has(g.id)) || sorted[0]);
      }
    } catch {}
  }, "handleEditPayment");
  const handleDeletePayment = /* @__PURE__ */ __name(async () => {
    if (!deleteConfirmPO) return;
    setIsDeletingPayment(true);
    try {
      await updatePO(deleteConfirmPO.id, { accountStatus: null, payment: null, totalPaid: 0, paymentHistory: [] });
      toast.success("Payment entry deleted. PO reverted to bill verification.");
      setDeleteConfirmPO(null);
      if (selectedPO?.id === deleteConfirmPO.id) setSelectedPO(null);
    } catch {
      toast.error("Failed to delete payment entry.");
    } finally {
      setIsDeletingPayment(false);
    }
  }, "handleDeletePayment");
  const handleRemoveFromAccounts = /* @__PURE__ */ __name(async () => {
    if (!removeConfirmPO) return;
    setIsRemovingFromAccounts(true);
    try {
      await updatePO(removeConfirmPO.id, { accountStatus: null, payment: null, totalPaid: 0, paymentHistory: [] });
      toast.success(`${removeConfirmPO.id} removed from Accounts.`);
      setRemoveConfirmPO(null);
      if (selectedPO?.id === removeConfirmPO.id) setSelectedPO(null);
    } catch (err) {
      toast.error("Failed to remove from accounts.");
    } finally {
      setIsRemovingFromAccounts(false);
    }
  }, "handleRemoveFromAccounts");

  const handlePrintPaymentAdvice = /* @__PURE__ */ __name((po) => {
    const supplierName = getSupplierName(po.supplier);
    const fmtD = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "—";
    const fmtA = (n) => n != null ? "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—";
    const vbd = po.payment?.vendorBankDetails;
    const installments = po.paymentHistory?.length > 0 ? po.paymentHistory : (po.payment ? [{
      installmentNo: 1, amountPaid: po.payment.amountPaid, date: po.payment.date,
      mode: po.payment.mode, ref: po.payment.ref, bank: po.payment.bank,
      utr: po.payment.utr, paidBy: po.payment.paidBy, grnReceivedValue: po.payment.grnReceivedValue
    }] : []);

    const installmentsHTML = installments.map((ph, i) => `
      <tr style="background:${i % 2 === 0 ? "#F8FAFC" : "#FFFFFF"}">
        <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;color:#374151;font-size:11px">#${ph.installmentNo || i+1}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;color:#374151;font-size:11px">${fmtD(ph.date)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;color:#374151;font-size:11px">${ph.mode || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;color:#374151;font-size:11px">${ph.ref || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;color:#374151;font-size:11px">${ph.utr || ph.bank || "—"}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:700;color:#1E3A5F;font-size:11px;font-variant-numeric:tabular-nums">${fmtA(ph.amountPaid)}</td>
      </tr>`).join("");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
      <title>Payment Advice — ${po.id}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#1F2937;background:#fff;padding:0}
        .page{max-width:900px;margin:0 auto;padding:30px 40px}
        /* Header */
        .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:3px solid #1E3A5F;margin-bottom:16px}
        .company-name{font-size:19px;font-weight:800;color:#1E3A5F;letter-spacing:-0.5px}
        .company-sub{font-size:10px;color:#6B7280;margin-top:2px}
        .doc-badge{text-align:right}
        .doc-title{font-size:17px;font-weight:900;color:#1E3A5F;letter-spacing:1px;text-transform:uppercase}
        .doc-ref{font-size:10px;color:#6B7280;margin-top:3px}
        /* Status strip */
        .status-strip{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:7px 14px;display:flex;align-items:center;gap:8px;margin-bottom:14px}
        .status-dot{width:8px;height:8px;border-radius:50%;background:#16A34A;flex-shrink:0}
        .status-text{font-size:11px;font-weight:700;color:#1E3A5F}
        /* Section */
        .section{margin-bottom:14px}
        .section-title{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;color:#6B7280;border-bottom:1px solid #E5E7EB;padding-bottom:4px;margin-bottom:8px}
        /* Grid fields */
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px 28px}
        .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px 20px}
        .field-label{font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:1px}
        .field-value{font-size:12px;font-weight:600;color:#111827}
        .field-value.accent{color:#1E3A5F;font-weight:800}
        .field-value.big{font-size:15px;font-weight:900;color:#1E3A5F;letter-spacing:-0.3px}
        /* Table */
        table{width:100%;border-collapse:collapse;font-size:11px}
        thead tr{background:#1E3A5F}
        thead th{padding:7px 10px;text-align:left;color:#fff;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:0.8px}
        thead th:last-child{text-align:right}
        tfoot tr{background:#1E3A5F}
        tfoot td{padding:7px 10px;color:#fff;font-weight:800;font-size:11px}
        tfoot td:last-child{text-align:right;font-size:12px}
        /* Divider */
        .divider{border:none;border-top:1px solid #E5E7EB;margin:12px 0}
        /* Footer */
        .footer{margin-top:12px;padding-top:12px;border-top:2px solid #1E3A5F;display:flex;justify-content:space-between;align-items:flex-end}
        .sig-block{text-align:center;min-width:140px}
        .sig-line{border-top:1px solid #374151;padding-top:5px;font-size:9px;font-weight:700;color:#6B7280;text-transform:uppercase;letter-spacing:0.8px;margin-top:24px}
        .watermark-paid{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:100px;font-weight:900;color:rgba(22,163,74,0.07);pointer-events:none;z-index:0;white-space:nowrap}
        .content{position:relative;z-index:1}
        @media print{body{padding:0}@page{margin:10mm 12mm;size:A4}}
      </style></head><body>
      <div class="watermark-paid">PAID</div>
      <div class="page content">
        <!-- Header -->
        <div class="hdr">
          <div>
            <div class="company-name">${po.payment?.fromCompany || "Neoteric Group"}</div>
            <div class="company-sub">Accounts & Finance Department</div>
          </div>
          <div class="doc-badge">
            <div class="doc-title">Payment Advice</div>
            <div class="doc-ref">Ref: ${po.id} &nbsp;|&nbsp; ${fmtD(new Date().toISOString())}</div>
          </div>
        </div>

        <div class="status-strip">
          <div class="status-dot"></div>
          <div class="status-text">PAYMENT CONFIRMED &nbsp;·&nbsp; Synced with Tally ERP &nbsp;·&nbsp; Total Disbursed: ${fmtA(po.totalPaid || po.payment?.amountPaid || po.totalValue)}</div>
        </div>

        <!-- PO & Invoice Info -->
        <div class="section">
          <div class="section-title">Purchase Order &amp; Invoice Details</div>
          <div class="grid3">
            <div><div class="field-label">PO Number</div><div class="field-value accent">${po.id}</div></div>
            <div><div class="field-label">Invoice No.</div><div class="field-value">${po.invoice?.number || "—"}</div></div>
            <div><div class="field-label">Invoice Date</div><div class="field-value">${fmtD(po.invoice?.date)}</div></div>
            <div><div class="field-label">Vendor / Supplier</div><div class="field-value">${supplierName}</div></div>
            <div><div class="field-label">PO Date</div><div class="field-value">${fmtD(po.date)}</div></div>
            <div><div class="field-label">GRN Reference</div><div class="field-value">${po.grn?.number || (po.paymentHistory?.[0]?.grnId) || "—"}</div></div>
          </div>
        </div>

        <!-- Amount Summary -->
        <div class="section">
          <div class="section-title">Payment Summary</div>
          <div class="grid3">
            <div><div class="field-label">PO Grand Total</div><div class="field-value big">${fmtA(po.totalValue)}</div></div>
            <div><div class="field-label">Total Disbursed</div><div class="field-value big" style="color:#16A34A">${fmtA(po.totalPaid || po.payment?.amountPaid)}</div></div>
            <div><div class="field-label">Balance Outstanding</div><div class="field-value big" style="color:${Math.max(0,(po.totalValue||0)-(po.totalPaid||po.payment?.amountPaid||0)) > 0.01 ? "#DC2626" : "#16A34A"}">${fmtA(Math.max(0,(po.totalValue||0)-(po.totalPaid||po.payment?.amountPaid||0)))}</div></div>
          </div>
        </div>

        <!-- Installments Table -->
        ${installments.length > 0 ? `<div class="section">
          <div class="section-title">Payment Installments</div>
          <table>
            <thead><tr>
              <th>#</th><th>Date</th><th>Mode</th><th>Voucher Ref</th><th>UTR / Bank</th><th style="text-align:right">Amount Paid</th>
            </tr></thead>
            <tbody>${installmentsHTML}</tbody>
            <tfoot><tr>
              <td colspan="5" style="font-size:11px;letter-spacing:0.5px">TOTAL DISBURSED</td>
              <td>${fmtA(po.totalPaid || po.payment?.amountPaid)}</td>
            </tr></tfoot>
          </table>
        </div>` : ""}

        <!-- Beneficiary bank -->
        ${vbd ? `<div class="section">
          <div class="section-title">Beneficiary Bank Details</div>
          <div class="grid2">
            <div><div class="field-label">Account Holder</div><div class="field-value">${vbd.accountHolder || "—"}</div></div>
            <div><div class="field-label">Bank Name</div><div class="field-value">${vbd.bankName || "—"}</div></div>
            <div><div class="field-label">Account Number</div><div class="field-value">${vbd.accountNo || "—"}</div></div>
            <div><div class="field-label">IFSC / Branch</div><div class="field-value">${vbd.branchIFSC || "—"}</div></div>
          </div>
        </div>` : ""}

        <!-- Internal Tracking -->
        <div class="section">
          <div class="section-title">Internal Authorisation</div>
          <div class="grid3">
            <div><div class="field-label">Bill Approved By</div><div class="field-value">${po.billApprovedBy || "Accounts Manager"}</div></div>
            <div><div class="field-label">Approved On</div><div class="field-value">${fmtD(po.billApprovedAt || po.billApprovedDate)}</div></div>
            <div><div class="field-label">Paid By</div><div class="field-value">${po.payment?.paidBy || "—"}</div></div>
          </div>
        </div>

        <hr class="divider"/>

        <!-- Footer -->
        <div class="footer">
          <div style="font-size:10px;color:#9CA3AF;max-width:320px">
            This is a system-generated Payment Advice from the IMS Portal. No signature is required for digital records.
            Retain this document for your accounting and audit records.
          </div>
          <div class="sig-block">
            <div class="sig-line">Authorised Signatory</div>
          </div>
        </div>
      </div>
      <script>window.onload=function(){window.print()}<\/script>
    </body></html>`;

    const w = window.open("", "_blank", "width=1000,height=750");
    if (w) { w.document.write(html); w.document.close(); }
  }, "handlePrintPaymentAdvice");

  const handleFileChange = /* @__PURE__ */ __name((e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPaymentForm({ ...paymentForm, screenshot: file, previewUrl: url });
    }
  }, "handleFileChange");
  return <div className="space-y-6">
      <PageHeader
    title="Account Payment"
    sub="Verify bills and process vendor payments"
    actions={null}
  />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "To Verify", value: metrics.pendingVerify, sub: "Bills awaiting verification", icon: ShieldAlert, iconCls: "bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400" },
          { label: "Payment Pending", value: metrics.pendingPayment, sub: "Approved, awaiting payment", icon: Clock, iconCls: "bg-orange-50 dark:bg-orange-500/10 text-orange-500 dark:text-orange-400" },
          { label: "Partial Paid", value: metrics.partialPaidCount, sub: "GRN variance — awaiting balance", icon: IndianRupee, iconCls: "bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400" },
          { label: "Paid This Month", value: metrics.paidCount, sub: fmtCur(metrics.totalPaidAmount), icon: CheckCircle, iconCls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400" },
          { label: "Rejected", value: metrics.rejectedCount, sub: "Bills rejected", icon: XSquare, iconCls: "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400" },
        ].map(({ label, value, sub, icon: Icon, iconCls }) => (
          <div key={label} className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm p-3.5 flex items-center gap-3">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconCls)}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 truncate">{label}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums leading-tight">{value}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Bar + Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit overflow-x-auto no-scrollbar">
          {[
            ["All", "All", 0],
            ["Verify Bills", "To Verify", metrics.pendingVerify],
            ["Pending Payment", "Pending Payment", metrics.pendingPayment],
            ["Partial Paid", "Partial Paid", metrics.partialPaidCount],
            ["Paid", "Paid", metrics.paidCount],
            ["Rejected", "Rejected", metrics.rejectedCount],
          ].map(([tab, label, count]) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                filter === tab
                  ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[10px] font-black leading-none">{count}</span>
              )}
            </button>
          ))}
        </div>
        <FilterRow
          showClear={!!(search || startDate || endDate || filterVendor || filterProject)}
          onClearAll={() => { setSearch(""); setStartDate(""); setEndDate(""); setFilterVendor(""); setFilterProject(""); }}
        >
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search by PO ID, vendor name..."
            className="flex-1 min-w-[200px]"
          />
          <DateRangePicker
            value={{ start: startDate, end: endDate }}
            onChange={(v) => { setStartDate(v.start); setEndDate(v.end); }}
          />
          <SelectFilter
            value={filterProject}
            onChange={setFilterProject}
            options={projectOptions}
            placeholder="All Projects"
            searchable
          />
          <SelectFilter
            value={filterVendor}
            onChange={setFilterVendor}
            options={vendorOptions}
            placeholder="All Vendors"
            searchable
          />
        </FilterRow>
      </div>

      {
    /* Table */
  }
      <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="overflow-x-auto overflow-y-hidden">
          <div className="min-w-[900px]">
            <div className="grid grid-cols-[1.5fr_2fr_1.5fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md text-[10px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap tracking-wider">
              <div className="pl-2 sm:pl-4">PO records</div>
              <div className="hidden lg:block">Vendor name</div>
              <div className="hidden sm:block text-right">Amount (₹)</div>
              <div className="hidden lg:block text-center">GRN</div>
              <div className="hidden sm:block text-center">Status</div>
              <div className="hidden md:block text-right">Date</div>
              <div className="hidden md:block text-right pr-2 sm:pr-4">Actions</div>
            </div>
            
            {filteredPOs.length === 0 ? <div className="py-24 text-center">
                <div className="flex flex-col items-center gap-4 text-gray-400">
                  <Search className="w-12 h-12 opacity-20" />
                  <p className="font-bold text-[13px]">No records found matching filter</p>
                </div>
              </div> : <Virtuoso
    style={{ height: "calc(100vh - 380px)", minHeight: "400px" }}
    data={filteredPOs}
    itemContent={(_index, po) => <div
      onClick={async () => {
        setSelectedPO(po);
        setShowRejectForm(false);
        setRealGRN(null);
        try {
          // Fetch ALL GRNs for this PO (multiple shipments possible)
          const grnRes = await api.get("grn", { filter: JSON.stringify({ poId: po.id }), limit: 100 });
          if (grnRes.success && grnRes.data?.length > 0) {
            const sorted = [...grnRes.data].sort((a, b) =>
              new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
            );
            const paidGRNIds = new Set((po.paymentHistory || []).map(ph => ph.grnId).filter(Boolean));
            setRealGRN(sorted.find(g => !paidGRNIds.has(g.id)) || sorted[0]);
          }
        } catch (err) {
          console.error("Failed to fetch GRN for PO", err);
        }
        const sup = suppliers.find(
          (s) => s.id === po.supplier || s._id === po.supplier || (s.companyName || "").toLowerCase() === (po.supplier || "").toLowerCase() || (s.name || "").toLowerCase() === (po.supplier || "").toLowerCase()
        );
        const _accSt = (po.accountStatus || "").toLowerCase();
        const _poSt = (po.status || "").toLowerCase();
        const _isRemaining = (_accSt === "partial_paid" || (_accSt === "payment_pending" && po.payment?.isPartial)) && _poSt === "grn fulfilled";
        const _priorPartial = _isRemaining ? (po.payment?.partialAmount || 0) : 0;
        const _initAmt = _isRemaining && _priorPartial > 0 ? Math.max(0, (po.totalValue || 0) - _priorPartial) : (po.totalValue || 0);
        setPaymentForm((prev) => ({
          ...prev,
          amountPaid: _initAmt,
          fromCompany: po.companyName || "Our Company",
          toCompany: sup?.companyName || po.supplier || "Unknown Vendor",
          vendorBankDetails: po.vendorBankDetails ? { ...po.vendorBankDetails } : sup ? {
            accountHolder: sup.accountHolderName || sup.ownerName || "",
            bankName: sup.bankName || "",
            accountNo: sup.accountNumber || "",
            branchIFSC: `${sup.branch || ""}, ${sup.ifscCode || ""}`.trim().replace(/^,/, "").replace(/,$/, "").trim() || ""
          } : {
            accountHolder: "",
            bankName: "",
            accountNo: "",
            branchIFSC: ""
          },
          utr: "",
          chequeNo: "",
          chequeDate: "",
          ref: "",
          remarks: "",
          previewUrl: "",
          screenshot: null
        }));
      }}
      className="grid grid-cols-[1.5fr_2fr_1.5fr_1fr_1fr_1fr_80px] gap-4 px-4 py-3 border-b border-gray-50 dark:border-gray-800/80 hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors cursor-pointer items-center group"
    >
                    <div className="pl-2 sm:pl-4 flex flex-col justify-center">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 dark:text-white font-black text-[13px] sm:text-[14px] tracking-tight whitespace-nowrap truncate max-w-[120px] sm:max-w-[160px]">{po.id}</span>

                      </div>
                      <div className="sm:hidden mt-2 flex items-center gap-2">
                        <StatusBadge status={po.status} accountStatus={po.accountStatus || (po.status === "Approved" ? "bill_verify" : void 0)} />
                      </div>
                    </div>
                    
                    <div className="hidden lg:flex items-center">
                      <p className="text-[12px] sm:text-[13px] font-bold text-gray-700 dark:text-[#CBD5E1] truncate pr-4" title={getSupplierName(po.supplier)}>
                        {getSupplierName(po.supplier)}
                      </p>
                    </div>
                    
                    <div className="hidden sm:flex items-center justify-end">
                      <p className="text-[13px] sm:text-sm font-black text-gray-900 dark:text-[#F1F5F9] tabular-nums whitespace-nowrap truncate">
                        {fmtCur(getPayableAmount(po))}
                      </p>
                    </div>
                    
                    <div className="hidden lg:flex items-center justify-center">
                      <StatusBadge status={po.status} />
                    </div>

                    <div className="hidden sm:flex items-center justify-center">
                      <StatusBadge status={
                        po.accountStatus === "payment_pending" ? "Payment Pending"
                        : po.accountStatus === "paid" ? "Paid"
                        : po.accountStatus === "partial_paid" && (po.status || "").toLowerCase() === "grn fulfilled" ? "To Verify"
                        : po.accountStatus === "partial_paid" ? "Partial Paid"
                        : po.accountStatus === "rejected" ? "Rejected"
                        : "To Verify"
                      } />
                    </div>
                    
                    <div className="hidden md:flex items-center justify-end">
                      <p className="text-[10px] sm:text-[11px] font-bold text-gray-400 dark:text-[#64748B] whitespace-nowrap font-mono truncate">
                        {formatDate(po.date)}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center justify-end gap-1 pr-2 sm:pr-4">
                      {["paid", "partial_paid"].includes(po.accountStatus) && (
                        <button
                          onClick={(e) => handleEditPayment(e, po)}
                          className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-500 hover:opacity-80 transition-opacity"
                          title="Edit payment"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {["paid", "partial_paid"].includes(po.accountStatus) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmPO(po); }}
                          className="p-1.5 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-500 hover:opacity-80 transition-opacity"
                          title="Delete payment entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>}
  />}
          </div>
        </div>
      </Card>

      {/* Detail Drawer */}
      {selectedPO && (() => {
        const accStatus = (selectedPO.accountStatus || "").toLowerCase();
        const poSt = (selectedPO.status || "").toLowerCase();
        const resolvedStatus = (() => {
          // When user explicitly clicks Edit (pencil), always use actual accountStatus — skip computed overrides
          if (isEditingPayment) return accStatus || "paid";
          if (accStatus === "partial_paid") {
            const tpd = selectedPO.totalPaid || selectedPO.payment?.amountPaid || 0;
            const poTotal = selectedPO.totalValue || 0;
            // If everything is already paid, treat as paid (edge case: accountStatus not updated)
            if (poTotal > 0 && tpd >= poTotal - 0.01) return "paid";
            // New GRN batch arrived — activate bill_verify for remaining amount
            if (poSt === "grn fulfilled") return "bill_verify";
            // Sum across ALL GRN batches to check if new goods arrived
            const allPOGRNs = allGrns.filter(g => g.poId === selectedPO.id);
            const gv = allPOGRNs.reduce((total, grn) =>
              total + grn.items.reduce((s, gi) => {
                const rcv = gi.received ?? gi.qty ?? 0;
                const rate = selectedPO.items?.find(pi => (pi.sku && gi.sku && pi.sku === gi.sku) || (pi.materialName || "").toLowerCase() === (gi.itemName || "").toLowerCase())?.rate || gi.rate || 0;
                return s + rcv * rate;
              }, 0)
            , 0);
            if (gv > tpd + 1) return "bill_verify";
            return "partial_paid";
          }
          if (accStatus) return accStatus;
          if (["grn fulfilled", "grn variance", "ready for payment"].includes(poSt)) return "bill_verify";
          return "other";
        })();
        const isRemainingPayment = accStatus === "partial_paid" || (accStatus === "payment_pending" && (selectedPO.paymentHistory?.length > 0 || selectedPO.payment?.isPartial));
        const drawerPayableAmount = (() => {
          const tpd = selectedPO.totalPaid || selectedPO.payment?.partialAmount || selectedPO.payment?.amountPaid || 0;
          const poTotal = selectedPO.totalValue || 0;
          // Always: remaining balance = PO total − already paid
          return Math.max(0, poTotal - tpd);
        })();
        const drawerFooter = resolvedStatus === "bill_verify" ? (
          drawerPayableAmount <= 0 ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">Waiting for next GRN batch</p>
            </div>
          ) : showRejectForm ? (
            <div className="flex flex-col sm:flex-row gap-3 items-end w-full">
              <div className="flex-1">
                <label className="text-[10px] font-black text-red-500 dark:text-red-400 mb-1 block">Rejection reason *</label>
                <input
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Price mismatch, quantity error..."
                  className="w-full bg-white dark:bg-[#0F172A] border border-red-200 dark:border-red-900/40 p-3 rounded-xl text-sm outline-none focus:ring-4 ring-red-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Btn label="Cancel" outline onClick={() => { setShowRejectForm(false); setRejectionReason(""); }} />
                <Btn label="Confirm reject" color="red" onClick={() => handleBillReject(selectedPO.id)} loading={isSubmitting} disabled={!rejectionReason.trim() || isSubmitting} />
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-3 w-full">
              {!isRemainingPayment && <Btn label="Reject bill" color="red" onClick={() => setShowRejectForm(true)} />}
              <Btn
                label={isRemainingPayment ? "Approve Remaining Bill" : "Approve bill"}
                color="green"
                onClick={() => handleBillApprove(selectedPO.id)}
                loading={isSubmitting}
                disabled={isSubmitting}
              />
            </div>
          )
        ) : (resolvedStatus === "payment_pending" || ((resolvedStatus === "paid" || resolvedStatus === "partial_paid") && isEditingPayment)) ? (
          <div className="flex justify-end gap-3 w-full items-center">
            {resolvedStatus === "payment_pending" && (
              <button
                onClick={() => handleRevokeApproval(selectedPO.id)}
                disabled={isSubmitting}
                className="bg-white dark:bg-[#0F172A] hover:bg-red-50 dark:hover:bg-red-900/10 border border-gray-200 dark:border-[#334155] hover:border-red-200 dark:hover:border-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 py-2.5 px-6 rounded-xl text-[13px] font-bold shadow-sm transition-all active:scale-[0.98]"
              >
                Revise Approval
              </button>
            )}
            {drawerPayableAmount <= 0 && !isEditingPayment ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">Waiting for next GRN batch</p>
              </div>
            ) : (
              <button
                onClick={() => handlePaymentSubmit(selectedPO.id)}
                disabled={isSubmitting || drawerPayableAmount <= 0}
                className="bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-8 rounded-xl text-[13px] font-black shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? "Syncing with ERP..." : isEditingPayment ? "Update Payment ✓" : isRemainingPayment ? "Pay Remaining Balance ✓" : "Mark Payment as Complete ✓"}
              </button>
            )}
          </div>
        ) : resolvedStatus === "partial_paid" ? (
          <div className="flex items-center gap-3 w-full">
            <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">
                Partial payment of {fmtCur(selectedPO.payment?.amountPaid || 0)} recorded. Remaining balance will activate once GRN is fulfilled.
              </p>
            </div>
          </div>
        ) : resolvedStatus === "paid" && !isEditingPayment ? (
          <div className="flex justify-end gap-3 w-full flex-wrap">
            <Btn
              label="Download Payment Advice"
              icon={Download}
              onClick={() => handlePrintPaymentAdvice(selectedPO)}
              className="bg-orange-500 hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-500/20 font-bold"
            />
            <Btn
              label="Close"
              outline
              onClick={() => { setSelectedPO(null); setIsEditingPayment(false); }}
              className="px-8 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            />
          </div>
        ) : null;

        return <Modal
          title={isEditingPayment ? `Edit Payment — ${selectedPO.id}` : `Transaction detail view`}
          onClose={() => { setSelectedPO(null); setIsEditingPayment(false); }}
          extraWide
          footer={drawerFooter}
        >
          <div className="flex items-center gap-2 mb-5">
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/20 text-blue-500 dark:text-blue-400 rounded text-[9px] font-black leading-normal">Purchase order</span>
            <p className="text-gray-400 dark:text-gray-500 text-[11px] font-bold font-mono">{selectedPO.id}</p>
          </div>
          <DetailPanel
            po={selectedPO}
            grn={realGRN}
            onApprove={handleBillApprove}
            onReject={handleBillReject}
            onPaymentDone={handlePaymentSubmit}
            paymentForm={paymentForm}
            setPaymentForm={setPaymentForm}
            isSubmitting={isSubmitting}
            rejectionReason={rejectionReason}
            setRejectionReason={setRejectionReason}
            showRejectForm={showRejectForm}
            setShowRejectForm={setShowRejectForm}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            suppliers={suppliers}
            onViewPO={() => setPreviewPO(selectedPO)}
            isEditingPayment={isEditingPayment}
            isRemainingPayment={isRemainingPayment}
            allGrns={allGrns}
            onPrintPaymentAdvice={handlePrintPaymentAdvice}
            onClose={() => { setSelectedPO(null); setIsEditingPayment(false); }}
          />
        </Modal>;
      })()}

      {previewPO && <POViewModal po={previewPO} onClose={() => setPreviewPO(null)} />}

      {deleteConfirmPO && <ConfirmModal
        title="Delete Payment Entry"
        message={`Delete payment entry for ${deleteConfirmPO.id}? This will revert the status back to "Payment Pending".`}
        confirmLabel="Delete"
        confirmColor="red"
        loading={isDeletingPayment}
        onConfirm={handleDeletePayment}
        onCancel={() => setDeleteConfirmPO(null)}
      />}

      {removeConfirmPO && <ConfirmModal
        title="Remove from Accounts"
        message={`Remove ${removeConfirmPO.id} (${getSupplierName(removeConfirmPO.supplier)}) from the Accounts module? This will clear its account status and delete the account entry. The PO itself will not be deleted.`}
        confirmLabel="Remove"
        confirmColor="red"
        loading={isRemovingFromAccounts}
        onConfirm={handleRemoveFromAccounts}
        onCancel={() => setRemoveConfirmPO(null)}
      />}
    </div>;
}, "AccountsPage");
const GRNInfoRow = /* @__PURE__ */ __name(({ label, value, orange, mono }) => (
  <div className="grid grid-cols-12 items-center divide-x divide-gray-100 dark:divide-gray-800">
    <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 dark:text-gray-500">{label}</div>
    <div className={`col-span-8 px-4 py-2.5 text-[13px] font-bold truncate ${orange ? "text-orange-500 dark:text-orange-400" : mono ? "font-mono text-blue-500 dark:text-blue-400" : "text-gray-900 dark:text-white"}`}>
      {value || "—"}
    </div>
  </div>
), "GRNInfoRow");

const DetailPanel = /* @__PURE__ */ __name(({
  po,
  grn: realGrn,
  onApprove,
  onReject,
  onPaymentDone,
  paymentForm,
  setPaymentForm,
  isSubmitting,
  rejectionReason,
  setRejectionReason,
  showRejectForm,
  setShowRejectForm,
  fileInputRef,
  handleFileChange,
  suppliers,
  onViewPO,
  isEditingPayment,
  isRemainingPayment,
  allGrns,
  onPrintPaymentAdvice,
  onClose
}) => {
  const [isDraggingPayment, setIsDraggingPayment] = useState(false);
  const [viewGRNDetail, setViewGRNDetail] = useState(false);
  const [viewerImages, setViewerImages] = useState(null); // { images: [], index: 0, title: "" }
  const poStatus = (po.status || "").toLowerCase();
  // Only force bill_verify when accountStatus is "partial_paid" (awaiting approval for remaining)
  // When accountStatus is "payment_pending" (already approved), show the payment form
  const status = isEditingPayment
    ? (po.accountStatus || "").toLowerCase() || "paid"
    : (isRemainingPayment && (po.accountStatus || "").toLowerCase() === "partial_paid")
      ? "bill_verify"
      : (po.accountStatus || (["approved", "fulfilled", "grn pending", "grn fulfilled", "grn variance"].includes(poStatus) ? "bill_verify" : "other"));
  const getSupplierName = /* @__PURE__ */ __name((id) => {
    if (!id) return "Unknown Vendor";
    const s = suppliers?.find(
      (sup) => sup.id === id || sup._id === id || (sup.companyName || "").toLowerCase() === id.toLowerCase() || (sup.name || "").toLowerCase() === id.toLowerCase()
    );
    return s?.companyName || id || "Unknown Vendor";
  }, "getSupplierName");
  const invoiceAmount = po.payment?.amountPaid || po.totalValue || 0;
  const poAmount = po.totalValue || 0;
  const isMismatch = Math.abs(invoiceAmount - poAmount) > 0.01;

  const totalPaid = po.totalPaid || po.payment?.partialAmount || po.payment?.amountPaid || 0;
  const grnReceivedValue = realGrn
    ? realGrn.items.reduce((sum, gi) => {
        const rcv = gi.received ?? gi.qty ?? 0;
        const rate = gi.rate || po.items?.find(pi =>
          (pi.sku && pi.sku === gi.sku) ||
          (pi.materialName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
        )?.rate || 0;
        return sum + rcv * rate;
      }, 0)
    : 0;
  // For GRN Variance: pay only for received goods + proportional GST (capped at PO total)
  const grnReceivedWithGST = realGrn
    ? realGrn.items.reduce((sum, gi) => {
        const rcv = gi.received ?? gi.qty ?? 0;
        const poItem = po.items?.find(pi =>
          (pi.sku && gi.sku && pi.sku === gi.sku) ||
          (pi.materialName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
        );
        const rate = gi.rate || poItem?.rate || 0;
        const gstPct = poItem?.gstPct || 0;
        const gstType = poItem?.gstType || "Exclusive";
        const base = rcv * rate;
        const gst = gstType === "Inclusive" ? 0 : base * gstPct / 100;
        return sum + base + gst;
      }, 0)
    : 0;
  // Always: remaining balance = PO total − already paid
  const payableAmount = Math.max(0, poAmount - totalPaid);
  const payableLabel = totalPaid > 0 ? "Remaining payable" : "Payable amount";

  useEffect(() => {
    // Only auto-fill amount for fresh payment_pending flows, not when editing an existing payment
    if (!isEditingPayment && status === "payment_pending") {
      if (paymentForm.amountPaid === poAmount && payableAmount !== poAmount) {
        setPaymentForm(prev => ({ ...prev, amountPaid: payableAmount }));
      }
    }
  }, [payableAmount, poAmount, paymentForm.amountPaid, setPaymentForm, status, isEditingPayment]);

  const grnNo = realGrn?.id || "—";
  const grnDate = realGrn?.date || po.grn?.date || po.date;
  const receivedBy = realGrn?.personName || "—";
  const invoiceNo = po.payment?.ref || po.invoice?.number || realGrn?.challan || "—";

  // Top info grid — shared across all statuses (GRN modal style)
  const topGrid = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-orange-500 rounded-full" /> Purchase order
        </div>
        <GRNInfoRow label="PO No." value={po.id} orange />
        <GRNInfoRow label="Vendor" value={getSupplierName(po.supplier)} />
        <GRNInfoRow label="PO amount" value={fmtCur(poAmount)} />
        <GRNInfoRow label="PO date" value={formatDate(po.date)} />
        <GRNInfoRow label="Project" value={po.project || po.location || "—"} />
        <div className="grid grid-cols-12 items-center divide-x divide-gray-100 dark:divide-gray-800">
          <div className="col-span-4 p-3" />
          <div className="col-span-8 px-4 py-2.5">
            <button onClick={onViewPO} className="flex items-center gap-1.5 text-[10px] font-black text-blue-600 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded border border-blue-100 dark:border-blue-500/20 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors">
              <Eye className="w-3 h-3" /> View PO
            </button>
          </div>
        </div>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
          <div className="w-1.5 h-3.5 bg-orange-500 rounded-full" /> GRN & delivery
        </div>
        <GRNInfoRow label="GRN No." value={grnNo} orange />
        <GRNInfoRow label="Receipt date" value={formatDate(grnDate)} />
        <GRNInfoRow label="Received by" value={receivedBy} />
        <GRNInfoRow label="GRN status" value={po.status} />
        <GRNInfoRow label="Invoice / challan" value={invoiceNo} mono />
        {realGrn && (
          <div className="grid grid-cols-12 items-center divide-x divide-gray-100 dark:divide-gray-800">
            <div className="col-span-4 p-3" />
            <div className="col-span-8 px-4 py-2.5">
              <button onClick={() => setViewGRNDetail(true)} className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded border border-amber-100 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors">
                <Eye className="w-3 h-3" /> View GRN
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (status === "bill_verify") {
    return <div className="space-y-5 pb-4">
        {topGrid}
        {totalPaid > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
            <IndianRupee className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">
              {fmtCur(totalPaid)} already paid — remaining payable: <span className="font-black">{fmtCur(payableAmount)}</span>
            </p>
          </div>
        )}
        {realGrn && realGrn.items?.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 bg-[#F97316]" />
              <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">Received materials</h3>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/90 dark:bg-gray-800/90 border-b border-gray-100 dark:border-gray-800">
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 tracking-wider">Material</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 tracking-wider text-center">Ordered</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 tracking-wider text-center">Received</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 tracking-wider text-right">Rate</th>
                    <th className="px-4 py-3 text-[10px] font-black text-gray-400 tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {realGrn.items.map((gi, idx) => {
                    const rcv = gi.received ?? gi.qty ?? 0;
                    const poItem = po.items?.find(pi =>
                      (pi.sku && gi.sku && pi.sku === gi.sku) ||
                      (pi.materialName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
                    );
                    const ordered = poItem?.qty || poItem?.quantity || 0;
                    const rate = gi.rate || poItem?.rate || 0;
                    return (
                      <tr key={idx} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                        <td className="px-4 py-3">
                          <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{gi.itemName || gi.name || "Item"}</span>
                          {gi.sku && <p className="text-[10px] text-gray-400">{gi.sku}</p>}
                        </td>
                        <td className="px-4 py-3 text-center text-[12px] text-gray-400">{ordered || "—"}</td>
                        <td className="px-4 py-3 text-center"><span className="text-[14px] font-black text-gray-900 dark:text-white">{rcv}</span></td>
                        <td className="px-4 py-3 text-right text-[12px] text-gray-500 tabular-nums">{fmtCur(rate)}</td>
                        <td className="px-4 py-3 text-right font-black text-[13px] text-gray-900 dark:text-white tabular-nums">{fmtCur(rcv * rate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {(() => {
          const billImgs = [
            po.invoice?.screenshotUrl,
            realGrn?.challanImageUrl,
            ...(Array.isArray(realGrn?.challanPhotos) ? realGrn.challanPhotos : [])
          ].filter(Boolean);
          if (!billImgs.length) return null;
          return (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-4 bg-[#F97316]" />
                <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">Vendor bill</h3>
                <span className="text-[10px] text-gray-400">{billImgs.length} photo{billImgs.length > 1 ? "s" : ""}</span>
              </div>
              <div className="flex gap-3 flex-wrap">
                {billImgs.map((img, i) => (
                  <div
                    key={i}
                    onClick={() => setViewerImages({ images: billImgs, index: i, title: "Vendor Bill" })}
                    className="relative group cursor-zoom-in rounded-xl overflow-hidden border-2 border-gray-100 dark:border-gray-800 hover:border-orange-400 dark:hover:border-orange-500 transition-all shadow-sm"
                    style={{ width: 90, height: 90 }}
                  >
                    <img src={img} alt={`Bill ${i + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-black bg-black/60 px-2 py-0.5 rounded-full transition-opacity">View</span>
                    </div>
                    {billImgs.length > 1 && i === 0 && (
                      <span className="absolute bottom-1 right-1 text-[9px] font-black text-white bg-orange-500 px-1.5 py-0.5 rounded-full">{billImgs.length}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-emerald-500 rounded-full" /> Payment summary
            </div>
            <GRNInfoRow label="PO Grand Total" value={fmtCur(poAmount)} />
            {totalPaid > 0 && <GRNInfoRow label="Already paid" value={fmtCur(totalPaid)} />}
            <GRNInfoRow label={payableLabel} value={fmtCur(payableAmount)} orange />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-emerald-500 rounded-full" /> Approval
            </div>
            <GRNInfoRow label="Bill approved by" value={po.billApprovedBy || "—"} />
            <GRNInfoRow label="Approved on" value={formatDate(po.billApprovedDate || po.billApprovedAt)} />
            <GRNInfoRow label="GRN remark" value={realGrn?.remarks || realGrn?.remark || "—"} />
          </div>
        </div>

        {viewGRNDetail && realGrn && <GRNDetailModal grn={realGrn} onClose={() => setViewGRNDetail(false)} />}
        {viewerImages && <ImageViewer {...viewerImages} onClose={() => setViewerImages(null)} />}
      </div>;
  }
  if (status === "payment_pending" || ((status === "paid" || status === "partial_paid") && isEditingPayment)) {
    return <div className="space-y-5 pb-4">
      {topGrid}

      {totalPaid > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 bg-[#F97316]" />
            <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">Previous payments</h3>
          </div>
          {po.paymentHistory?.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
              {po.paymentHistory.map((ph, i) => (
                <div key={i} className="grid grid-cols-12 items-center divide-x divide-gray-100 dark:divide-gray-800 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <div className="col-span-1 p-3 flex justify-center">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white ${i === 0 ? "bg-orange-500" : "bg-emerald-500"}`}>{ph.installmentNo || i + 1}</div>
                  </div>
                  <div className="col-span-3 px-3 py-2.5">
                    <p className="text-[10px] font-black text-gray-400">Installment #{ph.installmentNo}</p>
                    <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400">{formatDate(ph.date)}</p>
                  </div>
                  <div className="col-span-3 px-3 py-2.5">
                    <p className="text-[10px] text-gray-400">Mode</p>
                    <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{ph.mode || "—"}</p>
                  </div>
                  <div className="col-span-3 px-3 py-2.5">
                    <p className="text-[10px] text-gray-400">ERP Ref</p>
                    <p className="text-[11px] font-bold font-mono text-gray-700 dark:text-gray-300">{ph.ref || "—"}</p>
                  </div>
                  <div className="col-span-2 px-3 py-2.5 text-right">
                    <p className="text-[13px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtCur(ph.amountPaid)}</p>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-12 divide-x divide-gray-100 dark:divide-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="col-span-10 px-3 py-2.5">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Total paid so far</p>
                </div>
                <div className="col-span-2 px-3 py-2.5 text-right">
                  <p className="text-[13px] font-black text-amber-500 tabular-nums">{fmtCur(totalPaid)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
              <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">Already paid: {fmtCur(totalPaid)}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-emerald-500 rounded-full" /> Payable now
          </div>
          <GRNInfoRow label="PO Grand Total" value={fmtCur(poAmount)} />
          {totalPaid > 0 && <GRNInfoRow label="Already paid" value={fmtCur(totalPaid)} />}
          <GRNInfoRow label={payableLabel} value={fmtCur(payableAmount)} orange />
          <GRNInfoRow label="Bill approved by" value={po.billApprovedBy || "—"} />
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-emerald-500 rounded-full" /> Supplier bank
          </div>
          <GRNInfoRow label="Account holder" value={paymentForm.vendorBankDetails?.accountHolder || "—"} />
          <GRNInfoRow label="Bank name" value={paymentForm.vendorBankDetails?.bankName || "—"} />
          <GRNInfoRow label="Account No." value={paymentForm.vendorBankDetails?.accountNo || "—"} mono />
          <GRNInfoRow label="IFSC / Branch" value={paymentForm.vendorBankDetails?.branchIFSC || "—"} mono />
        </div>
      </div>

      {payableAmount <= 0 && !isEditingPayment ? (
        <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl text-center">
          <Clock className="w-8 h-8 text-amber-400" />
          <div>
            <p className="text-[14px] font-black text-gray-800 dark:text-white">Waiting for next GRN batch</p>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">All received material has been paid. Payment will activate once the next GRN batch is received.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 bg-[#F97316]" />
            <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">Payment confirmation (ERP Sync)</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup label="From Company" hint="Auto-fetched">
              <input type="text" value={paymentForm.fromCompany} onChange={(e) => setPaymentForm({ ...paymentForm, fromCompany: e.target.value })} className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] p-3 rounded-xl text-sm outline-none focus:ring-4 ring-blue-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all" />
            </FormGroup>
            <FormGroup label="Paying To (Supplier)" hint="Auto-fetched">
              <input type="text" value={paymentForm.toCompany} onChange={(e) => setPaymentForm({ ...paymentForm, toCompany: e.target.value })} className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] p-3 rounded-xl text-sm outline-none focus:ring-4 ring-blue-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all" />
            </FormGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup label="Payment Date *" hint="ERP Tally Date">
              <DatePicker value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
            </FormGroup>
            <FormGroup label="Payment Mode *">
              <select value={paymentForm.mode} onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })} className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] p-3 rounded-xl text-sm outline-none focus:ring-4 ring-blue-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all">
                <option>NEFT</option><option>RTGS</option><option>Cheque</option><option>Cash</option><option>UPI</option>
              </select>
            </FormGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup label="Voucher Ref *" hint="Tally PV ref">
              <input type="text" value={paymentForm.ref} onChange={(e) => setPaymentForm({ ...paymentForm, ref: e.target.value })} className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] p-3 rounded-xl text-sm outline-none focus:ring-4 ring-blue-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all" placeholder="e.g. PV-26-0045" />
            </FormGroup>
            <FormGroup label="Amount Paid *" hint={`Max: ${fmtCur(payableAmount)}`}>
              <input type="number" value={paymentForm.amountPaid} max={payableAmount} onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: Number(e.target.value) })} className={`w-full bg-gray-50 dark:bg-[#0F172A] border p-3 rounded-xl text-sm font-black outline-none focus:ring-4 ring-blue-500/10 text-gray-900 dark:text-[#F1F5F9] transition-all ${Number(paymentForm.amountPaid) > payableAmount ? "border-red-400 dark:border-red-500 ring-2 ring-red-500/20" : "border-gray-200 dark:border-[#334155]"}`} />
            </FormGroup>
          </div>

          <FormGroup label="Debit Bank Account *" hint="Your company account">
            <select value={paymentForm.bank} onChange={(e) => setPaymentForm({ ...paymentForm, bank: e.target.value })} className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] p-3 rounded-xl text-sm outline-none focus:ring-4 ring-blue-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all">
              <option value="">-- Select Your Bank --</option>
              <option>SBI Main Corporate A/C</option>
              <option>HDFC Business OD A/C</option>
              <option>ICICI Project Fund</option>
            </select>
          </FormGroup>

          {(paymentForm.mode === "NEFT" || paymentForm.mode === "RTGS" || paymentForm.mode === "UPI") && (
            <FormGroup label="UTR / Reference ID *" hint="Transaction ID">
              <input type="text" value={paymentForm.utr} onChange={(e) => setPaymentForm({ ...paymentForm, utr: e.target.value })} className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] p-3 rounded-xl text-sm outline-none focus:ring-4 ring-blue-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all" placeholder="ENTER TRANSACTION ID" />
            </FormGroup>
          )}

          {paymentForm.mode === "Cheque" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormGroup label="Cheque No. *">
                <input type="text" value={paymentForm.chequeNo} onChange={(e) => setPaymentForm({ ...paymentForm, chequeNo: e.target.value })} className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] p-3 rounded-xl text-sm outline-none focus:ring-4 ring-blue-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all" />
              </FormGroup>
              <FormGroup label="Cheque Date *">
                <DatePicker value={paymentForm.chequeDate} onChange={(e) => setPaymentForm({ ...paymentForm, chequeDate: e.target.value })} />
              </FormGroup>
            </div>
          )}

          <FormGroup label="Payment Proof Screenshot *" hint="Mandatory for internal audit">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingPayment(true); }}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingPayment(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); if (!e.currentTarget.contains(e.relatedTarget)) setIsDraggingPayment(false); }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation(); setIsDraggingPayment(false);
                const file = e.dataTransfer.files?.[0];
                if (file) { const url = URL.createObjectURL(file); setPaymentForm(prev => ({ ...prev, screenshot: file, previewUrl: url })); }
              }}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all font-medium group ${isDraggingPayment ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 scale-[1.01]" : "border-gray-200 dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#0F172A]/50"}`}
            >
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
              {isDraggingPayment ? (
                <><div className="p-4 bg-blue-100 dark:bg-blue-900/20 text-blue-500 rounded-full"><Upload className="w-8 h-8" /></div><p className="text-[11px] font-black text-blue-500">Drop file here</p></>
              ) : paymentForm.previewUrl ? (
                <div className="relative group">
                  <img src={paymentForm.previewUrl} className="h-24 rounded-xl shadow-lg border border-white dark:border-[#334155]" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Upload className="text-white w-6 h-6 animate-bounce" /></div>
                  <p className="text-[10px] font-black text-center mt-2 text-gray-500 dark:text-[#64748B] truncate w-40">{paymentForm.screenshot?.name}</p>
                </div>
              ) : (
                <><div className="p-4 bg-blue-50 dark:bg-blue-900/10 text-[#3B82F6] rounded-full group-hover:scale-110 transition-transform"><Upload className="w-8 h-8" /></div><div className="text-center"><p className="text-[11px] font-black text-[#3B82F6] mb-1">Click or drag &amp; drop</p><p className="text-[10px] font-bold text-gray-400 dark:text-[#64748B] italic">Tally Snapshot or Bank Receipt</p></div></>
              )}
            </div>
          </FormGroup>

          <FormGroup label="Remarks (Optional)">
            <textarea rows={2} value={paymentForm.remarks} onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })} className="w-full bg-gray-50 dark:bg-[#0F172A] border border-gray-100 dark:border-[#334155] p-3 rounded-xl text-sm outline-none focus:ring-4 ring-blue-500/10 resize-none font-bold text-gray-900 dark:text-[#F1F5F9]" placeholder="Reference notes, discount details..." />
          </FormGroup>
        </div>
      )}
      {viewGRNDetail && realGrn && <GRNDetailModal grn={realGrn} onClose={() => setViewGRNDetail(false)} />}
    </div>;
  }
  if (status === "partial_paid" && !isEditingPayment) {
    const paidSoFar = po.totalPaid || po.payment?.amountPaid || 0;
    const totalVal = po.totalValue || 0;
    const remaining = Math.max(0, totalVal - paidSoFar);
    const installments = po.paymentHistory?.length > 0 ? po.paymentHistory : null;
    return <div className="space-y-5 pb-4">
      {topGrid}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-amber-500 rounded-full" /> Payment progress
          </div>
          <GRNInfoRow label="PO Total" value={fmtCur(totalVal)} />
          <GRNInfoRow label="Paid so far" value={fmtCur(paidSoFar)} orange />
          <GRNInfoRow label="Remaining" value={fmtCur(remaining)} />
          <GRNInfoRow label="Installments" value={installments ? `${installments.length} payment${installments.length > 1 ? "s" : ""}` : "1 payment"} />
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-amber-500 rounded-full" /> Status
          </div>
          <GRNInfoRow label="GRN status" value={po.status} />
          <GRNInfoRow label="Vendor" value={getSupplierName(po.supplier)} />
          <GRNInfoRow label="Project" value={po.project || po.location || "—"} />
          <div className="grid grid-cols-12 items-center divide-x divide-gray-100 dark:divide-gray-800">
            <div className="col-span-4 p-3" />
            <div className="col-span-8 px-4 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded border border-amber-100 dark:border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" /> Awaiting next GRN
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-0.5 w-4 bg-[#F97316]" />
          <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">Payment history</h3>
        </div>
        <div className="relative pl-4">
          <div className="absolute left-7 top-3.5 bottom-3.5 w-0.5 bg-gray-100 dark:bg-gray-800" />
          {installments ? installments.map((ph, i) => (
            <div key={i} className="flex gap-4 mb-4 last:mb-0">
              <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 border-2 border-white dark:border-gray-900 shadow-sm ${i === 0 ? "bg-orange-500" : "bg-emerald-500"}`}>{ph.installmentNo || i + 1}</div>
              <div className="flex-1 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black text-gray-700 dark:text-gray-200">Installment #{ph.installmentNo}{ph.grnId ? ` · ${ph.grnId}` : ""}</span>
                  <span className="text-[13px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtCur(ph.amountPaid)}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  <span className="text-[10px] text-gray-400">{formatDate(ph.date)}</span>
                  <span className="text-[10px] text-gray-400">{ph.mode || "—"}</span>
                  {ph.ref && <span className="text-[10px] font-mono text-gray-400">{ph.ref}</span>}
                  {ph.bank && <span className="text-[10px] text-gray-400">{ph.bank}</span>}
                </div>
              </div>
            </div>
          )) : (
            <div className="flex gap-4">
              <div className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 border-2 border-white dark:border-gray-900 shadow-sm bg-orange-500">1</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-black text-gray-700 dark:text-gray-200">Installment #1</span>
                  <span className="text-[13px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtCur(paidSoFar)}</span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                  <span className="text-[10px] text-gray-400">{formatDate(po.payment?.date)}</span>
                  <span className="text-[10px] text-gray-400">{po.payment?.mode || "—"}</span>
                  {po.payment?.ref && <span className="text-[10px] font-mono text-gray-400">{po.payment.ref}</span>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AuditTrail log={po.auditTrail} />
      {viewGRNDetail && realGrn && <GRNDetailModal grn={realGrn} onClose={() => setViewGRNDetail(false)} />}
    </div>;
  }
  if (status === "paid" && !isEditingPayment) {
    const paidAmt = po.totalPaid || po.payment?.amountPaid || po.totalValue || 0;
    const vbd = po.payment?.vendorBankDetails;
    const installments = po.paymentHistory?.length > 0 ? po.paymentHistory : null;
    const grnPayments = installments
      ? installments.map(ph => ({
          ph,
          grn: allGrns?.find(g => g.id === ph.grnId || g._id === ph.grnId) || (installments.length === 1 ? realGrn : null)
        }))
      : (realGrn && po.payment) ? [{ ph: po.payment, grn: realGrn }] : [];
    return <div className="space-y-5 pb-4">
      {topGrid}

      {(() => {
        const billImgs = [
          po.invoice?.screenshotUrl,
          realGrn?.challanImageUrl,
          ...(Array.isArray(realGrn?.challanPhotos) ? realGrn.challanPhotos : [])
        ].filter(Boolean);
        if (!billImgs.length) return null;
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 bg-[#F97316]" />
              <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">Vendor bill</h3>
              <span className="text-[10px] text-gray-400">{billImgs.length} photo{billImgs.length > 1 ? "s" : ""}</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              {billImgs.map((img, i) => (
                <div key={i} onClick={() => setViewerImages({ images: billImgs, index: i, title: "Vendor Bill" })}
                  className="relative group cursor-zoom-in rounded-xl overflow-hidden border-2 border-gray-100 dark:border-gray-800 hover:border-orange-400 dark:hover:border-orange-500 transition-all shadow-sm"
                  style={{ width: 90, height: 90 }}>
                  <img src={img} alt={`Bill ${i + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 text-white text-[10px] font-black bg-black/60 px-2 py-0.5 rounded-full transition-opacity">View</span>
                  </div>
                  {billImgs.length > 1 && i === 0 && (
                    <span className="absolute bottom-1 right-1 text-[9px] font-black text-white bg-orange-500 px-1.5 py-0.5 rounded-full">{billImgs.length}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {grnPayments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 bg-[#F97316]" />
            <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">Payment installments · {grnPayments.length}</h3>
          </div>
          {grnPayments.map(({ ph, grn }, idx) => {
            const isFinal = idx === grnPayments.length - 1;
            return (
              <div key={idx} className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                {/* Installment header */}
                <div className={`flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 ${isFinal ? "bg-emerald-50/60 dark:bg-emerald-500/5" : "bg-orange-50/60 dark:bg-orange-500/5"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 ${isFinal ? "bg-emerald-500" : "bg-orange-500"}`}>{ph.installmentNo || idx + 1}</div>
                    <div>
                      <p className="text-[12px] font-black text-gray-800 dark:text-gray-100">
                        Installment #{ph.installmentNo || idx + 1} · {isFinal ? "Final" : "Partial"}{ph.grnId ? ` · ${ph.grnId}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="text-[10px] text-gray-400">{formatDate(ph.date)}</span>
                        {ph.mode && <span className="text-[10px] font-bold text-gray-500">{ph.mode}</span>}
                        {ph.ref && <span className="text-[10px] font-mono text-gray-400">Ref: {ph.ref}</span>}
                        {ph.utr && <span className="text-[10px] font-mono text-gray-400">UTR: {ph.utr}</span>}
                        {ph.bank && <span className="text-[10px] text-gray-400">{ph.bank}</span>}
                        {ph.toCompany && <span className="text-[10px] font-bold text-gray-500">→ {ph.toCompany}</span>}
                      </div>
                    </div>
                  </div>
                  <span className={`text-[15px] font-black tabular-nums ${isFinal ? "text-emerald-600 dark:text-emerald-400" : "text-orange-600 dark:text-orange-400"}`}>{fmtCur(ph.amountPaid)}</span>
                </div>
                {/* Items table if GRN found */}
                {grn?.items?.length > 0 ? (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800">
                        <th className="px-4 py-2 text-[10px] font-black text-gray-400 tracking-wider">Material</th>
                        <th className="px-4 py-2 text-[10px] font-black text-gray-400 tracking-wider text-center">Rcv qty</th>
                        <th className="px-4 py-2 text-[10px] font-black text-gray-400 tracking-wider text-right">Rate</th>
                        <th className="px-4 py-2 text-[10px] font-black text-gray-400 tracking-wider text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {grn.items.map((gi, i) => {
                        const rcv = gi.received ?? gi.qty ?? 0;
                        const poItem = po.items?.find(pi =>
                          (pi.sku && gi.sku && pi.sku === gi.sku) ||
                          (pi.materialName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
                        );
                        const rate = gi.rate || poItem?.rate || 0;
                        return (
                          <tr key={i} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                            <td className="px-4 py-2.5">
                              <p className="text-[12px] font-semibold text-gray-900 dark:text-white">{gi.itemName || gi.name || "Item"}</p>
                              {gi.sku && <p className="text-[10px] text-gray-400">{gi.sku}</p>}
                            </td>
                            <td className="px-4 py-2.5 text-center text-[13px] font-black text-gray-900 dark:text-white">{rcv}</td>
                            <td className="px-4 py-2.5 text-right text-[12px] text-gray-500 tabular-nums">{fmtCur(rate)}</td>
                            <td className="px-4 py-2.5 text-right font-black text-[13px] text-gray-900 dark:text-white tabular-nums">{fmtCur(rcv * rate)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-4 py-3 text-[11px] text-gray-400 italic">GRN item details not linked to this installment</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
          <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-emerald-500 rounded-full" /> Payment summary
          </div>
          <GRNInfoRow label="Total paid" value={fmtCur(paidAmt)} orange />
          <GRNInfoRow label="Payment date" value={formatDate(po.payment?.date)} />
          <GRNInfoRow label="Mode" value={po.payment?.mode || "—"} />
          <GRNInfoRow label="ERP Voucher Ref" value={po.payment?.ref || "—"} mono />
          {po.payment?.utr && <GRNInfoRow label="UTR" value={po.payment.utr} mono />}
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-emerald-500 rounded-full" /> Beneficiary bank
          </div>
          <GRNInfoRow label="Account holder" value={vbd?.accountHolder || po.payment?.toCompany || "—"} />
          <GRNInfoRow label="Bank name" value={vbd?.bankName || "—"} />
          <GRNInfoRow label="Account No." value={vbd?.accountNo || "—"} mono />
          <GRNInfoRow label="IFSC / Branch" value={vbd?.branchIFSC || "—"} mono />
          <div className="grid grid-cols-12 items-center divide-x divide-gray-100 dark:divide-gray-800">
            <div className="col-span-4 p-3" />
            <div className="col-span-8 px-4 py-2.5">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-100 dark:border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Synced with Tally
              </span>
            </div>
          </div>
        </div>
      </div>

      {installments && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 bg-[#F97316]" />
            <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">Payment history · {installments.length} installment{installments.length > 1 ? "s" : ""}</h3>
          </div>
          <div className="relative pl-4">
            <div className="absolute left-7 top-3.5 bottom-3.5 w-0.5 bg-gray-100 dark:bg-gray-800" />
            {installments.map((ph, i) => (
              <div key={i} className="flex gap-4 mb-4 last:mb-0">
                <div className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black text-white shrink-0 border-2 border-white dark:border-gray-900 shadow-sm ${i === installments.length - 1 ? "bg-emerald-500" : "bg-orange-500"}`}>{ph.installmentNo || i + 1}</div>
                <div className="flex-1 pb-4 border-b border-gray-100 dark:border-gray-800 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-black text-gray-700 dark:text-gray-200">Installment #{ph.installmentNo}{i === installments.length - 1 ? " (Final)" : " (Partial)"}{ph.grnId ? ` · ${ph.grnId}` : ""}</span>
                    <span className="text-[13px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtCur(ph.amountPaid)}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                    <span className="text-[10px] text-gray-400">{formatDate(ph.date)}</span>
                    <span className="text-[10px] text-gray-400">{ph.mode || "—"}</span>
                    {ph.ref && <span className="text-[10px] font-mono text-gray-400">{ph.ref}</span>}
                    {ph.bank && <span className="text-[10px] text-gray-400">{ph.bank}</span>}
                    {ph.utr && <span className="text-[10px] font-mono text-gray-400">UTR: {ph.utr}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {po.payment?.screenshotUrl && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 bg-[#F97316]" />
            <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">Payment proof</h3>
          </div>
          <div className="group relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30 cursor-zoom-in w-48" onClick={() => window.open(po.payment.screenshotUrl, "_blank")}>
            <img src={po.payment.screenshotUrl} alt="Payment proof" referrerPolicy="no-referrer" className="w-full object-contain max-h-[120px] hover:scale-[1.02] transition-transform duration-500" />
          </div>
        </div>
      )}

      <AuditTrail log={po.auditTrail} />
      {viewGRNDetail && realGrn && <GRNDetailModal grn={realGrn} onClose={() => setViewGRNDetail(false)} />}
      {viewerImages && <ImageViewer images={viewerImages.images} index={viewerImages.index} title={viewerImages.title} onClose={() => setViewerImages(null)} />}
    </div>;
  }
  if (status === "rejected") {
    return <div className="space-y-5 pb-4">
      {topGrid}
      <div className="flex items-center gap-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-5 rounded-2xl">
        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-red-600/30 shrink-0">
          <XSquare className="w-7 h-7" />
        </div>
        <div className="flex-1">
          <h4 className="text-[14px] font-black text-red-700 dark:text-red-400">Compliance rejection</h4>
          <p className="text-[12px] font-bold text-red-600 dark:text-red-500 mt-0.5">The bill verification stage was failed by accounts.</p>
        </div>
        <button onClick={() => onApprove(po.id)} className="text-[11px] font-black bg-white dark:bg-[#0F172A] text-red-600 border border-red-200 dark:border-red-900/40 px-5 py-2.5 rounded-xl shadow hover:scale-105 transition-all">
          Undo Rejection?
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900 col-span-2">
          <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-red-500 rounded-full" /> Rejection reason
          </div>
          <div className="p-5">
            <blockquote className="text-[15px] font-black text-gray-800 dark:text-white border-l-4 border-red-500 pl-4 italic leading-relaxed">
              "{po.rejectionReason || "DOCUMENTATION DISCREPANCY OR PRICE DEVIATION FROM PO TERMS."}"
            </blockquote>
          </div>
        </div>
      </div>
      {viewGRNDetail && realGrn && <GRNDetailModal grn={realGrn} onClose={() => setViewGRNDetail(false)} />}
    </div>;
  }
  return <div className="py-24 text-center space-y-8">
      <div className="w-24 h-24 bg-gray-50 dark:bg-[#1E293B] rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-gray-100 dark:border-[#334155] shadow-inner">
        <ShieldAlert className="w-12 h-12 text-gray-300 dark:text-gray-700" />
      </div>
      <div className="space-y-3">
        <h2 className="text-3xl font-black text-gray-900 dark:text-[#F1F5F9]">Stage restricted</h2>
        <p className="text-gray-400 dark:text-[#64748B] font-bold text-sm">Current state: {status.replace("_", " ")}</p>
      </div>
    </div>;
}, "DetailPanel");
const InfoItem = /* @__PURE__ */ __name(({ label, value, highlight }) => <div className="group">
    <p className="text-[9px] font-black text-gray-400 dark:text-[#64748B] mb-1 leading-none">{label}</p>
    <p className={`text-[13px] font-bold leading-snug break-words ${highlight ? "text-[#3B82F6] dark:text-[#60A5FA] text-lg font-black tracking-tight" : "text-gray-800 dark:text-[#CBD5E1]"}`}>{value || "Not provided"}</p>
  </div>, "InfoItem");
const FormGroup = /* @__PURE__ */ __name(({ label, children, hint }) => <div className="space-y-1.5 min-w-0">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
      <label className="block text-[10px] font-black text-gray-400 dark:text-[#94A3B8] truncate">{label}</label>
      {hint && <span className="text-[9px] text-gray-400 dark:text-[#64748B] font-bold italic truncate leading-none">{hint}</span>}
    </div>
    <div className="relative">
      {children}
    </div>
  </div>, "FormGroup");
const AuditTrail = /* @__PURE__ */ __name(({ log }) => {
  const [show, setShow] = useState(false);
  if (!log || log.length === 0) return null;
  return <div className="pt-8 border-t dark:border-[#334155] mt-12">
      <button
    onClick={() => setShow(!show)}
    className="flex items-center gap-3 text-[11px] font-black text-gray-400 dark:text-[#64748B] hover:text-[#3B82F6] dark:hover:text-[#60A5FA] transition-all group"
  >
        <div className="p-1.5 rounded-lg bg-gray-50 dark:bg-[#0F172A] group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
          <History className="w-4 h-4" /> 
        </div>
        Audit History {show ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      <AnimatePresence>
        {show && <motion.div
    initial={{ height: 0, opacity: 0 }}
    animate={{ height: "auto", opacity: 1 }}
    exit={{ height: 0, opacity: 0 }}
    className="mt-6 space-y-6 pl-8 relative"
  >
            <div className="absolute left-[7px] top-0 bottom-0 w-[2px] bg-gray-100 dark:bg-[#334155]" />
            {log.map((item, i) => <div key={i} className="relative group/log">
                <div className="absolute -left-[25px] top-1.5 w-3 h-3 bg-white dark:bg-[#0F172A] border-2 border-[#E2E8F0] dark:border-[#334155] rounded-full group-hover/log:border-[#3B82F6] dark:group-hover/log:border-[#60A5FA] transition-colors z-10" />
                <div className="space-y-1">
                   <p className="text-[11px] font-black text-gray-900 dark:text-[#F1F5F9] tracking-wider">
                      {item.action === "payment_submitted" ? "Transaction completed" : item.action === "bill_approved" ? "Bill compliance verified" : "Bill rejected"}
                   </p>
                   <div className="flex items-center gap-2">
                     <p className="text-[10px] text-gray-400 dark:text-[#64748B] font-bold">
                       Log by <span className="text-gray-600 dark:text-gray-400">{item.done_by}</span>
                     </p>
                     <span className="w-1 h-1 bg-gray-200 dark:bg-[#334155] rounded-full" />
                     <p className="text-[10px] text-gray-400 dark:text-[#64748B] font-medium tracking-tight">
                       {new Date(item.timestamp).toLocaleString(void 0, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                     </p>
                   </div>
                   {item.details?.reason && <div className="mt-2 p-3 bg-red-50/50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20">
                        <p className="text-[10px] text-red-700 dark:text-red-400 font-black mb-1 leading-none">Reason for rejection *</p>
                        <p className="text-[12px] text-red-600 dark:text-red-400 font-bold italic leading-tight">"{item.details.reason}"</p>
                      </div>}
                </div>
              </div>)}
          </motion.div>}
      </AnimatePresence>
    </div>;
}, "AuditTrail");
export {
  AccountsPage
};
