var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";
const CustomDropdown = React.memo(({
  options,
  value,
  onChange,
  disabled,
  placeholder = "Select...",
  className = "",
  dropdownClassName = "",
  small = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  const containerRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = /* @__PURE__ */ __name((event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch("");
      }
    }, "handleClickOutside");
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    if (isOpen) { setSearch(""); setTimeout(() => searchRef.current?.focus(), 50); }
  }, [isOpen]);
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") return { value: opt, label: opt };
      return opt;
    });
  }, [options]);
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const q = search.toLowerCase();
    return normalizedOptions.filter(o => String(o.label).toLowerCase().includes(q));
  }, [normalizedOptions, search]);
  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));
  return <div className={cn("relative w-full", isOpen ? "z-[100]" : "", className)} ref={containerRef}>
      <button
    type="button"
    disabled={disabled}
    onClick={() => setIsOpen(!isOpen)}
    className={cn(
      "w-full flex items-center justify-between text-left font-bold bg-white/40 dark:bg-transparent/30 border border-gray-300 dark:border-gray-600/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-md cursor-pointer text-gray-700 dark:text-gray-300 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-inner",
      small ? "text-[12px] px-3 py-1.5 min-h-[34px]" : "text-[13px] px-4 py-2 h-[40px] min-h-[40px]",
      isOpen && "border-primary ring-1 ring-primary"
    )}
  >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 ml-1.5", isOpen && "rotate-180 text-primary")} />
      </button>

      <AnimatePresence>
        {isOpen && <motion.div
    initial={{ opacity: 0, y: -6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -6 }}
    transition={{ duration: 0.15 }}
    className={cn(
      "absolute z-[100] w-full min-w-[150px] top-[calc(100%+4px)] left-0 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border border-gray-200/85 dark:border-gray-700/85 rounded-md shadow-xl dark:shadow-2xl dark:shadow-black/70 overflow-hidden",
      dropdownClassName
    )}
  >
            <div className="px-2 pt-2 pb-1 border-b border-gray-100 dark:border-gray-700">
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onClick={e => e.stopPropagation()}
                placeholder="Search..."
                className="w-full px-2.5 py-1.5 text-[11px] rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 placeholder-gray-400 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
            </div>
            <div className="max-h-48 overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700 py-1">
              {filteredOptions.length === 0
                ? <div className="px-3 py-2 text-[11px] text-gray-400 italic">No results</div>
                : filteredOptions.map((opt, idx) => <button
    key={`${opt.value}-${idx}`}
    type="button"
    onClick={() => {
      onChange(opt.value);
      setIsOpen(false);
      setSearch("");
    }}
    className={cn(
      "w-full text-left px-3 py-2 text-[12px] font-semibold transition-colors flex items-center justify-between cursor-pointer",
      String(value) === String(opt.value) ? "bg-primary/10 text-primary font-bold" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-white/5"
    )}
  >
                  <span className="truncate">{opt.label}</span>
                </button>)}
            </div>
          </motion.div>}
      </AnimatePresence>
    </div>;
});
CustomDropdown.displayName = "CustomDropdown";
export {
  CustomDropdown
};
