import { useState, useEffect } from "react";
import { useAppStore } from "../store";
import {
  PageHeader, Card, StatusBadge, Btn, Modal, Field, SField,
  Pagination, ConfirmModal, Skeleton,
} from "../components/ui";
import { FilterRow, SearchFilter, SelectFilter } from "../components/ui/Filters";
import {
  Plus, Eye, Pencil, Trash2, ThumbsUp, ThumbsDown, XCircle, Package,
} from "lucide-react";
import toast from "react-hot-toast";

const MPO_STATUS_COLORS = {
  Draft: "gray",
  "Pending L1": "yellow",
  "Pending L2": "yellow",
  "Pending L3": "yellow",
  Approved: "green",
  Rejected: "red",
  Cancelled: "gray",
  "GRN Pending": "blue",
  "GRN Done": "blue",
  Closed: "green",
};

const EMR_STATUS_COLORS = {
  Pending: "yellow",
  Approved: "green",
  Rejected: "red",
  "PO Raised": "blue",
};

const EMPTY_MPO_ITEM = () => ({ sku: "", itemName: "", brand: "", unit: "", qty: 1, rate: 0, gst: 0, amount: 0 });
const EMPTY_EMR_ITEM = () => ({ sku: "", itemName: "", unit: "", qty: 1, remark: "" });

function calcTotal(items = []) {
  return items.reduce((sum, it) => {
    const amt = (it.qty || 0) * (it.rate || 0) * (1 + (it.gst || 0) / 100);
    return sum + amt;
  }, 0);
}

