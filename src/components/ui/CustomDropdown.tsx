import React, { useState, useEffect, useRef, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

interface Option {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  options: (string | Option)[];
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  dropdownClassName?: string;
  small?: boolean;
}

export const CustomDropdown = React.memo(({
  options,
  value,
  onChange,
  disabled,
  placeholder = "Select...",
  className = "",
  dropdownClassName = "",
  small = false,
}: CustomDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  const selectedOption = normalizedOptions.find((opt) => String(opt.value) === String(value));

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between text-left font-bold bg-white/40 dark:bg-[#0F172A]/30 border border-gray-200/50 dark:border-gray-800/80 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl cursor-pointer text-gray-700 dark:text-gray-300 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-inner",
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
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute z-[100] w-full min-w-[150px] top-[calc(100%+4px)] left-0 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-md border border-gray-200/85 dark:border-gray-700/85 rounded-xl shadow-xl dark:shadow-2xl dark:shadow-black/70 overflow-hidden py-1 max-h-56 overflow-y-auto custom-scrollbar scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-gray-700",
              dropdownClassName
            )}
          >
            {normalizedOptions.map((opt, idx) => (
              <button
                key={`${opt.value}-${idx}`}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-[12px] font-semibold transition-colors flex items-center justify-between cursor-pointer",
                  String(value) === String(opt.value)
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100/60 dark:hover:bg-white/5"
                )}
              >
                <span className="truncate">{opt.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

CustomDropdown.displayName = "CustomDropdown";
