import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../../lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseDate(str: string): Date | null {
  if (!str) return null;
  const d = new Date(str + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(ymd: string): string {
  const d = parseDate(ymd);
  if (!d) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear());
  return `${mm}/${dd}/${yy}`;
}

function buildCalendarCells(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells: Array<{ ymd: string; day: number } | null> = [];
  for (let i = 0; i < total; i++) {
    const dayNum = i - firstDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push(null);
    } else {
      cells.push({ ymd: toYMD(new Date(year, month, dayNum)), day: dayNum });
    }
  }
  return cells;
}

export const DatePicker = React.memo(({
  label,
  value,
  onChange,
  className,
  required,
  error,
  small,
  icon: Icon,
  disabled,
  ...props
}: any) => {
  const today = new Date();
  const todayYMD = toYMD(today);

  // Normalise value
  const valStr = value && typeof value === 'string' && value.includes('T') ? value.split('T')[0] : (value || "");

  const initDate = parseDate(valStr) || today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openCalendar = () => {
    if (disabled) return;
    const ref = parseDate(valStr) || today;
    setViewYear(ref.getFullYear());
    setViewMonth(ref.getMonth());
    setOpen(true);
  };

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (ymd: string) => {
    // Simulate event object for onChange
    if (onChange) {
      onChange({ target: { value: ymd } });
    }
    setOpen(false);
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChange) {
      onChange({ target: { value: "" } });
    }
  };

  const cells = buildCalendarCells(viewYear, viewMonth);

  return (
    <div className={cn(small ? "mb-2" : "mb-4", className)} ref={containerRef}>
      {label && (
        <label className={cn("block font-bold text-[#6B7280] dark:text-[#94A3B8] mb-1.5", small ? "text-[9px]" : "text-[11px] h-4")}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {/* Input Trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={openCalendar}
          className={cn(
            "w-full flex items-center justify-between text-left font-medium transition-all duration-300 rounded-2xl border cursor-pointer",
            "bg-white dark:bg-[#0B1120]/50 text-[#1A1A2E] dark:text-[#E2E8F0]",
            open
              ? "border-primary/50 ring-4 ring-primary/10"
              : "border-gray-200/50 dark:border-gray-800/80 hover:border-gray-300 dark:hover:border-gray-700",
            disabled && "bg-gray-50 dark:bg-gray-900/50 text-gray-500 cursor-not-allowed",
            small ? "py-1.5 h-[32px] pl-9 pr-3 text-[12px]" : "py-2.5 h-[44px] pl-11 pr-4 text-[14px]",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/10",
            !valStr && "text-gray-400 dark:text-gray-500"
          )}
        >
          {Icon ? (
            <Icon className={cn("absolute left-3.5 z-10 w-4 h-4 pointer-events-none", open ? "text-primary" : "text-gray-400")} />
          ) : (
            <Calendar className={cn("absolute left-3.5 z-10 w-4 h-4 pointer-events-none", open ? "text-primary" : "text-gray-400")} />
          )}
          
          <span className="flex-1 truncate">
            {valStr ? formatDisplay(valStr) : "Select Date"}
          </span>

          {valStr && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={clearDate}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ml-1 p-0.5 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
        </button>

        {/* Calendar Dropdown */}
        {open && (
          <div className="absolute top-[calc(100%+8px)] left-0 z-[100] w-[272px] bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/60 p-4 select-none">
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[13px] font-semibold text-gray-900 dark:text-[#F1F5F9] tracking-wide">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-center text-[10px] font-bold text-gray-600 py-1 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {cells.map((cell, idx) => {
                if (!cell) return <div key={idx} className="h-8" />;
                const isSelected = cell.ymd === valStr;
                const isToday = cell.ymd === todayYMD;

                return (
                  <div key={cell.ymd} className="relative h-8 w-full rounded-full flex items-center justify-center">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDayClick(cell.ymd); }}
                      className={cn(
                        "absolute inset-[1px] flex items-center justify-center rounded-full text-[12px] font-medium transition-colors duration-100",
                        isSelected
                          ? "bg-primary text-white font-bold"
                          : isToday
                          ? "text-primary font-semibold hover:bg-white/10"
                          : "text-[#94A3B8] hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
                      )}
                    >
                      {cell.day}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Pick a date</span>
              <button
                type="button"
                onClick={clearDate}
                className="text-[11px] text-gray-500 hover:text-red-400 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-red-500 mt-1.5 font-medium flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-red-500"></span>
        {error}
      </p>}
    </div>
  );
});

DatePicker.displayName = "DatePicker";