export function MasterPOPage() {
  const {
    masterPos, masterPosPagination,
    emrs, emrsPagination,
    fetchResource,
    addMasterPo, updateMasterPo, deleteMasterPo,
    approveMasterPo, rejectMasterPo, cancelMasterPo,
    addEmr, approveEmr, rejectEmr, deleteEmr,
    plans, quotations,
    loading, actionLoading, hasPermission, settings, suppliers,
    fetchUsers, users,
  } = useAppStore();

  const { projects: PROJECTS } = settings;

  useEffect(() => {
    fetchUsers();
    fetchResource("planning", 1, 500, true);
    fetchResource("quotations", 1, 500, true);
    fetchResource("suppliers", 1, 500, true);
  }, [fetchUsers, fetchResource]);

  // Tabs
  const [tab, setTab] = useState("mpo"); // "mpo" | "emr"

  // MPO list filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const filter = {};
    if (statusFilter) filter.status = statusFilter;
    fetchResource("master-pos", page, 50, false, debouncedSearch, Object.keys(filter).length ? filter : null);
  }, [debouncedSearch, statusFilter, page, fetchResource]);

  useEffect(() => {
    if (tab === "emr") fetchResource("emr", 1, 100, false);
  }, [tab, fetchResource]);

  // MPO Modal
  const [mpoModal, setMpoModal] = useState(false);
  const [editingMpo, setEditingMpo] = useState(null);
  const [viewMpo, setViewMpo] = useState(null);
  const [deletingMpoId, setDeletingMpoId] = useState(null);
  const [rejectMpoModal, setRejectMpoModal] = useState(null);
  const [cancelMpoModal, setCancelMpoModal] = useState(null);
  const [rejectMpoReason, setRejectMpoReason] = useState("");
  const [cancelMpoReason, setCancelMpoReason] = useState("");
  const [approveRemark, setApproveRemark] = useState("");

  const [mpoForm, setMpoForm] = useState({
    planId: "", quotationId: "", supplier: "", supplierId: "",
    category: "", project: "", items: [EMPTY_MPO_ITEM()],
    terms: "", deliveryAddress: "", expectedDeliveryDate: "",
  });

  const openCreateMpo = () => {
    setEditingMpo(null);
    setMpoForm({ planId: "", quotationId: "", supplier: "", supplierId: "", category: "", project: "", items: [EMPTY_MPO_ITEM()], terms: "", deliveryAddress: "", expectedDeliveryDate: "" });
    setMpoModal(true);
  };

  const openEditMpo = (mpo) => {
    setEditingMpo(mpo);
    setMpoForm({
      planId: mpo.planId || "", quotationId: mpo.categoryQuotationId || "",
      supplier: mpo.supplier || "", supplierId: mpo.supplierId || "",
      category: mpo.category || "", project: mpo.project || "",
      items: mpo.items?.map((i) => ({ ...i })) || [EMPTY_MPO_ITEM()],
      terms: mpo.terms || "", deliveryAddress: mpo.deliveryAddress || "",
      expectedDeliveryDate: mpo.expectedDeliveryDate || "",
    });
    setMpoModal(true);
  };

  const updateMpoItem = (idx, key, val) => setMpoForm((f) => ({
    ...f,
    items: f.items.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [key]: val };
      updated.amount = (updated.qty || 0) * (updated.rate || 0);
      return updated;
    }),
  }));

  const handleSaveMpo = async () => {
    if (!mpoForm.planId) return toast.error("Plan is required");
    if (!mpoForm.supplier) return toast.error("Supplier is required");
    if (!mpoForm.items.length) return toast.error("Add at least one item");
    const totalAmount = calcTotal(mpoForm.items);
    try {
      if (editingMpo) {
        await updateMasterPo(editingMpo.id, { ...mpoForm, totalAmount });
        toast.success("Master PO updated");
      } else {
        await addMasterPo({ ...mpoForm, totalAmount });
        toast.success("Master PO created");
      }
      setMpoModal(false);
      fetchResource("master-pos", page, 50, true);
    } catch (err) { toast.error(err.message || "Failed to save"); }
  };

  const handleApproveMpo = async (id) => {
    try {
      const res = await approveMasterPo(id, approveRemark);
      if (res.success) { toast.success("Approved"); setViewMpo(null); setApproveRemark(""); }
      else toast.error(res.message);
    } catch (err) { toast.error(err.message); }
  };

  const handleRejectMpo = async () => {
    if (!rejectMpoReason.trim()) return toast.error("Reason required");
    try {
      const res = await rejectMasterPo(rejectMpoModal, rejectMpoReason.trim());
      if (res.success) { toast.success("Rejected"); setRejectMpoModal(null); setRejectMpoReason(""); setViewMpo(null); }
      else toast.error(res.message);
    } catch (err) { toast.error(err.message); }
  };

  const handleCancelMpo = async () => {
    if (!cancelMpoReason.trim()) return toast.error("Reason required");
    try {
      const res = await cancelMasterPo(cancelMpoModal, cancelMpoReason.trim());
      if (res.success) { toast.success("Cancelled"); setCancelMpoModal(null); setCancelMpoReason(""); setViewMpo(null); }
      else toast.error(res.message);
    } catch (err) { toast.error(err.message); }
  };

  // EMR
  const [emrModal, setEmrModal] = useState(false);
  const [emrForm, setEmrForm] = useState({ masterPoId: "", planId: "", project: "", floor: "", items: [EMPTY_EMR_ITEM()], remark: "" });
  const [rejectEmrModal, setRejectEmrModal] = useState(null);
  const [rejectEmrReason, setRejectEmrReason] = useState("");
  const [deletingEmrId, setDeletingEmrId] = useState(null);

  const handleSaveEmr = async () => {
    if (!emrForm.masterPoId) return toast.error("Master PO required");
    if (!emrForm.items.length) return toast.error("Add at least one item");
    try {
      await addEmr(emrForm);
      toast.success("EMR submitted");
      setEmrModal(false);
      fetchResource("emr", 1, 100, true);
    } catch (err) { toast.error(err.message || "Failed to submit"); }
  };

  const handleApproveEmr = async (id) => {
    try {
      const res = await approveEmr(id);
      if (res.success) toast.success("EMR approved");
      else toast.error(res.message);
    } catch (err) { toast.error(err.message); }
  };

  const handleRejectEmr = async () => {
    if (!rejectEmrReason.trim()) return toast.error("Reason required");
    try {
      const res = await rejectEmr(rejectEmrModal, rejectEmrReason.trim());
      if (res.success) { toast.success("EMR rejected"); setRejectEmrModal(null); setRejectEmrReason(""); }
      else toast.error(res.message);
    } catch (err) { toast.error(err.message); }
  };

  const canCreateMpo = hasPermission("CREATE_MASTER_PO");
  const canApproveMpo = (level) => hasPermission(`APPROVE_MASTER_PO_${level}`);
  const canCancelMpo = hasPermission("CANCEL_MASTER_PO");
  const canApproveEmr = hasPermission("APPROVE_EMR");

  const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const approvedPlans = (plans || []).filter((p) => p.planType === "MP" && p.status === "Approved");

  return (
    <div className="p-4 space-y-4">
      <PageHeader
        title="Master PO"
        subtitle="Master Purchase Orders & Extra Material Requests"
        action={
          <div className="flex gap-2">
            {tab === "mpo" && canCreateMpo && (
              <Btn onClick={openCreateMpo} icon={Plus} label="New Master PO" />
            )}
            {tab === "emr" && (
              <Btn onClick={() => { setEmrForm({ masterPoId: "", planId: "", project: "", floor: "", items: [EMPTY_EMR_ITEM()], remark: "" }); setEmrModal(true); }} icon={Plus} label="New EMR" />
            )}
          </div>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        {["mpo", "emr"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          >
            {t === "mpo" ? "Master POs" : "Extra Material Requests"}
          </button>
        ))}
      </div>

      {/* MPO List */}
      {tab === "mpo" && (
        <Card>
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <FilterRow>
              <SearchFilter value={search} onChange={setSearch} placeholder="Search MPOs..." />
              <SelectFilter value={statusFilter} onChange={setStatusFilter} placeholder="All Status" options={Object.keys(MPO_STATUS_COLORS)} />
            </FilterRow>
          </div>

          {loading ? (
            <div className="space-y-3 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : !masterPos.length ? (
            <div className="p-12 text-center text-gray-400">
              <Package size={40} className="mx-auto mb-2 opacity-40" />
              <p>No Master POs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-left text-gray-500 text-xs uppercase">
                    <th className="p-3">ID</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Supplier</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Total</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {masterPos.map((mpo) => (
                    <tr key={mpo.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="p-3 font-mono font-medium text-primary">{mpo.id}</td>
                      <td className="p-3 text-xs text-gray-500">{mpo.planId}</td>
                      <td className="p-3">{mpo.supplier}</td>
                      <td className="p-3">{mpo.category || "-"}</td>
                      <td className="p-3 font-mono">₹{fmt(mpo.totalAmount)}</td>
                      <td className="p-3"><StatusBadge status={mpo.status} color={MPO_STATUS_COLORS[mpo.status]} /></td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Btn small outline icon={Eye} onClick={() => setViewMpo(mpo)} />
                          {mpo.status === "Draft" && canCreateMpo && (
                            <>
                              <Btn small outline icon={Pencil} onClick={() => openEditMpo(mpo)} />
                              <Btn small color="red" icon={Trash2} onClick={() => setDeletingMpoId(mpo.id)} />
                            </>
                          )}
                          {["Pending L1", "Pending L2", "Pending L3"].includes(mpo.status) && (
                            <>
                              {canApproveMpo(mpo.status.replace("Pending ", "")) && (
                                <Btn small color="green" icon={ThumbsUp} onClick={() => handleApproveMpo(mpo.id)} loading={actionLoading} />
                              )}
                              {canApproveMpo(mpo.status.replace("Pending ", "")) && (
                                <Btn small color="red" icon={ThumbsDown} onClick={() => { setRejectMpoModal(mpo.id); setRejectMpoReason(""); }} />
                              )}
                            </>
                          )}
                          {["Approved", "GRN Pending"].includes(mpo.status) && canCancelMpo && (
                            <Btn small outline icon={XCircle} onClick={() => { setCancelMpoModal(mpo.id); setCancelMpoReason(""); }} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {masterPosPagination && <Pagination pagination={masterPosPagination} page={page} setPage={setPage} />}
        </Card>
      )}

      {/* EMR List */}
      {tab === "emr" && (
        <Card>
          {loading ? (
            <div className="space-y-3 p-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
          ) : !emrs.length ? (
            <div className="p-12 text-center text-gray-400">
              <Package size={40} className="mx-auto mb-2 opacity-40" />
              <p>No Extra Material Requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 dark:border-gray-700">
                  <tr className="text-left text-gray-500 text-xs uppercase">
                    <th className="p-3">ID</th>
                    <th className="p-3">Master PO</th>
                    <th className="p-3">Floor</th>
                    <th className="p-3">Requested By</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {emrs.map((emr) => (
                    <tr key={emr.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="p-3 font-mono font-medium text-primary">{emr.id}</td>
                      <td className="p-3 text-xs text-gray-500">{emr.masterPoId}</td>
                      <td className="p-3">{emr.floor || "-"}</td>
                      <td className="p-3">{emr.requestedBy}</td>
                      <td className="p-3"><StatusBadge status={emr.status} color={EMR_STATUS_COLORS[emr.status]} /></td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          {emr.status === "Pending" && canApproveEmr && (
                            <>
                              <Btn small color="green" icon={ThumbsUp} onClick={() => handleApproveEmr(emr.id)} loading={actionLoading} />
                              <Btn small color="red" icon={ThumbsDown} onClick={() => { setRejectEmrModal(emr.id); setRejectEmrReason(""); }} />
                            </>
                          )}
                          <Btn small color="red" icon={Trash2} onClick={() => setDeletingEmrId(emr.id)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* MPO Create/Edit Modal */}
      {mpoModal && <Modal onClose={() => setMpoModal(false)} title={editingMpo ? `Edit ${editingMpo.id}` : "New Master PO"} extraWide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <SField label="Material Plan *">
              <select className="field-input" value={mpoForm.planId} onChange={(e) => {
                const pl = approvedPlans.find((p) => p.id === e.target.value);
                setMpoForm((f) => ({ ...f, planId: e.target.value, project: pl?.project || f.project }));
              }}>
                <option value="">Select plan</option>
                {approvedPlans.map((p) => <option key={p.id} value={p.id}>{p.id} — {p.project}</option>)}
              </select>
            </SField>
            <Field label="Project" value={mpoForm.project} onChange={(e) => setMpoForm((f) => ({ ...f, project: e.target.value }))} placeholder="Auto-filled from plan" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SField label="Supplier *">
              <select className="field-input" value={mpoForm.supplierId} onChange={(e) => {
                const s = suppliers.find((s) => s._id === e.target.value || s.id === e.target.value);
                setMpoForm((f) => ({ ...f, supplierId: e.target.value, supplier: s?.companyName || s?.name || "" }));
              }}>
                <option value="">Select supplier</option>
                {suppliers.map((s) => <option key={s._id || s.id} value={s._id || s.id}>{s.companyName || s.name}</option>)}
              </select>
            </SField>
            <Field label="Category" value={mpoForm.category} onChange={(e) => setMpoForm((f) => ({ ...f, category: e.target.value }))} placeholder="Civil, Electrical..." />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Items</p>
              <Btn small outline icon={Plus} label="Add Item" onClick={() => setMpoForm((f) => ({ ...f, items: [...f.items, EMPTY_MPO_ITEM()] }))} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-gray-400 text-left">
                  <th className="py-1 pr-2">Item Name</th><th className="py-1 pr-2">SKU</th>
                  <th className="py-1 pr-2">Brand</th><th className="py-1 pr-2">Unit</th>
                  <th className="py-1 pr-2">Qty</th><th className="py-1 pr-2">Rate</th>
                  <th className="py-1 pr-2">GST%</th><th className="py-1 pr-2">Amount</th>
                  <th className="py-1" />
                </tr></thead>
                <tbody>
                  {mpoForm.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="pr-1"><input className="field-input py-1 text-xs" value={it.itemName} onChange={(e) => updateMpoItem(idx, "itemName", e.target.value)} /></td>
                      <td className="pr-1"><input className="field-input py-1 text-xs" value={it.sku} onChange={(e) => updateMpoItem(idx, "sku", e.target.value)} /></td>
                      <td className="pr-1"><input className="field-input py-1 text-xs" value={it.brand} onChange={(e) => updateMpoItem(idx, "brand", e.target.value)} /></td>
                      <td className="pr-1"><input className="field-input py-1 text-xs" value={it.unit} onChange={(e) => updateMpoItem(idx, "unit", e.target.value)} /></td>
                      <td className="pr-1"><input type="number" className="field-input py-1 text-xs w-16" value={it.qty} onChange={(e) => updateMpoItem(idx, "qty", Number(e.target.value))} /></td>
                      <td className="pr-1"><input type="number" className="field-input py-1 text-xs w-20" value={it.rate} onChange={(e) => updateMpoItem(idx, "rate", Number(e.target.value))} /></td>
                      <td className="pr-1"><input type="number" className="field-input py-1 text-xs w-14" value={it.gst} onChange={(e) => updateMpoItem(idx, "gst", Number(e.target.value))} /></td>
                      <td className="pr-1 text-right font-mono">₹{fmt(it.amount)}</td>
                      <td><Btn small color="red" icon={Trash2} onClick={() => setMpoForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-gray-700 font-medium">
                    <td colSpan={7} className="py-2 text-right text-xs text-gray-500">Total (incl. GST):</td>
                    <td className="py-2 font-mono text-right">₹{fmt(calcTotal(mpoForm.items))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Delivery Address" value={mpoForm.deliveryAddress} onChange={(e) => setMpoForm((f) => ({ ...f, deliveryAddress: e.target.value }))} />
            <Field label="Expected Delivery" type="date" value={mpoForm.expectedDeliveryDate} onChange={(e) => setMpoForm((f) => ({ ...f, expectedDeliveryDate: e.target.value }))} />
          </div>
          <Field label="Terms & Conditions" value={mpoForm.terms} onChange={(e) => setMpoForm((f) => ({ ...f, terms: e.target.value }))} placeholder="Payment terms, conditions..." />

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Btn outline label="Cancel" onClick={() => setMpoModal(false)} />
            <Btn label={editingMpo ? "Update" : "Create & Submit for L1"} onClick={handleSaveMpo} loading={actionLoading} />
          </div>
        </div>
      </Modal>}

      {/* MPO View Modal */}
      {viewMpo && (
        <Modal onClose={() => setViewMpo(null)} title={`Master PO: ${viewMpo.id}`} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-gray-500 text-xs">Plan</p><p className="font-mono text-xs">{viewMpo.planId}</p></div>
              <div><p className="text-gray-500 text-xs">Supplier</p><p>{viewMpo.supplier}</p></div>
              <div><p className="text-gray-500 text-xs">Status</p><StatusBadge status={viewMpo.status} color={MPO_STATUS_COLORS[viewMpo.status]} /></div>
              <div><p className="text-gray-500 text-xs">Category</p><p>{viewMpo.category || "-"}</p></div>
              <div><p className="text-gray-500 text-xs">Total Amount</p><p className="font-mono font-semibold">₹{fmt(viewMpo.totalAmount)}</p></div>
              <div><p className="text-gray-500 text-xs">Created By</p><p>{viewMpo.createdBy}</p></div>
            </div>

            {viewMpo.approvals?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2 font-medium">Approval History</p>
                {viewMpo.approvals.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-1 border-b border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1 rounded">{a.level}</span>
                    <span>{a.approver}</span>
                    <StatusBadge status={a.status} color={a.status === "Approved" ? "green" : "red"} />
                    {a.remark && <span className="text-gray-400 text-xs">{a.remark}</span>}
                  </div>
                ))}
              </div>
            )}

            {viewMpo.rejectionReason && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-sm text-red-700 dark:text-red-400">
                Rejected: {viewMpo.rejectionReason}
              </div>
            )}

            <div className="space-y-1">
              {["Pending L1", "Pending L2", "Pending L3"].includes(viewMpo.status) && (
                <Field label="Approval Remark (optional)" value={approveRemark} onChange={(e) => setApproveRemark(e.target.value)} placeholder="Add a remark..." />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {["Pending L1", "Pending L2", "Pending L3"].includes(viewMpo.status) && (
                <>
                  {canApproveMpo(viewMpo.status.replace("Pending ", "")) && (
                    <Btn color="green" icon={ThumbsUp} label={`Approve ${viewMpo.status.replace("Pending ", "")}`} onClick={() => handleApproveMpo(viewMpo.id)} loading={actionLoading} />
                  )}
                  {canApproveMpo(viewMpo.status.replace("Pending ", "")) && (
                    <Btn color="red" icon={ThumbsDown} label="Reject" onClick={() => { setRejectMpoModal(viewMpo.id); setRejectMpoReason(""); }} />
                  )}
                </>
              )}
              {["Approved", "GRN Pending"].includes(viewMpo.status) && canCancelMpo && (
                <Btn outline icon={XCircle} label="Cancel MPO" onClick={() => { setCancelMpoModal(viewMpo.id); setCancelMpoReason(""); }} />
              )}
              <Btn outline label="Close" onClick={() => setViewMpo(null)} />
            </div>
          </div>
        </Modal>
      )}

      {/* Reject MPO */}
      {rejectMpoModal && <Modal onClose={() => setRejectMpoModal(null)} title="Reject Master PO">
        <div className="space-y-3">
          <Field label="Reason *" value={rejectMpoReason} onChange={(e) => setRejectMpoReason(e.target.value)} placeholder="Rejection reason..." />
          <div className="flex justify-end gap-2">
            <Btn outline label="Cancel" onClick={() => setRejectMpoModal(null)} />
            <Btn color="red" label="Reject" onClick={handleRejectMpo} loading={actionLoading} />
          </div>
        </div>
      </Modal>}

      {/* Cancel MPO */}
      {cancelMpoModal && <Modal onClose={() => setCancelMpoModal(null)} title="Cancel Master PO">
        <div className="space-y-3">
          <Field label="Cancel Reason *" value={cancelMpoReason} onChange={(e) => setCancelMpoReason(e.target.value)} placeholder="Cancellation reason..." />
          <div className="flex justify-end gap-2">
            <Btn outline label="Cancel" onClick={() => setCancelMpoModal(null)} />
            <Btn color="red" label="Confirm Cancel" onClick={handleCancelMpo} loading={actionLoading} />
          </div>
        </div>
      </Modal>}

      {/* Delete MPO */}
      {deletingMpoId && <ConfirmModal onCancel={() => setDeletingMpoId(null)}
        onConfirm={async () => { await deleteMasterPo(deletingMpoId); setDeletingMpoId(null); }}
        title="Delete Master PO" message="Delete this Master PO? This cannot be undone." loading={actionLoading} />}

      {/* EMR Create Modal */}
      {emrModal && <Modal onClose={() => setEmrModal(false)} title="New Extra Material Request" wide>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <SField label="Master PO *">
              <select className="field-input" value={emrForm.masterPoId} onChange={(e) => {
                const mpo = masterPos.find((m) => m.id === e.target.value);
                setEmrForm((f) => ({ ...f, masterPoId: e.target.value, planId: mpo?.planId || "", project: mpo?.project || "" }));
              }}>
                <option value="">Select Master PO</option>
                {masterPos.filter((m) => m.status === "Approved").map((m) => (
                  <option key={m.id} value={m.id}>{m.id} — {m.supplier}</option>
                ))}
              </select>
            </SField>
            <Field label="Floor" value={emrForm.floor} onChange={(e) => setEmrForm((f) => ({ ...f, floor: e.target.value }))} placeholder="Floor / Location" />
          </div>
          <Field label="Remark" value={emrForm.remark} onChange={(e) => setEmrForm((f) => ({ ...f, remark: e.target.value }))} placeholder="Reason for extra material..." />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Items</p>
              <Btn small outline icon={Plus} label="Add" onClick={() => setEmrForm((f) => ({ ...f, items: [...f.items, EMPTY_EMR_ITEM()] }))} />
            </div>
            {emrForm.items.map((it, idx) => (
              <div key={idx} className="grid grid-cols-5 gap-2 items-end">
                <Field label={idx === 0 ? "Item Name" : ""} value={it.itemName} onChange={(e) => setEmrForm((f) => ({ ...f, items: f.items.map((x, i) => i === idx ? { ...x, itemName: e.target.value } : x) }))} />
                <Field label={idx === 0 ? "SKU" : ""} value={it.sku} onChange={(e) => setEmrForm((f) => ({ ...f, items: f.items.map((x, i) => i === idx ? { ...x, sku: e.target.value } : x) }))} />
                <Field label={idx === 0 ? "Unit" : ""} value={it.unit} onChange={(e) => setEmrForm((f) => ({ ...f, items: f.items.map((x, i) => i === idx ? { ...x, unit: e.target.value } : x) }))} />
                <Field label={idx === 0 ? "Qty" : ""} type="number" value={it.qty} onChange={(e) => setEmrForm((f) => ({ ...f, items: f.items.map((x, i) => i === idx ? { ...x, qty: Number(e.target.value) } : x) }))} />
                <div className={idx === 0 ? "pt-5" : ""}>
                  <Btn small outline icon={Trash2} className="text-red-500 w-full" onClick={() => setEmrForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <Btn outline label="Cancel" onClick={() => setEmrModal(false)} />
            <Btn label="Submit EMR" onClick={handleSaveEmr} loading={actionLoading} />
          </div>
        </div>
      </Modal>}

      {/* Reject EMR */}
      {rejectEmrModal && <Modal onClose={() => setRejectEmrModal(null)} title="Reject EMR">
        <div className="space-y-3">
          <Field label="Reason *" value={rejectEmrReason} onChange={(e) => setRejectEmrReason(e.target.value)} placeholder="Rejection reason..." />
          <div className="flex justify-end gap-2">
            <Btn outline label="Cancel" onClick={() => setRejectEmrModal(null)} />
            <Btn color="red" label="Reject" onClick={handleRejectEmr} loading={actionLoading} />
          </div>
        </div>
      </Modal>}

      {/* Delete EMR */}
      {deletingEmrId && <ConfirmModal onCancel={() => setDeletingEmrId(null)}
        onConfirm={async () => { await deleteEmr(deletingEmrId); setDeletingEmrId(null); }}
        title="Delete EMR" message="Delete this EMR?" loading={actionLoading} />}
    </div>
  );
}
