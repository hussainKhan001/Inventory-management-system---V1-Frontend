import React, { useState, useEffect, useCallback, useMemo } from "react";
import { RotateCcw, Trash2, Search } from "lucide-react";
import { Modal, ConfirmModal } from "./ui";
import { useAppStore } from "../store";
import { formatDateTime } from "../utils";
import { toast } from "react-hot-toast";

/**
 * Generic recycle bin — reused across every soft-delete-enabled resource (PO, MR, Quotations,
 * Suppliers, Catalogue, Inventory, Material Plan, EMR, Write-offs, Master PO). Backed by the
 * shared `createCrudRoutes` soft-delete mechanism: GET {resource}?deleted=true,
 * POST {resource}/:id/restore, DELETE {resource}/:id/permanent.
 *
 * @param {string}   resource   - API resource path, e.g. "pos", "material-requirements"
 * @param {string}   idField    - field used as the doc's id (default "id"; "sku" for inventory/catalogue)
 * @param {string}   title      - shown in the modal header, e.g. "Purchase Orders"
 * @param {string}   [restorePermission] - e.g. "RESTORE_PURCHASE_ORDER"; the Restore button is
 *   hidden (not just server-rejected) for a user missing this. Omit only for resources where
 *   the caller intentionally wants the button always visible.
 * @param {function} getLabel   - (item) => string, the primary line shown per row
 * @param {function} [getSubLabel] - (item) => string, optional secondary line
 * @param {function} onClose
 * @param {function} [onChanged] - called after a restore/permanent-delete, so the parent can refresh its list
 */
export function RecycleBinModal({ resource, idField = "id", title, restorePermission, getLabel, getSubLabel, onClose, onChanged }) {
  const { api, role, hasPermission } = useAppStore();
  const canRestore = !restorePermission || hasPermission(restorePermission);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [confirmPermanent, setConfirmPermanent] = useState(null);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const roleLower = (role || "").toLowerCase().trim();
  const isSuperAdmin = ["super admin", "superadmin", "admin"].includes(roleLower);

  const fetchDeleted = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(resource, { deleted: "true", limit: 500 });
      if (res.success) setItems(res.data);
    } catch (err) {
      toast.error("Failed to load recycle bin");
    } finally {
      setLoading(false);
    }
  }, [resource, api]);

  useEffect(() => { fetchDeleted(); }, [fetchDeleted]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [
        item[idField],
        getLabel ? getLabel(item) : "",
        getSubLabel ? getSubLabel(item) : "",
        item.deletedBy,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [items, search, idField, getLabel, getSubLabel]);

  const handleRestore = async () => {
    if (!confirmRestore) return;
    setBusyId(confirmRestore);
    try {
      await api.post(`${resource}/${encodeURIComponent(confirmRestore)}/restore`);
      setItems((prev) => prev.filter((i) => i[idField] !== confirmRestore));
      toast.success("Restored successfully");
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Failed to restore");
    } finally {
      setBusyId(null);
      setConfirmRestore(null);
    }
  };

  const handlePermanentDelete = async () => {
    if (!confirmPermanent) return;
    setBusyId(confirmPermanent);
    try {
      await api.deleteSimple(`${resource}/${encodeURIComponent(confirmPermanent)}/permanent`);
      setItems((prev) => prev.filter((i) => i[idField] !== confirmPermanent));
      toast.success("Permanently deleted");
      onChanged?.();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setBusyId(null);
      setConfirmPermanent(null);
    }
  };

  return (
    <>
      <Modal title={`Recycle Bin — ${title}`} icon={Trash2} onClose={onClose}>
        <div className="space-y-3">
          {items.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search deleted items..."
                className="w-full pl-10 pr-3 py-2 text-[13px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          )}
          {loading ? (
            <p className="text-[13px] text-gray-400 text-center py-8">Loading...</p>
          ) : items.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-8">Recycle bin is empty.</p>
          ) : filteredItems.length === 0 ? (
            <p className="text-[13px] text-gray-400 text-center py-8">No matches for "{search}".</p>
          ) : (
            filteredItems.map((item) => (
              <div key={item[idField]} className="flex items-center justify-between gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/30">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-white truncate">{getLabel ? getLabel(item) : item[idField]}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {getSubLabel ? getSubLabel(item) : null}
                    {getSubLabel && " · "}
                    Deleted by {item.deletedBy || "Unknown"} · {item.deletedAt ? formatDateTime(item.deletedAt) : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canRestore && (
                    <button
                      onClick={() => setConfirmRestore(item[idField])}
                      disabled={busyId === item[idField]}
                      title="Restore"
                      className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button
                      onClick={() => setConfirmPermanent(item[idField])}
                      disabled={busyId === item[idField]}
                      title="Delete Permanently"
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </Modal>
      {confirmRestore && (
        <ConfirmModal
          title="Restore Record"
          message="This will bring the record back and it will reappear in the normal list. Continue?"
          confirmLabel="Restore"
          confirmColor="primary"
          loading={busyId === confirmRestore}
          onConfirm={handleRestore}
          onCancel={() => setConfirmRestore(null)}
        />
      )}
      {confirmPermanent && (
        <ConfirmModal
          title="Permanently Delete"
          message="This cannot be undone. The record will be permanently removed from the database."
          confirmLabel="Delete Forever"
          loading={busyId === confirmPermanent}
          onConfirm={handlePermanentDelete}
          onCancel={() => setConfirmPermanent(null)}
        />
      )}
    </>
  );
}
