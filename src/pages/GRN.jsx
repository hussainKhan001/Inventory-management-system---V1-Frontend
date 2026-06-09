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
import { Plus, X, Eye, Pencil, Trash2, Download, Package } from "lucide-react";
import { TableVirtuoso } from "react-virtuoso";
import { SearchFilter, DateRangePicker, SelectFilter, FilterRow } from "../components/ui/Filters";
import { genId, scrollToError, formatDateTime, safeStr } from "../utils";
import { cn } from "../lib/utils";
import { toast } from "react-hot-toast";
const GRNPage = /* @__PURE__ */ __name(() => {
  const {
    grns,
    grnsPagination,
    fetchResource,
    addGRN,
    updateGRN,
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
  const { projects: PROJECTS = [] } = settings;
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
    { label: "Confirmed", value: "Confirmed" }
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
    fetchResource("suppliers", 1, 1e3, true);
  }, [fetchResource, page, debouncedSearch, startDate, endDate, filterProject, filterSupplier, filterStatus]);
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
    items: [],
    challanPhotos: [],
    images: [],
    personName: "",
    personPhotos: [],
    destinationProject: "",
    gatePassNo: ""
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
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
  const approvedPOs = pos.filter((p) => p.status === "GRN Pending");
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
    const items = po.items.map((i) => ({
      sku: i.sku,
      itemName: i.itemName || i.name || i.material || i.description || i.itemDescription || i.item || "Unknown Item",
      ordered: i.qty || i.quantity || 0,
      received: i.qty || i.quantity || 0,
      // Default to full receipt, user can adjust
      variance: 0,
      unit: i.unit || i.uqc || "NOS",
      images: []
    }));
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
        setNewGRN({
          poId: "",
          challan: "",
          mrNo: "",
          docType: "Challan",
          items: [],
          personName: "",
          personPhotos: [],
          destinationProject: "",
          gatePassNo: ""
        });
        setIsEditing(false);
        setErrors({});
      } catch (error) {
        toast.error(`Failed to update GRN: ${error.message}`);
      }
      return;
    }
    const maxIdNum = grns.reduce((max, g) => {
      const parts = g.id.split("-");
      const num = parseInt(parts[parts.length - 1] || "0");
      return num > max ? num : max;
    }, 0);
    const grnId = genId("GRN", maxIdNum);
    const grn = {
      id: grnId,
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
      status: "Confirmed",
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
                <th className={cn(headerClass, "hidden md:table-cell w-[160px]")}>
                  Project / supplier
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-[150px]")}>
                  Challan / mr
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-[90px]")}>
                  Photos
                </th>
                <th className={cn(headerClass, "hidden md:table-cell w-[90px]")}>
                  Status
                </th>
                <th className={cn(headerClass, "text-right w-[110px]")}>
                  Actions
                </th>
              </tr>;
    }}
    itemContent={(_index, grn) => <>
              <Td className="md:px-4 md:py-3 py-1">
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
              <Td className="md:px-4 md:py-3 py-2 text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
      title="View Details"
      onClick={() => {
        setSelectedGRN(grn);
        setViewModal(true);
      }}
      className="p-2 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
    >
                    <Eye className="w-4 h-4" />
                  </button>
                  
                  {hasPermission("EDIT_GRN") && <button
      title="Edit GRN"
      onClick={() => {
        setNewGRN(grn);
        setIsEditing(true);
        setModal(true);
      }}
      className="p-2 rounded-lg text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
    >
                      <Pencil className="w-4 h-4" />
                    </button>}
                  
                  {hasPermission("DELETE_GRN") && <button
      title="Delete GRN"
      onClick={() => setDeleteConfirm(grn.id)}
      className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
    >
                      <Trash2 className="w-4 h-4" />
                    </button>}
                </div>
              </Td>
            </>}
    components={{
      Table: /* @__PURE__ */ __name((props) => <table {...props} className="w-full text-left border-collapse table-fixed min-w-[800px] md:min-w-0" />, "Table"),
      TableBody: React.forwardRef((props, ref) => <tbody {...props} ref={ref} className="divide-y divide-[#E8ECF0] dark:divide-gray-800" />),
      TableRow: /* @__PURE__ */ __name((props) => <tr {...props} className={cn("hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors", props.className)} />, "TableRow")
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
                      {selectedGRN.items.map((item, idx) => {
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
    title={isEditing ? "Edit GRN Transaction" : "New GRN Transaction"}
    extraWide
    onClose={() => {
      setModal(false);
      setErrors({});
      setNewGRN({
        id: "",
        poId: "",
        vendor: "",
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        items: [],
        challanPhotos: [],
        images: [],
        status: "Confirmed"
      });
      setIsEditing(false);
    }}
    footer={<div className="flex justify-end gap-3 w-full">
              <Btn
      label="Cancel"
      className="px-6 py-2 bg-[#1e293b] text-white hover:bg-[#0f172a] shadow-md text-[12px] font-bold tracking-tight"
      onClick={() => {
        setModal(false);
        setErrors({});
      }}
    />
              <Btn
      label={isEditing ? "Confirm update" : "Confirm GRN"}
      onClick={handleCreate}
      loading={actionLoading || isUploading}
      disabled={isUploading}
      className="px-6 py-2 bg-[#F97316] hover:bg-[#EA580C] text-white shadow-md text-[12px] font-bold tracking-tight"
    />
            </div>}
  >
          <div className="space-y-6 pb-4">
            {Object.keys(errors).length > 0 && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <p className="text-[11px] text-red-600 dark:text-red-400 font-bold">
                  Required fields missing: {Object.keys(errors).map((k) => k === "poId" ? "PO" : k === "challan" ? "Challan no" : k === "personName" ? "Received by" : k).join(", ")}
                </p>
              </div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <SField
    label="Purchase Order (PO) *"
    value={newGRN.poId}
    onChange={(e) => handlePOSelect(e.target.value)}
    options={approvedPOs.map((p) => ({
      value: p.id,
      label: `${p.project} (PO: ${p.id})`
    }))}
    required
    error={errors.poId}
    disabled={isEditing}
  />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transaction Date</p>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    {isEditing ? formatDateTime(newGRN.date || "") : formatDateTime((/* @__PURE__ */ new Date()).toISOString())}
                  </p>
                </div>
                <div className="space-y-1">
                   <p className="text-xs font-medium text-gray-500 mb-2">Supplier</p>
                   {(() => {
    const supplierId = newGRN.vendor || newGRN.supplier;
    const supplier = suppliers.find((s) => s.id === supplierId);
    return <div className="flex flex-col gap-1 px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                          <p className="text-[13px] font-bold text-gray-900 dark:text-white">
                            {supplier ? supplier.companyName || supplier.name : supplierId || "Select po to load supplier"}
                          </p>
                          {supplier && (supplier.gstNumber || supplier.gst) && <p className="text-[10px] font-medium text-gray-400">
                              GST: {supplier.gstNumber || supplier.gst}
                            </p>}
                       </div>;
  })()}
                </div>
              </div>
              <div className="space-y-6">
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
    placeholder="Will be auto-filled if PO selected"
  />
                <MultipleImageUpload
    label="Challan Photos"
    id="challanPhotos"
    values={newGRN.challanPhotos || []}
    onUpload={(urls) => setNewGRN((prev) => ({ ...prev, challanPhotos: [...prev.challanPhotos || [], ...urls] }))}
    onRemove={(idx) => setNewGRN((prev) => ({ ...prev, challanPhotos: (prev.challanPhotos || []).filter((_, i) => i !== idx) }))}
    onUploadingChange={setIsUploading}
    small
  />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <Field
    label="Received By *"
    value={newGRN.personName}
    onChange={(e) => setNewGRN({ ...newGRN, personName: e.target.value })}
    required
  />
              <MultipleImageUpload
    label="Person Photos"
    id="personPhotos"
    values={newGRN.personPhotos || []}
    onUpload={(urls) => setNewGRN((prev) => ({ ...prev, personPhotos: [...prev.personPhotos || [], ...urls] }))}
    onRemove={(idx) => setNewGRN((prev) => ({ ...prev, personPhotos: (prev.personPhotos || []).filter((_, i) => i !== idx) }))}
    onUploadingChange={setIsUploading}
    small
  />
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Receipt items</h3>
                <Btn
    label="Add item"
    icon={Plus}
    small
    outline
    disabled={!newGRN.poId}
    onClick={() => {
      const items = [...newGRN.items || []];
      items.push({ sku: "", itemName: "", ordered: 0, received: 0, variance: 0, unit: "NOS", images: [] });
      setNewGRN({ ...newGRN, items });
    }}
  />
              </div>

              {errors.items && <p className="text-xs text-red-500">{errors.items}</p>}

              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-[#1e293b] dark:bg-[#0f172a] text-white">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold">Item</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-right w-24">Ordered</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-center w-24">Unit</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-center w-32">Received</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-right w-24">Variance</th>
                      <th className="px-5 py-3 text-[10px] font-bold">Material photos</th>
                      <th className="px-5 py-3 text-[10px] font-bold w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {newGRN.items?.map((item, idx) => <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-colors">
                        <td className="px-5 py-3">
                           {item.sku ? <div className="flex flex-col">
                               <span className="text-[13px] font-medium text-gray-900 dark:text-white leading-tight">
                                 {item.itemName || item.name || item.material || item.description || "Unknown Item"}
                               </span>
                               <span className="text-[11px] text-gray-500 mt-1">
                                 {item.sku}
                               </span>
                             </div> : <input
    placeholder="Item Name"
    className="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-[13px] focus:ring-1 focus:ring-[#F97316]"
    value={item.itemName}
    onChange={(e) => updateItem(idx, { itemName: e.target.value })}
  />}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                            {item.ordered}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                           <span className="text-[11px] font-medium text-blue-500">
                             {item.unit}
                           </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-center">
                            <input
    type="number"
    value={item.received}
    onChange={(e) => updateItem(idx, { received: Number(e.target.value) })}
    className="w-20 px-2 py-1 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded text-[13px] font-medium text-center focus:ring-1 focus:ring-[#F97316] outline-none"
  />
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className={`text-[13px] font-medium ${item.variance === 0 ? "text-gray-400" : item.variance > 0 ? "text-emerald-500" : "text-red-500"}`}>
                            {item.variance > 0 ? `+${item.variance}` : item.variance}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <MultipleImageUpload
    id={`item-photos-${idx}`}
    label=""
    values={item.images || []}
    onUpload={(urls) => updateItem(idx, { images: [...item.images || [], ...urls] })}
    onRemove={(imgIdx) => updateItem(idx, { images: (item.images || []).filter((_, i) => i !== imgIdx) })}
    small
    onUploadingChange={setIsUploading}
  />
                        </td>
                        <td className="px-5 py-3 text-right">
                           <button
    onClick={() => {
      const items = [...newGRN.items || []];
      items.splice(idx, 1);
      setNewGRN({ ...newGRN, items });
    }}
    className="text-gray-300 hover:text-red-500 transition-colors p-1"
  >
                             <X className="w-3.5 h-3.5" />
                           </button>
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
    </div>;
}, "GRNPage");
export {
  GRNPage
};
