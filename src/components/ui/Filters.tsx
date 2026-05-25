import React from "react";
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
  return (
    <div className={cn("relative flex-1 min-w-[140px] group", className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-4 pr-10 py-2 h-[40px] bg-white dark:bg-[#0F172A] border border-gray-200/50 dark:border-gray-800 rounded-xl text-[13px] text-[#1A1A2E] dark:text-[#F1F5F9] transition-all duration-200 focus:outline-none focus:border-[#F97316] focus:ring-4 focus:ring-[#F97316]/20 appearance-none cursor-pointer shadow-xs"
      >
        <option value="">{placeholder}</option>
        {options.map((opt, i) => {
          const val = typeof opt === "string" ? opt : opt.value;
          const lbl = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={val || i} value={val}>
              {lbl}
            </option>
          );
        })}
      </select>
      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none transition-colors duration-200 group-focus-within:text-[#F97316]" />
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
      {showClear && onClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          className="px-3 h-[40px] text-xs font-bold text-gray-400 hover:text-red-500 transition-colors uppercase tracking-wider whitespace-nowrap"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
});

FilterRow.displayName = "FilterRow";

export { DateRangePicker } from "./DateRangePicker";
export type { DateRangeValue, DateRangePickerProps } from "./DateRangePicker";
