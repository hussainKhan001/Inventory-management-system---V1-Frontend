import React from "react";
import { Calendar, X } from "lucide-react";
import { cn } from "../../lib/utils";
const DatePickerTrigger = React.forwardRef(({
  onClick,
  onClear,
  icon: Icon = Calendar,
  text,
  placeholder,
  isOpen,
  disabled,
  small,
  error,
  className
}, ref) => {
  const hasValue = !!text;
  return <button
    ref={ref}
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 transition-all duration-200 rounded-xl border cursor-pointer shadow-xs outline-none",
      "bg-white dark:bg-[#0F172A] text-[#1A1A2E] dark:text-[#F1F5F9]",
      isOpen ? "border-[#F97316] ring-4 ring-[#F97316]/20" : "border-gray-200/50 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700",
      disabled && "bg-gray-50 dark:bg-gray-900 disabled:text-gray-500 cursor-not-allowed",
      small ? "py-1.5 h-[32px] px-3 text-[12px]" : "py-2 h-[40px] px-3 text-[13px]",
      error && "border-red-500 focus:border-red-500 focus:ring-red-500/10",
      className
    )}
  >
      <Icon className={cn("w-4 h-4 shrink-0", isOpen ? "text-primary" : "text-gray-400")} />
      
      <span className={cn("flex-1 text-left whitespace-nowrap truncate font-medium", !hasValue && "text-gray-400 dark:text-gray-500")}>
        {hasValue ? text : placeholder}
      </span>

      {hasValue && !disabled && onClear && <span
    role="button"
    tabIndex={-1}
    onClick={onClear}
    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0 p-0.5 ml-1"
  >
          <X className="w-3.5 h-3.5" />
        </span>}
    </button>;
});
DatePickerTrigger.displayName = "DatePickerTrigger";
export {
  DatePickerTrigger
};
