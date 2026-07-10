import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, Trash2, Plus, ChevronDown, Download, Upload,
  History, RotateCcw, Settings2, X, CheckSquare, Eye, EyeOff,
  Type, Hash, Calendar, List, AlignLeft, Mail, Phone,
  Calculator, FileText, GitBranch, Shield, AlertCircle,
  Layers, RefreshCw,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAppStore } from "../store";

// ─── Field type definitions ───────────────────────────────────────────────────
const FIELD_TYPES = [
  { value:"text",       label:"Short answer",  icon: Type,        line:"Short text answer"     },
  { value:"textarea",   label:"Paragraph",     icon: AlignLeft,   line:"Long text answer"      },
  { value:"select",     label:"Dropdown",      icon: List,        line:"Select from list"      },
  { value:"number",     label:"Number",        icon: Hash,        line:"Numeric value"         },
  { value:"date",       label:"Date",          icon: Calendar,    line:"Pick a date"           },
  { value:"email",      label:"Email",         icon: Mail,        line:"Email address"         },
  { value:"tel",        label:"Phone",         icon: Phone,       line:"Phone number"          },
  { value:"checkbox",   label:"Checkbox",      icon: CheckSquare, line:"True / False toggle"   },
  { value:"calculated", label:"Calculated",    icon: Calculator,  line:"Auto-computed value"   },
  { value:"file",       label:"File Upload",   icon: FileText,    line:"Attach a file"         },
];

const COL_SPANS = [
  { value:1, label:"1/3 — Narrow" },
  { value:2, label:"1/2 — Half"   },
  { value:3, label:"Full width"   },
];

const OPERATORS = [
  { value:"equals",    label:"equals"      },
  { value:"not_equals",label:"not equals"  },
  { value:"contains",  label:"contains"    },
  { value:"empty",     label:"is empty"    },
  { value:"not_empty", label:"is not empty"},
];

const getTypeMeta = (v) => FIELD_TYPES.find(t => t.value === v) || FIELD_TYPES[0];
const cn = (...cls) => cls.filter(Boolean).join(" ");

// ─── Underline input (Google Forms style) ────────────────────────────────────
function UInput({ value, onChange, placeholder, mono, type = "text" }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={cn(
        "w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700",
        "focus:border-primary outline-none py-1.5 text-sm text-gray-800 dark:text-gray-100",
        "placeholder:text-gray-300 dark:placeholder:text-gray-600 transition-colors duration-200",
        mono && "font-mono"
      )}
    />
  );
}

