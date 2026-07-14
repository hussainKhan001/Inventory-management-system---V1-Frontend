var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAppStore } from "../store";
import { PageHeader, Card, Btn, Modal, Field, SField, ConfirmModal, Badge, StatusBadge, Skeleton, SearchSelect, MultipleImageUpload, Th, Td } from "../components/ui";
import { SearchFilter, DateRangePicker, SelectFilter, FilterRow } from "../components/ui/Filters";
import { Plus, Camera, AlertCircle, Eye, Pencil, Trash2, ArrowRightLeft, ArrowUpRight, ArrowDownLeft, Loader2, X, FileText, Package } from "lucide-react";
import { TableVirtuoso } from "react-virtuoso";
import { genId, scrollToError, formatDateTime } from "../utils";
import { cn } from "../lib/utils";
import { toast } from "react-hot-toast";
const INITIAL_TRANSACTION = {
  type: "Inward",
  items: [],
  project: "",
  otherProjectName: "",
  store: "",
  date: (/* @__PURE__ */ new Date()).toISOString(),
  status: "Confirmed",
  personName: "",
  personPhotoUrl: "",
  personPhotos: [],
  condition: "New",
  challanNo: "",
  challanPhotos: []
};
const TransactionsPage = /* @__PURE__ */ __name(({ type }) => {
  const {
    transactions,
    transactionsPagination,
    inwards,
    inwardsPagination,
    outwards,
    outwardsPagination,
    inwardReturns,
    inwardReturnsPagination,
    outwardReturns,
    outwardReturnsPagination,
    fetchResource,
    addTransaction,
    addInward,
    addOutward,
    addInwardReturn,
    addOutwardReturn,
    deleteTransaction,
    deleteInward,
    deleteOutward,
    deleteInwardReturn,
    deleteOutwardReturn,
    updateInward,
    updateOutward,
    updateInwardReturn,
    updateOutwardReturn,
    inventory,
    catalogue,
    materialRequirements,
    suppliers,
    role,
    uploadImage,
    loading,
    actionLoading,
    mrAllocations,
    user,
    hasPermission,
    settings,
    availableGatePasses,
    fetchAvailableGatePasses,
    setActionLoading,
    api
  } = useAppStore();
  const { projects: PROJECTS, categories: CATEGORIES, units: UNITS, sites: SITES } = settings;
  const COMBINED_STORES = (SITES || []).map(s => s.siteName);
  const resourceMap = {
    "Inward": "inward",
    "Outward": "outward",
    "Inward Return": "inward-returns",
    "Outward Return": "outward-returns",
    "Public Inward": "inward",
    "Public Outward": "outward",
    "Transfer Inward": "inward",
    "Transfer Outward": "outward",
    "Public Transfer Inward": "inward",
    "Public Transfer Outward": "outward"
  };
  const resourceName = type ? resourceMap[type] || "transactions" : "transactions";
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState("history");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [filterProject, setFilterProject] = useState("");
  const [filterType, setFilterType] = useState(type || "");
  const [allocSearch, setAllocSearch] = useState("");
  const [allocFilterRequester, setAllocFilterRequester] = useState("");
  const requesterOptions = useMemo(() =>
    [...new Set(mrAllocations.map(a => a.engineerName).filter(Boolean))].sort().map(n => ({ label: n, value: n }))
  , [mrAllocations]);
  const [page, setPage] = useState(1);
  const filterTypeOptions = useMemo(() => [
    { label: "Inward", value: "Inward" },
    { label: "Outward", value: "Outward" },
    { label: "Inward Return", value: "Inward Return" },
    { label: "Outward Return", value: "Outward Return" },
    { label: "Transfer Inward", value: "Transfer Inward" },
    { label: "Transfer Outward", value: "Transfer Outward" },
    { label: "Public Inward", value: "Public Inward" },
    { label: "Public Outward", value: "Public Outward" },
    { label: "Public Transfer Inward", value: "Public Transfer Inward" },
    { label: "Public Transfer Outward", value: "Public Transfer Outward" }
  ], []);
  const data = resourceName === "inward" ? inwards : resourceName === "outward" ? outwards : resourceName === "inward-returns" ? inwardReturns : resourceName === "outward-returns" ? outwardReturns : transactions;
  const pagination = resourceName === "inward" ? inwardsPagination : resourceName === "outward" ? outwardsPagination : resourceName === "inward-returns" ? inwardReturnsPagination : resourceName === "outward-returns" ? outwardReturnsPagination : transactionsPagination;
  const [loadingField, setLoadingField] = useState(null);
  const observerRef = useRef(null);
  const virtuosoTableComponents = useMemo(() => ({
    Table: /* @__PURE__ */ __name((props) => <table {...props} className="w-full text-left border-collapse table-fixed min-w-[800px] md:min-w-0" />, "Table"),
    TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} className="divide-y divide-[#E8ECF0] dark:divide-gray-800" />),
    TableRow: /* @__PURE__ */ __name((props) => <tr {...props} className={cn("hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors", props.className)} />, "TableRow")
  }), []);
  const virtuosoMrTableComponents = useMemo(() => ({
    Table: /* @__PURE__ */ __name((props) => <table {...props} className="w-full text-left border-collapse table-fixed min-w-[600px]" />, "Table"),
    TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} className="divide-y divide-gray-100 dark:divide-gray-800" />),
    TableRow: /* @__PURE__ */ __name((props) => <tr {...props} className={cn("hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-all", props.className)} />, "TableRow")
  }), []);
  useEffect(() => {
    setFilterType(type || "");
    setNewTransaction({ ...INITIAL_TRANSACTION, type: type || "Inward" });
  }, [type]);
  useEffect(() => {
    setPage(1);
  }, [resourceName, type, debouncedSearch, filterProject, filterType, startDate, endDate]);
  useEffect(() => {
    const isInitialLoad = (data?.length || 0) === 0;
    const filter = {};
    if (filterProject) filter.project = filterProject;
    if (type === "Transfer Inward") {
      filter.type = { $in: ["Transfer Inward", "Public Transfer Inward"] };
    } else if (type === "Transfer Outward") {
      filter.type = { $in: ["Transfer Outward", "Public Transfer Outward"] };
    } else if (type === "Inward") {
      filter.type = { $in: ["Inward", "Public Inward", "GRN", "Manual"] };
    } else if (type === "Outward") {
      filter.type = { $in: ["Outward", "Public Outward", "Manual"] };
    }
    if (!type && filterType) {
      if (filterType === "Inward") {
        filter.type = { $in: ["Inward", "Manual", "GRN", "Public Inward"] };
      } else if (filterType === "Outward") {
        filter.type = { $in: ["Outward", "Manual", "Public Outward"] };
      } else if (filterType === "Transfer Inward") {
        filter.type = { $in: ["Transfer Inward", "Public Transfer Inward"] };
      } else if (filterType === "Transfer Outward") {
        filter.type = { $in: ["Transfer Outward", "Public Transfer Outward"] };
      } else {
        filter.type = filterType;
      }
    }
    fetchResource(resourceName, page, 100, !isInitialLoad || page > 1, debouncedSearch, Object.keys(filter).length ? filter : null, page > 1, false, startDate, endDate);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterProject, filterType, page, resourceName, type, startDate, endDate]);
  useEffect(() => {
    fetchResource("inventory", 1, 1e3, true);
    fetchResource("catalogue", 1, 1e3, true);
    fetchResource("suppliers", 1, 5000, true);
    fetchResource("material-requirements", 1, 1e3, true);
  }, [fetchResource]);
  useEffect(() => {
    const observer = (() => {
      try {
        return new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && pagination && page < pagination.pages && !loading && !actionLoading) {
              setPage((prev) => prev + 1);
            }
          },
          { threshold: 0.1 }
        );
      } catch (e) {
        console.warn("IntersectionObserver not supported", e);
        return null;
      }
    })();
    if (observer && observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => observer?.disconnect();
  }, [pagination, page, loading]);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newTransaction, setNewTransaction] = useState({ ...INITIAL_TRANSACTION, type: type || "Inward" });
  const [errors, setErrors] = useState({});
  const [searchItemVal, setSearchItemVal] = useState("");
  const inventoryOptions = useMemo(() => {
    const invOptions = (inventory || []).map((i) => ({
      value: i.sku,
      label: i.itemName,
      subLabel: `${i.sku} | Category: ${i.category} | Stock: ${i.liveStock}`,
      stock: i.liveStock,
      unit: i.unit
    }));
    const catOptions = (catalogue || []).filter((c) => !inventory.some((i) => i.sku === c.sku)).map((c) => ({
      value: c.sku,
      label: c.itemName,
      subLabel: `${c.sku} | Category: ${c.category} (New Item)`,
      stock: 0,
      unit: c.uom
    }));
    return [...invOptions, ...catOptions];
  }, [inventory, catalogue]);
  useEffect(() => {
    if (!modal) return;
    const delayDebounceFn = setTimeout(() => {
      if (searchItemVal) {
        Promise.all([
          fetchResource("inventory", 1, 1e3, true, searchItemVal, null, true),
          fetchResource("catalogue", 1, 500, true, searchItemVal, null, true)
        ]);
      } else {
        Promise.all([
          fetchResource("inventory", 1, 2e3, true, "", null, true),
          fetchResource("catalogue", 1, 1e3, true, "", null, true)
        ]);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [modal, searchItemVal, fetchResource]);
  useEffect(() => {
    if (modal && (newTransaction.type === "Transfer Inward" || newTransaction.type === "Public Transfer Inward")) {
      fetchAvailableGatePasses();
    }
  }, [modal, newTransaction.type, fetchAvailableGatePasses]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToError();
    }
  }, [errors]);
  const validateForm = /* @__PURE__ */ __name((data2) => {
    const newErrors = {};
    if (!data2.project) newErrors.project = "Project is required";
    if (data2.project === "Other" && !data2.otherProjectName) {
      newErrors.otherProjectName = "Project Name is required";
    }
    if (!data2.store && !data2.type?.includes("Transfer")) newErrors.store = "Store / Godown is required";
    if (!data2.items || data2.items.length === 0) newErrors.items = "At least one item is required";
    data2.items?.forEach((item, index) => {
      if (!item.isMiscellaneous && !item.sku) newErrors[`item_${index}_sku`] = "Item selection required";
      if (item.isMiscellaneous && !item.itemName) newErrors[`item_${index}_itemName`] = "Item Name required";
      if (!item.qty || item.qty <= 0) newErrors[`item_${index}_qty`] = "Qty required";
      if (!item.images || item.images.length === 0) newErrors[`item_${index}_images`] = "Image required";
    });
    if (["Inward", "Inward Return", "Public Inward"].includes(data2.type)) {
      if (!data2.challanNo) newErrors.challanNo = "Challan No. is required";
      if (!data2.challanPhotos || data2.challanPhotos.length === 0) newErrors.challanPhotos = "Challan Photo is required";
    }
    if (["Outward", "Outward Return", "Public Outward"].includes(data2.type)) {
      if (!data2.personName) newErrors.personName = "Person Name is required";
    }
    if ((data2.type || "").includes("Transfer")) {
      if (!data2.destinationProject) newErrors.destinationProject = "Destination store is required";
      if (!data2.gatePassNo) newErrors.gatePassNo = "Gate Pass No. is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, "validateForm");
  const handleSubmit = /* @__PURE__ */ __name(async () => {
    if (!validateForm(newTransaction)) {
      toast.error("Please fix the errors in the form");
      return;
    }
    const items = newTransaction.items;
    try {
      if (selectedTransaction?.id) {
        const item = items[0];
        const editFinalProject = newTransaction.project === "Other" ? newTransaction.otherProjectName : newTransaction.project;
        const updateData = {
          ...newTransaction,
          items,
          sku: item.sku,
          itemName: item.itemName,
          qty: item.qty,
          unit: item.unit,
          materialPhotoUrl: item.images?.[0],
          // Recompute store for Transfer types — spread from newTransaction carries the stale value
          store: (newTransaction.type || "").includes("Transfer")
            ? ((newTransaction.type || "").includes("Outward") ? editFinalProject : newTransaction.destinationProject)
            : newTransaction.store,
        };
        if (newTransaction.type === "Inward Return") {
          updateData.vendor = newTransaction.supplier;
        } else if (newTransaction.type === "Outward Return") {
          updateData.sourceSite = newTransaction.project || newTransaction.sourceSite;
        }
        const currentType = type || newTransaction.type;
        if (currentType === "Inward" || currentType === "Transfer Inward") await updateInward(selectedTransaction.id, updateData);
        else if (currentType === "Outward" || currentType === "Transfer Outward") await updateOutward(selectedTransaction.id, updateData);
        else if (currentType === "Inward Return") await updateInwardReturn(selectedTransaction.id, updateData);
        else if (currentType === "Outward Return") await updateOutwardReturn(selectedTransaction.id, updateData);
        else toast.error(`Update not supported for type: ${currentType}`);
      } else {
        const batchId = `BATCH-${Date.now()}`;
        const prefix = newTransaction.type === "Inward" ? "INW" : newTransaction.type === "Outward" ? "OUT" : newTransaction.type === "Inward Return" ? "INR" : newTransaction.type === "Outward Return" ? "OUR" : "TRX";
        const finalProject = newTransaction.project === "Other" ? newTransaction.otherProjectName : newTransaction.project;
        const payload = {
          id: genId(prefix, Date.now() % 1e4),
          type: newTransaction.type,
          mrId: newTransaction.mrId,
          project: finalProject,
          store: (newTransaction.type || "").includes("Transfer")
            ? ((newTransaction.type || "").includes("Outward") ? finalProject : newTransaction.destinationProject)
            : newTransaction.store,
          date: newTransaction.date,
          status: "Confirmed",
          challanNo: newTransaction.challanNo,
          gatePassNo: newTransaction.gatePassNo,
          challanPhotos: newTransaction.challanPhotos || [],
          challanPhotoUrl: newTransaction.challanPhotos?.[0] || newTransaction.challanPhotoUrl || "",
          personPhotoUrl: newTransaction.personPhotoUrl,
          personImageUrl: newTransaction.personPhotoUrl,
          // Fallback for backend
          personPhotos: newTransaction.personPhotos || [],
          personName: newTransaction.personName,
          batchId,
          createdBy: user?.name || "System",
          condition: (newTransaction.condition || "Good").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
          mrNo: items[0]?.mrNo || "",
          destinationProject: newTransaction.destinationProject,
          items: items.map((item) => ({
            sku: item.sku,
            itemName: item.itemName,
            qty: Number(item.qty),
            unit: item.unit,
            remarks: item.remarks || "",
            images: item.images || [],
            materialPhotoUrl: item.images?.[0] || "",
            mrNo: item.mrNo,
            condition: (item.condition || newTransaction.condition || "Good").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
          }))
        };
        if (["Inward", "Inward Return", "Transfer Inward", "Public Transfer Inward"].includes(newTransaction.type || "")) {
          payload.supplier = newTransaction.supplier;
          payload.vendor = newTransaction.supplier;
        }
        if (newTransaction.type === "Outward Return") {
          payload.sourceSite = newTransaction.project;
          payload.handoverFrom = newTransaction.personName;
        }
        if (newTransaction.type === "Inward" || newTransaction.type === "Transfer Inward" || newTransaction.type === "Public Transfer Inward") {
          await addInward(payload);
        } else if (newTransaction.type === "Outward" || newTransaction.type === "Transfer Outward" || newTransaction.type === "Public Transfer Outward") {
          await addOutward(payload);
        } else if (newTransaction.type === "Inward Return") {
          await addInwardReturn(payload);
        } else if (newTransaction.type === "Outward Return") {
          await addOutwardReturn(payload);
        } else {
          await addTransaction(payload);
        }
      }
      setModal(false);
      setSelectedTransaction(null);
      setNewTransaction({ ...INITIAL_TRANSACTION, type: type || "Inward" });
      setErrors({});
      toast.success(`${newTransaction.type} ${selectedTransaction?.id ? "updated" : "recorded"} successfully`);
    } catch (error) {
      setErrors({ form: error.message });
      toast.error(error.message || "Operation failed");
    }
  }, "handleSubmit");
  const handleGatePassSelect = /* @__PURE__ */ __name(async (gatePassNo) => {
    if (!gatePassNo) return;
    try {
      setActionLoading(true);
      const res = await api.get(`gate-passes/${gatePassNo}`);
      const outwardTrx = res.data;
      setNewTransaction((prev) => ({
        ...prev,
        gatePassNo: outwardTrx.gatePassNo,
        project: outwardTrx.project,                         // Source store = where goods came FROM
        destinationProject: outwardTrx.destinationProject,   // Destination store = where we're receiving
        sourceSite: outwardTrx.project,
        items: outwardTrx.items.map((it) => ({
          ...it,
          outwardQty: it.qty,
          qty: it.qty,
          variance: 0
        }))
      }));
      toast.success("Items loaded from Gate Pass");
    } catch (error) {
      const msg = error.response?.data?.message || error.message || "Failed to load Gate Pass";
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  }, "handleGatePassSelect");
  const addItem = /* @__PURE__ */ __name(() => {
    const newItem = {
      sku: "",
      itemName: "",
      qty: 0,
      unit: "NOS",
      category: "",
      liveStock: 0,
      images: [],
      mrNo: ""
    };
    setNewTransaction((prev) => ({ ...prev, items: [...prev.items || [], newItem] }));
  }, "addItem");
  const addMiscellaneousItem = /* @__PURE__ */ __name(() => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const newItem = {
      sku: `MISC/GEN/${randomNum}`,
      itemName: "",
      qty: 0,
      unit: "NOS",
      category: "",
      liveStock: 0,
      images: [],
      mrNo: "",
      isMiscellaneous: true
    };
    setNewTransaction((prev) => ({ ...prev, items: [...prev.items || [], newItem] }));
  }, "addMiscellaneousItem");
  const removeItem = /* @__PURE__ */ __name((index) => {
    const items = [...newTransaction.items || []];
    items.splice(index, 1);
    setNewTransaction((prev) => ({ ...prev, items }));
  }, "removeItem");
  const handleRowItemSelect = /* @__PURE__ */ __name((index, sku) => {
    const inv = inventory.find((i) => i.sku === sku) || catalogue.find((c) => c.sku === sku);
    if (!inv) return;
    const items = [...newTransaction.items || []];
    items[index] = {
      ...items[index],
      sku,
      itemName: inv.itemName,
      unit: inv.unit || inv.uom || "NOS",
      category: inv.category,
      liveStock: inv.liveStock || 0
    };
    setNewTransaction((prev) => ({ ...prev, items }));
  }, "handleRowItemSelect");
  const updateItem = /* @__PURE__ */ __name((index, data2) => {
    const items = [...newTransaction.items || []];
    const updatedItem = { ...items[index], ...data2 };
    if (updatedItem.outwardQty !== void 0) {
      updatedItem.variance = Number(updatedItem.outwardQty) - Number(updatedItem.qty || 0);
    }
    items[index] = updatedItem;
    setNewTransaction((prev) => ({ ...prev, items }));
  }, "updateItem");
  const handleImageUpload = /* @__PURE__ */ __name(async (index, file) => {
    setLoadingField(`item-img-${index}`);
    try {
      const { url } = await uploadImage(file);
      const items = [...newTransaction.items || []];
      items[index].images = [...items[index].images || [], url];
      setNewTransaction((prev) => ({ ...prev, items }));
      toast.success("Image uploaded");
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setLoadingField(null);
    }
  }, "handleImageUpload");
  const removeImage = /* @__PURE__ */ __name((itemIndex, imgIndex) => {
    const items = [...newTransaction.items || []];
    items[itemIndex].images = items[itemIndex].images.filter((_, i) => i !== imgIndex);
    setNewTransaction((prev) => ({ ...prev, items }));
  }, "removeImage");
  const canCreate = /* @__PURE__ */ __name(() => {
    if (!type) {
      return hasPermission("CREATE_INWARD") || hasPermission("CREATE_OUTWARD") || hasPermission("CREATE_TRANSFER_INWARD") || hasPermission("CREATE_TRANSFER_OUTWARD") || hasPermission("CREATE_INWARD_RETURN") || hasPermission("CREATE_OUTWARD_RETURN");
    }
    if (type === "Inward") return hasPermission("CREATE_INWARD");
    if (type === "Outward") return hasPermission("CREATE_OUTWARD");
    if (type === "Inward Return") return hasPermission("CREATE_INWARD_RETURN");
    if (type === "Outward Return") return hasPermission("CREATE_OUTWARD_RETURN");
    if (type === "Transfer Inward") return hasPermission("CREATE_TRANSFER_INWARD");
    if (type === "Transfer Outward") return hasPermission("CREATE_TRANSFER_OUTWARD");
    return false;
  }, "canCreate");
  const getEditPermission = /* @__PURE__ */ __name((trxType) => {
    const t = trxType || type || "";
    if (t.includes("Inward Return")) return "EDIT_INWARD_RETURN";
    if (t.includes("Outward Return")) return "EDIT_OUTWARD_RETURN";
    if (t.includes("Transfer Inward")) return "EDIT_TRANSFER_INWARD";
    if (t.includes("Transfer Outward")) return "EDIT_TRANSFER_OUTWARD";
    if (t.includes("Inward") || t === "GRN" || t === "Manual") return "EDIT_INWARD";
    if (t.includes("Outward") || t === "Manual") return "EDIT_OUTWARD";
    return "";
  }, "getEditPermission");
  const getDeletePermission = /* @__PURE__ */ __name((trxType) => {
    const t = trxType || type || "";
    if (t.includes("Inward Return")) return "DELETE_INWARD_RETURN";
    if (t.includes("Outward Return")) return "DELETE_OUTWARD_RETURN";
    if (t.includes("Transfer Inward")) return "DELETE_TRANSFER_INWARD";
    if (t.includes("Transfer Outward")) return "DELETE_TRANSFER_OUTWARD";
    if (t.includes("Inward") || t === "GRN" || t === "Manual") return "DELETE_INWARD";
    if (t.includes("Outward") || t === "Manual") return "DELETE_OUTWARD";
    return "";
  }, "getDeletePermission");
  const getTypeIcon = /* @__PURE__ */ __name((type2) => {
    if (!type2) return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
    if (type2.includes("Inward")) return <ArrowDownLeft className="w-4 h-4 text-emerald-500" />;
    if (type2.includes("Outward")) return <ArrowUpRight className="w-4 h-4 text-orange-500" />;
    return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
  }, "getTypeIcon");
  return <div className="flex flex-col gap-6 min-h-screen">
      <PageHeader
    title={type === "Inward" ? "Inward Transactions" : type === "Outward" ? "Outward & Material Issue" : type ? `${type} Transactions` : "All Transactions"}
    sub={type === "Inward" ? "Record of all materials received" : type === "Outward" ? "Issue materials to site locations" : "Manage inventory movements"}
    actions={canCreate() && <Btn
      label={type === "Inward" ? "Manual Inward" : type === "Outward" ? "Issue Material" : `New ${type || "Transaction"}`}
      icon={Plus}
      onClick={() => {
        const isTransferOutward = (type || "Inward") === "Transfer Outward" || (type || "Inward") === "Public Transfer Outward";
        setNewTransaction({
          ...INITIAL_TRANSACTION,
          type: type || "Inward",
          gatePassNo: isTransferOutward ? genId("GP", Date.now() % 1e3) : ""
        });
        setModal(true);
      }}
    />}
  />

      <div className="mb-6 flex flex-col gap-3">
        {type === "Outward" && <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
            <button
    onClick={() => setActiveTab("history")}
    className={cn(
      "px-4 py-2 rounded-lg text-xs font-bold transition-all tracking-wider",
      activeTab === "history" ? "bg-white dark:bg-gray-900 shadow-sm text-primary" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
    )}
  >
              Outward History
            </button>
            <button
    onClick={() => {
      setActiveTab("ready");
      fetchResource("mr-allocations", 1, 100);
    }}
    className={cn(
      "px-4 py-2 rounded-lg text-xs font-bold transition-all tracking-wider",
      activeTab === "ready" ? "bg-white dark:bg-gray-900 shadow-sm text-primary" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
    )}
  >
              Ready for Issue (Allocated)
            </button>
          </div>}
        {activeTab === "history" && <FilterRow
    showClear={!!(searchQuery || startDate || endDate || filterProject || !type && filterType)}
    onClearAll={() => {
      setSearchQuery("");
      setStartDate("");
      setEndDate("");
      setFilterProject("");
      if (!type) setFilterType("");
    }}
  >
          <SearchFilter
    value={searchQuery}
    onChange={setSearchQuery}
    placeholder={type === "Inward" ? "Search SKU, Name, Supplier, Challan..." : type === "Outward" ? "Search records..." : "Search by ID, Item, Project..."}
    className="flex-1 min-w-[200px]"
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
          {!type && <SelectFilter
    value={filterType}
    onChange={setFilterType}
    options={filterTypeOptions}
    placeholder="All Types"
  />}
        </FilterRow>}
        {activeTab === "ready" && <FilterRow
    showClear={!!(allocSearch || allocFilterRequester)}
    onClearAll={() => { setAllocSearch(""); setAllocFilterRequester(""); }}
  >
          <SearchFilter
    value={allocSearch}
    onChange={setAllocSearch}
    placeholder="Search MR No., Requester, Material..."
    className="flex-1 min-w-[200px]"
  />
          <SelectFilter
    value={allocFilterRequester}
    onChange={setAllocFilterRequester}
    options={requesterOptions}
    placeholder="All Requesters"
  />
        </FilterRow>}
      </div>

      <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-1">
        {activeTab === "history" ? <TableVirtuoso
    style={{ height: "calc(100vh - 350px)", minHeight: "500px" }}
    data={data || []}
    context={{ inventory }}
    increaseViewportBy={300}
    endReached={() => {
      if (pagination && page < pagination.pages && !loading && !actionLoading) {
        setPage((prev) => prev + 1);
      }
    }}
    components={{
      Table: (props) => (
        <table 
          {...props} 
          className={cn(
            "w-full text-left text-[13px] border-collapse",
            type === "Transfer Outward" || type === "Transfer Inward" ? "min-w-[1050px]" : "min-w-[1000px]"
          )} 
        />
      ),
      TableRow: (props) => <tr {...props} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors border-b border-gray-100 dark:border-gray-800" />,
      TableHead: React.forwardRef((props, ref) => <thead {...props} ref={ref} className="z-10" />)
    }}
    fixedHeaderContent={() => {
      const headerClass = "px-3 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 whitespace-nowrap overflow-hidden sticky top-0 z-10 sticky-th";
      return <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-[#E8ECF0] dark:border-gray-800">
                {type === "Transfer Inward" || type === "Transfer Outward" ? <>
                    <th className={cn(headerClass, "w-[148px] block md:table-cell")}><span className="md:hidden text-gray-900 dark:text-white text-[13px]">Transaction Details</span><span className="hidden md:inline">Date</span></th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[110px]")}>From Site</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[110px]")}>To Site</th>
                    <th className={cn(headerClass, "hidden md:table-cell")}>Item</th>
                    <th className={cn(headerClass, "hidden md:table-cell text-right w-[70px]")}>Qty</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[110px]")}>Gate Pass No.</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[80px]")}>Gate Pass</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[80px]")}>Photos</th>
                    {type === "Transfer Outward" && <>
                      <th className={cn(headerClass, "hidden md:table-cell w-[90px]")}>Status</th>
                      <th className={cn(headerClass, "hidden md:table-cell w-[80px] text-right")}>Variance</th>
                    </>}
                    <th className={cn(headerClass, "hidden md:table-cell text-right w-[100px]")}>Actions</th>
                  </> : type === "Inward" || type === "Inward Return" ? <>
                    <th className={cn(headerClass, "w-[148px] block md:table-cell")}><span className="md:hidden text-gray-900 dark:text-white text-[13px]">Transaction Details</span><span className="hidden md:inline">Date</span></th>
                    <th className={cn(headerClass, "hidden md:table-cell")}>Item</th>
                    <th className={cn(headerClass, "hidden md:table-cell text-right w-[80px]")}>Qty</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[130px]")}>Godown</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[130px]")}>Supplier</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[150px]")}>Challan / MR</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[110px]")}>Photos</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[100px]")}>Type</th>
                    <th className={cn(headerClass, "hidden md:table-cell text-right w-[150px]")}>Actions</th>
                  </> : type === "Outward" || type === "Outward Return" ? <>
                    <th className={cn(headerClass, "w-[148px] block md:table-cell")}><span className="md:hidden text-gray-900 dark:text-white text-[13px]">Transaction Details</span><span className="hidden md:inline">Date</span></th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[120px]")}>Project</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[110px]")}>Godown</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[110px]")}>Category</th>
                    <th className={cn(headerClass, "hidden md:table-cell")}>Item</th>
                    <th className={cn(headerClass, "hidden md:table-cell text-right w-[80px]")}>Qty</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[120px]")}>
                      {["Transfer Inward", "Transfer Outward"].includes(type || "") ? "Gate Pass Details" : "Person Name"}
                    </th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[120px]")}>Photos</th>
                    <th className={cn(headerClass, "hidden md:table-cell text-right w-[150px]")}>Actions</th>
                  </> : <>
                    <th className={cn(headerClass, "w-[148px] block md:table-cell")}><span className="md:hidden text-gray-900 dark:text-white text-[13px]">Transaction Details</span><span className="hidden md:inline">Date</span></th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[110px]")}>Type</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[130px]")}>Project</th>
                    <th className={cn(headerClass, "hidden md:table-cell w-[120px]")}>Gate Pass</th>
                    <th className={cn(headerClass, "hidden md:table-cell")}>Items</th>
                    <th className={cn(headerClass, "hidden md:table-cell text-right w-[150px]")}>Actions</th>
                  </>}
              </tr>;
    }}
    itemContent={(_index, trx, { inventory: currentInventory }) => {
      const isTransfer = type === "Transfer Inward" || type === "Transfer Outward";
      const isInward = type === "Inward" || type === "Inward Return";
      const isOutward = type === "Outward" || type === "Outward Return";
      return <>
                {isTransfer ? <>
                    <td className="w-full md:w-auto block md:table-cell p-0 md:p-3">
                      <div className="md:hidden p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-[10px] font-bold text-gray-400">{formatDateTime(trx.date)}</p>
                            <h4 className="text-[14px] font-bold text-gray-900 dark:text-white mt-0.5">
                              {trx.itemName || trx.items?.[0]?.itemName || "Multiple Items"}
                            </h4>
                            <p className="text-[11px] font-mono text-gray-500">{trx.sku || trx.items?.[0]?.sku}</p>
                          </div>
                          <div className="text-right">
                             <span className={cn("text-lg font-black", type === "Transfer Inward" ? "text-emerald-500" : "text-orange-500")}>
                               {type === "Transfer Inward" ? "+" : "-"}{trx.qty || trx.items?.[0]?.qty}
                             </span>
                             <p className="text-[10px] font-bold text-gray-400">{trx.unit || trx.items?.[0]?.unit}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-3 text-[12px]">
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 tracking-wider">From</p>
                            <p className="font-medium text-gray-700 dark:text-gray-300">{trx.project}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-gray-400 tracking-wider">To</p>
                            <p className="font-medium text-gray-700 dark:text-gray-300">{trx.destinationProject || "N/A"}</p>
                          </div>
                        </div>
                        {type === "Transfer Outward" && (() => {
                          const st = trx.transferStatus || "Pending";
                          const colors = { "Pending": "bg-amber-100 text-amber-700", "Fulfilled": "bg-emerald-100 text-emerald-700", "Partially Complete": "bg-blue-100 text-blue-700" };
                          return <div className="flex items-center gap-2 mb-3">
                            <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold", colors[st] || colors["Pending"])}>{st}</span>
                            {(st === "Partially Complete" || st === "Fulfilled") && trx.transferVariance > 0 && <span className="text-[10px] text-red-500 font-bold">Variance: -{trx.transferVariance}</span>}
                          </div>;
                        })()}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-800">
                           <div className="flex items-center gap-2">
                             <Btn icon={Eye} small outline onClick={() => {
        setSelectedTransaction(trx);
        setViewModal(true);
      }} />
                             {hasPermission(getEditPermission(trx.type)) && <Btn icon={Pencil} small outline onClick={() => {
        setSelectedTransaction(trx);
        setModal(true);
        setNewTransaction({ ...trx, items: trx.items || [] });
      }} />}
                           </div>
                           <div className="flex -space-x-2">
                              {trx.items?.slice(0, 3).map((item, i) => item.images?.[0] && <img key={i} src={item.images[0]} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-900 object-cover" />)}
                           </div>
                        </div>
                      </div>
                      <div className="hidden md:block text-[13px] text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatDateTime(trx.date)}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 text-[13px] font-bold text-gray-900 dark:text-white overflow-hidden"><span className="block truncate" title={trx.project}>{trx.project}</span></td>
                    <td className="hidden md:table-cell px-3 py-2.5 text-[13px] font-bold text-gray-900 dark:text-white overflow-hidden"><span className="block truncate" title={trx.destinationProject || ""}>{trx.destinationProject || "N/A"}</span></td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <div className="flex flex-col max-w-[200px]">
                        <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate" title={trx.itemName || trx.items?.[0]?.itemName || inventory.find((i) => i.sku === (trx.sku || trx.items?.[0]?.sku))?.itemName || catalogue.find((c) => c.sku === (trx.sku || trx.items?.[0]?.sku))?.itemName || trx.sku || "N/A"}>
                          {trx.itemName || trx.items?.[0]?.itemName || inventory.find((i) => i.sku === (trx.sku || trx.items?.[0]?.sku))?.itemName || catalogue.find((c) => c.sku === (trx.sku || trx.items?.[0]?.sku))?.itemName || trx.sku || "N/A"}
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono truncate">{trx.sku || trx.items?.[0]?.sku}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span className={`text-[14px] font-black ${type === "Transfer Inward" ? "text-emerald-500" : "text-orange-500"}`}>
                          {type === "Transfer Inward" ? "+" : "-"}{trx.qty || trx.items?.[0]?.qty}
                        </span>
                        <span className={`text-[11px] font-bold ${type === "Transfer Inward" ? "text-emerald-500" : "text-orange-500"}`}>
                          {trx.unit || trx.items?.[0]?.unit}
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-[13px] text-gray-600 dark:text-gray-400 font-bold max-w-[150px] truncate" title={trx.gatePassNo || ""}>{trx.gatePassNo || "N/A"}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-[13px] text-gray-600 dark:text-gray-400 max-w-[150px]">
                      <p className="font-bold truncate" title={trx.personName || trx.handoverTo || ""}>{trx.personName || trx.handoverTo || "N/A"}</p>
                      {(trx.personPhotoUrl || trx.personImageUrl || trx.personPhotos && trx.personPhotos.length > 0) && <img
        src={trx.personPhotoUrl || trx.personImageUrl || trx.personPhotos[0]}
        className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 object-cover mt-1 cursor-pointer"
        onClick={() => setPreviewImage(trx.personPhotoUrl || trx.personImageUrl || trx.personPhotos[0])}
        referrerPolicy="no-referrer"
      />}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <div className="flex -space-x-2">
                        {trx.items?.slice(0, 3).map((item, i) => item.images?.[0] && <img
        key={i}
        src={item.images[0]}
        className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 object-cover cursor-pointer hover:scale-110 transition-transform"
        onClick={() => setPreviewImage(item.images[0])}
        referrerPolicy="no-referrer"
      />)}
                      </div>
                    </td>
                    {type === "Transfer Outward" && <>
                      <td className="hidden md:table-cell px-4 py-3">
                        {(() => {
                          const st = trx.transferStatus || "Pending";
                          const colors = {
                            "Pending": "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                            "Fulfilled": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                            "Partially Complete": "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                          };
                          return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide", colors[st] || colors["Pending"])}>{st}</span>;
                        })()}
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-right">
                        {(trx.transferStatus === "Fulfilled" || trx.transferStatus === "Partially Complete") && trx.transferVariance !== undefined ? (
                          <span className={cn("text-[13px] font-bold tabular-nums", trx.transferVariance > 0 ? "text-red-500" : "text-emerald-500")}>
                            {trx.transferVariance > 0 ? `-${trx.transferVariance}` : "0"}
                          </span>
                        ) : <span className="text-[12px] text-gray-400">—</span>}
                      </td>
                    </>}
                    <td className="hidden md:table-cell px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="View Details"
                          onClick={() => {
                            setSelectedTransaction(trx);
                            setViewModal(true);
                          }}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasPermission(getEditPermission(trx.type)) && <button
                          title="Edit Transaction"
                          onClick={() => {
                            setSelectedTransaction(trx);
                            setModal(true);
                            setNewTransaction({
                              ...trx,
                              gatePassNo: trx.gatePassNo,
                              challanPhotoUrl: trx.challanPhotoUrl || trx.challanImageUrl,
                              materialPhotoUrl: trx.materialPhotoUrl || trx.materialImageUrl,
                              items: trx.items || [{
                                sku: trx.sku,
                                itemName: trx.itemName,
                                qty: trx.qty,
                                unit: trx.unit,
                                remarks: trx.remarks,
                                images: trx.materialPhotoUrl || trx.materialImageUrl ? [trx.materialPhotoUrl || trx.materialImageUrl] : []
                              }]
                            });
                          }}
                          className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>}
                        {hasPermission(getDeletePermission(trx.type)) && <button
                          title="Delete Transaction"
                          onClick={() => setDeleteConfirm(trx.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>}
                      </div>
                    </td>
                  </> : isInward ? <>
                    <td className="w-full md:w-auto block md:table-cell p-0 md:p-3">
                       <div className="md:hidden p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                         <div className="flex justify-between items-start mb-3">
                           <div>
                             <p className="text-[10px] font-bold text-gray-400">{formatDateTime(trx.date)}</p>
                             <h4 className="text-[14px] font-bold text-gray-900 dark:text-white mt-0.5">
                               {trx.itemName || trx.items?.[0]?.itemName || "Inward Transaction"}
                             </h4>
                             <p className="text-[11px] font-mono text-gray-500">{trx.sku || trx.items?.[0]?.sku}</p>
                           </div>
                           <div className="text-right">
                              <span className="text-lg font-black text-emerald-500">+{trx.qty || trx.items?.[0]?.qty}</span>
                              <p className="text-[10px] font-bold text-emerald-500">{trx.unit || trx.items?.[0]?.unit}</p>
                           </div>
                         </div>
                         <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-[12px]">
                            <div>
                              <p className="text-[9px] font-bold text-gray-400">Vendor</p>
                              <p className="font-medium text-gray-700 dark:text-gray-300">{suppliers.find((s) => s.id === (trx.supplier || trx.vendor))?.companyName || trx.supplierName || trx.supplier || trx.vendor || "N/A"}</p>
                            </div>
                            <div>
                               <p className="text-[9px] font-bold text-gray-400">Ref / MR</p>
                               <p className="font-medium text-gray-700 dark:text-gray-300">{trx.challanNo || trx.challan || "N/A"} / {trx.mrNo || "N/A"}</p>
                            </div>
                         </div>
                         <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                               <Btn icon={Eye} small outline onClick={() => {
        setSelectedTransaction(trx);
        setViewModal(true);
      }} />
                               {hasPermission(getEditPermission(trx.type)) && <Btn icon={Pencil} small outline onClick={() => {
        setSelectedTransaction(trx);
        setModal(true);
        setNewTransaction({ ...trx, items: trx.items || [] });
      }} />}
                            </div>
                            <Badge text={trx.type || "Manual"} color="gray" />
                         </div>
                       </div>
                       <div className="hidden md:block text-[13px] text-gray-600 dark:text-gray-400 whitespace-nowrap">
                         {formatDateTime(trx.date)}
                       </div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 overflow-hidden">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate block" title={trx.itemName || trx.items?.[0]?.itemName || inventory.find((i) => i.sku === (trx.sku || trx.items?.[0]?.sku))?.itemName || catalogue.find((c) => c.sku === (trx.sku || trx.items?.[0]?.sku))?.itemName || trx.sku || "N/A"}>
                          {trx.itemName || trx.items?.[0]?.itemName || inventory.find((i) => i.sku === (trx.sku || trx.items?.[0]?.sku))?.itemName || catalogue.find((c) => c.sku === (trx.sku || trx.items?.[0]?.sku))?.itemName || trx.sku || "N/A"}
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono truncate block">{trx.sku || trx.items?.[0]?.sku}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[14px] font-black text-emerald-500">+{trx.qty || trx.items?.[0]?.qty}</span>
                        <span className="text-[11px] font-bold text-emerald-500 ">{trx.unit || trx.items?.[0]?.unit}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 overflow-hidden"><span className="block truncate text-[13px] text-orange-600 dark:text-orange-400 font-medium" title={trx.store || ""}>{trx.store || "—"}</span></td>
                    <td className="hidden md:table-cell px-3 py-2.5 overflow-hidden"><span className="block truncate text-[13px] text-gray-600 dark:text-gray-400" title={suppliers.find((s) => s.id === (trx.supplier || trx.vendor))?.companyName || trx.supplierName || trx.supplier || trx.vendor || ""}>{suppliers.find((s) => s.id === (trx.supplier || trx.vendor))?.companyName || trx.supplierName || trx.supplier || trx.vendor}</span></td>
                    <td className="hidden md:table-cell px-3 py-2.5 overflow-hidden">
                      <span className="block truncate text-[13px] text-gray-600 dark:text-gray-400" title={`${trx.challanNo || trx.challan || ""} / ${trx.mrNo || ""}`}>{trx.challanNo || trx.challan} / {trx.mrNo}</span>
                      <span className="block truncate text-[11px] font-bold text-orange-600">{trx.condition || trx.items?.[0]?.condition || "Good"}</span>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <div className="flex -space-x-2">
                        {(trx.materialPhotoUrl || trx.materialImageUrl) && <img
        src={trx.materialPhotoUrl || trx.materialImageUrl}
        className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 object-cover cursor-pointer hover:scale-110 transition-transform"
        onClick={() => setPreviewImage(trx.materialPhotoUrl || trx.materialImageUrl)}
        referrerPolicy="no-referrer"
        title="Material Photo"
      />}
                        
                        {trx.challanPhotos && trx.challanPhotos.length > 0 ? trx.challanPhotos.slice(0, 2).map((img, idx) => <div key={`top-challan-${idx}`} className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => setPreviewImage(img)}>
                              <img
        src={img}
        className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 object-cover"
        referrerPolicy="no-referrer"
      />
                              <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center rounded-lg">
                                <FileText className="w-3 h-3 text-orange-600" />
                              </div>
                            </div>) : (trx.challanPhotoUrl || trx.challanImageUrl) && <div className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => setPreviewImage(trx.challanPhotoUrl || trx.challanImageUrl)}>
                            <img
        src={trx.challanPhotoUrl || trx.challanImageUrl}
        className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 object-cover"
        referrerPolicy="no-referrer"
      />
                            <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center rounded-lg">
                              <FileText className="w-3 h-3 text-orange-600" />
                            </div>
                          </div>}

                        {trx.items?.map((item, idx) => {
        const itemChallanImg = item.challanPhotos?.[0] || item.challanPhotoUrl;
        if (!itemChallanImg) return null;
        return <div key={`item-challan-${item.sku}-${idx}`} className="relative cursor-pointer hover:scale-110 transition-transform" onClick={() => setPreviewImage(itemChallanImg)}>
                              <img
          src={itemChallanImg}
          className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 object-cover"
          referrerPolicy="no-referrer"
        />
                              <div className="absolute inset-0 bg-orange-500/20 flex items-center justify-center rounded-lg">
                                <FileText className="w-3 h-3 text-orange-600" />
                              </div>
                            </div>;
      })}

                        {trx.items?.filter((i) => i.images?.length > 0 && i.images[0] !== (trx.materialPhotoUrl || trx.materialImageUrl)).slice(0, 2).map((item, idx) => <img
        key={`item-img-${idx}`}
        src={item.images[0]}
        className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 object-cover cursor-pointer hover:scale-110 transition-transform"
        onClick={() => setPreviewImage(item.images[0])}
        referrerPolicy="no-referrer"
      />)}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-[13px]">
                      <Badge text={trx.type || "Manual"} color="gray" />
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="View Details"
                          onClick={() => {
                            setSelectedTransaction(trx);
                            setViewModal(true);
                          }}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasPermission(getEditPermission(trx.type)) && <button
                          title="Edit Transaction"
                          onClick={() => {
                            setSelectedTransaction(trx);
                            setModal(true);
                            setNewTransaction({
                              ...trx,
                              gatePassNo: trx.gatePassNo,
                              challanPhotoUrl: trx.challanPhotoUrl || trx.challanImageUrl,
                              materialPhotoUrl: trx.materialPhotoUrl || trx.materialImageUrl,
                              items: trx.items || [{
                                sku: trx.sku,
                                itemName: trx.itemName,
                                qty: trx.qty,
                                unit: trx.unit,
                                remarks: trx.remarks,
                                images: trx.materialPhotoUrl || trx.materialImageUrl ? [trx.materialPhotoUrl || trx.materialImageUrl] : []
                              }]
                            });
                          }}
                          className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>}
                        {hasPermission(getDeletePermission(trx.type)) && <button
                          title="Delete Transaction"
                          onClick={() => setDeleteConfirm(trx.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>}
                      </div>
                    </td>
                  </> : isOutward ? <>
                    <td className="w-full md:w-auto block md:table-cell p-0 md:p-3">
                       <div className="md:hidden p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                          <div className="flex justify-between items-start mb-3">
                             <div>
                               <p className="text-[10px] font-bold text-gray-400">{formatDateTime(trx.date)}</p>
                               <h4 className="text-[14px] font-bold text-gray-900 dark:text-white mt-0.5">
                                 {trx.itemName || trx.items?.[0]?.itemName || "Outward Item"}
                               </h4>
                               <p className="text-[11px] font-mono text-gray-500">{trx.sku || trx.items?.[0]?.sku}</p>
                             </div>
                             <div className="text-right">
                                <span className="text-lg font-black text-red-500">-{trx.qty || trx.items?.[0]?.qty}</span>
                                <p className="text-[10px] font-bold text-red-500">{trx.unit || trx.items?.[0]?.unit}</p>
                             </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mb-4 text-[12px]">
                             <div>
                               <p className="text-[9px] font-bold text-gray-400">Project</p>
                               <p className="font-medium text-gray-700 dark:text-gray-300 truncate">{trx.project || trx.sourceSite || "Site"}</p>
                             </div>
                             <div>
                               <p className="text-[9px] font-bold text-gray-400">Receiver</p>
                               <p className="font-medium text-gray-700 dark:text-gray-300 truncate">{trx.personName || trx.handoverTo || "N/A"}</p>
                             </div>
                          </div>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-800">
                             <div />
                             <div className="flex items-center gap-2">
                                <Btn icon={Eye} small outline onClick={() => {
        setSelectedTransaction(trx);
        setViewModal(true);
      }} />
                                {hasPermission(getEditPermission(trx.type)) && <Btn icon={Pencil} small outline onClick={() => {
        setSelectedTransaction(trx);
        setModal(true);
        setNewTransaction({ ...trx, items: trx.items || [] });
      }} />}
                             </div>
                          </div>
                       </div>
                       <div className="hidden md:block text-[13px] text-gray-600 dark:text-gray-400 whitespace-nowrap overflow-hidden">{formatDateTime(trx.date)}</div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 overflow-hidden"><span className="block truncate text-[13px] text-gray-600 dark:text-gray-400" title={trx.project || trx.sourceSite || ""}>{trx.project || trx.sourceSite}</span></td>
                    <td className="hidden md:table-cell px-3 py-2.5 overflow-hidden"><span className="block truncate text-[13px] text-orange-600 dark:text-orange-400 font-medium" title={trx.store || ""}>{trx.store || "—"}</span></td>
                    <td className="hidden md:table-cell px-3 py-2.5 overflow-hidden"><span className="block truncate text-[13px] text-gray-600 dark:text-gray-400">{currentInventory.find((i) => i.sku === (trx.sku || trx.items?.[0]?.sku))?.category || "Hardware"}</span></td>
                    <td className="hidden md:table-cell px-3 py-2.5 overflow-hidden">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[13px] font-bold text-gray-900 dark:text-white truncate block" title={trx.itemName || trx.items?.[0]?.itemName || inventory.find((i) => i.sku === (trx.sku || trx.items?.[0]?.sku))?.itemName || catalogue.find((c) => c.sku === (trx.sku || trx.items?.[0]?.sku))?.itemName || trx.sku || "N/A"}>
                          {trx.itemName || trx.items?.[0]?.itemName || inventory.find((i) => i.sku === (trx.sku || trx.items?.[0]?.sku))?.itemName || catalogue.find((c) => c.sku === (trx.sku || trx.items?.[0]?.sku))?.itemName || trx.sku || "N/A"}
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono truncate block">{trx.sku || trx.items?.[0]?.sku}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[14px] font-black text-red-500">-{trx.qty || trx.items?.[0]?.qty}</span>
                        <span className="text-[11px] font-bold text-red-500 ">{trx.unit || trx.items?.[0]?.unit}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-3 py-2.5 overflow-hidden"><span className="block truncate text-[13px] text-gray-600 dark:text-gray-400" title={trx.personName || trx.handoverTo || trx.handoverFrom || ""}>{trx.personName || trx.handoverTo || trx.handoverFrom}</span></td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <div className="flex -space-x-2">
                        {(trx.materialPhotoUrl || trx.materialImageUrl) && <img
        src={trx.materialPhotoUrl || trx.materialImageUrl}
        className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 object-cover cursor-pointer hover:scale-110 transition-transform"
        onClick={() => setPreviewImage(trx.materialPhotoUrl || trx.materialImageUrl)}
        referrerPolicy="no-referrer"
      />}
                        {trx.personPhotoUrl && <img
        src={trx.personPhotoUrl}
        className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 object-cover cursor-pointer hover:scale-110 transition-transform"
        onClick={() => setPreviewImage(trx.personPhotoUrl)}
        referrerPolicy="no-referrer"
      />}
                        {trx.items?.filter((i) => i.images?.length > 0 && i.images[0] !== (trx.materialPhotoUrl || trx.materialImageUrl)).slice(0, 2).map((item, idx) => <img
        key={idx}
        src={item.images[0]}
        className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 object-cover cursor-pointer hover:scale-110 transition-transform"
        onClick={() => setPreviewImage(item.images[0])}
        referrerPolicy="no-referrer"
      />)}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="View Details"
                          onClick={() => {
                            setSelectedTransaction(trx);
                            setViewModal(true);
                          }}
                          className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {hasPermission(getEditPermission(trx.type)) && <button
                          title="Edit Transaction"
                          onClick={() => {
                            setSelectedTransaction(trx);
                            setModal(true);
                            setNewTransaction({
                              ...trx,
                              gatePassNo: trx.gatePassNo,
                              challanPhotoUrl: trx.challanPhotoUrl || trx.challanImageUrl,
                              materialPhotoUrl: trx.materialPhotoUrl || trx.materialImageUrl,
                              items: trx.items || [{
                                sku: trx.sku,
                                itemName: trx.itemName,
                                qty: trx.qty,
                                unit: trx.unit,
                                remarks: trx.remarks,
                                images: trx.materialPhotoUrl || trx.materialImageUrl ? [trx.materialPhotoUrl || trx.materialImageUrl] : []
                              }]
                            });
                          }}
                          className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>}
                        {hasPermission(getDeletePermission(trx.type)) && <button
                          title="Delete Transaction"
                          onClick={() => setDeleteConfirm(trx.id)}
                          className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>}
                      </div>
                    </td>
                  </> : <>
                    <td className="w-full md:w-auto block md:table-cell p-0 md:p-3">
                       <div className="md:hidden p-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                          <div className="flex justify-between items-center mb-2">
                             <p className="text-[10px] font-bold text-gray-400">{formatDateTime(trx.date)}</p>
                             <div className="flex items-center gap-1">
                                {getTypeIcon(trx.type)}
                                <Badge text={trx.type} color="blue" />
                             </div>
                          </div>
                          <h4 className="text-[14px] font-bold text-gray-900 dark:text-white">{trx.project || "N/A"}</h4>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {trx.items?.slice(0, 3).map((item, i) => <Badge key={i} text={`${item.qty} ${item.unit} ${item.itemName}`} color="gray" />)}
                            {(trx.items?.length || 0) > 3 && <Badge text={`+${(trx.items?.length || 0) - 3} more`} color="gray" />}
                          </div>
                          <div className="flex items-center justify-end gap-2 mt-4">
                             <Btn icon={Eye} small outline onClick={() => {
        setSelectedTransaction(trx);
        setViewModal(true);
      }} />
                             {hasPermission(getEditPermission(trx.type)) && <Btn icon={Pencil} small outline onClick={() => {
        setSelectedTransaction(trx);
        setModal(true);
        setNewTransaction({ ...trx });
      }} />}
                          </div>
                       </div>
                       <div className="hidden md:block">
                         <p className="text-[13px] font-bold text-gray-900 dark:text-white">{formatDateTime(trx.date)}</p>
                       </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(trx.type)}
                        <span className="text-[12px] font-medium text-gray-700 dark:text-gray-300">{trx.type}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-[13px] text-gray-600 dark:text-gray-400 max-w-[150px] truncate" title={trx.project || ""}>{trx.project}</td>
                    <td className="hidden md:table-cell px-4 py-3 text-[13px] font-bold text-gray-900 dark:text-white font-mono max-w-[150px] truncate" title={trx.gatePassNo || "-"}>{trx.gatePassNo || "-"}</td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {trx.items?.slice(0, 2).map((item, i) => <Badge key={i} text={`${item.qty} ${item.unit} ${item.itemName}`} color="gray" />)}
                        {(trx.items?.length || 0) > 2 && <Badge text={`+${(trx.items?.length || 0) - 2} more`} color="gray" />}
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
        title="View Details"
        onClick={() => {
          setSelectedTransaction(trx);
          setViewModal(true);
        }}
        className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
      >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        {hasPermission(getEditPermission(trx.type)) && <button
        title="Edit Transaction"
        onClick={() => {
          setSelectedTransaction(trx);
          setModal(true);
          setNewTransaction({
            ...trx,
            gatePassNo: trx.gatePassNo,
            challanPhotoUrl: trx.challanPhotoUrl || trx.challanImageUrl,
            materialPhotoUrl: trx.materialPhotoUrl || trx.materialImageUrl,
            items: trx.items || [{
              sku: trx.sku,
              itemName: trx.itemName,
              qty: trx.qty,
              unit: trx.unit,
              remarks: trx.remarks,
              images: trx.materialPhotoUrl || trx.materialImageUrl ? [trx.materialPhotoUrl || trx.materialImageUrl] : []
            }]
          });
        }}
        className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
      >
                            <Pencil className="w-4 h-4" />
                          </button>}
                        
                        {hasPermission(getDeletePermission(trx.type)) && <button
        title="Delete Transaction"
        onClick={() => setDeleteConfirm(trx.id)}
        className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
      >
                            <Trash2 className="w-4 h-4" />
                          </button>}
                      </div>
                    </td>
                  </>}
              </>;
    }}
  /> : <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-1">
          <TableVirtuoso
    style={{ height: "calc(100vh - 350px)", minHeight: "500px" }}
    data={mrAllocations.filter((alc) => {
      if (alc.remainingQty <= 0) return false;
      if (allocFilterRequester && alc.engineerName !== allocFilterRequester) return false;
      if (allocSearch) {
        const q = allocSearch.toLowerCase();
        return (alc.mrNumber || alc.mrId || "").toLowerCase().includes(q)
          || (alc.engineerName || "").toLowerCase().includes(q)
          || (alc.itemName || "").toLowerCase().includes(q)
          || (alc.projectName || "").toLowerCase().includes(q)
          || (alc.sku || "").toLowerCase().includes(q);
      }
      return true;
    })}
    increaseViewportBy={300}
    fixedHeaderContent={() => <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
                <Th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden">MR / Project</Th>
                <Th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap overflow-hidden">Material Details</Th>
                <Th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap text-center overflow-hidden w-[100px]">Allocated</Th>
                <Th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap text-center overflow-hidden w-[100px]">Remaining</Th>
                <Th className="px-3 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap text-right overflow-hidden w-[110px]">Action</Th>
              </tr>}
    itemContent={(_index, alc) => <>
                <Td className="px-3 py-2.5 overflow-hidden">
                   <div className="flex flex-col min-w-0">
                     <span className="block truncate font-bold text-primary font-mono text-[12px]" title={alc.mrNumber || alc.mrId}>{alc.mrNumber || alc.mrId}</span>
                     {alc.engineerName && <span className="block truncate text-[11px] text-gray-800 dark:text-gray-200 font-semibold" title={alc.engineerName}>{alc.engineerName}</span>}
                     <span className="block truncate text-[11px] text-gray-500 font-medium" title={alc.projectName}>{alc.projectName}</span>
                   </div>
                </Td>
                <Td className="px-3 py-2.5 overflow-hidden">
                  <div className="flex flex-col min-w-0">
                    <span className="block truncate font-medium text-gray-900 dark:text-white" title={alc.itemName}>{alc.itemName}</span>
                    <span className="block truncate text-[10px] text-gray-400 font-mono tracking-tight" title={alc.sku}>{alc.sku}</span>
                  </div>
                </Td>
                <Td className="px-4 py-3 text-center">
                   <span className="inline-flex items-center px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded font-bold text-[12px]">
                     {alc.allocatedQty}
                   </span>
                </Td>
                <Td className="px-4 py-3 text-center">
                   <span className="inline-flex items-center px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded font-bold text-[12px]">
                     {alc.remainingQty}
                   </span>
                </Td>
                <Td className="px-4 py-3 text-right">
                   <button
      title="Issue Materials"
      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm shadow-orange-600/20 ml-auto"
      onClick={() => {
        const mr = materialRequirements.find((m) => m.id === alc.mrId);
        setNewTransaction({
          ...INITIAL_TRANSACTION,
          type: "Outward",
          mrId: alc.mrId,
          project: alc.projectName,
          items: mr ? mr.items.filter((i) => i.sku && i.sku !== "N/A" && (i.allocatedQty || 0) > 0).map((ri) => {
            const inv = inventory.find((invItem) => invItem.sku === ri.sku);
            const alloc = ri.allocatedQty || 0;
            const issued = ri.issuedQty || 0;
            return {
              sku: ri.sku,
              itemName: ri.materialName,
              qty: Math.max(0, alloc - issued),
              unit: ri.unit || "NOS",
              mrNo: alc.mrId,
              mrId: alc.mrId,
              liveStock: inv?.availableQty || 0,
              allocatedQty: alloc,
              originalAllocatedQty: alloc
            };
          }) : []
        });
        setModal(true);
      }}
    >
                     <Plus className="w-3.5 h-3.5" />
                     <span>Issue</span>
                   </button>
                </Td>
              </>}
    components={virtuosoMrTableComponents}
  />
          {mrAllocations.filter((alc) => alc.remainingQty > 0).length === 0 && !loading && <div className="px-4 py-12 text-center text-gray-500 italic text-[13px]">
              No materials are currently allocated and pending for issue.
            </div>}
        </Card>}

      {activeTab === "history" && loading && (data?.length || 0) === 0 && <div className="p-8 space-y-4">
           {[...Array(5)].map((_, i) => <div key={i} className="flex gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 flex-1" />
                <Skeleton className="h-6 w-20" />
              </div>)}
        </div>}

      {activeTab === "history" && (!data || data.length === 0) && !loading && <div className="px-4 py-10 text-center text-gray-500 dark:text-gray-400 text-[13px]">
           No transactions found.
        </div>}
      </Card>

      {loading && data && data.length > 0 && <div className="h-10 flex items-center justify-center py-2 text-gray-500 text-xs">
          <Loader2 className="w-4 h-4 animate-spin text-orange-500 mr-2" />
          Loading more transactions...
        </div>}

      {modal && <Modal
    title={`New ${newTransaction.type} Transaction`}
    extraWide
    onClose={() => {
      setModal(false);
      setErrors({});
      setNewTransaction({ ...INITIAL_TRANSACTION, type: newTransaction.type || "Inward" });
    }}
    footer={<div className="flex justify-end gap-3 w-full">
              <Btn
      label="Discard"
      outline
      onClick={() => {
        setModal(false);
        setErrors({});
      }}
    />
              <Btn
      label={actionLoading ? "Processing..." : isUploading ? "Uploading..." : "Confirm Transaction"}
      onClick={handleSubmit}
      loading={actionLoading || isUploading}
      disabled={actionLoading || isUploading || !newTransaction.items?.length}
      className="px-8"
    />
            </div>}
  >
          <div className="space-y-6 pb-4">
            {errors.form && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-bold">
                <AlertCircle className="w-5 h-5" />
                {errors.form}
              </div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                {newTransaction.type === "Outward" && <SearchSelect
    label="Link to Material Requisition (MR) *"
    value={newTransaction.mrId}
    onChange={async (val) => {
      const mr = materialRequirements.find((m) => m.id === val);
      if (mr) {
        setNewTransaction((prev) => ({
          ...prev,
          mrId: val,
          project: mr.project,
          location: mr.location || prev.location,
          items: mr.items.filter((i) => i.sku && i.sku !== "N/A" && (i.allocatedQty || 0) > 0).map((i) => {
            const inv = inventory.find((invItem) => invItem.sku === i.sku);
            const alloc = i.allocatedQty || 0;
            const remaining = Math.max(0, alloc - (i.issuedQty || 0));
            return {
              sku: i.sku,
              itemName: i.materialName,
              qty: remaining,
              unit: i.unit || "NOS",
              mrNo: mr.id,
              mrId: mr.id,
              liveStock: inv?.availableQty || 0,
              allocatedQty: alloc,
              originalAllocatedQty: alloc
            };
          })
        }));
      } else {
        setNewTransaction((prev) => ({ ...prev, mrId: val }));
      }
    }}
    options={materialRequirements.filter(
      (m) => ["Approved", "Approved by Store", "Approved by AGM", "Approved by Director", "Partially Issued", "Allocated", "Partially Allocated"].includes(m.status) && m.items.some((i) => (i.allocatedQty || 0) > 0)
    ).map((m) => ({
      label: `${m.mrNumber || m.id} | ${m.requesterName} | Site: ${m.project} | Items: ${m.items.length}`,
      subLabel: `Date: ${formatDateTime(m.createdAt)} | Status: ${m.status}`,
      value: m.id
    }))}
    placeholder="Select MR to issue materials against allocated stock"
    error={errors.mrId}
  />}
                <SField
    label={(newTransaction.type || "").includes("Transfer") ? "Source Store / Godown *" : "Project *"}
    value={newTransaction.project}
    onChange={(e) => setNewTransaction((prev) => ({ ...prev, project: e.target.value }))}
    options={(newTransaction.type || "").includes("Transfer") ? COMBINED_STORES : PROJECTS}
    required
    error={errors.project}
  />
                {!(newTransaction.type || "").includes("Transfer") && <SField
    label="Store / Godown *"
    value={newTransaction.store}
    onChange={(e) => setNewTransaction((prev) => ({ ...prev, store: e.target.value }))}
    options={COMBINED_STORES}
    required
    error={errors.store}
  />}
                {newTransaction.project === "Other" && !(newTransaction.type || "").includes("Transfer") && <Field
    label="Other Project Name *"
    value={newTransaction.otherProjectName}
    onChange={(e) => setNewTransaction((prev) => ({ ...prev, otherProjectName: e.target.value }))}
    required
    error={errors.otherProjectName}
  />}
                {(newTransaction.type || "").includes("Transfer") ? <SField
    label="Destination Store / Godown *"
    value={newTransaction.destinationProject}
    onChange={(e) => setNewTransaction((prev) => ({ ...prev, destinationProject: e.target.value }))}
    options={COMBINED_STORES}
    required
    error={errors.destinationProject}
  /> : ["Inward", "Inward Return", "Public Inward"].includes(newTransaction.type || "") ? <SField
    label="Supplier"
    value={newTransaction.supplier}
    onChange={(e) => setNewTransaction((prev) => ({ ...prev, supplier: e.target.value }))}
    options={suppliers?.map((v) => v.companyName || v.name).filter(Boolean) || []}
    error={errors.supplier}
  /> : <Field
    label="Person Name *"
    value={newTransaction.personName}
    onChange={(e) => setNewTransaction((prev) => ({ ...prev, personName: e.target.value, handoverTo: e.target.value }))}
    required
    error={errors.personName}
  />}
                {["Inward", "Inward Return", "Public Inward"].includes(newTransaction.type || "") && <Field
    label="Challan / Invoice No. *"
    value={newTransaction.challanNo}
    onChange={(e) => setNewTransaction((prev) => ({ ...prev, challanNo: e.target.value }))}
    required
    error={errors.challanNo}
  />}
                {(newTransaction.type === "Transfer Inward" || newTransaction.type === "Public Transfer Inward") && <SearchSelect
    label="Choose Gate Pass *"
    value={newTransaction.gatePassNo}
    onChange={handleGatePassSelect}
    options={availableGatePasses.map((gp) => ({
      value: gp.gatePassNo || "",
      label: `${gp.gatePassNo} (${gp.project} \u2192 ${gp.destinationProject})`,
      subLabel: `Items: ${gp.items?.length || 0} | Date: ${new Date(gp.date).toLocaleDateString()}`
    }))}
    placeholder="Select an outward gate pass..."
    error={errors.gatePassNo}
  />}
                {(newTransaction.type === "Transfer Outward" || newTransaction.type === "Public Transfer Outward") && <Field
    label="Gate Pass No. (Auto-generated) *"
    value={newTransaction.gatePassNo}
    readOnly
    required
    error={errors.gatePassNo}
    helperText="Unique Gate Pass ID for this transfer"
  />}
                {["Inward", "Outward"].includes(newTransaction.type || "") && <Field
    label="Gate Pass No. (Optional)"
    value={newTransaction.gatePassNo}
    onChange={(e) => setNewTransaction((prev) => ({ ...prev, gatePassNo: e.target.value }))}
    error={errors.gatePassNo}
  />}
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transaction Date</p>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    {formatDateTime(newTransaction.date)}
                  </p>
                </div>
                {["Inward Return", "Outward Return", "Transfer Outward", "Public Transfer Outward"].includes(newTransaction.type || "") && <SField
    label="Condition *"
    value={newTransaction.condition}
    onChange={(e) => setNewTransaction((prev) => ({ ...prev, condition: e.target.value }))}
    options={["New", "Good", "Needs Repair", "Damaged", "Old"]}
    required
  />}
                {["Outward", "Outward Return", "Public Outward", "Transfer Inward", "Transfer Outward", "Public Transfer Inward", "Public Transfer Outward"].includes(newTransaction.type || "") && <Field
    label="Specific Location / Site *"
    value={newTransaction.location}
    onChange={(e) => setNewTransaction((prev) => ({ ...prev, location: e.target.value }))}
    required
  />}
                {["Inward", "Inward Return", "Public Inward"].includes(newTransaction.type || "") && <MultipleImageUpload
    id="challanPhoto"
    label="Challan / Invoice Photos *"
    onUpload={(urls) => setNewTransaction((prev) => ({
      ...prev,
      challanPhotos: [...prev.challanPhotos || [], ...urls]
    }))}
    values={newTransaction.challanPhotos || []}
    onRemove={(imgIdx) => {
      const newPhotos = (newTransaction.challanPhotos || []).filter((_, i) => i !== imgIdx);
      setNewTransaction((prev) => ({ ...prev, challanPhotos: newPhotos }));
    }}
    small
    onUploadingChange={setIsUploading}
    error={errors.challanPhotos}
  />}
                {["Outward", "Outward Return", "Public Outward", "Transfer Inward", "Transfer Outward", "Public Transfer Inward", "Public Transfer Outward"].includes(newTransaction.type || "") && <MultipleImageUpload
    label={["Transfer Inward", "Transfer Outward", "Public Transfer Inward", "Public Transfer Outward"].includes(newTransaction.type || "") ? "Gate Pass Photo *" : "Person Photo (Handover) *"}
    id="personPhotos"
    values={newTransaction.personPhotos || []}
    onUpload={(urls) => {
      setNewTransaction((prev) => {
        const newPhotos = [...prev.personPhotos || [], ...urls];
        return {
          ...prev,
          personPhotos: newPhotos,
          personPhotoUrl: newPhotos[0] || ""
        };
      });
    }}
    onRemove={(idx) => {
      setNewTransaction((prev) => {
        const newPhotos = (prev.personPhotos || []).filter((_, i) => i !== idx);
        return {
          ...prev,
          personPhotos: newPhotos,
          personPhotoUrl: newPhotos[0] || ""
        };
      });
    }}
    small
    onUploadingChange={setIsUploading}
  />}
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Items List</h3>
                <div className="flex gap-2">
                  <Btn
    label="Add Item"
    icon={Plus}
    outline
    small
    onClick={addItem}
  />
                  {["Transfer Inward", "Transfer Outward", "Public Transfer Inward", "Public Transfer Outward"].includes(newTransaction.type || "") && <Btn
    label="Misc Item"
    icon={Plus}
    outline
    small
    onClick={addMiscellaneousItem}
  />}
                </div>
              </div>

              <div className="space-y-4">
                {newTransaction.items && newTransaction.items.length > 0 ? <>
                    <div className="grid grid-cols-1 gap-6 md:hidden">
                      {newTransaction.items.map((item, idx) => <Card key={idx} className="p-4 space-y-4 relative bg-gray-50 dark:bg-gray-800/50">
                          <button
    onClick={() => removeItem(idx)}
    className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500 transition-all"
  >
                            <X className="w-4 h-4" />
                          </button>
                          
                          <div className="space-y-4 pt-2">
                            {item.isMiscellaneous ? <div className="space-y-4">
                                <Field
    label="Material Name *"
    value={item.itemName}
    onChange={(e) => updateItem(idx, { itemName: e.target.value })}
    placeholder="Enter item name"
    error={errors[`item_${idx}_itemName`]}
  />
                                <SField
    label="Category *"
    value={item.category}
    onChange={(e) => updateItem(idx, { category: e.target.value })}
    options={CATEGORIES}
    required
  />
                              </div> : <SearchSelect
    label="Search Material *"
    options={inventoryOptions}
    value={item.sku}
    onChange={(val) => handleRowItemSelect(idx, val)}
    onSearch={(val) => setSearchItemVal(val)}
    placeholder="Start typing material name..."
    error={errors[`item_${idx}_sku`]}
  />}
                            
                            <div className="grid grid-cols-2 gap-4">
                              <Field
    label="Quantity *"
    value={item.qty}
    onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
    type="number"
    placeholder="0"
    error={errors[`item_${idx}_qty`]}
    helperText={item.allocatedQty ? `Max to issue (Allocated): ${item.allocatedQty}` : void 0}
  />
                              {item.isMiscellaneous ? <SField
    label="Unit"
    value={item.unit}
    onChange={(e) => updateItem(idx, { unit: e.target.value })}
    options={UNITS}
    required
  /> : <div className="space-y-1">
                                  <p className="text-[11px] font-bold text-gray-500 tracking-wider mb-1">Unit</p>
                                  <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-[13px] font-bold text-gray-500 text-center h-[42px] flex items-center justify-center">
                                    {item.unit}
                                  </div>
                                </div>}
                            </div>

                            <Field
    label="MR No. (Material Requisition)"
    value={item.mrNo}
    onChange={(e) => updateItem(idx, { mrNo: e.target.value })}
    placeholder="MR-XXXX"
  />

                            <MultipleImageUpload
    id={`item-photos-mob-${idx}`}
    label="Material Photos"
    onUpload={(urls) => updateItem(idx, { images: [...item.images || [], ...urls] })}
    values={item.images || []}
    onRemove={(imgIdx) => {
      const newImages = (item.images || []).filter((_, i) => i !== imgIdx);
      updateItem(idx, { images: newImages });
    }}
    small
    onUploadingChange={setIsUploading}
  />
                          </div>
                        </Card>)}
                    </div>

                    <div className="hidden md:block overflow-visible">
                      <div className="overflow-visible rounded-xl border border-gray-200 dark:border-gray-800">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 [&>th:first-child]:rounded-tl-[11px] [&>th:last-child]:rounded-tr-[11px]">
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-left w-[25%]">Material Description *</th>
                              {newTransaction.type === "Transfer Inward" && <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-right w-[10%]">Outward Qty</th>}
                              {newTransaction.type === "Outward" && <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-right w-[8%]">Allocated</th>}
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-right w-[12%]">
                                {newTransaction.type === "Transfer Inward" ? "Received Qty *" : "Issue Qty *"}
                              </th>
                              {(newTransaction.type === "Outward" || newTransaction.type === "Transfer Inward") && <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-right w-[10%]">
                                  {newTransaction.type === "Transfer Inward" ? "Variance" : "Remaining"}
                                </th>}
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-center w-[10%]">Unit</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-[12%]">MR No.</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-[20%]">Photos</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-10 text-center" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {newTransaction.items.map((item, idx) => <tr key={idx} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all">
                                <td className="px-6 py-5 align-top">
                                  {item.isMiscellaneous ? <div className="space-y-3">
                                      <Field
    value={item.itemName}
    onChange={(e) => updateItem(idx, { itemName: e.target.value })}
    placeholder="Item Name"
    small
    error={errors[`item_${idx}_itemName`]}
  />
                                      <SField
    value={item.category}
    onChange={(e) => updateItem(idx, { category: e.target.value })}
    options={CATEGORIES}
    small
    placeholder="Category"
  />
                                    </div> : <>
                                      <SearchSelect
    options={inventoryOptions}
    value={item.sku}
    onChange={(val) => handleRowItemSelect(idx, val)}
    onSearch={(val) => setSearchItemVal(val)}
    placeholder="Search Material..."
    small
    error={errors[`item_${idx}_sku`]}
  />
                                      {item.itemName && <div className="mt-1 px-2 py-0.5 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 rounded text-[10px] tracking-wider font-extrabold text-orange-600 dark:text-orange-400">
                                          {item.itemName}
                                        </div>}
                                    </>}
                                </td>
                                {newTransaction.type === "Transfer Inward" && <td className="px-4 py-5 align-top text-right">
                                    <div className="flex flex-col items-end">
                                      <span className="text-[14px] font-black text-blue-500 font-mono tracking-tighter">
                                        {item.outwardQty || 0}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-black tracking-widest leading-none mt-1">Outward</span>
                                    </div>
                                  </td>}
                                {newTransaction.type === "Outward" && <td className="px-4 py-5 align-top text-right">
                                    <div className="flex flex-col items-end">
                                      <span className="text-[14px] font-black text-blue-500 font-mono tracking-tighter">
                                        {item.originalAllocatedQty || item.allocatedQty || 0}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-black tracking-widest leading-none mt-1">Allocated</span>
                                    </div>
                                  </td>}
                                <td className="px-4 py-5 align-top">
                                  <div className="relative group/input">
                                    <input
                                      type="number"
                                      value={item.qty || 0}
                                      onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
                                      placeholder="0"
                                      className="w-full px-2 py-2 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl text-[14px] font-black text-center sm:text-right focus:outline-none focus:border-orange-500 transition-all shadow-sm group-hover/input:border-gray-200 dark:group-hover/input:border-gray-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                    {newTransaction.type === "Outward" && (item.qty || 0) > (item.originalAllocatedQty || item.allocatedQty || 0) && <div className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[8px] font-black rounded animate-bounce">
                                        Exceeds!
                                      </div>}
                                    {newTransaction.type === "Transfer Inward" && (item.qty || 0) !== (item.outwardQty || 0) && <div className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-black rounded ">
                                        Variance!
                                      </div>}
                                  </div>
                                </td>
                                {(newTransaction.type === "Outward" || newTransaction.type === "Transfer Inward") && <td className="px-4 py-5 align-top text-right">
                                    <div className="flex flex-col items-end">
                                      <span className={`text-[14px] font-black font-mono tracking-tighter ${newTransaction.type === "Transfer Inward" ? item.variance === 0 ? "text-emerald-600" : "text-red-500" : (item.originalAllocatedQty || item.allocatedQty || 0) - (item.qty || 0) < 0 ? "text-red-500 animate-pulse" : "text-emerald-600"}`}>
                                        {newTransaction.type === "Transfer Inward" ? item.variance || 0 : (item.originalAllocatedQty || item.allocatedQty || 0) - (item.qty || 0)}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-black tracking-widest leading-none mt-1">
                                        {newTransaction.type === "Transfer Inward" ? "Variance" : "Remaining"}
                                      </span>
                                    </div>
                                  </td>}
                                <td className="px-6 py-5 align-top">
                                  {item.isMiscellaneous ? <SField
    value={item.unit}
    onChange={(e) => updateItem(idx, { unit: e.target.value })}
    options={UNITS}
    small
  /> : <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] font-bold text-gray-500 text-center mt-0.5">
                                      {item.unit}
                                    </div>}
                                </td>
                                <td className="px-6 py-5 align-top">
                                  <input
    value={item.mrNo || ""}
    onChange={(e) => updateItem(idx, { mrNo: e.target.value })}
    placeholder="MR-XXXX"
    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-[13px] font-bold text-orange-600 focus:outline-none focus:ring-2 focus:ring-[#F97316]/20"
  />
                                </td>
                                <td className="px-4 py-5 align-top">
                                  <MultipleImageUpload
    id={`item-photos-${idx}`}
    label=""
    onUpload={(urls) => updateItem(idx, { images: [...item.images || [], ...urls] })}
    values={item.images || []}
    onRemove={(imgIdx) => {
      const newImages = (item.images || []).filter((_, i) => i !== imgIdx);
      updateItem(idx, { images: newImages });
    }}
    small
    onUploadingChange={setIsUploading}
  />
                                </td>
                                <td className="px-6 py-5 text-center align-top">
                                  <button
    onClick={() => removeItem(idx)}
    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
  >
                                    <Trash2 className="w-4 h-5" />
                                  </button>
                                </td>
                              </tr>)}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </> : <div className="text-center py-20 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl bg-gray-50/30 dark:bg-[#0F172A]/50">
                    <div className="w-16 h-16 bg-white dark:bg-[#1E293B] rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-gray-100 dark:border-gray-700">
                      <Package className="w-8 h-8 text-gray-300 dark:text-gray-600 animate-pulse" />
                    </div>
                    <h4 className="text-[14px] font-bold text-gray-900 dark:text-white mb-1">No Items Added</h4>
                    <p className="text-xs text-gray-500">Click "Add Regular Item" to include materials in this transaction.</p>
                  </div>}
              </div>
            </div>

          </div>
        </Modal>}

      {viewModal && selectedTransaction && <Modal
    title={`Transaction Details: ${selectedTransaction.id}`}
    extraWide
    onClose={() => setViewModal(false)}
    footer={<div className="flex justify-end w-full">
              <Btn label="Close" outline onClick={() => setViewModal(false)} />
            </div>}
  >
          <div className="space-y-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              <div>
                <p className="text-[10px] font-bold text-gray-500 tracking-wider">Date</p>
                <p className="text-[13px] font-bold text-gray-900 dark:text-white break-words">{formatDateTime(selectedTransaction.date)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 tracking-wider">Type</p>
                <div className="flex items-center gap-1 mt-1">
                  {getTypeIcon(selectedTransaction.type)}
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white break-words">{selectedTransaction.type}</p>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 tracking-wider">
                  {(selectedTransaction.type || "").includes("Transfer") ? "Source Site" : "Project"}
                </p>
                <p className="text-[13px] font-bold text-gray-900 dark:text-white break-words">{selectedTransaction.project}</p>
              </div>
              {selectedTransaction.destinationProject && <div>
                  <p className="text-[10px] font-bold text-gray-500 tracking-wider">Destination Site</p>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white break-words">{selectedTransaction.destinationProject}</p>
                </div>}
              {selectedTransaction.store && !["Transfer Inward", "Transfer Outward", "Public Transfer Inward", "Public Transfer Outward"].includes(selectedTransaction.type || "") && <div>
                  <p className="text-[10px] font-bold text-gray-500 tracking-wider">Godown / Store</p>
                  <p className="text-[13px] font-bold text-orange-600 dark:text-orange-400 break-words">{selectedTransaction.store}</p>
                </div>}
              {(selectedTransaction.supplier || selectedTransaction.vendor) && <div>
                  <p className="text-[10px] font-bold text-gray-500 tracking-wider">Supplier</p>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white break-words">{selectedTransaction.supplier || selectedTransaction.vendor}</p>
                </div>}
              {!["Transfer Inward", "Transfer Outward", "Public Transfer Inward", "Public Transfer Outward"].includes(selectedTransaction.type || "") && <div>
                  <p className="text-[10px] font-bold text-gray-500 tracking-wider">Condition</p>
                  <div className="mt-1">
                    <StatusBadge status={selectedTransaction.condition || selectedTransaction.items?.[0]?.condition || "Good"} />
                  </div>
                </div>}
              {(selectedTransaction.challanNo || selectedTransaction.items?.[0]?.challanNo) && <div>
                  <p className="text-[10px] font-bold text-gray-500 tracking-wider">Challan No.</p>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white break-all">{selectedTransaction.challanNo || selectedTransaction.items?.[0]?.challanNo}</p>
                </div>}
              {selectedTransaction.gatePassNo && <div>
                  <p className="text-[10px] font-bold text-gray-500 tracking-wider">Gate Pass No.</p>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white break-all">{selectedTransaction.gatePassNo}</p>
                </div>}
              {(selectedTransaction.mrNo || selectedTransaction.items?.[0]?.mrNo) && <div>
                  <p className="text-[10px] font-bold text-gray-500 tracking-wider">MR No.</p>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white break-all">{selectedTransaction.mrNo || selectedTransaction.items?.[0]?.mrNo}</p>
                </div>}
              {selectedTransaction.location && <div>
                  <p className="text-[10px] font-bold text-gray-500 tracking-wider">Location</p>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white break-words">{selectedTransaction.location}</p>
                </div>}
              <div>
                <p className="text-[10px] font-bold text-gray-500 tracking-wider">Created By</p>
                <p className="text-[13px] font-bold text-gray-900 dark:text-white break-words">{selectedTransaction.createdBy || "N/A"}</p>
              </div>
            </div>

            {(selectedTransaction.personName || selectedTransaction.handoverTo || selectedTransaction.personPhotoUrl || selectedTransaction.personImageUrl || selectedTransaction.personPhotos && selectedTransaction.personPhotos.length > 0) && <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center gap-6">
                {(selectedTransaction.personPhotoUrl || selectedTransaction.personImageUrl || selectedTransaction.personPhotos && selectedTransaction.personPhotos[0]) && <div className="w-40 h-40 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer" onClick={() => setPreviewImage(selectedTransaction.personPhotoUrl || selectedTransaction.personImageUrl || selectedTransaction.personPhotos[0])}>
                    <img src={selectedTransaction.personPhotoUrl || selectedTransaction.personImageUrl || selectedTransaction.personPhotos[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>}
                <div>
                  <p className="text-[10px] font-bold text-gray-500 tracking-wider">
                    {(selectedTransaction.type || "").includes("Transfer") ? "Gate Pass Details" : "Person Details"}
                  </p>
                  <p className="text-[15px] font-bold text-gray-900 dark:text-white">{selectedTransaction.personName || selectedTransaction.handoverTo || "N/A"}</p>
                  {selectedTransaction.location && <p className="text-[12px] text-gray-500 mt-1">Location: <span className="font-bold text-gray-700 dark:text-gray-300">{selectedTransaction.location}</span></p>}
                  <p className="text-[12px] text-gray-500">
                    {(selectedTransaction.type || "").includes("Transfer") ? "Gate pass photo attached for verification" : "Person photo attached for verification"}
                  </p>
                </div>
              </div>}



            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">Item</th>
                      {(selectedTransaction.type === "Transfer Inward" || selectedTransaction.type === "Public Transfer Inward") && <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider text-right">Outward Qty</th>}
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider text-right">
                        {(selectedTransaction.type === "Transfer Inward" || selectedTransaction.type === "Public Transfer Inward") ? "Received Qty" : "Qty"}
                      </th>
                      {(selectedTransaction.type === "Transfer Inward" || selectedTransaction.type === "Public Transfer Inward") && <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider text-right">Variance</th>}
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">Details</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                        {(selectedTransaction.type || "").includes("Transfer") ? "Gate Pass Photo" : "Challan / Invoice Photos"}
                      </th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">Remarks</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">Item Photos (Multiple)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                    {(selectedTransaction.items || (selectedTransaction.sku ? [{
    itemName: selectedTransaction.itemName,
    sku: selectedTransaction.sku,
    qty: selectedTransaction.qty,
    unit: selectedTransaction.unit,
    remarks: selectedTransaction.remarks,
    condition: selectedTransaction.condition,
    challanNo: selectedTransaction.challanNo,
    mrNo: selectedTransaction.mrNo,
    challanPhotoUrl: selectedTransaction.challanPhotoUrl,
    images: selectedTransaction.materialPhotoUrl || selectedTransaction.materialImageUrl ? [selectedTransaction.materialPhotoUrl || selectedTransaction.materialImageUrl] : []
  }] : [])).map((item, i) => <tr key={i} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                              <Package className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div>
                              <p className="text-[13px] font-semibold text-gray-900 dark:text-white">
                                {item.itemName || inventory.find((inv) => inv.sku === item.sku)?.itemName || catalogue.find((c) => c.sku === item.sku)?.itemName || item.sku || "N/A"}
                              </p>
                              <p className="text-[11px] text-gray-500 font-mono">{item.sku}</p>
                            </div>
                          </div>
                        </td>
                        {(selectedTransaction.type === "Transfer Inward" || selectedTransaction.type === "Public Transfer Inward") && <td className="px-4 py-3 text-[13px] font-bold text-right text-blue-500 font-mono">
                            {item.outwardQty || 0} {item.unit}
                          </td>}
                        <td className="px-4 py-3 text-[13px] font-bold text-right text-gray-900 dark:text-white whitespace-nowrap">
                          {item.qty} {item.unit}
                        </td>
                        {(selectedTransaction.type === "Transfer Inward" || selectedTransaction.type === "Public Transfer Inward") && <td className={`px-4 py-3 text-[13px] font-bold text-right font-mono ${item.variance === 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {item.variance || 0} {item.unit}
                          </td>}
                        <td className="px-4 py-3">
                          {
    /* Condition and Challan moved to header as per user request */
  }
                          {(item.mrNo || selectedTransaction.mrNo) && <p className="text-[11px] text-gray-600 dark:text-gray-400">MR: {item.mrNo || selectedTransaction.mrNo}</p>}
                          {!(item.mrNo || selectedTransaction.mrNo) && <span className="text-gray-400 text-[11px]">-</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {item.challanPhotos && item.challanPhotos.length > 0 ? item.challanPhotos.map((img, imgIdx) => <div
    key={`challan-${imgIdx}`}
    className="w-12 h-12 rounded-lg border border-orange-200 dark:border-orange-700 overflow-hidden cursor-pointer hover:scale-105 transition-transform relative shadow-sm"
    onClick={() => setPreviewImage(img)}
  >
                                  <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-orange-600" />
                                  </div>
                                </div>) : item.challanPhotoUrl ? <div
    className="w-12 h-12 rounded-lg border border-orange-200 dark:border-orange-700 overflow-hidden cursor-pointer hover:scale-105 transition-transform relative shadow-sm"
    onClick={() => setPreviewImage(item.challanPhotoUrl)}
  >
                                <img src={item.challanPhotoUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-orange-600" />
                                </div>
                              </div> : selectedTransaction.challanPhotos && selectedTransaction.challanPhotos.length > 0 ? selectedTransaction.challanPhotos.map((img, imgIdx) => <div
    key={`root-challan-${imgIdx}`}
    className="w-12 h-12 rounded-lg border border-orange-200 dark:border-orange-700 overflow-hidden cursor-pointer hover:scale-105 transition-transform relative shadow-sm"
    onClick={() => setPreviewImage(img)}
  >
                                  <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-orange-600" />
                                  </div>
                                </div>) : selectedTransaction.challanPhotoUrl || selectedTransaction.challanImageUrl ? <div
    className="w-12 h-12 rounded-lg border border-orange-200 dark:border-orange-700 overflow-hidden cursor-pointer hover:scale-105 transition-transform relative shadow-sm"
    onClick={() => setPreviewImage(selectedTransaction.challanPhotoUrl || selectedTransaction.challanImageUrl)}
  >
                                <img src={selectedTransaction.challanPhotoUrl || selectedTransaction.challanImageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center">
                                  <FileText className="w-4 h-4 text-orange-600" />
                                </div>
                              </div> : ["Transfer Inward", "Transfer Outward", "Transfer"].includes(selectedTransaction.type || "") && (selectedTransaction.personPhotoUrl || selectedTransaction.personImageUrl || selectedTransaction.personPhotos && selectedTransaction.personPhotos.length > 0) ? <div
    className="w-12 h-12 rounded-lg border border-orange-200 dark:border-orange-700 overflow-hidden cursor-pointer hover:scale-105 transition-transform relative shadow-sm"
    onClick={() => setPreviewImage(selectedTransaction.personPhotoUrl || selectedTransaction.personImageUrl || selectedTransaction.personPhotos[0])}
  >
                                <img src={selectedTransaction.personPhotoUrl || selectedTransaction.personImageUrl || selectedTransaction.personPhotos[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center">
                                  <Camera className="w-4 h-4 text-orange-600" />
                                </div>
                              </div> : <span className="text-[11px] text-gray-400 italic">No photo</span>}
                          </div>
                        </td>
                         <td className="px-4 py-3 text-[13px] text-gray-600 dark:text-gray-400">{item.remarks || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {item.images && item.images.length > 0 ? item.images.map((img, imgIdx) => <div
    key={imgIdx}
    className="w-12 h-12 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:scale-105 transition-transform shadow-sm"
    onClick={() => setPreviewImage(img)}
  >
                                  <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </div>) : <span className="text-[11px] text-gray-400 italic">No photos</span>}
                          </div>
                        </td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </Modal>}

      {previewImage && <Modal
    title="Image Preview"
    onClose={() => setPreviewImage(null)}
    footer={<div className="flex justify-end w-full">
              <Btn label="Close" outline onClick={() => setPreviewImage(null)} />
            </div>}
  >
          <img src={previewImage} className="w-full h-auto rounded-xl shadow-2xl" referrerPolicy="no-referrer" />
        </Modal>}

      {deleteConfirm && <ConfirmModal
    title="Delete Transaction"
    message="Are you sure you want to delete this transaction? This action will also update the inventory stock accordingly."
    loading={actionLoading}
    onConfirm={async () => {
      try {
        const recordType = selectedTransaction?.type || type;
        if (["Inward", "Transfer Inward", "GRN", "Public Inward", "Public Transfer Inward"].includes(recordType)) await deleteInward(deleteConfirm);
        else if (["Outward", "Transfer Outward", "MR-Outward", "Public Outward", "Public Transfer Outward"].includes(recordType)) await deleteOutward(deleteConfirm);
        else if (recordType === "Inward Return" || recordType === "Public Inward Return") await deleteInwardReturn(deleteConfirm);
        else if (recordType === "Outward Return" || recordType === "Public Outward Return") await deleteOutwardReturn(deleteConfirm);
        else await deleteTransaction(deleteConfirm);
        setDeleteConfirm(null);
      } catch (err) {
        toast.error(err.message || "Delete failed");
      }
    }}
    onCancel={() => setDeleteConfirm(null)}
  />}
    </div>;
}, "TransactionsPage");
export {
  TransactionsPage
};
