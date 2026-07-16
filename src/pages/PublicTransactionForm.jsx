var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../store";
import { Card, Btn, Field, SField, SearchSelect, MultipleImageUpload } from "../components/ui";
import { CheckCircle, Trash2, Plus, Package, AlertCircle, X } from "lucide-react";
import { genId, scrollToError, formatDateTime } from "../utils";
import { toast } from "react-hot-toast";
const PublicTransactionForm = /* @__PURE__ */ __name(({ type }) => {
  const {
    fetchPublicInventory,
    fetchPublicCatalogue,
    fetchPublicGatePasses,
    fetchPublicSuppliers,
    submitPublicInward,
    submitPublicOutward,
    submitPublicInwardReturn,
    submitPublicOutwardReturn,
    uploadPublicImage,
    actionLoading,
    fetchResource,
    settings
  } = useAppStore();
  useEffect(() => {
    fetchResource("public-settings");
  }, [fetchResource]);
  const { projects: PROJECTS, categories: CATEGORIES, units: UNITS, sites: SITES } = settings;
  const COMBINED_STORES = (SITES || []).map(s => s.siteName);
  const [inventory, setInventory] = useState([]);
  const [localSuppliers, setLocalSuppliers] = useState([]);
  const [availableGatePasses, setAvailableGatePasses] = useState([]);
  const [loadingField, setLoadingField] = useState(null);
  const [form, setForm] = useState({
    project: "",
    otherProjectName: "",
    store: "",
    category: "Construction",
    supplier: "",
    personName: "",
    location: "",
    destinationProject: "",
    date: (/* @__PURE__ */ new Date()).toISOString(),
    items: [],
    personPhotoUrl: "",
    personPhotos: [],
    gatePassNo: "",
    challanNo: "",
    challanPhotos: [],
    condition: "New"
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [searchItemVal, setSearchItemVal] = useState("");
  const inventoryOptions = useMemo(() => {
    return inventory.map((i) => ({
      value: i.sku,
      label: i.itemName,
      subLabel: `${i.sku} | Stock: ${i.liveStock}`,
      stock: i.liveStock,
      unit: i.unit
    }));
  }, [inventory]);
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      try {
        if (searchItemVal) {
          const [invResults, catResults] = await Promise.all([
            fetchPublicInventory({ search: searchItemVal }),
            fetchPublicCatalogue({ search: searchItemVal })
          ]);
          const merged = [...invResults];
          const existingSkus = new Set(merged.map((i) => i.sku));
          catResults.forEach((c) => {
            if (!existingSkus.has(c.sku)) {
              merged.push({ ...c, liveStock: 0, unit: c.uom });
            }
          });
          setInventory((prev) => {
            const prevSkus = new Set(prev.map((i) => i.sku));
            const newItems = merged.filter((i) => !prevSkus.has(i.sku));
            if (newItems.length === 0) return prev;
            return [...prev, ...newItems];
          });
        } else if (inventory.length === 0) {
          const inv = await fetchPublicInventory();
          setInventory(inv);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load inventory:", error);
      } finally {
        if (loading) setLoading(false);
      }
    }, searchItemVal ? 400 : 0);
    return () => clearTimeout(delayDebounceFn);
  }, [searchItemVal, fetchPublicInventory, fetchPublicCatalogue, inventory.length, loading]);
  useEffect(() => {
    setForm({
      project: "",
      otherProjectName: "",
      store: "",
      category: "Construction",
      supplier: "",
      personName: "",
      location: "",
      destinationProject: "",
      date: (/* @__PURE__ */ new Date()).toISOString(),
      items: [],
      personPhotoUrl: "",
      personPhotos: [],
      challanNo: "",
      challanPhotos: [],
      condition: "New",
      gatePassNo: type === "Public Transfer Outward" ? genId("GP", Date.now() % 1e3) : ""
    });
    setErrors({});
    setSubmitted(false);
  }, [type]);
  useEffect(() => {
    if (type === "Public Transfer Inward") {
      fetchPublicGatePasses().then(setAvailableGatePasses).catch(() => {});
    }
  }, [type, fetchPublicGatePasses]);
  useEffect(() => {
    fetchPublicSuppliers().then((s) => setLocalSuppliers(s || [])).catch(() => {});
  }, [fetchPublicSuppliers]);
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToError();
    }
  }, [errors]);
  const addItem = /* @__PURE__ */ __name(() => {
    setForm((prev) => ({ ...prev, items: [...prev.items || [], { sku: "", itemName: "", qty: 0, unit: "NOS", category: "", liveStock: 0, remarks: "", images: [], mrNo: "", condition: "New" }] }));
  }, "addItem");
  const addMiscellaneousItem = /* @__PURE__ */ __name(() => {
    const randomNum = Math.floor(1e3 + Math.random() * 9e3);
    setForm((prev) => ({ ...prev, items: [...prev.items || [], { sku: `MISC/GEN/${randomNum}`, itemName: "", qty: 0, unit: "NOS", category: "", liveStock: 0, remarks: "", images: [], mrNo: "", condition: "New", isMiscellaneous: true }] }));
  }, "addMiscellaneousItem");
  const removeItem = /* @__PURE__ */ __name((index) => {
    const items = [...form.items || []];
    items.splice(index, 1);
    setForm((prev) => ({ ...prev, items }));
  }, "removeItem");
  const handleRowItemSelect = /* @__PURE__ */ __name((index, sku) => {
    const inv = inventory.find((i) => i.sku === sku);
    if (!inv) return;
    const items = [...form.items || []];
    items[index] = { ...items[index], sku, itemName: inv.itemName, unit: inv.unit, category: inv.category, liveStock: inv.liveStock };
    setForm((prev) => ({ ...prev, items }));
  }, "handleRowItemSelect");
  const updateItem = /* @__PURE__ */ __name((index, data) => {
    const items = [...form.items || []];
    items[index] = { ...items[index], ...data };
    setForm((prev) => ({ ...prev, items }));
  }, "updateItem");
  const validateForm = /* @__PURE__ */ __name(() => {
    const newErrors = {};
    if (!form.project) newErrors.project = "Project is required";
    if (form.project === "Other" && !form.otherProjectName) newErrors.otherProjectName = "Project Name is required";
    if (!type.includes("Transfer")) {
      if (!form.store) newErrors.store = "Store / Godown is required";
    }
    if (type.includes("Inward Return")) {
      if (!form.supplier) newErrors.supplier = "Supplier is required";
      if (!form.challanNo) newErrors.challanNo = "Challan No is required";
      if (!form.challanPhotos || form.challanPhotos.length === 0) newErrors.challanPhotos = "Challan Photo is required";
    } else if (type.includes("Outward Return")) {
      if (!form.personName) newErrors.personName = "Person Name is required";
      if (!form.location) newErrors.location = "Location / Site is required";
    } else if (type.includes("Transfer")) {
      if (!form.destinationProject) newErrors.destinationProject = "Destination Project is required";
      if (form.destinationProject === "Other" && !form.otherDestProjectName) newErrors.otherDestProjectName = "Destination Project Name is required";
      if (!form.gatePassNo) newErrors.gatePassNo = "Gate Pass No. is required";
      if (!form.personPhotos || form.personPhotos.length === 0) newErrors.personPhotos = "Gate Pass Photo is required";
      if (!form.location) newErrors.location = "Location / Site is required";
    }
    if (!form.items || form.items.length === 0) {
      newErrors.items = "Please add at least one item";
    } else {
      form.items.forEach((item, idx) => {
        if (item.isMiscellaneous && !item.itemName) newErrors[`item_${idx}_itemName`] = `Item ${idx + 1}: Name is required`;
        if (!item.isMiscellaneous && !item.sku) newErrors[`item_${idx}_sku`] = `Item ${idx + 1}: SKU is required`;
        if (!item.qty || item.qty <= 0) newErrors[`item_${idx}_qty`] = `Item ${idx + 1}: Quantity is required`;
        if (!item.images || item.images.length === 0) newErrors[`item_${idx}_photos`] = `Item ${idx + 1}: At least one photo is required`;
      });
    }
    setErrors(newErrors);
    return newErrors;
  }, "validateForm");
  const handleSubmit = /* @__PURE__ */ __name(async () => {
    const newErrors = validateForm();
    if (Object.keys(newErrors).length > 0) { toast.error(Object.values(newErrors)[0]); return; }
    const prefix = type === "Public Inward Return" ? "PUB-INR" : type === "Public Outward Return" ? "PUB-OTR" : type === "Public Transfer Inward" ? "PUB-TFI" : "PUB-TFO";
    const finalProject = form.project === "Other" ? form.otherProjectName : form.project;
    const finalDestProject = form.destinationProject === "Other" ? form.otherDestProjectName : form.destinationProject;
    const payload = {
      ...form,
      project: finalProject,
      destinationProject: finalDestProject,
      id: genId(prefix, Date.now() % 1e4),
      type,
      status: "Confirmed",
      createdBy: "Public User",
      mrNo: form.items?.[0]?.mrNo || "",
      materialPhotoUrl: form.items?.[0]?.images?.[0] || "",
      challanPhotoUrl: form.challanPhotos?.[0] || "",
      sourceSite: isOutwardReturn ? (form.location || form.project || form.store || "") : form.store || "",
      items: form.items?.map((item) => ({
        ...item,
        qty: Number(item.qty),
        unit: item.unit || "Nos",
        itemName: item.itemName || item.materialName || "",
        condition: (item.condition || form.condition || "New").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        materialPhotoUrl: item.images?.[0] || ""
      }))
    };
    delete payload.otherProjectName;
    delete payload.otherDestProjectName;
    try {
      if (type === "Public Inward Return") {
        await submitPublicInwardReturn(payload);
      } else if (type === "Public Outward Return") {
        await submitPublicOutwardReturn(payload);
      } else if (type.includes("Outward")) {
        await submitPublicOutward(payload);
      } else {
        await submitPublicInward(payload);
      }
      setSubmitted(true);
      toast.success(`${type} record submitted successfully!`);
    } catch (error) {
      setErrors({ form: `Failed to submit: ${error.message}` });
      toast.error("Submission failed");
    }
  }, "handleSubmit");
  const isTransfer = type.includes("Transfer");
  const isInwardReturn = type.includes("Inward Return");
  const isOutwardReturn = type.includes("Outward Return");
  const isTransferOutward = type === "Public Transfer Outward";
  const isTransferInward = type === "Public Transfer Inward";
  const formTitle = isInwardReturn ? "New Inward Return Transaction" : isOutwardReturn ? "New Outward Return Transaction" : isTransferInward ? "New Transfer Inward Transaction" : "New Transfer Outward Transaction";
  const INITIAL_RESET = {
    project: "", otherProjectName: "", store: "", category: "Construction", supplier: "", personName: "", location: "", destinationProject: "", date: (/* @__PURE__ */ new Date()).toISOString(), items: [], personPhotoUrl: "", personPhotos: [], challanNo: "", challanPhotos: [], condition: "New",
    gatePassNo: isTransferOutward ? genId("GP", Date.now() % 1e3) : ""
  };
  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>;
  }
  if (submitted) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Submission Successful!</h2>
          <p className="text-gray-600 dark:text-gray-400">Your {type} transaction has been recorded in the system.</p>
          <Btn label="Submit Another" className="w-full" onClick={() => { setSubmitted(false); setForm(INITIAL_RESET); setErrors({}); }} />
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-[11px] font-bold tracking-[0.15em] text-primary uppercase mb-1">Public Portal</p>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{formTitle}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Record {type.toLowerCase()} at the site</p>
        </div>

        <Card topBar className="p-6 sm:p-8">
          <div className="space-y-6 pb-4">
            {errors.form && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-bold">
                <AlertCircle className="w-5 h-5" />
                {errors.form}
              </div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <SField
    label={isTransfer ? "Source Store / Godown *" : "Project *"}
    value={form.project}
    onChange={(e) => setForm((prev) => ({ ...prev, project: e.target.value }))}
    options={isTransfer ? COMBINED_STORES : PROJECTS}
    required
    error={errors.project}
  />
                {!isTransfer && form.project === "Other" && <Field
    label="Other Project Name *"
    value={form.otherProjectName}
    onChange={(e) => setForm((prev) => ({ ...prev, otherProjectName: e.target.value }))}
    required
    error={errors.otherProjectName}
  />}
                {isTransfer ? <SField
    label="Destination Store / Godown *"
    value={form.destinationProject}
    onChange={(e) => setForm((prev) => ({ ...prev, destinationProject: e.target.value }))}
    options={COMBINED_STORES}
    required
    error={errors.destinationProject}
  /> : !isTransfer && <SField
    label="Store / Godown *"
    value={form.store}
    onChange={(e) => setForm((prev) => ({ ...prev, store: e.target.value }))}
    options={COMBINED_STORES}
    required
    error={errors.store}
  />}
                {isInwardReturn && <SearchSelect
    label="Supplier *"
    value={form.supplier || ""}
    onChange={(val) => setForm((prev) => ({ ...prev, supplier: val }))}
    options={localSuppliers.map((v) => ({
      value: v.id || v._id || v.companyName || v.name,
      label: v.companyName || v.name,
      subLabel: `${v.ownerName || v.contact || "N/A"} | ${v.mobile || v.phone || "N/A"}`
    }))}
    placeholder="Search supplier..."
    error={errors.supplier}
    required
  />}
                {isOutwardReturn && <Field
    label="Person Name *"
    value={form.personName}
    onChange={(e) => setForm((prev) => ({ ...prev, personName: e.target.value }))}
    required
    error={errors.personName}
  />}
                {isTransferInward && <SearchSelect
    label="Choose Gate Pass *"
    value={form.gatePassNo}
    onChange={(val) => {
      const gp = availableGatePasses.find((g) => g.gatePassNo === val);
      if (gp) {
        setForm((prev) => ({
          ...prev,
          gatePassNo: gp.gatePassNo,
          project: gp.project,
          destinationProject: gp.destinationProject,
          items: (gp.items || []).map((it) => ({ ...it, outwardQty: it.qty, qty: it.qty, variance: 0 }))
        }));
      }
    }}
    options={availableGatePasses.map((gp) => ({
      value: gp.gatePassNo || "",
      label: `${gp.gatePassNo} (${gp.project} → ${gp.destinationProject})`,
      subLabel: `Items: ${gp.items?.length || 0} | Date: ${new Date(gp.date).toLocaleDateString()}`
    }))}
    placeholder="Select an outward gate pass..."
    error={errors.gatePassNo}
  />}
                {isTransferOutward && <Field
    label="Gate Pass No. (Auto-generated) *"
    value={form.gatePassNo}
    readOnly
    required
    error={errors.gatePassNo}
    helperText="Unique Gate Pass ID for this transfer"
  />}
                {isInwardReturn && <Field
    label="Challan / Invoice No. *"
    value={form.challanNo}
    onChange={(e) => setForm((prev) => ({ ...prev, challanNo: e.target.value }))}
    required
    error={errors.challanNo}
  />}
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transaction Date</p>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    {formatDateTime(form.date)}
                  </p>
                </div>
                {(isInwardReturn || isOutwardReturn || isTransferOutward) && <SField
    label="Condition *"
    value={form.condition}
    onChange={(e) => setForm((prev) => ({ ...prev, condition: e.target.value }))}
    options={["New", "Good", "Needs Repair", "Damaged", "Old"]}
    required
  />}
                {(isTransfer || isOutwardReturn) && <Field
    label="Specific Location / Site *"
    value={form.location}
    onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
    required
    error={errors.location}
  />}
                {isInwardReturn && <MultipleImageUpload
    id="common-challan-upload"
    label="Challan / Invoice Photos *"
    onUpload={(urls) => setForm((prev) => ({ ...prev, challanPhotos: [...prev.challanPhotos || [], ...urls] }))}
    values={form.challanPhotos || []}
    onRemove={(imgIdx) => {
      const newPhotos = (form.challanPhotos || []).filter((_, i) => i !== imgIdx);
      setForm((prev) => ({ ...prev, challanPhotos: newPhotos }));
    }}
    small
    onUploadingChange={setIsUploading}
    error={errors.challanPhotos}
  />}
                {(isOutwardReturn || isTransfer) && <MultipleImageUpload
    id={isTransfer ? "gate-pass-photos-upload" : "person-photos-upload"}
    label={isTransfer ? "Gate Pass Photo *" : "Person Photo (Handover) *"}
    onUpload={(urls) => setForm((prev) => {
      const newPhotos = [...prev.personPhotos || [], ...urls];
      return { ...prev, personPhotos: newPhotos, personPhotoUrl: newPhotos[0] || "" };
    })}
    values={form.personPhotos || []}
    onRemove={(imgIdx) => {
      setForm((prev) => {
        const newPhotos = (prev.personPhotos || []).filter((_, i) => i !== imgIdx);
        return { ...prev, personPhotos: newPhotos, personPhotoUrl: newPhotos[0] || "" };
      });
    }}
    small
    onUploadingChange={setIsUploading}
    error={isTransfer ? errors.personPhotos : errors.personPhotoUrl}
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
                  {isTransfer && <Btn
    label="Misc Item"
    icon={Plus}
    outline
    small
    onClick={addMiscellaneousItem}
  />}
                </div>
              </div>

              <div className="space-y-4">
                {form.items && form.items.length > 0 ? <>
                    <div className="grid grid-cols-1 gap-6 md:hidden">
                      {form.items.map((item, idx) => <Card key={idx} className="p-4 space-y-4 relative bg-gray-50 dark:bg-gray-800/50">
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
    label="MR No."
    value={item.mrNo}
    onChange={(e) => updateItem(idx, { mrNo: e.target.value })}
    placeholder="MR-XXXX"
  />
                            <MultipleImageUpload
    id={`item-photos-mob-${idx}`}
    label="Material Photos *"
    onUpload={(urls) => updateItem(idx, { images: [...item.images || [], ...urls] })}
    values={item.images || []}
    onRemove={(imgIdx) => {
      const newImages = (item.images || []).filter((_, i) => i !== imgIdx);
      updateItem(idx, { images: newImages });
    }}
    small
    onUploadingChange={setIsUploading}
    error={errors[`item_${idx}_photos`]}
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
                              {isTransferInward && <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-right w-[10%]">Outward Qty</th>}
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-right w-[12%]">
                                {isTransferInward ? "Received Qty *" : "Qty *"}
                              </th>
                              {isTransferInward && <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-right w-[10%]">Variance</th>}
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-center w-[10%]">Unit</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-[12%]">MR No.</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-[20%]">Photos</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-10 text-center" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {form.items.map((item, idx) => <tr key={idx} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all">
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
                                {isTransferInward && <td className="px-4 py-5 align-top text-right">
                                    <div className="flex flex-col items-end">
                                      <span className="text-[14px] font-black text-blue-500 font-mono tracking-tighter">{item.outwardQty || 0}</span>
                                      <span className="text-[9px] text-gray-400 font-black tracking-widest leading-none mt-1">Outward</span>
                                    </div>
                                  </td>}
                                <td className="px-4 py-5 align-top">
                                  <div className="relative">
                                    <input
    type="number"
    value={item.qty || 0}
    onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
    placeholder="0"
    className="w-full px-2 py-2 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl text-[14px] font-black text-center sm:text-right focus:outline-none focus:border-orange-500 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
  />
                                    {isTransferInward && (item.qty || 0) !== (item.outwardQty || 0) && <div className="absolute -top-2 -right-1 px-1.5 py-0.5 bg-amber-500 text-white text-[8px] font-black rounded">
                                        Variance!
                                      </div>}
                                  </div>
                                </td>
                                {isTransferInward && <td className="px-4 py-5 align-top text-right">
                                    <div className="flex flex-col items-end">
                                      <span className={`text-[14px] font-black font-mono tracking-tighter ${(item.outwardQty || 0) - (item.qty || 0) === 0 ? "text-emerald-600" : "text-red-500"}`}>
                                        {(item.outwardQty || 0) - (item.qty || 0)}
                                      </span>
                                      <span className="text-[9px] text-gray-400 font-black tracking-widest leading-none mt-1">Variance</span>
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
    error={errors[`item_${idx}_photos`]}
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
                    <p className="text-xs text-gray-500">Click "Add Item" to include materials in this transaction.</p>
                  </div>}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <Btn
    label="Discard"
    outline
    onClick={() => { setForm(INITIAL_RESET); setErrors({}); }}
  />
              <Btn
    label={actionLoading ? "Processing..." : isUploading ? "Uploading..." : "Confirm Transaction"}
    onClick={handleSubmit}
    loading={actionLoading || isUploading}
    disabled={actionLoading || isUploading || !form.items?.length}
    className="px-8"
  />
            </div>
          </div>
        </Card>
      </div>
    </div>;
}, "PublicTransactionForm");
export {
  PublicTransactionForm
};
