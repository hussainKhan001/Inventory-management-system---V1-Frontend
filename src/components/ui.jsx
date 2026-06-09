var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React from "react";
import { X, Loader2, Sun, Moon, AlertCircle, Camera, Upload, Plus, Search, CheckCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { compressImage } from "../lib/upload";
import { DatePicker } from "./ui/DatePicker";
const Card = React.memo(({
  children,
  className = "",
  ...props
}) => <div
  className={cn(
    "bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-200",
    className
  )}
  {...props}
>
    {children}
  </div>);
const Badge = React.memo(({
  text,
  color = "blue",
  icon: Icon,
  className = "",
  small,
  ...props
}) => {
  const colors = {
    green: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    red: "bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    blue: "bg-blue-50 text-blue-500 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
    yellow: "bg-amber-50 text-orange-500 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
    purple: "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
    orange: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
    gray: "bg-gray-50 text-gray-500 border-gray-100 dark:bg-gray-500/10 dark:text-gray-400 dark:border-gray-500/20"
  };
  const label = typeof text === "object" && text !== null ? text.label || text.value || JSON.stringify(text) : String(text || "");
  return <span
    className={cn(
      "px-2.5 py-0.5 rounded-full font-bold border inline-flex items-center justify-center whitespace-nowrap gap-1.5 transition-all duration-200",
      small ? "text-[8px] px-1.5 h-4" : "text-[10px]",
      colors[color],
      className
    )}
    {...props}
  >
      {Icon && <Icon className={cn("shrink-0", small ? "w-2.5 h-2.5" : "w-3 h-3")} />}
      {label}
    </span>;
});
const StatusBadge = React.memo(({ status, accountStatus, small }) => {
  let color = "gray";
  const statusStr = typeof status === "object" && status !== null ? status.label || status.value || JSON.stringify(status) : String(status || "Pending");
  const normalizedStatus = statusStr.toUpperCase();
  if (["APPROVED", "ACTIVE", "CONFIRMED", "GOOD", "NEW", "FULFILLED", "GRN FULFILLED", "IN STOCK", "SUCCESS", "PAID", "ISSUED", "COMPLETED", "CLOSED", "VERIFIED"].includes(normalizedStatus) || normalizedStatus.includes("APPROVED BY"))
    color = "green";
  else if (normalizedStatus.includes("PENDING") || ["PARTIAL", "OPEN", "BILL_VERIFY_KARNA_HAI", "PAYMENT_PENDING", "AWAITING"].includes(normalizedStatus))
    color = "yellow";
  else if (["BILL_VERIFY", "VERIFY BILL", "AUDIT"].includes(normalizedStatus))
    color = "purple";
  else if (["BLOCKED", "DAMAGED", "REJECTED", "NEEDS PURCHASE", "FAILED", "CANCELLED", "VOID"].includes(normalizedStatus))
    color = "red";
  else if (["PO RAISED", "ALLOCATED", "STAGED", "PROCESSING"].includes(normalizedStatus))
    color = "blue";
  else if (["NEEDS REPAIR", "REPAIR", "OLD", "GRN VARIANCE"].includes(normalizedStatus))
    color = "orange";
  else if (["DRAFT"].includes(normalizedStatus))
    color = "purple";
  const renderBadge = /* @__PURE__ */ __name((txt, col) => <Badge
    text={txt}
    color={col}
    small={small}
  />, "renderBadge");
  if (normalizedStatus.startsWith("PENDING") && normalizedStatus.split(" ").length > 1) {
    const parts = statusStr.split(" ");
    const main = parts[0];
    const sub = parts.slice(1).join(" ");
    return <div className="flex flex-col items-start gap-1">
        {renderBadge(main, color)}
        <span className={cn(
      "font-bold px-2 inline-block tracking-tight border border-current rounded-full opacity-70",
      small ? "text-[7px] leading-tight" : "text-[8px]",
      color === "yellow" ? "text-orange-500 dark:text-amber-400 border-amber-200/50" : ""
    )}>{sub}</span>
      </div>;
  }
  if (["APPROVED", "FULFILLED", "GRN FULFILLED", "GRN VARIANCE", "READY FOR PAYMENT"].includes(normalizedStatus) && accountStatus) {
    const accStatus = accountStatus.toUpperCase().replace("_", " ");
    let accColor = "gray";
    if (accStatus.includes("VERIFY")) accColor = "purple";
    else if (accStatus.includes("PENDING")) accColor = "yellow";
    else if (accStatus.includes("PAID")) accColor = "green";
    else if (accStatus.includes("REJECTED")) accColor = "red";
    return <div className="flex flex-col items-start gap-1">
        {renderBadge(normalizedStatus, color)}
        {renderBadge(accStatus, accColor)}
      </div>;
  }
  return renderBadge(statusStr, color);
});
const Btn = React.memo(({
  label,
  onClick,
  color = "primary",
  icon: Icon,
  outline,
  small,
  disabled,
  loading,
  className,
  type = "button"
}) => {
  const base = "inline-flex items-center justify-center font-bold rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95";
  const size = small ? "px-3 py-1.5 text-[11px] h-[32px]" : "px-6 py-2 h-[40px] text-[13px]";
  let colors = "";
  if (outline) {
    colors = "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-[#F1F5F9] hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-transparent";
  } else if (color === "primary") {
    colors = "bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20 dark:shadow-none";
  } else if (color === "purple") {
    colors = "bg-[#8B5CF6] text-white hover:bg-[#7c3aed] shadow-md shadow-purple-500/20 dark:shadow-none";
  } else if (color === "red") {
    colors = "bg-[#EF4444] text-white hover:bg-[#dc2626] shadow-md shadow-red-500/20 dark:shadow-none";
  } else if (color === "green") {
    colors = "bg-[#10B981] text-white hover:bg-[#059669] shadow-md shadow-green-500/20 dark:shadow-none";
  } else {
    colors = "bg-gray-800 dark:bg-[#1E293B] border border-transparent dark:border-gray-700 text-white hover:bg-gray-900 dark:hover:bg-[#334155]";
  }
  return <button
    type={type}
    onClick={onClick}
    disabled={disabled || loading}
    className={cn(base, size, colors, className)}
  >
      {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : Icon ? <Icon className={cn("w-4 h-4", label ? "mr-2" : "")} /> : null}
      {label}
    </button>;
});
const Field = React.memo(({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
  required,
  error,
  helperText,
  small,
  list,
  options,
  // If options provided, create a datalist
  className,
  icon: Icon,
  ...props
}) => {
  const datalistId = label ? `list-${label.replace(/\s+/g, "-").toLowerCase()}` : void 0;
  if (type === "date") {
    return <DatePicker
      label={label}
      value={value}
      onChange={onChange}
      disabled={disabled}
      required={required}
      error={error}
      small={small}
      icon={Icon}
      className={className}
      {...props}
    />;
  }
  return <div className={cn(small ? "mb-2" : "mb-4", className)}>
      {label && <label className={cn("block font-bold text-gray-700 dark:text-gray-300 mb-1.5", small ? "text-[9px]" : "text-[13px] font-semibold mb-2")}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>}
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />}
        <input
    type={type}
    value={value === void 0 || value === null || typeof value === "number" && isNaN(value) ? "" : value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    list={list}
    {...props}
    className={cn(
      "w-full bg-white dark:bg-transparent border border-gray-300 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-700 rounded-md text-[#1A1A2E] dark:text-[#F1F5F9] transition-all duration-200 focus:outline-none focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/20 disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500 shadow-xs",
      small ? "px-3 py-1.5 text-[12px]" : "px-4 py-2 h-[40px] text-[13px]",
      Icon ? "pl-10" : "",
      error && "border-red-500 focus:border-red-500 focus:ring-red-500/10"
    )}
  />
      </div>
      {options && <datalist id={list || datalistId}>
          {options.map((opt, i) => {
    const val = opt?.value !== void 0 ? opt.value : opt;
    const label2 = opt?.label !== void 0 ? opt.label : opt;
    return <option key={i} value={val}>
                {typeof label2 === "object" ? JSON.stringify(label2) : String(label2 || "")}
              </option>;
  })}
        </datalist>}
      {helperText && !error && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">{helperText}</p>}
      {error && <p className="text-[11px] text-red-500 mt-1 font-medium">{error}</p>}
    </div>;
});
import { DatePicker as DatePicker2 } from "./ui/DatePicker";
const SField = React.memo(({
  label,
  value,
  onChange,
  options,
  disabled,
  required,
  error,
  helperText,
  small,
  placeholder,
  className,
  ...props
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);
  React.useEffect(() => {
    const handleClickOutside = /* @__PURE__ */ __name((event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }, "handleClickOutside");
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const normalizedOptions = React.useMemo(() => {
    if (!options) return [];
    return options.map((opt) => {
      const val = opt?.value !== void 0 ? opt.value : opt;
      const lbl = opt?.label !== void 0 ? opt.label : opt;
      return {
        value: val,
        label: typeof lbl === "object" ? JSON.stringify(lbl) : String(lbl || "")
      };
    });
  }, [options]);
  const selectedOption = normalizedOptions.find((o) => String(o.value) === String(value));
  return <div className={cn(small ? "mb-2" : "mb-4", isOpen ? "relative z-[100]" : "relative", className)} ref={containerRef}>
      {label && <label className={cn("block font-bold text-gray-700 dark:text-gray-300 mb-1.5", small ? "text-[9px]" : "text-[13px] font-semibold mb-2")}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>}
      
      <div className="relative group">
        <div
    onClick={() => {
      if (!disabled) setIsOpen(!isOpen);
    }}
    className={cn(
      "w-full bg-white dark:bg-transparent border rounded-md text-[#1A1A2E] dark:text-[#F1F5F9] transition-all duration-200 focus:outline-none flex items-center justify-between cursor-pointer shadow-xs",
      small ? "pl-3 pr-2 py-1.5 min-h-[32px] text-[12px]" : "pl-4 pr-3 py-2 min-h-[40px] text-[13px]",
      error && "border-red-500 ring-4 ring-red-500/10",
      isOpen ? "border-[#F97316] ring-4 ring-[#F97316]/20" : "border-gray-300 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-700",
      disabled && "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-800",
      className
    )}
    {...props}
  >
          <span className={cn("truncate", !selectedOption && "text-gray-500 dark:text-gray-400")}>
            {selectedOption ? selectedOption.label : placeholder || "Select..."}
          </span>
          <svg className={cn("w-4 h-4 transition-transform duration-200 shrink-0 ml-2", isOpen ? "transform rotate-180 text-[#F97316]" : "text-gray-400 group-hover:text-[#F97316]")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <AnimatePresence>
          {isOpen && <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.15 }}
    className="absolute z-[60] w-full min-w-[160px] top-[calc(100%+8px)] left-0 bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700/80 rounded-md shadow-xl dark:shadow-2xl dark:shadow-black/60 overflow-hidden py-1"
  >
              <div className="max-h-60 overflow-y-auto overscroll-contain custom-scrollbar">
                {normalizedOptions.length === 0 ? <div className="px-4 py-2 text-[13px] text-gray-500 italic">No options</div> : <>
                    <div
    onClick={() => {
      onChange?.({ target: { value: "", name: props.name } });
      setIsOpen(false);
    }}
    className={cn(
      "px-4 py-2 text-[13px] cursor-pointer transition-colors",
      !value ? "bg-[#F97316]/10 text-[#F97316] font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
    )}
  >
                      {placeholder || "Select..."}
                    </div>
                    {normalizedOptions.map((opt, idx) => <div
    key={`${opt.value}-${idx}`}
    onClick={() => {
      onChange?.({ target: { value: opt.value, name: props.name } });
      setIsOpen(false);
    }}
    className={cn(
      "px-4 py-2 text-[13px] cursor-pointer transition-colors flex items-center justify-between",
      String(value) === String(opt.value) ? "bg-[#F97316]/10 text-[#F97316] font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
    )}
  >
                        <span className="truncate">{opt.label}</span>
                      </div>)}
                  </>}
              </div>
            </motion.div>}
        </AnimatePresence>
      </div>

      {helperText && !error && <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 font-medium">{helperText}</p>}
      {error && <p className="text-[11px] text-red-500 mt-1 font-medium">{error}</p>}
    </div>;
});
const Modal = /* @__PURE__ */ __name(({ title, onClose, wide, extraWide, ultraWide, children, footer, className }) => <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="fixed inset-0 z-[60] flex justify-end bg-[#0F172A]/60 backdrop-blur-sm"
  onClick={(e) => {
    if (e.target === e.currentTarget) onClose?.();
  }}
>
    <motion.div
  initial={{ x: "100%" }}
  animate={{ x: 0 }}
  transition={{ type: "spring", damping: 30, stiffness: 300 }}
  className={cn(
    "bg-white dark:bg-gray-800 h-full shadow-2xl flex flex-col border-l border-gray-100 dark:border-gray-700/50 transition-colors duration-200",
    ultraWide ? "w-full max-w-6xl" : extraWide ? "w-full max-w-4xl" : wide ? "w-full max-w-2xl" : "w-full max-w-md",
    className
  )}
>
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
        <h2 className="text-[15px] sm:text-base font-bold text-gray-900 dark:text-white truncate pr-4">{title}</h2>
        <button
  onClick={onClose}
  className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors shrink-0"
>
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col relative">
        <div className="p-4 sm:p-6 flex-1">
          {children}
        </div>
        {footer && <div className="sticky bottom-0 z-[50] px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-800/80 mt-auto shrink-0">
            {footer}
          </div>}
      </div>
    </motion.div>
  </motion.div>, "Modal");
const ConfirmModal = /* @__PURE__ */ __name(({ title, message, onConfirm, onCancel, loading, confirmLabel = "Confirm", confirmColor = "red" }) => <motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#0F172A]/70 backdrop-blur-sm"
  onClick={(e) => {
    if (e.target === e.currentTarget) onCancel?.();
  }}
>
    <motion.div
  initial={{ scale: 0.95, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", damping: 30, stiffness: 300 }}
  className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm flex flex-col border border-gray-100 dark:border-gray-700/50 p-6"
>
      <h2 className="text-[15px] font-bold text-[#1A1A2E] dark:text-[#F1F5F9] mb-4 text-center">{title}</h2>
      <div className="flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-gray-700 dark:text-gray-300 text-[14px] leading-relaxed mb-6">
          {message}
        </p>
        <div className="flex gap-3 w-full">
          <Btn label="Cancel" onClick={onCancel} outline className="flex-1" disabled={loading} />
          <Btn label={confirmLabel} onClick={onConfirm} color={confirmColor} className="flex-1" loading={loading} />
        </div>
      </div>
    </motion.div>
  </motion.div>, "ConfirmModal");
const Skeleton = /* @__PURE__ */ __name(({ className, ...props }) => <div className={cn("animate-pulse bg-gray-200 dark:bg-[#334155] rounded", className)} {...props} />, "Skeleton");
const Table = /* @__PURE__ */ __name(({ children, className, ...props }) => <div className="w-full overflow-x-auto no-scrollbar">
    {
  /* table-fixed ensures columns respect explicit widths; overflow-x-auto handles mobile */
}
    <table className={cn("w-full text-left border-collapse table-fixed min-w-[640px] font-sans", className)} {...props}>
      {children}
    </table>
  </div>, "Table");
const Thead = /* @__PURE__ */ __name(({ children, className, ...props }) => <thead className={cn("bg-gray-50 dark:bg-gray-800/95 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100 dark:border-gray-700/50", className)} {...props}>
    {children}
  </thead>, "Thead");
const Tbody = /* @__PURE__ */ __name(({ children, className, ...props }) => <tbody className={cn("divide-y divide-gray-100 dark:divide-gray-700/40", className)} {...props}>
    {children}
  </tbody>, "Tbody");
const Tr = /* @__PURE__ */ __name(({ children, className, isPending, isNew, ...props }) => <tr
  className={cn(
    "group hover:bg-gray-50/70 dark:hover:bg-gray-700/30 transition-all duration-200",
    isPending && "bg-orange-50/30 dark:bg-orange-950/20",
    isNew && "bg-blue-50/30 dark:bg-blue-950/20",
    className
  )}
  {...props}
>
    {children}
  </tr>, "Tr");
const Th = /* @__PURE__ */ __name(({ children, className, ...props }) => <th
  className={cn(
    "px-3 py-3 text-[10px] font-black text-gray-400 tracking-widest whitespace-nowrap overflow-hidden align-middle",
    className
  )}
  {...props}
>
    {children}
  </th>, "Th");
const Td = /* @__PURE__ */ __name(({ children, className, ...props }) => <td className={cn(
  "px-3 py-2.5 text-[13px] text-gray-600 dark:text-gray-300 align-middle overflow-hidden",
  className
)} {...props}>
    {children}
  </td>, "Td");
const TdText = /* @__PURE__ */ __name(({ children, className, title, ...props }) => <td className={cn(
  "px-3 py-2.5 text-[13px] text-gray-600 dark:text-gray-300 align-middle overflow-hidden",
  className
)} {...props}>
    <span className="block truncate" title={title ?? (typeof children === "string" ? children : void 0)}>
      {children}
    </span>
  </td>, "TdText");
const ThemeToggle = /* @__PURE__ */ __name(({ theme, toggleTheme }) => <button
  onClick={toggleTheme}
  className="p-2 rounded-xl bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 relative overflow-hidden flex items-center justify-center w-10 h-10 shadow-sm"
  title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
  key={theme}
  initial={{ y: 20, opacity: 0, rotate: 90 }}
  animate={{ y: 0, opacity: 1, rotate: 0 }}
  exit={{ y: -20, opacity: 0, rotate: -90 }}
  transition={{ duration: 0.3, ease: "easeInOut" }}
>
        {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </motion.div>
    </AnimatePresence>
  </button>, "ThemeToggle");
const PageHeader = /* @__PURE__ */ __name(({ title, sub, actions }) => <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 sm:mb-8">
    <div className="min-w-0">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight">{title}</h1>
      {sub && <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 mt-1 sm:mt-1.5 font-medium">{sub}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">{actions}</div>}
  </div>, "PageHeader");
const KPICard = /* @__PURE__ */ __name(({
  label,
  value,
  sub,
  color = "blue",
  icon: Icon,
  change,
  trend
}) => {
  const iconColors = {
    orange: "bg-orange-50 text-orange-500 dark:bg-orange-500/10 dark:text-orange-400",
    blue: "bg-blue-50 text-blue-500 dark:bg-blue-500/10 dark:text-blue-400",
    green: "bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400",
    purple: "bg-violet-50 text-violet-500 dark:bg-violet-500/10 dark:text-violet-400",
    red: "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
  };
  return <div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-300 p-5 flex flex-col min-h-[130px]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5 break-words">{value}</p>
          {change !== undefined && <p className={cn("text-xs font-semibold mt-1 flex items-center gap-1", trend === "up" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400")}>
            {trend === "up" ? "↑" : "↓"} {change}
          </p>}
          {sub && !change && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-medium leading-relaxed">{sub}</p>}
        </div>
        {Icon && <div className={cn("p-2.5 rounded-lg shrink-0", iconColors[color])}>
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>}
      </div>
    </div>;
}, "KPICard");
const Pagination = /* @__PURE__ */ __name(({
  data,
  onPageChange
}) => {
  if (!data || data.pages <= 1) return null;
  return <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700/50 sm:px-6 rounded-b-xl transition-colors duration-200">
      <div className="flex justify-between flex-1 sm:hidden">
        <Btn label="Previous" onClick={() => onPageChange(data.page - 1)} disabled={data.page === 1} outline small />
        <Btn label="Next" onClick={() => onPageChange(data.page + 1)} disabled={data.page === data.pages} outline small />
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700 dark:text-[#94A3B8]">
            Showing page <span className="font-bold text-[#1A1A2E] dark:text-[#F1F5F9]">{data.page}</span> of{" "}
            <span className="font-bold text-[#1A1A2E] dark:text-[#F1F5F9]">{data.pages}</span> (
            <span className="font-bold text-[#1A1A2E] dark:text-[#F1F5F9]">{data.total}</span> total results)
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px" aria-label="Pagination">
            <button
    onClick={() => onPageChange(data.page - 1)}
    disabled={data.page === 1}
    className="relative inline-flex items-center px-3 py-2 rounded-l-lg border border-gray-300 dark:border-[#334155] bg-white dark:bg-transparent text-sm font-medium text-gray-500 dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#1E293B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
              &lt;
            </button>
            {[...Array(data.pages)].map((_, i) => <button
    key={i + 1}
    onClick={() => onPageChange(i + 1)}
    className={cn(
      "relative inline-flex items-center px-4 py-2 border text-sm font-bold transition-all duration-200",
      data.page === i + 1 ? "z-10 bg-[#F97316] border-[#F97316] text-white" : "bg-white dark:bg-transparent border-gray-300 dark:border-[#334155] text-gray-500 dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#1E293B]"
    )}
  >
                {i + 1}
              </button>)}
            <button
    onClick={() => onPageChange(data.page + 1)}
    disabled={data.page === data.pages}
    className="relative inline-flex items-center px-3 py-2 rounded-r-lg border border-gray-300 dark:border-[#334155] bg-white dark:bg-transparent text-sm font-medium text-gray-500 dark:text-[#94A3B8] hover:bg-gray-50 dark:hover:bg-[#1E293B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
  >
              &gt;
            </button>
          </nav>
        </div>
      </div>
    </div>;
}, "Pagination");
const MultiSelect = /* @__PURE__ */ __name(({
  label,
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  error,
  required
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef(null);
  React.useEffect(() => {
    const handleClickOutside = /* @__PURE__ */ __name((event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }, "handleClickOutside");
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const filteredOptions = React.useMemo(() => {
    const s = search.toLowerCase();
    return options.filter(
      (opt) => (opt.label?.toLowerCase() || "").includes(s) || (opt.value?.toLowerCase() || "").includes(s)
    );
  }, [options, search]);
  const toggleOption = /* @__PURE__ */ __name((value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((s) => s !== value));
    } else {
      onChange([...selected, value]);
    }
  }, "toggleOption");
  return <div className="mb-4 relative" ref={containerRef}>
      {label && <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>}
      <div
    onClick={() => setIsOpen(!isOpen)}
    className={cn(
      "w-full min-h-[44px] px-3 py-2 bg-white dark:bg-transparent border border-[#E8ECF0] dark:border-[#334155] rounded-lg text-[13px] cursor-pointer flex flex-wrap gap-2 items-center transition-all duration-200 focus-within:border-[#F97316] focus-within:ring-2 focus-within:ring-[#F97316]/20",
      error && "border-red-500",
      isOpen && "border-[#F97316] ring-2 ring-[#F97316]/20"
    )}
  >
        {selected.length === 0 && <span className="text-gray-400">{placeholder}</span>}
        {selected?.map((val, idx) => {
    const opt = options?.find((o) => o.value === val);
    return <span
      key={`${val}-${idx}`}
      className="inline-flex items-center gap-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-md text-xs font-bold border border-orange-100 dark:border-orange-800"
    >
              {opt?.label || val}
              <X
      className="w-3 h-3 cursor-pointer hover:text-orange-900 dark:hover:text-orange-200"
      onClick={(e) => {
        e.stopPropagation();
        toggleOption(val);
      }}
    />
            </span>;
  })}
      </div>

      <AnimatePresence>
        {isOpen && <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1E293B] border border-[#E8ECF0] dark:border-[#334155] rounded-md shadow-xl overflow-hidden"
  >
            <div className="p-2 border-b border-[#E8ECF0] dark:border-[#334155]">
              <input
    type="text"
    autoFocus
    placeholder="Search items..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    onClick={(e) => e.stopPropagation()}
    className="w-full px-3 py-2 bg-gray-50 dark:bg-transparent border border-[#E8ECF0] dark:border-[#334155] rounded-lg text-[13px] text-gray-900 dark:text-white focus:outline-none focus:border-[#F97316]"
  />
            </div>
            <div className="max-h-60 overflow-y-auto p-1 text-gray-900 dark:text-white overscroll-contain scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
              {(filteredOptions?.length || 0) === 0 ? <div className="p-4 text-center text-gray-500 text-xs italic">No items found</div> : filteredOptions?.map((opt, idx) => <div
    key={`${opt.value}-${idx}`}
    onClick={(e) => {
      e.stopPropagation();
      toggleOption(opt.value);
    }}
    className={cn(
      "px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors gap-4",
      selected.includes(opt.value) ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400" : "hover:bg-gray-50 dark:hover:bg-[#334155] text-gray-700 dark:text-gray-300"
    )}
  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[13px] font-bold truncate">{opt.label}</span>
                      {opt.subLabel && <span className="text-[11px] opacity-70 truncate">{opt.subLabel}</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {opt.stock !== void 0 && <div className="text-right">
                          <span className="text-[18px] font-black text-orange-500 leading-none">{opt.stock}</span>
                          <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 ml-1 tracking-tighter">{opt.unit}</span>
                        </div>}
                      {selected.includes(opt.value) && <div className="w-2 h-2 rounded-full bg-orange-500" />}
                    </div>
                  </div>)}
            </div>
          </motion.div>}
      </AnimatePresence>
      {error && <p className="text-[11px] text-red-500 mt-1 font-medium">{error}</p>}
    </div>;
}, "MultiSelect");
const SearchSelect = /* @__PURE__ */ __name(({
  label,
  options,
  value,
  onChange,
  placeholder = "Search and select...",
  error,
  required,
  className,
  small,
  disabled,
  onSearch
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef(null);
  React.useEffect(() => {
    if (onSearch) {
      const delayDebounceFn = setTimeout(() => {
        onSearch(search);
      }, 400);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [search, onSearch]);
  React.useEffect(() => {
    const handleClickOutside = /* @__PURE__ */ __name((event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }, "handleClickOutside");
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const filteredOptions = React.useMemo(() => {
    const s = search.toLowerCase();
    return options.filter(
      (opt) => (opt.label?.toLowerCase() || "").includes(s) || (opt.value?.toLowerCase() || "").includes(s) || (opt.subLabel?.toLowerCase() || "").includes(s)
    );
  }, [options, search]);
  const selectedOption = options.find((o) => o.value === value);
  return <div className={cn("relative", isOpen ? "z-[100]" : "", className)} ref={containerRef}>
      {label && <label className={cn("block font-bold text-gray-700 dark:text-gray-300 mb-1.5", small ? "text-[9px]" : "text-[11px]")}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>}
      <div
    onClick={() => !disabled && setIsOpen(!isOpen)}
    className={cn(
      "w-full px-3 bg-white dark:bg-transparent border border-[#E8ECF0] dark:border-[#334155] rounded-lg text-[13px] cursor-pointer flex items-center justify-between transition-all duration-200 focus-within:border-[#F97316] focus-within:ring-2 focus-within:ring-[#F97316]/20",
      small ? "py-1.5 min-h-[36px]" : "py-2.5 min-h-[44px]",
      error && "border-red-500",
      isOpen && "border-[#F97316] ring-2 ring-[#F97316]/20",
      disabled && "opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800"
    )}
  >
        <div className="flex flex-col truncate">
          {selectedOption ? <>
              <span className="font-bold text-gray-900 dark:text-white truncate">{selectedOption.label}</span>
              {selectedOption.subLabel && !small && <span className="text-[10px] text-gray-500 truncate">{selectedOption.subLabel}</span>}
            </> : value ? <span className="font-bold text-gray-900 dark:text-white truncate">{value}</span> : <span className="text-gray-400 truncate">{placeholder}</span>}
        </div>
        <Search className={cn("text-gray-400", small ? "w-3 h-3" : "w-4 h-4")} />
      </div>

      <AnimatePresence>
        {isOpen && <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="absolute z-50 w-full mt-1 bg-white dark:bg-[#1E293B] border border-[#E8ECF0] dark:border-[#334155] rounded-md shadow-xl overflow-hidden"
  >
            <div className="p-2 border-b border-[#E8ECF0] dark:border-[#334155]">
              <input
    type="text"
    autoFocus
    className="w-full px-3 py-2 bg-gray-50 dark:bg-transparent border border-[#E8ECF0] dark:border-[#334155] rounded-lg text-[13px] text-gray-900 dark:text-white focus:outline-none focus:border-[#F97316]"
    placeholder="Search..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    onClick={(e) => e.stopPropagation()}
  />
            </div>
            <div className="max-h-60 overflow-y-auto p-1 text-gray-900 dark:text-white overscroll-contain scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700">
              {search && !filteredOptions.some((o) => o.label.toLowerCase() === search.toLowerCase()) && <div
    onClick={(e) => {
      e.stopPropagation();
      onChange(search);
      setIsOpen(false);
      setSearch("");
    }}
    className="px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors gap-4 hover:bg-primary/10 text-primary group"
  >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[13px] font-bold truncate">Use "{search}"</span>
                    <span className="text-[10px] opacity-70">New Item / Custom Value</span>
                  </div>
                  <Plus className="w-4 h-4" />
                </div>}
              {filteredOptions.length === 0 && !search ? <div className="p-4 text-center text-gray-500 text-sm italic">No items found</div> : filteredOptions.map((opt, idx) => <div
    key={`${opt.value}-${idx}`}
    onClick={(e) => {
      e.stopPropagation();
      onChange(opt.value);
      setIsOpen(false);
      setSearch("");
    }}
    className={cn(
      "px-3 py-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors gap-4",
      value === opt.value ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400" : "hover:bg-gray-50 dark:hover:bg-[#334155] text-gray-700 dark:text-gray-300"
    )}
  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[13px] font-bold truncate">{opt.label}</span>
                      {opt.subLabel && <span className="text-[11px] opacity-70 truncate">{opt.subLabel}</span>}
                    </div>
                    {value === opt.value && <CheckCircle className="w-4 h-4 text-orange-500" />}
                  </div>)}
            </div>
          </motion.div>}
      </AnimatePresence>
    </div>;
}, "SearchSelect");
const ImageUpload = /* @__PURE__ */ __name(({
  label,
  value,
  onChange,
  error,
  required,
  loading,
  id,
  icon: Icon = Upload,
  aspect,
  small,
  capture,
  onRemove
}) => {
  const [compressing, setCompressing] = React.useState(false);
  const inputRef = React.useRef(null);
  const handleFileChange = /* @__PURE__ */ __name(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = /* @__PURE__ */ __name((f) => {
      return f.type?.startsWith("image/") || f.name?.toLowerCase().endsWith(".heic") || f.name?.toLowerCase().endsWith(".heif");
    }, "isImage");
    if (!isImage(file)) {
      toast.error("Please upload an image file");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setCompressing(true);
    try {
      const finalFile = await compressImage(file);
      await Promise.resolve(onChange(finalFile));
      toast.success("Upload complete");
    } catch (error2) {
      console.error("Image processing/upload error:", error2);
      try {
        await Promise.resolve(onChange(file));
        toast.success("Upload complete");
      } catch (fallbackError) {
        toast.error(`Upload failed: ${fallbackError.message || "Unknown error"}`);
      }
    } finally {
      setCompressing(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      e.target.value = "";
    }
  }, "handleFileChange");
  return <div className="space-y-2">
      {label && <label className={cn("block font-bold text-gray-700 dark:text-gray-300 tracking-wider", small ? "text-[9px]" : "text-[11px]")}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>}
      <div className="relative">
        <input
    ref={inputRef}
    type="file"
    className="hidden"
    id={id}
    accept="image/*,.heic,.heif"
    capture={capture}
    onChange={handleFileChange}
    disabled={loading || compressing}
  />
        <label
    htmlFor={id}
    className={cn(
      "flex flex-col items-center justify-center gap-2 w-full border-2 border-dashed rounded-md cursor-pointer transition-all duration-200 overflow-hidden relative group",
      aspect || (small ? "aspect-square" : "aspect-[16/9]"),
      small && "p-2",
      value ? "border-green-200 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/10" : error ? "border-red-200 dark:border-red-900/30 bg-red-50/30 dark:bg-red-900/10" : "border-[#E8ECF0] dark:border-[#334155] hover:border-[#F97316] dark:hover:border-[#F97316] bg-gray-50/50 dark:bg-transparent"
    )}
  >
          {loading || compressing ? <div className="flex flex-col items-center gap-1">
              <Loader2 className={cn("animate-spin text-[#F97316]", small ? "w-5 h-5" : "w-6 h-6")} />
              {!small && <span className="text-[11px] font-bold text-[#6B7280] tracking-wider">
                  {compressing ? "Optimizing..." : "Uploading..."}
                </span>}
            </div> : value ? <div className="relative w-full h-full group">
              <img src={value} alt={label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="flex flex-col items-center gap-1 text-white">
                  <Icon className={cn(small ? "w-4 h-4" : "w-5 h-5")} />
                  {!small && <span className="text-[10px] font-bold tracking-wider">Change</span>}
                </div>
              </div>
              {onRemove && <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onRemove();
    }}
    className={cn(
      "absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-red-500/90 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors z-10",
      small && "p-1 rounded-full"
    )}
  >
                  <X className={cn(small ? "w-3 h-3" : "w-3.5 h-3.5")} />
                  {!small && <span className="text-[10px] font-bold tracking-wider">Discard</span>}
                </button>}
            </div> : <div className="flex flex-col items-center gap-1">
              <Icon className={cn(small ? "w-5 h-5" : "w-8 h-8", error ? "text-red-400" : "text-[#6B7280] dark:text-[#475569] group-hover:text-[#F97316]")} />
              {!small && <span className={cn("text-[10px] font-bold tracking-wider transition-colors", error ? "text-red-500" : "text-gray-700 dark:text-gray-300 group-hover:text-[#F97316]")}>
                  Upload
                </span>}
            </div>}
        </label>
        {error && <p className="text-[11px] text-red-500 mt-1.5 font-medium">{error}</p>}
      </div>
    </div>;
}, "ImageUpload");
const MultipleImageUpload = /* @__PURE__ */ __name(({
  label,
  values = [],
  onUpload,
  onRemove,
  onUploadingChange,
  error,
  required,
  loading,
  id,
  small,
  capture
}) => {
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState([]);
  const inputRef = React.useRef(null);
  const handleFileChange = /* @__PURE__ */ __name(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const isImage = /* @__PURE__ */ __name((f) => {
      return f.type?.startsWith("image/") || f.name?.toLowerCase().endsWith(".heic") || f.name?.toLowerCase().endsWith(".heif");
    }, "isImage");
    const imageFiles = files.filter(isImage);
    if (imageFiles.length !== files.length) {
      toast.error("Some files were skipped (only images allowed)");
    }
    if (imageFiles.length === 0) return;
    setUploading(true);
    onUploadingChange?.(true);
    try {
      const { uploadMultipleImages } = await import("../lib/upload");
      const urls = await uploadMultipleImages(imageFiles, (p) => setProgress(p));
      onUpload(urls);
      toast.success(`${urls.length} images uploaded successfully`);
    } catch (error2) {
      console.error("Multiple upload failed:", error2);
      toast.error(`Upload failed: ${error2.message}`);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      setProgress([]);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, "handleFileChange");
  return <div className="space-y-2">
      {label && <label className={cn("block font-bold text-gray-700 dark:text-gray-300 tracking-wider", small ? "text-[9px]" : "text-[11px]")}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>}
      
      <div className={cn(
    small ? "flex flex-wrap gap-2" : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
  )}>
        {values.map((url, idx) => <div key={idx} className={cn(
    "relative group rounded-md overflow-hidden border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0",
    small ? "w-10 h-10" : "aspect-square"
  )}>
            <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <button
    type="button"
    onClick={() => onRemove(idx)}
    className={cn(
      "absolute top-0.5 right-0.5 flex items-center gap-1 bg-red-500 text-white rounded shadow-sm z-10",
      small ? "p-0.5" : "px-1.5 py-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
    )}
  >
              <X className={cn(small ? "w-2.5 h-2.5" : "w-3 h-3")} />
              {!small && <span className="text-[8px] font-bold tracking-wider">Discard</span>}
            </button>
          </div>)}
        
        <div className={cn("relative", small ? "w-10 h-10 shrink-0" : "aspect-square")}>
          <input
    ref={inputRef}
    type="file"
    className="hidden"
    id={id}
    accept="image/*,.heic,.heif"
    multiple
    capture={capture}
    onChange={handleFileChange}
    disabled={loading || uploading}
  />
          <label
    htmlFor={id}
    className={cn(
      "flex flex-col items-center justify-center h-full border-2 border-dashed rounded-md cursor-pointer transition-all duration-200 group",
      uploading ? "bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed border-blue-200" : "hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 border-gray-200 dark:border-gray-700"
    )}
  >
            {uploading ? <Loader2 className="animate-spin text-blue-500" size={small ? 16 : 24} /> : <>
                <Camera className={cn("text-gray-400 group-hover:text-blue-500 transition-colors", small ? "w-4 h-4" : "w-6 h-6")} />
                {!small && <span className="text-[10px] text-gray-400 group-hover:text-blue-500 transition-colors mt-1 font-bold">Add</span>}
              </>}
          </label>
        </div>
      </div>

      {uploading && progress.length > 0 && <div className="mt-1.5 space-y-1">
          <div className="text-[8px] font-black text-blue-500 tracking-tighter animate-pulse">Uploading...</div>
          {progress.map((p, i) => <div key={i} className="flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
    className="h-full bg-blue-500 transition-all duration-300"
    style={{ width: `${p.progress}%` }}
  />
              </div>
              <span className="text-[8px] font-bold text-gray-400 w-5">{p.progress}%</span>
            </div>)}
        </div>}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>;
}, "MultipleImageUpload");
export * from "./ui/Checkbox";
import { CustomDropdown } from "./ui/CustomDropdown";
export {
  Badge,
  Btn,
  Card,
  ConfirmModal,
  CustomDropdown,
  DatePicker2 as DateField,
  Field,
  ImageUpload,
  KPICard,
  Modal,
  MultiSelect,
  MultipleImageUpload,
  PageHeader,
  Pagination,
  SField,
  SearchSelect,
  Skeleton,
  StatusBadge,
  Table,
  Tbody,
  Td,
  TdText,
  Th,
  Thead,
  ThemeToggle,
  Tr
};
