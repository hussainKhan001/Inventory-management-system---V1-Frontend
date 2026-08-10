var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "../store";
import { motion, AnimatePresence } from "motion/react";
import { Virtuoso, TableVirtuoso } from "react-virtuoso";
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
  ChevronRight,
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
  Printer,
  X,
  Building,
  LayoutDashboard,
  ClipboardList,
  Activity,
  Send,
  BarChart2,
  Settings,
  BookOpen,
} from "lucide-react";
import { fmtCur, formatDate, calculatePriceComparison, isNewItem } from "../utils";
import { normalizeShipments } from "../utils/normalizeShipments";
import { cn } from "../lib/utils";
import { generatePOPDF, generateTransactionDetailPDF } from "../utils/pdfGenerator";
import { StatusBadge, PageHeader, Card, ConfirmModal, Modal, Btn, Table, Tr, Td } from "../components/ui";
import { SearchFilter, DateRangePicker, SelectFilter, FilterRow } from "../components/ui/Filters";
import { POViewModal } from "./po/POViewModal";
import { calcChargeTotal } from "./po/poUtils";
import { GRNDetailModal } from "../components/GRNDetailModal";
import { ProcurementTracker } from "./ProcurementTracker";
import { ImageViewer } from "../components/ImageViewer";
import { api, bustCache } from "../services/api";
import { toast } from "react-hot-toast";
import emailjs from "@emailjs/browser";
import { DatePicker } from "../components/ui/DatePicker";
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";
emailjs.init(EMAILJS_PUBLIC_KEY);

