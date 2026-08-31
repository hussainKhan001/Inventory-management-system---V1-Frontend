import { useState, useEffect, useCallback } from "react";
import { useAppStore } from "../store";
import {
  PageHeader, Card, StatusBadge, Btn, Modal, Field, SField,
  Pagination, ConfirmModal, Skeleton,
} from "../components/ui";
import { FilterRow, SearchFilter, SelectFilter } from "../components/ui/Filters";
import {
  Plus, Eye, Pencil, Trash2, Send, ThumbsUp, ThumbsDown,
  ChevronDown, ChevronUp, Package,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_COLORS = {
  Draft: "gray",
  "Pending Approval": "yellow",
  Approved: "green",
  Rejected: "red",
  "PO Raised": "blue",
};

const EMPTY_FLOOR = () => ({
  floorNumber: "",
  location: "",
  dri: "",
  driName: "",
  items: [],
});

const EMPTY_ITEM = () => ({ sku: "", itemName: "", brand: "", unit: "", qty: 1, remark: "" });

export function MaterialPlanMP() {
  const {
    mpPlans, mpPlansPagination,
    fetchResource, addMpPlan, updateMpPlan, deleteMpPlan,
    submitMpPlan, approveMpPlan, rejectMpPlan,
    loading, actionLoading, hasPermission, settings, users, fetchUsers,
  } = useAppStore();

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  const { projects: PROJECTS, workTypes: WORK_TYPES } = settings;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const filter = {};
    if (statusFilter) filter.status = statusFilter;
    if (projectFilter) filter.project = projectFilter;
    fetchResource("mp-plans", page, 50, false, debouncedSearch, Object.keys(filter).length ? filter : null);
  }, [debouncedSearch, statusFilter, projectFilter, page, fetchResource]);

  // Modal state
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Form state
  const [form, setForm] = useState({ project: "", title: "", workType: "", floors: [EMPTY_FLOOR()] });

  const openCreate = () => {
    setEditing(null);
    setForm({ project: "", title: "", workType: "", floors: [EMPTY_FLOOR()] });
    setModal(true);
  };

  const openEdit = (plan) => {
    setEditing(plan);
    setForm({
      project: plan.project || "",
      title: plan.title || "",
      workType: plan.workType || "",
      floors: plan.floors?.length ? plan.floors.map((f) => ({ ...f, items: f.items?.map((i) => ({ ...i })) || [] })) : [EMPTY_FLOOR()],
    });
    setModal(true);
  };

  const handleSave = async () => {
    if (!form.project) return toast.error("Project is required");
    if (!form.floors.length) return toast.error("Add at least one floor");
    try {
      if (editing) {
        await updateMpPlan(editing.id, form);
        toast.success("Plan updated");
      } else {
        await addMpPlan(form);
        toast.success("Plan created");
      }
      setModal(false);
      fetchResource("mp-plans", page, 50, true, debouncedSearch);
    } catch (err) {
      toast.error(err.message || "Failed to save");
    }
  };

  const handleSubmit = async (id) => {
    try {
      const res = await submitMpPlan(id);
      if (res.success) toast.success("Submitted for approval");
      else toast.error(res.message);
    } catch (err) { toast.error(err.message); }
  };

  const handleApprove = async (id) => {
    try {
      const res = await approveMpPlan(id);
      if (res.success) { toast.success("Plan approved"); setViewModal(null); }
      else toast.error(res.message);
    } catch (err) { toast.error(err.message); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error("Reason required");
    try {
      const res = await rejectMpPlan(rejectModal, rejectReason.trim());
      if (res.success) { toast.success("Plan rejected"); setRejectModal(null); setRejectReason(""); setViewModal(null); }
      else toast.error(res.message);
    } catch (err) { toast.error(err.message); }
  };

  const handleDelete = async () => {
    try {
      await deleteMpPlan(deletingId);
      setDeletingId(null);
    } catch (_) {}
  };

  // Floor helpers
  const addFloor = () => setForm((f) => ({ ...f, floors: [...f.floors, EMPTY_FLOOR()] }));
  const removeFloor = (fi) => setForm((f) => ({ ...f, floors: f.floors.filter((_, i) => i !== fi) }));
  const updateFloor = (fi, key, val) => setForm((f) => ({
    ...f, floors: f.floors.map((fl, i) => i === fi ? { ...fl, [key]: val } : fl),
  }));
  const addItem = (fi) => setForm((f) => ({
    ...f, floors: f.floors.map((fl, i) => i === fi ? { ...fl, items: [...fl.items, EMPTY_ITEM()] } : fl),
  }));
  const removeItem = (fi, ii) => setForm((f) => ({
    ...f, floors: f.floors.map((fl, i) => i === fi ? { ...fl, items: fl.items.filter((_, j) => j !== ii) } : fl),
  }));
  const updateItem = (fi, ii, key, val) => setForm((f) => ({
    ...f, floors: f.floors.map((fl, i) => i === fi
      ? { ...fl, items: fl.items.map((it, j) => j === ii ? { ...it, [key]: val } : it) }
      : fl),
  }));

  const [expandedFloors, setExpandedFloors] = useState({});
  const toggleFloor = (fi) => setExpandedFloors((prev) => ({ ...prev, [fi]: !prev[fi] }));

  const canCreate = hasPermission("CREATE_MP_PLAN");
  const canApprove = hasPermission("APPROVE_MP_PLAN");
  const canReject = hasPermission("REJECT_MP_PLAN");

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Material Plans (MP)"
        subtitle="Floor-wise procurement planning"
        action={canCreate && <Btn onClick={openCreate} icon={<Plus size={16} />}>New Plan</Btn>}
      />

      <FilterRow>
        <SearchFilter value={search} onChange={setSearch} placeholder="Search plans..." />
        <SelectFilter value={statusFilter} onChange={setStatusFilter} placeholder="All Status">
          {["Draft", "Pending Approval", "Approved", "Rejected", "PO Raised"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </SelectFilter>
        <SelectFilter value={projectFilter} onChange={setProjectFilter} placeholder="All Projects">
          {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
        </SelectFilter>
      </FilterRow>

      <Card>
        {loading ? (
          <div className="space-y-3 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : !mpPlans.length ? (
          <div className="p-12 text-center text-gray-400">
            <Package size={40} className="mx-auto mb-2 opacity-40" />
            <p>No material plans found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="p-3">ID</th>
                  <th className="p-3">Project</th>
                  <th className="p-3">Title</th>
                  <th className="p-3">Floors</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mpPlans.map((plan) => (
                  <tr key={plan.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="p-3 font-mono font-medium text-primary">{plan.id}</td>
                    <td className="p-3">{plan.project}</td>
                    <td className="p-3">{plan.title || "-"}</td>
                    <td className="p-3">{plan.floors?.length || 0} floor(s)</td>
                    <td className="p-3">
                      <StatusBadge status={plan.status} color={STATUS_COLORS[plan.status]} />
                    </td>
                    <td className="p-3 text-gray-500">{plan.createdBy}</td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        <Btn size="xs" variant="ghost" onClick={() => setViewModal(plan)} title="View"><Eye size={14} /></Btn>
                        {["Draft", "Rejected"].includes(plan.status) && canCreate && (
                          <>
                            <Btn size="xs" variant="ghost" onClick={() => openEdit(plan)} title="Edit"><Pencil size={14} /></Btn>
                            <Btn size="xs" variant="ghost" onClick={() => handleSubmit(plan.id)} loading={actionLoading} title="Submit"><Send size={14} /></Btn>
                            <Btn size="xs" variant="ghost" className="text-red-500" onClick={() => setDeletingId(plan.id)} title="Delete"><Trash2 size={14} /></Btn>
                          </>
                        )}
                        {plan.status === "Pending Approval" && canApprove && (
                          <>
                            <Btn size="xs" variant="ghost" className="text-green-600" onClick={() => handleApprove(plan.id)} loading={actionLoading} title="Approve"><ThumbsUp size={14} /></Btn>
                            <Btn size="xs" variant="ghost" className="text-red-500" onClick={() => { setRejectModal(plan.id); setRejectReason(""); }} title="Reject"><ThumbsDown size={14} /></Btn>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {mpPlansPagination && (
          <Pagination pagination={mpPlansPagination} page={page} setPage={setPage} />
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? `Edit ${editing.id}` : "New Material Plan"} size="xl">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <SField label="Project *">
              <select className="field-input" value={form.project} onChange={(e) => setForm((f) => ({ ...f, project: e.target.value }))}>
                <option value="">Select project</option>
                {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </SField>
            <Field label="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Plan title" />
          </div>
          <SField label="Work Type">
            <select className="field-input" value={form.workType} onChange={(e) => setForm((f) => ({ ...f, workType: e.target.value }))}>
              <option value="">Select work type</option>
              {WORK_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </SField>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Floors</p>
              <Btn size="xs" variant="outline" onClick={addFloor} icon={<Plus size={12} />}>Add Floor</Btn>
            </div>
            {form.floors.map((fl, fi) => (
              <div key={fi} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                  onClick={() => toggleFloor(fi)}
                >
                  <span className="text-sm font-medium">
                    Floor {fi + 1}: {fl.floorNumber || "(no number)"} {fl.driName ? `— DRI: ${fl.driName}` : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <Btn size="xs" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); removeFloor(fi); }}><Trash2 size={12} /></Btn>
                    {expandedFloors[fi] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </div>
                {expandedFloors[fi] !== false && (
                  <div className="p-3 space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Field label="Floor No." value={fl.floorNumber} onChange={(e) => updateFloor(fi, "floorNumber", e.target.value)} placeholder="G, 1, 2..." />
                      <Field label="Location" value={fl.location} onChange={(e) => updateFloor(fi, "location", e.target.value)} placeholder="Location" />
                      <SField label="DRI">
                        <select className="field-input" value={fl.dri} onChange={(e) => {
                          const u = users.find((u) => u._id === e.target.value || u.id === e.target.value);
                          updateFloor(fi, "dri", e.target.value);
                          updateFloor(fi, "driName", u?.name || "");
                        }}>
                          <option value="">Select DRI</option>
                          {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                        </select>
                      </SField>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500 font-medium">Items</p>
                        <Btn size="xs" variant="ghost" onClick={() => addItem(fi)} icon={<Plus size={10} />}>Add Item</Btn>
                      </div>
                      {fl.items.map((it, ii) => (
                        <div key={ii} className="grid grid-cols-6 gap-1 items-end">
                          <Field label={ii === 0 ? "Item Name" : ""} value={it.itemName} onChange={(e) => updateItem(fi, ii, "itemName", e.target.value)} placeholder="Item name" />
                          <Field label={ii === 0 ? "SKU" : ""} value={it.sku} onChange={(e) => updateItem(fi, ii, "sku", e.target.value)} placeholder="SKU" />
                          <Field label={ii === 0 ? "Brand" : ""} value={it.brand} onChange={(e) => updateItem(fi, ii, "brand", e.target.value)} placeholder="Brand" />
                          <Field label={ii === 0 ? "Unit" : ""} value={it.unit} onChange={(e) => updateItem(fi, ii, "unit", e.target.value)} placeholder="Unit" />
                          <Field label={ii === 0 ? "Qty" : ""} type="number" value={it.qty} onChange={(e) => updateItem(fi, ii, "qty", Number(e.target.value))} />
                          <div className={ii === 0 ? "pt-5" : ""}>
                            <Btn size="xs" variant="ghost" className="text-red-500 w-full" onClick={() => removeItem(fi, ii)}><Trash2 size={12} /></Btn>
                          </div>
                        </div>
                      ))}
                      {!fl.items.length && <p className="text-xs text-gray-400 italic">No items added</p>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn onClick={handleSave} loading={actionLoading}>Save Plan</Btn>
          </div>
        </div>
      </Modal>

      {/* View Modal */}
      {viewModal && (
        <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={`Plan: ${viewModal.id}`} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-gray-500 text-xs">Project</p><p className="font-medium">{viewModal.project}</p></div>
              <div><p className="text-gray-500 text-xs">Status</p><StatusBadge status={viewModal.status} color={STATUS_COLORS[viewModal.status]} /></div>
              <div><p className="text-gray-500 text-xs">Work Type</p><p>{viewModal.workType || "-"}</p></div>
              {viewModal.submittedBy && <div><p className="text-gray-500 text-xs">Submitted by</p><p>{viewModal.submittedBy}</p></div>}
              {viewModal.approvedBy && <div><p className="text-gray-500 text-xs">Approved by</p><p>{viewModal.approvedBy}</p></div>}
              {viewModal.rejectedBy && <div><p className="text-gray-500 text-xs">Rejected by</p><p>{viewModal.rejectedBy}</p></div>}
              {viewModal.rejectionReason && <div className="col-span-3"><p className="text-gray-500 text-xs">Reason</p><p className="text-red-600">{viewModal.rejectionReason}</p></div>}
            </div>

            <div className="space-y-2">
              {viewModal.floors?.map((fl, fi) => (
                <div key={fi} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <p className="font-medium text-sm mb-2">Floor: {fl.floorNumber} {fl.location ? `— ${fl.location}` : ""} {fl.driName ? `| DRI: ${fl.driName}` : ""}</p>
                  {fl.items?.length > 0 && (
                    <table className="w-full text-xs">
                      <thead><tr className="text-gray-400"><th className="text-left py-1">Item</th><th className="text-left py-1">SKU</th><th className="text-left py-1">Brand</th><th className="text-left py-1">Qty</th><th className="text-left py-1">Unit</th></tr></thead>
                      <tbody>
                        {fl.items.map((it, ii) => (
                          <tr key={ii} className="border-t border-gray-100 dark:border-gray-800">
                            <td className="py-1">{it.itemName}</td>
                            <td className="py-1 text-gray-500">{it.sku}</td>
                            <td className="py-1">{it.brand}</td>
                            <td className="py-1 font-medium">{it.qty}</td>
                            <td className="py-1 text-gray-500">{it.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {["Draft", "Rejected"].includes(viewModal.status) && canCreate && (
                <Btn variant="outline" onClick={() => { handleSubmit(viewModal.id); setViewModal(null); }} loading={actionLoading} icon={<Send size={14} />}>Submit</Btn>
              )}
              {viewModal.status === "Pending Approval" && canApprove && (
                <Btn className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(viewModal.id)} loading={actionLoading} icon={<ThumbsUp size={14} />}>Approve</Btn>
              )}
              {viewModal.status === "Pending Approval" && canReject && (
                <Btn variant="danger" onClick={() => { setRejectModal(viewModal.id); setRejectReason(""); }} icon={<ThumbsDown size={14} />}>Reject</Btn>
              )}
              <Btn variant="ghost" onClick={() => setViewModal(null)}>Close</Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Modal */}
      <Modal open={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Plan" size="sm">
        <div className="space-y-3">
          <Field label="Rejection Reason *" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter reason..." />
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setRejectModal(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={handleReject} loading={actionLoading}>Reject</Btn>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Plan"
        message="Are you sure you want to delete this plan? This cannot be undone."
        loading={actionLoading}
      />
    </div>
  );
}
