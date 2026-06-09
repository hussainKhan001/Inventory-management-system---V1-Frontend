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
  const yy = String(d.getFullYear()).slice(2);
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
const DateRangePicker = React.memo(({
  value,
  onChange,
  className
}) => {
  const today = /* @__PURE__ */ new Date();
  const todayYMD = toYMD(today);
  const initDate = parseDate(value.start) || today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState("start");
  const [hoverDate, setHoverDate] = useState(null);
  const containerRef = useRef(null);
  useEffect(() => {
    const handler = /* @__PURE__ */ __name((e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
        setHoverDate(null);
      }
    }, "handler");
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const openFor = /* @__PURE__ */ __name((which) => {
    setSelecting(which);
    const ref = which === "start" ? parseDate(value.start) : parseDate(value.end);
    if (ref) {
      setViewYear(ref.getFullYear());
      setViewMonth(ref.getMonth());
    }
    setOpen(true);
  }, "openFor");
  const prevMonth = /* @__PURE__ */ __name(() => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  }, "prevMonth");
  const nextMonth = /* @__PURE__ */ __name(() => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  }, "nextMonth");
  const handleDayClick = /* @__PURE__ */ __name((ymd) => {
    if (selecting === "start") {
      const newVal = { start: ymd, end: value.end && ymd > value.end ? "" : value.end };
      onChange(newVal);
      setSelecting("end");
    } else {
      if (value.start && ymd < value.start) {
        onChange({ start: ymd, end: "" });
        setSelecting("end");
      } else {
        onChange({ ...value, end: ymd });
        setOpen(false);
        setSelecting("start");
        setHoverDate(null);
      }
    }
  }, "handleDayClick");
  const clearAll = /* @__PURE__ */ __name((e) => {
    e.stopPropagation();
    onChange({ start: "", end: "" });
  }, "clearAll");
  const effStart = value.start;
  const effEnd = selecting === "end" && hoverDate && value.start ? hoverDate >= value.start ? hoverDate : value.start : value.end;
  const cells = buildCalendarCells(viewYear, viewMonth);
  const dayClass = /* @__PURE__ */ __name((ymd) => {
    const isStart = ymd === effStart;
    const isEnd = ymd === effEnd;
    const inRange = effStart && effEnd && ymd > effStart && ymd < effEnd;
    const isToday = ymd === todayYMD;
    const isEdge = isStart || isEnd;
    return {
      wrapper: cn(
        "relative h-8 w-full",
        inRange && "bg-primary/15",
        isStart && effEnd && "rounded-l-full bg-primary/15",
        isEnd && effStart && "rounded-r-full bg-primary/15",
        !isEdge && !inRange && "rounded-full"
      ),
      inner: cn(
        "absolute inset-[1px] flex items-center justify-center rounded-full text-[12px] font-medium transition-colors duration-100",
        isEdge ? "bg-primary text-white font-bold" : inRange ? "text-primary" : isToday ? "text-primary font-semibold" : "text-[#94A3B8] hover:bg-white/10 hover:text-white"
      )
    };
  }, "dayClass");
  return <div ref={containerRef} className={cn("relative inline-flex items-center gap-2", className)}>

      <DatePickerTrigger
    onClick={() => openFor("start")}
    onClear={(e) => {
      e.stopPropagation();
      onChange({ start: "", end: "" });
    }}
    text={value.start || value.end ? <>
              {value.start ? formatDisplay(value.start) : ""}
              {value.end ? ` - ${formatDisplay(value.end)}` : value.start ? " -" : ""}
            </> : ""}
    placeholder="Select Date Range"
    isOpen={open}
    className="min-w-[220px]"
  />

      {
    /* Calendar dropdown */
  }
      {open && <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-[272px] bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700/80 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/60 p-4 select-none">

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
    const cls = dayClass(cell.ymd);
    return <div key={cell.ymd} className={cls.wrapper}>
                  <button
      type="button"
      onClick={() => handleDayClick(cell.ymd)}
      onMouseEnter={() => setHoverDate(cell.ymd)}
      onMouseLeave={() => setHoverDate(null)}
      className={cls.inner}
    >
                    {cell.day}
                  </button>
                </div>;
  })}
          </div>

          {
    /* Footer */
  }
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">
              {selecting === "start" ? "Pick start date" : "Pick end date"}
            </span>
            <button
    type="button"
    onClick={clearAll}
    className="text-[11px] text-gray-500 hover:text-red-400 transition-colors"
  >
              Clear
            </button>
          </div>
        </div>}
    </div>;
});
DateRangePicker.displayName = "DateRangePicker";
export {
  DateRangePicker
};
