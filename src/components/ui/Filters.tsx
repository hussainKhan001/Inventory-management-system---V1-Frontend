import React, { useState, useRef, useEffect } from "react";
import { Search, X, ChevronDown, Calendar } from "lucide-react";
import { cn } from "../../lib/utils";

// ----------------------------------------------------
// SearchFilter Component
// ----------------------------------------------------
export interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchFilter = React.memo(({
  value,
  onChange,
  placeholder = "Search...",
  className
}: SearchFilterProps) => {
  return (
    <div className={cn("relative flex-1 min-w-[200px]", className)}>
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2 h-[40px] bg-white dark:bg-[#0F172A] border border-gray-200/50 dark:border-gray-800 rounded-xl text-[13px] text-[#1A1A2E] dark:text-[#F1F5F9] transition-all duration-200 focus:outline-none focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/20 placeholder-gray-400 dark:placeholder-gray-500 shadow-xs"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

SearchFilter.displayName = "SearchFilter";

// ----------------------------------------------------
// DateFilter Component
// ----------------------------------------------------
export interface DateFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const DateFilter = React.memo(({
  value,
  onChange,
  placeholder,
  className
}: DateFilterProps) => {
  return (
    <div className={cn("relative flex-1 min-w-[120px]", className)}>
      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      <input
        type="date"
        value={value && typeof value === 'string' && value.includes('T') ? value.split('T')[0] : (value || "")}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-10 py-2 h-[40px] bg-white dark:bg-[#0F172A] border border-gray-200/50 dark:border-gray-800 rounded-xl text-[13px] text-[#1A1A2E] dark:text-[#F1F5F9] transition-all duration-200 focus:outline-none focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/20 [color-scheme:light] dark:[color-scheme:dark] shadow-xs cursor-pointer"
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
});

DateFilter.displayName = "DateFilter";

// ----------------------------------------------------
// SelectFilter Component
// ----------------------------------------------------
export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
  className?: string;
}

export const SelectFilter = React.memo(({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className
}: SelectFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabel = value 
    ? (options.find(opt => (typeof opt === "string" ? opt : opt.value) === value) as any)?.label || (typeof options.find(opt => opt === value) === "string" ? value : value)
    : placeholder;

  return (
    <div ref={containerRef} className={cn("relative flex-1 min-w-[140px] group", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between pl-4 pr-3 py-2 h-[40px] bg-white dark:bg-[#0F172A] border rounded-xl text-[13px] transition-all duration-200 focus:outline-none shadow-xs cursor-pointer",
          isOpen
            ? "border-[#F97316] ring-4 ring-[#F97316]/20 text-[#1A1A2E] dark:text-[#F1F5F9]"
            : "border-gray-200/50 dark:border-gray-800 text-[#1A1A2E] dark:text-[#F1F5F9] hover:border-gray-300 dark:hover:border-gray-700"
        )}
      >
        <span className={cn("truncate", !value && "text-gray-500 dark:text-gray-400")}>
          {selectedLabel}
        </span>
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-2",
          isOpen ? "transform rotate-180 text-[#F97316]" : "group-hover:text-[#F97316]"
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-full min-w-[160px] bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700/80 rounded-xl shadow-xl dark:shadow-2xl dark:shadow-black/60 overflow-hidden py-1">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => { onChange(""); setIsOpen(false); }}
              className={cn(
                "w-full text-left px-4 py-2 text-[13px] transition-colors",
                !value
                  ? "bg-[#F97316]/10 text-[#F97316] font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
              )}
            >
              {placeholder}
            </button>
            {options.map((opt, i) => {
              const val = typeof opt === "string" ? opt : opt.value;
              const lbl = typeof opt === "string" ? opt : opt.label;
              const isSelected = val === value;
              return (
                <button
                  key={val || i}
                  type="button"
                  onClick={() => { onChange(val); setIsOpen(false); }}
                  className={cn(
                    "w-full text-left px-4 py-2 text-[13px] transition-colors",
                    isSelected
                      ? "bg-[#F97316]/10 text-[#F97316] font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  )}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

SelectFilter.displayName = "SelectFilter";

// ----------------------------------------------------
// FilterRow Component (Wrapper Layout)
// ----------------------------------------------------
export interface FilterRowProps {
  children: React.ReactNode;
  onClearAll?: () => void;
  showClear?: boolean;
  className?: string;
}

export const FilterRow = React.memo(({
  children,
  onClearAll,
  showClear = false,
  className
}: FilterRowProps) => {
  return (
    <div className={cn("flex flex-wrap items-center gap-3 sm:gap-4 w-full", className)}>
      {children}
    </div>
  );
});

FilterRow.displayName = "FilterRow";

export { DateRangePicker } from "./DateRangePicker";
export type { DateRangeValue, DateRangePickerProps } from "./DateRangePicker";
