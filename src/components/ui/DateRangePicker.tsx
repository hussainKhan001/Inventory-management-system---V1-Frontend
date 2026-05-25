import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface DateRangeValue {
  start: string; // YYYY-MM-DD or ""
  end: string;   // YYYY-MM-DD or ""
}

export interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  className?: string;
}

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
  const yy = String(d.getFullYear()).slice(2);
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

export const DateRangePicker = React.memo(({
  value,
  onChange,
  className,
}: DateRangePickerProps) => {
  const today = new Date();
  const todayYMD = toYMD(today);

  const initDate = parseDate(value.start) || today;
  const [viewYear, setViewYear] = useState(initDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initDate.getMonth());
  const [open, setOpen] = useState(false);
  const [selecting, setSelecting] = useState<"start" | "end">("start");
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setHoverDate(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openFor = (which: "start" | "end") => {
    setSelecting(which);
    const ref = which === "start" ? parseDate(value.start) : parseDate(value.end);
    if (ref) { setViewYear(ref.getFullYear()); setViewMonth(ref.getMonth()); }
    setOpen(true);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDayClick = (ymd: string) => {
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
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({ start: "", end: "" });
  };

  // Effective range accounting for hover preview
  const effStart = value.start;
  const effEnd =
    selecting === "end" && hoverDate && value.start
      ? hoverDate >= value.start ? hoverDate : value.start
      : value.end;

  const cells = buildCalendarCells(viewYear, viewMonth);

  const dayClass = (ymd: string) => {
    const isStart = ymd === effStart;
    const isEnd = ymd === effEnd;
    const inRange = effStart && effEnd && ymd > effStart && ymd < effEnd;
    const isToday = ymd === todayYMD;
    const isEdge = isStart || isEnd;

    return {
      wrapper: cn(
        "relative h-8 w-full",
        inRange && "bg-[#F97316]/15",
        isStart && effEnd && "rounded-l-full bg-[#F97316]/15",
        isEnd && effStart && "rounded-r-full bg-[#F97316]/15",
        !isEdge && !inRange && "rounded-full",
      ),
      inner: cn(
        "absolute inset-[1px] flex items-center justify-center rounded-full text-[12px] font-medium transition-colors duration-100",
        isEdge
          ? "bg-[#F97316] text-white font-bold"
          : inRange
          ? "text-[#F97316]"
          : isToday
          ? "text-[#F97316] font-semibold"
          : "text-[#94A3B8] hover:bg-white/10 hover:text-white",
      ),
    };
  };

  return (
    <div ref={containerRef} className={cn("relative inline-flex items-center gap-2", className)}>

      {/* Start input */}
      <button
        type="button"
        onClick={() => openFor("start")}
        className={cn(
          "flex items-center gap-2 h-[40px] px-3 min-w-[138px] rounded-xl border text-[13px] transition-all duration-200 cursor-pointer",
          "bg-[#0F172A] text-[#F1F5F9]",
          open && selecting === "start"
            ? "border-[#F97316] ring-2 ring-[#F97316]/30"
            : "border-gray-700 hover:border-gray-500",
        )}
      >
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <span className={cn("flex-1 text-left", !value.start && "text-gray-500")}>
          {value.start ? formatDisplay(value.start) : "mm/dd/yy"}
        </span>
        {value.start && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onChange({ start: "", end: "" }); }}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      <span className="text-[11px] text-gray-600 select-none">to</span>

      {/* End input */}
      <button
        type="button"
        onClick={() => openFor("end")}
        className={cn(
          "flex items-center gap-2 h-[40px] px-3 min-w-[138px] rounded-xl border text-[13px] transition-all duration-200 cursor-pointer",
          "bg-[#0F172A] text-[#F1F5F9]",
          open && selecting === "end"
            ? "border-[#F97316] ring-2 ring-[#F97316]/30"
            : "border-gray-700 hover:border-gray-500",
        )}
      >
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <span className={cn("flex-1 text-left", !value.end && "text-gray-500")}>
          {value.end ? formatDisplay(value.end) : "mm/dd/yy"}
        </span>
        {value.end && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onChange({ ...value, end: "" }); }}
            className="text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute top-[calc(100%+8px)] left-0 z-50 w-[272px] bg-[#0F172A] border border-gray-700/80 rounded-2xl shadow-2xl shadow-black/60 p-4 select-none">

          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] font-semibold text-[#F1F5F9] tracking-wide">
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
              const cls = dayClass(cell.ymd);
              return (
                <div key={cell.ymd} className={cls.wrapper}>
                  <button
                    type="button"
                    onClick={() => handleDayClick(cell.ymd)}
                    onMouseEnter={() => setHoverDate(cell.ymd)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={cls.inner}
                  >
                    {cell.day}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-800 flex items-center justify-between">
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
        </div>
      )}
    </div>
  );
});

DateRangePicker.displayName = "DateRangePicker";
