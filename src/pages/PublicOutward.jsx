var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../store";
import { Card, Btn, Field, SField, SearchSelect, MultipleImageUpload } from "../components/ui";
import { CheckCircle, Plus, Trash2, Package, AlertCircle, X } from "lucide-react";
import { genId, scrollToError, formatDateTime } from "../utils";
import { toast } from "react-hot-toast";
const PublicOutward = /* @__PURE__ */ __name(() => {
  const {
    fetchPublicInventory,
    fetchPublicCatalogue,
    fetchPublicMRs,
    submitPublicOutward,
    uploadPublicImage,
    actionLoading,
    fetchResource,
    settings
  } = useAppStore();
  useEffect(() => {
    fetchResource("public-settings");
    fetchPublicMRs();
  }, [fetchResource, fetchPublicMRs]);
  const { projects: PROJECTS, sites: SITES } = settings;
  const COMBINED_STORES = (SITES || []).map(s => s.siteName);
  const { materialRequirements: publicMRs } = useAppStore();
  const INITIAL_FORM = {
    project: "",
    otherProjectName: "",
    store: "",
    handoverTo: "",
    personName: "",
    location: "",
    date: (/* @__PURE__ */ new Date()).toISOString(),
    items: [],
    personPhotoUrl: "",
    personPhotos: [],
    gatePassNo: ""
  };
  const [inventory, setInventory] = useState([]);
  const [loadingField, setLoadingField] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const mrOptions = useMemo(() => {
    return (publicMRs || []).filter(
      (m) => ["Approved", "Approved by Store", "Approved by AGM", "Approved by Director", "Partially Issued"].includes(m.status) && m.items.some((i) => (i.allocatedQty || 0) > 0)
    ).map((m) => ({ label: `${m.id} | ${m.project} | ${m.requesterName}`, value: m.id }));
  }, [publicMRs]);
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
    if (!searchItemVal) return;
    const delayDebounceFn = setTimeout(async () => {
      try {
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
      } catch (error) {
        console.error("Search failed:", error);
      }
    }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [searchItemVal, fetchPublicInventory, fetchPublicCatalogue]);
  useEffect(() => {
    const loadData = /* @__PURE__ */ __name(async () => {
      try {
        const inv = await fetchPublicInventory();
        setInventory(inv);
      } catch (error) {
        toast.error("Failed to load inventory data");
      } finally {
        setLoading(false);
      }
    }, "loadData");
    loadData();
  }, []);
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToError();
    }
  }, [errors]);
  const addItem = /* @__PURE__ */ __name(() => {
    setForm((prev) => ({ ...prev, items: [...prev.items || [], { sku: "", itemName: "", qty: 0, unit: "NOS", category: "", liveStock: 0, remarks: "", images: [], mrNo: "" }] }));
  }, "addItem");
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
    const newItems = [...form.items || []];
    newItems[index] = { ...newItems[index], ...data };
    setForm((prev) => ({ ...prev, items: newItems }));
  }, "updateItem");
  const removeImage = /* @__PURE__ */ __name((itemIndex, imgIndex) => {
    const newItems = [...form.items || []];
    newItems[itemIndex].images = newItems[itemIndex].images?.filter((_, i) => i !== imgIndex);
    setForm((prev) => ({ ...prev, items: newItems }));
  }, "removeImage");
  const validateForm = /* @__PURE__ */ __name(() => {
    const newErrors = {};
    if (!form.project) newErrors.project = "Project is required";
    if (form.project === "Other" && !form.otherProjectName) newErrors.otherProjectName = "Project Name is required";
    if (!form.store) newErrors.store = "Store / Godown is required";
    if (!form.personName) newErrors.personName = "Person Name is required";
    if (!form.location) newErrors.location = "Location is required";
    if (!form.personPhotoUrl) newErrors.personPhotoUrl = "Person photo is required";
    if (!form.items || form.items.length === 0) {
      newErrors.items = "Please select at least one item";
    } else {
      form.items.forEach((item, idx) => {
        if (!item.qty || item.qty <= 0) newErrors[`item_${idx}_qty`] = "Required";
        const inv = inventory.find((i) => i.sku === item.sku);
        if (inv && item.qty > inv.liveStock) newErrors[`item_${idx}_qty`] = `Max: ${inv.liveStock}`;
        if (!item.images || item.images.length === 0) newErrors[`item_${idx}_images`] = "At least one photo required";
      });
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, "validateForm");
  const handleSubmit = /* @__PURE__ */ __name(async () => {
    if (!validateForm()) {
      toast.error("Please fix errors in the form");
      return;
    }
    const finalProject = form.project === "Other" ? form.otherProjectName : form.project;
    const payload = {
      ...form,
      project: finalProject,
      id: genId("PUB-OUT", Date.now() % 1e4),
      type: "Public Outward",
      status: "Confirmed",
      createdBy: "Public User",
      materialPhotoUrl: form.items?.[0]?.images?.[0] || "",
      items: form.items?.map((item) => ({
        ...item,
        qty: Number(item.qty),
        condition: (item.condition || "Good").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
        materialPhotoUrl: item.images?.[0] || ""
      }))
    };
    delete payload.otherProjectName;
    try {
      await submitPublicOutward(payload);
      setSubmitted(true);
      toast.success("Outward record submitted successfully!");
    } catch (error) {
      setErrors({ form: `Failed to submit: ${error.message}` });
      toast.error("Submission failed");
    }
  }, "handleSubmit");
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
          <p className="text-gray-600 dark:text-gray-400">Your outward transaction has been recorded in the system.</p>
          <Btn label="Submit Another" className="w-full" onClick={() => { setSubmitted(false); setForm(INITIAL_FORM); setErrors({}); }} />
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <p className="text-[11px] font-bold tracking-[0.15em] text-primary uppercase mb-1">Public Portal</p>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">New Outward Transaction</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Issue materials from the store</p>
        </div>

        <Card topBar className="p-6 sm:p-8">
          <div className="space-y-6 pb-4">
            {errors.form && <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-bold">
                <AlertCircle className="w-5 h-5" />
                {errors.form}
              </div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <SearchSelect
    label="Link to Material Requisition (MR)"
    value={form.mrId || ""}
    onChange={(val) => {
      const mr = publicMRs.find((m) => m.id === val);
      if (mr) {
        setForm((prev) => ({
          ...prev,
          mrId: val,
          project: mr.project,
          items: mr.items.filter((i) => i.sku && i.sku !== "N/A" && (i.allocatedQty || 0) > 0).map((i) => {
            const remaining = Math.max(0, (i.allocatedQty || 0) - (i.issuedQty || 0));
            return { sku: i.sku, itemName: i.materialName, qty: remaining, unit: i.unit, liveStock: 0, remarks: "", images: [], condition: "Good" };
          })
        }));
      } else {
        setForm((prev) => ({ ...prev, mrId: val }));
      }
    }}
    options={mrOptions}
    placeholder="Select MR to issue materials against allocated stock"
  />
                <SField
    label="Project *"
    value={form.project}
    onChange={(e) => setForm((prev) => ({ ...prev, project: e.target.value }))}
    options={PROJECTS}
    required
    error={errors.project}
  />
                {form.project === "Other" && <Field
    label="Other Project Name *"
    value={form.otherProjectName}
    onChange={(e) => setForm((prev) => ({ ...prev, otherProjectName: e.target.value }))}
    required
    error={errors.otherProjectName}
  />}
                <SField
    label="Store / Godown *"
    value={form.store}
    onChange={(e) => setForm((prev) => ({ ...prev, store: e.target.value }))}
    options={COMBINED_STORES}
    required
    error={errors.store}
  />
                <Field
    label="Person Name *"
    value={form.personName}
    onChange={(e) => setForm((prev) => ({ ...prev, personName: e.target.value, handoverTo: e.target.value }))}
    required
    error={errors.personName}
  />
                <Field
    label="Gate Pass No. (Optional)"
    value={form.gatePassNo}
    onChange={(e) => setForm((prev) => ({ ...prev, gatePassNo: e.target.value }))}
  />
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Transaction Date</p>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    {formatDateTime(form.date)}
                  </p>
                </div>
                <Field
    label="Specific Location / Site *"
    value={form.location}
    onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
    required
    error={errors.location}
  />
                <MultipleImageUpload
    label="Person Photo (Handover) *"
    id="person-photos"
    values={form.personPhotos || []}
    onUpload={(urls) => {
      setForm((prev) => {
        const newPhotos = [...prev.personPhotos || [], ...urls];
        return { ...prev, personPhotos: newPhotos, personPhotoUrl: newPhotos[0] || "" };
      });
    }}
    onRemove={(idx) => {
      setForm((prev) => {
        const newPhotos = (prev.personPhotos || []).filter((_, i) => i !== idx);
        return { ...prev, personPhotos: newPhotos, personPhotoUrl: newPhotos[0] || "" };
      });
    }}
    small
    onUploadingChange={setIsUploading}
    error={errors.personPhotoUrl}
  />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Items List</h3>
                <Btn
    label="Add Item"
    icon={Plus}
    outline
    small
    onClick={addItem}
  />
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
                            <SearchSelect
    label="Search Material *"
    options={inventoryOptions}
    value={item.sku}
    onChange={(val) => handleRowItemSelect(idx, val)}
    onSearch={(val) => setSearchItemVal(val)}
    placeholder="Start typing material name..."
    error={errors[`item_${idx}_sku`]}
  />
                            <div className="grid grid-cols-2 gap-4">
                              <Field
    label="Quantity *"
    value={item.qty}
    onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
    type="number"
    placeholder="0"
    error={errors[`item_${idx}_qty`]}
  />
                              <div className="space-y-1">
                                <p className="text-[11px] font-bold text-gray-500 tracking-wider mb-1">Unit</p>
                                <div className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-[13px] font-bold text-gray-500 text-center h-[42px] flex items-center justify-center">
                                  {item.unit}
                                </div>
                              </div>
                            </div>
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
    error={errors[`item_${idx}_images`]}
  />
                          </div>
                        </Card>)}
                    </div>

                    <div className="hidden md:block overflow-visible">
                      <div className="overflow-visible rounded-xl border border-gray-200 dark:border-gray-800">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 [&>th:first-child]:rounded-tl-[11px] [&>th:last-child]:rounded-tr-[11px]">
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-left w-[30%]">Material Description *</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-right w-[12%]">Issue Qty *</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 text-center w-[10%]">Unit</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-[30%]">Photos *</th>
                              <th className="px-4 py-3 text-[11px] font-bold text-gray-500 dark:text-gray-400 w-10 text-center" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {form.items.map((item, idx) => <tr key={idx} className="group hover:bg-gray-50/50 dark:hover:bg-gray-800/20 transition-all">
                                <td className="px-6 py-5 align-top">
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
                                </td>
                                <td className="px-4 py-5 align-top">
                                  <input
    type="number"
    value={item.qty || 0}
    onChange={(e) => updateItem(idx, { qty: Number(e.target.value) })}
    placeholder="0"
    className="w-full px-2 py-2 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-xl text-[14px] font-black text-center sm:text-right focus:outline-none focus:border-orange-500 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
  />
                                </td>
                                <td className="px-6 py-5 align-top">
                                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] font-bold text-gray-500 text-center mt-0.5">
                                    {item.unit}
                                  </div>
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
    error={errors[`item_${idx}_images`]}
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
    onClick={() => { setForm(INITIAL_FORM); setErrors({}); }}
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
}, "PublicOutward");
export {
  PublicOutward
};
