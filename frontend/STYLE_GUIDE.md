# 3Eyes FateBox Style Guide

**Design Aesthetic:** MSCHF-inspired - Brutalist, bold, edge-to-edge, anti-design

This document defines the visual language and component styling standards for the 3Eyes FateBox platform. All UI should follow these patterns to maintain brand consistency.

---

## Core Design Principles

1. **No Rounded Corners** - All `border-radius: 0px`. Square everything.
2. **No Shadows** - Flat design only. No `box-shadow` or elevation effects.
3. **Stark Colors** - Pure, bold colors. No pastels, no gradients.
4. **Thin Borders** - Always `1px` solid black borders.
5. **Fast Transitions** - All transitions use `duration-100` (100ms).
6. **Uppercase Text** - Labels, buttons, and headings use uppercase with letter-spacing.

---

## Color Palette

### Base Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `degen-bg` | `#e7e7e8` | Site background, page backgrounds |
| `degen-container` | `#e8e8e8` | Card default backgrounds, containers |
| `degen-white` | `#ffffff` | Card white variant, input backgrounds |
| `degen-black` | `#000000` | Primary text, borders, primary buttons |

### Feature Colors (Bold Pops)

| Token | Hex | Usage |
|-------|-----|-------|
| `degen-feature` | `#ff0000` | Primary accent (red), CTAs, errors, danger |
| `degen-blue` | `#0000ff` | Info, links, blue buttons |
| `degen-yellow` | `#ffff00` | Warnings, attention |
| `degen-green` | `#00ff00` | Success states |
| `degen-magenta` | `#ff00ff` | Special badges, highlights |

### Text Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `degen-text` | `#000000` | Primary text |
| `degen-text-muted` | `#666666` | Secondary text, descriptions |
| `degen-text-light` | `#999999` | Hints, placeholders, disabled |

### Semantic Colors

| Token | Hex | Maps To |
|-------|-----|---------|
| `degen-success` | `#00ff00` | `degen-green` |
| `degen-error` | `#ff0000` | `degen-feature` |
| `degen-warning` | `#ffff00` | `degen-yellow` |
| `degen-info` | `#0000ff` | `degen-blue` |

---

## Typography

### Font

The site uses a custom font `--font-3eyes` with monospace fallback.

```css
font-family: var(--font-3eyes), monospace;
```

### Text Styles

| Style | Classes | Usage |
|-------|---------|-------|
| Heading | `text-xl font-medium uppercase tracking-wider` | Page titles, card titles |
| Label | `text-sm font-medium uppercase tracking-wider` | Form labels, section labels |
| Body | `text-sm text-degen-text` | Content text |
| Muted | `text-sm text-degen-text-muted` | Descriptions, secondary info |
| Hint | `text-xs text-degen-text-muted` | Input hints, captions |
| Error | `text-sm text-degen-feature font-medium` | Error messages |

### Key Typography Rules

- **Labels & Buttons:** Always `uppercase tracking-wider`
- **Font Weights:** `font-medium` for emphasis, default weight for body
- **Letter Spacing:** `tracking-wider` on all uppercase text

---

## Spacing Scale

### Padding Sizes (Cards, Containers)

| Size | Class | Value |
|------|-------|-------|
| `none` | - | 0 |
| `sm` | `p-3` | 12px |
| `md` | `p-4` | 16px |
| `lg` | `p-6` | 24px |

### Component-Specific Padding

| Component | Size | Padding |
|-----------|------|---------|
| Button `sm` | `px-3 py-1.5` | 12px / 6px |
| Button `md` | `px-4 py-2` | 16px / 8px |
| Button `lg` | `px-6 py-3` | 24px / 12px |
| Button `xl` | `px-8 py-4` | 32px / 16px |
| Input | `px-3 py-2` | 12px / 8px |
| Badge `sm` | `px-2 py-0.5` | 8px / 2px |
| Badge `md` | `px-2.5 py-1` | 10px / 4px |
| Badge `lg` | `px-3 py-1.5` | 12px / 6px |
| Tab Trigger | `px-4 py-2` | 16px / 8px |

### Gap & Margin

| Context | Value |
|---------|-------|
| Grid gap | `gap-1` (4px) - `gap-4` (16px) |
| Section margin | `mt-4` (16px) - `mt-8` (32px) |
| Label to input | `mb-2` (8px) |
| Icon to text | `gap-2` (8px) |

