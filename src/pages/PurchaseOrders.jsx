var __defProp = Object.defineProperty;

var __name = (target, value) =>
  __defProp(target, "name", { value, configurable: true });

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";

import { useAppStore } from "../store";

import {
  PageHeader,
  Card,
  StatusBadge,
  Btn,
  Modal,
  SField,
  Skeleton,
  ConfirmModal,
  Field,
  Tr,
  Td,
} from "../components/ui";

import {
  Plus,
  Search,
  AlertTriangle,
  X,
  FileText,
  Eye,
  Pencil,
  Trash2,
  Link2,
  RefreshCw,
  Download,
  TrendingUp,
  BarChart2,
  ChevronUp,
  Ban,
} from "lucide-react";

import {
  SearchFilter,
  DateRangePicker,
  SelectFilter,
  FilterRow,
} from "../components/ui/Filters";

import {
  fmtCur,
  genId,
  todayStr,
  scrollToError,
  formatDateTime,
  formatAccountNo,
  safeStr,
  calculatePriceComparison,
  isNewItem,
} from "../utils";

import { generatePOPDF, generatePOPDFBlob } from "../utils/pdfGenerator";

import { cn } from "../lib/utils";

import { api } from "../services/api";

import toast from "react-hot-toast";

import { DatePicker } from "../components/ui/DatePicker";

import { TableVirtuoso } from "react-virtuoso";

import { POMonthlyReport } from "./po/POMonthlyReport";

import { POFormModal } from "./po/POFormModal";

import { POViewModal } from "./po/POViewModal";