// ─── Type selector dropdown ───────────────────────────────────────────────────
function TypeSelector({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const meta = getTypeMeta(value);
  const Icon = meta.icon;

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all duration-200 min-w-[160px]",
          open
            ? "border-primary/50 bg-primary/5 text-primary"
            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600"
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left">{meta.label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200 shrink-0", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden py-1">
          {FIELD_TYPES.map(t => {
            const TIcon = t.icon;
            const active = t.value === value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => { onChange(t.value); setOpen(false); }}
                className={cn(
                  "flex items-center gap-3 w-full px-3.5 py-2.5 text-left transition-colors duration-150",
                  active ? "bg-primary/8 text-primary" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                )}
              >
                <TIcon className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none mb-0.5">{t.label}</p>
                  <p className="text-[10px] text-gray-400">{t.line}</p>
                </div>
                {active && <CheckSquare className="w-3.5 h-3.5 text-primary shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Required pill toggle ────────────────────────────────────────────────────
function RequiredPill({ checked, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <span className={cn("text-sm transition-colors", checked ? "text-gray-700 dark:text-gray-200 font-medium" : "text-gray-400")}>Required</span>
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          "relative w-10 h-[22px] rounded-full transition-all duration-300 cursor-pointer",
          checked ? "bg-primary" : "bg-gray-200 dark:bg-gray-700"
        )}
      >
        <span className={cn(
          "absolute top-[3px] w-4 h-4 bg-white rounded-full shadow transition-all duration-300",
          checked ? "left-[calc(100%-19px)]" : "left-[3px]"
        )} />
      </div>
    </label>
  );
}

// ─── Options list (for select) ────────────────────────────────────────────────
function OptionsList({ options = [], onChange }) {
  const [draft, setDraft] = useState("");

  const add = (val = draft) => {
    const v = val.trim();
    if (!v || options.includes(v)) return;
    onChange([...options, v]);
    setDraft("");
  };

  return (
    <div className="space-y-2 mt-3">
      {options.map((opt, i) => (
        <div key={i} className="flex items-center gap-2.5 group">
          <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 shrink-0" />
          <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 border-b border-transparent group-hover:border-gray-200 dark:group-hover:border-gray-700 pb-0.5">{opt}</span>
          <button
            type="button"
            onClick={() => onChange(options.filter((_, j) => j !== i))}
            className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2.5">
        <div className="w-4 h-4 rounded-full border-2 border-gray-200 dark:border-gray-700 shrink-0" />
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add option"
          className="flex-1 text-sm text-gray-500 bg-transparent border-b border-dashed border-gray-200 dark:border-gray-700 focus:border-primary outline-none py-0.5 placeholder:text-gray-300 transition-colors"
        />
        {draft && (
          <button type="button" onClick={() => add()} className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors">Add</button>
        )}
      </div>
    </div>
  );
}

// ─── Advanced settings panel ──────────────────────────────────────────────────
function AdvancedPanel({ field, fields, allRoles, onUpdate }) {
  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 space-y-5">

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Placeholder</label>
          <UInput value={field.placeholder || ""} onChange={e => onUpdate({ placeholder: e.target.value })} placeholder="Hint text…" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Default Value</label>
          <UInput value={field.defaultValue || ""} onChange={e => onUpdate({ defaultValue: e.target.value })} placeholder="Pre-filled…" />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Column Width</label>
          <select value={field.colSpan || 2} onChange={e => onUpdate({ colSpan: Number(e.target.value) })} className="w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-primary outline-none py-1.5 text-sm text-gray-700 dark:text-gray-300 transition-colors">
            {COL_SPANS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Help Text</label>
        <UInput value={field.helpText || ""} onChange={e => onUpdate({ helpText: e.target.value })} placeholder="Descriptive hint shown below the field…" />
      </div>

      {field.type === "calculated" && (
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Formula</label>
          <UInput mono value={field.formula || ""} onChange={e => onUpdate({ formula: e.target.value })} placeholder="e.g. qty * rate + freight" />
          <p className="text-[10px] text-gray-400 mt-1.5">Use other field IDs as variables (e.g. <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">qty * rate</code>)</p>
        </div>
      )}

      <div>
        <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
          <AlertCircle className="w-3 h-3" />Validation Rules
        </label>
        <div className="grid grid-cols-2 gap-4">
          {field.type === "number" && <>
            <div><label className="text-[10px] text-gray-400 mb-1.5 block">Min Value</label><UInput type="number" value={field.validation?.min ?? ""} onChange={e => onUpdate({ validation: { ...field.validation, min: e.target.value === "" ? undefined : Number(e.target.value) } })} placeholder="—" /></div>
            <div><label className="text-[10px] text-gray-400 mb-1.5 block">Max Value</label><UInput type="number" value={field.validation?.max ?? ""} onChange={e => onUpdate({ validation: { ...field.validation, max: e.target.value === "" ? undefined : Number(e.target.value) } })} placeholder="—" /></div>
          </>}
          {(field.type === "text" || field.type === "textarea") && <>
            <div><label className="text-[10px] text-gray-400 mb-1.5 block">Min Length</label><UInput value={field.validation?.minLength ?? ""} onChange={e => onUpdate({ validation: { ...field.validation, minLength: e.target.value === "" ? undefined : Number(e.target.value) } })} placeholder="—" /></div>
            <div><label className="text-[10px] text-gray-400 mb-1.5 block">Max Length</label><UInput value={field.validation?.maxLength ?? ""} onChange={e => onUpdate({ validation: { ...field.validation, maxLength: e.target.value === "" ? undefined : Number(e.target.value) } })} placeholder="—" /></div>
          </>}
          <div><label className="text-[10px] text-gray-400 mb-1.5 block">Regex Pattern</label><UInput mono value={field.validation?.pattern || ""} onChange={e => onUpdate({ validation: { ...field.validation, pattern: e.target.value } })} placeholder="^[A-Z]{2}\d{4}$" /></div>
          <div><label className="text-[10px] text-gray-400 mb-1.5 block">Error Message</label><UInput value={field.validation?.errorMessage || ""} onChange={e => onUpdate({ validation: { ...field.validation, errorMessage: e.target.value } })} placeholder="Invalid format" /></div>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
          <GitBranch className="w-3 h-3" />Conditional Logic
          <span className="normal-case font-normal text-gray-300 ml-1">— show only when</span>
        </label>
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] text-gray-400 mb-1.5 block">Depends on field</label>
            <select value={field.conditionalLogic?.dependsOn || ""} onChange={e => onUpdate({ conditionalLogic: e.target.value ? { ...field.conditionalLogic, dependsOn: e.target.value } : null })} className="w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-primary outline-none py-1.5 text-sm text-gray-700 dark:text-gray-300 transition-colors">
              <option value="">— none —</option>
              {fields.filter(f => f.fieldId !== field.fieldId).map(f => <option key={f.fieldId} value={f.fieldId}>{f.label}</option>)}
            </select>
          </div>
          {field.conditionalLogic?.dependsOn && <>
            <div className="w-32">
              <label className="text-[10px] text-gray-400 mb-1.5 block">Operator</label>
              <select value={field.conditionalLogic?.operator || "equals"} onChange={e => onUpdate({ conditionalLogic: { ...field.conditionalLogic, operator: e.target.value } })} className="w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-primary outline-none py-1.5 text-sm text-gray-700 dark:text-gray-300 transition-colors">
                {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
            </div>
            {!["empty","not_empty"].includes(field.conditionalLogic?.operator) && (
              <div className="flex-1 min-w-[100px]">
                <label className="text-[10px] text-gray-400 mb-1.5 block">Value</label>
                <UInput value={field.conditionalLogic?.value || ""} onChange={e => onUpdate({ conditionalLogic: { ...field.conditionalLogic, value: e.target.value } })} placeholder="Value…" />
              </div>
            )}
          </>}
        </div>
      </div>

      {allRoles.length > 0 && (
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
            <Shield className="w-3 h-3" />Role Visibility
            <span className="normal-case font-normal text-gray-300 ml-1">— empty = visible to all</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {allRoles.map(role => {
              const active = (field.rolesVisible || []).includes(role);
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => {
                    const cur = field.rolesVisible || [];
                    onUpdate({ rolesVisible: cur.includes(role) ? cur.filter(r => r !== role) : [...cur, role] });
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200",
                    active ? "bg-primary text-white border-primary shadow-sm" : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-primary/40 hover:text-primary"
                  )}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────────
function LivePreview({ fields, formName, onClose }) {
  const visible = fields.filter(f => f.visible !== false);
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="h-1 bg-primary w-full" />
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-gray-900 dark:text-white">{formName}</h4>
          <p className="text-[11px] text-gray-400 mt-0.5">Form preview — how fields will appear</p>
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-6 gap-4">
          {visible.map(f => {
            const meta = getTypeMeta(f.type);
            const Icon = meta.icon;
            const span = f.colSpan === 1 ? "col-span-2" : f.colSpan === 3 ? "col-span-6" : "col-span-3";
            return (
              <div key={f.fieldId} className={span}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                {f.helpText && <p className="text-[11px] text-gray-400 mb-1.5">{f.helpText}</p>}
                {f.type === "textarea"
                  ? <div className="w-full h-16 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" />
                  : f.type === "select"
                  ? <div className="flex items-center justify-between w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3">
                      <span className="text-xs text-gray-300">{(f.options||[])[0]||"Select…"}</span>
                      <ChevronDown className="w-3 h-3 text-gray-300" />
                    </div>
                  : f.type === "checkbox"
                  ? <div className="flex items-center gap-2 h-9">
                      <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600 shrink-0" />
                      <span className="text-xs text-gray-400">{f.label}</span>
                    </div>
                  : <div className="flex items-center gap-2 w-full h-9 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3">
                      <Icon className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                      {f.placeholder && <span className="text-xs text-gray-300 truncate">{f.placeholder}</span>}
                    </div>}
              </div>
            );
          })}
        </div>
        {visible.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No visible fields</p>}
      </div>
    </div>
  );
}

// ─── Version History panel ────────────────────────────────────────────────────
function VersionHistory({ formId, onClose, onRestore }) {
  const { fetchFormConfigVersions, restoreFormConfigVersion, actionLoading } = useAppStore();
  const [versions, setVersions] = useState(null);
  useEffect(() => { fetchFormConfigVersions(formId).then(setVersions); }, [formId]);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 dark:border-gray-800">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />Version History
        </p>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-3 space-y-1 max-h-56 overflow-y-auto">
        {!versions && <div className="flex justify-center py-6"><div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}
        {versions?.length === 0 && <p className="text-xs text-gray-400 text-center py-6">No saved versions yet</p>}
        {versions?.map((v, i) => (
          <div key={i} className="group flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
            <div>
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                {new Date(v.savedAt).toLocaleString("en-IN", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">{v.savedBy} · {v.fields?.length} fields</p>
            </div>
            <button
              onClick={async () => { await restoreFormConfigVersion(formId, i); onRestore(); onClose(); }}
              disabled={actionLoading}
              className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-semibold text-primary hover:underline transition-all disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />Restore
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sortable field card ──────────────────────────────────────────────────────
function FieldCard({ field, idx, fields, allRoles, onUpdate, onDelete, active, onActivate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.fieldId });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const [showAdvanced, setShowAdvanced] = useState(false);
  const meta = getTypeMeta(field.type);
  const isHidden = field.visible === false;
  const upd = useCallback((patch) => onUpdate(idx, patch), [idx, onUpdate]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={e => { if (!active) { e.stopPropagation(); onActivate(); } }}
      className={cn(
        "relative bg-white dark:bg-gray-900 rounded-xl border transition-all duration-200 overflow-hidden",
        isDragging
          ? "shadow-2xl scale-[1.01] border-primary/30 z-50"
          : active
          ? "shadow-md border-gray-200 dark:border-gray-700 cursor-default"
          : "shadow-sm border-gray-200 dark:border-gray-800 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 cursor-pointer",
        isHidden && !active && "opacity-60"
      )}
    >
      {/* Active accent bar */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all duration-300",
        active ? "bg-primary" : "bg-transparent"
      )} />

      <div className="pl-3 pr-5 py-5">
        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            onClick={e => e.stopPropagation()}
            className="mt-1 text-gray-200 dark:text-gray-700 hover:text-gray-400 dark:hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing touch-none shrink-0 pt-0.5"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Label */}
          <div className="flex-1 min-w-0">
            {active ? (
              <input
                value={field.label}
                onChange={e => upd({ label: e.target.value })}
                placeholder="Question"
                onClick={e => e.stopPropagation()}
                autoFocus
                className="w-full text-base bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-primary outline-none py-1 text-gray-800 dark:text-gray-100 placeholder:text-gray-300 transition-colors font-normal"
              />
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <p className={cn("text-sm font-medium leading-relaxed", isHidden ? "text-gray-400" : "text-gray-800 dark:text-gray-100")}>
                  {field.label || <span className="text-gray-300 italic font-normal">Untitled question</span>}
                  {field.required && <span className="text-red-400 ml-1 font-bold">*</span>}
                </p>
                {field.isCustom && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold shrink-0">custom</span>
                )}
                {field.conditionalLogic?.dependsOn && (
                  <span className="text-[10px] bg-violet-500/10 text-violet-500 px-1.5 py-0.5 rounded font-semibold shrink-0">conditional</span>
                )}
              </div>
            )}
          </div>

          {/* Type badge / selector */}
          <div className="shrink-0" onClick={e => e.stopPropagation()}>
            {active
              ? <TypeSelector value={field.type} onChange={v => upd({ type: v })} />
              : <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 dark:bg-gray-800 px-2.5 py-1.5 rounded-lg border border-gray-100 dark:border-gray-700">
                  <meta.icon className="w-3.5 h-3.5" />
                  <span>{meta.label}</span>
                </div>}
          </div>
        </div>

        {/* Active content */}
        {active && (
          <div className="pl-7 mt-4" onClick={e => e.stopPropagation()}>

            {/* Field input preview */}
            {["text","email","tel","number"].includes(field.type) && (
              <div className="border-b-2 border-dashed border-gray-200 dark:border-gray-700 py-2 text-sm text-gray-300 dark:text-gray-600">
                {meta.line}
              </div>
            )}
            {field.type === "textarea" && (
              <div className="border-b-2 border-dashed border-gray-200 dark:border-gray-700 py-2 pb-8 text-sm text-gray-300 dark:text-gray-600">
                Long answer text
              </div>
            )}
            {field.type === "date" && (
              <div className="flex items-center gap-2 border-b-2 border-dashed border-gray-200 dark:border-gray-700 py-2 text-sm text-gray-300 dark:text-gray-600">
                <Calendar className="w-4 h-4" />Month / Day / Year
              </div>
            )}
            {field.type === "checkbox" && (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-300 dark:text-gray-600">
                <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-gray-600" />Yes / No
              </div>
            )}
            {field.type === "file" && (
              <div className="flex items-center gap-2 py-2 text-sm text-gray-300 dark:text-gray-600">
                <FileText className="w-4 h-4" />File attachment
              </div>
            )}
            {field.type === "calculated" && (
              <div className="flex items-center gap-2 border-b-2 border-dashed border-gray-200 dark:border-gray-700 py-2 text-sm text-gray-300 dark:text-gray-600 font-mono">
                <Calculator className="w-4 h-4" />{field.formula || "= formula…"}
              </div>
            )}
            {field.type === "select" && (
              <OptionsList options={field.options || []} onChange={opts => upd({ options: opts })} />
            )}

            {/* Advanced toggle */}
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setShowAdvanced(p => !p)}
                className={cn("flex items-center gap-1.5 text-xs font-semibold transition-colors", showAdvanced ? "text-primary" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300")}
              >
                <Settings2 className="w-3.5 h-3.5" />
                Advanced settings
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", showAdvanced && "rotate-180")} />
              </button>
              <div className={cn("overflow-hidden transition-all duration-300", showAdvanced ? "max-h-[900px] opacity-100 mt-2" : "max-h-0 opacity-0")}>
                <AdvancedPanel field={field} fields={fields} allRoles={allRoles} onUpdate={upd} />
              </div>
            </div>

            {/* Bottom actions */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => upd({ visible: isHidden })}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                    isHidden
                      ? "text-amber-600 bg-amber-50 dark:bg-amber-900/20"
                      : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                >
                  {isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {isHidden ? "Hidden" : "Visible"}
                </button>

                {field.isCustom && (
                  <>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
                    <button
                      onClick={() => onDelete(field.fieldId, field.label)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />Delete
                    </button>
                  </>
                )}
              </div>
              <RequiredPill checked={!!field.required} onChange={v => upd({ required: v })} />
            </div>
          </div>
        )}

        {/* Collapsed preview */}
        {!active && (
          <div className="pl-7 mt-1.5">
            {field.helpText && <p className="text-[11px] text-gray-400">{field.helpText}</p>}
            {field.type === "select" && (field.options || []).length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {(field.options || []).slice(0, 4).map((o, i) => (
                  <span key={i} className="text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-2 py-0.5 rounded">{o}</span>
                ))}
                {(field.options||[]).length > 4 && <span className="text-[10px] text-gray-400 px-1">+{(field.options||[]).length - 4} more</span>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Add Question card ────────────────────────────────────────────────────────
function AddFieldCard({ onAdd, actionLoading }) {
  const [open, setOpen] = useState(false);
  const [nf, setNf] = useState({ label:"", fieldId:"", type:"text", required:false, optionsRaw:"", colSpan:2 });
  const upd = p => setNf(prev => ({ ...prev, ...p }));

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-3 w-full p-4 bg-white dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 hover:border-primary/40 hover:bg-primary/2 transition-all duration-200 group"
    >
      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-primary/10 flex items-center justify-center transition-colors">
        <Plus className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
      </div>
      <span className="text-sm font-medium text-gray-400 group-hover:text-primary transition-colors">Add custom question</span>
    </button>
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-primary/25 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-primary" />
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
        <p className="text-sm font-bold text-gray-800 dark:text-gray-200">Add custom question</p>
        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Question Label *</label>
            <UInput value={nf.label} onChange={e => upd({ label: e.target.value })} placeholder="e.g. Invoice Reference" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
              Field ID * <span className="normal-case font-normal opacity-60">(unique, no spaces)</span>
            </label>
            <UInput mono value={nf.fieldId} onChange={e => upd({ fieldId: e.target.value.replace(/\s+/g, "_").toLowerCase() })} placeholder="e.g. invoice_ref" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Type</label>
            <TypeSelector value={nf.type} onChange={v => upd({ type: v })} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Column Width</label>
            <select value={nf.colSpan} onChange={e => upd({ colSpan: Number(e.target.value) })} className="w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-gray-700 focus:border-primary outline-none py-1.5 text-sm text-gray-700 dark:text-gray-300 transition-colors">
              {COL_SPANS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>
        {nf.type === "select" && (
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Options <span className="normal-case font-normal opacity-60">(comma-separated)</span></label>
            <UInput value={nf.optionsRaw} onChange={e => upd({ optionsRaw: e.target.value })} placeholder="Option A, Option B, Option C" />
          </div>
        )}
        <div className="flex items-center justify-between pt-2">
          <RequiredPill checked={nf.required} onChange={v => upd({ required: v })} />
          <div className="flex gap-2.5">
            <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">Cancel</button>
            <button
              onClick={async () => {
                if (!nf.label.trim() || !nf.fieldId.trim()) { toast.error("Label and Field ID are required"); return; }
                const options = nf.type === "select" ? nf.optionsRaw.split(",").map(o => o.trim()).filter(Boolean) : [];
                await onAdd({ fieldId: nf.fieldId, label: nf.label, type: nf.type, required: nf.required, options, colSpan: nf.colSpan });
                setOpen(false);
                setNf({ label:"", fieldId:"", type:"text", required:false, optionsRaw:"", colSpan:2 });
              }}
              disabled={actionLoading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
            >
              {actionLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main FormBuilder ─────────────────────────────────────────────────────────
export function FormBuilder() {
  const {
    formConfigs, updateFormConfig, addFormCustomField,
    removeFormCustomField, resetFormConfig, actionLoading, rolePermissions,
  } = useAppStore();

  const [selectedFormId, setSelectedFormId] = useState(null);
  const [localFields, setLocalFields]       = useState([]);
  const [dirty, setDirty]                   = useState(false);
  const [activeFieldId, setActiveFieldId]   = useState(null);
  const [showPreview, setShowPreview]       = useState(false);
  const [showVersions, setShowVersions]     = useState(false);
  const [versionKey, setVersionKey]         = useState(0);
  const fileRef = useRef(null);

  const allRoles       = [...new Set((rolePermissions || []).map(rp => rp.role))];
  const selectedConfig = formConfigs.find(c => c.formId === selectedFormId);

  const selectForm = useCallback((formId) => {
    const config = formConfigs.find(c => c.formId === formId);
    setSelectedFormId(formId);
    setLocalFields(config ? config.fields.map(f => ({ ...f })) : []);
    setDirty(false); setActiveFieldId(null); setShowPreview(false); setShowVersions(false);
  }, [formConfigs]);

  const updateField = useCallback((idx, patch) => {
    setLocalFields(prev => { const n = [...prev]; n[idx] = { ...n[idx], ...patch }; return n; });
    setDirty(true);
  }, []);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;
    setLocalFields(prev => {
      const oi = prev.findIndex(f => f.fieldId === active.id);
      const ni = prev.findIndex(f => f.fieldId === over.id);
      return arrayMove(prev, oi, ni).map((f, i) => ({ ...f, order: i + 1 }));
    });
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    await updateFormConfig(selectedFormId, localFields);
    setDirty(false);
  }, [selectedFormId, localFields, updateFormConfig]);

  const handleDelete = useCallback((fieldId, label) => {
    if (!window.confirm(`Remove field "${label}"?`)) return;
    removeFormCustomField(selectedFormId, fieldId).then(() => {
      setLocalFields(prev => prev.filter(f => f.fieldId !== fieldId));
      setActiveFieldId(null);
    });
  }, [selectedFormId, removeFormCustomField]);

  const handleAddField = useCallback(async (data) => {
    await addFormCustomField(selectedFormId, data);
    setLocalFields(prev => [...prev, { ...data, visible:true, isCustom:true, isCore:false, options:data.options||[], order:prev.length+1 }]);
  }, [selectedFormId, addFormCustomField]);

  const handleReset = useCallback(() => {
    if (!window.confirm("Reset to factory defaults? All custom fields and changes will be lost.")) return;
    resetFormConfig(selectedFormId).then(() => {
      const c = formConfigs.find(x => x.formId === selectedFormId);
      if (c) setLocalFields(c.fields.map(f => ({ ...f })));
      setDirty(false); setActiveFieldId(null);
    });
  }, [selectedFormId, resetFormConfig, formConfigs]);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify({ formId:selectedFormId, formName:selectedConfig?.formName, fields:localFields }, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=`${selectedFormId}.json`; a.click(); URL.revokeObjectURL(url);
    toast.success("Config exported");
  }, [selectedFormId, selectedConfig, localFields]);

  const handleImport = useCallback((e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!Array.isArray(parsed.fields)) { toast.error("Invalid config file"); return; }
        setLocalFields(parsed.fields); setDirty(true); toast.success(`Imported ${parsed.fields.length} fields`);
      } catch { toast.error("Invalid JSON file"); }
    };
    reader.readAsText(file); e.target.value = "";
  }, []);

  const grouped = formConfigs.reduce((acc, f) => { (acc[f.section] = acc[f.section] || []).push(f); return acc; }, {});

  return (
    <div className="flex gap-6">

      {/* ── Sidebar ── */}
      <div className="w-48 shrink-0">
        <div className="sticky top-4 space-y-5">
          {Object.entries(grouped).map(([section, forms]) => (
            <div key={section}>
              <p className="text-[9px] font-black tracking-[0.2em] uppercase text-gray-400 dark:text-gray-600 px-2 mb-1.5">{section}</p>
              <div className="space-y-0.5">
                {forms.map(f => {
                  const isSelected = selectedFormId === f.formId;
                  return (
                    <button
                      key={f.formId}
                      onClick={() => selectForm(f.formId)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150",
                        isSelected
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
                      )}
                    >
                      {isSelected && <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary mr-1.5 mb-0.5 align-middle" />}
                      {f.formName}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {formConfigs.length === 0 && <p className="text-xs text-gray-400 px-2">No forms loaded.</p>}
        </div>
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 min-w-0" onClick={() => setActiveFieldId(null)}>
        {!selectedFormId ? (
          <div className="flex flex-col items-center justify-center h-80 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 gap-4 text-gray-300 dark:text-gray-700">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
              <Layers className="w-8 h-8" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-400">Select a form to configure</p>
              <p className="text-xs text-gray-300 dark:text-gray-700 mt-1">Choose from the list on the left</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3" onClick={e => e.stopPropagation()}>

            {/* ── Form header card ── */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              <div className="h-2 bg-primary w-full" />
              <div className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedConfig?.formName}</h2>
                  {selectedConfig?.description && <p className="text-xs text-gray-500 mt-0.5">{selectedConfig.description}</p>}
                </div>

                {/* Toolbar */}
                <div className="flex items-center gap-1 flex-wrap shrink-0">
                  {[
                    { icon: Eye,       label: "Preview", onClick: () => setShowPreview(p => !p), active: showPreview },
                    { icon: History,   label: "History", onClick: () => setShowVersions(p => !p), active: showVersions },
                    { icon: Upload,    label: "Import",  onClick: () => fileRef.current?.click() },
                    { icon: Download,  label: "Export",  onClick: handleExport },
                    { icon: RefreshCw, label: "Reset",   onClick: handleReset, danger: true },
                  ].map(btn => (
                    <button
                      key={btn.label}
                      onClick={btn.onClick}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150",
                        btn.active
                          ? "bg-primary/10 text-primary"
                          : btn.danger
                          ? "text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
                          : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                      )}
                    >
                      <btn.icon className="w-3.5 h-3.5" />{btn.label}
                    </button>
                  ))}
                  <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

                  <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-0.5" />

                  {dirty ? (
                    <button
                      onClick={handleSave}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
                    >
                      {actionLoading
                        ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        : <CheckSquare className="w-3.5 h-3.5" />}
                      Save
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20">
                      <CheckSquare className="w-3.5 h-3.5" />Saved
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Preview panel ── */}
            {showPreview && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <LivePreview fields={localFields} formName={selectedConfig?.formName || ""} onClose={() => setShowPreview(false)} />
              </div>
            )}

            {/* ── Version History panel ── */}
            {showVersions && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <VersionHistory
                  key={versionKey}
                  formId={selectedFormId}
                  onClose={() => setShowVersions(false)}
                  onRestore={() => { selectForm(selectedFormId); setVersionKey(k => k + 1); }}
                />
              </div>
            )}

            {/* ── Field cards ── */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={localFields.map(f => f.fieldId)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2.5">
                  {localFields.map((f, idx) => (
                    <FieldCard
                      key={f.fieldId}
                      field={f}
                      idx={idx}
                      fields={localFields}
                      allRoles={allRoles}
                      onUpdate={updateField}
                      onDelete={handleDelete}
                      active={activeFieldId === f.fieldId}
                      onActivate={() => setActiveFieldId(f.fieldId)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* ── Add question ── */}
            <AddFieldCard onAdd={handleAddField} actionLoading={actionLoading} />

            {/* ── Unsaved changes bar ── */}
            {dirty && (
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl animate-in slide-in-from-bottom-1 duration-300">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Unsaved changes</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => selectForm(selectedFormId)} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Discard</button>
                  <button
                    onClick={handleSave}
                    disabled={actionLoading}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
                  >
                    {actionLoading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    Save changes
                  </button>
                </div>
              </div>
            )}

            <div className="h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
