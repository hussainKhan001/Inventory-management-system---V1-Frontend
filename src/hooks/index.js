import { useState, useEffect, useCallback } from "react";
import { scrollToError } from "../utils";

// Debounces any value by `delay` ms (default 500ms)
// Replaces the repeated useState + useEffect debounce pattern in every page
export function useDebounce(value, delay = 500) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Manages a single modal: open/close + selected item + editing mode
// Usage:
//   const modal = useModal();
//   modal.openCreate()       → open empty form
//   modal.openEdit(item)     → open form prefilled with item
//   modal.openView(item)     → open view modal
//   modal.close()            → close and reset
export function useModal() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const openCreate = useCallback(() => {
    setSelected(null);
    setIsEditing(false);
    setOpen(true);
  }, []);

  const openEdit = useCallback((item) => {
    setSelected(item);
    setIsEditing(true);
    setOpen(true);
  }, []);

  const openView = useCallback((item) => {
    setSelected(item);
    setIsEditing(false);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setSelected(null);
    setIsEditing(false);
  }, []);

  return { open, selected, isEditing, openCreate, openEdit, openView, close, setSelected };
}

// Manages form validation errors and auto-scrolls to first error
// Usage:
//   const { errors, setErrors, clearErrors } = useFormErrors();
export function useFormErrors() {
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (Object.keys(errors).length > 0) scrollToError();
  }, [errors]);

  const clearErrors = useCallback(() => setErrors({}), []);

  return { errors, setErrors, clearErrors };
}

// Manages a confirmation dialog (delete, cancel, etc.)
// Usage:
//   const confirm = useConfirm();
//   confirm.open(item.id)    → show dialog for this id
//   confirm.id               → the id being confirmed (null = closed)
//   confirm.close()          → dismiss without action
export function useConfirm() {
  const [id, setId] = useState(null);
  const open = useCallback((value) => setId(value), []);
  const close = useCallback(() => setId(null), []);
  return { id, open, close };
}

// Manages a second confirmation dialog on the same page (e.g. cancel + delete)
// Same API as useConfirm but independent state
export function useConfirm2() {
  const [id, setId] = useState(null);
  const [extra, setExtra] = useState(null); // optional extra data (e.g. note text)
  const open = useCallback((value, extraData = null) => { setId(value); setExtra(extraData); }, []);
  const close = useCallback(() => { setId(null); setExtra(null); }, []);
  return { id, extra, open, close };
}

// Manages page number for pagination
// Automatically resets to page 1 when any filter dependency changes
// Usage:
//   const { page, setPage } = usePage([search, filterX, filterY]);
export function usePage(resetDeps = []) {
  const [page, setPage] = useState(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, resetDeps);
  return { page, setPage };
}

// Manages a date range filter (startDate + endDate)
// Usage:
//   const dateRange = useDateRange();
//   <DateRangePicker value={dateRange.value} onChange={dateRange.onChange} />
//   dateRange.clear()
export function useDateRange() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const onChange = useCallback(({ start, end }) => {
    setStartDate(start);
    setEndDate(end);
  }, []);
  const clear = useCallback(() => { setStartDate(""); setEndDate(""); }, []);
  const hasValue = !!(startDate || endDate);
  return { startDate, endDate, value: { start: startDate, end: endDate }, onChange, clear, hasValue };
}
