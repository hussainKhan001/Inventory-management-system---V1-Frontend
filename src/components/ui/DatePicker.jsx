var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";
import { DatePickerTrigger } from "./DatePickerTrigger";
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
function parseDate(str) {
  if (!str) return null;
  const d = /* @__PURE__ */ new Date(str + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}
__name(parseDate, "parseDate");
function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
__name(toYMD, "toYMD");
function formatDisplay(ymd) {
  const d = parseDate(ymd);
  if (!d) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear());
  return `${mm}/${dd}/${yy}`;
}
__name(formatDisplay, "formatDisplay");
function buildCalendarCells(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const total = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = [];
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
__name(buildCalendarCells, "buildCalendarCells");
const DatePicker = React.memo(({
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
}) => {
  const today = /* @__PURE__ */ new Date();
  const todayYMD = toYMD(today);
  const valStr = value && typeof value === "string" && value.includes("T") ? value.split("T")[0] : value || "";
  const initDate = parseDate(valStr) || today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  useEffect(() => {
    const handler = /* @__PURE__ */ __name((e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }, "handler");
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const openCalendar = /* @__PURE__ */ __name(() => {
    if (disabled) return;
    const ref = parseDate(valStr) || today;
    setViewYear(ref.getFullYear());
    setViewMonth(ref.getMonth());
    setOpen(true);
  }, "openCalendar");
  const prevMonth = /* @__PURE__ */ __name((e) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  }, "prevMonth");
  const nextMonth = /* @__PURE__ */ __name((e) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  }, "nextMonth");
  const handleDayClick = /* @__PURE__ */ __name((ymd) => {
    if (onChange) {
      onChange({ target: { value: ymd } });
    }
    setOpen(false);
  }, "handleDayClick");
  const clearDate = /* @__PURE__ */ __name((e) => {
    e.stopPropagation();
    if (onChange) {
      onChange({ target: { value: "" } });
    }
  }, "clearDate");
  const cells = buildCalendarCells(viewYear, viewMonth);
  return <div className={cn(small ? "mb-2" : "mb-4", className)} ref={containerRef}>
      {label && <label className={cn("block font-semibold text-gray-700 dark:text-gray-200 mb-1.5", small ? "text-[10px]" : "text-sm")}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>}
      
      <div className={cn("relative", open ? "z-[999]" : "z-10")}>
        <DatePickerTrigger
    onClick={openCalendar}
    onClear={clearDate}
    icon={Icon}
    text={valStr ? formatDisplay(valStr) : ""}
    placeholder="Select Date"
    isOpen={open}
    disabled={disabled}
    small={small}
    error={error}
    className="w-full"
  />

        {
    /* Calendar Dropdown */
  }
        {open && <div className="absolute top-[calc(100%+8px)] left-0 z-[999] w-[272px] bg-white dark:bg-[#1E293B] border border-gray-200 dark:border-gray-700/80 rounded-lg shadow-xl dark:shadow-2xl dark:shadow-black/60 p-4 select-none">
            {
    /* Month navigation */
  }
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

            {
    /* Day-of-week headers */
  }
            <div className="grid grid-cols-7 mb-1">
              {DAY_LABELS.map((d) => <div key={d} className="text-center text-[10px] font-bold text-gray-600 py-1 tracking-wider">
                  {d}
                </div>)}
            </div>

            {
    /* Day cells */
  }
            <div className="grid grid-cols-7">
              {cells.map((cell, idx) => {
    if (!cell) return <div key={idx} className="h-8" />;
    const isSelected = cell.ymd === valStr;
    const isToday = cell.ymd === todayYMD;
    return <div key={cell.ymd} className="relative h-8 w-full rounded-full flex items-center justify-center">
                    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        handleDayClick(cell.ymd);
      }}
      className={cn(
        "absolute inset-[1px] flex items-center justify-center rounded-full text-[12px] font-medium transition-colors duration-100",
        isSelected ? "bg-primary text-white font-bold" : isToday ? "text-primary font-semibold hover:bg-white/10" : "text-[#94A3B8] hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
      )}
    >
                      {cell.day}
                    </button>
                  </div>;
  })}
            </div>

            {
    /* Footer */
  }
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-600 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Pick a date</span>
              <button
    type="button"
    onClick={clearDate}
    className="text-[11px] text-gray-500 hover:text-red-400 transition-colors"
  >
                Clear
              </button>
            </div>
          </div>}
      </div>

      {error && <p className="text-[11px] text-red-500 mt-1.5 font-medium flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-red-500" />
        {error}
      </p>}
    </div>;
});
DatePicker.displayName = "DatePicker";
export {
  DatePicker
};
