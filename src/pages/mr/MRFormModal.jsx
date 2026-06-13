import React, { useState, useEffect, useMemo } from "react";
import { useAppStore } from "../../store";
import { Modal, Btn, SField, Field } from "../../components/ui";
import { Plus, Trash2 } from "lucide-react";
import { genId, todayStr, scrollToError } from "../../utils";
import { toast } from "react-hot-toast";

export function MRFormModal({ open, isEditing, initialData, onClose, onSuccess }) {
  const {
    inventory, catalogue, plans, settings, role, user,
    materialRequirements, actionLoading,
    addMaterialRequirement, updateMaterialRequirement, api,
  } = useAppStore();

  const { units: UNITS } = settings;

  const emptyForm = () => ({
    planId: "",
    requesterName: "",
    project: "",
    location: "",
    workType: "",
    requirementDate: todayStr(),
    items: [{ materialName: "", sku: "", qty: 1, unit: "", condition: "New", category: "" }],
  });

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [otherRequester, setOtherRequester] = useState("");
  const [otherProject, setOtherProject] = useState("");

  useEffect(() => {
    if (!open) return;
    setForm(isEditing && initialData ? JSON.parse(JSON.stringify(initialData)) : emptyForm());
    setErrors({});
    setOtherRequester("");
    setOtherProject("");
  }, [open, isEditing, initialData]);

  useEffect(() => {
    if (Object.keys(errors).length > 0) scrollToError();
  }, [errors]);

  const isSiteEngineer = role === "Site Engineer";

  const myPlans = useMemo(() => {
    if (!isSiteEngineer || !user?.name) return plans;
    return plans.filter(p => p.engineer?.trim().toLowerCase() === user.name.trim().toLowerCase());
  }, [isSiteEngineer, user?.name, plans]);

  const engineerProjects = useMemo(() => {
    if (!isSiteEngineer) return null;
    return Array.from(new Set(myPlans.map(p => p.project).filter(Boolean)));
  }, [isSiteEngineer, myPlans]);

  const engineerPlanItems = useMemo(() => {
    if (!isSiteEngineer || !form.project) return null;
    const seen = new Set();
    return myPlans
      .filter(p => p.project === form.project)
      .flatMap(p => p.items || [])
      .filter(item => {
        const key = (item.itemName || item.materialName || item.sku || "").toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [isSiteEngineer, form.project, myPlans]);

  const availablePlansForForm = useMemo(() => {
    const approved = plans.filter(p => p.status === "Approved" || p.status === "Open");
    if (isSiteEngineer && user?.name)
      return approved.filter(p => p.engineer?.trim().toLowerCase() === user.name.trim().toLowerCase());
    if (form.project) return approved.filter(p => p.project === form.project);
    return approved;
  }, [isSiteEngineer, user?.name, plans, form.project]);

  const planRemainingQty = useMemo(() => {
    if (!form.planId) return null;
    const plan = plans.find(p => p.id === form.planId);
    if (!plan) return null;
    const existingMRs = materialRequirements.filter(
      mr => mr.planId === form.planId && (!isEditing || mr.id !== form.id)
    );
    const result = {};
    (plan.items || []).forEach(item => {
      const key = (item.sku && item.sku !== "N/A" ? item.sku : item.itemName || item.materialName || "").toLowerCase();
      const usedQty = existingMRs.reduce((sum, mr) => {
        const mi = (mr.items || []).find(i =>
          (item.sku && item.sku !== "N/A" && i.sku === item.sku) ||
          (i.materialName || "").toLowerCase().trim() === (item.itemName || item.materialName || "").toLowerCase().trim()
        );
        return sum + (mi?.qty || 0);
      }, 0);
      result[key] = {
        planQty: item.required || 0,
        usedQty,
        remaining: Math.max(0, (item.required || 0) - usedQty),
        unit: item.unit || "",
        name: item.itemName || item.materialName || item.name || item.sku || "",
      };
    });
    return result;
  }, [form.planId, form.id, plans, materialRequirements, isEditing]);

  const getItemRemaining = item => {
    if (!planRemainingQty) return null;
    const key = (item.sku && item.sku !== "N/A" ? item.sku : item.materialName || "").toLowerCase();
    return planRemainingQty[key] ?? null;
  };

  const projects = useMemo(() => settings.projects || [], [settings.projects]);
  const workTypes = useMemo(
    () => settings.workTypes || ["Plumbing", "Sanitary", "Hardware", "Electrical", "Civil", "Stationery", "Other"],
    [settings.workTypes]
  );
  const requesters = useMemo(() => settings.requesters || [], [settings.requesters]);

  const addItem = () =>
    setForm(f => ({ ...f, items: [...(f.items || []), { materialName: "", qty: 1, unit: "", condition: "New", category: "" }] }));

  const removeItem = idx => {
    const items = [...(form.items || [])];
    items.splice(idx, 1);
    setForm(f => ({ ...f, items }));
  };

  const updateItem = (idx, field, value) => {
    const items = [...(form.items || [])];
    items[idx] = { ...items[idx], [field]: value };
    setForm(f => ({ ...f, items }));
  };

  const validateForm = data => {
    const errs = {};
    if (!data.requesterName) errs.requesterName = "Required";
    if (data.requesterName === "Other" && !otherRequester) errs.otherRequester = "Required";
    if (!data.project) errs.project = "Required";
    if (data.project === "Other" && !otherProject) errs.otherProject = "Required";
    if (!data.items?.length) {
      errs.items = "At least one item is required";
    } else {
      data.items.forEach((item, idx) => {
        if (!item.materialName) errs[`item_${idx}_name`] = "Required";
        if (!item.qty || item.qty <= 0) errs[`item_${idx}_qty`] = "Required";
        if (!item.unit) errs[`item_${idx}_unit`] = "Required";
        const rem = getItemRemaining(item);
        if (rem !== null && item.qty > rem.remaining)
          errs[`item_${idx}_qty`] = `Max ${rem.remaining} ${rem.unit} remaining in plan`;
      });
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const checkInventory = async items =>
    Promise.all((items || []).map(async item => {
      let matches = (inventory || []).filter(i =>
        (item.sku && item.sku !== "N/A" && i.sku?.toLowerCase().trim() === item.sku?.toLowerCase().trim()) ||
        i.itemName?.toLowerCase().replace(/\s+/g, "").trim() === item.materialName.toLowerCase().replace(/\s+/g, "").trim()
      );
      matches.sort((a, b) => {
        const aOk = item.sku && item.sku !== "N/A" && a.sku === item.sku;
        const bOk = item.sku && item.sku !== "N/A" && b.sku === item.sku;
        return aOk === bOk ? (b.liveStock || 0) - (a.liveStock || 0) : aOk ? -1 : 1;
      });
      let invItem = matches[0];
      const catalogueItem = catalogue.find(c =>
        (item.sku && item.sku !== "N/A" && c.sku?.toLowerCase().trim() === item.sku?.toLowerCase().trim()) ||
        c.itemName?.toLowerCase().replace(/\s+/g, "").trim() === item.materialName.toLowerCase().replace(/\s+/g, "").trim()
      );
      if (!invItem) {
        try {
          if (item.sku && item.sku !== "N/A") {
            const r = await api.get("inventory", { filter: JSON.stringify({ sku: item.sku }), limit: 1 });
            if (r.success && r.data?.length > 0) invItem = r.data[0];
          }
          if (!invItem) {
            const r = await api.get("inventory", { search: item.materialName.trim(), limit: 50 });
            if (r.success && r.data?.length > 0) {
              const hits = r.data.filter(i =>
                (item.sku && item.sku !== "N/A" && i.sku?.toLowerCase().trim() === item.sku?.toLowerCase().trim()) ||
                i.itemName?.toLowerCase().replace(/\s+/g, "").trim() === item.materialName.toLowerCase().replace(/\s+/g, "").trim()
              );
              invItem = hits.length > 0
                ? hits.find(i => item.sku && i.sku === item.sku) || hits.find(i => i.liveStock > 0) || hits[0]
                : r.data[0]?.itemName?.toLowerCase().includes(item.materialName.toLowerCase()) ? r.data[0] : undefined;
            }
          }
        } catch {}
      }
      const available = invItem?.liveStock || 0;
      const alreadyProcessed = (item.allocatedQty || 0) + (item.issuedQty || 0);
      const net = Math.max(0, (item.qty || 0) - alreadyProcessed);
      let status = item.status || "Needs Purchase";
      let availableInStock = 0;
      let remainingQty = net;
      if (net <= 0) {
        if (status !== "Issued" && status !== "Allocated") status = "Allocated";
        availableInStock = item.qty || 0;
        remainingQty = 0;
      } else if (available >= net) {
        status = "In Stock"; availableInStock = net; remainingQty = 0;
      } else if (available > 0) {
        status = "Partial"; availableInStock = available; remainingQty = net - available;
      } else {
        status = "Needs Purchase"; availableInStock = 0; remainingQty = net;
      }
      return {
        ...item,
        sku: invItem?.sku || catalogueItem?.sku || item.sku || "N/A",
        category: item.category || invItem?.category || catalogueItem?.category || "",
        unit: item.unit || invItem?.unit || catalogueItem?.uom || "",
        availableInStock, remainingQty, status,
      };
    }));

  const handleSubmit = async () => {
    if (!validateForm(form)) return;
    toast.loading("Checking inventory availability...", { id: "check-inv" });
    const checkedItems = await checkInventory(form.items);
    toast.dismiss("check-inv");
    const allInStock = checkedItems.length > 0 && checkedItems.every(i => i.status === "In Stock");

    if (isEditing) {
      try {
        await updateMaterialRequirement(form.id, {
          ...form, items: checkedItems,
          status: allInStock ? "Approved by Store" : "Store Pending",
        });
        onClose();
      } catch (err) { console.error("Update failed:", err); }
      return;
    }

    const requirement = {
      id: genId("MR", Date.now() % 10000),
      planId: form.planId || undefined,
      requesterName: form.requesterName === "Other" ? otherRequester : form.requesterName,
      project: form.project === "Other" ? otherProject : form.project,
      location: form.location || "",
      workType: form.workType || "",
      requirementDate: form.requirementDate || todayStr(),
      date: new Date().toISOString(),
      status: allInStock ? "Approved by Store" : "Store Pending",
      items: checkedItems,
    };
    try {
      const result = await addMaterialRequirement(requirement);
      onClose();
      onSuccess?.(result?.id || requirement.id);
    } catch (err) { console.error("Creation failed:", err); }
  };

  if (!open) return null;

  return (
    <Modal
      title={isEditing ? "Edit Requirement" : "New Material Requirement"}
      onClose={onClose}
      extraWide
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Btn label="Cancel" outline onClick={onClose} />
          <Btn
            label={isEditing ? "Update Requirement" : "Submit Requirement"}
            className="px-8"
            onClick={handleSubmit}
            loading={actionLoading}
          />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Plan Selector */}
        <div className="bg-blue-50/60 dark:bg-blue-900/10 border border-blue-200/60 dark:border-blue-700/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
              Link to Approved Material Plan (Optional)
            </p>
            {form.planId && (
              <button
                onClick={() => setForm(f => ({ ...f, planId: "", project: "", requesterName: "" }))}
                className="text-[11px] text-gray-400 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <select
            value={form.planId || ""}
            onChange={e => {
              const planId = e.target.value;
              const plan = plans.find(p => p.id === planId);
              setForm(f => ({
                ...f,
                planId,
                project: plan?.project || f.project || "",
                requesterName: plan?.engineer || f.requesterName || "",
                location: plan?.location || f.location || "",
                workType: plan?.workType || f.workType || "",
                items: plan
                  ? (plan.items || []).map(item => ({
                      materialName: item.itemName || item.materialName || item.name || "",
                      sku: item.sku || "",
                      qty: 1,
                      unit: item.unit || "",
                      condition: "New",
                      category: item.category || "",
                    }))
                  : f.items,
              }));
            }}
            className="w-full px-3 py-2 border border-blue-200 dark:border-blue-700/50 bg-white dark:bg-gray-800 rounded-lg text-[13px] text-gray-900 dark:text-white focus:outline-none focus:border-primary"
          >
            <option value="">— Select an approved plan to link (fills fields automatically) —</option>
            {availablePlansForForm.map(p => (
              <option key={p.id} value={p.id}>
                {p.id} · {p.project}{p.engineer ? ` · ${p.engineer}` : ""}
              </option>
            ))}
          </select>
          {form.planId && planRemainingQty && (
            <div className="flex flex-wrap gap-2">
              {Object.values(planRemainingQty).map(mat => (
                <span
                  key={mat.name}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${mat.remaining > 0 ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400"}`}
                >
                  {mat.name}: {mat.remaining} {mat.unit} left
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Basic Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 relative z-[60]">
          <div className="space-y-1">
            <SField
              label="Your Name *"
              value={form.requesterName}
              onChange={e => setForm(f => ({ ...f, requesterName: e.target.value }))}
              options={requesters}
              error={errors.requesterName}
              required
            />
            {form.requesterName === "Other" && (
              <div className="mt-2 text-xs">
                <Field
                  placeholder="Enter your name"
                  value={otherRequester}
                  onChange={e => setOtherRequester(e.target.value)}
                  error={errors.otherRequester}
                  required
                />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <SField
              label="Project *"
              value={form.project}
              onChange={e => setForm(f => ({
                ...f, project: e.target.value,
                items: [{ materialName: "", sku: "", qty: 1, unit: "", condition: "New" }],
              }))}
              options={isSiteEngineer && engineerProjects ? engineerProjects : projects}
              error={errors.project}
              required
            />
            {isSiteEngineer && engineerProjects?.length === 0 && (
              <p className="text-[11px] text-amber-500 mt-1">No material plans are assigned to you yet.</p>
            )}
            {!isSiteEngineer && form.project === "Other" && (
              <div className="mt-2 text-xs">
                <Field
                  placeholder="Enter project name"
                  value={otherProject}
                  onChange={e => setOtherProject(e.target.value)}
                  error={errors.otherProject}
                  required
                />
              </div>
            )}
          </div>
          <div className="space-y-1">
            <SField
              label="Work Type"
              value={form.workType}
              onChange={e => setForm(f => ({ ...f, workType: e.target.value }))}
              options={workTypes}
              error={errors.workType}
            />
          </div>
          <div className="space-y-1">
            <Field
              label="Requirement Date"
              type="date"
              value={form.requirementDate}
              onChange={e => setForm(f => ({ ...f, requirementDate: e.target.value }))}
              error={errors.requirementDate}
            />
          </div>
          <div className="md:col-span-2">
            <Field
              label="Location"
              placeholder="Specific location or site area (e.g. Tower A, 4th Floor...)"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              error={errors.location}
            />
          </div>
        </div>

        {/* Items */}
        <div className="space-y-4 pt-6 border-t border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center">
            <h3 className="text-[13px] font-bold text-gray-900 dark:text-white tracking-wider">Material items</h3>
            <Btn label="Add Item" icon={Plus} small outline onClick={addItem} />
          </div>
          {isSiteEngineer && form.project && engineerPlanItems && (
            <p className="text-[11px] text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
              Only items from the material plan for <strong>{form.project}</strong> are available.
            </p>
          )}
          {isSiteEngineer && !form.project && (
            <p className="text-[11px] text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg">
              Select a project first to see available plan items.
            </p>
          )}
          {errors.items && <p className="text-[11px] text-red-500">{errors.items}</p>}
          <div className="space-y-4">
            {form.items?.map((item, idx) => (
              <div key={idx} className="bg-gray-50/30 dark:bg-gray-800/20 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 relative group transition-all hover:border-primary/30 dark:hover:border-primary/20">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-4 items-end">
                  <div className="md:col-span-5">
                    <Field
                      label="Material Name *"
                      placeholder="Type material name..."
                      value={item.materialName || ""}
                      className="mb-0"
                      onChange={e => {
                        const val = e.target.value;
                        const items = [...(form.items || [])];
                        const lower = val.toLowerCase().trim();
                        const inv = inventory.find(i => (i.itemName || "").toLowerCase().trim() === lower);
                        const cat = catalogue.find(c => (c.itemName || "").toLowerCase().trim() === lower);
                        items[idx] = {
                          ...items[idx],
                          materialName: val,
                          sku: inv?.sku || cat?.sku || items[idx].sku || "N/A",
                          unit: inv?.unit || cat?.uom || items[idx].unit,
                          category: inv?.category || cat?.category || items[idx].category || "",
                        };
                        setForm(f => ({ ...f, items }));
                      }}
                      error={errors[`item_${idx}_name`]}
                    />
                  </div>
                  <div className="grid grid-cols-3 md:col-span-7 gap-4">
                    <div className="col-span-1">
                      <Field
                        label="Qty *"
                        type="number"
                        value={item.qty}
                        className="mb-0 text-sm"
                        onChange={e => updateItem(idx, "qty", Number(e.target.value))}
                        error={errors[`item_${idx}_qty`]}
                      />
                      {(() => {
                        const rem = getItemRemaining(item);
                        if (!rem) return null;
                        const exceeded = item.qty > rem.remaining;
                        return (
                          <p className={`text-[10px] font-bold mt-0.5 ${exceeded ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"}`}>
                            {exceeded ? `⚠ Max ${rem.remaining}` : `✓ ${rem.remaining} ${rem.unit} left`}
                          </p>
                        );
                      })()}
                    </div>
                    <div className="col-span-1">
                      <SField
                        label="Unit *"
                        value={item.unit}
                        className="mb-0"
                        onChange={e => updateItem(idx, "unit", e.target.value)}
                        options={UNITS}
                        error={errors[`item_${idx}_unit`]}
                      />
                    </div>
                    <div className="col-span-1">
                      <SField
                        label="Condition"
                        value={item.condition || "New"}
                        className="mb-0"
                        onChange={e => updateItem(idx, "condition", e.target.value)}
                        options={["New", "Old"]}
                      />
                    </div>
                  </div>
                </div>
                {form.items.length > 1 && (
                  <button
                    onClick={() => removeItem(idx)}
                    className="absolute -top-2 -right-2 md:top-2 md:right-2 p-1.5 bg-white dark:bg-gray-900 text-gray-400 hover:text-red-500 rounded-full border border-gray-200 dark:border-gray-800 shadow-sm transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