---

## Borders

### Standard Border

```css
border: 1px solid #000000;
/* Tailwind: border border-degen-black */
```

### Border Rules

- **All borders:** `1px` width, `degen-black` color
- **Border radius:** Always `0px` (no rounded corners)
- **Thick border (rare):** `2px` for emphasis
- **Transparent borders:** Use `border-transparent` for ghost variants

### Border Applications

| Context | Style |
|---------|-------|
| Cards | `border border-degen-black` |
| Inputs | `border border-degen-black` |
| Buttons | `border border-degen-black` (or matching color) |
| Dividers | `border-b border-degen-black` |
| Tabs | `border border-degen-black` on container |

---

## Components

### Buttons (`DegenButton`)

**Variants:**

| Variant | Background | Text | Hover |
|---------|------------|------|-------|
| `primary` | `bg-degen-black` | `text-degen-white` | `hover:bg-degen-feature` |
| `secondary` | `bg-degen-white` | `text-degen-black` | `hover:bg-degen-bg` |
| `outline` | `bg-transparent` | `text-degen-black` | `hover:bg-degen-black hover:text-degen-white` |
| `ghost` | `bg-transparent` | `text-degen-black` | `hover:bg-degen-black hover:text-degen-white` |
| `feature` | `bg-degen-feature` | `text-degen-white` | `hover:bg-degen-black` |
| `blue` | `bg-degen-blue` | `text-degen-white` | `hover:bg-degen-black` |
| `success` | `bg-degen-black` | `text-degen-green` | `hover:bg-degen-green hover:text-degen-black` |
| `warning` | `bg-degen-yellow` | `text-degen-black` | `hover:bg-degen-black hover:text-degen-yellow` |

**Sizes:**

| Size | Classes |
|------|---------|
| `sm` | `px-3 py-1.5 text-xs` |
| `md` | `px-4 py-2 text-sm` |
| `lg` | `px-6 py-3 text-base` |
| `xl` | `px-8 py-4 text-lg` |

**Base Styles:**
```
inline-flex items-center justify-center
font-medium uppercase tracking-wider
border [border-color]
transition-colors duration-100
disabled:opacity-50 disabled:cursor-not-allowed
```

### Cards (`DegenCard`)

**Variants:**

| Variant | Background | Border |
|---------|------------|--------|
| `default` | `bg-degen-container` | `border-degen-black` |
| `white` | `bg-degen-white` | `border-degen-black` |
| `feature` | `bg-degen-feature` | `border-degen-black` |
| `blue` | `bg-degen-blue` | `border-degen-black` |
| `yellow` | `bg-degen-yellow` | `border-degen-black` |
| `green` | `bg-degen-green` | `border-degen-black` |
| `black` | `bg-degen-black` | `border-degen-black` |
| `outline` | `bg-transparent` | `border-degen-black` |
| `ghost` | `bg-transparent` | `border-transparent` |

**Padding:**

| Size | Class |
|------|-------|
| `none` | - |
| `sm` | `p-3` |
| `md` | `p-4` |
| `lg` | `p-6` |

**Hover State:** `hover:bg-degen-black hover:text-degen-white`

### Badges (`DegenBadge`)

**Variants:**

| Variant | Background | Text |
|---------|------------|------|
| `default` | `bg-degen-container` | `text-degen-black` |
| `feature` | `bg-degen-feature` | `text-degen-white` |
| `success` | `bg-degen-green` | `text-degen-black` |
| `warning` | `bg-degen-yellow` | `text-degen-black` |
| `danger` | `bg-degen-feature` | `text-degen-white` |
| `blue` | `bg-degen-blue` | `text-degen-white` |
| `magenta` | `bg-degen-magenta` | `text-degen-white` |
| `outlineDefault` | `bg-transparent` | `text-degen-black` |
| `outlineFeature` | `bg-transparent` | `text-degen-feature` |
| `outlineBlue` | `bg-transparent` | `text-degen-blue` |

**Sizes:**

| Size | Classes |
|------|---------|
| `sm` | `px-2 py-0.5 text-[10px]` |
| `md` | `px-2.5 py-1 text-xs` |
| `lg` | `px-3 py-1.5 text-sm` |

### Inputs (`DegenInput`, `DegenTextarea`, `DegenSelect`)

