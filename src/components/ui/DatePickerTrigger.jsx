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
      "w-full flex items-center gap-2 transition-all duration-200 rounded-lg border cursor-pointer outline-none",
      "bg-white dark:bg-[#1E293B] text-gray-900 dark:text-gray-100",
      isOpen ? "border-[#F97316] ring-4 ring-[#F97316]/20" : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500",
      disabled && "bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed",
      small ? "py-1.5 min-h-[34px] px-3 text-xs" : "py-2.5 min-h-[44px] px-3 text-sm",
      error && "border-red-500 ring-4 ring-red-500/10",
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
