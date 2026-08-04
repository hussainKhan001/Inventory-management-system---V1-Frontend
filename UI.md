# UI Design System — Inventory Management System V1

> **Stack:** React 19 · Tailwind CSS v4 (CSS-native config in `index.css`) · Vite 6 · Framer Motion (`motion/react`) · Lucide React · Recharts

---

## Table of Contents
1. [Color Palette](#1-color-palette)
2. [Typography](#2-typography)
3. [Spacing & Sizing](#3-spacing--sizing)
4. [Border Radius](#4-border-radius)
5. [Component Library](#5-component-library)
6. [Layout Structure](#6-layout-structure)
7. [Dark Mode](#7-dark-mode)
8. [Icons](#8-icons)
9. [Animations](#9-animations)
10. [Common UI Patterns](#10-common-ui-patterns)
11. [Third-Party Libraries](#11-third-party-libraries)

---

## 1. Color Palette

### Brand / Primary
| Token | Value | Usage |
|---|---|---|
| `--color-primary` | `#F97316` (orange-500) | Buttons, active tabs, focus rings, active nav, accents |

Used as Tailwind utilities: `text-primary`, `bg-primary`, `border-primary`, `ring-primary`, `bg-primary/10`, `bg-primary/20`.

---

### Background & Surface

| Layer | Light | Dark |
|---|---|---|
| Page background | `bg-gray-100` | `dark:bg-gray-900` |
| Sidebar | `bg-white` | `dark:bg-gray-800` |
| Header (frosted) | `bg-white/80` | `dark:bg-gray-800/90` |
| Content card | `bg-white` | `dark:bg-gray-800/50` |
| Modal / Drawer body | `bg-white` | `dark:bg-[#0F172A]` |
| Modal header & footer | `bg-gray-50` | `dark:bg-[#1E293B]` |
| Input background | `bg-white` | `dark:bg-[#1E293B]` (CSS baseline: `#334155`) |
| Dropdown / Popover | `bg-white` | `dark:bg-[#1E293B]` |
| Modal backdrop | `bg-[#0F172A]/60` | (same) |
| Table row hover | `hover:bg-gray-50/70` | `dark:hover:bg-gray-700/30` |

---

### Text Colors

| Role | Light | Dark |
|---|---|---|
| Primary / Body | `text-gray-900` | `dark:text-gray-100` |
| Secondary | `text-gray-600` | `dark:text-gray-300` |
| Muted / Labels | `text-gray-500` | `dark:text-gray-400` |
| Placeholders | `text-gray-400` | `dark:text-gray-500` |
| Modal headings | `text-[#1A1A2E]` | `dark:text-[#F1F5F9]` |
| Error | `text-red-500` | `text-red-500` |
| Brand | `text-primary` | `text-primary` |
| White on filled buttons | `text-white` | `text-white` |

---

### Border Colors

| Context | Classes |
|---|---|
| Cards | `border-gray-100 dark:border-gray-700/50` |
| Inputs (default) | `border-gray-300 dark:border-gray-600` |
| Inputs (focused) | `border-[#F97316] ring-4 ring-[#F97316]/20` |
| Modal sections | `border-gray-100 dark:border-gray-700/40` |
| Filter controls | `border-gray-200/50 dark:border-gray-800` |

---

### Semantic / Status Colors

| Status | Light bg | Light text | Dark bg | Dark text |
|---|---|---|---|---|
| Success | `bg-emerald-50` | `text-emerald-600` | `dark:bg-emerald-500/10` | `dark:text-emerald-400` |
| Warning | `bg-amber-50` | `text-orange-500` | `dark:bg-amber-500/10` | `dark:text-amber-400` |
| Error | `bg-red-50` | `text-red-600` | `dark:bg-red-500/10` | `dark:text-red-400` |
| Info | `bg-blue-50` | `text-blue-500` | `dark:bg-blue-500/10` | `dark:text-blue-400` |
| Purple | `bg-indigo-50` | `text-indigo-600` | `dark:bg-indigo-500/10` | `dark:text-indigo-400` |
| Orange | `bg-orange-50` | `text-orange-600` | `dark:bg-orange-500/10` | `dark:text-orange-400` |
| Neutral | `bg-gray-50` | `text-gray-500` | `dark:bg-gray-500/10` | `dark:text-gray-400` |

---

## 2. Typography

**Font:** `Inter` (Google Fonts, weights 300–900)
- Declared via `@import url(...)` in `index.css`
- Registered as `--font-sans: "Inter", ui-sans-serif, system-ui, sans-serif`
- Applied globally: `html { font-family: "Inter", system-ui, sans-serif; }`

### Type Scale

| Element | Size | Weight | Notes |
|---|---|---|---|
| Page title | `text-xl sm:text-2xl` | `font-bold` | `tracking-tight` |
| Section heading | `text-[14px]` | `font-bold` | |
| Modal / drawer title | `text-[15px]` | `font-bold` | |
| KPI value | `text-2xl` | `font-bold` | |
| KPI label | `text-sm` | `font-medium` | gray-500 |
| Dashboard stat value | `text-[22px]` | `font-black` | |
| Dashboard stat label | `text-[10px]` | `font-bold` | uppercase, tracking-wider |
| Sidebar nav item | `text-[13px]` | `font-semibold` (active) / `font-medium` (inactive) | |
| Breadcrumb | `text-[13px]` | `font-medium` | gray-500 |
| Table header (Th) | `text-[10px]` | `font-black` | `tracking-widest` uppercase |
| Table cell (Td) | `text-[13px]` | normal | gray-600 / gray-300 |
| Form label | `text-sm` | `font-semibold` | gray-700 / gray-200 |
| Form label (small) | `text-[10px]` | `font-semibold` | |
| Input text | `text-sm` | normal | |
| Helper / Error text | `text-xs` / `text-[11px]` | `font-medium` (error) | |
| Badge | `text-[10px]` | `font-bold` | |
| Badge (small) | `text-[8px]` | `font-bold` | |
| Button (normal) | `text-[13px]` | `font-bold` | |
| Button (small) | `text-[11px]` | `font-bold` | |
| Sidebar count badge | `text-[10px]` | `font-bold` | |
| User role (profile dropdown) | `text-[10px]` | `font-semibold` | `text-primary` |

---

## 3. Spacing & Sizing

### Fixed Heights
| Element | Height |
|---|---|
| Header bar | `h-14` (56px) |
| Sidebar logo area | `h-14` (56px) |
| Button (normal) | `h-[40px]` |
| Button (small) | `h-[32px]` |
| Filter inputs | `h-[40px]` |
| Input (normal) | `min-h-[44px]` |
| Input (small) | `min-h-[34px]` |
| KPI card | `min-h-[130px]` |

### Padding
| Context | Value |
|---|---|
| Page content | `p-4 sm:p-6` |
| Modal / drawer body | `p-4 sm:p-6` |
| Modal header / footer | `px-4 sm:px-6 py-4` / `py-3 sm:py-4` |
| Table header (Th) | `px-3 py-3` |
| Table cell (Td) | `px-3 py-2.5` |
| Button (normal) | `px-6 py-2` |
| Button (small) | `px-3 py-1.5` |
| Input (normal) | `px-4 py-2.5` |
| Input (small) | `px-3 py-1.5` |
| Sidebar nav item | `px-3 py-2.5` |
| KPI card | `p-5` |

### Gap / Spacing
| Context | Value |
|---|---|
| Section spacing | `space-y-4`, `gap-4` |
| Filter row gap | `gap-3 sm:gap-4` |
| Nav items | `space-y-0.5` |
| Form field bottom | `mb-4` (normal) / `mb-2` (small) |
| Dropdown offset from trigger | `top-[calc(100%+6px)]` or `mt-2` |
| Scrollbar thickness | `6px` |

### Sidebar Widths
| State | Width |
|---|---|
| Desktop expanded | `lg:w-[230px]` |
| Desktop collapsed | `lg:w-16` |
| Mobile overlay | `w-[260px]` |

---

## 4. Border Radius

| Value | Element |
|---|---|
| `rounded-xl` (12px) | Cards, sidebar, header, modals, KPI cards, dropdowns, filter inputs, notification panel |
| `rounded-lg` (8px) | Form inputs, nav buttons, dropdown panels |
| `rounded-md` (6px) | `Btn`, `CustomDropdown`, calendar panel |
| `rounded-full` | Badges, avatars, pagination dots, notification badge, date picker selected day |
| `rounded-[4px]` | Checkbox |
| `rounded` | `Skeleton` |

---

## 5. Component Library

All components live in `src/components/ui.jsx` (barrel) and `src/components/ui/` (individual files).
> No external component library (no shadcn, MUI, Chakra). Fully custom.

---

### `Btn`
```jsx
<Btn
  label="Save"
  icon={Save}           // optional Lucide icon
  color="primary"       // primary | purple | red | green | amber | outline | (default=dark)
  small={false}         // h-[32px] variant
  outline={false}       // outline style
  loading={false}       // shows Loader2 spinner
  disabled={false}
  onClick={handler}
  type="button"
  className=""
/>
```

**Color variants:**
| `color` | Style |
|---|---|
| `primary` | `bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20` |
| `purple` | `bg-[#8B5CF6] text-white hover:bg-[#7c3aed]` |
| `red` | `bg-[#EF4444] text-white hover:bg-[#dc2626]` |
| `green` | `bg-[#10B981] text-white hover:bg-[#059669]` |
| `amber` | `bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20` |
| `outline` | `border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-[#F1F5F9] bg-white dark:bg-transparent` |
| (default) | `bg-gray-800 dark:bg-[#1E293B] border dark:border-gray-700 text-white` |

---

### `Modal` (Right-side Drawer)
```jsx
<Modal
  title="Edit PO"
  subtitle="Modify purchase order details"
  icon={FileText}        // optional Lucide icon in header badge
  onClose={handleClose}
  wide={false}           // max-w-2xl
  extraWide={false}      // max-w-4xl
  ultraWide={false}      // max-w-6xl
  footer={<div>...</div>}
>
  {/* form content */}
</Modal>
```

- Slides in from right with Framer Motion (`x: "100%" → 0`, 200ms)
- Backdrop: `bg-[#0F172A]/60`, click-outside closes
- Header: orange icon badge + title + close `X` button
- Footer: sticky, `bg-gray-50 dark:bg-[#1E293B]`

---

### `Field` (Text Input)
```jsx
<Field
  label="Item Name"
  type="text"             // text | number | email | password | date | textarea
  value={value}
  onChange={handler}
  placeholder="Enter..."
  required={false}
  disabled={false}
  error="Required"        // error message string
  helperText="Max 100"
  small={false}
  icon={Search}           // optional left icon
  className=""
/>
```

- `type="date"` delegates to `DatePicker` component
- Focus ring: `border-[#F97316] ring-4 ring-[#F97316]/20`

---

### `SField` (Searchable Select)
```jsx
<SField
  label="Category"
  value={value}
  onChange={setValue}
  options={[{ value: "cat1", label: "Category 1", subLabel: "optional" }]}
  placeholder="Select..."
  required={false}
  disabled={false}
  error=""
  small={false}
/>
```

- Custom dropdown with fuzzy search (ranked scoring)
- Animated with Framer Motion (120ms opacity+y)

---

### `Badge`
```jsx
<Badge
  text="Active"
  color="green"    // green | red | blue | yellow | purple | orange | gray
  icon={Check}     // optional Lucide icon
  small={false}    // text-[8px] px-1.5 h-4 vs text-[10px] px-2.5 py-0.5
  className=""
/>
```

---

### `StatusBadge`
Auto-maps domain status strings to `Badge` colors.
```jsx
<StatusBadge status="Approved" />
<StatusBadge status="Pending" />
<StatusBadge status="Rejected" accountStatus="bill_verified" small={false} />
```

**Status → Color mapping:**
| Status keywords | Color |
|---|---|
| APPROVED, ACTIVE, FULFILLED, PAID, VERIFIED, SUCCESS | `green` |
| PENDING, DRAFT, INITIATED | `yellow` |
| REJECTED, CANCELLED, FAILED, BLOCKED | `red` |
| PO RAISED, PROCESSING | `blue` |
| PARTIAL | `orange` |

---

### `Card`
```jsx
<Card className="">
  {children}
</Card>
```
`bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-200`

---

### `KPICard`
```jsx
<KPICard
  label="Total POs"
  value={142}
  sub="+12 this month"
  color="orange"      // orange | blue | green | purple | red
  icon={Package}
  change={8.2}
  trend="up"          // up | down
/>
```

---

### `Table` / `Thead` / `Tbody` / `Tr` / `Th` / `Td` / `TdText`
```jsx
<Table>
  <Thead>
    <tr>
      <Th>Name</Th>
      <Th right>Amount</Th>
    </tr>
  </Thead>
  <Tbody>
    <Tr isPending={false} isNew={false}>
      <Td>John</Td>
      <TdText right title="₹4,500.00">₹4,500.00</TdText>
    </Tr>
  </Tbody>
</Table>
```

- `Tr` row states: `isPending` → orange tint `bg-orange-50/30 dark:bg-orange-950/20`; `isNew` → blue tint `bg-blue-50/30 dark:bg-blue-950/20`
- `TdText` wraps content in `block truncate` with `title` tooltip
- Large datasets use `react-virtuoso`'s `TableVirtuoso`

---

### `PageHeader`
```jsx
<PageHeader
  title="Purchase Orders"
  sub="Manage and approve POs"
  actions={<Btn label="New PO" icon={Plus} />}
/>
```

---

### `ConfirmModal`
```jsx
<ConfirmModal
  title="Delete Item?"
  message="This action cannot be undone."
  onConfirm={handleDelete}
  onCancel={() => setShow(false)}
  loading={false}
  confirmLabel="Delete"
  confirmColor="red"
/>
```

- Centered scale-in dialog (not a drawer)
- Red `AlertCircle` icon in `w-12 h-12 bg-red-50` circle

---

### `Skeleton`
```jsx
<Skeleton className="h-8 w-full rounded mb-3" />
```

`animate-pulse bg-gray-200 dark:bg-[#334155]`

---

### `Pagination`
```jsx
<Pagination
  data={{ page: 1, pages: 10, total: 200 }}
  onPageChange={(page) => setPage(page)}
/>
```

Active page: `bg-[#F97316] border-[#F97316] text-white`

---

### `MultiSelect`
```jsx
<MultiSelect
  label="Tags"
  options={[{ value: "a", label: "Alpha" }]}
  selected={selected}
  onChange={setSelected}
  placeholder="Select..."
/>
```

Selected tags: `bg-orange-50 dark:bg-orange-900/20 text-orange-700 border border-orange-100 rounded-md text-xs font-bold`

---

### `DatePicker` / `DateRangePicker`
- Custom calendar popup (not native `<input type="date">`)
- Width: 272px; week grid layout
- Selected day: `bg-primary text-white rounded-full`

---

### `Checkbox`
```jsx
<Checkbox
  id="agree"
  label="I agree"
  checked={checked}
  onChange={setChecked}
/>
```

Custom styled: `rounded-[4px]`, primary fill on checked, `peer-focus-visible:ring-4 ring-primary/20`

---

### Filter Components (`src/components/ui/Filters.jsx`)
```jsx
<FilterRow>
  <SearchFilter value={search} onChange={setSearch} placeholder="Search POs..." />
  <SelectFilter value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }]} />
  <DateRangePicker startDate={start} endDate={end} onStartChange={setStart} onEndChange={setEnd} />
  <Btn label="Export" icon={Download} outline small />
</FilterRow>
```

All filter controls: `h-[40px] rounded-xl bg-white dark:bg-[#0F172A] border border-gray-200/50 dark:border-gray-800`

---

### `ThemeToggle`
```jsx
<ThemeToggle theme={theme} toggleTheme={toggleTheme} />
```

`w-10 h-10 rounded-xl` — animated Sun/Moon swap via AnimatePresence

---

## 6. Layout Structure

```
html.dark (or without .dark)
└── div.flex.h-screen.overflow-hidden.bg-gray-100.dark:bg-gray-900
    ├── [Mobile] div.fixed.inset-0.bg-black/50.backdrop-blur-sm (z-40 overlay)
    ├── Sidebar (z-50)
    │   ├── Logo bar (h-14, border-b)
    │   ├── Nav items (flex-1, py-3 px-2, space-y-0.5)
    │   └── Sign-out footer (p-2, border-t)
    └── Main area (flex-1, flex-col, overflow-hidden)
        ├── Header (h-14, mx-1 mt-1, rounded-xl, backdrop-blur-md, z-30)
        │   ├── Left: Menu toggle + Back button + Breadcrumb
        │   └── Right: Notification bell + ThemeToggle + Avatar dropdown
        └── main.flex-1.overflow-y-auto.px-2.sm:px-3.py-2.sm:py-3
            └── Content card
                div.mx-auto.w-full.bg-white.dark:bg-gray-800/50.rounded-xl.border.shadow-sm.p-4.sm:p-6
                    ├── PageHeader
                    ├── FilterRow
                    └── Table / Grid content
```

### Sidebar Nav Item
```
Active:   bg-primary/10 dark:bg-primary/15  text-primary  font-semibold
Inactive: text-gray-600 dark:text-gray-400  hover:bg-gray-100/70 dark:hover:bg-gray-700/50
```

- Count badge: `text-[10px] font-bold bg-gray-100 dark:bg-gray-700 rounded-full px-1.5 py-0.5`
- Notification dot: `bg-red-500 text-white text-[9px] min-w-[16px] h-4 rounded-full`
- Navigation: hash-based (`window.location.hash`)

---

## 7. Dark Mode

**Implementation:** Tailwind v4 class-based dark mode.

```css
/* index.css */
@variant dark (&:where(.dark, .dark *));

.dark {
  color-scheme: dark;
}
```

- Toggle: add/remove `.dark` class on `<html>` element
- State: Zustand store (`theme`, `toggleTheme`)
- Persisted via localStorage
- All components use inline `dark:` utilities (no CSS token system)
- Dark raw hex values: `#0F172A` (deepest bg), `#1E293B` (card/input), `#334155` (input baseline)

---

## 8. Icons

**Library:** `lucide-react` v0.546.0 — sole icon library.

### Icon Sizes
| Context | Size |
|---|---|
| Standard (buttons, labels) | `w-4 h-4` (16px) |
| Header actions | `w-5 h-5` (20px) |
| Sidebar nav | `18px × 18px` (via `style`) |
| Modal title icon | `w-5 h-5` inside `w-10 h-10 rounded-xl bg-primary/10` |
| Confirm modal icon | `w-6 h-6` inside `w-12 h-12 rounded-full bg-red-50` |
| Small / inline | `w-3 h-3` or `w-3.5 h-3.5` |
| Badge icon | `w-3 h-3` (normal), `w-2.5 h-2.5` (small) |

### Commonly Used Icons
```
X  Loader2  Plus  Search  Check  CheckCircle  CheckCircle2
Bell  Info  AlertCircle  AlertTriangle  ShieldAlert
Sun  Moon  Menu  LogOut  Users
ChevronDown  ChevronUp  ChevronLeft  ChevronRight  ArrowLeft
Eye  Pencil  Trash2  Download  Upload  Camera
FileText  Package  CreditCard  IndianRupee  RefreshCw
Calendar  Clock  History  BarChart2  TrendingUp  PieChart
Link2  Send  Settings  BookOpen
```

---

## 9. Animations

Library: `motion/react` v12 (Framer Motion)

| Element | Animation |
|---|---|
| Modal (drawer) | `x: "100%" → 0`, tween 200ms, ease `[0.32, 0.72, 0, 1]` |
| ConfirmModal | `scale: 0.96 → 1`, opacity `0 → 1`, 150ms |
| Dropdowns (SField, MultiSelect) | opacity + `y: -10 → 0`, 120ms |
| Notification panel | opacity + `y: 10 + scale: 0.95 → normal`, 200ms |
| Profile dropdown | Same as notification panel |
| ThemeToggle icon | `y: 20 + rotate: 90 → 0`, 300ms with AnimatePresence exit |
| Page transitions | None (hash-based routing, instantaneous) |

All interactive elements: `transition-all duration-200` or `duration-300` for color/shadow transitions.
Active scale on buttons: `active:scale-95`.

---

## 10. Common UI Patterns

### Card
```jsx
<div className="bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-all duration-200 p-5">
  {children}
</div>
```

### Tabs
```jsx
<div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
  {tabs.map(tab => (
    <button
      key={tab}
      className={active === tab
        ? "px-4 py-2 text-[13px] font-medium rounded-lg bg-white dark:bg-gray-700 text-primary shadow-sm"
        : "px-4 py-2 text-[13px] font-medium rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
      }
      onClick={() => setActive(tab)}
    >
      {tab}
    </button>
  ))}
</div>
```

Tabs with count badge:
```jsx
<span className="ml-1.5 text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
  {count}
</span>
```

### Filter Bar
```jsx
<FilterRow>
  <SearchFilter value={search} onChange={setSearch} placeholder="Search..." />
  <SelectFilter value={filter} onChange={setFilter} options={[...]} />
  <DateRangePicker ... />
  <Btn label="Export" icon={Download} outline small />
</FilterRow>
```

### Form Section (inside Modal)
```jsx
<div className="space-y-4">
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    <Field label="Name" value={name} onChange={e => setName(e.target.value)} required />
    <SField label="Category" value={cat} onChange={setCat} options={cats} required />
  </div>
  <Field label="Notes" type="textarea" value={notes} onChange={e => setNotes(e.target.value)} />
</div>
```

### Required Field Label
```jsx
<label>Item Name <span className="text-red-500">*</span></label>
```

### Error State
```jsx
<Field error="This field is required" />
// renders: red border + text-xs text-red-500 mt-1.5 font-medium message
```

### Table Row States
```jsx
<Tr isPending={status === "Pending"} isNew={isRecentlyAdded}>
```
- Pending: `bg-orange-50/30 dark:bg-orange-950/20`
- New: `bg-blue-50/30 dark:bg-blue-950/20`

### Skeleton Loading
```jsx
<div className="space-y-3 p-4">
  <Skeleton className="h-8 w-1/3 rounded" />
  <Skeleton className="h-12 w-full rounded" />
  <Skeleton className="h-12 w-full rounded" />
</div>
```

### Scrollbar
```css
/* Visible scrollbars */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.35); border-radius: 4px; }
/* dark: rgba(75,85,99,0.45) */

/* Hidden scrollbars */
.no-scrollbar::-webkit-scrollbar { display: none; }
```

### Toast Notifications
```jsx
import toast from "react-hot-toast";

toast.success("PO created successfully");
toast.error("Failed to save. Please try again.");
toast.loading("Saving...", { id: "save" });
toast.success("Saved!", { id: "save" });
```

### Section Divider / Label
```jsx
<div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 mt-5 px-1">
  Payment Details
</div>
<div className="border-t border-gray-100 dark:border-gray-700/40 my-4" />
```

---

## 11. Third-Party Libraries

| Library | Version | Purpose |
|---|---|---|
| `react` | 19 | UI framework |
| `tailwindcss` (v4) | via `@tailwindcss/vite` | Utility-first CSS |
| `motion/react` (Framer Motion) | 12 | Animations & transitions |
| `lucide-react` | 0.546.0 | Icon set |
| `recharts` | 3.8.1 | Dashboard charts (BarChart, PieChart) |
| `react-hot-toast` | 2.6.0 | Toast notifications |
| `react-virtuoso` | latest | Virtualized table rendering |
| `browser-image-compression` | latest | Client-side image compression for uploads |
| `zustand` | latest | Global state management |

---

## Key Design Rules (Summary)

1. **Single brand color:** `#F97316` orange only — no secondary brand colors.
2. **All modals are right drawers** — never centered dialogs (except `ConfirmModal`).
3. **Tailwind v4 config lives in `index.css`** — no `tailwind.config.js`.
4. **Dark mode via `.dark` class on `<html>`** — not `prefers-color-scheme` media query.
5. **Raw hex in dark utilities** — `dark:bg-[#1E293B]` not CSS variables.
6. **`lucide-react` only** — no mixing of icon libraries.
7. **Virtualize large lists** — use `TableVirtuoso` for 100+ rows.
8. **No external component library** — fully custom component system.
9. **Inter font, always** — never fallback to system fonts in design intent.
10. **`active:scale-95` on all buttons** — consistent press feedback.