**Base Styles:**
```
w-full
px-3 py-2
bg-degen-white
text-degen-black
placeholder:text-degen-text-muted
border border-degen-black
outline-none
transition-colors duration-100
focus:bg-degen-container
```

**Error State:** `border-degen-feature bg-degen-feature/5`

**Label:** `text-degen-black font-medium text-sm uppercase tracking-wider mb-2`

### Messages (`DegenMessage`)

**Variants:**

| Variant | Background | Text | Icon |
|---------|------------|------|------|
| `success` | `bg-degen-green` | `text-degen-black` | `✓` |
| `error` | `bg-degen-feature` | `text-degen-white` | `✕` |
| `warning` | `bg-degen-yellow` | `text-degen-black` | `!` |
| `info` | `bg-degen-blue` | `text-degen-white` | `i` |
| `default` | `bg-degen-container` | `text-degen-black` | `•` |

### Tabs (`DegenTabs`)

**TabsList:** `inline-flex border border-degen-black`

**TabsTrigger:**
```
px-4 py-2
font-medium text-sm uppercase tracking-wider
border-r border-degen-black last:border-r-0
transition-colors duration-100
```

**Active State:** `bg-degen-black text-degen-white`
**Inactive State:** `bg-degen-white text-degen-black hover:bg-degen-black hover:text-degen-white`

### Loader (`DegenLoader`)

**Sizes:**

| Size | Class |
|------|-------|
| `sm` | `w-4 h-4` |
| `md` | `w-6 h-6` |
| `lg` | `w-10 h-10` |

**Style:** `border-2 border-degen-black border-t-transparent animate-spin`

---

## Interaction States

### Hover

| Element | Hover Effect |
|---------|--------------|
| Primary Button | `bg-degen-feature` |
| Secondary Button | `bg-degen-bg` |
| Outline/Ghost | `bg-degen-black text-degen-white` |
| Card (with hover) | `bg-degen-black text-degen-white` |
| Tab Trigger | `bg-degen-black text-degen-white` |
| Dropdown Item | `bg-degen-black text-degen-white` |

### Disabled

```css
opacity: 50%;
cursor: not-allowed;
```

### Focus

Inputs use `focus:bg-degen-container` - subtle background change, no outline/ring.

### Selection

```css
::selection {
  background: var(--degen-feature);
  color: var(--degen-white);
}
```

---

## Layout Patterns

### Page Container

```jsx
<div className="min-h-screen bg-degen-bg pt-24 pb-12 px-6">
  <div className="max-w-4xl mx-auto">
    {/* Content */}
  </div>
</div>
```

### Card Grid

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Cards */}
</div>
```

### Form Layout

```jsx
<div className="space-y-4">
  <DegenInput label="Field Name" />
  <DegenInput label="Another Field" />
  <DegenButton>Submit</DegenButton>
</div>
```

---

## CSS Custom Properties

These CSS variables are available globally:

```css
--degen-bg: #e7e7e8;
--degen-container: #e8e8e8;
--degen-white: #ffffff;
--degen-black: #000000;
--degen-feature: #ff0000;
--degen-blue: #0000ff;
--degen-yellow: #ffff00;
--degen-green: #00ff00;
--degen-magenta: #ff00ff;
--degen-text: #000000;
--degen-text-muted: #666666;
--degen-text-light: #999999;
--degen-border-width: 1px;
--degen-border-width-thick: 2px;
--degen-border-radius: 0px;
--degen-grid-gap: 1px;
```

---

## Quick Reference

### Do's

- Use uppercase text for labels and buttons
- Use `tracking-wider` on all uppercase text
- Use `transition-colors duration-100` for hover effects
- Use black borders on all interactive elements
- Use pure, saturated colors (no pastels)
- Keep corners square (no border-radius)

### Don'ts

- Don't use shadows or elevation
- Don't use rounded corners
- Don't use gradients
- Don't use pastel or muted accent colors
- Don't use slow transitions (>100ms)
- Don't use outline focus rings (use background change)

---

## File Locations

| File | Purpose |
|------|---------|
| `/lib/theme.js` | Color and styling token definitions |
| `/app/globals.css` | CSS custom properties, base styles |
| `/components/ui/` | All Degen UI components |

---

*Document maintained for 3Eyes FateBox v3 - Brutalist UI System*