const PurchaseOrders = /* @__PURE__ */ __name(() => {
  const {
    pos,
    posPagination,
    fetchResource,
    addPO,
    updatePO,
    deletePO,
    role,
    inventory,
    grns,
    suppliers,
    settings,
    loading,
    actionLoading,
    materialRequirements,
    quotations,
    hasPermission,
  } = useAppStore();

  const COMPANIES = settings.companies || [];

  const { projects: PROJECTS, categories: CATEGORIES, units: UNITS } = settings;

  const [search, setSearch] = useState("");

  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [startDate, setStartDate] = useState("");

  const [endDate, setEndDate] = useState("");

  const [filterProject, setFilterProject] = useState("");

  const [filterSupplier, setFilterSupplier] = useState("");

  const [filterStatus, setFilterStatus] = useState("");

  const [occupiedMRs, setOccupiedMRs] = useState(null);

  const supplierOptions = React.useMemo(() => {
    const optionsMap = /* @__PURE__ */ new Map();
    suppliers.forEach((s) => {
      const label = s.companyName || s.name || s.id;
      if (label) optionsMap.set(s.id, label);
    });
    pos.forEach((po) => {
      if (po.supplier && !optionsMap.has(po.supplier)) {
        optionsMap.set(po.supplier, po.supplier);
      }
    });

    return Array.from(optionsMap.entries())
      .map(([value, label]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [suppliers, pos]);

  const statusOptions = React.useMemo(
    () => [
      { label: "Pending L1", value: "Pending L1" },
      { label: "Pending L2", value: "Pending L2" },
      { label: "Pending L3", value: "Pending L3" },
      { label: "Approved", value: "Approved" },
      { label: "GRN Pending", value: "GRN Pending" },
      { label: "GRN Fulfilled", value: "GRN Fulfilled" },
      { label: "Ready for Payment", value: "Ready for Payment" },
      { label: "paid", value: "paid" },
      { label: "rejected", value: "rejected" },
    ],
    [],
  );
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);

    return () => clearTimeout(timer);
  }, [search]);

  const [modal, setModal] = useState(false);

  const [viewModal, setViewModal] = useState(false);

  const [selectedPO, setSelectedPO] = useState(null);

  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [closePOConfirm, setClosePOConfirm] = useState(null);

  const [isEditing, setIsEditing] = useState(false);

  const [processingId, setProcessingId] = useState(null);

  const [loadingQuotes, setLoadingQuotes] = useState(false);

  const [errors, setErrors] = useState({});

  const [cancelModal, setCancelModal] = useState(false);

  const [cancelNoteText, setCancelNoteText] = useState("");

  const [cancelTargetId, setCancelTargetId] = useState(null);
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToError();
    }
  }, [errors]);

  const canEdit = ["Super Admin", "Director", "Project Manager"].includes(
    role || "",
  );

  const isPOLocked = /* @__PURE__ */ __name((po) => {
    const hasPayment =
      (po.payment?.amountPaid || 0) > 0 ||
      po.accountStatus === "paid" ||
      (po.paymentTimelines &&
        po.paymentTimelines.some(
          (t) => t.status === "Paid" || t.paidAmount > 0,
        ));

    return !!hasPayment;
  }, "isPOLocked");

  const validateForm = /* @__PURE__ */ __name((data) => {
    const newErrors = {};
    if (!data.project) newErrors.project = "Project is required";
    if (!data.supplier) newErrors.supplier = "Supplier is required";
    if (!data.items || (data.items?.length || 0) === 0) {
      newErrors.items = "At least one item is required";
    } else if (data.items.some((i) => i.sku === "N/A")) {
      newErrors.items =
        "Please link all items to inventory (SKU cannot be N/A)";
    }
    const hasReusable2 = data.items?.some((i) => {
      const inv = inventory.find((inv2) => inv2.sku === i.sku);

      return (
        inv &&
        ["Good", "Needs Repair"].includes(inv.condition) &&
        inv.liveStock > 0
      );
    });
    if (hasReusable2 && !data.justification) {
      newErrors.justification =
        "Justification is required for ordering items with reusable stock available";
    }
    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }, "validateForm");

  const [page, setPage] = useState(1);

  const observerRef = useRef(null);

  const [showMonthly, setShowMonthly] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    startDate,
    endDate,
    filterProject,
    filterSupplier,
    filterStatus,
  ]);
  useEffect(() => {
    const isInitialLoad = (pos?.length || 0) === 0;

    const filterObj = {};
    if (filterProject) filterObj.project = filterProject;
    if (filterSupplier) filterObj.supplier = filterSupplier;
    if (filterStatus) filterObj.status = filterStatus;

    const finalFilter = Object.keys(filterObj).length > 0 ? filterObj : null;
    fetchResource(
      "pos",
      page,
      50,
      !isInitialLoad || page > 1,
      debouncedSearch,
      finalFilter,
      page > 1,
      false,
      startDate,
      endDate,
    );
    fetchResource("suppliers", 1, 1e3, true);
    fetchResource("inventory", 1, 1e3, true);
    fetchResource("catalogue", 1, 1e3, true);
    fetchResource(
      "material-requirements",
      1,
      100,
      true,
      "",
      null,
      false,
      false,
    );
    fetchResource("quotations", 1, 1e3, true);
    api
      .get("pos/occupied-mrs")
      .then((res) => setOccupiedMRs(res.data || []))
      .catch(() => setOccupiedMRs([]));
  }, [
    fetchResource,
    page,
    debouncedSearch,
    startDate,
    endDate,
    filterProject,
    filterSupplier,
    filterStatus,
  ]);

  const loadMore = useCallback(() => {
    if (posPagination && page < posPagination.pages && !loading) {
      setPage((prev) => prev + 1);
    }
  }, [posPagination, page, loading]);

  const handlePageChange = useCallback(
    (page2) => {
      fetchResource("pos", page2);
    },
    [fetchResource],
  );

  const filteredPos = useMemo(() => {
    if (!debouncedSearch.trim()) return pos || [];
    const q = debouncedSearch.toLowerCase().trim();
    return (pos || []).filter(po => {
      // PO number
      if ((po.id || "").toLowerCase().includes(q)) return true;
      // MR number
      if ((po.mrId || "").toLowerCase().includes(q)) return true;
      // Project
      if ((po.project || "").toLowerCase().includes(q)) return true;
      // Status
      if ((po.status || "").toLowerCase().includes(q)) return true;
      // Supplier ID / name
      if ((po.supplier || "").toLowerCase().includes(q)) return true;
      const sup = suppliers.find(s =>
        s.id === po.supplier || s._id === po.supplier ||
        (s.companyName || "").toLowerCase() === (po.supplier || "").toLowerCase()
      );
      if (sup && (sup.companyName || sup.name || "").toLowerCase().includes(q)) return true;
      // Item names inside the PO
      if ((po.items || []).some(item => (item.itemName || item.name || "").toLowerCase().includes(q))) return true;
      return false;
    });
  }, [pos, suppliers, debouncedSearch]);

  const initialPO = {
    mrId: "",
    project: "",
    workType: "",
    supplier: "",
    items: [],
    justification: "",
    priority: "Normal",
    requirementBy: "NA",
    location: "NA",
    date: /* @__PURE__ */ new Date().toISOString(),
    remark: "",
    companyName: COMPANIES[0]?.name || "GLR Real Estate Private Limited",
    companyGst: COMPANIES[0]?.gstin || "23AACCG4572A1Z5",
    companyAddress:
      COMPANIES[0]?.address ||
      "D-2, Silver Estate, University Road, Gwalior 474002",
    vendorContact: "NA",
    vendorEmail: "NA",
    vendorAddress: "NA",
    panNo: "NA",
    gstNo: "NA",
    vendorBankDetails: {
      accountHolder: "NA",
      bankName: "NA",
      accountNo: "NA",
      branchIFSC: "NA",
    },
    deliveryDetails: {
      location: "Garden city",
      contactPerson: "Nitin mittal",
      deliveryDate: todayStr(),
    },
    priceComparison: {
      vendors: [
        { name: "", gstType: "Exclusive" },
        { name: "", gstType: "Exclusive" },
        { name: "", gstType: "Exclusive" },
      ],
      items: [],
      remarks: "",
    },
    freightAmount: 0,
    freightGstPct: 0,
    freightGstType: "Exclusive",
    loadingAmount: 0,
    loadingGstPct: 0,
    loadingGstType: "Exclusive",
    unloadingAmount: 0,
    unloadingGstPct: 0,
    unloadingGstType: "Exclusive",
    paymentTimelines: [
      {
        date: todayStr(),
        type: "Advance",
        mode: "Bank Transfer",
        amount: 0,
        gstPct: 18,
        gstType: "Inclusive",
        ifPayable: 0,
      },
      {
        date: todayStr(),
        type: "On Delivery",
        mode: "Bank Transfer",
        amount: 0,
        gstPct: 0,
        gstType: "Inclusive",
        ifPayable: 0,
      },
      {
        date: (() => {
          const d = new Date(todayStr());
          d.setDate(d.getDate() + 10);

          return d.toISOString().split("T")[0];
        })(),
        type: "After 10 Days of Delivery",
        mode: "Bank Transfer",
        amount: 0,
        gstPct: 18,
        gstType: "Inclusive",
        ifPayable: 0,
      },
    ],
  };

  const formatPrettyDate = /* @__PURE__ */ __name((dateString) => {
    if (!dateString) return "";
    try {
      return new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(dateString));
    } catch (e) {
      return dateString;
    }
  }, "formatPrettyDate");

  const [newPO, setNewPO] = useState(initialPO);
  useEffect(() => {
    if (!modal || isEditing) return;

    let totalBase = 0;

    let itemsTotalWithGST = 0;
    newPO.items?.forEach((item) => {
      totalBase += item.qty * item.rate || 0;
      itemsTotalWithGST += item.totalWithGST || 0;
    });

    const freightTotal = calcChargeTotal(
      newPO.freightAmount || 0,
      newPO.freightGstPct || 0,
      newPO.freightGstType || "Exclusive",
    );

    const loadingTotal = calcChargeTotal(
      newPO.loadingAmount || 0,
      newPO.loadingGstPct || 0,
      newPO.loadingGstType || "Exclusive",
    );

    const unloadingTotal = calcChargeTotal(
      newPO.unloadingAmount || 0,
      newPO.unloadingGstPct || 0,
      newPO.unloadingGstType || "Exclusive",
    );

    const chargesTotal = freightTotal + loadingTotal + unloadingTotal;

    const grandTotal = itemsTotalWithGST + chargesTotal;

    const grandBase = totalBase + chargesTotal;

    const isDefault = newPO.paymentTimelines?.every(
      (pt) => pt.amount === 0 && pt.ifPayable === 0,
    );
    if (grandTotal > 0 && isDefault) {
      const pts = [...(newPO.paymentTimelines || [])];
      if (pts.length >= 3) {
        pts[0].amount = 0;
        pts[0].ifPayable = 0;
        pts[1].amount = 0;
        pts[1].ifPayable = 0;
        pts[2].amount = Math.round(grandBase * 100) / 100;
        pts[2].ifPayable = Math.round(grandTotal * 100) / 100;

        const firstItem = newPO.items[0];
        if (firstItem?.gstPct != null) {
          const gstType = firstItem.gstType || "Exclusive";

          const gstPct = Number(firstItem.gstPct);
          pts[0] = { ...pts[0], gstPct, gstType };
          pts[1] = { ...pts[1], gstPct, gstType };
          pts[2] = { ...pts[2], gstPct, gstType };
        }
        setNewPO((prev) => ({
          ...prev,
          paymentTimelines: pts,
          totalAmount: grandTotal,
        }));
      }
    }
  }, [
    newPO.items,
    newPO.freightAmount,
    newPO.freightGstPct,
    newPO.freightGstType,
    newPO.loadingAmount,
    newPO.loadingGstPct,
    newPO.loadingGstType,
    newPO.unloadingAmount,
    newPO.unloadingGstPct,
    newPO.unloadingGstType,
    modal,
    isEditing,
  ]);
  useEffect(() => {
    if (!modal) return;
    if (newPO.supplier && suppliers.length > 0) {
      const needsVendorFilling =
        !newPO.gstNo ||
        newPO.gstNo === "NA" ||
        !newPO.vendorAddress ||
        newPO.vendorAddress === "NA" ||
        !newPO.vendorContact ||
        newPO.vendorContact === "NA";
      if (needsVendorFilling) {
        const s = suppliers.find(
          (su) =>
            su.id === newPO.supplier ||
            su._id === newPO.supplier ||
            (su.companyName || su.name || "").toLowerCase() ===
              (newPO.supplier || "").toLowerCase(),
        );
        if (s) {
          setNewPO((prev) => ({
            ...prev,
            panNo:
              !prev.panNo || prev.panNo === "NA"
                ? s.panNumber || "NA"
                : prev.panNo,
            gstNo:
              !prev.gstNo || prev.gstNo === "NA"
                ? s.gstNumber || s.gst || "NA"
                : prev.gstNo,
            vendorContact:
              !prev.vendorContact || prev.vendorContact === "NA"
                ? s.mobile || "NA"
                : prev.vendorContact,
            vendorEmail:
              !prev.vendorEmail || prev.vendorEmail === "NA"
                ? s.email || "NA"
                : prev.vendorEmail,
            vendorAddress:
              !prev.vendorAddress || prev.vendorAddress === "NA"
                ? s.address || "NA"
                : prev.vendorAddress,
            vendorBankDetails: {
              accountHolder:
                !prev.vendorBankDetails?.accountHolder ||
                prev.vendorBankDetails?.accountHolder === "NA"
                  ? s.accountHolderName || s.ownerName || "NA"
                  : prev.vendorBankDetails.accountHolder,
              bankName:
                !prev.vendorBankDetails?.bankName ||
                prev.vendorBankDetails?.bankName === "NA"
                  ? s.bankName || "NA"
                  : prev.vendorBankDetails.bankName,
              accountNo:
                !prev.vendorBankDetails?.accountNo ||
                prev.vendorBankDetails?.accountNo === "NA"
                  ? formatAccountNo(s.accountNumber || s.accountNo) || "NA"
                  : prev.vendorBankDetails.accountNo,
              branchIFSC:
                !prev.vendorBankDetails?.branchIFSC ||
                prev.vendorBankDetails?.branchIFSC === "NA"
                  ? `${s.branch || ""}, ${s.ifscCode || ""}`
                      .trim()
                      .replace(/^,/, "")
                      .replace(/,$/, "")
                      .trim() || "NA"
                  : prev.vendorBankDetails.branchIFSC,
            },
          }));
        }
      }
    }
    if (
      !newPO.companyName ||
      newPO.companyName === "" ||
      newPO.companyName === "Select..."
    ) {
      const defaultCompany =
        COMPANIES && COMPANIES.length > 0
          ? COMPANIES[COMPANIES.length - 1]
          : null;
      if (defaultCompany) {
        setNewPO((prev) => ({
          ...prev,
          companyName: defaultCompany.name,
          companyGst: defaultCompany.gstin,
          companyAddress: defaultCompany.address,
        }));
      }
    } else {
      const needsCompanyFilling =
        !newPO.companyGst ||
        newPO.companyGst === "" ||
        !newPO.companyAddress ||
        newPO.companyAddress === "";
      if (needsCompanyFilling) {
        const company = COMPANIES?.find((c) => c.name === newPO.companyName);
        if (company) {
          setNewPO((prev) => ({
            ...prev,
            companyGst: prev.companyGst || company.gstin,
            companyAddress: prev.companyAddress || company.address,
          }));
        }
      }
    }
  }, [modal, newPO.supplier, suppliers, newPO.companyName]);

  const [autoLinking, setAutoLinking] = useState(false);

  const findBestItemMatch = /* @__PURE__ */ __name((items, searchName) => {
    if (!searchName || !items || !items.length) return null;

    const target = searchName.toLowerCase().trim();

    let match = items.find(
      (i) =>
        (i.materialName || i.itemName || "").toLowerCase().trim() === target,
    );
    if (match) return match;
    match = items.find((i) => {
      const name = (i.materialName || i.itemName || "").toLowerCase().trim();
      if (!name) return false;

      return name.includes(target) || target.includes(name);
    });

    return match || null;
  }, "findBestItemMatch");

  const handleMrChange = /* @__PURE__ */ __name(async (rawValue) => {
    if (!rawValue) {
      setNewPO({
        ...newPO,
        mrId: "",
        supplier: "",
        project: "",
        location: "",
        requirementBy: "",
        items: [],
        panNo: "NA",
        gstNo: "NA",
        vendorContact: "NA",
        vendorEmail: "NA",
        vendorAddress: "NA",
        vendorBankDetails: {
          accountHolder: "NA",
          bankName: "NA",
          accountNo: "NA",
          branchIFSC: "NA",
        },
        priceComparison: { vendors: [], items: [], remarks: "" },
      });
      return;
    }
    const [mrId, selectedCategory, approvedQuoteId] = rawValue.split("|");

    const mr = materialRequirements.find((m) => m.id === mrId);
    if (!mr) {
      setNewPO({ ...newPO, mrId: rawValue });
      return;
    }
    if (!mr.items || mr.items.length === 0) {
      toast.error("This MR has no items");
      setNewPO({ ...newPO, mrId: rawValue });
      return;
    }
    setAutoLinking(true);
    toast.loading(`Loading ${selectedCategory || ""} items...`, {
      id: "linking",
    });
    try {
      const qRes = await api.get("quotations", {
        filter: JSON.stringify({ mrId }),
        limit: 100,
      });

      let mrQuotations =
        qRes.success && Array.isArray(qRes.data) ? qRes.data : [];

      const storeQuotes = quotations.filter((q) => q.mrId === mrId);

      const allQuotes = [...mrQuotations];
      storeQuotes.forEach((sq) => {
        if (!allQuotes.find((aq) => aq.id === sq.id)) allQuotes.push(sq);
      });

      const categoryQuotes = allQuotes.filter(
        (q) =>
          !selectedCategory ||
          selectedCategory === "General" ||
          q.category === selectedCategory,
      );

      const approvedQuotation =
        categoryQuotes.find(
          (q) => q.id === approvedQuoteId || q._id === approvedQuoteId,
        ) || categoryQuotes[0];

      const displayQuotations =
        categoryQuotes.length > 0
          ? categoryQuotes
          : approvedQuotation
            ? [approvedQuotation]
            : [{ supplierName: "Vendor 1", items: [] }];

      const approvedItems = (approvedQuotation?.items || []).filter(
        (i) => i.approved,
      );

      const itemsToUse =
        approvedItems.length > 0
          ? approvedItems
          : approvedQuotation?.items || [];

      const pItems = await Promise.all(
        itemsToUse.map(async (qItem) => {
          const searchName = (qItem.materialName || "").trim();

          const gstPct = qItem?.gstPct || 18;

          const gstType = qItem?.gstType || "Exclusive";

          let invItem = inventory.find(
            (i) =>
              (i.itemName || "").trim().toLowerCase() ===
              searchName.toLowerCase(),
          );
          if (!invItem)
            invItem = inventory.find((i) =>
              (i.itemName || "")
                .toLowerCase()
                .includes(searchName.toLowerCase()),
            );
          if (!invItem) {
            try {
              const r = await api.get("inventory", {
                search: qItem.materialName,
                limit: 5,
              });
              if (r.data?.length) invItem = r.data[0];
            } catch {}
          }
          const rawTotal = (qItem.qty || 0) * qItem.rate;

          const totalWithGST =
            gstType === "Inclusive" ? rawTotal : rawTotal * (1 + gstPct / 100);

          const total =
            gstType === "Inclusive"
              ? totalWithGST / (1 + gstPct / 100)
              : rawTotal;

          const mrItem = mr.items.find(
            (mi) => mi.materialName === qItem.materialName,
          );

          return {
            sku: invItem?.sku || "N/A",
            itemName: invItem?.itemName || qItem.materialName || "",
            qty: qItem.qty,
            unit: qItem.unit || invItem?.unit || mrItem?.unit || "Nos",
            rate: qItem.rate,
            gstPct,
            gstType,
            total,
            totalWithGST,
            currentStock: invItem?.liveStock || 0,
            category: invItem?.category || qItem.category || "General",
            requirementQty: mrItem?.qty || qItem.qty,
            condition: "New",
          };
        }),
      );

      const priceItems = itemsToUse
        .map((qItem) => {
          const mName = (qItem.materialName || "").trim();

          return {
            materialName: qItem.materialName,
            unit: qItem.unit || "",
            qty: qItem.qty || 1,
            rates: displayQuotations.map(
              (q) => findBestItemMatch(q.items || [], mName)?.rate || 0,
            ),
            gstPcts: displayQuotations.map(
              (q) => findBestItemMatch(q.items || [], mName)?.gstPct || 0,
            ),
          };
        })
        .filter((it) => it.rates.some((r) => r > 0));

      const linkedSupplierId =
        approvedQuotation?.supplierId || mr.approvedSupplier;

      const linkedSupplier = suppliers.find(
        (s) =>
          s.id === linkedSupplierId ||
          s._id === linkedSupplierId ||
          (s.companyName || s.name || "").toLowerCase() ===
            (approvedQuotation?.supplierName || "").toLowerCase(),
      );

      const poDate = todayStr();

      const rawDelivery = approvedQuotation?.deliveryDate;

      const deliveryDate = rawDelivery ? rawDelivery.split("T")[0] : poDate;

      const d10 = new Date(deliveryDate);
      d10.setDate(d10.getDate() + 10);

      const existing = newPO.paymentTimelines || [];
      setNewPO({
        ...newPO,
        mrId: rawValue,
        quotationId: approvedQuoteId || "",
        supplier:
          linkedSupplier?.id || linkedSupplier?._id || linkedSupplierId || "",
        project: mr?.project || "",
        location: mr?.location || "",
        workType: selectedCategory || mr?.workType || "",
        requirementBy: mr?.requesterName || "",
        items: pItems,
        panNo: linkedSupplier?.panNumber || "NA",
        gstNo: linkedSupplier?.gstNumber || "NA",
        vendorContact: linkedSupplier?.mobile || "NA",
        vendorEmail: linkedSupplier?.email || "NA",
        vendorAddress: linkedSupplier?.address || "NA",
        vendorBankDetails: linkedSupplier
          ? {
              accountHolder: linkedSupplier.accountHolderName || "NA",
              bankName: linkedSupplier.bankName || "NA",
              accountNo: formatAccountNo(linkedSupplier.accountNumber) || "NA",
              branchIFSC:
                `${linkedSupplier.branch || ""}, ${linkedSupplier.ifscCode || ""}`
                  .trim()
                  .replace(/^,/, "")
                  .replace(/,$/, "")
                  .trim() || "NA",
            }
          : {
              accountHolder: "NA",
              bankName: "NA",
              accountNo: "NA",
              branchIFSC: "NA",
            },
        deliveryDetails: rawDelivery
          ? { ...newPO.deliveryDetails, deliveryDate }
          : newPO.deliveryDetails,
        priceComparison: {
          vendors: displayQuotations.map((q) => ({
            name: q.supplierName || "Vendor",
            gstType: q.items?.[0]?.gstType || "Exclusive",
            gstPct: q.items?.[0]?.gstPct || 0,
          })),
          items: priceItems,
          remarks: "",
        },
        freightAmount: approvedQuotation?.freightAmount || 0,
        freightGstPct: approvedQuotation?.freightGstPct ?? 18,
        freightGstType: approvedQuotation?.freightGstType || "Exclusive",
        loadingAmount: approvedQuotation?.loadingAmount || 0,
        loadingGstPct: approvedQuotation?.loadingGstPct ?? 18,
        loadingGstType: approvedQuotation?.loadingGstType || "Exclusive",
        unloadingAmount: approvedQuotation?.unloadingAmount || 0,
        unloadingGstPct: approvedQuotation?.unloadingGstPct ?? 18,
        unloadingGstType: approvedQuotation?.unloadingGstType || "Exclusive",
        paymentTimelines: [
          {
            date: poDate,
            type: "Advance",
            mode: existing[0]?.mode || "Bank Transfer",
            amount: existing[0]?.amount || 0,
            gstPct: existing[0]?.gstPct ?? 18,
            gstType: existing[0]?.gstType || "Inclusive",
            ifPayable: existing[0]?.ifPayable || 0,
          },
          {
            date: deliveryDate,
            type: "On Delivery",
            mode: existing[1]?.mode || "Bank Transfer",
            amount: existing[1]?.amount || 0,
            gstPct: existing[1]?.gstPct ?? 0,
            gstType: existing[1]?.gstType || "Inclusive",
            ifPayable: existing[1]?.ifPayable || 0,
          },
          {
            date: d10.toISOString().split("T")[0],
            type: "After 10 Days of Delivery",
            mode: existing[2]?.mode || "Bank Transfer",
            amount: existing[2]?.amount || 0,
            gstPct: existing[2]?.gstPct ?? 18,
            gstType: existing[2]?.gstType || "Inclusive",
            ifPayable: existing[2]?.ifPayable || 0,
          },
        ],
      });
      toast.success(`Items loaded`, { id: "linking" });
    } catch (error) {
      toast.error("Failed to load items", { id: "linking" });
    } finally {
      setAutoLinking(false);
    }
  }, "handleMrChange");

  const poStats = React.useMemo(() => {
    const total = pos.length;

    const pending = pos.filter((p) => !p.isApproved).length;

    const approved = pos.filter((p) => p.isApproved).length;

    const value = pos.reduce((acc, p) => acc + (p.totalAmount || 0), 0);

    return { total, pending, approved, value };
  }, [pos]);

  const vendorOptions = React.useMemo(
    () =>
      (suppliers || []).map((v) => ({
        label: v.companyName || v.name,
        value: v.id,
      })),
    [suppliers],
  );

  const companyOptions = React.useMemo(
    () => COMPANIES?.map((c) => ({ label: c.name, value: c.name })) || [],
    [COMPANIES],
  );

  const mrOptions = React.useMemo(() => {
    // Resolve po.supplier (ID) → lowercase name for reliable matching
    const supplierNameById = new Map(
      (suppliers || []).map(s => [
        s.id || s._id || "",
        (s.companyName || s.name || "").toLowerCase(),
      ])
    );

    // Build set of mrId|category|supplierNameLower combos that already have an active PO
    // occupiedMRs comes from /pos/occupied-mrs API (all active POs from DB, not paginated)
    const poedCombos = new Set(
      (occupiedMRs || []).map(p => {
        const sName = supplierNameById.get(p.supplier) || (p.supplier || "").toLowerCase();
        return `${p.mrId}|${p.workType || "General"}|${sName}`;
      })
    );

    const list = [];
    (materialRequirements || []).forEach((m) => {
      if (m && m.status === "Approved by AGM") {
        const approvedQuotes = (quotations || []).filter(
          (q) => q.mrId === m.id && q.status === "Approved",
        );

        approvedQuotes.forEach((q) => {
          const category = q.category || "General";
          const sNameLower = (q.supplierName || "").toLowerCase();
          // Skip if a PO already exists for this MR + category + supplier
          if (poedCombos.has(`${m.id}|${category}|${sNameLower}`)) return;
          list.push({
            label: `${m.mrNumber || m.id} - ${m.project} (${category}) - ${q.supplierName}`,
            value: `${m.id}|${category}|${q.id}`,
          });
        });
      }
    });

    return list;
  }, [materialRequirements, quotations, occupiedMRs, suppliers]);

  const normalizeTimelineType = /* @__PURE__ */ __name((type) => {
    if (type === "Progress") return "On Delivery";
    if (type === "Final Balance") return "After 10 Days of Delivery";

    return type || "";
  }, "normalizeTimelineType");

  const computeTimelineDates = /* @__PURE__ */ __name((po) => {
    const poDate = po.date ? po.date.split("T")[0] : todayStr();

    const rawDelivery = po.deliveryDetails?.deliveryDate;

    const delivDate =
      rawDelivery && rawDelivery !== "NA" && rawDelivery !== ""
        ? rawDelivery.split("T")[0]
        : poDate;

    const d10 = new Date(delivDate);
    d10.setDate(d10.getDate() + 10);

    const plus10 = d10.toISOString().split("T")[0];

    return [poDate, delivDate, plus10];
  }, "computeTimelineDates");

  const fmtGstPct = /* @__PURE__ */ __name((val) => {
    const g = String(val || "").trim();

    const gl = g.toLowerCase();
    if (!g || gl === "-" || gl === "inclusive") return g;

    const num = parseFloat(g.replace(/[^0-9.]/g, ""));
    if (!isNaN(num)) return `${num}% Exclusive`;

    return g;
  }, "fmtGstPct");

  const parseGstInput = /* @__PURE__ */ __name(
    (raw) => raw.replace(/\s*%?\s*exclusive\s*/i, "").trim(),
    "parseGstInput",
  );

  const normalizeTimelineGST = /* @__PURE__ */ __name((pt) => {
    const raw = String(pt.gstPct || "")
      .toLowerCase()
      .trim();

    const num = parseFloat(raw.replace(/[^0-9.]/g, ""));

    const resolvedType = pt.gstType === "Exclusive" ? "Exclusive" : "Inclusive";

    return {
      ...pt,
      gstPct: isNaN(num) || !num ? 18 : num,
      gstType: resolvedType,
    };
  }, "normalizeTimelineGST");

  const calcChargeTotal = /* @__PURE__ */ __name((amount, gstPct, gstType) => {
    if (!amount) return 0;

    return gstType === "Exclusive" ? amount * (1 + gstPct / 100) : amount;
  }, "calcChargeTotal");

  const handleCreate = /* @__PURE__ */ __name(async () => {
    if (!validateForm(newPO)) {
      toast.error("Please fix the errors in the form");
      return;
    }
    const itemsTotal =
      newPO.items?.reduce((sum, item) => sum + item.totalWithGST, 0) || 0;

    const freightTotal = calcChargeTotal(
      newPO.freightAmount || 0,
      newPO.freightGstPct || 0,
      newPO.freightGstType || "Exclusive",
    );

    const loadingTotal = calcChargeTotal(
      newPO.loadingAmount || 0,
      newPO.loadingGstPct || 0,
      newPO.loadingGstType || "Exclusive",
    );

    const unloadingTotal = calcChargeTotal(
      newPO.unloadingAmount || 0,
      newPO.unloadingGstPct || 0,
      newPO.unloadingGstType || "Exclusive",
    );

    const totalValue =
      itemsTotal + freightTotal + loadingTotal + unloadingTotal;

    const isAutoApproved = totalValue <= settings.poThreshold;
    const bypassL1 = !!settings.bypassApprovals?.l1;
    const bypassL2 = !!settings.bypassApprovals?.l2;
    const bypassL3 = !!settings.bypassApprovals?.l3;
    const allBypassed = bypassL1 && bypassL2 && bypassL3;

    let poStatus, initL1, initL2, initL3;
    if (isAutoApproved || allBypassed) {
      poStatus = isAutoApproved ? "Approved" : "GRN Pending";
      initL1 = initL2 = initL3 = "Approved";
    } else if (bypassL1 && bypassL2) {
      poStatus = "Pending L3"; initL1 = "Approved"; initL2 = "Approved"; initL3 = "Pending";
    } else if (bypassL1) {
      poStatus = "Pending L2"; initL1 = "Approved"; initL2 = "Pending"; initL3 = bypassL3 ? "Approved" : "Pending";
    } else {
      poStatus = "Pending L1"; initL1 = "Pending"; initL2 = bypassL2 ? "Approved" : "Pending"; initL3 = bypassL3 ? "Approved" : "Pending";
    }

    if (isEditing && newPO.id) {
      try {
        await updatePO(newPO.id, {
          ...newPO,
          totalValue,
          status: poStatus,
          approvalL1: initL1,
          approvalL2: initL2,
          approvalL3: initL3,
          companyName: newPO.companyName,
          companyGst: newPO.companyGst,
          companyAddress: newPO.companyAddress,
          vendorContact: newPO.vendorContact,
          vendorEmail: newPO.vendorEmail,
          vendorAddress: newPO.vendorAddress,
          panNo: newPO.panNo,
          gstNo: newPO.gstNo,
        });
        toast.success("Purchase Order updated successfully");
        setModal(false);
        setNewPO(initialPO);
        setIsEditing(false);
        setErrors({});
      } catch (error) {
        toast.error(`Failed to update PO: ${error.message}`);
      }
      return;
    }
    const maxIdNum = pos.reduce((max, p) => {
      const parts = p.id.split("-");

      const num = parseInt(parts[parts.length - 1] || "0");

      return num > max ? num : max;
    }, 0);

    const po = {
      ...newPO,
      id: genId("PO", maxIdNum),
      mrId: newPO.mrId?.split("|")[0] || newPO.mrId, // Sanitize in case it's pipe-separated
      quotationId: newPO.quotationId || "",
      project: newPO.project,
      workType: newPO.workType,
      supplier: newPO.supplier,
      items: newPO.items,
      totalValue,
      status: poStatus,
      approvalL1: initL1,
      approvalL2: initL2,
      approvalL3: initL3,
      justification: newPO.justification,
      createdBy: role,
      date: newPO.date || /* @__PURE__ */ new Date().toISOString(),
      priority: newPO.priority || "Normal",
      requirementBy: newPO.requirementBy,
      location: newPO.location,
      vendorBankDetails: newPO.vendorBankDetails,
      deliveryDetails: newPO.deliveryDetails,
      paymentTimelines: newPO.paymentTimelines,
      remark: newPO.remark,
      panNo: newPO.panNo,
      gstNo: newPO.gstNo,
      companyName: newPO.companyName,
      companyGst: newPO.companyGst,
      companyAddress: newPO.companyAddress,
      vendorContact: newPO.vendorContact,
      vendorEmail: newPO.vendorEmail,
      vendorAddress: newPO.vendorAddress,
      freightAmount: newPO.freightAmount,
      freightGstPct: newPO.freightGstPct,
      freightGstType: newPO.freightGstType,
      loadingAmount: newPO.loadingAmount,
      loadingGstPct: newPO.loadingGstPct,
      loadingGstType: newPO.loadingGstType,
      unloadingAmount: newPO.unloadingAmount,
      unloadingGstPct: newPO.unloadingGstPct,
      unloadingGstType: newPO.unloadingGstType,
    };
    try {
      const createdPO = await addPO(po);
      const actualPO = createdPO || po;
      toast.success("Purchase Order created successfully");
      setModal(false);
      setNewPO(initialPO);
      setErrors({});
      fetchResource(
        "material-requirements",
        1,
        100,
        true,
        "",
        null,
        false,
        false,
      );
      api
        .get("pos/occupied-mrs")
        .then((res) => setOccupiedMRs(res.data || []))
        .catch(() => setOccupiedMRs([]));

      // Generate PDF and send to Slack (fire-and-forget, doesn't block UI)
      try {
        const supplierObj = suppliers.find(
          (s) => s.name === actualPO.supplier || s.id === actualPO.supplier
        );
        const pdfBlob = generatePOPDFBlob(actualPO, supplierObj, settings);
        const form = new FormData();
        form.append("pdf", pdfBlob, `${actualPO.id}.pdf`);
        api.post(`pos/${actualPO.id}/pdf-slack`, form).catch((err) =>
          console.warn("[PDF-Slack] Upload failed:", err)
        );
      } catch (pdfErr) {
        console.warn("[PDF-Slack] Generation failed:", pdfErr);
      }
    } catch (error) {
      toast.error(`Failed to create PO: ${error.message}`);
    }
  }, "handleCreate");

  const confirmDelete = /* @__PURE__ */ __name(async () => {
    if (!deleteConfirm) return;
    try {
      await deletePO(deleteConfirm);
      setDeleteConfirm(null);
      api
        .get("pos/occupied-mrs")
        .then((res) => setOccupiedMRs(res.data || []))
        .catch(() => {});
    } catch (error) {
      toast.error(`Failed to delete PO: ${error.message}`);
    }
  }, "confirmDelete");

  const handleApproveL1 = /* @__PURE__ */ __name(async (id) => {
    setProcessingId(`approve-${id}`);
    try {
      const bl2 = !!settings.bypassApprovals?.l2;
      const bl3 = !!settings.bypassApprovals?.l3;
      const nextStatus = bl2 ? (bl3 ? "GRN Pending" : "Pending L3") : "Pending L2";
      const updateData = {
        approvalL1: "Approved",
        approvalL1At: /* @__PURE__ */ new Date().toISOString(),
        status: nextStatus,
        ...(bl2 ? { approvalL2: "Approved" } : {}),
        ...(bl3 ? { approvalL3: "Approved" } : {}),
      };
      await updatePO(id, updateData);
      if (selectedPO) setSelectedPO({ ...selectedPO, ...updateData });
      toast.success("L1 Approval successful");
    } catch (error) {
      toast.error(`Approval failed: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  }, "handleApproveL1");

  const handleApproveL2 = /* @__PURE__ */ __name(async (id) => {
    setProcessingId(`approve-${id}`);
    try {
      const bl3 = !!settings.bypassApprovals?.l3;
      const nextStatus = bl3 ? "GRN Pending" : "Pending L3";
      const updateData = {
        approvalL2: "Approved",
        approvalL2At: /* @__PURE__ */ new Date().toISOString(),
        status: nextStatus,
        ...(bl3 ? { approvalL3: "Approved" } : {}),
      };
      await updatePO(id, updateData);
      if (selectedPO) setSelectedPO({ ...selectedPO, ...updateData });
      toast.success("L2 Approval successful. Sent for Director Approval (L3).");
    } catch (error) {
      toast.error(`Approval failed: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  }, "handleApproveL2");

  const handleApproveL3 = /* @__PURE__ */ __name(async (id) => {
    setProcessingId(`approve-${id}`);
    try {
      const updateData = {
        approvalL3: "Approved",
        status: "GRN Pending",
        approvalL3At: /* @__PURE__ */ new Date().toISOString(),
      };
      await updatePO(id, updateData);
      if (selectedPO) setSelectedPO({ ...selectedPO, ...updateData });
      toast.success("L3 Approval successful. PO moved to GRN Pending.");
    } catch (error) {
      toast.error(`Approval failed: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  }, "handleApproveL3");

  const handleReject = /* @__PURE__ */ __name(async (id) => {
    setProcessingId(`reject-${id}`);
    try {
      const updateData = { status: "Blocked" };
      await updatePO(id, updateData);
      if (selectedPO) setSelectedPO({ ...selectedPO, ...updateData });
      toast.success("PO rejected successfully");
    } catch (error) {
      toast.error(`Rejection failed: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  }, "handleReject");

  const handleCancelApproved = /* @__PURE__ */ __name((id) => {
    setCancelTargetId(id);
    setCancelNoteText("");
    setCancelModal(true);
  }, "handleCancelApproved");

  const handleConfirmCancel = /* @__PURE__ */ __name(async () => {
    if (!cancelTargetId || !cancelNoteText.trim()) {
      toast.error("Please enter a cancellation reason");
      return;
    }
    setProcessingId(`cancel-${cancelTargetId}`);
    try {
      const res = await api.putSimple(`pos/${cancelTargetId}/cancel`, {
        cancelNote: cancelNoteText.trim(),
      });
      if (!res.success) throw new Error(res.message || "Cancel failed");

      const now = /* @__PURE__ */ new Date().toISOString();

      const patch = {
        status: "Cancelled",
        cancelNote: cancelNoteText.trim(),
        cancelledAt: now,
      };
      if (selectedPO && selectedPO.id === cancelTargetId) {
        setSelectedPO({ ...selectedPO, ...patch });
      }
      await fetchResource("pos", 1, 50, true);
      await fetchResource("quotations", 1, 50, true);
      api
        .get("pos/occupied-mrs")
        .then((res2) => setOccupiedMRs(res2.data || []))
        .catch(() => {});
      toast.success(
        res.message || "PO cancelled. Linked quotation reset to Pending.",
      );
      setCancelModal(false);
      setCancelTargetId(null);
      setCancelNoteText("");
    } catch (error) {
      toast.error(error.message || "Failed to cancel PO");
    } finally {
      setProcessingId(null);
    }
  }, "handleConfirmCancel");

  const handleCancel = /* @__PURE__ */ __name(async (id) => {
    setProcessingId(`cancel-${id}`);
    try {
      await updatePO(id, { status: "Blocked" });
      toast.success("PO cancelled successfully");
    } catch (error) {
      toast.error(`Cancellation failed: ${error.message}`);
    } finally {
      setProcessingId(null);
    }
  }, "handleCancel");

  const getEffectivePO = /* @__PURE__ */ __name((po) => {
    if (!po || po.status !== "PO Closed") return po;
    // Use stored closedItems if available
    const adjustedItems = (po.closedItems && po.closedItems.length > 0) ? po.closedItems : (() => {
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
    })();
    const newTotal = adjustedItems.reduce((s, it) => {
      if ((it.gstType || "Exclusive") === "Exclusive") return s + it.qty * it.rate * (1 + (it.gstPct || 18) / 100);
      return s + it.qty * it.rate;
    }, 0);
    return { ...po, items: adjustedItems, totalValue: newTotal };
  }, "getEffectivePO");

  const downloadPDF = /* @__PURE__ */ __name((po) => {
    const supplier = suppliers.find(
      (s) =>
        s.id === po.supplier ||
        s._id === po.supplier ||
        (s.companyName || s.name || "").toLowerCase() ===
          (po.supplier || "").toLowerCase(),
    );
    generatePOPDF(getEffectivePO(po), supplier, settings);
  }, "downloadPDF");

  const addItem = /* @__PURE__ */ __name((invItem) => {
    const item = {
      sku: invItem.sku,
      itemName: invItem.itemName || "",
      qty: 1,
      unit: invItem.unit,
      rate: 0,
      gstPct: 18,
      gstType: "Exclusive",
      total: 0,
      totalWithGST: 0,
      currentStock: invItem.liveStock,
      category: invItem.category,
      requirementQty: 1,
      condition: invItem.condition || "New",
    };
    setNewPO({ ...newPO, items: [...(newPO.items || []), item] });
  }, "addItem");

  const updateItem = /* @__PURE__ */ __name((index, field, value) => {
    const items = [...(newPO.items || [])];

    const item = { ...items[index], [field]: value };

    const qty = Number(item.qty) || 0;

    const rate = Number(item.rate) || 0;

    const gstPct = Number(item.gstPct) || 0;

    const isInclusive = item.gstType === "Inclusive";
    if (isInclusive) {
      item.totalWithGST = qty * rate;
      item.total = item.totalWithGST / (1 + gstPct / 100);
    } else {
      item.total = qty * rate;
      item.totalWithGST = item.total * (1 + gstPct / 100);
    }
    items[index] = item;

    const updates = { items };
    if (field === "gstType") {
      updates.paymentTimelines = (newPO.paymentTimelines || []).map((pt) => ({
        ...pt,
        gstType: value,
      }));
    }
    setNewPO({ ...newPO, ...updates });
  }, "updateItem");

  const removeItem = /* @__PURE__ */ __name((index) => {
    const items = [...(newPO.items || [])];
    items.splice(index, 1);
    setNewPO({ ...newPO, items });
  }, "removeItem");

  const linkToInventory = /* @__PURE__ */ __name((index, invItem) => {
    const items = [...(newPO.items || [])];

    const item = {
      ...items[index],
      sku: invItem.sku,
      itemName: invItem.itemName || "",
      unit: invItem.unit,
      currentStock: invItem.liveStock,
      category: invItem.category,
    };
    item.total = item.qty * item.rate;
    item.totalWithGST = item.total * (1 + item.gstPct / 100);
    items[index] = item;
    setNewPO({ ...newPO, items });
  }, "linkToInventory");

  const quickAddToInventory = /* @__PURE__ */ __name(
    async (index, quickAddData) => {
      const item = newPO.items[index];
      if (!quickAddData?.category || !quickAddData?.unit) {
        toast.error("Please select category and unit");
        return;
      }
      const formatPart = /* @__PURE__ */ __name((str, type) => {
        const part = str.substring(0, 3);
        if (type === "title")
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();

        return part.toLowerCase();
      }, "formatPart");

      const sku = `${formatPart(item.itemName, "title")}/${formatPart(quickAddData.category, "lower")}/${Math.floor(1e3 + Math.random() * 9e3)}`;

      const newInvItem = {
        sku,
        itemName: item.itemName,
        category: quickAddData.category,
        unit: quickAddData.unit,
        liveStock: 0,
        minStock: 0,
        condition: "New",
        location: newPO.location || "Main Store",
        subCategory: "General",
        price: 0,
        status: "Active",
      };
      toast.loading("Creating inventory item...", { id: "quickAdd" });
      try {
        const res = await api.post("inventory", newInvItem);

        const invItem = res.data;
        if (!invItem || !invItem.sku) {
          throw new Error("Invalid response from server");
        }
        toast.success(`Item created: ${invItem.sku}`, { id: "quickAdd" });
        linkToInventory(index, invItem);
        fetchResource("inventory", 1, 500, true);
      } catch (error) {
        console.error("Quick add error:", error);
        toast.error(error.message || "Error adding item to inventory", {
          id: "quickAdd",
        });
      }
    },
    "quickAddToInventory",
  );

  const hasReusable = newPO.items?.some((i) => {
    const inv = inventory.find((inv2) => inv2.sku === i.sku);

    return (
      inv &&
      ["Good", "Needs Repair"].includes(inv.condition) &&
      inv.liveStock > 0
    );
  });

  if (modal) {
    return (
      <POFormModal
        po={newPO}
        isEditing={isEditing}
        errors={errors}
        autoLinking={autoLinking}
        onClose={() => {
          setModal(false);
          setErrors({});
          setNewPO(initialPO);
          setIsEditing(false);
          fetchResource("inventory", 1, 50, true);
        }}
        onSubmit={handleCreate}
        onChange={setNewPO}
        onMrChange={handleMrChange}
        addItem={addItem}
        updateItem={updateItem}
        removeItem={removeItem}
        linkToInventory={linkToInventory}
        quickAddToInventory={quickAddToInventory}
        companyOptions={companyOptions}
        mrOptions={mrOptions}
        vendorOptions={vendorOptions}
        COMPANIES={COMPANIES}
        CATEGORIES={CATEGORIES}
        UNITS={UNITS}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {" "}
      <PageHeader
        title="Purchase Orders"
        sub="Manage and approve POs"
        actions={
          <div className="flex items-center gap-2">
            {" "}
            <Btn
              label={showMonthly ? "Hide Report" : "Monthly Report"}
              icon={showMonthly ? ChevronUp : BarChart2}
              outline
              onClick={() => setShowMonthly((v) => !v)}
            />{" "}
            {hasPermission("CREATE_PURCHASE_ORDER") && (
              <Btn
                label="Create PO"
                icon={Plus}
                onClick={() => {
                  setNewPO(initialPO);
                  setIsEditing(false);
                  setModal(true);
                }}
              />
            )}{" "}
          </div>
        }
      />{" "}
      {showMonthly && <POMonthlyReport pos={pos} />}{" "}
      <div className="mb-6">
        {" "}
        <FilterRow
          showClear={
            !!(
              search ||
              startDate ||
              endDate ||
              filterProject ||
              filterSupplier ||
              filterStatus
            )
          }
          onClearAll={() => {
            setSearch("");
            setStartDate("");
            setEndDate("");
            setFilterProject("");
            setFilterSupplier("");
            setFilterStatus("");
          }}
        >
          {" "}
          <SearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search POs..."
            className="flex-1 min-w-[200px]"
          />{" "}
          <DateRangePicker
            value={{ start: startDate, end: endDate }}
            onChange={(v) => {
              setStartDate(v.start);
              setEndDate(v.end);
            }}
          />{" "}
          <SelectFilter
            value={filterProject}
            onChange={setFilterProject}
            options={PROJECTS}
            placeholder="All Projects"
            searchable={true}
          />{" "}
          <SelectFilter
            value={filterSupplier}
            onChange={setFilterSupplier}
            options={supplierOptions}
            placeholder="All Suppliers"
            searchable={true}
          />{" "}
          <SelectFilter
            value={filterStatus}
            onChange={setFilterStatus}
            options={statusOptions}
            placeholder="All Statuses"
          />{" "}
        </FilterRow>{" "}
      </div>{" "}
      <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-1 min-h-[400px]">
        {" "}
        <TableVirtuoso
          style={{ height: "calc(100vh - 350px)", minHeight: "400px" }}
          data={filteredPos}
          context={{ suppliers }}
          endReached={loadMore}
          fixedHeaderContent={() => {
            const headerClass =
              "px-3 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 whitespace-nowrap overflow-hidden sticky top-0 z-10 sticky-th";

            return (
              <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-[#E8ECF0] dark:border-gray-800 text-left">
                {" "}
                <th className={cn(headerClass, "lg:hidden")}>
                  {" "}
                  Po details{" "}
                </th>{" "}
                <th
                  className={cn(headerClass, "hidden lg:table-cell w-[130px]")}
                >
                  {" "}
                  Po no.{" "}
                </th>{" "}
                <th
                  className={cn(headerClass, "hidden lg:table-cell w-[110px]")}
                >
                  {" "}
                  Mr no.{" "}
                </th>{" "}
                <th
                  className={cn(headerClass, "hidden lg:table-cell w-[148px]")}
                >
                  {" "}
                  Date{" "}
                </th>{" "}
                <th
                  className={cn(headerClass, "hidden lg:table-cell w-[130px]")}
                >
                  {" "}
                  Project{" "}
                </th>{" "}
                <th
                  className={cn(headerClass, "hidden lg:table-cell w-[160px]")}
                >
                  {" "}
                  Supplier{" "}
                </th>{" "}
                <th
                  className={cn(
                    headerClass,
                    "hidden lg:table-cell text-right w-[100px]",
                  )}
                >
                  {" "}
                  Value{" "}
                </th>{" "}
                <th
                  className={cn(headerClass, "hidden lg:table-cell w-[120px]")}
                >
                  {" "}
                  Status{" "}
                </th>{" "}
                <th
                  className={cn(
                    headerClass,
                    "hidden lg:table-cell text-right w-[110px]",
                  )}
                >
                  {" "}
                  Actions{" "}
                </th>{" "}
              </tr>
            );
          }}
          itemContent={(_index, po, { suppliers: currentSuppliers }) => {
            const isPending = po.status?.startsWith("Pending");

            const isNew = isNewItem(po.createdAt);

            const supplier = currentSuppliers.find(
              (s) => s.id === po.supplier || s._id === po.supplier,
            );

            const sName = supplier
              ? supplier.companyName || supplier.name
              : po.supplier || "NA";

            return (
              <>
                {" "}
                {/* Desktop View Cells */}{" "}
                <Td className="hidden lg:table-cell px-3 py-2.5 overflow-hidden">
                  {" "}
                  <div className="flex items-center gap-1.5 min-w-0">
                    {" "}
                    {isNew && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-orange-600 text-white animate-pulse shrink-0">
                        NEW
                      </span>
                    )}{" "}
                    <span
                      className="block truncate text-[13px] font-medium text-gray-900 dark:text-white"
                      title={safeStr(po.id)}
                    >
                      {safeStr(po.id)}
                    </span>{" "}
                  </div>{" "}
                </Td>{" "}
                <Td className="hidden lg:table-cell px-3 py-2.5 overflow-hidden">
                  {" "}
                  <span
                    className="block truncate text-[13px] text-gray-500 dark:text-gray-400"
                    title={safeStr(po.mrId || "NA")}
                  >
                    {safeStr(po.mrId || "NA")}
                  </span>{" "}
                </Td>{" "}
                <Td className="hidden lg:table-cell px-3 py-2.5 text-[13px] text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden">
                  {" "}
                  {formatDateTime(po.date)}{" "}
                </Td>{" "}
                <Td className="hidden lg:table-cell px-3 py-2.5 overflow-hidden">
                  {" "}
                  <span
                    className="block truncate text-[13px] text-gray-500 dark:text-gray-400 capitalize"
                    title={safeStr(po.project)}
                  >
                    {safeStr(po.project)}
                  </span>{" "}
                </Td>{" "}
                <Td className="hidden lg:table-cell px-3 py-2.5 overflow-hidden">
                  {" "}
                  <span
                    className="block truncate text-[13px] text-gray-500 dark:text-gray-400"
                    title={sName}
                  >
                    {safeStr(sName)}
                  </span>{" "}
                </Td>{" "}
                <Td className="hidden lg:table-cell px-3 py-2.5 text-[13px] font-bold text-right text-gray-900 dark:text-white whitespace-nowrap overflow-hidden">
                  {" "}
                  {fmtCur(po.totalValue)}{" "}
                </Td>{" "}
                <Td className="hidden lg:table-cell px-3 py-2.5">
                  {" "}
                  <StatusBadge
                    status={po.status}
                    accountStatus={po.accountStatus}
                  />{" "}
                </Td>{" "}
                <Td className="hidden lg:table-cell px-4 py-3">
                  {" "}
                  <div className="flex items-center justify-end gap-1">
                    {" "}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setLoadingQuotes(true);
                        try {
                          let updatedPO = { ...po };
                          if (po.mrId) {
                            const qRes = await api.get("quotations", {
                              filter: JSON.stringify({ mrId: po.mrId }),
                              limit: 100,
                            });

                            const mrQuotes = qRes.data || [];
                            if (mrQuotes.length > 0) {
                              const newPC = calculatePriceComparison(
                                mrQuotes,
                                po.items,
                              );
                              if (newPC) updatedPO.priceComparison = newPC;
                            }
                          }
                          setSelectedPO(updatedPO);
                          setViewModal(true);
                        } catch (err) {
                          setSelectedPO(po);
                          setViewModal(true);
                        } finally {
                          setLoadingQuotes(false);
                        }
                      }}
                      className="p-1.5 text-gray-500 hover:text-orange-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all"
                      title="View"
                    >
                      {" "}
                      <Eye className="w-4 h-4" />{" "}
                    </button>{" "}
                    {hasPermission("EDIT_PURCHASE_ORDER") && (
                      <>
                        {" "}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewPO(po);
                            setIsEditing(true);
                            setModal(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          title={
                            isPOLocked(po)
                              ? "Warning: Edit will reset approval status"
                              : "Edit"
                          }
                          disabled={false}
                        >
                          {" "}
                          <Pencil className="w-4 h-4" />{" "}
                        </button>{" "}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm(po.id);
                          }}
                          className="p-1.5 text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          title={
                            isPOLocked(po)
                              ? role === "Super Admin"
                                ? "Delete (Super Admin override)"
                                : "Locked: Payment processed"
                              : "Delete"
                          }
                          disabled={isPOLocked(po) && role !== "Super Admin"}
                        >
                          {" "}
                          <Trash2 className="w-4 h-4" />{" "}
                        </button>{" "}
                      </>
                    )}{" "}
                    {po.status === "GRN Variance" && hasPermission("EDIT_PURCHASE_ORDER") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const receivedBySku = {};
                          grns.filter((g) => g.poId === po.id).forEach((g) => {
                            (g.items || []).forEach((item) => {
                              receivedBySku[item.sku] = (receivedBySku[item.sku] || 0) + (item.received || 0);
                            });
                            (g.receipts || []).forEach((r) => {
                              (r.items || []).forEach((item) => {
                                receivedBySku[item.sku] = (receivedBySku[item.sku] || 0) + (item.received || 0);
                              });
                            });
                          });
                          const remainingItems = (po.items || [])
                            .map((i) => ({ ...i, remaining: Math.max(0, (i.qty || 0) - (receivedBySku[i.sku] || 0)) }))
                            .filter((i) => i.remaining > 0);
                          setClosePOConfirm({ po, remainingItems });
                        }}
                        className="p-1.5 text-amber-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-all"
                        title="Cancel Remaining Items"
                      >
                        <Ban className="w-4 h-4" />
                      </button>
                    )}{" "}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.hash = `tracking?id=${po.mrId || po.id}`;
                      }}
                      className="p-1.5 text-orange-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-md transition-all"
                      title="Track Lifecycle"
                    >
                      {" "}
                      <TrendingUp className="w-4 h-4" />{" "}
                    </button>{" "}
                  </div>{" "}
                </Td>{" "}
                {/* Mobile View Cell */}{" "}
                <Td colSpan={8} className="lg:hidden p-0 border-none">
                  {" "}
                  <div
                    className={cn(
                      "p-4 space-y-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800",
                      isPending && "approval-highlight",
                    )}
                  >
                    {" "}
                    <div className="flex items-start justify-between">
                      {" "}
                      <div>
                        {" "}
                        <div className="flex items-center gap-2">
                          {" "}
                          {isNew && (
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-orange-600 text-white animate-pulse">
                              NEW
                            </span>
                          )}{" "}
                          <p className="text-[13px] font-bold text-gray-900 dark:text-white tracking-tight">
                            {po.id}
                          </p>{" "}
                        </div>{" "}
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {formatDateTime(po.date)}
                        </p>{" "}
                      </div>{" "}
                      <div className="flex flex-col items-end gap-1">
                        {" "}
                        <StatusBadge
                          status={po.status}
                          accountStatus={po.accountStatus}
                        />{" "}
                        {isPending && (
                          <span className="text-[9px] font-black text-orange-500 animate-bounce">
                            APPROVAL NEEDED
                          </span>
                        )}{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="grid grid-cols-2 gap-4 py-1">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-[10px] font-bold text-gray-400 tracking-widest">
                          Project
                        </p>{" "}
                        <p className="text-[12px] font-medium text-gray-700 dark:text-gray-300 truncate">
                          {safeStr(po.project)}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-[10px] font-bold text-gray-400 tracking-widest">
                          Supplier
                        </p>{" "}
                        <p className="text-[12px] font-medium text-gray-700 dark:text-gray-300 truncate">
                          {" "}
                          {sName}{" "}
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="flex items-center justify-between pt-2">
                      {" "}
                      <p className="text-base font-black text-orange-500">
                        {fmtCur(po.totalValue)}
                      </p>{" "}
                      <div className="flex items-center gap-1.5">
                        {" "}
                        <Btn
                          icon={Eye}
                          small
                          outline
                          onClick={() => {
                            setSelectedPO(po);
                            setViewModal(true);
                          }}
                        />{" "}
                        {hasPermission("EDIT_PURCHASE_ORDER") && (
                          <Btn
                            icon={Pencil}
                            small
                            outline
                            onClick={() => {
                              setNewPO(po);
                              setIsEditing(true);
                              setModal(true);
                            }}
                          />
                        )}{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                </Td>{" "}
              </>
            );
          }}
          components={{
            Table: /* @__PURE__ */ __name(
              (props) => (
                <table
                  {...props}
                  className="w-full text-left border-collapse table-fixed min-w-[800px] lg:min-w-0"
                />
              ),
              "Table",
            ),
            TableBody: React.forwardRef((props, ref) => (
              <tbody
                {...props}
                ref={ref}
                className="divide-y divide-gray-200 dark:divide-gray-800"
              />
            )),
            TableRow: /* @__PURE__ */ __name((props) => {
              const po = props.item;

              const isPending = po?.status?.startsWith("Pending");

              const isNew = isNewItem(po?.createdAt);

              return (
                <Tr
                  {...props}
                  isPending={isPending}
                  isNew={isNew}
                  className={cn(
                    "cursor-pointer",
                    isPending && "ring-1 ring-orange-500/10",
                    props.className,
                  )}
                  onClick={async () => {
                    setLoadingQuotes(true);
                    try {
                      let updatedPO = { ...po };
                      if (po.mrId) {
                        const qRes = await api.get("quotations", {
                          filter: JSON.stringify({ mrId: po.mrId }),
                          limit: 100,
                        });

                        const mrQuotes = qRes.data || [];
                        if (mrQuotes.length > 0) {
                          const newPC = calculatePriceComparison(
                            mrQuotes,
                            po.items,
                          );
                          if (newPC) updatedPO.priceComparison = newPC;
                        }
                      }
                      setSelectedPO(updatedPO);
                      setViewModal(true);
                    } catch (err) {
                      setSelectedPO(po);
                      setViewModal(true);
                    } finally {
                      setLoadingQuotes(false);
                    }
                  }}
                />
              );
            }, "TableRow"),
          }}
        />{" "}
        {loading && pos.length === 0 && (
          <div className="p-8 space-y-4">
            {" "}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                {" "}
                <Skeleton className="h-6 w-24" />{" "}
                <Skeleton className="h-6 flex-1" />{" "}
                <Skeleton className="h-6 w-20" />{" "}
              </div>
            ))}{" "}
          </div>
        )}{" "}
        {!loading && pos.length === 0 && (
          <div className="p-12 text-center">
            {" "}
            <div className="flex flex-col items-center gap-2 text-gray-400">
              {" "}
              <FileText className="w-12 h-12 opacity-20" />{" "}
              <p className="text-sm">No purchase orders found</p>{" "}
            </div>{" "}
          </div>
        )}{" "}
      </Card>{" "}
      {/* Infinite Scroll Indicator for Bottom */}{" "}
      {loading && pos.length > 0 && (
        <div className="flex items-center justify-center py-2 text-gray-500 text-xs">
          {" "}
          <div className="w-3 h-3 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin mr-2" />{" "}
          Loading more POs...{" "}
        </div>
      )}{" "}
      {viewModal && selectedPO && (
        <POViewModal
          po={selectedPO}
          onClose={() => {
            setViewModal(false);
            setSelectedPO(null);
          }}
          onApproveL1={handleApproveL1}
          onApproveL2={handleApproveL2}
          onApproveL3={handleApproveL3}
          onReject={handleReject}
          onCancelApproved={handleCancelApproved}
          onDownloadPDF={downloadPDF}
          processingId={processingId}
        />
      )}{" "}
      {deleteConfirm && (
        <ConfirmModal
          title="Delete Purchase Order"
          message={`Are you sure you want to delete PO ${deleteConfirm}? This action cannot be undone.`}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteConfirm(null)}
          loading={actionLoading}
        />
      )}{" "}
      {closePOConfirm && (
        <Modal
          title="Cancel Remaining Items & Close PO"
          onClose={() => setClosePOConfirm(null)}
          footer={
            <div className="flex justify-end gap-3 w-full">
              <Btn label="Go Back" outline onClick={() => setClosePOConfirm(null)} />
              <Btn
                label="Confirm & Close PO"
                color="red"
                icon={Ban}
                loading={actionLoading}
                onClick={async () => {
                  try {
                    const receivedBySku = {};
                    grns.filter((g) => g.poId === closePOConfirm.po.id).forEach((g) => {
                      (g.items || []).forEach((item) => { receivedBySku[item.sku] = (receivedBySku[item.sku] || 0) + (item.received || 0); });
                      (g.receipts || []).forEach((r) => {
                        (r.items || []).forEach((item) => { receivedBySku[item.sku] = (receivedBySku[item.sku] || 0) + (item.received || 0); });
                      });
                    });
                    const closedItems = (closePOConfirm.po.items || [])
                      .map((i) => { const q = receivedBySku[i.sku] || 0; return { ...i, qty: q, total: q * i.rate, totalWithGST: q * i.rate * (1 + (i.gstPct || 18) / 100) }; })
                      .filter((i) => i.qty > 0);
                    await updatePO(closePOConfirm.po.id, { status: "PO Closed", closedItems });
                    setClosePOConfirm(null);
                    toast.success("PO closed — remaining items cancelled");
                  } catch (err) {
                    toast.error(err.message || "Failed to close PO");
                  }
                }}
              />
            </div>
          }
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
                  These items have not been received
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                  Closing this PO will cancel the outstanding quantities below. This cannot be undone.
                </p>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Item</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Ordered</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Received</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Cancelling</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {closePOConfirm.remainingItems.map((item, idx) => (
                    <tr key={idx} className="bg-white dark:bg-gray-900">
                      <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                        <div className="font-medium">{item.itemName || item.name || item.sku}</div>
                        <div className="text-xs text-gray-400">{item.sku}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{item.qty} {item.unit}</td>
                      <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-400">{(item.qty || 0) - item.remaining} {item.unit}</td>
                      <td className="px-3 py-2 text-right font-semibold text-red-500">{item.remaining} {item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}{" "}
      {/* Cancel PO Modal â€" AGM fills in a cancellation reason */}{" "}
      {cancelModal && (
        <Modal
          title="Cancel Purchase Order"
          onClose={() => {
            setCancelModal(false);
            setCancelNoteText("");
            setCancelTargetId(null);
          }}
          footer={
            <div className="flex justify-end gap-3 w-full">
              {" "}
              <Btn
                label="Go Back"
                outline
                onClick={() => {
                  setCancelModal(false);
                  setCancelNoteText("");
                  setCancelTargetId(null);
                }}
              />{" "}
              <Btn
                label="Confirm Cancellation"
                color="red"
                icon={X}
                onClick={handleConfirmCancel}
                loading={processingId === `cancel-${cancelTargetId}`}
                disabled={!cancelNoteText.trim()}
              />{" "}
            </div>
          }
        >
          {" "}
          <div className="space-y-5">
            {" "}
            {/* Warning banner */}{" "}
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {" "}
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />{" "}
              <div>
                {" "}
                <p className="text-sm font-bold text-red-700 dark:text-red-400">
                  This action cannot be undone
                </p>{" "}
                <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                  {" "}
                  Cancelling this PO will also reset the linked Quotation back
                  to <strong>Pending</strong>, allowing suppliers to re-submit
                  their quotes.{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
            {/* Note input */}{" "}
            <div className="space-y-1.5">
              {" "}
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                {" "}
                Cancellation Reason <span className="text-red-500">*</span>{" "}
              </label>{" "}
              <textarea
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/40 focus:border-red-500 min-h-[110px] resize-y transition"
                placeholder="Enter the reason for cancelling this Purchase Orderâ€¦"
                value={cancelNoteText}
                onChange={(e) => setCancelNoteText(e.target.value)}
                autoFocus
              />{" "}
              <p className="text-[11px] text-gray-400">
                This note will be visible to all users viewing this PO.
              </p>{" "}
            </div>{" "}
          </div>{" "}
        </Modal>
      )}{" "}
    </div>
  );
}, "PurchaseOrders");

export { PurchaseOrders };
