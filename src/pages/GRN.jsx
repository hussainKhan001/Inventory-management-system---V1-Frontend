var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React, { useState, useCallback, useEffect, useRef } from "react";
import { useAppStore } from "../store";
import {
  PageHeader,
  Card,
  StatusBadge,
  Btn,
  Modal,
  SField,
  ConfirmModal,
  Skeleton,
  MultipleImageUpload,
  Field,
  Td
} from "../components/ui";
import { Plus, X, Eye, Pencil, Trash2, Download, Package, PackagePlus, AlertTriangle, Calendar, Building2 } from "lucide-react";
import { TableVirtuoso } from "react-virtuoso";
import { SearchFilter, DateRangePicker, SelectFilter, FilterRow } from "../components/ui/Filters";
import { genId, scrollToError, formatDateTime, safeStr } from "../utils";
import { cn } from "../lib/utils";
import { toast } from "react-hot-toast";
import { api } from "../services/api";
const GRNPage = /* @__PURE__ */ __name(() => {
  const {
    grns,
    grnsPagination,
    fetchResource,
    addGRN,
    addGRNReceipt,
    updateGRN,
    patchGrnInStore,
    deleteGRN,
    updatePO,
    pos,
    inventory,
    updateInventory,
    addInward,
    role,
    uploadImage,
    suppliers,
    loading,
    actionLoading,
    hasPermission,
    settings
  } = useAppStore();
  const { projects: PROJECTS = [], sites: SITES = [] } = settings;
  const STORE_OPTIONS = SITES.map(s => s.siteName);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterSupplier, setFilterSupplier] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const supplierOptions = React.useMemo(() => {
    const list = /* @__PURE__ */ new Set();
    suppliers.forEach((s) => list.add(s.companyName || s.name || s.id));
    grns.forEach((g) => {
      if (g.supplier) list.add(g.supplier);
    });
    return Array.from(list).filter(Boolean).sort();
  }, [suppliers, grns]);
  const statusOptions = React.useMemo(() => [
    { label: "Draft", value: "Draft" },
    { label: "Partial", value: "Partial" },
    { label: "Confirmed", value: "Confirmed" },
    { label: "Over-Received", value: "Over-Received" }
  ], []);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);
  const [page, setPage] = useState(1);
  const observerRef = useRef(null);
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, startDate, endDate, filterProject, filterSupplier, filterStatus]);
  useEffect(() => {
    const isInitialLoad = grns.length === 0;
    const filterObj = {};
    if (filterProject) filterObj.project = filterProject;
    if (filterSupplier) filterObj.supplier = filterSupplier;
    if (filterStatus) filterObj.status = filterStatus;
    const finalFilter = Object.keys(filterObj).length > 0 ? filterObj : null;
    fetchResource("grn", page, 50, !isInitialLoad || page > 1, debouncedSearch, finalFilter, page > 1, false, startDate, endDate);
    fetchResource("pos", 1, 500, true);
    fetchResource("inventory", 1, 1e3, true);
    fetchResource("suppliers", 1, 5000, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, startDate, endDate, filterProject, filterSupplier, filterStatus]);
  useEffect(() => {
    const observer = (() => {
      try {
        return new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && grnsPagination && page < grnsPagination.pages && !loading) {
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
  }, [grnsPagination, page, loading]);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [targetGRNId, setTargetGRNId] = useState(null);
  const [errors, setErrors] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToError();
    }
  }, [errors]);
  const validateForm = /* @__PURE__ */ __name((data) => {
    const newErrors = {};
    if (!data.poId) newErrors.poId = "PO selection is required";
    if (!data.store) newErrors.store = "Store / Godown is required";
    if (!data.challan) newErrors.challan = "Challan/Invoice No. is required";
    if (!data.personName) newErrors.personName = "Received By name is required";
    if (!data.docType) newErrors.docType = "Document Type is required";
    if (!data.items || data.items.length === 0) newErrors.items = "At least one item is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, "validateForm");
  const [newGRN, setNewGRN] = useState({
    poId: "",
    challan: "",
    mrNo: "",
    docType: "Challan",
    store: "",
    items: [],
    challanPhotos: [],
    images: [],
    personName: "",
    personPhotos: [],
    destinationProject: "",
    gatePassNo: ""
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editingReceiptIdx, setEditingReceiptIdx] = useState(null);
  const confirmDelete = /* @__PURE__ */ __name(async () => {
    if (!deleteConfirm) return;
    try {
      await deleteGRN(deleteConfirm);
      setDeleteConfirm(null);
    } catch (error) {
      toast.error(`Failed to delete GRN: ${error.message}`);
    }
  }, "confirmDelete");
  const handlePageChange = useCallback((page2) => {
    fetchResource("grn", page2);
  }, [fetchResource]);
  // POs eligible for a new GRN: "GRN Pending" (never received) OR has a Partial GRN (partially received)
  const poIdsWithPartialGRN = React.useMemo(() => {
    const s = new Set();
    grns.forEach((g) => { if (g.status === "Partial") s.add(g.poId); });
    return s;
  }, [grns]);

  const availablePOs = React.useMemo(
    () => pos.filter((p) =>
      p.status !== "PO Closed" &&
      (p.status === "GRN Pending" ||
      p.status === "GRN Variance" ||
      poIdsWithPartialGRN.has(p.id))
    ),
    [pos, poIdsWithPartialGRN]
  );

  // Helper: sum received qty per SKU across all GRNs for a given PO (excluding a specific GRN id)
  const getPreviouslyReceived = (poId, excludeGrnId = null) => {
    const map = {};
    grns
      .filter((g) => g.poId === poId && g.id !== excludeGrnId)
      .forEach((g) => {
        (g.items || []).forEach((it) => {
          map[it.sku] = (map[it.sku] || 0) + (it.received || 0);
        });
      });
    return map;
  };

  const canEdit = ["Super Admin", "Director", "Store Incharge"].includes(role || "");
  const handlePOSelect = /* @__PURE__ */ __name((poId) => {
    if (!poId) {
      setNewGRN({
        ...newGRN,
        poId: "",
        items: [],
        mrNo: "",
        project: "",
        vendor: "",
        supplier: ""
      });
      return;
    }
    const po = pos.find((p) => p.id === poId);
    if (!po) return;

    // Calculate how much has already been received for each SKU
    const prevReceived = getPreviouslyReceived(poId, newGRN.id);

    const items = po.items.map((i) => {
      const poOrdered = i.qty || i.quantity || 0;
      const alreadyReceived = prevReceived[i.sku] || 0;
      const outstanding = Math.max(0, poOrdered - alreadyReceived);
      return {
      sku: i.sku,
      itemName: i.itemName || i.name || i.material || i.description || i.itemDescription || i.item || "Unknown Item",
      poOrdered,         // original PO qty — for display context
      alreadyReceived,   // sum from prior GRNs
      ordered: outstanding, // outstanding = what this GRN should cover
      received: outstanding, // default to receiving full outstanding
      variance: 0,
      unit: i.unit || i.uqc || "NOS",
      images: []
      };
    }).filter((item) => item.ordered > 0); // only items still outstanding
    setNewGRN({
      ...newGRN,
      poId,
      project: po.project,
      vendor: po.vendor || po.supplier,
      supplier: po.supplier || po.vendor,
      mrNo: po.mrId || po.mrNo || po.mr_id || po.mr_no || po.mr_id || po.mr_no || "",
      items
    });
  }, "handlePOSelect");
  const updateItem = /* @__PURE__ */ __name((index, data) => {
    const items = [...newGRN.items || []];
    const item = { ...items[index], ...data };
    if (data.received !== void 0) {
      item.variance = item.received - item.ordered;
    }
    items[index] = item;
    setNewGRN({ ...newGRN, items });
  }, "updateItem");
  const handleCreate = /* @__PURE__ */ __name(async () => {
    if (!validateForm(newGRN)) {
      return;
    }
    // Editing an existing receipt/shipment
    if (editingReceiptIdx !== null && !isEditing && !targetGRNId && selectedGRN) {
      try {
        const res = await api.putSimple(`grn/${selectedGRN.id}/receipt/${editingReceiptIdx}`, {
          challan: newGRN.challan,
          mrNo: newGRN.mrNo,
          docType: newGRN.docType,
          personName: newGRN.personName,
          challanPhotos: newGRN.challanPhotos || [],
          personPhotos: newGRN.personPhotos || [],
          items: newGRN.items
        });
        setSelectedGRN(res.data);
        patchGrnInStore(selectedGRN.id, res.data);
        setModal(false);
        setEditingReceiptIdx(null);
        setNewGRN({ poId: "", challan: "", mrNo: "", docType: "Challan", items: [], challanPhotos: [], personPhotos: [], personName: "", destinationProject: "", gatePassNo: "" });
        setErrors({});
        toast.success("Shipment updated");
      } catch (error) {
        toast.error(`Failed to update shipment: ${error.message}`);
      }
      return;
    }
    if (isEditing && newGRN.id) {
      try {
        const updateData = {
          ...newGRN,
          supplier: newGRN.vendor || newGRN.supplier,
          personPhotoUrl: newGRN.personPhotos?.[0],
          materialImageUrl: newGRN.items?.[0]?.images?.[0] || newGRN.materialImageUrl,
          challanImageUrl: newGRN.challanPhotos?.[0] || newGRN.challanImageUrl
        };
        await updateGRN(newGRN.id, updateData);
        toast.success("GRN updated successfully");
        setModal(false);
        setNewGRN({ poId: "", challan: "", mrNo: "", docType: "Challan", items: [], personName: "", personPhotos: [], destinationProject: "", gatePassNo: "" });
        setIsEditing(false);
        setErrors({});
      } catch (error) {
        toast.error(`Failed to update GRN: ${error.message}`);
      }
      return;
    }
    if (targetGRNId) {
      try {
        await addGRNReceipt(targetGRNId, {
          challan: newGRN.challan,
          mrNo: newGRN.mrNo,
          docType: newGRN.docType,
          personName: newGRN.personName,
          challanPhotos: newGRN.challanPhotos || [],
          personPhotos: newGRN.personPhotos || [],
          items: newGRN.items
        });
        toast.success("Receipt added successfully");
        setModal(false);
        setTargetGRNId(null);
        setNewGRN({ poId: "", challan: "", mrNo: "", docType: "Challan", items: [], challanPhotos: [], personPhotos: [], personName: "", destinationProject: "", gatePassNo: "" });
        setErrors({});
      } catch (error) {
        toast.error(`Failed to add receipt: ${error.message}`);
      }
      return;
    }
    const grn = {
      poId: newGRN.poId,
      project: newGRN.project,
      destinationProject: newGRN.destinationProject,
      gatePassNo: newGRN.gatePassNo,
      supplier: newGRN.vendor || newGRN.supplier,
      date: (/* @__PURE__ */ new Date()).toISOString(),
      challan: newGRN.challan,
      mrNo: newGRN.mrNo,
      docType: newGRN.docType,
      items: newGRN.items,
      status: (() => {
        const hasShortage = (newGRN.items || []).some((it) => it.received < it.ordered);
        const hasExcess   = (newGRN.items || []).some((it) => it.received > it.ordered);
        return hasShortage ? "Partial" : hasExcess ? "Over-Received" : "Confirmed";
      })(),
      materialImageUrl: newGRN.items?.[0]?.images?.[0] || newGRN.materialImageUrl,
      challanImageUrl: newGRN.challanPhotos?.[0] || newGRN.challanImageUrl,
      challanPhotos: newGRN.challanPhotos,
      images: newGRN.items?.flatMap((i) => i.images || []) || [],
      personName: newGRN.personName,
      personPhotoUrl: newGRN.personPhotos?.[0],
      personPhotos: newGRN.personPhotos
    };
    try {
      await addGRN(grn);
      toast.success("GRN created successfully");
      setModal(false);
      setNewGRN({
        poId: "",
        challan: "",
        mrNo: "",
        docType: "Challan",
        items: [],
        materialImageUrl: void 0,
        challanImageUrl: void 0
      });
      setErrors({});
    } catch (error) {
      toast.error(`Failed to create GRN: ${error.message}`);
    }
  }, "handleCreate");

  const handleSaveReceipt = async () => {
    if (!editReceiptData || editingReceiptIdx === null || !selectedGRN) return;
    setSavingReceipt(true);
    try {
      const res = await api.put(`grn/${selectedGRN.id}/receipt/${editingReceiptIdx}`, editReceiptData);
      setSelectedGRN(res.data);
      patchGrnInStore(selectedGRN.id, res.data);
      setEditingReceiptIdx(null);
      setEditReceiptData(null);
      setEditReceiptOriginalItems([]);
      setEditReceiptDrawerOpen(false);
      toast.success("Shipment updated");
    } catch (e) { toast.error(e.message || "Failed to update shipment"); }
    finally { setSavingReceipt(false); }
  };

  return <div className="space-y-6">
      <PageHeader
    title="Goods Receipt Note (GRN)"
    sub="Receive materials against approved POs"
    actions={hasPermission("CREATE_GRN") && <Btn
      label="Create GRN"
      icon={Plus}
      onClick={() => {
        setNewGRN({
          poId: "",
          challan: "",
          mrNo: "",
          docType: "Challan",
          items: []
        });
        setIsEditing(false);
        setModal(true);
      }}
    />}
  />

      <div className="mb-6">
        <FilterRow
    showClear={!!(search || startDate || endDate || filterProject || filterSupplier || filterStatus)}
    onClearAll={() => {
      setSearch("");
      setStartDate("");
      setEndDate("");
      setFilterProject("");
      setFilterSupplier("");
      setFilterStatus("");
    }}
  >
          <SearchFilter
    value={search}
    onChange={setSearch}
    placeholder="Search by GRN ID, PO No, Supplier or Project..."
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
    value={filterSupplier}
    onChange={setFilterSupplier}
    options={supplierOptions}
    placeholder="All Suppliers"
  />
          <SelectFilter
    value={filterStatus}
    onChange={setFilterStatus}
    options={statusOptions}
    placeholder="All Statuses"
  />
        </FilterRow>
      </div>

      <Card className="p-0 overflow-hidden border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-1 min-h-[400px]">
        <TableVirtuoso
    style={{ height: "calc(100vh - 350px)", minHeight: "400px" }}
    data={grns || []}
    endReached={() => {
      if (grnsPagination && page < grnsPagination.pages && !loading) {
        setPage((prev) => prev + 1);
      }
    }}
    fixedHeaderContent={() => {
      const headerClass = "px-3 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 whitespace-nowrap overflow-hidden sticky top-0 z-10 sticky-th";
      return <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-[#E8ECF0] dark:border-gray-800">
                <th className={headerClass}>
                  Grn details
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-[148px]")}>
                  Date
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-[180px]")}>
                  Project / supplier
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-[160px]")}>
                  Challan / mr
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-[100px]")}>
                  Photos
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-[100px]")}>
                  Status
                </th>
                <th className={cn(headerClass, "text-right w-[100px] md:w-[160px]")}>
                  Actions
                </th>
              </tr>;
    }}
    itemContent={(_index, grn) => <>
              <Td className="md:px-4 md:py-3 py-2">
                <div className="flex md:flex-col items-center md:items-start justify-between md:justify-start gap-2">
                  <div className="flex flex-col">
                    <span className="text-[13px] font-bold text-gray-900 dark:text-white md:font-medium">{safeStr(grn.id)}</span>
                    <span className="text-[11px] text-gray-500">PO: {safeStr(grn.poId)}</span>
                  </div>
                  <div className="md:hidden">
                    <StatusBadge status={grn.status} />
                  </div>
                </div>
                <div className="md:hidden mt-2 text-[12px] text-gray-500 space-y-1">
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Date:</span> {formatDateTime(grn.date)}</p>
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Project:</span> {safeStr(grn.project)}</p>
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Vendor:</span> {safeStr(grn.vendor || grn.supplier)}</p>
                  <p><span className="font-medium text-gray-700 dark:text-gray-300">Inv:</span> {safeStr(grn.challan)} | <span className="font-medium text-gray-700 dark:text-gray-300">MR:</span> {safeStr(grn.mrNo)}</p>
                </div>
                <div className="md:hidden mt-3 flex items-center gap-2">
                   {(grn.images || []).slice(0, 3).map((img, idx) => <img
      key={`mat-mob-${idx}`}
      src={img}
      className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 object-cover cursor-pointer"
      onClick={() => setPreviewImage(img)}
      referrerPolicy="no-referrer"
    />)}
                    {(grn.challanPhotos || []).slice(0, 2).map((img, idx) => <img
      key={`cha-mob-${idx}`}
      src={img}
      className="w-10 h-10 rounded-lg border border-gray-200 dark:border-gray-700 object-cover cursor-pointer"
      onClick={() => setPreviewImage(img)}
      referrerPolicy="no-referrer"
    />)}
                </div>
              </Td>
              <Td className="hidden md:table-cell px-3 py-2.5 text-[13px] text-gray-600 dark:text-gray-400 whitespace-nowrap overflow-hidden">
                {formatDateTime(grn.date)}
              </Td>
              <Td className="hidden md:table-cell px-3 py-2.5 overflow-hidden">
                <div className="flex flex-col min-w-0">
                  <span className="block truncate text-[13px] font-medium text-gray-900 dark:text-white" title={safeStr(grn.project)}>
                    {safeStr(grn.project)}
                  </span>
                  <span className="block truncate text-[11px] text-gray-500" title={safeStr(grn.vendor || grn.supplier)}>
                    {safeStr(grn.vendor || grn.supplier)}
                  </span>
                </div>
              </Td>
              <Td className="hidden md:table-cell px-3 py-2.5 overflow-hidden">
                <div className="flex flex-col min-w-0">
                  <p className="block truncate text-[13px] text-gray-600 dark:text-gray-400" title={`Inv: ${safeStr(grn.challan)}`}>
                    Inv: {safeStr(grn.challan)}
                  </p>
                  <p className="block truncate text-[11px] text-gray-500" title={`MR: ${safeStr(grn.mrNo)}`}>
                    MR: {safeStr(grn.mrNo)}
                  </p>
                </div>
              </Td>
              <Td className="hidden md:table-cell px-4 py-3">
                <div className="flex -space-x-2">
                  {(grn.images || []).slice(0, 2).map((img, idx) => <img
      key={`mat-${idx}`}
      src={img}
      className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 object-cover cursor-pointer hover:z-10 hover:scale-110 transition-all shadow-sm"
      onClick={() => setPreviewImage(img)}
      referrerPolicy="no-referrer"
    />)}
                  {(grn.challanPhotos || []).slice(0, 1).map((img, idx) => <img
      key={`cha-${idx}`}
      src={img}
      className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 object-cover cursor-pointer hover:z-10 hover:scale-110 transition-all shadow-sm"
      onClick={() => setPreviewImage(img)}
      referrerPolicy="no-referrer"
    />)}
                </div>
              </Td>
              <Td className="hidden md:table-cell px-4 py-3">
                <StatusBadge status={grn.status} />
              </Td>
              <Td className="md:px-4 md:py-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-1.5">
                  <button
      title="View Details"
      onClick={(e) => { e.stopPropagation(); setSelectedGRN(grn); setViewModal(true); }}
      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
    >
                    <Eye className="w-4 h-4" />
                  </button>

                  {grn.status === "Partial" && hasPermission("CREATE_GRN") && <button
      title="Receive Remaining Material"
      onClick={(e) => { e.stopPropagation();
        const po = pos.find((p) => p.id === grn.poId);
        if (!po) { toast.error("PO not found"); return; }
        const prevReceived = getPreviouslyReceived(grn.poId);
        const outstandingItems = po.items
          .map((i) => {
            const poQty = i.qty || 0;
            const totalReceived = prevReceived[i.sku] || 0;
            const outstanding = Math.max(0, poQty - totalReceived);
            return { sku: i.sku, itemName: i.itemName || i.name || "Unknown", poOrdered: poQty, alreadyReceived: totalReceived, ordered: outstanding, received: outstanding, variance: 0, unit: i.unit || "NOS", images: [] };
          })
          .filter((it) => it.ordered > 0);
        if (outstandingItems.length === 0) { toast.info("All items already fully received"); return; }
        setTargetGRNId(grn.id);
        setNewGRN({ poId: grn.poId, project: grn.project, vendor: grn.vendor || grn.supplier, supplier: grn.supplier || grn.vendor, mrNo: grn.mrNo || "", challan: "", docType: grn.docType || "Challan", items: outstandingItems, challanPhotos: [], personPhotos: [], personName: "", destinationProject: grn.destinationProject || "", gatePassNo: grn.gatePassNo || "" });
        setIsEditing(false);
        setModal(true);
      }}
      className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
    >
                      <PackagePlus className="w-4 h-4" />
                    </button>}
                  {hasPermission("EDIT_GRN") && <button
      title="Edit GRN"
      onClick={(e) => { e.stopPropagation(); setNewGRN(grn); setIsEditing(true); setModal(true); }}
      className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
    >
                      <Pencil className="w-4 h-4" />
                    </button>}

                  {hasPermission("DELETE_GRN") && <button
      title="Delete GRN"
      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(grn.id); }}
      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
    >
                      <Trash2 className="w-4 h-4" />
                    </button>}
                </div>
              </Td>
            </>}
    components={{
      Table: /* @__PURE__ */ __name((props) => <table {...props} className="w-full text-left border-collapse table-fixed min-w-full md:min-w-[1000px] lg:min-w-[1100px]" />, "Table"),
      TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} className="divide-y divide-[#E8ECF0] dark:divide-gray-800" />),
      TableRow: (props) => {
        const grn = (grns || [])[props["data-index"]];
        return (
          <tr
            {...props}
            onClick={() => { if (grn) { setSelectedGRN(grn); setViewModal(true); } }}
            className={cn("cursor-pointer hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors", props.className)}
          />
        );
      }
    }}
  />

        {loading && grns.length === 0 && <div className="p-8 space-y-4">
             {[...Array(5)].map((_, i) => <div key={i} className="flex gap-4">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-6 flex-1" />
                  <Skeleton className="h-6 w-20" />
                </div>)}
          </div>}

        {!loading && grns.length === 0 && <div className="p-12 text-center">
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <Package className="w-12 h-12 opacity-20" />
              <p className="text-sm">No GRN records found</p>
            </div>
          </div>}
      </Card>

      {
    /* Infinite Scroll Sentinel */
  }
      <div ref={observerRef} className="h-10 flex items-center justify-center">
        {loading && page > 1 && <div className="flex items-center gap-2 text-gray-500 text-xs">
            <div className="w-4 h-4 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
            Loading more...
          </div>}
      </div>


      {viewModal && selectedGRN && <Modal
    title={`GRN Details: ${selectedGRN.id}`}
    extraWide
    onClose={() => setViewModal(false)}
    footer={<div className="flex justify-end gap-3 w-full">
              <Btn
      label="Download PDF"
      icon={Download}
      className="rounded-xl h-10 text-[13px] bg-[#F97316] text-white border-none shadow-lg shadow-orange-500/20"
      onClick={() => toast.success("Preparing PDF...")}
    />
              <Btn
      label="Close"
      outline
      className="rounded-xl h-10 w-28 text-[13px]"
      onClick={() => setViewModal(false)}
    />
            </div>}
  >
          <div className="space-y-8 pb-4">
            {
    /* Modal Header & Header Information */
  }
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              {
    /* Left Side: Receipt Information */
  }
              <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
                   <div className="w-1.5 h-3.5 bg-orange-500 rounded-full" />
                   Receipt information
                </div>
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Grn no.</div>
                  <div className="col-span-8 px-4 py-2.5 text-[14px] font-black text-gray-900 dark:text-white tracking-tight">{selectedGRN.id}</div>
                </div>
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Po reference</div>
                  <div className="col-span-8 px-4 py-2 text-[13px] font-bold text-orange-600 dark:text-orange-400">{selectedGRN.poId}</div>
                </div>
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Mr reference</div>
                  <div className="col-span-8 px-4 py-2 text-[13px] font-medium text-gray-700 dark:text-gray-300">
                    <span className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-[11px] font-bold text-gray-600 dark:text-gray-400">
                      {selectedGRN.mrNo || "N/a"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Project/site</div>
                  <div className="col-span-8 px-4 py-2.5 text-[13px] font-bold text-gray-900 dark:text-white">{selectedGRN.project}</div>
                </div>
              </div>

              {
    /* Right Side: Supplier & Delivery Details */
  }
              <div className="divide-y divide-gray-100 dark:divide-gray-800 border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="bg-gray-50/50 dark:bg-gray-800/30 p-2.5 font-black text-[10px] text-gray-500 flex items-center gap-2">
                   <div className="w-1.5 h-3.5 bg-orange-500 rounded-full" />
                   Supplier & source
                </div>
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Vendor name</div>
                  <div className="col-span-8 px-4 py-2.5 flex flex-col">
                    <span className="text-[14px] font-black text-gray-900 dark:text-white tracking-tight">
                      {(() => {
    const supplierId = selectedGRN.vendor || selectedGRN.supplier;
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier ? supplier.companyName || supplier.name : supplierId;
  })()}
                    </span>
                    {(() => {
    const supplierId = selectedGRN.vendor || selectedGRN.supplier;
    const supplier = suppliers.find((s) => s.id === supplierId);
    return supplier && (supplier.gstNumber || supplier.gst) ? <span className="text-[11px] text-gray-400 font-medium italic">
                            GST: {supplier.gstNumber || supplier.gst}
                          </span> : null;
  })()}
                  </div>
                </div>
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Receipt date</div>
                  <div className="col-span-8 px-4 py-2.5 text-[13px] font-bold text-gray-700 dark:text-gray-300">
                    {formatDateTime(selectedGRN.date)}
                  </div>
                </div>
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Challan/inv</div>
                  <div className="col-span-8 px-4 py-2.5 text-[13px] font-black text-blue-500 dark:text-blue-400">
                    {selectedGRN.challan}
                  </div>
                </div>
                <div className="grid grid-cols-12 items-center">
                  <div className="col-span-4 p-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 dark:border-gray-800">Received by</div>
                  <div className="col-span-8 px-4 py-2.5 text-[13px] font-bold text-gray-900 dark:text-white">
                    {selectedGRN.personName || "System auto"}
                  </div>
                </div>
              </div>
            </div>

            {
    /* Items Table */
  }
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-0.5 w-4 bg-[#F97316]" />
                <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">Received materials</h3>
              </div>
              
              <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-[#E8ECF0] dark:border-gray-800">
                        <th className="px-5 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider">Material description</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider text-center">Ordered</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider text-center">Received</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider text-center">Variance</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider text-center">Unit</th>
                        <th className="px-5 py-3 text-[11px] font-bold text-[#6B7280] dark:text-gray-400 tracking-wider">Photos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                      {(selectedGRN.items || []).map((item, idx) => {
    const ordered = item.ordered || 0;
    const received = item.received || 0;
    const variance = received - ordered;
    return <tr key={idx} className="hover:bg-gray-50/30 dark:hover:bg-gray-800/10 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex flex-col">
                                <span className="text-[13px] font-semibold text-gray-900 dark:text-white">
                                  {item.itemName || item.name || item.material || "Unknown Item"}
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  {item.sku}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center text-[13px] text-gray-500">
                              {ordered}
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="text-[14px] font-bold text-gray-900 dark:text-white">
                                {received}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                               <span className={cn(
      "text-[12px] font-bold",
      variance === 0 ? "text-gray-400" : variance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"
    )}>
                                 {variance > 0 ? `+${variance}` : variance}
                               </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                               <span className="text-[11px] font-medium text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                                 {item.unit}
                               </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex -space-x-2 overflow-hidden">
                                {(item.images || []).map((img, i) => <img
      key={i}
      src={img}
      className="w-8 h-8 rounded-lg border-2 border-white dark:border-gray-900 shadow-sm object-cover cursor-pointer hover:z-10 hover:scale-110 transition-transform"
      onClick={() => setPreviewImage(img)}
      referrerPolicy="no-referrer"
    />)}
                              </div>
                            </td>
                          </tr>;
  })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Delivery History */}
            {(selectedGRN.receipts?.length > 0) && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-0.5 w-4 bg-[#F97316]" />
                  <h3 className="text-[12px] font-bold text-gray-900 dark:text-white">
                    Delivery history ({(selectedGRN.receipts?.length || 0) + 1} shipments)
                  </h3>
                </div>
                <div className="relative pl-1">
                  <div className="absolute left-3.5 top-5 bottom-5 w-0.5 bg-gray-200 dark:bg-gray-700" />
                  <div className="space-y-3">
                    {/* Initial delivery */}
                    <div className="flex gap-3 items-start">
                      <div className="w-7 h-7 rounded-full bg-orange-500 border-2 border-white dark:border-gray-900 flex items-center justify-center shrink-0 shadow-sm">
                        <span className="text-[9px] font-bold text-white">1</span>
                      </div>
                      <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[12px] font-bold text-gray-900 dark:text-white">Shipment 1 (Initial)</span>
                          <div className="flex items-center gap-2">
                            {selectedGRN.challan && <span className="text-[10px] font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{selectedGRN.challan}</span>}
                            <span className="text-[10px] text-gray-400">{formatDateTime(selectedGRN.date)}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {(selectedGRN.items || []).map((item, i) => {
                            const laterReceipts = (selectedGRN.receipts || []).reduce((sum, r) => {
                              const ri = (r.items || []).find((ri) => ri.sku === item.sku);
                              return sum + (ri?.received || 0);
                            }, 0);
                            const initialReceived = (item.received || 0) - laterReceipts;
                            if (initialReceived <= 0) return null;
                            return (
                              <div key={i} className="flex items-center justify-between text-[12px]">
                                <span className="text-gray-600 dark:text-gray-400">{item.itemName}</span>
                                <span className="font-bold text-gray-900 dark:text-white">+{initialReceived} <span className="text-gray-400 font-normal">{item.unit}</span></span>
                              </div>
                            );
                          })}
                        </div>
                        {selectedGRN.personName && <p className="mt-1.5 text-[10px] text-gray-400">By: <span className="font-medium text-gray-600 dark:text-gray-300">{selectedGRN.personName}</span></p>}
                      </div>
                    </div>
                    {/* Additional receipts */}
                    {(selectedGRN.receipts || []).map((receipt, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-900 flex items-center justify-center shrink-0 shadow-sm">
                          <span className="text-[9px] font-bold text-white">{idx + 2}</span>
                        </div>
                        <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[12px] font-bold text-gray-900 dark:text-white">Shipment {idx + 2}</span>
                            <div className="flex items-center gap-2">
                              {receipt.challan && <span className="text-[10px] font-medium text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{receipt.challan}</span>}
                              <span className="text-[10px] text-gray-400">{formatDateTime(receipt.date)}</span>
                              {hasPermission("EDIT_GRN_RECEIPT") && (
                                <button
                                  onClick={() => {
                                    const receiptToEdit = receipt;
                                    const receiptItems = (receiptToEdit.items || []).map(ri => {
                                      const grnItem = selectedGRN.items.find(gi => gi.sku === ri.sku);
                                      const totalReceived = grnItem?.received ?? ri.received ?? 0;
                                      const ordered = grnItem?.ordered ?? 0;
                                      const otherTotal = totalReceived - (ri.received ?? 0);
                                      const maxQty = Math.max(0, ordered - otherTotal);
                                      return {
                                        sku: ri.sku,
                                        itemName: ri.itemName || grnItem?.itemName || ri.sku,
                                        ordered: maxQty,
                                        poOrdered: ordered,
                                        alreadyReceived: otherTotal,
                                        received: ri.received ?? 0,
                                        variance: (ri.received ?? 0) - maxQty,
                                        unit: grnItem?.unit || ri.unit || "NOS",
                                        images: ri.images || []
                                      };
                                    });
                                    setEditingReceiptIdx(idx);
                                    setNewGRN({
                                      poId: selectedGRN.poId,
                                      challan: receiptToEdit.challan || "",
                                      mrNo: receiptToEdit.mrNo || "",
                                      docType: receiptToEdit.docType || "Challan",
                                      personName: receiptToEdit.personName || "",
                                      challanPhotos: receiptToEdit.challanPhotos || [],
                                      personPhotos: receiptToEdit.personPhotos || [],
                                      items: receiptItems,
                                      vendor: selectedGRN.supplier,
                                      supplier: selectedGRN.supplier,
                                    });
                                    setModal(true);
                                  }}
                                  className="p-1 rounded text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                                  title="Edit shipment"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            {(receipt.items || []).map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-[12px]">
                                <span className="text-gray-600 dark:text-gray-400">{item.itemName}</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  +{item.received} <span className="text-gray-400 font-normal">{selectedGRN.items.find((gi) => gi.sku === item.sku)?.unit || ""}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                          {receipt.personName && <p className="mt-1.5 text-[10px] text-gray-400">By: <span className="font-medium text-gray-600 dark:text-gray-300">{receipt.personName}</span></p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {
    /* Floating Documents Section */
  }
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
              <div className="flex items-center gap-4">
                {selectedGRN.challanPhotos && selectedGRN.challanPhotos.length > 0 && <div className="flex gap-2">
                    {selectedGRN.challanPhotos.map((img, i) => <div
    key={i}
    className="p-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-pointer hover:shadow-lg transition-shadow"
    onClick={() => setPreviewImage(img)}
  >
                        <img
    src={img}
    className="w-16 h-16 rounded-lg object-cover"
    referrerPolicy="no-referrer"
  />
                      </div>)}
                  </div>}
              </div>
            </div>
          </div>
        </Modal>}

      {modal && <Modal
    title={
      editingReceiptIdx !== null && !isEditing && !targetGRNId
        ? `Edit Shipment ${editingReceiptIdx + 2} — ${selectedGRN?.id ?? ""}`
        : targetGRNId
          ? `Add Receipt — ${targetGRNId}`
          : isEditing
            ? "Edit GRN Transaction"
            : "New GRN Transaction"
    }
    extraWide
    onClose={() => {
      setModal(false);
      setErrors({});
      setTargetGRNId(null);
      setEditingReceiptIdx(null);
      setNewGRN({ id: "", poId: "", vendor: "", date: new Date().toISOString().split("T")[0], items: [], challanPhotos: [], images: [], status: "Confirmed" });
      setIsEditing(false);
    }}
    footer={
      <div className="flex items-center justify-end gap-3 w-full">
        <button
          onClick={() => {
            setModal(false);
            setErrors({});
            setTargetGRNId(null);
            setEditingReceiptIdx(null);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black tracking-wider border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={handleCreate}
          disabled={actionLoading || isUploading}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-0 text-white rounded-xl text-xs font-black transition-all tracking-wider shadow-lg shadow-primary/20 dark:shadow-none disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
        >
          {editingReceiptIdx !== null && !isEditing && !targetGRNId
            ? "Confirm Update"
            : targetGRNId
              ? "Add Receipt"
              : isEditing
                ? "Confirm Update"
                : "Confirm GRN"}
        </button>
      </div>
    }
  >
          <div className="space-y-6 pb-2">
            {/* Error banner */}
            {Object.keys(errors).length > 0 && (
              <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[13px] font-bold text-red-500">Required fields missing</p>
                  <p className="text-[11px] text-red-500/80 mt-0.5">
                    {Object.keys(errors).map((k) => k === "poId" ? "PO" : k === "challan" ? "Challan No." : k === "personName" ? "Received By" : k).join(", ")}
                  </p>
                </div>
              </div>
            )}

            {/* Top fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left column */}
              <div className="space-y-4">
                {(targetGRNId || (editingReceiptIdx !== null && !isEditing)) ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3">
                    <PackagePlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        {editingReceiptIdx !== null && !targetGRNId
                          ? `Editing Shipment ${editingReceiptIdx + 2} of ${selectedGRN?.id ?? ""}`
                          : `Adding receipt to ${targetGRNId}`}
                      </p>
                      <p className="text-[11px] text-emerald-600/70 dark:text-emerald-500/70">PO: {newGRN.poId}</p>
                    </div>
                  </div>
                ) : (
                  <SField
                    label="Purchase Order (PO) *"
                    value={newGRN.poId}
                    onChange={(e) => handlePOSelect(e.target.value)}
                    options={availablePOs.map((p) => {
                      const hasPartial = poIdsWithPartialGRN.has(p.id);
                      return { value: p.id, label: `${p.project} (${p.id})${hasPartial ? " — Partial" : ""}` };
                    })}
                    required
                    error={errors.poId}
                    disabled={isEditing}
                  />
                )}
                <SField
                  label="Store / Godown *"
                  value={newGRN.store}
                  onChange={(e) => setNewGRN({ ...newGRN, store: e.target.value })}
                  options={STORE_OPTIONS}
                  required
                  error={errors.store}
                  placeholder="Select godown..."
                />
                {/* Date info card */}
                <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none">Transaction Date</p>
                    <p className="text-[13px] font-black text-gray-800 dark:text-white mt-1">
                      {isEditing ? formatDateTime(newGRN.date || "") : formatDateTime(new Date().toISOString())}
                    </p>
                  </div>
                </div>
                {/* Supplier info card */}
                {(() => {
                  const supplierId = newGRN.vendor || newGRN.supplier;
                  const supplier = suppliers.find((s) => s.id === supplierId);
                  return (
                    <div className="flex items-center gap-3 p-3 bg-white/40 dark:bg-[#0F172A]/30 rounded-xl border border-gray-200/50 dark:border-gray-800/80 shadow-xs">
                      <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] font-bold text-gray-400 tracking-widest leading-none">Supplier</p>
                        <p className="text-[13px] font-black text-gray-800 dark:text-white truncate mt-1">
                          {supplier ? supplier.companyName || supplier.name : supplierId || "Select PO to load supplier"}
                        </p>
                        {supplier && (supplier.gstNumber || supplier.gst) && (
                          <p className="text-[10px] text-gray-400 font-medium italic mt-0.5">GST: {supplier.gstNumber || supplier.gst}</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* Right column */}
              <div className="space-y-4">
                <Field
                  label="Challan / Invoice No. *"
                  value={newGRN.challan}
                  onChange={(e) => setNewGRN({ ...newGRN, challan: e.target.value })}
                  required
                  error={errors.challan}
                />
                <Field
                  label="MR No. (Material Requirement)"
                  value={newGRN.mrNo}
                  onChange={(e) => setNewGRN({ ...newGRN, mrNo: e.target.value })}
                  placeholder="Auto-filled if PO selected"
                />
                <SField
                  label="Document Type *"
                  value={newGRN.docType}
                  onChange={(e) => setNewGRN({ ...newGRN, docType: e.target.value })}
                  options={["Challan", "Invoice", "Bilty", "Gate Pass", "Without Challan", "Without Gate Pass"]}
                  error={errors.docType}
                />
                <MultipleImageUpload
                  label="Challan Photos"
                  id="challanPhotos"
                  values={newGRN.challanPhotos || []}
                  onUpload={(urls) => setNewGRN((prev) => ({ ...prev, challanPhotos: [...(prev.challanPhotos || []), ...urls] }))}
                  onRemove={(idx) => setNewGRN((prev) => ({ ...prev, challanPhotos: (prev.challanPhotos || []).filter((_, i) => i !== idx) }))}
                  onUploadingChange={setIsUploading}
                  small
                />
              </div>
            </div>

            {/* Received By + Person Photos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-gray-100/60 dark:border-gray-800/80">
              <Field
                label="Received By *"
                value={newGRN.personName}
                onChange={(e) => setNewGRN({ ...newGRN, personName: e.target.value })}
                required
                error={errors.personName}
              />
              <MultipleImageUpload
                label="Person Photos"
                id="personPhotos"
                values={newGRN.personPhotos || []}
                onUpload={(urls) => setNewGRN((prev) => ({ ...prev, personPhotos: [...(prev.personPhotos || []), ...urls] }))}
                onRemove={(idx) => setNewGRN((prev) => ({ ...prev, personPhotos: (prev.personPhotos || []).filter((_, i) => i !== idx) }))}
                onUploadingChange={setIsUploading}
                small
              />
            </div>

            {/* Items table */}
            <div className="space-y-4 pt-5 border-t border-gray-100/60 dark:border-gray-800/80">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold text-gray-500 tracking-wider px-2">Receipt items</h4>
                {(editingReceiptIdx === null || isEditing || targetGRNId) && (
                  <button
                    disabled={!newGRN.poId}
                    onClick={() => {
                      const items = [...(newGRN.items || [])];
                      items.push({ sku: "", itemName: "", ordered: 0, received: 0, variance: 0, unit: "NOS", images: [] });
                      setNewGRN({ ...newGRN, items });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black border border-primary/25 text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add item
                  </button>
                )}
              </div>

              {errors.items && <p className="text-xs text-red-500 font-medium px-2">{errors.items}</p>}

              <div className="border border-gray-150/60 dark:border-gray-800/80 rounded-2xl overflow-x-auto shadow-xs bg-gray-50/25 dark:bg-[#0F172A]/40 min-h-[200px] pb-2">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="bg-gray-50/10 dark:bg-[#0F172A]/40 backdrop-blur-md">
                    <tr>
                      {["Item", "PO Qty → Outstanding", "Unit", "Receiving Now", "Variance", "Material Photos", ""].map((h) => (
                        <th key={h} className="px-4 py-3.5 text-[10px] font-black text-gray-400 dark:text-gray-500 whitespace-nowrap border-b border-gray-100 dark:border-gray-800">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/80">
                    {newGRN.items?.map((item, idx) => (
                      <tr key={idx} className="transition-all duration-200">
                        {/* Item */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center border border-orange-100/50 dark:border-orange-900/10 shrink-0">
                              <Package className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            {item.sku ? (
                              <div className="flex flex-col">
                                <span className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight">
                                  {item.itemName || "Unknown Item"}
                                </span>
                                <span className="text-[11px] text-gray-500 font-mono mt-0.5">{item.sku}</span>
                              </div>
                            ) : (
                              <input
                                placeholder="Item name..."
                                className="text-[13px] font-bold bg-white/40 dark:bg-[#0F172A]/30 border border-gray-200/50 dark:border-gray-800/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-3 h-[36px] outline-none transition-all w-40"
                                value={item.itemName}
                                onChange={(e) => updateItem(idx, { itemName: e.target.value })}
                              />
                            )}
                          </div>
                        </td>
                        {/* PO Qty → Outstanding */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            {item.poOrdered !== undefined && item.poOrdered !== item.ordered && (
                              <div className="flex items-center gap-1 text-[9px] text-gray-400 font-bold">
                                <span>PO: {item.poOrdered}</span>
                                {item.alreadyReceived > 0 && <span className="text-amber-500">| Prev: {item.alreadyReceived}</span>}
                              </div>
                            )}
                            <div className={cn(
                              "inline-flex items-center px-3 py-1 rounded-xl border shadow-xs font-bold text-xs h-7 min-w-[50px] justify-center",
                              item.alreadyReceived > 0
                                ? "bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-blue-500/5 text-blue-500 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30"
                            )}>
                              {item.ordered}
                            </div>
                          </div>
                        </td>
                        {/* Unit */}
                        <td className="px-4 py-3 text-center">
                          <span className="text-[11px] font-bold text-blue-500 px-2.5 py-1 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                            {item.unit}
                          </span>
                        </td>
                        {/* Received */}
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            value={item.received}
                            onChange={(e) => updateItem(idx, { received: Number(e.target.value) })}
                            className="w-20 text-center text-[13px] font-bold bg-emerald-500/5 border border-emerald-500/20 dark:border-emerald-500/30 rounded-xl px-3 py-1.5 shadow-inner text-emerald-600 dark:text-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all h-9"
                          />
                        </td>
                        {/* Variance */}
                        <td className="px-4 py-3 text-center">
                          <div className={cn(
                            "inline-flex items-center px-3 py-1 rounded-xl border shadow-xs font-bold text-xs h-9 min-w-[50px] justify-center",
                            item.variance === 0
                              ? "bg-gray-500/5 text-gray-400 border-gray-500/20"
                              : item.variance > 0
                                ? "bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "bg-rose-500/5 text-red-500 dark:text-rose-400 border-rose-500/20"
                          )}>
                            {item.variance > 0 ? `+${item.variance}` : item.variance}
                          </div>
                        </td>
                        {/* Photos */}
                        <td className="px-4 py-3">
                          <MultipleImageUpload
                            id={`item-photos-${idx}`}
                            label=""
                            values={item.images || []}
                            onUpload={(urls) => updateItem(idx, { images: [...(item.images || []), ...urls] })}
                            onRemove={(imgIdx) => updateItem(idx, { images: (item.images || []).filter((_, i) => i !== imgIdx) })}
                            small
                            onUploadingChange={setIsUploading}
                          />
                        </td>
                        {/* Remove */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => {
                              const items = [...(newGRN.items || [])];
                              items.splice(idx, 1);
                              setNewGRN({ ...newGRN, items });
                            }}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
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
          <div className="flex justify-center items-center p-2">
            <img
    src={previewImage}
    alt="Preview"
    className="max-w-full max-h-[70vh] rounded-lg shadow-xl"
    referrerPolicy="no-referrer"
  />
          </div>
        </Modal>}

      {deleteConfirm && <ConfirmModal
    title="Delete GRN Record"
    message="Are you sure you want to delete this GRN record? This action cannot be undone."
    onConfirm={confirmDelete}
    onCancel={() => setDeleteConfirm(null)}
    loading={actionLoading}
  />}

      {/* Shipment Edit Drawer — removed, now reuses the main GRN modal */}
      {false && (
        <>
          <div />
          <div>
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 shrink-0">
              <div>
                <h2 className="text-[15px] font-black text-gray-900 dark:text-white">
                  Edit Shipment {(editingReceiptIdx ?? 0) + 2}
                </h2>
                <p className="text-[11px] text-gray-400 mt-0.5">{selectedGRN.id}</p>
              </div>
              <button
                onClick={() => { setEditReceiptDrawerOpen(false); setEditingReceiptIdx(null); setEditReceiptData(null); setEditReceiptOriginalItems([]); }}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Challan + Received By */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Challan No.</label>
                  <input
                    value={editReceiptData.challan}
                    onChange={e => setEditReceiptData(p => ({ ...p, challan: e.target.value }))}
                    placeholder="Enter challan number"
                    className="w-full px-3 py-2 text-[13px] border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Received By</label>
                  <input
                    value={editReceiptData.personName}
                    onChange={e => setEditReceiptData(p => ({ ...p, personName: e.target.value }))}
                    placeholder="Person name"
                    className="w-full px-3 py-2 text-[13px] border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30"
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-0.5 w-4 bg-orange-500" />
                  <h3 className="text-[12px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Received Items & Quantities</h3>
                </div>
                <div className="space-y-3">
                  {editReceiptData.items.map((item, i) => {
                    const grnItem = selectedGRN.items.find(gi => gi.sku === item.sku);
                    const originalQty = editReceiptOriginalItems.find(oi => oi.sku === item.sku)?.received ?? 0;
                    const ordered = grnItem?.ordered ?? 0;
                    const currentTotalReceived = grnItem?.received ?? 0;
                    const unit = grnItem?.unit || item.unit || "NOS";

                    // Max qty this receipt can hold = ordered minus all OTHER receipts
                    const otherReceiptsTotal = currentTotalReceived - originalQty;
                    const maxQty = Math.max(0, ordered - otherReceiptsTotal);

                    const currentQty = item.received ?? 0;
                    const delta = currentQty - originalQty;
                    const newTotal = currentTotalReceived + delta;
                    const newVariance = newTotal - ordered; // negative = under, 0 = exact, positive = over
                    const remaining = ordered - newTotal;   // still needs to be received

                    const updateQty = (val) => {
                      const clamped = Math.min(maxQty, Math.max(0, val));
                      setEditReceiptData(p => ({
                        ...p,
                        items: p.items.map((it, idx) => idx === i ? { ...it, received: clamped } : it)
                      }));
                    };

                    return (
                      <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-100 dark:border-gray-800">
                        {/* Item header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-[13px] font-bold text-gray-900 dark:text-white leading-tight">{item.itemName}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{item.sku}</p>
                          </div>
                          <div className="text-right shrink-0 ml-2 space-y-0.5">
                            <p className="text-[10px] text-gray-400">Ordered: <span className="font-bold text-gray-600 dark:text-gray-300">{ordered} {unit}</span></p>
                            <p className="text-[10px] text-gray-400">Total received: <span className="font-bold text-gray-600 dark:text-gray-300">{currentTotalReceived + delta} {unit}</span></p>
                          </div>
                        </div>

                        {/* Qty stepper */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1 flex-1">
                            <button
                              onClick={() => updateQty(currentQty - 1)}
                              disabled={currentQty <= 0}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-lg leading-none transition-colors select-none disabled:opacity-30 disabled:cursor-not-allowed"
                            >−</button>
                            <input
                              type="number"
                              min="0"
                              max={maxQty}
                              value={currentQty}
                              onChange={e => updateQty(parseFloat(e.target.value) || 0)}
                              className="w-20 text-center px-2 py-1.5 text-[14px] font-black border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500"
                            />
                            <button
                              onClick={() => updateQty(currentQty + 1)}
                              disabled={currentQty >= maxQty}
                              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold text-lg leading-none transition-colors select-none disabled:opacity-30 disabled:cursor-not-allowed"
                            >+</button>
                            <span className="text-[11px] text-gray-400 ml-1">{unit}</span>
                          </div>

                          {/* Variance pill */}
                          <div className={cn(
                            "px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0",
                            newVariance === 0
                              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                              : newVariance < 0
                                ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                                : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          )}>
                            {newVariance === 0 ? "Fulfilled" : newVariance < 0 ? `${remaining} remaining` : `+${newVariance} over`}
                          </div>
                        </div>

                        {/* Change indicator */}
                        {delta !== 0 && (
                          <p className="mt-2 text-[10px] font-medium text-orange-500">
                            {delta > 0 ? "+" : ""}{delta} from original ({originalQty} → {currentQty} {unit})
                          </p>
                        )}

                        {/* Max reached warning */}
                        {currentQty >= maxQty && maxQty > 0 && (
                          <p className="mt-1.5 text-[10px] font-medium text-blue-500">Max qty reached — order fully covered by this shipment</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex gap-3 shrink-0">
              <Btn
                label="Cancel"
                outline
                className="flex-1"
                onClick={() => { setEditReceiptDrawerOpen(false); setEditingReceiptIdx(null); setEditReceiptData(null); setEditReceiptOriginalItems([]); }}
              />
              <Btn
                label="Save Changes"
                loading={savingReceipt}
                onClick={handleSaveReceipt}
                className="flex-1"
              />
            </div>
          </div>
        </>
      )}
    </div>;
}, "GRNPage");
export {
  GRNPage
};