const PAYMENT_APPROVAL_LEVELS = [
  { level: 1, role: "AGM",      label: "Account AGM",  permission: "APPROVE_PAYMENT_AGM" },
  { level: 2, role: "GM",       label: "Account GM",   permission: "APPROVE_PAYMENT_GM" },
  { level: 3, role: "Director", label: "Director",     permission: "APPROVE_PAYMENT_DIRECTOR" },
];
const AccountsPage = /* @__PURE__ */ __name(() => {
  const { pos, grns: storeGrns, updatePO, user, fetchResource, suppliers, materialRequirements, uploadImage, hasPermission, settings, fetchRolePermissions } = useAppStore();
  const [filter, setFilter] = useState("All");
  const [view, setView] = useState("accounts");
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  useEffect(() => {
    if (!selectedPO?.id) { setSelectedAccountId(null); return; }
    api.get(`accounts/by-po/${selectedPO.id}`).then(res => {
      setSelectedAccountId(res?.data?.id || res?.id || null);
    }).catch(() => setSelectedAccountId(null));
  }, [selectedPO?.id]);

  useEffect(() => {
    const handler = async ({ detail }) => {
      if (detail.source !== 'Account') return;
      const targetPoId = detail.poId;
      if (!targetPoId) return;
      let po = pos.find(p => p.id === targetPoId);
      if (!po) {
        try {
          const res = await api.get('pos', { search: targetPoId, limit: 1 });
          po = res?.data?.[0];
        } catch {}
      }
      if (po) setSelectedPO(po);
    };
    window.addEventListener('ledger:open', handler);
    return () => window.removeEventListener('ledger:open', handler);
  }, [pos]);

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
    roundOff: 0,
    bank: "",
    utr: "",
    chequeNo: "",
    chequeDate: "",
    screenshot: null,
    previewUrl: "",
    remarks: "",
    fromCompany: "",
    toCompany: "",
    vendorBankDetails: null,
    paymentType: "full",
  });
  const fileInputRef = useRef(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [deleteConfirmPO, setDeleteConfirmPO] = useState(null);
  const [isDeletingPayment, setIsDeletingPayment] = useState(false);
  const [removeConfirmPO, setRemoveConfirmPO] = useState(null);
  const [isRemovingFromAccounts, setIsRemovingFromAccounts] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [verifyRemark, setVerifyRemark] = useState("");
  const [showVerifyRemark, setShowVerifyRemark] = useState(false);
  const [localPos, setLocalPos] = useState([]);
  const [payApproveReject, setPayApproveReject] = useState({ show: false, level: null, reason: "" });
  const [physicalCheckList, setPhysicalCheckList] = useState({});
  const [payApproveForm, setPayApproveForm] = useState({ show: false, level: null, remark: "" });
  const [showBillApproveForm, setShowBillApproveForm] = useState(false);
  const [billApproveRemark, setBillApproveRemark] = useState("");
  const [showL2ApproveForm, setShowL2ApproveForm] = useState(false);
  const [l2ApproveRemark, setL2ApproveRemark] = useState("");
  const [showL2RejectForm, setShowL2RejectForm] = useState(false);
  const [l2RejectReason, setL2RejectReason] = useState("");
  const [approvalSubFilter, setApprovalSubFilter] = useState("all"); // "all" | "pending" | "approved"

  const isSuperAdmin = useMemo(
    () => !user?.role || (user?.role || "").toLowerCase() === "super admin" || user?.isSuperAdmin || (user?.role || "").toLowerCase() === "admin",
    [user?.role, user?.isSuperAdmin]
  );
  const canAccessTab = useCallback(
    (perm) => {
      if (!perm) return true;
      if (isSuperAdmin) return true;
      return hasPermission(perm);
    },
    [isSuperAdmin, hasPermission]
  );
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
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    const ACCOUNTS_STATUSES = ["GRN Variance", "GRN Fulfilled", "Ready for Payment", "PO Closed"];
    try {
      // Suppliers can load silently in background — they're already in store most of the time
      const suppliersPromise = fetchResource("suppliers", 1, 5000, true);

      // Fetch accounts-eligible POs directly — independent of global pos state
      const posRes = await api.get("pos", {
        limit: 1000,
        filter: JSON.stringify({ status: { $in: ACCOUNTS_STATUSES } }),
      });
      const rows = posRes?.success && posRes.data ? posRes.data : [];
      setLocalPos(rows);

      // Fetch GRNs (needs PO IDs) and suppliers in parallel
      const poIds = rows.map((p) => p.id).filter(Boolean);
      const [grnRes] = await Promise.all([
        poIds.length
          ? api.get("grn", { limit: 1000, slim: "1", filter: JSON.stringify({ poId: { $in: poIds } }) }).catch(() => ({ success: false }))
          : Promise.resolve({ success: true, data: [] }),
        suppliersPromise,
      ]);
      if (grnRes?.success && grnRes.data) {
        setAllGrns(grnRes.data);
        // Cache for instant display on next visit
        try {
          const ck = `accounts_cache_v4_${user?.id || ""}`;
          localStorage.setItem(ck, JSON.stringify({ pos: rows, grns: grnRes.data, ts: Date.now() }));
        } catch {}
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load accounts data. Please check your connection.");
    }
    setIsRefreshing(false);
  }, [fetchResource, user?.id]);
  useEffect(() => {
    // Bust stale api.js cache so Super Admin permission changes reflect immediately
    bustCache("role-permissions");
    fetchRolePermissions();
    // Show cached data instantly (first paint) — then always refresh in background
    try {
      const ck = `accounts_cache_v4_${user?.id || ""}`;
      const cached = JSON.parse(localStorage.getItem(ck) || "null");
      if (cached && Date.now() - cached.ts < 10 * 60 * 1000) {
        setLocalPos(cached.pos || []);
        setAllGrns(cached.grns || []);
      }
    } catch {}
    // api.js has 30s in-memory cache — same-session re-navigations won't hit the server
    refresh();
  }, []);

  // When the global store's grns update (WebSocket broadcast):
  // • FETCH and ADD POs that became accounts-eligible via a new GRN (unknown PO IDs)
  // • ADD new GRNs for POs already in localPos
  // • MERGE payment-only fields on existing GRNs (paymentStatus, invoiceAmount, payment,
  //   verifiedBy/At, approvedBy/At, and per-receipt equivalents).
  // Quantity fields (items[].received, receipts[].items) are intentionally NOT overwritten
  // so that receipt batch additions don't break locked invoice amounts.
  useEffect(() => {
    if (!storeGrns?.length || !localPos?.length) return;
    const accountsPOIds = new Set(localPos.map(p => p.id));

    // Detect GRNs whose PO is not yet in Accounts — fetch and surface those POs
    const unknownPoIds = [
      ...new Set(
        storeGrns
          .filter(g => g.poId && !accountsPOIds.has(g.poId))
          .map(g => g.poId)
      )
    ];
    if (unknownPoIds.length > 0) {
      api
        .get("pos", {
          limit: unknownPoIds.length + 5,
          filter: JSON.stringify({
            id: { $in: unknownPoIds },
            status: { $in: ["GRN Variance", "GRN Fulfilled", "Ready for Payment", "PO Closed"] },
          }),
        })
        .then(res => {
          if (!res?.success || !res.data?.length) return;
          setLocalPos(prev => {
            const ids = new Set(prev.map(p => p.id));
            const toAdd = res.data.filter(p => !ids.has(p.id));
            return toAdd.length ? [...toAdd, ...prev] : prev;
          });
          const fetchedPoIds = new Set(res.data.map(p => p.id));
          const grnToAdd = storeGrns.filter(g => fetchedPoIds.has(g.poId));
          if (grnToAdd.length) {
            setAllGrns(prev => {
              const prevIds = new Set(prev.map(g => g.id));
              const fresh = grnToAdd.filter(g => !prevIds.has(g.id));
              return fresh.length ? [...prev, ...fresh] : prev;
            });
          }
        })
        .catch(() => {});
    }

    setAllGrns(prev => {
      const prevMap = new Map(prev.map(g => [g.id, g]));
      let changed = false;

      const merged = prev.map(g => {
        const sg = storeGrns.find(s => s.id === g.id);
        if (!sg) return g;

        // Check if any payment field changed
        const rootChanged =
          sg.paymentStatus !== g.paymentStatus ||
          sg.invoiceAmount !== g.invoiceAmount ||
          sg.invoiceNo     !== g.invoiceNo;

        const receiptsChanged = (sg.receipts || []).some((r, i) =>
          r.paymentStatus !== g.receipts?.[i]?.paymentStatus ||
          r.invoiceAmount !== g.receipts?.[i]?.invoiceAmount
        );

        if (!rootChanged && !receiptsChanged) return g;
        changed = true;

        // Merge only payment fields — keep original quantity data
        return {
          ...g,
          paymentStatus: sg.paymentStatus,
          invoiceAmount: sg.invoiceAmount,
          invoiceNo:     sg.invoiceNo,
          verifiedBy:    sg.verifiedBy,
          verifiedAt:    sg.verifiedAt,
          verifyRemark:  sg.verifyRemark,
          approvedBy:    sg.approvedBy,
          approvedAt:    sg.approvedAt,
          approveRemark: sg.approveRemark,
          payment:       sg.payment,
          receipts: (g.receipts || []).map((r, i) => {
            const sr = sg.receipts?.[i];
            if (!sr) return r;
            return {
              ...r,
              paymentStatus: sr.paymentStatus,
              invoiceAmount: sr.invoiceAmount,
              invoiceNo:     sr.invoiceNo,
              verifiedBy:    sr.verifiedBy,
              verifiedAt:    sr.verifiedAt,
              verifyRemark:  sr.verifyRemark,
              approvedBy:    sr.approvedBy,
              approvedAt:    sr.approvedAt,
              approveRemark: sr.approveRemark,
              payment:       sr.payment,
            };
          }),
        };
      });

      // Add brand-new GRNs for known POs
      const fresh = storeGrns.filter(g => accountsPOIds.has(g.poId) && !prevMap.has(g.id));
      if (!changed && !fresh.length) return prev;
      return [...merged, ...fresh];
    });
  }, [storeGrns]);

  // Real-time PO status changes from WebSocket (DATA_UPDATED: pos)
  // Updates status/accountStatus on existing localPos entries and surfaces newly-eligible POs
  useEffect(() => {
    if (!pos?.length) return;
    const GRN_STATUSES = ["GRN Variance", "GRN Fulfilled", "Ready for Payment", "PO Closed"];
    setLocalPos(prev => {
      // If localPos is empty (e.g. user landed directly on Accounts), initialise from pos
      if (!prev.length) {
        const init = pos.filter(p => GRN_STATUSES.includes(p.status));
        return init.length ? init : prev;
      }

      const localPoMap = new Map(prev.map(p => [p.id, p]));
      let changed = false;

      const updated = prev.map(lp => {
        const sp = pos.find(p => p.id === lp.id);
        if (!sp) return lp;
        if (
          sp.accountStatus === lp.accountStatus &&
          sp.status        === lp.status &&
          sp.totalPaid     === lp.totalPaid
        ) return lp;
        changed = true;
        return { ...lp, ...sp };
      });

      // POs that just became accounts-eligible (GRN created → status updated)
      const toAdd = pos.filter(
        p => !localPoMap.has(p.id) && GRN_STATUSES.includes(p.status)
      );
      if (toAdd.length) changed = true;

      if (!changed) return prev;
      return toAdd.length ? [...toAdd, ...updated] : updated;
    });
  }, [pos]);

  // Returns the latest GRN that has not yet been linked to a payment installment.
  // Needed because a PO can have multiple GRN batches (multiple shipments).
  const getCurrentGRN = useCallback((po, grns) => {
    const poGRNs = (grns || []).filter(g => g.poId === po.id);
    if (!poGRNs.length) return null;
    if (poGRNs.length === 1) return poGRNs[0];
    const sorted = [...poGRNs].sort((a, b) =>
      new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
    );
    const paidGRNIds = new Set((po.paymentHistory || []).map(ph => ph.grnId).filter(Boolean));
    return sorted.find(g => !paidGRNIds.has(g.id)) || sorted[0];
  }, []);

  // List view: always show PO Grand Total so user sees the full contract amount.
  // Cycle-specific payable (per GRN batch) is shown inside the drawer.
  const getPayableAmount = useCallback((po) => {
    if ((po.accountStatus || "").toLowerCase() === "paid")
      return po.totalPaid || po.totalValue || 0;
    return po.totalValue || 0;
  }, []);

  // O(1) GRN lookup by PO id — avoids O(n*m) scans in metrics + filteredPOs
  const grnsByPoId = useMemo(() => {
    const map = new Map();
    for (const g of allGrns) {
      if (!map.has(g.poId)) map.set(g.poId, []);
      map.get(g.poId).push(g);
    }
    return map;
  }, [allGrns]);

  // O(1) supplier name lookup by id
  const supplierNameMap = useMemo(() => {
    const map = new Map();
    for (const s of suppliers) {
      if (s.id) map.set(s.id, s.companyName || s.name || s.id);
      if (s._id) map.set(s._id, s.companyName || s.name || s._id);
    }
    return map;
  }, [suppliers]);

  // O(1) id lookup via map; falls back to linear scan for name-based lookups
  const getSupplierName = useCallback((supplierIdOption) => {
    if (!supplierIdOption) return "Unknown Vendor";
    const fromMap = supplierNameMap.get(supplierIdOption);
    if (fromMap) return fromMap;
    const s = suppliers.find(
      (sup) => (sup.companyName || "").toLowerCase() === supplierIdOption.toLowerCase() || (sup.name || "").toLowerCase() === supplierIdOption.toLowerCase()
    );
    return s?.companyName || supplierIdOption;
  }, [supplierNameMap, suppliers]);

  const metrics = useMemo(() => {
    // Single pass over localPos — replaces 8 separate .filter() iterations
    const now = new Date();
    const nowMonth = now.getMonth();
    const nowYear = now.getFullYear();
    // Hoist permission checks: called once instead of once per PO
    const hasAGM = hasPermission("APPROVE_PAYMENT_AGM");
    const hasDIR = hasPermission("APPROVE_PAYMENT_DIRECTOR");
    const acc = {
      pendingPayment: 0, totalPendingAmount: 0,
      pendingVerify: 0, pendingVerified: 0, pendingApproved: 0,
      l2DirectorCount: 0, myApprovalsCount: 0,
      paidCount: 0, totalPaidAmount: 0, rejectedCount: 0,
    };
    for (const p of localPos) {
      const st = (p.accountStatus || "").toLowerCase();
      const grns = grnsByPoId.get(p.id) || [];

      // pendingPayment + totalPendingAmount
      if (st === "payment_pending" || st === "payment_initiated" || st === "physical_check") {
        acc.pendingPayment++;
        acc.totalPendingAmount += Math.max(0, (p.totalValue || 0) - (p.totalPaid || 0));
      }

      // pendingVerify
      const isAdvanced = st === "bill_verified" || st === "bill_approved" || st === "payment_pending" || st === "payment_initiated" || st === "physical_check" || st === "paid" || st === "rejected";
      if (!isAdvanced) {
        if (st === "partial_paid") {
          const totalPd = p.totalPaid || p.payment?.amountPaid || 0;
          if (totalPd < (p.totalValue || 0) - 0.5) acc.pendingVerify++;
        } else {
          acc.pendingVerify++;
        }
      }

      // pendingVerified
      if (st !== "bill_approved" && st !== "payment_pending" && st !== "payment_initiated" && st !== "physical_check" && st !== "paid" && st !== "rejected") {
        if (st === "bill_verified" || grns.some(g => (g.paymentStatus || "").toLowerCase() === "bill_verified"))
          acc.pendingVerified++;
      }

      // pendingApproved + l2DirectorCount (share the same skip set)
      if (st !== "payment_pending" && st !== "physical_check" && st !== "paid" && st !== "rejected") {
        const isBillApproved = st === "bill_approved" || Boolean(p.billApprovedBy) || Boolean(p.billApprovedDate);
        if (isBillApproved) {
          acc.pendingApproved++;
          acc.l2DirectorCount++;
        } else if (st === "payment_initiated") {
          const approvals = p.paymentApprovals || [];
          const l1 = approvals.find(a => a.level === 1);
          const l3 = approvals.find(a => a.level === 3);
          if (l1?.status === "Approved") acc.pendingApproved++;
          if (l1?.status === "Approved" && (!l3 || l3.status !== "Approved")) acc.l2DirectorCount++;
        } else {
          const hasApprovedGRN = grns.some(g => (g.paymentStatus || "").toLowerCase() === "bill_approved");
          if (hasApprovedGRN) { acc.pendingApproved++; acc.l2DirectorCount++; }
        }
      }

      // myApprovalsCount
      if (st !== "payment_pending" && st !== "physical_check" && st !== "paid" && st !== "rejected") {
        let myMatch = false;
        if (hasAGM) {
          const isVerified = st === "bill_verified" || Boolean(p.billVerifiedBy) || Boolean(p.billVerifiedDate) ||
            grns.some(g => (g.paymentStatus || "").toLowerCase() === "bill_verified");
          if (isVerified && st !== "bill_approved") myMatch = true;
        }
        if (!myMatch && hasDIR) {
          const isBillApproved = st === "bill_approved" || Boolean(p.billApprovedBy) || Boolean(p.billApprovedDate) ||
            grns.some(g => (g.paymentStatus || "").toLowerCase() === "bill_approved");
          if (isBillApproved) {
            myMatch = true;
          } else if (st === "payment_initiated") {
            const approvals = p.paymentApprovals || [];
            const l1 = approvals.find(a => a.level === 1);
            const l3 = approvals.find(a => a.level === 3);
            if (l1?.status === "Approved" && (!l3 || l3.status !== "Approved")) myMatch = true;
          }
        }
        if (myMatch) acc.myApprovalsCount++;
      }

      // paidThisMonth + totalPaidAmount
      if (st === "paid" && p.payment?.date) {
        const d = new Date(p.payment.date);
        if (d.getMonth() === nowMonth && d.getFullYear() === nowYear) {
          acc.paidCount++;
          acc.totalPaidAmount += p.payment?.amountPaid || 0;
        }
      }

      // rejectedCount
      if (st === "rejected") acc.rejectedCount++;
    }
    return acc;
  }, [localPos, grnsByPoId]);
  const vendorOptions = useMemo(
    () => suppliers.map((s) => ({ label: s.companyName || s.name || s.id, value: s.id || s._id })),
    [suppliers]
  );
  const projectOptions = useMemo(
    () => [...new Set(localPos.map((p) => p.project || p.location).filter(Boolean))].map((v) => ({ label: v, value: v })),
    [localPos]
  );
  const companyOptions = useMemo(() => {
    const fromSettings = (settings.companies || []).map(c => c.name).filter(Boolean);
    const fromPOs = localPos.map(p => p.companyName).filter(Boolean);
    const combined = [...new Set([...fromSettings, ...fromPOs])];
    return combined.map(name => ({ label: name, value: name }));
  }, [settings.companies, localPos]);

  const filteredPOs = useMemo(() => {
    const all = localPos;
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
        const cardGRNs = grnsByPoId.get(p.id) || [];
        const cardShipments = cardGRNs.flatMap(g => normalizeShipments(g));
        const totalShipmentValue = cardShipments.reduce((sum, sh) => {
          if (sh.invoiceAmount) return sum + sh.invoiceAmount;
          if (sh.paymentStatus === "paid" && sh.payment?.amount) return sum + sh.payment.amount;
          return sum + (sh.items || []).reduce((itemSum, gi) => {
            const rcv = gi.received ?? gi.qty ?? 0;
            const poItem = (p.items || []).find(pi =>
              (pi.sku && gi.sku && pi.sku === gi.sku) ||
              (pi.itemName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
            );
            const rootItem = (sh.rootItems || []).find(ri =>
              (ri.sku && gi.sku && ri.sku === gi.sku) ||
              (ri.itemName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
            );
            const rate = gi.rate || rootItem?.rate || poItem?.rate || 0;
            const gstPct = gi.gstPct ?? rootItem?.gstPct ?? poItem?.gstPct ?? 0;
            const rawGstType = gi.gstType || rootItem?.gstType || poItem?.gstType || "Exclusive";
            const isInclusive = typeof rawGstType === "string" && rawGstType.toLowerCase().includes("inclus");
            const gstType = isInclusive ? rawGstType : "Exclusive";
            return itemSum + calcChargeTotal(rcv * rate, gstPct, gstType);
          }, 0);
        }, 0);

        const poTotalVal = totalShipmentValue > 0 ? totalShipmentValue : (p.totalValue || 0);
        if (totalPd >= poTotalVal - 0.5) status = "paid";
      }

      if (filter === "Verify Bills") {
        const advanced = ["bill_verified", "bill_approved", "payment_pending", "payment_initiated", "physical_check", "paid", "partial_paid", "rejected"];
        if (advanced.includes(status)) return false;
      }
      if (filter === "Verified") {
        const st = (p.accountStatus || "").toLowerCase();
        // bill_verified OR old payment_initiated where L1 hasn't approved yet
        const isLegacyL1Pending = st === "payment_initiated" && (() => {
          const approvals = p.paymentApprovals || [];
          const l1 = approvals.find(a => a.level === 1);
          return !l1 || l1.status !== "Approved";
        })();
        const isVerified = st === "bill_verified" || isLegacyL1Pending ||
          Boolean(p.billVerifiedBy) || Boolean(p.billVerifiedDate) ||
          (grnsByPoId.get(p.id) || []).some(g => (g.paymentStatus || "").toLowerCase() === "bill_verified");
        if (!isVerified) return false;
      }
      if (filter === "Approved") {
        // L1 AGM tab — show bill_verified POs waiting for AGM approval (same as Verified filter)
        const st = (p.accountStatus || "").toLowerCase();
        const isLegacyL1Pending = st === "payment_initiated" && (() => {
          const approvals = p.paymentApprovals || [];
          const l1 = approvals.find(a => a.level === 1);
          return !l1 || l1.status !== "Approved";
        })();
        const isVerified = st === "bill_verified" || isLegacyL1Pending ||
          Boolean(p.billVerifiedBy) || Boolean(p.billVerifiedDate) ||
          (grnsByPoId.get(p.id) || []).some(g => (g.paymentStatus || "").toLowerCase() === "bill_verified");
        if (!isVerified) return false;
      }
      if (filter === "Pending Payment") {
        const st = (p.accountStatus || "").toLowerCase();
        if (!["payment_pending", "payment_initiated", "physical_check"].includes(st)) return false;
      }
      if (filter === "My Approvals") {
        const st = (p.accountStatus || "").toLowerCase();
        if (["payment_pending", "physical_check", "paid", "rejected"].includes(st)) return false;
        let match = false;
        if (hasPermission("APPROVE_PAYMENT_AGM")) {
          const isVerified = st === "bill_verified" || Boolean(p.billVerifiedBy) || Boolean(p.billVerifiedDate) ||
            (grnsByPoId.get(p.id) || []).some(g => (g.paymentStatus || "").toLowerCase() === "bill_verified");
          if (isVerified && st !== "bill_approved") match = true;
        }
        if (!match && hasPermission("APPROVE_PAYMENT_DIRECTOR")) {
          const isBillApproved = st === "bill_approved" || Boolean(p.billApprovedBy) || Boolean(p.billApprovedDate) ||
            (grnsByPoId.get(p.id) || []).some(g => (g.paymentStatus || "").toLowerCase() === "bill_approved");
          if (isBillApproved) match = true;
          if (!match && st === "payment_initiated") {
            const approvals = p.paymentApprovals || [];
            const l1 = approvals.find(a => a.level === 1);
            const l3 = approvals.find(a => a.level === 3);
            if (l1?.status === "Approved" && (!l3 || l3.status !== "Approved")) match = true;
          }
        }
        if (!match) return false;
      }
      if (filter === "L2 Director") {
        const st = (p.accountStatus || "").toLowerCase();
        if (["payment_pending", "physical_check", "paid", "rejected"].includes(st)) return false;
        // bill_approved (old flow waiting for Director) OR payment_initiated where L1 done but L3 pending
        const isBillApproved = st === "bill_approved" || Boolean(p.billApprovedBy) || Boolean(p.billApprovedDate) ||
          (grnsByPoId.get(p.id) || []).some(g => (g.paymentStatus || "").toLowerCase() === "bill_approved");
        const isPaymentL2Pending = st === "payment_initiated" && (() => {
          const approvals = p.paymentApprovals || [];
          const l1 = approvals.find(a => a.level === 1);
          const l3 = approvals.find(a => a.level === 3);
          return l1?.status === "Approved" && (!l3 || l3.status !== "Approved");
        })();
        if (!isBillApproved && !isPaymentL2Pending) return false;
      }
      if (filter === "Paid" && status !== "paid") return false;
      if (filter === "Rejected" && status !== "rejected") return false;
      if (search) {
        const q = search.trim().toLowerCase();
        const matchesPO = p.id?.toLowerCase().includes(q);
        const matchesVendor = (supplierNameMap.get(p.supplier) || p.supplier || "").toLowerCase().includes(q);
        const poGRNs = grnsByPoId.get(p.id) || [];
        const matchesInvoice = poGRNs.some(g =>
          (g.invoiceNo || "").toLowerCase().includes(q) ||
          (g.receipts || []).some(r => (r.invoiceNo || "").toLowerCase().includes(q))
        );
        if (!matchesPO && !matchesVendor && !matchesInvoice) return false;
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
      if (filterCompany && p.companyName !== filterCompany) return false;
      return true;
    }).sort((a, b) => {
      const da = new Date(a.createdAt || a.date || 0).getTime();
      const db = new Date(b.createdAt || b.date || 0).getTime();
      return db - da;
    });
  }, [localPos, grnsByPoId, supplierNameMap, filter, approvalSubFilter, search, startDate, endDate, filterVendor, filterProject, filterCompany]);

  // Precompute per-PO shipment stats once — itemContent reads this map with O(1) lookup
  const shipmentStatsByPoId = useMemo(() => {
    const map = new Map();
    for (const [poId, grns] of grnsByPoId) {
      const shipments = grns.flatMap(g => normalizeShipments(g));
      const paidCount     = shipments.filter(s => s.paymentStatus === "paid").length;
      const pendingCount  = shipments.filter(s => s.paymentStatus === "payment_pending").length;
      const verifiedCount = shipments.filter(s => s.paymentStatus === "bill_verified").length;
      const unpaidCount   = shipments.filter(s => (s.paymentStatus || "unpaid") === "unpaid").length;
      const totalPaidCard = shipments.reduce((sum, s) => sum + (s.payment?.amount || 0), 0);
      const hasVerifiedGRN = shipments.some(s => (s.paymentStatus || "").toLowerCase() === "bill_verified");
      const hasApprovedGRN = shipments.some(s => (s.paymentStatus || "").toLowerCase() === "bill_approved");
      map.set(poId, { shipments, paidCount, pendingCount, verifiedCount, unpaidCount, totalPaidCard, hasVerifiedGRN, hasApprovedGRN });
    }
    return map;
  }, [grnsByPoId]);

  const handleBillVerify = /* @__PURE__ */ __name(async (poId, remark) => {
    if (!hasPermission("VERIFY_BILL")) {
      toast.error("Unauthorized: Access to verify bills is restricted.");
      return;
    }
    if (!remark || !remark.trim()) {
      toast.error("Verification remark is mandatory.");
      return;
    }
    setIsSubmitting(true);
    try {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const po = localPos.find((p) => p.id === poId);
      const audit = {
        timestamp,
        action: "bill_verified",
        po_number: poId,
        done_by: user?.name || "System",
        amount: po?.totalValue || 0,
        details: remark ? { remark } : undefined
      };
      await updatePO(poId, {
        accountStatus: "bill_verified",
        verifiedBy: user?.name || "Accounts Team",
        verifiedAt: timestamp,
        verifyRemark: remark || null,
        auditTrail: [...(po?.auditTrail || []), audit]
      });
      // Also persist bill_verified on each GRN so status survives a page refresh
      const poGRNs = allGrns.filter(g => g.poId === poId);
      await Promise.allSettled(poGRNs.map(g => {
        if (g.receipts?.length) {
          return Promise.allSettled(g.receipts.map((_, idx) =>
            api.putSimple(`grn/${g.id}/receipt/${idx}/bill-verify`, { remark, invoiceNo: g.invoiceNo })
          ));
        }
        return api.putSimple(`grn/${g.id}/bill-verify`, { remark, invoiceNo: g.invoiceNo });
      }));
      setLocalPos(prev => prev.map(p => p.id === poId ? { ...p, accountStatus: "bill_verified", verifiedBy: user?.name || "Accounts Team", verifiedAt: timestamp, verifyRemark: remark || null } : p));
      setAllGrns(prev => prev.map(g => g.poId === poId ? { ...g, paymentStatus: "bill_verified", verifiedBy: user?.name, verifiedAt: timestamp } : g));
      toast.success("Bill verified! Moved to Verified tab for approval.");
      setSelectedPO(null);
      setShowVerifyRemark(false);
      setVerifyRemark("");
    } catch (err) {
      toast.error(err?.message || "Failed to verify bill.");
    } finally {
      setIsSubmitting(false);
    }
  }, "handleBillVerify");

  const handleBillApprove = /* @__PURE__ */ __name(async (poId, remark) => {
    if (!hasPermission("APPROVE_PAYMENT_AGM")) {
      toast.error("Unauthorized: L1 AGM approval access is restricted.");
      return;
    }
    if (!remark || !remark.trim()) {
      toast.error("Approval remark is mandatory.");
      return;
    }
    setIsSubmitting(true);
    try {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const po = localPos.find((p) => p.id === poId);
      const audit = {
        timestamp,
        action: "bill_approved",
        po_number: poId,
        done_by: user?.name || "System",
        amount: po?.totalValue || 0,
        details: { remark: remark.trim() }
      };
      await updatePO(poId, {
        accountStatus: "bill_approved",
        billApprovedBy: user?.name || "Finance Dept",
        billApprovedDate: timestamp,
        billApproveRemark: remark.trim(),
        auditTrail: [...(po?.auditTrail || []), audit]
      });
      // Also persist bill_approved on each GRN so status survives a page refresh
      const poGRNs = allGrns.filter(g => g.poId === poId);
      await Promise.allSettled(poGRNs.map(g => {
        if (g.receipts?.length) {
          return Promise.allSettled(g.receipts.map((_, idx) =>
            api.putSimple(`grn/${g.id}/receipt/${idx}/bill-approve`, {})
          ));
        }
        return api.putSimple(`grn/${g.id}/bill-approve`, {});
      }));
      setLocalPos(prev => prev.map(p => p.id === poId ? { ...p, accountStatus: "bill_approved", billApprovedBy: user?.name || "Finance Dept", billApprovedDate: timestamp, billApproveRemark: remark.trim() } : p));
      setAllGrns(prev => prev.map(g => g.poId === poId ? { ...g, paymentStatus: "bill_approved" } : g));
      toast.success("L1 AGM approved! Moved to L2 Director approval.");
      setSelectedPO(null);
    } catch (err) {
      toast.error(err?.message || "Failed to approve bill.");
    } finally {
      setIsSubmitting(false);
    }
  }, "handleBillApprove");

  const handleRevokeVerify = /* @__PURE__ */ __name(async (poId) => {
    if (!hasPermission("APPROVE_PAYMENT_AGM")) {
      toast.error("Unauthorized: L1 AGM approval access is restricted.");
      return;
    }
    setIsSubmitting(true);
    try {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const po = localPos.find((p) => p.id === poId);
      const audit = {
        timestamp,
        action: "verify_revoked",
        po_number: poId,
        done_by: user?.name || "System",
        amount: po?.totalValue || 0,
        details: { note: "Verification revoked for re-check" }
      };
      await updatePO(poId, {
        accountStatus: "bill_verify",
        verifiedBy: null,
        verifiedAt: null,
        verifyRemark: null,
        auditTrail: [...(po?.auditTrail || []), audit]
      });
      setLocalPos(prev => prev.map(p => p.id === poId ? { ...p, accountStatus: "bill_verify", verifiedBy: null, verifiedAt: null, verifyRemark: null } : p));
      toast.success("Verification revoked. Bill sent back for re-verification.");
      setSelectedPO(null);
    } catch (err) {
      toast.error("Failed to revoke verification.");
    } finally {
      setIsSubmitting(false);
    }
  }, "handleRevokeVerify");

  // ── GRN-level payment handlers ──────────────────────────────────────────────
  const handleGRNVerify = /* @__PURE__ */ __name(async (grnId, remark, invoiceNo, invoiceAmount, receiptIdx = null) => {
    if (!hasPermission("VERIFY_BILL")) { toast.error("Unauthorized: Access to verify bills is restricted."); return; }
    if (!remark || !remark.trim()) { toast.error("Verification remark is mandatory."); return; }
    setIsSubmitting(true);
    try {
      const path = receiptIdx !== null
        ? `grn/${grnId}/receipt/${receiptIdx}/bill-verify`
        : `grn/${grnId}/bill-verify`;
      const res = await api.putSimple(path, { remark, invoiceNo, invoiceAmount: invoiceAmount ? Number(invoiceAmount) : undefined });
      if (!res.success) throw new Error(res.message);
      const timestamp = new Date().toISOString();
      const verifiedFields = { paymentStatus: "bill_verified", verifiedBy: user?.name, verifiedAt: timestamp, verifyRemark: remark || null };
      setAllGrns(prev => prev.map(g => {
        if (g.id !== grnId) return g;
        if (receiptIdx === null) return { ...g, ...verifiedFields, invoiceNo: invoiceNo || g.invoiceNo, invoiceAmount: invoiceAmount ? Number(invoiceAmount) : g.invoiceAmount };
        return { ...g, receipts: (g.receipts || []).map((r, i) =>
          i === receiptIdx ? { ...r, ...verifiedFields, invoiceNo: invoiceNo || r.invoiceNo, invoiceAmount: invoiceAmount ? Number(invoiceAmount) : r.invoiceAmount } : r
        )};
      }));
      // Update PO accountStatus to bill_verified so it moves from Draft → Verified tab
      const grn = allGrns.find(g => g.id === grnId);
      const poId = grn?.poId;
      if (poId) {
        await updatePO(poId, {
          accountStatus: "bill_verified",
          verifiedBy: user?.name,
          verifiedAt: timestamp,
          verifyRemark: remark || null,
        });
        setLocalPos(prev => prev.map(p => p.id === poId
          ? { ...p, accountStatus: "bill_verified", verifiedBy: user?.name, verifiedAt: timestamp, verifyRemark: remark || null }
          : p
        ));
      }
      toast.success("Bill verified! Moved to Verified tab for approval.");
    } catch (err) { toast.error(err?.message || "Failed to verify bill."); }
    finally { setIsSubmitting(false); }
  }, "handleGRNVerify");

  const handleGRNApprove = /* @__PURE__ */ __name(async (grnId, receiptIdx = null, remark = "") => {
    if (!hasPermission("APPROVE_PAYMENT_AGM")) { toast.error("Unauthorized: L1 AGM approval access is restricted."); return; }
    setIsSubmitting(true);
    try {
      const path = receiptIdx !== null
        ? `grn/${grnId}/receipt/${receiptIdx}/bill-approve`
        : `grn/${grnId}/bill-approve`;
      const res = await api.putSimple(path, { remark });
      if (!res.success) throw new Error(res.message);
      const timestamp = new Date().toISOString();
      const approvedFields = { paymentStatus: "bill_approved", approvedBy: user?.name, approvedAt: timestamp, approveRemark: remark || null };
      setAllGrns(prev => prev.map(g => {
        if (g.id !== grnId) return g;
        if (receiptIdx === null) return { ...g, ...approvedFields };
        return { ...g, receipts: (g.receipts || []).map((r, i) =>
          i === receiptIdx ? { ...r, ...approvedFields } : r
        )};
      }));
      // Update PO accountStatus to bill_approved so it appears in the Approved tab
      const grn = allGrns.find(g => g.id === grnId);
      const poId = grn?.poId;
      if (poId) {
        await updatePO(poId, {
          accountStatus: "bill_approved",
          billApprovedBy: user?.name,
          billApprovedDate: timestamp,
          approveRemark: remark || null,
        });
        setLocalPos(prev => prev.map(p => p.id === poId
          ? { ...p, accountStatus: "bill_approved", billApprovedBy: user?.name, billApprovedDate: timestamp, approveRemark: remark || null }
          : p
        ));
      }
      toast.success("L1 AGM approved! Bill is ready for L2 Director approval.");
    } catch (err) { toast.error(err?.message || "Failed to approve bill."); }
    finally { setIsSubmitting(false); }
  }, "handleGRNApprove");

  const handleL2GRNApprove = /* @__PURE__ */ __name(async (grnId, receiptIdx = null, remark = "") => {
    if (!hasPermission("APPROVE_PAYMENT_DIRECTOR")) { toast.error("Unauthorized: L2 Director approval access is restricted."); return; }
    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const grn = allGrns.find(g => g.id === grnId);
      const poId = grn?.poId;
      const l2Fields = { paymentStatus: "payment_pending" };
      setAllGrns(prev => prev.map(g => {
        if (g.id !== grnId) return g;
        if (receiptIdx === null) return { ...g, ...l2Fields };
        return { ...g, receipts: (g.receipts || []).map((r, i) => i === receiptIdx ? { ...r, ...l2Fields } : r) };
      }));
      if (poId) {
        await updatePO(poId, { accountStatus: "payment_pending", l2ApprovedBy: user?.name, l2ApprovedAt: timestamp, l2Remark: remark });
        setLocalPos(prev => prev.map(p => p.id === poId ? { ...p, accountStatus: "payment_pending", l2ApprovedBy: user?.name, l2ApprovedAt: timestamp, l2Remark: remark } : p));
      }
      toast.success("L2 Director approved! Ready for payment.");
    } catch (err) { toast.error(err?.message || "Failed."); }
    finally { setIsSubmitting(false); }
  }, "handleL2GRNApprove");

  const handleL2GRNReject = /* @__PURE__ */ __name(async (grnId, receiptIdx = null, reason = "") => {
    if (!hasPermission("APPROVE_PAYMENT_DIRECTOR")) { toast.error("Unauthorized: L2 Director approval access is restricted."); return; }
    setIsSubmitting(true);
    try {
      const grn = allGrns.find(g => g.id === grnId);
      const poId = grn?.poId;
      const revertFields = { paymentStatus: "unpaid", approvedBy: null };
      setAllGrns(prev => prev.map(g => {
        if (g.id !== grnId) return g;
        if (receiptIdx === null) return { ...g, ...revertFields };
        return { ...g, receipts: (g.receipts || []).map((r, i) => i === receiptIdx ? { ...r, ...revertFields } : r) };
      }));
      if (poId) {
        await updatePO(poId, { accountStatus: "bill_verify", billApprovedBy: null, l2ApprovedBy: null, l2ApprovedAt: null, l2Remark: null });
        setLocalPos(prev => prev.map(p => p.id === poId ? { ...p, accountStatus: "bill_verify", billApprovedBy: null, l2ApprovedBy: null } : p));
      }
      toast.success("Rejected by Director. Bill sent back to verifier.");
    } catch (err) { toast.error(err?.message || "Failed."); }
    finally { setIsSubmitting(false); }
  }, "handleL2GRNReject");

  const handleGRNPaymentSubmit = /* @__PURE__ */ __name(async (grnId, receiptIdx = null) => {
    if (!hasPermission("MAKE_PAYMENT")) { toast.error("Unauthorized: Access to process payments is restricted."); return; }
    const required = ["date", "mode", "ref", "amountPaid", "bank"];
    if (paymentForm.mode === "NEFT" || paymentForm.mode === "RTGS" || paymentForm.mode === "UPI") required.push("utr");
    if (paymentForm.mode === "Cheque") required.push("chequeNo", "chequeDate");
    if (!paymentForm.screenshot && !paymentForm.previewUrl) { toast.error("Payment screenshot is mandatory."); return; }
    const missing = required.filter(f => !paymentForm[f]);
    if (missing.length > 0) { toast.error(`Please fill: ${missing.join(", ")}`); return; }
    setIsSubmitting(true);
    try {
      // Upload screenshot first so it's ready when approval completes
      let screenshotUrl = paymentForm.previewUrl;
      if (paymentForm.screenshot) {
        const uploadRes = await uploadImage(paymentForm.screenshot);
        if (uploadRes?.url) screenshotUrl = uploadRes.url;
      }
      const { screenshot, previewUrl, ...form } = paymentForm;
      const pendingGRN = allGrns.find(g => g.id === grnId);
      const poId = pendingGRN?.poId;
      if (!poId) throw new Error("GRN not linked to a PO.");
      // Defer actual GRN payment API call — store data on PO and route through approval chain
      const paymentInitiatedAt = new Date().toISOString();
      // Initialize all approval levels (L1 AGM, L2 GM, L3 Director) as Pending
      const freshApprovals = PAYMENT_APPROVAL_LEVELS.map(l => ({
        level: l.level, role: l.role, label: l.label,
        status: "Pending",
        approvedBy: null,
        approvedAt: null,
        remark: null,
      }));
      await updatePO(poId, {
        accountStatus: "payment_initiated",
        paymentApprovals: freshApprovals,
        pendingPaymentData: { grnId, receiptIdx, form: { ...form, screenshotUrl }, paymentType: form.paymentType || "full" },
        paymentInitiatedBy: user?.name || "—",
        paymentInitiatedAt,
      });
      setLocalPos(prev => prev.map(p => p.id === poId ? {
        ...p, accountStatus: "payment_initiated", paymentApprovals: freshApprovals,
        pendingPaymentData: { grnId, receiptIdx, form: { ...form, screenshotUrl } },
        paymentInitiatedBy: user?.name || "—", paymentInitiatedAt,
      } : p));
      setSelectedPO(prev => prev?.id === poId ? {
        ...prev, accountStatus: "payment_initiated", paymentApprovals: freshApprovals,
        pendingPaymentData: { grnId, receiptIdx, form: { ...form, screenshotUrl } },
        paymentInitiatedBy: user?.name || "—", paymentInitiatedAt,
      } : prev);
      setPaymentForm({ date: new Date().toISOString().split("T")[0], mode: "NEFT", ref: "", amountPaid: 0, roundOff: 0, bank: "", utr: "", chequeNo: "", chequeDate: "", screenshot: null, previewUrl: "", remarks: "", fromCompany: "", toCompany: "", vendorBankDetails: null, paymentType: "full" });
      toast.success("Payment initiated! Sent for approval (AGM → GM → Director).");
    } catch (err) { toast.error(err?.message || "Failed to initiate payment."); }
    finally { setIsSubmitting(false); }
  }, "handleGRNPaymentSubmit");

  const handleGRNVerifyRevert = /* @__PURE__ */ __name(async (grnId, receiptIdx = null) => {
    if (!hasPermission("REVERT_VERIFY")) { toast.error("Unauthorized: Access to revert verification is restricted."); return; }
    setIsSubmitting(true);
    try {
      const path = receiptIdx !== null
        ? `grn/${grnId}/receipt/${receiptIdx}/bill-verify-revert`
        : `grn/${grnId}/bill-verify-revert`;
      const res = await api.putSimple(path, {});
      if (!res.success) throw new Error(res.message);
      const revertedFields = { paymentStatus: "unpaid", verifiedBy: null, verifiedAt: null, verifyRemark: null, approvedBy: null, approvedAt: null };
      setAllGrns(prev => prev.map(g => {
        if (g.id !== grnId) return g;
        if (receiptIdx === null) return { ...g, ...revertedFields };
        return { ...g, receipts: (g.receipts || []).map((r, i) =>
          i === receiptIdx ? { ...r, ...revertedFields } : r
        )};
      }));
      // Revert PO back to bill_verify so it returns to Draft tab
      const grn = allGrns.find(g => g.id === grnId);
      const poId = grn?.poId;
      if (poId) {
        await updatePO(poId, { accountStatus: "bill_verify", verifiedBy: null, verifiedAt: null, verifyRemark: null });
        setLocalPos(prev => prev.map(p => p.id === poId
          ? { ...p, accountStatus: "bill_verify", verifiedBy: null, verifiedAt: null, verifyRemark: null }
          : p
        ));
      }
      toast.success("Verification reverted. Moved back to Draft tab.");
    } catch (err) { toast.error(err?.message || "Failed to revert."); }
    finally { setIsSubmitting(false); }
  }, "handleGRNVerifyRevert");
  const handleGRNShipmentReject = /* @__PURE__ */ __name(async (grnId, receiptIdx = null, reason = "") => {
    if (!hasPermission("VERIFY_BILL")) { toast.error("Unauthorized: Access to reject bills is restricted."); return; }
    setIsSubmitting(true);
    try {
      const path = receiptIdx !== null
        ? `grn/${grnId}/receipt/${receiptIdx}/bill-reject`
        : `grn/${grnId}/bill-reject`;
      const res = await api.putSimple(path, { reason });
      if (!res.success) throw new Error(res.message);
      const rejectedFields = { paymentStatus: "bill_rejected", rejectedBy: user?.name, rejectedAt: new Date().toISOString(), rejectReason: reason };
      setAllGrns(prev => prev.map(g => {
        if (g.id !== grnId) return g;
        if (receiptIdx === null) return { ...g, ...rejectedFields };
        return { ...g, receipts: (g.receipts || []).map((r, i) =>
          i === receiptIdx ? { ...r, ...rejectedFields } : r
        )};
      }));
      toast.success("Shipment bill rejected.");
    } catch (err) { toast.error(err?.message || "Failed to reject shipment."); }
    finally { setIsSubmitting(false); }
  }, "handleGRNShipmentReject");
  const handleGRNMarkPaid = /* @__PURE__ */ __name(async (grnId, receiptIdx = null, formData = {}) => {
    if (!hasPermission("MAKE_PAYMENT")) { toast.error("Unauthorized"); return; }
    setIsSubmitting(true);
    try {
      const grn = allGrns.find(g => g.id === grnId);
      const poId = grn?.poId;
      if (!poId) throw new Error("GRN not linked to a PO.");
      const amount = formData.amount || (receiptIdx !== null ? (grn?.receipts?.[receiptIdx]?.invoiceAmount || 0) : (grn?.invoiceAmount || 0));
      const path = receiptIdx !== null ? `grn/${grnId}/receipt/${receiptIdx}/payment` : `grn/${grnId}/payment`;
      const paymentData = {
        amountPaid: amount,
        date: formData.date || new Date().toISOString().split("T")[0],
        mode: formData.mode || "NEFT",
        utr: formData.utr || "",
        ref: formData.ref || "",
        paidBy: user?.name || "",
      };
      const res = await api.putSimple(path, paymentData);
      if (!res.success) throw new Error(res.message);
      const paidPayment = { amount, date: paymentData.date, mode: paymentData.mode, utr: paymentData.utr, ref: paymentData.ref, paidBy: paymentData.paidBy };
      setAllGrns(prev => prev.map(g => {
        if (g.id !== grnId) return g;
        if (receiptIdx === null) return { ...g, paymentStatus: "paid", payment: paidPayment };
        return { ...g, receipts: (g.receipts || []).map((r, i) => i === receiptIdx ? { ...r, paymentStatus: "paid", payment: paidPayment } : r) };
      }));
      await updatePO(poId, { accountStatus: "paid" });
      setLocalPos(prev => prev.map(p => p.id === poId ? { ...p, accountStatus: "paid" } : p));
      setSelectedPO(null);
      toast.success("Payment recorded successfully!");
    } catch (err) { toast.error(err?.message || "Failed to record payment."); }
    finally { setIsSubmitting(false); }
  }, "handleGRNMarkPaid");

  const handleGRNPaymentEdit = /* @__PURE__ */ __name(async (grnId, receiptIdx, editData) => {
    if (!hasPermission("EDIT_PAYMENT_ENTRY")) { toast.error("Unauthorized: Access to edit payment entries is restricted."); return; }
    setIsSubmitting(true);
    try {
      const path = receiptIdx !== null
        ? `grn/${grnId}/receipt/${receiptIdx}/payment`
        : `grn/${grnId}/payment`;
      const res = await api.patch(path, editData);
      if (!res.success) throw new Error(res.message);
      const newPayment = { amount: editData.amountPaid, date: editData.date, mode: editData.mode, ref: editData.ref, utr: editData.utr, chequeNo: editData.chequeNo, chequeDate: editData.chequeDate, screenshotUrl: editData.screenshotUrl, bank: editData.bank, fromCompany: editData.fromCompany, toCompany: editData.toCompany, remarks: editData.remarks };
      setAllGrns(prev => prev.map(g => {
        if (g.id !== grnId) return g;
        if (receiptIdx === null) return { ...g, payment: newPayment };
        return { ...g, receipts: (g.receipts || []).map((r, i) => i === receiptIdx ? { ...r, payment: newPayment } : r) };
      }));
      toast.success("Payment updated.");
    } catch (err) { toast.error(err?.message || "Failed to update payment."); }
    finally { setIsSubmitting(false); }
  }, "handleGRNPaymentEdit");

  const handleGRNPaymentDelete = /* @__PURE__ */ __name(async (grnId, receiptIdx) => {
    if (!hasPermission("EDIT_PAYMENT_ENTRY")) { toast.error("Unauthorized: Access to delete payment entries is restricted."); return; }
    setIsSubmitting(true);
    try {
      const path = receiptIdx !== null
        ? `grn/${grnId}/receipt/${receiptIdx}/payment`
        : `grn/${grnId}/payment`;
      const res = await api.deleteSimple(path);
      if (!res.success) throw new Error(res.message);
      const revertFields = { paymentStatus: "payment_pending", payment: null };
      setAllGrns(prev => prev.map(g => {
        if (g.id !== grnId) return g;
        if (receiptIdx === null) return { ...g, ...revertFields };
        return { ...g, receipts: (g.receipts || []).map((r, i) => i === receiptIdx ? { ...r, ...revertFields } : r) };
      }));
      toast.success("Payment entry deleted — shipment reverted to Payment Pending.");
    } catch (err) { toast.error(err?.message || "Failed to delete payment."); }
    finally { setIsSubmitting(false); }
  }, "handleGRNPaymentDelete");

  // ────────────────────────────────────────────────────────────────────────────

  const handleRevokeApproval = /* @__PURE__ */ __name(async (poId) => {
    if (!hasPermission("APPROVE_PAYMENT_AGM")) {
      toast.error("Unauthorized: L1 AGM approval access is restricted.");
      return;
    }
    setIsSubmitting(true);
    try {
      const timestamp = (/* @__PURE__ */ new Date()).toISOString();
      const po = localPos.find((p) => p.id === poId);
      const isRevertingRemaining = po.payment?.isPartial || po.payment?.partialAmount;
      const newStatus = isRevertingRemaining ? "partial_paid" : "bill_verify";
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
        verifiedBy: null,
        verifiedAt: null,
        verifyRemark: null,
        auditTrail: [...(po?.auditTrail || []), audit]
      });
      setLocalPos(prev => prev.map(p => p.id === poId ? { ...p, accountStatus: newStatus, billApprovedBy: null, billApprovedDate: null, verifiedBy: null, verifiedAt: null, verifyRemark: null } : p));
      toast.success("Approval revoked. Bill sent back for verification.");
      setSelectedPO(null);
    } catch (err) {
      toast.error("Failed to revoke approval.");
    } finally {
      setIsSubmitting(false);
    }
  }, "handleRevokeApproval");

  const handleL2BillApprove = /* @__PURE__ */ __name(async (poId, remark) => {
    if (!hasPermission("APPROVE_PAYMENT_DIRECTOR")) { toast.error("Unauthorized: L2 Director approval access is restricted."); return; }
    if (!remark?.trim()) { toast.error("Approval remark is mandatory."); return; }
    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const po = localPos.find(p => p.id === poId);
      const audit = { timestamp, action: "l2_director_approved", po_number: poId, done_by: user?.name || "System", details: { remark: remark.trim() } };
      await updatePO(poId, {
        accountStatus: "payment_pending",
        l2ApprovedBy: user?.name,
        l2ApprovedAt: timestamp,
        l2Remark: remark.trim(),
        auditTrail: [...(po?.auditTrail || []), audit],
      });
      setLocalPos(prev => prev.map(p => p.id === poId ? { ...p, accountStatus: "payment_pending", l2ApprovedBy: user?.name, l2ApprovedAt: timestamp, l2Remark: remark.trim() } : p));
      setAllGrns(prev => prev.map(g => g.poId === poId ? { ...g, paymentStatus: "payment_pending" } : g));
      toast.success("L2 Director approved! Bill is ready for payment recording.");
      setSelectedPO(null);
      setShowL2ApproveForm(false);
      setL2ApproveRemark("");
    } catch (err) { toast.error(err?.message || "Failed to approve."); }
    finally { setIsSubmitting(false); }
  }, "handleL2BillApprove");

  const handleL2BillReject = /* @__PURE__ */ __name(async (poId, reason) => {
    if (!hasPermission("APPROVE_PAYMENT_DIRECTOR")) { toast.error("Unauthorized: L2 Director approval access is restricted."); return; }
    if (!reason?.trim()) { toast.error("Please provide a rejection reason."); return; }
    setIsSubmitting(true);
    try {
      const timestamp = new Date().toISOString();
      const po = localPos.find(p => p.id === poId);
      const audit = { timestamp, action: "l2_director_rejected", po_number: poId, done_by: user?.name || "System", details: { reason: reason.trim() } };
      await updatePO(poId, {
        accountStatus: "bill_verify",
        billApprovedBy: null, billApprovedDate: null, billApproveRemark: null,
        l2ApprovedBy: null, l2ApprovedAt: null, l2Remark: null,
        rejectionReason: reason.trim(), rejectedBy: user?.name, rejectedAt: timestamp,
        auditTrail: [...(po?.auditTrail || []), audit],
      });
      setLocalPos(prev => prev.map(p => p.id === poId ? { ...p, accountStatus: "bill_verify", billApprovedBy: null, rejectionReason: reason.trim(), rejectedBy: user?.name } : p));
      setAllGrns(prev => prev.map(g => g.poId === poId ? { ...g, paymentStatus: "unpaid", approvedBy: null } : g));
      toast.success("Rejected by Director. Bill sent back to verifier.");
      setSelectedPO(null);
      setShowL2RejectForm(false);
      setL2RejectReason("");
    } catch (err) { toast.error(err?.message || "Failed to reject."); }
    finally { setIsSubmitting(false); }
  }, "handleL2BillReject");

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
      const po = localPos.find((p) => p.id === poId);
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
        status: "Blocked",
        rejectedByName: user?.name || "Accounts",
        rejectedAt: new Date().toISOString(),
        rejectionReason,
        auditTrail: [...po?.auditTrail || [], audit]
      });
      setLocalPos(prev => prev.map(p => p.id === poId ? { ...p, accountStatus: "rejected", status: "Blocked", rejectedByName: user?.name, rejectionReason } : p));
      toast.success("Bill rejected. PO sent back for revision.");
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
      const po = localPos.find((p) => p.id === poId);
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
      // Payable is capped by the value of goods actually received (qty × rate × GST as of
      // receipt), not the full PO amount — you only pay for what's been delivered so far.
      const rGrnForPayment = realGRN || getCurrentGRN(po, allGrns);
      const grnValForPayment = rGrnForPayment ? rGrnForPayment.items.reduce((s, gi) => {
        const rcv = gi.received ?? gi.qty ?? 0;
        const poItem = po?.items?.find(pi =>
          (pi.sku && gi.sku && pi.sku === gi.sku) ||
          (pi.materialName || pi.itemName || pi.name || "").toLowerCase() === (gi.itemName || gi.name || gi.materialName || "").toLowerCase()
        );
        const rate = gi.rate || poItem?.rate || 0;
        const gstPct = gi.gstPct ?? poItem?.gstPct ?? 0;
        const gstType = gi.gstType || poItem?.gstType || "Exclusive";
        return s + calcChargeTotal(rcv * rate, gstPct, gstType);
      }, 0) : (po?.totalValue || 0);
      const remainingPayable = Math.max(0, grnValForPayment - prevTotalPaid);
      // Hard cap: total paid must never exceed the received-goods value
      if (paymentData.amountPaid > remainingPayable + 0.01) {
        toast.error(`Amount ₹${paymentData.amountPaid.toLocaleString("en-IN")} exceeds remaining payable ₹${remainingPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}. Please correct the amount.`);
        setIsSubmitting(false);
        return;
      }
      const newTotalPaid = prevTotalPaid + paymentData.amountPaid;
      const isFullyPaid = newTotalPaid >= grnValForPayment - 0.01;
      const newAccountStatus = isFullyPaid ? "paid" : "partial_paid";
      // Build history entry for this installment (link to current unpaid GRN batch)
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
        action: "payment_initiated",
        po_number: poId,
        done_by: user?.name || "System",
        amount: paymentForm.amountPaid,
        details: { mode: paymentForm.mode, ref: paymentForm.ref, installmentNo: newEntry.installmentNo }
      };
      const freshApprovals = PAYMENT_APPROVAL_LEVELS.map(l => ({
        level: l.level, role: l.role, label: l.label,
        status: "Pending",
        approvedBy: null,
        approvedAt: null,
        remark: null,
      }));
      const updatedPaymentHistory = [...(po?.paymentHistory || []), { ...newEntry, isFullyPaid }];
      await updatePO(poId, {
        accountStatus: "payment_initiated",
        paymentHistory: updatedPaymentHistory,
        totalPaid: newTotalPaid,
        payment: { ...paymentData, amountPaid: newTotalPaid, isPartial: !isFullyPaid, partialAmount: prevTotalPaid || paymentData.amountPaid },
        paymentApprovals: freshApprovals,
        auditTrail: [...(po?.auditTrail || []), audit]
      });
      // Sync payment data to Account entry
      await api.patch(`accounts/by-po/${poId}`, {
        accountStatus: "payment_initiated",
        totalPaid: newTotalPaid,
        paymentHistory: [{ ...newEntry, isFullyPaid }],
        payment: { ...paymentData, amountPaid: newTotalPaid, isPartial: !isFullyPaid },
        auditTrail: [audit],
      }).catch(() => {});
      setLocalPos(prev => prev.map(p => p.id === poId ? { ...p, accountStatus: "payment_initiated", totalPaid: newTotalPaid, paymentApprovals: freshApprovals } : p));
      toast.success("Payment initiated! Sent for approval (AGM → GM → Director).");
      setSelectedPO(null);
      setIsEditingPayment(false);
    } catch (err) {
      console.error("Payment submission error", err);
      toast.error("Failed to process payment. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  }, "handlePaymentSubmit");
  const handlePaymentApprove = /* @__PURE__ */ __name(async (poId, level, remark) => {
    const lvl = PAYMENT_APPROVAL_LEVELS.find(l => l.level === level);
    if (!lvl || !hasPermission(lvl.permission)) {
      toast.error("Unauthorized for this approval level.");
      return;
    }
    if (!remark || !remark.trim()) {
      toast.error("Approval remark is mandatory.");
      return;
    }
    setIsSubmitting(true);
    try {
      const po = localPos.find(p => p.id === poId);
      const timestamp = new Date().toISOString();
      const approvals = (po.paymentApprovals || PAYMENT_APPROVAL_LEVELS.map(l => ({ level: l.level, role: l.role, label: l.label, status: "Pending", approvedBy: null, approvedAt: null }))).map(a =>
        a.level === level ? { ...a, status: "Approved", approvedBy: user?.name, approvedAt: timestamp, remark: remark.trim() } : a
      );
      const allApproved = approvals.every(a => a.status === "Approved");
      const audit = {
        timestamp: new Date().toISOString(),
        action: `payment_approved_l${level}`,
        po_number: poId,
        done_by: user?.name || "System",
        details: { level, role: lvl.label, allApproved }
      };
      const newAccountStatus = allApproved ? "physical_check" : "payment_initiated";
      const updatedPO = { ...po, accountStatus: newAccountStatus, paymentApprovals: approvals };
      await updatePO(poId, {
        accountStatus: newAccountStatus,
        paymentApprovals: approvals,
        // Keep pendingPaymentData — needed for physical check step to execute the actual GRN payment
        auditTrail: [...(po?.auditTrail || []), audit]
      });
      setLocalPos(prev => prev.map(p => p.id === poId ? updatedPO : p));
      if (allApproved) {
        toast.success("All approvals completed! Ready for payment recording.");
        setSelectedPO(null);
      } else {
        const nextPending = approvals.find(a => a.status === "Pending");
        toast.success(`${lvl.label} approved. Waiting for ${nextPending?.label}.`);
        setSelectedPO(updatedPO);
      }
    } catch (err) {
      toast.error(err?.message || "Failed to approve payment.");
    } finally {
      setIsSubmitting(false);
    }
  }, "handlePaymentApprove");

  const handlePaymentApprovalReject = /* @__PURE__ */ __name(async (poId, level, reason) => {
    const lvl = PAYMENT_APPROVAL_LEVELS.find(l => l.level === level);
    if (!lvl || !hasPermission(lvl.permission)) {
      toast.error("Unauthorized for this approval level.");
      return;
    }
    if (!reason?.trim()) { toast.error("Please provide a rejection reason."); return; }
    setIsSubmitting(true);
    try {
      const po = localPos.find(p => p.id === poId);
      const audit = {
        timestamp: new Date().toISOString(),
        action: `payment_rejected_l${level}`,
        po_number: poId,
        done_by: user?.name || "System",
        details: { level, role: lvl.label, reason }
      };
      await updatePO(poId, {
        accountStatus: "payment_pending",
        paymentApprovals: null,
        pendingPaymentData: null,
        paymentRejectionReason: reason,
        auditTrail: [...(po?.auditTrail || []), audit]
      });
      setLocalPos(prev => prev.map(p => p.id === poId ? { ...p, accountStatus: "payment_pending", paymentApprovals: null, pendingPaymentData: null, paymentRejectionReason: reason } : p));
      toast.success("Payment rejected. Sent back for correction.");
      setPayApproveReject({ show: false, level: null, reason: "" });
      setSelectedPO(null);
    } catch (err) {
      toast.error("Failed to reject payment.");
    } finally {
      setIsSubmitting(false);
    }
  }, "handlePaymentApprovalReject");

  const handlePhysicalCheckPaid = /* @__PURE__ */ __name(async (poId, checklistData) => {
    setIsSubmitting(true);
    try {
      const po = localPos.find(p => p.id === poId);
      let newAccountStatus = "paid";
      if (po?.pendingPaymentData) {
        const { grnId, receiptIdx, form } = po.pendingPaymentData;
        const grnPath = receiptIdx !== null ? `grn/${grnId}/receipt/${receiptIdx}/payment` : `grn/${grnId}/payment`;
        const grnRes = await api.putSimple(grnPath, form);
        if (!grnRes.success) throw new Error(grnRes.message || "GRN payment failed.");
        const paidPayment = { amount: form.amountPaid, date: form.date, mode: form.mode, ref: form.ref, utr: form.utr, screenshotUrl: form.screenshotUrl };
        setAllGrns(prev => prev.map(g => {
          if (g.id !== grnId) return g;
          if (receiptIdx === null) return { ...g, paymentStatus: "paid", payment: paidPayment };
          return { ...g, receipts: (g.receipts || []).map((r, i) => i === receiptIdx ? { ...r, paymentStatus: "paid", payment: paidPayment } : r) };
        }));
        const prevPaid = po.totalPaid || 0;
        const newTotal = prevPaid + (form.amountPaid || 0);
        const poTotal = po.totalValue || 0;
        newAccountStatus = newTotal >= poTotal - 0.01 ? "paid" : "partial_paid";
      }
      const audit = {
        timestamp: new Date().toISOString(),
        action: "physical_check_completed",
        po_number: poId,
        done_by: user?.name || "System",
        details: checklistData
      };
      await updatePO(poId, {
        accountStatus: newAccountStatus,
        pendingPaymentData: null,
        physicalCheckData: checklistData,
        physicalCheckBy: user?.name,
        physicalCheckAt: new Date().toISOString(),
        auditTrail: [...(po?.auditTrail || []), audit]
      });
      // Sync final payment status + all data to Account entry
      await api.patch(`accounts/by-po/${poId}`, {
        accountStatus: newAccountStatus,
        totalPaid: po?.totalPaid || 0,
        paymentHistory: po?.paymentHistory || [],
        payment: po?.payment || null,
        physicalCheckData: checklistData,
        physicalCheckBy: user?.name,
        physicalCheckAt: new Date().toISOString(),
        auditTrail: [audit],
      }).catch(() => {});
      setLocalPos(prev => prev.map(p => p.id === poId ? {
        ...p, accountStatus: newAccountStatus, pendingPaymentData: null,
        physicalCheckData: checklistData, physicalCheckBy: user?.name
      } : p));
      toast.success("Physical verification complete! Payment marked as paid.");
      setSelectedPO(null);
    } catch (err) {
      toast.error(err?.message || "Failed to complete physical check.");
    } finally {
      setIsSubmitting(false);
    }
  }, "handlePhysicalCheckPaid");

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
        setAllGrns(prev => {
          const prevIds = new Set(prev.map(g => g.id));
          const toAdd = grnRes.data.filter(g => !prevIds.has(g.id));
          return toAdd.length ? [...prev, ...toAdd] : prev;
        });
      }
    } catch {}
  }, "handleEditPayment");
  const handleDeletePayment = /* @__PURE__ */ __name(async () => {
    if (!deleteConfirmPO) return;
    setIsDeletingPayment(true);
    try {
      await updatePO(deleteConfirmPO.id, { accountStatus: null, payment: null, totalPaid: 0, paymentHistory: [] });
      setLocalPos(prev => prev.map(p => p.id === deleteConfirmPO.id ? { ...p, accountStatus: null, payment: null, totalPaid: 0, paymentHistory: [] } : p));
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
    if (!hasPermission("REMOVE_FROM_ACCOUNTS")) { toast.error("Unauthorized: Access to remove from Accounts is restricted."); setRemoveConfirmPO(null); return; }
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

    const companyName = po.companyName || settings?.companyName || "Neoteric Group";
    const companyGst = po.companyGst || settings?.companyGst || "";
    const companyAddress = po.companyAddress || settings?.companyAddress || "";

    const vendorSup = suppliers?.find(s =>
      s.id === po.supplier || s._id === po.supplier ||
      (s.companyName || "").toLowerCase() === (po.supplier || "").toLowerCase() ||
      (s.name || "").toLowerCase() === (po.supplier || "").toLowerCase()
    );
    const vendorName = vendorSup?.companyName || vendorSup?.name || supplierName;
    const vendorGst = po.gstNo || vendorSup?.gstNumber || "—";
    const vendorPan = po.panNo || vendorSup?.panNumber || "—";
    const vendorContact = po.vendorContact || vendorSup?.mobile || vendorSup?.phone || "—";
    const vendorEmail = po.vendorEmail || vendorSup?.email || "—";
    const vendorAddress = po.vendorAddress || vendorSup?.address || "—";

    const vbd = po.payment?.vendorBankDetails || (vendorSup && (vendorSup.accountNumber || vendorSup.bankName) ? {
      accountHolder: vendorSup.accountHolderName || vendorSup.ownerName || vendorSup.companyName || vendorName,
      bankName: vendorSup.bankName || "—",
      accountNo: vendorSup.accountNumber || "—",
      branchIFSC: [vendorSup.branch, vendorSup.ifscCode].filter(Boolean).join(" · ") || "—"
    } : null);

    const items = po.items || [];
    const itemsHTML = items.map((pi, i) => {
      const ordered = pi.qty || pi.quantity || 0;
      const rate = pi.rate || 0;
      const total = ordered * rate;
      return `
        <tr style="background:${i % 2 === 0 ? "#F8FAFC" : "#FFFFFF"}">
          <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;font-size:11px">${i + 1}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;font-size:11px;font-weight:700">${pi.itemName || pi.materialName || pi.name || "Item"}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;font-size:11px;font-family:monospace">${pi.sku || "—"}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;font-size:11px;text-align:center">${ordered} ${pi.unit || ""}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;font-size:11px;text-align:right">${fmtA(rate)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:700">${fmtA(total)}</td>
        </tr>`;
    }).join("");

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

    const approvals = po.paymentApprovals || PAYMENT_APPROVAL_LEVELS.map(l => ({ level: l.level, role: l.role, label: l.label, status: "Pending", approvedBy: null, approvedAt: null }));

    const approvalGridHTML = PAYMENT_APPROVAL_LEVELS.map(lvl => {
      const a = approvals.find(ap => ap.level === lvl.level);
      const isApproved = a?.status === "Approved";
      const isRejected = a?.status === "Rejected";
      const stampHTML = isApproved
        ? `<div style="color:#10B981;font-weight:900;font-size:11px;border:2px solid #10B981;padding:2px 6px;border-radius:4px;transform:rotate(-4deg);display:inline-block;letter-spacing:-0.5px">APPROVED</div><div style="font-size:8px;color:#059669;margin-top:2px;font-weight:700">Digitally Signed</div>`
        : isRejected
        ? `<div style="color:#F43F5E;font-weight:900;font-size:11px;border:2px solid #F43F5E;padding:2px 6px;border-radius:4px;transform:rotate(-4deg);display:inline-block;letter-spacing:-0.5px">REJECTED</div><div style="font-size:8px;color:#E11D48;margin-top:2px;font-weight:700">Declined</div>`
        : `<span style="color:#9CA3AF;font-style:italic;font-size:9px">Pending Authorization</span>`;

      return `
        <div style="border-right:1px solid #1E3A5F;display:flex;flex-direction:column;font-size:10px">
          <div style="background:#1E3A5F;color:#fff;font-weight:800;text-align:center;padding:5px;font-size:9px;text-transform:uppercase">${lvl.label} (L${lvl.level})</div>
          <div style="padding:5px 8px;border-bottom:1px solid #E5E7EB"><span style="color:#9CA3AF;font-weight:700">NAME:</span> <strong style="text-transform:uppercase">${a?.approvedBy || "—"}</strong></div>
          <div style="padding:5px 8px;border-bottom:1px solid #E5E7EB"><span style="color:#9CA3AF;font-weight:700">DATE:</span> <span>${a?.approvedAt ? fmtD(a.approvedAt) : "—"}</span></div>
          <div style="padding:10px 6px;text-align:center;min-height:50px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#F8FAFC">${stampHTML}</div>
        </div>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
      <title>Bill & Payment Document — ${po.id}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:"Segoe UI",Arial,sans-serif;font-size:12px;color:#1F2937;background:#fff;padding:0}
        .page{max-width:900px;margin:0 auto;padding:24px 36px}
        /* Header */
        .hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:3px solid #1E3A5F;margin-bottom:16px}
        .company-name{font-size:20px;font-weight:900;color:#1E3A5F;letter-spacing:-0.5px}
        .company-gst{font-size:11px;font-weight:700;color:#2563EB;margin-top:2px;font-family:monospace}
        .company-sub{font-size:10px;color:#6B7280;margin-top:2px;line-height:1.3}
        .doc-badge{text-align:right}
        .doc-title{font-size:18px;font-weight:900;color:#1E3A5F;letter-spacing:1px;text-transform:uppercase}
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
        .grid4{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px 16px}
        .field-label{font-size:9px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:1px}
        .field-value{font-size:11px;font-weight:600;color:#111827}
        .field-value.accent{color:#1E3A5F;font-weight:800}
        .field-value.big{font-size:14px;font-weight:900;color:#1E3A5F;letter-spacing:-0.3px}
        /* Approval Box */
        .approval-box{border:1px solid #1E3A5F;border-radius:6px;overflow:hidden;margin-top:10px}
        .approval-hdr{background:#1E3A5F;color:#fff;font-size:9px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:5px 10px}
        .approval-grid{display:grid;grid-template-columns:repeat(${PAYMENT_APPROVAL_LEVELS.length}, 1fr)}
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
        .watermark-paid{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-35deg);font-size:90px;font-weight:900;color:rgba(22,163,74,0.06);pointer-events:none;z-index:0;white-space:nowrap}
        .content{position:relative;z-index:1}
        @media print{body{padding:0}@page{margin:8mm 10mm;size:A4}}
      </style></head><body>
      <div class="watermark-paid">${po.accountStatus === "paid" ? "PAID" : "APPROVED"}</div>
      <div class="page content">
        <!-- Header -->
        <div class="hdr">
          <div>
            <div class="company-name">${companyName}</div>
            ${companyGst ? `<div class="company-gst">GSTIN: ${companyGst}</div>` : ""}
            ${companyAddress ? `<div class="company-sub">${companyAddress}</div>` : ""}
          </div>
          <div class="doc-badge">
            <div class="doc-title">Bill &amp; Payment Document</div>
            <div class="doc-ref">Ref: ${po.id} &nbsp;|&nbsp; ${fmtD(new Date().toISOString())}</div>
          </div>
        </div>

        <div class="status-strip">
          <div class="status-dot"></div>
          <div class="status-text">BILL CONFIRMED &nbsp;·&nbsp; ${po.accountStatus === "paid" ? "Fully Settled with Vendor" : "Synced with Accounts & ERP"} &nbsp;·&nbsp; Total Value: ${fmtA(po.totalValue)}</div>
        </div>

        <!-- Vendor & Beneficiary Details -->
        <div class="section">
          <div class="section-title">Vendor &amp; Beneficiary Details</div>
          <div class="grid3">
            <div><div class="field-label">Vendor / Supplier</div><div class="field-value accent">${vendorName}</div></div>
            <div><div class="field-label">GSTIN / PAN</div><div class="field-value">${vendorGst} / ${vendorPan}</div></div>
            <div><div class="field-label">Contact / Email</div><div class="field-value">${vendorContact} · ${vendorEmail}</div></div>
            <div style="grid-column: span 3"><div class="field-label">Vendor Address</div><div class="field-value">${vendorAddress}</div></div>
          </div>
        </div>

        <!-- PO & GRN Details -->
        <div class="section">
          <div class="section-title">Purchase Order &amp; GRN Details</div>
          <div class="grid3">
            <div><div class="field-label">PO Number</div><div class="field-value accent">${po.id}</div></div>
            <div><div class="field-label">PO Date</div><div class="field-value">${fmtD(po.date)}</div></div>
            <div><div class="field-label">Project / Location</div><div class="field-value">${po.project || po.location || "—"}</div></div>
            <div><div class="field-label">Requirement By</div><div class="field-value">${po.requirementBy || po.requesterName || "—"}</div></div>
            <div><div class="field-label">GRN Reference</div><div class="field-value">${po.grn?.number || (po.paymentHistory?.[0]?.grnId) || "—"}</div></div>
            <div><div class="field-label">Invoice / Challan</div><div class="field-value">${po.payment?.ref || po.invoice?.number || "—"}</div></div>
          </div>
        </div>

        <!-- Items Table -->
        ${items.length > 0 ? `<div class="section">
          <div class="section-title">Material / Items Summary</div>
          <table>
            <thead><tr>
              <th>#</th><th>Material Description</th><th>SKU</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Total</th>
            </tr></thead>
            <tbody>${itemsHTML}</tbody>
            <tfoot><tr>
              <td colspan="5" style="font-size:10px;letter-spacing:0.5px">GRAND TOTAL (INCL. CHARGES)</td>
              <td>${fmtA(po.totalValue)}</td>
            </tr></tfoot>
          </table>
        </div>` : ""}

        <!-- Amount & Payment Summary -->
        <div class="section">
          <div class="section-title">Payment Summary</div>
          <div class="grid4">
            <div><div class="field-label">PO Grand Total</div><div class="field-value big">${fmtA(po.totalValue)}</div></div>
            <div><div class="field-label">Total Disbursed</div><div class="field-value big" style="color:#16A34A">${fmtA(po.totalPaid || po.payment?.amountPaid)}</div></div>
            <div><div class="field-label">Round Off</div><div class="field-value big" style="color:#2563EB">${po.payment?.roundOff ? (po.payment.roundOff > 0 ? `+${fmtA(po.payment.roundOff)}` : fmtA(po.payment.roundOff)) : "₹0.00"}</div></div>
            <div><div class="field-label">Balance Outstanding</div><div class="field-value big" style="color:${Math.max(0,(po.totalValue||0)-(po.totalPaid||po.payment?.amountPaid||0)) > 0.01 ? "#DC2626" : "#16A34A"}">${fmtA(Math.max(0,(po.totalValue||0)-(po.totalPaid||po.payment?.amountPaid||0)))}</div></div>
          </div>
        </div>

        <!-- Beneficiary Bank Details -->
        ${vbd ? `<div class="section">
          <div class="section-title">Beneficiary Bank Details</div>
          <div class="grid2">
            <div><div class="field-label">Account Holder</div><div class="field-value">${vbd.accountHolder || "—"}</div></div>
            <div><div class="field-label">Bank Name</div><div class="field-value">${vbd.bankName || "—"}</div></div>
            <div><div class="field-label">Account Number</div><div class="field-value" style="font-family:monospace">${vbd.accountNo || "—"}</div></div>
            <div><div class="field-label">IFSC / Branch</div><div class="field-value" style="font-family:monospace">${vbd.branchIFSC || "—"}</div></div>
          </div>
        </div>` : ""}

        <!-- Approval Workflow & Signatures Grid (PO Style) -->
        <div class="section">
          <div class="section-title">Payment Approval Workflow &amp; Signatures</div>
          <div class="approval-box">
            <div class="approval-hdr">Authorisation &amp; Signatures Chain</div>
            <div class="approval-grid">
              ${approvalGridHTML}
            </div>
          </div>
        </div>

        <hr class="divider"/>

        <!-- Footer -->
        <div class="footer">
          <div style="font-size:10px;color:#9CA3AF;max-width:340px">
            This is an official system-generated Bill &amp; Payment Document from the IMS Portal. Authorized with digital multi-level approval signatures.
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

  const handlePrintTransactionDetail = /* @__PURE__ */ __name((po, grn) => {
    const supplierName = getSupplierName(po.supplier);
    const vendorSup = suppliers?.find(s =>
      s.id === po.supplier || s._id === po.supplier ||
      (s.companyName || "").toLowerCase() === (po.supplier || "").toLowerCase() ||
      (s.name || "").toLowerCase() === (po.supplier || "").toLowerCase()
    );
    const vBank = vendorSup?.accountNumber || vendorSup?.bankName ? {
      holder: vendorSup.accountHolderName || vendorSup.ownerName || vendorSup.companyName || supplierName,
      bank: vendorSup.bankName || "",
      account: vendorSup.accountNumber || "",
      ifsc: vendorSup.ifscCode || "",
      branch: vendorSup.branch || "",
    } : null;
    const cBank = settings?.companyBankDetails?.bankName || settings?.companyBankDetails?.accountNumber ? settings.companyBankDetails : null;
    generateTransactionDetailPDF(po, grn, supplierName, vBank, cBank);
  }, "handlePrintTransactionDetail");

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
    actions={
      <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <button
          onClick={() => setView("accounts")}
          className={cn("px-3.5 py-2 text-[12px] font-bold rounded-lg transition-all", view === "accounts" ? "bg-white dark:bg-gray-700 text-primary shadow-sm ring-1 ring-black/5" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}
        >Account Payment</button>
        <button
          onClick={() => setView("tracker")}
          className={cn("px-3.5 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center gap-1.5", view === "tracker" ? "bg-white dark:bg-gray-700 text-primary shadow-sm ring-1 ring-black/5" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200")}
        >
          <Activity className="w-3.5 h-3.5" />
          Procurement Tracker
        </button>
      </div>
    }
  />

      {view === "tracker" ? <ProcurementTracker seedPos={localPos} seedGrns={allGrns} /> : <>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Draft", value: metrics.pendingVerify, sub: "Bills awaiting verification", icon: ShieldAlert, iconCls: "bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400" },
          { label: "Verified", value: metrics.pendingVerified, sub: "Awaiting final approval", icon: Check, iconCls: "bg-violet-50 dark:bg-violet-500/10 text-violet-500 dark:text-violet-400" },
          { label: "Payment Pending", value: metrics.pendingPayment, sub: fmtCur(metrics.totalPendingAmount), icon: Clock, iconCls: "bg-orange-50 dark:bg-orange-500/10 text-orange-500 dark:text-orange-400" },
          { label: "Paid This Month", value: metrics.paidCount, sub: fmtCur(metrics.totalPaidAmount), icon: CheckCircle, iconCls: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 dark:text-emerald-400" },
          { label: "Rejected", value: metrics.rejectedCount, sub: "Bills rejected", icon: XSquare, iconCls: "bg-red-50 dark:bg-red-500/10 text-red-500 dark:text-red-400" },
        ].map(({ label, value, sub, icon: Icon, iconCls }) => (
          <div key={label} className="bg-white dark:bg-gray-900/80 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-4 flex items-center gap-3.5">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", iconCls)}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide truncate mb-0.5">{label}</p>
              <p className="text-[20px] font-black text-gray-900 dark:text-white tabular-nums leading-none">{value}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Bar + Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit overflow-x-auto no-scrollbar">
          {[
            ["All", "All", 0, "VIEW_ACCOUNTS"],
            ...(hasPermission("APPROVE_PAYMENT_AGM") || hasPermission("APPROVE_PAYMENT_GM") || hasPermission("APPROVE_PAYMENT_DIRECTOR")
              ? [["My Approvals", "My Approvals", metrics.myApprovalsCount, null]] : []),
            ["Verify Bills", "Draft", metrics.pendingVerify, "VIEW_ACCOUNTS_DRAFT"],
            ["Approved", "L1 AGM", metrics.pendingVerified, "VIEW_ACCOUNTS_L1_AGM"],
            ["Pending Payment", "Pending Payment", metrics.pendingPayment, "VIEW_ACCOUNTS_PENDING_PAYMENT"],
            ["L2 Director", "L2 Director", metrics.l2DirectorCount, "VIEW_ACCOUNTS_L2_DIRECTOR"],
            ["Paid", "Paid", metrics.paidCount, "VIEW_ACCOUNTS_PAID"],
            ["Rejected", "Rejected", metrics.rejectedCount, "VIEW_ACCOUNTS_REJECTED"],
          ].filter(([,, , perm]) => canAccessTab(perm)).map(([tab, label, count]) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3.5 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center gap-1.5 shrink-0 ${
                filter === tab
                  ? "bg-white dark:bg-gray-700 text-primary shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {label}
              {count > 0 && (
                <span className="px-1.5 py-0.5 bg-emerald-500 text-white rounded-full text-[9px] font-black leading-none">{count}</span>
              )}
            </button>
          ))}
        </div>

        <FilterRow
          showClear={!!(search || startDate || endDate || filterVendor || filterProject || filterCompany)}
          onClearAll={() => { setSearch(""); setStartDate(""); setEndDate(""); setFilterVendor(""); setFilterProject(""); setFilterCompany(""); }}
        >
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search by PO ID, vendor, invoice no..."
            className="flex-1 min-w-[200px]"
          />
          <DateRangePicker
            value={{ start: startDate, end: endDate }}
            onChange={(v) => { setStartDate(v.start); setEndDate(v.end); }}
          />
          <SelectFilter
            value={filterCompany}
            onChange={setFilterCompany}
            options={companyOptions}
            placeholder="All Companies"
            searchable
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
        {filteredPOs.length === 0 ? (
          isRefreshing ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-28" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-auto" />
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-24" />
                  <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded-lg w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-24 text-center">
              <div className="flex flex-col items-center gap-4 text-gray-400">
                <Search className="w-12 h-12 opacity-20" />
                <p className="font-bold text-[13px]">No records found matching filter</p>
              </div>
            </div>
          )
        ) : (
          <TableVirtuoso
            style={{ height: "calc(100vh - 380px)", minHeight: "400px" }}
            data={filteredPOs}
            fixedHeaderContent={() => {
              const headerClass = "px-3 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 whitespace-nowrap overflow-hidden sticky top-0 z-10 sticky-th";
              return (
                <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-[#E8ECF0] dark:border-gray-800 text-left">
                  <th className={cn(headerClass, "w-[140px]")}>PO Details</th>
                  <th className={cn(headerClass, "w-[160px]")}>Vendor</th>
                  <th className={cn(headerClass, "w-[130px]")}>Project</th>
                  <th className={cn(headerClass, "w-[110px]")}>Date</th>
                  <th className={cn(headerClass, "w-[120px] text-right")}>Amount</th>
                  <th className={cn(headerClass, "w-[130px]")}>Status</th>
                  <th className={cn(headerClass, "w-[110px] text-right")}>Actions</th>
                </tr>
              );
            }}
            itemContent={(_index, po) => {
              const cardGRNs = grnsByPoId.get(po.id) || [];
              const stats = shipmentStatsByPoId.get(po.id) || {};
              const { paidCount = 0, pendingCount = 0, verifiedCount = 0, unpaidCount = 0, totalPaidCard = 0, hasVerifiedGRN = false, hasApprovedGRN = false } = stats;
              
              let accStatusLabel = filter === "Approved" ? "L1 Pending"
                : filter === "L2 Director" ? "L2 Pending"
                : filter === "My Approvals" ? (
                    (po.accountStatus === "bill_approved" || Boolean(po.billApprovedBy) ||
                      (po.accountStatus === "payment_initiated" && (() => {
                        const l1 = (po.paymentApprovals || []).find(a => a.level === 1);
                        return l1?.status === "Approved";
                      })()))
                    ? "L2 Pending" : "L1 Pending"
                  )
                : po.accountStatus === "rejected" ? "Rejected"
                : (["payment_pending", "payment_initiated", "physical_check"].includes(po.accountStatus)) ? "Pending Payment"
                : po.accountStatus === "paid" ? "Paid"
                : (po.accountStatus === "bill_approved" || hasApprovedGRN) ? "L1 Approved"
                : (po.accountStatus === "bill_verified" || hasVerifiedGRN || filter === "Verified") ? "Verified"
                : po.accountStatus === "partial_paid" && (po.status || "").toLowerCase() === "grn fulfilled" ? "Draft"
                : po.accountStatus === "partial_paid" ? "Partial Paid"
                : "Draft";

              const activeLevelL = PAYMENT_APPROVAL_LEVELS.find(l => filter.includes(l.label) || filter.includes(l.role));
              if (activeLevelL) {
                const levelApp = (po.paymentApprovals || []).find(a => a.level === activeLevelL.level);
                if (levelApp?.status === "Approved") {
                  accStatusLabel = `${activeLevelL.role} Approved`;
                } else {
                  accStatusLabel = `${activeLevelL.role} Pending`;
                }
              } else if (po.accountStatus === "payment_initiated") {
                // Not inside a specific level tab (e.g. "All") — surface exactly which approval level this PO is stuck at
                const approvals = po.paymentApprovals || [];
                const stuckLevel = PAYMENT_APPROVAL_LEVELS.find(l => {
                  const a = approvals.find(x => x.level === l.level);
                  return !a || a.status !== "Approved";
                });
                accStatusLabel = stuckLevel ? `${stuckLevel.role} Pending` : "Payment Approval";
              }

              const openDrawer = async () => {
                setSelectedPO(po);
                setShowRejectForm(false);
                setShowVerifyRemark(false);
                setVerifyRemark("");
                setRealGRN(null);
                try {
                  const grnRes = await api.get("grn", { filter: JSON.stringify({ poId: po.id }), limit: 100 });
                  if (grnRes.success && grnRes.data?.length > 0) {
                    const sorted = [...grnRes.data].sort((a, b) =>
                      new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
                    );
                    const paidGRNIds = new Set((po.paymentHistory || []).map(ph => ph.grnId).filter(Boolean));
                    setRealGRN(sorted.find(g => !paidGRNIds.has(g.id)) || sorted[0]);
                    setAllGrns(prev => {
                      const prevIds = new Set(prev.map(g => g.id));
                      const toAdd = grnRes.data.filter(g => !prevIds.has(g.id));
                      return toAdd.length ? [...prev, ...toAdd] : prev;
                    });
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
                  } : { accountHolder: "", bankName: "", accountNo: "", branchIFSC: "" },
                  utr: "", chequeNo: "", chequeDate: "", ref: "", remarks: "", previewUrl: "", screenshot: null
                }));
              };

              const isNew = isNewItem(po.createdAt);
              return (
                <>
                  <Td className="px-3 py-2.5 overflow-hidden">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isNew && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-orange-600 text-white animate-pulse shrink-0">NEW</span>
                      )}
                      <span className="block truncate text-[13px] font-black text-gray-900 dark:text-white tracking-tight" title={po.id}>
                        {po.id}
                      </span>
                    </div>
                  </Td>
                  <Td className="px-3 py-2.5 overflow-hidden">
                    <span className="block truncate text-[13px] font-medium text-gray-700 dark:text-gray-300" title={supplierNameMap.get(po.supplier) || po.supplier}>
                      {supplierNameMap.get(po.supplier) || po.supplier}
                    </span>
                  </Td>
                  <Td className="px-3 py-2.5 overflow-hidden">
                    <span className="block truncate text-[13px] text-gray-500 dark:text-gray-400 capitalize" title={po.project || po.location || "—"}>
                      {po.project || po.location || "—"}
                    </span>
                  </Td>
                  <Td className="px-3 py-2.5 text-[13px] text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden">
                    {formatDate(po.date)}
                  </Td>
                  <Td className="px-3 py-2.5 text-[13px] font-bold text-right text-gray-900 dark:text-white whitespace-nowrap overflow-hidden">
                    {fmtCur(po.totalValue || 0)}
                  </Td>
                  <Td className="px-3 py-2.5 overflow-hidden">
                    <StatusBadge status={accStatusLabel} />
                  </Td>
                  <Td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={openDrawer}
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                        title="View Transaction Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {["paid", "partial_paid"].includes(po.accountStatus) && (
                        <button
                          onClick={(e) => handleEditPayment(e, po)}
                          className="p-1.5 rounded-lg bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 transition-colors"
                          title="Edit payment"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {["paid", "partial_paid"].includes(po.accountStatus) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmPO(po); }}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                          title="Delete payment entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </Td>
                </>
              );
            }}
            components={{
              Table: (props) => (
                <table
                  {...props}
                  className="w-full text-left border-collapse table-fixed min-w-[800px] lg:min-w-0"
                />
              ),
              TableBody: React.forwardRef((props, ref) => (
                <tbody
                  {...props}
                  ref={ref}
                  className="divide-y divide-gray-100 dark:divide-gray-800/60"
                />
              )),
              TableRow: (props) => {
                const po = filteredPOs[props["data-index"]];
                return (
                  <Tr
                    {...props}
                    onClick={async () => {
                      if (!po) return;
                      setSelectedPO(po);
                      setShowRejectForm(false);
                      setShowVerifyRemark(false);
                      setVerifyRemark("");
                      setRealGRN(null);
                      try {
                        const grnRes = await api.get("grn", { filter: JSON.stringify({ poId: po.id }), limit: 100 });
                        if (grnRes.success && grnRes.data?.length > 0) {
                          const sorted = [...grnRes.data].sort((a, b) =>
                            new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
                          );
                          const paidGRNIds = new Set((po.paymentHistory || []).map(ph => ph.grnId).filter(Boolean));
                          setRealGRN(sorted.find(g => !paidGRNIds.has(g.id)) || sorted[0]);
                          setAllGrns(prev => {
                            const prevIds = new Set(prev.map(g => g.id));
                            const toAdd = grnRes.data.filter(g => !prevIds.has(g.id));
                            return toAdd.length ? [...prev, ...toAdd] : prev;
                          });
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
                        } : { accountHolder: "", bankName: "", accountNo: "", branchIFSC: "" },
                        utr: "", chequeNo: "", chequeDate: "", ref: "", remarks: "", previewUrl: "", screenshot: null
                      }));
                    }}
                    className={cn("cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors", props.className)}
                  />
                );
              }
            }}
          />
        )}
      </Card>
      </>}

      {/* Detail Drawer */}
      {selectedPO && (() => {
        const accStatus = (selectedPO.accountStatus || "").toLowerCase();
        const poSt = (selectedPO.status || "").toLowerCase();
        const poGRNsForDrawer = grnsByPoId.get(selectedPO.id) || [];
        const poGRNsSorted = [...poGRNsForDrawer].sort((a, b) => new Date(a.createdAt || a.date || 0) - new Date(b.createdAt || b.date || 0));
        const drawerShipments = poGRNsSorted.flatMap(g => normalizeShipments(g));
        const usesGRNPayments = poGRNsSorted.length > 0;

        const drawerAccSt = usesGRNPayments && drawerShipments.length > 0
          ? (() => {
              // Explicit PO-level statuses always win
              if (["bill_verified", "bill_approved", "rejected"].includes(accStatus)) return accStatus;
              const statuses = drawerShipments.map(s => (s.paymentStatus || "").toLowerCase());
              if (statuses.length > 0 && statuses.every(s => s === "paid")) return "paid";
              if (statuses.some(s => s === "paid")) return "partial_paid";
              // Map legacy payment_initiated → bill_verified or bill_approved based on L1 approval
              if (accStatus === "payment_initiated") {
                const approvals = selectedPO.paymentApprovals || [];
                const l1 = approvals.find(a => a.level === 1);
                return (l1?.status === "Approved") ? "bill_approved" : "bill_verified";
              }
              // Legacy physical_check = all approvals done, ready to record payment
              if (accStatus === "physical_check") return "payment_pending";
              if (statuses.some(s => s === "payment_pending") || accStatus === "payment_pending") return "payment_pending";
              if (statuses.some(s => s === "bill_approved")) return "bill_approved";
              if (statuses.some(s => s === "bill_verified")) return "bill_verified";
              return accStatus || "bill_verify";
            })()
          : accStatus;

        const resolvedStatus = (() => {
          // Initiating payment from bill_approved → open the payment form
          // (checks drawerAccSt too — multi-GRN POs can be "Approved" at the shipment level
          // before the PO's own accountStatus field catches up)
          if (isEditingPayment && (accStatus === "bill_approved" || drawerAccSt === "bill_approved")) return "payment_pending";
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
            const gv = poGRNsForDrawer.reduce((total, grn) =>
              total + grn.items.reduce((s, gi) => {
                const rcv = gi.received ?? gi.qty ?? 0;
                const rate = selectedPO.items?.find(pi => (pi.sku && gi.sku && pi.sku === gi.sku) || (pi.itemName || "").toLowerCase() === (gi.itemName || "").toLowerCase())?.rate || gi.rate || 0;
                return s + rcv * rate;
              }, 0)
            , 0);
            if (gv > tpd + 1) return "bill_verify";
            return "partial_paid";
          }
          if (drawerAccSt) return drawerAccSt;
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
        const downloadPOPDF = () => {
          const _dl = (selectedPO.supplier || "").trim().toLowerCase();
          const sup = (suppliers || []).find(s => {
            if (!s) return false;
            if (s.id === selectedPO.supplier || s._id === selectedPO.supplier) return true;
            const cD = (s.companyName || s.name || "").trim().toLowerCase();
            const oD = (s.ownerName || s.contact || "").trim().toLowerCase();
            if (cD === _dl || oD === _dl) return true;
            if (_dl.length >= 4 && (cD.startsWith(_dl) || oD.startsWith(_dl))) return true;
            return false;
          });
          const poMR = (materialRequirements || []).find(m => m.id === selectedPO.mrId || m.mrNumber === selectedPO.mrId);
          const mrLoc = poMR ? (poMR.location || poMR.site || poMR.address || "") : "";
          generatePOPDF({...selectedPO, mrLocation: mrLoc}, sup, settings);
        };

        // Mismatch detection for verification step
        const grnValue = realGRN ? realGRN.items.reduce((s, gi) => {
          const rcv = gi.received ?? gi.qty ?? 0;
          const poItem = selectedPO.items?.find(pi =>
            (pi.sku && gi.sku && pi.sku === gi.sku) ||
            (pi.itemName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
          );
          const rate = gi.rate || poItem?.rate || 0;
          const gstPct = gi.gstPct ?? poItem?.gstPct ?? 0;
          const rawGstType = gi.gstType || poItem?.gstType || "Exclusive";
          const isInclusive = typeof rawGstType === "string" && rawGstType.toLowerCase().includes("inclus");
          const gstType = isInclusive ? rawGstType : "Exclusive";
          return s + calcChargeTotal(rcv * rate, gstPct, gstType);
        }, 0) : 0;
        const billValue = selectedPO.totalValue || 0;
        const hasMismatch = realGRN && Math.abs(grnValue - billValue) > 0.01;

        // Tab-context gates: each action is allowed from its own tab, All tab, or SuperAdmin
        const TAB_LEVEL_MAP = { 2: "L2 Approval (AGM)", 3: "L3 Approval (GM)", 4: "L4 Approval (Director)" };
        const tabAllowsVerify    = isSuperAdmin || filter === "Verify Bills"   || filter === "All";
        const tabAllowsApprove   = isSuperAdmin || filter === "Verified"       || filter === "Approved" || filter === "My Approvals" || filter === "All";
        const tabAllowsL2Approve = isSuperAdmin || filter === "Approved"       || filter === "L2 Director" || filter === "My Approvals" || filter === "All";
        const tabAllowsInitiate  = isSuperAdmin || filter === "Approved"       || filter === "All";
        const tabAllowsLevel     = (lvl) => isSuperAdmin || filter === TAB_LEVEL_MAP[lvl] || filter === "All";

        const drawerFooter = resolvedStatus === "payment_initiated" ? (() => {
          const approvals = selectedPO.paymentApprovals || PAYMENT_APPROVAL_LEVELS.map(l => ({ level: l.level, role: l.role, label: l.label, status: "Pending", approvedBy: null, approvedAt: null }));
          const currentPendingLvl = PAYMENT_APPROVAL_LEVELS.find(l => {
            const a = approvals.find(a => a.level === l.level);
            return a?.status !== "Approved";
          });
          const canApproveThis = currentPendingLvl && hasPermission(currentPendingLvl.permission);
          return (
            <div className="flex justify-between items-center gap-3 w-full flex-wrap">
              <div className="flex gap-2 shrink-0">
                <Btn label="Download PDF" icon={Download} outline onClick={() => handlePrintTransactionDetail(selectedPO, realGRN)} />
                <Btn label="Bill Document" icon={FileText} className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => handlePrintPaymentAdvice(selectedPO)} />
              </div>
              {currentPendingLvl && (
                canApproveThis ? (
                  payApproveForm.show && payApproveForm.level === currentPendingLvl.level ? (
                    <div className="flex flex-col sm:flex-row gap-3 items-end flex-1">
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-green-600 dark:text-green-400 mb-1 block">{currentPendingLvl.label} Remark (Mandatory) *</label>
                        <input type="text" value={payApproveForm.remark}
                          onChange={e => setPayApproveForm(prev => ({ ...prev, remark: e.target.value }))}
                          placeholder={`e.g. Approved by ${currentPendingLvl.label}`}
                          className="w-full bg-white dark:bg-[#0F172A] border border-green-300 dark:border-green-700 p-3 rounded-xl text-sm outline-none focus:ring-4 ring-green-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all"
                        />
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Btn label="Cancel" outline onClick={() => setPayApproveForm({ show: false, level: null, remark: "" })} />
                        <Btn label={`Confirm ${currentPendingLvl.label} Approve`} color="green"
                          onClick={() => { handlePaymentApprove(selectedPO.id, currentPendingLvl.level, payApproveForm.remark); setPayApproveForm({ show: false, level: null, remark: "" }); }}
                          loading={isSubmitting} disabled={!payApproveForm.remark.trim() || isSubmitting} />
                      </div>
                    </div>
                  ) : payApproveReject.show && payApproveReject.level === currentPendingLvl.level ? (
                    <div className="flex flex-col sm:flex-row gap-3 items-end flex-1">
                      <div className="flex-1">
                        <label className="text-[10px] font-black text-red-500 dark:text-red-400 mb-1 block">Rejection reason *</label>
                        <input type="text" value={payApproveReject.reason}
                          onChange={e => setPayApproveReject(prev => ({ ...prev, reason: e.target.value }))}
                          placeholder="e.g. Amount discrepancy, pending documents..."
                          className="w-full bg-white dark:bg-[#0F172A] border border-red-200 dark:border-red-900/40 p-3 rounded-xl text-sm outline-none focus:ring-4 ring-red-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all"
                        />
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Btn label="Cancel" outline onClick={() => setPayApproveReject({ show: false, level: null, reason: "" })} />
                        <Btn label="Confirm Reject" color="red" loading={isSubmitting} disabled={!payApproveReject.reason.trim() || isSubmitting}
                          onClick={() => { handlePaymentApprovalReject(selectedPO.id, currentPendingLvl.level, payApproveReject.reason); setPayApproveReject({ show: false, level: null, reason: "" }); }} />
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => setPayApproveReject({ show: true, level: currentPendingLvl.level, reason: "" })} disabled={isSubmitting}
                        className="bg-white dark:bg-[#0F172A] hover:bg-red-50 dark:hover:bg-red-900/10 border border-gray-200 dark:border-[#334155] hover:border-red-200 dark:hover:border-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 py-2.5 px-5 rounded-xl text-[13px] font-bold shadow-sm transition-all">
                        Reject
                      </button>
                      <Btn label={`${currentPendingLvl.label} Approve ✓`} color="green"
                        onClick={() => setPayApproveForm({ show: true, level: currentPendingLvl.level, remark: "" })}
                        loading={isSubmitting} disabled={isSubmitting} />
                    </div>
                  )
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-xl">
                    <Clock className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <p className="text-[11px] font-bold text-orange-700 dark:text-orange-400">Awaiting {currentPendingLvl.label} approval</p>
                  </div>
                )
              )}
            </div>
          );
        })()
        : resolvedStatus === "bill_approved" ? (
          showL2ApproveForm ? (
            <div className="flex flex-col gap-3 w-full">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 mb-1 block">L2 Director Remark (Mandatory) *</label>
                  <input type="text" value={l2ApproveRemark} onChange={e => setL2ApproveRemark(e.target.value)}
                    placeholder="e.g. Bill reviewed and approved by Director."
                    className="w-full bg-white dark:bg-[#0F172A] border border-blue-300 dark:border-blue-700 p-3 rounded-xl text-sm outline-none focus:ring-4 ring-blue-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all"
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Btn label="Cancel" outline onClick={() => { setShowL2ApproveForm(false); setL2ApproveRemark(""); }} />
                  <Btn label="Confirm L2 Approve" color="green" onClick={() => handleL2BillApprove(selectedPO.id, l2ApproveRemark)} loading={isSubmitting} disabled={!l2ApproveRemark.trim() || isSubmitting} />
                </div>
              </div>
            </div>
          ) : showL2RejectForm ? (
            <div className="flex flex-col sm:flex-row gap-3 items-end w-full">
              <div className="flex-1">
                <label className="text-[10px] font-black text-red-500 dark:text-red-400 mb-1 block">Rejection reason *</label>
                <input type="text" value={l2RejectReason} onChange={e => setL2RejectReason(e.target.value)}
                  placeholder="e.g. Bill discrepancy, pending documents..."
                  className="w-full bg-white dark:bg-[#0F172A] border border-red-200 dark:border-red-900/40 p-3 rounded-xl text-sm outline-none focus:ring-4 ring-red-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all"
                />
              </div>
              <div className="flex gap-2 shrink-0">
                <Btn label="Cancel" outline onClick={() => { setShowL2RejectForm(false); setL2RejectReason(""); }} />
                <Btn label="Confirm Reject" color="red" loading={isSubmitting} disabled={!l2RejectReason.trim() || isSubmitting} onClick={() => handleL2BillReject(selectedPO.id, l2RejectReason)} />
              </div>
            </div>
          ) : (
            <div className="flex justify-between gap-3 w-full flex-wrap items-center">
              <div className="flex gap-2">
                <Btn label="Download PDF" icon={Download} outline onClick={() => handlePrintTransactionDetail(selectedPO, realGRN)} />
              </div>
              {hasPermission("APPROVE_PAYMENT_DIRECTOR") && tabAllowsL2Approve ? (
                <div className="flex gap-3">
                  <button onClick={() => setShowL2RejectForm(true)} disabled={isSubmitting}
                    className="bg-white dark:bg-[#0F172A] hover:bg-red-50 dark:hover:bg-red-900/10 border border-gray-200 dark:border-[#334155] hover:border-red-200 dark:hover:border-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 py-2.5 px-5 rounded-xl text-[13px] font-bold shadow-sm transition-all">
                    Reject (L2)
                  </button>
                  <Btn label="L2 Approve (Director) ✓" color="green" onClick={() => setShowL2ApproveForm(true)} loading={isSubmitting} disabled={isSubmitting} />
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl">
                  <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400">L1 Approved — Awaiting L2 Director approval</p>
                </div>
              )}
            </div>
          )
        ) : resolvedStatus === "physical_check" ? (
          <div className="flex justify-between gap-3 w-full items-center">
            <Btn label="Download PDF" icon={Download} outline onClick={() => handlePrintTransactionDetail(selectedPO, realGRN)} />
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400">Physical Check Required (Click shipment card above to view checklist & mark paid)</p>
            </div>
          </div>
        ) : usesGRNPayments ? (
          showRejectForm ? (
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
            <div className="flex justify-between gap-3 w-full flex-wrap">
              <div className="flex gap-2">
                <Btn label="Download PDF" icon={Download} outline onClick={() => handlePrintTransactionDetail(selectedPO, realGRN)} />
                {resolvedStatus !== "paid" && hasPermission("VERIFY_BILL") && (
                  <Btn label="Reject" color="red" onClick={() => setShowRejectForm(true)} />
                )}
              </div>
              {resolvedStatus === "paid" && (
                <Btn label="Download Payment Advice" icon={Download} onClick={() => handlePrintPaymentAdvice(selectedPO)} className="bg-orange-500 hover:bg-orange-600 text-white border-none shadow-lg shadow-orange-500/20 font-bold" />
              )}
            </div>
          )
        ) : resolvedStatus === "bill_verify" ? (
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
          ) : showVerifyRemark ? (
            <div className="flex flex-col gap-3 w-full">
              {hasMismatch && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-amber-800 dark:text-amber-300">Amount mismatch detected</p>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                      GRN received value: <span className="font-black">{fmtCur(grnValue)}</span> · Bill amount: <span className="font-black">{fmtCur(billValue)}</span>
                    </p>
                  </div>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 mb-1 block">Remark / reason for variance *</label>
                  <input
                    type="text"
                    value={verifyRemark}
                    onChange={(e) => setVerifyRemark(e.target.value)}
                    placeholder="e.g. Rate difference due to freight, partial delivery..."
                    className="w-full bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 p-3 rounded-xl text-sm outline-none focus:ring-4 ring-blue-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all"
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Btn label="Cancel" outline onClick={() => { setShowVerifyRemark(false); setVerifyRemark(""); }} />
                  <Btn
                    label="Confirm verify"
                    color="green"
                    onClick={() => handleBillVerify(selectedPO.id, verifyRemark)}
                    loading={isSubmitting}
                    disabled={!verifyRemark.trim() || isSubmitting}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-between gap-3 w-full flex-wrap">
              <div className="flex gap-2">
                <Btn label="Download PDF" icon={Download} outline onClick={() => handlePrintTransactionDetail(selectedPO, realGRN)} />
                {!isRemainingPayment && hasPermission("VERIFY_BILL") && tabAllowsVerify && <Btn label="Reject" color="red" onClick={() => setShowRejectForm(true)} />}
              </div>
              {hasPermission("VERIFY_BILL") && tabAllowsVerify && (
                <Btn
                  label={isRemainingPayment ? "Verify Remaining Bill" : "Verify"}
                  color="green"
                  onClick={() => {
                    if (hasMismatch) {
                      setShowVerifyRemark(true);
                    } else {
                      handleBillVerify(selectedPO.id, "");
                    }
                  }}
                  loading={isSubmitting}
                  disabled={isSubmitting}
                />
              )}
            </div>
          )
        ) : resolvedStatus === "bill_verified" ? (
          showBillApproveForm ? (
            <div className="flex flex-col gap-3 w-full">
              <div className="flex flex-col sm:flex-row gap-3 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mb-1 block">L1 AGM Approval Remark (Mandatory) *</label>
                  <input
                    type="text"
                    value={billApproveRemark}
                    onChange={e => setBillApproveRemark(e.target.value)}
                    placeholder="e.g. Verified goods receipt and rates. Approved for L2 Director review."
                    className="w-full bg-white dark:bg-[#0F172A] border border-emerald-300 dark:border-emerald-700 p-3 rounded-xl text-sm outline-none focus:ring-4 ring-emerald-500/10 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all"
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <Btn label="Cancel" outline onClick={() => { setShowBillApproveForm(false); setBillApproveRemark(""); }} />
                  <Btn
                    label="Confirm Approve"
                    color="green"
                    onClick={() => { handleBillApprove(selectedPO.id, billApproveRemark); setShowBillApproveForm(false); setBillApproveRemark(""); }}
                    loading={isSubmitting}
                    disabled={!billApproveRemark.trim() || isSubmitting}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-between gap-3 w-full flex-wrap">
              <div className="flex gap-2">
                <Btn label="Download PDF" icon={Download} outline onClick={() => handlePrintTransactionDetail(selectedPO, realGRN)} />
              </div>
              {hasPermission("APPROVE_PAYMENT_AGM") && tabAllowsApprove && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRevokeVerify(selectedPO.id)}
                    disabled={isSubmitting}
                    className="bg-white dark:bg-[#0F172A] hover:bg-red-50 dark:hover:bg-red-900/10 border border-gray-200 dark:border-[#334155] hover:border-red-200 dark:hover:border-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 py-2.5 px-5 rounded-xl text-[13px] font-bold shadow-sm transition-all"
                  >
                    Reject (L1)
                  </button>
                  <Btn
                    label="L1 Approve (AGM) ✓"
                    color="green"
                    onClick={() => setShowBillApproveForm(true)}
                    loading={isSubmitting}
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          )
        ) : (resolvedStatus === "payment_pending" || ((resolvedStatus === "paid" || resolvedStatus === "partial_paid") && isEditingPayment)) ? (
          <div className="flex justify-between gap-3 w-full items-center">
            <div className="flex gap-2">
              <Btn label="Download PDF" icon={Download} outline onClick={() => handlePrintTransactionDetail(selectedPO, realGRN)} />
            </div>
            {drawerPayableAmount <= 0 && !isEditingPayment ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
                <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">Waiting for next GRN batch</p>
              </div>
            ) : hasPermission("MAKE_PAYMENT") ? (
              <button
                onClick={() => handlePaymentSubmit(selectedPO.id)}
                disabled={isSubmitting || drawerPayableAmount <= 0}
                className="bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 px-8 rounded-xl text-[13px] font-black shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? "Processing..." : isEditingPayment ? "Update Payment ✓" : isRemainingPayment ? "Pay Remaining Balance ✓" : "Record Payment ✓"}
              </button>
            ) : null}
          </div>
        ) : resolvedStatus === "partial_paid" ? (
          <div className="flex items-center gap-3 w-full">
            <Btn label="Download PDF" icon={Download} outline onClick={() => handlePrintTransactionDetail(selectedPO, realGRN)} />
            <div className="flex items-center gap-2 flex-1 px-3 py-2 bg-amber-50 dark:bg-amber-500/10 rounded-xl border border-amber-200 dark:border-amber-500/20">
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">
                Partial payment of {fmtCur(selectedPO.payment?.amountPaid || 0)} recorded. Remaining balance will activate once GRN is fulfilled.
              </p>
            </div>
          </div>
        ) : resolvedStatus === "paid" && !isEditingPayment ? (
          <div className="flex justify-between gap-3 w-full flex-wrap">
            <div className="flex gap-2">
              <Btn label="Download PDF" icon={Download} outline onClick={() => handlePrintTransactionDetail(selectedPO, realGRN)} />
            </div>
            <div className="flex gap-3 flex-wrap">
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
          </div>
        ) : null;

        return <Modal
          title={isEditingPayment ? `Edit Payment — ${selectedPO.id}` : `Transaction detail view${selectedAccountId ? ` — ${selectedAccountId}` : ""}`}
          onClose={() => { setSelectedPO(null); setIsEditingPayment(false); setShowVerifyRemark(false); setVerifyRemark(""); setPayApproveReject({ show: false, level: null, reason: "" }); setPayApproveForm({ show: false, level: null, remark: "" }); }}
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
            onGRNVerify={handleGRNVerify}
            onGRNApprove={handleGRNApprove}
            onGRNPaymentSubmit={handleGRNPaymentSubmit}
            onGRNMarkPaid={handleGRNMarkPaid}
            onGRNVerifyRevert={handleGRNVerifyRevert}
            onGRNPaymentEdit={handleGRNPaymentEdit}
            onGRNPaymentDelete={handleGRNPaymentDelete}
            onPaymentApprove={handlePaymentApprove}
            onPaymentReject={handlePaymentApprovalReject}
            onPhysicalCheckPaid={handlePhysicalCheckPaid}
            onGRNL2Approve={handleL2GRNApprove}
            onGRNL2Reject={handleL2GRNReject}
            onGRNShipmentReject={handleGRNShipmentReject}
            hasPermission={hasPermission}
            tabAllowsVerify={tabAllowsVerify}
            tabAllowsApprove={tabAllowsApprove}
            tabAllowsL2Approve={tabAllowsL2Approve}
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

const GRN_STATUS_CONFIG = {
  unpaid:          { label: "Needs Verification", dot: "bg-blue-400",    badge: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20" },
  bill_verified:   { label: "Verified",           dot: "bg-emerald-400", badge: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20" },
  bill_approved:   { label: "L1 Approved",        dot: "bg-teal-400",    badge: "text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10 border-teal-100 dark:border-teal-500/20" },
  bill_rejected:   { label: "Rejected",           dot: "bg-red-400",     badge: "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20" },
  payment_pending: { label: "Pending Payment",    dot: "bg-amber-400",   badge: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20" },
  paid:            { label: "Paid",               dot: "bg-emerald-500", badge: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30" },
};

const GRNShipmentCard = /* @__PURE__ */ __name(({ shipment, po, isSubmitting, onVerify, onApprove, onL2Approve, onL2Reject, onReject, onPaymentSubmit, onMarkPaid, onVerifyRevert, onPaymentEdit, onPaymentDelete, onPaymentApprove, onPaymentReject, onPhysicalCheckPaid, paymentForm, setPaymentForm, fileInputRef, handleFileChange, hasPermission: hp, defaultExpanded, tabAllowsVerify = true, tabAllowsApprove = true, tabAllowsL2Approve = true }) => {
  const [physicalCheckList, setPhysicalCheckList] = useState({});
  const [viewerImages, setViewerImages] = useState(null);
  // Use identical logic as the items table render so grnValue always matches the displayed totals
  const { grnValue, grnBaseAmount } = (shipment.items || []).reduce((acc, gi) => {
    const rcv = gi.received ?? gi.qty ?? 0;
    const poItem = (po.items || []).find(pi =>
      (pi.sku && gi.sku && pi.sku === gi.sku) ||
      (pi.itemName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
    );
    const rate = gi.rate || poItem?.rate || 0;
    const gstPct = gi.gstPct ?? poItem?.gstPct ?? 0;
    const gstType = gi.gstType || poItem?.gstType || "Exclusive";
    const isIncl = (gstType || "").toLowerCase().includes("inclus");
    const total = calcChargeTotal(rcv * rate, gstPct, gstType);
    // For inclusive, the rate already embeds GST — extract the pre-GST base
    const base = isIncl && gstPct > 0 ? total / (1 + gstPct / 100) : rcv * rate;
    return { grnValue: acc.grnValue + total, grnBaseAmount: acc.grnBaseAmount + base };
  }, { grnValue: 0, grnBaseAmount: 0 });
  const grnGstAmount = grnValue - grnBaseAmount;
  const grnGstPct = grnBaseAmount > 0 ? Math.round(grnGstAmount / grnBaseAmount * 100) : 0;
  // Prioritize verified invoice amount entered by Maker/Checker if present, else fallback to calculated shipment value
  const verifiedInvoiceAmount = Number(shipment.invoiceAmount) > 0 ? Number(shipment.invoiceAmount) : 0;
  const suggestedAmount = verifiedInvoiceAmount
    || (grnValue > 0 ? Math.round(grnValue) : 0)
    || (shipment.paymentStatus === "paid" ? (shipment.payment?.amount || 0) : 0)
    || 0;
  // Cap against verified invoice amount or GST-inclusive grnValue
  const validationCap = verifiedInvoiceAmount || (grnValue > 0 ? Math.round(grnValue) : Math.round(shipment.invoiceAmount || 0));

  const [expanded, setExpanded] = useState(defaultExpanded || false);
  const [verifyForm, setVerifyForm] = useState({ remark: "", invoiceNo: shipment.invoiceNo || "", invoiceAmount: suggestedAmount });
  const [verifyRemarkError, setVerifyRemarkError] = useState(false);
  const [approveRemark, setApproveRemark] = useState("");
  const [showApproveForm, setShowApproveForm] = useState(false);
  const [approveRemarkError, setApproveRemarkError] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [simplePayForm, setSimplePayForm] = useState({ date: new Date().toISOString().split("T")[0], mode: "NEFT", utr: "", ref: "" });
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditPayForm, setShowEditPayForm] = useState(false);
  const [editPay, setEditPay] = useState({
    amountPaid: shipment.payment?.amount || 0,
    date: shipment.payment?.date || new Date().toISOString().split("T")[0],
    mode: shipment.payment?.mode || "NEFT",
    ref: shipment.payment?.ref || "",
    utr: shipment.payment?.utr || "",
    chequeNo: shipment.payment?.chequeNo || "",
    chequeDate: shipment.payment?.chequeDate || "",
    bank: shipment.payment?.bank || "",
    remarks: shipment.payment?.remarks || "",
  });

  const status = shipment.paymentStatus || "unpaid";
  const sc = GRN_STATUS_CONFIG[status] || GRN_STATUS_CONFIG.unpaid;
  const isLocked = status === "paid";

  useEffect(() => {
    if (expanded && status === "payment_pending") {
      setPaymentForm(p => ({ ...p, amountPaid: suggestedAmount }));
    }
  }, [expanded, status, suggestedAmount, setPaymentForm]);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden shadow-sm transition-all hover:border-gray-200 dark:hover:border-gray-700">
      {/* Shipment header — click anywhere to open this shipment's own drawer */}
      <div
        onClick={() => setExpanded(true)}
        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/40 dark:bg-gray-800/20 cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full ${sc.dot} shrink-0`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-[13px] text-gray-900 dark:text-white">GRN: {shipment.grnId}</span>
              {shipment.totalReceipts > 1 && (
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                  Receipt {shipment.receiptIdx + 1}/{shipment.totalReceipts}
                </span>
              )}
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${sc.badge}`}>
                {sc.label}
              </span>

              {/* Action-required badge for L1/L2 pending */}
              {(status === "bill_verified" && hp("APPROVE_PAYMENT_AGM")) && (
                <span className="text-[9.5px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 bg-amber-500 text-white border-amber-600 shadow-xs animate-pulse">
                  ⚡ Action Required (L1 AGM)
                </span>
              )}
              {(status === "bill_approved" && hp("APPROVE_PAYMENT_DIRECTOR")) && (
                <span className="text-[9.5px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 bg-teal-500 text-white border-teal-600 shadow-xs animate-pulse">
                  ⚡ Action Required (L2 Director)
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {formatDate(shipment.date)} · By {shipment.receivedBy}
              {shipment.invoiceNo ? ` · Inv: ${shipment.invoiceNo}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Shipment Value</p>
            <p className="text-[14px] font-black text-gray-900 dark:text-white tabular-nums">{fmtCur(shipment.invoiceAmount || grnValue)}</p>
          </div>
          <div className="p-2 rounded-lg text-gray-400">
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* This shipment's own drawer — items, verify/approve/payment flow, isolated per shipment */}
      {expanded && createPortal(
        <Modal 
          wide 
          title={`Shipment — ${shipment.grnId}`} 
          subtitle={sc.label} 
          onClose={() => setExpanded(false)}
          footer={(() => {
            if (status === "unpaid" && hp("VERIFY_BILL") && tabAllowsVerify) {
              if (showVerifyForm) {
                return (
                  <div className="flex justify-end gap-2 w-full">
                    <Btn label="Cancel" outline onClick={() => setShowVerifyForm(false)} />
                    <Btn label="Confirm Verify" color="green" loading={isSubmitting} disabled={isSubmitting} onClick={() => {
                      if (!verifyForm.remark.trim()) {
                        setVerifyRemarkError(true);
                        return;
                      }
                      const amt = Number(verifyForm.invoiceAmount);
                      if (validationCap > 0 && amt > validationCap + 0.5) {
                        toast.error(`Invoice amount ${fmtCur(amt)} exceeds shipment value ${fmtCur(validationCap)}${grnGstPct > 0 ? ` (Base ${fmtCur(grnBaseAmount)} + GST ${grnGstPct}%)` : ""}.`);
                        return;
                      }
                      onVerify(shipment.grnId, verifyForm.remark, verifyForm.invoiceNo, verifyForm.invoiceAmount, shipment.receiptIdx);
                      setShowVerifyForm(false);
                    }} />
                  </div>
                );
              }
              if (showRejectForm) {
                return (
                  <div className="space-y-2 w-full">
                    <textarea
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Rejection reason (required)..."
                      rows={2}
                      className="w-full text-[12px] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <div className="flex justify-end gap-2">
                      <Btn label="Cancel" outline onClick={() => { setShowRejectForm(false); setRejectionReason(""); }} />
                      <Btn label="Confirm Reject" color="red" loading={isSubmitting} disabled={!rejectionReason.trim() || isSubmitting} onClick={() => {
                        onReject && onReject(shipment.grnId, shipment.receiptIdx ?? null, rejectionReason.trim());
                        setShowRejectForm(false);
                        setRejectionReason("");
                      }} />
                    </div>
                  </div>
                );
              }
              return (
                <div className="flex justify-end gap-2 w-full">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={isSubmitting}
                    className="bg-white dark:bg-[#0F172A] hover:bg-red-50 dark:hover:bg-red-900/10 border border-gray-200 dark:border-[#334155] hover:border-red-200 dark:hover:border-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 py-2 px-5 rounded-xl text-[12px] font-bold shadow-sm transition-all"
                  >
                    Reject
                  </button>
                  <button onClick={() => setShowVerifyForm(true)} className="text-[12px] font-black bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl shadow-sm shadow-emerald-500/20 transition-all flex items-center gap-2">
                    <Check className="w-3.5 h-3.5" /> Verify Bill
                  </button>
                </div>
              );
            }
            if (status === "bill_rejected" && hp("VERIFY_BILL") && tabAllowsVerify) {
              return (
                <div className="flex justify-end w-full">
                  <button
                    onClick={() => onVerifyRevert && onVerifyRevert(shipment.grnId, shipment.receiptIdx ?? null)}
                    disabled={isSubmitting}
                    className="bg-white dark:bg-[#0F172A] hover:bg-blue-50 dark:hover:bg-blue-900/10 border border-gray-200 dark:border-[#334155] hover:border-blue-200 dark:hover:border-blue-900/30 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-50 py-2 px-5 rounded-xl text-[12px] font-bold shadow-sm transition-all"
                  >
                    Reset to Needs Verification
                  </button>
                </div>
              );
            }
            if (status === "bill_verified" && hp("APPROVE_PAYMENT_AGM") && tabAllowsApprove) {
              if (showApproveForm) {
                return (
                  <div className="flex justify-end gap-2 w-full">
                    <Btn label="Cancel" outline onClick={() => { setShowApproveForm(false); setApproveRemark(""); setApproveRemarkError(false); }} />
                    <Btn label="Confirm L1 Approve" color="green" loading={isSubmitting} disabled={isSubmitting} onClick={() => {
                      if (!approveRemark.trim()) {
                        setApproveRemarkError(true);
                        return;
                      }
                      onApprove(shipment.grnId, shipment.receiptIdx, approveRemark.trim());
                      setShowApproveForm(false);
                    }} />
                  </div>
                );
              }
              return (
                <div className="flex justify-end gap-2 w-full">
                  <Btn label="Reject (L1)" outline onClick={() => onVerifyRevert(shipment.grnId, shipment.receiptIdx)} disabled={isSubmitting} />
                  <Btn label="L1 Approve (AGM) ✓" color="green" loading={isSubmitting} disabled={isSubmitting} onClick={() => setShowApproveForm(true)} />
                </div>
              );
            }
            if (status === "bill_approved" && hp("APPROVE_PAYMENT_DIRECTOR") && tabAllowsL2Approve) {
              if (showRejectForm) {
                return (
                  <div className="space-y-2 w-full">
                    <textarea
                      value={rejectionReason}
                      onChange={e => setRejectionReason(e.target.value)}
                      placeholder="Rejection reason (required)..."
                      rows={2}
                      className="w-full text-[12px] border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                    />
                    <div className="flex justify-end gap-2">
                      <Btn label="Cancel" outline onClick={() => { setShowRejectForm(false); setRejectionReason(""); }} />
                      <Btn label="Confirm Reject" color="red" loading={isSubmitting} disabled={!rejectionReason.trim() || isSubmitting} onClick={() => {
                        onL2Reject && onL2Reject(shipment.grnId, shipment.receiptIdx ?? null, rejectionReason.trim());
                        setShowRejectForm(false);
                        setRejectionReason("");
                      }} />
                    </div>
                  </div>
                );
              }
              if (showApproveForm) {
                return (
                  <div className="space-y-2 w-full">
                    <textarea
                      value={approveRemark}
                      onChange={e => { setApproveRemark(e.target.value); setApproveRemarkError(false); }}
                      placeholder="L2 approval remark (required)..."
                      rows={2}
                      className={`w-full text-[12px] border rounded-xl px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-emerald-400 ${approveRemarkError ? "border-red-400" : "border-gray-200 dark:border-gray-700"}`}
                    />
                    <div className="flex justify-end gap-2">
                      <Btn label="Cancel" outline onClick={() => { setShowApproveForm(false); setApproveRemark(""); setApproveRemarkError(false); }} />
                      <Btn label="Confirm L2 Approve" color="green" loading={isSubmitting} disabled={isSubmitting} onClick={() => {
                        if (!approveRemark.trim()) { setApproveRemarkError(true); return; }
                        onL2Approve && onL2Approve(shipment.grnId, shipment.receiptIdx ?? null, approveRemark.trim());
                        setShowApproveForm(false);
                        setApproveRemark("");
                      }} />
                    </div>
                  </div>
                );
              }
              return (
                <div className="flex justify-end gap-2 w-full">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={isSubmitting}
                    className="bg-white dark:bg-[#0F172A] hover:bg-red-50 dark:hover:bg-red-900/10 border border-gray-200 dark:border-[#334155] hover:border-red-200 dark:hover:border-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 py-2 px-5 rounded-xl text-[12px] font-bold shadow-sm transition-all"
                  >
                    Reject (L2)
                  </button>
                  <button
                    onClick={() => setShowApproveForm(true)}
                    disabled={isSubmitting}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-5 rounded-xl text-[12px] font-black shadow-sm shadow-emerald-500/20 transition-all active:scale-[0.98]"
                  >
                    L2 Approve (Director) ✓
                  </button>
                </div>
              );
            }
            if (status === "payment_pending" && hp("MAKE_PAYMENT")) {
              return (
                <div className="flex justify-end w-full">
                  <button
                    onClick={() => setShowPaymentModal(v => !v)}
                    className="bg-[#F97316] hover:bg-[#EA580C] text-white py-2 px-5 rounded-xl text-[12px] font-black shadow-sm shadow-orange-500/20 transition-all active:scale-[0.98]"
                  >
                    {showPaymentModal ? "Cancel" : "Record Payment"}
                  </button>
                </div>
              );
            }
            return null;
          })()}
        >
        <div className="space-y-4">
          {/* Progress chain: GRN → Verify → L1 AGM → L2 Director → Paid */}
          {(() => {
            const isVerifyDone = ["bill_verified", "bill_approved", "payment_pending", "paid"].includes(status);
            const isL1Done = ["bill_approved", "payment_pending", "paid"].includes(status);
            const isL2Done = status === "paid" || (status === "payment_pending" && !!po.l2ApprovedBy);
            const isPaidDone = status === "paid";

            const chain = [
              { label: "GRN", sub: shipment.grnId, done: true, active: false },
              { label: "Verify", sub: shipment.verifiedBy ? `By ${shipment.verifiedBy}` : "Bill entry", done: isVerifyDone, active: !isVerifyDone },
              { label: "L1 - AGM", sub: shipment.approvedBy ? `By ${shipment.approvedBy}` : "Awaiting AGM", done: isL1Done, active: isVerifyDone && !isL1Done },
              { label: "L2 - Director", sub: isL2Done ? (po.l2ApprovedBy ? `By ${po.l2ApprovedBy}` : "Approved") : isL1Done ? "Awaiting Director" : "Director sign-off", done: isL2Done, active: isL1Done && !isL2Done },
              { label: "Paid", sub: shipment.payment?.date ? formatDate(shipment.payment.date) : "Settlement", done: isPaidDone, active: isL2Done && !isPaidDone },
            ];

            return (
              <div className="bg-white dark:bg-gray-900/70 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="flex items-stretch overflow-x-auto no-scrollbar py-3 px-2">
                  {chain.map((st, i) => {
                    const done = st.done;
                    const active = st.active;
                    return (
                      <div key={i} className="flex items-center flex-1 min-w-0">
                        <div className={`flex-1 flex flex-col items-center gap-1 px-1.5 py-2 min-w-[64px] transition-colors rounded-xl ${active ? "bg-blue-50/60 dark:bg-blue-900/10" : done ? "bg-emerald-50/30 dark:bg-emerald-900/5" : ""}`}>
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shadow-sm shrink-0 ${done ? "bg-emerald-500 text-white shadow-emerald-500/30" : active ? "bg-blue-500 text-white shadow-blue-500/30" : "bg-gray-100 dark:bg-gray-800 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700"}`}>
                            {done ? "✓" : active ? "●" : i + 1}
                          </div>
                          <p className={`text-[9.5px] font-black tracking-wide text-center truncate max-w-[68px] ${done ? "text-emerald-700 dark:text-emerald-400" : active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-600"}`}>{st.label}</p>
                          <p className={`text-[8.5px] font-bold text-center leading-tight max-w-[68px] truncate ${done ? "text-emerald-600 dark:text-emerald-500" : active ? "text-blue-600 font-extrabold" : "text-gray-400 dark:text-gray-600"}`}>{st.sub}</p>
                        </div>
                        {i < chain.length - 1 && (
                          <div className={`h-px w-2.5 shrink-0 ${done ? "bg-emerald-400 dark:bg-emerald-700" : "bg-gray-200 dark:bg-gray-700"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* L2 Director approval info card — shown once L2 approves */}
                {status === "payment_pending" && po.l2ApprovedBy && (
                  <div className="border-t border-blue-100 dark:border-blue-900/30 px-3 py-2.5 bg-blue-50/40 dark:bg-blue-950/20 flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                      <span className="text-white text-[9px] font-black">✓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-blue-700 dark:text-blue-300">L2 Director Approved</p>
                      <p className="text-[9px] text-blue-600 dark:text-blue-400 truncate">By {po.l2ApprovedBy}{po.l2ApprovedAt ? ` · ${formatDate(po.l2ApprovedAt)}` : ""}</p>
                      {po.l2Remark && <p className="text-[8.5px] italic text-blue-500 dark:text-blue-400 mt-0.5 truncate">"{po.l2Remark}"</p>}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Items table */}
          {(shipment.items || []).length > 0 && (
            <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <table className="w-full text-left border-collapse min-w-[380px]">
                <thead>
                  <tr className="bg-gray-100/70 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-3 py-2.5 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Material</th>
                    <th className="px-3 py-2.5 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Received</th>
                    <th className="px-3 py-2.5 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Rate</th>
                    <th className="px-3 py-2.5 text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80 bg-white dark:bg-gray-900/50">
                  {shipment.items.map((gi, i) => {
                    const rcv = gi.received ?? gi.qty ?? 0;
                    const poItem = (po.items || []).find(pi =>
                      (pi.sku && gi.sku && pi.sku === gi.sku) ||
                      (pi.itemName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
                    );
                    const rootItem = (shipment.rootItems || []).find(ri =>
                      (ri.sku && gi.sku && ri.sku === gi.sku) ||
                      (ri.itemName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
                    );
                    const rate = gi.rate || poItem?.rate || 0;
                    const unit = gi.unit || rootItem?.unit || poItem?.unit || "";
                    const gstPct = gi.gstPct ?? poItem?.gstPct ?? 0;
                    const gstType = gi.gstType || poItem?.gstType || "Exclusive";
                    const isIncl = (gstType || "").toLowerCase().includes("inclus");
                    const itemTotalWithGst = calcChargeTotal(rcv * rate, gstPct, gstType);
                    const gstOnItem = isIncl ? 0 : (itemTotalWithGst - rcv * rate);
                    return (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-3 py-3">
                          <span className="text-[12px] font-semibold text-gray-900 dark:text-white">{gi.itemName || gi.name || "Item"}</span>
                          {gi.sku && <p className="text-[9px] text-gray-400 dark:text-gray-600 font-mono mt-0.5">{gi.sku}</p>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="text-[13px] font-black text-gray-900 dark:text-white tabular-nums">{rcv}</span>
                          {unit && <span className="text-[10px] font-medium text-gray-400 ml-1">{unit}</span>}
                        </td>
                        <td className="px-3 py-3 text-right text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
                          {fmtCur(rate)}
                          {gstPct > 0 && !isIncl && (
                            <span className="text-[9px] font-bold block mt-0.5 text-blue-500">
                              +{gstPct}% GST (Excl.)
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          <span className="font-black text-[13px] text-gray-900 dark:text-white">{fmtCur(itemTotalWithGst)}</span>
                          {gstPct > 0 && (
                            <span className={`text-[9px] font-medium block mt-0.5 ${isIncl ? "text-emerald-500 dark:text-emerald-400" : "text-blue-400"}`}>
                              {isIncl ? "GST Incl." : `+${fmtCur(gstOnItem)} GST`}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-orange-50/50 dark:bg-orange-900/10 border-t border-orange-100 dark:border-orange-900/20">
                    <td colSpan={3} className="px-3 py-2.5 text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-wide">Shipment Total{grnGstAmount > 0.01 ? " (Incl. GST)" : ""}</td>
                    <td className="px-3 py-2.5 text-right font-black text-[14px] text-orange-500 dark:text-orange-400 tabular-nums">{fmtCur(grnValue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Doc photos */}
          {(() => {
            const imgs = [...(shipment.challanPhotos || []), ...(shipment.personPhotos || [])].filter(Boolean);
            if (!imgs.length) return null;
            return (
              <div className="flex gap-2 flex-wrap">
                {imgs.map((img, i) => (
                  <div key={i} onClick={() => setViewerImages({ images: imgs, index: i, title: "Shipment Documents" })} className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 cursor-zoom-in hover:border-orange-400 dark:hover:border-orange-500 transition-colors shadow-sm">
                    <img src={img} alt={`Doc ${i + 1}`} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            );
          })()}

          {/* ── Status-based action area ── */}

          {status === "unpaid" && hp("VERIFY_BILL") && tabAllowsVerify && showVerifyForm && (
            <div className="space-y-3 bg-gray-50/60 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-[11px] font-black text-gray-700 dark:text-gray-300">Bill Verification</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-gray-400 mb-1 block">Invoice No.</label>
                  <input type="text" value={verifyForm.invoiceNo} onChange={e => setVerifyForm(p => ({...p, invoiceNo: e.target.value}))} className="w-full bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-white focus:ring-2 ring-emerald-500/20" placeholder="INV-001" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 mb-1 block">Invoice Amount (₹)</label>
                  <input type="number" value={verifyForm.invoiceAmount} onChange={e => setVerifyForm(p => ({...p, invoiceAmount: e.target.value}))} className={`w-full bg-white dark:bg-[#0F172A] border p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-white focus:ring-2 ${validationCap > 0 && Number(verifyForm.invoiceAmount) > validationCap ? "border-red-400 dark:border-red-500 ring-red-500/20" : "border-gray-200 dark:border-gray-700 ring-emerald-500/20"}`} placeholder="Invoice amount" />
                  {grnBaseAmount > 0 && grnGstAmount > 0.01 && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                      Base {fmtCur(grnBaseAmount)} + GST {grnGstPct}%: {fmtCur(grnGstAmount)} = {fmtCur(grnValue)}
                    </p>
                  )}
                  {validationCap > 0 && Number(verifyForm.invoiceAmount) > validationCap + 0.5 && (
                    <p className="text-[10px] font-bold text-red-500 mt-1">⚠ Exceeds shipment value (incl. GST) of {fmtCur(validationCap)}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 mb-1 block">Remark *</label>
                <input
                  type="text"
                  value={verifyForm.remark}
                  onChange={e => { setVerifyForm(p => ({...p, remark: e.target.value})); if (e.target.value.trim()) setVerifyRemarkError(false); }}
                  className={`w-full bg-white dark:bg-[#0F172A] border p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-white focus:ring-2 ${verifyRemarkError ? "border-red-400 dark:border-red-500 ring-red-500/20" : "border-gray-200 dark:border-gray-700 ring-emerald-500/20"}`}
                  placeholder="e.g. Rate includes freight"
                />
                {verifyRemarkError && <p className="text-[10px] font-bold text-red-500 mt-1">⚠ Remark is mandatory</p>}
              </div>
            </div>
          )}

          {/* Verification info — always visible once verified, regardless of status */}
          {shipment.verifiedBy && (
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/25 border-b border-emerald-200 dark:border-emerald-800/50">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Bill Verified</span>
                {shipment.verifiedAt && <span className="ml-auto text-[10px] text-emerald-600/70 dark:text-emerald-500/60 tabular-nums">{formatDate(shipment.verifiedAt)}</span>}
              </div>
              <div className="px-3 py-2.5 space-y-1.5 bg-white dark:bg-gray-900/30">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-gray-400 shrink-0">Verified by</span>
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 text-right">{shipment.verifiedBy}</span>
                </div>
                {shipment.invoiceNo && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-gray-400 shrink-0">Invoice No.</span>
                    <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{shipment.invoiceNo}</span>
                  </div>
                )}
                {shipment.invoiceAmount > 0 && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-gray-400 shrink-0">Invoice Amount</span>
                    <span className="text-[11px] font-bold text-orange-500">{fmtCur(shipment.invoiceAmount)}</span>
                  </div>
                )}
                {shipment.verifyRemark && (
                  <div className="pt-1.5 mt-0.5 border-t border-emerald-100 dark:border-emerald-900/40">
                    <span className="text-[10px] text-gray-400 block mb-0.5">Remark</span>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 italic">"{shipment.verifyRemark}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* L1 AGM Approval info — shown once L1 is done */}
          {(shipment.approvedBy || po.billApprovedBy) && (
            <div className="rounded-xl border border-teal-200 dark:border-teal-800/50 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-teal-50 dark:bg-teal-900/25 border-b border-teal-200 dark:border-teal-800/50">
                <CheckCircle className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                <span className="text-[10px] font-black text-teal-700 dark:text-teal-400 uppercase tracking-wider">L1 AGM Approved</span>
                {(po.billApprovedDate || shipment.approvedAt) && (
                  <span className="ml-auto text-[10px] text-teal-600/70 dark:text-teal-500/60 tabular-nums">
                    {formatDate(po.billApprovedDate || shipment.approvedAt)}
                  </span>
                )}
              </div>
              <div className="px-3 py-2.5 space-y-1.5 bg-white dark:bg-gray-900/30">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-gray-400 shrink-0">Approved by</span>
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 text-right">{po.billApprovedBy || shipment.approvedBy}</span>
                </div>
                {(po.billApproveRemark || shipment.approveRemark) && (
                  <div className="pt-1.5 mt-0.5 border-t border-teal-100 dark:border-teal-900/40">
                    <span className="text-[10px] text-gray-400 block mb-0.5">Remark</span>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 italic">"{po.billApproveRemark || shipment.approveRemark}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* L2 Director Approval info — shown once L2 is done */}
          {po.l2ApprovedBy && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 overflow-hidden shadow-sm">
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/25 border-b border-blue-200 dark:border-blue-800/50">
                <CheckCircle className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">L2 Director Approved</span>
                {po.l2ApprovedAt && (
                  <span className="ml-auto text-[10px] text-blue-600/70 dark:text-blue-500/60 tabular-nums">{formatDate(po.l2ApprovedAt)}</span>
                )}
              </div>
              <div className="px-3 py-2.5 space-y-1.5 bg-white dark:bg-gray-900/30">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-gray-400 shrink-0">Approved by</span>
                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 text-right">{po.l2ApprovedBy}</span>
                </div>
                {po.l2Remark && (
                  <div className="pt-1.5 mt-0.5 border-t border-blue-100 dark:border-blue-900/40">
                    <span className="text-[10px] text-gray-400 block mb-0.5">Remark</span>
                    <p className="text-[11px] text-gray-600 dark:text-gray-300 italic">"{po.l2Remark}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Approval remark form — only shown while awaiting approval */}
          {status === "bill_verified" && showApproveForm && (
            <div className="space-y-3 bg-emerald-50/40 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40 p-4">
              <p className="text-[11px] font-black text-emerald-800 dark:text-emerald-300">Approval Remark</p>
              <div>
                <label className="text-[10px] font-black text-gray-400 mb-1 block">Remark *</label>
                <input
                  type="text"
                  value={approveRemark}
                  onChange={e => { setApproveRemark(e.target.value); if (e.target.value.trim()) setApproveRemarkError(false); }}
                  className={`w-full bg-white dark:bg-[#0F172A] border p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-white focus:ring-2 ${approveRemarkError ? "border-red-400 dark:border-red-500 ring-red-500/20" : "border-emerald-300 dark:border-emerald-700 ring-emerald-500/20"}`}
                  placeholder="e.g. Approved for payment settlement"
                />
                {approveRemarkError && <p className="text-[10px] font-bold text-red-500 mt-1">⚠ Remark is mandatory</p>}
              </div>
            </div>
          )}

          {status === "payment_pending" && (po.accountStatus || "").toLowerCase() === "payment_initiated" && (showApproveForm || showRejectForm) && (
            <div className={`space-y-3 rounded-xl border p-4 ${showRejectForm ? "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-800/40" : "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40"}`}>
              <p className={`text-[11px] font-black ${showRejectForm ? "text-red-800 dark:text-red-300" : "text-emerald-800 dark:text-emerald-300"}`}>
                {showRejectForm ? "Rejection Details" : "Level Approval Remark"}
              </p>
              {showRejectForm ? (
                <div>
                  <label className="text-[10px] font-black text-gray-400 mb-1 block">Rejection Reason *</label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                    className="w-full bg-white dark:bg-[#0F172A] border border-red-300 dark:border-red-700 p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-white focus:ring-2 ring-red-500/20"
                    placeholder="e.g. Price mismatch, document error..."
                  />
                  {!rejectionReason.trim() && <p className="text-[10px] font-bold text-red-500 mt-1">⚠ Reason is required to reject</p>}
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black text-gray-400 mb-1 block">Remark *</label>
                  <input
                    type="text"
                    value={approveRemark}
                    onChange={e => { setApproveRemark(e.target.value); if (e.target.value.trim()) setApproveRemarkError(false); }}
                    className={`w-full bg-white dark:bg-[#0F172A] border p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-white focus:ring-2 ${approveRemarkError ? "border-red-400 dark:border-red-500 ring-red-500/20" : "border-emerald-300 dark:border-emerald-700 ring-emerald-500/20"}`}
                    placeholder="e.g. Approved for payment settlement"
                  />
                  {approveRemarkError && <p className="text-[10px] font-bold text-red-500 mt-1">⚠ Remark is mandatory</p>}
                </div>
              )}
            </div>
          )}

          {status === "payment_pending" && (po.accountStatus || "").toLowerCase() === "physical_check" && (() => {
            const pcItems = [
              { key: "grnReceived",     label: "GRN received and on file",           auto: true },
              { key: "grnValueMatch",   label: "GRN value matches invoice amount",   auto: false },
              { key: "invoiceReceived", label: "Invoice / bill physically received",  auto: false },
              { key: "poValueMatch",    label: "PO amount matches payment amount",    auto: false },
              { key: "bankVerified",    label: "Vendor bank details verified",        auto: false },
            ];
            const checkState = pcItems.reduce((acc, item) => ({
              ...acc, [item.key]: item.auto ? true : (physicalCheckList[item.key] ?? false)
            }), {});
            const allChecked = pcItems.every(item => checkState[item.key]);
            return (
              <div className="space-y-3 bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/40 rounded-xl overflow-hidden p-1">
                <div className="px-3 py-2 bg-amber-100/60 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-700/40 flex items-center gap-2 rounded-t-lg">
                  <div className="w-1.5 h-3.5 bg-amber-500 rounded-full" />
                  <p className="text-[11px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wide">Physical Verification Checklist</p>
                </div>
                <div className="divide-y divide-amber-100 dark:divide-amber-900/20">
                  {pcItems.map(item => (
                    <label key={item.key} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${checkState[item.key] ? "bg-emerald-50/40 dark:bg-emerald-900/5" : "hover:bg-amber-100/30 dark:hover:bg-amber-900/10"}`}>
                      <input type="checkbox" checked={checkState[item.key]} disabled={item.auto}
                        onChange={e => setPhysicalCheckList(prev => ({ ...prev, [item.key]: e.target.checked }))}
                        className="w-4 h-4 accent-emerald-500 shrink-0" />
                      <span className={`text-[12px] font-bold ${checkState[item.key] ? "text-emerald-700 dark:text-emerald-400 line-through decoration-emerald-400" : "text-gray-700 dark:text-gray-300"}`}>{item.label}</span>
                      {item.auto && <span className="ml-auto text-[9px] font-black text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded">AUTO</span>}
                    </label>
                  ))}
                </div>
              </div>
            );
          })()}

          {status === "payment_pending" && (po.accountStatus || "").toLowerCase() !== "payment_initiated" && (po.accountStatus || "").toLowerCase() !== "physical_check" && (
            <div className="space-y-4">
              {shipment.approvedBy && (
                <div className="rounded-xl border border-blue-200 dark:border-blue-800/50 overflow-hidden shadow-sm">
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/25 border-b border-blue-200 dark:border-blue-800/50">
                    <CreditCard className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider">Approved for Payment</span>
                    {shipment.approvedAt && <span className="ml-auto text-[10px] text-blue-600/70 dark:text-blue-500/60 tabular-nums">{formatDate(shipment.approvedAt)}</span>}
                  </div>
                  <div className="px-3 py-2.5 space-y-1.5 bg-white dark:bg-gray-900/30">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] text-gray-400 shrink-0">Approved by</span>
                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300 text-right">{shipment.approvedBy}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] text-gray-400 shrink-0">Amount</span>
                      <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400">{fmtCur(shipment.invoiceAmount || grnValue)}</span>
                    </div>
                    {shipment.approveRemark && (
                      <div className="pt-1.5 mt-0.5 border-t border-blue-100 dark:border-blue-900/40">
                        <span className="text-[10px] text-gray-400 block mb-0.5">Remark</span>
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 italic">"{shipment.approveRemark}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {showPaymentModal && (
                <div className="rounded-xl border border-orange-200 dark:border-orange-800/50 bg-orange-50/40 dark:bg-orange-900/10 p-4 space-y-3">
                  <p className="text-[11px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-wider">Record Payment · {fmtCur(suggestedAmount)}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 mb-1 block">Payment Date *</label>
                      <DatePicker value={simplePayForm.date} onChange={e => setSimplePayForm(p => ({...p, date: e.target.value}))} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 mb-1 block">Payment Mode *</label>
                      <select value={simplePayForm.mode} onChange={e => setSimplePayForm(p => ({...p, mode: e.target.value}))} className="w-full bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-[#F1F5F9]">
                        <option>NEFT</option><option>RTGS</option><option>UPI</option><option>Cheque</option><option>Cash</option>
                      </select>
                    </div>
                  </div>
                  {(simplePayForm.mode === "NEFT" || simplePayForm.mode === "RTGS" || simplePayForm.mode === "UPI") && (
                    <div>
                      <label className="text-[10px] font-black text-gray-400 mb-1 block">UTR / Transaction ID *</label>
                      <input type="text" value={simplePayForm.utr} onChange={e => setSimplePayForm(p => ({...p, utr: e.target.value}))} className="w-full bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-[#F1F5F9]" placeholder="Transaction ID / UTR" />
                    </div>
                  )}
                  {simplePayForm.mode === "Cheque" && (
                    <div>
                      <label className="text-[10px] font-black text-gray-400 mb-1 block">Cheque No. *</label>
                      <input type="text" value={simplePayForm.ref} onChange={e => setSimplePayForm(p => ({...p, ref: e.target.value}))} className="w-full bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-[#334155] p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-[#F1F5F9]" placeholder="Cheque number" />
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Btn label="Cancel" outline onClick={() => setShowPaymentModal(false)} />
                    <button
                      onClick={() => {
                        if (!simplePayForm.date) { toast.error("Enter payment date."); return; }
                        if ((simplePayForm.mode === "NEFT" || simplePayForm.mode === "RTGS" || simplePayForm.mode === "UPI") && !simplePayForm.utr) { toast.error("Enter UTR / Transaction ID."); return; }
                        if (simplePayForm.mode === "Cheque" && !simplePayForm.ref) { toast.error("Enter cheque number."); return; }
                        onMarkPaid(shipment.grnId, shipment.receiptIdx, { ...simplePayForm, amount: suggestedAmount });
                      }}
                      disabled={isSubmitting}
                      className="bg-[#F97316] hover:bg-[#EA580C] disabled:opacity-50 text-white py-2 px-5 rounded-xl text-[12px] font-black shadow-sm shadow-orange-500/20 transition-all active:scale-[0.98]"
                    >
                      {isSubmitting ? "Processing..." : "Mark Payment Complete ✓"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {(status === "payment_initiated" || (status === "payment_pending" && (po.accountStatus || "").toLowerCase() === "payment_initiated")) && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-3.5 py-3 bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded-xl">
                <Clock className="w-4 h-4 text-orange-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-orange-700 dark:text-orange-400">Payment Initiated · Pending Approval Chain</p>
                  <p className="text-[10px] text-orange-600 dark:text-orange-500 mt-0.5">
                    Voucher Ref: <span className="font-mono font-bold">{po.payment?.ref || paymentForm.ref || "—"}</span> · Amount: <span className="font-bold">{fmtCur(po.payment?.amountPaid || shipment.invoiceAmount || grnValue)}</span> · Mode: {po.payment?.mode || "NEFT"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "paid" && (
            <div className="space-y-3">
              {/* Payment summary row */}
              <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/30">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black text-emerald-700 dark:text-emerald-400 tabular-nums">{fmtCur(shipment.payment?.amount)} paid</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 mt-0.5">
                    {formatDate(shipment.payment?.date)}
                    {shipment.payment?.mode ? ` · ${shipment.payment.mode}` : ""}
                    {shipment.payment?.ref ? ` · ${shipment.payment.ref}` : ""}
                    {shipment.payment?.utr ? ` · UTR: ${shipment.payment.utr}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {shipment.payment?.screenshotUrl && (
                    <a href={shipment.payment.screenshotUrl} target="_blank" rel="noreferrer" className="text-[10px] font-black text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-colors underline underline-offset-2">Receipt</a>
                  )}
                  {hp("EDIT_PAYMENT_ENTRY") && (
                    <>
                      <button
                        onClick={() => { setEditPay({ amountPaid: shipment.payment?.amount || 0, date: shipment.payment?.date || new Date().toISOString().split("T")[0], mode: shipment.payment?.mode || "NEFT", ref: shipment.payment?.ref || "", utr: shipment.payment?.utr || "", chequeNo: shipment.payment?.chequeNo || "", chequeDate: shipment.payment?.chequeDate || "", bank: shipment.payment?.bank || "", remarks: shipment.payment?.remarks || "" }); setShowEditPayForm(v => !v); setShowDeleteConfirm(false); }}
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors" title="Edit payment"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => { setShowDeleteConfirm(v => !v); setShowEditPayForm(false); }}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Delete payment entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Delete confirmation */}
              {showDeleteConfirm && (
                <div className="space-y-3 bg-red-50/60 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
                  <p className="text-[12px] font-bold text-red-700 dark:text-red-400">Delete this payment entry? The shipment will revert to <strong>Payment Pending</strong> status.</p>
                  <div className="flex justify-end gap-2">
                    <Btn label="Cancel" outline onClick={() => setShowDeleteConfirm(false)} />
                    <Btn label="Delete Payment" color="red" loading={isSubmitting} disabled={isSubmitting} onClick={() => { onPaymentDelete(shipment.grnId, shipment.receiptIdx); setShowDeleteConfirm(false); }} />
                  </div>
                </div>
              )}

              {/* Edit payment form */}
              {showEditPayForm && (
                <div className="space-y-3 bg-gray-50/60 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-xl p-4">
                  <p className="text-[11px] font-black text-gray-700 dark:text-gray-300">Edit Payment Entry</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 mb-1 block">Payment Date</label>
                      <DatePicker value={editPay.date} onChange={e => setEditPay(p => ({...p, date: e.target.value}))} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 mb-1 block">Mode</label>
                      <select value={editPay.mode} onChange={e => setEditPay(p => ({...p, mode: e.target.value}))} className="w-full bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-white">
                        <option>NEFT</option><option>RTGS</option><option>Cheque</option><option>Cash</option><option>UPI</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 mb-1 block">Amount Paid (₹)</label>
                      <div className="w-full bg-gray-100 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl text-[12px] font-black text-gray-500 dark:text-gray-400 tabular-nums select-none cursor-not-allowed">
                        {fmtCur(editPay.amountPaid)}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 mb-1 block">Voucher Ref</label>
                      <input type="text" value={editPay.ref} onChange={e => setEditPay(p => ({...p, ref: e.target.value}))} placeholder="PV-26-0045" className="w-full bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-white" />
                    </div>
                  </div>
                  {(editPay.mode === "NEFT" || editPay.mode === "RTGS" || editPay.mode === "UPI") && (
                    <div>
                      <label className="text-[10px] font-black text-gray-400 mb-1 block">UTR / Reference ID</label>
                      <input type="text" value={editPay.utr} onChange={e => setEditPay(p => ({...p, utr: e.target.value}))} placeholder="TRANSACTION ID" className="w-full bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-white" />
                    </div>
                  )}
                  {editPay.mode === "Cheque" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 mb-1 block">Cheque No.</label>
                        <input type="text" value={editPay.chequeNo} onChange={e => setEditPay(p => ({...p, chequeNo: e.target.value}))} className="w-full bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl text-[12px] outline-none font-bold text-gray-900 dark:text-white" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 mb-1 block">Cheque Date</label>
                        <DatePicker value={editPay.chequeDate} onChange={e => setEditPay(p => ({...p, chequeDate: e.target.value}))} />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <Btn label="Cancel" outline onClick={() => setShowEditPayForm(false)} />
                    <Btn label="Save Changes" color="green" loading={isSubmitting} disabled={isSubmitting} onClick={() => {
                      onPaymentEdit(shipment.grnId, shipment.receiptIdx, editPay);
                      setShowEditPayForm(false);
                    }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </Modal>,
        document.body
      )}
      {viewerImages && (
        <ImageViewer
          images={viewerImages.images}
          index={viewerImages.index}
          title={viewerImages.title}
          onClose={() => setViewerImages(null)}
        />
      )}
    </div>
  );
}, "GRNShipmentCard");

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
  onClose,
  onGRNVerify,
  onGRNApprove,
  onGRNPaymentSubmit,
  onGRNMarkPaid,
  onGRNVerifyRevert,
  onGRNPaymentEdit,
  onGRNPaymentDelete,
  onPaymentApprove,
  onPaymentReject,
  onPhysicalCheckPaid,
  onGRNL2Approve,
  onGRNL2Reject,
  onGRNShipmentReject,
  hasPermission: hp,
  tabAllowsVerify = true,
  tabAllowsApprove = true,
  tabAllowsL2Approve = true,
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
        const poItem = po.items?.find(pi =>
          (pi.sku && gi.sku && pi.sku === gi.sku) ||
          (pi.materialName || pi.itemName || pi.name || "").toLowerCase() === (gi.itemName || gi.name || gi.materialName || "").toLowerCase()
        );
        const rcv = gi.received ?? gi.qty ?? 0;
        const rate = gi.rate || poItem?.rate || 0;
        const gstPct = gi.gstPct ?? poItem?.gstPct ?? 0;
        const gstType = gi.gstType || poItem?.gstType || "Exclusive";
        return sum + calcChargeTotal(rcv * rate, gstPct, gstType);
      }, 0)
    : 0;
  // Payable is capped by the value of goods actually received (qty × rate × GST), not
  // the full PO amount — only pay for what's been delivered so far.
  const payableAmount = Math.max(0, grnReceivedValue - totalPaid);
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
    <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
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

      {/* Our company details — full-width row, only when filled in PO */}
      {(po.companyName || po.companyGst || po.companyAddress) && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="bg-blue-50/60 dark:bg-blue-900/10 px-3 py-2 font-black text-[10px] text-blue-600 dark:text-blue-400 flex items-center gap-2 border-b border-blue-100 dark:border-blue-900/20">
            <Building className="w-3 h-3" /> Our Company
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800">
            <div className="grid grid-cols-12 items-center">
              <div className="col-span-4 px-3 py-2.5 text-[11px] font-bold text-gray-400 dark:text-gray-500">Company</div>
              <div className="col-span-8 px-3 py-2.5 text-[13px] font-black text-gray-900 dark:text-white truncate">{po.companyName || "—"}</div>
            </div>
            <div className="grid grid-cols-12 items-center">
              <div className="col-span-4 px-3 py-2.5 text-[11px] font-bold text-gray-400 dark:text-gray-500">Address</div>
              <div className="col-span-8 px-3 py-2.5 text-[11px] font-bold text-gray-600 dark:text-gray-300 leading-snug">{po.companyAddress || "—"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const allPOGRNs = allGrns?.filter(g => g.poId === po.id) || [];
  const poGRNsSorted = [...allPOGRNs].sort((a, b) => new Date(a.createdAt || a.date || 0) - new Date(b.createdAt || b.date || 0));
  const allGRNsLegacy  = poGRNsSorted.length > 0 && poGRNsSorted.every(g => !g.paymentStatus);
  const oldFlowFullyPaid = allGRNsLegacy && po.accountStatus === "paid";
  const usesGRNPaymentFlow = poGRNsSorted.length > 0 && !oldFlowFullyPaid;
  // Multiple root GRN docs each label their own root "Shipment 1 (Initial)" — renumber
  // sequentially across the combined, chronologically-sorted list so labels stay unique.
  const grnShipments = usesGRNPaymentFlow
    ? poGRNsSorted.flatMap(grn => normalizeShipments(grn)).map((sh, i) => ({ ...sh, label: `Shipment ${i + 1}` }))
    : [];

  const computedAccSt = usesGRNPaymentFlow && grnShipments.length > 0
    ? (() => {
        const poAccSt = (po.accountStatus || "").toLowerCase();
        // Explicit PO-level statuses always win — never let stale GRN shipment status override them
        if (["bill_approved", "physical_check", "rejected"].includes(poAccSt)) return poAccSt;
        const statuses = grnShipments.map(s => (s.paymentStatus || "").toLowerCase());
        if (statuses.length > 0 && statuses.every(s => s === "paid")) return "paid";
        if (statuses.some(s => s === "paid")) return "partial_paid";
        if (statuses.some(s => s === "payment_initiated")) return "payment_initiated";
        if (statuses.some(s => s === "payment_pending")) return "payment_pending";
        if (statuses.some(s => s === "bill_verified")) return "bill_verified";
        return poAccSt || "bill_verify";
      })()
    : (po.accountStatus || "").toLowerCase();

  const hasGRN = allPOGRNs.length > 0;
  const hasBill = !!po.verifiedBy || ["bill_verified", "payment_pending", "payment_initiated", "paid", "partial_paid"].includes(computedAccSt) || ["bill_verified", "payment_pending", "paid", "partial_paid"].includes(status);
  const hasPaid = computedAccSt === "paid" || computedAccSt === "partial_paid" || status === "paid" || (status === "partial_paid" && (po.totalPaid || 0) > 0);
  const chainSteps = [
    { label: "MR", sub: po.mrId || po.mrNumber || "—", done: !!(po.mrId || po.mrNumber) },
    { label: "PO", sub: po.id, done: true },
    { label: "GRN", sub: allPOGRNs.length > 0 ? `${allPOGRNs.length} batch${allPOGRNs.length > 1 ? "es" : ""}` : "Pending", done: hasGRN, warn: (po.status || "").toLowerCase() === "grn variance" },
    { label: "Bill", sub: hasBill ? (po.verifiedBy ? `${po.verifiedBy}` : "Verified") : "Pending", done: hasBill },
    { label: "Payment", sub: hasPaid ? fmtCur(po.totalPaid || po.payment?.amountPaid || 0) : "Pending", done: hasPaid },
  ];
  const docChain = (
    <div className="overflow-x-auto">
      <div className="flex items-stretch min-w-[460px] bg-[#FFFFFF] dark:bg-gray-900/70 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm px-3 py-4 gap-0">
        {chainSteps.map((step, i) => (
          <div key={i} className="flex items-center flex-1 min-w-0">
            <div className="flex-1 flex flex-col items-center gap-1.5 px-1 min-w-0">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black shadow-sm ${step.done ? (step.warn ? "bg-amber-500 text-white shadow-amber-500/30" : "bg-emerald-500 text-white shadow-emerald-500/30") : "bg-gray-100 dark:bg-gray-800 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700"}`}>
                {step.done ? (step.warn ? "!" : "✓") : (i + 1)}
              </div>
              <p className={`text-[10px] font-black tracking-wide ${step.done ? (step.warn ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400") : "text-gray-400 dark:text-gray-600"}`}>{step.label}</p>
              <p className={`text-[9px] truncate max-w-[72px] text-center leading-none ${step.done ? (step.warn ? "text-amber-500 font-mono" : "text-emerald-600 dark:text-emerald-500 font-mono") : "text-gray-300 dark:text-gray-700"}`}>{step.sub}</p>
            </div>
            {i < chainSteps.length - 1 && (
              <div className={`h-px w-5 shrink-0 rounded-full mx-0.5 ${step.done ? "bg-emerald-400 dark:bg-emerald-600" : "bg-gray-200 dark:bg-gray-700"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const reconItems = (po.items || []).map(pi => {
    const totalRcv = allPOGRNs.reduce((sum, g) => {
      const gi = g.items?.find(gi =>
        (pi.sku && gi.sku && pi.sku === gi.sku) ||
        (pi.itemName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
      );
      return sum + (gi ? (gi.received ?? gi.qty ?? 0) : 0);
    }, 0);
    const ordered = pi.qty || pi.quantity || 0;
    const remaining = Math.max(0, ordered - totalRcv);
    const rate = pi.rate || 0;
    const rcvdValue = calcChargeTotal(totalRcv * rate, pi.gstPct || 0, pi.gstType || "Exclusive");
    const orderedValue = calcChargeTotal(ordered * rate, pi.gstPct || 0, pi.gstType || "Exclusive");
    return { pi, totalRcv, ordered, remaining, rate, rcvdValue, orderedValue };
  });
  const reconTotalOrdered = reconItems.reduce((s, r) => s + r.orderedValue, 0);
  const reconTotalRcvd   = reconItems.reduce((s, r) => s + r.rcvdValue, 0);
  const reconTotalRemain = Math.max(0, reconTotalOrdered - reconTotalRcvd);
  const reconTable = reconItems.length > 0 ? (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-0.5 w-4 bg-[#F97316]" />
        <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">Item reconciliation</h3>
        {allPOGRNs.length > 0 && <span className="text-[10px] text-gray-400 font-bold">{allPOGRNs.length} shipment{allPOGRNs.length > 1 ? "s" : ""}</span>}
      </div>
      <div className="overflow-x-auto overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
        <table className="w-full text-left border-collapse min-w-[520px]">
          <thead>
            <tr className="bg-gray-50/90 dark:bg-gray-800/90 border-b border-gray-100 dark:border-gray-800">
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 tracking-wider">Material</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 tracking-wider text-center">Ordered</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 tracking-wider text-center">Received</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 tracking-wider text-center">Remaining</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 tracking-wider text-right">Rcvd Value</th>
              <th className="px-4 py-3 text-[10px] font-black text-gray-400 tracking-wider text-center">Match</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {reconItems.map(({ pi, totalRcv, ordered, remaining, rcvdValue }, idx) => {
              const full = ordered > 0 && totalRcv >= ordered;
              const partial = totalRcv > 0 && totalRcv < ordered;
              const unit = pi.unit || "";
              return (
                <tr key={idx} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10">
                  <td className="px-4 py-3">
                    <span className="text-[12px] font-semibold text-gray-900 dark:text-white">{pi.itemName || pi.materialName || pi.name || "Item"}</span>
                    {pi.sku && <p className="text-[10px] text-gray-400">{pi.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-center text-[12px] text-gray-500 tabular-nums">{ordered}{unit && <span className="text-[9px] text-gray-400 ml-0.5">{unit}</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-[13px] font-black tabular-nums ${full ? "text-emerald-600 dark:text-emerald-400" : partial ? "text-amber-600 dark:text-amber-400" : "text-gray-300 dark:text-gray-700"}`}>{totalRcv}{unit && <span className="text-[9px] font-normal text-gray-400 ml-0.5">{unit}</span>}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {remaining > 0 ? (
                      <span className="text-[12px] font-black text-red-500 dark:text-red-400 tabular-nums">{remaining}{unit && <span className="text-[9px] font-normal text-gray-400 ml-0.5">{unit}</span>}</span>
                    ) : (
                      <span className="text-[10px] font-black text-emerald-500">✓ Done</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-[12px] tabular-nums text-gray-900 dark:text-white">{fmtCur(rcvdValue)}</td>
                  <td className="px-4 py-3 text-center">
                    {full ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-500/20">✓ Full</span>
                    ) : partial ? (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-100 dark:border-amber-500/20">~ Part</span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-gray-400 bg-gray-50 dark:bg-gray-800/50 px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">— None</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50">
              <td className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase tracking-wide">Total</td>
              <td className="px-4 py-2.5 text-center text-[10px] font-black text-gray-400 tabular-nums">{fmtCur(reconTotalOrdered)}</td>
              <td className="px-4 py-2.5 text-center text-[12px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtCur(reconTotalRcvd)}</td>
              <td className="px-4 py-2.5 text-center text-[12px] font-black tabular-nums">
                {reconTotalRemain > 0
                  ? <span className="text-red-500 dark:text-red-400">{fmtCur(reconTotalRemain)}</span>
                  : <span className="text-emerald-500">✓ Fully received</span>}
              </td>
              <td colSpan={2} className="px-4 py-2.5 text-right text-[10px] text-gray-400">incl. GST</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  ) : null;

  if (usesGRNPaymentFlow) {
    const allShipments   = grnShipments;
    const paidShipments  = allShipments.filter(s => s.paymentStatus === "paid");
    const totalPaidAmt   = paidShipments.reduce((s, sh) => s + (sh.payment?.amount || 0), 0);

    const shipmentDisplayVal = (sh) => {
      if (sh.invoiceAmount) return sh.invoiceAmount;
      if (sh.paymentStatus === "paid" && sh.payment?.amount) return sh.payment.amount;
      return (sh.items || []).reduce((sum, gi) => {
        const rcv = gi.received ?? gi.qty ?? 0;
        const poItem = (po.items || []).find(pi =>
          (pi.sku && gi.sku && pi.sku === gi.sku) ||
          (pi.itemName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
        );
        const rootItem = (sh.rootItems || []).find(ri =>
          (ri.sku && gi.sku && ri.sku === gi.sku) ||
          (ri.itemName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
        );
        const rate = gi.rate || rootItem?.rate || poItem?.rate || 0;
        const gstPct = gi.gstPct ?? rootItem?.gstPct ?? poItem?.gstPct ?? 0;
        const rawGstType = gi.gstType || rootItem?.gstType || poItem?.gstType || "Exclusive";
        const isInclusive = typeof rawGstType === "string" && rawGstType.toLowerCase().includes("inclus");
        const gstType = isInclusive ? rawGstType : "Exclusive";
        return sum + calcChargeTotal(rcv * rate, gstPct, gstType);
      }, 0);
    };

    const totalRcvdAmt = allShipments.reduce((s, sh) => s + shipmentDisplayVal(sh), 0);
    const yetToPayAmt  = Math.max(0, totalRcvdAmt - totalPaidAmt);

    // Aggregate received qty across all shipments per PO item
    const itemSummary = (po.items || []).map(pi => {
      let totalReceived = 0;
      for (const sh of allShipments) {
        const gi = (sh.items || []).find(item =>
          (pi.sku && item.sku && pi.sku === item.sku) ||
          (pi.itemName || "").toLowerCase() === (item.itemName || "").toLowerCase()
        );
        if (gi) totalReceived += gi.received ?? gi.qty ?? 0;
      }
      const ordered = pi.qty || pi.quantity || 0;
      return { ...pi, totalReceived, remaining: Math.max(0, ordered - totalReceived), value: totalReceived * (pi.rate || 0) };
    });

    const paymentHistory = paidShipments.map(sh => ({
      label: sh.label, grnId: sh.grnId, date: sh.payment?.date,
      amount: sh.payment?.amount, mode: sh.payment?.mode,
      utr: sh.payment?.utr, ref: sh.payment?.ref, invoiceNo: sh.invoiceNo,
    })).sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    const SHIP_STATUS = {
      unpaid:          { label: "To Verify", cls: "text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700/50" },
      bill_verified:   { label: "Verified",  cls: "text-violet-600 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-700/50" },
      payment_pending: { label: "Approved",  cls: "text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700/50" },
      paid:            { label: "Paid ✓",    cls: "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700/50" },
    };

    const vendorSupplier = suppliers?.find(s =>
      s.id === po.supplier || s._id === po.supplier ||
      (s.companyName || "").toLowerCase() === (po.supplier || "").toLowerCase() ||
      (s.name || "").toLowerCase() === (po.supplier || "").toLowerCase()
    );
    const vendorBank = vendorSupplier && (vendorSupplier.accountNumber || vendorSupplier.bankName) ? vendorSupplier : null;

    return (
      <div className="space-y-4 pb-4">
        {/* 0. PO + GRN info grid */}
        {topGrid}

        {/* 0b. Vendor bank details */}
        {vendorBank && (
          <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor Bank Details</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-y divide-gray-100 dark:divide-gray-800">
              <GRNInfoRow label="Account Holder" value={vendorBank.accountHolderName || vendorBank.ownerName || vendorBank.companyName} />
              <GRNInfoRow label="Bank Name" value={vendorBank.bankName} />
              <GRNInfoRow label="Account No." value={vendorBank.accountNumber} mono />
              <GRNInfoRow label="Branch / IFSC" value={[vendorBank.branch, vendorBank.ifscCode].filter(Boolean).join(" · ")} mono />
            </div>
          </div>
        )}



        {/* 4. Payment history */}
        {paymentHistory.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm">
            <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border-b border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
              <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 tracking-wider uppercase">Payment History</p>
              <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-500 text-white rounded-full leading-none ml-1">{paymentHistory.length}</span>
            </div>
            <table className="w-full text-left border-collapse min-w-[480px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900">
                  <th className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Shipment</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center">Date</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Mode · Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80">
                {paymentHistory.map((ph, i) => (
                  <tr key={i} className="hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-[12px] font-black text-gray-900 dark:text-white tracking-tight">{ph.label}</p>
                      {ph.invoiceNo && <p className="text-[9px] text-gray-400 dark:text-gray-600 mt-0.5">Inv: {ph.invoiceNo}</p>}
                    </td>
                    <td className="px-4 py-3 text-center text-[11px] text-gray-500 dark:text-gray-400">{formatDate(ph.date)}</td>
                    <td className="px-4 py-3 text-right font-black text-[14px] text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtCur(ph.amount)}</td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{ph.mode || "—"}</p>
                      {ph.utr && <p className="text-[9px] text-gray-400 dark:text-gray-600 font-mono mt-0.5">UTR: {ph.utr}</p>}
                      {!ph.utr && ph.ref && <p className="text-[9px] text-gray-400 dark:text-gray-600 font-mono mt-0.5">{ph.ref}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/60 dark:bg-emerald-900/15">
                  <td colSpan={2} className="px-4 py-3 text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Total paid</td>
                  <td className="px-4 py-3 text-right text-[14px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">{fmtCur(totalPaidAmt)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* 5. Shipment action cards */}
        <div className="space-y-2.5">
          {allShipments.map((shipment, idx) => (
            <GRNShipmentCard
              key={shipment.key}
              shipment={shipment}
              po={po}
              isSubmitting={isSubmitting}
              onVerify={onGRNVerify}
              onApprove={onGRNApprove}
              onPaymentSubmit={onGRNPaymentSubmit}
              onMarkPaid={onGRNMarkPaid}
              onVerifyRevert={onGRNVerifyRevert}
              onReject={onGRNShipmentReject}
              onPaymentEdit={onGRNPaymentEdit}
              onPaymentDelete={onGRNPaymentDelete}
              onPaymentApprove={onPaymentApprove}
              onPaymentReject={onPaymentReject}
              onPhysicalCheckPaid={onPhysicalCheckPaid}
              onL2Approve={onGRNL2Approve}
              onL2Reject={onGRNL2Reject}
              paymentForm={paymentForm}
              setPaymentForm={setPaymentForm}
              fileInputRef={fileInputRef}
              handleFileChange={handleFileChange}
              hasPermission={hp}
              tabAllowsVerify={tabAllowsVerify}
              tabAllowsApprove={tabAllowsApprove}
              tabAllowsL2Approve={tabAllowsL2Approve}
            />
          ))}
        </div>

        {viewGRNDetail && realGrn && <GRNDetailModal grn={realGrn} onClose={() => setViewGRNDetail(false)} />}
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  if (status === "bill_verify") {
    return <div className="space-y-5 pb-4">
        {topGrid}
        {docChain}
        {totalPaid > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
            <IndianRupee className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">
              {fmtCur(totalPaid)} already paid — remaining payable: <span className="font-black">{fmtCur(payableAmount)}</span>
            </p>
          </div>
        )}
        {reconTable}
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
            {realGrn && <GRNInfoRow label="Received value (incl. GST)" value={fmtCur(grnReceivedValue)} />}
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

        {viewGRNDetail && realGrn && <GRNDetailModal grns={allPOGRNs.length ? allPOGRNs : (realGrn ? [realGrn] : [])} onClose={() => setViewGRNDetail(false)} />}
        {viewerImages && <ImageViewer {...viewerImages} onClose={() => setViewerImages(null)} />}
      </div>;
  }
  if (status === "bill_verified") {
    return <div className="space-y-5 pb-4">
        {topGrid}
        {docChain}
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          <div className="flex-1">
            <p className="text-[12px] font-black text-emerald-700 dark:text-emerald-400">Bill verified — awaiting final approval</p>
            {po.verifiedBy && <p className="text-[11px] text-emerald-600 dark:text-emerald-500 mt-0.5">Verified by {po.verifiedBy}{po.verifiedAt ? ` on ${formatDate(po.verifiedAt)}` : ""}</p>}
            {po.verifyRemark && <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Remark: {po.verifyRemark}</p>}
          </div>
        </div>
        {totalPaid > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl">
            <IndianRupee className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-[12px] font-bold text-amber-700 dark:text-amber-400">
              {fmtCur(totalPaid)} already paid — remaining payable: <span className="font-black">{fmtCur(payableAmount)}</span>
            </p>
          </div>
        )}
        {reconTable}
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
            {realGrn && <GRNInfoRow label="Received value (incl. GST)" value={fmtCur(grnReceivedValue)} />}
            {totalPaid > 0 && <GRNInfoRow label="Already paid" value={fmtCur(totalPaid)} />}
            <GRNInfoRow label={payableLabel} value={fmtCur(payableAmount)} orange />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-emerald-500 rounded-full" /> Verification
            </div>
            <GRNInfoRow label="Verified by" value={po.verifiedBy || "—"} />
            <GRNInfoRow label="Verified on" value={formatDate(po.verifiedAt)} />
            {po.verifyRemark && <GRNInfoRow label="Verify remark" value={po.verifyRemark} />}
          </div>
        </div>
        {viewGRNDetail && realGrn && <GRNDetailModal grns={allPOGRNs.length ? allPOGRNs : (realGrn ? [realGrn] : [])} onClose={() => setViewGRNDetail(false)} />}
        {viewerImages && <ImageViewer {...viewerImages} onClose={() => setViewerImages(null)} />}
      </div>;
  }
  if (status === "payment_pending" || ((status === "paid" || status === "partial_paid") && isEditingPayment)) {
    return <div className="space-y-5 pb-4">
      {topGrid}
      {docChain}

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
          {realGrn && <GRNInfoRow label="Received value (incl. GST)" value={fmtCur(grnReceivedValue)} />}
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
        <div className="space-y-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-[13px] font-black text-gray-900 dark:text-white">Payment Entry & ERP Sync</h3>
                <p className="text-[10px] text-gray-400 dark:text-gray-500">Initiates multi-level approval pipeline (AGM → GM → Director)</p>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20 rounded-lg text-[10px] font-extrabold">
              Initiate Payment
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup label="From Company" hint="Auto-fetched">
              <input type="text" value={paymentForm.fromCompany} onChange={(e) => setPaymentForm({ ...paymentForm, fromCompany: e.target.value })} className="w-full bg-gray-50/70 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all" />
            </FormGroup>
            <FormGroup label="Paying To (Supplier)" hint="Auto-fetched">
              <input type="text" value={paymentForm.toCompany} onChange={(e) => setPaymentForm({ ...paymentForm, toCompany: e.target.value })} className="w-full bg-gray-50/70 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all" />
            </FormGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormGroup label="Payment Date *" hint="ERP Tally Date">
              <DatePicker value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} />
            </FormGroup>
            <FormGroup label="Payment Mode *">
              <select value={paymentForm.mode} onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })} className="w-full bg-gray-50/70 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all">
                <option>NEFT</option><option>RTGS</option><option>Cheque</option><option>Cash</option><option>UPI</option>
              </select>
            </FormGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormGroup label="Voucher Ref *" hint="Tally PV ref">
              <input type="text" value={paymentForm.ref} onChange={(e) => setPaymentForm({ ...paymentForm, ref: e.target.value })} className="w-full bg-gray-50/70 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all" placeholder="e.g. PV-26-0045" />
            </FormGroup>
            <FormGroup label="Amount Paid *" hint={`Shipment: ${fmtCur(payableAmount)}`}>
              <input type="number" value={paymentForm.amountPaid} max={payableAmount} onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: Number(e.target.value) })} className={`w-full bg-gray-50/70 dark:bg-[#0F172A] border p-3 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 dark:text-[#F1F5F9] transition-all ${Number(paymentForm.amountPaid) > payableAmount ? "border-red-400 dark:border-red-500 ring-2 ring-red-500/20" : "border-gray-200 dark:border-gray-800"}`} />
            </FormGroup>
            <FormGroup label="Round Off (+/-)" hint="Adj. (+/-)">
              <input type="number" step="any" value={paymentForm.roundOff || 0} onChange={(e) => setPaymentForm({ ...paymentForm, roundOff: Number(e.target.value) })} className="w-full bg-gray-50/70 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm font-black outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-gray-900 dark:text-[#F1F5F9] transition-all" placeholder="0" />
            </FormGroup>
          </div>

          <FormGroup label="Debit Bank Account *" hint="Your company account">
            <select value={paymentForm.bank} onChange={(e) => setPaymentForm({ ...paymentForm, bank: e.target.value })} className="w-full bg-gray-50/70 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all">
              <option value="">-- Select Your Bank --</option>
              <option>SBI Main Corporate A/C</option>
              <option>HDFC Business OD A/C</option>
              <option>ICICI Project Fund</option>
            </select>
          </FormGroup>

          {(paymentForm.mode === "NEFT" || paymentForm.mode === "RTGS" || paymentForm.mode === "UPI") && (
            <FormGroup label="UTR / Reference ID *" hint="Transaction ID">
              <input type="text" value={paymentForm.utr} onChange={(e) => setPaymentForm({ ...paymentForm, utr: e.target.value })} className="w-full bg-gray-50/70 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all" placeholder="ENTER TRANSACTION ID" />
            </FormGroup>
          )}

          {paymentForm.mode === "Cheque" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormGroup label="Cheque No. *">
                <input type="text" value={paymentForm.chequeNo} onChange={(e) => setPaymentForm({ ...paymentForm, chequeNo: e.target.value })} className="w-full bg-gray-50/70 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 font-bold text-gray-900 dark:text-[#F1F5F9] transition-all" />
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
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all font-medium group ${isDraggingPayment ? "border-orange-400 bg-orange-50 dark:bg-orange-900/20 scale-[1.01]" : "border-gray-200 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-[#0F172A]/50"}`}
            >
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept="image/*,.pdf" />
              {isDraggingPayment ? (
                <><div className="p-4 bg-orange-100 dark:bg-orange-900/20 text-orange-500 rounded-full"><Upload className="w-8 h-8" /></div><p className="text-[11px] font-black text-orange-500">Drop file here</p></>
              ) : paymentForm.previewUrl ? (
                <div className="relative group">
                  <img src={paymentForm.previewUrl} className="h-24 rounded-xl shadow-lg border border-white dark:border-gray-800" alt="Preview" />
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Upload className="text-white w-6 h-6 animate-bounce" /></div>
                  <p className="text-[10px] font-black text-center mt-2 text-gray-500 dark:text-gray-400 truncate w-40">{paymentForm.screenshot?.name}</p>
                </div>
              ) : (
                <><div className="p-4 bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-full group-hover:scale-110 transition-transform"><Upload className="w-8 h-8" /></div><div className="text-center"><p className="text-[11px] font-black text-orange-500 mb-1">Click or drag &amp; drop</p><p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 italic">Tally Snapshot or Bank Receipt</p></div></>
              )}
            </div>
          </FormGroup>

          <FormGroup label="Remarks (Optional)">
            <textarea rows={2} value={paymentForm.remarks} onChange={(e) => setPaymentForm({ ...paymentForm, remarks: e.target.value })} className="w-full bg-gray-50/70 dark:bg-[#0F172A] border border-gray-200 dark:border-gray-800 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none font-bold text-gray-900 dark:text-[#F1F5F9]" placeholder="Reference notes, discount details..." />
          </FormGroup>
        </div>
      )}
      {viewGRNDetail && realGrn && <GRNDetailModal grns={allPOGRNs.length ? allPOGRNs : (realGrn ? [realGrn] : [])} onClose={() => setViewGRNDetail(false)} />}
    </div>;
  }
  if (status === "partial_paid" && !isEditingPayment) {
    const paidSoFar = po.totalPaid || po.payment?.amountPaid || 0;
    const totalVal = po.totalValue || 0;
    const remaining = Math.max(0, totalVal - paidSoFar);
    const installments = po.paymentHistory?.length > 0 ? po.paymentHistory : null;
    return <div className="space-y-5 pb-4">
      {topGrid}
      {docChain}
      {reconTable}

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
      {viewGRNDetail && realGrn && <GRNDetailModal grns={allPOGRNs.length ? allPOGRNs : (realGrn ? [realGrn] : [])} onClose={() => setViewGRNDetail(false)} />}
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
      {docChain}

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
                          (pi.itemName || "").toLowerCase() === (gi.itemName || "").toLowerCase()
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
      {viewGRNDetail && realGrn && <GRNDetailModal grns={allPOGRNs.length ? allPOGRNs : (realGrn ? [realGrn] : [])} onClose={() => setViewGRNDetail(false)} />}
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
      {viewGRNDetail && realGrn && <GRNDetailModal grns={allPOGRNs.length ? allPOGRNs : (realGrn ? [realGrn] : [])} onClose={() => setViewGRNDetail(false)} />}
    </div>;
  }
  const approvalLevels = [
    { label: "L1", status: po.approvalL1, at: po.approvalL1At },
    { label: "L2", status: po.approvalL2, at: po.approvalL2At },
    { label: "L3", status: po.approvalL3, at: po.approvalL3At },
  ].filter(l => l.status && l.status !== "N/A");

  return <div className="space-y-6">
      {topGrid}

      {approvalLevels.length > 0 && (
        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-orange-500 rounded-full" /> PO Approval Trail
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
            {approvalLevels.map((lvl) => (
              <div key={lvl.label} className="p-3.5 flex items-center justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide">{lvl.label} Approval</p>
                  {lvl.at && <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDate(lvl.at)}</p>}
                </div>
                <StatusBadge status={lvl.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {(po.items || []).length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="px-4 py-2.5 bg-gray-100/80 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 tracking-wider uppercase">PO Items</p>
          </div>
          <table className="w-full text-left border-collapse min-w-[500px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">Material</th>
                <th className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-center">Qty</th>
                <th className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Rate</th>
                <th className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">GST</th>
                <th className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/80">
              {po.items.map((it, i) => (
                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-[12px] font-semibold text-gray-900 dark:text-white">{it.itemName || it.materialName || "Item"}</span>
                    {it.sku && <p className="text-[9px] text-gray-400 dark:text-gray-600 font-mono mt-0.5">{it.sku}</p>}
                  </td>
                  <td className="px-4 py-3 text-center text-[12px] font-bold text-gray-900 dark:text-white tabular-nums">{it.qty ?? "—"} {it.unit || ""}</td>
                  <td className="px-4 py-3 text-right text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">{fmtCur(it.rate || 0)}</td>
                  <td className="px-4 py-3 text-right text-[11px] text-blue-500 tabular-nums">{it.gstPct ? `${it.gstPct}%` : "—"}</td>
                  <td className="px-4 py-3 text-right text-[13px] font-black text-gray-900 dark:text-white tabular-nums">{fmtCur(it.totalWithGST || it.total || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {po.justification && (
        <div className="border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
            <div className="w-1.5 h-3.5 bg-orange-500 rounded-full" /> Justification
          </div>
          <p className="p-4 text-[12px] font-medium text-gray-700 dark:text-gray-300 leading-relaxed bg-white dark:bg-gray-900">{po.justification}</p>
        </div>
      )}

      <div className="py-8 text-center space-y-4">
        <div className="w-16 h-16 bg-gray-50 dark:bg-[#1E293B] rounded-[1.5rem] flex items-center justify-center mx-auto border border-gray-100 dark:border-[#334155] shadow-inner">
          <Clock className="w-8 h-8 text-gray-300 dark:text-gray-700" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-black text-gray-900 dark:text-[#F1F5F9]">Not yet in the Accounts workflow</h2>
          <p className="text-gray-400 dark:text-[#64748B] font-bold text-sm">This PO hasn't reached the bill-verification stage yet (current PO status: {poStatus || "unknown"}).</p>
        </div>
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
